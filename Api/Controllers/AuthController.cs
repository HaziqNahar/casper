using System.Security.Claims;
using Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("auth/api")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _hasher;
    private readonly IConfiguration _config;

    public AuthController(AppDbContext db, IPasswordHasher<User> hasher, IConfiguration config)
    {
        _db = db;
        _hasher = hasher;
        _config = config;
    }

    public record LoginRequest(string Username, string Password);

    // POST /auth/api/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("missing_username_or_password");

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Username == req.Username);
        if (user == null)
            return Unauthorized("invalid_credentials");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized("invalid_credentials");

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _hasher.HashPassword(user, req.Password);
            await _db.SaveChangesAsync();
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),

            // ✅ Add role claim (adjust how you detect admin)
            new(ClaimTypes.Role, user.IsAdmin ? "Admin" : "User"),
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8),
                AllowRefresh = true
            });

       var isAdmin = user.IsAdmin; // or: user.Role == "Admin"

       // ✅ Admin stays in this app
       if (isAdmin)
       {
           return Redirect("/admin/");
       }

       // ✅ User goes to client app (external redirect)
       var clientApp = _config["ClientApp:Origin"]; // e.g. "http://localhost:3000"
       return Redirect($"{clientApp}/"); // or your specific client route
    }

    // POST /auth/api/logout
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { ok = true });
    }

    // GET /auth/api/me
    [HttpGet("me")]
    public IActionResult Me()
    {
        if (!(User.Identity?.IsAuthenticated ?? false))
            return Unauthorized();

        return Ok(new
        {
            ok = true,
            sub = User.FindFirstValue(ClaimTypes.NameIdentifier),
            username = User.FindFirstValue(ClaimTypes.Name),
        });
    }
}
