import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from esg_app.models import UploadBatch, RawRecord, NormalizedRecord

class Command(BaseCommand):
    help = 'Seeds initial ESG UploadBatch and NormalizedRecord activity logs.'

    def handle(self, *args, **options):
        self.stdout.write('Wiping existing ESG database records...')
        NormalizedRecord.objects.all().delete()
        RawRecord.objects.all().delete()
        UploadBatch.objects.all().delete()

        self.stdout.write('Creating Upload Batches...')
        # 1. SAP Batch
        sap_batch = UploadBatch.objects.create(
            source_type='SAP',
            file_name='sap_fuel_procurement_Q1.csv',
            total_rows=3,
            processed_rows=3,
            flagged_rows=1
        )
        
        # 2. Utility Batch
        utility_batch = UploadBatch.objects.create(
            source_type='Utility',
            file_name='utility_electricity_bills.csv',
            total_rows=2,
            processed_rows=2,
            flagged_rows=1
        )

        # 3. Travel Batch
        travel_batch = UploadBatch.objects.create(
            source_type='Travel',
            file_name='biz_travel_logs.csv',
            total_rows=3,
            processed_rows=3,
            flagged_rows=1
        )

        self.stdout.write('Creating Raw and Normalized Records...')

        # SAP Records
        raw_sap1 = RawRecord.objects.create(
            batch=sap_batch,
            raw_data={'fuel_type': 'Diesel', 'quantity': '4200', 'unit': 'Liters', 'date': '2026-05-10'}
        )
        NormalizedRecord.objects.create(
            batch=sap_batch,
            raw_record=raw_sap1,
            source_type='SAP',
            activity_type='Fuel Combustion (Diesel)',
            scope='Scope 1',
            normalized_quantity=4200.0,
            normalized_unit='Liters',
            co2e_estimate=11256.0,
            status='Approved',
            locked=True,
            approved_by='Analyst Console',
            approved_at=timezone.now()
        )

        raw_sap2 = RawRecord.objects.create(
            batch=sap_batch,
            raw_data={'fuel_type': 'Petrol', 'quantity': '800', 'unit': 'Gallons', 'date': '2026-05-12'}
        )
        NormalizedRecord.objects.create(
            batch=sap_batch,
            raw_record=raw_sap2,
            source_type='SAP',
            activity_type='Fuel Combustion (Petrol)',
            scope='Scope 1',
            normalized_quantity=3028.33,
            normalized_unit='Liters',
            co2e_estimate=6995.44,
            status='Pending'
        )

        raw_sap_susp = RawRecord.objects.create(
            batch=sap_batch,
            raw_data={'fuel_type': 'Diesel', 'quantity': '32000', 'unit': 'Liters', 'date': '2026-05-15'}
        )
        NormalizedRecord.objects.create(
            batch=sap_batch,
            raw_record=raw_sap_susp,
            source_type='SAP',
            activity_type='Fuel Combustion (Diesel)',
            scope='Scope 1',
            normalized_quantity=32000.0,
            normalized_unit='Liters',
            co2e_estimate=85760.0,
            suspicious=True,
            suspicious_reason='Abnormal quantity spike: 32000.0 L exceeds threshold of 15,000 Liters.',
            status='Pending'
        )

        # Utility Records
        raw_ut1 = RawRecord.objects.create(
            batch=utility_batch,
            raw_data={'meter_id': 'MET-1002', 'kwh_consumed': '14500', 'billing_start': '2026-04-01', 'location': 'North America'}
        )
        NormalizedRecord.objects.create(
            batch=utility_batch,
            raw_record=raw_ut1,
            source_type='Utility',
            activity_type='Purchased Electricity',
            scope='Scope 2',
            normalized_quantity=14500.0,
            normalized_unit='kWh',
            co2e_estimate=5510.0,
            status='Approved',
            locked=True,
            approved_by='Analyst Console',
            approved_at=timezone.now()
        )

        raw_ut_susp = RawRecord.objects.create(
            batch=utility_batch,
            raw_data={'meter_id': 'MET-1002', 'kwh_consumed': '72000', 'billing_start': '2026-04-15', 'location': 'North America'}
        )
        NormalizedRecord.objects.create(
            batch=utility_batch,
            raw_record=raw_ut_susp,
            source_type='Utility',
            activity_type='Purchased Electricity',
            scope='Scope 2',
            normalized_quantity=72000.0,
            normalized_unit='kWh',
            co2e_estimate=27360.0,
            suspicious=True,
            suspicious_reason='Abnormal consumption spike: 72000.0 kWh exceeds grid threshold of 50,000 kWh.',
            status='Pending'
        )

        # Travel Records
        raw_tr1 = RawRecord.objects.create(
            batch=travel_batch,
            raw_data={'employee_id': 'EMP-021', 'travel_category': 'Flights', 'origin': 'JFK', 'destination': 'LHR', 'class_type': 'Business', 'date': '2026-04-12'}
        )
        NormalizedRecord.objects.create(
            batch=travel_batch,
            raw_record=raw_tr1,
            source_type='Travel',
            activity_type='Business Travel - Flights',
            scope='Scope 3',
            normalized_quantity=5570.0,
            normalized_unit='km',
            co2e_estimate=1615.3,
            status='Approved',
            locked=True,
            approved_by='Analyst Console',
            approved_at=timezone.now()
        )

        raw_tr2 = RawRecord.objects.create(
            batch=travel_batch,
            raw_data={'employee_id': 'EMP-021', 'travel_category': 'Hotels', 'hotel_nights': '4', 'date': '2026-04-12'}
        )
        NormalizedRecord.objects.create(
            batch=travel_batch,
            raw_record=raw_tr2,
            source_type='Travel',
            activity_type='Business Travel - Hotels',
            scope='Scope 3',
            normalized_quantity=4.0,
            normalized_unit='room-nights',
            co2e_estimate=80.0,
            status='Pending'
        )

        raw_tr_susp = RawRecord.objects.create(
            batch=travel_batch,
            raw_data={'employee_id': 'EMP-099', 'travel_category': 'Flights', 'origin': 'XYZ', 'destination': 'CDG', 'class_type': 'Economy', 'date': '2026-04-20'}
        )
        NormalizedRecord.objects.create(
            batch=travel_batch,
            raw_record=raw_tr_susp,
            source_type='Travel',
            activity_type='Business Travel - Flights',
            scope='Scope 3',
            normalized_quantity=1500.0,
            normalized_unit='km',
            co2e_estimate=150.0,
            suspicious=True,
            suspicious_reason='Airport codes [XYZ] or [CDG] unrecognized. Assumed standard fallback distance.',
            status='Pending'
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded SQLite ESG activity ledger!'))
