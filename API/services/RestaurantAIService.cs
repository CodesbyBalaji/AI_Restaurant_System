using System.Text;
using System.Text.Json;

namespace API.Services;

public class RestaurantAIService
{
    private readonly HttpClient http;
    private readonly DemandService demandService;
    private readonly MenuOptService menuOptService;

    public RestaurantAIService(
        HttpClient http,
        DemandService demandService,
        MenuOptService menuOptService)
    {
        this.http = http;
        this.demandService = demandService;
        this.menuOptService = menuOptService;
    }

    public async Task<string> AskAsync(
        string userQuestion,
        CancellationToken ct = default)
    {
        var demand =
            await demandService.PredictDemandAsync(ct);

        var optimizedMenu =
            await menuOptService.GetOptimizedMenuAsync();

        var prompt = $"""
You are RestaurantAI.

You help restaurant managers make inventory and menu decisions.

Demand Forecast:

{JsonSerializer.Serialize(demand)}

Menu Optimization:

{JsonSerializer.Serialize(optimizedMenu)}

Question:

{userQuestion}

Rules:

1. Answer in simple English.
2. Use bullet points.
3. Give stock recommendations.
4. Mention confidence level.
5. Keep answer below 120 words.
""";

        var request = new
        {
            model = "qwen2.5:3b",
            stream = false,
            prompt = prompt
        };

        var response =
            await http.PostAsJsonAsync(
                "http://localhost:11434/api/generate",
                request,
                ct);

        response.EnsureSuccessStatusCode();

        var json =
            await response.Content.ReadFromJsonAsync<JsonElement>();

        return json
            .GetProperty("response")
            .GetString()
            ?? "";
    }
}