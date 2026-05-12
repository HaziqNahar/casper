import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import ConfirmDialog, { type ConfirmState } from "./ConfirmDialog";
import RealmApplicationDetailContent from "./RealmApplicationDetailContent";
import RealmManageDialog from "./RealmManageDialog";
import RealmUsersTabContent from "./RealmUsersTabContent";
import {
    createAppAccessUsersColumns,
    createAppColumns,
    createGrantAccessColumns,
    createRealmUsersColumns,
} from "./realmDetailColumns";
import { realmStatusIcon, realmStatusVariant } from "./realmStatus";
import {
    type RealmAppUsersMap,
    type RealmMembership,
    type RealmRole,
    type RealmRoleId,
    type RealmUserViewRow,
    type UserForm,
    type UserPanelMode,
} from "./realmTypes";
import { AppRow, RealmRow, UserRow } from "../../types";
import { ROUTES } from "../../config/routes";
import {
  ArrowLeft,
  Globe,
  Layers,
  Shield,
  Users as UsersIcon,
} from "lucide-react";

// ============================================================================
// REALM DETAIL TAB (Users + Add User + Create User + Applications)
// ============================================================================

type RealmDetailTab = "users" | "applications";

const makeUuid = () => `u-${Math.random().toString(16).slice(2)}-${Date.now()}`;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const STAFF_ID_PATTERN = /^[A-Za-z0-9]+$/;
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const RealmDetailContent: React.FC<{
    realm: RealmRow;
    allUsers: UserRow[];
    realmMemberships: RealmMembership[];
    roles: RealmRole[];
    appsInRealm: AppRow[];

    appUsers: RealmAppUsersMap;
    pendingAppAccessRequests?: Record<string, string>;
    onGrantAppUser: (appId: string, userUuid: string, input?: { justification?: string }) => void;
    onRevokeAppUser: (appId: string, userUuid: string) => void;

    onBack?: () => void;
    onRemoveUser: (userUuid: string) => void;
    onCreateUser: (newUser: UserRow) => Promise<boolean>;
    onUpdateRealm: (patch: Partial<RealmRow> & { reason?: string; confirmationMode?: string }) => Promise<boolean>;
    onToast: (message: string, type: "success" | "error" | "warning" | "info") => void;
    onConfirmSensitiveAction: (password?: string) => Promise<void>;
    isSuperAdmin?: boolean;
}> = ({
    realm,
    allUsers,
    realmMemberships,
    roles,
    appsInRealm,
    appUsers,
    pendingAppAccessRequests = {},
    onRevokeAppUser,
    onGrantAppUser,
    onBack,
    onRemoveUser,
    onCreateUser,
    onUpdateRealm,
    onToast,
    onConfirmSensitiveAction,
    isSuperAdmin = false }) => {
        const [tab, setTab] = useState<RealmDetailTab>("users");
        const [userPanelMode, setUserPanelMode] = useState<UserPanelMode>("closed");

        const [showManage, setShowManage] = useState(false);
        const [errors, setErrors] = useState<Partial<Record<keyof UserForm, string>>>({});
        const [isSubmittingLocalUser, setIsSubmittingLocalUser] = useState(false);
        const [isSavingRealm, setIsSavingRealm] = useState(false);
        const [manageError, setManageError] = useState<string | null>(null);

        const [updatingUsers] = useState<Set<string>>(new Set());
        const navigate = useNavigate();
        const [draft, setDraft] = useState(() => ({
            status: realm.status,
            mfaRequired: realm.mfaRequired ?? true,
            passwordInheritance: realm.passwordInheritance ?? "inherit",
            sessionTimeoutMins: realm.sessionTimeoutMins ?? 30,
        }));

        const [formError, setFormError] = useState<string | null>(null);

        const openPanel = useCallback((mode: Exclude<UserPanelMode, "closed">) => {
            setUserPanelMode(mode);
            setFormError(null);
            setErrors({});
        }, []);

        const closePanel = useCallback(() => {
            setUserPanelMode("closed");
        }, []);

        const isDirty =
            draft.status !== realm.status ||
            draft.mfaRequired !== realm.mfaRequired ||
            draft.passwordInheritance !== realm.passwordInheritance ||
            draft.sessionTimeoutMins !== realm.sessionTimeoutMins;

        const handleCloseManage = () => {
            if (isSavingRealm) return;

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

        const openConfirm = useCallback((next: Omit<ConfirmState, "open">) => {
            setConfirm({ open: true, ...next });
        }, [setConfirm]);

        const closeConfirm = () => setConfirm((p) => ({ ...p, open: false }));

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

        const handleChangeRole = useCallback(
            async (userUuid: string, roleId: RealmRoleId) => {
                const u = usersInRealm.find((x) => x.uuid === userUuid);

                // Navigate to workflow instead of direct grant
                navigate(
                    `${ROUTES.REALM_ACCESS_REQUEST}` +
                    `?realmId=${encodeURIComponent(realm.id)}` +
                    `&realmName=${encodeURIComponent(realm.name)}` +
                    `&targetUser=${encodeURIComponent(u?.username ?? userUuid)}` +
                    `&roleRequested=${encodeURIComponent(roleId)}` +
                    `&currentRoleId=${encodeURIComponent(u?.roleId ?? "")}`
                );

                onToast("Redirected to access workflow (no direct grants).", "info");
            },
            [navigate, realm.id, realm.name, usersInRealm, onToast]
        );

        const userFilter = "all";

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
                createRealmUsersColumns(roles, handleChangeRole, (userId) => {
                    navigate(`${ROUTES.USERS}?userId=${encodeURIComponent(userId)}`);
                }, (uuid) => {
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
            [roles, usersInRealm, realm.name, updatingUsers, openConfirm, handleChangeRole, onRemoveUser, navigate]
        );

        // Create user form
        const [form, setForm] = useState<UserForm>({
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
            justification: "",
            status: "Active",
        });

        const handleInputChange = (field: keyof UserForm, value: string) => {
            setForm(prev => ({ ...prev, [field]: value }));
            setFormError(null);

            if (errors[field]) {
                setErrors(prev => ({ ...prev, [field]: undefined }));
            }
        };

        const [selectedApp, setSelectedApp] = useState<AppRow | null>(null);

        const [showGrant, setShowGrant] = useState(false);
        const [grantQuery, setGrantQuery] = useState("");
        const [showSecret, setShowSecret] = useState(false);

        const openManagePanel = useCallback(() => {
            setDraft({
                status: realm.status,
                mfaRequired: realm.mfaRequired ?? true,
                passwordInheritance: realm.passwordInheritance ?? "inherit",
                sessionTimeoutMins: realm.sessionTimeoutMins ?? 30,
            });
            setShowManage(true);
        }, [realm]);

        const handleSelectApp = useCallback((app: AppRow) => {
            setSelectedApp(app);
        }, []);

        const appColumns = useMemo(
            () => createAppColumns(handleSelectApp),
            [handleSelectApp]
        );

        const accessColumns = useMemo(
            () => createAppAccessUsersColumns((userUuid) => onRevokeAppUser(selectedApp?.id ?? "", userUuid)),
            [onRevokeAppUser, selectedApp]
        );

        const grantColumns = useMemo(
            () =>
                createGrantAccessColumns((userUuid) => {
                    if (!selectedApp) return;
                    const user = usersInRealm.find((candidate) => candidate.uuid === userUuid);
                    if (!user) return;

                    openConfirm({
                        title: "Request application access?",
                        message: `Submit a governed access request for ${user.firstName} ${user.lastName} to use ${selectedApp.name}.`,
                        details: [
                            `Realm: ${realm.name}`,
                            `Application: ${selectedApp.name}`,
                            `User: ${user.firstName} ${user.lastName}`.trim(),
                        ],
                        confirmText: "Submit request",
                        cancelText: "Cancel",
                        requireJustification: true,
                        justificationLabel: "Why does this user need access?",
                        justificationHelperText: "This reason will be stored in the approval queue and audit trail.",
                        justificationPlaceholder: "Enter the business reason for granting application access",
                        onConfirm: ({ justification }) => onGrantAppUser(selectedApp.id, userUuid, { justification }),
                    });
                }),
            [onGrantAppUser, openConfirm, realm.name, selectedApp, usersInRealm]
        );

        const selectedAppUserUuids = useMemo(
            () => (selectedApp ? appUsers?.[`${realm.id}::${selectedApp.id}`] ?? [] : []),
            [appUsers, realm.id, selectedApp]
        );

        const selectedAppUserSet = useMemo(
            () => new Set(selectedAppUserUuids),
            [selectedAppUserUuids]
        );

        const usersWithSelectedAppAccess = useMemo(
            () => usersInRealm.filter((user) => selectedAppUserSet.has(user.uuid)),
            [usersInRealm, selectedAppUserSet]
        );

        const eligibleUsersToGrant = useMemo(() => {
            const query = grantQuery.trim().toLowerCase();

            return usersInRealm
                .filter((user) => !selectedAppUserSet.has(user.uuid))
                .map((user) => ({
                    ...user,
                    appAccessRequestStatus: selectedApp
                        ? pendingAppAccessRequests[`${realm.id}:${selectedApp.id}:${user.uuid}`] ?? ""
                        : "",
                }))
                .filter((user) => {
                    if (!query) return true;

                    return (
                        `${user.firstName} ${user.lastName}`.toLowerCase().includes(query) ||
                        user.username.toLowerCase().includes(query) ||
                        user.email.toLowerCase().includes(query) ||
                        (user.staffId ?? "").toLowerCase().includes(query)
                    );
                });
        }, [usersInRealm, selectedAppUserSet, grantQuery, selectedApp, pendingAppAccessRequests, realm.id]);

        const isActive = draft.status === "Active";

        const createLocalUserInRealm = async (
            form: {
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
                justification: string;
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
            const justification = form.justification.trim();

            if (!roleIdToUse) {
                onToast("Please select a requested realm role", "warning");
                return false;
            }

            if (!justification) {
                onToast("Please enter a justification", "warning");
                return false;
            }

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
                userType: "local_user",
                localRealmId: realm.id,
                phone,
                organization,
                department,
                staffType,
                group,
            };

            const created = await onCreateUser(newUser);
            if (!created) {
                return false;
            }
            return true;
        };


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
            if (!form.roleId) next.roleId = "Requested realm role is required";
            if (!form.group) next.group = "Group is required";
            if (!form.staffType) next.staffType = "Staff type is required";
            if (!form.department) next.department = "Department is required";
            if (!form.organization) next.organization = "Organization is required";
            if (!form.phone.trim()) next.phone = "Phone number is required";
            if (!form.justification.trim()) next.justification = "Justification is required";

            if (form.staffId.trim() && !STAFF_ID_PATTERN.test(form.staffId.trim())) next.staffId = "Staff Id can only contain letters and numbers";
            if (form.username.trim() && !USERNAME_PATTERN.test(form.username.trim())) next.username = "Username can only contain letters, numbers, dots, underscores, and hyphens";
            if (form.firstName.trim() && !NAME_PATTERN.test(form.firstName.trim())) next.firstName = "First name contains invalid characters";
            if (form.lastName.trim() && !NAME_PATTERN.test(form.lastName.trim())) next.lastName = "Last name contains invalid characters";
            if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) next.email = "Invalid email format";

            setErrors(next);
            return Object.keys(next).length === 0;
        };

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
                                onClick={openManagePanel}
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
                        <RealmUsersTabContent
                            realmId={realm.id}
                            realmName={realm.name}
                            realmStatus={realm.status}
                            stats={stats}
                            users={filteredUsersInRealm}
                            userColumns={userColumns}
                            userPanelMode={userPanelMode}
                            formError={formError}
                            submitting={isSubmittingLocalUser}
                            errors={errors}
                            form={form}
                            roles={roles}
                            onRequestAccess={() =>
                                navigate(
                                    `${ROUTES.REALM_ACCESS_REQUEST}?realmId=${encodeURIComponent(realm.id)}&realmName=${encodeURIComponent(realm.name)}`
                                )
                            }
                            onOpenPanel={openPanel}
                            onClosePanel={closePanel}
                            onFieldChange={handleInputChange}
                            onClear={() => {
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
                                    justification: "",
                                    status: "Active",
                                });
                            }}
                            onSubmit={async () => {
                                setFormError(null);

                                if (!validateCreateLocalUser()) {
                                    setFormError("Please fix the highlighted fields");
                                    return;
                                }

                                try {
                                    setIsSubmittingLocalUser(true);
                                    const created = await createLocalUserInRealm(
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
                                            justification: form.justification,
                                        },
                                        form.roleId as RealmRoleId
                                    );

                                    if (!created) return;

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
                                        justification: "",
                                        status: "Active",
                                    });
                                    closePanel();
                                } finally {
                                    setIsSubmittingLocalUser(false);
                                }
                            }}
                        />
                    )}

                    {
                        tab === "applications" && (
                            <>
                                {selectedApp ? (
                                    <RealmApplicationDetailContent app={selectedApp} onBack={() => setSelectedApp(null)}
                                        usersWithAccess={usersWithSelectedAppAccess}
                                        eligibleToGrant={eligibleUsersToGrant}
                                        accessColumns={accessColumns}
                                        grantColumns={grantColumns}
                                        showGrant={showGrant}
                                        grantQuery={grantQuery}
                                        showSecret={showSecret}
                                        onToggleGrant={() => {
                                            if (showGrant) setGrantQuery("");
                                            setShowGrant((state) => !state);
                                        }}
                                        onGrantQueryChange={setGrantQuery}
                                        onToggleSecret={() => setShowSecret((state) => !state)} />
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
                <RealmManageDialog
                    realmName={realm.name}
                    open={showManage}
                    draft={draft}
                    isDirty={isDirty}
                    isActive={isActive}
                    saving={isSavingRealm}
                    error={manageError}
                    onClose={handleCloseManage}
                    onDraftChange={(value) => {
                        setManageError(null);
                        setDraft(value);
                    }}
                    onToggleStatus={() => {
                        openConfirm({
                            title: isActive ? (isSuperAdmin ? "Deactivate realm?" : "Request realm deactivation?") : "Activate realm?",
                            message: isActive
                                ? isSuperAdmin
                                    ? `You are about to deactivate ${realm.name}.`
                                    : `Submit a super admin approval request to deactivate ${realm.name}.`
                                : "This will set the realm to Active.",
                            details: isActive
                                ? [
                                    `${usersInRealm.length} user${usersInRealm.length === 1 ? "" : "s"} currently assigned`,
                                    `${appsInRealm.length} application${appsInRealm.length === 1 ? "" : "s"} linked to this realm`,
                                    isSuperAdmin
                                        ? "Users in this realm may lose access to linked applications"
                                        : "Users in this realm may lose access to linked applications once the request is approved",
                                ]
                                : undefined,
                            confirmText: isActive ? (isSuperAdmin ? "Deactivate" : "Submit approval request") : "Activate",
                            cancelText: "Cancel",
                            danger: isActive,
                            confirmLabel: isActive
                                ? isSuperAdmin
                                    ? `Type "${realm.name}" to confirm deactivation`
                                    : `Type "${realm.name}" to confirm this approval request`
                                : undefined,
                            confirmMatchText: isActive ? realm.name : undefined,
                            confirmHelperText: isActive
                                ? isSuperAdmin
                                    ? "This safeguard helps prevent accidental deactivation."
                                    : "This request will be routed to a super admin for review."
                                : undefined,
                            requirePassword: isActive && isSuperAdmin,
                            passwordLabel: isActive && isSuperAdmin ? "Re-enter your password to deactivate this realm" : undefined,
                            passwordHelperText: isActive && isSuperAdmin ? "This action affects access across the realm and linked applications." : undefined,
                            requireJustification: isActive,
                            justificationLabel: isActive ? (isSuperAdmin ? "Why are you deactivating this realm?" : "Why are you requesting deactivation?") : undefined,
                            justificationHelperText: isActive ? "This reason will be stored in the audit trail." : undefined,
                            justificationPlaceholder: isActive
                                ? isSuperAdmin
                                    ? "Enter the business reason for deactivation"
                                    : "Enter the business reason for this approval request"
                                : undefined,
                            onConfirm: ({ password, justification }) => {
                                void (async () => {
                                    try {
                                        setIsSavingRealm(true);
                                        setManageError(null);
                                        if (isActive && isSuperAdmin) {
                                            await onConfirmSensitiveAction(password);
                                        }
                                        const saved = await onUpdateRealm({
                                            status: isActive ? "Inactive" : "Active",
                                            reason: justification,
                                            confirmationMode: isActive
                                                ? (isSuperAdmin ? "password_reentry" : "super_admin_request")
                                                : "admin_action",
                                        });
                                        if (!saved) {
                                            setManageError(`Failed to ${isActive ? (isSuperAdmin ? "deactivate" : "submit approval request for") : "activate"} realm.`);
                                            return;
                                        }
                                        onToast(
                                            isActive
                                                ? (isSuperAdmin ? "Realm deactivated" : "Deactivation request submitted for super admin approval")
                                                : "Realm activated",
                                            isActive ? (isSuperAdmin ? "info" : "success") : "success"
                                        );
                                        setShowManage(false);
                                    } finally {
                                        setIsSavingRealm(false);
                                    }
                                })();
                            },
                        });
                    }}
                    onSave={() => {
                        void (async () => {
                            try {
                                setIsSavingRealm(true);
                                setManageError(null);
                                const saved = await onUpdateRealm({
                                    status: draft.status,
                                    mfaRequired: draft.mfaRequired,
                                    passwordInheritance: draft.passwordInheritance,
                                    sessionTimeoutMins: draft.sessionTimeoutMins,
                                });
                                if (!saved) {
                                    setManageError("Failed to update realm settings.");
                                    return;
                                }
                                onToast("Realm updated successfully", "success");
                                setShowManage(false);
                            } finally {
                                setIsSavingRealm(false);
                            }
                        })();
                    }}
                />
                <ConfirmDialog state={confirm} onClose={closeConfirm} />
            </>
        );
    };

export default RealmDetailContent;