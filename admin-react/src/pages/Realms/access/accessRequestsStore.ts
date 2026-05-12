import { realmAccessApi } from "../../../services/realmAccessApi";

const EVT_KEY = "kc_access_requests_updated";

function broadcast() {
    window.dispatchEvent(new Event(EVT_KEY));
    localStorage.setItem(EVT_KEY, String(Date.now()));
}

export type { AccessRequestStatus, AccessRequestEventType, AccessRequestEvent, AccessRequest } from "../../../services/realmAccessApi";
import type { AccessRequestStatus, AccessRequestEventType, AccessRequestEvent, AccessRequest, AccessRequestSnapshot, CreateAccessRequestInput, RealmAccessTransitionPayload } from "../../../services/realmAccessApi";

export type AccessRequestSlaStage = "approval" | "verification";
export type AccessRequestSlaOutcome = "within_sla" | "after_sla_breach" | "pending";

export interface AccessRequestSla {
    stage: AccessRequestSlaStage;
    policy: string;
    slaHours: number;
    dueAt: string;
    elapsedMinutes: number;
    outcome: AccessRequestSlaOutcome;
    breached: boolean;
}

const ACCESS_APPROVAL_SLA_HOURS = 4;
const ACCESS_VERIFY_SLA_HOURS = 2;

export function getAccessSlaHours(stage: AccessRequestSlaStage) {
    return stage === "verification" ? ACCESS_VERIFY_SLA_HOURS : ACCESS_APPROVAL_SLA_HOURS;
}

export function getAccessSlaPolicy(stage: AccessRequestSlaStage) {
    return stage === "verification" ? "realm_access_verify" : "realm_access_approve";
}

function asTime(iso?: string) {
    const time = iso ? new Date(iso).getTime() : Number.NaN;
    return Number.isNaN(time) ? null : time;
}

function buildSla(stage: AccessRequestSlaStage, startedAtIso: string, endedAtIso?: string): AccessRequestSla | undefined {
    const startedAt = asTime(startedAtIso);
    if (startedAt == null) return undefined;

    const comparedAt = asTime(endedAtIso || new Date().toISOString());
    if (comparedAt == null) return undefined;

    const slaHours = getAccessSlaHours(stage);
    const dueAt = startedAt + slaHours * 60 * 60 * 1000;
    const elapsedMinutes = Math.max(0, Math.floor((comparedAt - startedAt) / 60000));
    const breached = comparedAt > dueAt;

    return {
        stage,
        policy: getAccessSlaPolicy(stage),
        slaHours,
        dueAt: new Date(dueAt).toISOString(),
        elapsedMinutes,
        outcome: endedAtIso ? (breached ? "after_sla_breach" : "within_sla") : "pending",
        breached,
    };
}

function getStageStart(events: AccessRequestEvent[], stage: AccessRequestSlaStage) {
    const targetType = stage === "verification" ? "APPROVED" : "SUBMITTED";
    const matches = events
        .filter((event) => event.type === targetType)
        .slice()
        .sort((a, b) => (a.at > b.at ? 1 : -1));
    return matches[0]?.at;
}

export function getPendingAccessSla(
    request: Pick<AccessRequest, "status">,
    events: AccessRequestEvent[]
): AccessRequestSla | null {
    if (request.status === "Submitted") {
        const startedAt = getStageStart(events, "approval");
        return startedAt ? buildSla("approval", startedAt) ?? null : null;
    }

    if (request.status === "Approved") {
        const startedAt = getStageStart(events, "verification");
        return startedAt ? buildSla("verification", startedAt) ?? null : null;
    }

    return null;
}

export async function loadAccessSnapshot(): Promise<AccessRequestSnapshot> {
    return realmAccessApi.snapshot();
}

export async function loadAccessRequests(): Promise<AccessRequest[]> {
    return realmAccessApi.requests();
}

export async function loadAccessEvents(): Promise<AccessRequestEvent[]> {
    return realmAccessApi.events();
}

export async function createAccessRequest(input: CreateAccessRequestInput): Promise<AccessRequest> {
    const response = await realmAccessApi.create(input);
    broadcast();
    return response.request;
}

export async function updateRequest(
    id: string,
    patch: Partial<AccessRequest>,
    actor: string,
    eventType?: AccessRequestEventType,
    message?: string
) {
    if (!eventType) {
        throw new Error("updateRequest requires an event type for API-backed realm access actions.");
    }

    const body: RealmAccessTransitionPayload = eventType === "APPROVED"
        ? {
            actor,
            note: message,
            roleRequested: patch.roleRequested,
            timeBound: Boolean(patch.timeBound),
            endDate: patch.timeBound ? patch.endDate ?? null : null,
        }
        : { actor, message };

    await realmAccessApi.transition(id, eventType, body);

    broadcast();
}