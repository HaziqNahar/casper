import { X } from "lucide-react";
import SearchableCombobox from "../../components/common/SearchableCombobox";

type RealmStatus = "Active" | "Inactive" | "Draft";

type RealmManageDraft = {
    status: RealmStatus;
    mfaRequired: boolean;
    passwordInheritance: "inherit" | "override";
    sessionTimeoutMins: number;
};

type RealmManageDialogProps = {
    realmName: string;
    open: boolean;
    draft: RealmManageDraft;
    isDirty: boolean;
    isActive: boolean;
    saving: boolean;
    error: string | null;
    onClose: () => void;
    onDraftChange: React.Dispatch<React.SetStateAction<RealmManageDraft>>;
    onToggleStatus: () => void;
    onSave: () => void;
};

const RealmManageDialog = ({
    realmName,
    open,
    draft,
    isDirty,
    isActive,
    saving,
    error,
    onClose,
    onDraftChange,
    onToggleStatus,
    onSave,
}: RealmManageDialogProps) => {
    if (!open) return null;

    return (
        <div
            className="kc-confirmOverlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="kc-confirmModal kc-manageModal">
                <div className="kc-confirmHeader kc-dialogHeaderRow">
                    <div>
                        <div className="kc-confirmTitle">Manage Realm</div>
                        <div className="kc-dialogSubtitle">
                            {realmName} Security controls and lifecycle settings
                        </div>
                    </div>

                    <button className="kc-btn kc-btn-ghost kc-dialogClose" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className="kc-confirmBody kc-dialogBody">
                    {error && (
                        <div className="kc-formError">
                            {error}
                        </div>
                    )}

                    <div className="kc-formStack">
                        <div className="kc-fieldLabel">Realm Status</div>
                        <SearchableCombobox
                            value={draft.status}
                            disabled={saving}
                            onChange={(next) =>
                                onDraftChange((current) => ({ ...current, status: next as RealmStatus }))
                            }
                            options={[
                                { value: "Active", label: "Active" },
                                { value: "Draft", label: "Draft" },
                                { value: "Inactive", label: "Inactive" },
                            ]}
                            placeholder="Select realm status"
                        />
                    </div>

                    <div className="kc-toggleSetting">
                        <div>
                            <div className="kc-fieldLabel">Require MFA</div>
                            <div className="kc-fieldHelp">
                                Enforce MFA for users accessing applications in this realm.
                            </div>
                        </div>

                        <input
                            type="checkbox"
                            checked={draft.mfaRequired}
                            disabled={saving}
                            onChange={(event) =>
                                onDraftChange((current) => ({ ...current, mfaRequired: event.target.checked }))
                            }
                            className="kc-checkbox"
                        />
                    </div>

                    <div className="kc-formStack">
                        <div className="kc-fieldLabel">Password Policy</div>
                        <SearchableCombobox
                            value={draft.passwordInheritance}
                            disabled={saving}
                            onChange={(next) =>
                                onDraftChange((current) => ({
                                    ...current,
                                    passwordInheritance: next as "inherit" | "override",
                                }))
                            }
                            options={[
                                { value: "inherit", label: "Inherit from global policy" },
                                { value: "override", label: "Override for this realm" },
                            ]}
                            placeholder="Select password policy"
                        />
                    </div>

                    <div className="kc-formStack">
                        <div className="kc-fieldLabel">Session Timeout (minutes)</div>
                        <input
                            className="kc-input"
                            type="number"
                            min={5}
                            max={240}
                            value={draft.sessionTimeoutMins}
                            disabled={saving}
                            onChange={(event) =>
                                onDraftChange((current) => ({
                                    ...current,
                                    sessionTimeoutMins: Number(event.target.value),
                                }))
                            }
                        />
                        <div className="kc-fieldHelp">
                            Recommended: 15-60 minutes.
                        </div>
                    </div>

                    <div className="kc-dialogDivider" />

                    <div className="kc-formStack">
                        <div className="kc-dangerTitle">Danger Zone</div>
                        <button
                            className={`kc-btn ${isActive ? "kc-btn-danger" : "kc-btn-primary"}`}
                            onClick={onToggleStatus}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : isActive ? "Deactivate Realm" : "Activate Realm"}
                        </button>
                    </div>
                </div>

                <div className="kc-confirmFooter kc-dialogFooterSplit">
                    <button className="kc-btn kc-btn-ghost" onClick={onClose} disabled={saving}>
                        Cancel
                    </button>

                    <button className="kc-btn kc-btn-primary" disabled={!isDirty || saving} onClick={onSave}>
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RealmManageDialog;