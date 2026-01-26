namespace Api.Data;

public class RealmApp
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RealmId { get; set; }
    public Realm Realm { get; set; } = null!;
    public Guid AppId { get; set; }
    public App App { get; set; } = null!;

    public List<AppUser> AppUsers { get; set; } = new();
}
