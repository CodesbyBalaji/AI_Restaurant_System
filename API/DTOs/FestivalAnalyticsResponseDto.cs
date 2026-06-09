namespace API.DTOs
{
    public class FestivalAnalyticsResponseDto
    {
        public string Title { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public int LastYearTotalSales { get; set; }
        public int PredictedTotalSales { get; set; }
        public double OverallGrowthPercent { get; set; }
        public string TopHistoricalDish { get; set; } = string.Empty;
        public string TopPredictedDish { get; set; } = string.Empty;
        public string Recommendation { get; set; } = string.Empty;
        public string CrowdTag { get; set; } = string.Empty;
        public List<string> OperationalAdvice { get; set; } = new();
        public List<FestivalAnalyticsDto> Items { get; set; } = new();
    }
}