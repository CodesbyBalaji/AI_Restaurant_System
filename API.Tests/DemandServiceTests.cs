using API.Data;
using API.Models;
using API.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http;
using System.Text;

namespace API.Tests;

public class DemandServiceTests
{
    [Fact]
    public async Task PredictDemandAsync_Should_Return_Empty_When_No_Menu_Items()
    {

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var mlHttp = new HttpClient(new FakeHttpMessageHandler("[]"));
        var aiHttp = new HttpClient(new FakeHttpMessageHandler("{}"));

        var mlService = new MlPredictionService(mlHttp);
        var aiService = new AIInsightService(aiHttp);

        var service = new DemandService(context, mlService, aiService);
        var result = await service.PredictDemandAsync();

        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task PredictDemandAsync_Should_Return_Forecast_For_Menu_Item()
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
            CostPrice = 120,
            IsAvailable = true
        };

        pizza.Orders.Add(new Order
        {
            MenuItemId = 1,
            MenuItemName = "Pizza",
            Quantity = 5,
            TotalPrice = 1250,
            Status = "Completed"
        });

        context.MenuItems.Add(pizza);
        await context.SaveChangesAsync();

        var mlJson = """
        [
          {
            "menuItemId":1,
            "thisWeek":50,
            "lastWeek":45,
            "twoWeeksAgo":40,
            "predictedDemand":60,
            "trendPercent":20,
            "forecastChangePercent":15,
            "confidencePercent":92,
            "lowerBound":55,
            "upperBound":65
          }
        ]
        """;

        var mlHttp = new HttpClient(new FakeHttpMessageHandler(mlJson));
        var aiHttp = new HttpClient(new FakeHttpMessageHandler("{}"));

        var mlService = new MlPredictionService(mlHttp);
        var aiService = new AIInsightService(aiHttp);

        var service = new DemandService(context, mlService, aiService);

 
        var result = await service.PredictDemandAsync();


        result.Should().HaveCount(1);

        var forecast = result.First();

        forecast.DishName.Should().Be("Pizza");
        forecast.ThisWeek.Should().Be(50);
        forecast.LastWeek.Should().Be(45);
        forecast.TwoWeeksAgo.Should().Be(40);
        forecast.PredictedNextWeek.Should().Be(60);
        forecast.ConfidencePercent.Should().Be(92);
        forecast.ForecastSource.Should().Be("Prophet");
    }
}

public class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly string _response;

    public FakeHttpMessageHandler(string response)
    {
        _response = response;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var message = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(_response, Encoding.UTF8, "application/json")
        };

        return Task.FromResult(message);
    }
}