"use client";

import { useEffect, useState } from "react";


export default function Callback() {
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    async function run() {
      if (!code) {
        setResult({ error: "missing_code", state });
        return;
      }

      const res = await fetch("/api/oauth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, state }),
      });

      const data = await res.json();
      setResult(data);
    }

    run().catch((e) => setResult({ error: "callback_failed", message: String(e) }));
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>Certify-style OAuth Callback</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {result ? JSON.stringify(result, null, 2) : "Exchanging code for id_token..."}
      </pre>
    </div>
  );
}
