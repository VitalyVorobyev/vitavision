import { API_BASE_URL, apiHeaders } from "./http";

export type StorageMode = "r2" | "local";

export interface UploadTicketRequest {
    filename: string;
    contentType: string;
    storageMode?: StorageMode;
}

export interface UploadTicket {
    storage_mode: StorageMode;
    bucket: string;
    key: string;
    upload: {
        url: string;
        method: "PUT";
        headers: Record<string, string>;
    };
    preview_url: string | null;
    expires_in_seconds: number;
}

function normalizeContentType(contentType: string): string {
    return contentType || "application/octet-stream";
}

export async function createUploadTicket(payload: UploadTicketRequest): Promise<UploadTicket> {
    const response = await fetch(`${API_BASE_URL}/storage/upload-ticket`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
            filename: payload.filename,
            content_type: normalizeContentType(payload.contentType),
            storage_mode: payload.storageMode,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to create upload ticket: ${response.status} ${text}`);
    }

    return response.json() as Promise<UploadTicket>;
}

export async function uploadWithTicket(file: Blob, ticket: UploadTicket): Promise<void> {
    const headers = new Headers(ticket.upload.headers);
    if (!headers.has("Content-Type") && file.type) {
        headers.set("Content-Type", file.type);
    }

    const response = await fetch(ticket.upload.url, {
        method: ticket.upload.method,
        headers,
        body: file,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} ${text}`);
    }
}
