import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { ToastItem, ToastStack, ToastType } from "../components/common/ToastStack";

type ToastContextValue = {
    pushToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_TTL_MS = 2600;
const TOAST_EXIT_MS = 220;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
        );

        window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, TOAST_EXIT_MS);
    }, []);

    const pushToast = useCallback((message: string, type: ToastType = "info") => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        setToasts((prev) => [{ id, message, type }, ...prev].slice(0, 3));

        window.setTimeout(() => {
            removeToast(id);
        }, TOAST_TTL_MS);
    }, [removeToast]);

    const value = useMemo(
        () => ({
            pushToast,
        }),
        [pushToast]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastStack items={toasts} onClose={removeToast} />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return ctx;
};