using API.Data;
using API.DTOs;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using System.Linq;

namespace API.Controllers;

[ApiController]

[Route("api/festival")]

public class FestivalController : ControllerBase
{
    private readonly AppDbContext _context;

    private readonly HttpClient _http;

    public FestivalController(
        AppDbContext context,
        HttpClient http
    )
    {
        _context = context;

        _http = http;
    }

    [HttpGet("analytics/{festivalDate}")]

    public async Task<ActionResult>
    GetFestivalAnalytics(
        string festivalDate
    )
    {

        var date = DateTime.Parse(
            festivalDate
        );

        var lastYearDate =
            date.AddYears(-1);

        var historicalSales =

            await _context.Orders

            .Where(x =>

                x.OrderedAt.Date
                == lastYearDate.Date

                &&

                x.Status != "Cancelled"
            )

            .GroupBy(x => x.MenuItemName)

            .Select(g => new
            {
                DishName = g.Key,

                LastYearSales =
                    g.Sum(x => x.Quantity)
            })

            .ToListAsync();

        var prophetUrl =

            $"http://localhost:8000/festival/predict/{festivalDate}";

        var response =

            await _http.GetAsync(
                prophetUrl
            );

        response.EnsureSuccessStatusCode();

        var json =

            await response
            .Content
            .ReadAsStringAsync();

        var predictions =

            JsonConvert
            .DeserializeObject<JArray>(json);

        var result =
            new List<FestivalAnalyticsDto>();

        foreach (var item in historicalSales)
        {

            var predictedItem =

                predictions?

                .Cast<JObject>()

                .FirstOrDefault(p =>

                    p["MenuItemName"]?
                    .ToString()

                    ==

                    item.DishName
                );

            int predictedSales = 0;

            if (predictedItem != null)
            {
                predictedSales =

                    predictedItem["PredictedSales"]?
                    .Value<int>() ?? 0;
            }

            double growth = 0;

            if (item.LastYearSales > 0)
            {
                growth = Math.Round(

                    (
                        (
                            predictedSales
                            -
                            item.LastYearSales
                        )

                        /

                        (double)item.LastYearSales

                    ) * 100,

                    1
                );
            }

            result.Add(

                new FestivalAnalyticsDto
                {
                    DishName =
                        item.DishName,

                    LastYearSales =
                        item.LastYearSales,

                    PredictedSales =
                        predictedSales,

                    GrowthPercent =
                        growth
                }
            );
        }

        return Ok(result);
    }
}