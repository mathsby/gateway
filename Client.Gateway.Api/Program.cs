using System.Threading.RateLimiting;
using Client.Gateway.Api.Assignment.Get;
using Client.Gateway.Api.Assignment.Service;
using Grafana.OpenTelemetry;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Sends traces, metrics, and logs to Grafana Cloud via OTLP. Endpoint/credentials
// come from the OTEL_EXPORTER_OTLP_* / OTEL_SERVICE_NAME env vars (set in Render),
// not from code — see the OpenTelemetry setup guide in the Grafana stack for values.
builder.Services.AddOpenTelemetry()
    .WithTracing(configure => configure.UseGrafana())
    .WithMetrics(configure => configure.UseGrafana());
builder.Logging.AddOpenTelemetry(options => options.UseGrafana());

// NOTE: Real gateway conventions (Auth0 JWT bearer auth, SiteIdPolicy scope checks on
// every endpoint) are intentionally omitted from this local scaffold so it's directly
// testable in Postman without a token. See gateway doc.md's Authorization section
// before this goes anywhere near a real environment.
builder.Services.AddSingleton<IAssignmentService, AssignmentService>();

// Gives every otherwise-empty-bodied error response (unhandled exceptions via
// UseExceptionHandler, bare status codes via UseStatusCodePages, Results.Problem(...))
// a consistent application/problem+json body instead of an empty one.
builder.Services.AddProblemDetails();

// Basic per-IP rate limit so the publicly-reachable mock endpoint can't be hammered.
// The real gateway enforces rate limits per client credential (see the doc's
// integration test script args); this is a coarser stand-in for the local scaffold.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = (context, _) =>
    {
        context.HttpContext.Response.Headers["Retry-After"] = "60";
        return ValueTask.CompletedTask;
    };
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

// Order matters: exception handler wraps everything below it; status code pages
// wraps everything below it (so it can catch the rate limiter's bare 429 and the
// routing layer's bare 404 for a malformed :guid and give them a JSON body).
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok("healthy"));
app.MapAssignmentEndpoints();

app.Run();
