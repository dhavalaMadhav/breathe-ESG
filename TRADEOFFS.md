# Technical Trade-offs and Intentional Debt (TRADEOFFS.md)

This document outlines the compromises, security simplifications, performance limitations, and intentional technical debt accepted during the development of this ESG platform prototype.

---

## 1. Core Architectural Compromises

### 1. Synchronous vs. Asynchronous Ingestion Processing
* **Trade-off**: The upload gateway endpoint (`upload_csv`) parses, translates, normalizes, detects anomalies, and commits records **synchronously** in a single thread.
* **Why**: For small datasets (100–1,000 rows), synchronous execution provides a simpler implementation. The front-end receives immediate feedback (the processed batch statistics) in a single request/response cycle, eliminating the need to manage complex websocket or polling systems.
* **Production Concern / What would break**: Uploading a real enterprise utility record file with 500,000 rows will trigger a gateway timeout (HTTP 504 Gateway Timeout) on typical hosting environments (like Render or AWS ELB). 
* **Refactoring Strategy**: The ingestion step must be refactored into an asynchronous task queue (e.g. using Celery with Redis/RabbitMQ). The client would upload the file to an S3 bucket, receive an immediate `202 Accepted` response with a batch task ID, and poll a status endpoint or listen to WebSockets to track the progress of the worker node.

### 2. Embedded Database (SQLite) vs. Production Database (PostgreSQL)
* **Trade-off**: The backend utilizes SQLite as its storage engine.
* **Why**: Zero configuration, self-contained, and highly portable. SQLite facilitates seamless deployments on small test environments and local machines without managing complex database servers.
* **Production Concern / What would break**: SQLite locks the entire database file during write transactions. Multiple users uploading spreadsheets concurrently will encounter `database is locked` operational errors (django.db.utils.OperationalError). Furthermore, lack of native support for concurrency limits horizontal scaling.
* **Refactoring Strategy**: Transition the production configuration to PostgreSQL. The schema is already designed with clean foreign keys and standard JSONB/JSON fields, making a migration to PostgreSQL simple.

---

## 2. Simplification of ESG and Calculation Correctness

### 3. Static Emission Factors vs. Dynamic Regional Grids
* **Trade-off**: Electricity consumption is multiplied by a static factor of `0.38 kg CO₂e/kWh`.
* **Why**: Real-world emission grids are highly complex. To calculate exact emissions, an enterprise must look up the hourly local grid fuel mix (coal vs. wind) for the specific substation. A single static factor keeps calculations transparent and easy to audit for a prototype ledger.
* **Production Concern / What would break**: A factory in Sweden (primarily powered by clean hydro-electric energy) will have its footprint massively over-calculated, while a facility in a coal-heavy region will be under-calculated, leading to inaccurate environmental disclosures that violate regulatory standards (like CSRD or SEC climate disclosure rules).
* **Refactoring Strategy**: Refactor the normalization service to map the `location` field to local zip codes or ISO country codes and fetch live location-based grid factors from carbon intensity databases (like the EPA eGRID for US locations or electricityMap API for global lookups).

### 4. Direct Airport-to-Airport Distance vs. Real Flight Lineage
* **Trade-off**: The platform uses straight-line Haversine calculations between airport hubs if the mileage is blank in corporate travel spreadsheets.
* **Why**: Extremely fast to calculate, requiring no external network calls to third-party route planners.
* **Production Concern / What would break**: Underestimation of travel footprints. Standard flights regularly fly longer routes to avoid weather anomalies or wait in holding patterns, and corporate travel often involves connecting flights rather than direct paths.
* **Refactoring Strategy**: Integrate with standard aviation APIs (such as the IATA FlightPath API or Google Flights) to query the exact route geometry and flight schedule history, ensuring connecting layovers are fully factored in.

---

## 3. Security and Testing Simplifications

### 5. Hardcoded Prototoype Credentials
* **Decision**: Balanced security for speed. The platform uses hardcoded credentials (`username: madhav` and `password: Madhav@3365`) checked in frontend React code rather than a secure, salted database backend hash.
* **Why**: Meets the assignment's explicit instructions for an interactive, database-free landing credential bypass. It allows rapid testing of the core dashboard dashboard workflow without creating full account creation setups.
* **Production Concern / What would break**: Malicious actors could bypass the front-end validation check, or sniff local storage data.
* **Refactoring Strategy**: Implement standard Django authentication protocols (e.g. Django's default secure user model or secure JWT token models like `djangorestframework-simplejwt`), ensuring passwords are encrypted with Argon2/BCrypt on the server and APIs validate auth headers.

---

## 4. Intentional Technical Debt

* **No Automated Migration Rollbacks**: Malformed rows inside a batch that throw parsing exceptions are skipped (`failed += 1` in the loop), rather than rolling back the entire batch. In production, this "partial success" state makes database cleanup complex if a batch must be completely re-uploaded.
* **No Database Indexing**: Fields like `scope`, `status`, and `source_type` are queried frequently in the filters but do not have `db_index=True` configured on their models. For larger databases, this will lead to slow, sequential table scans.
* **No Data Versioning**: When an analyst clicks "Approve" or "Reject", the record is updated in place. There is no historical version tracking if a record is updated multiple times, which reduces auditability.
