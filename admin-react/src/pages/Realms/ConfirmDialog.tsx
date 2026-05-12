import React, { useState } from "react";

export type ConfirmState = {
    open: boolean;
    title: string;
    message?: string;
    details?: string[];
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    confirmLabel?: string;
    confirmMatchText?: string;
    confirmHelperText?: string;
    requirePassword?: boolean;
    passwordLabel?: string;
    passwordHelperText?: string;
    requireJustification?: boolean;
    justificationLabel?: string;
    justificationHelperText?: string;
    justificationPlaceholder?: string;
    onConfirm?: (input: { password?: string; justification?: string }) => void | Promise<void>;
};

const ConfirmDialog: React.FC<{
    state: ConfirmState;
    onClose: () => void;
}> = ({ state, onClose }) => {
    const [confirmValue, setConfirmValue] = useState("");
    const [passwordValue, setPasswordValue] = useState("");
    const [justificationValue, setJustificationValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (!state.open) return null;

    const requiresTypedConfirm = Boolean(state.confirmMatchText?.trim());
    const requiresPassword = Boolean(state.requirePassword);
    const requiresJustification = Boolean(state.requireJustification);
    const typedConfirmMatches = !requiresTypedConfirm || confirmValue.trim() === state.confirmMatchText?.trim();
    const passwordReady = !requiresPassword || passwordValue.trim().length > 0;
    const justificationReady = !requiresJustification || justificationValue.trim().length > 0;
    const canConfirm = typedConfirmMatches && passwordReady && justificationReady && !submitting;

    const resetState = () => {
        setConfirmValue("");
        setPasswordValue("");
        setJustificationValue("");
        setError(null);
        setSubmitting(false);
    };

    const onConfirm = async () => {
        if (!canConfirm) return;
        try {
            setSubmitting(true);
            setError(null);
            await state.onConfirm?.({
                password: passwordValue.trim() || undefined,
                justification: justificationValue.trim() || undefined,
            });
            resetState();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to confirm action.");
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    return (
        <div
            className="kc-confirmOverlay"
            role="dialog"
            aria-modal="true"
            aria-label={state.title}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
            onKeyDown={(e) => {
                if (e.key === "Escape") handleClose();
                if (e.key === "Enter" && canConfirm) void onConfirm();
            }}
            tabIndex={-1}
        >
            <div className="kc-confirmModal">
                <div className="kc-confirmHeader">
                    <div className="kc-confirmTitle">{state.title}</div>
                </div>

                {(state.message || state.details?.length || requiresTypedConfirm || requiresPassword || requiresJustification) && (
                    <div className="kc-confirmBody" style={{ display: "grid", gap: 12 }}>
                        {state.message && <div>{state.message}</div>}

                        {state.details && state.details.length > 0 && (
                            <div style={{ display: "grid", gap: 6 }}>
                                {state.details.map((detail) => (
                                    <div key={detail} style={{ fontSize: "0.875rem", color: "#334155" }}>
                                        - {detail}
                                    </div>
                                ))}
                            </div>
                        )}

                        {requiresTypedConfirm && (
                            <div style={{ display: "grid", gap: 8 }}>
                                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>
                                    {state.confirmLabel ?? `Type "${state.confirmMatchText}" to confirm`}
                                </label>
                                <input
                                    type="text"
                                    className="kc-input"
                                    value={confirmValue}
                                    onChange={(e) => setConfirmValue(e.target.value)}
                                    placeholder={state.confirmMatchText}
                                    autoFocus
                                />
                                {state.confirmHelperText && (
                                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{state.confirmHelperText}</div>
                                )}
                            </div>
                        )}

                        {requiresPassword && (
                            <div style={{ display: "grid", gap: 8 }}>
                                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>
                                    {state.passwordLabel ?? "Re-enter your password"}
                                </label>
                                <input
                                    type="password"
                                    className="kc-input"
                                    value={passwordValue}
                                    onChange={(e) => setPasswordValue(e.target.value)}
                                    placeholder="Password"
                                />
                                {state.passwordHelperText && (
                                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{state.passwordHelperText}</div>
                                )}
                            </div>
                        )}

                        {requiresJustification && (
                            <div style={{ display: "grid", gap: 8 }}>
                                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>
                                    {state.justificationLabel ?? "Provide a justification"}
                                </label>
                                <textarea
                                    className="kc-input"
                                    value={justificationValue}
                                    onChange={(e) => setJustificationValue(e.target.value)}
                                    placeholder={state.justificationPlaceholder ?? "Enter the reason for this action"}
                                    rows={4}
                                    style={{ resize: "vertical", minHeight: 110 }}
                                />
                                {state.justificationHelperText && (
                                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{state.justificationHelperText}</div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div style={{ fontSize: "0.82rem", color: "#b91c1c" }}>{error}</div>
                        )}
                    </div>
                )}

                <div className="kc-confirmFooter">
                    <button type="button" className="kc-btn kc-btn-ghost" onClick={handleClose}>
                        {state.cancelText ?? "Cancel"}
                    </button>

                    <button
                        type="button"
                        className={`kc-btn ${state.danger ? "kc-btn-danger" : "kc-btn-primary"}`}
                        onClick={() => void onConfirm()}
                        disabled={!canConfirm}
                    >
                        {submitting ? "Confirming..." : state.confirmText ?? "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;