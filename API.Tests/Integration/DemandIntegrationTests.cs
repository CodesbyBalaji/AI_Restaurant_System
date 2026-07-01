using FluentAssertions;
using System.Net;

namespace API.Tests.Integration;

public class DemandIntegrationTests
{
    [Fact]
    public async Task Predict_Should_Return_OK()
    {
        var client = ApiTestHelper.CreateClient();

        await ApiTestHelper.AuthenticateAsync(client);

        var response =
            await client.GetAsync("/api/demand/predict");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body =
            await response.Content.ReadAsStringAsync();

        body.Should().NotBeNullOrWhiteSpace();
    }
}