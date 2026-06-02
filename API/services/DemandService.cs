using API.Data;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class DemandForecast
{
    public required string DishName { get; init; }

    public int ThisWeek { get; init; }

    public int LastWeek { get; init; }

    public int TwoWeeksAgo { get; init; }

    public double TrendPercent { get; init; }

    public int PredictedNextWeek { get; init; }

    public double ForecastChangePercent { get; init; }

    public int ConfidencePercent { get; init; }

    public int LowerBound { get; init; }

    public int UpperBound { get; init; }

    public required string Recommendation { get; init; }

    public required string ForecastSource { get; init; }

    public required string AIInsight { get; init; }
}

public class DemandService
{
    private readonly AppDbContext _context;

    private readonly MlPredictionService _ml;

    private readonly AIInsightService _ai;

    public DemandService(
        AppDbContext context,
        MlPredictionService ml,
        AIInsightService ai)
    {
        _context = context;
        _ml = ml;
        _ai = ai;
    }

    public async Task<List<DemandForecast>>
        PredictDemandAsync(CancellationToken ct = default)
    {

        var activeItemIds = await _context.MenuItems
            .Where(m => m.Orders.Any())
            .Select(m => new { m.Id, DishName = m.Name })
            .ToListAsync(ct);

        if (activeItemIds.Count == 0)
            return [];

        var itemIds = activeItemIds
            .Select(d => d.Id)
            .ToList();

        var nameById = activeItemIds
            .ToDictionary(d => d.Id, d => d.DishName);

        var mlResults = await _ml.PredictBatchAsync(itemIds, ct);

        if (mlResults.Count == 0)
            return [];

        var forecasts = mlResults.Values.Select(ml =>
        {
            string dishName = nameById.TryGetValue(
                ml.MenuItemId, out var name) ? name : $"Item {ml.MenuItemId}";

            int predictedNextWeek =
                (int)Math.Round(ml.PredictedDemand);

            double trendPercent =
                Math.Round(ml.TrendPercent, 1);

            double forecastChangePercent =
                Math.Round(ml.ForecastChangePercent, 1);

            int confidencePercent =
                (int)Math.Round(ml.ConfidencePercent);

            string recommendation = forecastChangePercent switch
            {
                >= 20   => "Strong increase expected — increase stock",
                >= 10   => "Increase stock",
                >= -5   => "Maintain stock",
                >= -15  => "Monitor closely",
                >= -25  => "Reduce stock slightly",
                _       => "Consider reducing stock"
            };

            return new DemandForecast
            {
                DishName              = dishName,
                ThisWeek              = ml.ThisWeek,
                LastWeek              = ml.LastWeek,
                TwoWeeksAgo           = ml.TwoWeeksAgo,
                TrendPercent          = trendPercent,
                PredictedNextWeek     = predictedNextWeek,
                ForecastChangePercent = forecastChangePercent,
                ConfidencePercent     = confidencePercent,
                LowerBound            = ml.LowerBound,
                UpperBound            = ml.UpperBound,
                Recommendation        = recommendation,
                ForecastSource        = "Prophet",
                AIInsight             = ""
            };
        });

        return forecasts
            .OrderByDescending(x => x.PredictedNextWeek)
            .Take(5)
            .ToList();
    }
}