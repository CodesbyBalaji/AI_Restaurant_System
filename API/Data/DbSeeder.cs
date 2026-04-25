using API.Models;

namespace API.Data;

public static class DbSeeder
{
    public static void Seed(AppDbContext context)
    {
        if (context.MenuItems.Any()) return;

        var menuItems = new List<MenuItem>
        {
            new MenuItem { Name = "Biryani", Category = "Main", Price = 180, CostPrice = 80 },
            new MenuItem { Name = "Fried Rice", Category = "Main", Price = 150, CostPrice = 70 },
            new MenuItem { Name = "Noodles", Category = "Main", Price = 140, CostPrice = 60 },
            new MenuItem { Name = "Burger", Category = "Fast Food", Price = 120, CostPrice = 50 },
            new MenuItem { Name = "Pizza", Category = "Fast Food", Price = 250, CostPrice = 120 }
        };

        context.MenuItems.AddRange(menuItems);
        context.SaveChanges();

        var random = new Random();

        var orders = new List<Order>();

        for (int i = 0; i < 100; i++)
        {
            var item = menuItems[random.Next(menuItems.Count)];
            var qty = random.Next(1, 5);

            orders.Add(new Order
            {
                MenuItemId = item.Id,
                MenuItemName = item.Name,
                Quantity = qty,
                TotalPrice = item.Price * qty,
                OrderedAt = DateTime.UtcNow.AddHours(-random.Next(1, 72)), // last 3 days
                Status = "Completed"
            });
        }

        context.Orders.AddRange(orders);
        context.SaveChanges();
    }
}