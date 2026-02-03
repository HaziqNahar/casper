import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
            return subtitle ? <p className="header-subtitle">{subtitle}</p> : null;
        }

        return (
            <nav className="header-breadcrumbs" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const isClickable = !!crumb.path && !isLast;

                    return (
                        <React.Fragment key={`${crumb.label}-${index}`}>
                            {isClickable ? (
                                <button
                                    type="button"
                                    className="crumb-link"
                                    onClick={() => handleBreadcrumbClick(crumb.path!)}
                                >
                                    {crumb.label}
                                </button>
                            ) : (
                                <span className="breadcrumb-pill">{crumb.label}</span>
                            )}
                            {!isLast && <ChevronRight size={14} className="crumb-sep" aria-hidden="true" />}
                        </React.Fragment>
                    );
                })}
            </nav>
        );
    };

    // ✅ Make header button more “opaque / solid” like sidebar button
    const headerIconBtnClass = "glossy-icon-btn"; // reuse your existing class

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
                <div className="glossy-pill">
                    <Calendar style={{ height: "0.9rem", width: "0.9rem" }} />
                    <span>{formatDate(currentTime)}</span>

                    <div className="glossy-pill-sep" />

                    <Clock style={{ height: "0.9rem", width: "0.9rem" }} />
                    <span style={{ fontFamily: "'Inter', monospace" }}>
                        {formatTime(currentTime)}
                    </span>
                </div>

                {/* Quick Menu Button */}
                <button
                    ref={quickBtnRef}
                    type="button"
                    className={`glossy-icon-btn ${showQuickMenu ? "is-open" : ""}`}
                    onClick={() => (showQuickMenu ? closeQuickMenu() : openQuickMenu())}
                    aria-haspopup="menu"
                    aria-expanded={showQuickMenu}
                    title="Quick Menu"
                >
                    <LayoutGrid style={{ height: 18, width: 18 }} />
                </button>

                {/* Portal Menu */}
                {showQuickMenu && menuPos &&
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
                }
            </div>
        </header>
    );
};

export default Header;
