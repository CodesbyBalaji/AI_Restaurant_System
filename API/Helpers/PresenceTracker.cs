using System.Collections.Concurrent;

namespace API.Helpers
{
    public class PresenceTracker
    {
        private static readonly ConcurrentDictionary<string, List<string>> OnlineUsers = new();

        public Task<bool> UserConnected(string userId, string connectionId)
        {
            var isOnline = false;

            lock (OnlineUsers)
            {
                if (OnlineUsers.ContainsKey(userId))
                {
                    OnlineUsers[userId].Add(connectionId);
                }
                else
                {
                    OnlineUsers[userId] = new List<string> { connectionId };
                    isOnline = true;
                }
            }

            return Task.FromResult(isOnline);
        }

        public Task<bool> UserDisconnected(string userId, string connectionId)
        {
            var isOffline = false;

            lock (OnlineUsers)
            {
                if (!OnlineUsers.ContainsKey(userId))
                    return Task.FromResult(isOffline);

                OnlineUsers[userId].Remove(connectionId);

                if (OnlineUsers[userId].Count == 0)
                {
                    OnlineUsers.Remove(userId, out _);
                    isOffline = true;
                }
            }

            return Task.FromResult(isOffline);
        }

        public Task<string[]> GetOnlineUsers()
        {
            string[] onlineUsers;

            lock (OnlineUsers)
            {
                onlineUsers = OnlineUsers.Keys.OrderBy(x => x).ToArray();
            }

            return Task.FromResult(onlineUsers);
        }
    }
}