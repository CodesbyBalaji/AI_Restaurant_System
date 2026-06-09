using System.Text;
using Newtonsoft.Json;

namespace API.Services;

public class AIInsightService
{
    private readonly HttpClient _http;

    public AIInsightService(HttpClient http)
    {
        _http = http;
    }

    public async Task<string> GenerateOverallInsightAsync(
        List<object> forecasts
    )
    {

        var summary = "";

        foreach (dynamic item in forecasts)
        {
            summary += $@"

Dish: {item.DishName}
This Week: {item.ThisWeek}
Last Week: {item.LastWeek}
Trend: {item.TrendPercent}%
Predicted Next Week: {item.PredictedNextWeek}
Recommendation: {item.Recommendation}

";
        }

        var prompt = $@"
You are an AI restaurant analytics assistant.

Analyze the restaurant demand forecasting data.

Provide:
- ONE concise analytical insight

Rules:
- Use numbers and percentages
- Mention demand changes clearly
- Mention highest growth or risk items
- Maximum 40 words
- Professional business tone
- No bullet points
- No headings
- One paragraph only

Forecast Data:

{summary}
";

        var payload = new
        {
            model = "phi3",

            prompt = prompt,

            stream = false
        };

        var json = JsonConvert.SerializeObject(payload);

        var content = new StringContent(
            json,
            Encoding.UTF8,
            "application/json"
        );

        var response = await _http.PostAsync(
            "http://localhost:11434/api/generate",
            content
        );

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadAsStringAsync();

        dynamic data = JsonConvert.DeserializeObject(result)!;

        string insight = data.response;

        insight = insight
            .Replace("\n", " ")
            .Replace("\r", " ")
            .Trim();

        return insight;
    }
}