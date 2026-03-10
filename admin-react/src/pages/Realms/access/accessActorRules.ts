export function normActor(v?: string) {
    return String(v || "").trim().toLowerCase();
}

export function isAdminActor(actor?: string) {
    return normActor(actor).includes("admin");
}

export function isApproverActor(actor?: string) {
    return normActor(actor).includes("approver");
}

export function isVerifierActor(actor?: string) {
    return normActor(actor).includes("verifier");
}

export function canViewApprovalQueue(actor?: string) {
    return isAdminActor(actor) || isApproverActor(actor) || isVerifierActor(actor);
}

export function canActOnApproval(actor?: string) {
    return isApproverActor(actor);
}

export function canViewVerifyQueue(actor?: string) {
    return isAdminActor(actor) || isApproverActor(actor) || isVerifierActor(actor);
}

export function canActOnVerify(actor?: string) {
    return isVerifierActor(actor);
}

export function isSelfApproval(actor?: string, requester?: string) {
    const a = normActor(actor);
    const r = normActor(requester);
    return a !== "" && a === r;
}