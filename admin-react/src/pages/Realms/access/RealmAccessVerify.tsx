// src/pages/Realms/access/RealmAccessVerify.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

import WorkflowLayout from "../../../components/workflow/WorkflowLayout";
import DataTable, { TableColumn } from "../../../components/common/DataTable";
import { Badge } from "../../../components/common/Badge";
import { MultiSelectCheckbox } from "../../../components/common/MultiSelectCheckbox";

import AccessRequestDrawer from "./AccessRequestDrawer";
import { useAccessRequestsLive } from "./useAccessRequestsLive";

import {
    loadAccessRequests,
    loadAccessEvents,
    updateRequest,
    AccessRequest,
    AccessRequestEvent,
} from "./accessRequestsStore";

import {
    getTodayISO,
    normalizeDateRange,
    dateChipText,
    buildOptions,
    cascadedOptions,
    pruneSelectedByOptions,
    applyFiltersWithDate,
    norm,
    DateRange,
} from "./accessFilterUtils";

import { evaluateGovernance, canProceed, governanceSummary } from "./governancePolicy";

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

type VerifyRow = AccessRequest & {
    applicationName?: string;
};

const RealmAccessVerify: React.FC = () => {
    const [requests, setRequests] = useState<AccessRequest[]>(() => loadAccessRequests());
    const [events, setEvents] = useState<AccessRequestEvent[]>(() => loadAccessEvents());

    const [selected, setSelected] = useState<AccessRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // ===== filters =====
    const [realmFilter, setRealmFilter] = useState<string[]>([]);
    const [appFilter, setAppFilter] = useState<string[]>([]);
    const [targetUserFilter, setTargetUserFilter] = useState<string[]>([]);
    const [roleFilter, setRoleFilter] = useState<string[]>([]);
    const [requesterFilter, setRequesterFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);

    const todayISO = useMemo(() => getTodayISO(), []);

    const [dateRange, setDateRange] = useState<DateRange>({});
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const dateRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!dateMenuOpen) return;

        const onDown = (e: MouseEvent) => {
            if (!dateRef.current) return;
            if (!dateRef.current.contains(e.target as Node)) setDateMenuOpen(false);
        };

        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [dateMenuOpen]);

    const refresh = () => {
        setRequests(loadAccessRequests());
        setEvents(loadAccessEvents());
    };
    useAccessRequestsLive(refresh);

    const clearAllFilters = () => {
        setRealmFilter([]);
        setAppFilter([]);
        setTargetUserFilter([]);
        setRoleFilter([]);
        setRequesterFilter([]);
        setStatusFilter([]);
        setDateRange({});
        setDateMenuOpen(false);
    };

    const setFrom = (v: string) =>
        setDateRange((p) => normalizeDateRange({ ...p, from: v }, { maxIso: todayISO, fixOrder: "snap" }));

    const setTo = (v: string) =>
        setDateRange((p) => normalizeDateRange({ ...p, to: v }, { maxIso: todayISO, fixOrder: "snap" }));

    // enrich with applicationName (supports both applicationName/appName)
    const rows: VerifyRow[] = useMemo(() => {
        return requests.map((r) => ({
            ...r,
            applicationName: norm((r as any)?.applicationName || (r as any)?.appName || ""),
        }));
    }, [requests]);

    // options
    const realmOptions = useMemo(() => buildOptions(rows, (r) => r.realmName), [rows]);

    const appOptions = useMemo(
        () =>
            cascadedOptions({
                rows,
                parentSelected: realmFilter,
                getParent: (r) => r.realmName,
                getChild: (r) => (r as VerifyRow).applicationName,
            }),
        [rows, realmFilter]
    );

    const targetUserOptions = useMemo(() => buildOptions(rows, (r) => r.targetUser), [rows]);
    const roleOptions = useMemo(() => buildOptions(rows, (r) => r.roleRequested), [rows]);
    const requesterOptions = useMemo(() => buildOptions(rows, (r) => r.requester), [rows]);
    const statusOptions = useMemo(() => buildOptions(rows, (r) => r.status), [rows]);

    // keep appFilter valid when realmFilter changes
    useEffect(() => {
        if (!appFilter.length) return;
        const next = pruneSelectedByOptions(appFilter, appOptions);
        if (next.length !== appFilter.length) setAppFilter(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [realmFilter, appOptions]);

    // Apply filters (default verify queue = Approved if no status chosen)
    const filteredRows = useMemo(() => {
        const effectiveStatus = statusFilter.length ? statusFilter : ["Approved"];

        const out = applyFiltersWithDate<VerifyRow>({
            rows,
            multi: {
                realm: { selected: realmFilter, getValue: (r) => r.realmName },
                app: { selected: appFilter, getValue: (r) => (r as VerifyRow).applicationName },
                target: { selected: targetUserFilter, getValue: (r) => r.targetUser },
                role: { selected: roleFilter, getValue: (r) => r.roleRequested },
                requester: { selected: requesterFilter, getValue: (r) => r.requester },
                status: { selected: effectiveStatus, getValue: (r) => r.status },
            },
            date: { range: dateRange, getValue: (r) => r.updatedAt },
        });

        return out.slice().sort((a, b) => (String(a.updatedAt) < String(b.updatedAt) ? 1 : -1));
    }, [rows, realmFilter, appFilter, targetUserFilter, roleFilter, requesterFilter, statusFilter, dateRange]);

    const dateText = useMemo(() => dateChipText(dateRange), [dateRange]);

    const hasAnyFilters =
        realmFilter.length ||
        appFilter.length ||
        targetUserFilter.length ||
        roleFilter.length ||
        requesterFilter.length ||
        statusFilter.length ||
        dateRange.from ||
        dateRange.to;

    const openRequest = (req: AccessRequest) => {
        setSelected(req);
        setDrawerOpen(true);
    };

    const onVerify = (id: string) => {
        const req = requests.find((r) => r.id === id);
        if (!req) return;

        const gov = evaluateGovernance({ request: req, actor, action: "verify" });
        if (!canProceed(gov)) {
            window.alert(governanceSummary(gov));
            return;
        }

        updateRequest(id, { status: "Verified", verifier: actor }, actor, "VERIFIED", "Verified by verifier.");
        setDrawerOpen(false);
        refresh();
    };

    const columns: TableColumn<VerifyRow>[] = useMemo(
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
                            openRequest(row as AccessRequest);
                        }}
                        title="Open request details"
                    >
                        {String(v)}
                    </button>
                ),
            },
            { key: "realmName", label: "Realm", width: "220px" },
            { key: "applicationName", label: "Application", width: "200px" },
            { key: "targetUser", label: "Target User", width: "170px" },
            { key: "roleRequested", label: "Role", width: "150px" },
            { key: "requester", label: "Requester", width: "160px" },
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
                width: "210px",
                render: (v) => new Date(String(v)).toLocaleString(),
            },
            {
                key: "actions",
                label: "Actions",
                width: "140px",
                sortable: false,
                render: (_v, row) => (
                    <button
                        className="kc-btn kc-btn-primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            openRequest(row as AccessRequest);
                        }}
                    >
                        Verify
                    </button>
                ),
            },
        ],
        [requests]
    );

    return (
        <WorkflowLayout activeStep="verify" title="" subtitle="">
            <div className="tab-table-container" style={{ position: "relative" }}>
                <div className="table-card kc_realmCard" style={{ flex: 1 }}>
                    <DataTable<VerifyRow>
                        data={filteredRows}
                        columns={columns}
                        keyField="id"
                        searchable
                        searchPlaceholder="Search verification queue..."
                        paginated
                        pageSize={10}
                        pageSizeOptions={[10, 25, 50]}
                        striped
                        hoverable
                        stickyHeader
                        emptyMessage="No requests waiting for verification"
                        minHeight="100%"
                        onRowClick={(row) => openRequest(row as AccessRequest)}
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
                                        label="Application"
                                        options={appOptions}
                                        value={appFilter}
                                        onChange={setAppFilter}
                                        placeholder={realmFilter.length ? "Apps in realm" : "All"}
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
                                        label="Requester"
                                        options={requesterOptions}
                                        value={requesterFilter}
                                        onChange={setRequesterFilter}
                                        placeholder="All"
                                        portal
                                    />

                                    <MultiSelectCheckbox<string>
                                        inline
                                        label="Status"
                                        options={statusOptions}
                                        value={statusFilter}
                                        onChange={setStatusFilter}
                                        placeholder="Approved (default)"
                                        portal
                                    />

                                    {/* Date dropdown */}
                                    <div className="kc_filterGroup" ref={dateRef}>
                                        <div className="kc_dateFilterWrap">
                                            <button
                                                type="button"
                                                className={`kc-filterChip ${dateMenuOpen ? "is-open" : ""}`}
                                                onClick={() => setDateMenuOpen((v) => !v)}
                                                aria-expanded={dateMenuOpen}
                                            >
                                                <span className="kc-filterChipLabel">Updated</span>
                                                <span className="kc-filterChipValue">{dateText}</span>
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
                                        {appFilter.length > 0 && <span className="kc_filterBadge">App: {appFilter.length}</span>}
                                        {targetUserFilter.length > 0 && <span className="kc_filterBadge">User: {targetUserFilter.length}</span>}
                                        {roleFilter.length > 0 && <span className="kc_filterBadge">Role: {roleFilter.length}</span>}
                                        {requesterFilter.length > 0 && <span className="kc_filterBadge">Requester: {requesterFilter.length}</span>}
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
                                </div>
                            ),
                        }}
                    />

                    <AccessRequestDrawer
                        open={drawerOpen}
                        mode="verify"
                        request={selected}
                        events={events}
                        onClose={() => setDrawerOpen(false)}
                        onVerify={onVerify}
                    />
                </div>
            </div>
        </WorkflowLayout>
    );
};

export default RealmAccessVerify;