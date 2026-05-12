import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building, Calendar, Edit, Mail, Save, Shield, Trash2, User, X } from "lucide-react";
import { ROUTES } from "../../config/routes";
import { useToast } from "../../context/ToastContext";
import { usersApi, type UpdateAdminUserRequest, type UserAccessRealmDto } from "../../services/usersApi";
import { formatDateTime, getStatusIcon } from "./usersPageColumns";
import type { RealmRole, UserRow, UserTypeRow } from "./usersPageTypes";
import SearchableCombobox from "../../components/common/SearchableCombobox";
import "../../styles/users.detail.css";

interface UserDetailContentProps {
  user: UserRow;
  roles: RealmRole[];
  onBack?: () => void;
  approveUser: (id: string) => void;
  verifyUser: (id: string) => void;
  activateUser: (id: string) => void;
  rejectUser: (id: string, reason?: string) => void;
  onDelete: (id: string, reason: string) => Promise<void>;
  userTypes: UserTypeRow[];
  onSaveEdit: (id: string, payload: UpdateAdminUserRequest) => Promise<void>;
}

const UserDetailContent: React.FC<UserDetailContentProps> = ({
  user, roles,
  onBack, approveUser, verifyUser, activateUser, rejectUser, onSaveEdit, userTypes, onDelete,
}) => {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const stage = user.onboardingStage ?? (user.status === "Pending" ? "Requested" : undefined);
  const stageTone = stage === "Approved"
    ? { background: "#dbeafe", color: "#2563eb" }
    : stage === "Verified" || stage === "Activated"
      ? { background: "#dcfce7", color: "#16a34a" }
      : stage === "Rejected"
        ? { background: "#fee2e2", color: "#dc2626" }
        : { background: "#fef3c7", color: "#d97706" };
  const canApprove = user.status === "Pending" && stage === "Requested";
  const canVerify = user.status === "Pending" && stage === "Approved";
  const canActivate = user.status === "Pending" && stage === "Verified";
  const canReject = user.status === "Pending" && (stage === "Requested" || stage === "Approved" || stage === "Verified");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [accessRealms, setAccessRealms] = useState<UserAccessRealmDto[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ firstName: user.firstName, lastName: user.lastName, username: user.username, email: user.email, department: user.department ?? "", userType: user.userType });
  const isInactive = user.status === "Inactive";
  const hasRealmAccess = accessRealms.length > 0;
  const accessRequestLabel = hasRealmAccess ? "Request additional realm access" : "Request access to realm";
  const accessRequestTitle = hasRealmAccess
    ? "Request access to another realm or additional access via workflow"
    : "Request access via workflow";
  const emailHasError = saveError === "Enter a valid email address.";
  const showRequiredFieldErrors = saveError === "Complete all required fields.";
  const resetDraft = () => setDraft({ firstName: user.firstName, lastName: user.lastName, username: user.username, email: user.email, department: user.department ?? "", userType: user.userType });
  const handleEditClick = () => { resetDraft(); setSaveError(null); setIsEditing(true); };
  const handleCancelEdit = () => { resetDraft(); setSaveError(null); setIsEditing(false); };
  const hasUnsavedChanges = draft.firstName.trim() !== user.firstName || draft.lastName.trim() !== user.lastName || draft.username.trim() !== user.username || draft.email.trim() !== user.email || draft.department.trim() !== (user.department ?? "") || draft.userType.trim() !== user.userType;
  const requiredFieldErrors = { firstName: !draft.firstName.trim(), lastName: !draft.lastName.trim(), username: !draft.username.trim(), userType: !draft.userType.trim() };
  const hasRequiredFieldErrors = Object.values(requiredFieldErrors).some(Boolean);
  const handleSaveEdit = async () => {
    const payload = { firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), username: draft.username.trim(), email: draft.email.trim(), department: draft.department.trim(), userType: draft.userType.trim() };
    if (!hasUnsavedChanges) { pushToast("No changes detected", "info"); setIsEditing(false); return; }
    if (hasRequiredFieldErrors) { setSaveError("Complete all required fields."); return; }
    if (!/^.+@.+\..+$/.test(payload.email)) { setSaveError("Enter a valid email address."); return; }
    try { setIsSaving(true); await onSaveEdit(user.id, payload); setIsEditing(false); } finally { setIsSaving(false); }
  };
  const handleDeleteClick = () => { setDeleteError(null); setDeleteReason(""); setShowDeleteModal(true); };
  const detailCardClassName = isEditing ? "user-detailCard is-editing" : "user-detailCard";
  const detailLabelClassName = isEditing ? "user-detailLabel is-editing" : "user-detailLabel";
  const inputClassName = (hasError = false) => `user-detailInput${hasError ? " is-error" : ""}`;

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        setAccessLoading(true);
        setAccessError(null);
        const response = await usersApi.getAccess(user.id);
        if (!cancelled) {
          setAccessRealms(response.realms ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setAccessRealms([]);
          setAccessError(error instanceof Error ? error.message : "Failed to load realm access.");
        }
      } finally {
        if (!cancelled) {
          setAccessLoading(false);
        }
      }
    };

    void loadAccess();

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  return (
    <div className="user-detail">
      <div className="user-detailHeader">
        <div className="user-detailHeaderIntro">
          {onBack && <button onClick={onBack} className="user-detailBackButton"><ArrowLeft size={16} />Back</button>}
          <div>
            <h2 className="user-detailTitle">{user.firstName} {user.lastName}</h2>
            <p className="user-detailSubtitle">@{user.username}</p>
          </div>
        </div>
        <div className="user-detailActions">
          {canApprove && <button className="btn btn-primary" onClick={() => approveUser?.(user.id)}>Approve</button>}
          {canVerify && <button className="btn btn-primary" onClick={() => verifyUser?.(user.id)}>Verify</button>}
          {canActivate && <button className="btn btn-success" onClick={() => activateUser?.(user.id)}>Activate</button>}
          {canReject && <button className="btn btn-danger" onClick={() => rejectUser?.(user.id)}>Reject</button>}
          <button className={`btn btn-primary${isEditing && !hasUnsavedChanges ? " is-idle" : ""}`} onClick={() => { void (isEditing ? handleSaveEdit() : Promise.resolve(handleEditClick())); }} disabled={isSaving || isDeleting || (isEditing && !hasUnsavedChanges)}>{isEditing ? <Save size={16} /> : <Edit size={16} />}{isSaving ? "Saving..." : isEditing ? "Save" : "Edit"}</button>
          <button className={isEditing ? "btn btn-secondary" : "btn btn-danger"} onClick={() => { if (isEditing) { handleCancelEdit(); return; } void handleDeleteClick(); }} disabled={isSaving || isDeleting}>{isEditing ? <X size={16} /> : <Trash2 size={16} />}{isEditing ? "Cancel" : isDeleting ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
      <div className="user-detailBadges">
        <span className="user-detailBadge" style={{ background: user.status === "Active" ? "#dcfce7" : user.status === "Pending" ? "#fef3c7" : "#fee2e2", color: user.status === "Active" ? "#16a34a" : user.status === "Pending" ? "#d97706" : "#dc2626" }}>{getStatusIcon(user.status)}{user.status}</span>
        <span className="user-detailBadge" style={{ background: "#dbeafe", color: "#2563eb" }}>{user.role}</span>
      </div>
      {saveError && <div className="user-detailBanner is-error">{saveError}</div>}
      {isEditing && <div className="user-detailBanner is-info"><span>Editing user details. Required fields are marked with *.</span><span className="user-detailBannerStrong">Save stays disabled until a change is made.</span></div>}
      <div className="user-detailGrid">
        <div className={detailCardClassName}>
          <h3 className="user-detailCardTitle"><User size={16} />Personal Information</h3>
          <div className="user-detailStack">
            <div className="user-detailTwoCol">
              <div><label className={detailLabelClassName}>First Name{isEditing ? " *" : ""}</label>{isEditing ? <input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} className={inputClassName(showRequiredFieldErrors && requiredFieldErrors.firstName)} /> : <p className="user-detailValue">{user.firstName}</p>}</div>
              <div><label className={detailLabelClassName}>Last Name{isEditing ? " *" : ""}</label>{isEditing ? <input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} className={inputClassName(showRequiredFieldErrors && requiredFieldErrors.lastName)} /> : <p className="user-detailValue">{user.lastName}</p>}</div>
            </div>
            <div><label className={detailLabelClassName}>Username{isEditing ? " *" : ""}</label>{isEditing ? <input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className={inputClassName(showRequiredFieldErrors && requiredFieldErrors.username)} /> : <p className="user-detailValue">{user.username}</p>}</div>
            <div><label className="user-detailLabel">Staff ID</label><p className="user-detailValue">000001</p></div>
          </div>
        </div>
        <div className={detailCardClassName}>
          <h3 className="user-detailCardTitle"><Mail size={16} />Contact Information</h3>
          <div className="user-detailStack">
            <div><label className={detailLabelClassName}>Email{isEditing ? " *" : ""}</label>{isEditing ? <><input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={inputClassName(emailHasError)} />{emailHasError ? <div className="user-detailFieldError">{saveError}</div> : null}</> : <p className="user-detailValue">{user.email}</p>}</div>
          </div>
        </div>
        <div className={detailCardClassName}>
          <h3 className="user-detailCardTitle"><Building size={16} />Role & Department</h3>
          <div className="user-detailTwoCol">
            <div><label className="user-detailLabel">Role</label><p className="user-detailValue is-strong">{user.role}</p></div>
            <div><label className={detailLabelClassName}>{isEditing ? "User Type *" : "Department"}</label>{isEditing ? <SearchableCombobox value={draft.userType} onChange={(next) => setDraft({ ...draft, userType: next })} options={userTypes.map((userType) => ({ value: userType.title, label: userType.title }))} placeholder="Select a user type" inputClassName={`kc-input${showRequiredFieldErrors && requiredFieldErrors.userType ? " is-error" : ""}`} /> : <p className="user-detailValue">{user.department || "-"}</p>}</div>
          </div>
        </div>
        <div className="user-detailCard">
          <h3 className="user-detailCardTitle"><Calendar size={16} />Activity</h3>
          <div className="user-detailTwoCol"><div><label className="user-detailLabel">Last Login</label><p className="user-detailValue">{formatDateTime(user.lastLogin)}</p></div></div>
        </div>
        <div className="user-detailCard">
          <h3 className="user-detailCardTitle"><Shield size={16} />Onboarding</h3>
          <div className="user-detailStack">
            <div><label className="user-detailLabel">Current Stage</label><p className="user-detailValue">{stage ?? "-"}</p></div>
            {user.onboardingReason && <div><label className="user-detailLabel">Rejection Reason</label><p className="user-detailValue" style={{ color: "#991b1b" }}>{user.onboardingReason}</p></div>}
            <div className="user-detailInlineRow"><span className="user-detailBadge" style={stageTone}>{stage ?? "-"}</span></div>
          </div>
        </div>
        {!isInactive && <div className="user-detailCard">
          <h3 className="user-detailCardTitle">Realm Access</h3>
          <div className="user-detailAlignEnd">
            {!accessLoading && (
              <button
                className="btn btn-primary"
                onClick={() => { navigate(ROUTES.REALM_ACCESS_REQUEST + "?targetUser=" + encodeURIComponent(user.username)); }}
                title={accessRequestTitle}
              >
                {accessRequestLabel}
              </button>
            )}
          </div>
          {accessLoading ? <p className="user-detailMuted">Loading realm access...</p> : accessError ? <p className="user-detailMuted is-error">{accessError}</p> : accessRealms.length === 0 ? <p className="user-detailMuted">No realm access assigned.</p> : <><p className="user-detailHelper">This user already has access below. Use the button only to request additional realm access.</p><div className="user-detailRealmList">{accessRealms.map((m) => { const accessibleApps = m.apps ?? []; return <div key={m.realmId} className="user-detailRealmCard"><div className="user-detailHeaderIntro"><div className="user-detailRealmName">{m.realmName}</div></div><div className="user-detailChipRow">{(m.roleIds ?? []).map((roleId) => { const role = roles.find((candidate) => candidate.id === roleId); return <span key={roleId} className="user-detailChip">{role?.name ?? roleId}</span>; })}</div><div style={{ marginTop: "0.75rem" }}><div className="user-detailLabel">Application Access</div>{accessibleApps.length === 0 ? <div className="user-detailMuted">No application access in this realm.</div> : <div className="user-detailChipRow">{accessibleApps.map((app) => <span key={app.appId} className={`user-detailChip ${app.status === "Enabled" ? "is-appEnabled" : "is-appDisabled"}`}>{app.name}</span>)}</div>}</div></div>; })}</div></>}
        </div>}
      </div>
      {showRejectModal && <div className="kc-modal-overlay"><div className="kc-modal"><div className="kc-modal-header"><h3>Reject User</h3></div><div className="kc-modal-body"><p className="user-detailModalText">Please provide a reason for rejecting this user.</p><textarea value={rejectReason} onChange={(e) => { setRejectReason(e.target.value); if (rejectError) setRejectError(null); }} placeholder="Enter rejection reason..." rows={4} className="user-detailTextarea" />{rejectError && <div className="user-detailFieldError">{rejectError}</div>}</div><div className="kc-modal-footer"><button className="btn btn-secondary" onClick={() => { setShowRejectModal(false); setRejectReason(""); setRejectError(null); }}>Cancel</button><button className="btn btn-danger" onClick={() => { if (!rejectReason.trim()) { setRejectError("Rejection reason is required."); return; } rejectUser(user.id, rejectReason.trim()); setShowRejectModal(false); setRejectReason(""); setRejectError(null); }}>Confirm Reject</button></div></div></div>}
      {showDeleteModal && <div className="kc-modal-overlay"><div className="kc-modal"><div className="kc-modal-header"><h3>Delete User</h3></div><div className="kc-modal-body"><p className="user-detailModalText">Delete {user.firstName} {user.lastName} (@{user.username})? This will permanently remove this user from the admin directory.</p><p className="user-detailModalSubtext">Their current access assignments and sign-in record may no longer be available after deletion.</p><label className="user-detailModalLabel">Reason for deletion</label><textarea value={deleteReason} onChange={(e) => { setDeleteReason(e.target.value); if (deleteError) setDeleteError(null); }} placeholder="Enter the business reason for deleting this user" rows={4} className="user-detailTextarea" />{deleteError && <div className="user-detailFieldError">{deleteError}</div>}</div><div className="kc-modal-footer"><button className="btn btn-secondary" onClick={() => { if (isDeleting) return; setShowDeleteModal(false); setDeleteError(null); setDeleteReason(""); }} disabled={isDeleting}>Cancel</button><button className="btn btn-danger" onClick={async () => { if (!deleteReason.trim()) { setDeleteError("Deletion reason is required."); return; } try { setIsDeleting(true); setDeleteError(null); await onDelete(user.id, deleteReason.trim()); setShowDeleteModal(false); setDeleteReason(""); } catch (err) { setDeleteError(err instanceof Error ? err.message : "Failed to delete user"); } finally { setIsDeleting(false); } }} disabled={isDeleting}>{isDeleting ? "Deleting user..." : "Delete user"}</button></div></div></div>}
    </div>
  );
};

export default UserDetailContent;