namespace Api.Data;

public class Realm
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = null!;
    public string Status { get; set; } = "Active";
    public bool MfaRequired { get; set; } = true;
    public string PasswordInheritance { get; set; } = "inherit";
    public int SessionTimeoutMins { get; set; } = 30;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<RealmApp> RealmApps { get; set; } = new();
    public List<RealmUser> RealmUsers { get; set; } = new();
}