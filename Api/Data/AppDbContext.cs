using Microsoft.EntityFrameworkCore;

namespace Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AuthorizationCode> AuthorizationCodes => Set<AuthorizationCode>();
    
    // Minimal table so EF definitely has something to migrate
    public DbSet<Client> Clients => Set<Client>();

    public DbSet<User> Users => Set<User>();
    public DbSet<Realm> Realms => Set<Realm>();
    public DbSet<App> Apps => Set<App>();
    public DbSet<RealmApp> RealmApps => Set<RealmApp>();
    public DbSet<RealmUser> RealmUsers => Set<RealmUser>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();


    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Client>()
            .HasIndex(x => x.ClientId)
            .IsUnique();

        b.Entity<AuthorizationCode>()
            .HasIndex(x => x.Code)
            .IsUnique();
        
        // User unique username
        b.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Realm unique name
        b.Entity<Realm>()
            .HasIndex(r => r.Name)
            .IsUnique();

        // App unique client id
        b.Entity<App>()
            .HasIndex(a => a.ClientId)
            .IsUnique();

        // RealmApp unique per realm+app
        b.Entity<RealmApp>()
            .HasIndex(ra => new { ra.RealmId, ra.AppId })
            .IsUnique();
        
        // RealmUser unique per realm+user
        b.Entity<RealmUser>()
        .HasIndex(ru => new { ru.RealmId, ru.UserId })
        .IsUnique();

        // AppUser unique per realmApp+user
        b.Entity<AppUser>()
        .HasIndex(au => new { au.RealmAppId, au.UserId })
        .IsUnique();

        b.Entity<AuthorizationCode>()
            .HasOne(ac => ac.App)
            .WithMany()
            .HasForeignKey(ac => ac.AppId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<AuthorizationCode>()
            .HasIndex(ac => ac.Code)
            .IsUnique();


    }
}

public class Client
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ClientId { get; set; } = null!;
    public string ClientSecretHash { get; set; } = null!;
    public string[] AllowedRedirectUris { get; set; } = Array.Empty<string>();
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
