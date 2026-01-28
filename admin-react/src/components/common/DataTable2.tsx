import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

// Use a more permissive type that works with regular interfaces
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TableData = { [key: string]: any };

export interface TableColumn<T extends TableData> {
    key: keyof T;
    label: string;
    width?: string;           // CSS width value (e.g., '150px', '1fr', '20%')
    sortable?: boolean;       // Default: true
    align?: 'left' | 'center' | 'right';
    render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface DataTable2Props<T extends TableData> {
    data: T[];
    columns: TableColumn<T>[];
    keyField?: keyof T;                    // Field to use as unique key (default: 'id')
    onRowClick?: (row: T) => void;
    onRefresh?: () => void;
    loading?: boolean;
    error?: string | null;

    // Search & Filter
    searchable?: boolean;                  // Show search bar (default: true)
    searchPlaceholder?: string;

    // Pagination
    paginated?: boolean;                   // Enable pagination (default: true)
    pageSize?: number;                     // Items per page (default: 10)
    pageSizeOptions?: number[];            // Page size dropdown options

    // Styling
    className?: string;
    minHeight?: string;
    stickyHeader?: boolean;                // Sticky header on scroll (default: true)
    striped?: boolean;                     // Alternating row colors (default: true)
    hoverable?: boolean;                   // Row hover effect (default: true)

    // Empty state
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const toString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const toDisplay = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

const compareValues = (a: unknown, b: unknown): number => {
    const aStr = toString(a);
    const bStr = toString(b);

    const aNum = Number(aStr);
    const bNum = Number(bStr);

    if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
    }

    return aStr.localeCompare(bStr);
};

// ==========================================
// STYLES
// ==========================================

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        width: '100%',
        height: '100%',
        background: '#ffffff',
        overflow: 'hidden',
    },

    toolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        gap: '1rem',
        flexWrap: 'wrap' as const,
    },

    searchWrapper: {
        position: 'relative' as const,
        display: 'flex',
        alignItems: 'center',
    },

    searchIcon: {
        position: 'absolute' as const,
        left: '0.75rem',
        color: '#9ca3af',
        pointerEvents: 'none' as const,
    },

    searchInput: {
        paddingLeft: '2.5rem',
        paddingRight: '1rem',
        paddingTop: '0.5rem',
        paddingBottom: '0.5rem',
        width: '280px',
        border: '1px solid #d1d5db',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'border-color 0.15s ease',
    },

    toolbarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        fontSize: '0.875rem',
        color: '#6b7280',
    },

    refreshBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem',
        background: '#002855',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
    },

    tableWrapper: {
        flex: 1,
        overflow: 'auto',
        position: 'relative' as const,
    },

    table: {
        width: '100%',
        minWidth: '100%',
        borderCollapse: 'collapse' as const,
        tableLayout: 'fixed' as const,
    },

    headerRow: {
        background: '#002855',
    },

    headerCell: {
        padding: '0.75rem 1rem',
        textAlign: 'left' as const,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'white',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.025em',
        borderRight: '1px solid rgba(255, 255, 255, 0.2)',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        userSelect: 'none' as const,
        position: 'sticky' as const,
        top: 0,
        zIndex: 10,
        background: '#002855',
    },

    headerCellContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },

    sortIcons: {
        display: 'flex',
        flexDirection: 'column' as const,
        flexShrink: 0,
    },

    bodyRow: {
        borderBottom: '1px solid #e5e7eb',
        transition: 'background-color 0.15s ease',
    },

    bodyCell: {
        padding: '0.75rem 1rem',
        fontSize: '0.875rem',
        color: '#374151',
        borderRight: '1px solid #f3f4f6',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        verticalAlign: 'middle' as const,
    },

    pagination: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: '#002855',
        color: 'white',
        fontSize: '0.8rem',
        flexWrap: 'wrap' as const,
        gap: '0.5rem',
    },

    paginationInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },

    paginationControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
    },

    paginationBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.375rem 0.625rem',
        background: 'rgba(255, 255, 255, 0.15)',
        border: 'none',
        borderRadius: '0.25rem',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.75rem',
        transition: 'background-color 0.15s ease',
    },

    paginationBtnDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },

    paginationBtnActive: {
        background: 'rgba(255, 255, 255, 0.35)',
    },

    pageInput: {
        width: '3rem',
        padding: '0.25rem',
        border: 'none',
        borderRadius: '0.25rem',
        textAlign: 'center' as const,
        fontSize: '0.75rem',
    },

    // Updated: White background with black text for dropdown
    pageSizeSelect: {
        padding: '0.25rem 0.5rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        background: '#ffffff',
        color: '#000000',
        cursor: 'pointer',
        outline: 'none',
    },

    emptyState: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        color: '#9ca3af',
        textAlign: 'center' as const,
    },

    loadingOverlay: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        color: '#6b7280',
    },

    errorState: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        color: '#dc2626',
        textAlign: 'center' as const,
        gap: '1rem',
    },

    retryBtn: {
        padding: '0.5rem 1rem',
        background: '#002855',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
    },
};

// ==========================================
// BADGE HELPER COMPONENTS (for common use cases)
// ==========================================

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
    const variantStyles: Record<string, React.CSSProperties> = {
        default: { background: '#f3f4f6', color: '#6b7280' },
        success: { background: '#dcfce7', color: '#16a34a' },
        warning: { background: '#fef3c7', color: '#d97706' },
        error: { background: '#fee2e2', color: '#dc2626' },
        info: { background: '#dbeafe', color: '#2563eb' },
        purple: { background: '#f3e8ff', color: '#7c3aed' },
    };

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 500,
            ...variantStyles[variant],
        }}>
            {children}
        </span>
    );
};

export interface LinkCellProps {
    children: React.ReactNode;
    onClick?: (e?: React.MouseEvent) => void;
}

export const LinkCell: React.FC<LinkCellProps> = ({ children, onClick }) => (
    <span
        style={{ color: '#2563eb', fontWeight: 500, cursor: onClick ? 'pointer' : 'default' }}
        onClick={(e) => onClick?.(e)}
    >
        {children}
    </span>
);

// ==========================================
// MAIN DATATABLE2 COMPONENT
// ==========================================

function DataTable2<T extends TableData>({
    data,
    columns,
    keyField = 'id' as keyof T,
    onRowClick,
    onRefresh,
    loading = false,
    error = null,
    searchable = true,
    searchPlaceholder = 'Search...',
    paginated = true,
    pageSize: initialPageSize = 10,
    pageSizeOptions = [10, 25, 50, 100],
    className = '',
    minHeight = '400px',
    stickyHeader = true,
    striped = true,
    hoverable = true,
    emptyMessage = 'No records found',
    emptyIcon,
}: DataTable2Props<T>): React.ReactElement {
    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<keyof T | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [pageInputValue, setPageInputValue] = useState('1');

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return data;

        const query = searchTerm.toLowerCase();
        return data.filter(row =>
            columns.some(col => {
                const value = row[col.key];
                return toString(value).toLowerCase().includes(query);
            })
        );
    }, [data, searchTerm, columns]);

    // Sort filtered data
    const sortedData = useMemo(() => {
        if (!sortField) return filteredData;

        return [...filteredData].sort((a, b) => {
            const comparison = compareValues(a[sortField], b[sortField]);
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortField, sortDirection]);

    // Paginate sorted data
    const paginatedData = useMemo(() => {
        if (!paginated) return sortedData;

        const startIndex = (currentPage - 1) * pageSize;
        return sortedData.slice(startIndex, startIndex + pageSize);
    }, [sortedData, paginated, currentPage, pageSize]);

    // Calculate pagination info
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const startItem = sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, sortedData.length);

    // Handlers
    const handleSort = (field: keyof T, sortable?: boolean) => {
        if (sortable === false) return;

        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setPageInputValue(String(page));
        }
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
        setPageInputValue('1');
    };

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
        setPageInputValue('1');
    }, [searchTerm]);

    // Sync pageInputValue when currentPage changes externally
    React.useEffect(() => {
        setPageInputValue(String(currentPage));
    }, [currentPage]);

    // Render loading state
    if (loading) {
        return (
            <div style={{ ...styles.container, minHeight }} className={className}>
                <div style={styles.loadingOverlay}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Loading...</span>
                    </div>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div style={{ ...styles.container, minHeight }} className={className}>
                <div style={styles.errorState}>
                    <p>Error: {error}</p>
                    {onRefresh && (
                        <button style={styles.retryBtn} onClick={onRefresh}>
                            Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ ...styles.container, minHeight }} className={className}>
            {/* Toolbar */}
            {(searchable || onRefresh) && (
                <div style={styles.toolbar}>
                    {searchable && (
                        <div style={styles.searchWrapper}>
                            <Search size={16} style={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={styles.searchInput}
                            />
                        </div>
                    )}

                    <div style={styles.toolbarRight}>
                        <span>
                            {searchTerm
                                ? `${sortedData.length} of ${data.length} records`
                                : `${data.length} records`
                            }
                        </span>
                        {onRefresh && (
                            <button
                                style={styles.refreshBtn}
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
            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.headerRow}>
                            {columns.map((col, index) => (
                                <th
                                    key={String(col.key)}
                                    style={{
                                        ...styles.headerCell,
                                        width: col.width || 'auto',
                                        textAlign: col.align || 'left',
                                        cursor: col.sortable !== false ? 'pointer' : 'default',
                                        borderRight: index === columns.length - 1 ? 'none' : styles.headerCell.borderRight,
                                        position: stickyHeader ? 'sticky' : 'relative',
                                    }}
                                    onClick={() => handleSort(col.key, col.sortable)}
                                >
                                    <div style={styles.headerCellContent}>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {col.label}
                                        </span>
                                        {col.sortable !== false && (
                                            <div style={styles.sortIcons}>
                                                <ChevronUp
                                                    size={12}
                                                    style={{
                                                        color: sortField === col.key && sortDirection === 'asc'
                                                            ? '#ffffff'
                                                            : 'rgba(255,255,255,0.4)',
                                                    }}
                                                />
                                                <ChevronDown
                                                    size={12}
                                                    style={{
                                                        marginTop: '-4px',
                                                        color: sortField === col.key && sortDirection === 'desc'
                                                            ? '#ffffff'
                                                            : 'rgba(255,255,255,0.4)',
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length}>
                                    <div style={styles.emptyState}>
                                        {emptyIcon || <Search size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />}
                                        <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                                            {emptyMessage}
                                        </p>
                                        {searchTerm && (
                                            <p style={{ fontSize: '0.875rem' }}>
                                                No records match "{searchTerm}". Try adjusting your search.
                                            </p>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIndex) => {
                                const rowKey = row[keyField] !== undefined ? String(row[keyField]) : String(rowIndex);
                                const isOdd = rowIndex % 2 === 1;

                                return (
                                    <tr
                                        key={rowKey}
                                        style={{
                                            ...styles.bodyRow,
                                            background: striped && isOdd ? '#f9fafb' : 'white',
                                            cursor: onRowClick ? 'pointer' : 'default',
                                        }}
                                        onClick={() => onRowClick?.(row)}
                                        onMouseEnter={(e) => {
                                            if (hoverable) {
                                                (e.currentTarget as HTMLTableRowElement).style.background = '#eff6ff';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (hoverable) {
                                                (e.currentTarget as HTMLTableRowElement).style.background =
                                                    striped && isOdd ? '#f9fafb' : 'white';
                                            }
                                        }}
                                    >
                                        {columns.map((col, colIndex) => (
                                            <td
                                                key={String(col.key)}
                                                style={{
                                                    ...styles.bodyCell,
                                                    textAlign: col.align || 'left',
                                                    borderRight: colIndex === columns.length - 1 ? 'none' : styles.bodyCell.borderRight,
                                                }}
                                                title={toString(row[col.key])}
                                            >
                                                {col.render
                                                    ? col.render(row[col.key], row)
                                                    : toDisplay(row[col.key])
                                                }
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
                <div style={styles.pagination}>
                    <div style={styles.paginationInfo}>
                        <span>
                            Showing {startItem} - {endItem} of {sortedData.length}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>Rows:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                style={styles.pageSizeSelect}
                            >
                                {pageSizeOptions.map(size => (
                                    <option key={size} value={size} style={{ color: '#000000' }}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={styles.paginationControls}>
                        <button
                            style={{
                                ...styles.paginationBtn,
                                ...(currentPage === 1 ? styles.paginationBtnDisabled : {}),
                            }}
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            title="First page"
                        >
                            First
                        </button>

                        <button
                            style={{
                                ...styles.paginationBtn,
                                ...(currentPage === 1 ? styles.paginationBtnDisabled : {}),
                            }}
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            title="Previous page"
                        >
                            <ChevronLeft size={14} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0 0.5rem' }}>
                            <span>Page</span>
                            <input
                                type="text"
                                value={pageInputValue}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow empty or numeric input only
                                    if (val === '' || /^\d+$/.test(val)) {
                                        setPageInputValue(val);
                                    }
                                }}
                                onBlur={() => {
                                    // On blur, validate and go to page or reset
                                    const pageNum = parseInt(pageInputValue, 10);
                                    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                                        handlePageChange(pageNum);
                                    } else {
                                        setPageInputValue(String(currentPage));
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const pageNum = parseInt(pageInputValue, 10);
                                        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                                            handlePageChange(pageNum);
                                            (e.target as HTMLInputElement).blur();
                                        } else {
                                            setPageInputValue(String(currentPage));
                                        }
                                    }
                                    if (e.key === 'Escape') {
                                        setPageInputValue(String(currentPage));
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                style={{
                                    width: `${Math.max(2, String(totalPages).length + 0.5)}rem`,
                                    padding: '0.25rem 0.375rem',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '0.25rem',
                                    textAlign: 'center',
                                    fontSize: '0.75rem',
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    color: 'white',
                                    outline: 'none',
                                }}
                                onFocus={(e) => {
                                    e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                                    e.target.select();
                                }}
                                onMouseEnter={(e) => {
                                    if (document.activeElement !== e.target) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (document.activeElement !== e.target) {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                                    }
                                }}
                                title="Enter page number"
                            />
                            <span>of {totalPages}</span>
                        </div>

                        <button
                            style={{
                                ...styles.paginationBtn,
                                ...(currentPage === totalPages ? styles.paginationBtnDisabled : {}),
                            }}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            title="Next page"
                        >
                            <ChevronRight size={14} />
                        </button>

                        <button
                            style={{
                                ...styles.paginationBtn,
                                ...(currentPage === totalPages ? styles.paginationBtnDisabled : {}),
                            }}
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            title="Last page"
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataTable2;