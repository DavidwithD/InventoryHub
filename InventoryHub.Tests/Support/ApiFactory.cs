using InventoryHub.API.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace InventoryHub.Tests.Support;

// Runs the real API in memory. Each factory gets its own empty in-memory SQLite database.
public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _connectionString = $"DataSource=api-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
    private readonly SqliteConnection _keepAlive;

    public ApiFactory()
    {
        // A shared in-memory database is dropped when its last connection closes. This connection keeps it open.
        _keepAlive = new SqliteConnection(_connectionString);
        _keepAlive.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            // Remove the MySQL setup from Program.cs. EF Core 9 keeps the options delegate in a separate service.
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connectionString));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
        return host;
    }

    // Deletes every row. Tests that sum over all rows call this to start from an empty database.
    public void ResetDatabase()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.OpenConnection();
        db.Database.ExecuteSqlRaw("PRAGMA foreign_keys = OFF");
        foreach (var table in db.Model.GetEntityTypes().Select(t => t.GetTableName()).Distinct())
        {
            // The table names come from the EF model. No user input reaches this SQL.
            var sql = $"DELETE FROM \"{table}\"";
            db.Database.ExecuteSqlRaw(sql);
        }
        db.Database.ExecuteSqlRaw("PRAGMA foreign_keys = ON");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _keepAlive.Dispose();
    }
}
