import { useEffect } from "react";

const EVT_KEY = "kc_access_requests_updated";

export function useAccessRequestsLive(onChange: () => void) {
    useEffect(() => {
        const handler = () => onChange();

        // same-tab broadcast
        window.addEventListener(EVT_KEY, handler);

        // cross-tab localStorage changes
        window.addEventListener("storage", (e) => {
            if (e.key === "kc_access_requests_v1" || e.key === "kc_access_request_events_v1" || e.key === EVT_KEY) {
                onChange();
            }
        });

        return () => {
            window.removeEventListener(EVT_KEY, handler);
            window.removeEventListener("storage", handler as any);
        };
    }, [onChange]);
}