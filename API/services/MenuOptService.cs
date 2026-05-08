using API.Data;
using Microsoft.EntityFrameworkCore;

namespace API.Services;

public class MenuOptService
{
    private readonly AppDbContext _context;

    public MenuOptService(AppDbContext context)
    {
        _context = context;
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

        var avgDemand = demandData.Any()
            ? demandData.Average(x => x.TotalOrders)
            : 1;

        var menuItems = await _context.MenuItems.ToListAsync();

        var result = menuItems.Select(m =>
        {
            var itemDemand = demandData
                .FirstOrDefault(d => d.MenuItemId == m.Id)?.TotalOrders ?? 0;

            decimal margin = m.Price > 0
                ? (m.Price - m.CostPrice) / m.Price
                : 0;

            decimal demandRatio = avgDemand > 0
                ? (decimal)itemDemand / (decimal)avgDemand
                : 0;

            string action;
            decimal suggestedPrice = m.Price;

            if (demandRatio > 1.3m && margin > 0.4m)
            {
                action = "Increase Price";
                suggestedPrice = m.Price * 1.12m;
            }
            else if (demandRatio < 0.5m)
            {
                action = "Reduce Price";
                suggestedPrice = m.Price * 0.9m;
            }
            else if (margin < 0.25m)
            {
                action = "Review Cost";
                suggestedPrice = m.Price * 1.08m;
            }
            else
            {
                action = "Keep Price";
            }

            return new
            {
                id = m.Id,
                name = m.Name,
                price = m.Price,
                costPrice = m.CostPrice,
                marginPercent = Math.Round(margin * 100, 1),
                demand = itemDemand,
                demandRatio = Math.Round(demandRatio, 2),
                suggestedPrice = Math.Round(suggestedPrice, 2),
                action
            };
        })
        .ToList<object>();

        return result;
    }
}