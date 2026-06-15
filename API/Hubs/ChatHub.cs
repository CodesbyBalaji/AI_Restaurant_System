using System.Security.Claims;
using API.Data;
using API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly AppDbContext _context;

        public ChatHub(AppDbContext context)
        {
            _context = context;
        }

        public async Task SendMessage(string receiverId, string content)
        {
            var senderId = Context.User?.FindFirst(ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(senderId))
                return;

            var message = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                Content = content,
                SentAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            await Clients.User(receiverId).SendAsync("ReceiveMessage", message);
            await Clients.User(senderId).SendAsync("ReceiveMessage", message);

            message.DeliveredAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await Clients.User(senderId).SendAsync("MessageDelivered", message.Id);
        }

        public async Task MarkAsRead(Guid messageId)
        {
            var message = await _context.Messages.FindAsync(messageId);

            if (message == null)
                return;

            message.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await Clients.User(message.SenderId).SendAsync("MessageRead", messageId);
        }

        public async Task DeleteMessage(Guid messageId)
        {
            var currentUser = Context.User?.FindFirst(ClaimTypes.Name)?.Value;
            var message = await _context.Messages.FindAsync(messageId);

            if (message == null || string.IsNullOrEmpty(currentUser))
                return;

            if (message.SenderId != currentUser)
                return;

            _context.Messages.Remove(message);
            await _context.SaveChangesAsync();

            await Clients.User(message.SenderId).SendAsync("MessageDeleted", messageId);
            await Clients.User(message.ReceiverId).SendAsync("MessageDeleted", messageId);
        }
    }
}