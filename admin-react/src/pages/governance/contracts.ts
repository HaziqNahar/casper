export type JsonRecord = Record<string, unknown>;

export type AuditLogEntry = {
    id: string;
    createdAt: string;
    actorUsername: string;
    entityType: string;
    entityId: string;
    entityName: string;
    action: string;
    details?: string | null;
    reason?: string | null;
    result?: string | null;
    confirmationMode?: string | null;
    beforeJson?: string | null;
    afterJson?: string | null;
    metadataJson?: string | null;
};

export type ApprovalRequestRow = {
    id: string;
    requestedAt: string;
    requestedByUsername: string;
    entityType: string;
    entityId: string;
    entityName: string;
    action: string;
    slaHours: number;
    reason: string;
    status: string;
    details?: string | null;
    payloadJson?: string | null;
    reviewedAt?: string | null;
    reviewedByUsername?: string | null;
    reviewComment?: string | null;
};

export const labelize = (value: string) =>
    value
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

export const safeParseRecord = (value?: string | null): JsonRecord | null => {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value) as unknown;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonRecord) : null;
    } catch {
        return null;
    }
};

export const readNumber = (record: JsonRecord | null, key: string) => {
    const value = record?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export const readString = (record: JsonRecord | null, key: string) => {
    const value = record?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const entityTypeLabel = (value: string) => {
    if (value === "realm") return "Realm";
    if (value === "application") return "Application";
    if (value === "application_access") return "Application Access";
    if (value === "user") return "User";
    if (value === "realm_access_request") return "Realm Access";
    return labelize(value);
};

export const entityTypeVariant = (value: string) => {
    if (value === "realm") return "info";
    if (value === "application") return "purple";
    if (value === "application_access") return "purple";
    if (value === "user") return "success";
    if (value === "realm_access_request") return "warning";
    return "default";
};

export const actionLabel = (value: string) => labelize(value);

export const actionVariant = (value: string) => {
    if (value.includes("deactivate") || value.includes("delete") || value.includes("revoke")) return "error";
    if (value.includes("activate") || value.includes("grant") || value.includes("create")) return "success";
    if (value.includes("approve") || value.includes("verify")) return "success";
    if (value.includes("reject") || value.includes("cancel")) return "error";
    if (value.includes("submit")) return "warning";
    if (value.includes("status")) return "warning";
    return "default";
};