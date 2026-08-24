using Client.Gateway.Api.Assignment.Service;
using Microsoft.AspNetCore.RateLimiting;

namespace Client.Gateway.Api.Assignment.Get;

public static class Endpoints
{
    public static void MapAssignmentEndpoints(this WebApplication app)
    {
        app.MapGet("/sites/{siteId:guid}/assignments", GetAssignments)
            .WithName("GetAssignments")
            .WithTags("Assignment")
            .RequireRateLimiting("perIp");
    }

    private static IResult GetAssignments(Guid siteId, IAssignmentService assignmentService)
    {
        var assignments = assignmentService.GetAssignments(siteId);
        if (assignments is null)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Site not found",
                detail: $"No site exists with id '{siteId}'.");
        }
        return Results.Ok(assignments);
    }
}
