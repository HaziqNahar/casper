import React from "react";

export type WorkflowStep = {
    key: string;
    label: string;
    helper?: string;
};

type Props = {
    steps: WorkflowStep[];
    activeKey: string;
    onStepClick?: (key: string) => void;
};

export default function WorkflowStepper({ steps, activeKey, onStepClick }: Props) {
    const activeIndex = Math.max(0, steps.findIndex((s) => s.key === activeKey));

    return (
        <div className="glass-surface glass-surface--soft wfStepperShell" role="navigation" aria-label="Workflow steps">
            <div className="wfStepperFlow">
                {steps.map((s, idx) => {
                    const isDone = idx < activeIndex;
                    const isActive = idx === activeIndex;

                    const cls = [
                        "wfStepCard",
                        isDone && "is-done",
                        isActive && "is-active",
                        idx > activeIndex && "is-future",
                        onStepClick && "is-clickable",
                    ]
                        .filter(Boolean)
                        .join(" ");

                    return (
                        <React.Fragment key={s.key}>
                            <button
                                type="button"
                                className={cls}
                                onClick={() => onStepClick?.(s.key)}
                                disabled={!onStepClick}
                                aria-current={isActive ? "step" : undefined}
                            >
                                {/* step number */}
                                <span className="wfBadge" aria-hidden="true">
                                    {isDone ? "✓" : idx + 1}
                                </span>

                                <span className="wfText">
                                    <span className="wfLabel">{s.label}</span>
                                    {s.helper && <span className="wfHelper">{s.helper}</span>}
                                </span>
                            </button>

                            {/* connector arrow (desktop) */}
                            {idx !== steps.length - 1 && (
                                <div className={`wfArrow ${idx < activeIndex ? "is-filled" : ""}`} aria-hidden="true">
                                    <div className="wfArrowLine" />
                                    <div className="wfArrowHead" />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}