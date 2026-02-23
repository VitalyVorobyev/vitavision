const DEFAULT_API_BASE = "http://localhost:8000/api/v1";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE;

const _API_KEY: string | undefined = import.meta.env.VITE_API_KEY || undefined;

/** Returns base headers for all API requests, including X-API-Key when configured. */
export function apiHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    if (_API_KEY) headers["X-API-Key"] = _API_KEY;
    return headers;
}
