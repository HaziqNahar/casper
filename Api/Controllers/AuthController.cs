using System.Security.Claims;
using Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
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

    public record LoginRequest(string Username, string Password, string? ReturnUrl);
    public record ConfirmPasswordRequest(string Password);
    public record ChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmNewPassword);

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("missing_username_or_password");

        var identifier = req.Username.Trim();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Username == identifier || u.Email == identifier);
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
            new(ClaimTypes.Role, user.IsAdmin ? "Admin" : "User"),
        };
        if (user.IsSuperAdmin)
        {
            claims.Add(new Claim(ClaimTypes.Role, "SuperAdmin"));
            claims.Add(new Claim("casper:is_super_admin", "true"));
        }

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

        return Ok(new
        {
            ok = true,
            username = user.Username,
            role = user.IsAdmin ? "Admin" : "User",
            isSuperAdmin = user.IsSuperAdmin,
            redirectUrl = !string.IsNullOrWhiteSpace(req.ReturnUrl)
                ? req.ReturnUrl
                : user.IsAdmin
                    ? "/admin/"
                    : _config["ClientApp:Origin"] ?? "/",
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { ok = true });
    }

    [Authorize]
    [HttpPost("confirm-password")]
    public async Task<IActionResult> ConfirmPassword([FromBody] ConfirmPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("missing_password");

        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(subject, out var userId))
            return Unauthorized();

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return Unauthorized();

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized("invalid_credentials");

        return Ok(new { ok = true });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!(User.Identity?.IsAuthenticated ?? false))
            return Unauthorized();

        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(subject, out var userId))
            return Unauthorized();

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return Unauthorized();

        return Ok(new
        {
            ok = true,
            sub = user.Id,
            username = user.Username,
            email = user.Email,
            role = user.IsAdmin ? "Admin" : "User",
            isSuperAdmin = user.IsSuperAdmin,
        });
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> Profile()
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(subject, out var userId))
            return Unauthorized();

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return Unauthorized();

        return Ok(new
        {
            ok = true,
            id = user.Id,
            username = user.Username,
            displayName = user.DisplayName,
            email = user.Email,
            role = user.IsAdmin ? "Admin" : "User",
            isSuperAdmin = user.IsSuperAdmin,
            status = user.Status,
            department = user.Department,
            onboardingStage = user.OnboardingStage,
            updatedAtUtc = user.UpdateTimeUtc,
        });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.CurrentPassword))
            return BadRequest("current_password_required");
        if (string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest("new_password_required");
        if (req.NewPassword.Trim().Length < 8)
            return BadRequest("new_password_too_short");
        if (!string.Equals(req.NewPassword, req.ConfirmNewPassword, StringComparison.Ordinal))
            return BadRequest("password_confirmation_mismatch");

        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(subject, out var userId))
            return Unauthorized();

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return Unauthorized();

        var verifyCurrent = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword);
        if (verifyCurrent == PasswordVerificationResult.Failed)
            return Unauthorized("invalid_current_password");

        if (string.Equals(req.CurrentPassword, req.NewPassword, StringComparison.Ordinal))
            return BadRequest("password_unchanged");

        user.PasswordHash = _hasher.HashPassword(user, req.NewPassword);
        user.UpdateTimeUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { ok = true });
    }
}