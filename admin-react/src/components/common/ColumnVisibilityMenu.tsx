import React from "react";
import { Check } from "lucide-react";

type ColumnVisibilityMenuProps = {
    columns: Array<{
        key: string;
        label: string;
        lockVisible?: boolean;
    }>;
    visibleCountLabel: string;
    visibleKeys: Set<string>;
    initialVisibleKeys: Set<string>;
    allKeys: string[];
    onVisibleKeysChange: React.Dispatch<React.SetStateAction<Set<string>>>;
    onClose: () => void;
};

const ColumnVisibilityMenu: React.FC<ColumnVisibilityMenuProps> = ({
    columns,
    visibleCountLabel,
    visibleKeys,
    initialVisibleKeys,
    allKeys,
    onVisibleKeysChange,
    onClose,
}) => {
    return (
        <div className="kc-colsDropdown" role="menu" aria-label="Column visibility">
            <div className="kc-colsHeader">
                <span>Columns</span>
                <span className="kc-colsMeta">{visibleCountLabel}</span>
            </div>

            <div className="kc-colsList">
                {columns.map((column) => {
                    const key = column.key;
                    const locked = Boolean(column.lockVisible);
                    const checked = visibleKeys.has(key);

                    return (
                        <button
                            key={key}
                            type="button"
                            className="kc-colsItem"
                            role="menuitemcheckbox"
                            aria-checked={checked}
                            disabled={locked}
                            onClick={() => {
                                onVisibleKeysChange((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(key)) {
                                        if (next.size <= 1) return next;
                                        next.delete(key);
                                    } else {
                                        next.add(key);
                                    }

                                    for (const current of columns) {
                                        if (current.lockVisible) next.add(String(current.key));
                                    }

                                    return next;
                                });
                            }}
                        >
                            <span className={`kc-colsCheck ${checked ? "is-on" : ""}`}>
                                {checked ? <Check size={14} /> : null}
                            </span>
                            <span className="kc-colsLabel">{column.label}</span>
                            {locked && <span className="kc-colsLocked">Locked</span>}
                        </button>
                    );
                })}
            </div>

            <div className="kc-colsFooter">
                <button
                    type="button"
                    className="kc-btn kc-btn-ghost"
                    onClick={() => onVisibleKeysChange(new Set(Array.from(initialVisibleKeys)))}
                >
                    Reset
                </button>
                <button
                    type="button"
                    className="kc-btn kc-btn-ghost"
                    onClick={() => onVisibleKeysChange(new Set(allKeys))}
                >
                    Show all
                </button>
                <button
                    type="button"
                    className="kc-btn kc-btn-primary"
                    onClick={onClose}
                >
                    Done
                </button>
            </div>
        </div>
    );
};

export default ColumnVisibilityMenu;