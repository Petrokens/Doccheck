# DocCheck AI — Security Implementation

This document describes the security controls implemented in the DocCheck AI **client** and **server**. It is the implementation record for engineering, operations, and security reviewers.

Related: [SECURITY-TESTING.md](./SECURITY-TESTING.md) (authorized testing brief).

---

## 1. Security objectives

| Objective | How it is met |
|-----------|----------------|
| Confidentiality of reports and accounts | Authenticated APIs, report ownership, hashed refresh/reset tokens |
| Integrity of users and roles | Master-only admin APIs, no caller-chosen privilege on public register |
| Availability | Rate limits, upload size/type limits, lockout |
| Session safety | Short-lived access JWT in memory, httpOnly refresh cookie, rotation |
| Defense in depth | Headers, origin checks, allowlisted uploads, RBAC on UI and API |

---

## 2. Authentication and session

### Access token

- Signed JWT (`ACCESS_TOKEN_SECRET`), 15-minute expiry.
- Payload: `user_id`, `role_id`.
- Sent as `Authorization: Bearer`.
- **Not stored in localStorage or sessionStorage.** Kept in SPA memory only.
- Each request re-checks the user still exists in the database (`verifyToken`).

### Refresh token

- Signed JWT (`REFRESH_TOKEN_SECRET`), 7-day expiry.
- Stored in an **httpOnly**, **Secure** (production), **SameSite=lax** cookie, path `/api/auth`.
- **SHA-256 hash** stored in PostgreSQL, never the raw token.
- **Rotated** on every successful refresh and login.
- Logout and password reset clear the stored refresh hash.

### Login hardening

- Generic failure message (no user enumeration).
- Dummy bcrypt compare when the email does not exist (timing).
- 5 failed attempts → 15-minute account lock (`423`).
- Login rate limit: 8 attempts / 15 minutes / IP.
- Password policy for new/reset passwords: 12+ characters, upper, lower, digit, symbol.
- bcrypt cost factor **12**.

### Password reset

- Reset token is 32 random bytes, stored as SHA-256, 30-minute expiry.
- Response is always the same whether the email exists or not.
- Successful reset invalidates the session (refresh token cleared).

---

## 3. Authorization

| Resource | Rule |
|----------|------|
| QA/QC generate, history, stats | Authenticated. Non-Master users only see their own reports. |
| Report get / patch / delete / PDF | Authenticated **and** owner, or Master (`role_id = 1`). Missing reports return 404 (no IDOR oracle). |
| Admin users/roles/permissions | `verifyToken` + `requireRole([1])`. |
| Register | Master-only unless `AUTH_ALLOW_PUBLIC_REGISTER=true` (blocked in production). Public register cannot create Master. |
| User delete | Cannot delete self. Cannot delete the last Master. |
| Sidebar | Administration and environment config hidden for non-Master. |
| Frontend admin routes | `RoleProtectedRoute` requires Master. |

---

## 4. CSRF and CORS

- CORS allowlist is **`FRONTEND_URL` only** (plus localhost in non-production). Empty allowlist is rejected at boot.
- Credentials allowed only for allowed origins.
- State-changing requests require a trusted `Origin` or `X-Requested-With: DocCheck`.
- SPA sends `X-Requested-With: DocCheck` on Axios and download/stream `fetch`.
- Refresh cookie is not readable by JavaScript.

---

## 5. HTTP security headers

**API (Helmet + app settings)**

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Strict-Transport-Security` in production
- `X-Powered-By` disabled
- Auth responses: `Cache-Control: no-store`

**Vite client**

- Dev/preview: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- Production preview: Content-Security-Policy (`default-src 'self'`, no `object-src`, `frame-ancestors 'none'`)

---

## 5.1 API documentation

Swagger UI is served at `/api/docs` (OpenAPI JSON at `/api/docs.json`) when `ENABLE_SWAGGER=true`, or by default when `NODE_ENV` is not `production`. Leave it disabled on internet-facing production hosts.

---

## 6. Upload and document processing

| Control | Value |
|---------|--------|
| Allowed types | pdf, docx, txt, csv, md, png, jpg, jpeg, webp, tif, tiff |
| Magic-byte check | Declared extension must match file contents |
| Size | 25 MB per file |
| Count | 3 main + 5 support |
| Filename | Basename sanitized, control characters stripped |
| Client | Same type/size checks on choose-file and drag-and-drop |

Parser libraries still process untrusted files (PDF/Office/OCR). Size and type limits reduce, but do not eliminate, parser risk. See residual risks.

---

## 7. Injection and XSS

- SQL: parameterized queries only; dynamic UPDATE keys are allowlisted.
- JSON body limit 2 MB; URL-encoded 200 KB.
- Report markdown is stripped of script/html event handlers before storage.
- Report UI renders markdown as React text nodes (no `dangerouslySetInnerHTML`).
- AI prompt wraps document text in `BEGIN_UNTRUSTED_DOCUMENT` / `END_UNTRUSTED_DOCUMENT` and instructs the model to treat it as data.

---

## 8. Rate limiting

| Scope | Limit |
|-------|--------|
| Global | 400 / 15 min / IP |
| Login | 8 / 15 min |
| Forgot / reset password | 5 / 15 min |
| Refresh | 40 / 15 min |
| QA/QC generation | 12 / hour |

---

## 9. Secrets and bootstrap

Boot fails in **production** if:

- JWT secrets are missing, identical, shorter than 32 characters, or known placeholders
- `FRONTEND_URL` is empty
- `MASTER_PASSWORD` is missing or still `ChangeMe123!`
- `AUTH_ALLOW_PUBLIC_REGISTER=true`

Development warns on weak JWT secrets but still starts so local work is possible.

`server/.env.example` lists required variables. Never commit `.env`.

Database TLS: `rejectUnauthorized` is on unless `PG_SSL_INSECURE=true`.

Default listen address in development: `127.0.0.1`. Use `BIND_HOST=0.0.0.0` only on an isolated test LAN.

---

## 10. Frontend session model

1. Login returns access JWT in JSON; refresh JWT in httpOnly cookie.
2. Access JWT lives in a module variable (memory).
3. Reload: SPA calls `POST /api/auth/refresh` with the cookie.
4. Logout clears cookie + memory.
5. “Remember email” stores **email only**. Previous plaintext password storage is removed on load.
6. PDF.js worker is loaded from the app bundle, not a public CDN.

---

## 11. Audit events

The API writes JSON audit lines to stdout, including:

`auth.login`, `auth.login_failed`, `auth.lockout`, `auth.logout`, `auth.reset_requested`, `auth.password_reset`, `user.register`, `report.generate`, `report.update`, `report.delete`, `report.download`, `admin.user_delete`, `admin.role_create`, `admin.permissions_set`.

Ship these logs to your SIEM in production.

---

## 12. Residual risks (accepted / monitor)

These are honest limits of the current stack, not excuses to skip testing:

1. **Access JWT in SPA memory** can be stolen by a successful XSS. CSP and React escaping are the mitigations; keep dependencies updated.
2. **Document parsers** (`pdf-parse`, `mammoth`, `xlsx`, Tesseract) run on user files. A malicious document can still stress CPU/RAM.
3. **LLM prompt injection** cannot be fully prevented. Document text is isolated in the prompt; treat model output as untrusted.
4. **xlsx** has known historical CVEs. Prefer PDF/DOCX/TXT for untrusted tests.
5. **Single-instance lockout and rate limits** are in-process. Multi-instance production should put a reverse proxy / Redis limiter in front.
6. After deploying hashed refresh tokens, **existing refresh cookies are invalid** — users must log in again.

---

## 13. Operator checklist before an external test

- [ ] Replace JWT secrets with 32+ character random values
- [ ] Replace `MASTER_PASSWORD`
- [ ] Set `FRONTEND_URL` to the exact browser origin
- [ ] `NODE_ENV=production` only behind HTTPS
- [ ] `ALLOW_DEMO_REPORTS=0`
- [ ] `AUTH_ALLOW_PUBLIC_REGISTER` unset/false
- [ ] PostgreSQL not exposed to the internet
- [ ] Leave Swagger UI off in production (`ENABLE_SWAGGER` unset/false)
- [ ] Restart API after this release and log in again
