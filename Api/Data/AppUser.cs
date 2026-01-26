namespace Api.Data;

public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
     public Guid RealmAppId { get; set; }
    public RealmApp RealmApp { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
