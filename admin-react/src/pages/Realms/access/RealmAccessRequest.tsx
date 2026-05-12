// src/pages/Realms/access/RealmAccessRequest.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { X, ChevronDown, ChevronUp } from "lucide-react";

import WorkflowLayout from "../../../components/workflow/WorkflowLayout";
import DataTable, { TableColumn } from "../../../components/common/DataTable";
import { Badge } from "../../../components/common/Badge";
import { MultiSelectCheckbox } from "../../../components/common/MultiSelectCheckbox";
import AccessRequestDrawer from "./AccessRequestDrawer";
import CreateAccessRequestModal from "./CreateAccessRequestModal";
import { useAccessRequestsLive } from "./useAccessRequestsLive";
import { getAccessActor } from "../../../context/accessCurrentUser";
import { useToast } from "../../../context/ToastContext";
import { useData } from "../../../context/DataContext";

import {
    loadAccessSnapshot,
    updateRequest,
    createAccessRequest,
    AccessRequest,
    AccessRequestEvent,
} from "./accessRequestsStore";

import {
    DateRange,
    buildOptions,
    applyFiltersWithDate,
    normalizeDateRange,
    dateChipText as dateChipTextUtil,
    getTodayISO,
} from "./accessFilterUtils";

import {
    evaluateGovernance,
    canProceed,
    governanceSummary,
} from "./governancePolicy";

import "../../../styles/browserTabs.css";
import "../../../styles/component.css";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

const statusVariant = (s: string): BadgeVariant => {
    if (s === "Draft") return "default";
    if (s === "Submitted") return "info";
    if (s === "Approved") return "success";
    if (s === "Rejected") return "error";
    if (s === "Verified") return "success";
    if (s === "Cancelled") return "error";
    return "default";
};

const RealmAccessRequest: React.FC = () => {
    const actor = getAccessActor();
    const { pushToast } = useToast();
    const { totalUsers, totalRealms } = useData();
    const location = useLocation();
    const prefill = useMemo(() => {
        const p = new URLSearchParams(location.search);
        return {
            realmId: p.get("realmId") ?? "",
            realmName: (p.get("realmName") ?? "") || ((totalRealms ?? []).find((r) => String(r.id) === (p.get("realmId") ?? ""))?.name ?? ""),
            targetUser: p.get("targetUser") ?? "",
            roleRequested: p.get("roleRequested") ?? "",
            currentRoleId: p.get("currentRoleId") ?? "",
            justification: p.get("justification") ?? "",
        };
        }, [location.search, totalRealms]);
    const [rows, setRows] = useState<AccessRequest[]>([]);
    const [events, setEvents] = useState<AccessRequestEvent[]>([]);

    const [createOpen, setCreateOpen] = useState(() => Boolean(prefill.realmId || prefill.targetUser || prefill.roleRequested));
    const [selected, setSelected] = useState<AccessRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [requests, setRequests] = useState<AccessRequest[]>([]);

    const [realmFilter, setRealmFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [roleFilter, setRoleFilter] = useState<string[]>([]);
    const [targetUserFilter, setTargetUserFilter] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>({});

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
            normalizeDateRange(
                { ...prev, from: v || undefined },
                { maxIso: todayISO, fixOrder: "snap" }
            )
        );
    };

    const setTo = (v: string) => {
        setDateRange((prev) =>
            normalizeDateRange(
                { ...prev, to: v || undefined },
                { maxIso: todayISO, fixOrder: "snap" }
            )
        );
    };

    const refresh = useCallback(async () => {
        const snapshot = await loadAccessSnapshot();
        setRows(snapshot.requests);
        setEvents(snapshot.events);
        setRequests(snapshot.requests);
    }, []);

    useEffect(() => {
        let cancelled = false;
        loadAccessSnapshot()
            .then((snapshot) => {
                if (cancelled) return;
                setRows(snapshot.requests);
                setEvents(snapshot.events);
                setRequests(snapshot.requests);
            })
            .catch(() => {
                if (!cancelled) {
                    setRows([]);
                    setEvents([]);
                    setRequests([]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useAccessRequestsLive(refresh);

    const clearAllFilters = () => {
        setRealmFilter([]);
        setStatusFilter([]);
        setRoleFilter([]);
        setTargetUserFilter([]);
        setDateRange({});
        setDateMenuOpen(false);
    };

    const reqById = useMemo(() => {
        const m = new Map<string, AccessRequest>();
        for (const r of requests) m.set(r.id, r);
        return m;
    }, [requests]);

    const openRequest = useCallback((requestId: string) => {
        const req = reqById.get(requestId) || null;
        setSelected(req);
        setDrawerOpen(true);
    }, [reqById]);

    const columns: TableColumn<AccessRequest>[] = useMemo(
        () => [
            {
                key: "request",
                label: "Request",
                width: "460px",
                render: (_v, row) => (
                    <div className="kc-requestPrimaryCell">
                        <button
                            type="button"
                            className="kc-linkcell kc-mono kc-requestPrimaryId"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openRequest(String(row.id));
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
                    </div>
                ),
            },
            {
                key: "status",
                label: "Status",
                width: "130px",
                align: "center",
                render: (v) => (
                    <Badge variant={statusVariant(String(v))}>
                        {String(v)}
                    </Badge>
                ),
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
                width: "220px",
                sortable: false,
                render: (_v, row) => {
                    const canSubmitRow = row.status === "Draft";
                    const canCancelRow =
                        row.status === "Draft" || row.status === "Submitted";

                    return (
                        <div className="kc-requestActionBtns">
                            <button
                                type="button"
                                className="kc-btn kc-btn-primary"
                                disabled={!canSubmitRow}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    const g = evaluateGovernance({
                                        request: row,
                                        actor,
                                        action: "submit",
                                    });

                                    if (!canProceed(g)) {
                                        pushToast(governanceSummary(g), "warning");
                                        return;
                                    }

                                    void updateRequest(
                                        row.id,
                                        { status: "Submitted" },
                                        actor,
                                        "SUBMITTED",
                                        "Submitted for approval"
                                    ).then(() => {
                                        void refresh();
                                        pushToast("Access request submitted successfully", "success");
                                    }).catch((err) => {
                                        pushToast(err instanceof Error ? err.message : "Failed to submit access request", "error");
                                    });
                                }}
                            >
                                Submit
                            </button>

                            <button
                                type="button"
                                className="kc-btn kc-btn-ghost"
                                disabled={!canCancelRow}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    void updateRequest(
                                        row.id,
                                        { status: "Cancelled" },
                                        actor,
                                        "CANCELLED",
                                        "Cancelled by requester"
                                    ).then(() => {
                                        void refresh();
                                        pushToast("Access request cancelled", "warning");
                                    }).catch((err) => {
                                        pushToast(err instanceof Error ? err.message : "Failed to cancel access request", "error");
                                    });
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    );
                },
            },
        ],
        [actor, openRequest, pushToast, refresh]
    );

    const realmOptions = useMemo(() => buildOptions(rows, (r) => r.realmName), [rows]);
    const targetUserOptions = useMemo(() => buildOptions(rows, (r) => r.targetUser), [rows]);
    const roleOptions = useMemo(() => buildOptions(rows, (r) => r.roleRequested), [rows]);
    const statusOptions = useMemo(() => buildOptions(rows, (r) => r.status), [rows]);

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
                        className="kcAccessRequestTable"
                        keyField="id"
                        stickyToolbar={false}
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
                        onRefresh={() => { void refresh(); }}
                        toolbarFilters={{
                            left: (
                                <div className="kc_toolbarFilters kcAccessToolbarFilters">
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
                                                <div
                                                    className="kc_dateMenu"
                                                    role="dialog"
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                >
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

                                    <div className="kc_filterBadges kcAccessToolbarBadges">
                                        {realmFilter.length > 0 && (
                                            <span className="kc_filterBadge">Realm: {realmFilter.length}</span>
                                        )}
                                        {targetUserFilter.length > 0 && (
                                            <span className="kc_filterBadge">User: {targetUserFilter.length}</span>
                                        )}
                                        {roleFilter.length > 0 && (
                                            <span className="kc_filterBadge">Role: {roleFilter.length}</span>
                                        )}
                                        {statusFilter.length > 0 && (
                                            <span className="kc_filterBadge">Status: {statusFilter.length}</span>
                                        )}
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
                                <div className="kcAccessToolbarRight">
                                    <span className="kc_textMuted" style={{ fontWeight: 800, fontSize: 12 }}>
                                        Showing <b>{filteredRows.length}</b>
                                    </span>

                                    <button
                                        type="button"
                                        className="kc-btn kc-btn-primary"
                                        onClick={() => setCreateOpen(true)}
                                    >
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
                            const req = reqById.get(String(id));
                            if (!req) return;

                            const g = evaluateGovernance({
                                request: req,
                                actor,
                                action: "submit",
                            });

                            if (!canProceed(g)) {
                                pushToast(governanceSummary(g), "warning");
                                return;
                            }

                            void updateRequest(
                                id,
                                { status: "Submitted" },
                                actor,
                                "SUBMITTED",
                                "Submitted for approval."
                            ).then(() => {
                                void refresh();
                                setDrawerOpen(false);
                                pushToast("Access request submitted successfully", "success");
                            }).catch((err) => {
                                pushToast(err instanceof Error ? err.message : "Failed to submit access request", "error");
                            });
                        }}
                        onCancel={(id) => {
                            void updateRequest(
                                id,
                                { status: "Cancelled" },
                                actor,
                                "CANCELLED",
                                "Cancelled by requester."
                            ).then(() => {
                                void refresh();
                                setDrawerOpen(false);
                                pushToast("Access request cancelled", "warning");
                            }).catch((err) => {
                                pushToast(err instanceof Error ? err.message : "Failed to cancel access request", "error");
                            });
                        }}
                    />

                    <CreateAccessRequestModal
                        open={createOpen}
                        onClose={() => setCreateOpen(false)}
                        requester={actor}
                        initial={prefill}
                        onCreate={createAccessRequest}
                        onCreated={(req) => {
                            void refresh();
                            setSelected(req);
                            setDrawerOpen(true);
                            pushToast("Access request created", "success");
                        }}
                        allUsers={(totalUsers ?? []).map((u) => ({ uuid: String(u.uuid ?? ""), username: String(u.username ?? ""), firstName: u.firstName, lastName: u.lastName, email: u.email, isDeleted: Boolean(u.isDeleted) }))}
                        allRealms={(totalRealms ?? []).map((r) => ({ id: String(r.id ?? ""), name: String(r.name ?? ""), status: String(r.status ?? "") }))}
                        realmUsersMap={(totalUsers ?? []).reduce<Record<string, Array<{ userUuid: string; roleId?: string; assignedAt?: string; assignedBy?: string }>>>((acc, user) => { const realmId = String(user.localRealmId ?? "").trim(); const userUuid = String(user.uuid ?? "").trim(); if (!realmId || !userUuid) return acc; if (!acc[realmId]) acc[realmId] = []; acc[realmId].push({ userUuid, assignedAt: new Date().toISOString(), assignedBy: actor }); return acc; }, {})}
                    />
                </div>
            </div>
        </WorkflowLayout>
    );
};

export default RealmAccessRequest;