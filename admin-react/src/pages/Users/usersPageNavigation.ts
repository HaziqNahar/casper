import { ROUTES } from "../../config/routes";
import type { RealmRow, UserRow } from "./usersPageTypes";

export function buildRealmAccessRequestPath(
  realm: RealmRow,
  user: UserRow,
  roleId: string
): string {
  return (
    ROUTES.REALM_ACCESS_REQUEST +
    "?realmId=" + encodeURIComponent(realm.id) +
    "&realmName=" + encodeURIComponent(realm.name) +
    "&targetUser=" + encodeURIComponent(user.username) +
    "&roleRequested=" + encodeURIComponent(roleId)
  );
}