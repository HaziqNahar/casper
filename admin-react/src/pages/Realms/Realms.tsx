import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import TabPanel from "../../components/common/tabs/TabPanel";
import { useTabs, Tab } from "../../hooks/useTabs";
import { useLocation } from "react-router-dom";
import { realmsApi } from "../../services/realmsApi";
import { usersApi } from "../../services/usersApi";
import { ApiError } from "../../services/apiClient";
import { authApi } from "../../services/authApi";
import { governanceApi } from "../../services/governanceApi";

import RealmsTabContent from "./RealmsContent";
import RealmDetailContent from "./RealmDetailContent";
import ConfirmDialog, { type ConfirmState } from "./ConfirmDialog";
import { REALM_ROLES, type RealmAppUsersMap, type RealmMembership, type RealmRoleId, type RealmStatus } from "./realmTypes";
import { createRealmColumns } from "./realmListColumns";

import "../../styles/browserTabs.css";
import "../../styles/component.css";
import { ToastItem, ToastStack, ToastType } from "../../components/common/ToastStack";
import { useData } from "../../context/DataContext";
import { AppRow, RealmRow, UserRow } from "../../types";
import { ROUTES } from "../../config/routes";
import { loadAccessRequests } from "./access/accessRequestsStore";
import { useAccessRequestsLive } from "./access/useAccessRequestsLive";
import { buildRealmDeactivationApprovalPayload } from "../governance/approvalPayloads";
import { buildAppAccessGrantApprovalPayload } from "../governance/approvalPayloads";
import { ApprovalRequestRow } from "../governance/contracts";

// ============================================================================
// HELPERS
// ============================================================================
// ============================================================================
// TABS
// ============================================================================

const DEFAULT_TABS: Tab[] = [{ id: "realms", title: "Realms", type: "realms", closable: false }];

// ============================================================================
// MAIN PAGE
// ============================================================================

const RealmsPage: React.FC = () => {
    const {
        totalUsers,
        totalRealms,
        totalApps,
        refreshData,
        loading: dataLoading,
        error: dataError,
    } = useData();

    const [accessTick, setAccessTick] = useState(0);
    useAccessRequestsLive(() => setAccessTick((x) => x + 1));
    const [pendingByRealm, setPendingByRealm] = useState<Record<string, number>>({});

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            const reqs = await loadAccessRequests();
            const isPending = (s: string) =>
                s === "Draft" || s === "Submitted" || s === "Approved";

            const map: Record<string, number> = {};
            for (const r of reqs) {
                if (!isPending(r.status)) continue;
                map[r.realmId] = (map[r.realmId] ?? 0) + 1;
            }

            if (!cancelled) {
                setPendingByRealm(map);
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [accessTick]);
    const [confirm, setConfirm] = useState<ConfirmState>({
        open: false,
        title: "",
    });

    const openConfirmDialog = useCallback(
        (next: Omit<ConfirmState, "open">) => setConfirm({ open: true, ...next }),
        [setConfirm]
    );

    const closeConfirmDialog = () =>
        setConfirm((p) => ({ ...p, open: false }));

    const [users, setUsers] = useState<UserRow[]>([]);
    const [realms, setRealms] = useState<RealmRow[]>([]);
    const [apps, setApps] = useState<AppRow[]>([]);

    const location = useLocation();

    const [realmStatusFilter, setRealmStatusFilter] = useState<RealmStatus[]>([]);
    const initializedListTabRef = useRef(false);
    const handledRealmsResetRef = useRef<number | null>(null);

    const filteredRealms = useMemo(() => {
        const safe = Array.isArray(realms) ? realms : [];
        if (realmStatusFilter.length === 0) return safe; // All
        return safe.filter((r) => realmStatusFilter.includes(r.status as RealmStatus));
    }, [realms, realmStatusFilter]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const { tabs, activeTab, setActiveTab, addTab, closeTab } = useTabs({
        storageKey: "admin-realms-tabs",
        defaultTabs: DEFAULT_TABS,
    });

    const TOAST_TTL_MS = 2600;
    const TOAST_EXIT_MS = 220;

    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [realmAppUsers, setRealmAppUsers] = useState<RealmAppUsersMap>({});
    const [realmMembershipsByRealm, setRealmMembershipsByRealm] = useState<Record<string, RealmMembership[]>>({});
    const [realmAppLinks, setRealmAppLinks] = useState<Record<string, string[]>>({});
    const [pendingAppAccessRequests, setPendingAppAccessRequests] = useState<Record<string, string>>({});
    const appCountByRealm = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(realmAppLinks).map(([realmId, appIds]) => [realmId, appIds.length])
            ),
        [realmAppLinks]
    );

    const loadRelationships = useCallback(async () => {
        try {
            const response = await realmsApi.getRelationships();

            const membershipsByRealm = response.realmMemberships.reduce<Record<string, RealmMembership[]>>((acc, item) => {
                const next = acc[item.realmId] ?? [];
                next.push({ userUuid: item.userUuid, roleId: item.roleId as RealmRoleId });
                acc[item.realmId] = next;
                return acc;
            }, {});

            const appLinksByRealm = response.realmApps.reduce<Record<string, string[]>>((acc, item) => {
                const next = acc[item.realmId] ?? [];
                if (!next.includes(item.appId)) next.push(item.appId);
                acc[item.realmId] = next;
                return acc;
            }, {});

            const appUsers = response.appAccess.reduce<RealmAppUsersMap>((acc, item) => {
                const key = `${item.realmId}::${item.appId}`;
                const next = acc[key] ?? [];
                if (!next.includes(item.userUuid)) next.push(item.userUuid);
                acc[key] = next;
                return acc;
            }, {});

            setRealmMembershipsByRealm(membershipsByRealm);
            setRealmAppLinks(appLinksByRealm);
            setRealmAppUsers(appUsers);
        } catch (err) {
            console.error("Failed to load realm relationships:", err);
        }
    }, []);

    const reloadRealmData = useCallback(async () => {
        await refreshData();
        await loadRelationships();
    }, [refreshData, loadRelationships]);

    useEffect(() => {
        setUsers(Array.isArray(totalUsers) ? totalUsers : []);
    }, [totalUsers]);

    useEffect(() => {
        setRealms(Array.isArray(totalRealms) ? totalRealms : []);
    }, [totalRealms]);

    useEffect(() => {
        setApps(Array.isArray(totalApps) ? totalApps : []);
    }, [totalApps]);

    useEffect(() => {
        setLoading(dataLoading);
    }, [dataLoading]);

    useEffect(() => {
        setError(dataError ?? null);
    }, [dataError]);

    useEffect(() => {
        void (async () => {
            try {
                const me = await authApi.me();
                setIsSuperAdmin(Boolean(me.isSuperAdmin));
            } catch {
                setIsSuperAdmin(false);
            }
        })();
    }, []);

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
        const idx = tabs.findIndex((t: Tab) => t.type === "realms");
        if (idx === -1) return;

        const state = location.state as { resetRealmsToList?: number } | null;
        const resetToken = state?.resetRealmsToList ?? null;
        const shouldReset = resetToken !== null && handledRealmsResetRef.current !== resetToken;
        const shouldInitialize = location.pathname === ROUTES.REALMS && !initializedListTabRef.current;

        if (!shouldReset && !shouldInitialize) return;

        if (resetToken !== null) handledRealmsResetRef.current = resetToken;
        initializedListTabRef.current = true;
        setActiveTab(idx);
    }, [location.pathname, location.state, tabs, setActiveTab]);

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
        void loadRelationships();
    }, [loadRelationships]);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            try {
                const response = await governanceApi.approvalRequests<{ items: ApprovalRequestRow[]; total: number }>(
                    "entityTypes=application_access&actions=grant&page=1&pageSize=200"
                );

                if (cancelled) return;

                const next: Record<string, string> = {};
                for (const item of response.items ?? []) {
                    if (item.status !== "Pending") continue;
                    next[item.entityId] = "Pending approval";
                }

                setPendingAppAccessRequests(next);
            } catch {
                if (!cancelled) setPendingAppAccessRequests({});
            }
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [isSuperAdmin]);

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

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get("created") !== "1") return;

        pushToast("Realm created", "success");
        void reloadRealmData();
    }, [location.search, pushToast, reloadRealmData]);

    const grantUserToApp = useCallback(async (realmId: string, appId: string, userUuid: string, input?: { justification?: string }) => {
        try {
            const realm = realms.find((candidate) => candidate.id === realmId);
            const app = apps.find((candidate) => candidate.id === appId);
            const user = users.find((candidate) => candidate.uuid === userUuid);

            if (!realm || !app || !user) {
                pushToast("Unable to create app access request", "error");
                return;
            }

            await governanceApi.createApproval({
                entityType: "application_access",
                entityId: `${realmId}:${appId}:${userUuid}`,
                entityName: `${app.name} -> ${user.firstName} ${user.lastName}`.trim(),
                action: "grant",
                reason: input?.justification,
                details: `Grant ${user.username} access to ${app.name} in ${realm.name}`,
                payloadJson: JSON.stringify(
                    buildAppAccessGrantApprovalPayload({
                        realmId,
                        realmName: realm.name,
                        appId,
                        appName: app.name,
                        userId: userUuid,
                        username: user.username,
                        displayName: `${user.firstName} ${user.lastName}`.trim(),
                    })
                ),
            });
            setPendingAppAccessRequests((prev) => ({
                ...prev,
                [`${realmId}:${appId}:${userUuid}`]: "Pending approval",
            }));
            pushToast("Application access request submitted for approval", "success");
        } catch (err) {
            pushToast(err instanceof Error ? err.message : "Failed to submit application access request", "error");
        }
    }, [apps, pushToast, realms, users]);

    const revokeUserFromApp = useCallback(async (realmId: string, appId: string, userUuid: string) => {
        try {
            await realmsApi.revokeAppAccess(realmId, appId, userUuid);
            await reloadRealmData();
            pushToast("Access revoked from application", "info");
        } catch (err) {
            pushToast(err instanceof Error ? err.message : "Failed to revoke application access", "error");
        }
    }, [pushToast, reloadRealmData]);


    const handleRefresh = useCallback(() => {
        void reloadRealmData();
    }, [reloadRealmData]);

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

    const removeUserFromRealm = useCallback(async (realmId: string, userUuid: string) => {
        try {
            await realmsApi.removeUser(realmId, userUuid);
            await reloadRealmData();
            pushToast("User removed from this realm only. The CASPER account still exists in Users.", "success");
        } catch (err) {
            pushToast(err instanceof Error ? err.message : "Failed to remove user from realm", "error");
        }
    }, [pushToast, reloadRealmData]);

    const createUser = useCallback(async (realmId: string, newUser: UserRow) => {
        try {
            const created = await usersApi.create({
                username: newUser.username,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                department: typeof newUser.department === "string" ? newUser.department : undefined,
                userType: typeof newUser.userType === "string" ? newUser.userType : undefined,
            });

            await realmsApi.addUser(realmId, created.user.uuid);
            await reloadRealmData();
            return true;
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                await reloadRealmData();
                pushToast("User already exists in CASPER. Removing from a realm does not delete the account. Refreshed realm users.", "warning");
                return false;
            }

            pushToast(err instanceof Error ? err.message : "Failed to create local user", "error");
            return false;
        }
    }, [pushToast, reloadRealmData]);

    const updateRealm = useCallback(async (
        realmId: string,
        patch: Partial<RealmRow> & { reason?: string; confirmationMode?: string }
    ) => {
        try {
            if (patch.status === "Inactive" && patch.confirmationMode === "super_admin_request") {
                const realm = realms.find((candidate) => candidate.id === realmId);
                if (!realm) {
                    pushToast("Realm not found", "error");
                    return false;
                }
                await governanceApi.createApproval({
                    entityType: "realm",
                    entityId: realmId,
                    entityName: realm.name,
                    action: "deactivate",
                    reason: patch.reason,
                    details: `Deactivation requested for realm ${realm.name}`,
                    payloadJson: JSON.stringify(
                        buildRealmDeactivationApprovalPayload(
                            realm.name,
                            realm.userCount ?? 0,
                            pendingByRealm[realm.id] ?? 0
                        )
                    ),
                });
                return true;
            }

            await realmsApi.update(realmId, {
                status: patch.status,
                mfaRequired: patch.mfaRequired,
                passwordInheritance: patch.passwordInheritance,
                sessionTimeoutMins: patch.sessionTimeoutMins,
                reason: patch.reason,
                confirmationMode: patch.confirmationMode,
            } as never);
            await reloadRealmData();
            return true;
        } catch (err) {
            pushToast(err instanceof Error ? err.message : "Failed to update realm", "error");
            return false;
        }
    }, [pendingByRealm, pushToast, realms, reloadRealmData]);
    const toggleRealmStatus = useCallback(
        async (realm: RealmRow, input?: { password?: string; justification?: string }) => {
            const nextStatus: RealmStatus =
                realm.status === "Active" ? "Inactive" : "Active";

            if (realm.status === "Active" && isSuperAdmin) {
                await authApi.confirmPassword(input?.password ?? "");
            }

            const saved = await updateRealm(realm.id, {
                status: nextStatus,
                reason: input?.justification,
                confirmationMode: realm.status === "Active"
                    ? (isSuperAdmin ? "password_reentry" : "super_admin_request")
                    : "admin_action",
            });
            if (!saved) return;

            pushToast(
                nextStatus === "Active"
                    ? "Realm activated"
                    : isSuperAdmin
                        ? "Realm deactivated"
                        : "Deactivation request submitted for super admin approval",
                nextStatus === "Active" ? "success" : isSuperAdmin ? "info" : "success"
            );
        },
        [isSuperAdmin, pushToast, updateRealm]
    );
    const realmColumns = useMemo(
        () =>
            createRealmColumns(
                handleRealmRowClick,
                toggleRealmStatus,
                openConfirmDialog,
                pendingByRealm,
                appCountByRealm,
                isSuperAdmin
            ),
        [handleRealmRowClick, toggleRealmStatus, openConfirmDialog, pendingByRealm, appCountByRealm, isSuperAdmin]
    );

    const renderTabContent = useCallback(
        (tab: Tab) => {
            switch (tab.type) {
                case "realms":
                    return (
                        <RealmsTabContent
                            columns={realmColumns}
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
                    const content = (tab.content ?? {}) as { realmId?: string; id?: string };

                    const realmId =
                        content?.realmId ||
                        content?.id || // old saved tabs where content was RealmRow
                        (typeof tab.id === "string" && tab.id.startsWith("realm-")
                            ? tab.id.replace("realm-", "")
                            : "");

                    const realm = realms.find((r) => r.id === realmId);

                    if (!realm) {
                        return (
                            <div className="kc-tabMessage kc-tabMessage--compact">
                                Realm not found: <b>{realmId || "(missing id)"}</b>
                            </div>
                        );
                    }

                    const realmMemberships = realmMembershipsByRealm[realm.id] ?? [];
                    const appsInRealm: AppRow[] = (Array.isArray(apps) ? apps : []).filter((app) =>
                        (realmAppLinks[realm.id] ?? []).includes(app.id)
                    );


                    return (
                        <RealmDetailContent
                            realm={realm}
                            allUsers={Array.isArray(users) ? users : []}
                            appsInRealm={appsInRealm}
                            onBack={backToRealms}
                            realmMemberships={realmMemberships}
                            roles={REALM_ROLES}
                            onRemoveUser={(uuid) => {
                                void removeUserFromRealm(realm.id, uuid);
                            }}
                            onCreateUser={async (u) => {
                                const createdUserId = await createUser(realm.id, {
                                    ...u,
                                    uuid: u.uuid ?? "",
                                    userType: "local_user",
                                    localRealmId: realm.id,
                                    status: u.status ?? "Pending",
                                });

                                if (!createdUserId) return false;

                                pushToast("Local user created in realm", "success");
                                return true;
                            }}
                            appUsers={realmAppUsers}
                            pendingAppAccessRequests={pendingAppAccessRequests}
                            onGrantAppUser={(appId, userUuid, input) => {
                                void grantUserToApp(realm.id, appId, userUuid, input);
                            }}
                            onRevokeAppUser={(appId, userUuid) => {
                                void revokeUserFromApp(realm.id, appId, userUuid);
                            }}
                            onUpdateRealm={(patch) => updateRealm(realm.id, patch)}
                            onToast={pushToast}
                            onConfirmSensitiveAction={async (password) => {
                                await authApi.confirmPassword(password ?? "");
                            }}
                            isSuperAdmin={isSuperAdmin}
                        />
                    );
                }
                default:
                    return (
                        <div className="kc-tabMessage">
                            This realm view is not available yet.
                        </div>
                    );
            }
        },
        [
            realmColumns,
            filteredRealms,
            loading,
            error,
            handleRealmRowClick,
            realmStatusFilter,
            setRealmStatusFilter,
            handleRefresh,
            realms,
            apps,
            users,
            realmMembershipsByRealm,
            realmAppLinks,
            backToRealms,
            removeUserFromRealm,
            createUser,
            realmAppUsers,
            pendingAppAccessRequests,
            grantUserToApp,
            revokeUserFromApp,
            updateRealm,
            pushToast,
            isSuperAdmin,
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
                }} />
            <div className="realms-page-wrapper kc-pageShell">
                <div className="realms-tab-wrapper kc-pageStretch">
                    <TabPanel
                        tabs={tabs}
                        activeTab={activeTab}
                        onSelect={setActiveTab}
                        onAdd={() => { }}
                        onClose={closeTab}
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