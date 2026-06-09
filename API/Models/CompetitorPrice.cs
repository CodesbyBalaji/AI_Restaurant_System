namespace API.Models;

public class CompetitorPrice
{
    public int Id { get; set; }

    public string Restaurant { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;

    public string DishCategory { get; set; } = string.Empty;

    public string DishName { get; set; } = string.Empty;

    public decimal MinPrice { get; set; }

    public decimal MaxPrice { get; set; }

    public string Source { get; set; } = string.Empty;

    public DateTime CollectedAt { get; set; }
}