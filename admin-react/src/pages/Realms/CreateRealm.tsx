import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Shield } from "lucide-react";

import { realmsApi } from "../../services/realmsApi";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import SearchableCombobox from "../../components/common/SearchableCombobox";

type RealmStatus = "Active" | "Inactive" | "Draft";

const INITIAL_FORM = {
    name: "",
    status: "Draft" as RealmStatus,
    mfaRequired: true,
    passwordInheritance: "inherit" as "inherit" | "override",
    sessionTimeoutMins: 30,
};

const LEAVE_MESSAGE = "Are you sure you want to leave? Your realm changes will not be saved.";

export default function CreateRealmPage(): React.ReactElement {
    const navigate = useNavigate();

    const [form, setForm] = useState(INITIAL_FORM);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(INITIAL_FORM), [form]);
    const { allowNextNavigation } = useUnsavedChangesGuard({
        when: isDirty,
        message: LEAVE_MESSAGE,
    });

    const sessionTimeoutError =
        Number.isNaN(form.sessionTimeoutMins) || form.sessionTimeoutMins < 5 || form.sessionTimeoutMins > 240
            ? "Session timeout must be between 5 and 240 minutes."
            : null;
    const canSubmit = useMemo(
        () => form.name.trim().length > 0 && !saving && !sessionTimeoutError,
        [form.name, saving, sessionTimeoutError]
    );

    const onCancel = () => navigate("/realms");

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const name = form.name.trim();
        if (!name) return setError("Realm name is required");
        if (sessionTimeoutError) return setError(sessionTimeoutError);

        try {
            setSaving(true);
            await realmsApi.create({
                name,
                status: form.status,
                mfaRequired: form.mfaRequired,
                passwordInheritance: form.passwordInheritance,
                sessionTimeoutMins: Number(form.sessionTimeoutMins) || 30,
            });
            allowNextNavigation();
            navigate("/realms?created=1");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create realm");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="createRealm-root">
            <div className="createRealm-header">
                <div className="createRealm-headerGroup">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="createRealm-backButton"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div>
                        <div className="createRealm-title">Create Realm</div>
                        <div className="createRealm-subtitle">Set basic lifecycle and security controls.</div>
                    </div>
                </div>
            </div>

            <form onSubmit={onSubmit} className="createRealm-formCard">
                <div className="createRealm-formGrid">
                    <div className="createRealm-field">
                        <div className="createRealm-label">Realm name</div>
                        <input
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Operations Realm"
                            className="createRealm-nameInput"
                        />
                        {error && <div className="createRealm-error">{error}</div>}
                    </div>

                    <div className="createRealm-metaGrid">
                        <div className="createRealm-field">
                            <div className="createRealm-label">Status</div>
                            <SearchableCombobox
                                value={form.status}
                                onChange={(next) => setForm((p) => ({ ...p, status: next as RealmStatus }))}
                                options={[
                                    { value: "Draft", label: "Draft" },
                                    { value: "Active", label: "Active" },
                                    { value: "Inactive", label: "Inactive" },
                                ]}
                                placeholder="Select status"
                            />
                        </div>

                        <div className="createRealm-field">
                            <div className="createRealm-label">Password policy</div>
                            <SearchableCombobox
                                value={form.passwordInheritance}
                                onChange={(next) => setForm((p) => ({ ...p, passwordInheritance: next as "inherit" | "override" }))}
                                options={[
                                    { value: "inherit", label: "Inherit from global policy" },
                                    { value: "override", label: "Override for this realm" },
                                ]}
                                placeholder="Select password policy"
                            />
                        </div>

                        <div className="createRealm-field">
                            <div className="createRealm-label">Session timeout (mins)</div>
                            <input
                                className="kc-input"
                                type="number"
                                min={5}
                                max={240}
                                value={form.sessionTimeoutMins}
                                onChange={(e) => setForm((p) => ({ ...p, sessionTimeoutMins: Number(e.target.value) }))}
                            />
                            <div className="createRealm-helpText">Recommended: 15-60 mins.</div>
                            {sessionTimeoutError && <div className="createRealm-error">{sessionTimeoutError}</div>}
                        </div>
                    </div>

                    <div className="createRealm-mfaCard">
                        <div>
                            <div className="createRealm-mfaTitle">
                                <Shield size={16} /> Require MFA
                            </div>
                            <div className="createRealm-helpText">
                                Enforce MFA for users accessing apps in this realm.
                            </div>
                        </div>

                        <input
                            type="checkbox"
                            checked={form.mfaRequired}
                            onChange={(e) => setForm((p) => ({ ...p, mfaRequired: e.target.checked }))}
                            className="createRealm-checkbox"
                        />
                    </div>

                    <div className="createRealm-actions">
                        <button type="button" className="kc-btn kc-btn-ghost" onClick={onCancel} disabled={saving}>
                            Cancel
                        </button>
                        <button type="submit" className="kc-btn kc-btn-primary" disabled={!canSubmit}>
                            <Plus size={16} /> {saving ? "Creating..." : "Create Realm"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}