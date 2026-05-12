import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, RefreshCw, ShieldCheck, ShieldX, TimerReset, X } from "lucide-react";
import DataTable, { type TableColumn } from "../components/common/DataTable";
import { Badge } from "../components/common/Badge";
import { MultiSelectCheckbox } from "../components/common/MultiSelectCheckbox";
import { authApi } from "../services/authApi";
import { governanceApi } from "../services/governanceApi";
import { useToast } from "../context/ToastContext";
import {
    type ApprovalRequestRow,
    labelize,
    readNumber,
    readString,
    safeParseRecord,
} from "./governance/contracts";

type ApprovalRequestWithSla = ApprovalRequestRow & {
    requestedAtDate: Date;
    dueAtDate: Date;
    ageLabel: string;
    dueLabel: string;
    slaVariant: "success" | "warning" | "error" | "default";
    slaText: string;
    slaStatus: "healthy" | "due_soon" | "overdue" | "reviewed";
    priorityText: string;
    escalationText: string;
};

type ApprovalRequestFacets = {
    entityTypes: string[];
    actions: string[];
    requestedBy: string[];
};

const statusVariant = (value: string) => {
    if (value === "Pending") return "warning";
    if (value === "Approved") return "success";
    if (value === "Rejected") return "error";
    return "default";
};

const formatDateTime = (value: string | Date) =>
    new Date(value).toLocaleString("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

const formatDuration = (ms: number) => {
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
};

const requestedStatusLabel = (payload: Record<string, unknown> | null, action: string) => {
    const explicit = readString(payload, "requestedStatus") ?? readString(payload, "status");
    if (explicit) return explicit;
    if (action === "deactivate") return "Inactive";
    if (action === "grant") return "Granted";
    return "Requested change";
};

export default function ApprovalRequestsPage() {
    const { pushToast } = useToast();
    const [rows, setRows] = useState<ApprovalRequestRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<ApprovalRequestRow | null>(null);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [currentUsername, setCurrentUsername] = useState("");
    const [search, setSearch] = useState("");
    const [entityFilter, setEntityFilter] = useState<string[]>([]);
    const [actionFilter, setActionFilter] = useState<string[]>([]);
    const [requesterFilter, setRequesterFilter] = useState<string[]>([]);
    const [facets, setFacets] = useState<ApprovalRequestFacets>({ entityTypes: [], actions: [], requestedBy: [] });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const loadRequests = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (search.trim()) params.set("search", search.trim());
            if (entityFilter.length) params.set("entityTypes", entityFilter.join(","));
            if (actionFilter.length) params.set("actions", actionFilter.join(","));
            if (requesterFilter.length) params.set("requestedBy", requesterFilter.join(","));
            params.set("page", String(page));
            params.set("pageSize", String(pageSize));
            const [requests, facetResponse, me] = await Promise.all([
                governanceApi.approvalRequests<{ items: ApprovalRequestRow[]; total: number }>(params.toString()),
                governanceApi.approvalRequestFacets<ApprovalRequestFacets>(params.toString()),
                authApi.me(),
            ]);
            setRows(requests.items);
            setTotal(requests.total);
            setFacets(facetResponse);
            setIsSuperAdmin(Boolean(me.isSuperAdmin));
            setCurrentUsername(String(me.username ?? ""));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load approval requests.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, entityFilter, actionFilter, requesterFilter, page, pageSize]);

    const rowsWithSla = useMemo<ApprovalRequestWithSla[]>(() => {
        const now = Date.now();

        return rows.map((row) => {
            const requestedAtDate = new Date(row.requestedAt);
            const slaHours = Math.max(1, row.slaHours || 4);
            const dueAtDate = new Date(requestedAtDate.getTime() + slaHours * 60 * 60 * 1000);
            const dueDeltaMs = dueAtDate.getTime() - now;
            const ageLabel = formatDuration(now - requestedAtDate.getTime());
            const dueLabel = dueDeltaMs >= 0 ? `Due in ${formatDuration(dueDeltaMs)}` : `Overdue by ${formatDuration(Math.abs(dueDeltaMs))}`;

            if (row.status !== "Pending") {
                return {
                    ...row,
                    requestedAtDate,
                    dueAtDate,
                    ageLabel,
                    dueLabel,
                    slaVariant: "success",
                    slaText: row.status,
                    slaStatus: "reviewed",
                    priorityText: "Closed",
                    escalationText: "Decision recorded",
                };
            }

            if (dueDeltaMs <= 0) {
                return {
                    ...row,
                    requestedAtDate,
                    dueAtDate,
                    ageLabel,
                    dueLabel,
                    slaVariant: "error",
                    slaText: "Overdue",
                    slaStatus: "overdue",
                    priorityText: "Immediate attention",
                    escalationText: row.entityType === "application_access"
                        ? "SLA breached and escalated for urgent realm approval review"
                        : "SLA breached and escalated for urgent super admin review",
                };
            }

            if (dueDeltaMs <= 60 * 60 * 1000) {
                return {
                    ...row,
                    requestedAtDate,
                    dueAtDate,
                    ageLabel,
                    dueLabel,
                    slaVariant: "warning",
                    slaText: "Due soon",
                    slaStatus: "due_soon",
                    priorityText: "Review within the next hour",
                    escalationText: row.entityType === "application_access"
                        ? "Priority review before the realm approval SLA closes"
                        : "Priority review before the SLA window closes",
                };
            }

            return {
                ...row,
                requestedAtDate,
                dueAtDate,
                ageLabel,
                dueLabel,
                slaVariant: "success",
                slaText: "Within SLA",
                slaStatus: "healthy",
                priorityText: "Within target response window",
                escalationText: row.entityType === "application_access"
                    ? "Queued for realm approval within SLA"
                    : "Queued for super admin review within SLA",
            };
        });
    }, [rows]);

    const entityOptions = useMemo(
        () => facets.entityTypes.map((value) => ({ value, label: labelize(value) })),
        [facets.entityTypes]
    );
    const actionOptions = useMemo(
        () => facets.actions.map((value) => ({ value, label: labelize(value) })),
        [facets.actions]
    );
    const requesterOptions = useMemo(
        () => facets.requestedBy.map((value) => ({ value, label: value })),
        [facets.requestedBy]
    );

    const pendingCount = useMemo(() => rowsWithSla.filter((row) => row.status === "Pending").length, [rowsWithSla]);
    const overdueCount = useMemo(() => rowsWithSla.filter((row) => row.slaStatus === "overdue").length, [rowsWithSla]);
    const dueSoonCount = useMemo(() => rowsWithSla.filter((row) => row.slaStatus === "due_soon").length, [rowsWithSla]);
    const oldestPending = useMemo(
        () => rowsWithSla.filter((row) => row.status === "Pending").sort((a, b) => a.requestedAtDate.getTime() - b.requestedAtDate.getTime())[0] ?? null,
        [rowsWithSla]
    );
    const sortedRowsWithSla = useMemo(() => {
        const priorityRank = (row: ApprovalRequestWithSla) => {
            if (row.status !== "Pending") return 3;
            if (row.slaStatus === "overdue") return 0;
            if (row.slaStatus === "due_soon") return 1;
            return 2;
        };

        return [...rowsWithSla].sort((a, b) => {
            const rankDiff = priorityRank(a) - priorityRank(b);
            if (rankDiff !== 0) return rankDiff;

            if (a.status === "Pending" && b.status === "Pending") {
                return a.dueAtDate.getTime() - b.dueAtDate.getTime();
            }

            return b.requestedAtDate.getTime() - a.requestedAtDate.getTime();
        });
    }, [rowsWithSla]);
    const selectedWithSla = useMemo(
        () => (selected ? rowsWithSla.find((row) => row.id === selected.id) ?? null : null),
        [rowsWithSla, selected]
    );
    const selectedPayload = useMemo(() => safeParseRecord(selected?.payloadJson), [selected?.payloadJson]);
    const hasAnyFilters = entityFilter.length > 0 || actionFilter.length > 0 || requesterFilter.length > 0;
    const isRequesterViewingSelected =
        selected
            ? String(selected.requestedByUsername).trim().toLowerCase() === currentUsername.trim().toLowerCase()
            : false;
    const canReviewSelected = Boolean(
        selected &&
        selected.status === "Pending" &&
        (
            isSuperAdmin
                ? selected.entityType !== "application_access"
                : selected.entityType === "application_access" && !isRequesterViewingSelected
        )
    );

    const reviewRequest = async (requestId: string, action: "approve" | "reject") => {
        try {
            setReviewing(action);
            await governanceApi.reviewApproval(requestId, action, { comment: reviewComment.trim() || undefined });
            pushToast(action === "approve" ? "Approval request approved" : "Approval request rejected", action === "approve" ? "success" : "info");
            setSelected(null);
            setReviewComment("");
            await loadRequests();
        } catch (err) {
            pushToast(err instanceof Error ? err.message : `Failed to ${action} request`, "error");
        } finally {
            setReviewing(null);
        }
    };

    const columns = useMemo<TableColumn<ApprovalRequestWithSla>[]>(() => [
        {
            key: "requestedAt",
            label: "Requested",
            width: "180px",
            render: (value, row) => (
                <div className="audit-eventCell">
                    <div className="audit-eventTime">{formatDateTime(String(value))}</div>
                    <div className="audit-eventTimeSub">Open for {row.ageLabel}</div>
                </div>
            ),
        },
        {
            key: "requestedByUsername",
            label: "Requested By",
            width: "150px",
        },
        {
            key: "entityName",
            label: "Target",
            width: "220px",
            render: (value, row) => (
                <div className="approval-targetCell">
                    <div className="approval-targetName">{String(value)}</div>
                    <div className="approval-targetMeta">
                        {labelize(row.entityType)} / {labelize(row.action)}
                    </div>
                </div>
            ),
        },
        {
            key: "reason",
            label: "Reason",
            render: (value) => <span className="approval-reasonText">{String(value)}</span>,
        },
        {
            key: "status",
            label: "Status",
            width: "120px",
            render: (value) => <Badge variant={statusVariant(String(value))}>{String(value)}</Badge>,
        },
        {
            key: "slaText",
            label: "SLA",
            width: "180px",
            render: (_value, row) => (
                <div className="approval-slaCell">
                    <Badge variant={row.slaVariant}>{row.slaText}</Badge>
                    <div className="approval-slaSubtext">{row.status === "Pending" ? row.dueLabel : row.priorityText}</div>
                </div>
            ),
        },
    ], []);

    return (
        <div className="approval-pageShell">
            <div className="audit-heroCard">
                <div className="audit-heroTop">
                    <div>
                            <div className="audit-heroTitle">High Impact Approval Queue</div>
                        <div className="audit-heroSubtitle">
                            Review governed realm, application, and access requests before the change is applied. App-access grants route to realm approvers, while high-impact deactivation actions stay with super admins.
                        </div>
                    </div>
                    <div className="audit-heroActions">
                        <button type="button" className="kc-btn kc-btn-primary" onClick={() => { void loadRequests(); }}>
                            <RefreshCw size={16} />
                            Refresh queue
                        </button>
                    </div>
                </div>

                <div className="audit-summaryGrid">
                    <div className="audit-summaryCard is-warning">
                        <div className="audit-summaryIcon"><Clock3 size={18} /></div>
                        <div>
                            <div className="audit-summaryLabel">Pending Requests</div>
                            <div className="audit-summaryValue">{pendingCount}</div>
                        </div>
                    </div>
                    <div className="audit-summaryCard is-danger">
                        <div className="audit-summaryIcon"><AlertTriangle size={18} /></div>
                        <div>
                            <div className="audit-summaryLabel">Overdue SLA</div>
                            <div className="audit-summaryValue">{overdueCount}</div>
                        </div>
                    </div>
                    <div className="audit-summaryCard is-info">
                        <div className="audit-summaryIcon"><TimerReset size={18} /></div>
                        <div>
                            <div className="audit-summaryLabel">Due Within 1h</div>
                            <div className="audit-summaryValue">{dueSoonCount}</div>
                        </div>
                    </div>
                    <div className="audit-summaryCard is-success">
                        <div className="audit-summaryIcon"><ShieldCheck size={18} /></div>
                        <div>
                            <div className="audit-summaryLabel">Approved</div>
                            <div className="audit-summaryValue">{rows.filter((row) => row.status === "Approved").length}</div>
                        </div>
                    </div>
                    <div className="audit-summaryCard is-danger">
                        <div className="audit-summaryIcon"><ShieldX size={18} /></div>
                        <div>
                            <div className="audit-summaryLabel">Rejected</div>
                            <div className="audit-summaryValue">{rows.filter((row) => row.status === "Rejected").length}</div>
                        </div>
                    </div>
                </div>

                {oldestPending && (
                    <div className="audit-latestStrip">
                        <div className="audit-latestLabel">Oldest open request</div>
                        <div className="audit-latestValue">
                            {oldestPending.entityName} requested by {oldestPending.requestedByUsername}
                        </div>
                        <Badge variant={oldestPending.slaVariant}>{oldestPending.slaText}</Badge>
                        <div className="audit-latestValue">{oldestPending.dueLabel}</div>
                    </div>
                )}
            </div>

            <div className="table-card kc-listTableCard approval-tableCard">
                <DataTable<ApprovalRequestWithSla>
                    data={sortedRowsWithSla}
                    columns={columns}
                    keyField="id"
                    loading={loading}
                    error={error}
                    onRefresh={() => { void loadRequests(); }}
                    onRowClick={(row) => { setSelected(row); setReviewComment(row.reviewComment ?? ""); }}
                    searchable
                    searchPlaceholder="Search approval requests..."
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
                    emptyMessage="No approval requests yet"
                    rowClassName={(row) => {
                        if (row.slaStatus === "overdue") return "approval-row is-overdue";
                        if (row.slaStatus === "due_soon") return "approval-row is-due-soon";
                        return "approval-row";
                    }}
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
                                    label="Requester"
                                    options={requesterOptions}
                                    value={requesterFilter}
                                    onChange={(next) => {
                                        setRequesterFilter(next);
                                        setPage(1);
                                    }}
                                    placeholder="All"
                                    portal
                                />
                                {hasAnyFilters && (
                                    <button
                                        type="button"
                                        className="kc_btn kc_btn_icon"
                                        title="Clear all filters"
                                        onClick={() => {
                                            setEntityFilter([]);
                                            setActionFilter([]);
                                            setRequesterFilter([]);
                                            setPage(1);
                                        }}
                                        aria-label="Clear all filters"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ),
                        right: <span className="approval-toolbarMeta">Showing {rows.length} of {total}</span>,
                    }}
                    minHeight="100%"
                />
            </div>

            {selected && (
                <div className="kcDrawerOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
                    <aside className="kcDrawer auditDrawer" role="dialog" aria-modal="true" aria-label="Approval request drawer" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="kcDrawerHeader">
                            <div>
                                <div className="kcDrawerTitle">Approval request</div>
                                <div className="kcDrawerSubtitle">
                                    Review the request details and decide whether to approve or reject it.
                                </div>
                            </div>
                            <button type="button" className="kc-btn kc-btn-ghost" onClick={() => setSelected(null)} aria-label="Close">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="kcDrawerBody auditDrawerBody">
                            <div className="audit-detailGrid">
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Target</div>
                                    <div className="audit-inspectValue">{selected.entityName}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Entity Type</div>
                                    <div className="audit-inspectValue">{labelize(selected.entityType)}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Action</div>
                                    <div className="audit-inspectValue">{labelize(selected.action)}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Requested By</div>
                                    <div className="audit-inspectValue">{selected.requestedByUsername}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Status</div>
                                    <div className="audit-inspectValue">{selected.status}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">Requested At</div>
                                    <div className="audit-inspectValue">{formatDateTime(selected.requestedAt)}</div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">SLA Target</div>
                                    <div className="audit-inspectValue">
                                        {selectedWithSla ? `${selectedWithSla.slaText} / ${selectedWithSla.dueLabel}` : "-"}
                                    </div>
                                </div>
                                <div className="audit-inspectCard">
                                    <div className="audit-inspectLabel">SLA Policy</div>
                                    <div className="audit-inspectValue">{selectedWithSla ? `${selectedWithSla.slaHours} hour target` : "-"}</div>
                                </div>
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">State Comparison</div>
                                    <div className="approval-compareGrid">
                                        <div className="glass-surface glass-surface--light approval-stateCard">
                                            <div className="approval-stateCardLabel">
                                                Current State
                                            </div>
                                            <div className="approval-stateCardValue">
                                                {selected.entityType === "application_access"
                                                    ? "No access"
                                                    : selected.entityType === "application"
                                                        ? "Enabled"
                                                        : "Active"}
                                            </div>
                                            <div className="approval-stateCardText">
                                                This is the live state before the governance request is applied.
                                            </div>
                                        </div>
                                        <div className="glass-surface glass-surface--light approval-stateCard approval-stateCard--requested">
                                            <div className="approval-stateCardLabel approval-stateCardLabel--requested">
                                                Requested State
                                            </div>
                                            <div className="approval-stateCardValue approval-stateCardValue--requested">
                                                {requestedStatusLabel(selectedPayload, selected.action)}
                                            </div>
                                            <div className="approval-stateCardText approval-stateCardText--requested">
                                                {selected.entityType === "application_access"
                                                    ? "If approved, this user will be granted access to the application inside the selected realm."
                                                    : selected.entityType === "application"
                                                        ? "If approved, application access will be disabled until a later re-enable action."
                                                        : "If approved, the realm will be marked inactive and assigned-user access may be interrupted."}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">Priority Guidance</div>
                                    <div className="audit-inspectValue">
                                        {selectedWithSla?.priorityText ?? "Review based on operational urgency."}
                                    </div>
                                </div>
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">Request Scope</div>
                                    <div className="approval-scopeGrid">
                                        <div className="glass-surface glass-surface--light approval-scopeCard">
                                            <div className="approval-scopeLabel">
                                                Requested Status
                                            </div>
                                            <div className="approval-scopeValue">
                                                {requestedStatusLabel(selectedPayload, selected.action)}
                                            </div>
                                        </div>
                                        {selected.entityType === "realm" && (
                                            <>
                                                <div className="glass-surface glass-surface--light approval-scopeCard">
                                                    <div className="approval-scopeLabel">
                                                        Assigned Users
                                                    </div>
                                                    <div className="approval-scopeValue">
                                                        {readNumber(selectedPayload, "userCount") ?? 0}
                                                    </div>
                                                </div>
                                                <div className="glass-surface glass-surface--light approval-scopeCard">
                                                    <div className="approval-scopeLabel">
                                                        Pending Access Requests
                                                    </div>
                                                    <div className="approval-scopeValue">
                                                        {readNumber(selectedPayload, "pendingAccessRequests") ?? 0}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        {selected.entityType === "application" && (
                                            <>
                                                <div className="glass-surface glass-surface--light approval-scopeCard">
                                                    <div className="approval-scopeLabel">
                                                        Linked Realms
                                                    </div>
                                                    <div className="approval-scopeValue">
                                                        {readNumber(selectedPayload, "linkedRealmCount") ?? 0}
                                                    </div>
                                                </div>
                                                <div className="glass-surface glass-surface--light approval-scopeCard">
                                                    <div className="approval-scopeLabel">
                                                        Users With Access
                                                    </div>
                                                    <div className="approval-scopeValue">
                                                        {readNumber(selectedPayload, "accessUserCount") ?? 0}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        {selected.entityType === "application_access" && (
                                            <>
                                                <div className="glass-surface glass-surface--light approval-scopeCard">
                                                    <div className="approval-scopeLabel">
                                                        Realm
                                                    </div>
                                                    <div className="approval-scopeValue">
                                                        {readString(selectedPayload, "realmName") ?? "-"}
                                                    </div>
                                                </div>
                                                <div className="glass-surface glass-surface--light approval-scopeCard">
                                                    <div className="approval-scopeLabel">
                                                        User
                                                    </div>
                                                    <div className="approval-scopeValue">
                                                        {readString(selectedPayload, "displayName") ?? readString(selectedPayload, "username") ?? "-"}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {(readString(selectedPayload, "ownerRealm") || readNumber(selectedPayload, "redirectUriCount") !== null || readNumber(selectedPayload, "postLogoutRedirectUriCount") !== null || readString(selectedPayload, "impactSummary")) && (
                                    <div className="audit-inspectCard audit-inspectCard-wide">
                                        <div className="audit-inspectLabel">Impact Summary</div>
                                        <div className="approval-impactStack">
                                            {readString(selectedPayload, "impactSummary") && (
                                                <div className="audit-inspectValue">{readString(selectedPayload, "impactSummary")}</div>
                                            )}
                                            {readString(selectedPayload, "ownerRealm") && (
                                                <div className="audit-inspectValue">Owner realm: {readString(selectedPayload, "ownerRealm")}</div>
                                            )}
                                            {readNumber(selectedPayload, "redirectUriCount") !== null && (
                                                <div className="audit-inspectValue">Redirect URIs configured: {readNumber(selectedPayload, "redirectUriCount")}</div>
                                            )}
                                            {readNumber(selectedPayload, "postLogoutRedirectUriCount") !== null && (
                                                <div className="audit-inspectValue">Post logout redirect URIs: {readNumber(selectedPayload, "postLogoutRedirectUriCount")}</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {selectedWithSla && (
                                    <div className={`audit-inspectCard audit-inspectCard-wide approval-escalationCard ${selectedWithSla.slaStatus === "overdue" ? "is-breached" : selectedWithSla.slaStatus === "due_soon" ? "is-due-soon" : ""}`}>
                                        <div className="audit-inspectLabel">Escalation</div>
                                        <div className="approval-escalationHead">
                                            <Badge variant={selectedWithSla.slaVariant}>{selectedWithSla.slaText}</Badge>
                                            <span className="approval-escalationText">{selectedWithSla.escalationText}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">Reason</div>
                                    <div className="audit-inspectValue">{selected.reason}</div>
                                </div>
                                {selected.details && (
                                    <div className="audit-inspectCard audit-inspectCard-wide">
                                        <div className="audit-inspectLabel">Details</div>
                                        <div className="audit-inspectValue">{selected.details}</div>
                                    </div>
                                )}
                                {selected.reviewedByUsername && (
                                    <div className="audit-inspectCard audit-inspectCard-wide">
                                        <div className="audit-inspectLabel">Reviewed</div>
                                        <div className="audit-inspectValue">
                                            {selected.reviewedByUsername} {selected.reviewedAt ? `on ${new Date(selected.reviewedAt).toLocaleString("en-SG")}` : ""}
                                        </div>
                                    </div>
                                )}
                                <div className="audit-inspectCard audit-inspectCard-wide">
                                    <div className="audit-inspectLabel">Review Comment</div>
                                    {canReviewSelected ? (
                                        <textarea
                                            className="kc-input approval-reviewTextarea"
                                            rows={4}
                                            value={reviewComment}
                                            onChange={(event) => setReviewComment(event.target.value)}
                                            placeholder="Optional comment for the requester or audit trail"
                                        />
                                    ) : (
                                        <div className="audit-inspectValue">{selected.reviewComment || "No review comment"}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="kcDrawerFooter">
                            <button type="button" className="kc-btn kc-btn-ghost" onClick={() => setSelected(null)}>
                                <X size={16} /> Close
                            </button>
                            {canReviewSelected && (
                                <>
                                    <button type="button" className="kc-btn kc-btn-danger" disabled={reviewing !== null} onClick={() => { void reviewRequest(selected.id, "reject"); }}>
                                        {reviewing === "reject" ? "Rejecting..." : "Reject"}
                                    </button>
                                    <button type="button" className="kc-btn kc-btn-primary" disabled={reviewing !== null} onClick={() => { void reviewRequest(selected.id, "approve"); }}>
                                        {reviewing === "approve" ? "Approving..." : "Approve"}
                                    </button>
                                </>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}