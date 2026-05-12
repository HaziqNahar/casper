import { useEffect } from "react";
import { clearAccessToken } from "../services/apiClient";
import { authApi } from "../services/authApi";

export default function Logout() {
    useEffect(() => {
        (async () => {
            try {
                await authApi.logout();
            } finally {
                clearAccessToken();
            }

            window.location.href = "/auth/login?returnUrl=%2Fadmin%2F";
        })();
    }, []);

    return <div style={{ padding: 24 }}>Logging out...</div>;
}