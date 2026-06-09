using API.Data;
using API.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace API.Controllers
{
    [ApiController]
    [Route("api/festival")]
    public class FestivalController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly HttpClient _http;

        public FestivalController(AppDbContext context, HttpClient http)
        {
            _context = context;
            _http = http;
        }

        [HttpGet("analytics/{festivalDate}")]
        public async Task<ActionResult<FestivalAnalyticsResponseDto>> GetFestivalAnalytics(string festivalDate)
        {
            if (!DateTime.TryParse(festivalDate, out var date))
            {
                return BadRequest("Invalid festival date.");
            }

            var lastYearDate = date.AddYears(-1);

            var historicalSales = await _context.Orders
                .Where(x =>
                    x.OrderedAt.Date == lastYearDate.Date &&
                    x.Status != "Cancelled")
                .GroupBy(x => x.MenuItemName)
                .Select(g => new
                {
                    DishName = g.Key,
                    LastYearSales = g.Sum(x => x.Quantity)
                })
                .ToListAsync();

            var prophetUrl = $"http://localhost:8000/festival/predict/{festivalDate}";
            var response = await _http.GetAsync(prophetUrl);

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, "Failed to fetch festival predictions.");
            }

            var json = await response.Content.ReadAsStringAsync();
            var predictions = JsonConvert.DeserializeObject<JArray>(json) ?? new JArray();

            var predictionMap = predictions
                .Cast<JObject>()
                .Where(p => p.GetValue("dishName", StringComparison.OrdinalIgnoreCase) != null)
                .ToDictionary(
                    p => p.GetValue("dishName", StringComparison.OrdinalIgnoreCase)!.ToString(),
                    p => p.GetValue("predictedSales", StringComparison.OrdinalIgnoreCase)?.Value<int>() ?? 0
                );

            var allDishNames = historicalSales
                .Select(x => x.DishName)
                .Union(predictionMap.Keys)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

            var items = allDishNames
                .Select(dish =>
                {
                    var lastYearSales = historicalSales
                        .FirstOrDefault(x => x.DishName == dish)?.LastYearSales ?? 0;

                    var predictedSales = predictionMap.ContainsKey(dish)
                        ? predictionMap[dish]
                        : 0;

                    double growth = 0;

                    if (lastYearSales > 0)
                    {
                        growth = Math.Round(((predictedSales - lastYearSales) / (double)lastYearSales) * 100, 1);
                    }
                    else if (predictedSales > 0)
                    {
                        growth = 100;
                    }

                    return new FestivalAnalyticsDto
                    {
                        DishName = dish,
                        LastYearSales = lastYearSales,
                        PredictedSales = predictedSales,
                        GrowthPercent = growth
                    };
                })
                .OrderByDescending(x => x.PredictedSales)
                .ToList();

            for (int i = 0; i < items.Count; i++)
            {
                items[i].Rank = i + 1;
            }

            var lastYearTotalSales = items.Sum(x => x.LastYearSales);
            var predictedTotalSales = items.Sum(x => x.PredictedSales);

            double overallGrowthPercent = 0;
            if (lastYearTotalSales > 0)
            {
                overallGrowthPercent = Math.Round(
                    ((predictedTotalSales - lastYearTotalSales) / (double)lastYearTotalSales) * 100,
                    1
                );
            }

            var topHistoricalDish = items
                .OrderByDescending(x => x.LastYearSales)
                .FirstOrDefault()?.DishName ?? "-";

            var topPredictedDish = items
                .OrderByDescending(x => x.PredictedSales)
                .FirstOrDefault()?.DishName ?? "-";

            var result = new FestivalAnalyticsResponseDto
            {
                Title = GetFestivalTitle(date),
                Date = date,
                LastYearTotalSales = lastYearTotalSales,
                PredictedTotalSales = predictedTotalSales,
                OverallGrowthPercent = overallGrowthPercent,
                TopHistoricalDish = topHistoricalDish,
                TopPredictedDish = topPredictedDish,
                Recommendation = GetFestivalRecommendation(overallGrowthPercent),
                CrowdTag = GetCrowdTag(overallGrowthPercent),
                OperationalAdvice = GetOperationalAdvice(items, overallGrowthPercent),
                Items = items
            };

            return Ok(result);
        }

        private string GetFestivalTitle(DateTime date)
        {
            var festivals = new Dictionary<string, string>
            {
                { "01-14", "🪔 Pongal" },
                { "01-26", "🇮🇳 Republic Day" },
                { "03-21", "🌙 Ramzan" },
                { "04-14", "🌸 Tamil New Year" },
                { "05-28", "🐐 Bakrid" },
                { "08-15", "🇮🇳 Independence Day" },
                { "09-05", "🐘 Ganesh Chaturthi" },
                { "10-20", "🪔 Ayudha Pooja" },
                { "11-12", "🎆 Diwali" },
                { "12-25", "🎄 Christmas" }
            };

            var key = date.ToString("MM-dd");
            return festivals.ContainsKey(key) ? festivals[key] : "Festival";
        }

        private string GetFestivalRecommendation(double growth)
        {
            if (growth > 25)
                return "High demand likely. Prepare extra stock, staff, and fast-moving combos.";

            if (growth > 10)
                return "Moderate growth expected. Increase inventory for top dishes and keep staff ready.";

            if (growth >= 0)
                return "Stable demand expected. Maintain balanced stock and monitor live orders.";

            return "Demand may soften. Avoid overstocking and track underperforming dishes closely.";
        }

        private string GetCrowdTag(double growth)
        {
            if (growth > 25) return "High Rush Expected";
            if (growth > 10) return "Busy Festival Window";
            if (growth >= 0) return "Balanced Traffic";
            return "Soft Demand Risk";
        }

        private List<string> GetOperationalAdvice(List<FestivalAnalyticsDto> items, double growth)
        {
            var advice = new List<string>();

            var topTwo = items
                .OrderByDescending(x => x.PredictedSales)
                .Take(2)
                .Select(x => x.DishName)
                .ToList();

            var lowPerformer = items
                .OrderBy(x => x.GrowthPercent)
                .FirstOrDefault()?.DishName;

            if (topTwo.Any())
            {
                advice.Add($"Prioritize prep for {string.Join(" and ", topTwo)}.");
            }

            if (growth > 15)
            {
                advice.Add("Increase staffing for peak ordering hours.");
            }
            else
            {
                advice.Add("Keep inventory balanced and monitor live ordering trends.");
            }

            if (!string.IsNullOrWhiteSpace(lowPerformer))
            {
                advice.Add($"Watch {lowPerformer} carefully to avoid overproduction.");
            }

            return advice;
        }
    }
}