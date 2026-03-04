type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "purple";

export const Badge: React.FC<{
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}> = ({ children, variant = "default", className = "" }) => {
    return (
        <span className={["kc-badge", `kc-badge--${variant}`, className].filter(Boolean).join(" ")}>
            {children}
        </span>
    );
};

export const LinkCell: React.FC<{
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
}> = ({ children, onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="kc-linkcell"
            style={{
                background: "transparent",
                border: 0,
                padding: 0,
                cursor: onClick ? "pointer" : "default",
            }}
        >
            {children}
        </button>
    );
};