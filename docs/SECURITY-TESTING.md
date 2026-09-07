# Petrolenz QA/QC — Authorized Security Testing Brief

This brief is for **cybersecurity and ethical hacking teams** engaged by the product owner to test Petrolenz QA/QC.

It defines scope, rules of engagement, and **what to verify**. It is not a guide for attacking systems you do not own.

Related: [SECURITY.md](./SECURITY.md) (implemented controls).

---

## 1. Authorization

Testing is allowed only when:

- The product owner has given written authorization
- You are using the provided test environment (not production customer data)
- You stay inside the scope below

Do not test third-party services (OpenAI, Groq, email providers, or the tester’s own browser extensions).

---

## 2. In scope

| Area | Notes |
|------|--------|
| `client` SPA (Vite/React) | Auth pages, dashboard, uploads, reports, admin UI |
| `server` Express API | `/api/auth`, `/api/qaqc`, `/api/users`, `/api/roles`, `/api/permissions`, `/api/sidebar`, `/api/health` |
| PostgreSQL **test** database | Data created during the test only |
| Session model | Access JWT + refresh cookie |
| File upload pipeline | Type, size, content mismatch, malware-like documents **in the lab only** |
| Access control | Engineer vs Master, report ownership, admin routes |
| Security headers, CORS, CSRF | Browser and API |
| Rate limits and lockout | Login, refresh, generation |

---

## 3. Out of scope

- Denial-of-service that could take down shared infrastructure (no volumetric floods)
- Social engineering of staff or phishing of real users
- Physical access, office Wi-Fi attacks
- Changing live production secrets, billing, or customer documents
- Exploiting third-party AI vendors beyond this app’s prompt handling
- Supply-chain attacks on npm registries

If you find a critical issue, **stop**, preserve evidence, and report it. Do not pivot to other networks.

---

## 4. Test environment expectations

Typical local layout:

- Client: `http://localhost:5174` (port may vary)
- API: `http://127.0.0.1:5000`
- Database: dedicated `petrolenz_qaqc` instance

Ask the owner for:

- One **Master** test account
- One **Engineer** test account (create via Master register if needed)
- Confirmation that `NODE_ENV`, `FRONTEND_URL`, and secrets match the environment you were given

**After the hashed-refresh-token release, existing refresh cookies are invalid.** Sign in again.

---

## 5. Controls to verify (checklist)

Testers should **confirm these controls hold**, and report any bypass.

### Identity

- [ ] Invalid login does not reveal whether the email exists
- [ ] Repeated failures lock the account and return a lock response
- [ ] Login is rate limited
- [ ] Access token expires (~15 minutes); refresh issues a new access token
- [ ] Refresh token cannot be read from JavaScript (`httpOnly`)
- [ ] Logout ends the refresh session
- [ ] Password reset does not confirm whether an email is registered
- [ ] Password reset invalidates the previous session
- [ ] New passwords reject weak values (short / no complexity)

### Access control

- [ ] Unauthenticated callers cannot download a report PDF
- [ ] Engineer A cannot read, edit, delete, or download Engineer B’s report (expect 404)
- [ ] Engineer cannot call `/api/users`, `/api/roles`, `/api/permissions`
- [ ] Engineer UI does not expose Administration
- [ ] Engineer cannot open `/dashboard/users` usefully (redirect / empty)
- [ ] Master cannot delete their own account or the last Master
- [ ] Register cannot create a Master unless the caller is already Master

### Upload / processing

- [ ] `.exe` / script / mismatched magic bytes are rejected
- [ ] Files over 25 MB are rejected
- [ ] Too many files in one request are rejected
- [ ] Drag-and-drop of a disallowed type is rejected in the UI **and** API

### Web

- [ ] API sets `X-Frame-Options: DENY` and `nosniff`
- [ ] Cross-origin credentialed requests from an unlisted origin fail CORS
- [ ] State-changing requests without a trusted origin/header are rejected
- [ ] Report viewer does not execute HTML/script from markdown
- [ ] Access token is not present in `localStorage` / `sessionStorage`
- [ ] Login no longer stores a password in `localStorage`

### Abuse / resilience

- [ ] Global and generation rate limits engage
- [ ] Production-like config rejects weak JWT secrets and default master password (ask owner to demonstrate boot failure in a staging config, or review `validateEnv.js`)

---

## 6. Suggested test accounts (placeholders)

Replace with values the owner provides. Do not reuse production passwords.

| Role | Email | Purpose |
|------|--------|---------|
| Master | `(owner provided)` | Admin, all reports |
| Engineer | `(owner provided)` | Own reports only |

Do not attempt credential stuffing against real employee mailboxes.

---

## 7. Reporting format

For each finding include:

1. **Title** and severity (Critical / High / Medium / Low / Info)
2. **Affected component** (URL, method, role)
3. **Preconditions** (which account, which browser)
4. **Impact** (what an attacker could do)
5. **Evidence** (redacted screenshots or response snippets — no full secrets)
6. **Remediation** suggestion

Submit reports only to the product owner’s agreed channel.

---

## 8. Severity guidance

| Severity | Example impact |
|----------|----------------|
| Critical | Unauthenticated access to reports; remote code execution; full account takeover without user action |
| High | Horizontal IDOR between engineers; privilege escalation to Master; stored XSS that steals the session |
| Medium | Missing rate limit with practical abuse; weak CORS in a deployed environment; verbose errors in production |
| Low | Missing secondary header; informational banner; lockout UX issue |
| Info | Defense-in-depth suggestion, dependency notice |

Known residual items already documented in [SECURITY.md](./SECURITY.md) section 12 (parser risk, LLM prompt injection, in-memory access token) should be treated as **Info** unless you demonstrate a **practical bypass** of the documented mitigation.

---

## 9. Safe handling of findings

- Do not publish exploits, proof-of-concept malware, or customer document contents.
- Do not copy production-like data out of the lab.
- Wipe test uploads and reports when the engagement ends, if the owner requests it.

---

## 10. Contact

Product: Petrolenz QA/QC  
Implementation record: `docs/SECURITY.md`  
Owner: (fill in before the engagement)
