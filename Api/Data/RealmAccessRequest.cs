namespace Api.Data;

public class RealmAccessRequest
{
    public string Id { get; set; } = string.Empty;
    public Guid RealmId { get; set; }
    public string RealmName { get; set; } = string.Empty;
    public Guid? TargetUserId { get; set; }
    public string TargetUser { get; set; } = string.Empty;
    public string RoleRequested { get; set; } = "realm_user";
    public string Justification { get; set; } = string.Empty;
    public bool TimeBound { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string Status { get; set; } = "Draft";
    public string Requester { get; set; } = string.Empty;
    public string? Approver { get; set; }
    public string? Verifier { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<RealmAccessRequestEvent> Events { get; set; } = new();
}