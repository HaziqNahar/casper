import { apiRequest, casperApi } from "./apiClient";

export type ApprovalRequestPayload = {
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  reason?: string;
  details?: string;
  payloadJson?: string;
};

export type ReviewApprovalPayload = {
  comment?: string;
};

export const governanceApi = {
  approvalRequests<T>(query = "") {
    const suffix = query ? `?${query}` : "";
    return apiRequest<T>(casperApi(`approval-requests${suffix}`));
  },

  approvalRequestFacets<T>(query = "") {
    const suffix = query ? `?${query}` : "";
    return apiRequest<T>(casperApi(`approval-requests/facets${suffix}`));
  },

  createApproval(payload: ApprovalRequestPayload) {
    return apiRequest<{ ok: boolean; id: string; status: string }>(casperApi("approval-requests"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  reviewApproval(requestId: string, action: "approve" | "reject", payload: ReviewApprovalPayload = {}) {
    return apiRequest<{ ok: boolean; status: string }>(casperApi(`approval-requests/${requestId}/${action}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  auditLogs<T>(query = "") {
    const suffix = query ? `?${query}` : "";
    return apiRequest<T>(casperApi(`audit-logs${suffix}`));
  },

  auditLogFacets<T>(query = "") {
    const suffix = query ? `?${query}` : "";
    return apiRequest<T>(casperApi(`audit-logs/facets${suffix}`));
  },
};