using FluentAssertions;
using System.Net;

namespace API.Tests.Integration;

public class MenuIntegrationTests
{
    [Fact]
    public async Task Optimize_Should_Return_OK()
    {
        var client = ApiTestHelper.CreateClient();

        await ApiTestHelper.AuthenticateAsync(client);

        var response =
            await client.GetAsync("/api/menu/optimize");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body =
            await response.Content.ReadAsStringAsync();

        body.Should().NotBeNullOrWhiteSpace();
    }
}