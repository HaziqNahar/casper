import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import DataTable from "../../components/common/DataTable";
import { MultiSelectCheckbox } from "../../components/common/MultiSelectCheckbox";
import { createApplicationColumns, DEFAULT_APP_FILTERS } from "./applicationColumns";
import type { ApplicationRow } from "./applicationTypes";
import { buildAppOAuthRoute, ROUTES } from "../../config/routes";

type ApplicationsContentProps = {
    apps: ApplicationRow[];
    loading: boolean;
    error: string | null;
    onRowClick: (app: ApplicationRow) => void;
    onRefresh?: () => void;
};

const ApplicationsContent: React.FC<ApplicationsContentProps> = ({ apps, loading, error, onRowClick, onRefresh }) => {
    const navigate = useNavigate();
    const columns = useMemo(
        () => createApplicationColumns(onRowClick, (app) => navigate(buildAppOAuthRoute(app.id))),
        [navigate, onRowClick]
    );
    const [filters, setFilters] = useState(DEFAULT_APP_FILTERS);
    const hasActiveFilters = filters.status.length > 0 || filters.auth.length > 0 || filters.client.length > 0;

    const filteredApps = useMemo(
        () =>
            (Array.isArray(apps) ? apps : []).filter(
                (app) =>
                    (filters.status.length === 0 || filters.status.includes(app.status)) &&
                    (filters.auth.length === 0 || filters.auth.includes(app.authMethod)) &&
                    (filters.client.length === 0 ||
                        filters.client.includes(app.publicClient ? "public" : "confidential"))
            ),
        [apps, filters]
    );

    return (
        <div className="tab-table-container">
            <div className="tab-table-main">
                <div className="table-card" style={{ flex: 1 }}>
                <DataTable<ApplicationRow>
                    data={filteredApps}
                    columns={columns}
                    keyField="id"
                    onRowClick={onRowClick}
                    loading={loading}
                    error={error}
                    searchable
                    searchPlaceholder="Search applications..."
                    onRefresh={onRefresh}
                    paginated
                    pageSize={10}
                    pageSizeOptions={[10, 25, 50, 100]}
                    striped
                    hoverable
                    stickyHeader
                    emptyMessage="No applications found"
                    minHeight="100%"
                    toolbarFilters={{
                        left: (
                            <div className="kc_toolbarFilters">
                                <MultiSelectCheckbox
                                    inline
                                    label="Status"
                                    options={[
                                        { value: "Enabled", label: "Enabled" },
                                        { value: "Disabled", label: "Disabled" },
                                    ]}
                                    value={filters.status}
                                    onChange={(next) => setFilters((current) => ({ ...current, status: next }))}
                                    placeholder="All"
                                    portal
                                />
                                <MultiSelectCheckbox
                                    inline
                                    label="Auth Method"
                                    options={[
                                        { value: "oidc", label: "OIDC" },
                                        { value: "saml", label: "SAML" },
                                    ]}
                                    value={filters.auth}
                                    onChange={(next) => setFilters((current) => ({ ...current, auth: next }))}
                                    placeholder="All"
                                    portal
                                />
                                <MultiSelectCheckbox
                                    inline
                                    label="Client Type"
                                    options={[
                                        { value: "public", label: "Public" },
                                        { value: "confidential", label: "Confidential" },
                                    ]}
                                    value={filters.client}
                                    onChange={(next) => setFilters((current) => ({ ...current, client: next }))}
                                    placeholder="All"
                                    portal
                                />
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        className="kc_btn kc_btn_icon"
                                        title="Clear filters"
                                        aria-label="Clear filters"
                                        onClick={() => setFilters(DEFAULT_APP_FILTERS)}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ),
                        right: (
                            <button className="kc-btn kc-btn-primary" onClick={() => navigate(ROUTES.REGISTER_APPS)}>
                                <Plus size={16} /> Register application
                            </button>
                        ),
                    }}
                />
                </div>
            </div>
        </div>
    );
};

export default ApplicationsContent;