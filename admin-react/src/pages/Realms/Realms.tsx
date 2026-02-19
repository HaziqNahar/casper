// RealmsPage.tsx
import React, { useCallback, useMemo, useState } from "react";

import TabPanel from "../../components/common/tabs/TabPanel";
import DataTable2, { TableColumn } from "../../components/common/DataTable";
import { useTabs } from "../../hooks/useTabs";
import type { Tab } from "../../hooks/useTabs";

import {
    ArrowLeft,
    Globe,
    Users as UsersIcon,
    Layers,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    Clock,
    Shield,
    Key,
} from "lucide-react";

import "../../styles/browserTabs.css";
import "../../styles/component.css";
import { Badge, LinkCell } from "../../components/common/Bagde";

// ============================================================================
// TYPES
// ============================================================================

type RealmStatus = "Active" | "Inactive" | "Draft";
type UserStatus = "Active" | "Inactive" | "Pending";

export interface RealmUserRow {
    id: number; // PK of realm_user
    realmId: string;
    userId: number;
}

export interface RealmRow {
    id: string;
    name: string;
    status: RealmStatus;
    createdAt: string;
    updatedAt?: string;

    // UI convenience
    userCount: number;
}

export interface UserRow {
    uuid: string; // main identifier (matches your decision)
    id: number; // internal mock numeric id (you can remove later if you don’t need)
    staffId?: string; // belongs on user
    username: string;
    email: string;
    firstName: string;
    lastName: string;

    status: UserStatus;
    isDeleted: boolean;

    lastLogin?: string;
}

export type RealmUserMap = Record<string, string[]>; // realmId -> userUUIDs
export type RealmAppUserKey = string;
export type RealmAppUsersMap = Record<RealmAppUserKey, string[]>;

// Keycloak-facing Applications model (realm has many apps)
export interface AppRow {
    id: string; // app_id
    name: string; // display name in UI
    clientId: string; // keycloak clientId
    protocol: "oidc" | "saml";
    enabled: boolean;

    // Keycloak useful fields
    publicClient: boolean;
    serviceAccountsEnabled: boolean;

    standardFlowEnabled: boolean; // authorization code
    directAccessGrantsEnabled: boolean; // password grant (legacy but still common)
    implicitFlowEnabled: boolean; // old

    rootUrl?: string;
    baseUrl?: string;
    adminUrl?: string;

    redirectUris: string[];
    webOrigins: string[];

    // Only if confidential client (publicClient=false)
    clientSecretMasked?: string;
    clientScopes: string[];
    realmRoles: string[];
    protocolMappers: Array<{ name: string; protocol: string; mapperType: string }>;
}

export type RealmAppMap = Record<string, string[]>; // realmId -> appIds

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "0.35rem 0" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#6b7280" }}>{label}</span>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827", ...(mono ? monoStyle : {}) }}>{value}</span>
    </div>
);

const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "1rem",
};

const cardTitleStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 900,
    color: "#111827",
    marginBottom: 10,
};

const sectionLabelStyle: React.CSSProperties = {
    fontSize: "0.78rem",
    fontWeight: 900,
    color: "#6b7280",
    marginBottom: 6,
};

const listStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: "1.1rem",
};

const listItemStyle: React.CSSProperties = {
    marginBottom: 4,
};

const monoStyle: React.CSSProperties = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#6b7280" }}>{label}</label>
        {children}
    </div>
);

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.9rem",
};

const SectionHeader: React.FC<{ title: string; right?: React.ReactNode; subtitle?: string }> = ({ title, right, subtitle }) => (
    <div
        style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: subtitle ? "flex-start" : "center",
            gap: 12,
            paddingBottom: 10,
            borderBottom: "1px solid var(--kc-border-subtle)",
            marginBottom: 12,
        }}
    >
        <div>
            <div className="kc-text-title">{title}</div>
            {subtitle && <div className="kc-text-subtitle kc-text-muted">{subtitle}</div>}
        </div>
        {right}
    </div>
);


// ============================================================================
// MOCK DATA (replace with API)
// ============================================================================

const USERS_DATA: UserRow[] = [
    {
        uuid: "u-5b9f2a2c-1",
        id: 1,
        staffId: "S1234567A",
        username: "admin",
        email: "admin@bos.sg",
        firstName: "Admin",
        lastName: "User",
        status: "Active",
        isDeleted: false,
        lastLogin: "19 Dec 2025, 15:30:00",
    },
    {
        uuid: "u-5b9f2a2c-2",
        id: 2,
        staffId: "S7654321B",
        username: "john.doe",
        email: "john.doe@bos.sg",
        firstName: "John",
        lastName: "Doe",
        status: "Active",
        isDeleted: false,
        lastLogin: "19 Dec 2025, 14:20:00",
    },
    {
        uuid: "u-5b9f2a2c-3",
        id: 3,
        staffId: "S2233445C",
        username: "jane.smith",
        email: "jane.smith@bos.sg",
        firstName: "Jane",
        lastName: "Smith",
        status: "Active",
        isDeleted: false,
        lastLogin: "18 Dec 2025, 16:45:00",
    },
    {
        uuid: "u-5b9f2a2c-4",
        id: 4,
        staffId: "S9988776D",
        username: "mike.tan",
        email: "mike.tan@bos.sg",
        firstName: "Mike",
        lastName: "Tan",
        status: "Inactive",
        isDeleted: false,
        lastLogin: "-",
    },
    {
        uuid: "u-5b9f2a2c-5",
        id: 5,
        staffId: "S4455667E",
        username: "sarah.lee",
        email: "sarah.lee@bos.sg",
        firstName: "Sarah",
        lastName: "Lee",
        status: "Pending",
        isDeleted: false,
        lastLogin: "-",
    },
    // Example of soft-deleted old identity (can be recreated with same username/email later)
    {
        uuid: "u-legacy-0001",
        id: 6,
        staffId: "S1111222Z",
        username: "jason.ng",
        email: "jason.ng@bos.sg",
        firstName: "Jason",
        lastName: "Ng",
        status: "Inactive",
        isDeleted: true,
        lastLogin: "01 Nov 2025, 10:00:00",
    },
];

const REALMS_DATA: RealmRow[] = [
    {
        id: "realm-ops",
        name: "Operations Realm",
        status: "Active",
        createdAt: "2025-12-18T09:00:00.000Z",
        updatedAt: "2025-12-19T09:00:00.000Z",
        userCount: 0,
    },
    {
        id: "realm-fin",
        name: "Finance Realm",
        status: "Inactive",
        createdAt: "2025-12-10T09:00:00.000Z",
        updatedAt: "2025-12-12T09:00:00.000Z",
        userCount: 0,
    },
    {
        id: "realm-dev",
        name: "Sandbox Realm",
        status: "Draft",
        createdAt: "2025-12-01T09:00:00.000Z",
        updatedAt: "2025-12-01T09:00:00.000Z",
        userCount: 0,
    },
];

const REALM_USERS_INITIAL: RealmUserMap = {
    "realm-ops": ["u-5b9f2a2c-1", "u-5b9f2a2c-2", "u-5b9f2a2c-3"],
    "realm-fin": ["u-5b9f2a2c-4", "u-5b9f2a2c-5"],
    "realm-dev": ["u-5b9f2a2c-2"],
};

const REALM_APP_USERS_INITIAL: RealmAppUsersMap = {
    "realm-ops::app-ops-web": ["u-5b9f2a2c-1", "u-5b9f2a2c-2"],
    "realm-ops::app-ops-mobile": ["u-5b9f2a2c-2"], // john has mobile access only
};


const APPS_DATA: AppRow[] = [
    {
        id: "app-ops-web",
        name: "Ops Web Portal",
        clientId: "ops-web",
        protocol: "oidc",
        enabled: true,
        publicClient: false,
        serviceAccountsEnabled: true,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: false,
        implicitFlowEnabled: false,
        rootUrl: "https://ops.company.sg",
        baseUrl: "https://ops.company.sg/app",
        adminUrl: "https://ops.company.sg/admin",
        redirectUris: ["https://ops.company.sg/*"],
        webOrigins: ["https://ops.company.sg"],
        clientSecretMasked: "kc_demo_9F7xQ2mL1pA8vR3zT6yB0nC4",
        clientScopes: ["profile", "email", "roles", "web-origins"],
        realmRoles: ["ops_admin", "ops_viewer"],
        protocolMappers: [
            { name: "groups", protocol: "oidc", mapperType: "Group Membership" },
            { name: "realm roles", protocol: "oidc", mapperType: "User Realm Role" },
        ],
    },
    {
        id: "app-ops-mobile",
        name: "Ops Mobile",
        clientId: "ops-mobile",
        protocol: "oidc",
        enabled: true,
        publicClient: true,
        serviceAccountsEnabled: false,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: false,
        implicitFlowEnabled: false,
        redirectUris: ["com.company.ops://callback", "https://auth.company.sg/mobile/*"],
        webOrigins: [],
        clientScopes: ["profile", "email", "roles", "web-origins"],
        realmRoles: ["ops_admin", "ops_viewer"],
        protocolMappers: [
            { name: "groups", protocol: "oidc", mapperType: "Group Membership" },
            { name: "realm roles", protocol: "oidc", mapperType: "User Realm Role" },
        ],
    },
    {
        id: "app-fin-web",
        name: "Finance Web",
        clientId: "fin-web",
        protocol: "oidc",
        enabled: false,
        publicClient: false,
        serviceAccountsEnabled: true,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: false,
        implicitFlowEnabled: false,
        rootUrl: "https://fin.company.sg",
        baseUrl: "https://fin.company.sg/app",
        redirectUris: ["https://fin.company.sg/*"],
        webOrigins: ["https://fin.company.sg"],
        clientSecretMasked: "kc_demo_9F7xQ2mL1pA8vR3zT6ylejvi",
        clientScopes: ["profile", "email", "roles", "web-origins"],
        realmRoles: ["ops_admin", "ops_viewer"],
        protocolMappers: [
            { name: "groups", protocol: "oidc", mapperType: "Group Membership" },
            { name: "realm roles", protocol: "oidc", mapperType: "User Realm Role" },
        ],
    },
];

const REALM_APPS_INITIAL: RealmAppMap = {
    "realm-ops": ["app-ops-web", "app-ops-mobile"],
    "realm-fin": ["app-fin-web"],
    "realm-dev": ["app-ops-web"],
};

// ============================================================================
// HELPERS
// ============================================================================


function formatTooltip(dt: Date) {
    // includes seconds + timezone
    return new Intl.DateTimeFormat("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
    }).format(dt);
}

function formatDateTime(dt: Date) {
    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(dt);
}
function formatAbsolute(dt: Date) {
    return new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(dt);
}


function formatFull(dt: Date) {
    return new Intl.DateTimeFormat("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
    }).format(dt);
}

// optional relative
function formatRelative(dt: Date) {
    const diffMs = Date.now() - dt.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

const realmStatusVariant = (status: RealmStatus): "success" | "warning" | "error" | "default" => {
    switch (status) {
        case "Active":
            return "success";
        case "Draft":
            return "warning";
        case "Inactive":
            return "error";
        default:
            return "default";
    }
};

const realmStatusIcon = (status: RealmStatus) => {
    switch (status) {
        case "Active":
            return <CheckCircle size={12} />;
        case "Draft":
            return <Clock size={12} />;
        case "Inactive":
            return <XCircle size={12} />;
        default:
            return null;
    }
};

const userStatusVariant = (status: UserStatus): "success" | "warning" | "error" | "default" => {
    switch (status) {
        case "Active":
            return "success";
        case "Pending":
            return "warning";
        case "Inactive":
            return "error";
        default:
            return "default";
    }
};

// Simple UUID-ish generator for mock create
const makeUuid = () => `u-${Math.random().toString(16).slice(2)}-${Date.now()}`;

// ============================================================================
// TABLE COLUMNS
// ============================================================================

const createRealmColumns = (onView: (row: RealmRow) => void): TableColumn<RealmRow>[] => [
    {
        key: "name",
        label: "Realm",
        width: "300px",
        render: (value, row) => <LinkCell onClick={() => onView(row)}>{value as string}</LinkCell>,
    },
    {
        key: "status",
        label: "Status",
        width: "140px",
        align: "center",
        render: (value) => (
            <Badge variant={realmStatusVariant(value as RealmStatus)}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    {realmStatusIcon(value as RealmStatus)}
                    {value as string}
                </span>
            </Badge>
        ),
    },
    {
        key: "userCount",
        label: "Users",
        width: "110px",
        align: "center",
        render: (value) => (value ?? 0) as any,
    },
    {
        key: "updatedAt",
        label: "Last Updated",
        width: "190px",
        render: (value) => {
            if (!value) return "-";
            const dt = new Date(value as string);

            return (
                <span className="kc-datetime"
                    title={formatFull(dt)}>
                    {formatAbsolute(dt)}
                    <span className="kc-datetime-sub">
                        {formatRelative(dt)}
                    </span>
                </span>
            );
        },
    },
    {
        key: "id",
        label: "Actions",
        width: "90px",
        align: "center",
        sortable: false,
        render: (_, row) => (
            <button
                type="button"
                className="icon-action"
                onClick={(e) => {
                    e.stopPropagation();
                    onView(row);
                }}
                title="View"
            >
                <Eye size={16} />
            </button>
        ),
    },
];

const createRealmUsersColumns = (
    onViewUser: (user: UserRow) => void,
    onRemoveFromRealm: (userUuid: string) => void
): TableColumn<UserRow>[] => [
        {
            key: "username",
            label: "Username",
            width: "190px",
            render: (value, row) => <LinkCell onClick={() => onViewUser(row)}>{value as string}</LinkCell>,
        },
        {
            key: "firstName",
            label: "Name",
            width: "220px",
            render: (_, row) => `${row.firstName} ${row.lastName}`,
        },
        {
            key: "email",
            label: "Email",
            width: "260px",
            render: (value) => (value as string) || "-",
        },
        {
            key: "status",
            label: "Status",
            width: "130px",
            align: "center",
            render: (value) => <Badge variant={userStatusVariant(value as UserStatus)}>{value as string}</Badge>,
        },
        {
            key: "lastLogin",
            label: "Last Login",
            width: "170px",
            render: (value) => {
                if (!value) return "-";
                const dt = new Date(value as string);

                return (
                    <time className="kc-datetime" dateTime={dt.toISOString()} title={formatFull(dt)}>
                        {formatAbsolute(dt)}
                        <span className="kc-datetime-sub">{formatRelative(dt)}</span>
                    </time>
                );
            },
        },
        {
            key: "uuid",
            label: "Actions",
            width: "90px",
            align: "center",
            sortable: false,
            render: (_, row) => (
                <button
                    type="button"
                    className="icon-action"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromRealm(row.uuid);
                    }}
                    title="Remove from realm"
                    style={{ color: "#dc2626" }}
                >
                    <Trash2 size={16} />
                </button>
            ),
        },
    ];

const createAddUserColumns = (
    onAddToRealm: (userUuid: string) => void
): TableColumn<UserRow>[] => [
        {
            key: "username",
            label: "Username",
            width: "190px",
            render: (value) => value as any,
        },
        {
            key: "firstName",
            label: "Name",
            width: "220px",
            render: (_, row) => `${row.firstName} ${row.lastName}`,
        },
        {
            key: "email",
            label: "Email",
            width: "260px",
            render: (value) => (value as string) || "-",
        },
        {
            key: "status",
            label: "Status",
            width: "130px",
            align: "center",
            render: (value) => <Badge variant={userStatusVariant(value as UserStatus)}>{value as string}</Badge>,
        },
        {
            key: "uuid",
            label: "Actions",
            width: "120px",
            align: "center",
            sortable: false,
            render: (_, row) => (
                <button
                    type="button"
                    className="btn-primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToRealm(row.uuid);
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0.45rem 0.75rem" }}
                    title="Add to realm"
                >
                    <Plus size={16} /> Add
                </button>
            ),
        },
    ];

const createAppColumns = (
    onViewApp?: (app: AppRow) => void
): TableColumn<AppRow>[] => [
        {
            key: "name",
            label: "Application",
            width: "260px",
            render: (value, row) => (
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600, color: "#1f2937" }}>{value as string}</span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{row.id}</span>
                </div>
            ),
        },
        {
            key: "clientId",
            label: "Client ID",
            width: "220px",
            render: (value) => (
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: "0.85rem" }}>
                    {value as string}
                </span>
            ),
        },
        {
            key: "protocol",
            label: "Auth Method",
            width: "140px",
            align: "center",
            render: (value) => (
                <Badge variant="info">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Key size={12} />
                        {value as string}
                    </span>
                </Badge>
            ),
        },
        {
            key: "enabled",
            label: "Status",
            width: "120px",
            align: "center",
            render: (v) => <Badge variant={v ? "success" : "error"}>{v ? "Enabled" : "Disabled"}</Badge>,
        },
        // {
        //     key: "publicClient",
        //     label: "Client Type",
        //     width: "140px",
        //     align: "center",
        //     render: (v, row) => (
        //         <Badge variant={v ? "warning" : "default"}>
        //             {row.publicClient ? "Public" : "Confidential"}
        //         </Badge>
        //     ),
        // },
        // {
        //     key: "standardFlowEnabled",
        //     label: "Flows",
        //     width: "300px",
        //     render: (_v, row) => {
        //         const pills: Array<{ on: boolean; label: string }> = [
        //             { on: row.standardFlowEnabled, label: "Auth Code" },
        //             { on: row.directAccessGrantsEnabled, label: "Direct Grant" },
        //             { on: row.implicitFlowEnabled, label: "Implicit" },
        //             { on: row.serviceAccountsEnabled, label: "Service Acc" },
        //         ];
        //         return (
        //             <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        //                 {pills.map((p) => (
        //                     <span
        //                         key={p.label}
        //                         className={`pill ${p.on ? "pill-info" : "pill-neutral"}`}
        //                         style={{ opacity: p.on ? 1 : 0.55 }}
        //                     >
        //                         {p.label}
        //                     </span>
        //                 ))}
        //             </div>
        //         );
        //     },
        // },
        {
            key: "redirectUris",
            label: "Redirect URIs",
            width: "320px",
            render: (_v, row) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "0.8rem", color: "#374151" }}>{row.redirectUris.length} configured</span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        {row.redirectUris[0] ?? "-"}
                        {row.redirectUris.length > 1 ? " …" : ""}
                    </span>
                </div>
            ),
        },
        {
            key: "id",
            label: "Actions",
            width: "90px",
            align: "center",
            sortable: false,
            render: (_v, row) => (
                <button
                    type="button"
                    className="icon-action"
                    onClick={(e) => {
                        e.stopPropagation();
                        onViewApp(row);
                    }}
                    title="View"
                >
                    <Eye size={16} />
                </button>
            ),
        },
    ];

// ============================================================================
// LIST TAB
// ============================================================================

const RealmsContent: React.FC<{
    realms: RealmRow[];
    loading: boolean;
    error: string | null;
    onRowClick: (realm: RealmRow) => void;
}> = ({ realms, loading, error, onRowClick }) => {
    const columns = useMemo(() => createRealmColumns(onRowClick), [onRowClick]);
    return (
        <div className="tab-table-container" style={{ position: "relative" }}>
            <div className="table-card" style={{ flex: 1 }}>
                <DataTable2<RealmRow>
                    data={Array.isArray(realms) ? realms : []}
                    columns={columns}
                    keyField="id"
                    onRowClick={onRowClick}
                    loading={loading}
                    error={error}
                    searchable
                    searchPlaceholder="Search realms..."
                    paginated
                    pageSize={10}
                    pageSizeOptions={[10, 25, 50]}
                    striped
                    hoverable
                    stickyHeader
                    emptyMessage="No realms found"
                    minHeight="100%"
                />
            </div>
        </div>
    );
};

const createAppAccessUsersColumns = (onRemove: (uuid: string) => void): TableColumn<UserRow>[] => [
    { key: "username", label: "Username", width: "180px", render: (v) => v as any },
    { key: "email", label: "Email", width: "260px", render: (v) => v as any },
    {
        key: "status", label: "Status", width: "130px", align: "center",
        render: (v) => <Badge variant={userStatusVariant(v as UserStatus)}>{v as string}</Badge>
    },
    {
        key: "uuid",
        label: "Actions",
        width: "90px",
        align: "center",
        sortable: false,
        render: (_v, row) => (
            <button
                type="button"
                className="icon-action"
                title="Remove access"
                onClick={(e) => { e.stopPropagation(); onRemove(row.uuid); }}
                style={{ color: "#dc2626" }}
            >
                <Trash2 size={16} />
            </button>
        ),
    },
];

const createGrantAccessColumns = (onAdd: (uuid: string) => void): TableColumn<UserRow>[] => [
    { key: "username", label: "Username", width: "180px", render: (v) => v as any },
    { key: "email", label: "Email", width: "260px", render: (v) => v as any },
    {
        key: "uuid",
        label: "Actions",
        width: "120px",
        align: "center",
        sortable: false,
        render: (_v, row) => (
            <button
                type="button"
                className="kc-btn kc-btn-primary"
                onClick={(e) => { e.stopPropagation(); onAdd(row.uuid); }}
            >
                <Plus size={16} /> Grant
            </button>
        ),
    },
];


// ============================================================================
// REALM DETAIL TAB (Users + Add User + Create User + Applications)
// ============================================================================

type RealmDetailTab = "users" | "applications";

const RealmDetailContent: React.FC<{
    realm: RealmRow;
    allUsers: UserRow[];
    realmUserUuids: string[];
    appsInRealm: AppRow[];

    appUsers: RealmAppUsersMap;
    onGrantAppUser: (appId: string, userUuid: string) => void;
    onRevokeAppUser: (appId: string, userUuid: string) => void;

    onBack?: () => void;
    onRemoveUser: (userUuid: string) => void;
    onAddUser: (userUuid: string) => void;
    onCreateUser: (newUser: UserRow) => void;
}> = ({ realm, allUsers, realmUserUuids, appsInRealm, appUsers, onRevokeAppUser, onGrantAppUser, onBack, onRemoveUser, onAddUser, onCreateUser }) => {
    const [tab, setTab] = useState<RealmDetailTab>("users");
    const [query, setQuery] = useState("");

    // Create user form
    const [form, setForm] = useState({
        staffId: "",
        username: "",
        email: "",
        firstName: "",
        lastName: "",
    });
    const addColumns = useMemo(() => createAddUserColumns((uuid) => onAddUser(uuid)), [onAddUser]);

    const [formError, setFormError] = useState<string | null>(null);

    const [selectedApp, setSelectedApp] = useState<AppRow | null>(null);

    const [showGrant, setShowGrant] = useState(false);
    const [grantQuery, setGrantQuery] = useState("");
    const [showSecret, setShowSecret] = useState(false);

    const handleSelectApp = useCallback((app: AppRow) => {
        setSelectedApp(app);
    }, []);

    const appColumns = useMemo(
        () => createAppColumns(handleSelectApp),
        [handleSelectApp]
    );

    const realmUserSet = useMemo(() => new Set(realmUserUuids), [realmUserUuids]);

    const usersInRealm = useMemo(() => {
        const safeUsers = Array.isArray(allUsers) ? allUsers : [];
        return safeUsers.filter((u) => realmUserSet.has(u.uuid) && !u.isDeleted);
    }, [allUsers, realmUserSet]);

    const userColumns = useMemo(
        () => createRealmUsersColumns(() => { }, (uuid) => onRemoveUser(uuid)),
        [onRemoveUser]
    );

    const availableUsersToAdd = useMemo(() => {
        const safeUsers = Array.isArray(allUsers) ? allUsers : [];
        const q = query.trim().toLowerCase();

        return safeUsers
            .filter((u) => !u.isDeleted)
            .filter((u) => !realmUserSet.has(u.uuid))
            .filter((u) => {
                if (!q) return true;
                return (
                    u.username.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                    (u.staffId ?? "").toLowerCase().includes(q)
                );
            });
    }, [allUsers, realmUserSet, query]);

    const handleCreateUser = () => {
        setFormError(null);

        const username = form.username.trim();
        const email = form.email.trim();
        const firstName = form.firstName.trim();
        const lastName = form.lastName.trim();
        const staffId = form.staffId.trim();

        if (!username) return setFormError("Username is required");
        if (!email) return setFormError("Email is required");
        if (!firstName) return setFormError("First name is required");
        if (!lastName) return setFormError("Last name is required");

        // IMPORTANT: you said duplicates check should ignore deleted
        const safeUsers = Array.isArray(allUsers) ? allUsers : [];
        const exists = safeUsers.some(
            (u) => !u.isDeleted && (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase())
        );
        if (exists) return setFormError("Active user already exists with same username or email");

        const newUser: UserRow = {
            uuid: makeUuid(),
            id: Date.now(),
            staffId: staffId || undefined,
            username,
            email,
            firstName,
            lastName,
            status: "Pending",
            isDeleted: false,
            lastLogin: "-",
        };

        onCreateUser(newUser);     // add to users table
        onAddUser(newUser.uuid);   // add to realm_users
        setTab("users");
        setForm({ staffId: "", username: "", email: "", firstName: "", lastName: "" });
    };

    const [showAddUsers, setShowAddUsers] = useState(false);

    return (
        <div style={{ padding: "0.75rem" }}>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                    paddingBottom: "0.75rem",
                    borderBottom: "1px solid #e5e7eb",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="btn-secondary"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.5rem 1rem",
                                background: "#f3f4f6",
                                border: "1px solid #e5e7eb",
                                borderRadius: "0.375rem",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                color: "#374151",
                            }}
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}

                    <div>
                        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>{realm.name}</h2>
                        <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                            <span className={` status-pill ${realmStatusVariant(realm.status)}`}>
                                {realmStatusIcon(realm.status)} {realm.status}
                            </span>

                            <span className="pill">
                                <UsersIcon size={12} /> {usersInRealm.length} users
                            </span>

                            <span
                                className="pill"
                                style={{
                                    padding: "0.25rem 0.6rem",
                                    background: "#eef2ff",
                                    color: "#3730a3",
                                    borderRadius: 9999,
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <Layers size={12} /> {appsInRealm.length} apps
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="kc-btn kc-btn-primary">
                        <Shield size={16} />
                        Manage
                    </button>
                </div>
            </div>

            {/* Inner tabs */}
            <div style={{ display: "flex", gap: 18, borderBottom: "1px solid var(--kc-border-subtle)", marginBottom: 12 }}>
                {[
                    { id: "users", label: "Users", icon: <UsersIcon size={14} /> },
                    { id: "applications", label: "Applications", icon: <Globe size={14} /> },
                ].map((t) => {
                    const active = tab === (t.id as RealmDetailTab);
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as RealmDetailTab)}
                            style={{
                                background: "transparent",
                                border: "none",
                                padding: "10px 4px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                color: active ? "var(--kc-primary)" : "var(--kc-text-muted)",
                                fontWeight: active ? 700 : 600,
                                borderBottom: active ? `2px solid var(--kc-primary)` : "2px solid transparent",
                                marginBottom: -1,
                            }}
                        >
                            {t.icon} {t.label}
                        </button>
                    );
                })}
            </div>


            {/* USERS */}
            {tab === "users" && (
                <div className="tab-table-container" style={{ position: "relative" }}>
                    <div className="table-card" style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div className="kc-text-title">Users in Realm</div>

                            <button
                                className="kc-btn kc-btn-primary"
                                onClick={() => setShowAddUsers(s => !s)}
                            >
                                <Plus size={16} /> {showAddUsers ? "Close" : "Add users"}
                            </button>
                        </div>

                        <DataTable2<UserRow>
                            data={usersInRealm}
                            columns={userColumns}
                            keyField="uuid"
                            searchable
                            searchPlaceholder="Search users in this realm..."
                            paginated
                            pageSize={10}
                            pageSizeOptions={[10, 25, 50]}
                            striped
                            hoverable
                            stickyHeader
                            emptyMessage="No users in this realm"
                            minHeight="360px"
                        />

                        {showAddUsers && (
                            <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                    <div className="kc-text-title">Add existing users</div>
                                    {/* <button className="btn-secondary" onClick={() => setShowAddUsers(false)}>Close</button> */}
                                </div>

                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search by username, email, name, staff id..."
                                    style={inputStyle}
                                />

                                <div style={{ marginTop: 12 }}>
                                    <DataTable2<UserRow>
                                        data={availableUsersToAdd}
                                        columns={addColumns}
                                        keyField="uuid"
                                        paginated
                                        pageSize={10}
                                        pageSizeOptions={[10, 25, 50]}
                                        striped
                                        hoverable
                                        stickyHeader
                                        emptyMessage="No users found"
                                        minHeight="320px"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* ADD EXISTING USER */}
            {/* {tab === "add-user" && (
                <div className="table-card" style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by username, email, name, staff id..."
                            style={{
                                width: "100%",
                                padding: "0.65rem 0.75rem",
                                border: "1px solid #e5e7eb",
                                borderRadius: "0.5rem",
                                fontSize: "0.9rem",
                            }}
                        />
                    </div>

                    <DataTable2<UserRow>
                        data={availableUsersToAdd}
                        columns={addColumns}
                        keyField="uuid"
                        paginated
                        pageSize={10}
                        pageSizeOptions={[10, 25, 50]}
                        striped
                        hoverable
                        stickyHeader
                        emptyMessage="No users found"
                        minHeight="360px"
                    />
                </div>
            )} */}

            {/* CREATE NEW USER */}
            {/* {tab === "create-user" && (
                <div
                    className="table-card"
                    style={{
                        padding: "1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.75rem",
                        background: "white",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <span
                            style={{
                                width: 36,
                                height: 36,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 12,
                                background: "#eef2ff",
                                color: "#3730a3",
                            }}
                        >
                            <Plus size={18} />
                        </span>
                        <div>
                            <div style={{ fontWeight: 800, color: "#111827" }}>Create a new user in this realm</div>
                            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                                Creates a fresh identity (new UUID), then adds it to this realm.
                            </div>
                        </div>
                    </div>

                    {formError && (
                        <div
                            style={{
                                marginBottom: 12,
                                padding: "0.75rem 1rem",
                                background: "#fee2e2",
                                border: "1px solid #fecaca",
                                borderRadius: 12,
                                color: "#991b1b",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                            }}
                        >
                            {formError}
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                        <Field label="Staff ID (optional)">
                            <input
                                value={form.staffId}
                                onChange={(e) => setForm((p) => ({ ...p, staffId: e.target.value }))}
                                placeholder="e.g. S1234567A"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Username *">
                            <input
                                value={form.username}
                                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                                placeholder="e.g. john.doe"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Email *">
                            <input
                                value={form.email}
                                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                placeholder="e.g. john.doe@company.com"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="First name *">
                            <input
                                value={form.firstName}
                                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                                placeholder="John"
                                style={inputStyle}
                            />
                        </Field>

                        <Field label="Last name *">
                            <input
                                value={form.lastName}
                                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                                placeholder="Doe"
                                style={inputStyle}
                            />
                        </Field>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                        <button
                            onClick={() => {
                                setFormError(null);
                                setForm({ staffId: "", username: "", email: "", firstName: "", lastName: "" });
                            }}
                            style={{
                                padding: "0.55rem 0.9rem",
                                borderRadius: 12,
                                border: "1px solid #e5e7eb",
                                background: "#f9fafb",
                                cursor: "pointer",
                                fontWeight: 700,
                                color: "#374151",
                            }}
                        >
                            Clear
                        </button>

                        <button
                            onClick={handleCreateUser}
                            style={{
                                padding: "0.55rem 0.9rem",
                                borderRadius: 12,
                                border: "none",
                                background: "#111827",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 800,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <Plus size={16} /> Create & Add
                        </button>
                    </div>
                </div>
            )} */}

            {/* APPLICATIONS */}
            {
                tab === "applications" && (
                    <>
                        {selectedApp ? (
                            <ApplicationDetailContent app={selectedApp} onBack={() => setSelectedApp(null)} realmUsers={usersInRealm} appUserUuids={(appUsers?.[`${realm.id}::${selectedApp.id}`] ?? [])}
                                onGrantUser={(userUuid) => onGrantAppUser(selectedApp.id, userUuid)}
                                onRevokeUser={(userUuid) => onRevokeAppUser(selectedApp.id, userUuid)}
                                showGrant={showGrant}
                                setShowGrant={setShowGrant}
                                grantQuery={grantQuery}
                                setGrantQuery={setGrantQuery}
                                showSecret={showSecret}
                                setShowSecret={setShowSecret} />
                        ) : (
                            <div className="table-card" style={{ flex: 1 }}>
                                <DataTable2<AppRow>
                                    data={Array.isArray(appsInRealm) ? appsInRealm : []}
                                    columns={appColumns}
                                    keyField="id"
                                    onRowClick={handleSelectApp}
                                    searchable
                                    searchPlaceholder="Search applications..."
                                    paginated
                                    pageSize={10}
                                    pageSizeOptions={[10, 25, 50]}
                                    striped
                                    hoverable
                                    stickyHeader
                                    emptyMessage="No applications linked to this realm"
                                    minHeight="360px"
                                />
                            </div>
                        )}
                    </>
                )
            }
        </div >
    );
};

const ApplicationDetailContent: React.FC<{
    app: AppRow;
    onBack: () => void;
    realmUsers: UserRow[];
    appUserUuids: string[];
    onGrantUser: (userUuid: string) => void;
    onRevokeUser: (userUuid: string) => void;
    showGrant: boolean;
    setShowGrant: (showGrant: boolean) => void;
    grantQuery: string;
    setGrantQuery: (grantQuery: string) => void;
    showSecret: boolean;
    setShowSecret: (showSecret: boolean) => void;
}> = ({ app, onBack, realmUsers, appUserUuids, onGrantUser, onRevokeUser, showGrant, setShowGrant, grantQuery, setGrantQuery, showSecret, setShowSecret }) => {
    const accessColumns = useMemo(
        () => createAppAccessUsersColumns(onRevokeUser),
        [onRevokeUser]
    );

    const grantColumns = useMemo(
        () => createGrantAccessColumns(onGrantUser),
        [onGrantUser]
    );
    const appUserSet = useMemo(() => new Set(appUserUuids), [appUserUuids]);

    const usersWithAccess = useMemo(
        () => (Array.isArray(realmUsers) ? realmUsers : []).filter(u => appUserSet.has(u.uuid)),
        [realmUsers, appUserSet]
    );

    const eligibleToGrant = useMemo(() => {
        const q = grantQuery?.trim().toLowerCase();
        return (Array.isArray(realmUsers) ? realmUsers : [])
            .filter(u => !appUserSet.has(u.uuid))
            .filter(u => {
                if (!q) return true;
                return (
                    u.username.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                    (u.staffId ?? "").toLowerCase().includes(q)
                );
            });
    }, [realmUsers, appUserSet, grantQuery]);
    // const flows = [
    //     {label: "Auth Code", on: app.standardFlowEnabled },
    //     {label: "Direct Grant", on: app.directAccessGrantsEnabled },
    //     {label: "Implicit", on: app.implicitFlowEnabled },
    //     {label: "Service Accounts", on: app.serviceAccountsEnabled },
    // ];

    return (
        <div style={{ padding: "0.5rem" }}>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                    paddingBottom: "0.75rem",
                    borderBottom: "1px solid #e5e7eb",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <button
                        onClick={onBack}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "0.5rem 0.9rem",
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            cursor: "pointer",
                            fontWeight: 700,
                            color: "#374151",
                        }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>{app.name}</div>
                        <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                            <span className="pill pill-info">{app.protocol}</span>
                            <span className={`pill ${app.enabled ? "pill-success" : "pill-error"}`}>{app.enabled ? "Enabled" : "Disabled"}</span>
                            <span className={`pill ${app.publicClient ? "pill-warn" : "pill-neutral"}`}>{app.publicClient ? "Public Client" : "Confidential Client"}</span>
                            <span className="pill pill-neutral" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                                {app.clientId}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "1rem",
                }}
            >
                {/* Basics */}
                <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Key size={16} /> Client Basics
                    </div>

                    <Row label="Client ID" value={app.clientId} mono />
                    <Row label="Protocol" value={app.protocol} />
                    <Row label="Enabled" value={app.enabled ? "Yes" : "No"} />
                    <Row label="Client Type" value={app.publicClient ? "Public" : "Confidential"} />
                    {!app.publicClient && (
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "0.35rem 0" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#6b7280" }}>Secret</span>

                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span
                                    style={{
                                        fontSize: "0.9rem",
                                        fontWeight: 700,
                                        color: "#111827",
                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                        letterSpacing: showSecret ? 0 : 1.5,
                                        userSelect: "text",
                                    }}
                                >
                                    {showSecret
                                        ? (app.clientSecretMasked ?? "—")
                                        : (app.clientSecretMasked ? "•".repeat(Math.min(app.clientSecretMasked.length, 18)) : "—")}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setShowSecret((s) => !s)}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 32,
                                        height: 32,
                                        borderRadius: 10,
                                        border: "1px solid #e5e7eb",
                                        background: "#f9fafb",
                                        cursor: "pointer",
                                        color: "#374151",
                                    }}
                                    title={showSecret ? "Hide secret" : "Show secret"}
                                >
                                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Flows */}
                {/* <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Shield size={16} /> Authentication / Flows
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {flows.map((f) => (
                            <span
                                key={f.label}
                                className={`pill ${f.on ? "pill-info" : "pill-neutral"}`}
                                style={{ opacity: f.on ? 1 : 0.55 }}
                            >
                                {f.label}
                            </span>
                        ))}
                    </div>

                    <div style={{ marginTop: 12, color: "#6b7280", fontSize: "0.85rem" }}>
                        Later: you can show “Access Token Lifespan”, “PKCE”, “Backchannel Logout”, “Client Authenticator”.
                    </div>
                </div> */}

                {/* URLs */}
                <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Globe size={16} /> URLs
                    </div>
                    <Row label="Root URL" value={app.rootUrl ?? "—"} />
                    <Row label="Base URL" value={app.baseUrl ?? "—"} />
                    <Row label="Admin URL" value={app.adminUrl ?? "—"} />
                </div>

                {/* Redirect & Origins */}
                {/* <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Layers size={16} /> Redirect URIs & Origins
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <div style={sectionLabelStyle}>Redirect URIs ({app.redirectUris.length})</div>
                        <ul style={listStyle}>
                            {app.redirectUris.slice(0, 5).map((u) => (
                                <li key={u} style={listItemStyle}>
                                    <span style={monoStyle}>{u}</span>
                                </li>
                            ))}
                            {app.redirectUris.length > 5 && <li style={listItemStyle}>…</li>}
                        </ul>
                    </div>

                    <div>
                        <div style={sectionLabelStyle}>Web Origins ({app.webOrigins.length})</div>
                        <ul style={listStyle}>
                            {(app.webOrigins.length ? app.webOrigins : ["—"]).slice(0, 5).map((o) => (
                                <li key={o} style={listItemStyle}>
                                    <span style={monoStyle}>{o}</span>
                                </li>
                            ))}
                            {app.webOrigins.length > 5 && <li style={listItemStyle}>…</li>}
                        </ul>
                    </div>
                </div> */}

                {/* Client Scopes */}
                <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Shield size={16} /> Scopes
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>

                    </div>
                </div>

                {/* Realm Roles
                <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <UsersIcon size={16} /> Realm Roles (placeholder)
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(app.realmRoles ?? []).map((r) => (
                            <span key={r} className="pill pill-info">
                                {r}
                            </span>
                        ))}
                        {(app.realmRoles ?? []).length === 0 && <span style={{ color: "#6b7280" }}>—</span>}
                    </div>
                    <div style={{ marginTop: 10, color: "#6b7280", fontSize: "0.85rem" }}>
                        Later: fetch from Keycloak Roles endpoints + show composite roles.
                    </div>
                </div> */}

                {/* Protocol Mappers */}
                {/* <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Key size={16} /> Protocol Mappers
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(app.protocolMappers ?? []).map((m) => (
                            <div
                                key={m.name}
                                style={{
                                    padding: "0.6rem 0.75rem",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    background: "#fafafa",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                    <div style={{ fontWeight: 800, color: "#111827" }}>{m.name}</div>
                                    <span className="pill pill-neutral">{m.protocol}</span>
                                </div>
                                <div style={{ marginTop: 4, fontSize: "0.85rem", color: "#6b7280" }}>{m.mapperType}</div>
                            </div>
                        ))}
                        {(app.protocolMappers ?? []).length === 0 && <span style={{ color: "#6b7280" }}>—</span>}
                    </div>
                </div> */}
            </div>
            <div
                style={{
                    height: 1,
                    background: "#e5e7eb",
                    margin: "1.5rem 0",
                }}
            />

            <div style={cardStyle}>
                <SectionHeader
                    title="Users with access"
                    subtitle="Manage which realm users can access this client."
                    right={
                        <button className="kc-btn kc-btn-primary" onClick={() => setShowGrant(s => !s)}>
                            + {showGrant ? "Close" : "Grant access"}
                        </button>
                    }
                />

                <DataTable2<UserRow>
                    data={usersWithAccess}
                    columns={accessColumns}
                    keyField="uuid"
                    searchable
                    searchPlaceholder="Search users with access..."
                    paginated
                    pageSize={10}
                    pageSizeOptions={[10, 25, 50]}
                    striped
                    hoverable
                    stickyHeader
                    emptyMessage="No users have access to this application"
                    minHeight="260px"
                />

                {showGrant && (
                    <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
                        <div className="kc-text-title">Grant access to realm users</div>

                        <div style={{ marginTop: 12 }}>
                            <DataTable2<UserRow>
                                data={eligibleToGrant}
                                columns={grantColumns}
                                keyField="uuid"
                                paginated
                                pageSize={10}
                                pageSizeOptions={[10, 25, 50]}
                                striped
                                hoverable
                                stickyHeader
                                emptyMessage="No eligible users to grant"
                                minHeight="240px"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// ============================================================================
// TABS
// ============================================================================

const DEFAULT_TABS: Tab[] = [{ id: "realms", title: "Realms", type: "realms", closable: false }];

// ============================================================================
// MAIN PAGE
// ============================================================================

const RealmsPage: React.FC = () => {
    const [users, setUsers] = useState<UserRow[]>(USERS_DATA);
    const [realms, setRealms] = useState<RealmRow[]>(REALMS_DATA);
    const [apps] = useState<AppRow[]>(APPS_DATA);

    const [realmUsers, setRealmUsers] = useState<RealmUserMap>(REALM_USERS_INITIAL);
    const [realmApps] = useState<RealmAppMap>(REALM_APPS_INITIAL);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { tabs, activeTab, setActiveTab, addTab, closeTab, reorderTabs } = useTabs({
        storageKey: "admin-realms-tabs",
        defaultTabs: DEFAULT_TABS,
    });

    const [realmAppUsers, setRealmAppUsers] = useState<RealmAppUsersMap>(REALM_APP_USERS_INITIAL);

    const grantUserToApp = useCallback((realmId: string, appId: string, userUuid: string) => {
        const key = `${realmId}::${appId}`;
        setRealmAppUsers(prev => {
            const next = { ...(prev ?? {}) };
            const set = new Set(next[key] ?? []);
            set.add(userUuid);
            next[key] = Array.from(set);
            return next;
        });
    }, []);

    const revokeUserFromApp = useCallback((realmId: string, appId: string, userUuid: string) => {
        const key = `${realmId}::${appId}`;
        setRealmAppUsers(prev => {
            const next = { ...(prev ?? {}) };
            const set = new Set(next[key] ?? []);
            set.delete(userUuid);
            next[key] = Array.from(set);
            return next;
        });
    }, []);

    // Keep realm.userCount in sync with realmUsers map
    const syncRealmUserCounts = useCallback((next: RealmUserMap) => {
        setRealms((prev) =>
            prev.map((r) => ({
                ...r,
                userCount: (next?.[r.id] ?? []).length,
            }))
        );
    }, []);

    // initial sync
    React.useEffect(() => {
        syncRealmUserCounts(realmUsers);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRefresh = useCallback(() => {
        setLoading(true);
        setTimeout(() => {
            setRealms(REALMS_DATA);
            setUsers(USERS_DATA);
            setError(null);
            setLoading(false);
        }, 400);
    }, []);

    const handleRealmRowClick = useCallback(
        (realm: RealmRow) => {
            const tabId = `realm-${realm.id}`;
            const existing = tabs.findIndex((t: Tab) => t.type === "realm-detail" && t.id === tabId);
            if (existing !== -1) {
                setActiveTab(existing);
                return;
            }
            addTab({
                id: tabId,
                title: realm.name,
                type: "realm-detail",
                closable: true,
                content: realm,
            });
        },
        [tabs, setActiveTab, addTab]
    );

    const backToRealms = useCallback(() => {
        const idx = tabs.findIndex((t: Tab) => t.type === "realms");
        if (idx !== -1) setActiveTab(idx);
    }, [tabs, setActiveTab]);

    const removeUserFromRealm = useCallback(
        (realmId: string, userUuid: string) => {
            setRealmUsers((prev) => {
                const next: RealmUserMap = { ...(prev ?? {}) };
                const current = new Set(next[realmId] ?? []);
                current.delete(userUuid);
                next[realmId] = Array.from(current);
                queueMicrotask(() => syncRealmUserCounts(next));
                return next;
            });
        },
        [syncRealmUserCounts]
    );

    const addUserToRealm = useCallback(
        (realmId: string, userUuid: string) => {
            setRealmUsers((prev) => {
                const next: RealmUserMap = { ...(prev ?? {}) };
                const current = new Set(next[realmId] ?? []);
                current.add(userUuid);
                next[realmId] = Array.from(current);
                queueMicrotask(() => syncRealmUserCounts(next));
                return next;
            });
        },
        [syncRealmUserCounts]
    );

    const createUser = useCallback((newUser: UserRow) => {
        setUsers((prev) => [newUser, ...(prev ?? [])]);
    }, []);

    const renderTabContent = useCallback(
        (tab: Tab) => {
            switch (tab.type) {
                case "realms":
                    return <RealmsContent realms={realms} loading={loading} error={error} onRowClick={handleRealmRowClick} />;

                case "realm-detail": {
                    const realm = tab.content as RealmRow;

                    const realmUserUuids = (realmUsers?.[realm.id] ?? []) as string[];
                    const appIds = (realmApps?.[realm.id] ?? []) as string[];
                    const appSet = new Set(appIds);
                    const appsInRealm = (Array.isArray(apps) ? apps : []).filter((a) => appSet.has(a.id));
                    return (
                        <RealmDetailContent
                            realm={realm}
                            allUsers={Array.isArray(users) ? users : []}
                            realmUserUuids={realmUserUuids}
                            appsInRealm={appsInRealm}
                            onBack={backToRealms}
                            onRemoveUser={(uuid) => removeUserFromRealm(realm.id, uuid)}
                            onAddUser={(uuid) => addUserToRealm(realm.id, uuid)}
                            onCreateUser={(u) => createUser(u)}
                            appUsers={realmAppUsers}
                            onGrantAppUser={(appId, userUuid) => grantUserToApp(realm.id, appId, userUuid)}
                            onRevokeAppUser={(appId, userUuid) => revokeUserFromApp(realm.id, appId, userUuid)}

                        />
                    );
                }

                default:
                    return (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                            Content for "{tab.title}"
                        </div>
                    );
            }
        },
        [
            realms,
            loading,
            error,
            handleRealmRowClick,
            realmUsers,
            realmApps,
            apps,
            users,
            backToRealms,
            removeUserFromRealm,
            addUserToRealm,
            createUser,
        ]
    );

    return (
        <div className="admin-organization-page-wrapper" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div className="admin-organization-tab-wrapper" style={{ flex: 1, minHeight: 0 }}>
                <TabPanel
                    tabs={tabs}
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                    onAdd={() => { }}
                    onClose={closeTab}
                    onReorder={reorderTabs}
                    onRefresh={handleRefresh}
                    showActions
                    addButtonLabel=""
                    renderContent={renderTabContent}
                    minHeight="100%"
                />
            </div>
        </div>
    );
};

export default RealmsPage;
