import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";

import TabPanel from "../../components/common/tabs/TabPanel";
import { useTabs } from "../../hooks/useTabs";
import type { Tab } from "../../hooks/useTabs";
import { ApiError } from "../../services/apiClient";
import { usersApi, type UpdateAdminUserRequest, type UserStatusResponse } from "../../services/usersApi";
import { useToast } from "../../context/ToastContext";
import CreateUserPanel from "./CreateUserPanel";
import RoleDetailContent from "./RoleDetailContent";
import RolesContent from "./RolesContent";
import ExtractedUserDetailContent from "./UserDetailContent";
import UserTypesDetailContent from "./UserTypesDetailContent";
import UserTypesContent from "./UserTypesContent";
import UsersContent from "./UsersContent";
import { ROLES_DATA, USER_TYPES_DATA } from "./usersPageData";
import {
    applyUserPatch,
    buildActivatedPatch,
    buildApprovedPatch,
    buildRejectedPatch,
    buildVerifiedPatch,
    getUserDisplayName,
} from "./usersPageActions";
import { filterUsers, parseSelectedFilterValues } from "./usersPageFilters";
import { mapAdminUserToUserRow } from "./usersPageHelpers";
import { findTabIndexByType, getCreateTabConfig, getUsersAddButtonLabel } from "./usersPageTabs";
import type {
    OnboardingStage,
    RealmRole,
    UserRow,
    UserTypeRow,
} from "./usersPageTypes";
import { ROUTES } from "../../config/routes";


// ============================================================================
// USERS TAB CONTENT
// ============================================================================

// ============================================================================
// USER TYPES TAB CONTENT
// ============================================================================

// ============================================================================
// ROLES TAB CONTENT
// ============================================================================

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
    const { pushToast } = useToast();
    const location = useLocation();
    const [users, setUsers] = useState<UserRow[]>([]);
    const [usertypes] = useState<UserTypeRow[]>(USER_TYPES_DATA);
    const [roles] = useState<RealmRole[]>(ROLES_DATA);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [enabled2FAByType, setEnabled2FAByType] = useState<Record<string, string[]>>({});
    const [showArchivedUsers] = useState(false);

    useEffect(() => {
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
            if (current.has(method)) {
                current.delete(method);
            } else {
                current.add(method);
            }
            return { ...prev, [typeId]: Array.from(current) };
        });
    }, []);

    const [userStatusFilter, setUserStatusFilter] = useState('All');
    const [userTypeFilter, setUserTypeFilter] = useState('All');

    const [roleFilter, setRoleFilter] = useState('All');
    const initializedUsersTabRef = useRef(false);
    const handledUsersResetRef = useRef<number | null>(null);
    const handledDeepLinkedUserRef = useRef<string | null>(null);

    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const selectedStatusFilters = useMemo(
        () => parseSelectedFilterValues(userStatusFilter),
        [userStatusFilter]
    );

    const selectedUserTypeFilters = useMemo(
        () => parseSelectedFilterValues(userTypeFilter),
        [userTypeFilter]
    );

    const filteredUsers = useMemo(() => {
        const safeUsers = Array.isArray(users) ? users : [];
        return filterUsers(safeUsers, selectedStatusFilters, selectedUserTypeFilters, showArchivedUsers);
    }, [users, selectedStatusFilters, selectedUserTypeFilters, showArchivedUsers]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get("status");
        setUserStatusFilter(status && status.trim().length > 0 ? status : "All");
    }, [location.search]);
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
        updateTab,
    } = useTabs({
        storageKey: 'user-tabs',
        defaultTabs: DEFAULT_TABS,
    });


    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get("status");
        const deepLinkedUserId = params.get("userId");
        if (deepLinkedUserId) return;
        if (!status) return;
        const usersIndex = tabs.findIndex((tab: Tab) => tab.type === 'users');
        if (usersIndex !== -1) setActiveTab(usersIndex);
    }, [location.search, tabs, setActiveTab]);

    useEffect(() => {
        const usersIndex = tabs.findIndex((tab: Tab) => tab.type === "users");
        if (usersIndex === -1) return;

        const params = new URLSearchParams(location.search);
        const deepLinkedUserId = params.get("userId");
        if (deepLinkedUserId) return;

        const state = location.state as { resetUsersToList?: number } | null;
        const resetToken = state?.resetUsersToList ?? null;
        const shouldReset = resetToken !== null && handledUsersResetRef.current !== resetToken;
        const shouldInitialize = location.pathname === ROUTES.USERS && !initializedUsersTabRef.current;

        if (!shouldReset && !shouldInitialize) return;

        if (resetToken !== null) handledUsersResetRef.current = resetToken;
        initializedUsersTabRef.current = true;
        setActiveTab(usersIndex);
    }, [location.pathname, location.search, location.state, tabs, setActiveTab]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const apiUsers = await usersApi.list();
            setUsers(apiUsers.map(mapAdminUserToUserRow));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch users");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadUsers(); }, [loadUsers]);
    const handleRefresh = useCallback(() => { void loadUsers(); }, [loadUsers]);

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

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const deepLinkedUserId = params.get("userId");
        if (!deepLinkedUserId) return;
        if (handledDeepLinkedUserRef.current === deepLinkedUserId) return;
        if (users.length === 0) return;

        const matchedUser = users.find((candidate) => String(candidate.id) === deepLinkedUserId);
        if (!matchedUser) return;

        handledDeepLinkedUserRef.current = deepLinkedUserId;
        handleUserRowClick(matchedUser);
    }, [location.search, users, handleUserRowClick]);

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
        const { createType, title } = getCreateTabConfig(currentTab);
        const existingCreateTab = findTabIndexByType(tabs, createType);

        if (existingCreateTab !== -1) {
            setActiveTab(existingCreateTab);
        } else {
            addTab({
                id: `${createType}-${Date.now()}`,
                title,
                type: createType,
                closable: true,
            });
        }
    };

    const handleBackToUsers = () => {
        const usersIndex = findTabIndexByType(tabs, "users");
        if (usersIndex !== -1) {
            setActiveTab(usersIndex);
        }
    };

    const handleBackToUserTypes = () => {
        const rolesIndex = findTabIndexByType(tabs, "usertypes");
        if (rolesIndex !== -1) {
            setActiveTab(rolesIndex);
        }
    };

    const getAddButtonLabel = () => {
        return getUsersAddButtonLabel(tabs[activeTab]);
    };

    const updateUser = useCallback((id: string, patch: Partial<UserRow>) => {
        const current = users.find((candidate) => candidate.id === id);
        const tabIndex = tabs.findIndex(
            (tab: Tab) => tab.type === "user-detail" && (tab.content as { userId?: string } | undefined)?.userId === id
        );

        setUsers((prev) => applyUserPatch(prev, id, patch));

        if (tabIndex !== -1 && current) {
            updateTab(tabIndex, {
                title: getUserDisplayName({
                    firstName: patch.firstName ?? current.firstName,
                    lastName: patch.lastName ?? current.lastName,
                }),
            });
        }
    }, [tabs, updateTab, users]);

    const approveUser = useCallback(async (id: string) => {
        try {
            const response = await usersApi.setStatus(id, { status: "Pending", onboardingStage: "Approved" });
            updateUser(id, {
                ...buildApprovedPatch(),
                onboardingStage: (response.onboardingStage as OnboardingStage | undefined) ?? "Approved",
                onboardingReason: response.onboardingReason ?? null,
            });
            pushToast("User approved", "success");
        } catch (error) {
            pushToast(error instanceof Error ? error.message : "Failed to approve user", "error");
        }
    }, [pushToast, updateUser]);

    const verifyUser = useCallback(async (id: string) => {
        try {
            const response = await usersApi.setStatus(id, { status: "Pending", onboardingStage: "Verified" });
            updateUser(id, {
                ...buildVerifiedPatch(),
                onboardingStage: (response.onboardingStage as OnboardingStage | undefined) ?? "Verified",
                onboardingReason: response.onboardingReason ?? null,
            });
            pushToast("User verified", "success");
        } catch (error) {
            pushToast(error instanceof Error ? error.message : "Failed to verify user", "error");
        }
    }, [pushToast, updateUser]);

    const activateUser = useCallback(async (id: string) => {
        try {
            const response = await usersApi.setStatus(id, { status: "Active", onboardingStage: "Activated" });
            updateUser(id, {
                ...buildActivatedPatch(),
                onboardingStage: (response.onboardingStage as OnboardingStage | undefined) ?? "Activated",
                onboardingReason: response.onboardingReason ?? null,
            });
            pushToast("User activated", "success");
        } catch (error) {
            pushToast(error instanceof Error ? error.message : "Failed to activate user", "error");
        }
    }, [pushToast, updateUser]);

    const rejectUser = useCallback(async (id: string, reason?: string) => {
        try {
            const response = await usersApi.setStatus(id, {
                status: "Inactive",
                onboardingStage: "Rejected",
                onboardingReason: reason ?? "Rejected",
            });
            updateUser(id, {
                ...buildRejectedPatch(reason),
                onboardingStage: (response.onboardingStage as OnboardingStage | undefined) ?? "Rejected",
                onboardingReason: response.onboardingReason ?? reason ?? "Rejected",
            });
            pushToast("User rejected", "success");
        } catch (error) {
            pushToast(error instanceof Error ? error.message : "Failed to reject user", "error");
        }
    }, [pushToast, updateUser]);

    const saveUserDetails = useCallback(async (id: string, payload: UpdateAdminUserRequest) => {
        try {
            await usersApi.update(id, payload);
            updateUser(id, payload);
            pushToast("User details updated successfully", "success");
        } catch (error) {
            pushToast(error instanceof Error ? error.message : "Failed to update user", "error");
            throw error;
        }
    }, [pushToast, updateUser]);

    const deleteUser = useCallback(async (id: string, reason: string) => {
        try {
            await usersApi.remove(id, { reason, confirmationMode: "admin_action" });
            setUsers(prev => prev.filter((candidate) => candidate.id !== id));
            const deletedTabIndex = tabs.findIndex(
                (tab: Tab) => tab.type === "user-detail" && (tab.content as { userId?: string } | undefined)?.userId === id
            );
            const usersTabIndex = findTabIndexByType(tabs, "users");
            if (deletedTabIndex !== -1) {
                closeTab(deletedTabIndex);
            }
            if (usersTabIndex !== -1) {
                setActiveTab(usersTabIndex);
            }
            pushToast("User deleted successfully", "success");
        } catch (error) {
            const message = error instanceof ApiError && error.body && typeof error.body === "object" && "message" in error.body
                ? String((error.body as { message?: string }).message ?? "Failed to delete user")
                : error instanceof Error
                    ? error.message
                    : "Failed to delete user";
            pushToast(message, "error");
            throw error;
        }
    }, [closeTab, pushToast, setActiveTab, tabs]);

    const renderTabContent = (tab: Tab): React.ReactNode => {
        switch (tab.type) {
            case 'users':
                return (
                    <UsersContent
                        userTypeFilter={userTypeFilter}
                        loading={loading}
                        error={error}
                        onRowClick={handleUserRowClick}
                        onRefresh={handleRefresh}
                        onCreateUser={handleAddTab}
                        statusFilter={userStatusFilter}
                        users={users}
                        onStatusFilterChange={setUserStatusFilter}
                        onUserTypesFilterChange={setUserTypeFilter}
                        filteredUsers={filteredUsers}
                    />
                );
            case 'usertypes':
                return (
                    <UserTypesContent
                        loading={loading}
                        error={error}
                        onRowClick={handleUserTypesRowClick}
                        enabled2FAByType={enabled2FAByType}
                        onToggle2FA={toggle2FA}
                        filteredUserTypes={filteredUserTypes}
                    />
                );
            case 'user-detail': {
                const { userId } = tab.content as { userId: string };
                const user = (users ?? []).find(u => String(u.id) === String(userId));

                if (!user) return <div>User not found</div>;

                return (
                    <ExtractedUserDetailContent
                        user={user}
                        roles={roles}
                        onBack={handleBackToUsers}
                        approveUser={approveUser}
                        verifyUser={verifyUser}
                        activateUser={activateUser}
                        rejectUser={rejectUser}
                        onDelete={deleteUser}
                        onSaveEdit={saveUserDetails}
                        userTypes={usertypes}
                    />
                );
            }
            case 'usertypes-detail':
            {
                const { userTypeId } = tab.content as { userTypeId: string };
                const selectedUserType = (usertypes ?? []).find((candidate) => candidate.id === userTypeId);
                if (!selectedUserType) return <div>User type not found</div>;

                return (
                    <UserTypesDetailContent
                        usertype={selectedUserType}
                        onBack={handleBackToUserTypes}
                        enabled2FAByType={enabled2FAByType}
                        onToggle2FA={toggle2FA}
                        filteredUserTypes={filteredUserTypes}
                    />
                );
            }
            case 'create-user':
                return (
                    <CreateUserPanel
                        userTypes={usertypes}
                        onCancel={() => {
                            const tabIndex = tabs.findIndex((t: Tab) => t.id === tab.id);
                            if (tabIndex !== -1) {
                                closeTab(tabIndex);
                            }
                        }}
                        onSave={(user) => {
                            const newUser = mapAdminUserToUserRow(user);
                            setUsers(prev => [...prev, newUser]);
                            const tabIndex = tabs.findIndex((t: Tab) => t.id === tab.id);
                            if (tabIndex !== -1) {
                                closeTab(tabIndex);
                                handleUserRowClick(newUser);
                            }
                        }}
                    />
                );
            case 'role-detail':
            {
                const { roleId } = tab.content as { roleId: string };
                const selectedRole = (roles ?? []).find((candidate) => candidate.id === roleId);
                if (!selectedRole) return <div>Role not found</div>;

                return (
                    <RoleDetailContent
                        role={selectedRole}
                    />
                );
            }
            case 'roles':
                return (
                    <RolesContent
                        roles={roles}
                        loading={loading}
                        error={error}
                        onRowClick={handleRoleRowClick}
                        isFilterOpen={isFilterOpen}
                        roleFilter={roleFilter}
                        onRoleFilterChange={setRoleFilter}
                        filteredRoles={filteredRoles}
                    />
                );
            default:
                return (
                    <div className="kc-tabMessage">
                        This user view is not available yet.
                    </div>
                );
        }
    };

    return (
        <div className="users-page-wrapper kc-pageShell">
            <div className="users-tab-wrapper kc-pageStretch">
                <TabPanel
                    tabs={tabs}
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                    onAdd={handleAddTab}
                    onClose={closeTab}
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