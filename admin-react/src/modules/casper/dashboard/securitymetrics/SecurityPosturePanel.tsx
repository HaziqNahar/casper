import type { PostureItem, Severity } from "./SecurityMetrics";

export const SecurityPosturePanel = ({
    items,
    onItemClick,
}: {
    items: PostureItem[];
    onItemClick?: (id: string) => void;
}) => {
    return (
        <div className="glass-surface glass-surface--soft securityPosture">
            <div className="securityPosture-header">
                <h3 className="securityPosture-title">Risk Indicators</h3>
                <div className="securityPosture-subtitle">Deeper signals behind the operational dashboard</div>
            </div>

            <div className="securityPosture-grid">
                {items.map((it) => (
                    <button
                        key={it.id}
                        type="button"
                        onClick={() => onItemClick?.(it.id)}
                        title={it.hint ?? ""}
                        className={`securityPosture-card is-${it.severity satisfies Severity}`}
                    >
                        <div className="securityPosture-label">{it.label}</div>
                        <div className="securityPosture-valueRow">
                            <div className="securityPosture-value">{it.valueText}</div>
                            <span className="securityPosture-badge">{it.severity.toUpperCase()}</span>
                        </div>

                        {it.hint && <div className="securityPosture-hint">{it.hint}</div>}
                    </button>
                ))}
            </div>
        </div>
    );
};
