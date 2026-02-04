import React, { useCallback, useMemo, useState } from "react";

import TabPanel from "../../components/common/tabs/TabPanel";
import DataTable2, { Badge, LinkCell, TableColumn } from "../../components/common/DataTable2";
import { useTabs } from "../../hooks/useTabs";
import type { Tab } from "../../hooks/useTabs";

import {
    ArrowLeft,
    Globe,
    Users,
    Edit,
    Trash2,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    UserPlus,
} from "lucide-react";

import "../../styles/browserTabs.css";

type RealmStatus = "Active" | "Inactive" | "Draft";
type UserStatus = "Active" | "Inactive" | "Pending";

export interface RealmUserRow {
    id: number;
    realmId: string;
    userId: number;
}

export interface RealmRow {
    id: string;
    name: string;
    status: RealmStatus;
    createdAt: string;
    updatedAt?: string;
    userCount: number;
}

export interface UserRow {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
    status: UserStatus;
    lastLogin?: string;
}

type RealmUserMap = Record<string, number[]>; // realmId -> userIds

// ============================================================================
// MOCK DATA (replace with API)
// ============================================================================

const USERS_DATA: UserRow[] = [
    {
        id: 1,
        username: "admin",
        email: "admin@bos.sg",
        firstName: "Admin",
        lastName: "User",
        role: "Certis Full User",
        department: "IT",
        status: "Active",
        lastLogin: "19 Dec 2025, 03:30 pm",
    },
    {
        id: 2,
        username: "john.doe",
        email: "john.doe@bos.sg",
        firstName: "John",
        lastName: "Doe",
        role: "Certis Contractor",
        department: "Operations",
        status: "Active",
        lastLogin: "19 Dec 2025, 02:20 pm",
    },
    {
        id: 3,
        username: "jane.smith",
        email: "jane.smith@bos.sg",
        firstName: "Jane",
        lastName: "Smith",
        role: "Certis Half User",
        department: "Operations",
        status: "Active",
        lastLogin: "18 Dec 2025, 04:45 pm",
    },
    {
        id: 4,
        username: "mike.tan",
        email: "mike.tan@bos.sg",
        firstName: "Mike",
        lastName: "Tan",
        role: "External User",
        department: "Finance",
        status: "Inactive",
        lastLogin: "-",
    },
    {
        id: 5,
        username: "sarah.lee",
        email: "sarah.lee@bos.sg",
        firstName: "Sarah",
        lastName: "Lee",
        role: "Local User",
        department: "Operations",
        status: "Pending",
        lastLogin: "-",
    },
];

const REALMS_DATA: RealmRow[] = [
    {
        id: "realm-ops",
        name: "Operations Realm",
        status: "Active",
        createdAt: "2025-12-18T09:00:00.000Z",
        updatedAt: "2025-12-19T09:00:00.000Z",
        userCount: 3,
    },
    {
        id: "realm-fin",
        name: "Finance Realm",
        status: "Inactive",
        createdAt: "2025-12-10T09:00:00.000Z",
        updatedAt: "2025-12-12T09:00:00.000Z",
        userCount: 2,
    },
    {
        id: "realm-dev",
        name: "Sandbox Realm",
        status: "Draft",
        createdAt: "2025-12-01T09:00:00.000Z",
        updatedAt: "2025-12-01T09:00:00.000Z",
        userCount: 1,
    },
];

const REALM_USERS_INITIAL: RealmUserMap = {
    "realm-ops": [1, 2, 3],
    "realm-fin": [4, 5],
    "realm-dev": [2],
};

// ============================================================================
// HELPERS
// ============================================================================

const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-SG", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

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

// ============================================================================
// TABLE COLUMNS
// ============================================================================

const createRealmColumns = (onView: (row: RealmRow) => void): TableColumn<RealmRow>[] => [
    {
        key: "name",
        label: "Realm",
        width: "280px",
        render: (value, row) => <LinkCell onClick={() => onView(row)}>{value as string}</LinkCell>,
    },
    {
        key: "status",
        label: "Status",
        width: "130px",
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
        width: "170px",
        render: (value) => formatDateTime(value as string),
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
    onRemoveUserFromRealm: (userId: number) => void
): TableColumn<UserRow>[] => [
        {
            key: "username",
            label: "Username",
            width: "180px",
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
            key: "role",
            label: "Role",
            width: "150px",
            render: (value) => <Badge variant="info">{value as string}</Badge>,
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
            render: (value) => (value as string) || "-",
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
                        onRemoveUserFromRealm(row.id);
                    }}
                    title="Remove from realm"
                    style={{ color: "#dc2626" }}
                >
                    <Trash2 size={16} />
                </button>
            ),
        },
    ];

const createAddUsersColumns = (
    onAddUserToRealm: (userId: number) => void
): TableColumn<UserRow>[] => [
        {
            key: "username",
            label: "Username",
            width: "200px",
            render: (value) => (value as string) || "-",
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
            width: "280px",
            render: (value) => (value as string) || "-",
        },
        {
            key: "role",
            label: "Role",
            width: "150px",
            render: (value) => <Badge variant="info">{value as string}</Badge>,
        },
        {
            key: "status",
            label: "Status",
            width: "130px",
            align: "center",
            render: (value) => <Badge variant={userStatusVariant(value as UserStatus)}>{value as string}</Badge>,
        },
        {
            key: "id",
            label: "Actions",
            width: "110px",
            align: "center",
            sortable: false,
            render: (_, row) => (
                <button
                    type="button"
                    className="icon-action"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddUserToRealm(row.id);
                    }}
                    title="Add to realm"
                    style={{ color: "#16a34a" }}
                >
                    <UserPlus size={16} />
                </button>
            ),
        },
    ];

// ============================================================================
// REALMS LIST TAB
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
                    key="realms-table"
                    data={realms}
                    columns={columns}
                    keyField="id"
                    onRowClick={onRowClick}
                    loading={loading}
                    error={error}
                    searchable
                    searchPlaceholder="Search by realm name..."
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

// ============================================================================
// REALM DETAIL (Overview | Users | Add Users)
// ============================================================================

type RealmDetailTab = "overview" | "users" | "add-users";

const RealmDetailContent: React.FC<{
    realm: RealmRow;
    allUsers: UserRow[];
    realmUserIds: number[];
    onBack?: () => void;
    onRemoveUser: (userId: number) => void;
    onAddUser: (userId: number) => void;
    onCreateUser: (dto: Omit<UserRow, "id">) => void;
}> = ({ realm, allUsers, realmUserIds, onBack, onRemoveUser, onAddUser }) => {
    const [active, setActive] = useState<RealmDetailTab>("overview");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const safeUsers = Array.isArray(allUsers) ? allUsers : [];
    const realmSet = useMemo(() => new Set(realmUserIds ?? []), [realmUserIds]);

    const usersInRealm = useMemo(() => safeUsers.filter((u) => realmSet.has(u.id)), [safeUsers, realmSet]);
    const usersNotInRealm = useMemo(() => safeUsers.filter((u) => !realmSet.has(u.id)), [safeUsers, realmSet]);

    const realmUsersColumns = useMemo(
        () => createRealmUsersColumns(() => { }, (userId) => onRemoveUser(userId)),
        [onRemoveUser]
    );

    const addUsersColumns = useMemo(
        () => createAddUsersColumns((userId) => onAddUser(userId)),
        [onAddUser]
    );
    const [newUser, setNewUser] = useState({
        username: "",
        email: "",
        firstName: "",
        lastName: "",
        role: "",
        department: "",
        status: "Pending" as UserStatus,
        lastLogin: "-",
    });

    const submitCreate = () => {
        setCreateError(null);

        if (!newUser.username.trim()) return setCreateError("Username is required");
        if (!newUser.email.trim()) return setCreateError("Email is required");
        if (!newUser.firstName.trim()) return setCreateError("First name is required");
        if (!newUser.lastName.trim()) return setCreateError("Last name is required");
        if (!newUser.role.trim()) return setCreateError("Role is required");

        setCreating(true);

        // if you have API later, await it here
        onCreateUser({
            username: newUser.username.trim(),
            email: newUser.email.trim(),
            firstName: newUser.firstName.trim(),
            lastName: newUser.lastName.trim(),
            role: newUser.role.trim(),
            department: newUser.department?.trim() || undefined,
            status: newUser.status,
            lastLogin: newUser.lastLogin,
        });

        setCreating(false);

        // reset form
        setNewUser({
            username: "",
            email: "",
            firstName: "",
            lastName: "",
            role: "",
            department: "",
            status: "Pending",
            lastLogin: "-",
        });

        // optional: jump to "users" tab after creation
        // setActive("users");
    };

    const TabButton = ({ id, label }: { id: RealmDetailTab; label: string }) => {
        const isActive = active === id;
        return (
            <button
                type="button"
                onClick={() => setActive(id)}
                style={{
                    padding: "0.45rem 0.8rem",
                    borderRadius: "9999px",
                    border: "1px solid #e5e7eb",
                    background: isActive ? "#111827" : "#fff",
                    color: isActive ? "#fff" : "#374151",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                }}
            >
                {label}
            </button>
        );
    };

    return (
        <div style={{ padding: "0.5rem" }}>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: "1px solid #e5e7eb",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {onBack && (
                        <button
                            onClick={onBack}
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
                        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "#1f2937" }}>
                            {realm.name}
                        </h2>
                        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                            {realm.id}
                        </p>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            background: "#002855",
                            color: "white",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                        }}
                    >
                        <Edit size={16} />
                        Edit
                    </button>

                    <button
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.5rem 1rem",
                            background: "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                        }}
                    >
                        <Trash2 size={16} />
                        Delete
                    </button>
                </div>
            </div>

            {/* Badges + mini tabs */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span
                        style={{
                            padding: "0.375rem 0.75rem",
                            background: realm.status === "Active" ? "#dcfce7" : realm.status === "Draft" ? "#fef3c7" : "#fee2e2",
                            color: realm.status === "Active" ? "#16a34a" : realm.status === "Draft" ? "#d97706" : "#dc2626",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                        }}
                    >
                        {realmStatusIcon(realm.status)}
                        {realm.status}
                    </span>

                    <span
                        style={{
                            padding: "0.375rem 0.75rem",
                            background: "#f3f4f6",
                            color: "#6b7280",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                        }}
                    >
                        <Users size={12} />
                        {usersInRealm.length} users
                    </span>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <TabButton id="overview" label="Overview" />
                    <TabButton id="users" label="Users" />
                    <TabButton id="add-users" label="Add Users" />
                </div>
            </div>
            {active === "add-users" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* ✅ Create New User mini form */}
                    <div
                        style={{
                            background: "#f9fafb",
                            borderRadius: "0.5rem",
                            padding: "1rem",
                            border: "1px solid #e5e7eb",
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
                            Create New User (and add to realm)
                        </h3>

                        {createError && (
                            <div
                                style={{
                                    marginTop: "0.75rem",
                                    padding: "0.75rem",
                                    borderRadius: "0.5rem",
                                    background: "#fee2e2",
                                    border: "1px solid #fecaca",
                                    color: "#991b1b",
                                    fontSize: "0.85rem",
                                }}
                            >
                                {createError}
                            </div>
                        )}

                        <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem" }}>
                            <input
                                value={newUser.firstName}
                                onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))}
                                placeholder="First name *"
                                style={{ padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid #d1d5db" }}
                            />
                            <input
                                value={newUser.lastName}
                                onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))}
                                placeholder="Last name *"
                                style={{ padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid #d1d5db" }}
                            />
                            <input
                                value={newUser.username}
                                onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
                                placeholder="Username *"
                                style={{ padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid #d1d5db" }}
                            />
                            <input
                                value={newUser.email}
                                onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                                placeholder="Email *"
                                style={{ padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid #d1d5db" }}
                            />
                            <input
                                value={newUser.role}
                                onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                                placeholder="Role * (e.g. Operator)"
                                style={{ padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid #d1d5db" }}
                            />
                            <input
                                value={newUser.department}
                                onChange={(e) => setNewUser((p) => ({ ...p, department: e.target.value }))}
                                placeholder="Department (optional)"
                                style={{ padding: "0.6rem", borderRadius: "0.4rem", border: "1px solid #d1d5db" }}
                            />
                        </div>

                        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={submitCreate}
                                disabled={creating}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.55rem 0.9rem",
                                    borderRadius: "0.45rem",
                                    border: "none",
                                    background: creating ? "#9ca3af" : "#16a34a",
                                    color: "white",
                                    cursor: creating ? "not-allowed" : "pointer",
                                    fontSize: "0.875rem",
                                    fontWeight: 600,
                                }}
                            >
                                <UserPlus size={16} />
                                {creating ? "Creating..." : "Create & Add"}
                            </button>
                        </div>
                    </div>

                    {/* ✅ Existing “Add Users” table */}
                    <div className="table-card" style={{ flex: 1 }}>
                        <DataTable2<UserRow>
                            key={`realm-add-users-${realm.id}`}
                            data={usersNotInRealm}
                            columns={addUsersColumns}
                            keyField="id"
                            loading={false}
                            error={null}
                            searchable
                            searchPlaceholder="Search all users..."
                            paginated
                            pageSize={10}
                            pageSizeOptions={[10, 25, 50]}
                            striped
                            hoverable
                            stickyHeader
                            emptyMessage="No more users to add"
                            minHeight="360px"
                        />
                    </div>
                </div>
            )}
            {/* Tab content */}
            {active === "overview" && (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "1.5rem",
                        marginBottom: "1.5rem",
                    }}
                >
                    <div
                        style={{
                            background: "#f9fafb",
                            borderRadius: "0.5rem",
                            padding: "1rem",
                            border: "1px solid #e5e7eb",
                        }}
                    >
                        <h3
                            style={{
                                margin: "0 0 1rem 0",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "#374151",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                            }}
                        >
                            <Globe size={16} />
                            Realm Information
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            <div>
                                <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block" }}>Created</label>
                                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#1f2937" }}>
                                    {formatDateTime(realm.createdAt)}
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block" }}>Updated</label>
                                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#1f2937" }}>
                                    {formatDateTime(realm.updatedAt)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {active === "users" && (
                <div className="table-card" style={{ flex: 1 }}>
                    <DataTable2<UserRow>
                        key={`realm-users-${realm.id}`}
                        data={usersInRealm}
                        columns={realmUsersColumns}
                        keyField="id"
                        loading={false}
                        error={null}
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
                </div>
            )}

            {active === "add-users" && (
                <div className="table-card" style={{ flex: 1 }}>
                    <DataTable2<UserRow>
                        key={`realm-add-users-${realm.id}`}
                        data={usersNotInRealm}
                        columns={addUsersColumns}
                        keyField="id"
                        loading={false}
                        error={null}
                        searchable
                        searchPlaceholder="Search all users..."
                        paginated
                        pageSize={10}
                        pageSizeOptions={[10, 25, 50]}
                        striped
                        hoverable
                        stickyHeader
                        emptyMessage="No more users to add"
                        minHeight="360px"
                    />
                </div>
            )}
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
    const [realms, setRealms] = useState<RealmRow[]>(REALMS_DATA);
    const [users, setUsers] = useState<UserRow[]>(USERS_DATA);
    const [realmUsers, setRealmUsers] = useState<RealmUserMap>(REALM_USERS_INITIAL);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { tabs, activeTab, setActiveTab, addTab, closeTab, reorderTabs } = useTabs({
        storageKey: "admin-realms-tabs",
        defaultTabs: DEFAULT_TABS,
    });



    const recomputeRealmUserCount = useCallback((nextRealmUsers: RealmUserMap) => {
        setRealms((prev) =>
            prev.map((r) => ({
                ...r,
                userCount: (nextRealmUsers[r.id] ?? []).length,
            }))
        );
    }, []);

    const handleRefresh = useCallback(() => {
        setLoading(true);
        setTimeout(() => {
            setRealms(REALMS_DATA);
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

    const handleBackToRealms = useCallback(() => {
        const idx = tabs.findIndex((t: Tab) => t.type === "realms");
        if (idx !== -1) setActiveTab(idx);
    }, [tabs, setActiveTab]);

    const removeUserFromRealm = useCallback(
        (realmId: string, userId: number) => {
            setRealmUsers((prev) => {
                const next: RealmUserMap = { ...prev };
                const current = new Set(next[realmId] ?? []);
                current.delete(userId);
                next[realmId] = Array.from(current);

                queueMicrotask(() => recomputeRealmUserCount(next));
                return next;
            });
        },
        [recomputeRealmUserCount]
    );



    const addUserToRealm = useCallback(
        (realmId: string, userId: number) => {
            setRealmUsers((prev) => {
                const next: RealmUserMap = { ...prev };
                const current = new Set(next[realmId] ?? []);
                current.add(userId);
                next[realmId] = Array.from(current);

                queueMicrotask(() => recomputeRealmUserCount(next));
                return next;
            });
        },
        [recomputeRealmUserCount]
    );

    const createUserAndAddToRealm = useCallback(
        (realmId: string, dto: Omit<UserRow, "id">) => {
            const newUser: UserRow = {
                id: Date.now(), // replace with API returned id later
                ...dto,
            };

            setUsers((prev) => [newUser, ...prev]);         // 1) add into all users list
            addUserToRealm(realmId, newUser.id);            // 2) auto add into realm
            return newUser;
        },
        [addUserToRealm]
    );


    const renderTabContent = useCallback(
        (tab: Tab) => {
            switch (tab.type) {
                case "realms":
                    return <RealmsContent realms={realms} loading={loading} error={error} onRowClick={handleRealmRowClick} />;

                case "realm-detail": {
                    const realm = tab.content as RealmRow;
                    const realmUserIds = realmUsers[realm.id] ?? [];

                    return (
                        <RealmDetailContent
                            realm={realm}
                            allUsers={users}
                            realmUserIds={realmUserIds}
                            onBack={handleBackToRealms}
                            onRemoveUser={(userId) => removeUserFromRealm(realm.id, userId)}
                            onAddUser={(userId) => addUserToRealm(realm.id, userId)}
                            onCreateUser={(dto) => createUserAndAddToRealm(realm.id, dto)}
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
        [realms, loading, error, handleRealmRowClick, realmUsers, users, handleBackToRealms, removeUserFromRealm, addUserToRealm]
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
                    addButtonLabel={""}
                    renderContent={renderTabContent}
                    minHeight="100%"
                />
            </div>
        </div>
    );
};

export default RealmsPage;
