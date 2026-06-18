using System.Security.Claims;
using API.Data;
using API.Models;
using API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    public const string AiUserId = "RestaurantAI";

    private readonly AppDbContext _context;
    private readonly RestaurantAIService _restaurantAI;

    public ChatHub(
        AppDbContext context,
        RestaurantAIService restaurantAI)
    {
        _context = context;
        _restaurantAI = restaurantAI;
    }

    public async Task SendMessage(string receiverId, string content)
    {
        var senderId = Context.UserIdentifier
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(senderId) ||
            string.IsNullOrWhiteSpace(receiverId) ||
            string.IsNullOrWhiteSpace(content))
            return;

        content = content.Trim();

        if (receiverId.Equals(AiUserId, StringComparison.Ordinal))
        {
            await HandleAiConversation(senderId, content);
            return;
        }

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

    private async Task HandleAiConversation(string senderId, string content)
    {
        var userMessage = new Message
        {
            SenderId = senderId,
            ReceiverId = AiUserId,
            Content = content,
            SentAt = DateTime.UtcNow,
            DeliveredAt = DateTime.UtcNow
        };

        _context.Messages.Add(userMessage);
        await _context.SaveChangesAsync();

        await Clients.User(senderId).SendAsync("ReceiveMessage", userMessage);
        await Clients.User(senderId).SendAsync("MessageDelivered", userMessage.Id);
        await Clients.User(senderId).SendAsync("AITyping");

        var prompt = content.StartsWith("@ai", StringComparison.OrdinalIgnoreCase)
            ? content
            : $"@ai {content}";

        var reply = await _restaurantAI.AskAsync(prompt);

        var aiMessage = new Message
        {
            SenderId = AiUserId,
            ReceiverId = senderId,
            Content = reply,
            SentAt = DateTime.UtcNow,
            DeliveredAt = DateTime.UtcNow
        };

        _context.Messages.Add(aiMessage);
        await _context.SaveChangesAsync();

        await Clients.User(senderId).SendAsync("ReceiveMessage", aiMessage);
        await Clients.User(senderId).SendAsync("AIStoppedTyping");
    }

    public async Task MarkAsRead(Guid messageId)
    {
        var currentUser = Context.UserIdentifier
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(currentUser))
            return;

        var message = await _context.Messages.FindAsync(messageId);

        if (message == null)
            return;

        if (!string.Equals(message.ReceiverId, currentUser, StringComparison.OrdinalIgnoreCase))
            return;

        if (message.ReadAt == null)
        {
            message.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        await Clients.User(message.SenderId).SendAsync("MessageRead", messageId);
    }

    public async Task DeleteMessage(Guid messageId)
    {
        var currentUser = Context.UserIdentifier
            ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(currentUser))
            return;

        var message = await _context.Messages.FindAsync(messageId);

        if (message == null)
            return;

        if (!string.Equals(message.SenderId, currentUser, StringComparison.OrdinalIgnoreCase))
            return;

        _context.Messages.Remove(message);
        await _context.SaveChangesAsync();

        await Clients.User(message.SenderId).SendAsync("MessageDeleted", messageId);
        await Clients.User(message.ReceiverId).SendAsync("MessageDeleted", messageId);
    }
}