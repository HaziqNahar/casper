import { apiRequest, casperApi } from "./apiClient";

export type AccessRequestStatus =
  | "Draft"
  | "Submitted"
  | "Approved"
  | "Rejected"
  | "Verified"
  | "Cancelled";

export type AccessRequestEventType =
  | "CREATED"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "VERIFIED"
  | "CANCELLED"
  | "NOTE";

export interface AccessRequestSla {
  stage: "approval" | "verification";
  policy: string;
  slaHours: number;
  dueAt: string;
  elapsedMinutes: number;
  outcome: "within_sla" | "after_sla_breach" | "pending";
  breached: boolean;
}

export interface AccessRequestEvent {
  id: string;
  requestId: string;
  type: AccessRequestEventType;
  at: string;
  actor: string;
  message?: string;
  sla?: AccessRequestSla;
}

export interface AccessRequest {
  id: string;
  realmId: string;
  realmName: string;
  targetUser: string;
  roleRequested: string;
  justification: string;
  timeBound?: boolean;
  startDate?: string;
  endDate?: string;
  status: AccessRequestStatus;
  requester: string;
  approver?: string;
  verifier?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccessRequestSnapshot = {
  requests: AccessRequest[];
  events: AccessRequestEvent[];
};

export type CreateAccessRequestInput = {
  realmId: string;
  realmName: string;
  targetUser: string;
  roleRequested: string;
  justification: string;
  timeBound?: boolean;
  startDate?: string;
  endDate?: string;
  requester: string;
};

export type RealmAccessTransitionPayload = {
  actor: string;
  message?: string;
  note?: string;
  roleRequested?: string;
  timeBound?: boolean;
  endDate?: string | null;
};

export const realmAccessApi = {
  snapshot() {
    return apiRequest<AccessRequestSnapshot>(casperApi("realm-access/snapshot"));
  },

  requests() {
    return apiRequest<AccessRequest[]>(casperApi("realm-access/requests"));
  },

  events() {
    return apiRequest<AccessRequestEvent[]>(casperApi("realm-access/events"));
  },

  create(payload: CreateAccessRequestInput) {
    return apiRequest<{ ok: boolean; request: AccessRequest }>(casperApi("realm-access/requests"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  transition(
    id: string,
    eventType: AccessRequestEventType,
    payload: RealmAccessTransitionPayload
  ) {
    const pathByType: Partial<Record<AccessRequestEventType, string>> = {
      SUBMITTED: "submit",
      CANCELLED: "cancel",
      APPROVED: "approve",
      REJECTED: "reject",
      VERIFIED: "verify",
    };

    const action = pathByType[eventType];
    if (!action) {
      throw new Error(`Unsupported realm access event type: ${eventType}`);
    }

    return apiRequest<{ ok: boolean }>(casperApi(`realm-access/requests/${id}/${action}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};