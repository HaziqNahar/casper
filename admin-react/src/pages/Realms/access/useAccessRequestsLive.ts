import { useEffect } from "react";

const EVT_KEY = "kc_access_requests_updated";

export function useAccessRequestsLive(onChange: () => void | Promise<void>) {
    useEffect(() => {
        const handler = () => {
            void onChange();
        };
        const storageHandler = (e: StorageEvent) => {
            if (e.key === EVT_KEY) {
                void onChange();
            }
        };

        // same-tab broadcast
        window.addEventListener(EVT_KEY, handler);

        // cross-tab localStorage changes
        window.addEventListener("storage", storageHandler);

        return () => {
            window.removeEventListener(EVT_KEY, handler);
            window.removeEventListener("storage", storageHandler);
        };
    }, [onChange]);
}