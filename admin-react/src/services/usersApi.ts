
import { apiRequest, casperApi } from "./apiClient";

export type UserStatus = "Active" | "Inactive" | "Pending";

export type AdminUserDto = {
  uuid: string;
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  isDeleted: boolean;
  lastLogin?: string | null;
  department?: string;
  userType?: string;
  localRealmId?: string | null;
};

export type CreateAdminUserRequest = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  userType?: string;
  password?: string;
};

export type UserAccessRealmAppDto = {
  appId: string;
  name: string;
  status: "Enabled" | "Disabled";
};

export type UserAccessRealmDto = {
  realmId: string;
  realmName: string;
  roleIds: string[];
  apps: UserAccessRealmAppDto[];
};

export type UserAccessResponse = {
  realms: UserAccessRealmDto[];
};

export type UpdateAdminUserRequest = Partial<{
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  userType: string;
}>;

export type CreateAdminUserResponse = {
  ok: boolean;
  id: string;
  user: AdminUserDto;
};

export type UserStatusResponse = {
  ok: boolean;
  status: UserStatus;
  onboardingStage?: string;
  onboardingReason?: string | null;
};

export const usersApi = {
  list() {
    return apiRequest<AdminUserDto[]>(casperApi("users"));
  },

  getAccess(id: string) {
    return apiRequest<UserAccessResponse>(casperApi("users/" + id + "/access"));
  },

  create(payload: CreateAdminUserRequest) {
    return apiRequest<CreateAdminUserResponse>(casperApi("users"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateAdminUserRequest) {
    return apiRequest<{ ok: boolean }>(casperApi("users/" + id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  setStatus(
    id: string,
    payload:
      | UserStatus
      | {
          status: UserStatus;
          onboardingStage?: string;
          onboardingReason?: string | null;
        }
  ) {
    const normalizedPayload =
      typeof payload === "string"
        ? { status: payload }
        : payload;

    return apiRequest<UserStatusResponse>(casperApi("users/" + id + "/status"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedPayload),
    });
  },

  remove(id: string, payload?: { reason?: string; confirmationMode?: string }) {
    return apiRequest<{ ok: boolean }>(casperApi("users/" + id), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
  },
};