using Client.Gateway.Api.Assignment.Get;
using Client.Gateway.Api.Assignment.Service;

var builder = WebApplication.CreateBuilder(args);

// NOTE: Real gateway conventions (Auth0 JWT bearer auth, SiteIdPolicy scope checks on
// every endpoint) are intentionally omitted from this local scaffold so it's directly
// testable in Postman without a token. See gateway doc.md's Authorization section
// before this goes anywhere near a real environment.
builder.Services.AddSingleton<IAssignmentService, AssignmentService>();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok("healthy"));
app.MapAssignmentEndpoints();

app.Run();
