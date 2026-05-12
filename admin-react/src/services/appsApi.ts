import { apiRequest, casperApi } from "./apiClient";
import type { AppRow } from "../types";

export type CreateAppRequest = {
  name: string;
  clientId: string;
  clientSecret?: string;
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  webOrigins?: string[];
  protocol?: "oidc" | "saml";
  publicClient?: boolean;
  rootUrl?: string;
  baseUrl?: string;
  adminUrl?: string;
  realmId?: string;
  description?: string;
};

export type RotateClientSecretRequest = {
  previousSecretGraceDays?: number;
  storeInAwsSecretsManager?: boolean;
  secretName?: string;
  reason?: string;
};

export type RotateClientSecretResponse = {
  ok: boolean;
  clientId: string;
  clientSecret: string;
  clientSecretMasked: string;
  clientSecretStorage: string;
  clientSecretSecretName?: string;
  rotatedAtUtc: string;
  previousClientSecretExpiresAtUtc?: string;
  warning?: string;
};

export type MoveClientSecretToAwsRequest = {
  secretName?: string;
  reason?: string;
};

export type MoveClientSecretToAwsResponse = {
  ok: boolean;
  clientId: string;
  clientSecretStorage: string;
  clientSecretSecretName: string;
  updatedAt: string;
};

export type UpdateOAuthSettingsRequest = {
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
  webOrigins?: string[];
  rootUrl?: string | null;
  baseUrl?: string | null;
  adminUrl?: string | null;
  reason?: string;
};

export type UpdateOAuthSettingsResponse = {
  ok: boolean;
  updatedAt: string;
  rootUrl?: string | null;
  baseUrl?: string | null;
  adminUrl?: string | null;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  webOrigins: string[];
};

export const appsApi = {
  list() {
    return apiRequest<AppRow[]>(casperApi("apps"));
  },

  create(payload: CreateAppRequest) {
    return apiRequest<{ ok: boolean; id: string }>(casperApi("apps"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  setStatus(id: string, payload: { status: "Enabled" | "Disabled"; confirmationMode?: string; reason?: string }) {
    return apiRequest<{ ok: boolean; enabled: boolean; updatedAt: string }>(casperApi(`apps/${id}/status`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  updateOAuthSettings(id: string, payload: UpdateOAuthSettingsRequest) {
    return apiRequest<UpdateOAuthSettingsResponse>(casperApi(`apps/${id}/oauth-settings`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  rotateClientSecret(id: string, payload: RotateClientSecretRequest) {
    return apiRequest<RotateClientSecretResponse>(casperApi(`apps/${id}/client-secret/rotate`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  moveClientSecretToAws(id: string, payload: MoveClientSecretToAwsRequest) {
    return apiRequest<MoveClientSecretToAwsResponse>(casperApi(`apps/${id}/client-secret/move-to-aws`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};