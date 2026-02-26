import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import TabPanel from "../../components/common/tabs/TabPanel";
import DataTable2, { TableColumn } from "../../components/common/DataTable";
import { useTabs, Tab } from "../../hooks/useTabs";
import { useLocation } from "react-router-dom";

import {
    ArrowLeft,
    Globe,
    Users as UsersIcon,
    Layers,
    Plus,
    Trash2,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    Shield,
    Key,
    EyeOff,
} from "lucide-react";

import "../../styles/browserTabs.css";
import "../../styles/component.css";
import { Badge, LinkCell } from "../../components/common/Bagde";
import { ToastItem, ToastStack, ToastType } from "../../components/common/ToastStack";
import { useData } from "../../context/DataContext";
import { AppRow, RealmRow, UserRow } from "../../types";
import { MultiSelectCheckbox } from "../../components/common/MultiSelectCheckbox";
import { RowActionMenu } from "../../components/common/RowsActionMenu";

// ============================================================================
// TYPES
// ============================================================================

type RealmStatus = "Active" | "Inactive" | "Draft";
type UserStatus = "Active" | "Inactive" | "Pending";

type ConfirmState = {
    open: boolean;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm?: () => void;
};
type RealmUserViewRow = UserRow & { realmRoleId: RealmRoleId };

export type RealmRoleId = string;

export type RealmAppMap = Record<string, string[]>;

export interface RealmUserRow {
    id: number; // PK of realm_user
    realmId: string;
    userId: number;
}

export interface RealmMembership {
    userUuid: string;
    roleId: RealmRoleId;
    // optional:
    // assignedAt?: string;
    // assignedBy?: string;
}

export type RealmUserMap = Record<string, RealmMembership[]>; // realmId -> memberships
export type RealmAppUserKey = string;
export type RealmAppUsersMap = Record<RealmAppUserKey, string[]>;

export interface RealmRole {
    id: RealmRoleId;
    name: string;        // "Certis Full User"
    description?: string;
    oneFA?: string[];    // optional display
    twoFA?: string[];
}

const REALM_ROLES: RealmRole[] = [
    { id: "admin_user", name: "Admin User" },
    { id: "certis_full_user", name: "Certis Full User" },
    { id: "certis_contractor", name: "Certis Contractor" },
    { id: "certis_half_user", name: "Certis Half User" },
    { id: "external_user", name: "External Users" },
    { id: "local_user", name: "Local User" },
];

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

const InlineSpinner = () => (
    <span
        style={{
            width: 14,
            height: 14,
            border: "2px solid rgba(0,0,0,0.15)",
            borderTop: "2px solid var(--kc-primary)",
            borderRadius: "50%",
            animation: "kc-spin 0.7s linear infinite",
            display: "inline-block",
            marginLeft: 6,
        }}
    />
);
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

const monoStyle: React.CSSProperties = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

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
        mfaRequired: true,
        passwordInheritance: "inherit",
        sessionTimeoutMins: 30,
    },
    {
        id: "realm-fin",
        name: "Finance Realm",
        status: "Inactive",
        createdAt: "2025-12-10T09:00:00.000Z",
        updatedAt: "2025-12-12T09:00:00.000Z",
        userCount: 0,
        mfaRequired: false,
        passwordInheritance: "override",
        sessionTimeoutMins: 60,
    },
    {
        id: "realm-dev",
        name: "Sandbox Realm",
        status: "Draft",
        createdAt: "2025-12-01T09:00:00.000Z",
        updatedAt: "2025-12-01T09:00:00.000Z",
        userCount: 0,
        mfaRequired: true,
        passwordInheritance: "inherit",
        sessionTimeoutMins: 15,
    },
];

const REALM_USERS_INITIAL: RealmUserMap = {
    "realm-ops": [
        { userUuid: "u-5b9f2a2c-1", roleId: "admin_user" },
        { userUuid: "u-5b9f2a2c-2", roleId: "certis_full_user" },
        { userUuid: "u-5b9f2a2c-3", roleId: "certis_contractor" },
    ],
    "realm-fin": [
        { userUuid: "u-5b9f2a2c-4", roleId: "certis_full_user" },
        { userUuid: "u-5b9f2a2c-5", roleId: "certis_contractor" },
    ],
    "realm-dev": [
        { userUuid: "u-5b9f2a2c-2", roleId: "certis_full_user" },
    ],
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
const isValidDate = (d: Date) => !Number.isNaN(d.getTime());

const safeDate = (v: unknown) => {
    if (!v) return null;

    // if already a Date
    if (v instanceof Date) return isValidDate(v) ? v : null;

    // string/number
    const s = String(v).trim();
    if (!s || s === "-") return null;

    const d = new Date(s);
    return isValidDate(d) ? d : null;
};

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
            const dt = safeDate(value);
            if (!dt) return "-";

            return (
                <span className="kc-datetime" title={formatFull(dt)}>
                    {formatAbsolute(dt)}
                    <span className="kc-datetime-sub">{formatRelative(dt)}</span>
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
        render: (_v, row) => (
            <RowActionMenu
                actions={[
                    { label: "View", onClick: () => onView(row) },
                    { label: "Open in new tab", onClick: () => window.open(`/realms/${row.id}`, "_blank") },
                    { label: "Deactivate", danger: true, onClick: () => alert(`Deactivate ${row.name}`) },
                ]}
            />
        ),
    },
];

const createRealmUsersColumns = (
    roles: RealmRole[],
    onChangeRole: (userUuid: string, roleId: RealmRoleId) => void,
    onRemoveFromRealm: (userUuid: string) => void,
    updatingUsers: Set<string>
): TableColumn<RealmUserViewRow>[] => [
        {
            key: "username",
            label: "Username",
            width: "190px",
            render: (value, row) => <LinkCell onClick={() => { }}>{value as string}</LinkCell>,
        },
        {
            key: "firstName",
            label: "Name",
            width: "220px",
            render: (_v, row) => `${row.firstName} ${row.lastName}`,
        },
        {
            key: "email",
            label: "Email",
            width: "260px",
            render: (v) => (v as string) || "-",
        },
        {
            key: "realmRoleId",
            label: "User Type",
            width: "240px",
            sortable: false,
            render: (v, row) => (

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                        className="kc-select"
                        value={(v as string) ?? ""}
                        disabled={updatingUsers.has(row.uuid)}
                        onChange={(e) =>
                            onChangeRole(row.uuid, e.target.value as RealmRoleId)
                        }
                    >
                        <option value="">Select user type</option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>

                    {updatingUsers.has(row.uuid) && <InlineSpinner />}
                </div>
            ),
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
                const dt = safeDate(value);
                if (!dt) return "-";

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
            render: (_v, row) => (
                <button
                    type="button"
                    className="icon-action"
                    onClick={(e) => {
                        e.stopPropagation();
                        const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || row.username || row.uuid;
                        const ok = window.confirm(`Remove ${name} from this realm?`);
                        if (!ok) return;
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
    roles: RealmRole[],
    defaultRoleId: RealmRoleId | "",
    selectedRoleByUser: Record<string, RealmRoleId | "">,
    setSelectedRoleByUser: React.Dispatch<React.SetStateAction<Record<string, RealmRoleId | "">>>,
    onAddToRealm: (userUuid: string, roleId: RealmRoleId) => void
): TableColumn<UserRow>[] => [
        { key: "username", label: "Username", width: "190px", render: (v) => v as any },
        { key: "firstName", label: "Name", width: "220px", render: (_v, row) => `${row.firstName} ${row.lastName}` },
        { key: "email", label: "Email", width: "260px", render: (v) => (v as string) || "-" },
        {
            key: "role",
            label: "User Type",
            width: "260px",
            sortable: false,
            render: (_v, row) => {
                const value = selectedRoleByUser[row.uuid] ?? defaultRoleId ?? "";
                return (
                    <select
                        className="kc-select"
                        value={value}
                        onChange={(e) => {
                            setSelectedRoleByUser((prev) => ({ ...prev, [row.uuid]: e.target.value as RealmRoleId }));
                        }}
                        title="Select user type"
                    >
                        <option value="">Select user type</option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                );
            },
        },
        {
            key: "status",
            label: "Status",
            width: "130px",
            align: "center",
            render: (v) => <Badge variant={userStatusVariant(v as UserStatus)}>{v as string}</Badge>,
        },
        {
            key: "actions",
            label: "Actions",
            width: "140px",
            align: "center",
            sortable: false,
            render: (_v, row) => {
                const roleId = selectedRoleByUser[row.uuid] ?? defaultRoleId ?? "";
                const disabled = !roleId;
                return (
                    <button
                        type="button"
                        className="kc-btn kc-btn-cell is-primary"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!roleId) return;
                            onAddToRealm(row.uuid, roleId as RealmRoleId);

                            // clean up selection after adding (optional)
                            setSelectedRoleByUser((prev) => {
                                const next = { ...prev };
                                delete next[row.uuid];
                                return next;
                            });
                        }}
                        title={disabled ? "Select a user type first" : "Add to realm"}
                    >
                        <Plus size={16} /> Add
                    </button>
                );
            },
        },
    ];

const createAppColumns = (
    onViewApp?: (app: AppRow) => void
): TableColumn<any>[] => [
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
                        onViewApp?.(row);
                    }}
                    title="View"
                >
                    <Eye size={16} />
                </button>
            ),
        },
    ];

const ConfirmDialog: React.FC<{
    state: ConfirmState;
    onClose: () => void;
}> = ({ state, onClose }) => {
    if (!state.open) return null;

    const onConfirm = () => {
        state.onConfirm?.();
        onClose();
    };

    return (
        <div
            className="kc-confirmOverlay"
            role="dialog"
            aria-modal="true"
            aria-label={state.title}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
                if (e.key === "Enter") onConfirm();
            }}
            tabIndex={-1}
        >
            <div className="kc-confirmModal">
                <div className="kc-confirmHeader">
                    <div className="kc-confirmTitle">{state.title}</div>
                </div>

                {state.message && <div className="kc-confirmBody">{state.message}</div>}

                <div className="kc-confirmFooter">
                    <button type="button" className="kc-btn kc-btn-ghost" onClick={onClose}>
                        {state.cancelText ?? "Cancel"}
                    </button>

                    <button
                        type="button"
                        className={`kc-btn ${state.danger ? "kc-btn-danger" : "kc-btn-primary"}`}
                        onClick={onConfirm}
                    >
                        {state.confirmText ?? "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const createAppAccessUsersColumns = (onRemove: (uuid: string) => void): TableColumn<any>[] => [
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
                onClick={(e) => {
                    e.stopPropagation();
                    const name = row.username || row.email || row.uuid;
                    const ok = window.confirm(`Revoke access for ${name}?`);
                    if (!ok) return;
                    onRemove(row.uuid);
                }}
                style={{ color: "#dc2626" }}
            >
                <Trash2 size={16} />
            </button>
        ),
    },
];

const createGrantAccessColumns = (onAdd: (uuid: string) => void): TableColumn<any>[] => [
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
                className="kc-btn kc-btn-cell is-primary"
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
type UserFilter = "all" | "active" | "pending" | "inactive";

const RealmDetailContent: React.FC<{
    realm: RealmRow;
    allUsers: UserRow[];
    realmMemberships: RealmMembership[];
    roles: RealmRole[];
    appsInRealm: AppRow[];

    appUsers: RealmAppUsersMap;
    onGrantAppUser: (appId: string, userUuid: string) => void;
    onRevokeAppUser: (appId: string, userUuid: string) => void;

    onBack?: () => void;
    onRemoveUser: (userUuid: string) => void;
    onAddUser: (userUuid: string, roleId: RealmRoleId) => void;
    onCreateUser: (newUser: UserRow) => void;
    onUpdateRealm: (patch: Partial<RealmRow>) => void;
}> = ({ realm, allUsers, realmMemberships, roles, appsInRealm, appUsers, onRevokeAppUser, onGrantAppUser, onBack, onRemoveUser, onAddUser, onCreateUser, onUpdateRealm }) => {
    const [tab, setTab] = useState<RealmDetailTab>("users");
    const [query, setQuery] = useState("");

    const [defaultRoleId, setDefaultRoleId] = useState<RealmRoleId | "">("");
    const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, RealmRoleId | "">>({});
    const [showManage, setShowManage] = useState(false);

    const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());

    const markUpdating = (uuid: string, isUpdating: boolean) => {
        setUpdatingUsers((prev) => {
            const next = new Set(prev);
            if (isUpdating) next.add(uuid);
            else next.delete(uuid);
            return next;
        });
    };

    const [draft, setDraft] = useState(() => ({
        status: realm.status,
        mfaRequired: realm.mfaRequired ?? true,
        passwordInheritance: realm.passwordInheritance ?? "inherit",
        sessionTimeoutMins: realm.sessionTimeoutMins ?? 30,
    }));

    const [confirm, setConfirm] = useState<ConfirmState>({
        open: false,
        title: "",
    });

    const openConfirm = (next: Omit<ConfirmState, "open">) => {
        setConfirm({ open: true, ...next });
    };

    const closeConfirm = () => setConfirm((p) => ({ ...p, open: false }));

    const toastGuardRef = useRef<Record<string, number>>({});



    const handleChangeRole = useCallback(
        async (userUuid: string, roleId: RealmRoleId) => {
            markUpdating(userUuid, true);

            try {
                // simulate API latency (remove later)
                await new Promise((r) => setTimeout(r, 450));

                onAddUser(userUuid, roleId); // upsert
            } finally {
                markUpdating(userUuid, false);
            }
        },
        [onAddUser]
    );

    const membershipMap = useMemo(() => {
        return new Map((realmMemberships ?? []).map((m) => [m.userUuid, m.roleId]));
    }, [realmMemberships]);

    const usersInRealm = useMemo<RealmUserViewRow[]>(() => {
        const safeUsers = Array.isArray(allUsers) ? allUsers : [];
        return safeUsers
            .filter((u) => membershipMap.has(u.uuid) && !u.isDeleted)
            .map((u) => ({
                ...u,
                realmRoleId: membershipMap.get(u.uuid)!,
            }));
    }, [allUsers, membershipMap]);

    const [userFilter, setUserFilter] = useState<UserFilter>("all");

    const filteredUsersInRealm = useMemo<RealmUserViewRow[]>(() => {
        const list = usersInRealm ?? [];
        if (userFilter === "all") return list;
        if (userFilter === "active") return list.filter((u) => u.status === "Active");
        if (userFilter === "pending") return list.filter((u) => u.status === "Pending");
        return list.filter((u) => u.status === "Inactive");
    }, [usersInRealm, userFilter]);

    const stats = useMemo(() => {
        const list = usersInRealm ?? [];
        const active = list.filter(u => u.status === "Active").length;
        const pending = list.filter(u => u.status === "Pending").length;
        const inactive = list.filter(u => u.status === "Inactive").length;
        return { total: list.length, active, pending, inactive };
    }, [usersInRealm]);


    const userColumns = useMemo(
        () =>
            createRealmUsersColumns(roles, handleChangeRole, (uuid) => {
                const u = usersInRealm.find((x) => x.uuid === uuid);
                const name = u ? `${u.firstName} ${u.lastName}`.trim() : uuid;

                openConfirm({
                    title: "Remove user from realm?",
                    message: `This will remove ${name} from ${realm.name}.`,
                    confirmText: "Remove",
                    cancelText: "Cancel",
                    danger: true,
                    onConfirm: () => onRemoveUser(uuid),
                });
            }, updatingUsers),
        // include usersInRealm/realm.name so it can build the message
        [roles, handleChangeRole, onRemoveUser, usersInRealm, realm.name, updatingUsers]
    );

    const addColumns = useMemo(
        () =>
            createAddUserColumns(
                roles,
                defaultRoleId,
                selectedRoleByUser,
                setSelectedRoleByUser,
                onAddUser
            ),
        [roles, defaultRoleId, selectedRoleByUser, onAddUser]
    );

    // Create user form
    const [form, setForm] = useState({
        staffId: "",
        username: "",
        email: "",
        firstName: "",
        lastName: "",
    });
    // const addColumns = useMemo(() => createAddUserColumns((uuid) => onAddUser(uuid, "user")), [onAddUser]);

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

    const roleNameById = useMemo(() => {
        const m = new Map<string, string>();
        (roles ?? []).forEach((r) => m.set(r.id, r.name));
        return m;
    }, [roles]);

    const realmUserSet = useMemo(() => new Set(realmMemberships?.map(m => m.userUuid)), [realmMemberships]);

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

    const eligibleFilteredToBulkAdd = useMemo(() => {
        return availableUsersToAdd.filter((u) => {
            const roleId = selectedRoleByUser[u.uuid] ?? defaultRoleId ?? "";
            return Boolean(roleId);
        });
    }, [availableUsersToAdd, selectedRoleByUser, defaultRoleId]);

    const handleBulkAddFiltered = useCallback(() => {
        // Add all users currently visible by filter who have a role selected (or default role)
        for (const u of eligibleFilteredToBulkAdd) {
            const roleId = selectedRoleByUser[u.uuid] ?? defaultRoleId ?? "";
            if (!roleId) continue;
            onAddUser(u.uuid, roleId as RealmRoleId);
        }

        // optional cleanup
        setSelectedRoleByUser({});
    }, [eligibleFilteredToBulkAdd, selectedRoleByUser, defaultRoleId, onAddUser, setSelectedRoleByUser]);

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

        const roleIdToUse = defaultRoleId || "certis_full_user"; // pick your default
        onAddUser(newUser.uuid, roleIdToUse as RealmRoleId);

        setTab("users");
        setForm({ staffId: "", username: "", email: "", firstName: "", lastName: "" });
    };

    const [showAddUsers, setShowAddUsers] = useState(false);

    useEffect(() => {
        if (!showAddUsers) return;
        if (!defaultRoleId) return;

        setSelectedRoleByUser((prev) => {
            const next = { ...prev };
            // auto-fill only for users visible in current filtered list
            for (const u of availableUsersToAdd) {
                if (!next[u.uuid]) next[u.uuid] = defaultRoleId;
            }
            return next;
        });
    }, [showAddUsers, defaultRoleId, availableUsersToAdd]);

    useEffect(() => {
        if (!showManage) return;
        setDraft({
            status: realm.status,
            mfaRequired: realm.mfaRequired ?? true,
            passwordInheritance: realm.passwordInheritance ?? "inherit",
            sessionTimeoutMins: realm.sessionTimeoutMins ?? 30,
        });
    }, [showManage, realm]);

    return (
        <>
            <ConfirmDialog state={confirm} onClose={closeConfirm} />
            <div style={{ padding: "0.75rem" }}>
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
                        <button
                            className="kc-btn kc-btn-primary"
                            onClick={() => setShowManage(true)}
                        >
                            <Shield size={16} />
                            Manage
                        </button>
                    </div>
                </div>

                {/* Inner tabs */}
                <div className="realm-tabs" style={{ display: "flex", gap: 18, borderBottom: "1px solid var(--kc-border-subtle)", marginBottom: 12 }}>
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

                {tab === "users" && (
                    <div className="tab-table-container" style={{ position: "relative" }}>
                        <div className="table-card kc_realmCard" style={{ flex: 1 }}>
                            {/* Header */}
                            <div className="kc_realmCardHeader">
                                <div className="kc_realmCardHeaderTop">
                                    <div>
                                        <div className="kc-text-title">Users in Realm</div>

                                        <div className="kc_userStats">
                                            <span className="kc_stat">Total <b>{stats.total}</b></span>
                                            <span className="kc_stat">Active <b>{stats.active}</b></span>
                                            <span className="kc_stat">Pending <b>{stats.pending}</b></span>
                                            <span className="kc_stat">Inactive <b>{stats.inactive}</b></span>
                                        </div>
                                    </div>

                                    <button
                                        className="kc-btn kc-btn-primary"
                                        onClick={() =>
                                            setShowAddUsers((s) => {
                                                const next = !s;
                                                if (next) {
                                                    setQuery("");
                                                    setDefaultRoleId("");
                                                    setSelectedRoleByUser({});
                                                }
                                                return next;
                                            })
                                        }
                                    >
                                        <Plus size={16} /> {showAddUsers ? "Close" : "Add users"}
                                    </button>
                                </div>

                                <div className="kc_chipRow">
                                    {([
                                        { id: "all", label: `All (${stats.total})` },
                                        { id: "active", label: `Active (${stats.active})` },
                                        { id: "pending", label: `Pending (${stats.pending})` },
                                        { id: "inactive", label: `Inactive (${stats.inactive})` },
                                    ] as const).map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            className={`kc_chip ${userFilter === c.id ? "is-active" : ""}`}
                                            onClick={() => setUserFilter(c.id)}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="kc_realmCardBody">
                                <DataTable2<RealmUserViewRow>
                                    data={filteredUsersInRealm}
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

                                <div className={`kc_accordion ${showAddUsers ? "is-open" : ""}`}>
                                    <div className="kc_accordionInner">
                                        <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
                                            {/* Panel header */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    justifyContent: "space-between",
                                                    gap: 12,
                                                    flexWrap: "wrap",
                                                    marginBottom: 12,
                                                }}
                                            >
                                                <div>
                                                    <div className="kc-text-title">Add existing users</div>
                                                    <div className="kc-text-subtitle kc-text-muted" style={{ marginTop: 2 }}>
                                                        Search and assign a user type, then add them to this realm.
                                                    </div>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                                    <span style={{ fontSize: "0.875rem", color: "var(--kc-text-muted,#64748b)", fontWeight: 700 }}>
                                                        Default user type
                                                    </span>

                                                    <select
                                                        className="kc-select"
                                                        value={defaultRoleId}
                                                        onChange={(e) => setDefaultRoleId(e.target.value as RealmRoleId)}
                                                        style={{ minWidth: 220 }}
                                                        title="Auto-fill role for users you add"
                                                    >
                                                        <option value="">None</option>
                                                        {(roles ?? []).map((r) => (
                                                            <option key={r.id} value={r.id}>
                                                                {r.name}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <button
                                                        type="button"
                                                        className="kc-btn kc-btn-ghost"
                                                        onClick={() => setSelectedRoleByUser({})}
                                                        title="Clear role selections"
                                                    >
                                                        Clear selections
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="kc-btn kc-btn-primary"
                                                        disabled={eligibleFilteredToBulkAdd.length === 0}
                                                        onClick={handleBulkAddFiltered}
                                                        title={
                                                            eligibleFilteredToBulkAdd.length === 0
                                                                ? "Select a role (or set Default user type) for at least one filtered user"
                                                                : `Add ${eligibleFilteredToBulkAdd.length} filtered users`
                                                        }
                                                    >
                                                        <Plus size={16} /> Add filtered ({eligibleFilteredToBulkAdd.length})
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Search box */}
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

                                            {/* Add-users table */}
                                            <DataTable2<UserRow>
                                                data={availableUsersToAdd}
                                                columns={addColumns}
                                                keyField="uuid"
                                                paginated
                                                pageSize={10}
                                                pageSizeOptions={[10, 25, 50]}
                                                striped
                                                hoverable
                                                searchable={false}
                                                stickyHeader
                                                emptyMessage="No available users to add"
                                                minHeight="320px"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div></div>
                )}

                {tab === "applications" && (
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
                                    minHeight="360px" />
                            </div>
                        )}
                    </>
                )}
            </div>
            {showManage && (
                <div
                    className="kc-confirmOverlay"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setShowManage(false);
                    }}
                >
                    <div className="kc-confirmModal" style={{ maxWidth: 720 }}>
                        <div className="kc-confirmHeader" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div>
                                <div className="kc-confirmTitle">Manage Realm</div>
                                <div className="kc-text-subtitle kc-text-muted" style={{ marginTop: 4 }}>
                                    {realm.name} • Security controls and lifecycle settings
                                </div>
                            </div>

                            <button className="kc-btn kc-btn-ghost" onClick={() => setShowManage(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="kc-confirmBody" style={{ display: "grid", gap: 14 }}>
                            {/* Status */}
                            <div style={{ display: "grid", gap: 8 }}>
                                <div style={{ fontWeight: 900 }}>Realm Status</div>
                                <select
                                    className="kc-select"
                                    value={draft.status}
                                    onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as RealmStatus }))}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            {/* MFA */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "0.9rem",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 14,
                                    background: "#fff",
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 900 }}>Require MFA</div>
                                    <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
                                        Enforce MFA for users accessing applications in this realm.
                                    </div>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={draft.mfaRequired}
                                    onChange={(e) => setDraft((p) => ({ ...p, mfaRequired: e.target.checked }))}
                                    style={{ width: 18, height: 18 }}
                                />
                            </div>

                            {/* Password inheritance */}
                            <div style={{ display: "grid", gap: 8 }}>
                                <div style={{ fontWeight: 900 }}>Password Policy</div>
                                <select
                                    className="kc-select"
                                    value={draft.passwordInheritance}
                                    onChange={(e) =>
                                        setDraft((p) => ({ ...p, passwordInheritance: e.target.value as "inherit" | "override" }))
                                    }
                                >
                                    <option value="inherit">Inherit from global policy</option>
                                    <option value="override">Override for this realm</option>
                                </select>
                            </div>

                            {/* Session timeout */}
                            <div style={{ display: "grid", gap: 8 }}>
                                <div style={{ fontWeight: 900 }}>Session Timeout (minutes)</div>
                                <input
                                    className="kc-input"
                                    type="number"
                                    min={5}
                                    max={240}
                                    value={draft.sessionTimeoutMins}
                                    onChange={(e) => setDraft((p) => ({ ...p, sessionTimeoutMins: Number(e.target.value) }))}
                                />
                                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
                                    Recommended: 15–60 minutes.
                                </div>
                            </div>

                            <div style={{ height: 1, background: "#e5e7eb", margin: "0.5rem 0" }} />

                            {/* Danger zone */}
                            <div style={{ display: "grid", gap: 10 }}>
                                <div style={{ fontWeight: 900, color: "#b91c1c" }}>Danger Zone</div>
                                <button
                                    className="kc-btn kc-btn-danger"
                                    onClick={() => {
                                        openConfirm({
                                            title: "Deactivate realm?",
                                            message: "This will set the realm to Inactive. Users may lose access to applications.",
                                            confirmText: "Deactivate",
                                            cancelText: "Cancel",
                                            danger: true,
                                            onConfirm: () => {
                                                onUpdateRealm({ status: "Inactive" });
                                                setShowManage(false);
                                            },
                                        });
                                    }}
                                >
                                    Deactivate Realm
                                </button>
                            </div>
                        </div>

                        <div className="kc-confirmFooter" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <button className="kc-btn kc-btn-ghost" onClick={() => setShowManage(false)}>
                                Cancel
                            </button>

                            <button
                                className="kc-btn kc-btn-primary"
                                onClick={() => {
                                    onUpdateRealm({
                                        status: draft.status,
                                        mfaRequired: draft.mfaRequired,
                                        passwordInheritance: draft.passwordInheritance,
                                        sessionTimeoutMins: draft.sessionTimeoutMins,
                                    });
                                    setShowManage(false);
                                }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ============================================================================
// TABS
// ============================================================================

// ============================================================================
// TABS
// ============================================================================

const DEFAULT_TABS: Tab[] = [{ id: "realms", title: "Realms", type: "realms", closable: false }];

const RealmsContent: React.FC<{
    realms: RealmRow[];
    loading: boolean;
    error: string | null;
    onRowClick: (realm: RealmRow) => void;

    realmStatusFilter: RealmStatus[];
    setRealmStatusFilter: (v: RealmStatus[]) => void;
    onRefresh?: () => void;
}> = ({ realms, loading, error, onRowClick, realmStatusFilter, setRealmStatusFilter, onRefresh }) => {
    const columns = useMemo(() => createRealmColumns(onRowClick), [onRowClick]);

    const filterLabel = useMemo(() => {
        if (!realmStatusFilter.length) return "All";
        return realmStatusFilter.join(", ");
    }, [realmStatusFilter]);

    return (
        <div className="tab-table-container">
            <div className="tab-table-main">
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
                        onRefresh={onRefresh}
                        toolbarFilters={{
                            left: (
                                <div className="kc_toolbarFilters">
                                    <MultiSelectCheckbox<RealmStatus>
                                        inline
                                        label="Status"
                                        options={[
                                            { value: "Active", label: "Active" },
                                            { value: "Inactive", label: "Inactive" },
                                            { value: "Draft", label: "Draft" },
                                        ]}
                                        value={realmStatusFilter}
                                        onChange={setRealmStatusFilter}
                                        placeholder="All"
                                        portal
                                    />

                                    {realmStatusFilter.length > 0 && (
                                        <>
                                            <span className="kc_filterBadge" title={`Status: ${filterLabel}`}>
                                                Status: {filterLabel}
                                            </span>

                                            <button
                                                type="button"
                                                className="kc_btn kc_btn_icon"
                                                title="Clear filters"
                                                onClick={() => setRealmStatusFilter([])}
                                                aria-label="Clear filters"
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ),
                            right: null,
                        }}
                        paginated
                        pageSize={10}
                        pageSizeOptions={[10, 25, 50, 100]}
                        striped
                        hoverable
                        stickyHeader
                        emptyMessage="No realms found"
                        minHeight="100%"
                    />
                </div>
            </div>
        </div>
    );
};
// ============================================================================
// MAIN PAGE
// ============================================================================

const RealmsPage: React.FC = () => {
    const [users, setUsers] = useState<UserRow[]>(USERS_DATA);
    const [realms, setRealms] = useState<RealmRow[]>(REALMS_DATA);
    const [apps] = useState<AppRow[]>(APPS_DATA);

    const location = useLocation();

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [realmStatusFilter, setRealmStatusFilter] = useState<RealmStatus[]>([]);

    const filteredRealms = useMemo(() => {
        const safe = Array.isArray(realms) ? realms : [];
        if (realmStatusFilter.length === 0) return safe; // All
        return safe.filter((r) => realmStatusFilter.includes(r.status as RealmStatus));
    }, [realms, realmStatusFilter]);

    const [realmUsers, setRealmUsers] = useState<RealmUserMap>(REALM_USERS_INITIAL);
    const [realmApps] = useState<RealmAppMap>(REALM_APPS_INITIAL);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { tabs, activeTab, setActiveTab, addTab, closeTab, reorderTabs } = useTabs({
        storageKey: "admin-realms-tabs",
        defaultTabs: DEFAULT_TABS,
    });

    const TOAST_TTL_MS = 2600;        // how long it stays visible
    const TOAST_EXIT_MS = 220;        // must match CSS animation duration

    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const toastGuardRef = useRef<Record<string, number>>({});
    const { setTotalUsers, setTotalRealms, setTotalApps } = useData();
    const [realmAppUsers, setRealmAppUsers] = useState<RealmAppUsersMap>(REALM_APP_USERS_INITIAL);

    useEffect(() => setTotalUsers(users), [users, setTotalUsers]);
    useEffect(() => setTotalRealms(realms), [realms, setTotalRealms]);
    useEffect(() => setTotalApps(apps), [apps, setTotalApps]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const raw = params.get("status"); // e.g. "Inactive,Draft"
        if (!raw) {
            setRealmStatusFilter([]);
            return;
        }

        const parts = raw.split(",").map(s => s.trim());
        const allowed: RealmStatus[] = ["Active", "Inactive", "Draft"];

        const next = parts.filter((p): p is RealmStatus => allowed.includes(p as RealmStatus));
        setRealmStatusFilter(next);

        if (next.length > 0) {
            setIsFilterOpen(true);

            // jump back to realms tab
            const idx = tabs.findIndex(t => t.type === "realms");
            if (idx !== -1) setActiveTab(idx);
        }
    }, [location.search, tabs, setActiveTab]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);

        if (realmStatusFilter.length === 0) params.delete("status");
        else params.set("status", realmStatusFilter.join(","));

        const next = params.toString();
        const current = location.search.replace(/^\?/, "");

        if (next !== current) {
            window.history.replaceState(
                null,
                "",
                next ? `${location.pathname}?${next}` : location.pathname
            );
        }
    }, [realmStatusFilter, location.pathname, location.search]);
    const pushToast = useCallback((message: string, type: ToastType = "info") => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        setToasts((prev) => [{ id, message, type }, ...prev].slice(0, 3));

        window.setTimeout(() => {
            setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
            window.setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, TOAST_EXIT_MS);
        }, TOAST_TTL_MS);

        return id;
    }, []);

    const guardedToast = useCallback(
        (key: string, message: string, type: ToastType = "success") => {
            const now = Date.now();
            const last = toastGuardRef.current[key] ?? 0;
            if (now - last < 800) return;
            toastGuardRef.current[key] = now;
            pushToast(message, type);
        },
        [pushToast]
    );

    const grantUserToApp = useCallback((realmId: string, appId: string, userUuid: string) => {
        const key = `${realmId}::${appId}`;
        setRealmAppUsers(prev => {
            const next = { ...(prev ?? {}) };
            const set = new Set(next[key] ?? []);
            set.add(userUuid);
            next[key] = Array.from(set);
            return next;
        });
        pushToast("Access granted to application", "success");
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
        pushToast("Access revoked from application", "info");
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
    useEffect(() => {
        syncRealmUserCounts(realmUsers);
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
                next[realmId] = (next[realmId] ?? []).filter((m) => m.userUuid !== userUuid);
                queueMicrotask(() => syncRealmUserCounts(next));
                pushToast("User removed from realm", "success");
                return next;
            });
        },
        [syncRealmUserCounts]
    );

    const addUserToRealm = useCallback(
        (realmId: string, userUuid: string, roleId: RealmRoleId) => {
            setRealmUsers((prev) => {
                const next: RealmUserMap = { ...(prev ?? {}) };
                const list = next[realmId] ?? [];

                const exists = list.some((m) => m.userUuid === userUuid);

                next[realmId] = exists
                    ? list.map((m) =>
                        m.userUuid === userUuid ? { ...m, roleId } : m
                    )
                    : [...list, { userUuid, roleId }];

                queueMicrotask(() => syncRealmUserCounts(next));

                if (exists) {
                    guardedToast(
                        `role:${realmId}:${userUuid}:${roleId}`,
                        "User role updated",
                        "info"
                    );
                } else {
                    guardedToast(
                        `add:${realmId}:${userUuid}`,
                        "User added to realm",
                        "success"
                    );
                }
                return next;
            });
        },
        [syncRealmUserCounts]
    );

    const createUser = useCallback((newUser: UserRow) => {
        setUsers((prev) => [newUser, ...(prev ?? [])]);
    }, []);

    const updateRealm = useCallback((realmId: string, patch: Partial<RealmRow>) => {
        setRealms((prev) =>
            prev.map((r) =>
                r.id === realmId
                    ? {
                        ...r,
                        ...patch,
                        updatedAt: new Date().toISOString(),
                    }
                    : r
            )
        );
    }, []);

    const renderTabContent = useCallback(
        (tab: Tab) => {
            switch (tab.type) {
                case "realms":
                    return (
                        <RealmsContent
                            realms={filteredRealms}
                            loading={loading}
                            error={error}
                            onRowClick={handleRealmRowClick}
                            realmStatusFilter={realmStatusFilter}
                            setRealmStatusFilter={setRealmStatusFilter}
                            onRefresh={handleRefresh}
                        />
                    );
                case "realm-detail": {
                    const realm = tab.content as RealmRow;
                    const realmMemberships = (realmUsers?.[realm.id] ?? []) as RealmMembership[];
                    const appIds = (realmApps?.[realm.id] ?? []) as string[];
                    const appSet = new Set(appIds);
                    const appsInRealm = (Array.isArray(apps) ? apps : []).filter((a) => appSet.has(a.id));
                    return (
                        <RealmDetailContent
                            realm={realm}
                            allUsers={Array.isArray(users) ? users : []}
                            appsInRealm={appsInRealm}
                            onBack={backToRealms}
                            realmMemberships={realmMemberships}
                            roles={REALM_ROLES}
                            onAddUser={(uuid, roleId) => addUserToRealm(realm.id, uuid, roleId)}
                            onRemoveUser={(uuid) => removeUserFromRealm(realm.id, uuid)}
                            onCreateUser={(u) => createUser(u)}
                            appUsers={realmAppUsers}
                            onGrantAppUser={(appId, userUuid) => grantUserToApp(realm.id, appId, userUuid)}
                            onRevokeAppUser={(appId, userUuid) => revokeUserFromApp(realm.id, appId, userUuid)}
                            onUpdateRealm={updateRealm}
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
            filteredRealms,
            isFilterOpen,
            realmStatusFilter,
            setRealmStatusFilter,

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
            updateRealm,
        ]
    );

    return (
        <><ToastStack
            items={toasts}
            onClose={(id) => {
                // immediate exit animation then remove
                setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
                window.setTimeout(() => {
                    setToasts((prev) => prev.filter((t) => t.id !== id));
                }, TOAST_EXIT_MS);
            }} /><div className="admin-organization-page-wrapper" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div className="admin-organization-tab-wrapper" style={{ flex: 1, minHeight: 0 }}>
                    <TabPanel
                        tabs={tabs}
                        activeTab={activeTab}
                        onSelect={setActiveTab}
                        onAdd={() => { }}
                        onClose={closeTab}
                        onReorder={reorderTabs}
                        showActions={false}
                        addButtonLabel=""
                        renderContent={renderTabContent}
                        minHeight="100%"
                    />
                </div>
            </div></>
    );
};

export default RealmsPage;

const ApplicationDetailContent: React.FC<{
    app: AppRow;
    onBack: () => void;
    realmUsers: UserRow[];
    appUserUuids: string[];
    onGrantUser: (userUuid: string) => void;
    onRevokeUser: (userUuid: string) => void;
    showGrant: boolean;
    setShowGrant: React.Dispatch<React.SetStateAction<boolean>>;
    grantQuery: string;
    setGrantQuery: React.Dispatch<React.SetStateAction<string>>;
    showSecret: boolean;
    setShowSecret: React.Dispatch<React.SetStateAction<boolean>>;
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
                        {(app.clientScopes ?? []).length ? (
                            app.clientScopes.map((s) => (
                                <span key={s} className="pill pill-info">{s}</span>
                            ))
                        ) : (
                            <span style={{ color: "#6b7280" }}>—</span>
                        )}
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