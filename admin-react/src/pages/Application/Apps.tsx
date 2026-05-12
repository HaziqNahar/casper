import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import TabPanel from "../../components/common/tabs/TabPanel";
import { useTabs } from "../../hooks/useTabs";
import type { Tab } from "../../hooks/useTabs";

import { useData } from "../../context/DataContext";
import type { AppRow } from "../../types";
import ApplicationsContent from "./ApplicationsContent";
import ApplicationDetailContent from "./ApplicationDetailContent";
import type { ApplicationRow } from "./applicationTypes";
import { ROUTES } from "../../config/routes";
import { authApi } from "../../services/authApi";

export const mapAppToApplication = (app: AppRow): ApplicationRow => ({
    id: app.id,
    name: app.name,
    clientId: app.clientId,
    authMethod: app.protocol === "saml" ? "saml" : "oidc",
    status: app.enabled ? "Enabled" : "Disabled",
    publicClient: app.publicClient,
    redirectUris: app.redirectUris ?? [],
    postLogoutRedirectUris: app.postLogoutRedirectUris ?? [],
    webOrigins: app.webOrigins ?? [],
    rootUrl: app.rootUrl,
    baseUrl: app.baseUrl,
    adminUrl: app.adminUrl,
    updatedAt: app.updatedAt,
    ownerRealm: app.ownerRealm,
    linkedRealmCount: app.linkedRealmCount,
    accessUserCount: app.accessUserCount,
    description: app.description,
    clientSecretMasked: app.clientSecretMasked,
    clientSecretStorage: app.clientSecretStorage,
    clientSecretSecretName: app.clientSecretSecretName,
    clientSecretRotatedAtUtc: app.clientSecretRotatedAtUtc,
    previousClientSecretExpiresAtUtc: app.previousClientSecretExpiresAtUtc,
});

// ============================================================================
// TABS
// ============================================================================
const DEFAULT_TABS: Tab[] = [
    { id: "applications", title: "Applications", type: "applications", closable: false },
];

// ============================================================================
// MAIN PAGE
// ============================================================================
const AppsPage: React.FC = () => {
    const location = useLocation();
    const initializedAppsTabRef = useRef(false);
    const handledAppsResetRef = useRef<number | null>(null);
    const [apps, setApps] = useState<ApplicationRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const { totalApps, loading: dataLoading, error: dataError, refreshData } = useData();

    useEffect(() => {
        setApps((totalApps ?? []).map(mapAppToApplication));
    }, [totalApps]);


    useEffect(() => {
        setLoading(dataLoading);
    }, [dataLoading]);

    useEffect(() => {
        setError(dataError);
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

    const queryRisk = useMemo(() => new URLSearchParams(location.search).get("risk"), [location.search]);

    const scopedApps = useMemo(() => {
        if (queryRisk !== "public-or-disabled") return apps;
        return apps.filter((app) => app.status === "Disabled" || app.publicClient);
    }, [apps, queryRisk]);

    const { tabs, activeTab, setActiveTab, addTab, closeTab } = useTabs({
        storageKey: "apps-tabs",
        defaultTabs: DEFAULT_TABS,
    });

    useEffect(() => {
        const appsIndex = tabs.findIndex((tab: Tab) => tab.type === "applications");
        if (appsIndex === -1) return;

        const state = location.state as { resetAppsToList?: number } | null;
        const resetToken = state?.resetAppsToList ?? null;
        const shouldReset = resetToken !== null && handledAppsResetRef.current !== resetToken;
        const shouldInitialize = location.pathname === ROUTES.APPS && !initializedAppsTabRef.current;

        if (!shouldReset && !shouldInitialize) return;

        if (resetToken !== null) handledAppsResetRef.current = resetToken;
        initializedAppsTabRef.current = true;
        setActiveTab(appsIndex);
    }, [location.pathname, location.state, tabs, setActiveTab]);

    const handleRefresh = useCallback(() => {
        void refreshData();
    }, [refreshData]);

    const handleAppStatusChanged = useCallback((appId: string, enabled: boolean, updatedAt?: string) => {
        setApps((current) =>
            current.map((app) =>
                app.id === appId
                    ? {
                        ...app,
                        status: enabled ? "Enabled" : "Disabled",
                        updatedAt: updatedAt ?? app.updatedAt,
                    }
                    : app
            )
        );
        void refreshData();
    }, [refreshData]);

    const handleAppRowClick = useCallback(
        (app: ApplicationRow) => {
            const tabId = `app-${app.id}`;
            const existing = tabs.findIndex((t: Tab) => t.type === "app-detail" && t.id === tabId);
            if (existing !== -1) {
                setActiveTab(existing);
                return;
            }
            addTab({
                id: tabId,
                title: app.name,
                type: "app-detail",
                closable: true,
                content: { appId: app.id },
            });
        },
        [tabs, setActiveTab, addTab]
    );

    const backToApps = useCallback(() => {
        const idx = tabs.findIndex((t: Tab) => t.type === "applications");
        if (idx !== -1) setActiveTab(idx);
    }, [tabs, setActiveTab]);

    const renderTabContent = useCallback(
        (tab: Tab) => {
            switch (tab.type) {
                case "applications":
                    return (
                        <ApplicationsContent
                            apps={scopedApps}
                            loading={loading}
                            error={error}
                            onRowClick={handleAppRowClick}
                            onRefresh={handleRefresh}
                        />
                    );

                case "app-detail":
                    {
                        const { appId } = (tab.content ?? {}) as { appId?: string };
                        const selectedApp = apps.find((candidate) => candidate.id === appId);

                        if (!selectedApp) {
                            return (
                                <div className="kc-tabMessage kc-tabMessage--compact">
                                    Application not found: <b>{appId ?? "(missing id)"}</b>
                                </div>
                            );
                        }

                        return (
                            <ApplicationDetailContent
                                app={selectedApp}
                                onBack={backToApps}
                                onStatusChanged={handleAppStatusChanged}
                                isSuperAdmin={isSuperAdmin}
                            />
                        );
                    }

                default:
                    return (
                        <div className="kc-tabMessage">
                            This application view is not available yet.
                        </div>
                    );
            }
        },
        [apps, scopedApps, loading, error, handleAppRowClick, backToApps, handleAppStatusChanged, isSuperAdmin]
    );

    return (
        <div className="users-page-wrapper kc-pageShell">
            <div className="users-tab-wrapper kc-pageStretch">
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
        </div>
    );
};

export default AppsPage;