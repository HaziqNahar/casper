import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";

export type SearchableComboboxOption = {
    value: string;
    label: string;
};

type SearchableComboboxProps = {
    value: string;
    options: SearchableComboboxOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    noResultsText?: string;
    disabled?: boolean;
    clearable?: boolean;
    displayValue?: string;
    ariaLabel?: string;
    title?: string;
    containerClassName?: string;
    inputClassName?: string;
    containerStyle?: React.CSSProperties;
    inputStyle?: React.CSSProperties;
    menuStyle?: React.CSSProperties;
};

const mergeClassNames = (...classes: Array<string | false | null | undefined>) =>
    classes.filter(Boolean).join(" ");

export default function SearchableCombobox({
    value,
    options,
    onChange,
    placeholder = "Select an option",
    noResultsText = "No matching options",
    disabled = false,
    clearable = false,
    displayValue,
    ariaLabel,
    title,
    containerClassName,
    inputClassName = "kc-input",
    containerStyle,
    inputStyle,
    menuStyle,
}: SearchableComboboxProps) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const selectedLabel = useMemo(() => {
        if (displayValue !== undefined) return displayValue;
        return options.find((option) => option.value === value)?.label ?? "";
    }, [displayValue, options, value]);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return options;
        return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
    }, [options, query]);

    const showClear = clearable && !disabled && !!value && !query && hovered && focused;
    const showChevron = !disabled && !showClear;

    useEffect(() => {
        if (!open) return;

        const updateMenuRect = () => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setMenuRect({
                top: rect.bottom + 6,
                left: rect.left,
                width: rect.width,
            });
        };

        updateMenuRect();
        window.addEventListener("resize", updateMenuRect);
        window.addEventListener("scroll", updateMenuRect, true);
        return () => {
            window.removeEventListener("resize", updateMenuRect);
            window.removeEventListener("scroll", updateMenuRect, true);
        };
    }, [open]);

    const menu = open && !disabled && menuRect ? (
        <div
            className="kc-comboboxMenu"
            style={{
                top: menuRect.top,
                left: menuRect.left,
                width: menuRect.width,
                ...menuStyle,
            }}
        >
            {filteredOptions.length === 0 ? (
                <div className="kc-comboboxEmpty">
                    {noResultsText}
                </div>
            ) : (
                filteredOptions.map((option) => {
                    const optionIndex = filteredOptions.findIndex((candidate) => candidate.value === option.value);
                    return (
                        <button
                            key={option.value}
                            type="button"
                            className={mergeClassNames(
                                "kc-comboboxOption",
                                (activeIndex === optionIndex || value === option.value) && "is-active"
                            )}
                            onMouseEnter={() => setActiveIndex(optionIndex)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                onChange(option.value);
                                setQuery("");
                                setOpen(false);
                                setActiveIndex(-1);
                            }}
                        >
                            {option.label}
                        </button>
                    );
                })
            )}
        </div>
    ) : null;

    return (
        <div
            ref={containerRef}
            className={mergeClassNames("kc-combobox", containerClassName)}
            style={{ position: "relative", ...containerStyle }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <input
                className={inputClassName}
                type="text"
                value={query || selectedLabel}
                placeholder={placeholder}
                disabled={disabled}
                aria-label={ariaLabel}
                title={title}
                style={inputStyle}
                onFocus={() => {
                    setFocused(true);
                    setOpen(true);
                    setActiveIndex(-1);
                }}
                onChange={(e) => {
                    const typedValue = e.target.value;
                    setQuery(typedValue);
                    setActiveIndex(-1);
                    const exactMatch = options.find((option) => option.label === typedValue);
                    if (exactMatch) {
                        onChange(exactMatch.value);
                    }
                    setOpen(true);
                }}
                onKeyDown={(e) => {
                    if (disabled) return;

                    if (e.key === "ArrowDown") {
                        e.preventDefault();
                        if (!open) {
                            setOpen(true);
                            setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
                            return;
                        }
                        setActiveIndex((current) => {
                            if (filteredOptions.length === 0) return -1;
                            return current < filteredOptions.length - 1 ? current + 1 : 0;
                        });
                        return;
                    }

                    if (e.key === "ArrowUp") {
                        e.preventDefault();
                        if (!open) {
                            setOpen(true);
                            setActiveIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : -1);
                            return;
                        }
                        setActiveIndex((current) => {
                            if (filteredOptions.length === 0) return -1;
                            if (current === -1) return filteredOptions.length - 1;
                            return current > 0 ? current - 1 : filteredOptions.length - 1;
                        });
                        return;
                    }

                    if (e.key === "Enter") {
                        if (!open || activeIndex < 0 || activeIndex >= filteredOptions.length) return;
                        e.preventDefault();
                        const activeOption = filteredOptions[activeIndex];
                        onChange(activeOption.value);
                        setQuery("");
                        setOpen(false);
                        setActiveIndex(-1);
                        return;
                    }

                    if (e.key === "Tab") {
                        if (!open || activeIndex < 0 || activeIndex >= filteredOptions.length) return;
                        const activeOption = filteredOptions[activeIndex];
                        onChange(activeOption.value);
                        setQuery("");
                        setOpen(false);
                        setActiveIndex(-1);
                        return;
                    }

                    if (e.key === "Escape") {
                        setOpen(false);
                        setActiveIndex(-1);
                        setQuery("");
                    }
                }}
                onBlur={() => {
                    setFocused(false);
                    setQuery("");
                    setActiveIndex(-1);
                    window.setTimeout(() => setOpen(false), 120);
                }}
            />

            {showClear ? (
                <button
                    type="button"
                    aria-label="Clear selection"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        onChange("");
                        setQuery("");
                        setOpen(false);
                        setActiveIndex(-1);
                    }}
                    className="kc-comboboxClear"
                >
                    x
                </button>
            ) : null}

            {showChevron ? (
                <span
                    aria-hidden="true"
                    className={`kc-comboboxChevron ${open ? "is-open" : ""}`}
                >
                    <ChevronDown size={16} />
                </span>
            ) : null}

            {menu ? createPortal(menu, document.body) : null}
        </div>
    );
}