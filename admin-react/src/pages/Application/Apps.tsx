import React, { useCallback, useMemo, useState } from "react";

import TabPanel from "../../components/common/tabs/TabPanel";
import DataTable2, { TableColumn } from "../../components/common/DataTable";
import { useTabs } from "../../hooks/useTabs";
import type { Tab } from "../../hooks/useTabs";

import { Badge, LinkCell } from "../../components/common/Bagde";
import { ArrowLeft, Eye, Globe, Key, Layers, Shield } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================
export type AppStatus = "Enabled" | "Disabled";
export type AppAuthMethod = "oidc" | "saml";

export interface ApplicationRow {
    id: string;
    name: string;
    clientId: string;
    authMethod: AppAuthMethod;
    status: AppStatus;
    publicClient: boolean;

    redirectUris: string[];
    webOrigins: string[];

    rootUrl?: string;
    baseUrl?: string;
    adminUrl?: string;

    ownerRealm?: string;
    updatedAt?: string; // ISO string recommended
    description?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================
const APPS_DATA: ApplicationRow[] = [
    {
        id: "app-ops-web",
        name: "Ops Web Portal",
        clientId: "ops-web",
        authMethod: "oidc",
        status: "Enabled",
        publicClient: false,
        redirectUris: ["https://ops.company.sg/*"],
        webOrigins: ["https://ops.company.sg"],
        rootUrl: "https://ops.company.sg",
        baseUrl: "https://ops.company.sg/app",
        adminUrl: "https://ops.company.sg/admin",
        ownerRealm: "Operations Realm",
        updatedAt: "2025-12-19T09:00:00.000Z",
        description: "Operations web application (OIDC confidential client).",
    },
    {
        id: "app-ops-mobile",
        name: "Ops Mobile",
        clientId: "ops-mobile",
        authMethod: "oidc",
        status: "Enabled",
        publicClient: true,
        redirectUris: ["com.company.ops://callback", "https://auth.company.sg/mobile/*"],
        webOrigins: [],
        rootUrl: "",
        baseUrl: "",
        adminUrl: "",
        ownerRealm: "Operations Realm",
        updatedAt: "2025-12-19T09:00:00.000Z",
        description: "Mobile client (OIDC public client).",
    },
    {
        id: "app-fin-web",
        name: "Finance Web",
        clientId: "fin-web",
        authMethod: "oidc",
        status: "Disabled",
        publicClient: false,
        redirectUris: ["https://fin.company.sg/*"],
        webOrigins: ["https://fin.company.sg"],
        rootUrl: "https://fin.company.sg",
        baseUrl: "https://fin.company.sg/app",
        adminUrl: "https://fin.company.sg/admin",
        ownerRealm: "Finance Realm",
        updatedAt: "2025-12-12T09:00:00.000Z",
        description: "Finance portal (currently disabled).",
    },
    {
        id: "app-hr-sso",
        name: "HR SSO (SAML)",
        clientId: "hr-sso",
        authMethod: "saml",
        status: "Enabled",
        publicClient: false,
        redirectUris: ["https://hr.company.sg/sso/*"],
        webOrigins: ["https://hr.company.sg"],
        rootUrl: "https://hr.company.sg",
        baseUrl: "https://hr.company.sg",
        adminUrl: "https://hr.company.sg/admin",
        ownerRealm: "HR Realm",
        updatedAt: "2025-12-01T09:00:00.000Z",
        description: "SAML service provider integration.",
    },
];

// ============================================================================
// HELPERS
// ============================================================================
const appStatusVariant = (s: AppStatus): "success" | "error" | "default" => {
    if (s === "Enabled") return "success";
    if (s === "Disabled") return "error";
    return "default";
};

const formatAbsolute = (dt: Date) =>
    new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(dt);

const formatFull = (dt: Date) =>
    new Intl.DateTimeFormat("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
    }).format(dt);

const safeDate = (value?: string) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
};

// ============================================================================
// TABLE COLUMNS
// ============================================================================
const createApplicationColumns = (
    onView: (row: ApplicationRow) => void
): TableColumn<ApplicationRow>[] => [
        {
            key: "name",
            label: "Application",
            width: "280px",
            render: (value, row) => (
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <LinkCell onClick={() => onView(row)}>{value as string}</LinkCell>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{row.id}</span>
                </div>
            ),
        },
        {
            key: "clientId",
            label: "Client ID",
            width: "210px",
            render: (value) => (
                <span
                    style={{
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontSize: "0.85rem",
                    }}
                >
                    {value as string}
                </span>
            ),
        },
        {
            key: "authMethod",
            label: "Auth Method",
            width: "140px",
            align: "center",
            render: (value) => (
                <Badge variant="info">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Key size={12} />
                        {String(value).toUpperCase()}
                    </span>
                </Badge>
            ),
        },
        {
            key: "status",
            label: "Status",
            width: "130px",
            align: "center",
            render: (value) => (
                <Badge variant={appStatusVariant(value as AppStatus)}>{value as string}</Badge>
            ),
        },
        {
            key: "redirectUris",
            label: "Redirect URIs",
            width: "340px",
            render: (_v, row) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "0.8rem", color: "#374151" }}>
                        {row.redirectUris?.length ?? 0} configured
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        {row.redirectUris?.[0] ?? "-"}
                        {(row.redirectUris?.length ?? 0) > 1 ? " …" : ""}
                    </span>
                </div>
            ),
        },
        {
            key: "updatedAt",
            label: "Last Updated",
            width: "180px",
            render: (value) => {
                const dt = safeDate(value as string | undefined);
                if (!dt) return "-";
                return (
                    <time className="kc-datetime" dateTime={dt.toISOString()} title={formatFull(dt)}>
                        {formatAbsolute(dt)}
                    </time>
                );
            },
        },
        {
            key: "id",
            label: "Actions",
            width: "80px",
            align: "center",
            sortable: false,
            render: (_v, row) => (
                <button
                    type="button"
                    className="icon-action"
                    onClick={(e) => {
                        e.stopPropagation();
                        onView(row);
                    }}
                    title="View Details"
                >
                    <Eye size={16} />
                </button>
            ),
        },
    ];

// ============================================================================
// LIST VIEW
// ============================================================================
const ApplicationsContent: React.FC<{
    apps: ApplicationRow[];
    loading: boolean;
    error: string | null;
    onRowClick: (app: ApplicationRow) => void;
}> = ({ apps, loading, error, onRowClick }) => {
    const columns = useMemo(() => createApplicationColumns(onRowClick), [onRowClick]);

    return (
        <div className="tab-table-container" style={{ position: "relative" }}>
            <div className="table-card" style={{ flex: 1 }}>
                <DataTable2<ApplicationRow>
                    data={Array.isArray(apps) ? apps : []}
                    columns={columns}
                    keyField="id"
                    onRowClick={onRowClick}
                    loading={loading}
                    error={error}
                    searchable
                    searchPlaceholder="Search applications..."
                    paginated
                    pageSize={10}
                    pageSizeOptions={[10, 25, 50, 100]}
                    striped
                    hoverable
                    stickyHeader
                    emptyMessage="No applications found"
                    minHeight="100%"
                />
            </div>
        </div>
    );
};

// ============================================================================
// DETAIL VIEW
// ============================================================================
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

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "0.35rem 0" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#6b7280" }}>{label}</span>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827", ...(mono ? monoStyle : {}) }}>
            {value}
        </span>
    </div>
);

const ApplicationDetailContent: React.FC<{
    app: ApplicationRow;
    onBack?: () => void;
}> = ({ app, onBack }) => {
    const dt = safeDate(app.updatedAt);

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
                    {onBack && (
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
                    )}

                    <div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>{app.name}</div>
                        <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                            <span className="pill pill-info">{app.authMethod.toUpperCase()}</span>
                            <span className={`pill ${app.status === "Enabled" ? "pill-success" : "pill-error"}`}>
                                {app.status}
                            </span>
                            <span className={`pill ${app.publicClient ? "pill-warn" : "pill-neutral"}`}>
                                {app.publicClient ? "Public Client" : "Confidential Client"}
                            </span>
                            <span className="pill pill-neutral" style={monoStyle}>
                                {app.clientId}
                            </span>
                            {app.ownerRealm && <span className="pill pill-neutral">{app.ownerRealm}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
                <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Key size={16} /> Client Basics
                    </div>
                    <Row label="Client ID" value={app.clientId} mono />
                    <Row label="Auth Method" value={app.authMethod.toUpperCase()} />
                    <Row label="Status" value={app.status} />
                    <Row label="Client Type" value={app.publicClient ? "Public" : "Confidential"} />
                    <Row label="Last Updated" value={dt ? formatFull(dt) : "-"} />
                </div>

                <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Globe size={16} /> URLs
                    </div>
                    <Row label="Root URL" value={app.rootUrl || "—"} mono />
                    <Row label="Base URL" value={app.baseUrl || "—"} mono />
                    <Row label="Admin URL" value={app.adminUrl || "—"} mono />
                </div>

                <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Layers size={16} /> Redirect URIs
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(app.redirectUris?.length ? app.redirectUris : ["—"]).slice(0, 6).map((u) => (
                            <div
                                key={u}
                                style={{
                                    padding: "0.6rem 0.75rem",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    background: "#fafafa",
                                    ...monoStyle,
                                    fontSize: "0.85rem",
                                }}
                            >
                                {u}
                            </div>
                        ))}
                        {(app.redirectUris?.length ?? 0) > 6 && <div style={{ color: "#6b7280" }}>…</div>}
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={cardTitleStyle}>
                        <Shield size={16} /> Web Origins
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(app.webOrigins?.length ? app.webOrigins : ["—"]).slice(0, 6).map((o) => (
                            <div
                                key={o}
                                style={{
                                    padding: "0.6rem 0.75rem",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    background: "#fafafa",
                                    ...monoStyle,
                                    fontSize: "0.85rem",
                                }}
                            >
                                {o}
                            </div>
                        ))}
                        {(app.webOrigins?.length ?? 0) > 6 && <div style={{ color: "#6b7280" }}>…</div>}
                    </div>
                </div>

                {app.description && (
                    <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
                        <div style={cardTitleStyle}>
                            <Shield size={16} /> Description
                        </div>
                        <div style={{ color: "#374151", fontSize: "0.95rem", fontWeight: 600 }}>{app.description}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

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
    const [apps, setApps] = useState<ApplicationRow[]>(APPS_DATA);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { tabs, activeTab, setActiveTab, addTab, closeTab, reorderTabs } = useTabs({
        storageKey: "apps-tabs",
        defaultTabs: DEFAULT_TABS,
    });

    const handleRefresh = useCallback(() => {
        setLoading(true);
        window.setTimeout(() => {
            setApps(APPS_DATA);
            setError(null);
            setLoading(false);
        }, 350);
    }, []);

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
                content: app,
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
                            apps={apps}
                            loading={loading}
                            error={error}
                            onRowClick={handleAppRowClick}
                        />
                    );

                case "app-detail":
                    return <ApplicationDetailContent app={tab.content as ApplicationRow} onBack={backToApps} />;

                default:
                    return (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                            Content for "{tab.title}"
                        </div>
                    );
            }
        },
        [apps, loading, error, handleAppRowClick, backToApps]
    );

    return (
        <div className="users-page-wrapper" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div className="users-tab-wrapper" style={{ flex: 1, minHeight: 0 }}>
                <TabPanel
                    tabs={tabs}
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                    onAdd={() => { }}
                    onClose={closeTab}
                    onReorder={reorderTabs}
                    onRefresh={handleRefresh}
                    showActions={true}
                    addButtonLabel=""
                    renderContent={renderTabContent}
                    minHeight="100%"
                />
            </div>
        </div>
    );
};

export default AppsPage;