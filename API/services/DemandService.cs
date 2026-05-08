using API.Data;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class DemandService
{
    private readonly AppDbContext _context;

    public DemandService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<object>> PredictDemand()
    {

        var latestDate = await _context.Orders.MaxAsync(o => o.OrderedAt);
        var endDate = latestDate.Date.AddDays(1);

        var oldestDate = await _context.Orders.MinAsync(o => o.OrderedAt);
        var totalDays = (latestDate - oldestDate).TotalDays;

        int windowDays = totalDays >= 14 ? 7 : 3;

        var thisWeekStart = endDate.AddDays(-windowDays);
        var lastWeekStart = endDate.AddDays(-2 * windowDays);
        var twoWeeksStart = endDate.AddDays(-3 * windowDays);

        var data = await _context.MenuItems
            .Select(m => new
            {
                DishName = m.Name,

                ThisWeek = m.Orders
                    .Where(o => o.OrderedAt >= thisWeekStart && o.OrderedAt < endDate)
                    .Sum(o => (int?)o.Quantity) ?? 0,

                LastWeek = m.Orders
                    .Where(o => o.OrderedAt >= lastWeekStart && o.OrderedAt < thisWeekStart)
                    .Sum(o => (int?)o.Quantity) ?? 0,

                TwoWeeksAgo = m.Orders
                    .Where(o => o.OrderedAt >= twoWeeksStart && o.OrderedAt < lastWeekStart)
                    .Sum(o => (int?)o.Quantity) ?? 0
            })
            .Where(x => x.ThisWeek > 0 || x.LastWeek > 0 || x.TwoWeeksAgo > 0)
            .ToListAsync();

        var result = data.Select(d =>
        {
            double baseline = (d.LastWeek * 0.6) + (d.TwoWeeksAgo * 0.4);

            double rawTrend = 0;

            if (baseline > 0)
            {
                rawTrend = (d.ThisWeek - baseline) / baseline;
            }
            else if (d.ThisWeek > 0)
            {
                rawTrend = 0.2; 
            }

            double clampedTrend = Math.Max(-0.30, Math.Min(0.50, rawTrend));
            bool wasClamped = Math.Abs(rawTrend - clampedTrend) > 0.001;

            var predicted = (int)Math.Round(d.ThisWeek * (1 + clampedTrend));

            int confidence;
            if (wasClamped && rawTrend > 0)
                confidence = 70;
            else if (wasClamped)
                confidence = 50;
            else if (d.ThisWeek >= 20 && clampedTrend > 0.2)
                confidence = 85;
            else if (d.ThisWeek >= 10 && clampedTrend > 0)
                confidence = 70;
            else if (d.ThisWeek < 5)
                confidence = 45;
            else
                confidence = 55;

            string recommendation =
                clampedTrend > 0.2 ? "Increase stock" :
                clampedTrend > 0 ? "Maintain stock" :
                clampedTrend > -0.15 ? "Monitor closely" :
                "Consider reducing";

            return new
            {
                dishName = d.DishName,
                thisWeek = d.ThisWeek,
                lastWeek = d.LastWeek,
                twoWeeksAgo = d.TwoWeeksAgo,
                trendPercent = Math.Round(clampedTrend * 100, 1),
                predictedNextWeek = predicted,
                confidencePercent = confidence,
                recommendation = recommendation
            };
        })
        .OrderByDescending(x => x.predictedNextWeek)
        .Take(5)
        .ToList<object>();

        return result;
    }
}