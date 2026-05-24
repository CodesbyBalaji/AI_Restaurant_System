using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using API.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin,Manager")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderResponseDto>>> GetAll(
        [FromQuery] string filter = "week")
    {
        var now = DateTime.Now;

        IQueryable<Order> query = _context.Orders;

        query = filter.ToLower() switch
        {
            "day" => query.Where(o =>
                o.OrderedAt.Date == now.Date),

            "week" => query.Where(o =>
                o.OrderedAt >= now.AddDays(-7)),

            "month" => query.Where(o =>
                o.OrderedAt >= now.AddMonths(-1)),

            _ => query.Where(o =>
                o.OrderedAt >= now.AddDays(-7))
        };

        var limit = filter.ToLower() switch
        {
            "day" => 50,
            "week" => 200,
            "month" => 500,
            _ => 200
        };

        var orders = await query
            .OrderByDescending(o => o.OrderedAt)
            .Take(limit)
            .ToListAsync();

        var result = orders.Select(o => new OrderResponseDto
        {
            Id = o.Id,
            MenuItemName = o.MenuItemName,
            Quantity = o.Quantity,
            TotalPrice = o.TotalPrice,
            OrderedAt = o.OrderedAt,
            Status = o.Status
        });

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<OrderResponseDto>> Create(CreateOrderDto dto)
    {
        var menuItem = await _context.MenuItems.FindAsync(dto.MenuItemId);

        if (menuItem == null)
            return BadRequest("Invalid MenuItemId");

        var order = new Order
        {
            MenuItemId = dto.MenuItemId,
            MenuItemName = menuItem.Name,
            Quantity = dto.Quantity,
            TotalPrice = menuItem.Price * dto.Quantity,
            OrderedAt = DateTime.Now,
            Status = "Pending"
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var response = new OrderResponseDto
        {
            Id = order.Id,
            MenuItemName = order.MenuItemName,
            Quantity = order.Quantity,
            TotalPrice = order.TotalPrice,
            OrderedAt = order.OrderedAt,
            Status = order.Status
        };

        return Ok(response);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
    {
        var order = await _context.Orders.FindAsync(id);

        if (order == null)
            return NotFound();

        order.Status = status;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var order = await _context.Orders.FindAsync(id);

        if (order == null)
            return NotFound();

        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}