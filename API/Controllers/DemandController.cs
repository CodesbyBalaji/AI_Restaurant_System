using API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin,Manager")]
public class DemandController : ControllerBase
{
    private readonly DemandService _service;

    public DemandController(DemandService service)
    {
        _service = service;
    }

    [HttpGet("predict")]
    public async Task<IActionResult> Predict()
    {
        var result = await _service.PredictDemand();
        return Ok(result);
    }
}