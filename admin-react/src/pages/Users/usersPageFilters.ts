import type { UserRow } from "./usersPageTypes";

export function parseSelectedFilterValues(value: string): string[] {
  if (value === "All" || value.trim() === "") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function filterUsers(
  users: UserRow[],
  selectedStatuses: string[],
  selectedUserTypes: string[],
  showArchivedUsers: boolean
): UserRow[] {
  return users.filter((user) => {
    if (!showArchivedUsers && user.isDeleted) return false;
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(user.status)) return false;
    if (selectedUserTypes.length > 0 && !selectedUserTypes.includes(user.userType)) return false;
    return true;
  });
}