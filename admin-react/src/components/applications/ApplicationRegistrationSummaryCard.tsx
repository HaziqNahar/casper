import React from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import type { RegisterApplicationForm } from "../../types/applicationRegistration.types";

interface Props {
    form: RegisterApplicationForm;
    currentStep: number;
    realmLabel?: string;
}

const TYPE_LABELS: Record<RegisterApplicationForm["basics"]["applicationType"], string> = {
    web: "Web App",
    mobile: "Mobile App",
    spa: "Single-Page App",
    backend: "Backend Service",
    m2m: "Machine-to-Machine",
};

const RISK_LABELS: Record<RegisterApplicationForm["basics"]["criticality"], string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
};

const ApplicationRegistrationSummaryCard: React.FC<Props> = ({ form, currentStep, realmLabel }) => {
    const checklist = [
        { label: "Application name", ok: !!form.basics.name.trim() },
        { label: "Realm selected", ok: !!form.basics.realmId },
        { label: "Owner email", ok: !!form.basics.ownerEmail.trim() },
        { label: "Client ID", ok: !!form.auth.clientId.trim() },
        {
            label: "Redirect URI added",
            ok:
                form.auth.redirectUris.length > 0 ||
                form.basics.applicationType === "backend" ||
                form.basics.applicationType === "m2m"
        },
        { label: "Roles selected", ok: form.security.allowedRoles.length > 0 }
    ];

    return (
        <aside className="kc-summaryCard">
            <div className="kc-summaryCardHeader">
                <div>
                    <div className="kc-summaryTitle">Registration Summary</div>
                    <div className="kc-summaryStep">Step {currentStep} of 4</div>
                </div>
            </div>

            <div className="kc-summaryBlock">
                <div className="kc-summaryLabel">Application</div>
                <div className="kc-summaryValue">{form.basics.name || "-"}</div>
            </div>

            <div className="kc-summaryBlock">
                <div className="kc-summaryLabel">Realm</div>
                <div className="kc-summaryValue">{realmLabel || "-"}</div>
            </div>

            <div className="kc-summaryBlock">
                <div className="kc-summaryLabel">Type</div>
                <div className="kc-summaryValue">{TYPE_LABELS[form.basics.applicationType]}</div>
            </div>

            <div className="kc-summaryBlock">
                <div className="kc-summaryLabel">Protocol</div>
                <div className="kc-summaryValue">{form.auth.protocol.toUpperCase()}</div>
            </div>

            <div className="kc-summaryBlock">
                <div className="kc-summaryLabel">Risk</div>
                <div className={`kc-statusPill is-${form.basics.criticality}`}>
                    {RISK_LABELS[form.basics.criticality]}
                </div>
            </div>

            <div className="kc-summaryChecklist">
                <div className="kc-summaryChecklistTitle">Checklist</div>
                {checklist.map((item) => (
                    <div key={item.label} className={`kc-summaryCheck ${item.ok ? "is-ok" : "is-pending"}`}>
                        {item.ok ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default ApplicationRegistrationSummaryCard;