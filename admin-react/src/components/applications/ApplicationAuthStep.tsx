import React from "react";
import MultiValueInput from "./MultiValueInput";
import type { RegisterApplicationForm } from "../../types/applicationRegistration.types";
import SearchableCombobox from "../common/SearchableCombobox";

interface Props {
    value: RegisterApplicationForm["auth"];
    appType: RegisterApplicationForm["basics"]["applicationType"];
    onChange: (next: RegisterApplicationForm["auth"]) => void;
}

const oidcGrantTypes = [
    "authorization_code",
    "refresh_token",
    "client_credentials",
    "device_code",
    "implicit"
];

const ApplicationAuthStep: React.FC<Props> = ({ value, appType, onChange }) => {
    const setField = <K extends keyof RegisterApplicationForm["auth"]>(
        key: K,
        fieldValue: RegisterApplicationForm["auth"][K]
    ) => {
        onChange({ ...value, [key]: fieldValue });
    };

    const toggleGrantType = (grantType: string) => {
        const exists = value.grantTypes.includes(grantType);
        setField(
            "grantTypes",
            exists
                ? value.grantTypes.filter((g) => g !== grantType)
                : [...value.grantTypes, grantType]
        );
    };

    const generateSecret = () => {
        const secret = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        setField("clientSecret", secret);
    };

    return (
        <div className="kc-formSection">
            <div className="kc-sectionHeader">
                <h3>Authentication Setup</h3>
                <p>Configure protocol, client details, grants, and redirect endpoints.</p>
            </div>

            <div className="kc-formGrid kc-formGrid-2">
                <div className="kc-formField">
                    <label className="kc-label">Protocol *</label>
                    <SearchableCombobox
                        value={value.protocol}
                        onChange={(next) => setField("protocol", next as RegisterApplicationForm["auth"]["protocol"])}
                        options={[
                            { value: "oidc", label: "OIDC" },
                            { value: "saml", label: "SAML" },
                        ]}
                        placeholder="Select protocol"
                        inputClassName="kc-select"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Client ID *</label>
                    <input
                        className="kc-input"
                        value={value.clientId}
                        onChange={(e) => setField("clientId", e.target.value)}
                        placeholder="ops-web"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Client Type *</label>
                    <SearchableCombobox
                        value={value.clientType}
                        onChange={(next) => setField("clientType", next as RegisterApplicationForm["auth"]["clientType"])}
                        options={[
                            { value: "confidential", label: "Confidential" },
                            { value: "public", label: "Public" },
                        ]}
                        placeholder="Select client type"
                        inputClassName="kc-select"
                    />
                </div>

                {value.clientType === "confidential" && (
                    <div className="kc-formField">
                        <label className="kc-label">Client Secret</label>
                        <div className="kc-inlineField">
                            <input
                                className="kc-input"
                                value={value.clientSecret}
                                readOnly
                                placeholder="Generate secret"
                            />
                            <button type="button" className="kc-btn kc-btn-secondary" onClick={generateSecret}>
                                {value.clientSecret ? "Regenerate" : "Generate"}
                            </button>
                        </div>
                    </div>
                )}

                {value.protocol === "oidc" && (
                    <div className="kc-formField kc-formField-full">
                        <label className="kc-label">Grant Types</label>
                        <div className="kc-checkboxGrid">
                            {oidcGrantTypes.map((grantType) => (
                                <label key={grantType} className="kc-checkboxItem">
                                    <input
                                        type="checkbox"
                                        checked={value.grantTypes.includes(grantType)}
                                        onChange={() => toggleGrantType(grantType)}
                                    />
                                    <span>{grantType}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {appType !== "backend" && appType !== "m2m" && (
                    <>
                        <div className="kc-formField kc-formField-full">
                            <MultiValueInput
                                label="Redirect URIs *"
                                placeholder="https://ops.company.sg/callback"
                                values={value.redirectUris}
                                onChange={(vals) => setField("redirectUris", vals)}
                            />
                        </div>

                        <div className="kc-formField kc-formField-full">
                            <MultiValueInput
                                label="Post Logout Redirect URIs"
                                placeholder="https://ops.company.sg/logout"
                                values={value.postLogoutRedirectUris}
                                onChange={(vals) => setField("postLogoutRedirectUris", vals)}
                            />
                        </div>

                        <div className="kc-formField kc-formField-full">
                            <MultiValueInput
                                label="Web Origins"
                                placeholder="https://ops.company.sg"
                                values={value.webOrigins}
                                onChange={(vals) => setField("webOrigins", vals)}
                            />
                        </div>
                    </>
                )}

                <div className="kc-formField">
                    <label className="kc-label">Base URL</label>
                    <input
                        className="kc-input"
                        value={value.baseUrl}
                        onChange={(e) => setField("baseUrl", e.target.value)}
                        placeholder="https://ops.company.sg/app"
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Admin URL</label>
                    <input
                        className="kc-input"
                        value={value.adminUrl}
                        onChange={(e) => setField("adminUrl", e.target.value)}
                        placeholder="https://ops.company.sg/admin"
                    />
                </div>
            </div>
        </div>
    );
};

export default ApplicationAuthStep;