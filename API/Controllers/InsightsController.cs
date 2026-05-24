using Microsoft.AspNetCore.Mvc;
using API.Services;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class InsightsController : ControllerBase
{
    private readonly DemandService _demand;

    private readonly AIInsightService _ai;

    public InsightsController(
        DemandService demand,
        AIInsightService ai)
    {
        _demand = demand;

        _ai = ai;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {

        var forecasts =
            await _demand.PredictDemandAsync();

        var insight =
            await _ai.GenerateOverallInsightAsync(

                forecasts.Cast<object>().ToList()
            );

        return Ok(new
        {
            insight
        });
    }
}