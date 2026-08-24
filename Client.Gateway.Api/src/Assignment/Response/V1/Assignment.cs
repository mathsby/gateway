namespace Client.Gateway.Api.Assignment.Response.V1;

public record AssignmentResponse(
    Guid Id,
    Guid SiteId,
    string EmployeeName,
    string Status,
    DateOnly StartDate,
    DateOnly? EndDate);
