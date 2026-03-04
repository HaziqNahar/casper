import React, { useState, useEffect, useCallback, useMemo } from "react";

import TabPanel from "../../components/common/tabs/TabPanel";
import DataTable, { TableColumn } from "../../components/common/DataTable";
import { useTabs } from "../../hooks/useTabs";
import type { Tab } from "../../hooks/useTabs";
import {
    ArrowLeft,
    User,
    Shield,
    Mail,
    Calendar,
    Edit,
    Trash2,
    Save,
    X,
    Eye,
    Building,
    CheckCircle,
    XCircle,
    Clock,
    LogIn
} from 'lucide-react';
import { Badge, LinkCell } from "../../components/common/Badge";
import { MultiSelectCheckbox } from "../../components/common/MultiSelectCheckbox";

export type OnboardingStage = "Requested" | "Approved" | "Verified" | "Rejected" | "Activated";

export interface RealmRow {
    id: string;
    name: string;
    status: "Active" | "Inactive" | "Draft";
}

export interface RealmUserMapping {
    userId: string;
    realmId: string;
    roleIds: string[];
    isRoot?: boolean;
}

export interface UserRow {
    id: string;
    staffId?: string | null;

    username: string;
    email: string;
    firstName: string;
    lastName: string;

    role: string;
    department?: string;
    status: "Active" | "Inactive" | "Pending";
    lastLogin?: string;

    onboardingStage?: OnboardingStage | null;
    onboardingReason?: string | null;
    isBreakGlass?: boolean;

    isDeleted?: boolean;
    deletedAt?: string | null;

    userType: string;
    localRealmId?: string;

    requestedBy?: string;
    requestedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    verifiedBy?: string;
    verifiedAt?: string;
    rejectedBy?: string;
    rejectedAt?: string;
}

export interface UserTypeRow {
    id: string;
    title: string;
    desc?: string;
    username: string;
    fa1: string;
    fa2: string[];
    useCase: string;
}


interface CreateUserDto {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    department?: string;
    userType: string;
}

// ============================================================================
// MOCK DATA (Replace with actual API calls)
// ============================================================================
const USERS_DATA: UserRow[] = [
    {
        id: "a8f8d8e4-8a21-4c36-8cfa-8dbefc9c1122",
        staffId: "S567",
        username: "sarah.lee",
        email: "sarah.lee@bos.sg",
        firstName: "Sarah",
        lastName: "Lee",
        role: "User",
        userType: "Local User",
        department: "Operations",
        status: "Pending",
        lastLogin: "-",
        onboardingStage: "Requested",
        onboardingReason: "-",
        isBreakGlass: true,
        isDeleted: false,
        deletedAt: null,
        localRealmId: "root"
    },

];

const USER_TYPES_DATA: UserTypeRow[] = [
    {
        id: "certis-full",
        title: "Certis Full User",
        desc: "Users with valid Certis employee/contractor ID and email address",
        username: "xxx@certis.com",
        fa1: "Password",
        fa2: ["TOTP"],
        useCase: "Web application and mobile app access",
    },
    {
        id: "certis-contractor",
        title: "Certis Contractor",
        desc: "Certis contractor with contractor ID and Certis email address",
        username: "xxx@certis.com",
        fa1: "Password",
        fa2: ["TOTP", "Additional Email OTP required once a day"],
        useCase: "Web application and mobile app access",
    },
    {
        id: "certis-half",
        title: "Certis Half User",
        desc: "Users with valid Certis employee ID only",
        username: "Certis Employee ID",
        fa1: "Password",
        fa2: ["Staff Card (NFC) + PIN"],
        useCase: "Mobile app access only",
    },
    {
        id: "external",
        title: "External Users",
        desc: "External users identified by their company email address",
        username: "External user company email address",
        fa1: "Password",
        fa2: ["TOTP", "Additional Email OTP required once a day"],
        useCase: "Web application and mobile app access",
    },
    {
        id: "local-user",
        title: "Local User",
        desc: "For scenarios where all other user types are not suitable. E.g. break glass account.",
        username: "Custom Username",
        fa1: "Password",
        fa2: ["Yubikey + PIN", "TOTP"],
        useCase: "Web application and mobile app access",
    },
];

export type RealmRoleId = string;

export interface RealmRole {
    id: RealmRoleId;
    name: string;
    permissions: string[];
}

const ROLES_DATA: RealmRole[] = [
    { id: "realm_admin", name: "Realm Administrator", permissions: ["realm:read", "realm:write", "realm:delete", "user:read", "user:write", "user:delete", "app:read", "app:write", "app:delete"] },
    { id: "realm_manager", name: "Realm Manager", permissions: ["realm:read", "realm:write", "user:read", "user:write", "app:read", "app:write"] },
    { id: "realm_auditor", name: "Realm Auditor", permissions: ["realm:read", "user:read", "app:read"] },
    { id: "realm_user", name: "Standard User", permissions: ["realm:read", "user:read"] },
    { id: "realm_restricted", name: "Restricted User", permissions: ["realm:read"] },
];

const REALMS_DATA: RealmRow[] = [
    { id: "root", name: "Root Realm", status: "Active" },
    { id: "ops", name: "Operations", status: "Active" },
    { id: "finance", name: "Finance", status: "Active" },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString('en-SG', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
};

const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
        case 'Active': return 'success';
        case 'Pending': return 'warning';
        case 'Inactive': return 'error';
        default: return 'default';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'Active': return <CheckCircle size={12} />;
        case 'Pending': return <Clock size={12} />;
        case 'Inactive': return <XCircle size={12} />;
        default: return null;
    }
};

// ============================================================================
// TABLE COLUMN DEFINITIONS
// ============================================================================

const createUserColumns = (
    onView: (row: UserRow) => void
): TableColumn<UserRow>[] => [
        {
            key: 'username',
            label: 'Username',
            width: '150px',
            render: (value, row) => (
                <LinkCell onClick={() => onView(row)}>
                    {value as string}
                </LinkCell>
            ),
        },
        {
            key: 'firstName',
            label: 'Name',
            width: '180px',
            render: (_, row) => `${row.firstName} ${row.lastName}`,
        },
        {
            key: 'email',
            label: 'Email',
            width: '200px',
            render: (value) => (value as string) || '-',
        },
        {
            key: 'role',
            label: 'Role',
            width: '200px',
            render: (value) => (value as string) || '-',
        },
        {
            key: 'userType',
            label: 'User Type',
            width: '130px',
            render: (value) => (
                <Badge variant="info">{value as string}</Badge>
            ),
        },
        {
            key: 'department',
            label: 'Department',
            width: '130px',
            render: (value) => (value as string) || '-',
        },
        {
            key: "status",
            label: "Status",
            width: "200px",
            render: (value, row) => (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    {/* main status */}
                    <Badge variant={getStatusVariant(value as string)}>
                        <span className="kc-badge">
                            {getStatusIcon(value as string)}
                            {value as string}
                        </span>
                    </Badge>

                    {/* onboarding badge (optional) */}
                    {row.onboardingStage && (
                        <Badge variant="warning">
                            <span className="kc-badge">{row.onboardingStage}</span>
                        </Badge>
                    )}

                    {/* break glass badge (optional) */}
                    {row.isBreakGlass && (
                        <Badge variant="error">
                            <span className="kc-badge">Break Glass</span>
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'lastLogin',
            label: 'Last Login',
            width: '160px',
            render: (value) => formatDateTime(value as string),
        },
        {
            key: 'id',
            label: 'Actions',
            width: '80px',
            align: 'center',
            sortable: false,
            render: (_, row) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onView(row);
                    }}
                    className="icon-action"
                    title="View Details"
                >
                    <Eye size={16} />
                </button>
            ),
        },
    ];

const createUserTypeColumns = (
    onView: (row: UserTypeRow) => void,
    enabled2FAByType: Record<string, string[]>,
    onToggle2FA: (typeId: string, method: string) => void
): TableColumn<UserTypeRow>[] => [
        {
            key: "title",
            label: "User Type",
            width: "220px",
            render: (value, row) => (
                <LinkCell onClick={() => onView(row)}>{value as string}</LinkCell>
            ),
        },
        {
            key: "fa1",
            label: "1FA",
            width: "140px",
            align: "center",
            render: (value) => <span className="pill pill-neutral">{value as string}</span>,
        },
        {
            key: "fa2",
            label: "2FA",
            width: "320px",
            align: "center",
            sortable: false,
            render: (_value, row) => {
                const enabledSet = new Set(enabled2FAByType?.[row.id] ?? []);

                return (
                    <div className="fa2-stack">
                        {row.fa2.map((method) => {
                            const enabled = enabledSet.has(method);

                            return (
                                <button
                                    key={method}
                                    type="button"
                                    className={[
                                        "pill",
                                        "pill-info",
                                        "pill-toggle",
                                        enabled ? "pill-on" : "pill-off",
                                    ].join(" ")}
                                    onClick={(e) => {
                                        e.stopPropagation(); // important: don't trigger row click
                                        onToggle2FA(row.id, method);
                                    }}
                                    aria-pressed={enabled}
                                    title={enabled ? "Enabled (click to disable)" : "Disabled (click to enable)"}
                                >
                                    {method}
                                </button>
                            );
                        })}
                    </div>
                );
            },
        },
        {
            key: "id",
            label: "Actions",
            width: "80px",
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

const createRoleColumns = (
    onView: (row: RealmRole) => void
): TableColumn<RealmRole>[] => [
        {
            key: "id",
            label: "ID",
            width: "80px",
            sortable: false,
            render: (_, row) => row.id,
        },
        {
            key: "title",
            label: "Title",
            width: "200px",
            sortable: false,
            render: (_, row) => row.title,
        },
    ];

// ============================================================================
// USER DETAIL COMPONENT
// ============================================================================

interface UserDetailContentProps {
    user: UserRow;
    realms: RealmRow[];
    roles: RealmRole[];
    realmUserMappings: RealmUserMapping[];
    assignRealmRole: (userId: string, realmId: string, roleId: string) => void;
    unassignRealmRole: (userId: string, realmId: string, roleId: string) => void;
    removeUserFromRealm: (userId: string, realmId: string) => void;
    removeRoleFromRealmUser: (userId: string, realmId: string, roleId: string) => void;

    onBack?: () => void;
    approveUser: (id: string) => void;
    verifyUser: (id: string) => void;
    activateUser: (id: string) => void;
    rejectUser: (id: string, reason?: string) => void;
}

const UserDetailContent: React.FC<UserDetailContentProps> = ({
    user,
    realms,
    roles,
    realmUserMappings,
    assignRealmRole,
    unassignRealmRole,
    removeUserFromRealm,
    removeRoleFromRealmUser,
    onBack,
    approveUser,
    verifyUser,
    activateUser,
    rejectUser
}) => {
    const stage = user.onboardingStage ?? (user.status === "Pending" ? "Requested" : undefined);

    const canApprove = user.status === "Pending" && stage === "Requested";
    const canVerify = user.status === "Pending" && stage === "Approved";
    const canActivate = user.status === "Pending" && stage === "Verified";
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectError, setRejectError] = useState<string | null>(null);
    const isInactive = user.status === "Inactive";

    const [selectedRealmId, setSelectedRealmId] = useState<string>("");
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const canReject =
        user.status === "Pending" && (stage === "Requested" || stage === "Approved" || stage === "Verified");

    return (
        <div style={{ padding: '0.5rem' }}>
            {/* Header with Back Button */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {onBack && (
                        <button
                            onClick={onBack}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#374151'
                            }}
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                            {user.firstName} {user.lastName}
                        </h2>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                            @{user.username}
                        </p>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            {canApprove && (
                                <button className="btn btn-primary" onClick={() => approveUser?.(user.id)}>
                                    Approve
                                </button>
                            )}
                            {canVerify && (
                                <button className="btn btn-primary" onClick={() => verifyUser?.(user.id)}>
                                    Verify
                                </button>
                            )}
                            {canActivate && (
                                <button className="btn btn-success" onClick={() => activateUser?.(user.id)}>
                                    Activate
                                </button>
                            )}
                            {canReject && (
                                <button className="btn btn-danger" onClick={() => rejectUser?.(user.id)}>
                                    Reject
                                </button>
                            )}

                            {/* keep these if you still want */}
                            <button className="btn btn-primary">
                                <Edit size={16} />
                                Edit
                            </button>
                            <button className="btn btn-danger">
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </div>
                    </div>
                    {/*<button className="btn btn-primary">
                        <Edit size={16} />
                        Edit
                    </button>

                    <button className="btn btn-danger">
                        <Trash2 size={16} />
                        Delete
                    </button>*/}
                </div>

            </div>

            {/* Status Badge */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span className="kc-badge" style={{
                    padding: '0.375rem 0.75rem',
                    background: user.status === 'Active' ? '#dcfce7' : user.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                    color: user.status === 'Active' ? '#16a34a' : user.status === 'Pending' ? '#d97706' : '#dc2626',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }}>
                    {getStatusIcon(user.status)}
                    {user.status}
                </span>
                <span className="kc-badge" style={{
                    padding: '0.375rem 0.75rem',
                    background: '#dbeafe',
                    color: '#2563eb',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}>
                    {user.role}
                </span>
            </div>

            {/* Detail Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {/* Personal Information */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <User size={16} />
                        Personal Information
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>First Name</label>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                    {user.firstName}
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Last Name</label>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                    {user.lastName}
                                </p>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Username</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                {user.username}
                            </p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Staff ID</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                000001
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Mail size={16} />
                        Contact Information
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Email</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                {user.email}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Role & Department */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Building size={16} />
                        Role & Department
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Role</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937', fontWeight: 600 }}>
                                {user.role}
                            </p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Department</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                {user.department || '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Activity */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Calendar size={16} />
                        Activity
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Last Login</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                {formatDateTime(user.lastLogin)}
                            </p>
                        </div>
                        {/* <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Created</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                {formatDateTime(user.createdAt)}
                            </p>
                        </div> */}
                    </div>
                </div>

                {/* Onboarding */}
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
                        <Shield size={16} />
                        Onboarding
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div>
                            <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block" }}>
                                Current Stage
                            </label>

                            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#1f2937" }}>
                                {stage ?? "-"}
                            </p>
                        </div>

                        {user.onboardingReason && (
                            <div>
                                <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block" }}>
                                    Rejection Reason
                                </label>
                                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#991b1b" }}>
                                    {user.onboardingReason}
                                </p>
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span
                                className="kc-badge"
                                style={{
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "9999px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    background:
                                        stage === "Approved"
                                            ? "#dbeafe"
                                            : stage === "Verified"
                                                ? "#dcfce7"
                                                : stage === "Rejected"
                                                    ? "#fee2e2"
                                                    : "#fef3c7",
                                    color:
                                        stage === "Approved"
                                            ? "#2563eb"
                                            : stage === "Verified"
                                                ? "#16a34a"
                                                : stage === "Rejected"
                                                    ? "#dc2626"
                                                    : "#d97706",
                                }}
                            >
                                {stage ?? "—"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Realm Access */}
                {!isInactive && (
                    <div style={{ background: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", border: "1px solid #e5e7eb" }}>
                        <h3 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>
                            Realm Access
                        </h3>

                        {/* Add access */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", marginBottom: "0.75rem" }}>

                            <select
                                value={selectedRealmId}
                                onChange={(e) => setSelectedRealmId(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "0.375rem"
                                }}
                            >
                                <option value="">Select realm</option>
                                {realms
                                    .filter(r => r.status === "Active")
                                    .map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                            </select>

                            <select
                                value={selectedRoleId}
                                onChange={(e) => setSelectedRoleId(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "0.375rem"
                                }}
                            >
                                <option value="">Select role</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                className="btn btn-primary"
                                disabled={!selectedRealmId || !selectedRoleId}
                                onClick={() => {
                                    const existing = realmUserMappings.find(
                                        m => m.realmId === selectedRealmId && m.userId === user.id
                                    );

                                    if (existing?.roleIds?.includes(selectedRoleId)) {
                                        return;
                                    }
                                    assignRealmRole(user.id, selectedRealmId, selectedRoleId);
                                    setSelectedRealmId("");
                                    setSelectedRoleId("");
                                }}
                            >
                                Assign
                            </button>

                        </div>

                        {/* Show assigned */}
                        {realmUserMappings.length === 0 ? (
                            <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>No realm access assigned.</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                {realmUserMappings.map(m => {
                                    const realm = realms.find(r => r.id === m.realmId);
                                    return (
                                        <div key={m.realmId} style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "0.75rem", background: "white" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                                                <div style={{ fontWeight: 600, color: "#111827" }}>{realm?.name ?? m.realmId}</div>
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={() => removeUserFromRealm(user.id, m.realmId)}
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                                {(m.roleIds ?? []).map(roleId => {
                                                    const role = roles.find(r => r.id === roleId);
                                                    return (
                                                        <span
                                                            key={roleId}
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "0.4rem",
                                                                padding: "0.25rem 0.5rem",
                                                                borderRadius: "9999px",
                                                                border: "1px solid #e5e7eb",
                                                                background: "#f9fafb",
                                                                fontSize: "0.75rem",
                                                                fontWeight: 600,
                                                                color: "#374151"
                                                            }}
                                                        >
                                                            {role?.name ?? roleId}
                                                            <button
                                                                onClick={() => removeRoleFromRealmUser(user.id, m.realmId, roleId)}
                                                                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#dc2626", fontWeight: 900 }}
                                                                title="Remove role"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {showRejectModal && (
                <div className="kc-modal-overlay">
                    <div className="kc-modal">
                        <div className="kc-modal-header">
                            <h3>Reject User</h3>
                        </div>

                        <div className="kc-modal-body">
                            <p style={{ marginBottom: "0.75rem", fontSize: "0.875rem", color: "#374151" }}>
                                Please provide a reason for rejecting this user.
                            </p>

                            <textarea
                                value={rejectReason}
                                onChange={(e) => {
                                    setRejectReason(e.target.value);
                                    if (rejectError) setRejectError(null);
                                }}
                                placeholder="Enter rejection reason..."
                                rows={4}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    borderRadius: "0.375rem",
                                    border: "1px solid #d1d5db",
                                    fontSize: "0.875rem",
                                    resize: "vertical"
                                }}
                            />

                            {rejectError && (
                                <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                                    {rejectError}
                                </div>
                            )}
                        </div>

                        <div className="kc-modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason("");
                                    setRejectError(null);
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn btn-danger"
                                onClick={() => {
                                    if (!rejectReason.trim()) {
                                        setRejectError("Rejection reason is required.");
                                        return;
                                    }

                                    rejectUser(user.id, rejectReason.trim());

                                    setShowRejectModal(false);
                                    setRejectReason("");
                                    setRejectError(null);
                                }}
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// USER TYPES DETAIL COMPONENT
// ============================================================================

interface UserTypesDetailContentProps {
    usertype: UserTypeRow;
    onBack?: () => void;
    enabled2FAByType: Record<string, string[]>;
    onToggle2FA: (typeId: string, method: string) => void;
    filteredUserTypes: UserTypeRow[];
}

const UserTypesDetailContent: React.FC<UserTypesDetailContentProps> = ({
    usertype,
    onBack,
    enabled2FAByType,
    onToggle2FA,
    filteredUserTypes }) => {
    const enabledSet = new Set(enabled2FAByType?.[usertype.id] ?? []);
    return (
        <div style={{ padding: '0.5rem' }}>
            {/* Header with Back Button */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {onBack && (
                        <button
                            onClick={onBack}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#374151'
                            }}
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                            {usertype.title}
                        </h2>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                            {usertype.desc}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: '#002855',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}>
                        <Edit size={16} />
                        Edit
                    </button>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}>
                        <Trash2 size={16} />
                        Delete
                    </button>
                </div>
            </div>

            {/* Status Badges */}
            {/* <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{
                    padding: '0.375rem 0.75rem',
                    background: role.status === 'Active' ? '#dcfce7' : '#fee2e2',
                    color: role.status === 'Active' ? '#16a34a' : '#dc2626',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}>
                    {role.status}
                </span>
                <span style={{
                    padding: '0.375rem 0.75rem',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }}>
                    <User size={12} />
                    {role.userCount} users
                </span>
            </div> */}

            {/* Detail Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {/* Role Information */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Shield size={16} />
                        Role Information
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Name</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937', fontWeight: 600 }}>
                                {usertype.title}
                            </p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Description</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                {usertype.desc || 'No description provided'}
                            </p>
                        </div>
                        {/* <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Created</label>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                    {formatDateTime(role.createdAt)}
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Last Updated</label>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                    {formatDateTime(role.updatedAt)}
                                </p>
                            </div>
                        </div> */}
                    </div>
                </div>

                <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <LogIn size={16} />
                        Authentication
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>1FA</label>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                    {usertype.fa1}
                                </p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>2FA</label>
                                <div className="fa2-stack" style={{ marginTop: "0.35rem" }}>
                                    {(usertype.fa2 ?? []).map((method) => {
                                        const enabled = enabledSet.has(method);
                                        const isNote = /additional\s+email\s+otp/i.test(method);

                                        return (
                                            <button
                                                key={method}
                                                type="button"
                                                className={[
                                                    "pill",
                                                    isNote ? "pill-warn" : "pill-info",
                                                    enabled ? "pill-on" : "pill-off",
                                                    "pill-toggle",
                                                ].join(" ")}
                                                onClick={() => onToggle2FA(usertype.id, method)}
                                                aria-pressed={enabled}
                                                title={enabled ? "Click to disable" : "Click to enable"}
                                            >
                                                {method}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block' }}>Use Case</label>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#1f2937' }}>
                                {usertype.useCase}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Shield size={16} /> Permissions
                        {/* ({role.permissions.length}) */}
                    </h3>

                    {/* <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {role.permissions.map((permission) => {
                            const permLabel = availablePermissions.find(p => p.id === permission)?.label || permission;
                            return (
                                <span
                                    key={permission}
                                    style={{
                                        padding: '0.25rem 0.75rem',
                                        background: '#dbeafe',
                                        color: '#1d4ed8',
                                        borderRadius: '9999px',
                                        fontSize: '0.75rem',
                                        fontWeight: 500
                                    }}
                                >
                                    {permLabel}
                                </span>
                            );
                        })}
                    </div> */}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// ROLE DETAIL COMPONENT
// ============================================================================

interface RoleDetailProps {
    role: RealmRole;
}

const RoleDetailContent: React.FC<RoleDetailProps> = ({ role }) => {
    return (
        <div>
            <h2>{role.name}</h2>
        </div>
    );
};

// ============================================================================
// USERS TAB CONTENT
// ============================================================================

interface UsersContentProps {
    users: UserRow[];
    loading: boolean;
    error: string | null;
    onRowClick: (user: UserRow) => void;

    isFilterOpen: boolean;
    statusFilter: string;
    userTypeFilter: string;

    onStatusFilterChange: (value: string) => void;
    onUserTypesFilterChange: (value: string) => void;

    showArchivedUsers: boolean;
    setShowArchivedUsers: (value: boolean) => void;
    filteredUsers: UserRow[];
}

const UsersContent: React.FC<UsersContentProps> = ({
    users,
    loading,
    error,
    onRowClick,
    isFilterOpen,
    statusFilter,
    userTypeFilter,
    onStatusFilterChange,
    onUserTypesFilterChange,
    showArchivedUsers,
    setShowArchivedUsers,
    filteredUsers,
}) => {
    const columns = React.useMemo(
        () => createUserColumns(onRowClick),
        [onRowClick]
    );

    const uniqueRoles = React.useMemo(() => {
        return [...new Set(users.map(u => u.role))];
    }, [users]);

    return (
        <div className="tab-table-container" style={{ position: 'relative' }}>
            <div className="table-card" style={{ flex: 1 }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid #e5e7eb",
                        background: "#f9fafb",
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setShowArchivedUsers((v) => !v)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.375rem 0.75rem",
                            fontSize: "0.75rem",
                            borderRadius: "9999px",
                            border: "1px solid #e5e7eb",
                            background: showArchivedUsers ? "#111827" : "white",
                            color: showArchivedUsers ? "white" : "#111827",
                            cursor: "pointer",
                        }}
                    >
                        {showArchivedUsers ? "Hide archived" : "Show archived"}
                    </button>
                </div>
                <DataTable<UserRow>
                    data={filteredUsers}
                    columns={columns}
                    keyField="id"
                    onRowClick={onRowClick}
                    loading={loading}
                    error={error}
                    searchable={true}
                    searchPlaceholder="Search by username, name, email..."
                    paginated={true}
                    pageSize={10}
                    pageSizeOptions={[10, 25, 50, 100]}
                    striped={true}
                    hoverable={true}
                    stickyHeader={true}
                    emptyMessage="No users found"
                    minHeight="100%"
                />
            </div>

            {isFilterOpen && (
                <div
                    className="tab-table-filters"
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '260px',
                        height: '100%',
                        background: 'white',
                        borderLeft: '1px solid #e5e7eb',
                        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 10,
                        padding: '1rem',
                        overflowY: 'auto',
                    }}
                >
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                        Filter Options
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => onStatusFilterChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #d1d5db',
                                    fontSize: '0.875rem',
                                    background: 'white',
                                }}
                            >
                                <option value="All">All</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div> */}
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                                User Types
                            </label>
                            <select
                                value={userTypeFilter}
                                onChange={(e) => onUserTypesFilterChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #d1d5db',
                                    fontSize: '0.875rem',
                                    background: 'white',
                                }}
                            >
                                <option value="All">All</option>
                                {uniqueRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => {
                                onStatusFilterChange('All');
                                onUserTypesFilterChange('All');
                            }}
                            style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )
            }
        </div >
    );
};

// ============================================================================
// USER TYPES TAB CONTENT
// ============================================================================

interface UserTypesContentProps {
    usertypes: UserTypeRow[];
    loading: boolean;
    error: string | null;
    onRowClick: (role: UserTypeRow) => void;
    isFilterOpen: boolean;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;

    enabled2FAByType: Record<string, string[]>;
    onToggle2FA: (typeId: string, method: string) => void;
    showArchivedUsers: boolean;
    setShowArchivedUsers: (value: boolean) => void;
    filteredUserTypes: UserTypeRow[];
}

const UserTypeContent: React.FC<UserTypesContentProps> = ({
    usertypes,
    loading,
    error,
    onRowClick,
    isFilterOpen,
    statusFilter,
    onStatusFilterChange,
    enabled2FAByType,
    onToggle2FA,
    showArchivedUsers,
    setShowArchivedUsers,
    filteredUserTypes,
}) => {
    const columns = React.useMemo(
        () => createUserTypeColumns(onRowClick, enabled2FAByType, onToggle2FA),
        [onRowClick, enabled2FAByType, onToggle2FA]
    );


    return (
        <div className="tab-table-container" style={{ position: "relative" }}>
            <div className="table-card" style={{ flex: 1 }}>
                <DataTable<UserTypeRow>
                    data={filteredUserTypes}
                    columns={columns}
                    keyField="id"
                    onRowClick={onRowClick}
                    loading={loading}
                    error={error}
                    searchable={true}
                    searchPlaceholder="Search by user type, description..."
                    paginated={true}
                    pageSize={10}
                    pageSizeOptions={[10, 25, 50]}
                    striped={true}
                    hoverable={true}
                    stickyHeader={true}
                    emptyMessage="No user types found"
                    minHeight="100%"
                // toolbarFilters={{
                //     left: (
                //         <div className="kc_toolbarFilters">
                //             <MultiSelectCheckbox<RealmStatus>
                //                 inline
                //                 label="Status"
                //                 options={[
                //                     { value: "Active", label: "Active" },
                //                     { value: "Inactive", label: "Inactive" },
                //                     { value: "Draft", label: "Draft" },
                //                 ]}
                //                 value={ }
                //                 onChange={ }
                //                 placeholder="All"
                //                 portal
                //             />

                //             {/* {realmStatusFilter.length > 0 && (
                //                 <>
                //                     <span className="kc_filterBadge" title={`Status: ${filterLabel}`}>
                //                         Status: {filterLabel}
                //                     </span>

                //                     <button
                //                         type="button"
                //                         className="kc_btn kc_btn_icon"
                //                         title="Clear filters"
                //                         onClick={() => setRealmStatusFilter([])}
                //                         aria-label="Clear filters"
                //                     >
                //                         <X size={16} />
                //                     </button>
                //                 </>
                //             )} */}
                //         </div>
                //     ), right: (),
                // }}
                />
            </div>

            {/* your filter sidebar can stay the same */}
            {isFilterOpen && (
                <div
                    className="tab-table-filters"
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "260px",
                        height: "100%",
                        background: "white",
                        borderLeft: "1px solid #e5e7eb",
                        boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.1)",
                        zIndex: 10,
                        padding: "1rem",
                        overflowY: "auto",
                    }}
                >
                    {/* ... */}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// ROLES TAB CONTENT
// ============================================================================

interface RolesContentProps {
    roles: RealmRole[];
    loading: boolean;
    error: string | null;
    onRowClick: (role: RealmRole) => void;
    isFilterOpen: boolean;
    statusFilter: string;
    roleFilter: string;
    onStatusFilterChange: (value: string) => void;
    onRoleFilterChange: (value: string) => void;
    filteredRoles: RealmRole[];
}

const RolesContent: React.FC<RolesContentProps> = ({
    roles,
    loading,
    error,
    onRowClick,
    isFilterOpen,
    statusFilter,
    roleFilter,
    onStatusFilterChange,
    onRoleFilterChange,
    filteredRoles,
}) => {
    const columns = React.useMemo(
        () => createRoleColumns(onRowClick),
        [onRowClick]
    );

    const uniqueRoles = React.useMemo(() => {
        return [...new Set(roles.map(r => r.name))];
    }, [roles]);

    return (
        <div className="tab-table-container" style={{ position: 'relative' }}>
            <div className="table-card" style={{ flex: 1 }}>
                <DataTable<RealmRole>
                    data={filteredRoles}
                    columns={columns}
                    keyField="id"
                    onRowClick={onRowClick}
                    loading={loading}
                    error={error}
                    searchable={true}
                    searchPlaceholder="Search by role name..."
                    paginated={true}
                    pageSize={10}
                    pageSizeOptions={[10, 25, 50, 100]}
                    striped={true}
                    hoverable={true}
                    stickyHeader={true}
                    emptyMessage="No roles found"
                    minHeight="100%"
                />
            </div>

            {isFilterOpen && (
                <div
                    className="tab-table-filters"
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '260px',
                        height: '100%',
                        background: 'white',
                        borderLeft: '1px solid #e5e7eb',
                        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 10,
                        padding: '1rem',
                        overflowY: 'auto',
                    }}
                >
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                        Filter Options
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                                Roles
                            </label>
                            <select
                                value={roleFilter}
                                onChange={(e) => onRoleFilterChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #d1d5db',
                                    fontSize: '0.875rem',
                                    background: 'white',
                                }}
                            >
                                <option value="All">All</option>
                                {uniqueRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => {
                                onRoleFilterChange('All');
                            }}
                            style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};

// ============================================================================
// CREATE USER CONTENT
// ============================================================================

interface CreateUserContentProps {
    onCancel?: () => void;
    onSave?: (user: UserRow) => void;
    userTypes: UserTypeRow[];
}

const CreateUserContent: React.FC<CreateUserContentProps> = ({ onCancel, onSave, userTypes }) => {
    const [formData, setFormData] = useState<CreateUserDto>({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        department: '',
        userType: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (field: keyof CreateUserDto, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleSubmit = async () => {
        if (!formData.username?.trim()) {
            setError('Username is required');
            return;
        }
        if (!formData.email?.trim()) {
            setError('Email is required');
            return;
        }
        if (!formData.firstName?.trim()) {
            setError('First name is required');
            return;
        }
        if (!formData.lastName?.trim()) {
            setError('Last name is required');
            return;
        }
        if (!formData.userType) {
            setError('User type is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newUser: UserRow = {
                id: String(Date.now()),
                staffId: null,
                role: "User",
                status: "Pending",
                lastLogin: "-",
                isDeleted: false,
                deletedAt: null,

                onboardingStage: "Requested",
                requestedBy: "admin",
                requestedAt: new Date().toISOString(),

                ...formData,
            };

            setSuccess(true);
            if (onSave) {
                onSave(newUser);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e5e7eb'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                        Create New User
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                        Fill in the details below to create a new user
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            <X size={16} />
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: saving ? '#9ca3af' : '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save User'}
                    </button>
                </div>
            </div>

            {success && (
                <div style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <CheckCircle size={16} />
                    User created successfully!
                </div>
            )}

            {error && (
                <div style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#991b1b'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {/* Personal Information */}
                <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} />
                        Personal Information
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>First Name *</label>
                                <input type="text" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} placeholder="John" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Last Name *</label>
                                <input type="text" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} placeholder="Doe" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Username *</label>
                            <input type="text" value={formData.username} onChange={(e) => handleChange('username', e.target.value)} placeholder="john.doe" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={16} />
                        Contact Information
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Email *</label>
                            <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="john.doe@company.com" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Phone</label>
                            <input type="tel" value={formData.phone || ''} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+65 9123 4567" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                        </div>
                    </div>
                </div>

                {/* User Type & Department */}
                <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={16} />
                        User Type & Department
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>User Type *</label>
                            <select value={formData.userType} onChange={(e) => handleChange('userType', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', background: 'white' }}>
                                <option value="">Select a user type</option>
                                {userTypes.map(userType => (
                                    <option key={userType.title} value={userType.title}>{userType.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Department</label>
                            <input type="text" value={formData.department || ''} onChange={(e) => handleChange('department', e.target.value)} placeholder="e.g. Operations" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// DEFAULT TABS CONFIGURATION
// ============================================================================

const DEFAULT_TABS: Tab[] = [
    { id: 'users', title: 'Users', type: 'users', closable: false },
    { id: 'usertypes', title: 'User Types', type: 'usertypes', closable: false },
    { id: 'roles', title: 'Roles', type: 'roles', closable: false },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<UserRow[]>(USERS_DATA);
    // const [roles, setRoles] = useState<UserTypeRow[]>(USER_TYPES_DATA);
    const [usertypes, setUserTypes] = useState<UserTypeRow[]>(USER_TYPES_DATA);
    const [roles, setRoles] = useState<RealmRole[]>(ROLES_DATA);
    const [realms, setRealms] = useState<RealmRow[]>(REALMS_DATA);
    const [realmUserMappings, setRealmUserMappings] = useState<RealmUserMapping[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [enabled2FAByType, setEnabled2FAByType] = useState<Record<string, string[]>>({});
    const onlyActiveUsers = (users: UserRow[] | undefined | null) =>
        (Array.isArray(users) ? users : []).filter((u) => !u.isDeleted);

    const [showArchivedUsers, setShowArchivedUsers] = useState(false);

    useEffect(() => {
        // initialise defaults from user types once
        setEnabled2FAByType((prev) => {
            const next = { ...prev };
            for (const ut of usertypes ?? []) {
                if (!next[ut.id]) next[ut.id] = [...(ut.fa2 ?? [])];
            }
            return next;
        });
    }, [usertypes]);

    const toggle2FA = useCallback((typeId: string, method: string) => {
        setEnabled2FAByType((prev) => {
            const current = new Set(prev[typeId] ?? []);
            current.has(method) ? current.delete(method) : current.add(method);
            return { ...prev, [typeId]: Array.from(current) };
        });
    }, []);

    const [userStatusFilter, setUserStatusFilter] = useState('All');
    const [userTypeFilter, setUserTypeFilter] = useState('All');

    const [roleStatusFilter, setRoleStatusFilter] = useState('All');
    const [roleFilter, setRoleFilter] = useState('All');

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);

    const filteredUsers = useMemo(() => {
        const safeUsers = Array.isArray(users) ? users : [];

        return safeUsers.filter((user) => {
            if (!showArchivedUsers && user.isDeleted) return false;

            if (userStatusFilter !== "All" && user.status !== userStatusFilter) return false;
            if (userTypeFilter !== "All" && user.userType !== userTypeFilter) return false;

            return true;
        });
    }, [users, userStatusFilter, userTypeFilter, showArchivedUsers]);

    const filteredUserTypes = useMemo(() => {
        return usertypes || [];
    }, [usertypes]);

    const filteredRoles = useMemo(() => {
        return roles || [];
    }, [roles]);

    const {
        tabs,
        activeTab,
        setActiveTab,
        addTab,
        closeTab,
        reorderTabs,
    } = useTabs({
        storageKey: 'user-tabs',
        defaultTabs: DEFAULT_TABS,
    });

    const handleRefresh = useCallback(() => {
        setLoading(true);
        // Simulate API refresh
        setTimeout(() => {
            setUsers(USERS_DATA);
            setUserTypes(USER_TYPES_DATA);
            setRoles(ROLES_DATA);
            setLoading(false);
        }, 500);
    }, []);

    const handleUserRowClick = useCallback((user: UserRow) => {
        const existingTabIndex = tabs.findIndex(
            (tab: Tab) => tab.type === 'user-detail' && tab.id === `user-${user.id}`
        );

        if (existingTabIndex !== -1) {
            setActiveTab(existingTabIndex);
        } else {
            addTab({
                id: `user-${user.id}`,
                title: `${user.firstName} ${user.lastName}`,
                type: 'user-detail',
                closable: true,
                content: { userId: user.id },
            });
        }
    }, [tabs, setActiveTab, addTab]);

    const handleRoleRowClick = useCallback((role: RealmRole) => {
        const existingTabIndex = tabs.findIndex(
            (tab: Tab) => tab.type === 'role-detail' && tab.id === `role-${role.id}`
        );

        if (existingTabIndex !== -1) {
            setActiveTab(existingTabIndex);
        } else {
            addTab({
                id: `role-${role.id}`,
                title: role.name,
                type: 'role-detail',
                closable: true,
                content: { roleId: role.id },
            });
        }
    }, [tabs, setActiveTab, addTab]);

    const handleUserTypesRowClick = useCallback((usertypes: UserTypeRow) => {
        const existingTabIndex = tabs.findIndex(
            (tab: Tab) => tab.type === 'usertypes-detail' && tab.id === `usertypes-${usertypes.id}`
        );

        if (existingTabIndex !== -1) {
            setActiveTab(existingTabIndex);
        } else {
            addTab({
                id: `usertypes-${usertypes.id}`,
                title: usertypes.title,
                type: 'usertypes-detail',
                closable: true,
                content: { userTypeId: usertypes.id },
            });
        }
    }, [tabs, setActiveTab, addTab]);

    const handleAddTab = () => {
        const currentTab = tabs[activeTab];

        if (currentTab?.type === 'users' || currentTab?.type === 'user-detail' || currentTab?.type === 'create-user') {
            const existingCreateTab = tabs.findIndex((tab: Tab) => tab.type === 'create-user');
            if (existingCreateTab !== -1) {
                setActiveTab(existingCreateTab);
            } else {
                addTab({
                    id: `create-user-${Date.now()}`,
                    title: 'New User',
                    type: 'create-user',
                    closable: true,
                });
            }
        } else if (currentTab?.type === 'roles' || currentTab?.type === 'role-detail' || currentTab?.type === 'create-role') {
            const existingCreateTab = tabs.findIndex((tab: Tab) => tab.type === 'create-role');
            if (existingCreateTab !== -1) {
                setActiveTab(existingCreateTab);
            } else {
                addTab({
                    id: `create-role-${Date.now()}`,
                    title: 'New Role',
                    type: 'create-role',
                    closable: true,
                });
            }
        } else {
            const existingCreateTab = tabs.findIndex((tab: Tab) => tab.type === 'create-usertypes');
            if (existingCreateTab !== -1) {
                setActiveTab(existingCreateTab);
            } else {
                addTab({
                    id: `create-usertypes-${Date.now()}`,
                    title: 'New User Type',
                    type: 'create-usertypes',
                    closable: true,
                });
            }
        }
    };

    const handleBackToUsers = () => {
        const usersIndex = tabs.findIndex((tab: Tab) => tab.type === 'users');
        if (usersIndex !== -1) {
            setActiveTab(usersIndex);
        }
    };

    const handleBackToUserTypes = () => {
        const rolesIndex = tabs.findIndex((tab: Tab) => tab.type === 'usertypes');
        if (rolesIndex !== -1) {
            setActiveTab(rolesIndex);
        }
    };

    // Determine add button label based on active tab
    const getAddButtonLabel = () => {
        const currentTab = tabs[activeTab];
        if (currentTab?.type === 'usertypes' || currentTab?.type === 'usertypes-detail') {
            return 'New User Type';
        }
        return 'New User';
    };

    const updateUser = useCallback((id: string, patch: Partial<UserRow>) => {
        setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)));
    }, []);

    const approveUser = useCallback((id: string) => {
        updateUser(id, {
            onboardingStage: "Approved",
            approvedBy: "admin",
            approvedAt: new Date().toISOString(),
        });
    }, [updateUser]);

    const verifyUser = useCallback((id: string) => {
        updateUser(id, {
            onboardingStage: "Verified",
            verifiedBy: "admin",
            verifiedAt: new Date().toISOString(),
        });
    }, [updateUser]);

    const activateUser = useCallback((id: string) => {
        updateUser(id, {
            onboardingStage: "Activated",
            status: "Active",
        });
    }, [updateUser]);

    const rejectUser = useCallback((id: string, reason?: string) => {
        updateUser(id, {
            onboardingStage: "Rejected",
            status: "Inactive",
            rejectedBy: "admin",
            rejectedAt: new Date().toISOString(),
            onboardingReason: reason ?? "Rejected",
        });
    }, [updateUser]);

    const assignUserToRealm = useCallback((userId: string, realmId: string, roleId: string) => {
        setRealmUserMappings(prev => {
            const existing = prev.find(m => m.userId === userId && m.realmId === realmId);

            if (!existing) return [...prev, { userId, realmId, roleIds: [roleId] }];

            const nextRoles = Array.from(new Set([...(existing.roleIds ?? []), roleId]));
            return prev.map(m =>
                m.userId === userId && m.realmId === realmId
                    ? { ...m, roleIds: nextRoles }
                    : m
            );
        });
    }, []);

    const unassignRealmRole = useCallback((userId: string, realmId: string, roleId: string) => {
        setRealmUserMappings(prev =>
            prev
                .map(m => {
                    if (m.userId !== userId || m.realmId !== realmId) return m;
                    const next = (m.roleIds ?? []).filter(r => r !== roleId);
                    return { ...m, roleIds: next };
                })
                .filter(m => m.roleIds.length > 0) // if no roles left, remove mapping
        );
    }, []);

    const removeUserFromRealm = useCallback((userId: string, realmId: string) => {
        setRealmUserMappings(prev => prev.filter(m => !(m.userId === userId && m.realmId === realmId)));
    }, []);

    const removeRoleFromRealmUser = useCallback((userId: string, realmId: string, roleId: string) => {
        setRealmUserMappings(prev =>
            prev
                .map(m => {
                    if (m.userId !== userId || m.realmId !== realmId) return m;
                    const next = (m.roleIds ?? []).filter(r => r !== roleId);
                    return { ...m, roleIds: next };
                })
                .filter(m => m.roleIds.length > 0) // if no roles left, remove mapping
        );
    }, []);

    const renderTabContent = (tab: Tab, _index: number): React.ReactNode => {
        switch (tab.type) {
            case 'users':
                return (
                    <UsersContent
                        users={showArchivedUsers ? users : onlyActiveUsers(users)}
                        loading={loading}
                        error={error}
                        onRowClick={handleUserRowClick}
                        isFilterOpen={isFilterOpen}
                        statusFilter={userStatusFilter}
                        userTypeFilter={userTypeFilter}
                        onStatusFilterChange={setUserStatusFilter}
                        onUserTypesFilterChange={setUserTypeFilter}
                        showArchivedUsers={showArchivedUsers}
                        setShowArchivedUsers={setShowArchivedUsers}
                        filteredUsers={filteredUsers}
                    />
                );
            case 'usertypes':
                return (
                    <UserTypeContent
                        usertypes={usertypes}
                        loading={loading}
                        error={error}
                        onRowClick={handleUserTypesRowClick}
                        isFilterOpen={isFilterOpen}
                        statusFilter={roleStatusFilter}
                        onStatusFilterChange={setRoleStatusFilter}
                        enabled2FAByType={enabled2FAByType}
                        onToggle2FA={toggle2FA}
                        showArchivedUsers={showArchivedUsers}
                        setShowArchivedUsers={setShowArchivedUsers}
                        filteredUserTypes={filteredUserTypes}
                    />
                );
            case 'user-detail': {
                const { userId } = tab.content as { userId: string };
                const user = (users ?? []).find(u => u.id === userId);

                const realmMappingsForUser =
                    realmUserMappings.filter(m => m.userId === userId);

                if (!user) return <div>User not found</div>;

                return (
                    <UserDetailContent
                        user={user}
                        realms={realms}
                        roles={roles}
                        realmUserMappings={realmMappingsForUser}
                        assignRealmRole={assignUserToRealm}
                        unassignRealmRole={unassignRealmRole}
                        removeUserFromRealm={removeUserFromRealm}
                        removeRoleFromRealmUser={removeRoleFromRealmUser}
                        onBack={handleBackToUsers}
                        approveUser={approveUser}
                        verifyUser={verifyUser}
                        activateUser={activateUser}
                        rejectUser={rejectUser}
                    />
                );
            }
            case 'usertypes-detail':
                return (
                    <UserTypesDetailContent
                        usertype={tab.content as UserTypeRow}
                        onBack={handleBackToUserTypes}
                        enabled2FAByType={enabled2FAByType}
                        onToggle2FA={toggle2FA}
                        filteredUserTypes={filteredUserTypes}
                    />
                );
            case 'create-user':
                return (
                    <CreateUserContent
                        userTypes={usertypes}
                        onCancel={() => {
                            const tabIndex = tabs.findIndex((t: Tab) => t.id === tab.id);
                            if (tabIndex !== -1) {
                                closeTab(tabIndex);
                            }
                        }}
                        onSave={(newUser) => {
                            setUsers(prev => [...prev, newUser]);
                            const tabIndex = tabs.findIndex((t: Tab) => t.id === tab.id);
                            if (tabIndex !== -1) {
                                closeTab(tabIndex);
                                handleUserRowClick(newUser);
                            }
                        }}
                    />
                );
            case 'roles':
                return (
                    <RolesContent
                        roles={roles}
                        loading={loading}
                        error={error}
                        onRowClick={handleRoleRowClick}
                        isFilterOpen={isRoleFilterOpen}
                        roleFilter={roleFilter}
                        onRoleFilterChange={setRoleFilter}
                        filteredRoles={filteredRoles}
                    />
                );
            case 'role-detail':
                return (
                    <RoleDetailContent
                        role={tab.content as RealmRole}
                        onCancel={() => {
                            const tabIndex = tabs.findIndex((t: Tab) => t.id === tab.id);
                            if (tabIndex !== -1) {
                                closeTab(tabIndex);
                            }
                        }}
                        onSave={(newRole) => {
                            setRoles(prev => [...prev, newRole]);
                            const tabIndex = tabs.findIndex((t: Tab) => t.id === tab.id);
                            if (tabIndex !== -1) {
                                closeTab(tabIndex);
                                handleRoleRowClick(newRole);
                            }
                        }}
                    />
                );
            default:
                return (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                        Content for "{tab.title}"
                    </div>
                );
        }
    };

    return (
        <div className="users-page-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="users-tab-wrapper" style={{ flex: 1, minHeight: 0 }}>
                <TabPanel
                    tabs={tabs}
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                    onAdd={handleAddTab}
                    onClose={closeTab}
                    onReorder={reorderTabs}
                    onRefresh={handleRefresh}
                    onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
                    isFilterOpen={isFilterOpen}
                    showActions={false}
                    addButtonLabel={getAddButtonLabel()}
                    renderContent={renderTabContent}
                    minHeight="100%"
                />
            </div>
        </div>
    );
};

export default UsersPage;