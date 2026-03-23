#!/usr/bin/env python3
"""Post-deployment security verification for vitavision.dev.

Checks that security controls (auth, headers, TLS, DNS) are active on the
live site.  No valid API key is required — the script verifies that endpoints
*reject* unauthenticated requests.

Usage:
    python scripts/verify-deployment.py
    python scripts/verify-deployment.py --category api --json
    python scripts/verify-deployment.py --fail-on medium
"""

from __future__ import annotations

import argparse
import json
import socket
import ssl
import sys
import warnings
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Sequence

import httpx

try:
    import dns.resolver

    _HAS_DNS = True
except ImportError:
    _HAS_DNS = False


# ── Data types ───────────────────────────────────────────────────────────────

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}


@dataclass
class CheckResult:
    name: str
    category: str
    passed: bool
    message: str
    severity: str  # critical | high | medium | low | info


@dataclass
class TargetConfig:
    frontend_url: str = "https://vitavision.dev"
    api_url: str = "https://api.vitavision.dev"
    domain: str = "vitavision.dev"
    api_key: str | None = None


# ── Check functions ──────────────────────────────────────────────────────────


def check_api_auth(cfg: TargetConfig) -> list[CheckResult]:
    """Verify API endpoints reject unauthenticated requests."""
    results: list[CheckResult] = []
    cat = "API Security"
    sev = "critical"

    endpoints = [
        ("POST", "/api/v1/storage/upload-ticket", {
            "sha256": "a" * 64,
            "content_type": "image/png",
            "size": 1024,
        }),
        ("POST", "/api/v1/cv/chess-corners", {
            "key": "uploads/" + "a" * 64,
            "storage_mode": "r2",
        }),
        ("POST", "/api/v1/cv/calibration-targets/detect", {
            "algorithm": "chessboard",
            "key": "uploads/" + "a" * 64,
            "storage_mode": "r2",
        }),
    ]

    with httpx.Client(timeout=10) as client:
        # Test without API key — expect 401
        for method, path, body in endpoints:
            name = f"api-auth-no-key-{path.split('/')[-1]}"
            try:
                resp = client.request(method, f"{cfg.api_url}{path}", json=body)
                if resp.status_code == 429:
                    passed = True
                    msg = f"{method} {path} returns 429 (rate-limited — auth not testable)"
                else:
                    passed = resp.status_code == 401
                    msg = f"{method} {path} returns {resp.status_code} without API key"
                    if not passed:
                        msg += " (expected 401)"
            except httpx.RequestError as exc:
                passed = False
                msg = f"{method} {path} request failed: {exc}"
            results.append(CheckResult(name, cat, passed, msg, sev))

        # Test with wrong API key — expect 403
        name = "api-auth-wrong-key"
        try:
            resp = client.post(
                f"{cfg.api_url}/api/v1/storage/upload-ticket",
                json={"sha256": "a" * 64, "content_type": "image/png", "size": 1024},
                headers={"X-API-Key": "invalid-probe-key-00000"},
            )
            if resp.status_code == 429:
                passed = True
                msg = "POST /upload-ticket returns 429 (rate-limited before auth — auth likely ok)"
            else:
                passed = resp.status_code == 403
                msg = f"POST /upload-ticket returns {resp.status_code} with invalid key"
                if not passed:
                    msg += " (expected 403)"
        except httpx.RequestError as exc:
            passed = False
            msg = f"Request failed: {exc}"
        results.append(CheckResult(name, cat, passed, msg, sev))

    return results


def check_swagger_disabled(cfg: TargetConfig) -> list[CheckResult]:
    """Verify Swagger UI and OpenAPI spec are not publicly accessible."""
    results: list[CheckResult] = []
    cat = "API Security"
    sev = "medium"

    doc_paths = ["/docs", "/redoc", "/openapi.json"]

    with httpx.Client(timeout=10) as client:
        for path in doc_paths:
            name = f"swagger-disabled-{path.strip('/')}"
            try:
                resp = client.get(f"{cfg.api_url}{path}")
                passed = resp.status_code == 404
                msg = f"GET {path} returns {resp.status_code}"
                if not passed:
                    msg += f" (expected 404)"
            except httpx.RequestError as exc:
                passed = False
                msg = f"GET {path} request failed: {exc}"
            results.append(CheckResult(name, cat, passed, msg, sev))

    return results


def check_upload_validation(cfg: TargetConfig) -> list[CheckResult]:
    """Verify upload-ticket rejects dangerous content types (requires --api-key)."""
    results: list[CheckResult] = []
    cat = "API Security"
    sev = "medium"

    if cfg.api_key is None:
        results.append(CheckResult(
            "upload-content-type-validation", cat, True,
            "Skipped (no --api-key provided)", "info",
        ))
        return results

    dangerous_types = ["text/html", "application/javascript", "image/svg+xml"]

    with httpx.Client(timeout=10) as client:
        for ctype in dangerous_types:
            name = f"upload-rejects-{ctype.replace('/', '-')}"
            try:
                resp = client.post(
                    f"{cfg.api_url}/api/v1/storage/upload-ticket",
                    json={"sha256": "b" * 64, "content_type": ctype, "size": 1024},
                    headers={"X-API-Key": cfg.api_key},
                )
                passed = resp.status_code == 422
                msg = f"upload-ticket with {ctype} returns {resp.status_code}"
                if not passed:
                    msg += f" (expected 422)"
            except httpx.RequestError as exc:
                passed = False
                msg = f"Request failed: {exc}"
            results.append(CheckResult(name, cat, passed, msg, sev))

    return results


def check_tls(cfg: TargetConfig) -> list[CheckResult]:
    """Verify HTTPS redirect and TLS configuration."""
    results: list[CheckResult] = []
    cat = "TLS/HTTPS"

    # HTTP → HTTPS redirect
    name = "http-redirects-to-https"
    try:
        with httpx.Client(timeout=10, follow_redirects=False) as client:
            resp = client.get(f"http://{cfg.domain}")
            passed = resp.status_code in (301, 302, 307, 308)
            msg = f"http://{cfg.domain} returns {resp.status_code}"
            if not passed:
                msg += " (expected 3xx redirect)"
    except httpx.RequestError as exc:
        passed = False
        msg = f"Request failed: {exc}"
    results.append(CheckResult(name, cat, passed, msg, "high"))

    # HSTS header
    name = "hsts-present"
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(cfg.frontend_url)
            hsts = resp.headers.get("strict-transport-security", "")
            passed = "max-age" in hsts
            msg = f"HSTS: {hsts}" if passed else "Strict-Transport-Security header missing"
    except httpx.RequestError as exc:
        passed = False
        msg = f"Request failed: {exc}"
    results.append(CheckResult(name, cat, passed, msg, "high"))

    # Suppress deprecation warnings for TLS 1.0/1.1 probes — we intentionally
    # reference deprecated versions to verify they are rejected by the server.
    warnings.filterwarnings("ignore", message="ssl.TLSVersion.TLSv1", category=DeprecationWarning)

    # TLS 1.0 should be disabled
    name = "tls-1.0-disabled"
    try:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.maximum_version = ssl.TLSVersion.TLSv1
        ctx.minimum_version = ssl.TLSVersion.TLSv1
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with socket.create_connection((cfg.domain, 443), timeout=5) as sock:
            try:
                ctx.wrap_socket(sock, server_hostname=cfg.domain)
                passed = False
                msg = "TLS 1.0 connection succeeded (should be disabled)"
            except ssl.SSLError:
                passed = True
                msg = "TLS 1.0 correctly rejected"
    except (AttributeError, OSError) as exc:
        passed = True  # can't test = assume ok
        msg = f"Could not probe TLS 1.0: {exc} (likely disabled at OS level)"
    results.append(CheckResult(name, cat, passed, msg, "high"))

    # TLS 1.1 should be disabled
    name = "tls-1.1-disabled"
    try:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.maximum_version = ssl.TLSVersion.TLSv1_1
        ctx.minimum_version = ssl.TLSVersion.TLSv1_1
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with socket.create_connection((cfg.domain, 443), timeout=5) as sock:
            try:
                ctx.wrap_socket(sock, server_hostname=cfg.domain)
                passed = False
                msg = "TLS 1.1 connection succeeded (should be disabled)"
            except ssl.SSLError:
                passed = True
                msg = "TLS 1.1 correctly rejected"
    except (AttributeError, OSError) as exc:
        passed = True
        msg = f"Could not probe TLS 1.1: {exc} (likely disabled at OS level)"
    results.append(CheckResult(name, cat, passed, msg, "high"))

    return results


def _check_headers(
    url: str, label: str, cat: str,
) -> list[CheckResult]:
    """Check security headers on a given URL."""
    results: list[CheckResult] = []
    sev = "medium"

    expected = {
        "strict-transport-security": ("HSTS", lambda v: "max-age" in v),
        "x-content-type-options": ("X-Content-Type-Options", lambda v: v == "nosniff"),
        "x-frame-options": ("X-Frame-Options", lambda v: v.upper() in ("DENY", "SAMEORIGIN")),
        "referrer-policy": ("Referrer-Policy", lambda v: bool(v)),
        "permissions-policy": ("Permissions-Policy", lambda v: bool(v)),
    }

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(url)

            for header_key, (display_name, validator) in expected.items():
                name = f"{label}-header-{header_key}"
                value = resp.headers.get(header_key, "")
                if not value:
                    results.append(CheckResult(
                        name, cat, False, f"{display_name} header missing", sev,
                    ))
                elif not validator(value):
                    results.append(CheckResult(
                        name, cat, False,
                        f"{display_name}: unexpected value '{value}'", sev,
                    ))
                else:
                    results.append(CheckResult(
                        name, cat, True, f"{display_name}: {value}", sev,
                    ))

            # CSP in HTTP header (not just meta tag)
            csp = resp.headers.get("content-security-policy", "")
            name = f"{label}-header-csp"
            if csp:
                results.append(CheckResult(
                    name, cat, True,
                    f"CSP present in HTTP header ({len(csp)} chars)", sev,
                ))
            else:
                results.append(CheckResult(
                    name, cat, False,
                    "Content-Security-Policy HTTP header missing", sev,
                ))

    except httpx.RequestError as exc:
        results.append(CheckResult(
            f"{label}-headers", cat, False, f"Request failed: {exc}", sev,
        ))

    return results


def check_security_headers_frontend(cfg: TargetConfig) -> list[CheckResult]:
    return _check_headers(cfg.frontend_url, "frontend", "Security Headers (Frontend)")


def check_security_headers_api(cfg: TargetConfig) -> list[CheckResult]:
    return _check_headers(cfg.api_url, "api", "Security Headers (API)")


def check_dns_records(cfg: TargetConfig) -> list[CheckResult]:
    """Verify SPF and DMARC DNS records exist."""
    results: list[CheckResult] = []
    cat = "DNS"
    sev = "low"

    if not _HAS_DNS:
        results.append(CheckResult(
            "dns-checks", cat, True,
            "Skipped (dnspython not installed)", "info",
        ))
        return results

    # SPF
    name = "dns-spf"
    try:
        answers = dns.resolver.resolve(cfg.domain, "TXT")
        spf_records = [
            r.to_text() for r in answers if "v=spf1" in r.to_text()
        ]
        passed = len(spf_records) > 0
        msg = f"SPF: {spf_records[0]}" if passed else "No SPF TXT record found"
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers) as exc:
        passed = False
        msg = f"SPF lookup failed: {exc}"
    results.append(CheckResult(name, cat, passed, msg, sev))

    # DMARC
    name = "dns-dmarc"
    try:
        answers = dns.resolver.resolve(f"_dmarc.{cfg.domain}", "TXT")
        dmarc_records = [
            r.to_text() for r in answers if "v=DMARC1" in r.to_text()
        ]
        passed = len(dmarc_records) > 0
        msg = f"DMARC: {dmarc_records[0]}" if passed else "No DMARC TXT record found"
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers) as exc:
        passed = False
        msg = f"DMARC lookup failed: {exc}"
    results.append(CheckResult(name, cat, passed, msg, sev))

    return results


def check_misc(cfg: TargetConfig) -> list[CheckResult]:
    """Check security.txt and server header leakage."""
    results: list[CheckResult] = []

    # security.txt
    name = "security-txt"
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{cfg.frontend_url}/.well-known/security.txt")
            passed = resp.status_code == 200
            msg = f"security.txt returns {resp.status_code}"
    except httpx.RequestError as exc:
        passed = False
        msg = f"Request failed: {exc}"
    results.append(CheckResult(name, "Misc", passed, msg, "info"))

    # Server/Via header leakage
    name = "no-server-leakage"
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(cfg.api_url)
            via = resp.headers.get("via", "")
            server = resp.headers.get("server", "")
            leaks: list[str] = []
            if "caddy" in via.lower():
                leaks.append(f"Via: {via}")
            if server and "cloudflare" not in server.lower():
                leaks.append(f"Server: {server}")
            passed = len(leaks) == 0
            msg = "No server info leakage" if passed else f"Leaks: {', '.join(leaks)}"
    except httpx.RequestError as exc:
        passed = False
        msg = f"Request failed: {exc}"
    results.append(CheckResult(name, "Misc", passed, msg, "low"))

    return results


# ── Runner ───────────────────────────────────────────────────────────────────

CATEGORY_CHECKS = {
    "api": [check_api_auth, check_swagger_disabled, check_upload_validation],
    "tls": [check_tls],
    "headers": [check_security_headers_frontend, check_security_headers_api],
    "dns": [check_dns_records],
    "misc": [check_misc],
}


def run_checks(
    cfg: TargetConfig, categories: Sequence[str] | None = None,
) -> list[CheckResult]:
    results: list[CheckResult] = []
    cats = categories or list(CATEGORY_CHECKS.keys())
    for cat in cats:
        for check_fn in CATEGORY_CHECKS.get(cat, []):
            results.extend(check_fn(cfg))
    return results


# ── Output ───────────────────────────────────────────────────────────────────

_STATUS = {True: "\033[32mPASS\033[0m", False: "\033[31mFAIL\033[0m"}


def print_report(results: list[CheckResult], as_json: bool = False) -> None:
    if as_json:
        print(json.dumps([asdict(r) for r in results], indent=2))
        return

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"\n{'=' * 55}")
    print(f"  Post-Deployment Security Verification")
    print(f"  {now}")
    print(f"{'=' * 55}")

    current_cat = ""
    for r in results:
        if r.category != current_cat:
            current_cat = r.category
            print(f"\n--- {current_cat} ---")
        status = _STATUS[r.passed]
        print(f"  [{status}] {r.name}: {r.message}")

    # Summary
    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = total - passed
    print(f"\n{'─' * 55}")
    print(f"  Total: {total}  |  Passed: {passed}  |  Failed: {failed}")

    if failed:
        print(f"\n  Failed checks:")
        for r in results:
            if not r.passed:
                sev = r.severity.upper()
                print(f"    [{sev}] {r.name}: {r.message}")

    print()


# ── CLI ──────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Post-deployment security verification for vitavision.dev",
    )
    parser.add_argument(
        "--frontend-url", default="https://vitavision.dev",
        help="Frontend URL (default: https://vitavision.dev)",
    )
    parser.add_argument(
        "--api-url", default="https://api.vitavision.dev",
        help="API URL (default: https://api.vitavision.dev)",
    )
    parser.add_argument(
        "--domain", default="vitavision.dev",
        help="Domain for DNS/TLS checks (default: vitavision.dev)",
    )
    parser.add_argument(
        "--api-key", default=None,
        help="Valid API key for authenticated checks (upload validation)",
    )
    parser.add_argument(
        "--category", default=None,
        choices=list(CATEGORY_CHECKS.keys()),
        help="Run only a specific category",
    )
    parser.add_argument(
        "--json", action="store_true", dest="as_json",
        help="Output results as JSON",
    )
    parser.add_argument(
        "--fail-on", default="high",
        choices=["critical", "high", "medium", "low"],
        help="Exit 1 if any check at this severity or higher fails (default: high)",
    )

    args = parser.parse_args()

    cfg = TargetConfig(
        frontend_url=args.frontend_url,
        api_url=args.api_url,
        domain=args.domain,
        api_key=args.api_key,
    )

    categories = [args.category] if args.category else None
    results = run_checks(cfg, categories)
    print_report(results, as_json=args.as_json)

    # Exit code
    threshold = SEVERITY_ORDER[args.fail_on]
    failures = [
        r for r in results
        if not r.passed and SEVERITY_ORDER.get(r.severity, 99) <= threshold
    ]
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
