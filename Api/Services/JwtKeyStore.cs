using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace Api.Services;

public sealed class JwtKeyStore
{
    private readonly RSA _rsa;
    public RsaSecurityKey Key { get; }

    public JwtKeyStore()
    {
        _rsa = RSA.Create(2048);

        Key = new RsaSecurityKey(_rsa)
        {
            KeyId = Guid.NewGuid().ToString("N") // kid
        };
    }

    public object GetJwks()
    {
        var rsaParams = _rsa.ExportParameters(false);

        return new
        {
            keys = new[]
            {
                new
                {
                    kty = "RSA",
                    use = "sig",
                    alg = "RS256",
                    kid = Key.KeyId,
                    n = Base64UrlEncoder.Encode(rsaParams.Modulus!),
                    e = Base64UrlEncoder.Encode(rsaParams.Exponent!)
                }
            }
        };
    }
}
