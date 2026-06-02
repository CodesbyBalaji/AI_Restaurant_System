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

        decimal currentPrice,

        decimal costPrice,

        decimal marginPercent,

        int currentDemand,

        double predictedDemand,

        double trendPercent,

        double confidencePercent
    )
    {

        var prompt = $@"

You are an AI restaurant menu optimization expert.

Analyze this restaurant menu item.

Dish Name: {dishName}

Current Price: ₹{currentPrice}

Cost Price: ₹{costPrice}

Profit Margin: {marginPercent}%

Current Monthly Demand: {currentDemand}

Predicted Weekly Demand: {predictedDemand}

Demand Trend: {trendPercent}%

Forecast Confidence: {confidencePercent}%

Your job:
- optimize pricing
- optimize promotions
- optimize inventory strategy
- classify menu performance

Return ONLY valid JSON.

JSON FORMAT:

{{
  ""optimizedPrice"": number,
  ""category"": ""string"",
  ""strategy"": ""string"",
  ""promotion"": ""string"",
  ""priority"": ""string"",
  ""inventoryAction"": ""string""
}}

RULES:
- optimizedPrice must be realistic
- max increase 8%
- max decrease 5%
- short responses only
- no explanations
- no markdown
- no extra text
- valid JSON only

CATEGORY OPTIONS:
Star Item
Popular Item
Premium Item
Needs Improvement

PRIORITY OPTIONS:
High
Medium
Low

";

        var payload = new
        {
            model = "phi3",

            prompt = prompt,

            stream = false,

            options = new
            {
                temperature = 0.2,

                top_p = 0.2,

                top_k = 10,

                num_predict = 120
            }
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

        string aiResponse = data.response;

        aiResponse = aiResponse
            .Replace("\n", " ")
            .Replace("\r", " ")
            .Trim();

        var start = aiResponse.IndexOf("{");

        var end = aiResponse.LastIndexOf("}");

        if (start >= 0 && end >= 0)
        {
            aiResponse = aiResponse.Substring(
                start,
                end - start + 1
            );
        }

        if (string.IsNullOrWhiteSpace(aiResponse))
        {
            aiResponse = $@"
{{
  ""optimizedPrice"": {currentPrice},
  ""category"": ""Popular Item"",
  ""strategy"": ""Maintain current pricing"",
  ""promotion"": ""Weekend combo offers"",
  ""priority"": ""Medium"",
  ""inventoryAction"": ""Maintain inventory levels""
}}";
        }

        return aiResponse;
    }
}