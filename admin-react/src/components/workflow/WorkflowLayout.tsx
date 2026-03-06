import React from "react";
import WorkflowStepper from "./WorkFlowStepper";
import { ROUTES } from "../../config/routes";
import { useNavigate } from "react-router-dom";

const STEPS = [
    { key: "request", label: "Request", path: ROUTES.REALM_ACCESS_REQUEST },
    { key: "approve", label: "Approve", path: ROUTES.REALM_ACCESS_APPROVE },
    { key: "verify", label: "Verify", path: ROUTES.REALM_ACCESS_VERIFY },
    { key: "audit", label: "Audit", path: ROUTES.REALM_ACCESS_AUDIT },
];

interface Props {
    activeStep: "request" | "approve" | "verify" | "audit";
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

const WorkflowLayout: React.FC<Props> = ({
    activeStep,
    title,
    subtitle,
    children,
}) => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: "1.2rem" }}>
            <div style={{ marginBottom: "1rem" }}>
                <WorkflowStepper
                    steps={STEPS.map((s) => ({
                        key: s.key,
                        label: s.label,
                    }))}
                    activeKey={activeStep}
                    onStepClick={(k) => {
                        const step = STEPS.find((s) => s.key === k);
                        if (step) navigate(step.path);
                    }}
                />
            </div>

            <div style={{ marginBottom: "0.7rem" }}>
                <div className="kc-text-title">{title}</div>
                {subtitle && (
                    <div className="kc-text-muted" style={{ marginTop: 4 }}>
                        {subtitle}
                    </div>
                )}
            </div>

            <div className="kc-card">{children}</div>
        </div>
    );
};

export default WorkflowLayout;