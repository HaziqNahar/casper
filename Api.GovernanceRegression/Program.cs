using System.Globalization;
using Api.Data;
using Api.Logic;

static void Assert(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

var startedAtUtc = new DateTime(2026, 3, 31, 0, 0, 0, DateTimeKind.Utc);
var pendingStartedAtUtc = DateTime.UtcNow.AddMinutes(-5);

Assert(GovernanceRules.GetApprovalSlaHours("realm", "deactivate") == 4, "Realm deactivation SLA should be 4 hours.");
Assert(GovernanceRules.GetApprovalSlaHours("application", "deactivate") == 2, "Application deactivation SLA should be 2 hours.");
Assert(GovernanceRules.GetApprovalSlaHours("user", "delete") == 4, "Fallback approval SLA should be 4 hours.");

Assert(GovernanceRules.GetRealmAccessSlaHours("approval") == 4, "Realm access approval SLA should be 4 hours.");
Assert(GovernanceRules.GetRealmAccessSlaHours("verification") == 2, "Realm access verification SLA should be 2 hours.");
Assert(GovernanceRules.GetRealmAccessSlaPolicy("approval") == "realm_access_approve", "Approval SLA policy key is wrong.");
Assert(GovernanceRules.GetRealmAccessSlaPolicy("verification") == "realm_access_verify", "Verification SLA policy key is wrong.");

var pendingApproval = GovernanceRules.BuildRealmAccessSla("approval", pendingStartedAtUtc, null);
Assert(pendingApproval.Stage == "approval", "Pending approval stage should normalize to approval.");
Assert(pendingApproval.Outcome == "pending", "Pending approval outcome should be pending.");
Assert(!pendingApproval.Breached, "Pending approval should not be breached before due time.");

var withinApproval = GovernanceRules.BuildRealmAccessSla("approval", startedAtUtc, startedAtUtc.AddHours(1));
Assert(withinApproval.Outcome == "within_sla", "Approval inside the target should be within SLA.");
Assert(!withinApproval.Breached, "Approval inside the target should not be breached.");

var breachedApproval = GovernanceRules.BuildRealmAccessSla("approval", startedAtUtc, startedAtUtc.AddHours(5));
Assert(breachedApproval.Outcome == "after_sla_breach", "Approval after the target should breach SLA.");
Assert(breachedApproval.Breached, "Approval after the target should be marked breached.");

var verifyPending = GovernanceRules.BuildRealmAccessSla("verification", startedAtUtc, null);
Assert(verifyPending.Stage == "verification", "Verification stage should normalize to verification.");
Assert(verifyPending.SlaHours == 2, "Verification SLA hours should be 2.");

var verifyBreached = GovernanceRules.BuildRealmAccessSla("verification", startedAtUtc, startedAtUtc.AddHours(3));
Assert(verifyBreached.Outcome == "after_sla_breach", "Verification after two hours should breach SLA.");

var dueAt = DateTime.Parse(withinApproval.DueAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
Assert(dueAt.Kind == DateTimeKind.Utc, "Realm access SLA dueAt should round-trip as UTC.");
Assert(dueAt == startedAtUtc.AddHours(4), "Realm access approval dueAt should match the 4-hour policy.");

var realmAccessRequest = new RealmAccessRequest
{
    Id = "AR-123",
    RealmId = Guid.Parse("900b7743-e141-4bbe-86d9-d2b1ac2252e3"),
    RealmName = "Finance Realm",
    TargetUser = "tester",
    RoleRequested = "realm_user",
    Justification = "UAT access",
    TimeBound = true,
    StartDate = "2026-03-31",
    EndDate = "2026-04-30",
    Status = "Approved",
    Requester = "admin",
    Approver = "approver.one",
    Verifier = "verifier.one",
};

Assert(
    GovernanceAudit.BuildRealmAccessEntityName(realmAccessRequest) == "Finance Realm -> tester",
    "Realm access audit entity name should include the realm and target user.");

var realmAccessMetadata = GovernanceAudit.BuildRealmAccessMetadata(
    realmAccessRequest,
    workflowStage: "verification",
    appliedToRealmUser: true);
Assert(realmAccessMetadata.RequestId == "AR-123", "Realm access metadata should preserve the request id.");
Assert(realmAccessMetadata.WorkflowStage == "verification", "Realm access metadata should carry the workflow stage.");
Assert(realmAccessMetadata.AppliedToRealmUser, "Realm access metadata should record the membership application flag.");
Assert(realmAccessMetadata.Approver == "approver.one", "Realm access metadata should include the approver.");

var realmAccessBeforeState = GovernanceAudit.BuildRealmAccessState("Submitted");
Assert(realmAccessBeforeState.Status == "Submitted", "Realm access audit state should preserve the status.");

var realmAccessAfterState = GovernanceAudit.BuildRealmAccessState(
    "Approved",
    roleRequested: "realm_manager",
    timeBound: true,
    startDate: "2026-03-31",
    endDate: "2026-04-30",
    approver: "approver.one");
Assert(realmAccessAfterState.RoleRequested == "realm_manager", "Realm access audit state should keep the approved role.");
Assert(realmAccessAfterState.TimeBound == true, "Realm access audit state should preserve the time-bound flag.");
Assert(realmAccessAfterState.Approver == "approver.one", "Realm access audit state should preserve the approver.");

Console.WriteLine("Governance regression checks passed.");