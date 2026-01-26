namespace Api.Data;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public DateTime CreateTimeUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdateTimeUtc { get; set; } = DateTime.UtcNow;
    public List<RealmUser> RealmUsers { get; set; } = new();
    public List<AppUser> AppUsers { get; set; } = new();
}
