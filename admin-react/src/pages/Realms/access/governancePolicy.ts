// src/pages/Realms/access/governancePolicy.ts

import type { AccessRequest } from "./accessRequestsStore";

export type GovernanceAction = "submit" | "cancel" | "approve" | "reject" | "verify";

export type GovernanceResult = {
    blocks: string[];
    warns: string[];
    requires: string[];
};

const ROLE_HIGH = ["admin", "manager"]; // simple heuristic

function isHighPrivilegeRole(role?: string) {
    const r = String(role || "").toLowerCase();
    return ROLE_HIGH.some((k) => r.includes(k));
}

function isBlank(v?: string | null) {
    return !String(v || "").trim();
}

/**
 * Separation of Duties + Policy evaluation.
 * - blocks: cannot proceed
 * - requires: must provide additional info / conditions
 * - warns: allowed, but should show warning banner
 */
export function evaluateGovernance(params: {
    request: AccessRequest;
    actor: string; // current logged-in user (you already use `const actor = "admin"`)
    action: GovernanceAction;
}): GovernanceResult {
    const { request, actor, action } = params;

    const blocks: string[] = [];
    const warns: string[] = [];
    const requires: string[] = [];

    const requester = String(request.requester || "").trim();
    const approver = String(request.approver || "").trim();
    const verifier = String(request.verifier || "").trim();

    // =========================
    // A) Separation of Duties
    // =========================

    // No self-approval
    if (action === "approve" || action === "reject") {
        if (requester && actor === requester) {
            blocks.push("Separation of duties: requester cannot approve/reject their own request.");
        }
        // If an approver is already assigned, enforce that only that approver can act (optional but good governance)
        if (approver && actor !== approver) {
            blocks.push(`Only the assigned approver (${approver}) can approve/reject this request.`);
        }
    }

    // No approve + verify by same person
    if (action === "verify") {
        if (requester && actor === requester) {
            blocks.push("Separation of duties: requester cannot verify their own request.");
        }
        if (approver && actor === approver) {
            blocks.push("Separation of duties: approver cannot verify the same request.");
        }
        // If a verifier is already assigned, enforce it
        if (verifier && actor !== verifier) {
            blocks.push(`Only the assigned verifier (${verifier}) can verify this request.`);
        }
    }

    // =========================
    // B) Policy rules (BLOCK/WARN/REQUIRE)
    // =========================

    // Submit rules
    if (action === "submit") {
        if (isBlank(request.realmName)) blocks.push("Missing realm.");
        if (isBlank(request.targetUser)) blocks.push("Missing target user.");
        if (isBlank(request.roleRequested)) blocks.push("Missing role requested.");
        if (isBlank(request.justification)) requires.push("Justification is required before submitting.");

        // High privilege should be time-bound
        if (isHighPrivilegeRole(request.roleRequested)) {
            if (!request.timeBound) requires.push("High-privilege access must be time-bound.");
            if (request.timeBound && isBlank(request.endDate)) requires.push("End date is required for time-bound access.");
        }
    }

    // Approve rules
    if (action === "approve") {
        // you already require approval comment in drawer validation; keep policy consistent
        if (isHighPrivilegeRole(request.roleRequested)) {
            if (!request.timeBound) requires.push("High-privilege approvals must be time-bound.");
            if (request.timeBound && isBlank(request.endDate)) requires.push("High-privilege approvals require an end date.");
        }

        // Warn if request is not time-bound for any role
        if (!request.timeBound) warns.push("Request is not time-bound (review carefully).");
    }

    // Verify rules
    if (action === "verify") {
        // Warn if approved but still not time-bound (should be prevented by requires, but keep this as safety)
        if (isHighPrivilegeRole(request.roleRequested) && (!request.timeBound || isBlank(request.endDate))) {
            blocks.push("Cannot verify: high-privilege access must be time-bound with an end date.");
        }
    }

    return { blocks, warns, requires };
}

/** Helper: whether action is allowed to proceed */
export function canProceed(result: GovernanceResult) {
    return result.blocks.length === 0 && result.requires.length === 0;
}

/** Helper: produce a single message (for alerts) */
export function governanceSummary(result: GovernanceResult) {
    const lines: string[] = [];
    if (result.blocks.length) lines.push(`BLOCKED:\n- ${result.blocks.join("\n- ")}`);
    if (result.requires.length) lines.push(`REQUIRED:\n- ${result.requires.join("\n- ")}`);
    if (result.warns.length) lines.push(`WARNING:\n- ${result.warns.join("\n- ")}`);
    return lines.join("\n\n");
}