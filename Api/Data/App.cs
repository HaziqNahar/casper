namespace Api.Data;

public class App
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = null!;
    public string ClientId { get; set; } = null!;
    public string ClientSecret { get; set; } = null!;
    public string[] RedirectUris { get; set; } = Array.Empty<string>();
    public List<RealmApp> RealmApps { get; set; } = new();
    public string[] PostLogoutRedirectUris { get; set; } = Array.Empty<string>();
    public string[] WebOrigins { get; set; } = Array.Empty<string>();
    public string Protocol { get; set; } = "oidc";
    public bool Enabled { get; set; } = true;
    public bool PublicClient { get; set; } = false;
    public bool ServiceAccountsEnabled { get; set; } = false;
    public bool StandardFlowEnabled { get; set; } = true;
    public bool DirectAccessGrantsEnabled { get; set; } = true;
    public bool ImplicitFlowEnabled { get; set; } = false;
    public string? RootUrl { get; set; }
    public string? BaseUrl { get; set; }
    public string? AdminUrl { get; set; }
    public string? Description { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}