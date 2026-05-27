# Engineering and Product Decisions (DECISIONS.md)

This document maps out the key technical, architectural, and design choices made during the development of the ESG Ingestion and Normalization Platform, including the rationale, trade-offs, and risks.

---

## 1. Architectural and Technology Stack Decisions

### Decision 1: Monolithic Relational Database Modeling (Django ORM) with a decoupled React SPA
* **Decision**: We selected a Python Django REST Framework backend coupled with a React SPA frontend.
* **Why**:
  * **Relational Integrity**: ESG audit ledgers are strictly relational. Linking raw ingestion batches to raw rows and then mapping those rows to normalized entries is a perfect fit for a relational model.
  * **Rapid Prototyping**: Django's built-in ORM and DRF's automatic serialization let us construct robust APIs quickly.
  * **UI Flexibility**: React allowed us to build an elegant glassmorphic dashboard with responsive filters, live CSV upload pipelines, and manual review panels.
* **Alternative Considered**: Node.js/Express with MongoDB.
  * *Why Rejected*: MongoDB's document-based structure makes multi-entity relationship mapping (e.g., maintaining audit links between raw rows and locked normalized rows) hard to enforce without manual application-layer join logic.
* **Risk/Limitation**: Monolithic architectures can become bottlenecks as ingestion streams scale to millions of concurrent lines. However, Django's database transaction blocks mitigate validation errors during batches.

---

## 2. Ingestion and CSV Parsing Decisions

### Decision 2: Header Translation Engine mapping German ERP and Custom User Columns
* **Decision**: Implement a flexible header translation mapper (`map_headers()`) that checks against variations of German ERP (SAP) names and multiple English synonyms.
* **Why**: Real-world supply-chain spreadsheets never use uniform headers. By translating `Werk` to `plant_code`, `menge` to `quantity`, and `meterid` to `meter_id` internally, we accommodate organic enterprise variation without breaking the downstream math.
* **Alternative Considered**: Enforce a rigid template where the upload fails if any column deviates by a single character.
  * *Why Rejected*: Rejecting files due to casing or synonyms forces business users to manually edit CSV files in Excel, adding friction and increasing manual entry errors.
* **Risk/Limitation**: If a file contains multiple ambiguous columns (e.g., both `postingdate` and `expensedate`), the parser's predefined check precedence rules dictate the mapping, which might occasionally misalign. We mitigate this by saving the original data in `RawRecord` for transparency.

### Decision 3: Blocking Header Pre-Validation check at Gateway Upload
* **Decision**: Perform a quick set intersection overlap check between file headers and a keyword database at the gateway endpoint.
* **Why**: Prevents completely unrelated files (e.g., a payroll spreadsheet) from being processed by the normalization services, saving database writes and immediately alerting the user.
* **Alternative Considered**: Stream the file first and let the rows fail validation one by one.
  * *Why Rejected*: Processing invalid spreadsheets wastes database IDs, creates empty `UploadBatch` logs, and wastes server CPU.
* **Risk/Limitation**: Highly customized CSV files from novel vendor systems might be blocked if they don't share at least one keyword in our database. We address this by logging the failure at the endpoint.

---

## 3. Normalization and Calculation Assumptions

### Decision 4: Deterministic and Constant Emission Factors
* **Decision**: Hardcode standard greenhouse gas emission factors (e.g., 2.68 kg CO₂e/L for Diesel, 0.38 kg CO₂e/kWh for Electricity, and 20.0 kg/night for Hotels) directly in backend logic.
* **Why**: Provides a reliable, consistent calculation baseline for the prototype ledger.
* **Alternative Considered**: Integrate dynamic EPA / DEFRA API lookup services.
  * *Why Rejected*: Integrating dynamic API dependencies increases latency, introduces failure vectors if the external service goes down, and makes calculations harder to replicate for local unit tests.
* **Risk/Limitation**: Real-world emission factors are highly regional (e.g., electricity grid carbon intensity varies heavily between regions like coal-heavy grids vs hydro-heavy grids). Hardcoding a single factor (e.g., 0.38 kg/kWh for electricity) is a significant simplification of real-world ESG calculations.

### Decision 5: Haversine Fallback for Flight Distance Calculations
* **Decision**: If distance values are missing from flight logs, use the Haversine formula to compute airport-to-airport distances based on an internal coordinate map of primary international hubs.
* **Why**: Business travel spreadsheets frequently contain only the origin and destination airport codes (e.g., `JFK` and `LHR`) without the flight mileage. The Haversine fallback preserves the ingestion stream without throwing parser errors.
* **Alternative Considered**: Throw a validation error and fail the row immediately if the distance field is blank.
  * *Why Rejected*: Decreases pipeline throughput and annoys users who expect the software to automatically calculate flight footprint metrics.
* **Risk/Limitation**: Flight routes are rarely straight lines (Haversine calculations are straight-line approximations). Actual routes include headwinds, weather detours, and holding patterns, which under-calculates actual carbon impact by 10-15%.

---

## 4. UI/UX and Authentication Simplifications

### Decision 6: Client-Side Routing and Local Session Storage Authentication
* **Decision**: Use single-state conditional rendering for page navigation (displaying `LoginPage` when unauthenticated and the core shell when logged in), securing sessions with `localStorage` (`madhav_logged_in`).
* **Why**: Keep the bundle lightweight. Since the prototype does not require intricate permission trees or multi-page routing, this client-side state router provides the user with an instantaneous, responsive experience.
* **Alternative Considered**: Install `react-router-dom` and implement backend JWT token auth verification.
  * *Why Rejected*: A full token authentication structure introduces significant overhead and database user schema configurations that are overkill for a simple analyst prototype.
* **Risk/Limitation**: Storing raw login state in `localStorage` is insecure for production environments. However, for a demonstration sandbox running with mock data, it is a highly effective, low-friction solution.

---

## 5. Questions for Stakeholders / Product Managers

To move this prototype toward enterprise production, we would ask stakeholders:
1. **Regional Grids**: "How should we handle grid emission factors? Do we need to integrate a third-party service like Climatiq to resolve local utility supplier grid factors?"
2. **Audit Logging**: "For compliance certifications (e.g. CSRD or SEC reporting), do we need to log the active email/ID of the analyst who approved the record, or is an anonymous signature like 'Analyst Console' sufficient?"
3. **Data Pipeline Size**: "What are the expected average file sizes? Should the ingestion gateway be refactored into an asynchronous queue (using Celery and Redis) to process spreadsheets with millions of rows in the background?"
