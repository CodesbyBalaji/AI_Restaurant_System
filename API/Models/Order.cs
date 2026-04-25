using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models;

public class Order
{
    public int Id { get; set; }

    public int MenuItemId { get; set; }

    // Navigation Property (relationship)
    public MenuItem? MenuItem { get; set; }

    public required string MenuItemName { get; set; }

    public int Quantity { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalPrice { get; set; }

    public DateTime OrderedAt { get; set; } = DateTime.UtcNow;

    public string Status { get; set; } = "Pending";
}