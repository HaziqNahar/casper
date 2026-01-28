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
    // for now: authenticated only
    o.AddPolicy("AdminOnly", p => p.RequireAuthenticatedUser());

    // later: if you add roles claim, switch to:
    // o.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
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

app.Run();
