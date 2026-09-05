# HostelHub — System Architecture Documentation

## 1. System Overview

**HostelHub** is a production-grade, modular software system designed to streamline university hostel operations. It replaces paper logs, disjointed spreadsheets, and manual registers with a unified, role-governed digital platform.

The system is architected as a **Modular Monolith** comprising:
1. **Mobile Client**: A cross-platform React Native mobile application built on the Expo managed workflow with TypeScript.
2. **API Backend**: A Node.js application built with Express and TypeScript, implementing clean layered separation (Routes, Middlewares, Controllers, Services, and Data Access).
3. **Database Layer**: PostgreSQL managed via Prisma ORM for type-safe database migrations, ACID transactions, and strict relational integrity.

---

## 2. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              MOBILE CLIENT                              |
|                      (React Native / Expo + TypeScript)                 |
|                                                                         |
|  +-------------------+  +-------------------+  +---------------------+  |
|  | Presentation / UI |  | Client State /    |  | SecureStore         |  |
|  | (Screens & Comps) |  | TanStack Query    |  | (JWT Tokens)        |  |
|  +---------+---------+  +---------+---------+  +----------+----------+  |
|            |                      |                       |             |
|            +----------------------+-----------------------+             |
|                                   |                                     |
|                      +------------v------------+                        |
|                      | Axios HTTP Client       |                        |
|                      | (Auth Interceptors)     |                        |
|                      +------------+------------+                        |
+-----------------------------------|-------------------------------------+
                                    | HTTPS / REST (JSON)
                                    v
+-------------------------------------------------------------------------+
|                               BACKEND API                               |
|                     (Node.js + Express + TypeScript)                    |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Security & Request Pipeline                                       |  |
|  | - Helmet (Security Headers)       - CORS Policy                   |  |
|  | - Express Rate Limiter            - JSON Body Parser              |  |
|  | - JWT Authentication Middleware   - RBAC Authorization Middleware |  |
|  | - Zod Input Validation            - Centralized Error Handler     |  |
|  +--------------------------------+----------------------------------+  |
|                                   |                                     |
|                      +------------v------------+                        |
|                      | Controllers Layer       |                        |
|                      | (HTTP Request/Response) |                        |
|                      +------------+------------+                        |
|                                   |                                     |
|                      +------------v------------+                        |
|                      | Service Layer           |                        |
|                      | (Business Logic & Trans)|                        |
|                      +------------+------------+                        |
|                                   |                                     |
|                      +------------v------------+                        |
|                      | Prisma ORM Client       |                        |
|                      | (Type-Safe Query Layer) |                        |
|                      +------------+------------+                        |
+-----------------------------------|-------------------------------------+
                                    | Prisma Connection Pool
                                    v
+-------------------------------------------------------------------------+
|                               DATABASE                                  |
|                         (PostgreSQL 16+)                                |
|                                                                         |
|  [Users]  [StudentProfiles]  [Hostels]  [Floors]  [Rooms]  [BedAllocs]  |
|  [Complaints]  [Leaves]  [Guests]  [Notices]  [MessMenus]  [Geofences]  |
+-------------------------------------------------------------------------+
```

---

## 3. Core Architectural Principles

### 3.1. Layered Architecture (Separation of Concerns)
To keep code clean, testable, and maintainable, the backend strictly divides duties into four tiers:
* **Routes (`/routes`)**: Define API endpoints, HTTP verbs, and attach middleware guards.
* **Controllers (`/controllers`)**: Parse incoming HTTP request parameters, call the corresponding service, and return standardized JSON HTTP responses. Controllers contain **zero database queries**.
* **Services (`/services`)**: House 100% of the domain business logic, access control assertions, calculations, and transactional workflows.
* **Data Access (`/prisma`)**: Prisma models and generated types provide type safety and manage relational queries.

### 3.2. Zero Trust on Client Data
* The backend **never** relies on the client's self-reported role or user ID.
* The authenticated user ID and role are decoded directly from the cryptographically verified JWT payload.
* Entity mutations verify ownership: e.g., a student can only view or cancel their own leave request, and cannot view or approve requests of other students.

### 3.3. Database Transactions for Multi-Step Mutations
Concurrent updates (such as room capacity allocation and status transitions) use `prisma.$transaction([...])` to guarantee ACID atomicity. If any step fails, the entire transaction rolls back cleanly to prevent orphaned or corrupted state.

---

## 4. Key Business Logic Implementations

### 4.1. Hosteler vs Day Scholar Segregation
* Every student record has an immutable or admin-assigned `studentType` (`HOSTELER` or `DAY_SCHOLAR`).
* Database constraints and backend service checks guarantee:
  * Only `HOSTELER` students can be allocated a room/bed (`BedAllocation`).
  * Only `HOSTELER` students can submit hostel leave requests or guest stay requests.
  * Day scholars can access common campus features, general notices, and mess menus (if permitted for casual meals/canteen).

### 4.2. Expected Meal Calculation Formula
Rather than requiring mess staff to manually count students or run physical card scanners at entry, the backend calculates expected meal requirements programmatically:

$$\text{Expected Meals} = \text{Total Eligible Hostelers} - \text{Hostelers on Approved Leave} + \text{Approved Guests for that Meal}$$

* **Leave Overlap Logic**: A student is counted as absent for a meal if:
  $$\text{Leave Start Date/Time} \le \text{Meal Date/Time} \le \text{Leave End Date/Time}$$
  and the leave request has `status = 'APPROVED'`.
* **Guest Inclusions**: Only guests with `status = 'APPROVED'` and `requestedMeal = currentMeal` for the specified date are added.

### 4.3. Campus Presence / Geofence Validation
* The mobile client submits its current coordinates: $(\text{lat}_{\text{client}}, \text{long}_{\text{client}})$ with timestamp and accuracy.
* The backend calculates the geodesic distance to the campus centroid $(\text{lat}_{\text{campus}}, \text{long}_{\text{campus}})$ using the **Haversine Formula**:

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R \cdot c \quad (\text{where } R = 6,371,000 \text{ meters})$$

* If $d \le \text{Campus Radius}$, the student's status is logged as `isInside = true`.
* The server performs sanity checks on reported accuracy and rejects physically impossible teleportation between successive timestamps.

### 4.4. Guest Pass Verification Lifecycle
1. Student submits request: Guest name, relation, visit date, meal requirement, reason.
2. Status defaults to `PENDING`.
3. Warden approves request: Backend generates a cryptographically formatted unique pass number:
   $$\text{G-YYMMDD-XXXX (e.g. G-260906-0812)}$$
4. Student displays the pass on mobile; hostel/gate personnel can verify the pass number and valid time window.

---

## 5. Security & Data Protection

* **Password Security**: Passwords hashed using `bcryptjs` with a cost factor of 12.
* **Token Management**:
  * Short-lived Access Tokens (15 minutes) for API authorization.
  * Long-lived Refresh Tokens (7 days) with token rotation for seamless session refresh.
  * Mobile client stores tokens in hardware-backed `Expo SecureStore` (Android Keystore / iOS Keychain), never in unencrypted `AsyncStorage`.
* **API Protection**:
  * `helmet` to set HTTP security headers.
  * `express-rate-limit` to prevent brute force attacks on authentication endpoints.
  * `cors` configured to whitelist allowed origins.
  * Strict schema validation via `zod` on all incoming request payloads.

---

## 6. Performance & Scalability Design

* **Database Indexing**: Indexes applied on foreign keys (`userId`, `studentProfileId`, `hostelId`, `roomId`), status columns (`status`, `studentType`), and date ranges (`startDate`, `endDate`, `visitDate`) to guarantee sub-millisecond query execution.
* **Connection Pooling**: Prisma manages a robust PostgreSQL connection pool to handle concurrent spikes.
* **Pagination**: All list endpoints (`/complaints`, `/leaves`, `/students`, `/notices`) enforce limit/offset or cursor-based pagination with a default page size of 20.
