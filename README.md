# Petrolenz QA/QC

Standalone **document quality assurance** product. Login, upload an engineering deliverable, run Check-1 / Check-2 / rule analysis, store a scored report, and export PDF.

This is a new project (frontend, backend, APIs, database). It does not include TBE, Cross-Doc, constructability, revision impact, or copilots.

## Stack

- **Client:** React 19, Vite, Tailwind CSS 4, React Router
- **Server:** Node.js, Express, PostgreSQL
- **AI:** OpenAI (primary) with Groq fallback
- **OCR:** pdf-parse, mammoth, Tesseract

## Run locally

Use a **separate PostgreSQL database** from any other Petrolenz platform.

```bash
# 1. Database
psql -U postgres -d petrolenz_qaqc -f server/sql/schema.sql

# 2. Server
cd server
copy .env.example .env
# edit DATABASE_URL, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, OPENAI_API_KEY
npm install
npm run dev

# 3. Client (new terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5174 (or the port Vite prints).

Default master user is created on first server start (`MASTER_EMAIL` / `MASTER_PASSWORD` in `.env`).

## Security

Hardening for both API and SPA is documented in:

- [docs/SECURITY.md](docs/SECURITY.md) — implemented controls
- [docs/SECURITY-TESTING.md](docs/SECURITY-TESTING.md) — authorized ethical-hacking brief

Copy `server/.env.example` and replace placeholder secrets before any external review. After this release, users must log in again (refresh tokens are stored hashed).

## Product flow

Login → pick discipline → upload main document (optional support) → live console → scored QA/QC report → history → PDF.

## API (QA/QC only)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh cookie |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/register` | Admin create user |
| GET | `/api/users` | User list |
| GET/POST | `/api/roles` | Roles |
| GET | `/api/permissions` | Permissions |
| GET | `/api/sidebar` | QA/QC menu |
| POST | `/api/qaqc/process-report` | Generate report |
| POST | `/api/qaqc/process-report/stream` | Generate with live log |
| GET | `/api/qaqc/reports` | History |
| GET | `/api/qaqc/reports/:id` | One report |
| PATCH | `/api/qaqc/reports/:id` | Update |
| DELETE | `/api/qaqc/reports/:id` | Delete |
| GET | `/api/qaqc/reports/:id/download` | PDF |
| GET | `/api/qaqc/dashboard-stats` | Counts |
| GET | `/api/health` | Health |

## Screens

Process, Piping, Pipeline, Civil, Mechanical (rotating/static), Electrical, HVAC, Instrumentation, Telecom, HSE, General, History, AI Review, score trends, profile, settings, users, roles, permissions, audit log, system status.
