// src/pages/Realms/access/RealmAccessApprove.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

import WorkflowLayout from "../../../components/workflow/WorkflowLayout";
import DataTable, { TableColumn } from "../../../components/common/DataTable";
import { Badge } from "../../../components/common/Badge";
import { MultiSelectCheckbox } from "../../../components/common/MultiSelectCheckbox";

import AccessRequestDrawer from "./AccessRequestDrawer";
import { useAccessRequestsLive } from "./useAccessRequestsLive";

import {
  loadAccessEvents,
  loadAccessRequests,
  updateRequest,
  AccessRequest,
  AccessRequestEvent,
} from "./accessRequestsStore";

import { evaluateGovernance, governanceSummary } from "./governancePolicy";

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

const actor = "approver.1";

type ApproveRow = AccessRequest & {
  applicationName?: string;
  sortTimeISO?: string; // for date filter
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
  const todayISO = useMemo(() => getTodayISO(), []);

  // data
  const [requests, setRequests] = useState<AccessRequest[]>(() => loadAccessRequests());
  const [events, setEvents] = useState<AccessRequestEvent[]>(() => loadAccessEvents());

  // drawer
  const [selected, setSelected] = useState<AccessRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // filters
  const [realmFilter, setRealmFilter] = useState<string[]>([]);
  const [appFilter, setAppFilter] = useState<string[]>([]);
  const [targetUserFilter, setTargetUserFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [requesterFilter, setRequesterFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({});

  // date dropdown
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

  // request lookup
  const reqById = useMemo(() => {
    const m = new Map<string, AccessRequest>();
    for (const r of requests) m.set(r.id, r);
    return m;
  }, [requests]);

  // first SUBMITTED event per requestId (for SLA)
  const submittedAtByReqId = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of events) {
      if (String(e.type) !== "SUBMITTED") continue;
      const id = String(e.requestId);
      const prev = m.get(id);
      // keep earliest submitted
      if (!prev || String(e.at) < prev) m.set(id, String(e.at));
    }
    return m;
  }, [events]);

  // enrich rows
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

    // Default “Approval Queue” feel:
    // if user hasn't chosen a status filter, show only Submitted.
    if (!statusFilter.length) return base.filter((r) => r.status === "Submitted");

    return base;
  }, [requests, submittedAtByReqId, statusFilter.length]);

  // ---- options (cascaded: App depends on Realm selection) ----
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

  // prune app selections when realm changes
  useEffect(() => {
    setAppFilter((prev) => pruneSelectedByOptions(prev, appOptions));
  }, [appOptions]);

  const targetUserOptions = useMemo(() => buildOptions(rows, (r) => r.targetUser), [rows]);
  const roleOptions = useMemo(() => buildOptions(rows, (r) => r.roleRequested), [rows]);
  const requesterOptions = useMemo(() => buildOptions(rows, (r) => r.requester), [rows]);

  const statusOptions = useMemo(
    () => buildOptions(requests as any, (r: AccessRequest) => r.status),
    [requests]
  );

  // ---- filtered rows using accessFilterUtils ----
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
        getValue: (r) => r.sortTimeISO, // Updated-ish
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

  const openRequest = (requestId: string) => {
    const req = reqById.get(String(requestId)) || null;
    setSelected(req);
    setDrawerOpen(true);
  };

  const columns: TableColumn<ApproveRow>[] = useMemo(
    () => [
      {
        key: "id",
        label: "Request ID",
        width: "170px",
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
      { key: "applicationName", label: "Application", width: "200px" },
      { key: "targetUser", label: "Target User", width: "180px" },
      { key: "roleRequested", label: "Role", width: "150px" },
      {
        key: "status",
        label: "Status",
        width: "130px",
        align: "center",
        render: (v) => <Badge variant={statusVariant(String(v)) as any}>{String(v)}</Badge>,
      },

      // SLA: waiting since SUBMITTED
      {
        key: "sla",
        label: "SLA",
        width: "140px",
        align: "center",
        sortable: false,
        render: (_v, row) => {
          if (row.status !== "Submitted") return <span className="kc-text-muted">—</span>;
          if (row.slaMinutes == null) return <span className="kc-text-muted">—</span>;
          return <span style={{ fontWeight: 800 }}>{diffHuman(row.slaMinutes * 60_000)}</span>;
        },
      },

      // Governance
      {
        key: "governance",
        label: "Governance",
        width: "180px",
        align: "center",
        sortable: false,
        render: (_v, row) => {
          const g = evaluateGovernance({ request: row, actor, action: "approve" });
          const txt = governanceSummary(g);

          // map to badge variants you already use
          const variant =
            g.allowed ? ("success" as any) : g.severity === "warn" ? ("info" as any) : ("danger" as any);

          return (
            <span title={txt}>
              <Badge variant={variant}>{g.allowed ? "Pass" : "Block"}</Badge>
            </span>
          );
        },
      },

      {
        key: "updatedAt",
        label: "Updated",
        width: "200px",
        render: (_v, row) => {
          const v = row.updatedAt || row.sortTimeISO;
          return v ? new Date(String(v)).toLocaleString() : "—";
        },
      },

      {
        key: "actions",
        label: "Actions",
        width: "160px",
        sortable: false,
        render: (_v, row) => {
          const g = evaluateGovernance({ request: row, actor, action: "approve" });
          const title = governanceSummary(g);

          return (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="kc-btn kc-btn-primary"
                title={title}
                onClick={(e) => {
                  e.stopPropagation();
                  openRequest(String(row.id));
                }}
                disabled={!g.allowed}
              >
                Review
              </button>
            </div>
          );
        },
      },
    ],
    [reqById]
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
            emptyMessage="No approval items"
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
                    label="Application"
                    options={appOptions}
                    value={appFilter}
                    onChange={setAppFilter}
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
            mode="approve"
            request={selected}
            events={events}
            onClose={() => setDrawerOpen(false)}
            onApprove={(id, note) => {
              const req = reqById.get(String(id));
              if (!req) return;

              const g = evaluateGovernance({ request: req, actor, action: "approve" });
              if (!g.allowed) {
                window.alert(governanceSummary(g));
                return;
              }

              updateRequest(
                id,
                { status: "Approved", approver: actor },
                actor,
                "APPROVED",
                note || "Approved by approver."
              );
              refresh();
              setDrawerOpen(false);
            }}
            onReject={(id, note) => {
              const req = reqById.get(String(id));
              if (!req) return;

              const g = evaluateGovernance({ request: req, actor, action: "approve" });
              if (!g.allowed) {
                window.alert(governanceSummary(g));
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
            }}
          />
        </div>
      </div>
    </WorkflowLayout>
  );
}