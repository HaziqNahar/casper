// src/pages/Realms/access/AccessRequestDrawer.tsx
import React, { useMemo, useEffect, useState } from "react";
import { X } from "lucide-react";
import { AccessRequest, AccessRequestEvent, AccessRequestSla, getPendingAccessSla } from "./accessRequestsStore";
import { evaluateGovernance, governanceSummary } from "./governancePolicy";
import { REALM_ROLES } from "../realmTypes";
import SearchableCombobox from "../../../components/common/SearchableCombobox";
import { useUnsavedChangesGuard } from "../../../hooks/useUnsavedChangesGuard";

type Mode = "request" | "approve" | "verify" | "audit";

type Props = {
    open: boolean;
    mode: Mode;
    request: AccessRequest | null;
    events: AccessRequestEvent[];
    onClose: () => void;

    actor?: string;

    onSubmit?: (id: string) => void;
    onCancel?: (id: string) => void;
    onApprove?: (
        id: string,
        payload: {
            note?: string;
            roleRequested: string;
            timeBound: boolean;
            endDate?: string;
        }
    ) => void;
    onReject?: (id: string, note?: string) => void;
    onVerify?: (id: string) => void;
};

function fmt(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

function parseDateOnlyToUtc(dateStr?: string) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function getTodayLocalDateIso() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function diffHuman(ms: number) {
    const abs = Math.max(0, ms);
    const totalMin = Math.floor(abs / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h <= 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function describeDrawerSla(sla?: AccessRequestSla | null) {
    if (!sla) return null;

    if (sla.outcome === "pending") {
        const dueAt = new Date(sla.dueAt).getTime();
        const remainingMs = dueAt - Date.now();
        if (sla.breached) {
            return {
                kind: "danger" as const,
                label: `${sla.stage === "verification" ? "Verification" : "Approval"} overdue by ${diffHuman(Math.abs(remainingMs))}`,
            };
        }

        if (remainingMs <= 60 * 60 * 1000) {
            return {
                kind: "warn" as const,
                label: `${sla.stage === "verification" ? "Verification" : "Approval"} due in ${diffHuman(remainingMs)}`,
            };
        }

        return {
            kind: "info" as const,
            label: `${sla.stage === "verification" ? "Verification" : "Approval"} within SLA`,
        };
    }

    return {
        kind: sla.outcome === "after_sla_breach" ? ("danger" as const) : ("success" as const),
        label:
            sla.outcome === "after_sla_breach"
                ? `${sla.stage === "verification" ? "Verification" : "Approval"} handled after SLA breach`
                : `${sla.stage === "verification" ? "Verification" : "Approval"} handled within SLA`,
    };
}

function pillStyle(kind: "neutral" | "info" | "success" | "danger" | "warn") {
    return `kcDrawerPill kcDrawerPill--${kind}`;
}

const ROLE_ORDER = ["realm_admin", "realm_manager", "realm_user"];
const ROLE_LABELS = Object.fromEntries(REALM_ROLES.map((role) => [role.id, role.name])) as Record<string, string>;

function roleRank(role?: string) {
    if (!role) return 999;
    const idx = ROLE_ORDER.indexOf(role);
    return idx === -1 ? 999 : idx;
}

function roleLabel(role?: string) {
    if (!role) return "—";
    return ROLE_LABELS[role] ?? role;
}

type StepState = "done" | "active" | "pending";

function getStepState(requestStatus: string, step: "request" | "approve" | "verify" | "audit"): StepState {
    const s = (requestStatus || "").toLowerCase();

    if (step === "request") {
        if (s === "draft" || s === "submitted") return "active";
        return "done";
    }

    if (step === "approve") {
        if (s === "draft" || s === "submitted") return s === "submitted" ? "active" : "pending";
        return "done";
    }

    if (step === "verify") {
        if (s === "approved") return "active";
        if (s === "verified") return "done";
        return "pending";
    }

    if (s === "verified" || s === "rejected" || s === "cancelled") return "done";
    return "pending";
}

function findFirstEventAsc(asc: AccessRequestEvent[], types: string[]): AccessRequestEvent | undefined {
    const set = new Set(types);
    return asc.find((e) => set.has(String(e.type)));
}

function stepColors(state: StepState) {
    if (state === "done") {
        return {
            dotBg: "rgba(34,197,94,0.18)",
            dotBorder: "rgba(34,197,94,0.45)",
            dotText: "#166534",
            line: "rgba(34,197,94,0.35)",
        };
    }

    if (state === "active") {
        return {
            dotBg: "rgba(59,130,246,0.16)",
            dotBorder: "rgba(59,130,246,0.55)",
            dotText: "var(--kc-primary, #0b1f3a)",
            line: "rgba(59,130,246,0.35)",
        };
    }

    return {
        dotBg: "rgba(15,23,42,0.06)",
        dotBorder: "rgba(15,23,42,0.14)",
        dotText: "rgba(15,23,42,0.55)",
        line: "rgba(15,23,42,0.12)",
    };
}

function govCanProceed(gov?: { blocks: string[]; requires: string[]; warns: string[] } | null) {
    if (!gov) return true;
    return gov.blocks.length === 0 && gov.requires.length === 0;
}

function govHasWarnOnly(gov?: { blocks: string[]; requires: string[]; warns: string[] } | null) {
    if (!gov) return false;
    return gov.blocks.length === 0 && gov.requires.length === 0 && gov.warns.length > 0;
}

function statusKind(status?: string): "neutral" | "info" | "success" | "danger" | "warn" {
    const s = String(status || "").toLowerCase();
    if (s === "submitted") return "info";
    if (s === "approved" || s === "verified") return "success";
    if (s === "rejected" || s === "cancelled") return "danger";
    if (s === "draft") return "neutral";
    return "neutral";
}

function modeTitle(mode: Mode) {
    if (mode === "request") return "Realm Access Request";
    if (mode === "approve") return "Realm Access Approval";
    if (mode === "verify") return "Realm Access Verification";
    return "Realm Access Audit";
}

function drawerPillTextClass(kind: "neutral" | "info" | "success" | "danger" | "warn") {
    return `kcDrawerPillText kcDrawerPillText--${kind}`;
}

export default function AccessRequestDrawer(props: Props) {
    if (!props.open || !props.request) return null;

    return <AccessRequestDrawerContent key={`${props.mode}:${props.request.id}`} {...props} request={props.request} />;
}

type ContentProps = Omit<Props, "request"> & {
    request: AccessRequest;
};

function AccessRequestDrawerContent({
    open,
    mode,
    request,
    events,
    onClose,
    actor,
    onSubmit,
    onCancel,
    onApprove,
    onReject,
    onVerify,
}: ContentProps) {
    const closeMessage = "Are you sure you want to leave? Your decision changes will not be saved.";

    const reqEventsNewest = useMemo(() => {
        return events
            .filter((e) => e.requestId === request.id)
            .slice()
            .sort((a, b) => (a.at < b.at ? 1 : -1));
    }, [events, request.id]);

    const reqEventsAsc = useMemo(() => {
        return reqEventsNewest.slice().sort((a, b) => (a.at > b.at ? 1 : -1));
    }, [reqEventsNewest]);

    const risk = useMemo(() => {
        const role = (request.roleRequested || "").toLowerCase();
        const highPrivilege = role.includes("admin") || role.includes("manager");

        if (highPrivilege) {
            return { label: "HIGH RISK", kind: "danger" as const, reason: "High-privilege role" };
        }

        if (!request.timeBound) {
            return { label: "MEDIUM RISK", kind: "warn" as const, reason: "Not time-bound" };
        }

        return { label: "LOW RISK", kind: "success" as const, reason: "Time-bound + standard role" };
    }, [request.roleRequested, request.timeBound]);

    const [nowTs, setNowTs] = useState(() => Date.now());
    useEffect(() => {
        if (!open) return;
        const t = window.setInterval(() => setNowTs(Date.now()), 60_000);
        return () => window.clearInterval(t);
    }, [open]);

    const currentSla = useMemo(() => {
        const pending = getPendingAccessSla(request, reqEventsAsc);
        if (pending) return pending;

        const latestResolved = reqEventsNewest.find((event) => event.sla)?.sla;
        return latestResolved ?? null;
    }, [request, reqEventsAsc, reqEventsNewest]);

    const slaText = useMemo(() => describeDrawerSla(currentSla), [currentSla]);

    const expiryText = useMemo(() => {
        if (!request.timeBound || !request.endDate) return null;
        const end = parseDateOnlyToUtc(request.endDate);
        if (!end) return null;

        const endInclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1);
        const ms = endInclusive.getTime() - nowTs;
        const days = Math.ceil(ms / (24 * 60 * 60 * 1000));

        if (ms < 0) return { label: "Expired", kind: "danger" as const, sub: request.endDate };
        if (days <= 1) return { label: "Expires in 1 day", kind: "warn" as const, sub: request.endDate };
        return { label: `Expires in ${days} days`, kind: "info" as const, sub: request.endDate };
    }, [request.timeBound, request.endDate, nowTs]);

    const canSubmit = mode === "request" && request.status === "Draft";
    const canCancel =
        mode === "request" &&
        (request.status === "Draft" || request.status === "Submitted");
    const canApprove = mode === "approve" && request.status === "Submitted";
    const canVerify = mode === "verify" && request.status === "Approved";

    const currentActor = useMemo(() => {
        if (actor && actor.toString().trim()) return actor.trim();
        if (mode === "approve") return request.approver || "";
        if (mode === "verify") return request.verifier || "";
        return request.requester || "";
    }, [actor, mode, request.approver, request.verifier, request.requester]);

    const govSubmit = useMemo(
        () => evaluateGovernance({ request, actor: currentActor, action: "submit" }),
        [request, currentActor]
    );
    const govApprove = useMemo(
        () => evaluateGovernance({ request, actor: currentActor, action: "approve" }),
        [request, currentActor]
    );
    const govVerify = useMemo(
        () => evaluateGovernance({ request, actor: currentActor, action: "verify" }),
        [request, currentActor]
    );

    const govForMode = useMemo(() => {
        if (mode === "request") return govSubmit;
        if (mode === "approve") return govApprove;
        if (mode === "verify") return govVerify;
        return null;
    }, [mode, govSubmit, govApprove, govVerify]);

    const govTextForMode = useMemo(
        () => (govForMode ? governanceSummary(govForMode) : ""),
        [govForMode]
    );
    const govAllowedForMode = useMemo(() => govCanProceed(govForMode), [govForMode]);
    const govWarnOnlyForMode = useMemo(() => govHasWarnOnly(govForMode), [govForMode]);

    const [approvalComment, setApprovalComment] = useState("");
    const [selectedRole, setSelectedRole] = useState<string>(request.roleRequested);
    const [makeTimeBound, setMakeTimeBound] = useState<boolean>(!!request.timeBound);
    const [approvedEndDate, setApprovedEndDate] = useState<string>(request.endDate ?? "");
    const [approvalError, setApprovalError] = useState<string | null>(null);
    const todayIso = useMemo(() => getTodayLocalDateIso(), []);
    const requiresTimeBoundApproval = useMemo(
        () => roleRank(selectedRole) <= roleRank("realm_manager"),
        [selectedRole]
    );
    const effectiveMakeTimeBound = makeTimeBound || requiresTimeBoundApproval;
    const isDecisionDirty = useMemo(
        () =>
            mode === "approve" &&
            (
                approvalComment.trim().length > 0 ||
                selectedRole !== request.roleRequested ||
                makeTimeBound !== !!request.timeBound ||
                approvedEndDate !== (request.endDate ?? "")
            ),
        [mode, approvalComment, selectedRole, request.roleRequested, makeTimeBound, request.timeBound, approvedEndDate, request.endDate]
    );
    const { allowNextNavigation } = useUnsavedChangesGuard({
        when: isDecisionDirty,
        message: closeMessage,
    });
    const closeSafely = () => {
        if (isDecisionDirty && !window.confirm(closeMessage)) {
            return;
        }
        allowNextNavigation();
        onClose();
    };

    const downgradeOptions = useMemo(() => {
        const reqRank = roleRank(request.roleRequested);
        return ROLE_ORDER.filter((r) => roleRank(r) >= reqRank);
    }, [request.roleRequested]);

    const validateApproval = () => {
        if (!approvalComment.trim()) return "Approval comment is required.";

        if (roleRank(selectedRole) < roleRank(request.roleRequested)) {
            return "You can’t upgrade role during approval (only downgrade).";
        }

        if (requiresTimeBoundApproval && !effectiveMakeTimeBound) {
            return "High-privilege approvals must remain time-bound.";
        }

        if (effectiveMakeTimeBound) {
            if (!approvedEndDate) return "End date is required for time-bound approval.";
            if (approvedEndDate < todayIso) {
                return "Approved end date cannot be earlier than today.";
            }
            if (request.startDate && approvedEndDate < request.startDate) {
                return "Approved end date cannot be earlier than the requested start date.";
            }
            if (request.endDate && approvedEndDate > request.endDate) {
                return "You can’t extend access beyond the requested end date.";
            }
        }

        return null;
    };

    const buildApprovalNote = () => {
        const parts: string[] = [];
        parts.push(`Comment: ${approvalComment.trim()}`);

        if (selectedRole !== request.roleRequested) {
            parts.push(`Role adjusted: ${roleLabel(request.roleRequested)} → ${roleLabel(selectedRole)}`);
        } else {
            parts.push(`Role kept: ${roleLabel(selectedRole)}`);
        }

        if (effectiveMakeTimeBound) {
            const requested = request.endDate ? `requested end ${request.endDate}` : "requested end —";
            parts.push(`Time-bound: Yes (approved end ${approvedEndDate}) (${requested})`);
        } else {
            parts.push("Time-bound: No");
        }

        return parts.join(" | ");
    };

    const stepModel = useMemo(() => {
        const stReq = getStepState(request.status, "request");
        const stApp = getStepState(request.status, "approve");
        const stVer = getStepState(request.status, "verify");
        const stAud: StepState =
            mode === "audit"
                ? ["verified", "rejected", "cancelled"].includes(request.status.toLowerCase())
                    ? "done"
                    : "active"
                : getStepState(request.status, "audit");

        const evCreated = findFirstEventAsc(reqEventsAsc, ["CREATED"]);
        const evSubmitted = findFirstEventAsc(reqEventsAsc, ["SUBMITTED"]);
        const evApproved = findFirstEventAsc(reqEventsAsc, ["APPROVED", "REJECTED"]);
        const evVerified = findFirstEventAsc(reqEventsAsc, ["VERIFIED"]);

        const requestMeta = evSubmitted ?? evCreated;
        const approveMeta = evApproved;
        const verifyMeta = evVerified;

        return [
            {
                key: "request",
                label: "Request",
                state: stReq,
                meta: requestMeta ? `${requestMeta.actor} • ${fmt(requestMeta.at)}` : "—",
            },
            {
                key: "approve",
                label: "Approve",
                state: stApp,
                meta: approveMeta ? `${approveMeta.actor} • ${fmt(approveMeta.at)}` : "—",
            },
            {
                key: "verify",
                label: "Verify",
                state: stVer,
                meta: verifyMeta ? `${verifyMeta.actor} • ${fmt(verifyMeta.at)}` : "—",
            },
            {
                key: "audit",
                label: "Audit",
                state: stAud,
                meta: "Logged",
            },
        ] as const;
    }, [reqEventsAsc, request.status, mode]);

    const governanceBlocksAction =
        (mode === "request" && canSubmit && !govCanProceed(govSubmit)) ||
        (mode === "approve" && canApprove && !govCanProceed(govApprove)) ||
        (mode === "verify" && canVerify && !govCanProceed(govVerify));

    return (
        <div
            className="kcDrawerOverlay"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeSafely();
            }}
        >
            <aside
                className="kcDrawer"
                role="dialog"
                aria-modal="true"
                aria-label="Access request details drawer"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="kcDrawerHeader">
                    <div className="kcDrawerHeaderMain">
                        <div className="kcDrawerTitle">{modeTitle(mode)}</div>

                        <div className="kcDrawerMetaRow">
                            <span className="kcDrawerRequestId">
                                {request.id}
                            </span>

                            <span className={pillStyle(statusKind(request.status))}>
                                {request.status}
                            </span>
                        </div>

                        <div className="kcDrawerRequestMeta">
                            <div className="kcDrawerRequestRealm">
                                {request.realmName}
                            </div>

                            <div className="kcDrawerRequestTarget">
                                {request.targetUser} → {roleLabel(request.roleRequested)}
                            </div>

                            <div className="kcDrawerRequestActor">
                                Requested by <b>{request.requester}</b>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="kc-btn kc-btn-ghost"
                        onClick={closeSafely}
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="kcDrawerSummaryStrip">
                    <div className="kcDrawerSummaryPills">
                        <span className={pillStyle(risk.kind)}>
                            {risk.label}
                            <span className={drawerPillTextClass(risk.kind)}>{risk.reason}</span>
                        </span>

                        {slaText && (
                            <span className={pillStyle(slaText.kind)}>
                                SLA <span className={drawerPillTextClass(slaText.kind)}>{slaText.label}</span>
                            </span>
                        )}

                        {expiryText && (
                            <span className={pillStyle(expiryText.kind)}>
                                EXPIRY <span className={drawerPillTextClass(expiryText.kind)}>{expiryText.label}</span>
                                <span className="kcDrawerPillText kcDrawerPillText--subtle">{expiryText.sub}</span>
                            </span>
                        )}
                    </div>
                </div>

                {govForMode && (
                    <div
                        className={`kcGovBanner ${govAllowedForMode ? (govWarnOnlyForMode ? "is-warn" : "is-ok") : "is-blocked"
                            }`}
                    >
                        <div className="kcGovBannerTitle">
                            {govAllowedForMode
                                ? govWarnOnlyForMode
                                    ? "Governance warning"
                                    : "Governance check"
                                : "Governance blocked"}
                        </div>
                        <div className="kcGovBannerText">{govTextForMode}</div>
                    </div>
                )}

                <div className="kcWorkflow">
                    <div className="kcWorkflowTitle">
                        Workflow
                    </div>

                    <div className="kcWorkflowGrid">
                        {stepModel.map((s, idx) => {
                            const c = stepColors(s.state);
                            const isLast = idx === stepModel.length - 1;

                            return (
                                <div key={s.key} className="kcWorkflowStep">
                                    <div className="kcWorkflowHead">
                                        <div
                                            className={`kcWorkflowDot kcWorkflowDot--${s.state}`}
                                            style={{
                                                borderColor: c.dotBorder,
                                                background: c.dotBg,
                                                color: c.dotText,
                                            }}
                                            title={s.state}
                                        >
                                            {idx + 1}
                                        </div>

                                        <div className="kcWorkflowMain">
                                            <div className="kcWorkflowTitleRow">
                                                <div className="kcWorkflowStepLabel" title={s.label}>
                                                    {s.label}
                                                </div>

                                                {s.state === "active" ? (
                                                    <span className="kcWorkflowState" aria-label="active">
                                                        (active)
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="kcWorkflowMeta" title={s.meta}>
                                                {s.meta}
                                            </div>
                                        </div>
                                    </div>

                                    {!isLast && (
                                        <div className="kcWorkflowLineWrap" aria-hidden>
                                            <div className="kcWorkflowLine" style={{ ["--kc-workflow-line" as "--kc-workflow-line"]: c.line } as React.CSSProperties} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="kcDrawerBody">
                    {canApprove && (
                        <>
                            <div className="kcDrawerSectionTitle">Approval Conditions</div>

                            {approvalError && (
                                <div className="kcDrawerCard kcDrawerCard--error">
                                    <div className="kcDrawerErrorTitle">Fix this</div>
                                    <div className="kcDrawerErrorText">
                                        {approvalError}
                                    </div>
                                </div>
                            )}

                            <div className="kcDrawerCard kcDrawerCard--stack">
                                <div className="kcDrawerField">
                                    <div className="kcFieldLabel">Approval comment (required)</div>
                                    <textarea
                                        className="kc-input kcDrawerTextarea"
                                        rows={3}
                                        value={approvalComment}
                                        onChange={(e) => {
                                            setApprovalComment(e.target.value);
                                            setApprovalError(null);
                                        }}
                                        placeholder="Explain why approving/rejecting, and any conditions..."
                                    />
                                </div>

                                <div className="kcDrawerField">
                                    <div className="kcFieldLabel">Role (same or downgrade only)</div>
                                    <SearchableCombobox
                                        value={selectedRole}
                                        onChange={(next) => {
                                            setSelectedRole(next);
                                            setApprovalError(null);
                                        }}
                                        options={downgradeOptions.map((r) => ({
                                            value: r,
                                            label: roleLabel(r),
                                        }))}
                                        placeholder="Select approval role"
                                        inputClassName="kc-input"
                                    />
                                </div>

                                <div className="kcDrawerCheckboxRow">
                                    <input
                                        id="makeTimeBound"
                                        type="checkbox"
                                        className="kc-checkbox"
                                        checked={effectiveMakeTimeBound}
                                        disabled={requiresTimeBoundApproval}
                                        onChange={(e) => {
                                            setMakeTimeBound(e.target.checked);
                                            setApprovalError(null);
                                            if (!e.target.checked) setApprovedEndDate("");
                                        }}
                                    />
                                    <label htmlFor="makeTimeBound" className="kcDrawerCheckboxLabel">
                                        {requiresTimeBoundApproval
                                            ? "Time-bound approval required for this role"
                                            : "Make time-bound (cannot extend beyond requested end)"}
                                    </label>
                                </div>

                                {effectiveMakeTimeBound && (
                                    <div className="kcDrawerField">
                                        <div className="kcFieldLabel">
                                            Approved end date {request.endDate ? `(requested: ${request.endDate})` : ""}
                                        </div>
                                        <input
                                            className="kc-input"
                                            type="date"
                                            min={request.startDate && request.startDate > todayIso ? request.startDate : todayIso}
                                            value={approvedEndDate}
                                            onChange={(e) => {
                                                setApprovedEndDate(e.target.value);
                                                setApprovalError(null);
                                            }}
                                        />
                                        <div className="kcDrawerHelpText">
                                            If the requester asked for an end date, you can only shorten it or keep the same.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="kcDrawerSectionTitle">Access Summary</div>
                    <div className="kcSectionCard kcDrawerSummaryCard">
                        <div className="kcDrawerSummaryGrid">
                            {[
                                { label: "Realm", value: request.realmName },
                                { label: "Target User", value: request.targetUser },
                                { label: "Requested Role", value: roleLabel(request.roleRequested) },
                                { label: "Status", value: request.status },
                                { label: "Requester", value: request.requester },
                                { label: "Approver", value: request.approver ?? "—" },
                                { label: "Verifier", value: request.verifier ?? "—" },
                                { label: "Last Updated", value: fmt(request.updatedAt) },
                            ].map((item, index) => (
                                <div
                                    key={item.label}
                                    className={`kcDrawerSummaryItem${index % 2 === 0 ? " is-alt" : ""}${index < 6 ? " has-divider" : ""}`}
                                >
                                    <div className="kcFieldLabel kcDrawerSummaryLabel">
                                        {item.label}
                                    </div>
                                    <div className="kcFieldValue kcDrawerSummaryValue">
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="kcDrawerSectionTitle">Justification</div>
                    <div className="kcSectionCard">
                        <div className="kcDrawerBodyText">
                            {request.justification || "—"}
                        </div>
                    </div>

                    <div className="kcDrawerSectionTitle">Duration</div>
                    <div className="kcSectionCard">
                        <div className="kcDrawerSectionGrid">
                            <div>
                                <div className="kcFieldLabel">Time-bound</div>
                                <div className="kcFieldValue">{request.timeBound ? "Yes" : "No"}</div>
                            </div>
                            <div>
                                <div className="kcFieldLabel">Start</div>
                                <div className="kcFieldValue">{request.startDate ?? "—"}</div>
                            </div>
                            <div>
                                <div className="kcFieldLabel">End</div>
                                <div className="kcFieldValue">{request.endDate ?? "—"}</div>
                            </div>
                        </div>
                    </div>

                    <div className="kcDrawerSectionTitle">Timeline</div>
                    <div className="kcSectionCard">
                        {reqEventsNewest.length === 0 ? (
                            <div className="kc-text-muted">No events yet.</div>
                        ) : (
                            <div className="kcDrawerTimeline">
                                {reqEventsNewest.map((e) => (
                                    <div key={e.id} className="kcTimelineRow">
                                        <div className="kcTimelineMain">
                                            <div className="kcTimelineType">
                                                {e.type}
                                            </div>
                                            {e.sla && (
                                                <div className="kcTimelinePillRow">
                                                    <span className={pillStyle(describeDrawerSla(e.sla)?.kind ?? "neutral")}>
                                                        {describeDrawerSla(e.sla)?.label}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="kcTimelineMessage kc-text-muted">
                                                {e.message ?? "—"}
                                            </div>
                                        </div>

                                        <div className="kcTimelineMeta">
                                            <div className="kcTimelineActor">{e.actor}</div>
                                            <div className="kcTimelineAt kc-text-muted">
                                                {fmt(e.at)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="kcDrawerFooter">
                    <div className="kcDrawerFooterRight">
                        {canSubmit && (
                            <button
                                type="button"
                                className="kc-btn kc-btn-primary"
                                disabled={!govCanProceed(govSubmit)}
                                title={!govCanProceed(govSubmit) ? governanceSummary(govSubmit) : "Submit"}
                                onClick={() => onSubmit?.(request.id)}
                            >
                                Submit
                            </button>
                        )}

                        {canCancel && (
                            <button
                                type="button"
                                className="kc-btn kc-btn-ghost"
                                onClick={() => onCancel?.(request.id)}
                            >
                                Cancel
                            </button>
                        )}

                        {canApprove && (
                            <>
                                <button
                                    type="button"
                                    className="kc-btn kc-btn-primary"
                                    disabled={!govCanProceed(govApprove)}
                                    title={!govCanProceed(govApprove) ? governanceSummary(govApprove) : "Approve"}
                                    onClick={() => {
                                        if (!govCanProceed(govApprove)) return;

                                        const err = validateApproval();
                                        setApprovalError(err);
                                        if (err) return;

                                        const note = buildApprovalNote();

                                        onApprove?.(request.id, {
                                            note,
                                            roleRequested: selectedRole,
                                            timeBound: effectiveMakeTimeBound,
                                            endDate: effectiveMakeTimeBound ? approvedEndDate : "",
                                        });
                                        allowNextNavigation();
                                    }}
                                >
                                    Approve
                                </button>

                                <button
                                    type="button"
                                    className="kc-btn kc-btn-ghost"
                                    disabled={!govCanProceed(govApprove)}
                                    title={!govCanProceed(govApprove) ? governanceSummary(govApprove) : "Reject"}
                                    onClick={() => {
                                        if (!govCanProceed(govApprove)) return;

                                        if (!approvalComment.trim()) {
                                            setApprovalError("Rejection comment is required.");
                                            return;
                                        }

                                        onReject?.(request.id, `Rejection: ${approvalComment.trim()}`);
                                        allowNextNavigation();
                                    }}
                                >
                                    Reject
                                </button>
                            </>
                        )}

                        {canVerify && (
                            <button
                                type="button"
                                className="kc-btn kc-btn-primary"
                                disabled={!govCanProceed(govVerify)}
                                title={!govCanProceed(govVerify) ? governanceSummary(govVerify) : "Verify"}
                                onClick={() => {
                                    if (!govCanProceed(govVerify)) return;
                                    allowNextNavigation();
                                    onVerify?.(request.id);
                                }}
                            >
                                Verify
                            </button>
                        )}

                        {governanceBlocksAction ? (
                            <span className="kcGovHint">Blocked by governance policy</span>
                        ) : null}
                    </div>
                </div>
            </aside>
        </div>
    );
}