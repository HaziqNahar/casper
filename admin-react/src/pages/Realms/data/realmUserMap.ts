type RealmMembership = {
    userUuid: string;
    roleId: string;
    assignedAt: string;
    assignedBy: string;
};

export type RealmUserMap = Record<string, RealmMembership[]>;

export const REALM_APP_USERS_INITIAL: RealmUserMap = {
    "realm-ops": [
        { userUuid: "u-5b9f2a2c-1", roleId: "realm_admin", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
        { userUuid: "u-5b9f2a2c-2", roleId: "realm_manager", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
        { userUuid: "u-5b9f2a2c-3", roleId: "realm_user", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
    ],
    "realm-fin": [
        { userUuid: "u-5b9f2a2c-4", roleId: "realm_user", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
        { userUuid: "u-5b9f2a2c-5", roleId: "realm_user", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
    ],
    "realm-dev": [
        { userUuid: "u-5b9f2a2c-2", roleId: "realm_user", assignedAt: "2025-12-18T09:00:00.000Z", assignedBy: "admin" },
    ],
};