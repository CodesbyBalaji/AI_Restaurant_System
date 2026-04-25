namespace API.DTOs;

public class OrderResponseDto
{
    public int Id { get; set; }
    public required string MenuItemName { get; set; }
    public int Quantity { get; set; }
    public decimal TotalPrice { get; set; }
    public DateTime OrderedAt { get; set; }
    public required string Status { get; set; }
}