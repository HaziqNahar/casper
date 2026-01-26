namespace Api.Data;

public class App
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = null!;
    public string ClientId { get; set; } = null!;
    public string ClientSecret { get; set; } = null!;
    public string[] RedirectUris { get; set; } = Array.Empty<string>();
    public List<RealmApp> RealmApps { get; set; } = new();
}
