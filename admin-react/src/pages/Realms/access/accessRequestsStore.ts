// src/pages/Realms/access/accessRequestsStore.ts
const EVT_KEY = "kc_access_requests_updated";

function broadcast() {
    // same-tab updates won't trigger 'storage', so we dispatch our own event too
    window.dispatchEvent(new Event(EVT_KEY));
    // also update localStorage to trigger other tabs (optional)
    localStorage.setItem(EVT_KEY, String(Date.now()));
}
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

export interface AccessRequestEvent {
    id: string;
    requestId: string;
    type: AccessRequestEventType;
    at: string; // ISO
    actor: string;
    message?: string;
}

export interface AccessRequest {
    id: string;
    realmId: string;
    realmName: string;
    targetUser: string;
    roleRequested: string;
    justification: string;
    timeBound?: boolean;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    status: AccessRequestStatus;

    requester: string;
    approver?: string;
    verifier?: string;

    createdAt: string; // ISO
    updatedAt: string; // ISO
}

const LS_KEY_REQ = "kc_access_requests_v1";
const LS_KEY_EVT = "kc_access_request_events_v1";

const nowIso = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): { requests: AccessRequest[]; events: AccessRequestEvent[] } {
    const t = nowIso();

    const r1: AccessRequest = {
        id: "AR-" + uid(),
        realmId: "realm-ops",
        realmName: "Operations Realm",
        targetUser: "sarah.lee",
        roleRequested: "realm_user",
        justification: "Need access for daily operations support.",
        timeBound: true,
        startDate: "2026-03-01",
        endDate: "2026-06-01",
        status: "Submitted",
        requester: "admin",
        createdAt: t,
        updatedAt: t,
    };

    const r2: AccessRequest = {
        id: "AR-" + uid(),
        realmId: "realm-fin",
        realmName: "Finance Realm",
        targetUser: "john.doe",
        roleRequested: "realm_manager",
        justification: "Temporary approval coverage while manager is on leave.",
        timeBound: true,
        startDate: "2026-03-05",
        endDate: "2026-04-05",
        status: "Approved",
        requester: "admin",
        approver: "approver.1",
        createdAt: t,
        updatedAt: t,
    };

    const r3: AccessRequest = {
        id: "AR-" + uid(),
        realmId: "realm-dev",
        realmName: "Sandbox Realm",
        targetUser: "jane.smith",
        roleRequested: "realm_admin",
        justification: "Sandbox admin for testing SSO integrations.",
        status: "Draft",
        requester: "admin",
        createdAt: t,
        updatedAt: t,
    };

    const events: AccessRequestEvent[] = [
        {
            id: "EV-" + uid(),
            requestId: r1.id,
            type: "CREATED",
            at: t,
            actor: r1.requester,
            message: "Request Created",
        },
        {
            id: "EV-" + uid(),
            requestId: r1.id,
            type: "SUBMITTED",
            at: t,
            actor: r1.requester,
            message: "Submitted for Approval",
        },
        {
            id: "EV-" + uid(),
            requestId: r2.id,
            type: "CREATED",
            at: t,
            actor: r2.requester,
            message: "Request Created",
        },
        {
            id: "EV-" + uid(),
            requestId: r2.id,
            type: "SUBMITTED",
            at: t,
            actor: r2.requester,
            message: "Submitted for Approval",
        },
        {
            id: "EV-" + uid(),
            requestId: r2.id,
            type: "APPROVED",
            at: t,
            actor: r2.approver ?? "Approver.1",
            message: "Approved",
        },
        {
            id: "EV-" + uid(),
            requestId: r3.id,
            type: "CREATED",
            at: t,
            actor: r3.requester,
            message: "Draft Created",
        },
    ];

    return { requests: [r1, r2, r3], events };
}

export function loadAccessRequests(): AccessRequest[] {
    const raw = localStorage.getItem(LS_KEY_REQ);
    if (raw) return JSON.parse(raw);
    const seeded = seed();
    localStorage.setItem(LS_KEY_REQ, JSON.stringify(seeded.requests));
    localStorage.setItem(LS_KEY_EVT, JSON.stringify(seeded.events));
    return seeded.requests;
}

export function loadAccessEvents(): AccessRequestEvent[] {
    const raw = localStorage.getItem(LS_KEY_EVT);
    if (raw) return JSON.parse(raw);
    // ensure seeding occurs if events missing
    loadAccessRequests();
    return JSON.parse(localStorage.getItem(LS_KEY_EVT) || "[]");
}

export function saveAccessRequests(requests: AccessRequest[]) {
    localStorage.setItem(LS_KEY_REQ, JSON.stringify(requests));
    broadcast();
}

export function saveAccessEvents(events: AccessRequestEvent[]) {
    localStorage.setItem(LS_KEY_EVT, JSON.stringify(events));
    broadcast();
}

export function appendEvent(evt: Omit<AccessRequestEvent, "id">) {
    const events = loadAccessEvents();
    events.unshift({ ...evt, id: "EV-" + uid() });
    saveAccessEvents(events);
}

export function updateRequest(
    id: string,
    patch: Partial<AccessRequest>,
    actor: string,
    eventType?: AccessRequestEventType,
    message?: string
) {
    const reqs = loadAccessRequests();
    const idx = reqs.findIndex((r) => r.id === id);
    if (idx === -1) return;

    reqs[idx] = { ...reqs[idx], ...patch, updatedAt: nowIso() };
    saveAccessRequests(reqs);

    if (eventType) {
        appendEvent({
            requestId: id,
            type: eventType,
            at: nowIso(),
            actor,
            message,
        });
    }
}

export function createAccessRequest(input: {
    realmId: string;
    realmName: string;
    targetUser: string;
    roleRequested: string;
    justification: string;
    timeBound?: boolean;
    startDate?: string;
    endDate?: string;
    requester: string;
}): AccessRequest {
    const reqs = loadAccessRequests();

    const newReq: AccessRequest = {
        id: "AR-" + uid(),
        realmId: input.realmId.trim(),
        realmName: input.realmName.trim(),
        targetUser: input.targetUser.trim(),
        roleRequested: input.roleRequested.trim(),
        justification: input.justification.trim(),
        timeBound: !!input.timeBound,
        startDate: input.timeBound ? input.startDate : undefined,
        endDate: input.timeBound ? input.endDate : undefined,

        status: "Draft",
        requester: input.requester,
        createdAt: nowIso(),
        updatedAt: nowIso(),
    };

    reqs.unshift(newReq);
    saveAccessRequests(reqs);

    appendEvent({
        requestId: newReq.id,
        type: "CREATED",
        at: nowIso(),
        actor: input.requester,
        message: "Request Created (Draft)",
    });

    return newReq;
}