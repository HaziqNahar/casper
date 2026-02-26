import React, { useEffect, useRef, useState } from "react";
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
    const wrapRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (!open) return;
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    return (
        <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
            <button
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

            {open && (
                <div className="kc-rowMenu" role="menu">
                    {actions.map((a) => (
                        <button
                            key={a.label}
                            type="button"
                            className={`kc-rowMenuItem ${a.danger ? "is-danger" : ""}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpen(false);
                                a.onClick();
                            }}
                        >
                            {a.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};