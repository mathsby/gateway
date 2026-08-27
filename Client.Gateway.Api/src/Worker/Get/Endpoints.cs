using Client.Gateway.Api.Worker.Service;
using Microsoft.AspNetCore.RateLimiting;

namespace Client.Gateway.Api.Worker.Get;

public static class Endpoints
{
    public static void MapWorkerEndpoints(this WebApplication app)
    {
        app.MapGet("/sites/{siteId:guid}/workers", GetWorkers)
            .WithName("GetWorkers")
            .WithTags("Worker")
            .RequireRateLimiting("perIp");
    }

    private static IResult GetWorkers(Guid siteId, IWorkerService workerService)
    {
        var workers = workerService.GetWorkers(siteId);
        if (workers is null)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Site not found",
                detail: $"No site exists with id '{siteId}'.");
        }
        return Results.Ok(workers);
    }
}
