import React, { useEffect, useMemo, useState } from "react";
import {
    Search,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
} from "lucide-react";

// ==========================================
// TYPES
// ==========================================
export type TableData = Record<string, unknown>;

export interface TableColumn<T extends TableData> {
    key: keyof T;
    label: string;
    width?: string; // e.g. "160px" | "20%" | "12rem"
    sortable?: boolean; // default true
    align?: "left" | "center" | "right";
    render?: (value: T[keyof T], row: T) => React.ReactNode;
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

    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
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

    emptyMessage = "No records found",
    emptyIcon,
}: DataTableProps<T>): React.ReactElement {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<keyof T | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [pageInputValue, setPageInputValue] = useState("1");

    // Filter
    const filteredData = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return data;

        return data.filter((row) =>
            columns.some((col) => toStr(row[col.key]).toLowerCase().includes(q))
        );
    }, [data, columns, searchTerm]);

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
            <div className={["kc-table", className].filter(Boolean).join(" ")} style={{ minHeight }}>
                <div className="kc-table-state">
                    <RefreshCw size={18} className="kc-spin" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={["kc-table", className].filter(Boolean).join(" ")} style={{ minHeight }}>
                <div className="kc-table-state kc-table-state--error">
                    <p>Error: {error}</p>
                    {onRefresh && (
                        <button type="button" className="kc-btn kc-btn--primary" onClick={onRefresh}>
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
        <div className={["kc-table", className].filter(Boolean).join(" ")} style={{ minHeight }}>
            {/* Toolbar */}
            {(searchable || onRefresh) && (
                <div className="kc-table-toolbar">
                    {searchable && (
                        <div className="kc-table-search">
                            <Search size={16} className="kc-table-searchIcon" />
                            <input
                                type="text"
                                className="kc-table-searchInput"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="kc-table-meta">
                        <span>
                            {searchTerm ? `${sortedData.length} of ${data.length} records` : `${data.length} records`}
                        </span>

                        {onRefresh && (
                            <button type="button" className="kc-btn kc-btn--icon" onClick={onRefresh} title="Refresh">
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
                            {columns.map((col) => {
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
                                <td className="kc-table-td" colSpan={columns.length}>
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
                                        {columns.map((col) => (
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
                        <button className="kc-btn kc-btn--ghost" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                            First
                        </button>

                        <button className="kc-btn kc-btn--ghost" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
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

                        <button className="kc-btn kc-btn--ghost" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                            <ChevronRight size={14} />
                        </button>

                        <button className="kc-btn kc-btn--ghost" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}