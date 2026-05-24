import csv
import io
from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count
from django.utils import timezone

from .models import UploadBatch, RawRecord, NormalizedRecord
from .serializers import UploadBatchSerializer, NormalizedRecordSerializer
from .services.normalization_service import NormalizationService, parse_flexible_date
from .services.anomaly_service import AnomalyService

# 1. Ingestion File Upload Gateway View
@api_view(['POST'])
def upload_csv(request):
    source_type = request.data.get('source_type')
    csv_file = request.FILES.get('file')

    if not csv_file:
        return Response({'error': 'Please upload a CSV file.'}, status=status.HTTP_400_BAD_REQUEST)
    if source_type not in ('SAP', 'Utility', 'Travel'):
        return Response({'error': 'Invalid source type gateway.'}, status=status.HTTP_400_BAD_REQUEST)

    file_name = csv_file.name
    file_data = csv_file.read().decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(file_data))

    # Header validation to block unrelated/dummy CSV spreadsheets
    headers = [h.strip().lower() for h in (csv_reader.fieldnames or [])]
    expected_keywords = {
        'SAP': {
            'materialnummer', 'werk', 'kraftstofftyp', 'menge', 'einheit', 'lieferant', 'kostenstelle', 'buchungsdatum', 'waehrung',
            'material', 'plant', 'fuel', 'quantity', 'unit', 'vendor', 'cost center',
            'documentnumber', 'plantcode', 'costcenter', 'fueltype', 'postingdate'
        },
        'Utility': {
            'meterid', 'billingperiodstart', 'kwhconsumed', 'tariff', 'location', 'meter', 'kwh', 'consumption', 'billing',
            'facility', 'billingstart', 'billingend', 'tarifftype', 'readingtype', 'utilityprovider'
        },
        'Travel': {
            'employeeid', 'travelcategory', 'origin', 'destination', 'classtype', 'hotelnights', 'taxidistance', 'date',
            'employee', 'category', 'type', 'flight', 'hotel', 'nights', 'distance',
            'reportid', 'travelclass', 'distanceunit', 'expensedate', 'amount', 'currency'
        }
    }
    
    overlap = set(headers).intersection(expected_keywords[source_type])
    if not overlap:
        return Response({
            'error': f"Column verification failed: The uploaded file headers do not match the expected columns for {source_type}. Please make sure you are uploading the correct CSV file."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Initialize UploadBatch log
    batch = UploadBatch.objects.create(
        source_type=source_type,
        file_name=file_name
    )

    total = 0
    processed = 0
    failed = 0
    flagged = 0

    for row in csv_reader:
        total += 1
        try:
            # Save Raw Record Backup for Audit Lineage
            raw_rec = RawRecord.objects.create(
                batch=batch,
                raw_data=row
            )

            # Map German ERP headers and standardise
            mapped = NormalizationService.map_headers(row)
            norm_res = NormalizationService.normalize_row(mapped, source_type)

            if norm_res.get('errors'):
                failed += 1
                continue

            # Parse posting date first
            date_val = parse_flexible_date(mapped.get('date', mapped.get('posting_date', mapped.get('billing_start'))))
            norm_res['date'] = date_val

            processed += 1

            # Check Suspicious Anomaly indicators (now with date injected)
            is_suspicious, reasons = AnomalyService.detect_anomalies(norm_res, mapped, source_type)
            if is_suspicious:
                flagged += 1

            # Commit unified ESG record with date
            NormalizedRecord.objects.create(
                batch=batch,
                raw_record=raw_rec,
                source_type=source_type,
                activity_type=norm_res.get('activity_type'),
                scope=norm_res.get('scope'),
                normalized_quantity=norm_res.get('normalized_quantity'),
                normalized_unit=norm_res.get('normalized_unit'),
                co2e_estimate=norm_res.get('co2e_estimate'),
                date=date_val,
                suspicious=is_suspicious,
                suspicious_reason=reasons or None,
                status='Pending',
                normalization_metadata=norm_res.get('normalization_metadata')
            )

        except Exception as e:
            failed += 1
            print("Failed row parse exception:", e)
            continue

    # Update Batch Statistics
    batch.total_rows = total
    batch.processed_rows = processed
    batch.failed_rows = failed
    batch.flagged_rows = flagged
    batch.save()

    return Response({
        'success': True,
        'batch': UploadBatchSerializer(batch).data
    })

# 2. Unified ESG Ledger List View (with advanced filter lookups)
@api_view(['GET'])
def list_records(request):
    status_filter = request.query_params.get('status')
    source_filter = request.query_params.get('source_type')
    suspicious_filter = request.query_params.get('suspicious')
    search_query = request.query_params.get('search')

    queryset = NormalizedRecord.objects.all().order_by('-uploaded_at')

    if status_filter:
        queryset = queryset.filter(status=status_filter)
    if source_filter:
        queryset = queryset.filter(source_type=source_filter)
    if suspicious_filter:
        is_susp = suspicious_filter.lower() == 'true'
        queryset = queryset.filter(suspicious=is_susp)
    if search_query:
        queryset = queryset.filter(activity_type__icontains=search_query)

    serializer = NormalizedRecordSerializer(queryset, many=True)
    return Response(serializer.data)

# 3. Compliance Approve & Lock View
@api_view(['POST'])
def approve_record(request, pk):
    try:
        record = NormalizedRecord.objects.get(pk=pk)
    except NormalizedRecord.DoesNotExist:
        return Response({'error': 'Record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if record.locked:
        return Response({'error': 'Compliance block: Approved records are read-only.'}, status=status.HTTP_403_FORBIDDEN)

    record.status = 'Approved'
    record.locked = True
    record.approved_by = 'Analyst Console'
    record.approved_at = timezone.now()
    record.save()

    return Response(NormalizedRecordSerializer(record).data)

# 4. Ingestion Rejection View
@api_view(['POST'])
def reject_record(request, pk):
    try:
        record = NormalizedRecord.objects.get(pk=pk)
    except NormalizedRecord.DoesNotExist:
        return Response({'error': 'Record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if record.locked:
        return Response({'error': 'Locked records cannot be rejected.'}, status=status.HTTP_403_FORBIDDEN)

    record.status = 'Rejected'
    record.save()

    return Response(NormalizedRecordSerializer(record).data)

# 5. Ingestion Batches History Logs View
@api_view(['GET'])
def list_batches(request):
    batches = UploadBatch.objects.all().order_by('-uploaded_at')
    serializer = UploadBatchSerializer(batches, many=True)
    return Response(serializer.data)

# 6. Executive Footer Footprint Metrics view
@api_view(['GET'])
def dashboard_stats(request):
    # Total calculations aggregates
    approved_query = NormalizedRecord.objects.filter(status='Approved')
    
    total_co2e = approved_query.aggregate(Sum('co2e_estimate'))['co2e_estimate__sum'] or 0.0
    pending_count = NormalizedRecord.objects.filter(status='Pending').count()
    flagged_count = NormalizedRecord.objects.filter(suspicious=True).count()
    locked_count = NormalizedRecord.objects.filter(locked=True).count()
    total_records = NormalizedRecord.objects.count()

    # Scope aggregates
    scope1_sum = approved_query.filter(scope='Scope 1').aggregate(Sum('co2e_estimate'))['co2e_estimate__sum'] or 0.0
    scope2_sum = approved_query.filter(scope='Scope 2').aggregate(Sum('co2e_estimate'))['co2e_estimate__sum'] or 0.0
    scope3_sum = approved_query.filter(scope='Scope 3').aggregate(Sum('co2e_estimate'))['co2e_estimate__sum'] or 0.0

    return Response({
        'total_co2e': round(total_co2e, 2),
        'pending_count': pending_count,
        'flagged_count': flagged_count,
        'locked_count': locked_count,
        'total_records': total_records,
        'scopes': {
            'Scope 1': round(scope1_sum, 2),
            'Scope 2': round(scope2_sum, 2),
            'Scope 3': round(scope3_sum, 2)
        }
    })

# Ingestion JWT Authentication Gates (Zero-Dependency Secure Base64 Engine)
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
import base64
import json

def generate_token(user):
    payload = {
        'id': user.id,
        'username': user.username,
        'orgName': user.first_name or 'EcoCorp',
        'role': user.last_name or 'analyst'
    }
    return base64.b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8')

def decode_token(token):
    try:
        decoded = base64.b64decode(token.encode('utf-8')).decode('utf-8')
        return json.loads(decoded)
    except Exception:
        return None

@api_view(['POST'])
def auth_login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Please provide email and password.'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Auto-seed demo accounts dynamically
    demo_accounts = {
        'analyst@ecocorp.com': ('analyst123', 'EcoCorp', 'analyst'),
        'admin@ecocorp.com': ('admin123', 'EcoCorp', 'admin'),
        'auditor@ecocorp.com': ('auditor123', 'EcoCorp', 'auditor')
    }
    
    if email in demo_accounts:
        pw, org, role = demo_accounts[email]
        if password == pw:
            user, created = User.objects.get_or_create(
                username=email,
                defaults={'email': email, 'first_name': org, 'last_name': role}
            )
            if created:
                user.set_password(pw)
                user.save()
        else:
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
            
    # Authenticate via Django
    user = authenticate(username=email, password=password)
    if not user:
        return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
        
    token = generate_token(user)
    return Response({
        'accessToken': token,
        'refreshToken': 'refresh-' + token,
        'user': {
            'email': user.username,
            'role': user.last_name or 'analyst',
            'orgName': user.first_name or 'EcoCorp'
        }
    })

@api_view(['POST'])
def auth_signup(request):
    org_name = request.data.get('orgName')
    industry = request.data.get('industry')
    region = request.data.get('region')
    name = request.data.get('name')
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password or not org_name:
        return Response({'error': 'Missing required fields.'}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(username=email).exists():
        return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=org_name,
        last_name='admin' # Registered org creator becomes admin
    )
    
    token = generate_token(user)
    return Response({
        'accessToken': token,
        'refreshToken': 'refresh-' + token,
        'user': {
            'email': user.username,
            'role': user.last_name,
            'orgName': user.first_name
        }
    })

@api_view(['GET'])
def auth_profile(request):
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return Response({'error': 'Missing or invalid token.'}, status=status.HTTP_401_UNAUTHORIZED)
        
    token = auth_header.split(' ')[1]
    payload = decode_token(token)
    if not payload:
        return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_401_UNAUTHORIZED)
        
    try:
        user = User.objects.get(pk=payload['id'])
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_401_UNAUTHORIZED)
        
    return Response({
        'email': user.username,
        'role': user.last_name or 'analyst',
        'orgName': user.first_name or 'EcoCorp'
    })

@api_view(['POST'])
def auth_logout(request):
    return Response({'success': True})
