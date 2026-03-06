// src/pages/Realms/access/AccessRequestDrawer.tsx
import React, { useMemo, useEffect, useState } from "react";
import { X } from "lucide-react";
import { AccessRequest, AccessRequestEvent } from "./accessRequestsStore";
import { evaluateGovernance, governanceSummary } from "./governancePolicy";

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
    onApprove?: (id: string, note?: string) => void;
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

function diffHuman(ms: number) {
    const abs = Math.max(0, ms);
    const totalMin = Math.floor(abs / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h <= 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function pillStyle(kind: "neutral" | "info" | "success" | "danger" | "warn") {
    const base: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 900,
        letterSpacing: "0.02em",
        border: "1px solid rgba(15,23,42,0.12)",
        background: "rgba(15,23,42,0.04)",
        color: "var(--kc-text, #0f172a)",
    };

    if (kind === "success")
        return { ...base, border: "1px solid rgba(72,187,120,0.40)", background: "rgba(72,187,120,0.12)" };
    if (kind === "danger")
        return { ...base, border: "1px solid rgba(255,99,99,0.40)", background: "rgba(255,99,99,0.12)" };
    if (kind === "warn")
        return { ...base, border: "1px solid rgba(255,193,7,0.42)", background: "rgba(255,193,7,0.12)" };
    if (kind === "info")
        return { ...base, border: "1px solid rgba(56,189,248,0.40)", background: "rgba(56,189,248,0.12)" };
    return base;
}

const ROLE_ORDER = ["realm_admin", "realm_manager", "realm_user"];

function roleRank(role?: string) {
    if (!role) return 999;
    const idx = ROLE_ORDER.indexOf(role);
    return idx === -1 ? 999 : idx;
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
    if (state === "done")
        return {
            dotBg: "rgba(34,197,94,0.18)",
            dotBorder: "rgba(34,197,94,0.45)",
            dotText: "#166534",
            line: "rgba(34,197,94,0.35)",
        };
    if (state === "active")
        return {
            dotBg: "rgba(59,130,246,0.16)",
            dotBorder: "rgba(59,130,246,0.55)",
            dotText: "var(--kc-primary, #0b1f3a)",
            line: "rgba(59,130,246,0.35)",
        };
    return {
        dotBg: "rgba(15,23,42,0.06)",
        dotBorder: "rgba(15,23,42,0.14)",
        dotText: "rgba(15,23,42,0.55)",
        line: "rgba(15,23,42,0.12)",
    };
}

// governance helpers for your actual policy shape
function govCanProceed(gov?: { blocks: string[]; requires: string[]; warns: string[] } | null) {
    if (!gov) return true;
    return gov.blocks.length === 0 && gov.requires.length === 0;
}

function govHasWarnOnly(gov?: { blocks: string[]; requires: string[]; warns: string[] } | null) {
    if (!gov) return false;
    return gov.blocks.length === 0 && gov.requires.length === 0 && gov.warns.length > 0;
}

export default function AccessRequestDrawer({
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
}: Props) {
    if (!open || !request) return null;

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

        if (highPrivilege) return { label: "HIGH RISK", kind: "danger" as const, reason: "High-privilege role" };
        if (!request.timeBound) return { label: "MEDIUM RISK", kind: "warn" as const, reason: "Not time-bound" };
        return { label: "LOW RISK", kind: "success" as const, reason: "Time-bound + standard role" };
    }, [request.roleRequested, request.timeBound]);

    const submittedAt = useMemo(() => {
        const ev = reqEventsAsc.find((e) => e.type === "SUBMITTED");
        return ev ? new Date(ev.at) : null;
    }, [reqEventsAsc]);

    const [, forceTick] = useState(0);
    useEffect(() => {
        if (!open) return;
        const t = window.setInterval(() => forceTick((x) => x + 1), 60_000);
        return () => window.clearInterval(t);
    }, [open]);

    const slaText = useMemo(() => {
        if (request.status !== "Submitted") return null;
        if (!submittedAt || Number.isNaN(submittedAt.getTime())) return "Waiting approval";
        const ms = Date.now() - submittedAt.getTime();
        return `Waiting approval: ${diffHuman(ms)}`;
    }, [request.status, submittedAt]);

    const expiryText = useMemo(() => {
        if (!request.timeBound || !request.endDate) return null;
        const end = parseDateOnlyToUtc(request.endDate);
        if (!end) return null;

        const endInclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1);
        const ms = endInclusive.getTime() - Date.now();
        const days = Math.ceil(ms / (24 * 60 * 60 * 1000));

        if (ms < 0) return { label: "Expired", kind: "danger" as const, sub: request.endDate };
        if (days <= 1) return { label: "Expires in 1 day", kind: "warn" as const, sub: request.endDate };
        return { label: `Expires in ${days} days`, kind: "info" as const, sub: request.endDate };
    }, [request.timeBound, request.endDate]);

    const canSubmit = mode === "request" && request.status === "Draft";
    const canCancel = mode === "request" && request.status !== "Verified" && request.status !== "Cancelled";
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

    const govTextForMode = useMemo(() => (govForMode ? governanceSummary(govForMode) : ""), [govForMode]);
    const govAllowedForMode = useMemo(() => govCanProceed(govForMode), [govForMode]);
    const govWarnOnlyForMode = useMemo(() => govHasWarnOnly(govForMode), [govForMode]);

    const [approvalComment, setApprovalComment] = useState("");
    const [selectedRole, setSelectedRole] = useState<string>(request.roleRequested);
    const [makeTimeBound, setMakeTimeBound] = useState<boolean>(!!request.timeBound);
    const [approvedEndDate, setApprovedEndDate] = useState<string>(request.endDate ?? "");
    const [approvalError, setApprovalError] = useState<string | null>(null);

    useEffect(() => {
        setApprovalComment("");
        setSelectedRole(request.roleRequested);
        setMakeTimeBound(!!request.timeBound);
        setApprovedEndDate(request.endDate ?? "");
        setApprovalError(null);
    }, [request.id, request.roleRequested, request.timeBound, request.endDate]);

    const downgradeOptions = useMemo(() => {
        const reqRank = roleRank(request.roleRequested);
        return ROLE_ORDER.filter((r) => roleRank(r) >= reqRank);
    }, [request.roleRequested]);

    const validateApproval = () => {
        if (!approvalComment.trim()) return "Approval comment is required.";

        if (roleRank(selectedRole) < roleRank(request.roleRequested)) {
            return "You can’t upgrade role during approval (only downgrade).";
        }

        if (makeTimeBound) {
            if (!approvedEndDate) return "End date is required for time-bound approval.";
            if (request.endDate && approvedEndDate > request.endDate) {
                return "You can’t extend access beyond the requested end date.";
            }
        }

        return null;
    };

    const buildApprovalNote = () => {
        const parts: string[] = [];
        parts.push(`Comment: ${approvalComment.trim()}`);

        if (selectedRole !== request.roleRequested) parts.push(`Role adjusted: ${request.roleRequested} → ${selectedRole}`);
        else parts.push(`Role kept: ${selectedRole}`);

        if (makeTimeBound) {
            const requested = request.endDate ? `requested end ${request.endDate}` : "requested end —";
            parts.push(`Time-bound: Yes (approved end ${approvedEndDate}) (${requested})`);
        } else {
            parts.push(`Time-bound: No`);
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
            { key: "request", label: "Request", state: stReq, meta: requestMeta ? `${requestMeta.actor} • ${fmt(requestMeta.at)}` : "—" },
            { key: "approve", label: "Approve", state: stApp, meta: approveMeta ? `${approveMeta.actor} • ${fmt(approveMeta.at)}` : "—" },
            { key: "verify", label: "Verify", state: stVer, meta: verifyMeta ? `${verifyMeta.actor} • ${fmt(verifyMeta.at)}` : "—" },
            { key: "audit", label: "Audit", state: stAud, meta: "Logged" },
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
                if (e.target === e.currentTarget) onClose();
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
                    <div>
                        <div className="kcDrawerTitle">Access Request</div>
                        <div className="kcDrawerSubtitle">
                            <b>{request.id}</b> • {request.realmName} • {request.status}
                        </div>
                    </div>

                    <button className="kc-btn kc-btn-ghost" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(15,23,42,0.10)" }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={pillStyle(risk.kind)}>
                            {risk.label}
                            <span style={{ opacity: 0.7, fontWeight: 800 }}>{risk.reason}</span>
                        </span>

                        {slaText && (
                            <span style={pillStyle("info")}>
                                SLA <span style={{ opacity: 0.78, fontWeight: 800 }}>{slaText}</span>
                            </span>
                        )}

                        {expiryText && (
                            <span style={pillStyle(expiryText.kind)}>
                                EXPIRY <span style={{ opacity: 0.78, fontWeight: 800 }}>{expiryText.label}</span>
                                <span style={{ opacity: 0.55, fontWeight: 800 }}>{expiryText.sub}</span>
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

                <div className="kcWorkflow" style={{ padding: "14px", borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <div className="kcWorkflowTitle" style={{ fontWeight: 900, fontSize: "0.85rem", marginBottom: 10, color: "var(--kc-text,#0f172a)" }}>
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
                                            style={{ borderColor: c.dotBorder, background: c.dotBg, color: c.dotText }}
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
                                            <div className="kcWorkflowLine" style={{ background: c.line }} />
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
                                <div
                                    className="kcDrawerCard"
                                    style={{
                                        border: "1px solid rgba(255,99,99,0.30)",
                                        background: "rgba(255,99,99,0.10)",
                                        marginBottom: 12,
                                    }}
                                >
                                    <div style={{ fontWeight: 900, fontSize: "0.85rem" }}>Fix this</div>
                                    <div style={{ opacity: 0.85, marginTop: 6, fontSize: "0.82rem" }}>{approvalError}</div>
                                </div>
                            )}

                            <div className="kcDrawerCard" style={{ display: "grid", gap: 12 }}>
                                <div style={{ display: "grid", gap: 6 }}>
                                    <div className="kcFieldLabel">Approval comment (required)</div>
                                    <textarea
                                        className="kc-input"
                                        rows={3}
                                        value={approvalComment}
                                        onChange={(e) => {
                                            setApprovalComment(e.target.value);
                                            setApprovalError(null);
                                        }}
                                        placeholder="Explain why approving/rejecting, and any conditions..."
                                        style={{ resize: "vertical" }}
                                    />
                                </div>

                                <div style={{ display: "grid", gap: 6 }}>
                                    <div className="kcFieldLabel">Role (same or downgrade only)</div>
                                    <select
                                        className="kc-input"
                                        value={selectedRole}
                                        onChange={(e) => {
                                            setSelectedRole(e.target.value);
                                            setApprovalError(null);
                                        }}
                                    >
                                        {downgradeOptions.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <input
                                        id="makeTimeBound"
                                        type="checkbox"
                                        checked={makeTimeBound}
                                        onChange={(e) => {
                                            setMakeTimeBound(e.target.checked);
                                            setApprovalError(null);
                                            if (!e.target.checked) setApprovedEndDate("");
                                        }}
                                    />
                                    <label htmlFor="makeTimeBound" style={{ fontWeight: 800, opacity: 0.9 }}>
                                        Make time-bound (cannot extend beyond requested end)
                                    </label>
                                </div>

                                {makeTimeBound && (
                                    <div style={{ display: "grid", gap: 6 }}>
                                        <div className="kcFieldLabel">
                                            Approved end date {request.endDate ? `(requested: ${request.endDate})` : ""}
                                        </div>
                                        <input
                                            className="kc-input"
                                            type="date"
                                            value={approvedEndDate}
                                            onChange={(e) => {
                                                setApprovedEndDate(e.target.value);
                                                setApprovalError(null);
                                            }}
                                        />
                                        <div className="kc-text-muted" style={{ fontSize: "0.78rem" }}>
                                            If the requester asked for an end date, you can only shorten it (or keep the same).
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="kcDrawerSectionTitle">Overview</div>
                    <div className="kcSectionCard">
                        <div className="kcDrawerSectionGrid">
                            <div>
                                <div className="kcFieldLabel">Realm</div>
                                <div className="kcFieldValue">{request.realmName}</div>
                            </div>

                            <div>
                                <div className="kcFieldLabel">Target User</div>
                                <div className="kcFieldValue">{request.targetUser}</div>
                            </div>

                            <div>
                                <div className="kcFieldLabel">Role Requested</div>
                                <div className="kcFieldValue">{request.roleRequested}</div>
                            </div>

                            <div>
                                <div className="kcFieldLabel">Status</div>
                                <div className="kcFieldValue">{request.status}</div>
                            </div>

                            <div>
                                <div className="kcFieldLabel">Requester</div>
                                <div className="kcFieldValue">{request.requester}</div>
                            </div>

                            <div>
                                <div className="kcFieldLabel">Approver</div>
                                <div className="kcFieldValue">{request.approver ?? "—"}</div>
                            </div>

                            <div>
                                <div className="kcFieldLabel">Verifier</div>
                                <div className="kcFieldValue">{request.verifier ?? "—"}</div>
                            </div>

                            <div>
                                <div className="kcFieldLabel">Last Updated</div>
                                <div className="kcFieldValue">{fmt(request.updatedAt)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="kcDrawerSectionTitle">Justification</div>
                    <div className="kcSectionCard">
                        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{request.justification || "—"}</div>
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
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {reqEventsNewest.map((e) => (
                                    <div
                                        key={e.id}
                                        className="kcTimelineRow"
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            gap: 12,
                                            padding: "10px 12px",
                                            borderRadius: 12,
                                            border: "1px solid rgba(15,23,42,0.10)",
                                            background: "rgba(255,255,255,0.06)",
                                        }}
                                    >
                                        <div style={{ minWidth: 0 }}>
                                            <div className="kcTimelineType" style={{ fontWeight: 900 }}>
                                                {e.type}
                                            </div>
                                            <div className="kc-text-muted" style={{ fontSize: "0.78rem", marginTop: 3 }}>
                                                {e.message ?? "—"}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                                            <div style={{ fontWeight: 800, fontSize: "0.78rem" }}>{e.actor}</div>
                                            <div className="kc-text-muted" style={{ fontSize: "0.75rem", marginTop: 3 }}>
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
                                className="kc-btn kc-btn-primary"
                                disabled={!govCanProceed(govSubmit)}
                                title={!govCanProceed(govSubmit) ? governanceSummary(govSubmit) : "Submit"}
                                onClick={() => onSubmit?.(request.id)}
                            >
                                Submit
                            </button>
                        )}

                        {canCancel && (
                            <button className="kc-btn kc-btn-ghost" onClick={() => onCancel?.(request.id)}>
                                Cancel
                            </button>
                        )}

                        {canApprove && (
                            <>
                                <button
                                    className="kc-btn kc-btn-primary"
                                    disabled={!govCanProceed(govApprove)}
                                    title={!govCanProceed(govApprove) ? governanceSummary(govApprove) : "Approve"}
                                    onClick={() => {
                                        if (!govCanProceed(govApprove)) return;

                                        const err = validateApproval();
                                        setApprovalError(err);
                                        if (err) return;

                                        const note = buildApprovalNote();
                                        onApprove?.(request.id, note);
                                    }}
                                >
                                    Approve
                                </button>

                                <button
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
                                    }}
                                >
                                    Reject
                                </button>
                            </>
                        )}

                        {canVerify && (
                            <button
                                className="kc-btn kc-btn-primary"
                                disabled={!govCanProceed(govVerify)}
                                title={!govCanProceed(govVerify) ? governanceSummary(govVerify) : "Verify"}
                                onClick={() => {
                                    if (!govCanProceed(govVerify)) return;
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