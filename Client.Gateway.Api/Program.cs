using System.Threading.RateLimiting;
using Client.Gateway.Api.Assignment.Get;
using Client.Gateway.Api.Assignment.Service;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// NOTE: Real gateway conventions (Auth0 JWT bearer auth, SiteIdPolicy scope checks on
// every endpoint) are intentionally omitted from this local scaffold so it's directly
// testable in Postman without a token. See gateway doc.md's Authorization section
// before this goes anywhere near a real environment.
builder.Services.AddSingleton<IAssignmentService, AssignmentService>();

// Basic per-IP rate limit so the publicly-reachable mock endpoint can't be hammered.
// The real gateway enforces rate limits per client credential (see the doc's
// integration test script args); this is a coarser stand-in for the local scaffold.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("perIp", httpContext =>
    {
        var key = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        });
    });
});

var app = builder.Build();

app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok("healthy"));
app.MapAssignmentEndpoints();

app.Run();
