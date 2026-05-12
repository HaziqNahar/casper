import type { AdminUserDto } from "../../services/usersApi";
import type { UserRow } from "./usersPageTypes";

export function mapAdminUserToUserRow(user: AdminUserDto): UserRow {
  const onboarding = user as AdminUserDto & {
    onboardingStage?: UserRow["onboardingStage"];
    onboardingReason?: string | null;
  };

  return {
    id: user.uuid,
    staffId: null,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: "User",
    department: user.department ?? "",
    status: user.status,
    lastLogin: user.lastLogin ?? "-",
    onboardingStage: onboarding.onboardingStage ?? (user.status === "Pending" ? "Requested" : "Activated"),
    onboardingReason: onboarding.onboardingReason ?? null,
    isBreakGlass: false,
    isDeleted: user.isDeleted,
    deletedAt: null,
    userType: user.userType ?? "Internal",
    localRealmId: user.localRealmId ?? undefined,
  };
}