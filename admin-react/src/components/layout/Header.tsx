import React, { useEffect, useRef, useState, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { Menu, Clock, Calendar, ChevronRight } from "lucide-react";
import { LayoutGrid } from "lucide-react";
import { ROUTES } from "../../config/routes";

const FONT_FAMILY =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

export interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface HeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, breadcrumbs, onMenuClick }) => {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMobile, setIsMobile] = useState(window.innerWidth < 480);

    // ===== Portal quick menu state =====
    const quickBtnRef = useRef<HTMLButtonElement | null>(null);
    const [showQuickMenu, setShowQuickMenu] = useState(false);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const quickMenuRef = useRef<HTMLDivElement>(null);

    const formatDate = (date: Date) =>
        date.toLocaleDateString("en-SG", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

    const formatTime = (date: Date) =>
        date.toLocaleTimeString("en-SG", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

    // Update time
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Mobile breakpoint
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 480);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
                setShowQuickMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const widgetStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.875rem',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '0.375rem',
        color: '#ffffff',
        fontSize: '0.8rem',
        fontWeight: 500,
        height: '2.25rem',
    };

    // Dark theme icon button style - semi-transparent for visibility on banner
    const iconButtonStyle: React.CSSProperties = {
        padding: '0.5rem',
        borderRadius: '0.375rem',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: 'var(--kc-primary, #3b82f6)',
        // color: '#ffffff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        height: '2.25rem',
        width: '2.25rem',
        fontFamily: 'inherit',
    };

    // ===== Positioning helpers for portal menu =====
    const positionQuickMenu = useCallback(() => {
        const el = quickBtnRef.current;
        if (!el) return;

        const r = el.getBoundingClientRect();
        const width = 220;   // menu width
        const gap = 10;      // spacing below button

        // default: align menu right edge with button right edge
        let left = r.right - width;
        left = Math.max(12, Math.min(left, window.innerWidth - width - 12));

        // open below the button
        let top = r.bottom + gap;
        // if too low, flip upward
        const estimatedHeight = 180;
        if (top + estimatedHeight > window.innerHeight - 12) {
            top = Math.max(12, r.top - gap - estimatedHeight);
        }

        setMenuPos({ top, left });
    }, []);

    const openQuickMenu = useCallback(() => {
        positionQuickMenu();
        setShowQuickMenu(true);
    }, [positionQuickMenu]);

    const closeQuickMenu = useCallback(() => {
        setShowQuickMenu(false);
        setMenuPos(null);
    }, []);

    // Reposition on scroll/resize while open
    useEffect(() => {
        if (!showQuickMenu) return;

        const onScroll = () => positionQuickMenu();
        const onResize = () => positionQuickMenu();

        window.addEventListener("scroll", onScroll, true); // capture nested scroll containers too
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
        };
    }, [showQuickMenu, positionQuickMenu]);

    // Close on Escape
    useEffect(() => {
        if (!showQuickMenu) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeQuickMenu();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [showQuickMenu, closeQuickMenu]);

    const handleBreadcrumbClick = (path: string) => navigate(path);

    const handleQuickMenuClick = (path: string) => {
        closeQuickMenu();
        navigate(path);
    };

    const renderBreadcrumbs = () => {
        if (!breadcrumbs || breadcrumbs.length === 0) {
            // Fall back to subtitle if no breadcrumbs
            if (subtitle) {
                return (
                    <p style={{
                        margin: 0,
                        marginTop: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.8)',
                        letterSpacing: '0.03em',
                    }}>
                        {subtitle}
                    </p>
                );
            }
            return null;
        }

        return (
            <nav style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: '0.375rem',
                fontSize: '0.75rem',
            }}>
                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const isClickable = crumb.path && !isLast;

                    return (
                        <React.Fragment key={index}>
                            {isClickable ? (
                                <button
                                    onClick={() => handleBreadcrumbClick(crumb.path!)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        margin: 0,
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        color: '#7dd3fc',
                                        cursor: 'pointer',
                                        textDecoration: 'none',
                                        transition: 'color 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#bae6fd'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#7dd3fc'}
                                >
                                    {crumb.label}
                                </button>
                            ) : (
                                <span style={{
                                    fontWeight: isLast ? 600 : 500,
                                    color: isLast ? '#F68D2E' : '#ffffff',
                                }}>
                                    {crumb.label}
                                </span>
                            )}
                            {!isLast && (
                                <>
                                    <ChevronRight
                                        size={14}
                                        style={{
                                            marginLeft: '0.375rem',
                                            marginRight: '-0.6rem',
                                            color: 'rgba(255, 255, 255, 1)',
                                            flexShrink: 0
                                        }}
                                    />
                                    <ChevronRight
                                        size={14}
                                        style={{
                                            marginRight: '0.375rem',
                                            marginLeft: '0',
                                            color: 'rgba(255, 255, 255, 1)',
                                            flexShrink: 0
                                        }}
                                    />
                                </>
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>
        );
    };
    return (
        <header
            className="app-header-glass"
            style={{
                fontFamily: FONT_FAMILY,
                position: "sticky",
                top: 0,
                zIndex: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1.5rem",
                marginLeft: "-1px",
                paddingLeft: "calc(1.5rem + 1px)",
                boxSizing: "border-box",
            }}
        >
            {/* Left */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                {isMobile && (
                    <button
                        onClick={onMenuClick}
                        className={headerIconBtnClass}
                        type="button"
                        aria-label="Open sidebar"
                    >
                        <Menu style={{ height: "1.25rem", width: "1.25rem" }} />
                    </button>
                )}

                <div>
                    <h2 className="header-title" style={{ margin: 0 }}>
                        {title}
                    </h2>
                    {renderBreadcrumbs()}
                </div>
            </div>

            {/* Right */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={widgetStyle}>
                    <Calendar style={{ height: '0.9rem', width: '0.9rem', color: '#F68D2E' }} />
                    <span style={{ color: '#002855' }}>{formatDate(currentTime)}</span>
                    <div style={{
                        width: '1px',
                        height: '1rem',
                        backgroundColor: '#002855',
                        margin: '0 0.125rem'
                    }} />
                    <Clock style={{ height: '0.9rem', width: '0.9rem', color: '#F68D2E' }} />
                    <span style={{ fontFamily: "'Inter', monospace", minWidth: '60px', color: '#002855' }}>{formatTime(currentTime)}</span>
                </div>

                {/* Quick Menu Button */}
                {/* <button
                    ref={quickBtnRef}
                    type="button"
                    className={`glossy-icon-btn ${showQuickMenu ? "is-open" : ""}`}
                    onClick={() => (showQuickMenu ? closeQuickMenu() : openQuickMenu())}
                    aria-haspopup="menu"
                    aria-expanded={showQuickMenu}
                    title="Quick Menu"
                >
                    <LayoutGrid style={{ height: 18, width: 18 }} />
                </button> */}

                {/* Portal Menu */}
                {/* {showQuickMenu && menuPos &&
                    createPortal(
                        <>
                            <div className="menu-overlay" onClick={closeQuickMenu} />
                            <div
                                className="header-glass-menu glass-acrylic glass-menu-floating"
                                style={{
                                    position: "fixed",
                                    top: menuPos.top,
                                    left: menuPos.left,
                                    width: 220,
                                    zIndex: 9999,
                                    padding: 8,
                                }}
                                role="menu"
                            >
                                {[
                                    { label: "Home", icon: "📊", path: ROUTES.HOME },
                                    { label: "Manage Users", icon: "📝", path: ROUTES.MANAGE_USERS },
                                    { label: "Manage Apps", icon: "🗺️", path: ROUTES.MANAGE_APPS },
                                ].map((item) => (
                                    <button
                                        key={item.path}
                                        type="button"
                                        className="glass-menu-item"
                                        onClick={() => handleQuickMenuClick(item.path)}
                                        role="menuitem"
                                    >
                                        <span style={{ width: 22, textAlign: "center" }}>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </>,
                        document.body
                    )
                } */}

                <div ref={quickMenuRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowQuickMenu(!showQuickMenu)}
                        style={{
                            ...iconButtonStyle,
                            backgroundColor: showQuickMenu ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                        }}
                        title="Quick Menu"
                        onMouseEnter={(e) => {
                            if (!showQuickMenu) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                            if (!showQuickMenu) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                    >
                        <LayoutGrid size={18} color='var(--kc-primary, #3b82f6)' />
                    </button>

                    {/* Quick Menu Dropdown - Updated with navigation */}
                    {showQuickMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '0.5rem',
                            width: '200px',
                            backgroundColor: 'white',
                            borderRadius: '0.5rem',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                            border: '1px solid #e5e7eb',
                            zIndex: 50,
                            overflow: 'hidden',
                        }}>
                            <div style={{ padding: '0.5rem' }}>
                                {[
                                    { label: 'Home', icon: '📊', path: ROUTES.HOME },
                                    { label: "Manage Users", icon: "📝", path: ROUTES.MANAGE_USERS },
                                    { label: "Manage Apps", icon: "🗺️", path: ROUTES.MANAGE_APPS },

                                ].map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleQuickMenuClick(item.path)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.625rem 0.75rem',
                                            fontSize: '0.85rem',
                                            color: '#000000',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            borderRadius: '0.375rem',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background-color 0.2s',
                                            fontFamily: 'inherit',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
