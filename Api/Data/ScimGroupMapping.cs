namespace Api.Data;

public class ScimGroupMapping
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? ScimExternalId { get; set; }
    public string DisplayName { get; set; } = null!;
    public Guid RealmId { get; set; }
    public Realm Realm { get; set; } = null!;
    public string RoleId { get; set; } = "realm_user";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}