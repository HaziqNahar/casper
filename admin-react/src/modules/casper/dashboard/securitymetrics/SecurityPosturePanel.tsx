import React from "react";
import type { PostureItem, Severity } from "./securityMetrics";

const sevStyles: Record<Severity, React.CSSProperties> = {
    ok: { background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.35)", color: "#166534" },
    info: { background: "rgba(59,130,246,0.10)", borderColor: "rgba(59,130,246,0.30)", color: "#1d4ed8" },
    warn: { background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.35)", color: "#92400e" },
    critical: { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)", color: "#991b1b" },
};

export const SecurityPosturePanel: React.FC<{
    items: PostureItem[];
    onItemClick?: (id: string) => void;
}> = ({ items, onItemClick }) => {
    return (
        <div className="kc-card" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <div className="kc-text-title">Security Posture</div>
                <div className="kc-text-subtitle kc-text-muted">Click any indicator to drill down</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {items.map((it) => (
                    <button
                        key={it.id}
                        type="button"
                        onClick={() => onItemClick?.(it.id)}
                        title={it.hint ?? ""}
                        style={{
                            textAlign: "left",
                            border: "1px solid",
                            borderRadius: 14,
                            padding: "0.9rem",
                            cursor: "pointer",
                            background: "#fff",
                            ...sevStyles[it.severity],
                        }}
                    >
                        <div style={{ fontSize: "0.78rem", fontWeight: 900, opacity: 0.85 }}>{it.label}</div>
                        <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontSize: "1.35rem", fontWeight: 950 }}>{it.valueText}</div>
                            <span
                                style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 900,
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: 999,
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    background: "rgba(255,255,255,0.55)",
                                }}
                            >
                                {it.severity.toUpperCase()}
                            </span>
                        </div>

                        {it.hint && (
                            <div style={{ marginTop: 8, fontSize: "0.78rem", opacity: 0.9, lineHeight: 1.25 }}>
                                {it.hint}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};