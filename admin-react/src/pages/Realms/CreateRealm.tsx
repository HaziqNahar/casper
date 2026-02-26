import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Plus } from "lucide-react";
import type { RealmRow } from "../../types";

type RealmStatus = "Active" | "Inactive" | "Draft";

const makeRealmId = (name: string) =>
    `realm-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;

export default function CreateRealmPage(): React.ReactElement {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        status: "Draft" as RealmStatus,
        mfaRequired: true,
        passwordInheritance: "inherit" as "inherit" | "override",
        sessionTimeoutMins: 30,
    });

    const [error, setError] = useState<string | null>(null);
    const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

    const onCancel = () => navigate("/realms");

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const name = form.name.trim();
        if (!name) return setError("Realm name is required");

        const newRealm: RealmRow = {
            id: makeRealmId(name),
            name,
            status: form.status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userCount: 0,
            mfaRequired: form.mfaRequired,
            passwordInheritance: form.passwordInheritance,
            sessionTimeoutMins: Number(form.sessionTimeoutMins) || 30,
        };

        // UI-only routing pattern:
        // 1) store realm draft in sessionStorage (simple)
        // 2) Realms.tsx reads it on mount, inserts into state, opens detail tab
        sessionStorage.setItem("NEW_REALM_DRAFT", JSON.stringify(newRealm));

        navigate("/realms?created=1");
    };

    return (
        <div style={{ padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "0.5rem 0.9rem",
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            cursor: "pointer",
                            fontWeight: 700,
                            color: "#374151",
                        }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div>
                        <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a" }}>Create Realm</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>
                            Set basic lifecycle + security controls.
                        </div>
                    </div>
                </div>
            </div>

            <form
                onSubmit={onSubmit}
                style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: "1rem",
                    maxWidth: 900,
                }}
            >
                <div style={{ display: "grid", gap: 14 }}>
                    {/* Name */}
                    <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontWeight: 900, color: "#0f172a" }}>Realm name</div>
                        <input
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Operations Realm"
                            style={{
                                width: "100%",
                                padding: "0.65rem 0.75rem",
                                border: "1px solid #e5e7eb",
                                borderRadius: 12,
                                fontSize: "0.95rem",
                                fontWeight: 700,
                            }}
                        />
                        {error && <div style={{ color: "#b91c1c", fontWeight: 800, fontSize: 13 }}>{error}</div>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                        {/* Status */}
                        <div style={{ display: "grid", gap: 6 }}>
                            <div style={{ fontWeight: 900, color: "#0f172a" }}>Status</div>
                            <select
                                className="kc-select"
                                value={form.status}
                                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as RealmStatus }))}
                            >
                                <option value="Draft">Draft</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Password */}
                        <div style={{ display: "grid", gap: 6 }}>
                            <div style={{ fontWeight: 900, color: "#0f172a" }}>Password policy</div>
                            <select
                                className="kc-select"
                                value={form.passwordInheritance}
                                onChange={(e) => setForm((p) => ({ ...p, passwordInheritance: e.target.value as any }))}
                            >
                                <option value="inherit">Inherit from global policy</option>
                                <option value="override">Override for this realm</option>
                            </select>
                        </div>

                        {/* Session */}
                        <div style={{ display: "grid", gap: 6 }}>
                            <div style={{ fontWeight: 900, color: "#0f172a" }}>Session timeout (mins)</div>
                            <input
                                className="kc-input"
                                type="number"
                                min={5}
                                max={240}
                                value={form.sessionTimeoutMins}
                                onChange={(e) => setForm((p) => ({ ...p, sessionTimeoutMins: Number(e.target.value) }))}
                            />
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>Recommended: 15–60 mins.</div>
                        </div>
                    </div>

                    {/* MFA toggle */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            padding: "0.9rem",
                            border: "1px solid #e5e7eb",
                            borderRadius: 14,
                            background: "#fff",
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <Shield size={16} /> Require MFA
                            </div>
                            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
                                Enforce MFA for users accessing apps in this realm.
                            </div>
                        </div>

                        <input
                            type="checkbox"
                            checked={form.mfaRequired}
                            onChange={(e) => setForm((p) => ({ ...p, mfaRequired: e.target.checked }))}
                            style={{ width: 18, height: 18 }}
                        />
                    </div>

                    {/* Footer */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                        <button type="button" className="kc-btn kc-btn-ghost" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="kc-btn kc-btn-primary" disabled={!canSubmit}>
                            <Plus size={16} /> Create Realm
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}