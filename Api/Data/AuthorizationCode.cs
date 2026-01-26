namespace Api.Data;

public class AuthorizationCode
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Code { get; set; } = null!;

    public Guid AppId { get; set; }
    public App App { get; set; } = null!;

    public string RedirectUri { get; set; } = null!;

    public DateTime ExpiresAtUtc { get; set; }

    public bool Used { get; set; } = false;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}
