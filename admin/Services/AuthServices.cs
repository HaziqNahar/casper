using System.Net.Http.Json;

public class AuthServices
{
    private readonly HttpClient _http;

    public AuthServices(HttpClient http)
    {
        _http = http;
    }

    public async Task Logout()
    {
        await _http.PostAsync("/auth/api/logout", null);
    }
}
