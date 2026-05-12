import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

type Action = {
    label: string;
    onClick: () => void;
    danger?: boolean;
};

export const RowActionMenu: React.FC<{
    actions: Action[];
}> = ({ actions }) => {
    const [open, setOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<React.CSSProperties>({});
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const updateMenuPosition = () => {
        const button = buttonRef.current;
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const menuWidth = 160;
        const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
        const top = Math.min(rect.bottom + 8, window.innerHeight - 16);

        setMenuPosition({ top, left, minWidth: menuWidth });
    };

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (!open) return;
            const target = e.target as Node;
            if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        updateMenuPosition();
        window.addEventListener("resize", updateMenuPosition);
        window.addEventListener("scroll", updateMenuPosition, true);

        return () => {
            window.removeEventListener("resize", updateMenuPosition);
            window.removeEventListener("scroll", updateMenuPosition, true);
        };
    }, [open]);

    return (
        <div ref={wrapRef} className="kc-rowMenuWrap">
            <button
                ref={buttonRef}
                type="button"
                className="kc_btn kc_btn_icon"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((s) => !s);
                }}
                title="Actions"
                aria-expanded={open}
            >
                <MoreVertical size={16} />
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    className="kc-rowMenu"
                    role="menu"
                    style={menuPosition}
                >
                    {actions.map((a) => (
                        <button
                            key={a.label}
                            type="button"
                            className={`kc-rowMenuItem ${a.danger ? "is-danger" : ""}`}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpen(false);
                                a.onClick();
                            }}
                        >
                            {a.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};