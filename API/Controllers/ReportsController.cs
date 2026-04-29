using API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin,Manager")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;
    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("peak-hours")]
    public async Task<IActionResult> GetPeakHours()
    {
        var result = await _context.Orders
            .GroupBy(o => o.OrderedAt.Hour)
            .Select(g => new
            {
                Hour = g.Key,
                OrderCount = g.Count()
            })
            .OrderByDescending(x => x.OrderCount)
            .ToListAsync();
        return Ok(result);
    }

    [HttpGet("top-dishes")]
    public async Task<IActionResult> GetTopDishes()
    {
        var result = await _context.Orders
            .GroupBy(o => o.MenuItemName)
            .Select(g => new
            {
                MenuItemName = g.Key,
                TotalOrders = g.Sum(x => x.Quantity)
            })
            .OrderByDescending(x => x.TotalOrders)
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("revenue")]
    public async Task<IActionResult> GetRevenue()
    {
        var totalRevenue = await _context.Orders
            .SumAsync(o => o.TotalPrice);

        return Ok(new { TotalRevenue = totalRevenue });
    }

}