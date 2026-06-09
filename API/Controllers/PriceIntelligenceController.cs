using API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Manager")]
public class PriceIntelligenceController : ControllerBase
{
    private readonly AppDbContext _context;

    public PriceIntelligenceController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetMarketSummary()
    {
        var result = await _context.CompetitorPrices
            .GroupBy(x => x.DishCategory)
            .Select(g => new
            {
                Dish = g.Key,

                AveragePrice =
                    Math.Round(
                        g.Average(x => (x.MinPrice + x.MaxPrice) / 2),
                        2),

                MinPrice =
                    g.Min(x => x.MinPrice),

                MaxPrice =
                    g.Max(x => x.MaxPrice),

                CompetitorCount =
                    g.Select(x => x.Restaurant)
                     .Distinct()
                     .Count()
            })
            .OrderBy(x => x.Dish)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("cities")]
    public async Task<IActionResult> GetCityComparison(
        [FromQuery] string dish)
    {
        var result = await _context.CompetitorPrices
            .Where(x => x.DishCategory == dish)
            .GroupBy(x => x.City)
            .Select(g => new
            {
                City = g.Key,

                AveragePrice =
                    Math.Round(
                        g.Average(x =>
                            (x.MinPrice + x.MaxPrice) / 2),
                        2)
            })
            .OrderByDescending(x => x.AveragePrice)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("competitors")]
    public async Task<IActionResult> GetCompetitors(
        [FromQuery] string dish)
    {
        var result = await _context.CompetitorPrices
            .Where(x => x.DishCategory == dish)
            .Select(x => new
            {
                x.Restaurant,

                x.City,

                AveragePrice =
                    Math.Round(
                        (x.MinPrice + x.MaxPrice) / 2,
                        2),

                x.Source
            })
            .OrderByDescending(x => x.AveragePrice)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("cheapest")]
    public async Task<IActionResult> GetCheapest(
        [FromQuery] string dish)
    {
        var result = await _context.CompetitorPrices
            .Where(x => x.DishCategory == dish)
            .Select(x => new
            {
                x.Restaurant,

                x.City,

                AveragePrice =
                    (x.MinPrice + x.MaxPrice) / 2
            })
            .OrderBy(x => x.AveragePrice)
            .Take(10)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("premium")]
    public async Task<IActionResult> GetPremium(
        [FromQuery] string dish)
    {
        var result = await _context.CompetitorPrices
            .Where(x => x.DishCategory == dish)
            .Select(x => new
            {
                x.Restaurant,

                x.City,

                AveragePrice =
                    (x.MinPrice + x.MaxPrice) / 2
            })
            .OrderByDescending(x => x.AveragePrice)
            .Take(10)
            .ToListAsync();

        return Ok(result);
    }
    [HttpGet("price-comparison")]
public async Task<IActionResult> GetPriceComparison()
{
    var result = new List<object>();

    var dishes = await _context.MenuItems
        .Select(x => new
        {
            x.Name,
            x.Price
        })
        .ToListAsync();

    foreach (var menuItem in dishes)
    {
        var marketData = await _context.CompetitorPrices
            .Where(x => x.DishCategory == menuItem.Name)
            .ToListAsync();

        if (!marketData.Any())
            continue;

        var marketAverage =
            marketData.Average(x =>
                (double)((x.MinPrice + x.MaxPrice) / 2));

        var minPrice =
            marketData.Min(x => x.MinPrice);

        var maxPrice =
            marketData.Max(x => x.MaxPrice);

        var differencePercent =
            Math.Round(
                ((double)menuItem.Price - marketAverage)
                / marketAverage * 100,
                1
            );

        string recommendation;

        if (differencePercent <= -15)
        {
            recommendation =
                "Potential price increase opportunity";
        }
        else if (differencePercent >= 15)
        {
            recommendation =
                "Above market pricing";
        }
        else
        {
            recommendation =
                "Competitively priced";
        }

        string aiInsight;

        if (differencePercent <= -15)
        {
            aiInsight =
                $"{menuItem.Name} is priced {Math.Abs(differencePercent)}% below the market average. Demand remains competitive and there may be room for a moderate price increase.";
        }
        else if (differencePercent >= 15)
        {
            aiInsight =
                $"{menuItem.Name} is priced {differencePercent}% above the market average. Monitor customer demand and competitor pricing closely.";
        }
        else
        {
            aiInsight =
                $"{menuItem.Name} pricing is aligned with the market average and remains competitive.";
        }

        result.Add(new
        {
            Dish = menuItem.Name,

            YourPrice = menuItem.Price,

            MarketAverage =
                Math.Round(marketAverage, 2),

            MinMarketPrice =
                minPrice,

            MaxMarketPrice =
                maxPrice,

            DifferencePercent =
                differencePercent,

            Recommendation =
                recommendation,

            AiInsight =
                aiInsight
        });
    }

    return Ok(result);
}
}