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

    public int ConfidencePercent { get; init; }

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
        PredictDemandAsync(
        CancellationToken ct = default)
    {

        var latestDate = await _context.Orders
            .MaxAsync(o => o.OrderedAt, ct);

        var endDate = latestDate.Date.AddDays(1);

        var thisWeekStart = endDate.AddDays(-7);

        var lastWeekStart = endDate.AddDays(-14);

        var twoWeeksStart = endDate.AddDays(-21);

        var data = await _context.MenuItems
            .Select(m => new
            {
                m.Id,

                DishName = m.Name,

                ThisWeek = m.Orders
                    .Where(o =>
                        o.OrderedAt >= thisWeekStart &&
                        o.OrderedAt < endDate)
                    .Sum(o => (int?)o.Quantity) ?? 0,

                LastWeek = m.Orders
                    .Where(o =>
                        o.OrderedAt >= lastWeekStart &&
                        o.OrderedAt < thisWeekStart)
                    .Sum(o => (int?)o.Quantity) ?? 0,

                TwoWeeksAgo = m.Orders
                    .Where(o =>
                        o.OrderedAt >= twoWeeksStart &&
                        o.OrderedAt < lastWeekStart)
                    .Sum(o => (int?)o.Quantity) ?? 0
            })
            .Where(x =>
                x.ThisWeek > 0 ||
                x.LastWeek > 0 ||
                x.TwoWeeksAgo > 0)
            .ToListAsync(ct);

        if (data.Count == 0)
            return [];

        var itemIds = data
            .Select(d => d.Id)
            .ToList();

        var mlResults = await _ml
            .PredictBatchAsync(itemIds, ct);

        var tasks = data.Select(async d =>
        {
            mlResults.TryGetValue(
                d.Id,
                out var mlResult
            );

            if (mlResult is null)
            {
                return new DemandForecast
                {
                    DishName = d.DishName,

                    ThisWeek = d.ThisWeek,

                    LastWeek = d.LastWeek,

                    TwoWeeksAgo = d.TwoWeeksAgo,

                    TrendPercent = 0,

                    PredictedNextWeek = 0,

                    ConfidencePercent = 0,

                    Recommendation = "No prediction available",

                    ForecastSource = "Unavailable",

                    AIInsight = "Prediction model unavailable"
                };
            }

            int predictedNextWeek =
                (int)Math.Round(
                    mlResult.PredictedDemand
                );

            double trendPercent =
                Math.Round(
                    mlResult.TrendPercent,
                    1
                );

            int confidencePercent =
                (int)Math.Round(
                    mlResult.ConfidencePercent
                );

            string recommendation =
                trendPercent switch
                {
                    >= 20 => "Strong increase expected",

                    >= 10 => "Increase stock",

                    >= 0 => "Maintain stock",

                    >= -10 => "Monitor closely",

                    >= -20 => "Reduce stock slightly",

                    _ => "Consider reducing"
                };

            return new DemandForecast
            {
                DishName = d.DishName,

                ThisWeek = d.ThisWeek,

                LastWeek = d.LastWeek,

                TwoWeeksAgo = d.TwoWeeksAgo,

                TrendPercent = trendPercent,

                PredictedNextWeek = predictedNextWeek,

                ConfidencePercent = confidencePercent,

                Recommendation = recommendation,

                ForecastSource = "Prophet",

                AIInsight = ""
            };

        });

        var forecasts = await Task.WhenAll(tasks);

        return forecasts
            .OrderByDescending(x =>
                x.PredictedNextWeek)
            .Take(5)
            .ToList();
    }
}