// src/pages/Realms/access/RealmAccessVerify.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

import WorkflowLayout from "../../../components/workflow/WorkflowLayout";
import DataTable, { TableColumn } from "../../../components/common/DataTable";
import { Badge } from "../../../components/common/Badge";
import { MultiSelectCheckbox } from "../../../components/common/MultiSelectCheckbox";
import { useToast } from "../../../context/ToastContext";

import AccessRequestDrawer from "./AccessRequestDrawer";
import { useAccessRequestsLive } from "./useAccessRequestsLive";
import { canActOnVerify, canViewVerifyQueue } from "./accessActorRules";

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
import { getAccessActor } from "../../../context/accessCurrentUser";

import "../../../styles/browserTabs.css";
import "../../../styles/component.css";

const statusVariant = (s: string) => {
    if (s === "Draft") return "neutral";
    if (s === "Submitted") return "info";
    if (s === "Approved") return "success";
    if (s === "Rejected") return "danger";
    if (s === "Verified") return "success";
    if (s === "Cancelled") return "danger";
    return "neutral";
};

function normActor(v?: string) {
    return String(v || "").trim().toLowerCase();
}

function isAdminActor(actor: string) {
    return normActor(actor).includes("admin");
}

function isApproverActor(actor: string) {
    return normActor(actor).includes("approver");
}

function isVerifierActor(actor: string) {
    return normActor(actor).includes("verifier");
}

function canViewVerify(actor: string) {
    return isAdminActor(actor) || isApproverActor(actor) || isVerifierActor(actor);
}

function canVerify(actor: string) {
    return isVerifierActor(actor);
}

type VerifyRow = AccessRequest & {
    applicationName?: string;
};

const RealmAccessVerify: React.FC = () => {
    const actor = getAccessActor();
    const { pushToast } = useToast();

    const [requests, setRequests] = useState<AccessRequest[]>(() => loadAccessRequests());
    const [events, setEvents] = useState<AccessRequestEvent[]>(() => loadAccessEvents());

    const [selected, setSelected] = useState<AccessRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

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

    const rows: VerifyRow[] = useMemo(() => {
        return requests.map((r) => ({
            ...r,
            applicationName: norm((r as any)?.applicationName || (r as any)?.appName || ""),
        }));
    }, [requests]);

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

    useEffect(() => {
        if (!appFilter.length) return;
        const next = pruneSelectedByOptions(appFilter, appOptions);
        if (next.length !== appFilter.length) setAppFilter(next);
    }, [realmFilter, appOptions, appFilter]);

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
        if (!canViewVerifyQueue(actor)) {
            pushToast("Current actor cannot view verification items.", "warning");
            return;
        }

        setSelected(req);
        setDrawerOpen(true);
    };

    const onVerify = (id: string) => {
        const req = requests.find((r) => r.id === id);
        if (!req) return;

        if (!canActOnVerify(actor)) {
            pushToast("Only verifiers can verify requests.", "warning");
            return;
        }

        const g = evaluateGovernance({ request: req, actor, action: "verify" });
        if (!canProceed(g)) {
            pushToast(governanceSummary(g), "warning");
            return;
        }

        updateRequest(
            id,
            {
                status: "Verified",
                verifier: String(actor),
            },
            actor,
            "VERIFIED",
            "Verified by verifier"
        );

        setDrawerOpen(false);
        refresh();
        pushToast("Access request verified", "success");
    };

    const columns: TableColumn<VerifyRow>[] = useMemo(
        () => [
            {
                key: "request",
                label: "Request",
                width: "440px",
                render: (_v, row) => (
                    <div className="kc-requestPrimaryCell">
                        <button
                            type="button"
                            className="kc-linkcell kc-mono kc-requestPrimaryId"
                            onClick={(e) => {
                                e.stopPropagation();
                                openRequest(row as AccessRequest);
                            }}
                            title="Open request details"
                        >
                            {row.id}
                        </button>

                        <div className="kc-requestPrimaryRealm">
                            {row.realmName}
                        </div>

                        <div className="kc-requestPrimaryTuple">
                            {row.targetUser} → {row.roleRequested}
                        </div>

                        <div className="kc-requestPrimaryMeta">
                            Requested by {row.requester}
                        </div>
                    </div>
                ),
            },
            {
                key: "status",
                label: "Status",
                width: "130px",
                align: "center",
                render: (v) => (
                    <Badge variant={statusVariant(String(v)) as any}>
                        {String(v)}
                    </Badge>
                ),
            },
            {
                key: "governance",
                label: "Governance",
                width: "190px",
                sortable: false,
                render: (_v, row) => {
                    if (!canActOnVerify(actor)) {
                        return (
                            <div className="kc-governanceCell" title="Current actor can view but cannot verify">
                                <Badge variant={"info" as any}>View Only</Badge>
                                <div className="kc-governanceSub">Verifier action required</div>
                            </div>
                        );
                    }

                    const g = evaluateGovernance({ request: row, actor, action: "verify" });
                    const summary = governanceSummary(g) || "All checks passed";

                    const isBlocked = g.blocks.length > 0 || g.requires.length > 0;
                    const isWarn = !isBlocked && g.warns.length > 0;

                    return (
                        <div className="kc-governanceCell" title={summary}>
                            <Badge
                                variant={
                                    isBlocked
                                        ? ("danger" as any)
                                        : isWarn
                                            ? ("warning" as any)
                                            : ("success" as any)
                                }
                            >
                                {isBlocked ? "Blocked" : isWarn ? "Warning" : "Ready"}
                            </Badge>

                            <div className="kc-governanceSub">
                                {isBlocked
                                    ? summary
                                    : isWarn
                                        ? summary
                                        : "All checks passed"}
                            </div>
                        </div>
                    );
                },
            },
            {
                key: "updatedAt",
                label: "Updated",
                width: "180px",
                render: (v) => {
                    const dt = new Date(String(v));

                    return (
                        <div className="kc-requestUpdatedCell" title={dt.toLocaleString()}>
                            <div>{dt.toLocaleDateString()}</div>
                            <div className="kc-requestUpdatedSub">
                                {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        </div>
                    );
                },
            },
            {
                key: "actions",
                label: "Actions",
                width: "150px",
                sortable: false,
                render: (_v, row) => {
                    const viewOnly = !canActOnVerify(actor);
                    const g = evaluateGovernance({ request: row, actor, action: "verify" });
                    const blocked = g.blocks.length > 0 || g.requires.length > 0;

                    return (
                        <button
                            type="button"
                            className="kc-btn kc-btn-primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                openRequest(row as AccessRequest);
                            }}
                        >
                            {viewOnly ? "View" : blocked ? "Review" : "Verify"}
                        </button>
                    );
                },
            }
        ],
        []
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
                        emptyMessage={
                            canViewVerifyQueue(actor)
                                ? "No requests waiting for verification"
                                : "Current actor cannot view verification items."
                        }
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
                        actor={actor}
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