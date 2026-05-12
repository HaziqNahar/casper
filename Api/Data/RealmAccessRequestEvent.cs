namespace Api.Data;

public class RealmAccessRequestEvent
{
    public string Id { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    public RealmAccessRequest Request { get; set; } = null!;
    public string Type { get; set; } = string.Empty;
    public DateTime AtUtc { get; set; } = DateTime.UtcNow;
    public string Actor { get; set; } = string.Empty;
    public string? Message { get; set; }
    public string? SlaStage { get; set; }
    public string? SlaPolicy { get; set; }
    public int? SlaHours { get; set; }
    public DateTime? SlaDueAtUtc { get; set; }
    public int? SlaElapsedMinutes { get; set; }
    public string? SlaOutcome { get; set; }
    public bool? SlaBreached { get; set; }
}