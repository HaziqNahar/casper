import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Mail, Save, Shield, User, X } from "lucide-react";

import { useToast } from "../../context/ToastContext";
import { usersApi, type AdminUserDto, type CreateAdminUserRequest } from "../../services/usersApi";
import type { UserTypeRow } from "./usersPageTypes";
import SearchableCombobox from "../../components/common/SearchableCombobox";
import "../../styles/component.css";

type FormState = CreateAdminUserRequest & { phone?: string };
type FormErrors = Partial<Record<keyof FormState, string>>;

interface CreateUserPanelProps {
  onCancel?: () => void;
  onSave?: (user: AdminUserDto) => void;
  onDirtyChange?: (dirty: boolean) => void;
  userTypes: UserTypeRow[];
}

const emptyForm = (): FormState => ({
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  department: "",
  userType: "",
});

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const CreateUserPanel: React.FC<CreateUserPanelProps> = ({ onCancel, onSave, onDirtyChange, userTypes }) => {
  const { pushToast } = useToast();
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const isDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(emptyForm()), [formData]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const selectedUserType = useMemo(
    () => userTypes.find((candidate) => candidate.title === formData.userType) ?? null,
    [formData.userType, userTypes]
  );

  const updateField = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError(null);
  };

  const validate = () => {
    const next: FormErrors = {};
    if (!formData.firstName.trim()) next.firstName = "First name is required.";
    else if (!NAME_PATTERN.test(formData.firstName.trim())) next.firstName = "First name contains invalid characters.";
    if (!formData.lastName.trim()) next.lastName = "Last name is required.";
    else if (!NAME_PATTERN.test(formData.lastName.trim())) next.lastName = "Last name contains invalid characters.";
    if (!formData.username.trim()) next.username = "Username is required.";
    else if (!USERNAME_PATTERN.test(formData.username.trim())) next.username = "Username can only contain letters, numbers, dots, underscores, and hyphens.";
    if (!formData.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(formData.email.trim())) next.email = "Enter a valid email address.";
    if (!(formData.userType ?? "").trim()) next.userType = "Select a user type.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);

    try {
      const result = await usersApi.create({
        username: formData.username.trim(),
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        department: formData.department?.trim() || undefined,
        userType: (formData.userType ?? "").trim(),
      });
      pushToast("User created successfully", "success");
      setFormData(emptyForm());
      onSave?.(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field: keyof FormState) =>
    fieldErrors[field] ? (
      <div className="createUser-fieldError">
        <AlertCircle size={14} />
        {fieldErrors[field]}
      </div>
    ) : null;

  return (
    <div className="createUser-root kc-pageShell">
      <div className="createUser-header">
        <div className="createUser-headerMeta">
          <p className="createUser-headerNote">Complete the user identity, contact, and access details below.</p>
        </div>
        <div className="createUser-actionsTop">
          {onCancel && <button type="button" className="kc-btn kc-btn-ghost" onClick={onCancel} disabled={saving}><X size={16} />Cancel</button>}
          <button type="button" className="kc-btn kc-btn-primary" onClick={submit} disabled={saving}><Save size={16} />{saving ? "Creating..." : "Create user"}</button>
        </div>
      </div>

      {error && <div className="createUser-errorBanner">{error}</div>}

      <div className="createUser-grid">
        <section className="createUser-card">
          <h3 className="createUser-cardTitle"><User size={16} />Identity</h3>
          <div className="createUser-fieldGrid">
            <div className="createUser-field">
              <label className="kc-input-label">First name</label>
              <input className={`kc-input${fieldErrors.firstName ? " is-error" : ""}`} value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder="John" />
              {fieldError("firstName")}
            </div>
            <div className="createUser-field">
              <label className="kc-input-label">Last name</label>
              <input className={fieldErrors.lastName ? "kc-input is-error" : "kc-input"} value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder="Doe" />
              {fieldError("lastName")}
            </div>
            <div className="createUser-field createUser-fieldWide">
              <label className="kc-input-label">Username</label>
              <input className={fieldErrors.username ? "kc-input is-error" : "kc-input"} value={formData.username} onChange={(e) => updateField("username", e.target.value)} placeholder={selectedUserType?.username || "john.doe"} />
              {fieldError("username")}
            </div>
          </div>
        </section>

        <section className="createUser-card">
          <h3 className="createUser-cardTitle"><Mail size={16} />Contact</h3>
          <div className="createUser-fieldGrid">
            <div className="createUser-field createUser-fieldWide">
              <label className="kc-input-label">Email</label>
              <input className={fieldErrors.email ? "kc-input is-error" : "kc-input"} value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="john.doe@company.com" />
              {fieldError("email")}
            </div>
            <div className="createUser-field">
              <label className="kc-input-label">Phone</label>
              <input className="kc-input" value={formData.phone || ""} onChange={(e) => updateField("phone", e.target.value)} placeholder="+65 9123 4567" />
            </div>
            <div className="createUser-field">
              <label className="kc-input-label">Department</label>
              <input className="kc-input" value={formData.department || ""} onChange={(e) => updateField("department", e.target.value)} placeholder="Operations" />
            </div>
          </div>
        </section>

        <section className="createUser-card createUser-cardWide">
          <h3 className="createUser-cardTitle"><Shield size={16} />Access Profile</h3>
          <div className="createUser-field">
            <label className="kc-input-label">User type</label>
            <SearchableCombobox
              value={formData.userType ?? ""}
              onChange={(next) => updateField("userType", next)}
              options={[
                { value: "", label: "Select a user type" },
                ...userTypes.map((userType) => ({ value: userType.title, label: userType.title })),
              ]}
              placeholder="Select a user type"
              inputClassName={fieldErrors.userType ? "kc-select is-error" : "kc-select"}
            />
            {fieldError("userType")}
          </div>
          <div className="createUser-summaryCard">
            <div className="createUser-summaryTitle">{selectedUserType?.title || "Choose a user type"}</div>
            <p className="createUser-summaryText">{selectedUserType?.desc || "The selected user type description will appear here."}</p>
          </div>
        </section>
      </div>
    </div>
  );
};
export default CreateUserPanel;