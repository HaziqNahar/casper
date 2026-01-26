using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;

namespace Api.Services;

public sealed class TokenService
{
    private readonly JwtKeyStore _keys;

    public TokenService(JwtKeyStore keys) => _keys = keys;

    public string CreateIdToken(string issuer, string audience, string subject, IEnumerable<Claim> extraClaims, int expiresMinutes = 30)
    {
        var now = DateTime.UtcNow;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, subject),
            new(JwtRegisteredClaimNames.Iss, issuer),
            new(JwtRegisteredClaimNames.Iat, Epoch(now).ToString(), ClaimValueTypes.Integer64),
        };

        claims.AddRange(extraClaims);

        var creds = new SigningCredentials(_keys.Key, SecurityAlgorithms.RsaSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(expiresMinutes),
            signingCredentials: creds
        );

        // include kid in header
        token.Header["kid"] = _keys.Key.KeyId;

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static long Epoch(DateTime utc) => (long)(utc - DateTime.UnixEpoch).TotalSeconds;
}
