using Microsoft.AspNetCore.Mvc;
using Api.Services;

namespace Api.Controllers;

[ApiController]
[Route(".well-known")]
public class WellKnownController : ControllerBase
{
    private readonly JwtKeyStore _keys;

    public WellKnownController(JwtKeyStore keys) => _keys = keys;

    [HttpGet("jwks.json")]
    public IActionResult Jwks()
    {
        return Ok(_keys.GetJwks());
    }

    [HttpGet("openid-configuration")]
    public IActionResult Discovery()
    {
        var issuer = "http://localhost:5000"; // later: from config

        return Ok(new
        {
            issuer,
            jwks_uri = $"{issuer}/.well-known/jwks.json",
            authorization_endpoint = $"{issuer}/login",
            token_endpoint = $"{issuer}/token",
            response_types_supported = new[] { "code" },
            subject_types_supported = new[] { "public" },
            id_token_signing_alg_values_supported = new[] { "RS256" },
            scopes_supported = new[] { "openid" },
            token_endpoint_auth_methods_supported = new[] { "client_secret_basic" }
        });
    }
}
