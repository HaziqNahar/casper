import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { code, state } = await req.json();

        if (!code) {
            return NextResponse.json({ error: "missing_code" }, { status: 400 });
        }

        const baseUrl = process.env.CASPER_BASE_URL!;
        const clientId = process.env.CASPER_CLIENT_ID!;
        const clientSecret = process.env.CASPER_CLIENT_SECRET!;
        const redirectUri = process.env.CASPER_REDIRECT_URI!;

        // Basic base64(client_id:client_secret)
        const pair = `${clientId}:${clientSecret}`;
        const basic = Buffer.from(pair, "utf8").toString("base64");

        const body = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            code,
            redirect_uri: redirectUri,
        });

        const res = await fetch(`${baseUrl}/oauth2/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basic}`,
            },
            body: body.toString(),
            cache: "no-store",
        });

        const text = await res.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }

        // return status + payload so callback page can render it
        return NextResponse.json({ state, status: res.status, data }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: "exchange_failed", message: e?.message ?? String(e) },
            { status: 500 }
        );
    }
}
