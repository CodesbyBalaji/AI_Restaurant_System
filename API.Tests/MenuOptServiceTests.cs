using API.Data;
using API.Models;
using API.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;
using System.Net;
using System.Text;

namespace API.Tests;

public class MenuOptServiceTests
{
    [Fact]
    public async Task GetInsightsAsync_Should_Return_Empty_When_No_Menu_Items()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var mlHttp = new HttpClient(new FakeMenuHttpHandler("[]"));

        var aiJson =
        """
        {
          "response":"{
            \"strategy\":\"Maintain current pricing\",
            \"promotion\":\"Weekend combo\",
            \"priority\":\"Medium\",
            \"inventoryAction\":\"Maintain inventory levels\"
          }"
        }
        """;

        var aiHttp = new HttpClient(new FakeMenuHttpHandler(aiJson));

        var ml = new MlPredictionService(mlHttp);
        var ai = new MenuAIInsightService(aiHttp);

        var service = new MenuOptService(context, ai, ml);

        var result = await service.GetInsightsAsync();

        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetInsightsAsync_Should_Return_Menu_Insight()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var pizza = new MenuItem
        {
            Id = 1,
            Name = "Pizza",
            Category = "Main Course",
            Price = 250,
            CostPrice = 100,
            IsAvailable = true
        };

        context.MenuItems.Add(pizza);

        context.Orders.Add(new Order
        {
            MenuItemId = 1,
            MenuItemName = "Pizza",
            Quantity = 20,
            TotalPrice = 5000,
            Status = "Completed"
        });

        await context.SaveChangesAsync();

        var mlJson =
        """
        [
          {
            "menuItemId":1,
            "thisWeek":40,
            "lastWeek":35,
            "twoWeeksAgo":30,
            "predictedDemand":60,
            "trendPercent":20,
            "forecastChangePercent":15,
            "confidencePercent":90,
            "lowerBound":55,
            "upperBound":65
          }
        ]
        """;

        var aiJson =
        """
        {
          "response":"{
            \"optimizedPrice\":257.5,
            \"category\":\"Premium Item\",
            \"strategy\":\"Increase price\",
            \"promotion\":\"Weekend Combo\",
            \"priority\":\"High\",
            \"inventoryAction\":\"Increase inventory\"
          }"
        }
        """;

        var mlHttp = new HttpClient(new FakeMenuHttpHandler(mlJson));
        var aiHttp = new HttpClient(new FakeMenuHttpHandler(aiJson));

        var ml = new MlPredictionService(mlHttp);
        var ai = new MenuAIInsightService(aiHttp);

        var service = new MenuOptService(context, ai, ml);

        var result = await service.GetInsightsAsync();

        result.Should().HaveCount(1);

        var item = JObject.FromObject(result.First());

        item["name"]!.ToString().Should().Be("Pizza");
        item["predictedDemand"]!.Value<double>().Should().Be(60);
        item["strategy"]!.ToString().Should().Be("Increase price");
        item["priority"]!.ToString().Should().Be("High");
        item["category"]!.ToString().Should().Be("Premium Item");
    }
}

public class FakeMenuHttpHandler : HttpMessageHandler
{
    private readonly string _response;

    public FakeMenuHttpHandler(string response)
    {
        _response = response;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    _response,
                    Encoding.UTF8,
                    "application/json")
            });
    }
}