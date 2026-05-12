import { UserRow } from "../../types";

export type RealmStatus = "Active" | "Inactive" | "Draft";
export type UserStatus = "Active" | "Inactive" | "Pending";
export type UserPanelMode = "closed" | "create-local-user";
export type RealmRoleId = string;

export type RealmUserViewRow = UserRow & {
    roleId?: RealmRoleId | "";
};

export type UserForm = {
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
    roleId: RealmRoleId | "";
    status: UserStatus;
    justification: string;
};

export interface RealmUserRow {
    id: number;
    realmId: string;
    userId: number;
}

export interface RealmMembership {
    userUuid: string;
    roleId?: RealmRoleId;
    assignedAt?: string;
    assignedBy?: string;
}

export type RealmAppUserKey = string;
export type RealmAppUsersMap = Record<RealmAppUserKey, string[]>;

export interface RealmRole {
    id: RealmRoleId;
    name: string;
    permissions: string[];
}

export const REALM_ROLES: RealmRole[] = [
    { id: "realm_admin", name: "Realm Administrator", permissions: ["realm:read", "realm:write", "realm:delete", "user:read", "user:write", "user:delete", "app:read", "app:write", "app:delete"] },
    { id: "realm_manager", name: "Realm Manager", permissions: ["realm:read", "realm:write", "user:read", "user:write", "app:read", "app:write"] },
    { id: "realm_auditor", name: "Realm Auditor", permissions: ["realm:read", "user:read", "app:read"] },
    { id: "realm_user", name: "Standard User", permissions: ["realm:read", "user:read"] },
    { id: "realm_restricted", name: "Restricted User", permissions: ["realm:read"] },
];