using System.Text;
using Newtonsoft.Json;

namespace API.Services;

public class MenuAIInsightService
{
    private readonly HttpClient _http;

    public MenuAIInsightService(HttpClient http)
    {
        _http = http;
    }

    public async Task<string> GenerateInsightAsync(

        string dishName,

        decimal price,

        decimal costPrice,

        decimal marginPercent,

        int demand,

        decimal demandRatio,

        decimal trendPercent,

        string category,

        decimal performanceScore,

        decimal suggestedPrice,

        string action
    )
    {
        
        var prompt = $@"

You are an expert restaurant business strategist.

Analyze this menu item and provide:

Provide ONE concise restaurant business insight.

Rules:
- Maximum 25 words
- No headings
- No bullet points
- No formatting
- One paragraph only

Keep response:
- professional
- under 50 words
- concise
- business-focused

Menu Item: {dishName}

Current Price: ₹{price}

Cost Price: ₹{costPrice}

Profit Margin: {marginPercent}%

Demand: {demand}

Demand Ratio: {demandRatio}

Weekly Trend: {trendPercent}%

Menu Category: {category}

Performance Score: {performanceScore}/100

Suggested Price: ₹{suggestedPrice}

Current Recommendation: {action}

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

        if (insight.Length > 300)
        {
            insight = insight.Substring(0, 300);
        }

        return insight;
    }
}