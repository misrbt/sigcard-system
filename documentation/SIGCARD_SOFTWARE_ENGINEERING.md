# SigCard System — Software Engineering Documentation

**Rural Bank of Talisayan, Inc. (RBT Bank)**
**Misamis Oriental, Philippines**

**Version:** 1.0 | **Date:** March 2026

---

## Table of Contents

- [1. Technology Stack](#1-technology-stack)
- [2. System Architecture](#2-system-architecture)
- [3. Software Development Methodology](#3-software-development-methodology)
- [4. Use Case Diagrams](#4-use-case-diagrams)
- [5. Data Flow Diagrams (DFD)](#5-data-flow-diagrams-dfd)
- [6. Process Flow Diagrams](#6-process-flow-diagrams)
- [7. Sequence Diagrams](#7-sequence-diagrams)
- [8. Component Diagram](#8-component-diagram)
- [9. Deployment Diagram](#9-deployment-diagram)
- [10. State Diagrams](#10-state-diagrams)
- [11. Class Diagram (Backend)](#11-class-diagram-backend)
- [12. API Route Map](#12-api-route-map)
- [13. Security Architecture](#13-security-architecture)

---

## 1. Technology Stack

### 1.1 Stack Overview

```mermaid
block-beta
    columns 3
    block:frontend["Frontend"]:3
        A["React 19.1"] B["Tailwind CSS 4.1"] C["Vite 7.1"]
    end
    block:communication["Communication Layer"]:3
        D["Axios (HTTP Client)"] E["Laravel Sanctum 4.2 (Token Auth)"] F["RESTful JSON API"]
    end
    block:backend["Backend"]:3
        G["Laravel 12 (PHP 8.2+)"] H["Spatie Permission 6.21"] I["Spatie Activity Log 4.10"]
    end
    block:database["Data Layer"]:3
        J["MySQL / MariaDB"] K["Laravel Cache (Settings)"] L["File Storage (Documents)"]
    end
```

### 1.2 Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1 | UI component library (SPA) |
| **React Router DOM** | 7.9 | Client-side routing, role-based route guards |
| **Tailwind CSS** | 4.1 | Utility-first CSS framework |
| **Vite** | 7.1 | Build tool and dev server |
| **Axios** | 1.12 | HTTP client for API communication |
| **TanStack React Query** | 5.90 | Server state management, caching, and synchronization |
| **Chart.js** | 4.5 | Dashboard charts and graphs |
| **react-chartjs-2** | 5.3 | React wrapper for Chart.js |
| **Framer Motion** | 12.23 | Animations and transitions |
| **SweetAlert2** | 11.23 | Modal dialogs and alerts |
| **React Icons** | 5.5 | Icon library (HeroIcons, Material Design) |
| **React Dropzone** | 14.3 | Drag-and-drop file upload |
| **React Image Crop** | 11.0 | Image cropping functionality |
| **browser-image-compression** | 2.0 | Client-side image compression |
| **ESLint** | 9.38 | Code linting and quality |

### 1.3 Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **PHP** | 8.2+ | Server-side programming language |
| **Laravel Framework** | 12.0 | Web application framework |
| **Laravel Sanctum** | 4.2 | API token authentication (SPA + token) |
| **Spatie Laravel Permission** | 6.21 | Role-Based Access Control (RBAC) |
| **Spatie Laravel Activity Log** | 4.10 | Audit trail and compliance logging |
| **Intervention Image** | 3.11 | Server-side image processing |
| **Laravel Tinker** | 2.10 | REPL for debugging |
| **Laravel Pint** | 1.24 | PHP code formatter (PSR-12) |
| **Laravel Sail** | 1.41 | Docker development environment |
| **PHPUnit** | 11.5 | Unit and feature testing |
| **Faker** | 1.23 | Test data generation |
| **Mockery** | 1.6 | Mocking framework for tests |

### 1.4 Database & Infrastructure

| Technology | Purpose |
|------------|---------|
| **MySQL / MariaDB** | Primary relational database |
| **Laravel Cache** | System settings storage (key-value via database driver) |
| **Laravel File Storage** | Document storage (signature cards, NAIS, privacy forms) |
| **Laravel Queue** | Background job processing (jobs, job_batches, failed_jobs tables) |

### 1.5 Development Tools

| Tool | Purpose |
|------|---------|
| **Vite** | Frontend build and HMR (Hot Module Replacement) |
| **Concurrently** | Run Laravel server, queue worker, and Vite dev server in parallel |
| **Laravel Boost** | MCP dev tools (documentation search, tinker, database queries) |
| **Laravel Pail** | Real-time log viewer |
| **PostCSS + Autoprefixer** | CSS processing pipeline |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer (Browser)"]
        SPA["React 19 SPA"]
        RR["React Router<br/>(Role-Based Guards)"]
        AC["AuthContext<br/>(Token + Session State)"]
        AX["Axios HTTP Client<br/>(Interceptors + Auto-Refresh)"]
    end

    subgraph API["API Layer (Laravel 12)"]
        MW["Middleware Stack<br/>auth:sanctum → role:X → track.activity"]
        RT["Route Groups<br/>/auth, /admin, /manager,<br/>/user, /cashier, /compliance,<br/>/customers"]
        CT["Controllers<br/>AuthController, AdminController,<br/>CustomerController, etc."]
    end

    subgraph Business["Business Logic Layer"]
        BSP["BSPAuthService<br/>(Login, Lockout, 2FA,<br/>Risk Assessment)"]
        FR["Form Requests<br/>(Validation)"]
        SP["Spatie Permission<br/>(RBAC Engine)"]
        AL["Spatie Activity Log<br/>(Audit Engine)"]
    end

    subgraph Data["Data Layer"]
        EL["Eloquent ORM<br/>(Models + Relationships)"]
        DB[(MySQL / MariaDB)]
        FS[("File Storage<br/>(Document Images)")]
        CA[("Cache<br/>(System Settings)")]
    end

    SPA --> RR --> AC --> AX
    AX -- "HTTPS / JSON" --> MW --> RT --> CT
    CT --> BSP
    CT --> FR
    CT --> SP
    CT --> AL
    CT --> EL
    EL --> DB
    CT --> FS
    BSP --> CA
    BSP --> DB
```

### 2.2 Frontend Architecture (React SPA)

```mermaid
flowchart TD
    subgraph Entry["Entry Point"]
        APP["App.jsx"]
    end

    subgraph Auth["Authentication Layer"]
        ACP["AuthProvider<br/>(AuthContext.jsx)"]
        UAH["useAuth Hook"]
        AXI["Axios Interceptors<br/>(Token inject, 401 redirect)"]
    end

    subgraph Routing["Routing Layer"]
        RG["RoleGuard Component"]
        AR["Admin Routes (/admin/*)"]
        MR["Manager Routes (/manager/*)"]
        UR["User Routes (/user/*)"]
        CR["Cashier Routes (/cashier/*)"]
        CMR["Compliance Routes (/compliance/*)"]
    end

    subgraph Layouts["Layout Components"]
        AL2["AppLayout<br/>(Sidebar)"]
        TNL["TopNavLayout<br/>(Top Nav Bar)"]
        UL["UserLayout<br/>(Dark Navbar)"]
    end

    subgraph Pages["Page Components"]
        DP["Dashboards"]
        UP["UploadSigcard<br/>(7-Step Wizard)"]
        CP["CustomerProfiles"]
        CV["CustomerView"]
        UM["UserManagement"]
        RP["RolePermissionMatrix"]
        SS["SystemSettings"]
        AUL["AuditLogs"]
        DM["DataManagement"]
        PR["Profile"]
    end

    subgraph Shared["Shared Services"]
        API["api.js (Axios Instance)"]
        AS["adminService.js"]
    end

    APP --> ACP --> RG
    RG --> AR --> AL2
    RG --> MR --> TNL
    RG --> UR --> UL
    RG --> CR --> TNL
    RG --> CMR --> TNL
    AL2 --> DP & UM & RP & SS & AUL & DM & CP
    TNL --> DP & CP
    UL --> DP & UP & CP
    Pages --> API --> AXI
```

### 2.3 Backend Architecture (Laravel)

```mermaid
flowchart LR
    subgraph Request["HTTP Request"]
        R["JSON API Request<br/>+ Bearer Token"]
    end

    subgraph Middleware["Middleware Pipeline"]
        M1["auth:sanctum<br/>(Token Validation)"]
        M2["RoleMiddleware<br/>(Role Check)"]
        M3["TrackLastActivity<br/>(Session Update)"]
    end

    subgraph Controller["Controller Layer"]
        C1["AuthController"]
        C2["AdminController"]
        C3["CustomerController"]
        C4["ManagerController"]
        C5["CashierController"]
        C6["ComplianceController"]
        C7["BranchController"]
        C8["UserController"]
    end

    subgraph Validation["Validation Layer"]
        V1["StoreCustomerRequest"]
        V2["CreateUserRequest"]
        V3["UpdateUserRequest"]
        V4["SystemSettingsRequest"]
        V5["AddCustomerAccountRequest"]
    end

    subgraph Service["Service Layer"]
        S1["BSPAuthService"]
    end

    subgraph Model["Model Layer (Eloquent)"]
        MD1["User"]
        MD2["Customer"]
        MD3["CustomerDocument"]
        MD4["CustomerHolder"]
        MD5["CustomerAccount"]
        MD6["Branch"]
    end

    R --> M1 --> M2 --> M3 --> Controller
    Controller --> Validation
    C1 --> S1
    Controller --> Model
```

---

## 3. Software Development Methodology

### 3.1 Methodology: Agile (Iterative Incremental)

SigCard follows an **Agile Iterative-Incremental** development methodology, suited for a banking system that must evolve while maintaining BSP compliance.

```mermaid
flowchart LR
    subgraph "Agile SDLC — Iterative Incremental"
        A["1. Requirements<br/>Gathering"] --> B["2. Planning &<br/>Design"]
        B --> C["3. Development<br/>(Sprint)"]
        C --> D["4. Testing &<br/>QA"]
        D --> E["5. Review &<br/>Feedback"]
        E --> F["6. Deployment"]
        F -->|"Next Iteration"| A
    end
```

### 3.2 SDLC Phases Applied to SigCard

```mermaid
flowchart TD
    subgraph Phase1["Phase 1: Requirements Gathering"]
        R1["BSP Circular 951 & 982 compliance requirements"]
        R2["RBT Bank operational needs assessment"]
        R3["User role identification (5 roles)"]
        R4["Branch structure mapping (11 branches)"]
        R5["Document type identification<br/>(Sigcard, NAIS, Privacy, Other)"]
    end

    subgraph Phase2["Phase 2: System Design"]
        D1["Architecture: SPA + REST API (decoupled)"]
        D2["Database design: Relational (MySQL)"]
        D3["Security design: BSP-compliant auth"]
        D4["UI/UX: Role-based layouts"]
        D5["ERD and data flow design"]
    end

    subgraph Phase3["Phase 3: Iterative Development"]
        I1["Iteration 1: Auth + RBAC + User Management"]
        I2["Iteration 2: Customer CRUD + Document Upload"]
        I3["Iteration 3: Branch Hierarchy + Dashboards"]
        I4["Iteration 4: Audit Logs + Compliance Features"]
        I5["Iteration 5: Joint/Corporate Account Types"]
        I6["Iteration 6: Polish, Security Hardening, Testing"]
    end

    subgraph Phase4["Phase 4: Testing"]
        T1["PHPUnit Feature Tests"]
        T2["Manual UAT with banking staff"]
        T3["Security audit (BSP compliance check)"]
        T4["Cross-browser testing"]
    end

    subgraph Phase5["Phase 5: Deployment & Maintenance"]
        DP1["Production deployment"]
        DP2["Staff training"]
        DP3["Ongoing monitoring via audit logs"]
        DP4["Iterative enhancements"]
    end

    Phase1 --> Phase2 --> Phase3 --> Phase4 --> Phase5
```

### 3.3 Development Principles Applied

| Principle | Application in SigCard |
|-----------|----------------------|
| **Separation of Concerns** | Frontend (React SPA) completely decoupled from Backend (Laravel API) |
| **Single Responsibility** | Each controller handles one domain (Auth, Admin, Customer, etc.) |
| **DRY (Don't Repeat Yourself)** | Shared BranchDashboard component used by Manager and Cashier |
| **RBAC (Role-Based Access)** | Spatie Permission enforces access at route, controller, and UI level |
| **Defense in Depth** | Multi-layer security: token auth → role middleware → permission checks → audit log |
| **MVC Pattern** | Laravel Models → Controllers → React Views (API-driven) |
| **RESTful API Design** | Standard HTTP verbs (GET, POST, PUT, DELETE) with consistent resource paths |
| **Form Request Validation** | Validation separated from controllers into dedicated request classes |
| **Service Layer Pattern** | BSPAuthService encapsulates complex authentication business logic |
| **Audit by Default** | Spatie Activity Log tracks all mutations automatically |

---

## 4. Use Case Diagrams

### 4.1 System-Wide Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors
        AD["Admin"]
        MG["Manager"]
        BO["Banking Officer<br/>(User)"]
        CS["Cashier"]
        CA["Compliance<br/>Auditor"]
    end

    subgraph "Authentication Module"
        UC1["Login"]
        UC2["Logout"]
        UC3["Change Password"]
        UC4["Enable/Disable 2FA"]
        UC5["View Active Sessions"]
    end

    subgraph "Customer Management Module"
        UC6["Upload Signature Card<br/>(7-Step Wizard)"]
        UC7["Search Customers"]
        UC8["View Customer Profile"]
        UC9["Edit Customer Documents"]
        UC10["Add Account to Customer"]
        UC11["View Customer History"]
    end

    subgraph "Dashboard Module"
        UC12["View Dashboard"]
        UC13["View Branch Statistics"]
        UC14["View Charts & Reports"]
    end

    subgraph "Administration Module"
        UC15["Manage Users<br/>(Create/Edit/Activate/Deactivate)"]
        UC16["Reset User Password"]
        UC17["Unlock User Account"]
        UC18["Manage Roles & Permissions"]
        UC19["Configure System Settings"]
        UC20["Manage Branch Hierarchy"]
    end

    subgraph "Audit & Compliance Module"
        UC21["View Audit Logs"]
        UC22["Filter Audit by Category"]
        UC23["Export Audit Reports"]
        UC24["View Security Events"]
        UC25["View Login Attempts"]
    end

    %% All actors can authenticate
    AD & MG & BO & CS & CA --> UC1 & UC2 & UC3

    %% Customer management
    BO --> UC6 & UC7 & UC8 & UC9 & UC10 & UC11
    MG --> UC7 & UC8 & UC11
    CS --> UC7 & UC8
    CA --> UC7 & UC8 & UC11
    AD --> UC7 & UC8 & UC9 & UC10 & UC11

    %% Dashboards
    AD & MG & CS & CA --> UC12
    MG & CS --> UC13
    AD & CA --> UC14

    %% Administration
    AD --> UC15 & UC16 & UC17 & UC18 & UC19 & UC20

    %% Audit
    AD --> UC21 & UC22 & UC24 & UC25
    CA --> UC21 & UC22 & UC23 & UC24 & UC25

    %% 2FA & Sessions
    AD & MG & BO & CS & CA --> UC4 & UC5
```

### 4.2 Use Case Matrix (Actor vs. Use Case)

| Use Case | Admin | Manager | Banking Officer | Cashier | Compliance |
|----------|:-----:|:-------:|:---------------:|:-------:|:----------:|
| Login / Logout / Change Password | Yes | Yes | Yes | Yes | Yes |
| Enable/Disable 2FA | Yes | Yes | Yes | Yes | Yes |
| Upload Signature Card | Yes | — | **Yes** | — | — |
| Search Customers | Yes | Yes | Yes | Yes | Yes |
| View Customer Profile | Yes | Yes | Yes | Yes | Yes |
| Edit Customer Documents | Yes | — | **Yes** | — | — |
| Add Account to Customer | Yes | — | **Yes** | — | — |
| View Customer History | Yes | Yes | Yes | — | Yes |
| View Dashboard | Yes | Yes | — | Yes | Yes |
| View Branch Statistics | — | Yes | — | Yes | — |
| Manage Users (CRUD) | **Yes** | — | — | — | — |
| Reset Password / Unlock | **Yes** | — | — | — | — |
| Manage Roles & Permissions | **Yes** | — | — | — | — |
| System Settings | **Yes** | — | — | — | — |
| Branch Hierarchy | **Yes** | — | — | — | — |
| View Audit Logs | Yes | — | — | — | **Yes** |
| Export Audit Reports | — | — | — | — | **Yes** |
| View Security Events | Yes | — | — | — | **Yes** |

---

## 5. Data Flow Diagrams (DFD)

### 5.1 Context Diagram (Level 0)

```mermaid
flowchart LR
    BO["Banking Officer"] -->|"Customer data +<br/>document images"| SYS["SigCard<br/>System"]
    AD["Admin"] -->|"User management,<br/>settings, roles"| SYS
    MG["Manager"] -->|"View requests,<br/>approvals"| SYS
    CS["Cashier"] -->|"View requests"| SYS
    CA["Compliance<br/>Auditor"] -->|"Audit queries,<br/>export requests"| SYS

    SYS -->|"Dashboards,<br/>customer profiles"| BO & MG & CS
    SYS -->|"Audit reports,<br/>compliance data"| CA
    SYS -->|"System status,<br/>user lists"| AD

    SYS <-->|"Read/Write"| DB[(Database)]
    SYS <-->|"Read/Write"| FS[(File Storage)]
```

### 5.2 Level 1 DFD — Major Processes

```mermaid
flowchart TD
    %% External Entities
    USER["Banking Staff<br/>(All Roles)"]
    ADMIN["System Admin"]

    %% Data Stores
    DB_USER[("D1: Users &<br/>Roles Store")]
    DB_CUST[("D2: Customers<br/>Store")]
    DB_DOCS[("D3: Document<br/>Files Store")]
    DB_AUDIT[("D4: Audit<br/>Log Store")]
    DB_CACHE[("D5: Settings<br/>Cache Store")]

    %% Processes
    P1["1.0<br/>Authenticate<br/>User"]
    P2["2.0<br/>Manage<br/>Customers"]
    P3["3.0<br/>Upload &<br/>Store Documents"]
    P4["4.0<br/>Generate<br/>Dashboard"]
    P5["5.0<br/>Administer<br/>System"]
    P6["6.0<br/>Log Audit<br/>Trail"]

    %% Data Flows
    USER -->|"credentials"| P1
    P1 -->|"validate user"| DB_USER
    DB_USER -->|"user + roles + permissions"| P1
    P1 -->|"auth token"| USER

    USER -->|"customer data"| P2
    P2 -->|"store/retrieve"| DB_CUST
    DB_CUST -->|"customer records"| P2
    P2 -->|"customer profiles"| USER

    USER -->|"image files"| P3
    P3 -->|"compressed images"| DB_DOCS
    P3 -->|"document metadata"| DB_CUST

    USER -->|"dashboard request"| P4
    P4 -->|"query stats"| DB_CUST
    DB_CUST -->|"aggregated data"| P4
    P4 -->|"charts + statistics"| USER

    ADMIN -->|"settings, user ops"| P5
    P5 -->|"update"| DB_USER
    P5 -->|"store settings"| DB_CACHE
    DB_CACHE -->|"current settings"| P5

    P1 & P2 & P3 & P5 -->|"action events"| P6
    P6 -->|"audit entries"| DB_AUDIT
    DB_AUDIT -->|"audit data"| USER
```

### 5.3 Level 2 DFD — Customer Document Upload Process

```mermaid
flowchart TD
    BO["Banking Officer"]

    DB_CUST[("D2: Customers")]
    DB_DOCS[("D3: Documents")]
    DB_HOLD[("D2a: Customer<br/>Holders")]
    DB_ACCT[("D2b: Customer<br/>Accounts")]
    DB_AUDIT[("D4: Audit Log")]

    P3_1["3.1<br/>Select Account<br/>Type"]
    P3_2["3.2<br/>Enter Customer<br/>Information"]
    P3_3["3.3<br/>Set Account<br/>Details"]
    P3_4["3.4<br/>Compress &<br/>Upload Images"]
    P3_5["3.5<br/>Create Customer<br/>Record"]
    P3_6["3.6<br/>Store Document<br/>Metadata"]
    P3_7["3.7<br/>Log Upload<br/>Activity"]

    BO -->|"account type selection"| P3_1
    P3_1 -->|"type + sub-type"| P3_2
    BO -->|"name, suffix, company"| P3_2
    P3_2 -->|"customer info"| P3_3
    BO -->|"account no, risk level,<br/>date opened"| P3_3
    P3_3 -->|"validated data"| P3_5
    BO -->|"sigcard, NAIS, privacy,<br/>other doc images"| P3_4
    P3_4 -->|"compressed JPEG files"| DB_DOCS
    P3_5 -->|"customer record"| DB_CUST
    P3_5 -->|"additional holders"| DB_HOLD
    P3_5 -->|"additional accounts"| DB_ACCT
    P3_4 -->|"document records"| P3_6
    P3_6 -->|"file_path, type,<br/>person_index"| DB_CUST
    P3_5 & P3_6 -->|"create event"| P3_7
    P3_7 -->|"audit entry"| DB_AUDIT
```

---

## 6. Process Flow Diagrams

### 6.1 Authentication Process Flow

```mermaid
flowchart TD
    A([Start]) --> B["User opens SigCard URL"]
    B --> C["Login page loads"]
    C --> D["User enters email + password"]
    D --> E["Frontend sends POST /auth/login<br/>with credentials + device_id"]

    E --> F{"Backend: Rate<br/>limit check"}
    F -->|"Exceeded"| G["429: Too many attempts<br/>Wait N seconds"]
    G --> C

    F -->|"OK"| H{"User exists?"}
    H -->|"No"| I["401: Invalid credentials"]
    I --> C

    H -->|"Yes"| J{"Account active?"}
    J -->|"No"| K["403: Account not active"]
    K --> C

    J -->|"Yes"| L{"Account locked?"}
    L -->|"Yes"| M["403: Account locked<br/>Wait 30 minutes"]
    M --> C

    L -->|"No"| N{"Password expired?"}
    N -->|"Yes"| O["403: Password expired"]
    O --> P["Redirect to Change Password"]
    P --> C

    N -->|"No"| Q{"Account expired?"}
    Q -->|"Yes"| R["403: Account expired"]
    R --> C

    Q -->|"No"| S{"Max concurrent<br/>sessions?"}
    S -->|"Yes"| T["403: Max sessions reached"]
    T --> C

    S -->|"No"| U{"Password correct?"}
    U -->|"No"| V["Increment failed attempts"]
    V --> W{"Attempts >= 5?"}
    W -->|"Yes"| X["Lock account 30 min"]
    X --> C
    W -->|"No"| I

    U -->|"Yes"| Y{"2FA enabled?"}
    Y -->|"Yes"| Z["Return: 2FA required +<br/>temporary token"]
    Z --> AA["User enters 6-digit OTP"]
    AA --> AB{"OTP valid?"}
    AB -->|"No"| V
    AB -->|"Yes"| AC["Complete Authentication"]

    Y -->|"No"| AC
    AC --> AD["Reset failed attempts"]
    AD --> AE["Create Sanctum token"]
    AE --> AF["Update last_login_at,<br/>last_login_ip, user_agent"]
    AF --> AG["Track session in Cache"]
    AG --> AH["Log successful login"]
    AH --> AI["Return: token + user +<br/>roles + permissions"]
    AI --> AJ["Frontend stores token<br/>in localStorage"]
    AJ --> AK["Redirect to role dashboard"]
    AK --> AL([End])
```

### 6.2 Signature Card Upload Process Flow

```mermaid
flowchart TD
    A([Start]) --> B["Banking Officer clicks 'Upload'"]
    B --> C["Wizard loads at Step 1"]

    C --> D["Step 1: Select Account Type"]
    D --> E{"Type selected?"}
    E -->|"Regular"| G["Step 3: Customer Info"]
    E -->|"Corporate"| G
    E -->|"Joint"| F["Step 2: Select ITF or Non-ITF"]
    F --> G

    G --> H["Enter: firstname, lastname,<br/>middlename, suffix"]
    H --> I{"Corporate?"}
    I -->|"Yes"| J["Enter: company_name +<br/>Add signatories (min 2)"]
    I -->|"No"| K{"Joint?"}
    K -->|"Yes"| L["Add persons (min 2 total)"]
    K -->|"No"| M["Single person"]
    J & L & M --> N["Step 4: Account Holder Details"]

    N --> O["Enter: account_no, date_opened,<br/>risk_level"]
    O --> P{"Multiple accounts<br/>allowed?"}
    P -->|"Yes (Regular,<br/>Non-ITF, Corporate)"| Q["Optional: Add more accounts"]
    P -->|"No (ITF)"| R["Single shared account"]
    Q & R --> S["Step 5: Upload Sigcard"]

    S --> T["Upload front & back images<br/>via drag-drop or file picker"]
    T --> U["Step 6: Upload NAIS (Optional)"]
    U --> V["Upload front & back<br/>or skip"]
    V --> W["Step 7: Data Privacy Consent"]
    W --> X["Upload front & back"]
    X --> Y["Step 8: Other Documents (Optional)"]
    Y --> Z["Upload multiple files<br/>or skip"]

    Z --> AA["Click Submit"]
    AA --> AB["Frontend: Compress all images<br/>(max 1200x1600, quality 0.82, JPEG)"]
    AB --> AC["Frontend: Build FormData<br/>(customer info + file pairs)"]
    AC --> AD["POST /api/customers<br/>multipart/form-data"]
    AD --> AE{"Backend validation<br/>passes?"}
    AE -->|"No"| AF["Show validation errors"]
    AF --> G
    AE -->|"Yes"| AG["Create customer record"]
    AG --> AH["Create additional holders"]
    AH --> AI["Create additional accounts"]
    AI --> AJ["Store document files<br/>to disk storage"]
    AJ --> AK["Create document<br/>metadata records"]
    AK --> AL["Log audit entry<br/>(customer created)"]
    AL --> AM["Return success response"]
    AM --> AN["Show success modal"]
    AN --> AO["Reset wizard form"]
    AO --> AP([End])
```

### 6.3 User Management Process Flow

```mermaid
flowchart TD
    A([Start]) --> B["Admin navigates to /admin/users"]
    B --> C["System loads user list<br/>GET /admin/users"]

    C --> D{"Action?"}

    D -->|"Create"| E["Click 'Create User'"]
    E --> F["Fill form: name, email,<br/>username, password, branch, role"]
    F --> G["POST /admin/users"]
    G --> H{"Validation OK?"}
    H -->|"No"| I["Show errors"] --> F
    H -->|"Yes"| J["User created + role assigned"]
    J --> K["Audit log: user created"]
    K --> C

    D -->|"Edit"| L["Click user row"]
    L --> M["Modify fields"]
    M --> N["PUT /admin/users/{id}"]
    N --> O["User updated"]
    O --> P["Audit log: user updated<br/>(before/after values)"]
    P --> C

    D -->|"Deactivate"| Q["POST /admin/users/{id}/deactivate"]
    Q --> R["status → inactive"]
    R --> S["Audit log: user deactivated"]
    S --> C

    D -->|"Activate"| T["POST /admin/users/{id}/activate"]
    T --> U["status → active"]
    U --> V["Audit log: user activated"]
    V --> C

    D -->|"Reset Password"| W["POST /admin/users/{id}/reset-password"]
    W --> X["Temp password set +<br/>force_password_change = true"]
    X --> Y["Audit log: password reset"]
    Y --> C

    D -->|"Unlock"| Z["POST /admin/users/{id}/unlock"]
    Z --> AA["failed_login_attempts = 0<br/>account_locked_at = null"]
    AA --> AB["Audit log: account unlocked"]
    AB --> C

    D -->|"Delete"| AC["DELETE /admin/users/{id}"]
    AC --> AD["Soft delete:<br/>status → inactive, email anonymized"]
    AD --> AE["Audit log: user deleted"]
    AE --> C
```

---

## 7. Sequence Diagrams

### 7.1 Login Sequence

```mermaid
sequenceDiagram
    actor User
    participant Browser as React SPA
    participant API as Laravel API
    participant Auth as BSPAuthService
    participant DB as Database
    participant Cache as Cache Store

    User->>Browser: Enter email + password
    Browser->>API: POST /auth/login {email, password, device_id}
    API->>Auth: authenticate(request)
    Auth->>Auth: checkRateLimit(request)
    Auth->>DB: User::where('email', email)
    DB-->>Auth: User record
    Auth->>Auth: performBSPComplianceChecks(user)
    Note over Auth: Check: active, locked, password expiry,<br/>account expiry, concurrent sessions, risk
    Auth->>DB: Hash::check(password)
    alt Password incorrect
        Auth->>DB: user.incrementFailedLoginAttempts()
        Auth-->>API: ValidationException
        API-->>Browser: 422 {errors}
        Browser-->>User: "Invalid credentials"
    else Password correct
        alt 2FA enabled
            Auth-->>API: {status: "two_factor_required", temp_token}
            API-->>Browser: 200 {two_factor_required}
            Browser-->>User: Show OTP input
            User->>Browser: Enter 6-digit code
            Browser->>API: POST /auth/verify-2fa {otp_code, temp_token}
            API->>Auth: verifyOTP(user, code)
        end
        Auth->>DB: user.resetFailedLoginAttempts()
        Auth->>DB: user.update(last_login_at, last_login_ip)
        Auth->>DB: user.createToken('auth-token', expiry)
        Auth->>Cache: trackUserSession(user, token)
        Auth->>DB: Activity::log('login')
        Auth-->>API: {token, user, roles, permissions}
        API-->>Browser: 200 {token, user, roles, permissions}
        Browser->>Browser: localStorage.setItem('authToken', token)
        Browser->>Browser: AuthContext.setUser(user)
        Browser-->>User: Redirect to role dashboard
    end
```

### 7.2 Document Upload Sequence

```mermaid
sequenceDiagram
    actor Officer as Banking Officer
    participant UI as Upload Wizard
    participant Compress as Image Compressor
    participant API as Laravel API
    participant Valid as StoreCustomerRequest
    participant Ctrl as CustomerController
    participant DB as Database
    participant FS as File Storage
    participant Audit as Activity Log

    Officer->>UI: Complete all wizard steps
    Officer->>UI: Click "Submit"
    UI->>Compress: compressImage(files[], 1200x1600, 0.82)
    Compress-->>UI: Compressed JPEG files

    UI->>UI: Build FormData (customer info + file pairs)
    UI->>API: POST /customers (multipart/form-data)
    Note over UI,API: Authorization: Bearer {token}

    API->>Valid: Validate request
    alt Validation fails
        Valid-->>API: 422 {errors}
        API-->>UI: Validation errors
        UI-->>Officer: Show error messages
    else Validation passes
        API->>Ctrl: store(request)
        Ctrl->>DB: Customer::create({name, type, branch, risk_level})
        DB-->>Ctrl: customer record

        loop Each additional holder
            Ctrl->>DB: CustomerHolder::create({customer_id, person_index, name})
        end

        loop Each additional account
            Ctrl->>DB: CustomerAccount::create({customer_id, account_no, risk_level})
        end

        loop Each document pair (sigcard, nais, privacy, other)
            Ctrl->>FS: store(file, 'customers/{id}/')
            FS-->>Ctrl: file_path
            Ctrl->>DB: CustomerDocument::create({customer_id, type, person_index, file_path})
        end

        Ctrl->>Audit: activity()->log('created customer')
        Ctrl-->>API: 201 {customer, message}
        API-->>UI: Success response
        UI-->>Officer: "Customer Saved!" modal
    end
```

### 7.3 Token Auto-Refresh Sequence

```mermaid
sequenceDiagram
    participant Timer as Refresh Timer (every 20 min)
    participant Auth as AuthContext
    participant API as Laravel API
    participant Sanctum as Sanctum Token
    participant DB as Database

    Timer->>Auth: Token refresh interval triggered
    Auth->>API: POST /auth/refresh-token<br/>Authorization: Bearer {old_token}
    API->>Sanctum: Validate current token
    alt Token expired
        Sanctum-->>API: 401 Unauthorized
        API-->>Auth: 401
        Auth->>Auth: logout() + clear localStorage
        Auth->>Auth: navigate('/login')
    else Token valid
        API->>DB: Delete old token
        API->>DB: Create new token (30 min expiry)
        API-->>Auth: {token: new_token, expires_at}
        Auth->>Auth: localStorage.setItem('authToken', new_token)
    end
```

---

## 8. Component Diagram

### 8.1 System Component Diagram

```mermaid
flowchart TB
    subgraph "Frontend Application (React SPA)"
        subgraph "Core"
            AuthCtx["AuthContext<br/>(Authentication State)"]
            Router["React Router<br/>(Role Guards)"]
            AxiosInst["Axios Instance<br/>(Interceptors)"]
        end

        subgraph "Layout Components"
            AppLay["AppLayout<br/>(Admin Sidebar)"]
            TopNav["TopNavLayout<br/>(Manager/Cashier/Compliance)"]
            UserLay["UserLayout<br/>(Banking Officer Navbar)"]
        end

        subgraph "Feature Components"
            Upload["UploadSigcard<br/>(7-Step Wizard)"]
            CustProf["CustomerProfiles<br/>(Search + List)"]
            CustView["CustomerView<br/>(Profile + Documents)"]
            EditDocs["EditCustomerDocs<br/>(Replace Documents)"]
            AddAcct["AddAccount<br/>(New Account)"]
            ImgView["ImageViewer<br/>(Zoom + Pan + Navigate)"]
        end

        subgraph "Admin Components"
            UserMgmt["UserManagement"]
            RolePerm["RolePermissionMatrix"]
            SysSet["SystemSettings"]
            AuditLog["AuditLogs"]
            DataMgmt["DataManagement"]
        end

        subgraph "Dashboard Components"
            AdminDash["Admin Dashboard"]
            BranchDash["BranchDashboard<br/>(Shared: Manager + Cashier)"]
            CompDash["Compliance Dashboard"]
        end

        subgraph "Shared UI"
            DropZone["DropZone<br/>(File Upload)"]
            Charts["Chart.js Components"]
            SwalModal["SweetAlert2 Modals"]
        end
    end

    subgraph "Backend Application (Laravel 12)"
        subgraph "Middleware"
            SanctumMW["auth:sanctum"]
            RoleMW["RoleMiddleware"]
            TrackMW["TrackLastActivity"]
        end

        subgraph "Controllers"
            AuthCtrl["AuthController"]
            AdminCtrl["AdminController"]
            CustCtrl["CustomerController"]
            MgrCtrl["ManagerController"]
            CashCtrl["CashierController"]
            CompCtrl["ComplianceController"]
            BranchCtrl["BranchController"]
        end

        subgraph "Services"
            BSPAuth["BSPAuthService<br/>(Login, Lockout, 2FA, Risk)"]
        end

        subgraph "Form Requests"
            StoreCust["StoreCustomerRequest"]
            CreateUser["CreateUserRequest"]
            UpdateUser["UpdateUserRequest"]
            SysSetting["SystemSettingsRequest"]
        end

        subgraph "Models (Eloquent)"
            UserModel["User"]
            CustModel["Customer"]
            DocModel["CustomerDocument"]
            HoldModel["CustomerHolder"]
            AcctModel["CustomerAccount"]
            BranchModel["Branch"]
        end

        subgraph "Packages"
            SpatieP["Spatie Permission<br/>(RBAC)"]
            SpatieA["Spatie Activity Log<br/>(Audit)"]
            Interv["Intervention Image<br/>(Image Processing)"]
        end
    end

    subgraph "Data Stores"
        MySQL[("MySQL<br/>Database")]
        FileStore[("File Storage<br/>(storage/app)")]
        CacheStore[("Cache Store<br/>(System Settings)")]
    end

    AuthCtx <--> AxiosInst
    AxiosInst <-- "HTTPS/JSON" --> SanctumMW
    SanctumMW --> RoleMW --> TrackMW --> Controllers
    Controllers --> Services & Form Requests
    Controllers --> Models
    Models <--> MySQL
    Controllers --> FileStore
    BSPAuth --> CacheStore
    Models --> SpatieP & SpatieA
```

---

## 9. Deployment Diagram

```mermaid
flowchart TB
    subgraph "Client Tier"
        BR1["Browser<br/>(Chrome/Edge/Firefox)"]
        BR2["Browser<br/>(Mobile)"]
    end

    subgraph "Web Server Tier"
        subgraph "Frontend (Static Files)"
            VITE["Vite Build Output<br/>(HTML, JS, CSS bundles)"]
        end

        subgraph "Backend (Application Server)"
            PHP["PHP 8.2+ (FPM)"]
            LAR["Laravel 12"]
            ART["Artisan CLI<br/>(Queue Worker, Scheduler)"]
        end

        subgraph "Web Server"
            NG["Nginx / Apache<br/>(Reverse Proxy)"]
        end
    end

    subgraph "Data Tier"
        MYSQL[("MySQL / MariaDB<br/>Database Server")]
        DISK[("File Storage<br/>/storage/app/public/<br/>customer documents")]
    end

    BR1 & BR2 -- "HTTPS" --> NG
    NG -- "Static files" --> VITE
    NG -- "API requests<br/>/api/*" --> PHP
    PHP --> LAR
    LAR --> ART
    LAR -- "Eloquent ORM" --> MYSQL
    LAR -- "File I/O" --> DISK
```

---

## 10. State Diagrams

### 10.1 User Account State Diagram

```mermaid
stateDiagram-v2
    [*] --> Created : Admin creates account

    Created --> Active : First login successful

    Active --> Locked : 5 failed login attempts
    Locked --> Active : Admin unlocks OR<br/>30-minute timeout expires

    Active --> Inactive : Admin deactivates
    Inactive --> Active : Admin reactivates

    Active --> Suspended : Security concern
    Suspended --> Active : Admin clears suspension

    Active --> PasswordExpired : Password age > N days
    PasswordExpired --> Active : User sets new password

    Active --> ForcePasswordChange : Admin resets password
    ForcePasswordChange --> Active : User changes password

    Active --> SessionTimeout : 10 min inactivity
    SessionTimeout --> Active : User logs in again

    Active --> TokenExpired : Token expires (30 min)
    TokenExpired --> Active : Auto-refresh OR re-login

    Active --> [*] : Admin deletes account
```

### 10.2 Customer Account Status State Diagram

```mermaid
stateDiagram-v2
    [*] --> Active : Customer record created

    Active --> Dormant : No activity for<br/>extended period
    Dormant --> Active : Account reactivated<br/>(status = reactivated)

    Dormant --> Escheat : Dormancy period exceeds<br/>statutory limit (turned over to government)

    Active --> Closed : Account closed by<br/>customer or bank
    Dormant --> Closed : Account closed while dormant

    Escheat --> [*] : Final state (government custody)
    Closed --> [*] : Final state
```

### 10.3 Document Upload State Diagram

```mermaid
stateDiagram-v2
    [*] --> Empty : Wizard opens

    Empty --> FileSelected : User selects/drops image
    FileSelected --> Previewing : Image preview renders
    Previewing --> FileSelected : User selects different file

    Previewing --> Compressing : User clicks Submit
    Compressing --> Uploading : Compression complete<br/>(JPEG, max 1200x1600)
    Uploading --> Stored : Server saves file +<br/>creates metadata record

    Stored --> Archived : Document replaced<br/>(old version archived)
    Archived --> [*] : Archived permanently

    Stored --> [*] : Document deleted

    Uploading --> Error : Upload fails
    Error --> FileSelected : User retries
```

---

## 11. Class Diagram (Backend Models)

```mermaid
classDiagram
    class User {
        +bigint id
        +string firstname
        +string lastname
        +string username
        +string email
        +string password
        +string photo
        +bigint branch_id
        +enum status
        +int failed_login_attempts
        +bool two_factor_enabled
        +bool force_password_change
        +timestamp last_login_at
        +timestamp account_expires_at
        --
        +branch() Branch
        +getFullNameAttribute() string
        +isAccountLocked() bool
        +isPasswordExpired() bool
        +incrementFailedLoginAttempts() void
        +resetFailedLoginAttempts() void
        +lockAccount(minutes) void
    }

    class Branch {
        +bigint id
        +string branch_name
        +string brak
        +string brcode
        +bigint parent_id
        --
        +parent() Branch
        +children() Collection~Branch~
        +users() Collection~User~
        +customers() Collection~Customer~
    }

    class Customer {
        +bigint id
        +string account_no
        +date date_opened
        +string firstname
        +string middlename
        +string lastname
        +string suffix
        +string company_name
        +bigint branch_id
        +bigint uploaded_by
        +enum account_type
        +string joint_sub_type
        +enum risk_level
        +enum status
        --
        +branch() Branch
        +uploader() User
        +documents() Collection~CustomerDocument~
        +holders() Collection~CustomerHolder~
        +accounts() Collection~CustomerAccount~
    }

    class CustomerDocument {
        +bigint id
        +bigint customer_id
        +enum document_type
        +tinyint person_index
        +string file_path
        +string file_name
        +string file_size
        +string mime_type
        --
        +customer() Customer
    }

    class CustomerHolder {
        +bigint id
        +bigint customer_id
        +tinyint person_index
        +string firstname
        +string middlename
        +string lastname
        +string suffix
        +string risk_level
        --
        +customer() Customer
    }

    class CustomerAccount {
        +bigint id
        +bigint customer_id
        +string account_no
        +string risk_level
        +date date_opened
        +string status
        --
        +customer() Customer
    }

    class BSPAuthService {
        +MAX_LOGIN_ATTEMPTS = 5
        +LOCKOUT_DURATION = 30
        +PASSWORD_EXPIRY_DAYS = 90
        +SESSION_TIMEOUT_MINUTES = 30
        +MAX_CONCURRENT_SESSIONS = 3
        --
        +authenticate(Request) array
        +getPasswordExpiryDays() int
        +getTokenExpirationMinutes() int
        -performBSPComplianceChecks(User, Request) void
        -handleTwoFactorAuthentication(User, Request, array) array
        -completeAuthentication(User, Request) array
        -checkRateLimit(Request) void
        -checkConcurrentSessions(User) void
        -performRiskAssessment(User, Request) void
        -trackUserSession(User, string, Request) void
    }

    Branch "1" --> "*" User : has many
    Branch "1" --> "*" Customer : has many
    Branch "1" --> "*" Branch : parent has children
    User "1" --> "*" Customer : uploaded_by
    Customer "1" --> "*" CustomerDocument : has many
    Customer "1" --> "*" CustomerHolder : has many
    Customer "1" --> "*" CustomerAccount : has many
    BSPAuthService ..> User : uses
```

---

## 12. API Route Map

### 12.1 Authentication Routes

| Method | Endpoint | Controller | Auth | Description |
|--------|----------|------------|------|-------------|
| POST | `/auth/login` | AuthController@login | Public | Login with credentials |
| POST | `/auth/register` | AuthController@register | admin | Register new user |
| POST | `/auth/verify-2fa` | AuthController@verifyTwoFactor | Public | Verify 2FA OTP code |
| GET | `/auth/me` | AuthController@me | Any | Get current user info |
| POST | `/auth/logout` | AuthController@logout | Any | Logout and revoke token |
| POST | `/auth/refresh-token` | AuthController@refreshToken | Any | Refresh auth token |
| POST | `/auth/change-password` | AuthController@changePassword | Any | Change own password |
| POST | `/auth/enable-2fa` | AuthController@enableTwoFactor | Any | Enable 2FA |
| POST | `/auth/disable-2fa` | AuthController@disableTwoFactor | Any | Disable 2FA |
| GET | `/auth/active-sessions` | AuthController@activeSessions | Any | List active sessions |

### 12.2 Admin Routes

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/admin/dashboard` | AdminController@getDashboardStats | System-wide statistics |
| GET | `/admin/users` | AdminController@getAllUsers | List all users |
| POST | `/admin/users` | AdminController@createUser | Create user |
| PUT | `/admin/users/{user}` | AdminController@updateUser | Update user |
| DELETE | `/admin/users/{user}` | AdminController@deleteUser | Delete user |
| POST | `/admin/users/{user}/activate` | AdminController@activateUser | Activate user |
| POST | `/admin/users/{user}/deactivate` | AdminController@deactivateUser | Deactivate user |
| POST | `/admin/users/{user}/unlock` | AdminController@unlockUser | Unlock locked account |
| POST | `/admin/users/{user}/reset-password` | AdminController@resetUserPassword | Reset password |
| GET | `/admin/roles` | AdminController@getAllRoles | List roles |
| POST | `/admin/roles` | AdminController@createRole | Create role |
| PUT | `/admin/roles/{role}` | AdminController@updateRole | Update role permissions |
| DELETE | `/admin/roles/{role}` | AdminController@deleteRole | Delete role |
| GET | `/admin/permissions` | AdminController@getAllPermissions | List permissions |
| GET | `/admin/system-settings` | AdminController@getSystemSettings | Get settings |
| PUT | `/admin/system-settings` | AdminController@updateSystemSettings | Update settings |
| GET | `/admin/audit-logs` | AdminController@getAuditLogs | View audit trail |
| GET | `/admin/branch-hierarchy` | AdminController@getBranchHierarchy | Branch tree |
| PUT | `/admin/branches/{branch}/parent` | AdminController@updateBranchParent | Set parent branch |

### 12.3 Customer Routes

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/customers` | All | List customers (branch-scoped) |
| GET | `/customers/{id}` | All | View customer details |
| GET | `/customers/{id}/documents` | All | List customer documents |
| GET | `/customers/{id}/history` | All | View change history |
| POST | `/customers` | user, manager, admin | Create customer + upload docs |
| PUT | `/customers/{id}` | user, manager, admin | Update customer info |
| DELETE | `/customers/{id}` | user, manager, admin | Delete customer |
| POST | `/customers/{id}/replace-document` | user, manager, admin | Replace a document |
| POST | `/customers/{id}/add-account` | user, manager, admin | Add account to customer |
| DELETE | `/customers/{id}/documents/{doc}` | user, manager, admin | Delete a document |

### 12.4 Role-Specific Routes

| Prefix | Roles Allowed | Key Endpoints |
|--------|---------------|---------------|
| `/manager/*` | manager, admin | Dashboard, customers, documents, reports, approvals |
| `/cashier/*` | cashier, admin | Dashboard, customers (read-only), documents |
| `/compliance/*` | compliance-audit, admin | Dashboard, audit logs, compliance reports, risk assessments |
| `/user/*` | user, manager, admin | Transactions, accounts, customers, reports |
| `/branches` | All authenticated | List all branches |

---

## 13. Security Architecture

### 13.1 Defense-in-Depth Model

```mermaid
flowchart TD
    subgraph Layer1["Layer 1: Network"]
        HTTPS["HTTPS / TLS Encryption"]
    end

    subgraph Layer2["Layer 2: Authentication"]
        CRED["Email + Password"]
        TFA["Two-Factor Auth (OTP)"]
        TOKEN["Sanctum Bearer Token"]
    end

    subgraph Layer3["Layer 3: Authorization"]
        ROLE["Role Check (Middleware)"]
        PERM["Permission Check (Spatie)"]
        BRANCH["Branch Scope Filter"]
    end

    subgraph Layer4["Layer 4: Input Validation"]
        FREQ["Form Request Validation"]
        SANIT["Input Sanitization"]
        CSRF["CSRF Protection"]
    end

    subgraph Layer5["Layer 5: Business Rules"]
        RATE["Rate Limiting (5 attempts)"]
        LOCK["Account Lockout (30 min)"]
        SESS["Session Limits (max 3)"]
        RISK["Risk-Based Assessment"]
        PEXP["Password Expiry"]
    end

    subgraph Layer6["Layer 6: Audit & Monitoring"]
        ALOG["Activity Log (all mutations)"]
        SLOG["Security Event Log"]
        LLOG["Login Attempt Log"]
    end

    Layer1 --> Layer2 --> Layer3 --> Layer4 --> Layer5 --> Layer6
```

### 13.2 BSP Compliance Mapping

| BSP Requirement | Circular | SigCard Implementation | Layer |
|----------------|----------|----------------------|-------|
| Multi-Factor Authentication | 982 | TOTP-based 2FA (optional, admin-enforceable) | Authentication |
| Access Control | 951 | 5 roles, 70+ granular permissions via Spatie | Authorization |
| Account Lockout | 951 | Auto-lock after 5 failed attempts, 30-min duration | Business Rules |
| Password Complexity | 951 | Min 8 chars, uppercase, lowercase, number, special char | Authentication |
| Password Rotation | 951 | Configurable expiry (default 90 days, toggleable) | Business Rules |
| Session Management | 982 | Configurable timeout, max 3 concurrent sessions | Business Rules |
| Audit Trail | 951/982 | Spatie Activity Log — all actions with before/after values | Audit |
| Data Privacy | DPA | Digital consent forms stored with customer records | Business |
| Record Retention | 951 | Configurable audit log retention (min 365 days) | Audit |
| Risk Assessment | 982 | Login risk scoring (IP, device, timing factors) | Business Rules |
| Principle of Least Privilege | 951 | Role-based UI + API enforcement, branch scoping | Authorization |

---

*Document maintained by the IT Department of RBT Bank Inc.*
*Version: 1.0 — March 2026*
