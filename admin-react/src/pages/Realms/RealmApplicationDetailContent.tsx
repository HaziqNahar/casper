import DataTable, { TableColumn } from "../../components/common/DataTable";
import { AppRow, UserRow } from "../../types";
import { ArrowLeft, Eye, EyeOff, Globe, Key, Shield } from "lucide-react";
import { RealmUserViewRow } from "./realmTypes";

type RealmApplicationDetailContentProps = {
    app: AppRow;
    onBack: () => void;
    usersWithAccess: UserRow[];
    eligibleToGrant: RealmUserViewRow[];
    accessColumns: TableColumn<UserRow>[];
    grantColumns: TableColumn<RealmUserViewRow>[];
    showGrant: boolean;
    grantQuery: string;
    showSecret: boolean;
    onToggleGrant: () => void;
    onGrantQueryChange: (value: string) => void;
    onToggleSecret: () => void;
};

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
    <div className="kc-detailRow">
        <span className="kc-detailLabel">{label}</span>
        <span className={`kc-detailValue ${mono ? "kc-monoCell" : ""}`}>
            {value}
        </span>
    </div>
);

const SectionHeader = ({
    title,
    right,
    subtitle,
}: {
    title: string;
    right?: React.ReactNode;
    subtitle?: string;
}) => (
    <div className={`kc-detailSectionHeader ${subtitle ? "has-subtitle" : ""}`}>
        <div>
            <div className="kc-text-title">{title}</div>
            {subtitle && <div className="kc-text-subtitle kc-text-muted">{subtitle}</div>}
        </div>
        {right}
    </div>
);

const RealmApplicationDetailContent = ({
    app,
    onBack,
    usersWithAccess,
    eligibleToGrant,
    accessColumns,
    grantColumns,
    showGrant,
    grantQuery,
    showSecret,
    onToggleGrant,
    onGrantQueryChange,
    onToggleSecret,
}: RealmApplicationDetailContentProps) => {
    const secretText = app.clientSecretMasked ?? "-";

    return (
        <div className="kc-detailPage">
            <div className="kc-detailHeader">
                <div className="kc-detailHeaderLeft">
                    <button
                        onClick={onBack}
                        className="kc-btn kc-btn-ghost"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div>
                        <div className="kc-detailTitle">{app.name}</div>
                        <div className="kc-detailPillRow">
                            <span className="pill pill-info">{app.protocol}</span>
                            <span className={`pill ${app.enabled ? "pill-success" : "pill-error"}`}>
                                {app.enabled ? "Enabled" : "Disabled"}
                            </span>
                            <span className={`pill ${app.publicClient ? "pill-warn" : "pill-neutral"}`}>
                                {app.publicClient ? "Public Client" : "Confidential Client"}
                            </span>
                            <span className="pill pill-neutral kc-monoCell">
                                {app.clientId}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="kc-detailGrid">
                <div className="cardStyle">
                    <div className="cardTitleStyle">
                        <Key size={16} /> Client Basics
                    </div>

                    <Row label="Client ID" value={app.clientId} mono />
                    <Row label="Protocol" value={app.protocol} />
                    <Row label="Enabled" value={app.enabled ? "Yes" : "No"} />
                    <Row label="Client Type" value={app.publicClient ? "Public" : "Confidential"} />
                    {!app.publicClient && (
                        <div className="kc-detailRow">
                            <span className="kc-detailLabel">Secret</span>

                            <div className="kc-secretCell">
                                <span
                                    className={`kc-secretText ${showSecret ? "is-visible" : ""}`}
                                >
                                    {showSecret ? secretText : "*".repeat(Math.min(secretText.length, 18))}
                                </span>

                                <button
                                    type="button"
                                    onClick={onToggleSecret}
                                    className="kc-iconButton"
                                    title={showSecret ? "Hide secret" : "Show secret"}
                                >
                                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="cardStyle">
                    <div className="cardTitleStyle">
                        <Globe size={16} /> URLs
                    </div>
                    <Row label="Root URL" value={app.rootUrl ?? "-"} />
                    <Row label="Base URL" value={app.baseUrl ?? "-"} />
                    <Row label="Admin URL" value={app.adminUrl ?? "-"} />
                </div>

                <div className="cardStyle">
                    <div className="cardTitleStyle">
                        <Shield size={16} /> Scopes
                    </div>

                    <div className="kc-detailPillRow">
                        {(app.clientScopes ?? []).length ? (
                            app.clientScopes.map((scope) => (
                                <span key={scope} className="pill pill-info">
                                    {scope}
                                </span>
                            ))
                        ) : (
                            <span className="kc-mutedInline">-</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="kc-detailDivider" />

            <div className="cardStyle">
                <SectionHeader
                    title="Users with access"
                    subtitle="Review current app access and submit governed access requests for additional realm users."
                    right={
                        <button className="kc-btn kc-btn-primary" onClick={onToggleGrant}>
                            + {showGrant ? "Close" : "Request access"}
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
                    <div className="kc-grantPanel">
                        <div className="kc-text-title">Request access for realm users</div>
                        <div className="kc-grantTable">
                            <DataTable<RealmUserViewRow>
                                data={eligibleToGrant}
                                columns={grantColumns}
                                keyField="uuid"
                                searchable
                                searchPlaceholder="Search eligible users by name, username, email, or staff ID..."
                                searchValue={grantQuery}
                                onSearchChange={onGrantQueryChange}
                                manualSearch
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

export default RealmApplicationDetailContent;