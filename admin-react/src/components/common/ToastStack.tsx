import React from "react";

export type ToastType = "success" | "info" | "error" | "warning";

export type ToastItem = {
    id: string;
    message: string;
    type: ToastType;
    exiting?: boolean;
};

export const ToastStack: React.FC<{
    items: ToastItem[];
    onClose: (id: string) => void;
}> = ({ items, onClose }) => {
    return (
        <div className="kc-toastStack" aria-live="polite" aria-relevant="additions removals">
            {items.map((t) => (
                <div
                    key={t.id}
                    className={`kc-toast kc-toast--${t.type} ${t.exiting ? "is-exiting" : "is-entering"}`}
                    role="status"
                >
                    <div className="kc-toast_dot" />
                    <div className="kc-toast_msg">{t.message}</div>

                    <button
                        type="button"
                        className="kc-toast_close"
                        onClick={() => onClose(t.id)}
                        aria-label="Close notification"
                        title="Close"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
};