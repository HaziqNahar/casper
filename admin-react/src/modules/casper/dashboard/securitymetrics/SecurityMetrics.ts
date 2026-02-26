// securityMetrics.ts
export type Severity = "ok" | "info" | "warn" | "critical";

export type PostureItem = {
    id: string;
    label: string;
    valueText: string;
    severity: Severity;
    hint?: string;
};

export type SecuritySummary = {
    posture: PostureItem[];

    apps: {
        total: number;
        enabled: number;
        disabled: number;
        publicClients: number;
        confidentialClients: number;
        oidc: number;
        saml: number;
    };

    users: {
        total: number;
        active: number;
        pending: number;
        inactive: number;
        deleted: number;
        inactive30d: number;
        inactive90d: number;
    };

    realms: {
        total: number;
        active: number;
        draft: number;
        inactive: number;
        withZeroUsers: number;
        withZeroApps: number;
    };
};

function parseLastLoginToDate(lastLogin?: string): Date | null {
    if (!lastLogin) return null;
    const s = String(lastLogin).trim();
    if (!s || s === "-") return null;

    // Your mock format: "19 Dec 2025, 15:30:00"
    // This parses in most browsers, but safer: add locale-based parsing later.
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
}

function daysSince(dt: Date, now = new Date()) {
    const ms = now.getTime() - dt.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function computeSecuritySummary(args: {
    users: Array<{ status: string; isDeleted: boolean; lastLogin?: string }>;
    realms: Array<{ status: string }>;
    apps: Array<{ enabled: boolean; publicClient: boolean; protocol: "oidc" | "saml" }>;
    realmUsers: Record<string, Array<{ userUuid: string; roleId: string }>>;
    realmApps: Record<string, string[]>;
}): SecuritySummary {
    const now = new Date();

    const usersSafe = Array.isArray(args.users) ? args.users : [];
    const realmsSafe = Array.isArray(args.realms) ? args.realms : [];
    const appsSafe = Array.isArray(args.apps) ? args.apps : [];

    // USERS
    const deleted = usersSafe.filter(u => u.isDeleted).length;
    const nonDeleted = usersSafe.filter(u => !u.isDeleted);

    const active = nonDeleted.filter(u => u.status === "Active").length;
    const pending = nonDeleted.filter(u => u.status === "Pending").length;
    const inactive = nonDeleted.filter(u => u.status === "Inactive").length;

    const inactive30d = nonDeleted.filter(u => {
        const dt = parseLastLoginToDate(u.lastLogin);
        if (!dt) return false;
        return daysSince(dt, now) > 30;
    }).length;

    const inactive90d = nonDeleted.filter(u => {
        const dt = parseLastLoginToDate(u.lastLogin);
        if (!dt) return false;
        return daysSince(dt, now) > 90;
    }).length;

    // APPS
    const totalApps = appsSafe.length;
    const enabledApps = appsSafe.filter(a => a.enabled).length;
    const disabledApps = appsSafe.filter(a => !a.enabled).length;
    const publicClients = appsSafe.filter(a => a.publicClient).length;
    const confidentialClients = appsSafe.filter(a => !a.publicClient).length;
    const oidc = appsSafe.filter(a => a.protocol === "oidc").length;
    const saml = appsSafe.filter(a => a.protocol === "saml").length;

    // REALMS
    const totalRealms = realmsSafe.length;
    const rActive = realmsSafe.filter(r => r.status === "Active").length;
    const rDraft = realmsSafe.filter(r => r.status === "Draft").length;
    const rInactive = realmsSafe.filter(r => r.status === "Inactive").length;

    const withZeroUsers = realmsSafe.filter(r => (args.realmUsers?.[String((r as any).id)] ?? []).length === 0).length;
    const withZeroApps = realmsSafe.filter(r => (args.realmApps?.[String((r as any).id)] ?? []).length === 0).length;

    // ROLE HYGIENE: missing roleId entries
    const roleIssues = Object.values(args.realmUsers ?? {}).flat().filter(m => !m.roleId).length;

    // SEVERITY RULES (tweak later)
    const sev = (kind: string, n: number): Severity => {
        if (kind === "publicClients") return n > 0 ? "warn" : "ok";
        if (kind === "disabledApps") return n > 0 ? "info" : "ok";
        if (kind === "inactive90d") return n >= 5 ? "critical" : n > 0 ? "warn" : "ok";
        if (kind === "pendingUsers") return n > 0 ? "info" : "ok";
        if (kind === "realmNotActive") return n > 0 ? "warn" : "ok";
        if (kind === "roleIssues") return n > 0 ? "warn" : "ok";
        return "ok";
    };

    const notActiveRealms = rDraft + rInactive;

    const posture: PostureItem[] = [
        {
            id: "publicClients",
            label: "Public Clients",
            valueText: String(publicClients),
            severity: sev("publicClients", publicClients),
            hint: "Public clients increase token exposure risk. Review PKCE + redirect URIs.",
        },
        {
            id: "disabledApps",
            label: "Disabled Apps",
            valueText: String(disabledApps),
            severity: sev("disabledApps", disabledApps),
            hint: "Disabled apps should be audited and removed if retired.",
        },
        {
            id: "inactive90d",
            label: "Inactive Users > 90d",
            valueText: String(inactive90d),
            severity: sev("inactive90d", inactive90d),
            hint: "Consider deprovisioning or review for dormant accounts.",
        },
        {
            id: "pendingUsers",
            label: "Pending Users",
            valueText: String(pending),
            severity: sev("pendingUsers", pending),
            hint: "Pending identities should be resolved to reduce ambiguity.",
        },
        {
            id: "realmNotActive",
            label: "Non-Active Realms",
            valueText: String(notActiveRealms),
            severity: sev("realmNotActive", notActiveRealms),
            hint: "Draft/Inactive realms may indicate incomplete isolation setup.",
        },
        {
            id: "roleIssues",
            label: "Role Hygiene Issues",
            valueText: String(roleIssues),
            severity: sev("roleIssues", roleIssues),
            hint: "Users missing roles or unknown role mappings.",
        },
        // MFA placeholder – keep UI slot now
        {
            id: "mfaCoverage",
            label: "MFA Coverage",
            valueText: "—",
            severity: "info",
            hint: "Connect to MFA enforcement source (Keycloak / IdP). UI ready.",
        },
    ];

    return {
        posture,
        apps: {
            total: totalApps,
            enabled: enabledApps,
            disabled: disabledApps,
            publicClients,
            confidentialClients,
            oidc,
            saml,
        },
        users: {
            total: usersSafe.length,
            active,
            pending,
            inactive,
            deleted,
            inactive30d,
            inactive90d,
        },
        realms: {
            total: totalRealms,
            active: rActive,
            draft: rDraft,
            inactive: rInactive,
            withZeroUsers,
            withZeroApps,
        },
    };
}