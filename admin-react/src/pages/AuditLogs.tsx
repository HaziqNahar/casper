import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AppWindow, Calendar, Download, Globe, RefreshCw, ShieldAlert, User, X } from "lucide-react";
import DataTable, { type TableColumn } from "../components/common/DataTable";
import { Badge } from "../components/common/Badge";
import { MultiSelectCheckbox } from "../components/common/MultiSelectCheckbox";
import { governanceApi } from "../services/governanceApi";
import {
    type AuditLogEntry,
    actionLabel,
    actionVariant,
    entityTypeLabel,
    entityTypeVariant,
    safeParseRecord,
} from "./governance/contracts";
import {
    type DateRange,
    dateChipText,
    getTodayISO,
    norm,
    normalizeDateRange,
} from "./Realms/access/accessFilterUtils";

type AuditLogFacets = {
    entityTypes: string[];
    actions: string[];
    actors: string[];
};

const statIcon = (entityType: string) => {
    if (entityType === "realm") return <Globe size={18} />;
    if (entityType === "application") return <AppWindow size={18} />;
    if (entityType === "user") return <User size={18} />;
    if (entityType === "realm_access_request") return <ShieldAlert size={18} />;
    return <Activity size={18} />;
};

const csvEscape = (value: unknown) => {
    const normalized = value == null ? "" : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
};

const makeAuditCsv = (rows: AuditLogEntry[]) => {
    const header = [
        "Created At",
        "Actor",
        "Entity Type",
        "Entity Id",
        "Entity Name",
        "Action",
        "Details",
        "Reason",
        "Result",
        "Confirmation Mode",
        "Before",
        "After",
        "Metadata",
    ];

    const lines = rows.map((row) =>
        [
            row.createdAt,
            row.actorUsername,
            entityTypeLabel(row.entityType),
            row.entityId,
            row.entityName,
            actionLabel(row.action),
            row.details ?? "",
            row.reason ?? "",
            row.result ?? "",
            row.confirmationMode ?? "",
            row.beforeJson ?? "",
            row.afterJson ?? "",
            row.metadataJson ?? "",
        ]
            .map(csvEscape)
            .join(",")
    );

    return [header.map(csvEscape).join(","), ...lines].join("\r\n");
};

export default function AuditLogsPage() {
    const todayISO = useMemo(() => getTodayISO(), []);
    const dateRef = useRef<HTMLDivElement>(null);
    const [rows, setRows] = useState<AuditLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<AuditLogEntry | null>(null);
    const [search, setSearch] = useState("");
    const [entityFilter, setEntityFilter] = useState<string[]>([]);
    const [actionFilter, setActionFilter] = useState<string[]>([]);
    const [actorFilter, setActorFilter] = useState<string[]>([]);
    const [facets, setFacets] = useState<AuditLogFacets>({ entityTypes: [], actions: [], actors: [] });
    const [dateRange, setDateRange] = useState<DateRange>({});
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const loadLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (search.trim()) params.set("search", search.trim());
            if (entityFilter.length) params.set("entityTypes", entityFilter.join(","));
            if (actionFilter.length) params.set("actions", actionFilter.join(","));
            if (actorFilter.length) params.set("actors", actorFilter.join(","));
            if (dateRange.from) params.set("dateFrom", dateRange.from);
            if (dateRange.to) params.set("dateTo", dateRange.to);
            params.set("page", String(page));
            params.set("pageSize", String(pageSize));
            const [next, facetResponse] = await Promise.all([
                governanceApi.auditLogs<{ items: AuditLogEntry[]; total: number }>(params.toString()),
                governanceApi.auditLogFacets<AuditLogFacets>(params.toString()),
            ]);
            setRows(next.items);
            setTotal(next.total);
            setFacets(facetResponse);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load audit logs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, entityFilter, actionFilter, actorFilter, dateRange.from, dateRange.to, page, pageSize]);

    useEffect(() => {
        if (!dateMenuOpen) return;
        const onDown = (e: MouseEvent) => {
            if (!dateRef.current) return;
            if (!dateRef.current.contains(e.target as Node)) setDateMenuOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [dateMenuOpen]);

    const entityOptions = useMemo(
        () => facets.entityTypes.map((value) => ({ value, label: entityTypeLabel(value) })),
        [facets.entityTypes]
    );
    const actionOptions = useMemo(
        () => facets.actions.map((value) => ({ value, label: actionLabel(value) })),
        [facets.actions]
    );
    const actorOptions = useMemo(
        () => facets.actors.map((value) => ({ value, label: value })),
        [facets.actors]
    );

    const latestEvent = rows[0];
    const realmEvents = rows.filter((row) => row.entityType === "realm").length;
    const appEvents = rows.filter((row) => row.entityType === "application").length;
    const userEvents = rows.filter((row) => row.entityType === "user").length;
    const realmAccessEvents = rows.filter((row) => row.entityType === "realm_access_request").length;
    const sensitiveEvents = rows.filter((row) => ["deactivate", "delete", "revoke_access"].includes(row.action)).length;

    const summaryCards = [
        { label: "Visible Events", value: rows.length, icon: <Activity size={18} />, tone: "neutral" },
        { label: "Sensitive Actions", value: sensitiveEvents, icon: <ShieldAlert size={18} />, tone: "danger" },
        { label: "Realm Events", value: realmEvents, icon: statIcon("realm"), tone: "info" },
        { label: "Application Events", value: appEvents, icon: statIcon("application"), tone: "purple" },
        { label: "User Events", value: userEvents, icon: statIcon("user"), tone: "success" },
        { label: "Realm Access Events", value: realmAccessEvents, icon: statIcon("realm_access_request"), tone: "warning" },
    ];

    const metadata = selected ? safeParseRecord(selected.metadataJson) : null;
    const beforeState = selected ? safeParseRecord(selected.beforeJson) : null;
    const afterState = selected ? safeParseRecord(selected.afterJson) : null;

    const columns = useMemo<TableColumn<AuditLogEntry>[]>(
        () => [
            {
                key: "createdAt",
                label: "Time",
                width: "210px",
                render: (value, row) => {
                    const date = new Date(String(value));
                    return (
                        <div className="audit-eventCell">
                            <div className="audit-eventTime">
                                {date.toLocaleDateString("en-SG")}
                            </div>
                            <div className="audit-eventTimeSub">
                                {date.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </div>
                            <div className="audit-eventId">#{row.id.slice(0, 8)}</div>
                        </div>
                    );
                },
            },
            {
                key: "actorUsername",
                label: "Actor",
                width: "160px",
                render: (value) => (
                    <div className="audit-actorCell">
                        <div className="audit-avatar">{String(value).slice(0, 2).toUpperCase()}</div>
                        <div className="audit-actorText">{String(value)}</div>
                    </div>
                ),
            },
            {
                key: "entityType",
                label: "Entity Type",
                width: "150px",
                render: (value) => (
                    <Badge variant={entityTypeVariant(String(value))}>
                        {entityTypeLabel(String(value))}
                    </Badge>
                ),
            },
            {
                key: "entityName",
                label: "Entity",
                width: "220px",
                render: (value, row) => (
                    <div className="audit-entityCell">
                        <div className="audit-entityName">{String(value)}</div>
                        <div className="audit-entityMeta">
                            {entityTypeLabel(row.entityType)} / {row.entityId.slice(0, 8)}
                        </div>
                    </div>
                ),
            },
            {
                key: "action",
                label: "Action",
                width: "180px",
                render: (value) => (
                    <Badge variant={actionVariant(String(value))}>
                        {actionLabel(String(value))}
                    </Badge>
                ),
            },
            {
                key: "details",
                label: "Details",
                render: (value, row) => (
                    <div className="audit-detailCell">
                        <div className="audit-detailTitle">{value ? String(value) : "No additional details"}</div>
                        <div className="audit-detailMeta">
                            {row.entityType === "realm_access_request"
                                ? "Request, approval, and verification context available in drawer"
                                : row.metadataJson
                                    ? "Click row to inspect metadata"
                                    : "No metadata payload"}
                        </div>
                    </div>
                ),
            },
        ],
        []
    );

    const hasAnyFilters = entityFilter.length || actionFilter.length || actorFilter.length || dateRange.from || dateRange.to;
    const currentDateChip = useMemo(() => dateChipText(dateRange), [dateRange]);

    const handleExportCsv = () => {
        const csv = makeAuditCsv(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        link.href = url;
        link.download = `casper-audit-logs-${stamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="audit-pageStack">
            <div className="audit-heroCard">
                <div className="audit-heroTop">
                    <div>
                        <div className="audit-heroTitle">Sensitive Action Audit Trail</div>
                        <div className="audit-heroSubtitle">
                            Review high-impact realm, application, and user administration events in one place.
                        </div>
                    </div>
                    <div className="audit-heroActions">
                        <button type="button" className="kc-btn kc-btn-ghost" onClick={handleExportCsv} disabled={rows.length === 0}>
                            <Download size={16} />
                            Export CSV
                        </button>
                        <button type="button" className="kc-btn kc-btn-primary" onClick={() => { void loadLogs(); }}>
                            <RefreshCw size={16} />
                            Refresh feed
                        </button>
                    </div>
                </div>

                <div className="audit-summaryGrid">
                    {summaryCards.map((card) => (
                        <div key={card.label} className={`audit-summaryCard is-${card.tone}`}>
                            <div className="audit-summaryIcon">{card.icon}</div>
                            <div>
                                <div className="audit-summaryLabel">{card.label}</div>
                                <div className="audit-summaryValue">{loading ? "..." : card.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="audit-latestStrip">
                    <span className="audit-latestLabel">Latest Event</span>
                    <span className="audit-latestValue">
                        {latestEvent
                            ? `${actionLabel(latestEvent.action)} on ${latestEvent.entityName} by ${latestEvent.actorUsername}`
                            : "No events recorded yet"}
                    </span>
                </div>
            </div>

            <div className="table-card kc-listTableCard">
                <DataTable<AuditLogEntry>
                    data={rows}
                    columns={columns}
                    keyField="id"
                    loading={loading}
                    error={error}
                    onRefresh={() => { void loadLogs(); }}
                    onRowClick={(row) => setSelected(row)}
                    searchable
                    searchPlaceholder="Search audit logs..."
                    searchValue={search}
                    onSearchChange={(value) => {
                        setSearch(value);
                        setPage(1);
                    }}
                    manualSearch
                    paginated
                    page={page}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 25, 50]}
                    totalRows={total}
                    onPageChange={setPage}
                    onPageSizeChange={(next) => {
                        setPageSize(next);
                        setPage(1);
                    }}
                    manualPagination
                    striped
                    hoverable
                    stickyHeader
                    stickyToolbar={false}
                    emptyMessage="No audit logs recorded yet"
                    toolbarFilters={{
                        left: (
                            <div className="audit-filterRow">
                                <MultiSelectCheckbox
                                    inline
                                    label="Entity"
                                    options={entityOptions}
                                    value={entityFilter}
                                    onChange={(next) => {
                                        setEntityFilter(next);
                                        setPage(1);
                                    }}
                                    placeholder="All"
                                    portal
                                />
                                <MultiSelectCheckbox
                                    inline
                                    label="Action"
                                    options={actionOptions}
                                    value={actionFilter}
                                    onChange={(next) => {
                                        setActionFilter(next);
                                        setPage(1);
                                    }}
                                    placeholder="All"
                                    portal
                                />
                                <MultiSelectCheckbox
                                    inline
                                    label="Actor"
                                    options={actorOptions}
                                    value={actorFilter}
                                    onChange={(next) => {
                                        setActorFilter(next);
                                        setPage(1);
                                    }}
                                    placeholder="All"
                                    portal
                                />
                                <div className="kc_filterGroup" ref={dateRef}>
                                    <div className="kc_dateFilterWrap">
                                        <button
                                            type="button"
                                            className={`kc-filterChip ${dateMenuOpen ? "is-open" : ""}`}
                                            onClick={() => setDateMenuOpen((v) => !v)}
                                            aria-expanded={dateMenuOpen}
                                        >
                                            <span className="kc-filterChipLabel">Date</span>
                                            <span className="kc-filterChipValue">{currentDateChip}</span>
                                            <Calendar size={14} />
                                        </button>

                                        {dateMenuOpen && (
                                            <div className="kc_dateMenu" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
                                                <div className="kc_dateMenuTitle">Audit date range</div>
                                                <div className="kc_dateMenuRow">
                                                    <label className="kc_dateMenuLabel">From</label>
                                                    <input
                                                        className="kc-input kc_filterDate"
                                                        type="date"
                                                        max={todayISO}
                                                        value={dateRange.from || ""}
                                                        onChange={(e) => {
                                                            setDateRange((prev) =>
                                                                normalizeDateRange({ ...prev, from: norm(e.target.value) || undefined }, { maxIso: todayISO, fixOrder: "snap" })
                                                            );
                                                            setPage(1);
                                                        }}
                                                    />
                                                </div>
                                                <div className="kc_dateMenuRow">
                                                    <label className="kc_dateMenuLabel">To</label>
                                                    <input
                                                        className="kc-input kc_filterDate"
                                                        type="date"
                                                        max={todayISO}
                                                        value={dateRange.to || ""}
                                                        onChange={(e) => {
                                                            setDateRange((prev) =>
                                                                normalizeDateRange({ ...prev, to: norm(e.target.value) || undefined }, { maxIso: todayISO, fixOrder: "snap" })
                                                            );
                                                            setPage(1);
                                                        }}
                                                    />
                                                </div>
                                                <div className="kc_dateMenuActions">
                                                    <button type="button" className="kc-btn kc-btn-ghost" onClick={() => { setDateRange({}); setDateMenuOpen(false); setPage(1); }}>
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
                                {hasAnyFilters && (
                                    <button
                                        type="button"
                                        className="kc_btn kc_btn_icon"
                                        title="Clear all filters"
                                        onClick={() => {
                                            setSearch("");
                                            setEntityFilter([]);
                                            setActionFilter([]);
                                            setActorFilter([]);
                                            setDateRange({});
                                            setDateMenuOpen(false);
                                            setPage(1);
                                        }}
                                        aria-label="Clear all filters"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ),
                        right: (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontWeight: 800, fontSize: 12, color: "#64748b" }}>
                                    Showing {rows.length} of {total}
                                </span>
                            </div>
                        ),
                    }}
                    minHeight="100%"
                />
            </div>

            {selected && (
                <div
                    className="kcDrawerOverlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setSelected(null);
                    }}
                >
                    <aside
                        className="kcDrawer auditDrawer"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Audit event detail drawer"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="kcDrawerHeader">
                            <div>
                                <div className="kcDrawerTitle">Audit event detail</div>
                                <div className="kcDrawerSubtitle">
                                    Review the selected admin action, who performed it, and the attached metadata.
                                </div>
                            </div>

                            <button type="button" className="kc-btn kc-btn-ghost" onClick={() => setSelected(null)} aria-label="Close">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="kcDrawerBody auditDrawerBody">
                            <div className="audit-latestStrip auditDrawerStrip">
                                <span className="audit-latestLabel">Selected Event</span>
                                <span className="audit-latestValue">
                                    {actionLabel(selected.action)} on {selected.entityName} by {selected.actorUsername}
                                </span>
                            </div>

                            <div className="audit-detailGrid">
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Actor</div>
                                    <div className="audit-inspectValue">{selected.actorUsername}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Entity</div>
                                    <div className="audit-inspectValue">{selected.entityName}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Entity Type</div>
                                    <div className="audit-inspectValue">{entityTypeLabel(selected.entityType)}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Action</div>
                                    <div className="audit-inspectValue">{actionLabel(selected.action)}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Result</div>
                                    <div className="audit-inspectValue">{selected.result ? actionLabel(selected.result) : "Success"}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Confirmation</div>
                                    <div className="audit-inspectValue">
                                        {selected.confirmationMode ? actionLabel(selected.confirmationMode) : "Standard admin action"}
                                    </div>
                                </div>
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">Timestamp</div>
                                    <div className="audit-inspectValue">
                                        {new Date(selected.createdAt).toLocaleString("en-SG", {
                                            year: "numeric",
                                            month: "2-digit",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                            hour12: false,
                                        })}
                                    </div>
                                </div>
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">Details</div>
                                    <div className="audit-inspectValue">{selected.details || "No additional details"}</div>
                                </div>
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">Reason</div>
                                    <div className="audit-inspectValue">{selected.reason || "No justification captured"}</div>
                                </div>
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">Before</div>
                                    <pre className="audit-metadataBlock">
                                        {selected.beforeJson
                                            ? JSON.stringify(beforeState ?? selected.beforeJson, null, 2)
                                            : "No previous snapshot"}
                                    </pre>
                                </div>
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">After</div>
                                    <pre className="audit-metadataBlock">
                                        {selected.afterJson
                                            ? JSON.stringify(afterState ?? selected.afterJson, null, 2)
                                            : "No resulting snapshot"}
                                    </pre>
                                </div>
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">Metadata</div>
                                    <pre className="audit-metadataBlock">
                                        {selected.metadataJson
                                            ? JSON.stringify(metadata ?? selected.metadataJson, null, 2)
                                            : "No metadata payload"}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className="kcDrawerFooter">
                            <button type="button" className="kc-btn kc-btn-ghost" onClick={() => setSelected(null)}>
                                <X size={16} /> Close
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}