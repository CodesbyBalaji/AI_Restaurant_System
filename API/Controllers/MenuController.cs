using API.Data;
using API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class MenuController : ControllerBase
{
    private readonly MenuOptService _service;
    private readonly AppDbContext _context;

    public MenuController(MenuOptService service, AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetMenu()
    {
        var items = await _context.MenuItems.ToListAsync();
        return Ok(items);
    }

    [HttpGet("optimize")]
    public async Task<IActionResult> GetInsights()
    {
        var result = await _service.GetInsightsAsync();
        return Ok(result);
    }

    [HttpPut("{id}/price")]
    public async Task<IActionResult> UpdatePrice(int id, [FromBody] decimal newPrice)
    {
        var item = await _context.MenuItems.FindAsync(id);

        if (item == null)
            return NotFound();

        item.Price = newPrice;

        await _context.SaveChangesAsync();

        return NoContent();
    }
}