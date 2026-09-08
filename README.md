# Petrolenz QA/QC

Standalone **document quality assurance** product. Login, upload an engineering deliverable, run Check-1 / Check-2 / rule analysis, store a scored report, and export PDF.

This is a new project (frontend, backend, APIs, database). It does not include TBE, Cross-Doc, constructability, revision impact, or copilots.

## Stack

- **Client:** React 19, Vite, Tailwind CSS 4, React Router
- **Desktop:** Electron wrapper around the web app
- **Server:** Node.js, Express, PostgreSQL
- **Email:** [Resend](https://resend.com) (login credentials, OTP, announcements)
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
# edit DATABASE_URL, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, OPENAI_API_KEY, RESEND_API_KEY
npm install
npm run dev

# 3. Client (new terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5174 (or the port Vite prints).

Default master user is created on first server start (`MASTER_EMAIL` / `MASTER_PASSWORD` in `.env`).

Login uses password plus a one-time email code. Creating a user from Master Admin emails that person their login credentials (requires `RESEND_API_KEY`). Announcements in the sidebar can be emailed to selected roles.

### Desktop (Electron)

Keep the API and Vite client running, then:

```bash
cd desktop
npm install
npm start
```

The window loads `http://localhost:5174`. Override with `ELECTRON_START_URL` if needed.

## Email (Resend)

1. Create an API key at [resend.com](https://resend.com)
2. Set `RESEND_API_KEY` in `server/.env`
3. For production, verify a domain and set `RESEND_FROM` (for example `Petrolenz QA/QC <noreply@yourdomain.com>`). The default `onboarding@resend.dev` sender only delivers to the Resend account email.

## Security

Hardening for both API and SPA is documented in:

- [docs/SECURITY.md](docs/SECURITY.md) — implemented controls
- [docs/SECURITY-TESTING.md](docs/SECURITY-TESTING.md) — authorized ethical-hacking brief

Copy `server/.env.example` and replace placeholder secrets before any external review. After this release, users must log in again (refresh tokens are stored hashed).

## Product flow

Login → pick discipline → upload main document (optional support) → live console → scored QA/QC report → history → PDF.

## API (QA/QC only)

Interactive docs: **Swagger UI** at `http://localhost:5000/api/docs` (OpenAPI JSON at `/api/docs.json`). Master users can also open **API Docs** in the dashboard.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Password step — emails OTP |
| POST | `/api/auth/login/verify-otp` | Complete login with email code |
| POST | `/api/auth/login/resend-otp` | Resend login OTP |
| POST | `/api/auth/refresh` | Refresh cookie |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/register` | Admin create user (emails credentials) |
| GET | `/api/users` | User list |
| GET/POST | `/api/roles` | Roles |
| GET | `/api/permissions` | Permissions |
| GET | `/api/sidebar` | QA/QC menu |
| GET/POST | `/api/announcements` | Role-based announcements (POST Master-only) |
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

Process, Piping, Pipeline, Civil, Mechanical (rotating/static), Electrical, HVAC, Instrumentation, Telecom, HSE, General, Announcements, History, AI Review, score trends, profile, settings, users, roles, permissions, audit log, system status.
