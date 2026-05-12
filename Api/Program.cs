using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Api.Data;
using Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Core
builder.Services.AddControllers();
builder.Services.AddRazorPages();
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DI
builder.Services.AddSingleton<JwtKeyStore>();
builder.Services.AddSingleton<TokenService>();

// Password hashing
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

// Auth (cookie)
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "casper.sid";
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.LoginPath = "/auth/login";

        // local dev
        options.Cookie.SecurePolicy = CookieSecurePolicy.None;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.HttpOnly = true;
    });

builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
    o.AddPolicy("SuperAdminOnly", p => p.RequireRole("SuperAdmin"));
});

// Db
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", p =>
        p.WithOrigins(builder.Configuration["Frontend:Origin"]!)
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Static files (+ fix .dat)
var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".dat"] = "application/octet-stream";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider
});

app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/admin"))
    {
        // Allow React static assets
        if (
            ctx.Request.Path.StartsWithSegments("/admin/assets") ||
            ctx.Request.Path.Value!.EndsWith(".js") ||
            ctx.Request.Path.Value!.EndsWith(".css") ||
            ctx.Request.Path.Value!.EndsWith(".png") ||
            ctx.Request.Path.Value!.EndsWith(".jpg") ||
            ctx.Request.Path.Value!.EndsWith(".svg") ||
            ctx.Request.Path.Value!.EndsWith(".ico") ||
            ctx.Request.Path.Value!.EndsWith(".map")
        )
        {
            await next();
            return;
        }

        // Not logged in → redirect to login
        if (!(ctx.User?.Identity?.IsAuthenticated ?? false))
        {
            var returnUrl = ctx.Request.Path + ctx.Request.QueryString;
            ctx.Response.Redirect($"/auth/login?returnUrl={Uri.EscapeDataString(returnUrl)}");
            return;
        }

        // Logged in but NOT admin
        if (!ctx.User.IsInRole("Admin"))
        {
            ctx.Response.Redirect("http://localhost:3000/");
            return;
        }
    }

    await next();
});

app.UseRouting();
app.UseCors("frontend");

app.UseAuthentication();
app.UseAuthorization();

// API + Razor login page
app.MapControllers();
app.MapRazorPages();

// Protect the SPA itself (pages under /admin/*)
app.MapFallbackToFile("/admin/{*path:nonfile}", "admin/index.html")
   .RequireAuthorization("AdminOnly");

await EnsureAuditLogSchemaAsync(app.Services);
await EnsureUserPrivilegeSchemaAsync(app.Services);
await EnsureRealmUserRoleSchemaAsync(app.Services);
await EnsurePersistentAdminStateSchemaAsync(app.Services);
await EnsureScimSchemaAsync(app.Services);
await EnsureScimGroupSchemaAsync(app.Services);
await EnsureApprovalRequestSchemaAsync(app.Services);
await EnsureRealmAccessSchemaAsync(app.Services);
await DevUserSeeder.SeedAsync(app.Services);

app.Run();

static async Task EnsureAuditLogSchemaAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "AuditLogEntries" (
            "Id" uuid NOT NULL,
            "CreatedAtUtc" timestamp with time zone NOT NULL,
            "ActorUserId" text NOT NULL,
            "ActorUsername" text NOT NULL,
            "EntityType" text NOT NULL,
            "EntityId" text NOT NULL,
            "EntityName" text NOT NULL,
            "Action" text NOT NULL,
            "Details" text NULL,
            "Reason" text NULL,
            "Result" text NULL,
            "ConfirmationMode" text NULL,
            "BeforeJson" text NULL,
            "AfterJson" text NULL,
            "MetadataJson" text NULL,
            CONSTRAINT "PK_AuditLogEntries" PRIMARY KEY ("Id")
        );
        """
    );

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "AuditLogEntries" ADD COLUMN IF NOT EXISTS "Reason" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "AuditLogEntries" ADD COLUMN IF NOT EXISTS "Result" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "AuditLogEntries" ADD COLUMN IF NOT EXISTS "ConfirmationMode" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "AuditLogEntries" ADD COLUMN IF NOT EXISTS "BeforeJson" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "AuditLogEntries" ADD COLUMN IF NOT EXISTS "AfterJson" text NULL;""");

    await db.Database.ExecuteSqlRawAsync(
        """
        CREATE INDEX IF NOT EXISTS "IX_AuditLogEntries_CreatedAtUtc"
        ON "AuditLogEntries" ("CreatedAtUtc");
        """
    );

    await db.Database.ExecuteSqlRawAsync(
        """
        CREATE INDEX IF NOT EXISTS "IX_AuditLogEntries_EntityType_Action"
        ON "AuditLogEntries" ("EntityType", "Action");
        """
    );
}

static async Task EnsureRealmUserRoleSchemaAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmUsers" ADD COLUMN IF NOT EXISTS "RoleId" text NOT NULL DEFAULT 'realm_user';""");
}

static async Task EnsureUserPrivilegeSchemaAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "IsSuperAdmin" boolean NOT NULL DEFAULT false;""");
}

static async Task EnsureScimSchemaAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ScimExternalId" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ProvisioningSource" text NOT NULL DEFAULT 'Manual';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LastScimSyncAtUtc" timestamp with time zone NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "IsScimManaged" boolean NOT NULL DEFAULT false;""");
    await db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_Users_ScimExternalId" ON "Users" ("ScimExternalId");""");
}

static async Task EnsureScimGroupSchemaAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "ScimGroupMappings" (
            "Id" uuid NOT NULL,
            "ScimExternalId" text NULL,
            "DisplayName" text NOT NULL,
            "RealmId" uuid NOT NULL,
            "RoleId" text NOT NULL,
            "CreatedAtUtc" timestamp with time zone NOT NULL,
            "UpdatedAtUtc" timestamp with time zone NOT NULL,
            CONSTRAINT "PK_ScimGroupMappings" PRIMARY KEY ("Id"),
            CONSTRAINT "FK_ScimGroupMappings_Realms_RealmId"
                FOREIGN KEY ("RealmId") REFERENCES "Realms" ("Id") ON DELETE CASCADE
        );
        """
    );

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "ScimGroupMappings" ADD COLUMN IF NOT EXISTS "ScimExternalId" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "ScimGroupMappings" ADD COLUMN IF NOT EXISTS "DisplayName" text NOT NULL DEFAULT '';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "ScimGroupMappings" ADD COLUMN IF NOT EXISTS "RealmId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "ScimGroupMappings" ADD COLUMN IF NOT EXISTS "RoleId" text NOT NULL DEFAULT 'realm_user';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "ScimGroupMappings" ADD COLUMN IF NOT EXISTS "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT NOW();""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "ScimGroupMappings" ADD COLUMN IF NOT EXISTS "UpdatedAtUtc" timestamp with time zone NOT NULL DEFAULT NOW();""");
    await db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_ScimGroupMappings_ScimExternalId" ON "ScimGroupMappings" ("ScimExternalId");""");
    await db.Database.ExecuteSqlRawAsync("""CREATE UNIQUE INDEX IF NOT EXISTS "IX_ScimGroupMappings_RealmId_RoleId_DisplayName" ON "ScimGroupMappings" ("RealmId", "RoleId", "DisplayName");""");
}

static async Task EnsurePersistentAdminStateSchemaAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Status" text NOT NULL DEFAULT 'Active';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "OnboardingStage" text NOT NULL DEFAULT 'Activated';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "OnboardingReason" text NULL;""");

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Realms" ADD COLUMN IF NOT EXISTS "Status" text NOT NULL DEFAULT 'Active';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Realms" ADD COLUMN IF NOT EXISTS "MfaRequired" boolean NOT NULL DEFAULT true;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Realms" ADD COLUMN IF NOT EXISTS "PasswordInheritance" text NOT NULL DEFAULT 'inherit';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Realms" ADD COLUMN IF NOT EXISTS "SessionTimeoutMins" integer NOT NULL DEFAULT 30;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Realms" ADD COLUMN IF NOT EXISTS "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT NOW();""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Realms" ADD COLUMN IF NOT EXISTS "UpdatedAtUtc" timestamp with time zone NOT NULL DEFAULT NOW();""");

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Apps" ADD COLUMN IF NOT EXISTS "Enabled" boolean NOT NULL DEFAULT true;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Apps" ADD COLUMN IF NOT EXISTS "ServiceAccountsEnabled" boolean NOT NULL DEFAULT false;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Apps" ADD COLUMN IF NOT EXISTS "StandardFlowEnabled" boolean NOT NULL DEFAULT true;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Apps" ADD COLUMN IF NOT EXISTS "DirectAccessGrantsEnabled" boolean NOT NULL DEFAULT true;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Apps" ADD COLUMN IF NOT EXISTS "ImplicitFlowEnabled" boolean NOT NULL DEFAULT false;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Apps" ADD COLUMN IF NOT EXISTS "UpdatedAtUtc" timestamp with time zone NOT NULL DEFAULT NOW();""");
}

static async Task EnsureApprovalRequestSchemaAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "ApprovalRequests" (
            "Id" uuid NOT NULL,
            "RequestedAtUtc" timestamp with time zone NOT NULL,
            "RequestedByUserId" text NOT NULL,
            "RequestedByUsername" text NOT NULL,
            "EntityType" text NOT NULL,
            "EntityId" text NOT NULL,
            "EntityName" text NOT NULL,
            "Action" text NOT NULL,
            "Reason" text NOT NULL,
            "Status" text NOT NULL,
            "PayloadJson" text NULL,
            "Details" text NULL,
            "ReviewedAtUtc" timestamp with time zone NULL,
            "ReviewedByUserId" text NULL,
            "ReviewedByUsername" text NULL,
            "ReviewComment" text NULL,
            CONSTRAINT "PK_ApprovalRequests" PRIMARY KEY ("Id")
        );
        """
    );

    await db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_ApprovalRequests_RequestedAtUtc" ON "ApprovalRequests" ("RequestedAtUtc");""");
    await db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_ApprovalRequests_Status_Action" ON "ApprovalRequests" ("Status", "Action");""");
}

static async Task EnsureRealmAccessSchemaAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "RealmAccessRequests" (
            "Id" text NOT NULL,
            "RealmId" uuid NOT NULL,
            "RealmName" text NOT NULL,
            "TargetUserId" uuid NULL,
            "TargetUser" text NOT NULL,
            "RoleRequested" text NOT NULL,
            "Justification" text NOT NULL,
            "TimeBound" boolean NOT NULL DEFAULT false,
            "StartDate" text NULL,
            "EndDate" text NULL,
            "Status" text NOT NULL,
            "Requester" text NOT NULL,
            "Approver" text NULL,
            "Verifier" text NULL,
            "CreatedAtUtc" timestamp with time zone NOT NULL,
            "UpdatedAtUtc" timestamp with time zone NOT NULL,
            CONSTRAINT "PK_RealmAccessRequests" PRIMARY KEY ("Id")
        );
        """
    );

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "RealmId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "RealmName" text NOT NULL DEFAULT '';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "TargetUserId" uuid NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "TargetUser" text NOT NULL DEFAULT '';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "RoleRequested" text NOT NULL DEFAULT 'realm_user';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "Justification" text NOT NULL DEFAULT '';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "TimeBound" boolean NOT NULL DEFAULT false;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "StartDate" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "EndDate" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "Status" text NOT NULL DEFAULT 'Draft';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "Requester" text NOT NULL DEFAULT '';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "Approver" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "Verifier" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT NOW();""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequests" ADD COLUMN IF NOT EXISTS "UpdatedAtUtc" timestamp with time zone NOT NULL DEFAULT NOW();""");

    await db.Database.ExecuteSqlRawAsync(
        """
        CREATE TABLE IF NOT EXISTS "RealmAccessRequestEvents" (
            "Id" text NOT NULL,
            "RequestId" text NOT NULL,
            "Type" text NOT NULL,
            "AtUtc" timestamp with time zone NOT NULL,
            "Actor" text NOT NULL,
            "Message" text NULL,
            "SlaStage" text NULL,
            "SlaPolicy" text NULL,
            "SlaHours" integer NULL,
            "SlaDueAtUtc" timestamp with time zone NULL,
            "SlaElapsedMinutes" integer NULL,
            "SlaOutcome" text NULL,
            "SlaBreached" boolean NULL,
            CONSTRAINT "PK_RealmAccessRequestEvents" PRIMARY KEY ("Id"),
            CONSTRAINT "FK_RealmAccessRequestEvents_RealmAccessRequests_RequestId"
                FOREIGN KEY ("RequestId") REFERENCES "RealmAccessRequests" ("Id") ON DELETE CASCADE
        );
        """
    );

    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "RequestId" text NOT NULL DEFAULT '';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "Type" text NOT NULL DEFAULT '';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "AtUtc" timestamp with time zone NOT NULL DEFAULT NOW();""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "Actor" text NOT NULL DEFAULT '';""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "Message" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "SlaStage" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "SlaPolicy" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "SlaHours" integer NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "SlaDueAtUtc" timestamp with time zone NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "SlaElapsedMinutes" integer NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "SlaOutcome" text NULL;""");
    await db.Database.ExecuteSqlRawAsync("""ALTER TABLE "RealmAccessRequestEvents" ADD COLUMN IF NOT EXISTS "SlaBreached" boolean NULL;""");

    await db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_RealmAccessRequests_UpdatedAtUtc" ON "RealmAccessRequests" ("UpdatedAtUtc");""");
    await db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_RealmAccessRequests_Status_RealmId" ON "RealmAccessRequests" ("Status", "RealmId");""");
    await db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_RealmAccessRequestEvents_AtUtc" ON "RealmAccessRequestEvents" ("AtUtc");""");
    await db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_RealmAccessRequestEvents_RequestId_Type" ON "RealmAccessRequestEvents" ("RequestId", "Type");""");
}