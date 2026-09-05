# 🏨 HostelHub — Smart Hostel & Campus Management System

[![Node.js](https://img.shields.io/badge/Node.js-v22-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.21-blue.svg)](https://expressjs.com/)
[![React Native Expo](https://img.shields.io/badge/React%20Native-Expo%20SDK%2052-violet.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-teal.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](https://www.postgresql.org/)

---

## 1. Project Context & Purpose

**HostelHub** is a university-level software engineering project designed to modernize university residential operations. Traditional hostel management relies on fragmented paper logs, manual register entries, and uncoordinated communications. HostelHub delivers an automated, role-governed mobile and cloud platform.

The system supports three distinct operational roles through a unified database:
1. **Student** (strictly segmented into **Hosteler** vs. **Day Scholar**)
2. **Warden / Admin** (hostel governance, student allocation, complaint triage, leave and guest approvals, notices, operational analytics)
3. **Mess Incharge** (dining menu scheduling, feedback reviews, and programmatic meal attendance forecasting)

---

## 2. Core Architecture & Design Principles

```
+-------------------------------------------------------------------------+
|                      REACT NATIVE / EXPO MOBILE APP                     |
|           - TypeScript Presentation & Components                        |
|           - Hardware-Backed SecureStore (JWT Token Management)          |
|           - Axios Client with Auto-Retry & Interceptors                 |
|           - TanStack Query (Server State Cache)                         |
+------------------------------------+------------------------------------+
                                     | HTTPS / REST JSON
                                     v
+-------------------------------------------------------------------------+
|                       NODE.JS + EXPRESS API SERVER                      |
|           - Security Layer: Helmet, CORS, Rate-Limiting                 |
|           - Authentication: Signed JWT Access + Refresh Tokens          |
|           - Authorization: Strict RBAC + Student Type Guards            |
|           - Validation: Schema-first Zod Input Parsing                  |
|           - Service Layer: Domain Business Logic & Transactions         |
+------------------------------------+------------------------------------+
                                     | Prisma ORM Connection Pool
                                     v
+-------------------------------------------------------------------------+
|                        POSTGRESQL RELATIONAL DB                         |
|           - 17 Normalized Relational Tables & Enums                     |
|           - Foreign Key Cascades & Strict Capacity Constraints          |
+-------------------------------------------------------------------------+
```

### Architectural Principles
* **Modular Monolith**: Simple to deploy and maintain, avoiding unnecessary microservice complexity.
* **Never Trust the Client**: Role verification, permission checks, residential classification, and room limits are strictly enforced on the server.
* **ACID Transactions**: Allocations and multi-step transitions use Prisma atomic transactions to prevent race conditions.
* **Programmatic Meal Analytics**: Expected meal consumption is computed via real business rules:
  $$\text{Expected Meals} = \text{Eligible Hostelers} - \text{Students on Approved Leave} + \text{Approved Guests}$$

---

## 3. Technology Stack Rationale

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Mobile Client** | **React Native (Expo SDK 52) + TypeScript** | Beginner-friendly, hot reloading on physical Android devices via Expo Go, type safety, and seamless APK builds. |
| **API Backend** | **Node.js + Express + TypeScript** | Asynchronous non-blocking I/O, industry standard, vast ecosystem, clean layered architecture. |
| **Data Layer** | **Prisma ORM + PostgreSQL** | Strong typing, declarative migrations, connection pooling, and strict relational integrity. |
| **Authentication** | **JWT + bcryptjs + SecureStore** | Stateless, tamper-proof authentication with tokens stored securely in hardware keystore. |
| **Input Validation** | **Zod** | Runtime request payload validation guarding against bad requests and injection attacks. |

---

## 4. Repository Directory Structure

```
Hostel_Management_System/
├── .gitignore                    # Comprehensive ignore rules (Node, Expo, Android, iOS, OS)
├── README.md                     # Project documentation and developer guide
├── docs/                         # Detailed architectural specifications
│   ├── architecture.md           # System design, data flow, security, and formulas
│   ├── database-schema.md        # Data dictionary, 17 tables, relationships, and enums
│   └── rbac-matrix.md            # Role-Based Access Control matrix and middleware rules
├── backend/                      # Node.js + Express + TypeScript API Server
│   ├── package.json              # Backend dependencies and scripts
│   ├── tsconfig.json             # Strict TypeScript configuration
│   ├── .env.example              # Environment variables template
│   ├── prisma/
│   │   └── schema.prisma         # Complete PostgreSQL schema (17 models)
│   └── src/
│       ├── config/               # Env parsing & Prisma DB singleton
│       ├── constants/            # Role, HTTP status, and domain enums
│       ├── controllers/          # HTTP request handlers (Health check, etc.)
│       ├── middlewares/          # Auth, RBAC, error handling middlewares
│       ├── routes/               # API endpoint routing (/api/v1)
│       ├── services/             # Domain business logic layer
│       ├── types/                # Global types and Express Request augmentation
│       ├── utils/                # Logger and standardized API responses
│       └── index.ts              # Express application entry point
└── mobile/                       # React Native Expo Mobile Application
    ├── package.json              # Mobile dependencies and scripts
    ├── app.json                  # Expo application configuration
    ├── tsconfig.json             # Mobile TypeScript configuration
    ├── .env.example              # Mobile environment configuration
    ├── App.tsx                   # Foundation verification screen
    └── src/
        ├── api/                  # Axios HTTP client with SecureStore interceptors
        ├── constants/            # Design system tokens (colors, typography, spacing)
        └── types/                # Shared mobile interfaces
```

---

## 5. Development Setup & Getting Started

### Prerequisites
* **Node.js**: v20+ or v22+ (verified on v22.20.0)
* **npm**: v10+ (verified on 10.9.3)
* **Git**: Installed and configured
* **Database**: PostgreSQL (Local Docker or free cloud instance like Neon / Supabase)
* **Mobile Preview**: [Expo Go](https://expo.dev/go) app installed on your Android / iOS smartphone.

### 1. Clone the Repository
```bash
git clone https://github.com/why-Luckyy/hostelhub.git
cd hostelhub
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL DATABASE_URL and JWT secrets

# Generate Prisma Client
npm run prisma:generate

# Start the development server
npm run dev
```
The API server will launch at `http://localhost:5000/api/v1` with health check at `/health`.

### 3. Mobile Setup
```bash
cd ../mobile

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start the Expo development bundler
npm run start
```
Scan the displayed QR code with your smartphone camera or the **Expo Go** application to preview the app instantly.

---

## 6. Development Roadmap

- [x] **Phase 1: Project Foundation & Architecture**
  - Environment inspection & stack finalization
  - System architecture & database schema (17 models)
  - RBAC security matrix specification
  - Monorepo folder structure & Git configuration
  - Health check endpoint & mobile foundation screen
- [ ] **Phase 2: Authentication & User Management**
  - User registration, login, refresh token rotation
  - Password hashing with bcrypt
  - Hosteler vs. Day Scholar classification logic
- [ ] **Phase 3: Hostel & Room Allocation**
  - Hostel building, floor, and room CRUD
  - Capacity enforcement and bed assignment transactions
- [ ] **Phase 4: Student Complaint Workflow**
  - Complaint submission with categories and photo attachments
  - Admin triage, assignment, and status updates
- [ ] **Phase 5: Leave & Guest Management**
  - Student leave request lifecycle
  - Guest request approval and temporary pass generation (G-YYMMDD-XXXX)
- [ ] **Phase 6: Mess Operations & Analytics**
  - Weekly menu management
  - Automated expected meal computation formula
  - Student meal feedback analytics
- [ ] **Phase 7: Campus Presence & Geofencing**
  - GPS coordinate capture and Haversine distance verification on server
- [ ] **Phase 8: Polish, Packaging & Production Android APK**
  - Comprehensive automated tests
  - EAS Build generation for physical Android APK distribution

---

## 7. License & Academic Integrity

This project is developed as an academic software engineering initiative. All rights reserved.
