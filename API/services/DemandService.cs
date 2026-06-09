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
        _ml      = ml;
        _ai      = ai;
    }

    private static string GetRecommendation(
        double trendPercent,
        double forecastChangePercent,
        int    predictedNextWeek,
        int    confidencePercent)
    {

        if (predictedNextWeek < 20)
            return "Low demand expected — reduce stock";

        if (confidencePercent < 60)
            return "Forecast uncertain — monitor closely";

        if (trendPercent <= -30)
            return "Demand declining sharply — reduce stock";

        bool trendFalling  = trendPercent       < -10;
        bool trendRising   = trendPercent       >  10;
        bool trendStable   = !trendFalling && !trendRising;

        bool forecastBigUp = forecastChangePercent >= 20;
        bool forecastUp    = forecastChangePercent is >= 10 and < 20;
        bool forecastFlat  = forecastChangePercent is >= -5 and < 10;
        bool forecastDown  = forecastChangePercent is >= -15 and < -5;
        bool forecastBigDn = forecastChangePercent < -15;

        if (trendFalling && forecastBigUp)
            return "Trend declining but spike predicted — monitor closely";

        if (trendRising && forecastBigDn)
            return "Trend rising but drop predicted — monitor closely";

        if (trendRising  && forecastBigUp) return "Strong increase expected — increase stock";
        if (trendRising  && forecastUp)    return "Increase stock";
        if (trendFalling && forecastDown)  return "Reduce stock — demand falling";
        if (trendFalling && forecastBigDn) return "Reduce stock — demand falling";

        if (forecastBigUp) return "Increase stock";
        if (forecastUp)    return "Increase stock";
        if (forecastBigDn) return "Consider reducing stock";
        if (forecastDown)  return "Monitor closely";

        return "Stable demand — maintain stock";
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

        var itemIds  = activeItemIds.Select(d => d.Id).ToList();
        var nameById = activeItemIds.ToDictionary(d => d.Id, d => d.DishName);

        var mlResults = await _ml.PredictBatchAsync(itemIds, ct);

        if (mlResults.Count == 0)
            return [];

        var forecasts = mlResults.Values.Select(ml =>
        {
            string dishName = nameById.TryGetValue(
                ml.MenuItemId, out var name) ? name : $"Item {ml.MenuItemId}";

            int    predictedNextWeek     = (int)Math.Round(ml.PredictedDemand);
            double trendPercent          = Math.Round(ml.TrendPercent, 1);
            double forecastChangePercent = Math.Round(ml.ForecastChangePercent, 1);
            int    confidencePercent     = (int)Math.Round(ml.ConfidencePercent);

            string recommendation = GetRecommendation(
                trendPercent,
                forecastChangePercent,
                predictedNextWeek,
                confidencePercent);

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