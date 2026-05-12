import React from "react";
import type { RegisterApplicationForm } from "../../types/applicationRegistration.types";
import SearchableCombobox from "../common/SearchableCombobox";

interface Props {
    value: RegisterApplicationForm["basics"];
    onChange: (next: RegisterApplicationForm["basics"]) => void;
    realmOptions: Array<{ value: string; label: string }>;
}

const ApplicationBasicsStep: React.FC<Props> = ({ value, onChange, realmOptions }) => {
    const setField = <K extends keyof RegisterApplicationForm["basics"]>(
        key: K,
        fieldValue: RegisterApplicationForm["basics"][K]
    ) => {
        onChange({ ...value, [key]: fieldValue });
    };

    return (
        <div className="kc-formSection">
            <div className="kc-sectionHeader">
                <h3>Application Basics</h3>
                <p>Capture ownership, realm placement, and application classification.</p>
            </div>

            <div className="kc-formGrid kc-formGrid-2">
                <div className="kc-formField">
                    <label className="kc-label">Application Name *</label>
                    <input
                        className="kc-input"
                        value={value.name}
                        onChange={(e) => setField("name", e.target.value)}
                        placeholder="Ops Web Portal"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Realm *</label>
                    <SearchableCombobox
                        value={value.realmId}
                        onChange={(next) => setField("realmId", next)}
                        options={[{ value: "", label: "Select realm" }, ...realmOptions]}
                        placeholder="Select realm"
                        inputClassName="kc-select"
                    />
                </div>

                <div className="kc-formField kc-formField-full">
                    <label className="kc-label">Description</label>
                    <textarea
                        className="kc-textarea"
                        rows={4}
                        value={value.description}
                        onChange={(e) => setField("description", e.target.value)}
                        placeholder="Operations dashboard for incidents, assets, and access workflows"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Application Type *</label>
                    <SearchableCombobox
                        value={value.applicationType}
                        onChange={(next) => setField("applicationType", next as RegisterApplicationForm["basics"]["applicationType"])}
                        options={[
                            { value: "web", label: "Web App" },
                            { value: "mobile", label: "Mobile App" },
                            { value: "spa", label: "SPA" },
                            { value: "backend", label: "Backend Service" },
                            { value: "m2m", label: "Machine-to-Machine" },
                        ]}
                        placeholder="Select application type"
                        inputClassName="kc-select"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Environment *</label>
                    <SearchableCombobox
                        value={value.environment}
                        onChange={(next) => setField("environment", next as RegisterApplicationForm["basics"]["environment"])}
                        options={[
                            { value: "dev", label: "Development" },
                            { value: "staging", label: "Staging" },
                            { value: "prod", label: "Production" },
                        ]}
                        placeholder="Select environment"
                        inputClassName="kc-select"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Owner Team *</label>
                    <input
                        className="kc-input"
                        value={value.ownerTeam}
                        onChange={(e) => setField("ownerTeam", e.target.value)}
                        placeholder="Operations IT"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Owner Email *</label>
                    <input
                        className="kc-input"
                        type="email"
                        value={value.ownerEmail}
                        onChange={(e) => setField("ownerEmail", e.target.value)}
                        placeholder="ops-team@company.sg"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Business Criticality</label>
                    <SearchableCombobox
                        value={value.criticality}
                        onChange={(next) => setField("criticality", next as RegisterApplicationForm["basics"]["criticality"])}
                        options={[
                            { value: "low", label: "Low" },
                            { value: "medium", label: "Medium" },
                            { value: "high", label: "High" },
                            { value: "critical", label: "Critical" },
                        ]}
                        placeholder="Select criticality"
                        inputClassName="kc-select"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Internet Facing</label>
                    <div className="kc-toggleRow">
                        <button
                            type="button"
                            className={`kc-toggleBtn ${value.internetFacing ? "is-active" : ""}`}
                            onClick={() => setField("internetFacing", true)}
                        >
                            Yes
                        </button>
                        <button
                            type="button"
                            className={`kc-toggleBtn ${!value.internetFacing ? "is-active" : ""}`}
                            onClick={() => setField("internetFacing", false)}
                        >
                            No
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationBasicsStep;