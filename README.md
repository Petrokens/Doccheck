# DocCheck AI

**Intelligent Engineering Document Quality Assurance**

AI-Powered Engineering Document QA/QC. Login, upload an engineering deliverable, run Check-1 / Check-2 / rule analysis, store a scored report, and export PDF.

**Flow:** Upload → Analyze → Validate → Score → Report

- **Check-1:** Standard Completeness  
- **Check-2:** Technical Review  
- **Rule-Based:** Engineering Quality & Compliance  
- **Output:** Scored QA/QC Report + PDF

This is a standalone document quality assurance product. It does not include TBE, Cross-Doc, constructability, revision impact, or copilots.

## Stack

- **Client:** React 19, Vite, Tailwind CSS 4, React Router
- **Desktop:** Electron wrapper around the web app
- **Server:** Node.js, Express, PostgreSQL
- **AI:** OpenAI (primary) with Groq fallback
- **Email:** SMTP only (OTP, credentials, password reset)
- **OCR:** PaddleOCR (preferred) + Tesseract fallback, pdf-parse, mammoth

## Run locally

Use a **separate PostgreSQL database** for DocCheck AI.

```bash
# 1. Database
psql -U postgres -d doccheck_qaqc -f server/sql/schema.sql

# 2. Server
cd server
copy .env.example .env
# edit DATABASE_URL, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, OPENAI_API_KEY, SMTP_*
npm install
npm run dev

# 2b. PaddleOCR service (optional but recommended for scanned / image pages)
# In another terminal, from server/:
npm run ocr:install
npm run ocr:dev
# Node uses PaddleOCR when http://127.0.0.1:8866 is healthy; otherwise Tesseract.
# Set OCR_MODE=full in .env to run raster OCR on every page (not only weak-text pages).

# 3. Client (new terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5174 (or the port Vite prints).

Default master user is created on first server start (`MASTER_EMAIL` / `MASTER_PASSWORD` in `.env`).

Login uses email, password, and a one-time code emailed via **SMTP**. Set `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` in `server/.env`.

### Desktop (Electron)

**Run in development** (keep the Vite client running):

```bash
cd desktop
npm install
npm start
```

The window loads `http://localhost:5174` after the splash video (`client/public/Splash.mp4`). Override with `ELECTRON_START_URL` if needed.

**Build a Windows installer:**

```bash
cd desktop
npm install
npm run build
```

Installer output: `desktop/release/DocCheck-AI-Setup-1.0.0.exe`

When you ship a new desktop build, bump `desktop/package.json` `version` and set `APP_VERSION` on the API to the same number (for example `1.1.0`). Users still on an older installer get a center popup with their version and the latest version.

Other targets:

```bash
npm run build:portable
npm run build:dir
```

## Email (SMTP only)

Configure these in `server/.env`:

```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
SMTP_FROM=DocCheck AI <noreply@yourdomain.com>
```

Use port `465` with `SMTP_SECURE=true` if your provider requires SSL. Resend and other API mail providers are not used.

## Security

Hardening for both API and SPA is documented in:

- [docs/SECURITY.md](docs/SECURITY.md) — implemented controls
- [docs/SECURITY-TESTING.md](docs/SECURITY-TESTING.md) — authorized ethical-hacking brief

Copy `server/.env.example` and replace placeholder secrets before any external review. After this release, users must log in again (refresh tokens are stored hashed).

## Product flow

Login → pick discipline → upload main document (optional support) → live console → scored QA/QC report → history → PDF.

## Token cost (estimate per document)

Planning only — real cost depends on pages and model. Details: [docs/UPLOAD-DOCUMENT-TOKEN-REPORT.md](docs/UPLOAD-DOCUMENT-TOKEN-REPORT.md).

| Content type | Min / file | Max / file |
| ------------ | ---------: | ---------: |
| **Document** (PDF, Word, text) | ~$0.002 · ~₹0.17 | ~$0.18 · ~₹15 |
| **Image** (drawing, photo, TIFF) | ~$0.003 · ~₹0.25 | ~$0.12 · ~₹10 |

## API (QA/QC only)

Interactive docs: **Swagger UI** at `http://localhost:5000/api/docs` (OpenAPI JSON at `/api/docs.json`). Master users can also open **API Docs** in the dashboard.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Password step — emails OTP via SMTP |
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

