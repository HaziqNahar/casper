// src/pages/Realms/access/RealmAccessAudit.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

import WorkflowLayout from "../../../components/workflow/WorkflowLayout";
import DataTable, { TableColumn } from "../../../components/common/DataTable";
import { Badge } from "../../../components/common/Badge";
import { MultiSelectCheckbox } from "../../../components/common/MultiSelectCheckbox";

import {
    loadAccessEvents,
    loadAccessRequests,
    AccessRequestEvent,
    AccessRequest,
} from "./accessRequestsStore";

import { useAccessRequestsLive } from "./useAccessRequestsLive";
import AccessRequestDrawer from "./AccessRequestDrawer";

import {
    getTodayISO,
    normalizeDateRange,
    dateChipText as dateChipTextUtil,
    buildOptions,
    cascadedOptions,
    pruneSelectedByOptions,
    applyFiltersWithDate,
    applyMultiFilters,
    norm,
    DateRange,
    Option,
} from "./accessFilterUtils";

import "../../../styles/browserTabs.css";
import "../../../styles/component.css";

// --- badge mapping ---
const typeVariant = (t: string) => {
    if (t === "APPROVED" || t === "VERIFIED") return "success";
    if (t === "REJECTED" || t === "CANCELLED") return "danger";
    if (t === "SUBMITTED") return "info";
    return "neutral";
};

// --- Row enriched with realm/app for filtering ---
type AuditRow = AccessRequestEvent & {
    realmName?: string;
    applicationName?: string;
    targetUser?: string;
    roleRequested?: string;
    status?: string;
};

const RealmAccessAudit: React.FC = () => {
    const todayISO = useMemo(() => getTodayISO(), []);

    // ---- date dropdown + outside click ----
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

    // data
    const [events, setEvents] = useState<AccessRequestEvent[]>(() => loadAccessEvents());
    const [requests, setRequests] = useState<AccessRequest[]>(() => loadAccessRequests());

    const [selected, setSelected] = useState<AccessRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // filters
    const [realmFilter, setRealmFilter] = useState<string[]>([]);
    const [appFilter, setAppFilter] = useState<string[]>([]);
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const [actorFilter, setActorFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [targetUserFilter, setTargetUserFilter] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>({}); // ✅ shared util type

    const refresh = () => {
        setEvents(loadAccessEvents());
        setRequests(loadAccessRequests());
    };

    useAccessRequestsLive(refresh);

    const clearAllFilters = () => {
        setRealmFilter([]);
        setAppFilter([]);
        setTypeFilter([]);
        setActorFilter([]);
        setStatusFilter([]);
        setTargetUserFilter([]);
        setDateRange({});
        setDateMenuOpen(false);
    };

    // request lookup
    const reqById = useMemo(() => {
        const m = new Map<string, AccessRequest>();
        for (const r of requests) m.set(r.id, r);
        return m;
    }, [requests]);

    // Enrich events with realm/app fields for columns + filtering
    const rows: AuditRow[] = useMemo(() => {
        return events.map((e) => {
            const r = reqById.get(e.requestId);
            return {
                ...e,
                realmName: r?.realmName ?? "",
                applicationName: (r as any)?.applicationName ?? (r as any)?.appName ?? "",
                targetUser: r?.targetUser ?? "",
                roleRequested: r?.roleRequested ?? "",
                status: r?.status ?? "",
            };
        });
    }, [events, reqById]);

    // ---- options using accessFilterUtils ----
    const realmOptions: Option[] = useMemo(
        () => buildOptions(rows, (r) => r.realmName),
        [rows]
    );

    // app options cascade by selected realms
    const appOptions: Option[] = useMemo(() => {
        return cascadedOptions({
            rows,
            parentSelected: realmFilter,
            getParent: (r) => (r as AuditRow).realmName,
            getChild: (r) => (r as AuditRow).applicationName,
        });
    }, [rows, realmFilter]);

    const typeOptions: Option[] = useMemo(
        () => buildOptions(rows, (r) => (r as AuditRow).type),
        [rows]
    );

    const actorOptions: Option[] = useMemo(
        () => buildOptions(rows, (r) => (r as AuditRow).actor),
        [rows]
    );

    const statusOptions: Option[] = useMemo(
        () => buildOptions(rows, (r) => (r as AuditRow).status),
        [rows]
    );

    // target user options cascade by realm + app
    const targetUserOptions: Option[] = useMemo(() => {
        const base = applyMultiFilters(rows, {
            realm: { selected: realmFilter, getValue: (r) => (r as AuditRow).realmName },
            app: { selected: appFilter, getValue: (r) => (r as AuditRow).applicationName },
        });

        return buildOptions(base, (r) => (r as AuditRow).targetUser);
    }, [rows, realmFilter, appFilter]);

    // prune cascaded selections when parent filters change
    useEffect(() => {
        setAppFilter((prev) => pruneSelectedByOptions(prev, appOptions));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appOptions]);

    useEffect(() => {
        setTargetUserFilter((prev) => pruneSelectedByOptions(prev, targetUserOptions));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUserOptions]);

    // ---- date handlers using accessFilterUtils ----
    const setFrom = (v: string) => {
        setDateRange((prev) =>
            normalizeDateRange({ ...prev, from: norm(v) || undefined }, { maxIso: todayISO, fixOrder: "snap" })
        );
    };

    const setTo = (v: string) => {
        setDateRange((prev) =>
            normalizeDateRange({ ...prev, to: norm(v) || undefined }, { maxIso: todayISO, fixOrder: "snap" })
        );
    };

    // ---- filtered rows using accessFilterUtils ----
    const filteredRows: AuditRow[] = useMemo(() => {
        return applyFiltersWithDate<AuditRow>({
            rows,
            multi: {
                realm: { selected: realmFilter, getValue: (r) => r.realmName },
                app: { selected: appFilter, getValue: (r) => r.applicationName },
                type: { selected: typeFilter, getValue: (r) => r.type },
                actor: { selected: actorFilter, getValue: (r) => r.actor },
                status: { selected: statusFilter, getValue: (r) => r.status },
                targetUser: { selected: targetUserFilter, getValue: (r) => r.targetUser },
            },
            date: {
                range: dateRange,
                getValue: (r) => r.at, // event timestamp
            },
        });
    }, [rows, realmFilter, appFilter, typeFilter, actorFilter, statusFilter, targetUserFilter, dateRange]);

    const openRequest = (requestId: string) => {
        const req = reqById.get(requestId) || null;
        setSelected(req);
        setDrawerOpen(true);
    };

    const columns: TableColumn<AuditRow>[] = useMemo(
        () => [
            {
                key: "requestId",
                label: "Request ID",
                width: "170px",
                render: (v, row) => (
                    <button
                        type="button"
                        className="kc-linkcell kc-mono"
                        onClick={(e) => {
                            e.stopPropagation();
                            openRequest(String(row.requestId));
                        }}
                        title="Open request details"
                    >
                        {String(v)}
                    </button>
                ),
            },
            { key: "realmName", label: "Realm", width: "220px" },
            { key: "applicationName", label: "Application", width: "200px" },
            {
                key: "targetUser",
                label: "Target User",
                width: "180px",
            },
            {
                key: "type",
                label: "Event",
                width: "140px",
                align: "center",
                render: (v) => <Badge variant={typeVariant(String(v)) as any}>{String(v)}</Badge>,
            },
            { key: "actor", label: "Actor", width: "160px" },
            {
                key: "at",
                label: "Time",
                width: "210px",
                render: (v) => new Date(String(v)).toLocaleString(),
            },
            {
                key: "message",
                label: "Message",
                render: (v) => <span className="kc-ellipsis">{String(v || "")}</span>,
            },
        ],
        [reqById]
    );

    const dateChipText = useMemo(() => dateChipTextUtil(dateRange), [dateRange]);

    const hasAnyFilters =
        realmFilter.length ||
        appFilter.length ||
        typeFilter.length ||
        actorFilter.length ||
        statusFilter.length ||
        targetUserFilter.length ||
        dateRange.from ||
        dateRange.to;

    return (
        <WorkflowLayout activeStep="audit" title="" subtitle="">
            <div className="tab-table-container" style={{ position: "relative" }}>
                <div className="table-card kc_realmCard" style={{ flex: 1 }}>
                    <DataTable<AuditRow>
                        data={filteredRows}
                        columns={columns}
                        keyField="id"
                        searchable
                        searchPlaceholder="Search audit log..."
                        paginated
                        pageSize={10}
                        pageSizeOptions={[10, 25, 50]}
                        striped
                        hoverable
                        stickyHeader
                        emptyMessage="No audit events"
                        minHeight="100%"
                        onRowClick={(evt) => openRequest(evt.requestId)}
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
                                        label="Event"
                                        options={typeOptions}
                                        value={typeFilter}
                                        onChange={setTypeFilter}
                                        placeholder="All"
                                        portal
                                    />

                                    <MultiSelectCheckbox<string>
                                        inline
                                        label="Actor"
                                        options={actorOptions}
                                        value={actorFilter}
                                        onChange={setActorFilter}
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

                                    {/* Date dropdown */}
                                    <div className="kc_filterGroup" ref={dateRef}>
                                        <div className="kc_dateFilterWrap">
                                            <button
                                                type="button"
                                                className={`kc-filterChip ${dateMenuOpen ? "is-open" : ""}`}
                                                onClick={() => setDateMenuOpen((v) => !v)}
                                                aria-expanded={dateMenuOpen}
                                            >
                                                <span className="kc-filterChipLabel">Date</span>
                                                <span className="kc-filterChipValue">{dateChipText}</span>
                                                {dateMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>

                                            {dateMenuOpen && (
                                                <div
                                                    className="kc_dateMenu"
                                                    role="dialog"
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
                                                    <div className="kc_dateMenuTitle">Event date range</div>

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

                                                        <button
                                                            type="button"
                                                            className="kc-btn kc-btn-primary"
                                                            onClick={() => setDateMenuOpen(false)}
                                                        >
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
                                        {typeFilter.length > 0 && <span className="kc_filterBadge">Event: {typeFilter.length}</span>}
                                        {actorFilter.length > 0 && <span className="kc_filterBadge">Actor: {actorFilter.length}</span>}
                                        {statusFilter.length > 0 && <span className="kc_filterBadge">Status: {statusFilter.length}</span>}
                                        {(dateRange.from || dateRange.to) && (
                                            <span className="kc_filterBadge">
                                                Date: {dateRange.from || "…"} – {dateRange.to || "…"}
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
                        mode="audit"
                        request={selected}
                        events={events}
                        onClose={() => setDrawerOpen(false)}
                    />
                </div>
            </div>
        </WorkflowLayout>
    );
};

export default RealmAccessAudit;