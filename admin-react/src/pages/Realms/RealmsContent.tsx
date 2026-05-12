import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";

import DataTable, { TableColumn } from "../../components/common/DataTable";
import { MultiSelectCheckbox } from "../../components/common/MultiSelectCheckbox";
import { RealmRow } from "../../types";

type RealmStatus = "Active" | "Inactive" | "Draft";

type RealmsContentProps = {
    realms: RealmRow[];
    columns: TableColumn<RealmRow>[];
    loading: boolean;
    error: string | null;
    onRowClick: (realm: RealmRow) => void;
    realmStatusFilter: RealmStatus[];
    setRealmStatusFilter: (v: RealmStatus[]) => void;
    onRefresh?: () => void;
};

const RealmsContent: React.FC<RealmsContentProps> = ({
    realms,
    columns,
    loading,
    error,
    onRowClick,
    realmStatusFilter,
    setRealmStatusFilter,
    onRefresh,
}) => {
    const navigate = useNavigate();

    const filterLabel = useMemo(() => {
        if (!realmStatusFilter.length) return "All";
        return realmStatusFilter.join(", ");
    }, [realmStatusFilter]);

    return (
        <div className="tab-table-container">
            <div className="tab-table-main">
                <div className="table-card kc-listTableCard" style={{ flex: 1 }}>
                    <DataTable<RealmRow>
                        data={Array.isArray(realms) ? realms : []}
                        columns={columns}
                        keyField="id"
                        onRowClick={onRowClick}
                        loading={loading}
                        error={error}
                        searchable
                        searchPlaceholder="Search realms..."
                        onRefresh={onRefresh}
                        toolbarFilters={{
                            left: (
                                <div className="kc_toolbarFilters">
                                    <MultiSelectCheckbox<RealmStatus>
                                        inline
                                        label="Status"
                                        options={[
                                            { value: "Active", label: "Active" },
                                            { value: "Inactive", label: "Inactive" },
                                            { value: "Draft", label: "Draft" },
                                        ]}
                                        value={realmStatusFilter}
                                        onChange={setRealmStatusFilter}
                                        placeholder="All"
                                        portal
                                    />

                                    {realmStatusFilter.length > 0 && (
                                        <>
                                            <span className="kc_filterBadge" title={`Status: ${filterLabel}`}>
                                                Status: {filterLabel}
                                            </span>

                                            <button
                                                type="button"
                                                className="kc_btn kc_btn_icon"
                                                title="Clear filters"
                                                onClick={() => setRealmStatusFilter([])}
                                                aria-label="Clear filters"
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ),
                            right: (
                                <button className="kc-btn kc-btn-primary" onClick={() => navigate("/realms/new")}>
                                    <Plus size={16} /> Create realm
                                </button>
                            ),
                        }}
                        paginated
                        pageSize={10}
                        pageSizeOptions={[10, 25, 50, 100]}
                        striped
                        hoverable
                        stickyHeader
                        emptyMessage="No realms found"
                        minHeight="100%"
                    />
                </div>
            </div>
        </div>
    );
};

export default RealmsContent;