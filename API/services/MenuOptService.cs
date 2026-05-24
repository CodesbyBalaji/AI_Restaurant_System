using API.Data;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class MenuOptService
{
    private readonly AppDbContext _context;

    private readonly MenuAIInsightService _ai;

    public MenuOptService(
        AppDbContext context,
        MenuAIInsightService ai
    )
    {
        _context = context;

        _ai = ai;
    }

    public async Task<List<object>> GetInsightsAsync()
    {

        var last30Days = DateTime.UtcNow.AddDays(-30);

        var demandData = await _context.Orders
            .Where(o => o.OrderedAt >= last30Days)
            .GroupBy(o => o.MenuItemId)
            .Select(g => new
            {
                MenuItemId = g.Key,

                TotalOrders = g.Sum(x => x.Quantity)
            })
            .ToListAsync();

        var lastWeekStart = DateTime.UtcNow.AddDays(-7);

        var previousWeekStart = DateTime.UtcNow.AddDays(-14);

        var weeklyData = await _context.Orders
            .Where(o => o.OrderedAt >= previousWeekStart)
            .GroupBy(o => new
            {
                o.MenuItemId,

                Week =
                    o.OrderedAt >= lastWeekStart
                    ? "Current"
                    : "Previous"
            })
            .Select(g => new
            {
                g.Key.MenuItemId,

                g.Key.Week,

                Total = g.Sum(x => x.Quantity)
            })
            .ToListAsync();

        var avgDemand = demandData.Any()

            ? demandData.Average(x => x.TotalOrders)

            : 1;

        var menuItems = await _context.MenuItems.ToListAsync();

        var tasks = menuItems.Select(async m =>
        {

            var itemDemand = demandData
                .FirstOrDefault(d =>
                    d.MenuItemId == m.Id
                )?.TotalOrders ?? 0;

            decimal margin = m.Price > 0

                ? (m.Price - m.CostPrice) / m.Price

                : 0;

            decimal demandRatio = avgDemand > 0

                ? (decimal)itemDemand / (decimal)avgDemand

                : 0;

            var currentWeek = weeklyData
                .FirstOrDefault(x =>
                    x.MenuItemId == m.Id &&
                    x.Week == "Current"
                )?.Total ?? 0;

            var previousWeek = weeklyData
                .FirstOrDefault(x =>
                    x.MenuItemId == m.Id &&
                    x.Week == "Previous"
                )?.Total ?? 0;

            decimal trendPercent = 0;

            if (previousWeek > 0)
            {
                trendPercent =
                    ((decimal)(currentWeek - previousWeek)
                    / previousWeek) * 100;

                trendPercent = Math.Round(

                trendPercent switch
                {
                    > 60 => 60,
                    < -60 => -60,
                    _ => trendPercent
                },

                1
            );
            }

            string category;

            if (demandRatio >= 1.0m && margin >= 0.4m)

                category = "⭐ Star";

            else if (demandRatio >= 1.0m)

                category = "🔥 Popular";

            else if (margin >= 0.4m)

                category = "💎 Premium";

            else

                category = "❌ Weak";

            decimal demandScore =

            Math.Min(demandRatio * 35m, 35m);

            decimal marginScore =

                margin * 35m;

            decimal trendScore =

                (Math.Abs(trendPercent) / 60m) * 30m;

            decimal performanceScore =

                demandScore
                +
                marginScore
                +
                trendScore;

            performanceScore = Math.Clamp(
                performanceScore,
                0,
                100
            );

            string action;

            decimal suggestedPrice = m.Price;

            if (demandRatio > 1.3m && margin > 0.4m)
            {
                action = "Increase Price";

                suggestedPrice = m.Price * 1.10m;
            }
            else if (demandRatio < 0.5m)
            {
                action = "Reduce Price";

                suggestedPrice = m.Price * 0.92m;
            }
            else if (margin < 0.25m)
            {
                action = "Review Cost";

                suggestedPrice = m.Price * 1.06m;
            }
            else
            {
                action = "Keep Price";
            }

            string aiPriority;

            if (performanceScore >= 65)

                aiPriority = "High Priority";

            else if (performanceScore >= 45)

                aiPriority = "Medium Priority";

            else

                aiPriority = "Low Priority";

            var aiInsight = await _ai.GenerateInsightAsync(

                m.Name,

                m.Price,

                m.CostPrice,

                Math.Round(margin * 100, 1),

                itemDemand,

                Math.Round(demandRatio, 2),

                Math.Round(trendPercent, 1),

                category,

                Math.Round(performanceScore, 1),

                Math.Round(suggestedPrice, 2),

                action
            );

            return new
            {
                id = m.Id,

                name = m.Name,

                price = Math.Round(m.Price, 2),

                costPrice = Math.Round(m.CostPrice, 2),

                marginPercent = Math.Round(
                    margin * 100,
                    1
                ),

                demand = itemDemand,

                demandRatio = Math.Round(
                    demandRatio,
                    2
                ),

                weeklyTrendPercent = Math.Round(
                    trendPercent,
                    1
                ),

                category,

                performanceScore = Math.Round(
                    performanceScore,
                    1
                ),

                suggestedPrice = Math.Round(
                    suggestedPrice,
                    2
                ),

                action,

                aiInsight,

                aiPriority
            };
        });

        var result = await Task.WhenAll(tasks);

        return result
            .OrderByDescending(x => x.performanceScore)
            .ToList<object>();
    }
}