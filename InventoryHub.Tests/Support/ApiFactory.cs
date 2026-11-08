using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;

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
        builder.UseSetting("ConnectionStrings:Sqlite", _connectionString);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _keepAlive.Dispose();
    }
}
