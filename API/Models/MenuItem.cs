using System.ComponentModel.DataAnnotations.Schema;

namespace API.Models;

public class MenuItem
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public required string Category { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Price { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal CostPrice { get; set; }

    public bool IsAvailable { get; set; } = true;

    public List<Order> Orders { get; set; } = new();
}