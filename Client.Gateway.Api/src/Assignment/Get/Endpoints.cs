using Client.Gateway.Api.Assignment.Service;

namespace Client.Gateway.Api.Assignment.Get;

public static class Endpoints
{
    public static void MapAssignmentEndpoints(this WebApplication app)
    {
        app.MapGet("/sites/{siteId:guid}/assignments", GetAssignments)
            .WithName("GetAssignments")
            .WithTags("Assignment");
    }

    private static IResult GetAssignments(Guid siteId, IAssignmentService assignmentService)
    {
        var assignments = assignmentService.GetAssignments(siteId);
        return Results.Ok(assignments);
    }
}
