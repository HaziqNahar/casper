namespace Api.Data;

public class RealmUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RealmId { get; set; }
    public Realm Realm { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
