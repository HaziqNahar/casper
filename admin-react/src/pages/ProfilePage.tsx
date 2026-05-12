
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../services/apiClient";
import { authApi, type ProfileResponse } from "../services/authApi";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

const emptyPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

const formatDateTime = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-SG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const ProfilePage: React.FC = () => {
  const { pushToast } = useToast();
  const { user, refreshMe } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm);
  const [formError, setFormError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const nextProfile = await authApi.profile();
      setProfile(nextProfile);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const passwordHelper = useMemo(() => {
    if (!passwordForm.newPassword) return "Use at least 8 characters for your new password.";
    if (passwordForm.newPassword.length < 8) return "New password must be at least 8 characters.";
    if (passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      return "New password and confirmation must match.";
    }
    return "Your current password is required before the change is applied.";
  }, [passwordForm.confirmNewPassword, passwordForm.newPassword]);

  const handlePasswordChange = async () => {
    setFormError(null);

    if (!passwordForm.currentPassword.trim()) {
      setFormError("Current password is required.");
      return;
    }
    if (passwordForm.newPassword.trim().length < 8) {
      setFormError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setFormError("Password confirmation does not match.");
      return;
    }

    try {
      setSaving(true);
      await authApi.changePassword(passwordForm);
      setPasswordForm(emptyPasswordForm);
      await refreshMe();
      await loadProfile();
      pushToast("Profile password updated", "success");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setFormError("Your current password is incorrect.");
        } else if (typeof error.body === "string") {
          const mapped = error.body === "new_password_too_short"
            ? "New password must be at least 8 characters."
            : error.body === "password_confirmation_mismatch"
              ? "Password confirmation does not match."
              : error.body === "password_unchanged"
                ? "Choose a new password that is different from the current password."
                : error.body === "current_password_required"
                  ? "Current password is required."
                  : error.body === "new_password_required"
                    ? "New password is required."
                    : error.message;
          setFormError(mapped);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError(error instanceof Error ? error.message : "Failed to update password");
      }
    } finally {
      setSaving(false);
    }
  };

  const identityPillClass = profile?.isSuperAdmin ? "is-superAdmin" : "is-user";

  return (
    <div className="profilePage">
      <section className="profilePage-card profilePage-hero">
        <div className="profilePage-heroMain">
          <div>
            <div className="profilePage-title">
              {profile?.displayName || user?.username || "My Profile"}
            </div>
            <div className="profilePage-subtitle">
              Manage your own account identity and login credentials.
            </div>
          </div>
          <div className={`profilePage-pill ${identityPillClass}`}>{profile?.isSuperAdmin ? "Super Admin" : profile?.role || user?.role || "User"}</div>
        </div>
      </section>

      <section className="profilePage-grid">
        <div className="profilePage-card">
          <div className="profilePage-sectionTitle">Account Details</div>
          {loading ? (
            <div className="profilePage-muted">Loading your profile...</div>
          ) : (
            <div className="profilePage-detailGrid">
              <div>
                <label className="profilePage-label">Display Name</label>
                <div className="profilePage-readonly">{profile?.displayName || "-"}</div>
              </div>
              <div>
                <label className="profilePage-label">Username</label>
                <div className="profilePage-readonly">{profile?.username || user?.username || "-"}</div>
              </div>
              <div>
                <label className="profilePage-label">Email</label>
                <div className="profilePage-readonly">{profile?.email || "-"}</div>
              </div>
              <div>
                <label className="profilePage-label">Role</label>
                <div className="profilePage-readonly">{profile?.role || user?.role || "-"}</div>
              </div>
              <div>
                <label className="profilePage-label">Account Status</label>
                <div className="profilePage-readonly">{profile?.status || "-"}</div>
              </div>
              <div>
                <label className="profilePage-label">Department</label>
                <div className="profilePage-readonly">{profile?.department || "Not set"}</div>
              </div>
              <div>
                <label className="profilePage-label">Onboarding Stage</label>
                <div className="profilePage-readonly">{profile?.onboardingStage || "Not set"}</div>
              </div>
              <div>
                <label className="profilePage-label">Last Account Update</label>
                <div className="profilePage-readonly">{formatDateTime(profile?.updatedAtUtc)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="profilePage-card">
          <div className="profilePage-sectionTitle profilePage-sectionTitle--compact">Password Management</div>
          <div className="profilePage-sectionCopy">
            Change your own sign-in password here. This applies to the account you are currently logged in with.
          </div>

          <div className="profilePage-formStack">
            <div>
              <label className="profilePage-label">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className="profilePage-input"
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label className="profilePage-label">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="profilePage-input"
                placeholder="Enter a new password"
              />
            </div>

            <div>
              <label className="profilePage-label">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                className="profilePage-input"
                placeholder="Re-enter the new password"
              />
            </div>

            <div className={`profilePage-helper ${formError ? "is-error" : ""}`}>
              {formError || passwordHelper}
            </div>

            <div className="profilePage-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setPasswordForm(emptyPasswordForm);
                  setFormError(null);
                }}
                disabled={saving}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handlePasswordChange()}
                disabled={saving || loading}
              >
                {saving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;