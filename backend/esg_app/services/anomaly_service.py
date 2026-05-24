from ..models import NormalizedRecord

class AnomalyService:

    @staticmethod
    def detect_anomalies(record_data, row_mapped, source_type):
        """
        Scans a record's attributes and evaluates suspicious rules.
        """
        suspicious = False
        reasons = []

        # 1. Missing Fields Checking
        if source_type == 'SAP':
            if not row_mapped.get('fuel_type'):
                suspicious = True
                reasons.append("Missing Fuel Type.")
            if not row_mapped.get('quantity'):
                suspicious = True
                reasons.append("Missing Quantity.")
            if not row_mapped.get('unit'):
                suspicious = True
                reasons.append("Missing Unit.")
        elif source_type == 'Utility':
            if not row_mapped.get('meter_id'):
                suspicious = True
                reasons.append("Missing Meter ID.")
            if not row_mapped.get('kwh_consumed'):
                suspicious = True
                reasons.append("Missing Electricity Quantity.")
        elif source_type == 'Travel':
            if not row_mapped.get('employee_id'):
                suspicious = True
                reasons.append("Missing Employee ID.")

        # 2. Malformed Dates Checking
        date_str = str(row_mapped.get('date', row_mapped.get('posting_date', row_mapped.get('billing_start', '')))).strip()
        if not date_str:
            suspicious = True
            reasons.append("Malformed/Missing transaction date.")

        # 3. Abnormal Quantities Outlier Checking
        qty = record_data.get('normalized_quantity') or 0.0
        if source_type == 'SAP':
            if qty > 15000:
                suspicious = True
                reasons.append(f"Abnormal quantity spike: {qty} L exceeds threshold of 15,000 Liters.")
        elif source_type == 'Utility':
            if qty > 50000:
                suspicious = True
                reasons.append(f"Abnormal consumption spike: {qty} kWh exceeds grid threshold of 50,000 kWh.")
        elif source_type == 'Travel':
            activity_type = record_data.get('activity_type') or ""
            if "Ground" in activity_type:
                if qty > 500:
                    suspicious = True
                    reasons.append(f"Abnormal ground travel distance: {qty} km exceeds reasonable single-trip ground threshold of 500 km.")
            else:
                if qty > 10000:
                    suspicious = True
                    reasons.append(f"Abnormal travel distance: {qty} km exceeds business threshold of 10,000 km.")

        # 4. Duplicate checks inside DB
        try:
            is_dup = NormalizedRecord.objects.filter(
                source_type=source_type,
                activity_type=record_data.get('activity_type'),
                normalized_quantity=qty,
                date=record_data.get('date')
            ).exists()
            if is_dup:
                suspicious = True
                reasons.append("Possible duplicate row detected in the active ledger.")
        except Exception:
            pass

        return suspicious, "; ".join(reasons)
