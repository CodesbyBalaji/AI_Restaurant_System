using System.Security.Claims;
using API.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs
{
    [Authorize]
    public class PresenceHub : Hub
    {
        private readonly PresenceTracker _tracker;

        public PresenceHub(PresenceTracker tracker)
        {
            _tracker = tracker;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.Name)?.Value;

            Console.WriteLine($"Presence connected user: {userId}, connectionId: {Context.ConnectionId}");

            if (!string.IsNullOrEmpty(userId))
            {
                var isOnline = await _tracker.UserConnected(userId, Context.ConnectionId);

                if (isOnline)
                {
                    await Clients.All.SendAsync("UserOnline", userId);
                }

                var onlineUsers = await _tracker.GetOnlineUsers();
                await Clients.Caller.SendAsync("GetOnlineUsers", onlineUsers);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.Name)?.Value;

            Console.WriteLine($"Presence disconnected user: {userId}, connectionId: {Context.ConnectionId}");

            if (!string.IsNullOrEmpty(userId))
            {
                var isOffline = await _tracker.UserDisconnected(userId, Context.ConnectionId);

                if (isOffline)
                {
                    await Clients.All.SendAsync("UserOffline", userId);
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task GetOnlineUsers()
        {
            var onlineUsers = await _tracker.GetOnlineUsers();
            await Clients.Caller.SendAsync("GetOnlineUsers", onlineUsers);
        }
    }
}