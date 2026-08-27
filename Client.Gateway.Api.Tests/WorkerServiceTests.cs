using Client.Gateway.Api.Worker.Service;

namespace Client.Gateway.Api.Tests;

public class WorkerServiceTests
{
    private readonly IWorkerService _sut = new WorkerService();

    [Fact]
    public void GetWorkers_ReturnsNull_WhenSiteIdIsEmpty()
    {
        var result = _sut.GetWorkers(Guid.Empty);

        Assert.Null(result);
    }

    [Fact]
    public void GetWorkers_ReturnsWorkers_ForAnyOtherSiteId()
    {
        var siteId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");

        var result = _sut.GetWorkers(siteId);

        Assert.NotNull(result);
        Assert.All(result, worker => Assert.Equal(siteId, worker.SiteId));
    }

    [Fact]
    public void GetWorkers_EachWorkerHasNameRoleAndStatus()
    {
        var result = _sut.GetWorkers(Guid.NewGuid());

        Assert.NotNull(result);
        Assert.All(result, worker =>
        {
            Assert.False(string.IsNullOrWhiteSpace(worker.Name));
            Assert.False(string.IsNullOrWhiteSpace(worker.Role));
            Assert.False(string.IsNullOrWhiteSpace(worker.Status));
        });
    }
}
