export type OnboardingStage = "Requested" | "Approved" | "Verified" | "Rejected" | "Activated";

export interface RealmRow {
  id: string;
  name: string;
  status: "Active" | "Inactive" | "Draft";
}

export interface RealmUserMapping {
  userId: string;
  realmId: string;
  roleIds: string[];
  isRoot?: boolean;
}

export interface UserRow {
  id: string;
  staffId?: string | null;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  status: "Active" | "Inactive" | "Pending";
  lastLogin?: string;
  onboardingStage?: OnboardingStage | null;
  onboardingReason?: string | null;
  isBreakGlass?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  userType: string;
  localRealmId?: string;
  requestedBy?: string;
  requestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

export interface UserTypeRow {
  id: string;
  title: string;
  desc?: string;
  username: string;
  fa1: string;
  fa2: string[];
  useCase: string;
}

export type RealmRoleId = string;

export interface RealmRole {
  id: RealmRoleId;
  name: string;
  permissions: string[];
}