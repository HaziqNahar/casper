import { apiRequest, casperApi } from "./apiClient";

export type DashboardActivityType = "approval" | "realm" | "user" | "app" | "audit";
export type DashboardPostureVariant = "good" | "warn" | "bad" | "info";

export type DashboardActor = {
  username: string;
  role: string;
  isSuperAdmin: boolean;
};

export type DashboardPosture = {
  overall: DashboardPostureVariant;
  reviewQueue: number;
  pendingUsers: number;
  inactiveUsers: number;
  nonActiveRealms: number;
  disabledApps: number;
  publicClients: number;
};

export type DashboardOldestPending = {
  id: string;
  entityType: string;
  entityName: string;
  action: string;
  requestedAt: string;
  slaHours: number;
};

export type DashboardGovernance = {
  pending: number;
  dueSoon: number;
  overdue: number;
  oldestPending?: DashboardOldestPending | null;
};

export type DashboardActivity = {
  id: string;
  type: DashboardActivityType;
  entityType: string;
  entityName: string;
  action: string;
  actorUsername: string;
  description: string;
  at: string;
};

export type DashboardSummary = {
  generatedAtUtc: string;
  actor: DashboardActor;
  posture: DashboardPosture;
  governance: DashboardGovernance;
  activity: DashboardActivity[];
};

export const dashboardApi = {
  summary() {
    return apiRequest<DashboardSummary>(casperApi("dashboard/summary"));
  },
};