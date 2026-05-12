namespace Api.Data;

public class ApprovalRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;
    public string RequestedByUserId { get; set; } = string.Empty;
    public string RequestedByUsername { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public string? PayloadJson { get; set; }
    public string? Details { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? ReviewedByUserId { get; set; }
    public string? ReviewedByUsername { get; set; }
    public string? ReviewComment { get; set; }
}