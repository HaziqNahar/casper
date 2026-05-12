import { apiRequest, casperApi } from "./apiClient";
import type { RealmRow } from "../types";

export type RealmMembershipDto = {
  realmId: string;
  userUuid: string;
  roleId: string;
};

export type RealmAppLinkDto = {
  realmId: string;
  appId: string;
};

export type AppAccessDto = {
  realmId: string;
  appId: string;
  userUuid: string;
};

export type AdminRelationshipsResponse = {
  realmMemberships: RealmMembershipDto[];
  realmApps: RealmAppLinkDto[];
  appAccess: AppAccessDto[];
};

export type CreateRealmRequest = {
  name: string;
  status: "Active" | "Inactive" | "Draft";
  mfaRequired: boolean;
  passwordInheritance: "inherit" | "override";
  sessionTimeoutMins: number;
};

export type UpdateRealmRequest = Partial<{
  status: "Active" | "Inactive" | "Draft";
  mfaRequired: boolean;
  passwordInheritance: "inherit" | "override";
  sessionTimeoutMins: number;
}>;

export const realmsApi = {
  list() {
    return apiRequest<RealmRow[]>(casperApi("realms"));
  },

  getRelationships() {
    return apiRequest<AdminRelationshipsResponse>(casperApi("relationships"));
  },

  create(payload: CreateRealmRequest) {
    return apiRequest<{ ok: boolean; realm: unknown }>(casperApi("realms"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateRealmRequest) {
    return apiRequest<{ ok: boolean }>(casperApi(`realms/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  addUser(realmId: string, userId: string) {
    return apiRequest<{ ok: boolean }>(casperApi(`realms/${realmId}/users/${userId}`), {
      method: "POST",
    });
  },

  removeUser(realmId: string, userId: string) {
    return apiRequest<{ ok: boolean }>(casperApi(`realms/${realmId}/users/${userId}`), {
      method: "DELETE",
    });
  },

  grantAppAccess(realmId: string, appId: string, userId: string) {
    return apiRequest<{ ok: boolean }>(casperApi(`realms/${realmId}/apps/${appId}/users/${userId}`), {
      method: "POST",
    });
  },

  revokeAppAccess(realmId: string, appId: string, userId: string) {
    return apiRequest<{ ok: boolean }>(casperApi(`realms/${realmId}/apps/${appId}/users/${userId}`), {
      method: "DELETE",
    });
  },
};