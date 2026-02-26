import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, X } from "lucide-react";

type Option<T extends string> = { value: T; label: string };

export interface MultiSelectCheckboxProps<T extends string> {
    label: string;
    options: Option<T>[];
    value: T[];
    onChange: (next: T[]) => void;

    inline?: boolean;             // keeps it compact for toolbars
    placeholder?: string;         // e.g. "All"
    portal?: boolean;             // default true: avoids clipping
    maxLabelItems?: number;       // how many values to show before "n selected"
}

function useOnClickOutside(
    refs: Array<React.RefObject<HTMLElement>>,
    handler: () => void,
    enabled: boolean
) {
    useEffect(() => {
        if (!enabled) return;

        const onDown = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            const inside = refs.some((r) => r.current && r.current.contains(target));
            if (!inside) handler();
        };

        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown, { passive: true });
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
        };
    }, [refs, handler, enabled]);
}

function useEscape(handler: () => void, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handler();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [handler, enabled]);
}

export function MultiSelectCheckbox<T extends string>({
    label,
    options,
    value,
    onChange,
    inline = true,
    placeholder = "All",
    portal = true,
    maxLabelItems = 2,
}: MultiSelectCheckboxProps<T>) {
    const [open, setOpen] = useState(false);

    const wrapRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const ddRef = useRef<HTMLDivElement>(null);

    const [anchor, setAnchor] = useState({ left: 0, top: 0, width: 240 });

    const selectedSet = useMemo(() => new Set(value ?? []), [value]);

    const selectedLabels = useMemo(() => {
        const map = new Map(options.map((o) => [o.value, o.label] as const));
        return (value ?? []).map((v) => map.get(v) ?? String(v));
    }, [options, value]);

    const chipText = useMemo(() => {
        if (!value || value.length === 0) return placeholder;

        if (selectedLabels.length <= maxLabelItems) {
            return selectedLabels.join(", ");
        }
        return `${selectedLabels.length} selected`;
    }, [value, selectedLabels, placeholder, maxLabelItems]);

    const close = () => setOpen(false);

    useOnClickOutside([wrapRef, ddRef], close, open);
    useEscape(close, open);

    // Measure + position dropdown when open
    useEffect(() => {
        if (!open) return;

        const measure = () => {
            const btn = btnRef.current;
            if (!btn) return;
            const r = btn.getBoundingClientRect();
            setAnchor({
                left: r.left + window.scrollX,
                top: r.bottom + window.scrollY + 8,
                width: r.width,
            });
        };

        measure();
        window.addEventListener("resize", measure);
        window.addEventListener("scroll", measure, true);
        return () => {
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", measure, true);
        };
    }, [open]);

    const toggleValue = (v: T) => {
        const next = new Set(selectedSet);
        if (next.has(v)) next.delete(v);
        else next.add(v);
        onChange(Array.from(next));
    };

    const allValues = useMemo(() => options.map((o) => o.value), [options]);
    const allSelected = value.length === allValues.length && allValues.length > 0;
    const noneSelected = value.length === 0;
    const indeterminate = !noneSelected && !allSelected;

    const setAll = () => onChange(allValues);
    const clearAll = () => onChange([]);

    const dropdown = (
        <div
            ref={ddRef}
            className={`kc-filterDropdown ${open ? "is-open" : ""}`}
            style={
                portal
                    ? {
                        position: "absolute",
                        left: anchor.left,
                        top: anchor.top,
                        width: Math.max(220, anchor.width),
                        zIndex: 9999,
                    }
                    : undefined
            }
            role="dialog"
            aria-label={`${label} filter`}
        >
            <div className="kc-filterHeader">
                <div className="kc-filterHeaderLeft">
                    <div className="kc-filterHeaderTitle">{label}</div>
                    <div className="kc-filterHeaderMeta">
                        {noneSelected ? "All" : `${value.length} selected`}
                    </div>
                </div>

                <div className="kc-filterHeaderRight">
                    {!allSelected && (
                        <button type="button" className="kc-filterHeaderBtn" onClick={setAll}>
                            Select all
                        </button>
                    )}
                    {!noneSelected && (
                        <button type="button" className="kc-filterHeaderBtn is-ghost" onClick={clearAll}>
                            <X size={14} />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="kc-filterBody">
                <label className="kc-filterRow kc-filterAllRow">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                            if (el) el.indeterminate = indeterminate;
                        }}
                        onChange={() => {
                            if (allSelected) clearAll();
                            else setAll();
                        }}
                    />
                    <span className="kc-filterRowLabel">All</span>
                    <span className="kc-filterRowMeta">
                        {noneSelected ? "Showing all" : `${value.length}/${allValues.length}`}
                    </span>
                </label>

                <div className="kc-filterDivider" />

                {options.map((o) => (
                    <label key={o.value} className="kc-filterRow">
                        <input
                            type="checkbox"
                            checked={selectedSet.has(o.value)}
                            onChange={() => toggleValue(o.value)}
                        />
                        <span className="kc-filterRowLabel">{o.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );

    return (
        <div
            ref={wrapRef}
            className={`kc-filterWrap ${inline ? "is-inline" : ""}`}
            style={{ position: "relative" }}
        >
            <button
                ref={btnRef}
                type="button"
                className={`kc-filterChip ${open ? "is-open" : ""}`}
                onClick={() => setOpen((s) => !s)}
                aria-expanded={open}
            >
                <span className="kc-filterChipLabel">{label}</span>
                <span className="kc-filterChipValue">{chipText}</span>
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {!portal && open ? dropdown : null}
            {portal && open ? createPortal(dropdown, document.body) : null}
        </div>
    );
}