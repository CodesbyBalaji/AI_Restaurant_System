namespace API.DTOs
{
    public class FestivalAnalyticsDto
    {
        public string DishName { get; set; } = string.Empty;
        public int LastYearSales { get; set; }
        public int PredictedSales { get; set; }
        public double GrowthPercent { get; set; }
        public int Rank { get; set; }
    }
}