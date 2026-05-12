using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("scim/v2")]
public class ScimController : ControllerBase
{
    private static readonly Regex ScimFilterRegex = new(
        "^(userName|externalId|id)\\s+eq\\s+\"([^\"]+)\"$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex ScimGroupFilterRegex = new(
        "^(displayName|externalId|id)\\s+eq\\s+\"([^\"]+)\"$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _hasher;
    private readonly IConfiguration _config;

    public ScimController(AppDbContext db, IPasswordHasher<User> hasher, IConfiguration config)
    {
        _db = db;
        _hasher = hasher;
        _config = config;
    }

    public record ScimName(string? GivenName, string? FamilyName);
    public record ScimEmail(string? Value, string? Type, bool? Primary);
    public record ScimUserRequest(
        List<string>? Schemas,
        string? ExternalId,
        string UserName,
        ScimName? Name,
        string? DisplayName,
        List<ScimEmail>? Emails,
        bool? Active);
    public record ScimMember(string Value, string? Display = null);
    public record ScimRealmRoleExtension(string RealmId, string RoleId);
    public record ScimGroupRequest(
        List<string>? Schemas,
        string? ExternalId,
        string DisplayName,
        List<ScimMember>? Members,
        ScimRealmRoleExtension? RealmRole);
    public record ScimPatchOperation(string? Op, string? Path, JsonElement Value);
    public record ScimPatchRequest(List<string>? Schemas, List<ScimPatchOperation>? Operations);

    [HttpGet("ServiceProviderConfig")]
    public IActionResult ServiceProviderConfig()
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        return Ok(new
        {
            schemas = new[] { "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig" },
            patch = new { supported = true },
            bulk = new { supported = false, maxOperations = 0, maxPayloadSize = 0 },
            filter = new { supported = true, maxResults = 100 },
            changePassword = new { supported = false },
            sort = new { supported = false },
            etag = new { supported = false },
            authenticationSchemes = new[]
            {
                new
                {
                    type = "oauthbearertoken",
                    name = "Bearer Token",
                    description = "Static bearer token for SCIM provisioning",
                    specUri = "https://datatracker.ietf.org/doc/html/rfc6750",
                    primary = true
                }
            }
        });
    }

    [HttpGet("Schemas")]
    public IActionResult Schemas()
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        return Ok(new
        {
            Resources = new object[]
            {
                new
                {
                    id = "urn:ietf:params:scim:schemas:core:2.0:User",
                    name = "User",
                    description = "SCIM core user",
                    attributes = new object[]
                    {
                        new { name = "userName", type = "string", multiValued = false, required = true, mutability = "readWrite", returned = "default", uniqueness = "server" },
                        new { name = "externalId", type = "string", multiValued = false, required = false, mutability = "readWrite", returned = "default", uniqueness = "none" },
                        new { name = "displayName", type = "string", multiValued = false, required = false, mutability = "readWrite", returned = "default", uniqueness = "none" },
                        new { name = "active", type = "boolean", multiValued = false, required = false, mutability = "readWrite", returned = "default", uniqueness = "none" },
                    }
                },
                new
                {
                    id = "urn:ietf:params:scim:schemas:core:2.0:Group",
                    name = "Group",
                    description = "SCIM core group mapped to a realm role",
                    attributes = new object[]
                    {
                        new { name = "displayName", type = "string", multiValued = false, required = true, mutability = "readWrite", returned = "default", uniqueness = "server" },
                        new { name = "externalId", type = "string", multiValued = false, required = false, mutability = "readWrite", returned = "default", uniqueness = "none" },
                        new { name = "members", type = "complex", multiValued = true, required = false, mutability = "readWrite", returned = "default", uniqueness = "none" },
                    }
                },
                new
                {
                    id = "urn:certis:params:scim:schemas:extension:realm-role:2.0:Group",
                    name = "RealmRoleGroup",
                    description = "Realm and role mapping for a SCIM group",
                    attributes = new object[]
                    {
                        new { name = "realmId", type = "string", multiValued = false, required = true, mutability = "readWrite", returned = "default", uniqueness = "none" },
                        new { name = "roleId", type = "string", multiValued = false, required = true, mutability = "readWrite", returned = "default", uniqueness = "none" },
                    }
                }
            },
            totalResults = 3,
            startIndex = 1,
            itemsPerPage = 3,
            schemas = new[] { "urn:ietf:params:scim:api:messages:2.0:ListResponse" }
        });
    }

    [HttpGet("ResourceTypes")]
    public IActionResult ResourceTypes()
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        return Ok(new
        {
            Resources = new object[]
            {
                new
                {
                    id = "User",
                    name = "User",
                    endpoint = "/Users",
                    schema = "urn:ietf:params:scim:schemas:core:2.0:User"
                },
                new
                {
                    id = "Group",
                    name = "Group",
                    endpoint = "/Groups",
                    schema = "urn:ietf:params:scim:schemas:core:2.0:Group",
                    schemaExtensions = new[]
                    {
                        new
                        {
                            schema = "urn:certis:params:scim:schemas:extension:realm-role:2.0:Group",
                            required = true
                        }
                    }
                }
            },
            totalResults = 2,
            startIndex = 1,
            itemsPerPage = 2,
            schemas = new[] { "urn:ietf:params:scim:api:messages:2.0:ListResponse" }
        });
    }

    [HttpGet("Users")]
    public async Task<IActionResult> Users([FromQuery] int? startIndex, [FromQuery] int? count, [FromQuery] string? filter)
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        var query = _db.Users.AsNoTracking().OrderBy(u => u.Username).AsQueryable();
        query = ApplyUserFilter(query, filter);

        var pageStart = Math.Max(startIndex ?? 1, 1);
        var pageCount = Math.Clamp(count ?? 100, 1, 100);
        var total = await query.CountAsync();
        var users = await query.Skip(pageStart - 1).Take(pageCount).ToListAsync();

        return Ok(new
        {
            schemas = new[] { "urn:ietf:params:scim:api:messages:2.0:ListResponse" },
            totalResults = total,
            startIndex = pageStart,
            itemsPerPage = users.Count,
            Resources = users.Select(ToScimUserResource).ToList()
        });
    }

    [HttpGet("Users/{id}")]
    public async Task<IActionResult> UserById([FromRoute] Guid id)
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        var user = await _db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == id);
        if (user is null)
            return ScimError(StatusCodes.Status404NotFound, "User not found.");

        return Ok(ToScimUserResource(user));
    }

    [HttpPost("Users")]
    public async Task<IActionResult> CreateUser([FromBody] ScimUserRequest req)
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        if (string.IsNullOrWhiteSpace(req.UserName))
            return ScimError(StatusCodes.Status400BadRequest, "userName is required.");

        var normalizedUsername = req.UserName.Trim();
        var normalizedEmail = GetPrimaryEmail(req.Emails) ?? $"{normalizedUsername}@casper.local";
        var displayName = BuildDisplayName(req.DisplayName, req.Name, normalizedUsername);
        var active = req.Active ?? true;

        var existing = !string.IsNullOrWhiteSpace(req.ExternalId)
            ? await _db.Users.SingleOrDefaultAsync(u => u.ScimExternalId == req.ExternalId)
            : await _db.Users.SingleOrDefaultAsync(u => u.Username == normalizedUsername || u.Email == normalizedEmail);

        var before = existing is null ? null : BuildAuditSnapshot(existing);

        if (existing is null)
        {
            var user = new User
            {
                Username = normalizedUsername,
                Email = normalizedEmail,
                DisplayName = displayName,
                Status = active ? "Active" : "Inactive",
                OnboardingStage = active ? "Provisioned" : "Inactive",
                OnboardingReason = "Provisioned via SCIM",
                PasswordHash = _hasher.HashPassword(new User(), GenerateScimPassword()),
                ScimExternalId = string.IsNullOrWhiteSpace(req.ExternalId) ? null : req.ExternalId.Trim(),
                ProvisioningSource = "SCIM",
                IsScimManaged = true,
                LastScimSyncAtUtc = DateTime.UtcNow,
                CreateTimeUtc = DateTime.UtcNow,
                UpdateTimeUtc = DateTime.UtcNow,
                UserType = "Internal",
                IsAdmin = false,
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            await WriteScimAuditAsync(
                entityType: "user",
                entityId: user.Id.ToString(),
                entityName: user.DisplayName,
                action: "scim_create",
                details: $"Provisioned {user.Username} via SCIM",
                before: null,
                after: BuildAuditSnapshot(user),
                metadata: new { source = "scim", externalId = user.ScimExternalId, active = active },
                result: "success");

            return Created($"/scim/v2/Users/{user.Id}", ToScimUserResource(user));
        }

        existing.Username = normalizedUsername;
        existing.Email = normalizedEmail;
        existing.DisplayName = displayName;
        existing.Status = active ? "Active" : "Inactive";
        existing.OnboardingStage = active ? "Provisioned" : "Inactive";
        existing.OnboardingReason = "Provisioned via SCIM";
        existing.ScimExternalId = string.IsNullOrWhiteSpace(req.ExternalId) ? existing.ScimExternalId : req.ExternalId.Trim();
        existing.ProvisioningSource = "SCIM";
        existing.IsScimManaged = true;
        existing.LastScimSyncAtUtc = DateTime.UtcNow;
        existing.UpdateTimeUtc = DateTime.UtcNow;

        if (!active)
            await DeprovisionAccessAsync(existing.Id);

        await _db.SaveChangesAsync();

        await WriteScimAuditAsync(
            entityType: "user",
            entityId: existing.Id.ToString(),
            entityName: existing.DisplayName,
            action: "scim_upsert",
            details: $"Updated {existing.Username} via SCIM create/upsert",
            before: before,
            after: BuildAuditSnapshot(existing),
            metadata: new { source = "scim", externalId = existing.ScimExternalId, active = active },
            result: "success");

        return Ok(ToScimUserResource(existing));
    }

    [HttpPatch("Users/{id}")]
    public async Task<IActionResult> PatchUser([FromRoute] Guid id, [FromBody] ScimPatchRequest req)
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == id);
        if (user is null)
            return ScimError(StatusCodes.Status404NotFound, "User not found.");

        if (req.Operations is null || req.Operations.Count == 0)
            return ScimError(StatusCodes.Status400BadRequest, "PATCH operations are required.");

        var before = BuildAuditSnapshot(user);

        foreach (var operation in req.Operations)
        {
            ApplyPatchOperation(user, operation);
        }

        user.ProvisioningSource = "SCIM";
        user.IsScimManaged = true;
        user.LastScimSyncAtUtc = DateTime.UtcNow;
        user.UpdateTimeUtc = DateTime.UtcNow;

        if (string.Equals(user.Status, "Inactive", StringComparison.OrdinalIgnoreCase))
            await DeprovisionAccessAsync(user.Id);

        await _db.SaveChangesAsync();

        await WriteScimAuditAsync(
            entityType: "user",
            entityId: user.Id.ToString(),
            entityName: user.DisplayName,
            action: "scim_update",
            details: $"Patched {user.Username} via SCIM",
            before: before,
            after: BuildAuditSnapshot(user),
            metadata: new { source = "scim", operationCount = req.Operations.Count },
            result: "success");

        return Ok(ToScimUserResource(user));
    }

    [HttpDelete("Users/{id}")]
    public async Task<IActionResult> DeleteUser([FromRoute] Guid id)
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == id);
        if (user is null)
            return NoContent();

        var before = BuildAuditSnapshot(user);
        user.Status = "Inactive";
        user.OnboardingStage = "Inactive";
        user.OnboardingReason = "Deprovisioned via SCIM";
        user.ProvisioningSource = "SCIM";
        user.IsScimManaged = true;
        user.LastScimSyncAtUtc = DateTime.UtcNow;
        user.UpdateTimeUtc = DateTime.UtcNow;

        await DeprovisionAccessAsync(user.Id);
        await _db.SaveChangesAsync();

        await WriteScimAuditAsync(
            entityType: "user",
            entityId: user.Id.ToString(),
            entityName: user.DisplayName,
            action: "scim_deprovision",
            details: $"Deprovisioned {user.Username} via SCIM",
            before: before,
            after: BuildAuditSnapshot(user),
            metadata: new { source = "scim", deprovisioned = true },
            result: "success");

        return NoContent();
    }

    [HttpGet("Groups")]
    public async Task<IActionResult> Groups([FromQuery] int? startIndex, [FromQuery] int? count, [FromQuery] string? filter)
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        var query = _db.ScimGroupMappings
            .AsNoTracking()
            .Include(g => g.Realm)
            .OrderBy(g => g.DisplayName)
            .AsQueryable();
        query = ApplyGroupFilter(query, filter);

        var pageStart = Math.Max(startIndex ?? 1, 1);
        var pageCount = Math.Clamp(count ?? 100, 1, 100);
        var total = await query.CountAsync();
        var groups = await query.Skip(pageStart - 1).Take(pageCount).ToListAsync();
        var resources = new List<object>(groups.Count);
        foreach (var group in groups)
        {
            resources.Add(await ToScimGroupResourceAsync(group));
        }

        return Ok(new
        {
            schemas = new[] { "urn:ietf:params:scim:api:messages:2.0:ListResponse" },
            totalResults = total,
            startIndex = pageStart,
            itemsPerPage = resources.Count,
            Resources = resources
        });
    }

    [HttpGet("Groups/{id}")]
    public async Task<IActionResult> GroupById([FromRoute] Guid id)
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        var group = await _db.ScimGroupMappings
            .AsNoTracking()
            .Include(g => g.Realm)
            .SingleOrDefaultAsync(g => g.Id == id);
        if (group is null)
            return ScimError(StatusCodes.Status404NotFound, "Group not found.");

        return Ok(await ToScimGroupResourceAsync(group));
    }

    [HttpPost("Groups")]
    public async Task<IActionResult> CreateGroup([FromBody] ScimGroupRequest req)
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        if (string.IsNullOrWhiteSpace(req.DisplayName))
            return ScimError(StatusCodes.Status400BadRequest, "displayName is required.");
        if (req.RealmRole is null || !Guid.TryParse(req.RealmRole.RealmId, out var realmId))
            return ScimError(StatusCodes.Status400BadRequest, "realmId is required for SCIM groups.");
        if (string.IsNullOrWhiteSpace(req.RealmRole.RoleId))
            return ScimError(StatusCodes.Status400BadRequest, "roleId is required for SCIM groups.");

        var realm = await _db.Realms.SingleOrDefaultAsync(r => r.Id == realmId);
        if (realm is null)
            return ScimError(StatusCodes.Status400BadRequest, "realmId does not reference an existing realm.");

        var displayName = req.DisplayName.Trim();
        var roleId = req.RealmRole.RoleId.Trim();
        var existing = !string.IsNullOrWhiteSpace(req.ExternalId)
            ? await _db.ScimGroupMappings.Include(g => g.Realm).SingleOrDefaultAsync(g => g.ScimExternalId == req.ExternalId)
            : await _db.ScimGroupMappings.Include(g => g.Realm).SingleOrDefaultAsync(g => g.RealmId == realmId && g.RoleId == roleId && g.DisplayName == displayName);

        if (existing is null)
        {
            var group = new ScimGroupMapping
            {
                DisplayName = displayName,
                ScimExternalId = string.IsNullOrWhiteSpace(req.ExternalId) ? null : req.ExternalId.Trim(),
                RealmId = realmId,
                RoleId = roleId,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };

            _db.ScimGroupMappings.Add(group);
            await _db.SaveChangesAsync();

            await SyncGroupMembersAsync(group, req.Members, isReplace: true);
            await WriteScimAuditAsync(
                entityType: "realm_role_group",
                entityId: group.Id.ToString(),
                entityName: group.DisplayName,
                action: "scim_group_create",
                details: $"Created SCIM group mapping for {realm.Name} / {roleId}",
                before: null,
                after: BuildGroupAuditSnapshot(group, realm.Name),
                metadata: new { source = "scim", realmId, realmName = realm.Name, roleId, memberCount = req.Members?.Count ?? 0 },
                result: "success");

            var created = await _db.ScimGroupMappings.AsNoTracking().Include(g => g.Realm).SingleAsync(g => g.Id == group.Id);
            return Created($"/scim/v2/Groups/{group.Id}", await ToScimGroupResourceAsync(created));
        }

        var before = BuildGroupAuditSnapshot(existing, existing.Realm.Name);
        existing.DisplayName = displayName;
        existing.ScimExternalId = string.IsNullOrWhiteSpace(req.ExternalId) ? existing.ScimExternalId : req.ExternalId.Trim();
        existing.RealmId = realmId;
        existing.RoleId = roleId;
        existing.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await SyncGroupMembersAsync(existing, req.Members, isReplace: true);
        await WriteScimAuditAsync(
            entityType: "realm_role_group",
            entityId: existing.Id.ToString(),
            entityName: existing.DisplayName,
            action: "scim_group_upsert",
            details: $"Updated SCIM group mapping for {realm.Name} / {roleId}",
            before: before,
            after: BuildGroupAuditSnapshot(existing, realm.Name),
            metadata: new { source = "scim", realmId, realmName = realm.Name, roleId, memberCount = req.Members?.Count ?? 0 },
            result: "success");

        var updated = await _db.ScimGroupMappings.AsNoTracking().Include(g => g.Realm).SingleAsync(g => g.Id == existing.Id);
        return Ok(await ToScimGroupResourceAsync(updated));
    }

    [HttpPatch("Groups/{id}")]
    public async Task<IActionResult> PatchGroup([FromRoute] Guid id, [FromBody] ScimPatchRequest req)
    {
        var unauthorized = EnsureAuthorized();
        if (unauthorized is not null)
            return unauthorized;

        var group = await _db.ScimGroupMappings.Include(g => g.Realm).SingleOrDefaultAsync(g => g.Id == id);
        if (group is null)
            return ScimError(StatusCodes.Status404NotFound, "Group not found.");
        if (req.Operations is null || req.Operations.Count == 0)
            return ScimError(StatusCodes.Status400BadRequest, "PATCH operations are required.");

        var before = BuildGroupAuditSnapshot(group, group.Realm.Name);

        foreach (var operation in req.Operations)
        {
            await ApplyGroupPatchOperationAsync(group, operation);
        }

        group.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        var realmName = await _db.Realms
            .Where(r => r.Id == group.RealmId)
            .Select(r => r.Name)
            .SingleAsync();

        await WriteScimAuditAsync(
            entityType: "realm_role_group",
            entityId: group.Id.ToString(),
            entityName: group.DisplayName,
            action: "scim_group_update",
            details: $"Patched SCIM group mapping for {realmName} / {group.RoleId}",
            before: before,
            after: BuildGroupAuditSnapshot(group, realmName),
            metadata: new { source = "scim", operationCount = req.Operations.Count, realmId = group.RealmId, roleId = group.RoleId },
            result: "success");

        var updated = await _db.ScimGroupMappings.AsNoTracking().Include(g => g.Realm).SingleAsync(g => g.Id == group.Id);
        return Ok(await ToScimGroupResourceAsync(updated));
    }

    private IQueryable<User> ApplyUserFilter(IQueryable<User> query, string? filter)
    {
        if (string.IsNullOrWhiteSpace(filter))
            return query;

        var match = ScimFilterRegex.Match(filter.Trim());
        if (!match.Success)
            return query.Where(_ => false);

        var field = match.Groups[1].Value;
        var value = match.Groups[2].Value.Trim();

        return field.ToLowerInvariant() switch
        {
            "username" => query.Where(u => u.Username == value),
            "externalid" => query.Where(u => u.ScimExternalId == value),
            "id" when Guid.TryParse(value, out var userId) => query.Where(u => u.Id == userId),
            _ => query.Where(_ => false)
        };
    }

    private IQueryable<ScimGroupMapping> ApplyGroupFilter(IQueryable<ScimGroupMapping> query, string? filter)
    {
        if (string.IsNullOrWhiteSpace(filter))
            return query;

        var match = ScimGroupFilterRegex.Match(filter.Trim());
        if (!match.Success)
            return query.Where(_ => false);

        var field = match.Groups[1].Value;
        var value = match.Groups[2].Value.Trim();

        return field.ToLowerInvariant() switch
        {
            "displayname" => query.Where(g => g.DisplayName == value),
            "externalid" => query.Where(g => g.ScimExternalId == value),
            "id" when Guid.TryParse(value, out var groupId) => query.Where(g => g.Id == groupId),
            _ => query.Where(_ => false)
        };
    }

    private void ApplyPatchOperation(User user, ScimPatchOperation operation)
    {
        var op = (operation.Op ?? "replace").Trim().ToLowerInvariant();
        var path = (operation.Path ?? string.Empty).Trim();

        if (op is not ("replace" or "add" or "remove"))
            return;

        if (string.IsNullOrWhiteSpace(path))
        {
            ApplyWholeObjectPatch(user, operation.Value, op);
            return;
        }

        switch (path.ToLowerInvariant())
        {
            case "username":
                if (op == "remove")
                    return;
                if (operation.Value.ValueKind == JsonValueKind.String)
                    user.Username = operation.Value.GetString()!.Trim();
                break;
            case "displayname":
                if (op == "remove")
                {
                    user.DisplayName = user.Username;
                    break;
                }
                if (operation.Value.ValueKind == JsonValueKind.String)
                    user.DisplayName = operation.Value.GetString()!.Trim();
                break;
            case "externalid":
                user.ScimExternalId = op == "remove" ? null : operation.Value.GetString()?.Trim();
                break;
            case "active":
                if (operation.Value.ValueKind is JsonValueKind.True or JsonValueKind.False)
                {
                    var isActive = operation.Value.GetBoolean();
                    user.Status = isActive ? "Active" : "Inactive";
                    user.OnboardingStage = isActive ? "Provisioned" : "Inactive";
                    user.OnboardingReason = isActive ? "Provisioned via SCIM" : "Deprovisioned via SCIM";
                }
                break;
            case "emails":
                if (op == "remove")
                {
                    user.Email = $"{user.Username}@casper.local";
                    break;
                }
                if (operation.Value.ValueKind == JsonValueKind.Array)
                {
                    var email = ExtractPrimaryEmail(operation.Value);
                    if (!string.IsNullOrWhiteSpace(email))
                        user.Email = email;
                }
                break;
            case "name.givenname":
            case "name.familyname":
                // This first slice preserves displayName as the effective name field.
                break;
        }
    }

    private void ApplyWholeObjectPatch(User user, JsonElement value, string op)
    {
        if (op == "remove" || value.ValueKind != JsonValueKind.Object)
            return;

        if (value.TryGetProperty("userName", out var userNameValue) && userNameValue.ValueKind == JsonValueKind.String)
            user.Username = userNameValue.GetString()!.Trim();

        if (value.TryGetProperty("displayName", out var displayNameValue) && displayNameValue.ValueKind == JsonValueKind.String)
            user.DisplayName = displayNameValue.GetString()!.Trim();

        if (value.TryGetProperty("externalId", out var externalIdValue) && externalIdValue.ValueKind == JsonValueKind.String)
            user.ScimExternalId = externalIdValue.GetString()!.Trim();

        if (value.TryGetProperty("active", out var activeValue) && activeValue.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            var isActive = activeValue.GetBoolean();
            user.Status = isActive ? "Active" : "Inactive";
            user.OnboardingStage = isActive ? "Provisioned" : "Inactive";
            user.OnboardingReason = isActive ? "Provisioned via SCIM" : "Deprovisioned via SCIM";
        }

        if (value.TryGetProperty("emails", out var emailsValue) && emailsValue.ValueKind == JsonValueKind.Array)
        {
            var email = ExtractPrimaryEmail(emailsValue);
            if (!string.IsNullOrWhiteSpace(email))
                user.Email = email;
        }
    }

    private string? GetPrimaryEmail(List<ScimEmail>? emails)
        => emails?
            .OrderByDescending(email => email.Primary ?? false)
            .Select(email => email.Value?.Trim())
            .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

    private string? ExtractPrimaryEmail(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Array)
            return null;

        string? fallback = null;
        foreach (var element in value.EnumerateArray())
        {
            if (element.ValueKind != JsonValueKind.Object)
                continue;

            if (!element.TryGetProperty("value", out var emailValue) || emailValue.ValueKind != JsonValueKind.String)
                continue;

            var nextEmail = emailValue.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(nextEmail))
                continue;

            if (fallback is null)
                fallback = nextEmail;

            if (element.TryGetProperty("primary", out var primaryValue) &&
                primaryValue.ValueKind is JsonValueKind.True or JsonValueKind.False &&
                primaryValue.GetBoolean())
                return nextEmail;
        }

        return fallback;
    }

    private static string BuildDisplayName(string? displayName, ScimName? name, string fallbackUsername)
    {
        if (!string.IsNullOrWhiteSpace(displayName))
            return displayName.Trim();

        var parts = new[] { name?.GivenName?.Trim(), name?.FamilyName?.Trim() }
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .ToArray();

        if (parts.Length > 0)
            return string.Join(" ", parts);

        return fallbackUsername;
    }

    private async Task DeprovisionAccessAsync(Guid userId)
    {
        var realmMemberships = await _db.RealmUsers.Where(ru => ru.UserId == userId).ToListAsync();
        var appAssignments = await _db.AppUsers.Where(au => au.UserId == userId).ToListAsync();

        if (realmMemberships.Count > 0)
            _db.RealmUsers.RemoveRange(realmMemberships);

        if (appAssignments.Count > 0)
            _db.AppUsers.RemoveRange(appAssignments);
    }

    private async Task ApplyGroupPatchOperationAsync(ScimGroupMapping group, ScimPatchOperation operation)
    {
        var op = (operation.Op ?? "replace").Trim().ToLowerInvariant();
        var path = (operation.Path ?? string.Empty).Trim();

        if (op is not ("replace" or "add" or "remove"))
            return;

        if (string.IsNullOrWhiteSpace(path))
        {
            if (operation.Value.ValueKind != JsonValueKind.Object)
                return;

            if (operation.Value.TryGetProperty("displayName", out var displayNameValue) && displayNameValue.ValueKind == JsonValueKind.String)
                group.DisplayName = displayNameValue.GetString()!.Trim();

            if (operation.Value.TryGetProperty("externalId", out var externalIdValue) && externalIdValue.ValueKind == JsonValueKind.String)
                group.ScimExternalId = externalIdValue.GetString()!.Trim();

            if (operation.Value.TryGetProperty("members", out var membersValue) && membersValue.ValueKind == JsonValueKind.Array)
            {
                var members = ParseMembers(membersValue);
                await SyncGroupMembersAsync(group, members, isReplace: true);
            }

            if (operation.Value.TryGetProperty("urn:certis:params:scim:schemas:extension:realm-role:2.0:Group", out var extensionValue))
                ApplyRealmRoleExtension(group, extensionValue);

            return;
        }

        switch (path.ToLowerInvariant())
        {
            case "displayname":
                if (op != "remove" && operation.Value.ValueKind == JsonValueKind.String)
                    group.DisplayName = operation.Value.GetString()!.Trim();
                break;
            case "externalid":
                group.ScimExternalId = op == "remove" ? null : operation.Value.GetString()?.Trim();
                break;
            case "members":
                {
                    var members = ParseMembers(operation.Value);
                    await SyncGroupMembersAsync(group, members, isReplace: op == "replace");
                    break;
                }
            case "urn:certis:params:scim:schemas:extension:realm-role:2.0:group":
                ApplyRealmRoleExtension(group, operation.Value);
                break;
            case "urn:certis:params:scim:schemas:extension:realm-role:2.0:group:realmid":
                if (operation.Value.ValueKind == JsonValueKind.String &&
                    Guid.TryParse(operation.Value.GetString(), out var realmId))
                {
                    group.RealmId = realmId;
                }
                break;
            case "urn:certis:params:scim:schemas:extension:realm-role:2.0:group:roleid":
                if (operation.Value.ValueKind == JsonValueKind.String)
                    group.RoleId = operation.Value.GetString()!.Trim();
                break;
        }
    }

    private void ApplyRealmRoleExtension(ScimGroupMapping group, JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Object)
            return;

        if (value.TryGetProperty("realmId", out var realmIdValue) &&
            realmIdValue.ValueKind == JsonValueKind.String &&
            Guid.TryParse(realmIdValue.GetString(), out var realmId))
            group.RealmId = realmId;

        if (value.TryGetProperty("roleId", out var roleIdValue) &&
            roleIdValue.ValueKind == JsonValueKind.String)
            group.RoleId = roleIdValue.GetString()!.Trim();
    }

    private List<ScimMember> ParseMembers(JsonElement value)
    {
        var members = new List<ScimMember>();
        if (value.ValueKind != JsonValueKind.Array)
            return members;

        foreach (var element in value.EnumerateArray())
        {
            if (element.ValueKind != JsonValueKind.Object)
                continue;
            if (!element.TryGetProperty("value", out var valueProperty) || valueProperty.ValueKind != JsonValueKind.String)
                continue;
            var memberValue = valueProperty.GetString();
            if (string.IsNullOrWhiteSpace(memberValue))
                continue;
            var display = element.TryGetProperty("display", out var displayProperty) && displayProperty.ValueKind == JsonValueKind.String
                ? displayProperty.GetString()
                : null;
            members.Add(new ScimMember(memberValue.Trim(), display));
        }

        return members;
    }

    private async Task SyncGroupMembersAsync(ScimGroupMapping group, List<ScimMember>? incomingMembers, bool isReplace)
    {
        var desiredIds = new HashSet<Guid>();
        if (incomingMembers is not null)
        {
            foreach (var member in incomingMembers)
            {
                if (!Guid.TryParse(member.Value, out var memberId))
                    continue;

                var userExists = await _db.Users.AnyAsync(u => u.Id == memberId);
                if (!userExists)
                    continue;

                desiredIds.Add(memberId);
            }
        }

        var existingMemberships = await _db.RealmUsers
            .Where(ru => ru.RealmId == group.RealmId && ru.RoleId == group.RoleId)
            .ToListAsync();

        var existingIds = existingMemberships.Select(ru => ru.UserId).ToHashSet();

        if (isReplace)
        {
            var toRemove = existingMemberships.Where(ru => !desiredIds.Contains(ru.UserId)).ToList();
            if (toRemove.Count > 0)
                _db.RealmUsers.RemoveRange(toRemove);
        }

        foreach (var memberId in desiredIds)
        {
            var currentMembership = existingMemberships.FirstOrDefault(ru => ru.UserId == memberId);
            if (currentMembership is not null)
                continue;

            var conflictingMembership = await _db.RealmUsers.SingleOrDefaultAsync(ru => ru.RealmId == group.RealmId && ru.UserId == memberId);
            if (conflictingMembership is null)
            {
                _db.RealmUsers.Add(new RealmUser
                {
                    RealmId = group.RealmId,
                    UserId = memberId,
                    RoleId = group.RoleId
                });
            }
            else
            {
                conflictingMembership.RoleId = group.RoleId;
            }
        }
    }

    private async Task<object> ToScimGroupResourceAsync(ScimGroupMapping group)
    {
        var members = await _db.RealmUsers
            .AsNoTracking()
            .Where(ru => ru.RealmId == group.RealmId && ru.RoleId == group.RoleId)
            .Include(ru => ru.User)
            .OrderBy(ru => ru.User.DisplayName)
            .ToListAsync();

        return new Dictionary<string, object?>
        {
            ["schemas"] = new[]
            {
                "urn:ietf:params:scim:schemas:core:2.0:Group",
                "urn:certis:params:scim:schemas:extension:realm-role:2.0:Group"
            },
            ["id"] = group.Id.ToString(),
            ["externalId"] = group.ScimExternalId,
            ["displayName"] = group.DisplayName,
            ["members"] = members.Select(member => new
            {
                value = member.UserId.ToString(),
                display = member.User.DisplayName
            }).ToList(),
            ["meta"] = new
            {
                resourceType = "Group",
                created = group.CreatedAtUtc.ToString("o", CultureInfo.InvariantCulture),
                lastModified = group.UpdatedAtUtc.ToString("o", CultureInfo.InvariantCulture)
            },
            ["urn:certis:params:scim:schemas:extension:realm-role:2.0:Group"] = new
            {
                realmId = group.RealmId.ToString(),
                roleId = group.RoleId
            }
        };
    }

    private object BuildGroupAuditSnapshot(ScimGroupMapping group, string realmName)
        => new
        {
            group.DisplayName,
            group.ScimExternalId,
            group.RealmId,
            RealmName = realmName,
            group.RoleId
        };

    private object ToScimUserResource(User user)
        => new
        {
            schemas = new[] { "urn:ietf:params:scim:schemas:core:2.0:User" },
            id = user.Id.ToString(),
            externalId = user.ScimExternalId,
            userName = user.Username,
            displayName = user.DisplayName,
            active = string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase),
            emails = new[]
            {
                new
                {
                    value = user.Email,
                    type = "work",
                    primary = true
                }
            },
            meta = new
            {
                resourceType = "User",
                created = user.CreateTimeUtc.ToString("o", CultureInfo.InvariantCulture),
                lastModified = user.UpdateTimeUtc.ToString("o", CultureInfo.InvariantCulture)
            }
        };

    private IActionResult? EnsureAuthorized()
    {
        var configuredToken = _config["Scim:BearerToken"];
        if (string.IsNullOrWhiteSpace(configuredToken))
            return StatusCode(StatusCodes.Status501NotImplemented, new { detail = "SCIM bearer token is not configured." });

        var header = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return Unauthorized();

        var providedToken = header["Bearer ".Length..].Trim();
        if (!string.Equals(providedToken, configuredToken, StringComparison.Ordinal))
            return Unauthorized();

        return null;
    }

    private ObjectResult ScimError(int statusCode, string detail)
    {
        var payload = new
        {
            schemas = new[] { "urn:ietf:params:scim:api:messages:2.0:Error" },
            status = statusCode.ToString(CultureInfo.InvariantCulture),
            detail
        };

        return StatusCode(statusCode, payload);
    }

    private string GenerateScimPassword()
        => $"Scim!{Convert.ToHexString(RandomNumberGenerator.GetBytes(12))}";

    private object BuildAuditSnapshot(User user)
        => new
        {
            user.Username,
            user.DisplayName,
            user.Email,
            user.Status,
            user.ScimExternalId,
            user.ProvisioningSource,
            user.IsScimManaged,
            user.OnboardingStage
        };

    private async Task WriteScimAuditAsync(
        string entityType,
        string entityId,
        string entityName,
        string action,
        string? details,
        object? before,
        object? after,
        object? metadata,
        string? result)
    {
        _db.AuditLogEntries.Add(new AuditLogEntry
        {
            CreatedAtUtc = DateTime.UtcNow,
            ActorUserId = "scim",
            ActorUsername = "scim",
            EntityType = entityType,
            EntityId = entityId,
            EntityName = entityName,
            Action = action,
            Details = details,
            Result = result,
            ConfirmationMode = "external_provisioning",
            BeforeJson = before is null ? null : JsonSerializer.Serialize(before),
            AfterJson = after is null ? null : JsonSerializer.Serialize(after),
            MetadataJson = metadata is null ? null : JsonSerializer.Serialize(metadata)
        });

        await _db.SaveChangesAsync();
    }
}