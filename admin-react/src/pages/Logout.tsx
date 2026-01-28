import { useEffect } from "react";

export default function Logout() {
    useEffect(() => {
        (async () => {
            await fetch("/auth/api/logout", {
                method: "POST",
                credentials: "include",
            });

            // after cookie cleared, send back to login
            window.location.href = "/auth/login?returnUrl=%2Fadmin%2F";
        })();
    }, []);

    return <div style={{ padding: 24 }}>Logging out...</div>;
}
