import { AlertCircle, Plus, X } from "lucide-react";
import SearchableCombobox from "../../components/common/SearchableCombobox";

type RealmRole = {
    id: string;
    name: string;
};

type UserPanelMode = "closed" | "create-local-user";

type CreateLocalUserForm = {
    username: string;
    staffId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    organization: string;
    department: string;
    staffType: string;
    group: string;
    roleId: string;
    status: string;
    justification: string;
};

type RealmLocalUserDrawerProps = {
    open: boolean;
    realmName: string;
    userPanelMode: UserPanelMode;
    formError: string | null;
    submitting: boolean;
    errors: Partial<Record<keyof CreateLocalUserForm, string>>;
    form: CreateLocalUserForm;
    roles: RealmRole[];
    onClose: () => void;
    onOpenPanel: (mode: Exclude<UserPanelMode, "closed">) => void;
    onFieldChange: (field: keyof CreateLocalUserForm, value: string) => void;
    onClear: () => void;
    onSubmit: () => void;
};

const RealmLocalUserDrawer = ({
    open,
    realmName,
    userPanelMode,
    formError,
    submitting,
    errors,
    form,
    roles,
    onClose,
    onOpenPanel,
    onFieldChange,
    onClear,
    onSubmit,
}: RealmLocalUserDrawerProps) => {
    if (!open) return null;

    return (
        <div
            className="kcDrawerOverlay"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <aside
                className="kcDrawer"
                role="dialog"
                aria-modal="true"
                aria-label="Create local user drawer"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="kcDrawerHeader">
                    <div>
                        <div className="kcDrawerTitle">Create local user</div>
                        <div className="kcDrawerSubtitle">
                            Local users belong to <b>{realmName}</b> only.
                        </div>
                    </div>

                    <button className="kc-btn kc-btn-ghost" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>

                <div className="kcDrawerSwitch" role="tablist" aria-label="User actions">
                    <button
                        type="button"
                        className={`kcDrawerTab ${userPanelMode === "create-local-user" ? "is-active" : ""}`}
                        onClick={() => onOpenPanel("create-local-user")}
                        disabled={submitting}
                        role="tab"
                        aria-selected={userPanelMode === "create-local-user"}
                    >
                        Create local User
                    </button>
                </div>

                <div className="kcDrawerBody">
                    {userPanelMode === "create-local-user" && (
                        <>
                            {formError && (
                                <div className="realmLocalUserDrawer-formError">
                                    {formError}
                                </div>
                            )}

                            <div className="kcDrawerFormGrid">
                                <div>
                                    <div className="kcDrawerSectionTitle">Basic Information</div>
                                    <div className="kcDrawerSectionGrid">
                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Username <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.username}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("username", event.target.value)}
                                                placeholder="SG999999"
                                                className={inputClassName(errors.username)}
                                            />
                                            {errors.username && <FieldError message={errors.username} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Staff Id <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.staffId}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("staffId", event.target.value)}
                                                placeholder="999999"
                                                className={inputClassName(errors.staffId)}
                                            />
                                            {errors.staffId && <FieldError message={errors.staffId} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                First Name <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.firstName}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("firstName", event.target.value)}
                                                placeholder="Ming Lan"
                                                className={inputClassName(errors.firstName)}
                                            />
                                            {errors.firstName && <FieldError message={errors.firstName} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Last Name <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.lastName}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("lastName", event.target.value)}
                                                placeholder="Tan"
                                                className={inputClassName(errors.lastName)}
                                            />
                                            {errors.lastName && <FieldError message={errors.lastName} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Email <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={form.email}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("email", event.target.value)}
                                                placeholder="user@company.com"
                                                className={inputClassName(errors.email)}
                                            />
                                            {errors.email && <FieldError message={errors.email} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Phone <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.phone}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("phone", event.target.value)}
                                                placeholder="+65 9123 4567"
                                                className={inputClassName(errors.phone)}
                                            />
                                            {errors.phone && <FieldError message={errors.phone} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Organization <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.organization}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("organization", event.target.value)}
                                                placeholder="Certis"
                                                className={inputClassName(errors.organization)}
                                            />
                                            {errors.organization && <FieldError message={errors.organization} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Department <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.department}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("department", event.target.value)}
                                                placeholder="Operations"
                                                className={inputClassName(errors.department)}
                                            />
                                            {errors.department && <FieldError message={errors.department} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Staff Type <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.staffType}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("staffType", event.target.value)}
                                                placeholder="Full-time"
                                                className={inputClassName(errors.staffType)}
                                            />
                                            {errors.staffType && <FieldError message={errors.staffType} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Group <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.group}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("group", event.target.value)}
                                                placeholder="Ops SG"
                                                className={inputClassName(errors.group)}
                                            />
                                            {errors.group && <FieldError message={errors.group} />}
                                        </div>

                                        <div>
                                            <label className="realmLocalUserDrawer-label">
                                                Requested Role <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <SearchableCombobox
                                                value={form.roleId}
                                                disabled={submitting}
                                                onChange={(next) => onFieldChange("roleId", next)}
                                                options={[
                                                    { value: "", label: "Select requested role" },
                                                    ...roles.map((role) => ({ value: role.id, label: role.name })),
                                                ]}
                                                placeholder="Select requested role"
                                                inputClassName={inputClassName(errors.roleId)}
                                            />

                                            {errors.roleId && <FieldError message={errors.roleId} />}

                                            <div className="realmLocalUserDrawer-helpText">
                                                This role will be submitted in the next step for approval.
                                            </div>
                                        </div>

                                        <div className="realmLocalUserDrawer-fieldWide">
                                            <label className="realmLocalUserDrawer-label">
                                                Justification <span className="realmLocalUserDrawer-required">*</span>
                                            </label>
                                            <textarea
                                                value={form.justification}
                                                disabled={submitting}
                                                onChange={(event) => onFieldChange("justification", event.target.value)}
                                                placeholder="Explain why this user needs realm access..."
                                                rows={3}
                                                className={`${inputClassName(errors.justification)} realmLocalUserDrawer-textarea`}
                                            />

                                            {errors.justification && <FieldError message={errors.justification} />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="realmLocalUserDrawer-nextStep">
                                <div className="realmLocalUserDrawer-nextStepTitle">
                                    Next step
                                </div>
                                <div className="realmLocalUserDrawer-nextStepText">
                                    This creates the local user in <b>{realmName}</b>. Realm access will be requested in the next step and routed through approval.
                                </div>
                            </div>
                            <div className="realmLocalUserDrawer-actions">
                                <button type="button" className="kc-btn kc-btn-ghost" onClick={onClear} disabled={submitting}>
                                    Clear
                                </button>

                                <button type="button" className="kc-btn kc-btn-primary" onClick={onSubmit} disabled={submitting}>
                                    <Plus size={16} /> {submitting ? "Creating..." : "Create user & request access"}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="kcDrawerFooter">
                    <button type="button" className="kc-btn kc-btn-ghost" onClick={onClose} disabled={submitting}>
                        <X size={16} /> Close
                    </button>
                </div>
            </aside>
        </div>
    );
};

const inputClassName = (error?: string) => `kc-input${error ? " is-error" : ""}`;

const FieldError = ({ message }: { message: string }) => (
    <div className="realmLocalUserDrawer-fieldError">
        <AlertCircle size={12} />
        {message}
    </div>
);

export default RealmLocalUserDrawer;