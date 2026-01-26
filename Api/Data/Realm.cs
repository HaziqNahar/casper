namespace Api.Data;

public class Realm
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = null!;

    public List<RealmApp> RealmApps { get; set; } = new();
    public List<RealmUser> RealmUsers { get; set; } = new();
}
