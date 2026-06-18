using API.Data;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatController : ControllerBase
    {
        public const string AiUserId = "RestaurantAI";

        private readonly AppDbContext _context;

        public ChatController(AppDbContext context)
        {
            _context = context;
        }

        private string? CurrentUserId =>
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        [HttpGet("conversation")]
        public async Task<ActionResult<List<Message>>> GetConversation(string otherUserId)
        {
            var currentUserId = CurrentUserId;

            if (string.IsNullOrWhiteSpace(currentUserId) || string.IsNullOrWhiteSpace(otherUserId))
                return Unauthorized();

            var messages = await _context.Messages
                .Where(m =>
                    (m.SenderId == currentUserId && m.ReceiverId == otherUserId) ||
                    (m.SenderId == otherUserId && m.ReceiverId == currentUserId))
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            return Ok(messages);
        }

        [HttpPost("mark-read/{messageId}")]
        public async Task<IActionResult> MarkRead(Guid messageId)
        {
            var currentUserId = CurrentUserId;

            if (string.IsNullOrWhiteSpace(currentUserId))
                return Unauthorized();

            var message = await _context.Messages.FindAsync(messageId);

            if (message == null)
                return NotFound();

            if (!string.Equals(message.ReceiverId, currentUserId, StringComparison.OrdinalIgnoreCase))
                return Forbid();

            if (message.ReadAt == null)
            {
                message.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok();
        }

        [HttpGet("last-message")]
        public async Task<IActionResult> GetLastMessage(string otherUserId)
        {
            var currentUserId = CurrentUserId;

            if (string.IsNullOrWhiteSpace(currentUserId) || string.IsNullOrWhiteSpace(otherUserId))
                return Unauthorized();

            var message = await _context.Messages
                .Where(m =>
                    (m.SenderId == currentUserId && m.ReceiverId == otherUserId) ||
                    (m.SenderId == otherUserId && m.ReceiverId == currentUserId))
                .OrderByDescending(m => m.SentAt)
                .FirstOrDefaultAsync();

            return Ok(message);
        }

        [HttpDelete("{messageId}")]
        public async Task<IActionResult> DeleteMessage(Guid messageId)
        {
            var currentUserId = CurrentUserId;

            if (string.IsNullOrWhiteSpace(currentUserId))
                return Unauthorized();

            var message = await _context.Messages.FindAsync(messageId);

            if (message == null)
                return NotFound();

            if (!string.Equals(message.SenderId, currentUserId, StringComparison.OrdinalIgnoreCase))
                return Forbid();

            _context.Messages.Remove(message);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}