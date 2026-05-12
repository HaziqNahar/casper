namespace Api.Data;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? ScimExternalId { get; set; }
    public string ProvisioningSource { get; set; } = "Manual";
    public DateTime? LastScimSyncAtUtc { get; set; }
    public bool IsScimManaged { get; set; } = false;
    public string Status { get; set; } = "Active";
    public string OnboardingStage { get; set; } = "Activated";
    public string? OnboardingReason { get; set; }
    public string? Department { get; set; }
    public string? UserType { get; set; }
    public string PasswordHash { get; set; } = null!;
    public DateTime CreateTimeUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdateTimeUtc { get; set; } = DateTime.UtcNow;
    public List<RealmUser> RealmUsers { get; set; } = new();
    public List<AppUser> AppUsers { get; set; } = new();
    public bool IsAdmin { get; set; } = false;
    public bool IsSuperAdmin { get; set; } = false;
}