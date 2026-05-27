# Real-World ESG Data Sources and Ingestion Challenges (SOURCES.md)

This document provides a realistic evaluation of the primary carbon footprint data streams digested by corporate ESG teams. It explains what formats these sources take, what parsing challenges exist, and what the platform supports.

---

## 1. Primary ESG Data Sources

### 1. Utility & Electricity Consumption Data (Scope 2)
In enterprise settings, Scope 2 data is gathered from municipal utility companies, smart meter APIs, or facility management invoices.

* **Format**: Usually delivered as monthly PDF utility bills, legacy CSV billing exports, or structured green-button XML feeds.
* **Fields Typically Present**:
  * `Meter ID` (e.g. `MTR-98276510`)
  * `Billing Period Start` / `Billing Period End`
  * `Consumption` (kWh / MWh)
  * `Current Charge` / `Currency`
  * `Utility Provider` / `Tariff Class`
* **Real-World Inconsistencies**:
  * **Billing Cycle Variations**: Bills are rarely standard calendar months; they frequently span irregular intervals (e.g. 28 days or 34 days), making monthly carbon trend mappings difficult.
  * **Unit Diversification**: Some suppliers export metrics in kWh, others in MWh, and some in thermal units (like therms or British Thermal Units (BTU) for natural gas).
* **Platform Support**:
  * **Supported**: Extraction of electricity consumption in kWh and megawatt-hours (MWh) via `Utility` headers, standard conversion mapping (`MWh` -> `kWh` via `1000.0x` multiplier), and basic duplicate checks.
  * **Not Supported Yet**: Ingestion of natural gas therms, steam inputs, regional grid-intensity factor lookups, or split-billing calculations.

---

### 2. Procurement & Fuel/Supply-Chain Data (Scope 1)
Scope 1 data tracks direct physical resources purchased by the organization—predominantly vehicle fleet fuel cards, industrial heating fuel, or emergency diesel generators.

* **Format**: Typically delivered as SAP/Oracle ERP CSV dumps, material invoice spreadsheets, or credit card expense lists.
* **Fields Typically Present**:
  * `Material Number` / `Material Code`
  * `Cost Center` / `Plant Code`
  * `Fuel Type` (Diesel, Petrol, Propane)
  * `Quantity` / `Unit` (Gallons, Liters, kg)
  * `Vendor` / `Posting Date`
* **Real-World Inconsistencies**:
  * **Multi-Language Headers**: German SAP instances export fields as `Menge` (Quantity), `Einheit` (Unit), `Werk` (Plant), and `Kraftstofftyp` (Fuel Type), while US instances export English equivalents.
  * **Unit Variations**: Multi-national operations purchase fuels in US gallons, UK gallons, liters, or metric tons, which require precise specific-gravity math to standardize weight vs. volume.
* **Platform Support**:
  * **Supported**: Translates German ERP headers (e.g., `Menge`, `Einheit`, `Kostenstelle`) or custom layouts using the custom `map_headers` service. Converts US gallons, kiloliters, and pounds to Liters or kg. Applies custom emission factors for Diesel, Petrol/Gasoline, and Gas.
  * **Not Supported Yet**: Fuel specific-gravity conversion (e.g., adjusting fuel weight based on varying temperature conditions), fugitive emissions tracking, or refrigerant leakage calculation.

---

### 3. Corporate Travel Emissions Data (Scope 3)
Scope 3 captures indirect footprint activities, with employee business travel (aviation and hotel stays) being the most common corporate starting point.

* **Format**: Typically exported as spreadsheets from corporate travel bookers (like Concur) or expense logs.
* **Fields Typically Present**:
  * `Employee ID`
  * `Travel Category` (Flight, Hotel, Car Rental, Taxi)
  * `Origin Airport` / `Destination Airport` (IATA 3-letter codes)
  * `Flight Class` / `Cabin` (Economy, Business, First)
  * `Hotel Nights` / `Distance`
* **Real-World Inconsistencies**:
  * **Missing Distance Data**: Travel bookers frequently omit flight mileage, exporting only the origin and destination airports.
  * **Cabin Class variations**: String entries for flight classes range from `Economy Class` to `Y`, `J`, `F` fare codes.
  * **Incomplete Hotel Metadata**: Hotel records often lack location details, making it impossible to apply regional hotel emissions factors.
* **Platform Support**:
  * **Supported**: Extracts and classifies flight, hotel, and ground travel. Uses a custom coordinate-based **Haversine formula** to compute flight distances between international hubs (e.g., JFK, LHR, CDG, SIN) if the mileage column is blank. Standardizes hotel stays to `room-nights` and ground transportation to `km`. Applies cabin-class multipliers.
  * **Not Supported Yet**: Indirect multi-stop flights, non-IATA regional airport support, hotel location-based factor adjustments, or radiative forcing multipliers for high-altitude aviation.

---

## 2. Ingestion and Normalization Challenges

### 1. CSV Structure Inconsistencies
Real-world spreadsheets suffer from structural inconsistencies:
* **Trailing Commas**: CSV files often contain trailing delimiters, creating blank columns that crash simple row readers.
* **Summary Rows**: Excel files frequently contain summary rows (e.g., "Grand Total: 15,200") at the bottom. Our ingestion pipeline handles these by flagging them as failures or outliers without crashing the system.

### 2. Timestamp Inconsistencies
* Invoices and ERP postings use varying date formats depending on the origin country (e.g., `YYYY-MM-DD` in Asia, `DD/MM/YYYY` in Europe, `MM/DD/YYYY` in the US). Our custom `parse_flexible_date` resolver cycles through multiple formats to standardize dates into ISO `YYYY-MM-DD` format before database commits.

### 3. Duplicate Records
* Corporate travelers often submit duplicates—submitting the same flight expense in both a corporate booking export and a credit card invoice. Our `AnomalyService` checks for matching `source_type`, `activity_type`, `normalized_quantity`, and `date` to flag potential duplicates as suspicious, ensuring they are highlighted in the audit queue before compliance sign-off.
