import type { RealmUserMapping } from "./usersPageTypes";

export function removeRoleFromRealmMemberships(
  mappings: RealmUserMapping[],
  userId: string,
  realmId: string,
  roleId: string
): RealmUserMapping[] {
  return mappings
    .map((mapping) => {
      if (mapping.userId !== userId || mapping.realmId !== realmId) {
        return mapping;
      }

      const nextRoleIds = (mapping.roleIds ?? []).filter((candidate) => candidate !== roleId);
      return { ...mapping, roleIds: nextRoleIds };
    })
    .filter((mapping) => mapping.roleIds.length > 0);
}

export function removeUserFromRealmMemberships(
  mappings: RealmUserMapping[],
  userId: string,
  realmId: string
): RealmUserMapping[] {
  return mappings.filter((mapping) => !(mapping.userId === userId && mapping.realmId === realmId));
}