import { API_BASE_URL, apiHeaders } from "./http";

export type StorageMode = "r2" | "local";

export interface UploadTicketRequest {
    sha256: string;
    contentType: string;
    size: number;
    storageMode?: StorageMode;
}

export interface UploadTicket {
    exists: boolean;
    storage_mode: StorageMode;
    bucket: string;
    key: string;
    upload?: {
        url: string;
        method: "PUT";
        headers: Record<string, string>;
    };
    preview_url: string | null;
    expires_in_seconds: number;
}

export async function sha256Hex(blob: Blob): Promise<string> {
    const buf = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

function normalizeContentType(contentType: string): string {
    return contentType || "application/octet-stream";
}

export async function createUploadTicket(payload: UploadTicketRequest): Promise<UploadTicket> {
    const response = await fetch(`${API_BASE_URL}/storage/upload-ticket`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
            sha256: payload.sha256,
            content_type: normalizeContentType(payload.contentType),
            size: payload.size,
            storage_mode: payload.storageMode,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create upload ticket: ${response.status} ${text}`);
    }

    return response.json() as Promise<UploadTicket>;
}

export async function uploadWithTicket(
    file: Blob,
    upload: NonNullable<UploadTicket["upload"]>,
): Promise<void> {
    const headers = new Headers(upload.headers);
    if (!headers.has("Content-Type") && file.type) {
        headers.set("Content-Type", file.type);
    }

    const response = await fetch(upload.url, {
        method: upload.method,
        headers,
        body: file,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} ${text}`);
    }
}
