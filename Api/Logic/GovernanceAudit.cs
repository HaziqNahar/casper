using Api.Data;

namespace Api.Logic;

public static class GovernanceAudit
{
    public sealed record RealmAccessAuditMetadata(
        string RequestId,
        Guid RealmId,
        string RealmName,
        string TargetUser,
        string RoleRequested,
        string Requester,
        string? Approver,
        string? Verifier,
        bool TimeBound,
        string? StartDate,
        string? EndDate,
        string? WorkflowStage,
        string? CancelledBy,
        bool AppliedToRealmUser);

    public sealed record RealmAccessAuditState(
        string Status,
        string? RoleRequested = null,
        bool? TimeBound = null,
        string? StartDate = null,
        string? EndDate = null,
        string? Approver = null,
        string? Verifier = null);

    public static string BuildRealmAccessEntityName(RealmAccessRequest request)
        => $"{request.RealmName} -> {request.TargetUser}";

    public static RealmAccessAuditMetadata BuildRealmAccessMetadata(
        RealmAccessRequest request,
        string? workflowStage = null,
        string? cancelledBy = null,
        bool appliedToRealmUser = false)
        => new(
            request.Id,
            request.RealmId,
            request.RealmName,
            request.TargetUser,
            request.RoleRequested,
            request.Requester,
            request.Approver,
            request.Verifier,
            request.TimeBound,
            request.StartDate,
            request.EndDate,
            workflowStage,
            cancelledBy,
            appliedToRealmUser);

    public static RealmAccessAuditState BuildRealmAccessState(
        string status,
        string? roleRequested = null,
        bool? timeBound = null,
        string? startDate = null,
        string? endDate = null,
        string? approver = null,
        string? verifier = null)
        => new(status, roleRequested, timeBound, startDate, endDate, approver, verifier);
}