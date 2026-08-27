namespace Client.Gateway.Api.Worker.Response.V1;

public record WorkerResponse(
    Guid Id,
    Guid SiteId,
    string Name,
    string Role,
    string Status);
