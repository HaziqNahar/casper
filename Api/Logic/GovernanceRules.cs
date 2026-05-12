namespace Api.Logic;

public static class GovernanceRules
{
    public static int GetApprovalSlaHours(string entityType, string action)
        => (entityType.Trim().ToLowerInvariant(), action.Trim().ToLowerInvariant()) switch
        {
            ("realm", "deactivate") => 4,
            ("application", "deactivate") => 2,
            ("application_access", "grant") => 4,
            _ => 4,
        };

    public static int GetRealmAccessSlaHours(string stage)
        => string.Equals(stage, "verification", StringComparison.OrdinalIgnoreCase) ? 2 : 4;

    public static string GetRealmAccessSlaPolicy(string stage)
        => string.Equals(stage, "verification", StringComparison.OrdinalIgnoreCase)
            ? "realm_access_verify"
            : "realm_access_approve";

    public static AccessRequestSla BuildRealmAccessSla(string stage, DateTime startedAtUtc, DateTime? comparedAtUtc)
    {
        var normalizedStage = string.Equals(stage, "verification", StringComparison.OrdinalIgnoreCase) ? "verification" : "approval";
        var slaHours = GetRealmAccessSlaHours(normalizedStage);
        var dueAt = startedAtUtc.AddHours(slaHours);
        var comparedAt = comparedAtUtc ?? DateTime.UtcNow;
        var breached = comparedAt > dueAt;
        var elapsedMinutes = Math.Max(0, (int)Math.Floor((comparedAt - startedAtUtc).TotalMinutes));

        return new AccessRequestSla(
            normalizedStage,
            GetRealmAccessSlaPolicy(normalizedStage),
            slaHours,
            dueAt.ToString("o"),
            elapsedMinutes,
            comparedAtUtc.HasValue ? (breached ? "after_sla_breach" : "within_sla") : "pending",
            breached);
    }
}