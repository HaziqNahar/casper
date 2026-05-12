
import { apiRequest, casperApi } from "./apiClient";

export type AuthRole = "Admin" | "User";

export type AuthUser = {
  sub: string;
  username: string;
  email?: string;
  role: AuthRole;
  isSuperAdmin?: boolean;
};

export type LoginRequest = {
  username: string;
  password: string;
  returnUrl?: string;
};
type LoginResponse = {
  ok: boolean;
  tokenType?: "Bearer";
  expiresIn?: number;
  accessToken?: string;
  username: string;
  role: AuthRole;
  isSuperAdmin?: boolean;
  redirectUrl?: string;
};

export type OAuthSessionResponse = {
  clientId: string;
  redirectUri: string;
  appName: string;
  isAuthenticated: boolean;
};

export type OAuthLoginResponse = {
  redirectUrl: string;
};

type MeResponse = {
  ok: boolean;
  sub: string;
  username: string;
  email?: string;
  role: AuthRole;
  isSuperAdmin?: boolean;
};

export type ProfileResponse = {
  ok: boolean;
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: AuthRole;
  isSuperAdmin: boolean;
  status: string;
  department?: string | null;
  onboardingStage?: string | null;
  updatedAtUtc?: string;
};

export type ConfirmPasswordResponse = {
  ok: boolean;
};

export const authApi = {
  login(payload: LoginRequest) {
    return apiRequest<LoginResponse>(casperApi("auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  me() {
    return apiRequest<MeResponse>(casperApi("auth/me?ts=" + Date.now()), {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
  },

  oauthSession() {
    return apiRequest<OAuthSessionResponse>("/oauth2/auth-session", {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
  },

  oauthLogin(payload: { username: string; password: string }) {
    return apiRequest<OAuthLoginResponse>("/oauth2/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_type: "username-password",
        username: payload.username,
        password: payload.password,
      }),
    });
  },

  logout() {
    return apiRequest<{ ok: boolean }>(casperApi("auth/logout"), {
      method: "POST",
    });
  },

  confirmPassword(password: string) {
    return apiRequest<ConfirmPasswordResponse>(casperApi("auth/confirm-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  },

  profile() {
    return apiRequest<ProfileResponse>(casperApi("auth/profile?ts=" + Date.now()), {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
  },

  changePassword(payload: { currentPassword: string; newPassword: string; confirmNewPassword: string }) {
    return apiRequest<{ ok: boolean }>(casperApi("auth/change-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};