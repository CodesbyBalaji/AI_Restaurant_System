using Newtonsoft.Json;
using System.Net.Http.Headers;
using System.Text;

namespace API.Tests.Integration;

public static class ApiTestHelper
{
    private const string BaseUrl = "http://localhost:5000";

    public static HttpClient CreateClient()
    {
        return new HttpClient
        {
            BaseAddress = new Uri(BaseUrl)
        };
    }

    public static async Task<string> GetJwtTokenAsync(HttpClient client)
    {
        var login = new
        {
            username = "admin",
            password = "admin123"
        };

        var json = JsonConvert.SerializeObject(login);

        var response = await client.PostAsync(
            "/api/auth/login",
            new StringContent(json, Encoding.UTF8, "application/json"));

        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();

        dynamic result = JsonConvert.DeserializeObject(content)!;

        return result.token;
    }

    public static async Task AuthenticateAsync(HttpClient client)
    {
        var token = await GetJwtTokenAsync(client);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }
}