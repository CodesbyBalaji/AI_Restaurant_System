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
    var today = DateTime.UtcNow.Date;

    var lastWeekStart = today.AddDays(-7);
    var prevWeekStart = today.AddDays(-14);

    var data = await _context.MenuItems
        .Select(m => new
        {
            DishName = m.Name,

            LastWeek = m.Orders
                .Where(o => o.OrderedAt >= lastWeekStart && o.OrderedAt < today)
                .Sum(o => (int?)o.Quantity) ?? 0,

            PrevWeek = m.Orders
                .Where(o => o.OrderedAt >= prevWeekStart && o.OrderedAt < lastWeekStart)
                .Sum(o => (int?)o.Quantity) ?? 0
        })
        .Where(x => x.LastWeek > 0 || x.PrevWeek > 0)
        .ToListAsync();

    var result = data.Select(d =>
    {
        double growth = 0;

        if (d.PrevWeek > 0)
        {
            growth = ((double)(d.LastWeek - d.PrevWeek) / d.PrevWeek) * 100;
        }

        var predicted = d.LastWeek + (d.LastWeek * growth / 100);

        return new
        {
            dishName = d.DishName,
            lastWeekActual = d.LastWeek,
            previousWeek = d.PrevWeek,
            trendPercent = Math.Round(growth, 2),
            predictedNextWeek = (int)Math.Round(Math.Max(predicted, 0)),

            confidencePercent = d.PrevWeek == 0 ? 60 : 85
        };
    });

    return result.ToList<object>();
}
}