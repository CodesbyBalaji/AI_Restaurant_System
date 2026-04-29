using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Models;
using Microsoft.AspNetCore.Authorization;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class MenuController : ControllerBase
{
    private readonly AppDbContext _context;

    public MenuController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<MenuItem>>> GetAll()
    {
        return await _context.MenuItems.ToListAsync();
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<MenuItem>> GetById(int id)
    {
        var item = await _context.MenuItems.FindAsync(id);

        if (item == null)
            return NotFound();

        return item;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MenuItem>> Create(MenuItem item)
    {
        _context.MenuItems.Add(item);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, MenuItem updatedItem)
    {
        if (id != updatedItem.Id)
            return BadRequest();

        _context.Entry(updatedItem).State = EntityState.Modified;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _context.MenuItems.FindAsync(id);

        if (item == null)
            return NotFound();

        _context.MenuItems.Remove(item);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}