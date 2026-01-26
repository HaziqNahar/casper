using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api.Data;
using Api.Services;
using System.Text;
using SecClaim = System.Security.Claims.Claim;
using Api.Controllers;

[ApiController]
public class OAuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokenService;

    public OAuthController(AppDbContext db, TokenService tokenService)
    {
         _db = db;
        _tokenService = tokenService;
    }

    [HttpGet("/login")]
    public async Task<IActionResult> Login(
        [FromQuery(Name = "response_type")] string responseType,
        [FromQuery(Name = "client_id")] string clientId,
        [FromQuery(Name = "scope")] string scope,
        [FromQuery(Name = "redirect_uri")] string redirect_uri,
        [FromQuery(Name = "state")] string state)
       {
        Console.WriteLine("HIT: OAuthController.Login (new)");

        //to update with authorizationcode here
        if(responseType != "code")
            return BadRequest("invalid_response_type");

        var scopes = (scope ?? "")
            .Trim()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => s.Trim().ToLowerInvariant())
            .ToArray();

        Console.WriteLine("scopes parsed: " + string.Join(",", scopes));

        if (!scopes.Contains("openid"))
            return BadRequest("invalid_scope");


        //look up app by client_id
        var app = await _db.Apps.SingleOrDefaultAsync(a => a.ClientId == clientId);
        if(app == null)
            return BadRequest("appnotfound");
        if(!app.RedirectUris.Contains(redirect_uri))
            return BadRequest("invalid_redirect_uri");

        var code = Guid.NewGuid().ToString("N");

        var user = await _db.Users.FirstAsync(); 

        var authCode = new AuthorizationCode
        {
            Code = code,
            AppId = app.Id,
            RedirectUri = redirect_uri,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(15),
            Used = false,
            UserId = user.Id
        };

        _db.AuthorizationCodes.Add(authCode);
        await _db.SaveChangesAsync();

        var redirect = $"{redirect_uri}?code={code}&state={Uri.EscapeDataString(state)}";
        return Redirect(redirect);
    }

    [HttpPost("token")]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> Token(
        [FromForm] string grant_type,
        [FromForm] string client_id,
        [FromForm] string code,
        [FromForm] string redirect_uri)
    {
        if (grant_type != "authorization_code")
            return BadRequest("unsupported_grant_type");

        // --- Basic auth: Authorization: Basic base64(client_id:client_secret)
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return Unauthorized("missing_authorization");

        var (basicClientId, basicSecret) = ParseBasicAuth(authHeader.ToString());
        if (basicClientId == null) return Unauthorized("invalid_basic_auth");

        if (basicClientId != client_id) return Unauthorized("client_id_mismatch");

        var app = await _db.Apps.SingleOrDefaultAsync(a => a.ClientId == client_id);
        if (app == null) return Unauthorized("invalid_client");

        if (app.ClientSecret != basicSecret) return Unauthorized("invalid_client_secret");

        // --- Validate the authorization code
        var authCode = await _db.AuthorizationCodes.SingleOrDefaultAsync(c => c.Code == code);
        if (authCode == null) return BadRequest("invalid_code");
        if (authCode.Used) return BadRequest("code_already_used");
        if (authCode.ExpiresAtUtc < DateTime.UtcNow) return BadRequest("code_expired");
        if (authCode.RedirectUri != redirect_uri) return BadRequest("invalid_redirect_uri");
        if (authCode.AppId != app.Id) return BadRequest("code_not_for_client");

        // mark used
        authCode.Used = true;
        authCode.CreatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var user = await _db.Users.SingleAsync(u => u.Id == authCode.UserId); // adjust to your schema

        var issuer = "http://localhost:5000";     // later: config
        var audience = app.ClientId;              // must match client_id

        var extraClaims = new SecClaim[]
        {
            new SecClaim(type: "username", user.Username),
            new SecClaim(type: "displayName", user.DisplayName ?? ""),
            // new SecClaim(type:"email", user.Email ?? "")
        };

        var idToken = _tokenService.CreateIdToken(
            issuer: issuer,
            audience: audience,
            subject: user.Id.ToString(),
            extraClaims: extraClaims,
            expiresMinutes: 30
        );

        return Ok(new { scope = "openid", id_token = idToken });

    }

    private static (string? clientId, string? secret) ParseBasicAuth(string header)
    {
        if (!header.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            return (null, null);

        var encoded = header.Substring("Basic ".Length).Trim();
        byte[] bytes;
        try { bytes = Convert.FromBase64String(encoded); }
        catch { return (null, null); }

        var decoded = Encoding.UTF8.GetString(bytes);
        var parts = decoded.Split(':', 2);
        if (parts.Length != 2) return (null, null);

        return (parts[0], parts[1]);
    }
}
