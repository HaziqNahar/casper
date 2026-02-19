import React, { useState, useEffect, useCallback, useMemo } from "react";

import TabPanel from "../../components/common/tabs/TabPanel";
import DataTable2, { TableColumn } from "../../components/common/DataTable";
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

import { Badge, LinkCell } from "../../components/common/Bagde";

export interface UserRow {
    id: string;
    staffId?: string | null;

    username: string;
    email: string;
    firstName: string;
    lastName: string;

    role: string;
    userType: string;
    department?: string;
    status: 'Active' | 'Inactive' | 'Pending';
    lastLogin?: string;

    isDeleted?: boolean;
    deletedAt?: string | null;
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

export interface RoleRow {
    id: string;
    title: string;
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
        id: "2b2f5b9b-6b2b-4ae9-9f7a-4f4f8f8b0c01",
        staffId: "S123",
        username: "admin",
        email: "admin@bos.sg",
        firstName: "Admin",
        lastName: "User",
        role: "Administrator",
        userType: "Certis Full User",
        department: "IT",
        status: "Active",
        lastLogin: "19 Dec 2025, 03:30 pm",
        isDeleted: false,
        deletedAt: null,
    },
    {
        id: "f6c3a0a4-2e1b-46d3-8e0e-8a3b8b6a6a11",
        staffId: "S234",
        username: "john.doe",
        email: "john.doe@bos.sg",
        firstName: "John",
        lastName: "Doe",
        role: "User",
        userType: "Certis Half User",
        department: "Operations",
        status: "Active",
        lastLogin: "19 Dec 2025, 02:20 pm",
        isDeleted: false,
        deletedAt: null,
    },
    {
        id: "c2de49b3-0c8e-4f3b-9b1d-9b22a9cb9e12",
        staffId: "S345",
        username: "jane.smith",
        email: "jane.smith@bos.sg",
        firstName: "Jane",
        lastName: "Smith",
        role: "User",
        userType: "Certis Contractor",
        department: "Operations",
        status: "Active",
        lastLogin: "18 Dec 2025, 04:45 pm",
        isDeleted: false,
        deletedAt: null,
    },
    {
        id: "91a1d9e6-2f74-4a91-9c94-1e2b9c4a77c1",
        staffId: "S456",
        username: "mike.tan",
        email: "mike.tan@bos.sg",
        firstName: "Mike",
        lastName: "Tan",
        role: "User",
        userType: "External User",
        department: "Finance",
        status: "Inactive",
        lastLogin: "-",
        isDeleted: false,
        deletedAt: null,
    },
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
        isDeleted: false,
        deletedAt: null,
    },
    {
        id: "e3f0a6c1-1f3a-4d1f-9c8f-9b02f45a7710",
        staffId: "S678",
        username: "alex.wong",
        email: "alex.wong@bos.sg",
        firstName: "Alex",
        lastName: "Wong",
        role: "User",
        userType: "Local User",
        department: "Operations",
        status: "Inactive",
        lastLogin: "10 Oct 2025, 09:10 am",
        isDeleted: true,
        deletedAt: "2025-11-01T00:00:00.000Z",
    },
    {
        id: "7c19f82d-6d89-4c25-b5b7-1b0d4b3b1abc",
        staffId: "S901",
        username: "alex.wong",
        email: "alex.wong@bos.sg",
        firstName: "Alex",
        lastName: "Wong",
        role: "User",
        userType: "Local User",
        department: "Operations",
        status: "Active",
        lastLogin: "20 Dec 2025, 10:05 am",
        isDeleted: false,
        deletedAt: null,
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

const ROLES_DATA: RoleRow[] = [
    {
        id: "admin",
        title: "Administrator",
    },
    {
        id: "user",
        title: "User",
    },
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
            key: 'status',
            label: 'Status',
            width: '130px',
            render: (value) => (
                <Badge variant={getStatusVariant(value as string)}>
                    <span className="kc-badge">
                        {getStatusIcon(value as string)}
                        {value as string}
                    </span>
                </Badge>
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
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.375rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '0.25rem',
                        color: '#2563eb',
                        cursor: 'pointer',
                    }}
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
    onView: (row: RoleRow) => void
): TableColumn<RoleRow>[] => [
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
    onBack?: () => void;
}

const UserDetailContent: React.FC<UserDetailContentProps> = ({ user, onBack }) => {
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
            </div>
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
    role: RoleRow;
}

const RoleDetailContent: React.FC<RoleDetailProps> = ({ role }) => {
    return (
        <div>
            <h2>{role.title}</h2>
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
    onRowClick: (user: UserTypeRow) => void;
    isFilterOpen: boolean;
    statusFilter: string;
    roleFilter: string;
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
    roleFilter,
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
                <DataTable2<UserRow>
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
                                value={roleFilter}
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
                <DataTable2<UserTypeRow>
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
    roles: RoleRow[];
    loading: boolean;
    error: string | null;
    onRowClick: (role: RoleRow) => void;
    isFilterOpen: boolean;
    statusFilter: string;
    roleFilter: string;
    onStatusFilterChange: (value: string) => void;
    onRoleFilterChange: (value: string) => void;
    filteredRoles: RoleRow[];
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
        return [...new Set(roles.map(r => r.title))];
    }, [roles]);

    return (
        <div className="tab-table-container" style={{ position: 'relative' }}>
            <div className="table-card" style={{ flex: 1 }}>
                <DataTable2<RoleRow>
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
                id: Date.now(),
                ...formData,
                status: 'Pending',
                createdAt: new Date().toISOString(),
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
                                {userTypes.filter(userType => userType.status === 'Active').map(userType => (
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

const AppsPage: React.FC = () => {
    const [users, setUsers] = useState<UserRow[]>(USERS_DATA);
    // const [roles, setRoles] = useState<UserTypeRow[]>(USER_TYPES_DATA);
    const [usertypes, setUserTypes] = useState<UserTypeRow[]>(USER_TYPES_DATA);
    const [roles, setRoles] = useState<RoleRow[]>(ROLES_DATA);
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
                content: user,
            });
        }
    }, [tabs, setActiveTab, addTab]);

    const handleRoleRowClick = useCallback((role: RoleRow) => {
        const existingTabIndex = tabs.findIndex(
            (tab: Tab) => tab.type === 'role-detail' && tab.id === `role-${role.id}`
        );

        if (existingTabIndex !== -1) {
            setActiveTab(existingTabIndex);
        } else {
            addTab({
                id: `role-${role.id}`,
                title: role.title,
                type: 'role-detail',
                closable: true,
                content: role,
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
                content: usertypes,
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
                        onUserTypeFilterChange={setUserTypeFilter}
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
            case 'user-detail':
                return (
                    <UserDetailContent
                        user={tab.content as UserRow}
                        onBack={handleBackToUsers}
                    />
                );
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
                        role={tab.content as RoleRow}
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
                    showActions={true}
                    addButtonLabel={getAddButtonLabel()}
                    renderContent={renderTabContent}
                    minHeight="100%"
                />
            </div>
        </div>
    );
};

export default AppsPage;