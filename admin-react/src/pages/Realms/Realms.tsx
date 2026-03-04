import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import TabPanel from "../../components/common/tabs/TabPanel";
import DataTable, { TableColumn } from "../../components/common/DataTable";
import { useTabs, Tab } from "../../hooks/useTabs";
import { useLocation, useNavigate } from "react-router-dom";

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
    X,
    AlertCircle,
} from "lucide-react";

import "../../styles/browserTabs.css";
import "../../styles/component.css";
import { Badge, LinkCell } from "../../components/common/Badge";
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
type UserPanelMode = "closed" | "add-users" | "create-local-user";

type ConfirmState = {
    open: boolean;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm?: () => void;
};

type RealmUserViewRow = UserRow & {
    roleId?: RealmRoleId | ""
};

export type RealmRoleId = string;

export type RealmAppMap = Record<string, string[]>;

type UserForm = {
    username: string;
    staffId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    organization: string;
    department: string;
    staffType: string;
    group: string;
    roleId: RealmRoleId | "";
    status: UserStatus; // or "Active" | "Inactive" | "Pending"
};

export interface RealmUserRow {
    id: number; // PK of realm_user
    realmId: string;
    userId: number;
}

export interface RealmMembership {
    userUuid: string;
    roleId?: RealmRoleId;
    assignedAt?: string;
    assignedBy?: string;
}

export type RealmUserMap = Record<string, RealmMembership[]>; // realmId -> memberships
export type RealmAppUserKey = string;
export type RealmAppUsersMap = Record<RealmAppUserKey, string[]>;

export interface RealmRole {
    id: RealmRoleId;
    name: string;
    permissions: string[];
}

const REALM_ROLES: RealmRole[] = [
    { id: "realm_admin", name: "Realm Administrator", permissions: ["realm:read", "realm:write", "realm:delete", "user:read", "user:write", "user:delete", "app:read", "app:write", "app:delete"] },
    { id: "realm_manager", name: "Realm Manager", permissions: ["realm:read", "realm:write", "user:read", "user:write", "app:read", "app:write"] },
    { id: "realm_auditor", name: "Realm Auditor", permissions: ["realm:read", "user:read", "app:read"] },
    { id: "realm_user", name: "Standard User", permissions: ["realm:read", "user:read"] },
    { id: "realm_restricted", name: "Restricted User", permissions: ["realm:read"] },
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
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827", ...(mono ? { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" } : {}) }}>{value}</span>
    </div >
);


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
        { userUuid: "u-5b9f2a2c-1", roleId: "realm_admin", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
        { userUuid: "u-5b9f2a2c-2", roleId: "realm_manager", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
        { userUuid: "u-5b9f2a2c-3", roleId: "realm_user", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
    ],
    "realm-fin": [
        { userUuid: "u-5b9f2a2c-4", roleId: "realm_user", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
        { userUuid: "u-5b9f2a2c-5", roleId: "realm_user", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
    ],
    "realm-dev": [
        { userUuid: "u-5b9f2a2c-2", roleId: "realm_user", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
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

const isTerminated = (u: UserRow) => u.status === "Inactive";

const LockedHint: React.FC<{ text?: string }> = ({ text = "Terminated" }) => (
    <span
        style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "0.2rem 0.5rem",
            borderRadius: 9999,
            fontSize: "0.75rem",
            fontWeight: 800,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            whiteSpace: "nowrap",
        }}
        title="User is inactive/terminated and cannot be assigned"
    >
        <XCircle size={12} /> {text}
    </span>
);

// ============================================================================
// TABLE COLUMNS
// ============================================================================

const createRealmColumns = (onView: (row: RealmRow) => void, onToggleRealm: (row: RealmRow) => void, openConfirmDialog: (next: Omit<ConfirmState, "open">) => void): TableColumn<RealmRow>[] => [
    {
        key: "name",
        label: "Realm",
        width: "200px",
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
        width: "120px",
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
        width: "120px",
        align: "left",
        sortable: false,
        render: (_v, row) => (
            <RowActionMenu
                actions={[
                    { label: "View", onClick: () => onView(row) },
                    {
                        label: row.status === "Active" ? "Deactivate" : "Activate",
                        danger: row.status === "Active",
                        onClick: () => {
                            if (row.status === "Active") {
                                openConfirmDialog({
                                    title: "Deactivate Realm?",
                                    message: "Users will lose access.",
                                    confirmText: "Deactivate",
                                    cancelText: "Cancel",
                                    danger: true,
                                    onConfirm: () => onToggleRealm(row),
                                });
                            } else {
                                onToggleRealm(row);
                            }
                        },
                    },
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
        { key: "username", label: "Username", width: "190px" },
        {
            key: "firstName",
            label: "Name",
            width: "220px",
            render: (_v, row) => `${row.firstName} ${row.lastName}`,
        },
        { key: "email", label: "Email", width: "260px" },
        {
            key: "userType",
            label: "User Type",
            width: "160px",
            sortable: false,
            render: (_v, row) => (
                <Badge variant={row.userType === "local_user" ? "warning" : "info"}>
                    {row.userType ?? "—"}
                </Badge>
            ),
        },
        {
            key: "roleId",
            label: "Realm Role",
            width: "240px",
            sortable: false,
            render: (_v, row) => (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                        className="kc-select"
                        value={row.roleId ?? ""}
                        disabled={updatingUsers.has(row.uuid)}
                        onChange={(e) => onChangeRole(row.uuid, e.target.value as RealmRoleId)}
                    >
                        <option value="">Select role</option>
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
            key: "uuid",
            label: "Actions",
            width: "90px",
            align: "center",
            sortable: false,
            render: (_v, row) => (
                <button
                    type="button"
                    className="icon-action"
                    onClick={() => onRemoveFromRealm(row.uuid)}
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
    onAddToRealm: (userUuid: string, roleId: RealmRoleId) => void,
    roleCounts: Record<string, number>,
    closePanel: () => void
): TableColumn<UserRow>[] => [
        { key: "username", label: "Username", width: "190px", render: (v) => v as any },
        { key: "firstName", label: "Name", width: "220px", render: (_v, row) => `${row.firstName} ${row.lastName}` },
        { key: "email", label: "Email", width: "260px", render: (v) => (v as string) || "-" },
        {
            key: "role",
            label: "Role",
            width: "260px",
            sortable: false,
            render: (_v, row) => {
                const value = selectedRoleByUser[row.uuid] ?? defaultRoleId ?? "";
                const disabled = isTerminated(row);
                // const ok = onAddToRealm(row.uuid, roleId as RealmRoleId);
                // if (!ok) return;
                // onSuccess?.();
                return (
                    <select
                        className="kc-select"
                        value={value}
                        disabled={disabled}
                        onChange={(e) => {
                            setSelectedRoleByUser((prev) => ({ ...prev, [row.uuid]: e.target.value as RealmRoleId }));
                        }}
                        title={disabled ? "User is terminated (inactive)" : "Select role"}
                    >
                        <option value="">Select role</option>
                        {roles.map((r) => {
                            const count = roleCounts?.[r.id] ?? 0;
                            return (
                                <option key={r.id} value={r.id}>
                                    {r.name} ({count})
                                </option>
                            );
                        })}
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
                const terminated = isTerminated(row);
                const disabled = terminated || !roleId;

                if (terminated) {
                    return <LockedHint />
                }

                const title = terminated
                    ? "User is terminated (inactive) and cannot be assigned to a realm"
                    : !roleId
                        ? "Select a role first"
                        : "Add to realm";

                return (
                    <button
                        type="button"
                        className="kc-btn kc-btn-cell is-primary"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (disabled) return;

                            onAddToRealm(row.uuid, roleId as RealmRoleId);

                            const ok = onAddToRealm(row.uuid, roleId as RealmRoleId);
                            if (!ok) return;

                            setSelectedRoleByUser((prev) => {
                                const next = { ...prev };
                                delete next[row.uuid];
                                return next;
                            });

                            closePanel();
                        }}
                        title={!roleId ? "Select a role first" : "Add to realm"}
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
    roleCounts: Record<string, number>;
    appsInRealm: AppRow[];

    appUsers: RealmAppUsersMap;
    onGrantAppUser: (appId: string, userUuid: string) => void;
    onRevokeAppUser: (appId: string, userUuid: string) => void;

    onBack?: () => void;
    onRemoveUser: (userUuid: string) => void;
    onAddUser: (userUuid: string, roleId: RealmRoleId) => void;
    onCreateUser: (newUser: UserRow) => void;
    onUpdateRealm: (patch: Partial<RealmRow>) => void;
    onToast: (message: string, type: "success" | "error" | "warning" | "info") => void;
}> = ({
    realm,
    allUsers,
    realmMemberships,
    roles,
    appsInRealm,
    appUsers,
    onRevokeAppUser,
    onGrantAppUser,
    onBack,
    onRemoveUser,
    onAddUser,
    onCreateUser,
    onUpdateRealm,
    onToast }) => {
        const [tab, setTab] = useState<RealmDetailTab>("users");
        const [query, setQuery] = useState("");
        const [userPanelMode, setUserPanelMode] = useState<UserPanelMode>("closed");

        const [defaultRoleId, setDefaultRoleId] = useState<RealmRoleId | "">("");
        const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, RealmRoleId | "">>({});
        const [showManage, setShowManage] = useState(false);
        const [errors, setErrors] = useState<Partial<Record<keyof UserForm, string>>>({});

        const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());

        const markUpdating = (uuid: string, isUpdating: boolean) => {
            setUpdatingUsers((prev) => {
                const next = new Set(prev);
                if (isUpdating) next.add(uuid);
                else next.delete(uuid);
                return next;
            });
        };

        const [showInactiveInAddList, setShowInactiveInAddList] = useState(false);

        const [draft, setDraft] = useState(() => ({
            status: realm.status,
            mfaRequired: realm.mfaRequired ?? true,
            passwordInheritance: realm.passwordInheritance ?? "inherit",
            sessionTimeoutMins: realm.sessionTimeoutMins ?? 30,
        }));

        const openPanel = useCallback((mode: Exclude<UserPanelMode, "closed">) => {
            setUserPanelMode(mode);

            // optional resets (recommended)
            if (mode === "add-users") {
                setQuery("");
                setDefaultRoleId("");
                setSelectedRoleByUser({});
            } else {
                setFormError(null);
                setErrors({});
            }
        }, []);

        const closePanel = useCallback(() => {
            setUserPanelMode("closed");
            setQuery("");
            setDefaultRoleId("");
            setSelectedRoleByUser({});
        }, []);

        const isDirty =
            draft.status !== realm.status ||
            draft.mfaRequired !== realm.mfaRequired ||
            draft.passwordInheritance !== realm.passwordInheritance ||
            draft.sessionTimeoutMins !== realm.sessionTimeoutMins;

        const handleCloseManage = () => {
            if (isDirty) {
                openConfirm({
                    title: "Discard changes?",
                    message: "You have unsaved changes.",
                    confirmText: "Discard",
                    cancelText: "Cancel",
                    danger: true,
                    onConfirm: () => setShowManage(false),
                });
                return;
            }

            setShowManage(false);
        };

        const [confirm, setConfirm] = useState<ConfirmState>({
            open: false,
            title: "",
        });

        const openConfirm = (next: Omit<ConfirmState, "open">) => {
            setConfirm({ open: true, ...next });
        };

        const closeConfirm = () => setConfirm((p) => ({ ...p, open: false }));

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

        const usersInRealm = useMemo<RealmUserViewRow[]>(() => {
            const safeUsers = Array.isArray(allUsers) ? allUsers : [];

            return safeUsers
                .filter((u) => !u.isDeleted)
                .map((u) => {
                    const membership = realmMemberships.find(
                        (m) => m.userUuid === u.uuid
                    );

                    if (!membership && !(u.userType === "local_user" && u.localRealmId === realm.id))
                        return null;

                    return {
                        ...u,
                        roleId: membership?.roleId ?? "",
                    };
                })
                .filter(Boolean) as RealmUserViewRow[];
        }, [allUsers, realmMemberships, realm.id]);

        const [userFilter, setUserFilter] = useState<UserFilter>("all");

        const filteredUsersInRealm = useMemo<RealmUserViewRow[]>(() => {
            const list = usersInRealm ?? [];
            if (userFilter === "all") return list;

            return list.filter((u) => {
                if (userFilter === "active") return u.status === "Active";
                if (userFilter === "pending") return u.status === "Pending";
                return u.status === "Inactive";
            });
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
            [roles, usersInRealm, realm.name, updatingUsers, openConfirm, handleChangeRole, onRemoveUser]
        );

        // role count indicator
        const roleCounts = useMemo(() => {
            const counts: Record<string, number> = {};
            for (const m of realmMemberships ?? []) {
                if (m.roleId) {
                    counts[m.roleId] = (counts[m.roleId] ?? 0) + 1;
                }
            }
            return counts;
        }, [realmMemberships]);

        const addColumns = useMemo(
            () =>
                createAddUserColumns(
                    roles,
                    defaultRoleId,
                    selectedRoleByUser,
                    setSelectedRoleByUser,
                    onAddUser,
                    roleCounts,
                    closePanel
                ),
            [roles, defaultRoleId, selectedRoleByUser, onAddUser, roleCounts, closePanel]
        );

        // Create user form
        const [form, setForm] = useState({
            staffId: "",
            username: "",
            email: "",
            firstName: "",
            lastName: "",
            roleId: "",
            group: "",
            staffType: "",
            department: "",
            organization: "",
            phone: "",
            status: "Active",
        });

        const handleInputChange = (field: keyof UserForm, value: string) => {
            setForm(prev => ({ ...prev, [field]: value }));

            if (errors[field]) {
                setErrors(prev => ({ ...prev, [field]: undefined }));
            }
        };

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

        const isActive = draft.status === "Active";

        const realmUserSet = useMemo(() => new Set(realmMemberships?.map(m => m.userUuid)), [realmMemberships]);

        const availableUsersToAdd = useMemo(() => {
            const safeUsers = Array.isArray(allUsers) ? allUsers : [];
            const q = query.trim().toLowerCase();

            return safeUsers
                .filter((u) => !u.isDeleted)
                .filter((u) => !realmUserSet.has(u.uuid))
                .filter((u) => showInactiveInAddList ? true : u.status !== "Inactive")
                .filter((u) => {
                    if (!q) return true;

                    return (
                        u.username.toLowerCase().includes(q) ||
                        u.email.toLowerCase().includes(q) ||
                        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                        (u.staffId ?? "").toLowerCase().includes(q)
                    );
                });
        }, [allUsers, realmUserSet, query, showInactiveInAddList]);

        const eligibleFilteredToBulkAdd = useMemo(() => {
            return availableUsersToAdd.filter((u) => {
                if (isTerminated(u)) return false;
                const roleId = selectedRoleByUser[u.uuid] ?? defaultRoleId ?? "";
                return Boolean(roleId);
            });
        }, [availableUsersToAdd, selectedRoleByUser, defaultRoleId]);

        const handleBulkAddFiltered = useCallback(() => {
            for (const u of eligibleFilteredToBulkAdd) {
                if (isTerminated(u)) continue;
                const roleId = selectedRoleByUser[u.uuid] ?? defaultRoleId ?? "";
                if (!roleId) continue;
                onAddUser(u.uuid, roleId as RealmRoleId);
            }
            setSelectedRoleByUser({});
        }, [eligibleFilteredToBulkAdd, selectedRoleByUser, defaultRoleId, onAddUser, setSelectedRoleByUser]);

        const createLocalUserInRealm = (form: {
            username: string;
            staffId: string;
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            organization: string;
            department: string;
            staffType: string;
            group: string;
            roleId: string;
        },
            roleIdToUse: RealmRoleId
        ) => {
            const username = form.username.trim();
            const email = form.email.trim();
            const firstName = form.firstName.trim();
            const lastName = form.lastName.trim();
            const staffId = form.staffId.trim();
            const phone = form.phone.trim();
            const organization = form.organization.trim();
            const department = form.department.trim();
            const staffType = form.staffType.trim();
            const group = form.group.trim();

            // duplicates check (ignore deleted)
            const safeUsers = Array.isArray(allUsers) ? allUsers : [];
            const exists = safeUsers.some(
                (u) =>
                    !u.isDeleted &&
                    (u.username.toLowerCase() === username.toLowerCase() ||
                        u.email.toLowerCase() === email.toLowerCase())
            );
            if (exists) {
                onToast(`User ${username} already exists`, "error");
                return;
            }

            if (!roleIdToUse) {
                onToast("Please select a ream role", "warning");
                return;
            }

            const newUser: UserRow = {
                uuid: makeUuid(),
                id: Date.now(),
                staffId: staffId || undefined,
                username, email, firstName, lastName,
                status: "Pending",
                isDeleted: false,
                lastLogin: "-",

                userType: "local_user",
                localRealmId: realm.id,
                phone,
                organization,
                department,
                staffType,
                group
            };

            onCreateUser(newUser);
            onAddUser(newUser.uuid, roleIdToUse);
        };

        const searchRef = useRef<HTMLInputElement>(null)

        useEffect(() => {
            if (userPanelMode === "add-users") {
                searchRef.current?.focus();
            }
        }, [userPanelMode])

        useEffect(() => {
            if (!showManage) return;
            setDraft({
                status: realm.status,
                mfaRequired: realm.mfaRequired ?? true,
                passwordInheritance: realm.passwordInheritance ?? "inherit",
                sessionTimeoutMins: realm.sessionTimeoutMins ?? 30,
            });
        }, [showManage, realm]);

        useEffect(() => {
            if (userPanelMode === "closed") return;

            const onKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape") closePanel();
            };

            window.addEventListener("keydown", onKeyDown);
            return () => window.removeEventListener("keydown", onKeyDown);
        }, [userPanelMode, closePanel]);

        const validateCreateLocalUser = () => {
            const next: Partial<Record<keyof UserForm, string>> = {};

            if (!form.staffId.trim()) next.staffId = "Staff Id is required";
            if (!form.username.trim()) next.username = "Username is required";
            if (!form.email.trim()) next.email = "Email is required";
            if (!form.firstName.trim()) next.firstName = "First name is required";
            if (!form.lastName.trim()) next.lastName = "Last name is required";
            if (!form.roleId) next.roleId = "Role is required";
            if (!form.group) next.group = "Group is required";
            if (!form.staffType) next.staffType = "Staff type is required";
            if (!form.department) next.department = "Department is required";
            if (!form.organization) next.organization = "Organization is required";
            if (!form.phone.trim()) next.phone = "Phone number is required";

            // optional: basic email check
            if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
                next.email = "Invalid email format";
            }

            setErrors(next);
            return Object.keys(next).length === 0;
        };

        const canBulkAdd =
            eligibleFilteredToBulkAdd.length > 0 &&
            (defaultRoleId || Object.keys(selectedRoleByUser).length > 0);

        return (
            <>
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
                                        {/* --- Drawer trigger buttons (in your header top row) --- */}
                                        <div style={{ display: "flex", gap: 10 }}>
                                            <button
                                                className="kc-btn kc-btn-primary"
                                                onClick={() => openPanel("add-users")}
                                                disabled={realm.status !== "Active"}
                                                title={realm.status !== "Active" ? "Realm must be Active" : "Add existing users"}
                                            >
                                                <Plus size={16} /> Add users
                                            </button>

                                            <button
                                                className="kc-btn kc-btn-ghost"
                                                onClick={() => openPanel("create-local-user")}
                                                disabled={realm.status !== "Active"}
                                                title={realm.status !== "Active" ? "Realm must be Active" : "Create local user"}
                                            >
                                                <Plus size={16} /> Create local user
                                            </button>
                                        </div>
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
                                    <DataTable<RealmUserViewRow>
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
                                        minHeight="100%"
                                    />
                                    {/* --- Drawer --- */}
                                    {realm.status === "Active" && userPanelMode !== "closed" && (
                                        <div
                                            className="kcDrawerOverlay"
                                            role="presentation"
                                            onMouseDown={(e) => {
                                                // click outside closes
                                                if (e.target === e.currentTarget) closePanel();
                                            }}
                                        >
                                            <aside
                                                className="kcDrawer"
                                                role="dialog"
                                                aria-modal="true"
                                                aria-label={userPanelMode === "add-users" ? "Add users drawer" : "Create local user drawer"}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            >
                                                {/* Drawer header */}
                                                <div className="kcDrawerHeader">
                                                    <div>
                                                        <div className="kcDrawerTitle">
                                                            {userPanelMode === "add-users" ? "Add existing users" : "Create local user"}
                                                        </div>
                                                        <div className="kcDrawerSubtitle">
                                                            {userPanelMode === "add-users"
                                                                ? "Search users, assign role, then add them to this realm."
                                                                : <>Local users belong to <b>{realm.name}</b> only.</>}
                                                        </div>
                                                    </div>

                                                    <button className="kc-btn kc-btn-ghost" onClick={closePanel} aria-label="Close">
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                {/* Segmented switch */}
                                                <div className="kcDrawerSwitch" role="tablist" aria-label="User actions">
                                                    <button
                                                        type="button"
                                                        className={`kcDrawerTab ${userPanelMode === "add-users" ? "is-active" : ""}`}
                                                        onClick={() => openPanel("add-users")}
                                                        role="tab"
                                                        aria-selected={userPanelMode === "add-users"}
                                                    >
                                                        Add users
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={`kcDrawerTab ${userPanelMode === "create-local-user" ? "is-active" : ""}`}
                                                        onClick={() => openPanel("create-local-user")}
                                                        role="tab"
                                                        aria-selected={userPanelMode === "create-local-user"}
                                                    >
                                                        Create local User
                                                    </button>
                                                </div>

                                                {/* Drawer body (scrollable) */}
                                                <div className="kcDrawerBody">
                                                    {userPanelMode === "add-users" && (
                                                        <>
                                                            {/* Controls row */}
                                                            <div className="kcDrawerRow">
                                                                {/* Row A */}
                                                                <div className="kcDrawerRowTop">
                                                                    <label className="kcInlineCheck">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={showInactiveInAddList}
                                                                            onChange={(e) => setShowInactiveInAddList(e.target.checked)}
                                                                        />
                                                                        Show inactive users
                                                                    </label>

                                                                    <div className="kcDefaultRole">
                                                                        <span className="kcDefaultRoleLabel">Default role</span>
                                                                        <select
                                                                            className="kc-select"
                                                                            value={defaultRoleId}
                                                                            onChange={(e) => setDefaultRoleId(e.target.value as RealmRoleId)}
                                                                        >
                                                                            <option value="">None</option>
                                                                            {(roles ?? []).map((r) => (
                                                                                <option key={r.id} value={r.id}>
                                                                                    {r.name} ({roleCounts[r.id] ?? 0})
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Row B */}
                                                                <div className="kcDrawerRowBottom">
                                                                    <button
                                                                        type="button"
                                                                        className="kc-btn kc-btn-ghost"
                                                                        onClick={() => setSelectedRoleByUser({})}
                                                                    >
                                                                        Clear
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="kc-btn kc-btn-primary"
                                                                        disabled={!canBulkAdd}
                                                                        onClick={handleBulkAddFiltered}
                                                                    >
                                                                        <Plus size={16} /> Add filtered ({eligibleFilteredToBulkAdd.length})
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Search */}
                                                            <div style={{ marginTop: 12 }}>
                                                                <input
                                                                    value={query}
                                                                    onChange={(e) => setQuery(e.target.value)}
                                                                    placeholder="Search by username, email, name, staff id..."
                                                                    className="kcDrawerSearch"
                                                                />
                                                            </div>

                                                            {/* Add-users table */}
                                                            <div style={{ marginTop: 12 }}>
                                                                <DataTable<UserRow>
                                                                    data={availableUsersToAdd}
                                                                    rowClassName={(row) => (isTerminated(row) ? "kc-row-locked" : "")}
                                                                    columns={addColumns}
                                                                    keyField="uuid"
                                                                    paginated
                                                                    pageSize={10}
                                                                    pageSizeOptions={[10, 25, 50]}
                                                                    striped
                                                                    hoverable
                                                                    searchable={false}
                                                                    stickyHeader
                                                                    emptyMessage="No users match your search"
                                                                    minHeight="100%"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    {userPanelMode === "create-local-user" && (
                                                        <>
                                                            {/* <div className="kc-text-title">Create local user</div>
                                                            <div className="kc-text-subtitle kc-text-muted" style={{ marginTop: 2 }}>
                                                                Local users belong to <b>{realm.name}</b> only.
                                                            </div> */}

                                                            {formError && (
                                                                <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700, fontSize: 13 }}>
                                                                    {formError}
                                                                </div>
                                                            )}

                                                            <div className="kcDrawerFormGrid">
                                                                {/* Basic Information Section */}
                                                                <div>
                                                                    <div className="kcDrawerSectionTitle">Basic Information</div>
                                                                    <div className="kcDrawerSectionGrid">
                                                                        {/* Username */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Username <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={form.username}
                                                                                onChange={(e) => handleInputChange('username', e.target.value)}
                                                                                placeholder="SG999999"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.username ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.username) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.username) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {errors.username && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.username}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Employee ID */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Staff Id <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={form.staffId}
                                                                                onChange={(e) => handleInputChange('staffId', e.target.value)}
                                                                                placeholder="999999"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.staffId ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.staffId) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.staffId) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {errors.staffId && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.staffId}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* First Name */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                First Name <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={form.firstName}
                                                                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                                                placeholder="Ming Lan"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.firstName ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.firstName) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.firstName) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {errors.firstName && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.firstName}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Last Name */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Last Name <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={form.lastName}
                                                                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                                                placeholder="Tan"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.lastName ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.lastName) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.lastName) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {errors.lastName && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.lastName}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Contact Information Section */}
                                                                <div>
                                                                    <div className="kcDrawerSectionTitle">Contact Information</div>
                                                                    <div className="kcDrawerSectionGrid">
                                                                        {/* Email */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Email Address <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <input
                                                                                type="email"
                                                                                value={form.email}
                                                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                                                placeholder="tan_ming_lan@mycompany.com"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.email ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.email) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.email) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {errors.email && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.email}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Phone */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Phone Number <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <input
                                                                                type="tel"
                                                                                value={form.phone}
                                                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                                                placeholder="+6598989898"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.phone ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.phone) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.phone) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {errors.phone && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.phone}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Organization Information Section */}
                                                                <div>
                                                                    <div className="kcDrawerSectionTitle">Organization Details</div>
                                                                    <div className="kcDrawerSectionGrid">
                                                                        {/* Organization */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Organization <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={form.organization}
                                                                                onChange={(e) => handleInputChange('organization', e.target.value)}
                                                                                placeholder="50395803"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.organization ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.organization) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.organization) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {errors.organization && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.organization}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Department */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Department <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={form.department}
                                                                                onChange={(e) => handleInputChange('department', e.target.value)}
                                                                                placeholder="Tech Planning & Development"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.department ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.department) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.department) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            />
                                                                            {errors.department && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.department}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Staff Type */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Staff Type <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <select
                                                                                value={form.staffType}
                                                                                onChange={(e) => handleInputChange('staffType', e.target.value)}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.staffType ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.staffType) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.staffType) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <option value="">Select staff type</option>
                                                                                <option value="O0001">O0001 - Office</option>
                                                                                <option value="M0001">M0001 - frontline</option>
                                                                                <option value="D0001">D0001 - frontline</option>
                                                                                <option value="T0001">_Test - frontlineTest/training accounts</option>
                                                                            </select>
                                                                            {errors.staffType && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.staffType}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Group */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Group <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <select
                                                                                value={form.group}
                                                                                onChange={(e) => handleInputChange('group', e.target.value)}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.group ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.group) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.group) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <option value="">Select group</option>
                                                                                <option value="SG">Singapore</option>
                                                                                <option value="MY">Malaysia</option>
                                                                                <option value="ID">Indonesia</option>
                                                                                <option value="TH">Thailand</option>
                                                                            </select>
                                                                            {errors.group && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.group}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* User Type and Realm Information Section */}
                                                                <div>
                                                                    <div className="kcDrawerSectionTitle">User Type and Realm Information</div>
                                                                    <div className="kcDrawerSectionGrid">
                                                                        {/* User Type */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                User Type
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Local User"
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid #d1d5db`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box'
                                                                                }}
                                                                                disabled
                                                                            />
                                                                        </div>

                                                                        {/* Realm Role */}
                                                                        <div>
                                                                            <label style={{
                                                                                display: 'block',
                                                                                fontSize: '0.875rem',
                                                                                fontWeight: 500,
                                                                                color: '#374151',
                                                                                marginBottom: '0.5rem'
                                                                            }}>
                                                                                Realm Role <span style={{ color: '#dc2626' }}>*</span>
                                                                            </label>
                                                                            <select
                                                                                value={form.roleId}
                                                                                onChange={(e) => handleInputChange('roleId', e.target.value)}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    padding: '0.625rem 0.875rem',
                                                                                    fontSize: '0.875rem',
                                                                                    border: `1px solid ${errors.roleId ? '#dc2626' : '#d1d5db'}`,
                                                                                    borderRadius: '0.5rem',
                                                                                    backgroundColor: 'white',
                                                                                    outline: 'none',
                                                                                    transition: 'border-color 0.2s',
                                                                                    fontFamily: 'inherit',
                                                                                    boxSizing: 'border-box',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                                onFocus={(e) => {
                                                                                    if (!errors.roleId) {
                                                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    if (!errors.roleId) {
                                                                                        e.currentTarget.style.borderColor = '#d1d5db';
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <option value="">Select role</option>
                                                                                {roles.map((r) => (
                                                                                    <option key={r.id} value={r.id}>
                                                                                        {r.name}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                            {errors.roleId && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.25rem',
                                                                                    marginTop: '0.25rem',
                                                                                    color: '#dc2626',
                                                                                    fontSize: '0.75rem'
                                                                                }}>
                                                                                    <AlertCircle size={12} />
                                                                                    {errors.roleId}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                                                                <button
                                                                    type="button"
                                                                    className="kc-btn kc-btn-ghost"
                                                                    onClick={() => {
                                                                        setFormError(null);
                                                                        setErrors({});
                                                                        setForm({
                                                                            staffId: "",
                                                                            username: "",
                                                                            email: "",
                                                                            firstName: "",
                                                                            lastName: "",
                                                                            roleId: "",
                                                                            group: "",
                                                                            staffType: "",
                                                                            department: "",
                                                                            organization: "",
                                                                            phone: "",
                                                                            status: "Active",
                                                                        });
                                                                    }}
                                                                >
                                                                    Clear
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="kc-btn kc-btn-primary"
                                                                    onClick={() => {
                                                                        setFormError(null);

                                                                        if (!validateCreateLocalUser()) {
                                                                            setFormError("Please fix the highlighted fields");
                                                                            return;
                                                                        }

                                                                        createLocalUserInRealm(
                                                                            {
                                                                                username: form.username,
                                                                                staffId: form.staffId,
                                                                                firstName: form.firstName,
                                                                                lastName: form.lastName,
                                                                                email: form.email,
                                                                                phone: form.phone,
                                                                                organization: form.organization,
                                                                                department: form.department,
                                                                                staffType: form.staffType,
                                                                                group: form.group,
                                                                                roleId: form.roleId,
                                                                            },
                                                                            form.roleId as RealmRoleId
                                                                        );

                                                                        setForm({
                                                                            staffId: "",
                                                                            username: "",
                                                                            email: "",
                                                                            firstName: "",
                                                                            lastName: "",
                                                                            roleId: "",
                                                                            group: "",
                                                                            staffType: "",
                                                                            department: "",
                                                                            organization: "",
                                                                            phone: "",
                                                                            status: "Active",
                                                                        });
                                                                    }}
                                                                >
                                                                    <Plus size={16} /> Create local user
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Drawer footer */}
                                                <div className="kcDrawerFooter">
                                                    <button type="button" className="kc-btn kc-btn-ghost" onClick={closePanel}>
                                                        <X size={16} /> Close
                                                    </button>
                                                </div>
                                            </aside>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div >

                    )}

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
                                        <DataTable<AppRow>
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
                                            minHeight="100%" />
                                    </div>
                                )}
                            </>
                        )
                    }
                </div >
                {showManage && (
                    <div
                        className="kc-confirmOverlay"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) handleCloseManage();
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

                                <button className="kc-btn kc-btn-ghost" onClick={handleCloseManage}>
                                    <X size={16} />
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
                                        className={`kc-btn ${isActive ? "kc-btn-danger" : "kc-btn-primary"}`}
                                        onClick={() => {
                                            openConfirm({
                                                title: isActive ? "Deactivate realm?" : "Activate realm?",
                                                message: isActive
                                                    ? "This will set the realm to Inactive. Users may lose access to applications."
                                                    : "This will set the realm to Active.",
                                                confirmText: isActive ? "Deactivate" : "Activate",
                                                cancelText: "Cancel",
                                                danger: isActive,
                                                onConfirm: () => {
                                                    onUpdateRealm({ status: isActive ? "Inactive" : "Active" });
                                                    setShowManage(false);
                                                },
                                            });
                                        }}
                                    >
                                        {isActive ? "Deactivate Realm" : "Activate Realm"}
                                    </button>
                                </div>
                            </div>

                            <div className="kc-confirmFooter" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <button className="kc-btn kc-btn-ghost" onClick={() => handleCloseManage()}>
                                    Cancel
                                </button>

                                <button
                                    className="kc-btn kc-btn-primary"
                                    disabled={!isDirty}
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
                )
                }
                <ConfirmDialog state={confirm} onClose={closeConfirm} />
            </>
        );
    };

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
    onToggleStatus: (realm: RealmRow) => void;
    openConfirmDialog: (next: Omit<ConfirmState, "open">) => void;
}> = ({ realms, loading, error, onRowClick, realmStatusFilter, setRealmStatusFilter, onRefresh, onToggleStatus, openConfirmDialog }) => {

    const columns = useMemo(
        () => createRealmColumns(onRowClick, onToggleStatus, openConfirmDialog),
        [onRowClick, onToggleStatus, openConfirmDialog]
    );

    const filterLabel = useMemo(() => {
        if (!realmStatusFilter.length) return "All";
        return realmStatusFilter.join(", ");
    }, [realmStatusFilter]);
    const navigate = useNavigate();

    return (
        <div className="tab-table-container">
            <div className="tab-table-main">
                <div className="table-card" style={{ flex: 1 }}>
                    <DataTable<RealmRow>
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
                            right: (
                                <button className="kc-btn kc-btn-primary" onClick={() => navigate("/realms/new")}>
                                    <Plus size={16} /> Create realm
                                </button>
                            ),
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
    const [confirm, setConfirm] = useState<ConfirmState>({
        open: false,
        title: "",
    });

    const openConfirmDialog = (next: Omit<ConfirmState, "open">) =>
        setConfirm({ open: true, ...next });

    const closeConfirmDialog = () =>
        setConfirm((p) => ({ ...p, open: false }));

    const [users, setUsers] = useState<UserRow[]>(USERS_DATA);
    const [realms, setRealms] = useState<RealmRow[]>(REALMS_DATA);
    const [apps] = useState<AppRow[]>(APPS_DATA);

    const location = useLocation();

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

    const TOAST_TTL_MS = 2600;
    const TOAST_EXIT_MS = 220;

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

    useEffect(() => {
        const raw = sessionStorage.getItem("NEW_REALM_DRAFT");
        if (!raw) return;

        sessionStorage.removeItem("NEW_REALM_DRAFT");

        try {
            const newRealm = JSON.parse(raw) as RealmRow;

            setRealms((prev) => [newRealm, ...(prev ?? [])]);

            // open detail tab immediately
            const tabId = `realm-${newRealm.id}`;
            addTab({
                id: tabId,
                title: newRealm.name,
                type: "realm-detail",
                closable: true,
                content: { realmId: newRealm.id },
            });

            pushToast("Realm created", "success");
        } catch {
            // ignore
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const closeRealmTabs = useCallback(
        (realmId: string) => {
            const tabId = `realm-${realmId}`;

            const indices: number[] = [];

            tabs.forEach((t, i) => {
                if (t.type === "realm-detail" && t.id === tabId) {
                    indices.push(i);
                }
            });

            for (let i = indices.length - 1; i >= 0; i--) {
                closeTab(indices[i]);
            }
        },
        [tabs, closeTab]
    );

    const closeAllRealmTabs = useCallback(() => {
        const indices: number[] = [];

        tabs.forEach((t, i) => {
            if (t.type === "realm-detail") {
                indices.push(i);
            }
        });

        // Close from back to front
        for (let i = indices.length - 1; i >= 0; i--) {
            closeTab(indices[i]);
        }
    }, [tabs, closeTab]);

    const closeAllTabs = useCallback(() => {
        const indices: number[] = [];

        tabs.forEach((t, i) => {
            if (t.type === "realm-detail") {
                indices.push(i);
            }
        });

        // Close from back to front
        for (let i = indices.length - 1; i >= 0; i--) {
            closeTab(indices[i]);
        }
    }, [tabs, closeTab]);

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
                content: { realmId: realm.id },
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
            const u = users.find(x => x.uuid === userUuid);
            if (u?.status === "Inactive") {
                pushToast("Cannot add terminated (inactive) user to a realm", "error");
                return false;
            }
            let didSucceed = true;

            setRealmUsers((prev) => {
                const next: RealmUserMap = { ...(prev ?? {}) };
                const list = next[realmId] ?? [];

                const exists = list.some((m) => m.userUuid === userUuid);

                next[realmId] = exists
                    ? list.map((m) => (m.userUuid === userUuid ? { ...m, roleId } : m))
                    : [...list, { userUuid, roleId }];

                queueMicrotask(() => syncRealmUserCounts(next));

                if (exists) {
                    guardedToast(`role:${realmId}:${userUuid}:${roleId}`, "User role updated", "info");
                } else {
                    guardedToast(`add:${realmId}:${userUuid}`, "User added to realm", "success");
                }

                return next;
            });
            return didSucceed;
        },
        [syncRealmUserCounts, guardedToast, users, pushToast]
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

    const toggleRealmStatus = useCallback(
        (realm: RealmRow) => {
            const nextStatus: RealmStatus =
                realm.status === "Active" ? "Inactive" : "Active";

            updateRealm(realm.id, { status: nextStatus });

            pushToast(
                nextStatus === "Active"
                    ? "Realm activated"
                    : "Realm deactivated",
                nextStatus === "Active" ? "success" : "info"
            );
        },
        [updateRealm, pushToast]
    );

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
                            onToggleStatus={toggleRealmStatus}
                            openConfirmDialog={openConfirmDialog}
                        />
                    );
                case "realm-detail": {
                    const contentAny = tab.content as any;

                    const realmId =
                        contentAny?.realmId ||
                        contentAny?.id || // old saved tabs where content was RealmRow
                        (typeof tab.id === "string" && tab.id.startsWith("realm-")
                            ? tab.id.replace("realm-", "")
                            : "");

                    const realm = realms.find((r) => r.id === realmId);

                    if (!realm) {
                        return (
                            <div style={{ padding: "1rem" }}>
                                Realm not found: <b>{realmId || "(missing id)"}</b>
                            </div>
                        );
                    }

                    const realmMemberships = (realmUsers?.[realm.id] ?? []) as RealmMembership[];
                    const roleCounts: Record<string, number> = {};
                    for (const m of realmMemberships ?? []) {
                        if (m.roleId) {
                            roleCounts[m.roleId] = (roleCounts[m.roleId] ?? 0) + 1;
                        }
                    }
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
                            roleCounts={roleCounts}
                            onAddUser={(uuid, roleId) => addUserToRealm(realm.id, uuid, roleId)}
                            onRemoveUser={(uuid) => removeUserFromRealm(realm.id, uuid)}
                            onCreateUser={(u) => {
                                const uuid =
                                    (u as any).uuid ??
                                    (typeof crypto !== "undefined" && "randomUUID" in crypto
                                        ? (crypto as any).randomUUID()
                                        : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

                                const localUser: UserRow = {
                                    ...u,
                                    uuid,
                                    userType: "local_user",
                                    localRealmId: realm.id,
                                    status: u.status ?? "Pending",
                                };

                                createUser(localUser);

                                const defaultRoleId = (REALM_ROLES?.[0]?.id ?? "none") as RealmRoleId;

                                if (defaultRoleId !== "none") {
                                    addUserToRealm(realm.id, localUser.uuid, defaultRoleId);
                                }

                                pushToast("Local user created in realm", "success");
                            }}
                            appUsers={realmAppUsers}
                            onGrantAppUser={(appId, userUuid) => grantUserToApp(realm.id, appId, userUuid)}
                            onRevokeAppUser={(appId, userUuid) => revokeUserFromApp(realm.id, appId, userUuid)}
                            onUpdateRealm={(patch) => updateRealm(realm.id, patch)}
                            onToast={pushToast}
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
            filteredRealms,
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
        <>
            <ConfirmDialog state={confirm} onClose={closeConfirmDialog} />
            <ToastStack
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
                <div className="cardStyle">
                    <div className="cardTitleStyle">
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

                {/* URLs */}
                <div className="cardStyle">
                    <div className="cardTitleStyle">
                        <Globe size={16} /> URLs
                    </div>
                    <Row label="Root URL" value={app.rootUrl ?? "—"} />
                    <Row label="Base URL" value={app.baseUrl ?? "—"} />
                    <Row label="Admin URL" value={app.adminUrl ?? "—"} />
                </div>

                {/* Client Scopes */}
                <div className="cardStyle">
                    <div className="cardTitleStyle">
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

            <div className="cardStyle">
                <SectionHeader
                    title="Users with access"
                    subtitle="Manage which realm users can access this client."
                    right={
                        <button className="kc-btn kc-btn-primary" onClick={() => setShowGrant(s => !s)}>
                            + {showGrant ? "Close" : "Grant access"}
                        </button>
                    }
                />

                <DataTable<UserRow>
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
                    minHeight="100%"
                />

                {showGrant && (
                    <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
                        <div className="kc-text-title">Grant access to realm users</div>
                        {/* <input
                            value={grantQuery}
                            onChange={(e) => setGrantQuery(e.target.value)}
                            placeholder="Search eligible users..."
                            className="kc-input"
                            style={{ width: "100%", marginTop: 10 }}
                        /> */}
                        <div style={{ marginTop: 12 }}>
                            <DataTable<UserRow>
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
                                minHeight="100%"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};