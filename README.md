<p align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NestJS-Dark.svg" height="70" alt="OpsPulse Logo" />
</p>

<h1 align="center">⚡ OpsPulse</h1>

<p align="center">
  <strong>Production-Grade Multi-Tenant B2B Operations & Dispatch Management Platform</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-endpoints">API Endpoints</a> •
  <a href="#-database-management">Database</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-10.4-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-0.38-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
</p>

---

## 📖 Overview

**OpsPulse** is an enterprise-ready, multi-tenant B2B operations and dispatch platform. Designed for field logistics, fleet coordination, and mission-critical workflows, OpsPulse delivers strict multi-tenant isolation, granular Role-Based Access Control (RBAC), end-to-end task lifecycle management, and immutable audit logs.

---

## ✨ Features

- 🏢 **Multi-Tenant Architecture**: Strict organizational isolation at the database layer; secure slug-based routing and tenant identification.
- 🔐 **Authentication & RBAC**: JWT-based authentication with fine-grained permissions across hierarchical roles:
  - `SUPER_ADMIN`: Cross-tenant system administration.
  - `TENANT_ADMIN`: Full control over organization users, tasks, and audit logs.
  - `DISPATCHER`: Task creation, operator assignment, and dispatch scheduling.
  - `OPERATOR`: Field execution, self-assigned task views, and real-time status updates.
- 📋 **Task Lifecycle Management**:
  - Configurable priorities (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - Strict status machine (`PENDING` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `COMPLETED` / `FAILED`).
  - Search, pagination, priority filters, operator assignment, and due dates.
- 📜 **Immutable Audit Logging**: Comprehensive audit trail capturing user actions, timestamps, IP addresses, entity mutations, and delta changes.
- 🛡️ **Enterprise Security**:
  - HTTP header protection via **Helmet**.
  - Strict CORS origin whitelisting.
  - Payload size throttling against DoS vectors.
  - Input validation and sanitization using NestJS global `ValidationPipe` and `class-validator`.
  - Password hashing with **bcrypt** (salt rounds: 10).
- ⚡ **High-Performance Data Layer**: Type-safe queries and zero-overhead schema migrations powered by **Drizzle ORM** with PostgreSQL connection pooling.

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Backend Framework** | [NestJS 10](https://nestjs.com/) | Enterprise Node.js modular framework |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Type-safe development |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) | Relational database engine |
| **ORM / Migrations** | [Drizzle ORM](https://orm.drizzle.team/) & Drizzle Kit | Lightweight, blazing fast TypeScript ORM |
| **Cache & Message Broker** | [Redis 7](https://redis.io/) | In-memory cache & future job queue runner |
| **Infrastructure** | [Docker Compose](https://www.docker.com/) | Local containerized services orchestration |
| **Security** | Helmet, Passport JWT, Bcrypt | Authentication, authorization & header safety |

---

## 🚀 Quick Start

### Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) `>= 20.x`
- [Docker & Docker Compose](https://www.docker.com/)
- `npm` or `pnpm`

---

### 1. Clone the Repository

```bash
git clone https://github.com/UmutPatlak/opspulse.git
cd opspulse
```

---

### 2. Configure Environment Variables

Create `.env` in the root folder and in `backend/`:

```bash
# Root docker environment
cp .env.example .env

# Backend application environment
cp backend/.env.example backend/.env
```

> **Note:** Customize values in `backend/.env` if your database credentials or ports differ from the defaults.

---

### 3. Start Database & Redis with Docker Compose

Spin up PostgreSQL 16 and Redis 7 containers:

```bash
docker compose up -d
```

Verify containers are running:

```bash
docker compose ps
```

---

### 4. Install Dependencies & Prepare Database

Navigate to the `backend` folder:

```bash
cd backend
npm install
```

Apply database migrations:

```bash
npm run db:push
```

Seed the database with default tenants and test users:

```bash
npm run db:seed
```

---

### 5. Launch the Backend Server

```bash
# Development mode with hot-reload
npm run start:dev
```

The API will be live at:
👉 **`http://localhost:3000/api/v1`**

---

## 🔑 Pre-seeded Test Accounts

When you run `npm run db:seed`, the following accounts are initialized under the default tenant **`Acme Logistics`** (`acme-logistics`):

| Role | Email | Password | Allowed Scopes |
| :--- | :--- | :--- | :--- |
| **Tenant Admin** | `admin@acmelogistics.com` | `AdminPassword123!` | Full tenant control, user management, audit logs |
| **Dispatcher** | `dispatcher@acmelogistics.com` | `Dispatcher123!` | Create, assign & update tasks |
| **Operator** | `operator@acmelogistics.com` | `Operator123!` | View assigned tasks, progress & complete work |

---

## 📡 API Endpoints

All routes are prefixed with `/api/v1`.

### 🔐 Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register-tenant` | Public | Register a new tenant organization and owner admin |
| `POST` | `/auth/login` | Public | Authenticate user & issue JWT token |
| `GET` | `/auth/me` | Bearer Token | Get authenticated user profile & tenant info |

### 📋 Tasks (`/api/v1/tasks`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/tasks` | Admin, Dispatcher | Create a new operations task |
| `GET` | `/tasks` | Authenticated | List tasks (Supports pagination, status & priority filters) |
| `GET` | `/tasks/:id` | Authenticated | Retrieve task details by ID |
| `PATCH` | `/tasks/:id` | Admin, Dispatcher | Edit task title, description, priority, or assignee |
| `PATCH` | `/tasks/:id/status`| Authenticated | Update task lifecycle status (`PENDING` ➔ `COMPLETED`) |
| `DELETE`| `/tasks/:id` | Admin | Delete a task |

### 📜 Audit Logs (`/api/v1/audit-logs`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/audit-logs` | Tenant Admin | View paginated audit trail of all organizational changes |

---

## 🗄️ Database Management (Drizzle)

OpsPulse uses **Drizzle ORM** for ultra-fast, type-safe SQL management. Run these commands inside the `backend/` directory:

| Script | Command | Description |
| :--- | :--- | :--- |
| **Generate Migrations** | `npm run db:generate` | Generates SQL migration files from Drizzle schemas |
| **Apply Migrations** | `npm run db:migrate` | Runs pending migrations on the database |
| **Push Schema** | `npm run db:push` | Directly syncs schema changes during development |
| **Seed Database** | `npm run db:seed` | Populates database with sample tenant and user accounts |
| **Drizzle Studio** | `npm run db:studio` | Launches visual database GUI in your browser |

---

## 📂 Project Structure

```text
opspulse/
├── .env.example              # Root Docker compose environment variables
├── docker-compose.yml        # PostgreSQL 16 & Redis 7 services definition
├── LICENSE                   # MIT License
├── README.md                 # Project documentation
└── backend/                  # NestJS Backend Application
    ├── drizzle/              # Generated SQL migrations
    ├── drizzle.config.ts     # Drizzle Kit configuration
    ├── package.json          # Node dependencies & scripts
    └── src/
        ├── database/         # Database connection pool & Drizzle schemas
        │   ├── schema/       # Tenants, Users, Tasks, Audit Logs schemas
        │   └── seed.ts       # Database seeder script
        ├── modules/
        │   ├── auth/         # JWT Auth, Roles Guard, decorators & strategies
        │   ├── users/        # User services and management
        │   ├── tasks/        # Task management & status transitions
        │   └── audit-logs/   # Immutable audit log recording & queries
        ├── app.module.ts     # Main application module
        └── main.ts           # Application bootstrap, CORS, security pipes
```

---

## 🗺️ Roadmap

- [x] Multi-tenant relational schema design
- [x] Authentication with JWT and RBAC guards
- [x] Task lifecycle management & assignment engine
- [x] Audit logging subsystem
- [ ] **BullMQ Background Workers**: Asynchronous jobs and dispatch queues
- [ ] **Real-time Telemetry & WebSockets**: Live operator location & status updates
- [ ] **Frontend Dashboard**: Next.js / Vite dashboard with real-time operations map
- [ ] **Geofencing & SLA Alerts**: Automated notifications when tasks breach turnaround times

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
