// src/pages/Realms/access/RealmAccessApprove.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

import WorkflowLayout from "../../../components/workflow/WorkflowLayout";
import DataTable, { TableColumn } from "../../../components/common/DataTable";
import { Badge } from "../../../components/common/Badge";
import { MultiSelectCheckbox } from "../../../components/common/MultiSelectCheckbox";
import { useToast } from "../../../context/ToastContext";

import AccessRequestDrawer from "./AccessRequestDrawer";
import { useAccessRequestsLive } from "./useAccessRequestsLive";

import {
  loadAccessEvents,
  loadAccessRequests,
  updateRequest,
  AccessRequest,
  AccessRequestEvent,
} from "./accessRequestsStore";

import {
  evaluateGovernance,
  governanceSummary,
  canProceed,
} from "./governancePolicy";

import {
  DateRange,
  buildOptions,
  cascadedOptions,
  pruneSelectedByOptions,
  applyFiltersWithDate,
  normalizeDateRange,
  dateChipText as dateChipTextUtil,
  getTodayISO,
  norm,
} from "./accessFilterUtils";

import "../../../styles/browserTabs.css";
import "../../../styles/component.css";
import { getAccessActor } from "../../../context/accessCurrentUser";
import {
  canViewApprovalQueue,
  canActOnApproval,
  isSelfApproval,
} from "./accessActorRules";

type ApproveRow = AccessRequest & {
  applicationName?: string;
  sortTimeISO?: string;
  slaMinutes?: number | null;
};

const statusVariant = (s: string) => {
  if (s === "Approved") return "success";
  if (s === "Rejected" || s === "Cancelled") return "danger";
  if (s === "Submitted") return "info";
  return "neutral";
};

function diffHuman(ms: number) {
  const abs = Math.max(0, ms);
  const totalMin = Math.floor(abs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function RealmAccessApprove() {
  const actor = getAccessActor();
  const { pushToast } = useToast();
  const todayISO = useMemo(() => getTodayISO(), []);

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

  const reqById = useMemo(() => {
    const m = new Map<string, AccessRequest>();
    for (const r of requests) m.set(r.id, r);
    return m;
  }, [requests]);

  const submittedAtByReqId = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of events) {
      if (String(e.type) !== "SUBMITTED") continue;
      const id = String(e.requestId);
      const prev = m.get(id);
      if (!prev || String(e.at) < prev) m.set(id, String(e.at));
    }
    return m;
  }, [events]);

  const rows: ApproveRow[] = useMemo(() => {
    const base = requests.map((r) => {
      const app =
        (r as any).applicationName ||
        (r as any).appName ||
        (r as any).application ||
        (r as any).service ||
        "";

      const sortTimeISO = (r.updatedAt || (r as any).createdAt || r.startDate || "") as string;

      const submittedAt = submittedAtByReqId.get(String(r.id));
      let slaMinutes: number | null = null;
      if (r.status === "Submitted" && submittedAt) {
        const t = new Date(submittedAt).getTime();
        if (!Number.isNaN(t)) slaMinutes = Math.floor((Date.now() - t) / 60000);
      }

      return {
        ...r,
        applicationName: app,
        sortTimeISO: sortTimeISO || r.updatedAt || "",
        slaMinutes,
      };
    });

    const submittedOnly = !statusFilter.length
      ? base.filter((r) => r.status === "Submitted")
      : base;

    if (!canViewApprovalQueue(actor)) return [];

    return submittedOnly;
  }, [requests, submittedAtByReqId, statusFilter.length, actor]);

  const realmOptions = useMemo(() => buildOptions(rows, (r) => r.realmName), [rows]);

  const appOptions = useMemo(
    () =>
      cascadedOptions<ApproveRow>({
        rows,
        parentSelected: realmFilter,
        getParent: (r) => r.realmName,
        getChild: (r) => r.applicationName,
      }),
    [rows, realmFilter]
  );

  useEffect(() => {
    setAppFilter((prev) => pruneSelectedByOptions(prev, appOptions));
  }, [appOptions]);

  const targetUserOptions = useMemo(() => buildOptions(rows, (r) => r.targetUser), [rows]);
  const roleOptions = useMemo(() => buildOptions(rows, (r) => r.roleRequested), [rows]);
  const requesterOptions = useMemo(() => buildOptions(rows, (r) => r.requester), [rows]);
  const statusOptions = useMemo(() => buildOptions(requests, (r) => r.status), [requests]);

  const filteredRows: ApproveRow[] = useMemo(() => {
    return applyFiltersWithDate<ApproveRow>({
      rows,
      multi: {
        realm: { selected: realmFilter, getValue: (r) => r.realmName },
        app: { selected: appFilter, getValue: (r) => r.applicationName },
        targetUser: { selected: targetUserFilter, getValue: (r) => r.targetUser },
        role: { selected: roleFilter, getValue: (r) => r.roleRequested },
        requester: { selected: requesterFilter, getValue: (r) => r.requester },
        status: { selected: statusFilter, getValue: (r) => r.status },
      },
      date: {
        range: dateRange,
        getValue: (r) => r.sortTimeISO,
      },
    });
  }, [
    rows,
    realmFilter,
    appFilter,
    targetUserFilter,
    roleFilter,
    requesterFilter,
    statusFilter,
    dateRange,
  ]);
  const ensureCanApprove = (req?: AccessRequest | null) => {
    if (!req) {
      pushToast("Request not found", "warning");
      return false;
    }

    if (!canViewApprovalQueue(actor)) {
      pushToast("Current actor cannot view approval items.", "warning");
      return false;
    }

    if (!canActOnApproval(actor)) {
      pushToast("Only approvers can approve or reject requests.", "warning");
      return false;
    }

    if (isSelfApproval(actor, req.requester)) {
      pushToast("Approver cannot approve a request raised by himself.", "warning");
      return false;
    }

    return true;
  };

  const openRequest = (requestId: string) => {
    const req = reqById.get(String(requestId)) || null;

    if (!req) {
      pushToast("Request not found", "warning");
      return;
    }

    if (!canViewApprovalQueue(actor)) {
      pushToast("Current actor cannot view approval items.", "warning");
      return;
    }

    setSelected(req);
    setDrawerOpen(true);
  };

  const columns: TableColumn<ApproveRow>[] = useMemo(
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
          <Badge variant={statusVariant(String(v)) as any}>
            {String(v)}
          </Badge>
        ),
      },
      {
        key: "sla",
        label: "SLA",
        width: "120px",
        align: "center",
        sortable: false,
        render: (_v, row) => {
          if (row.status !== "Submitted") {
            return <span className="kc-text-muted">—</span>;
          }
          if (row.slaMinutes == null) {
            return <span className="kc-text-muted">—</span>;
          }
          return <span className="kc-requestSlaValue">{diffHuman(row.slaMinutes * 60_000)}</span>;
        },
      },
      {
        key: "governance",
        label: "Governance",
        width: "140px",
        align: "center",
        sortable: false,
        render: (_v, row) => {
          if (!canActOnApproval(actor)) {
            return <Badge variant={"info" as any}>View Only</Badge>;
          }

          if (isSelfApproval(actor, row.requester)) {
            return <Badge variant={"warning" as any}>Self Request</Badge>;
          }

          const g = evaluateGovernance({ request: row, actor, action: "approve" });
          const txt = governanceSummary(g);

          const variant =
            g.blocks.length > 0
              ? ("danger" as any)
              : g.requires.length > 0
                ? ("warning" as any)
                : g.warns.length > 0
                  ? ("info" as any)
                  : ("success" as any);

          const label =
            g.blocks.length > 0
              ? "Blocked"
              : g.requires.length > 0
                ? "Required"
                : g.warns.length > 0
                  ? "Warn"
                  : "Pass";

          return (
            <span title={txt || "No governance issues"}>
              <Badge variant={variant}>{label}</Badge>
            </span>
          );
        }
      },
      {
        key: "updatedAt",
        label: "Updated",
        width: "180px",
        render: (_v, row) => {
          const v = row.updatedAt || row.sortTimeISO;
          if (!v) return "—";

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
          const viewOnly = !canActOnApproval(actor);
          const selfRequest = isSelfApproval(actor, row.requester);
          const g = evaluateGovernance({ request: row, actor, action: "approve" });

          const title = viewOnly
            ? "View approval details"
            : selfRequest
              ? "Approver cannot approve a request raised by himself"
              : governanceSummary(g) || "Open request";

          const disabled = !canViewApprovalQueue(actor) || (!viewOnly && selfRequest);

          return (
            <div className="kc-requestActionBtns">
              <button
                type="button"
                className="kc-btn kc-btn-primary"
                title={title}
                onClick={(e) => {
                  e.stopPropagation();

                  if (!canViewApprovalQueue(actor)) {
                    pushToast("Current actor cannot view approval items.", "warning");
                    return;
                  }

                  if (!viewOnly && selfRequest) {
                    pushToast("Approver cannot approve a request raised by himself.", "warning");
                    return;
                  }

                  openRequest(String(row.id));
                }}
                disabled={disabled}
              >
                {viewOnly ? "View" : "Review"}
              </button>
            </div>
          );
        },
      },
    ],
    [reqById, actor]
  );

  const dateChipText = useMemo(() => dateChipTextUtil(dateRange), [dateRange]);

  const hasAnyFilters =
    realmFilter.length ||
    appFilter.length ||
    targetUserFilter.length ||
    roleFilter.length ||
    requesterFilter.length ||
    statusFilter.length ||
    dateRange.from ||
    dateRange.to;

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

  return (
    <WorkflowLayout activeStep="approve" title="" subtitle="">
      <div className="tab-table-container" style={{ position: "relative" }}>
        <div className="table-card kc_realmCard" style={{ flex: 1 }}>
          <DataTable<ApproveRow>
            data={filteredRows}
            columns={columns}
            keyField="id"
            searchable
            searchPlaceholder="Search approval queue..."
            paginated
            pageSize={10}
            pageSizeOptions={[10, 25, 50]}
            striped
            hoverable
            stickyHeader
            emptyMessage={
              canViewApprovalQueue(actor)
                ? "No approval items"
                : "Current actor cannot view approval items."
            }
            minHeight="100%"
            onRowClick={(row) => {
              openRequest(String(row.id));
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
            mode="approve"
            actor={actor}
            request={selected}
            events={events}
            onClose={() => setDrawerOpen(false)}
            onApprove={(id, payload) => {
              const req = reqById.get(String(id));
              if (!ensureCanApprove(req)) return;

              const nextReq = {
                ...req!,
                roleRequested: payload.roleRequested,
                timeBound: payload.timeBound,
                endDate: payload.timeBound ? payload.endDate || "" : "",
                approver: actor,
                status: "Approved",
              };

              const g = evaluateGovernance({ request: nextReq, actor, action: "approve" });
              if (!canProceed(g)) {
                pushToast(governanceSummary(g), "warning");
                return;
              }

              updateRequest(
                id,
                {
                  status: "Approved",
                  approver: actor,
                  roleRequested: payload.roleRequested,
                  timeBound: payload.timeBound,
                  endDate: payload.timeBound ? payload.endDate || "" : "",
                },
                actor,
                "APPROVED",
                payload.note || "Approved by approver."
              );

              refresh();
              setDrawerOpen(false);
              pushToast("Access request approved", "success");
            }}
            onReject={(id, note) => {
              const req = reqById.get(String(id));
              if (!ensureCanApprove(req)) return;

              const g = evaluateGovernance({ request: req!, actor, action: "reject" });
              if (!canProceed(g)) {
                pushToast(governanceSummary(g), "warning");
                return;
              }

              updateRequest(
                id,
                { status: "Rejected", approver: actor },
                actor,
                "REJECTED",
                note || "Rejected by approver."
              );

              refresh();
              setDrawerOpen(false);
              pushToast("Access request rejected", "warning");
            }}
          />
        </div>
      </div>
    </WorkflowLayout>
  );
}