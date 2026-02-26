import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Search,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Columns3,
    Check,
} from "lucide-react";

// ==========================================
// TYPES
// ==========================================
export type TableData = Record<string, unknown>;

export interface TableColumn<T extends TableData, K extends keyof T = keyof T> {
    key: K;
    label: string;
    width?: string;
    sortable?: boolean;
    align?: "left" | "center" | "right";
    render?: (value: T[K], row: T) => React.ReactNode;

    /** Optional: set to true if you don't want this column to be toggled off */
    lockVisible?: boolean;

    /** Optional: initial hidden (only used if enableColumnVisibility=true) */
    hiddenByDefault?: boolean;
}

export interface DataTableProps<T extends TableData> {
    data: T[];
    columns: TableColumn<T>[];
    keyField?: keyof T;

    onRowClick?: (row: T) => void;
    onRefresh?: () => void;

    loading?: boolean;
    error?: string | null;

    searchable?: boolean;
    searchPlaceholder?: string;

    paginated?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];

    className?: string;
    minHeight?: string;

    stickyHeader?: boolean;
    striped?: boolean;
    hoverable?: boolean;

    /** NEW (1): sticky toolbar inside the table card */
    stickyToolbar?: boolean;

    /** NEW (4): column visibility toggle button in toolbar */
    enableColumnVisibility?: boolean;

    emptyMessage?: string;
    emptyIcon?: React.ReactNode;

    toolbarFilters?: {
        left?: React.ReactNode;
        right?: React.ReactNode;
    };
}

// ==========================================
// HELPERS
// ==========================================
const toStr = (v: unknown) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
};

const toDisplay = (v: unknown) => {
    const s = toStr(v);
    return s === "" ? "-" : s;
};

const compareValues = (a: unknown, b: unknown) => {
    const as = toStr(a);
    const bs = toStr(b);

    const an = Number(as);
    const bn = Number(bs);

    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
    return as.localeCompare(bs);
};

// ==========================================
// COMPONENT
// ==========================================
export default function DataTable<T extends TableData>({
    data,
    columns,
    keyField = "id" as keyof T,

    onRowClick,
    onRefresh,

    loading = false,
    error = null,

    searchable = true,
    searchPlaceholder = "Search...",

    paginated = true,
    pageSize: initialPageSize = 10,
    pageSizeOptions = [10, 25, 50, 100],

    className = "",
    minHeight = "400px",

    stickyHeader = true,
    striped = true,
    hoverable = true,

    stickyToolbar = true,
    enableColumnVisibility = true,

    emptyMessage = "No records found",
    emptyIcon,
    toolbarFilters,
}: DataTableProps<T>): React.ReactElement {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<keyof T | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [pageInputValue, setPageInputValue] = useState("1");

    // ============ (1) Sticky toolbar elevation state ============
    const [toolbarIsStuck, setToolbarIsStuck] = useState(false);

    useEffect(() => {
        if (!stickyToolbar) return;

        const onScroll = () => {
            const root = rootRef.current;
            const toolbar = toolbarRef.current;
            if (!root || !toolbar) return;

            const rootRect = root.getBoundingClientRect();
            const toolbarRect = toolbar.getBoundingClientRect();

            // toolbar is considered "stuck" when it hits top of viewport,
            // but only while the table is still visible.
            const stuck =
                toolbarRect.top <= 8 && // a little breathing room
                rootRect.top < 8 &&
                rootRect.bottom > 80;

            setToolbarIsStuck(stuck);
        };

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [stickyToolbar]);

    // ============ (4) Column visibility ============
    const allKeys = useMemo(() => columns.map((c) => String(c.key)), [columns]);

    const initialVisibleKeys = useMemo(() => {
        if (!enableColumnVisibility) return new Set(allKeys);
        const set = new Set<string>();
        for (const c of columns) {
            if (!c.hiddenByDefault) set.add(String(c.key));
        }
        // safety: never allow empty
        if (set.size === 0) set.add(allKeys[0] ?? "");
        return set;
    }, [enableColumnVisibility, columns, allKeys]);

    const [visibleKeys, setVisibleKeys] = useState<Set<string>>(initialVisibleKeys);
    const [showCols, setShowCols] = useState(false);

    // keep visibleKeys in sync if columns list changes
    useEffect(() => {
        setVisibleKeys((prev) => {
            const next = new Set<string>();
            const prevArr = Array.from(prev);

            // keep any still-existing keys
            for (const k of prevArr) if (allKeys.includes(k)) next.add(k);

            // if none left, fallback to initial computed
            if (next.size === 0) {
                for (const k of Array.from(initialVisibleKeys)) next.add(k);
            }

            // ensure locked columns always visible
            for (const c of columns) {
                if (c.lockVisible) next.add(String(c.key));
            }

            // still empty? pick first
            if (next.size === 0 && allKeys[0]) next.add(allKeys[0]);
            return next;
        });
    }, [allKeys, columns, initialVisibleKeys]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!showCols) return;
            const root = rootRef.current;
            if (!root) return;
            if (root.contains(e.target as Node)) {
                // click inside table: allow
                return;
            }
            setShowCols(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [showCols]);

    const columnsToRender = useMemo(() => {
        if (!enableColumnVisibility) return columns;
        return columns.filter((c) => visibleKeys.has(String(c.key)));
    }, [columns, enableColumnVisibility, visibleKeys]);

    const visibleCountLabel = useMemo(() => {
        if (!enableColumnVisibility) return "";
        return `${visibleKeys.size}/${columns.length}`;
    }, [enableColumnVisibility, visibleKeys, columns.length]);

    // Filter
    const filteredData = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return data;

        return data.filter((row) =>
            columnsToRender.some((col) => toStr(row[col.key]).toLowerCase().includes(q))
        );
    }, [data, columnsToRender, searchTerm]);

    // Sort
    const sortedData = useMemo(() => {
        if (!sortField) return filteredData;

        return [...filteredData].sort((a, b) => {
            const c = compareValues(a[sortField], b[sortField]);
            return sortDirection === "asc" ? c : -c;
        });
    }, [filteredData, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = paginated ? sortedData.slice(startIndex, startIndex + pageSize) : sortedData;

    const startItem = sortedData.length === 0 ? 0 : startIndex + 1;
    const endItem = Math.min(startIndex + pageSize, sortedData.length);

    // Events
    const toggleSort = (field: keyof T, sortable?: boolean) => {
        if (sortable === false) return;

        if (sortField === field) {
            setSortDirection((p) => (p === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const goToPage = (page: number) => {
        const safe = Math.min(Math.max(1, page), totalPages);
        setCurrentPage(safe);
        setPageInputValue(String(safe));
    };

    // Reset page on search or pageSize change
    useEffect(() => {
        setCurrentPage(1);
        setPageInputValue("1");
    }, [searchTerm, pageSize]);

    // Keep input in sync when page changes from buttons
    useEffect(() => {
        setPageInputValue(String(currentPage));
    }, [currentPage]);

    // Row class rules (CSS handles hover/zebra)
    const rowClassName = (rowIndex: number) => {
        const classes = ["kc-table-tr"];
        if (striped && rowIndex % 2 === 1) classes.push("is-striped");
        if (hoverable) classes.push("is-hoverable");
        if (onRowClick) classes.push("is-clickable");
        return classes.join(" ");
    };

    // ==========================================
    // STATES
    // ==========================================
    if (loading) {
        return (
            <div ref={rootRef} className={["kc-table", className].filter(Boolean).join(" ")} style={{ minHeight }}>
                <div className="kc-table-state">
                    <RefreshCw size={18} className="kc-spin" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div ref={rootRef} className={["kc-table", className].filter(Boolean).join(" ")} style={{ minHeight }}>
                <div className="kc-table-state kc-table-state--error">
                    <p>Error: {error}</p>
                    {onRefresh && (
                        <button type="button" className="kc-btn kc-btn-primary" onClick={onRefresh}>
                            Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div ref={rootRef} className={["kc-table", className].filter(Boolean).join(" ")} style={{ minHeight }}>
            {/* Toolbar */}
            {(searchable || toolbarFilters || onRefresh || enableColumnVisibility) && (
                <div
                    ref={toolbarRef}
                    className={[
                        "kc_tableToolbar",
                        stickyToolbar ? "is_sticky" : "",
                        toolbarIsStuck ? "is_scrolled" : "",
                    ].filter(Boolean).join(" ")}
                    style={
                        stickyToolbar
                            ? { position: "sticky", top: 8, zIndex: 30 }
                            : undefined
                    }
                >
                    <div className="kc_tableToolbar_left">
                        {searchable && (
                            <div className="kc_searchWrap">
                                <Search size={16} />
                                <input
                                    className="kc_searchInput"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={searchPlaceholder || "Search..."}
                                />
                            </div>
                        )}

                        {toolbarFilters?.left}

                        <div className="kc_tableToolbar_spacer" />

                        {toolbarFilters?.right}

                        {/* (4) Columns toggle */}
                        {enableColumnVisibility && (
                            <div className="kc_colsWrap" style={{ position: "relative" }}>
                                <button
                                    type="button"
                                    className="kc_btn kc_btn_icon"
                                    title={`Columns (${visibleCountLabel})`}
                                    onClick={() => setShowCols((s) => !s)}
                                    aria-expanded={showCols}
                                >
                                    <Columns3 size={16} />
                                </button>

                                {showCols && (
                                    <div className="kc-colsDropdown" role="menu" aria-label="Column visibility">
                                        <div className="kc-colsHeader">
                                            <span>Columns</span>
                                            <span className="kc-colsMeta">{visibleCountLabel}</span>
                                        </div>

                                        <div className="kc-colsList">
                                            {columns.map((c) => {
                                                const key = String(c.key);
                                                const locked = Boolean(c.lockVisible);
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
                                                            setVisibleKeys((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(key)) {
                                                                    // don't allow hiding last visible col
                                                                    if (next.size <= 1) return next;
                                                                    next.delete(key);
                                                                } else {
                                                                    next.add(key);
                                                                }
                                                                // enforce locked cols visible
                                                                for (const cc of columns) if (cc.lockVisible) next.add(String(cc.key));
                                                                return next;
                                                            });
                                                        }}
                                                    >
                                                        <span className={`kc-colsCheck ${checked ? "is-on" : ""}`}>
                                                            {checked ? <Check size={14} /> : null}
                                                        </span>
                                                        <span className="kc-colsLabel">{c.label}</span>
                                                        {locked && <span className="kc-colsLocked">Locked</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="kc-colsFooter">
                                            <button
                                                type="button"
                                                className="kc-btn kc-btn-ghost"
                                                onClick={() => setVisibleKeys(new Set(allKeys))}
                                            >
                                                Show all
                                            </button>
                                            <button
                                                type="button"
                                                className="kc-btn kc-btn-primary"
                                                onClick={() => setShowCols(false)}
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Refresh */}
                        {onRefresh && (
                            <button
                                type="button"
                                className="kc_btn kc_btn_icon"
                                onClick={onRefresh}
                                title="Refresh"
                            >
                                <RefreshCw size={16} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="kc-table-wrap">
                <table className="kc-table-table">
                    <thead className="kc-table-thead">
                        <tr>
                            {columnsToRender.map((col) => {
                                const isSortable = col.sortable !== false;
                                const isActive = sortField === col.key;

                                return (
                                    <th
                                        key={String(col.key)}
                                        className="kc-table-th"
                                        style={{
                                            width: col.width ?? "auto",
                                            textAlign: col.align ?? "left",
                                            position: stickyHeader ? "sticky" : "static",
                                        }}
                                        onClick={() => toggleSort(col.key, col.sortable)}
                                        role={isSortable ? "button" : undefined}
                                    >
                                        <div className="kc-table-thInner">
                                            <span className="kc-table-thLabel">{col.label}</span>

                                            {isSortable && (
                                                <span className="kc-table-sort">
                                                    <ChevronUp size={12} className={isActive && sortDirection === "asc" ? "is-on" : ""} />
                                                    <ChevronDown size={12} className={isActive && sortDirection === "desc" ? "is-on" : ""} />
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody className="kc-table-tbody">
                        {paginatedData.length === 0 ? (
                            <tr className="kc-table-tr">
                                <td className="kc-table-td" colSpan={columnsToRender.length}>
                                    <div className="kc-table-empty">
                                        {emptyIcon ?? <Search size={40} style={{ opacity: 0.35 }} />}
                                        <div>
                                            <div className="kc-table-emptyTitle">{emptyMessage}</div>
                                            {searchTerm && (
                                                <div className="kc-table-emptySub">No records match “{searchTerm}”. Try adjusting your search.</div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIndex) => {
                                const rowKey = row[keyField] !== undefined ? String(row[keyField]) : String(rowIndex);

                                return (
                                    <tr
                                        key={rowKey}
                                        className={rowClassName(rowIndex)}
                                        onClick={() => onRowClick?.(row)}
                                    >
                                        {columnsToRender.map((col) => (
                                            <td
                                                key={String(col.key)}
                                                className="kc-table-td"
                                                style={{ textAlign: col.align ?? "left" }}
                                                title={toStr(row[col.key])}
                                            >
                                                {col.render ? col.render(row[col.key], row) : toDisplay(row[col.key])}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {paginated && sortedData.length > 0 && (
                <div className="kc-table-pagination">
                    <div className="kc-table-pagerLeft">
                        <span>
                            Showing {startItem} - {endItem} of {sortedData.length}
                        </span>

                        <div className="kc-table-rows">
                            <span>Rows:</span>
                            <select
                                className="kc-table-select"
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                            >
                                {pageSizeOptions.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="kc-table-pagerRight">
                        <button className="kc-btn kc-btn-ghost" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                            First
                        </button>

                        <button className="kc-btn kc-btn-ghost" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                            <ChevronLeft size={14} />
                        </button>

                        <div className="kc-table-pageBox">
                            <span>Page</span>
                            <input
                                className="kc-table-pageInput"
                                value={pageInputValue}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "" || /^\d+$/.test(v)) setPageInputValue(v);
                                }}
                                onBlur={() => {
                                    const n = Number(pageInputValue);
                                    if (!Number.isNaN(n) && n >= 1 && n <= totalPages) goToPage(n);
                                    else setPageInputValue(String(currentPage));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                    if (e.key === "Escape") {
                                        setPageInputValue(String(currentPage));
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                            />
                            <span>of {totalPages}</span>
                        </div>

                        <button className="kc-btn kc-btn-ghost" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                            <ChevronRight size={14} />
                        </button>

                        <button className="kc-btn kc-btn-ghost" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}