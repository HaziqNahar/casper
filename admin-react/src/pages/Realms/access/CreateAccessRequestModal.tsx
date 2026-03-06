import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { AccessRequest } from "./accessRequestsStore";

type Props = {
    open: boolean;
    initial?: {
        realmId: string;
        realmName: string;
        targetUser: string;
        roleRequested: string;
    };
    onClose: () => void;
    onCreated: (req: AccessRequest) => void;
    onCreate: (input: {
        realmId: string;
        realmName: string;
        targetUser: string;
        roleRequested: string;
        justification: string;
        timeBound?: boolean;
        startDate?: string;
        endDate?: string;
        requester: string;
    }) => AccessRequest;
    requester: string;
};

const ROLES = ["realm_user", "realm_manager", "realm_admin"] as const;
type Role = (typeof ROLES)[number];

export default function CreateAccessRequestModal({
    open,
    onClose,
    onCreated,
    onCreate,
    requester,
    initial,
}: Props) {
    const [realmName, setRealmName] = useState("");
    const [realmId, setRealmId] = useState("");
    const [targetUser, setTargetUser] = useState("");
    const [roleRequested, setRoleRequested] = useState<Role>(ROLES[0]);
    const [justification, setJustification] = useState("");
    const [timeBound, setTimeBound] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setRealmName("");
        setRealmId("");
        setTargetUser("");
        setRoleRequested(ROLES[0]);
        setJustification("");
        setTimeBound(false);
        setStartDate("");
        setEndDate("");
        setError(null);
    };

    // ✅ Hooks must run before any early return
    useEffect(() => {
        if (!open) return;

        // Prefill from query params if provided
        setRealmId(initial?.realmId ?? "");
        setRealmName(initial?.realmName ?? "");
        setTargetUser(initial?.targetUser ?? "");

        const initialRole = initial?.roleRequested;
        const nextRole = (ROLES as readonly string[]).includes(initialRole ?? "")
            ? (initialRole as Role)
            : ROLES[0];

        setRoleRequested(nextRole);

        // Don’t auto-wipe justification/timeBound — user might open/close accidentally
        setError(null);
    }, [
        open,
        initial?.realmId,
        initial?.realmName,
        initial?.targetUser,
        initial?.roleRequested,
    ]);

    const canSave = useMemo(() => {
        if (!realmName.trim()) return false;
        if (!realmId.trim()) return false;
        if (!targetUser.trim()) return false;
        if (!roleRequested.trim()) return false;
        if (!justification.trim()) return false;
        if (timeBound && (!startDate || !endDate)) return false;
        if (timeBound && startDate && endDate && startDate > endDate) return false;
        return true;
    }, [
        realmName,
        realmId,
        targetUser,
        roleRequested,
        justification,
        timeBound,
        startDate,
        endDate,
    ]);

    if (!open) return null;

    const lockRealm = Boolean(initial?.realmId);
    const lockTargetUser = Boolean(initial?.targetUser);
    const lockRole = Boolean(initial?.roleRequested);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "grid",
                placeItems: "center",
                zIndex: 9999,
                padding: 16,
            }}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    reset();
                    onClose();
                }
            }}
        >
            <div
                className="kc-modal">
                <div className="kc-modal-header">
                    {/* header */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 12,
                            padding: "14px 16px",
                            borderBottom: "1px solid rgba(255,255,255,0.12)",
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 900, fontSize: "1rem" }}>
                                New Access Request
                            </div>
                            <div style={{ opacity: 0.72, fontSize: "0.82rem", marginTop: 2 }}>
                                Create a draft request (you can submit it after).
                            </div>
                        </div>

                        <button
                            className="kc-btn kc-btn-ghost"
                            onClick={() => {
                                reset();
                                onClose();
                            }}
                            aria-label="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
                {/* body */}
                <div className="kc-modal-body">
                    {error && (
                        <div
                            style={{
                                padding: "10px 12px",
                                borderRadius: 12,
                                border: "1px solid rgba(255, 99, 99, 0.35)",
                                background: "rgba(255, 99, 99, 0.10)",
                            }}
                        >
                            <div style={{ fontWeight: 800, fontSize: "0.85rem" }}>
                                Fix this
                            </div>
                            <div style={{ opacity: 0.85, marginTop: 4, fontSize: "0.82rem" }}>
                                {error}
                            </div>
                        </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <Field label="Realm Name">
                            <input
                                className="kc-input"
                                value={realmName}
                                onChange={(e) => setRealmName(e.target.value)}
                                placeholder="e.g. Operations Realm"
                                disabled={lockRealm}
                            />
                        </Field>

                        <Field label="Realm ID">
                            <input
                                className="kc-input"
                                value={realmId}
                                onChange={(e) => setRealmId(e.target.value)}
                                placeholder="e.g. realm-ops"
                                disabled={lockRealm}
                            />
                        </Field>

                        <Field label="Target User">
                            <input
                                className="kc-input"
                                value={targetUser}
                                onChange={(e) => setTargetUser(e.target.value)}
                                placeholder="e.g. sarah.lee"
                                disabled={lockTargetUser}
                            />
                        </Field>

                        <Field label="Role Requested">
                            <select
                                className="kc-input"
                                value={roleRequested}
                                onChange={(e) => setRoleRequested(e.target.value as Role)}
                                disabled={lockRole}
                            >
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <Field label="Justification">
                        <textarea
                            className="kc-input"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder="Why is access needed? What work will be done?"
                            rows={4}
                            style={{ resize: "vertical" }}
                        />
                    </Field>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                            type="checkbox"
                            checked={timeBound}
                            onChange={(e) => setTimeBound(e.target.checked)}
                            style={{ transform: "translateY(1px)" }}
                            id="timeBound"
                        />
                        <label htmlFor="timeBound" style={{ fontWeight: 800, opacity: 0.9 }}>
                            Time-bound access
                        </label>
                        <span style={{ opacity: 0.6, fontSize: "0.82rem" }}>
                            (recommended for elevated roles)
                        </span>
                    </div>

                    {timeBound && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <Field label="Start Date">
                                <input
                                    className="kc-input"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </Field>
                            <Field label="End Date">
                                <input
                                    className="kc-input"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </Field>
                        </div>
                    )}
                </div>


                {/* footer */}
                <div className="kc-modal-footer">
                    <button
                        className="kc-btn kc-btn-ghost"
                        onClick={() => {
                            reset();
                            onClose();
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        className="kc-btn kc-btn-primary"
                        disabled={!canSave}
                        onClick={() => {
                            setError(null);

                            if (timeBound && startDate && endDate && startDate > endDate) {
                                setError("End date must be after start date.");
                                return;
                            }

                            const req = onCreate({
                                realmId,
                                realmName,
                                targetUser,
                                roleRequested,
                                justification,
                                timeBound,
                                startDate,
                                endDate,
                                requester,
                            });

                            onCreated(req);
                            reset();
                            onClose();
                        }}
                    >
                        Create Draft
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, opacity: 0.8 }}>
                {label}
            </div>
            {children}
        </div>
    );
}