using Client.Gateway.Api.Assignment.Response.V1;

namespace Client.Gateway.Api.Assignment.Service;

public interface IAssignmentService
{
    IReadOnlyList<AssignmentResponse> GetAssignments(Guid siteId);
}

/// <summary>
/// Mock implementation for local Postman testing. The real gateway would call a
/// backend microservice here instead of returning hardcoded data.
/// </summary>
public class AssignmentService : IAssignmentService
{
    public IReadOnlyList<AssignmentResponse> GetAssignments(Guid siteId) =>
        new List<AssignmentResponse>
        {
            new(
                Id: Guid.Parse("11111111-1111-1111-1111-111111111111"),
                SiteId: siteId,
                EmployeeName: "Jordan Smith",
                Status: "Active",
                StartDate: new DateOnly(2026, 1, 5),
                EndDate: null),
            new(
                Id: Guid.Parse("22222222-2222-2222-2222-222222222222"),
                SiteId: siteId,
                EmployeeName: "Alex Rivera",
                Status: "Completed",
                StartDate: new DateOnly(2025, 9, 1),
                EndDate: new DateOnly(2026, 2, 15)),
            new(
                Id: Guid.Parse("33333333-3333-3333-3333-333333333333"),
                SiteId: siteId,
                EmployeeName: "Taylor Chen",
                Status: "Pending",
                StartDate: new DateOnly(2026, 3, 1),
                EndDate: null),
        };
}
