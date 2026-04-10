---
description: Run frontend security audit — CSP, dependencies, WASM sandboxing
argument-hint: [--deps-only]
---

# /security-check $ARGUMENTS

Frontend-only security review. No backend exists — all processing is client-side WASM.

---

## Phase 1 — CSP and Headers

**1.1 Frontend Headers (`public/_headers`)**
- File exists and includes: HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP
- CSP includes `frame-ancestors 'none'` (HTTP header)
- CSP `script-src` uses SHA-256 hash (no `unsafe-inline` for scripts)
- CSP allows `wasm-unsafe-eval` for WASM execution
- CSP allows `worker-src 'self' blob:` for Web Workers

**1.2 Dev CSP (`vite.config.ts`)**
- Dev-only CSP plugin relaxes only what's needed for WASM/workers
- No external origins in connect-src

---

## Phase 2 — Dependency Audit

**2.1 npm dependencies (`package.json`)**
- Run `bun audit` or check for known CVEs in WASM packages
- No unnecessary `eval()`, `exec()`, `innerHTML`, `dangerouslySetInnerHTML` in codebase
- WASM packages are from trusted sources (@vitavision/* or first-party)

**2.2 Supply chain**
- Lock file (`bun.lock`) is committed and used with `--frozen-lockfile` in CI

---

## Phase 3 — WASM and Client-Side Security

**3.1 WASM sandboxing**
- WASM modules run in Web Workers (off main thread)
- No `SharedArrayBuffer` usage (no cross-origin isolation requirements)
- Pixel data is transferred via `Transferable` (no shared memory)

**3.2 Input validation**
- Image pixel count guard (`WASM_MAX_PIXELS = 20_000_000`) in `useAlgorithmRunner.ts`
- Image decode happens client-side via canvas — no server-side image parsing

**3.3 XSS prevention**
- React auto-escapes by default
- No `dangerouslySetInnerHTML` outside of sanitized blog content
- Blog HTML is sanitized at build time via content pipeline

---

## Report format

```
## Security Check — <date>

| Check | Status | Notes |
|-------|--------|-------|
| CSP headers | PASS/FAIL | ... |
| Dependencies | PASS/FAIL | ... |
| WASM sandboxing | PASS/FAIL | ... |
| XSS prevention | PASS/FAIL | ... |

### Issues Found
<list any new issues, or "None">
```
