import math
from datetime import datetime

# Haversine airport distance coordinates
AIRPORT_COORDS = {
    'JFK': (40.6398, -73.7789),
    'LHR': (51.4700, -0.4543),
    'CDG': (49.0097, 2.5479),
    'SIN': (1.3644, 103.9915),
    'DXB': (25.2532, 55.3657),
    'HND': (35.5494, 139.7798),
    'BOM': (19.0896, 72.8656),
    'SFO': (37.6190, -122.3749),
}

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def parse_flexible_date(date_str):
    if not date_str:
        return datetime.now().date()
    
    date_str = str(date_str).strip()
    
    # Try different formats
    for fmt in ('%Y-%m-%d', '%d.%m.%Y', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    
    return datetime.now().date()

class NormalizationService:

    @staticmethod
    def map_headers(row):
        """
        Translates raw headers (supporting German ERP structures and custom user schemas) into unified internal names.
        """
        mapped = {}
        for k, v in row.items():
            clean_k = str(k).strip().lower().replace('_', '').replace(' ', '')
            
            # SAP Fuel Mapping (German, English, and User custom)
            if clean_k in ('materialnummer', 'materialcode', 'material', 'documentnumber'):
                mapped['document_number'] = v
                mapped['material_code'] = v
            elif clean_k in ('werk', 'plantcode', 'plant'):
                mapped['plant_code'] = v
            elif clean_k in ('brennstoff', 'kraftstofftyp', 'fueltype', 'fuel'):
                mapped['fuel_type'] = v
            elif clean_k in ('menge', 'verbrauch', 'quantity', 'qty'):
                mapped['quantity'] = v
            elif clean_k in ('einheit', 'unit'):
                mapped['unit'] = v
            elif clean_k in ('lieferant', 'vendor'):
                mapped['vendor'] = v
            elif clean_k in ('kostenstelle', 'costcenter'):
                mapped['cost_center'] = v
            elif clean_k in ('buchungsdatum', 'postingdate', 'date'):
                mapped['date'] = v
            elif clean_k in ('currency', 'waehrung'):
                mapped['currency'] = v
                
            # Utility Mapping
            elif clean_k in ('meterid', 'meter'):
                mapped['meter_id'] = v
            elif clean_k in ('kwhconsumed', 'kwh', 'consumption'):
                mapped['kwh_consumed'] = v
            elif clean_k in ('billingperiodstart', 'billingstart'):
                mapped['billing_start'] = v
            elif clean_k in ('billingperiodend', 'billingend'):
                mapped['billing_end'] = v
            elif clean_k in ('location', 'region', 'facility'):
                mapped['location'] = v
                mapped['facility'] = v
            elif clean_k in ('tarifftype', 'tariff'):
                mapped['tariff_type'] = v
            elif clean_k in ('readingtype'):
                mapped['reading_type'] = v
            elif clean_k in ('utilityprovider', 'provider'):
                mapped['provider'] = v
                
            # Travel Mapping
            elif clean_k in ('employeeid', 'employee'):
                mapped['employee_id'] = v
            elif clean_k in ('travelcategory', 'category', 'type'):
                mapped['travel_category'] = v
            elif clean_k in ('origin', 'originairport'):
                mapped['origin'] = v
            elif clean_k in ('destination', 'destinationairport'):
                mapped['destination'] = v
            elif clean_k in ('classtype', 'class', 'flightclass', 'travelclass'):
                mapped['class_type'] = v
            elif clean_k in ('hotelnights', 'nights'):
                mapped['hotel_nights'] = v
            elif clean_k in ('taxidistance', 'distance'):
                mapped['distance'] = v
            elif clean_k in ('distanceunit'):
                mapped['unit'] = v
            elif clean_k in ('expensedate'):
                mapped['date'] = v
            elif clean_k in ('reportid'):
                mapped['report_id'] = v
            elif clean_k in ('amount'):
                mapped['amount'] = v
            else:
                # retain original keys
                mapped[k] = v
        return mapped

    @staticmethod
    def normalize_row(mapped, source_type):
        """
        Parses fields, converts units, auto-classifies scopes, and returns unified ledger parameters.
        """
        activity_type = "Unknown"
        scope = "Scope 1"
        normalized_quantity = 0.0
        normalized_unit = ""
        co2e_estimate = 0.0
        
        errors = []
        warnings = []
        metadata = {}

        try:
            if source_type == 'SAP':
                scope = 'Scope 1'
                
                # Safeguard: Verify SAP-specific columns are present
                if not mapped.get('fuel_type') and not mapped.get('quantity') and not mapped.get('unit'):
                    errors.append("Invalid SAP record: Missing fuel type, quantity, and unit columns.")
                    return {
                        'activity_type': activity_type,
                        'scope': scope,
                        'normalized_quantity': 0.0,
                        'normalized_unit': '',
                        'co2e_estimate': 0.0,
                        'errors': errors,
                        'warnings': warnings,
                        'normalization_metadata': {}
                    }

                fuel = str(mapped.get('fuel_type', '')).strip()
                activity_type = f"Fuel Combustion ({fuel or 'Unknown'})"
                
                raw_qty = float(mapped.get('quantity') or 0)
                raw_unit = str(mapped.get('unit', '')).strip().lower()

                if not fuel:
                    errors.append("Missing fuel type.")
                if raw_qty <= 0:
                    warnings.append("Quantity is missing, zero, or negative.")

                conversion_factor = 1.0
                # Convert fuel units to standard liters or kg
                if raw_unit in ('gallons', 'gal', 'gallonen'):
                    conversion_factor = 3.78541 # default to US gallons
                    normalized_quantity = raw_qty * conversion_factor
                    normalized_unit = 'Liters'
                elif raw_unit in ('liters', 'l', 'liter'):
                    normalized_quantity = raw_qty
                    normalized_unit = 'Liters'
                elif raw_unit in ('kl', 'kiloliter', 'kiloliters'):
                    conversion_factor = 1000.0
                    normalized_quantity = raw_qty * conversion_factor
                    normalized_unit = 'Liters'
                elif raw_unit in ('kg', 'kilogram'):
                    normalized_quantity = raw_qty
                    normalized_unit = 'kg'
                elif raw_unit in ('lbs', 'pounds'):
                    conversion_factor = 0.453592
                    normalized_quantity = raw_qty * conversion_factor
                    normalized_unit = 'kg'
                else:
                    normalized_quantity = raw_qty
                    normalized_unit = mapped.get('unit') or 'Liters'
                    warnings.append(f"Unrecognized unit '{mapped.get('unit')}'. lit/kg assumed.")

                # Select emission factor (Diesel = 2.68, Petrol = 2.31, Gas = 2.02)
                factor = 2.68
                fuel_clean = fuel.lower()
                if 'diesel' in fuel_clean:
                    factor = 2.68
                elif 'petrol' in fuel_clean or 'gasoline' in fuel_clean:
                    factor = 2.31
                elif 'gas' in fuel_clean:
                    factor = 2.02
                
                co2e_estimate = normalized_quantity * factor
                
                metadata = {
                    'raw_value': raw_qty,
                    'raw_unit': mapped.get('unit') or 'Liters',
                    'conversion_factor': conversion_factor,
                    'normalized_quantity': round(normalized_quantity, 2),
                    'normalized_unit': normalized_unit,
                    'emission_factor': factor,
                    'calculation_formula': f"{round(normalized_quantity, 2)} {normalized_unit} * {factor} kg CO2e / {normalized_unit[:-1] if normalized_unit.endswith('s') else normalized_unit}"
                }

            elif source_type == 'Utility':
                scope = 'Scope 2'
                activity_type = "Purchased Electricity"
                
                # Safeguard: Verify Utility-specific columns are present
                if not mapped.get('meter_id') and not mapped.get('kwh_consumed'):
                    errors.append("Invalid Utility record: Missing meter ID and electricity consumption columns.")
                    return {
                        'activity_type': activity_type,
                        'scope': scope,
                        'normalized_quantity': 0.0,
                        'normalized_unit': '',
                        'co2e_estimate': 0.0,
                        'errors': errors,
                        'warnings': warnings,
                        'normalization_metadata': {}
                    }

                raw_qty = float(mapped.get('kwh_consumed') or 0)
                raw_unit = str(mapped.get('unit', '')).strip().lower() or 'kwh'

                if not mapped.get('meter_id'):
                    errors.append("Missing utility meter ID.")
                if raw_qty <= 0:
                    warnings.append("Electricity usage is missing or zero.")

                conversion_factor = 1.0
                if raw_unit in ('mwh', 'megawatt-hours'):
                    conversion_factor = 1000.0
                    normalized_quantity = raw_qty * conversion_factor
                    normalized_unit = 'kWh'
                else:
                    normalized_quantity = raw_qty
                    normalized_unit = 'kWh'

                # Standard Grid Emission Factor
                factor = 0.38
                co2e_estimate = normalized_quantity * factor
                
                metadata = {
                    'raw_value': raw_qty,
                    'raw_unit': mapped.get('unit') or 'kWh',
                    'conversion_factor': conversion_factor,
                    'normalized_quantity': round(normalized_quantity, 2),
                    'normalized_unit': normalized_unit,
                    'emission_factor': factor,
                    'calculation_formula': f"{round(normalized_quantity, 2)} kWh * {factor} kg CO2e / kWh"
                }

            elif source_type == 'Travel':
                scope = 'Scope 3'
                travel_cat = str(mapped.get('travel_category', '')).strip().lower()
                origin = mapped.get('origin')
                destination = mapped.get('destination')
                hotel_nights = mapped.get('hotel_nights')
                distance_val = mapped.get('distance')

                # Safeguard: Verify Travel-specific columns are present
                if not (travel_cat or origin or destination or hotel_nights or distance_val):
                    errors.append("Invalid Travel record: Missing category, airports, nights, and distance indicators.")
                    return {
                        'activity_type': activity_type,
                        'scope': scope,
                        'normalized_quantity': 0.0,
                        'normalized_unit': '',
                        'co2e_estimate': 0.0,
                        'errors': errors,
                        'warnings': warnings,
                        'normalization_metadata': {}
                    }
                
                # Determine activity category (Flights, Hotels, Ground)
                if 'flight' in travel_cat or origin or destination:
                    activity_type = "Business Travel - Flights"
                    org = str(origin).strip().upper() if origin else ''
                    dest = str(destination).strip().upper() if destination else ''
                    
                    raw_unit = str(mapped.get('unit', '')).strip().lower()
                    distance = 0.0
                    conversion_factor = 1.0
                    raw_value = 0.0
                    
                    # Try using pre-calculated distance from CSV first
                    if distance_val:
                        try:
                            # Replace commas in number strings if any
                            raw_value = float(str(distance_val).replace(',', '').strip())
                            distance = raw_value
                        except ValueError:
                            pass
                            
                    # Convert to float and apply units checks (miles -> km)
                    if distance > 0.0:
                        if raw_unit in ('miles', 'mi', 'mile'):
                            conversion_factor = 1.60934
                            distance = raw_value * conversion_factor
                    else:
                        # Fallback to haversine or standard defaults if distance not pre-specified
                        distance = 1500.0 # baseline fallback
                        raw_value = 1500.0
                        if org in AIRPORT_COORDS and dest in AIRPORT_COORDS:
                            c1 = AIRPORT_COORDS[org]
                            c2 = AIRPORT_COORDS[dest]
                            distance = haversine_distance(c1[0], c1[1], c2[0], c2[1])
                            raw_value = distance
                        else:
                            if org or dest:
                                warnings.append(f"Airport codes [{org}] or [{dest}] unrecognized. Assumed standard fallback distance.")
                            else:
                                errors.append("Flight record missing both origin and destination airport codes.")
                                distance = 0.0
                                raw_value = 0.0
                    
                    normalized_quantity = distance
                    normalized_unit = 'km'

                    # Cabin multipliers (Economy = 0.10, Business = 0.29, First = 0.40)
                    cabin = str(mapped.get('class_type', '')).strip().lower()
                    factor = 0.10
                    if 'business' in cabin:
                        factor = 0.29
                    elif 'first' in cabin:
                        factor = 0.40
                    
                    co2e_estimate = normalized_quantity * factor
                    
                    metadata = {
                        'raw_value': raw_value,
                        'raw_unit': mapped.get('unit') or ('miles' if conversion_factor > 1.0 else 'km'),
                        'conversion_factor': conversion_factor,
                        'normalized_quantity': round(normalized_quantity, 2),
                        'normalized_unit': normalized_unit,
                        'emission_factor': factor,
                        'calculation_formula': f"{round(normalized_quantity, 2)} km * {factor} kg CO2e / km"
                    }
                    
                elif 'hotel' in travel_cat or hotel_nights:
                    activity_type = "Business Travel - Hotels"
                    nights = float(hotel_nights or 0)
                    normalized_quantity = nights
                    normalized_unit = 'room-nights'
                    
                    factor = 20.0 # 20 kg per night
                    co2e_estimate = normalized_quantity * factor
                    
                    metadata = {
                        'raw_value': nights,
                        'raw_unit': 'room-nights',
                        'conversion_factor': 1.0,
                        'normalized_quantity': round(normalized_quantity, 2),
                        'normalized_unit': normalized_unit,
                        'emission_factor': factor,
                        'calculation_formula': f"{round(normalized_quantity, 2)} room-nights * {factor} kg CO2e / room-night"
                    }
                    
                else:
                    activity_type = "Business Travel - Ground"
                    dist = float(distance_val or 0)
                    raw_unit = str(mapped.get('unit', '')).strip().lower()
                    
                    conversion_factor = 1.0
                    if raw_unit in ('miles', 'mi', 'mile'):
                        conversion_factor = 1.60934
                        normalized_quantity = dist * conversion_factor
                        normalized_unit = 'km'
                    else:
                        normalized_quantity = dist
                        normalized_unit = 'km'
                        
                    factor = 0.17 # taxi/car factor
                    co2e_estimate = normalized_quantity * factor
                    
                    metadata = {
                        'raw_value': dist,
                        'raw_unit': mapped.get('unit') or ('miles' if conversion_factor > 1.0 else 'km'),
                        'conversion_factor': conversion_factor,
                        'normalized_quantity': round(normalized_quantity, 2),
                        'normalized_unit': normalized_unit,
                        'emission_factor': factor,
                        'calculation_formula': f"{round(normalized_quantity, 2)} km * {factor} kg CO2e / km"
                    }

            else:
                errors.append(f"Invalid source type: {source_type}")

        except Exception as e:
            errors.append(f"Parser arithmetic failure: {str(e)}")

        return {
            'activity_type': activity_type,
            'scope': scope,
            'normalized_quantity': round(normalized_quantity, 2),
            'normalized_unit': normalized_unit,
            'co2e_estimate': round(co2e_estimate, 2),
            'errors': errors,
            'warnings': warnings,
            'normalization_metadata': metadata
        }
