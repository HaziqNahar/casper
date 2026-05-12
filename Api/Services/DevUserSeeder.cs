using Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public static class DevUserSeeder
{
    private sealed record SeedUser(
        string Username,
        string DisplayName,
        string Password,
        bool IsAdmin,
        bool IsSuperAdmin,
        string Status,
        string OnboardingStage,
        string Email,
        string? Department,
        string? UserType);

    private sealed record SeedRealm(string Name, string Status);
    private sealed record SeedApp(string Name, string ClientId, string ClientSecret, string[] RedirectUris, string RealmName, bool Enabled = true);
    private sealed record SeedRealmMembership(string Username, string RealmName, string RoleId);
    private sealed record SeedAppAccess(string Username, string RealmName, string ClientId);

    private static readonly SeedUser[] Users =
    {
        new("admin", "Admin User", "Admin@123!", true, true, "Active", "Activated", "admin@casper.local", "Security", "Internal"),
        new("tester", "Test User", "Test@123!", true, false, "Active", "Activated", "tester@casper.local", "Operations", "Internal"),
        new("viewer", "Viewer User", "View@123!", false, false, "Active", "Activated", "viewer@casper.local", "Audit", "Internal"),
        new("ops.manager", "Olivia Manager", "Ops@123!", false, false, "Active", "Activated", "olivia.manager@casper.local", "Operations", "Local"),
        new("finance.user", "Felix Finance", "Fin@123!", false, false, "Active", "Activated", "felix.finance@casper.local", "Finance", "Local"),
        new("sandbox.user", "Sasha Sandbox", "Sand@123!", false, false, "Active", "Activated", "sasha.sandbox@casper.local", "Engineering", "Local"),
    };

    private static readonly SeedRealm[] Realms =
    {
        new("Operations Realm", "Active"),
        new("Finance Realm", "Active"),
        new("Sandbox Realm", "Active"),
    };

    private static readonly SeedApp[] Apps =
    {
        new("Ops Web Portal", "ops-web", "ops-web-dev-secret", new[] { "https://ops.company.sg/*" }, "Operations Realm"),
        new("Ops Mobile", "ops-mobile", "ops-mobile-dev-secret", new[] { "com.company.ops://callback", "https://auth.company.sg/mobile/*" }, "Operations Realm"),
        new("Finance Web", "fin-web", "fin-web-dev-secret", new[] { "https://fin.company.sg/*" }, "Finance Realm"),
        new("Sandbox Console", "sandbox-console", "sandbox-console-dev-secret", new[] { "https://sandbox.company.sg/*" }, "Sandbox Realm"),
    };

    private static readonly SeedRealmMembership[] RealmMemberships =
    {
        new("admin", "Operations Realm", "realm_admin"),
        new("tester", "Operations Realm", "realm_admin"),
        new("ops.manager", "Operations Realm", "realm_manager"),
        new("finance.user", "Finance Realm", "realm_user"),
        new("viewer", "Finance Realm", "realm_auditor"),
        new("sandbox.user", "Sandbox Realm", "realm_user"),
    };

    private static readonly SeedAppAccess[] AppAccess =
    {
        new("admin", "Operations Realm", "ops-web"),
        new("tester", "Operations Realm", "ops-web"),
        new("ops.manager", "Operations Realm", "ops-web"),
        new("ops.manager", "Operations Realm", "ops-mobile"),
        new("finance.user", "Finance Realm", "fin-web"),
        new("viewer", "Finance Realm", "fin-web"),
        new("sandbox.user", "Sandbox Realm", "sandbox-console"),
    };

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        var usersByUsername = new Dictionary<string, User>(StringComparer.OrdinalIgnoreCase);

        foreach (var seed in Users)
        {
            var user = await db.Users.SingleOrDefaultAsync(u => u.Username == seed.Username, cancellationToken);

            if (user is null)
            {
                user = new User
                {
                    Username = seed.Username,
                    DisplayName = seed.DisplayName,
                    Email = seed.Email,
                    Department = seed.Department,
                    UserType = seed.UserType,
                    Status = seed.Status,
                    OnboardingStage = seed.OnboardingStage,
                    OnboardingReason = null,
                    IsAdmin = seed.IsAdmin,
                    IsSuperAdmin = seed.IsSuperAdmin,
                    CreateTimeUtc = DateTime.UtcNow,
                    UpdateTimeUtc = DateTime.UtcNow,
                };

                user.PasswordHash = hasher.HashPassword(user, seed.Password);
                db.Users.Add(user);
                continue;
            }

            user.DisplayName = seed.DisplayName;
            user.Email = seed.Email;
            user.Department = seed.Department;
            user.UserType = seed.UserType;
            user.Status = seed.Status;
            user.OnboardingStage = seed.OnboardingStage;
            user.OnboardingReason = null;
            user.IsAdmin = seed.IsAdmin;
            user.IsSuperAdmin = seed.IsSuperAdmin;
            user.UpdateTimeUtc = DateTime.UtcNow;
            user.PasswordHash = hasher.HashPassword(user, seed.Password);
            usersByUsername[seed.Username] = user;
        }

        await db.SaveChangesAsync(cancellationToken);

        foreach (var user in await db.Users.ToListAsync(cancellationToken))
        {
            usersByUsername[user.Username] = user;
        }

        var realmsByName = new Dictionary<string, Realm>(StringComparer.OrdinalIgnoreCase);

        foreach (var seed in Realms)
        {
            var realm = await db.Realms.SingleOrDefaultAsync(r => r.Name == seed.Name, cancellationToken);
            if (realm is null)
            {
                realm = new Realm
                {
                    Name = seed.Name,
                    Status = seed.Status,
                    MfaRequired = true,
                    PasswordInheritance = "inherit",
                    SessionTimeoutMins = 30,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow,
                };

                db.Realms.Add(realm);
            }
            else
            {
                realm.Status = seed.Status;
                realm.MfaRequired = true;
                realm.PasswordInheritance = "inherit";
                realm.SessionTimeoutMins = 30;
                realm.UpdatedAtUtc = DateTime.UtcNow;
            }

            realmsByName[seed.Name] = realm;
        }

        await db.SaveChangesAsync(cancellationToken);

        foreach (var realm in await db.Realms.ToListAsync(cancellationToken))
        {
            realmsByName[realm.Name] = realm;
        }

        var appsByClientId = new Dictionary<string, App>(StringComparer.OrdinalIgnoreCase);

        foreach (var seed in Apps)
        {
            var app = await db.Apps.SingleOrDefaultAsync(a => a.ClientId == seed.ClientId, cancellationToken);
            if (app is null)
            {
                app = new App
                {
                    Name = seed.Name,
                    ClientId = seed.ClientId,
                    ClientSecret = seed.ClientSecret,
                    RedirectUris = seed.RedirectUris,
                    Enabled = seed.Enabled,
                    Protocol = "oidc",
                    PublicClient = false,
                    ServiceAccountsEnabled = false,
                    StandardFlowEnabled = true,
                    DirectAccessGrantsEnabled = true,
                    ImplicitFlowEnabled = false,
                    WebOrigins = Array.Empty<string>(),
                    UpdatedAtUtc = DateTime.UtcNow,
                };

                db.Apps.Add(app);
            }
            else
            {
                app.Name = seed.Name;
                app.ClientSecret = seed.ClientSecret;
                app.RedirectUris = seed.RedirectUris;
                app.Enabled = seed.Enabled;
                app.Protocol = "oidc";
                app.PublicClient = false;
                app.ServiceAccountsEnabled = false;
                app.StandardFlowEnabled = true;
                app.DirectAccessGrantsEnabled = true;
                app.ImplicitFlowEnabled = false;
                app.WebOrigins = app.WebOrigins ?? Array.Empty<string>();
                app.UpdatedAtUtc = DateTime.UtcNow;
            }

            appsByClientId[seed.ClientId] = app;
        }

        await db.SaveChangesAsync(cancellationToken);

        foreach (var app in await db.Apps.ToListAsync(cancellationToken))
        {
            appsByClientId[app.ClientId] = app;
        }

        foreach (var seed in Apps)
        {
            if (!realmsByName.TryGetValue(seed.RealmName, out var realm)) continue;
            if (!appsByClientId.TryGetValue(seed.ClientId, out var app)) continue;

            var realmAppExists = await db.RealmApps.AnyAsync(
                ra => ra.RealmId == realm.Id && ra.AppId == app.Id,
                cancellationToken);

            if (!realmAppExists)
            {
                db.RealmApps.Add(new RealmApp
                {
                    RealmId = realm.Id,
                    AppId = app.Id,
                });
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        foreach (var seed in RealmMemberships)
        {
            if (!usersByUsername.TryGetValue(seed.Username, out var user)) continue;
            if (!realmsByName.TryGetValue(seed.RealmName, out var realm)) continue;

            var membershipExists = await db.RealmUsers.AnyAsync(
                ru => ru.UserId == user.Id && ru.RealmId == realm.Id,
                cancellationToken);

            if (!membershipExists)
            {
                db.RealmUsers.Add(new RealmUser
                {
                    RealmId = realm.Id,
                    UserId = user.Id,
                    RoleId = seed.RoleId,
                });
            }
            else
            {
                var membership = await db.RealmUsers.SingleAsync(
                    ru => ru.UserId == user.Id && ru.RealmId == realm.Id,
                    cancellationToken);
                membership.RoleId = seed.RoleId;
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        var realmApps = await db.RealmApps
            .AsNoTracking()
            .Include(ra => ra.App)
            .Include(ra => ra.Realm)
            .ToListAsync(cancellationToken);

        foreach (var seed in AppAccess)
        {
            if (!usersByUsername.TryGetValue(seed.Username, out var user)) continue;

            var realmApp = realmApps.FirstOrDefault(ra =>
                string.Equals(ra.Realm.Name, seed.RealmName, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(ra.App.ClientId, seed.ClientId, StringComparison.OrdinalIgnoreCase));

            if (realmApp is null) continue;

            var accessExists = await db.AppUsers.AnyAsync(
                au => au.UserId == user.Id && au.RealmAppId == realmApp.Id,
                cancellationToken);

            if (!accessExists)
            {
                db.AppUsers.Add(new AppUser
                {
                    RealmAppId = realmApp.Id,
                    UserId = user.Id,
                });
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}