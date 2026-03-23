---
description: Run security audit against the live deployment and review code-level security
argument-hint: [--live-only | --code-only]
---

# /security-check $ARGUMENTS

Full security review combining live-site verification with code-level checks.

Refer to `CLAUDE.md` Security Model section for current controls and architecture.

---

## Scope

By default, run both phases. If `$ARGUMENTS` contains `--live-only`, skip Phase 1. If `--code-only`, skip Phase 2.

---

## Phase 1 — Code-Level Security Review

Read-only analysis of current code. Check each item and report pass/fail.

**1.1 Authentication (`backend/auth.py`, `backend/main.py`)**
- `verify_api_key` dependency is applied to all `/api/v1/*` routes
- `hmac.compare_digest` used for key comparison (timing-safe)
- Startup guard refuses to start without `API_KEY` when production origins are configured
- Swagger/ReDoc/OpenAPI disabled when `API_KEY` is set

**1.2 Security Headers (`backend/main.py` middleware)**
- All responses include: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`
- CSP for API is `default-src 'none'; frame-ancestors 'none'; base-uri 'none'`

**1.3 Frontend Headers (`public/_headers`)**
- File exists and includes: HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP
- CSP includes `frame-ancestors 'none'` (HTTP header, not just meta)
- CSP script-src uses SHA-256 hash (no `unsafe-inline` for scripts)
- Check if `style-src 'unsafe-inline'` is still present (known SEC-006 issue)

**1.4 Upload Security (`backend/routers/storage.py`, `backend/services/storage_service.py`)**
- Content-type whitelist: only image formats allowed
- Size validation in middleware + endpoint + presigned URL
- `is_image_bytes()` validates magic bytes
- Path traversal blocked in `local_path_for_key()`
- Pixel count limit enforced (`MAX_IMAGE_PIXELS`)

**1.5 CORS (`backend/main.py`)**
- Origins restricted to configured `CORS_ORIGINS` (not `*`)
- Methods limited to required set
- `allow_credentials` usage is intentional

**1.6 Rate Limiting (`backend/limiter.py`, route decorators)**
- All API endpoints have rate limit decorators
- CV endpoints: 10/min, storage upload: 20/min, storage read: 60/min

**1.7 Dependencies**
- Check `backend/requirements.txt` and `package.json` for known patterns:
  - No pinned versions with known CVEs (check version ranges)
  - No unnecessary `eval()`, `exec()`, `innerHTML`, `dangerouslySetInnerHTML` in codebase

**1.8 Test Coverage**
- `test_api.py` has `TestApiKeyEnforcement` covering all endpoints
- `test_security_headers_present` covers all security headers
- Rate limiting tests exist
- Path traversal test exists

**Report format for Phase 1:**
```
## Code Security Review

| Check | Status | Notes |
|-------|--------|-------|
| API key enforcement | PASS/FAIL | ... |
| ... | ... | ... |

### Issues Found
<list any new issues, or "None">

### Comparison with Backlog
<check docs/backlog.md SEC-* items — any new issues to add?>
```

---

## Phase 2 — Live Site Verification

Run the deployment verification script against the live site:

```bash
source backend/.venv/bin/activate && python scripts/verify-deployment.py
```

If the script is not runnable (missing deps), install them first:
```bash
source backend/.venv/bin/activate && python -m pip install -r scripts/requirements-verify.txt
```

Report the output and highlight any failures.

---

## Phase 3 — Summary

Combine both phases into a final report:

```
## Security Check Summary — <date>

### Code Review: X/Y checks passed
<highlight any failures>

### Live Verification: X/Y checks passed
<highlight any failures>

### Action Items
<new issues to add to backlog as SEC-NNN, if any>
<existing SEC-* items that are now resolved>
```

Update `docs/backlog.md` if new security issues were found (add as `SEC-NNN` with appropriate priority).
