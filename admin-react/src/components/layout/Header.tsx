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
    const [showQuickMenu, setShowQuickMenu] = useState(false);
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

    const closeQuickMenu = useCallback(() => {
        setShowQuickMenu(false);
    }, []);

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
                padding: "0.75rem 1.25rem",
                marginLeft: "-1px",
                paddingLeft: "calc(1.25rem + 1px)",
                boxSizing: "border-box",
            }}
        >
            {/* Left */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flex: 1, minWidth: 0 }}>
                {isMobile && (
                    <button
                        onClick={onMenuClick}
                        type="button"
                        aria-label="Open sidebar"
                    >
                        <Menu style={{ height: "1.15rem", width: "1.15rem" }} />
                    </button>
                )}

                <div style={{ minWidth: 0 }}>
                    <h2 className="header-title">{title}</h2>
                    {renderBreadcrumbs()}
                </div>
            </div>

            {/* Right */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
                {/* Enterprise toolbar grouping (doesn't change your dropdown) */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.35rem",
                        borderRadius: "0.9rem",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.12))",
                        border: "1px solid rgba(255,255,255,0.20)",
                        backdropFilter: "blur(16px) saturate(150%)",
                        WebkitBackdropFilter: "blur(16px) saturate(150%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.30), 0 8px 18px rgba(0,0,0,0.12)",
                    }}
                >
                    {/* Date/Time widget (KEEP orange icons + blue text) */}
                    <div style={widgetStyle}>
                        <Calendar style={{ height: "0.9rem", width: "0.9rem", color: "#F68D2E" }} />
                        <span style={{ color: "#002855" }}>{formatDate(currentTime)}</span>

                        <div
                            style={{
                                width: "1px",
                                height: "1rem",
                                backgroundColor: "rgba(0,40,85,0.35)",
                                margin: "0 0.125rem",
                            }}
                        />

                        <Clock style={{ height: "0.9rem", width: "0.9rem", color: "#F68D2E" }} />
                        <span
                            style={{
                                fontFamily: "'Inter', monospace",
                                minWidth: "60px",
                                color: "#002855",
                            }}
                        >
                            {formatTime(currentTime)}
                        </span>
                    </div>

                    {/* Quick Menu (dropdown kept EXACTLY as-is) */}
                    <div ref={quickMenuRef} style={{ position: "relative" }}>
                        <button
                            onClick={() => setShowQuickMenu(!showQuickMenu)}
                            style={{
                                ...iconButtonStyle,
                                backgroundColor: showQuickMenu ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.15)",
                            }}
                            title="Quick Menu"
                            onMouseEnter={(e) => {
                                if (!showQuickMenu) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
                            }}
                            onMouseLeave={(e) => {
                                if (!showQuickMenu) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                            }}
                        >
                            <LayoutGrid size={18} color={"var(--kc-primary, #3b82f6)"} />
                        </button>

                        {showQuickMenu && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    marginTop: "0.5rem",
                                    width: "200px",
                                    backgroundColor: "white",
                                    borderRadius: "0.5rem",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                                    border: "1px solid #e5e7eb",
                                    zIndex: 50,
                                    overflow: "hidden",
                                }}
                            >
                                <div style={{ padding: "0.5rem" }}>
                                    {[
                                        { label: "Home", icon: "📊", path: ROUTES.HOME },
                                        { label: "Manage Users", icon: "📝", path: ROUTES.MANAGE_USERS },
                                        { label: "Manage Apps", icon: "🗺️", path: ROUTES.MANAGE_APPS },
                                    ].map((item, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleQuickMenuClick(item.path)}
                                            style={{
                                                width: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.75rem",
                                                padding: "0.625rem 0.75rem",
                                                fontSize: "0.85rem",
                                                color: "#000000",
                                                backgroundColor: "transparent",
                                                border: "none",
                                                borderRadius: "0.375rem",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                transition: "background-color 0.2s",
                                                fontFamily: "inherit",
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
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
            </div>
        </header>
    );
};

export default Header;
