import type { UserRow } from "./usersPageTypes";

export function applyUserPatch(users: UserRow[], id: string, patch: Partial<UserRow>): UserRow[] {
  return users.map((user) => (user.id === id ? { ...user, ...patch } : user));
}

export function getUserDisplayName(user: Pick<UserRow, "firstName" | "lastName">): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function buildApprovedPatch(): Partial<UserRow> {
  return {
    onboardingStage: "Approved",
    approvedBy: "admin",
    approvedAt: new Date().toISOString(),
  };
}

export function buildVerifiedPatch(): Partial<UserRow> {
  return {
    onboardingStage: "Verified",
    verifiedBy: "admin",
    verifiedAt: new Date().toISOString(),
  };
}

export function buildActivatedPatch(): Partial<UserRow> {
  return {
    onboardingStage: "Activated",
    status: "Active",
  };
}

export function buildRejectedPatch(reason?: string): Partial<UserRow> {
  return {
    onboardingStage: "Rejected",
    status: "Inactive",
    rejectedBy: "admin",
    rejectedAt: new Date().toISOString(),
    onboardingReason: reason ?? "Rejected",
  };
}