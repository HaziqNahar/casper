import React from "react";
import MultiValueInput from "./MultiValueInput";
import type { RegisterApplicationForm } from "../../types/applicationRegistration.types";

interface Props {
    value: RegisterApplicationForm["security"];
    onChange: (next: RegisterApplicationForm["security"]) => void;
}

const roleOptions = ["realm_user", "realm_manager", "realm_admin"];
const userTypeOptions = [
    "Certis Full User",
    "Certis Contractor",
    "Certis Half User",
    "External Users",
    "Local User"
];
const realmOptions = ["operations", "finance", "sandbox"];
const defaultScopeOptions = ["openid", "profile", "email"];
const optionalScopeOptions = ["phone", "groups", "roles"];

const ApplicationSecurityStep: React.FC<Props> = ({ value, onChange }) => {
    const setField = <K extends keyof RegisterApplicationForm["security"]>(
        key: K,
        fieldValue: RegisterApplicationForm["security"][K]
    ) => {
        onChange({ ...value, [key]: fieldValue });
    };

    const toggleMulti = (key: keyof Pick<RegisterApplicationForm["security"], "allowedRoles" | "allowedUserTypes" | "allowedRealms" | "scopesDefault" | "scopesOptional">, item: string) => {
        const current = value[key] as string[];
        setField(
            key,
            current.includes(item)
                ? current.filter((x) => x !== item)
                : [...current, item]
        );
    };

    return (
        <div className="kc-formSection">
            <div className="kc-sectionHeader">
                <h3>Security & Access Control</h3>
                <p>Define client hardening, token policy, role access, and scope boundaries.</p>
            </div>

            <div className="kc-formGrid kc-formGrid-2">
                <div className="kc-formField">
                    <label className="kc-label">Require PKCE</label>
                    <input
                        type="checkbox"
                        checked={value.requirePkce}
                        onChange={(e) => setField("requirePkce", e.target.checked)}
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Require MFA</label>
                    <input
                        type="checkbox"
                        checked={value.requireMfa}
                        onChange={(e) => setField("requireMfa", e.target.checked)}
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Allow Refresh Tokens</label>
                    <input
                        type="checkbox"
                        checked={value.allowRefreshToken}
                        onChange={(e) => setField("allowRefreshToken", e.target.checked)}
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Allow Wildcard Redirect URIs</label>
                    <input
                        type="checkbox"
                        checked={value.allowWildcardRedirects}
                        onChange={(e) => setField("allowWildcardRedirects", e.target.checked)}
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Access Token Lifetime (mins)</label>
                    <input
                        className="kc-input"
                        type="number"
                        min={1}
                        value={value.accessTokenMinutes}
                        onChange={(e) => setField("accessTokenMinutes", Number(e.target.value))}
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Refresh Token Lifetime (hours)</label>
                    <input
                        className="kc-input"
                        type="number"
                        min={1}
                        value={value.refreshTokenHours}
                        onChange={(e) => setField("refreshTokenHours", Number(e.target.value))}
                    />
                </div>

                <div className="kc-formField">
                    <label className="kc-label">Session Timeout (mins)</label>
                    <input
                        className="kc-input"
                        type="number"
                        min={1}
                        value={value.sessionTimeoutMinutes}
                        onChange={(e) => setField("sessionTimeoutMinutes", Number(e.target.value))}
                    />
                </div>

                <div className="kc-formField kc-formField-full">
                    <label className="kc-label">Allowed Roles</label>
                    <div className="kc-checkboxGrid">
                        {roleOptions.map((role) => (
                            <label key={role} className="kc-checkboxItem">
                                <input
                                    type="checkbox"
                                    checked={value.allowedRoles.includes(role)}
                                    onChange={() => toggleMulti("allowedRoles", role)}
                                />
                                <span>{role}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="kc-formField kc-formField-full">
                    <label className="kc-label">Allowed User Types</label>
                    <div className="kc-checkboxGrid">
                        {userTypeOptions.map((type) => (
                            <label key={type} className="kc-checkboxItem">
                                <input
                                    type="checkbox"
                                    checked={value.allowedUserTypes.includes(type)}
                                    onChange={() => toggleMulti("allowedUserTypes", type)}
                                />
                                <span>{type}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="kc-formField kc-formField-full">
                    <label className="kc-label">Allowed Realms</label>
                    <div className="kc-checkboxGrid">
                        {realmOptions.map((realm) => (
                            <label key={realm} className="kc-checkboxItem">
                                <input
                                    type="checkbox"
                                    checked={value.allowedRealms.includes(realm)}
                                    onChange={() => toggleMulti("allowedRealms", realm)}
                                />
                                <span>{realm}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="kc-formField kc-formField-full">
                    <label className="kc-label">Default Scopes</label>
                    <div className="kc-checkboxGrid">
                        {defaultScopeOptions.map((scope) => (
                            <label key={scope} className="kc-checkboxItem">
                                <input
                                    type="checkbox"
                                    checked={value.scopesDefault.includes(scope)}
                                    onChange={() => toggleMulti("scopesDefault", scope)}
                                />
                                <span>{scope}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="kc-formField kc-formField-full">
                    <label className="kc-label">Optional Scopes</label>
                    <div className="kc-checkboxGrid">
                        {optionalScopeOptions.map((scope) => (
                            <label key={scope} className="kc-checkboxItem">
                                <input
                                    type="checkbox"
                                    checked={value.scopesOptional.includes(scope)}
                                    onChange={() => toggleMulti("scopesOptional", scope)}
                                />
                                <span>{scope}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="kc-formField kc-formField-full">
                    <MultiValueInput
                        label="Custom Scopes"
                        placeholder="app.admin"
                        values={value.customScopes}
                        onChange={(vals) => setField("customScopes", vals)}
                    />
                </div>
            </div>
        </div>
    );
};

export default ApplicationSecurityStep;