import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

export async function POST(req: Request) {
    const { code, redirect_uri } = await req.json();

    const issuer = process.env.CERTIFY_ISSUER!;
    const jwksUrl = process.env.CERTIFY_JWKS_URL!;
    const clientId = process.env.CLIENT_ID!;
    const clientSecret = process.env.CLIENT_SECRET!;

    if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });

    // 1) Exchange code -> token (server-side, secret stays here)
    const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");



    const form = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: redirect_uri ?? "http://localhost:3000/callback",
    });

    const tokenRes = await fetch(`${issuer}/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
    });

    const rawText = await tokenRes.text();
    let tokenJson: any;
    try { tokenJson = JSON.parse(rawText); } catch { tokenJson = { raw: rawText }; }

    if (!tokenRes.ok) {
        return NextResponse.json(
            { error: "token_exchange_failed", status: tokenRes.status, data: tokenJson },
            { status: 400 }
        );
    }

    const idToken = tokenJson.id_token;
    if (!idToken) return NextResponse.json({ error: "missing_id_token", data: tokenJson }, { status: 400 });

    // 2) Verify JWT using JWKS (RS256)
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));

    const { payload, protectedHeader } = await jwtVerify(idToken, JWKS, {
        issuer,
        audience: clientId,
    });

    // Optional: return claims (later: set httpOnly cookie)
    return NextResponse.json({
        ok: true,
        header: protectedHeader,
        claims: payload,
    });
}
