using API.Data;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace API.Services;

public class MenuOptService
{
    private readonly AppDbContext _context;

    private readonly MenuAIInsightService _ai;

    private readonly MlPredictionService _ml;

    public MenuOptService(
        AppDbContext context,
        MenuAIInsightService ai,
        MlPredictionService ml
    )
    {
        _context = context;

        _ai = ai;

        _ml = ml;
    }

    public async Task<List<object>> GetInsightsAsync()
    {
        var last7Days = DateTime.UtcNow.AddDays(-7);

        var demandData = await _context.Orders
            .Where(o =>
                o.OrderedAt >= last7Days
                &&
                o.Status != "Cancelled"
            )
            .GroupBy(o => o.MenuItemId)
            .Select(g => new
            {
                MenuItemId = g.Key,

                TotalOrders = g.Sum(x => x.Quantity)
            })
            .ToListAsync();

        var menuItems = await _context.MenuItems
            .ToListAsync();

        var itemIds = menuItems
            .Select(x => x.Id)
            .ToList();

        var mlResults = await _ml
            .PredictBatchAsync(itemIds);

        var tasks = menuItems.Select(async m =>
        {

            var itemDemand = demandData
                .FirstOrDefault(d =>
                    d.MenuItemId == m.Id
                )?.TotalOrders ?? 0;

            mlResults.TryGetValue(
                m.Id,
                out var prediction
            );

            double predictedDemand =
                prediction?.PredictedDemand ?? 0;

            double trendPercent =
                prediction?.TrendPercent ?? 0;

            double confidencePercent =
                prediction?.ConfidencePercent ?? 50;

            decimal marginPercent =
                m.Price > 0

                ?

                (
                    (
                        m.Price - m.CostPrice
                    )
                    /
                    m.Price
                ) * 100

                : 0;

            marginPercent = Math.Round(
                marginPercent,
                1
            );

            var aiResult =
                await _ai.GenerateInsightAsync(

                    dishName: m.Name,

                    currentPrice: m.Price,

                    costPrice: m.CostPrice,

                    marginPercent: marginPercent,

                    currentDemand: itemDemand,

                    predictedDemand: predictedDemand,

                    trendPercent: trendPercent,

                    confidencePercent: confidencePercent
                );

            dynamic aiData =
                JsonConvert.DeserializeObject(
                    aiResult
                )!;

            decimal optimizedPrice =
                aiData.optimizedPrice;

            decimal minPrice =
                m.Price * 0.95m;

            decimal maxPrice =
                m.Price * 1.08m;

            optimizedPrice = Math.Clamp(

                optimizedPrice,

                minPrice,

                maxPrice
            );

            optimizedPrice = Math.Round(
                optimizedPrice,
                2
            );

            decimal priceChangePercent =

                (
                    (
                        optimizedPrice - m.Price
                    )
                    /
                    m.Price
                ) * 100m;

            priceChangePercent = Math.Round(
                priceChangePercent,
                1
            );

            return new
            {
                id = m.Id,

                name = m.Name,

                currentPrice = Math.Round(
                    m.Price,
                    2
                ),

                optimizedPrice,

                priceChangePercent,

                costPrice = Math.Round(
                    m.CostPrice,
                    2
                ),

                marginPercent,

                demand = itemDemand,

                predictedDemand = Math.Round(
                    predictedDemand,
                    0
                ),

                trendPercent = Math.Round(
                    trendPercent,
                    1
                ),

                confidencePercent = Math.Round(
                    confidencePercent,
                    0
                ),

                category =
                    (string)aiData.category,

                strategy =
                    (string)aiData.strategy,

                promotion =
                    (string)aiData.promotion,

                priority =
                    (string)aiData.priority,

                inventoryAction =
                    (string)aiData.inventoryAction
            };
        });

        var result = await Task.WhenAll(tasks);

        return result
            .OrderByDescending(x =>
                x.predictedDemand)
            .ToList<object>();
    }
}