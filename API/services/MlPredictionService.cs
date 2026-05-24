using Newtonsoft.Json;
using System.Text;

namespace API.Services;

public class MlPredictionResult
{
    public int MenuItemId { get; set; }

    public double PredictedDemand { get; set; }

    public double TrendPercent { get; set; }

    public double ConfidencePercent { get; set; }
}

public class MlPredictionService
{
    private readonly HttpClient _http;

    public MlPredictionService(HttpClient http)
    {
        _http = http;
    }

    public async Task<Dictionary<int, MlPredictionResult>>
        PredictBatchAsync(
            List<int> itemIds,
            CancellationToken ct = default)
    {

        var payload = new
        {
            itemIds = itemIds
        };

        var json = JsonConvert.SerializeObject(payload);

        var content = new StringContent(
            json,
            Encoding.UTF8,
            "application/json"
        );

        var response = await _http.PostAsync(

            "http://127.0.0.1:8000/predict",

            content,

            ct
        );

        response.EnsureSuccessStatusCode();

        var result = await response.Content
            .ReadAsStringAsync(ct);

        var data = JsonConvert.DeserializeObject<
            List<MlPredictionResult>
        >(result)!;

        return data.ToDictionary(
            x => x.MenuItemId
        );
    }
}