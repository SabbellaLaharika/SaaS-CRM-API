# Multi-Tenant SaaS CRM REST API with Role-Based Access Control (RBAC)

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-v4.19-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v15-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-85EA2D?logo=swagger&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

An enterprise-grade Customer Relationship Management (CRM) REST API built to power modern B2B SaaS platforms. This system implements a **Shared Database, Shared Schema** architecture to deliver absolute data isolation across different organizations (tenants), enforces constructor-injected tenant-aware repository queries, and applies comprehensive Role-Based Access Control (RBAC).

---

## 🌍 Real-World Use Cases

In modern cloud computing, multi-tenancy is the foundation of high-margin SaaS applications. Instead of deploying separate server and database instances for every client—which dramatically inflates cloud infrastructure costs—this architecture allows thousands of corporate tenants to securely coexist on a unified backend.

```mermaid
graph TD
    AppGateway["Express API Gateway & Security Firewall"]

    subgraph SaaS_Cloud["Unified SaaS Infrastructure (PostgreSQL Shared Engine)"]
        Tenant1["🏢 Tenant A: Enterprise Tech Corp<br/>Contacts, Deals ($1.2M), Tasks"]
        Tenant2["🏥 Tenant B: Healthcare Partners<br/>Patient Leads, B2B Contracts, Tasks"]
        Tenant3["🛍️ Tenant C: Retail Logistics<br/>Suppliers, Regional Deals, Tasks"]
    end

    AppGateway -->|Scoped JWT: Org A| Tenant1
    AppGateway -->|Scoped JWT: Org B| Tenant2
    AppGateway -->|Scoped JWT: Org C| Tenant3

    classDef tenantBox fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a5f;
    classDef cloudBox fill:#f0f9ff,stroke:#7dd3fc,stroke-width:1.5px,color:#0369a1;
    classDef gatewayBox fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#581c87;
    class Tenant1,Tenant2,Tenant3 tenantBox;
    class SaaS_Cloud cloudBox;
    class AppGateway gatewayBox;
```

### Key Industry Applications
1. **Commercial B2B SaaS Platforms**: Powering CRM products (like HubSpot, Salesforce, or Pipedrive) where multiple paying corporations demand strict data privacy without cross-tenant leakage.
2. **Franchise & Regional Operations**: Allowing nationwide dealership or franchise branches to independently manage sales pipelines, contacts, and tasks while headquarters maintains global governance.
3. **Agency & Client Portals**: Enabling consulting agencies to invite external client stakeholders as **Viewers** to track deal progress and audit records without granting write or delete privileges.
4. **Cloud Infrastructure Cost Optimization**: Drastically reducing database operational costs by leveraging pooled connections and composite indexing instead of managing per-tenant database instances.

---

## 🏗️ High-Level System Architecture & Flow

Every incoming HTTP request travels through a multi-tier security pipeline before touching the database. Security is enforced as a defensive stack: **Authentication -> Tenant Extraction -> RBAC Permission Check -> Creator Ownership Verification -> Tenant-Scoped Repository Querying**.

```mermaid
flowchart TD
    Client(["🌐 Client / API Consumer<br/>(Postman / Web App)"]) -->|HTTP Request + Bearer JWT| Router["1. Express Router<br/>(/api/* routes)"]
    
    subgraph Security_Middleware["Security & Tenancy Middleware Stack"]
        Router --> AuthMid["2. Auth & Tenancy Middleware<br/>• Verify JWT Signature<br/>• Extract req.tenantInfo"]
        AuthMid --> RBACMid["3. RBAC Policy Middleware<br/>• Owner/Admin: Full Access<br/>• Member: Creator Scoped<br/>• Viewer: Block Writes (403)"]
    end

    subgraph App_Core["Application Business Core"]
        RBACMid --> Controller["4. Controller Layer<br/>• Validate Schema & Params"]
        Controller --> Service["5. Service Layer<br/>• Atomic Transactions<br/>• FK Ownership Check"]
        Service --> Repo["6. Tenant Repositories<br/>• Injected organizationId<br/>• WHERE organization_id = $1"]
    end

    subgraph Persistence["Persistence Layer"]
        Repo --> PostgreSQL[("🐘 PostgreSQL 15<br/>• Shared Tenant Partitions<br/>• Composite Indexes<br/>• Cascading Deletes")]
    end

    PostgreSQL -->|Scoped Result Set| Service
    Service -->|Domain Response| Controller
    Controller -->|200 / 201 / 404 Response| Client

    classDef clientStyle fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a5f;
    classDef routerStyle fill:#e2e8f0,stroke:#64748b,stroke-width:2px,color:#1e293b;
    classDef secStyle fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95;
    classDef coreStyle fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d;
    classDef dbStyle fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f;
    class Client clientStyle;
    class Router routerStyle;
    class AuthMid,RBACMid secStyle;
    class Controller,Service,Repo coreStyle;
    class PostgreSQL dbStyle;
```

---

## 🛡️ Multi-Tenancy & Data Isolation (Zero Leakage Strategy)

Data isolation is guaranteed through a **3-tier defense-in-depth model**:

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Tenant A User
    participant API as Express API Router
    participant Auth as Tenancy Middleware
    participant Repo as ContactRepository(org_A)
    participant DB as PostgreSQL Database

    Note over Attacker,DB: Scenario 1: Cross-Tenant Probe (IDOR Attack Attempt)
    Attacker->>API: GET /api/contacts/id_of_tenant_b_contact
    API->>Auth: Pass Bearer Token
    Auth->>Auth: Decoded organizationId = 'org_A'
    Auth->>Repo: Instantiate with ('org_A')
    Repo->>DB: SELECT * FROM contacts WHERE id = 'id_of_tenant_b' AND organization_id = 'org_A'
    DB-->>Repo: 0 rows matched (Not Found)
    Repo-->>API: Returns null
    API-->>Attacker: 404 Not Found (Resource masked! Zero leakage)

    Note over Attacker,DB: Scenario 2: Legitimate Tenant Query
    Attacker->>API: GET /api/contacts/id_of_tenant_a_contact
    API->>Auth: Pass Bearer Token
    Auth->>Repo: Instantiate with ('org_A')
    Repo->>DB: SELECT * FROM contacts WHERE id = 'id_of_tenant_a' AND organization_id = 'org_A'
    DB-->>Repo: 1 row matched
    Repo-->>API: Returns contact data
    API-->>Attacker: 200 OK with Contact Payload
```

### Why 404 Not Found instead of 403 Forbidden?
In multi-tenant environments, returning a `403 Forbidden` on an IDOR attempt is an **anti-pattern** because it confirms that the resource ID exists in someone else's organization, enabling malicious ID harvesting. Returning `404 Not Found` completely masks the existence of foreign tenant records.

### Foreign Key Ownership Verification (Anti-Hijacking)
When creating a Deal or Task linked to a Contact, standard database foreign keys only verify that the `contact_id` exists—they do not ensure it belongs to the *same* tenant.  
Our Service layer explicitly queries `contactRepo.findById(contact_id)` under the current tenant's scope before writing to the database. If a malicious user attempts to attach their deal to a contact from another tenant, the system rejects it with `400 Bad Request`.

---

## 🔐 Role-Based Access Control (RBAC) Matrix

Users belong to one of four hierarchical roles. The permission engine checks both role tier and record creator:

```mermaid
flowchart TD
    Req["Incoming HTTP<br/>Mutation Request"] --> RoleCheck{"What is the<br/>User Role?"}

    RoleCheck -->|Owner| AllowAll["✅ Full Access<br/>(Create / Edit / Delete)"]
    RoleCheck -->|Admin| AllowAll
    
    RoleCheck -->|Member| MemberCheck{"Action<br/>Type?"}
    MemberCheck -->|Create| AllowCreate["✅ Allow Create"]
    MemberCheck -->|Update or Delete| CreatorCheck{"Is User the<br/>Creator?"}
    CreatorCheck -->|Yes: created_by == userId| AllowMutation["✅ Allow Mutation"]
    CreatorCheck -->|No: created_by != userId| DenyMember["❌ 403 Forbidden<br/>(Not Creator)"]

    RoleCheck -->|Viewer| DenyViewer["❌ 403 Forbidden<br/>(Read-Only Role)"]

    classDef pass fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d;
    classDef fail fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#7f1d1d;
    classDef check fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0c4a6e;
    class AllowAll,AllowCreate,AllowMutation pass;
    class DenyMember,DenyViewer fail;
    class RoleCheck,MemberCheck,CreatorCheck check;
```

| Permission / Action | Owner | Admin | Member | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **Invite New Users** | ✅ Yes | ✅ Yes | ❌ No (403) | ❌ No (403) |
| **View Contacts / Deals / Tasks** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Create Contacts / Deals / Tasks** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No (403) |
| **Update Contacts / Deals / Tasks** | ✅ All Records | ✅ All Records | ⚠️ **Only if Creator** | ❌ No (403) |
| **Delete Contacts / Deals / Tasks** | ✅ All Records | ✅ All Records | ⚠️ **Only if Creator** | ❌ No (403) |
| **View Org Analytics Dashboard** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 🗄️ Database Schema & Entity Relationship Diagram (ERD)

The database schema is designed for multi-tenancy with strict foreign key constraints and index optimizations:

```mermaid
erDiagram
    organizations ||--o{ users : "has members"
    organizations ||--o{ contacts : "owns"
    organizations ||--o{ deals : "owns"
    organizations ||--o{ tasks : "owns"
    
    users ||--o{ contacts : "creates"
    users ||--o{ deals : "creates"
    users ||--o{ tasks : "creates"

    contacts ||--o{ deals : "associated with"
    contacts ||--o{ tasks : "associated with"
    deals ||--o{ tasks : "associated with"

    organizations {
        uuid id PK
        varchar name
        timestamp created_at
    }

    users {
        uuid id PK
        uuid organization_id FK
        varchar email
        varchar password_hash
        varchar role
        timestamp created_at
    }

    contacts {
        uuid id PK
        uuid organization_id FK
        varchar name
        varchar email
        varchar phone
        uuid created_by FK
        timestamp created_at
    }

    deals {
        uuid id PK
        uuid organization_id FK
        varchar title
        numeric value
        varchar stage
        uuid contact_id FK
        uuid created_by FK
        timestamp created_at
    }

    tasks {
        uuid id PK
        uuid organization_id FK
        varchar title
        varchar status
        timestamp due_date
        uuid contact_id FK
        uuid deal_id FK
        uuid created_by FK
        timestamp created_at
    }
```

### Database Performance & Composite Indexes
To ensure sub-millisecond query performance as tenant data scales into millions of rows, the following indexes are defined in `src/models/schema.sql`:
* `idx_users_org_id` on `users(organization_id)`
* `idx_contacts_org_id` on `contacts(organization_id)`
* `idx_contacts_org_id_email` on `contacts(organization_id, email)`
* `idx_deals_org_id` on `deals(organization_id)`
* `idx_deals_org_id_stage` on `deals(organization_id, stage)` *(Optimizes `/api/dashboard` stage aggregations)*
* `idx_tasks_org_id` on `tasks(organization_id)`
* `idx_tasks_org_id_status` on `tasks(organization_id, status)` *(Optimizes `/api/dashboard` pending task counts)*
* Foreign key index lookups on `deals(contact_id)`, `tasks(contact_id)`, and `tasks(deal_id)`.

---

## 📂 Project Directory Structure

```plaintext
SaaS-CRM-API/
├── Dockerfile                  # Container build instructions for API server
├── docker-compose.yml          # Multi-container orchestration (API + PostgreSQL)
├── package.json                # Project dependencies and test scripts
├── swagger.yaml                # Complete OpenAPI 3.0 API specification
├── .env.example                # Template for environment variables
├── src/
│   ├── app.js                  # Express app setup, Swagger UI mount & centralized error handling
│   ├── controllers/            # HTTP request parameter extraction and response formatting
│   │   ├── authController.js   # Registration, login, profile endpoints
│   │   ├── crmController.js    # Contacts, Deals, Tasks, Dashboard endpoints
│   │   └── orgController.js    # Organization user invitations
│   ├── middlewares/            # Interceptor pipeline
│   │   ├── authMiddleware.js   # JWT validation & tenant context attachment
│   │   └── rbacMiddleware.js   # Role-based route guard
│   ├── models/                 # Database initialization and DDL schemas
│   │   ├── db.js               # PostgreSQL connection pool configuration
│   │   └── schema.sql          # Table definitions, constraints, and composite indexes
│   ├── repositories/           # Constructor-injected tenant-scoped data access layer
│   │   ├── contactRepository.js
│   │   ├── dealRepository.js
│   │   ├── taskRepository.js
│   │   └── userRepository.js
│   └── services/               # Core business logic, transaction management & FK verification
│       ├── authService.js      # Atomic registration with BEGIN/COMMIT/ROLLBACK
│       ├── crmService.js       # Cross-tenant integrity, dashboard aggregations, creator checks
│       └── orgService.js       # User invitation management
└── tests/                      # Automated integration and isolation test suite
    └── integration/
        └── crm.test.js         # Comprehensive IDOR, RBAC, and transaction test cases
```

---

## 🚀 Setup & Execution Guide

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running, OR
* [Node.js](https://nodejs.org/) (v18+) and [PostgreSQL](https://www.postgresql.org/) (v14+) installed locally.

### Environment Configuration
Create a `.env` file from the example template:
```bash
cp .env.example .env
```

Default configuration in `.env`:
```env
PORT=8080
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saas_crm
JWT_SECRET=super_secret_jwt_key_for_saas_crm_api
```

---

### Option 1: Run with Docker Compose (Recommended)

Boot the entire containerized stack with a single command:
```bash
docker-compose up -d --build
```
* **API Service**: Running on [http://localhost:8080](http://localhost:8080)
* **PostgreSQL Database**: Running on port `5432` with auto-initialized schema migrations.

To stop the containers:
```bash
docker-compose down
```

---

### Option 2: Run & Test Locally

#### Handling Local PostgreSQL Port Conflicts
If you already have a local PostgreSQL instance running natively on port `5432`, avoid conflicts by mapping the Docker database container to port `5434`:
1. In your `.env`, set:
   ```env
   DB_PORT=5434
   DB_HOST_PORT=5434
   ```
2. Start only the PostgreSQL database container:
   ```bash
   docker-compose up -d db
   ```
3. Install dependencies and start the API in development mode:
   ```bash
   npm install
   npm run dev
   ```

#### Execute Automated Test Suite
To run the automated integration tests:
```bash
npm test
```
The test suite validates:
* Organization + Owner registration within an atomic transaction.
* JWT generation containing `userId`, `organizationId`, and `role`.
* Cross-tenant IDOR attacks masked with `404 Not Found`.
* Foreign key hijacking attempts rejected with `400 Bad Request`.
* Viewer role mutation blockages enforced with `403 Forbidden`.
* Member role creator-based update and delete constraints.
* Dashboard statistics aggregations strictly bounded by tenant ID.

---

## 📖 API Documentation & Swagger UI

The complete OpenAPI 3.0 specification is available interactively when the server is running:

* **Interactive Swagger UI**: Navigate to [http://localhost:8080/api-docs](http://localhost:8080/api-docs)
* **OpenAPI Raw Specification**: [swagger.yaml](swagger.yaml)

### Summary of REST Endpoints

| Category | Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Register new organization + owner user | Public |
| **Auth** | `POST` | `/api/auth/login` | Authenticate user & receive tenant-scoped JWT | Public |
| **Auth** | `GET` | `/api/auth/me` | Get authenticated user profile & tenant info | Authenticated |
| **Organizations** | `POST` | `/api/organizations/invites` | Invite new user to current tenant | Owner, Admin |
| **Contacts** | `GET` | `/api/contacts` | List all contacts in tenant | Any role |
| **Contacts** | `POST` | `/api/contacts` | Create a contact | Owner, Admin, Member |
| **Contacts** | `GET` | `/api/contacts/:id` | Get contact by ID (tenant-scoped) | Any role |
| **Contacts** | `PUT` | `/api/contacts/:id` | Update contact (creator or admin/owner) | Owner, Admin, Member |
| **Contacts** | `DELETE` | `/api/contacts/:id` | Delete contact (creator or admin/owner) | Owner, Admin, Member |
| **Deals** | `GET` | `/api/deals` | List all deals in tenant | Any role |
| **Deals** | `POST` | `/api/deals` | Create deal (validates contact ownership) | Owner, Admin, Member |
| **Deals** | `GET` | `/api/deals/:id` | Get deal by ID (tenant-scoped) | Any role |
| **Deals** | `PUT` | `/api/deals/:id` | Update deal | Owner, Admin, Member |
| **Deals** | `DELETE` | `/api/deals/:id` | Delete deal | Owner, Admin, Member |
| **Tasks** | `GET` | `/api/tasks` | List all tasks in tenant | Any role |
| **Tasks** | `POST` | `/api/tasks` | Create task (validates contact & deal ownership) | Owner, Admin, Member |
| **Tasks** | `GET` | `/api/tasks/:id` | Get task by ID (tenant-scoped) | Any role |
| **Tasks** | `PUT` | `/api/tasks/:id` | Update task | Owner, Admin, Member |
| **Tasks** | `DELETE` | `/api/tasks/:id` | Delete task | Owner, Admin, Member |
| **Dashboard** | `GET` | `/api/dashboard` | Get aggregate CRM statistics for tenant | Any role |

---

## 🚀 Future Scope & Planned Improvements

The current implementation is production-ready for core multi-tenant CRM operations. The following enhancements are planned for future iterations:

### 1. PostgreSQL Row-Level Security (RLS)
Add database-engine-level tenant enforcement using PostgreSQL RLS policies. This would act as a second layer of defense — even if application-level scoping were bypassed, the database engine itself would block cross-tenant access.

### 2. Email-Based Invitation Flow
Replace the current temporary password system with a proper email invitation workflow. Invited users would receive a secure, expiring token link to set their own password before first login, following industry-standard onboarding practices.

### 3. Cursor-Based Pagination & Filtering
Implement cursor-based pagination on all list endpoints (`/contacts`, `/deals`, `/tasks`) with support for field-level filtering and sorting. This prevents performance degradation as tenant datasets grow to thousands of records.

### 4. Redis Distributed Caching & Rate Limiting
Integrate Redis to cache frequently accessed dashboard aggregations and enforce per-tenant API rate limits. This prevents any single tenant from monopolizing shared compute resources under high load.

### 5. Audit Log Trail
Record all write operations (create, update, delete) to an immutable `audit_logs` table with actor, timestamp, action type, and before/after state. This supports compliance requirements (GDPR, SOC 2) for enterprise customers.
