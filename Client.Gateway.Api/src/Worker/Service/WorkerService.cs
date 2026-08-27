using Client.Gateway.Api.Worker.Response.V1;

namespace Client.Gateway.Api.Worker.Service;

public interface IWorkerService
{
    /// <summary>Returns null when the site is not found.</summary>
    IReadOnlyList<WorkerResponse>? GetWorkers(Guid siteId);
}

/// <summary>
/// Mock implementation for local Postman testing. The real gateway would call a
/// backend microservice here instead of returning hardcoded data.
/// </summary>
public class WorkerService : IWorkerService
{
    public IReadOnlyList<WorkerResponse>? GetWorkers(Guid siteId)
    {
        // Mock "not found" case: the all-zero GUID simulates an unknown site so
        // the 404 path is testable. Any other valid GUID returns the same mock data.
        if (siteId == Guid.Empty)
        {
            return null;
        }

        return new List<WorkerResponse>
        {
            new(
                Id: Guid.Parse("44444444-4444-4444-4444-444444444444"),
                SiteId: siteId,
                Name: "Jordan Smith",
                Role: "Electrician",
                Status: "Active"),
            new(
                Id: Guid.Parse("55555555-5555-5555-5555-555555555555"),
                SiteId: siteId,
                Name: "Alex Rivera",
                Role: "Site Supervisor",
                Status: "Active"),
            new(
                Id: Guid.Parse("66666666-6666-6666-6666-666666666666"),
                SiteId: siteId,
                Name: "Taylor Chen",
                Role: "Laborer",
                Status: "OnLeave"),
        };
    }
}
