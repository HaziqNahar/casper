// src/pages/Realms/access/RealmAccessRequest.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { X, ChevronDown, ChevronUp } from "lucide-react";

import WorkflowLayout from "../../../components/workflow/WorkflowLayout";
import DataTable, { TableColumn } from "../../../components/common/DataTable";
import { Badge } from "../../../components/common/Badge";
import { MultiSelectCheckbox } from "../../../components/common/MultiSelectCheckbox";

import AccessRequestDrawer from "./AccessRequestDrawer";
import CreateAccessRequestModal from "./CreateAccessRequestModal";
import { useAccessRequestsLive } from "./useAccessRequestsLive";

import {
    loadAccessRequests,
    loadAccessEvents,
    updateRequest,
    createAccessRequest,
    AccessRequest,
} from "./accessRequestsStore";

import {
    DateRange,
    buildOptions,
    applyFiltersWithDate,
    normalizeDateRange,
    dateChipText as dateChipTextUtil,
    getTodayISO,
} from "./accessFilterUtils";

import "../../../styles/browserTabs.css";
import "../../../styles/component.css";

const actor = "admin";

const statusVariant = (s: string) => {
    if (s === "Draft") return "neutral";
    if (s === "Submitted") return "info";
    if (s === "Approved") return "success";
    if (s === "Rejected") return "danger";
    if (s === "Verified") return "success";
    if (s === "Cancelled") return "danger";
    return "neutral";
};

const RealmAccessRequest: React.FC = () => {
    const [rows, setRows] = useState<AccessRequest[]>(() => loadAccessRequests());
    const [events, setEvents] = useState(() => loadAccessEvents());

    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState<AccessRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [requests, setRequests] = useState<AccessRequest[]>(() => loadAccessRequests());

    // ===== filters =====
    const [realmFilter, setRealmFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [roleFilter, setRoleFilter] = useState<string[]>([]);
    const [targetUserFilter, setTargetUserFilter] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>({}); // Updated range

    // date dropdown + outside click
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const dateRef = useRef<HTMLDivElement>(null);

    const todayISO = useMemo(() => getTodayISO(), []);

    useEffect(() => {
        if (!dateMenuOpen) return;

        const onDown = (e: MouseEvent) => {
            if (!dateRef.current) return;
            if (!dateRef.current.contains(e.target as Node)) setDateMenuOpen(false);
        };

        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [dateMenuOpen]);

    const setFrom = (v: string) => {
        setDateRange((prev) =>
            normalizeDateRange({ ...prev, from: v || undefined }, { maxIso: todayISO, fixOrder: "snap" })
        );
    };

    const setTo = (v: string) => {
        setDateRange((prev) =>
            normalizeDateRange({ ...prev, to: v || undefined }, { maxIso: todayISO, fixOrder: "snap" })
        );
    };

    const refresh = () => {
        setRows(loadAccessRequests());
        setEvents(loadAccessEvents());
        setRequests(loadAccessRequests());
    };
    useAccessRequestsLive(refresh);

    const clearAllFilters = () => {
        setRealmFilter([]);
        setStatusFilter([]);
        setRoleFilter([]);
        setTargetUserFilter([]);
        setDateRange({});
        setDateMenuOpen(false);
    };

    // Build fast lookup by requestId
    const reqById = useMemo(() => {
        const m = new Map<string, AccessRequest>();
        for (const r of requests) m.set(r.id, r);
        return m;
    }, [requests]);

    const openRequest = (requestId: string) => {
        const req = reqById.get(requestId) || null;
        setSelected(req);
        setDrawerOpen(true);
    };

    const columns: TableColumn<AccessRequest>[] = useMemo(
        () => [
            {
                key: "id",
                label: "Request ID",
                width: "150px",
                render: (v, row) => (
                    <button
                        type="button"
                        className="kc-linkcell kc-mono"
                        onClick={(e) => {
                            e.stopPropagation();
                            openRequest(String(row?.id || v));
                        }}
                        title="Open request details"
                    >
                        {String(v)}
                    </button>
                ),
            },
            { key: "realmName", label: "Realm", width: "220px" },
            { key: "targetUser", label: "Target User", width: "170px" },
            { key: "roleRequested", label: "Role", width: "150px" },
            {
                key: "status",
                label: "Status",
                width: "130px",
                align: "center",
                render: (v) => <Badge variant={statusVariant(String(v)) as any}>{String(v)}</Badge>,
            },
            {
                key: "updatedAt",
                label: "Updated",
                width: "200px",
                render: (v) => new Date(String(v)).toLocaleString(),
            },
            {
                key: "actions",
                label: "Actions",
                width: "220px",
                sortable: false,
                render: (_v, row) => (
                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            className="kc-btn kc-btn-primary"
                            disabled={row.status !== "Draft"}
                            onClick={(e) => {
                                e.stopPropagation();
                                updateRequest(row.id, { status: "Submitted" }, actor, "SUBMITTED", "Submitted for approval");
                                refresh();
                            }}
                        >
                            Submit
                        </button>

                        <button
                            className="kc-btn kc-btn-ghost"
                            disabled={row.status === "Verified" || row.status === "Cancelled"}
                            onClick={(e) => {
                                e.stopPropagation();
                                updateRequest(row.id, { status: "Cancelled" }, actor, "CANCELLED", "Cancelled by requester");
                                refresh();
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                ),
            },
        ],
        [reqById]
    );

    // Prefill create modal from query params
    const location = useLocation();
    const prefill = useMemo(() => {
        const p = new URLSearchParams(location.search);
        return {
            realmId: p.get("realmId") ?? "",
            realmName: p.get("realmName") ?? "",
            targetUser: p.get("targetUser") ?? "",
            roleRequested: p.get("roleRequested") ?? "",
        };
    }, [location.search]);

    useEffect(() => {
        if (prefill.realmId || prefill.targetUser || prefill.roleRequested) {
            setCreateOpen(true);
        }
    }, [prefill.realmId, prefill.targetUser, prefill.roleRequested]);

    // ===== options (aligned with Audit utils) =====
    const realmOptions = useMemo(() => buildOptions(rows, (r) => r.realmName), [rows]);
    const targetUserOptions = useMemo(() => buildOptions(rows, (r) => r.targetUser), [rows]);
    const roleOptions = useMemo(() => buildOptions(rows, (r) => r.roleRequested), [rows]);
    const statusOptions = useMemo(() => buildOptions(rows, (r) => r.status), [rows]);

    // ===== filtered rows (aligned with Audit applyFiltersWithDate) =====
    const filteredRows = useMemo(() => {
        return applyFiltersWithDate({
            rows,
            multi: {
                realm: { selected: realmFilter, getValue: (r: AccessRequest) => r.realmName },
                user: { selected: targetUserFilter, getValue: (r: AccessRequest) => r.targetUser },
                role: { selected: roleFilter, getValue: (r: AccessRequest) => r.roleRequested },
                status: { selected: statusFilter, getValue: (r: AccessRequest) => r.status },
            },
            date: { range: dateRange, getValue: (r: AccessRequest) => r.updatedAt },
        });
    }, [rows, realmFilter, targetUserFilter, roleFilter, statusFilter, dateRange]);

    const dateChipText = useMemo(() => dateChipTextUtil(dateRange), [dateRange]);

    const hasAnyFilters =
        realmFilter.length ||
        statusFilter.length ||
        roleFilter.length ||
        targetUserFilter.length ||
        !!dateRange.from ||
        !!dateRange.to;

    return (
        <WorkflowLayout activeStep="request" title="" subtitle="">
            <div className="tab-table-container" style={{ position: "relative" }}>
                <div className="table-card kc_realmCard" style={{ flex: 1 }}>
                    <DataTable<AccessRequest>
                        data={filteredRows}
                        columns={columns}
                        keyField="id"
                        searchable
                        searchPlaceholder="Search access requests..."
                        paginated
                        pageSize={10}
                        pageSizeOptions={[10, 25, 50]}
                        striped
                        hoverable
                        stickyHeader
                        emptyMessage="No access requests"
                        minHeight="100%"
                        onRowClick={(row) => {
                            setSelected(row);
                            setDrawerOpen(true);
                        }}
                        onRefresh={refresh}
                        toolbarFilters={{
                            left: (
                                <div className="kc_toolbarFilters">
                                    <MultiSelectCheckbox<string>
                                        inline
                                        label="Realm"
                                        options={realmOptions}
                                        value={realmFilter}
                                        onChange={setRealmFilter}
                                        placeholder="All"
                                        portal
                                    />

                                    <MultiSelectCheckbox<string>
                                        inline
                                        label="Target User"
                                        options={targetUserOptions}
                                        value={targetUserFilter}
                                        onChange={setTargetUserFilter}
                                        placeholder="All"
                                        portal
                                    />

                                    <MultiSelectCheckbox<string>
                                        inline
                                        label="Role"
                                        options={roleOptions}
                                        value={roleFilter}
                                        onChange={setRoleFilter}
                                        placeholder="All"
                                        portal
                                    />

                                    <MultiSelectCheckbox<string>
                                        inline
                                        label="Status"
                                        options={statusOptions}
                                        value={statusFilter}
                                        onChange={setStatusFilter}
                                        placeholder="All"
                                        portal
                                    />

                                    {/* Updated date range */}
                                    <div className="kc_filterGroup" ref={dateRef}>
                                        <div className="kc_dateFilterWrap">
                                            <button
                                                type="button"
                                                className={`kc-filterChip ${dateMenuOpen ? "is-open" : ""}`}
                                                onClick={() => setDateMenuOpen((v) => !v)}
                                                aria-expanded={dateMenuOpen}
                                            >
                                                <span className="kc-filterChipLabel">Updated</span>
                                                <span className="kc-filterChipValue">{dateChipText}</span>
                                                {dateMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>

                                            {dateMenuOpen && (
                                                <div className="kc_dateMenu" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
                                                    <div className="kc_dateMenuTitle">Updated date range</div>

                                                    <div className="kc_dateMenuRow">
                                                        <label className="kc_dateMenuLabel">From</label>
                                                        <input
                                                            className="kc-input kc_filterDate"
                                                            type="date"
                                                            max={todayISO}
                                                            value={dateRange.from || ""}
                                                            onChange={(e) => setFrom(e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="kc_dateMenuRow">
                                                        <label className="kc_dateMenuLabel">To</label>
                                                        <input
                                                            className="kc-input kc_filterDate"
                                                            type="date"
                                                            max={todayISO}
                                                            value={dateRange.to || ""}
                                                            onChange={(e) => setTo(e.target.value)}
                                                        />
                                                    </div>

                                                    <div className="kc_dateMenuActions">
                                                        <button
                                                            type="button"
                                                            className="kc-btn kc-btn-ghost"
                                                            onClick={() => {
                                                                setDateRange({});
                                                                setDateMenuOpen(false);
                                                            }}
                                                        >
                                                            Clear
                                                        </button>

                                                        <button type="button" className="kc-btn kc-btn-primary" onClick={() => setDateMenuOpen(false)}>
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* badges */}
                                    <div className="kc_filterBadges">
                                        {realmFilter.length > 0 && <span className="kc_filterBadge">Realm: {realmFilter.length}</span>}
                                        {targetUserFilter.length > 0 && <span className="kc_filterBadge">User: {targetUserFilter.length}</span>}
                                        {roleFilter.length > 0 && <span className="kc_filterBadge">Role: {roleFilter.length}</span>}
                                        {statusFilter.length > 0 && <span className="kc_filterBadge">Status: {statusFilter.length}</span>}
                                        {(dateRange.from || dateRange.to) && (
                                            <span className="kc_filterBadge">
                                                Updated: {dateRange.from || "…"} – {dateRange.to || "…"}
                                            </span>
                                        )}
                                    </div>

                                    {/* clear */}
                                    {hasAnyFilters ? (
                                        <button
                                            type="button"
                                            className="kc_btn kc_btn_icon"
                                            title="Clear all filters"
                                            onClick={clearAllFilters}
                                            aria-label="Clear all filters"
                                        >
                                            <X size={16} />
                                        </button>
                                    ) : null}
                                </div>
                            ),
                            right: (
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span className="kc_textMuted" style={{ fontWeight: 800, fontSize: 12 }}>
                                        Showing <b>{filteredRows.length}</b>
                                    </span>

                                    <button className="kc-btn kc-btn-primary" onClick={() => setCreateOpen(true)}>
                                        + New Access Request
                                    </button>
                                </div>
                            ),
                        }}
                    />

                    <AccessRequestDrawer
                        actor={actor}
                        open={drawerOpen}
                        mode="request"
                        request={selected}
                        events={events}
                        onClose={() => setDrawerOpen(false)}
                        onSubmit={(id) => {
                            updateRequest(id, { status: "Submitted" }, actor, "SUBMITTED", "Submitted for approval.");
                            refresh();
                        }}
                        onCancel={(id) => {
                            updateRequest(id, { status: "Cancelled" }, actor, "CANCELLED", "Cancelled by requester.");
                            refresh();
                        }}
                    />

                    <CreateAccessRequestModal
                        open={createOpen}
                        onClose={() => setCreateOpen(false)}
                        requester={actor}
                        initial={prefill}
                        onCreate={(input) => createAccessRequest(input)}
                        onCreated={(req) => {
                            refresh();
                            setSelected(req);
                            setDrawerOpen(true);
                        }}
                    />
                </div>
            </div>
        </WorkflowLayout>
    );
};

export default RealmAccessRequest;