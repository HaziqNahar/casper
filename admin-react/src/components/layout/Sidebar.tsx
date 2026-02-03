import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Globe,
    LayoutDashboard,
    LogOut,
    Menu,
    MoreVertical,
    Search,
    Settings,
    User,
    Users,
    X,
} from "lucide-react";
import { ROUTES } from "../../config/routes";
import CertisDiamondIcon from "../../assets/logos/Certis Diamond Iconsmall.png";

const FONT_FAMILY =
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";
const LOGO_FONT_FAMILY =
    "'Lato', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

type SidebarTab = "main" | "settings";

type MenuSubItem = {
    id: string;
    label: string;
    description: string;
    path: string;
};

type MenuItem = {
    id: string;
    label: string;
    icon: React.ElementType;
    description: string;
    path?: string;
    hasSubMenu?: boolean;
    subItems?: MenuSubItem[];
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
    const navigate = useNavigate();
    const { pathname: currentPath } = useLocation();

    const menuItems: MenuItem[] = useMemo(
        () => [
            {
                id: "home",
                label: "Home",
                icon: LayoutDashboard,
                description: "System overview",
                path: ROUTES.HOME,
            },
            {
                id: "realms",
                label: "Realms",
                icon: Globe,
                description: "Manage Realms and Apps",
                hasSubMenu: true,
                subItems: [
                    {
                        id: "realms-all",
                        label: "All Realms",
                        description: "View all realms",
                        path: ROUTES.REALMS_ALL,
                    },
                ],
            },
            {
                id: "users",
                label: "Users",
                icon: Users,
                description: "Manage and track users",
                hasSubMenu: true,
                subItems: [
                    {
                        id: "users-all",
                        label: "All Users",
                        description: "View all users",
                        path: ROUTES.USERS_ALL,
                    },
                    {
                        id: "users-active",
                        label: "Active Users",
                        description: "View active users",
                        path: ROUTES.USERS_ACTIVE,
                    },
                    {
                        id: "users-inactive",
                        label: "Inactive Users",
                        description: "View inactive users",
                        path: ROUTES.USERS_INACTIVE,
                    },
                ],
            },
        ],
        []
    );

    const settingsMenuItems: MenuItem[] = useMemo(
        () => [
            {
                id: "administration",
                label: "Administration",
                icon: Settings,
                description: "System administration",
                hasSubMenu: true,
                subItems: [
                    {
                        id: "mfa-settings",
                        label: "MFA Settings",
                        description: "Manage MFA settings",
                        path: ROUTES.MFA_SETTINGS,
                    },
                ],
            },
        ],
        []
    );

    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>("main");
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const getResponsiveState = (width: number) => ({
        isMobile: width < 480,
        isAutoCollapsed: width >= 480 && width < 900,
        isFullWidth: width >= 900,
    });

    const initialState = getResponsiveState(window.innerWidth);
    const [isMobile, setIsMobile] = useState(initialState.isMobile);
    const [isAutoCollapsed, setIsAutoCollapsed] = useState(
        initialState.isAutoCollapsed
    );
    const [isCollapsed, setIsCollapsed] = useState(initialState.isAutoCollapsed);

    // Keep sidebar width in a CSS var for layout alignment
    useEffect(() => {
        if (isMobile) {
            document.documentElement.style.setProperty("--sidebar-width", "0px");
        } else {
            document.documentElement.style.setProperty(
                "--sidebar-width",
                isCollapsed ? "70px" : "16rem"
            );
        }
    }, [isCollapsed, isMobile]);

    // Resize behavior
    useEffect(() => {
        const handleResize = () => {
            const state = getResponsiveState(window.innerWidth);
            const wasMobile = isMobile;

            setIsMobile(state.isMobile);
            setIsAutoCollapsed(state.isAutoCollapsed);

            if (state.isAutoCollapsed) {
                setIsCollapsed(true);
                setExpandedMenus(new Set());
            }

            if (state.isFullWidth && isAutoCollapsed) {
                setIsCollapsed(false);
            }

            if (state.isMobile && !wasMobile) {
                setIsOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isMobile, isAutoCollapsed, setIsOpen]);

    // Auto-expand parent based on route
    useEffect(() => {
        const all = [...menuItems, ...settingsMenuItems];

        for (const item of all) {
            if (!item.subItems) continue;
            const hasActiveChild = item.subItems.some((sub) => sub.path === currentPath);
            if (hasActiveChild) {
                setExpandedMenus((prev) => new Set(prev).add(item.id));
                setSidebarTab(settingsMenuItems.some((s) => s.id === item.id) ? "settings" : "main");
            }
        }
    }, [currentPath, menuItems, settingsMenuItems]);

    const isSubItemActive = (subPath: string) => currentPath === subPath;

    const isParentActive = (parentPath?: string, subItems?: MenuSubItem[]) => {
        if (parentPath && currentPath === parentPath) return true;
        if (!subItems) return false;
        return subItems.some((sub) => currentPath === sub.path);
    };

    const filteredMenuItems = useMemo(() => {
        if (!searchValue.trim()) return menuItems;
        const search = searchValue.toLowerCase();

        return menuItems.filter((item) => {
            const matchesLabel = item.label.toLowerCase().includes(search);
            const matchesDesc = item.description.toLowerCase().includes(search);
            const matchesSub = item.subItems?.some(
                (sub) =>
                    sub.label.toLowerCase().includes(search) ||
                    sub.description.toLowerCase().includes(search)
            );
            return matchesLabel || matchesDesc || matchesSub;
        });
    }, [menuItems, searchValue]);

    const handleMenuClick = (item: MenuItem) => {
        if (item.hasSubMenu) {
            // If collapsed, expand sidebar first then open submenu
            if (isCollapsed) {
                // If in auto-collapsed breakpoint, you were blocking expansion previously.
                // Keep it consistent: allow expansion only if NOT auto-collapsed.
                if (isAutoCollapsed) return;
                setIsCollapsed(false);
                setExpandedMenus((prev) => new Set(prev).add(item.id));
                return;
            }

            setExpandedMenus((prev) => {
                const next = new Set(prev);
                next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                return next;
            });
            return;
        }

        if (item.path) navigate(item.path);
        if (isMobile) setIsOpen(false);
    };

    const handleSubMenuClick = (parentId: string, subPath: string) => {
        navigate(subPath);
        setExpandedMenus((prev) => new Set(prev).add(parentId));
        if (isMobile) setIsOpen(false);
    };

    const toggleCollapse = () => {
        if (isAutoCollapsed && isCollapsed) return;

        setIsCollapsed(!isCollapsed);

        if (!isCollapsed) {
            setExpandedMenus(new Set());
            setSidebarTab('main'); // reset to main when collapsing
        }
    };

    // Profile menu portal
    const kebabBtnRef = useRef<HTMLButtonElement | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

    const openMenu = () => {
        const el = kebabBtnRef.current;
        if (!el) return;

        const r = el.getBoundingClientRect();
        const width = 180;
        const gap = 8;

        const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
        const top = r.top - gap;

        setMenuPos({ top, left });
        setShowProfileMenu(true);
    };

    const closeMenu = () => {
        setShowProfileMenu(false);
        setMenuPos(null);
    };

    // Close menu on ESC
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeMenu();
        };
        if (showProfileMenu) window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [showProfileMenu]);

    const handleProfileMenuAction = (action: "settings" | "logout") => {
        closeMenu();
        if (action === "settings") console.log("Opening settings...");
        if (action === "logout") console.log("Logging out...");
    };

    // Sidebar width
    const sidebarWidth = isCollapsed ? "70px" : "256px";

    // Scrollbar styles (you can move this to CSS if you want)
    const scrollbarStyles = `
    .sidebar-nav-scrollable::-webkit-scrollbar { width: 6px; }
    .sidebar-nav-scrollable::-webkit-scrollbar-track { background: transparent; }
    .sidebar-nav-scrollable::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.28); border-radius: 3px; }
    .sidebar-nav-scrollable::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.40); }
  `;

    return (
        <>
            <style>{scrollbarStyles}</style>

            {/* Mobile overlay */}
            {isMobile && isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        zIndex: 40,
                    }}
                />
            )}

            {/* Sidebar
          IMPORTANT: use "sidebar glass-mica-dark" so it matches the new global.css selectors
      */}
            <aside
                className={`sidebar glass-mica-dark ${isOpen ? "sidebar-open" : ""}`}
                style={{
                    width: isMobile ? "256px" : sidebarWidth,
                    minWidth: isMobile ? "256px" : sidebarWidth,
                    transition: "width 0.3s ease-in-out, min-width 0.3s ease-in-out, transform 0.3s ease-in-out",
                    transform: isMobile && !isOpen ? "translateX(-100%)" : "translateX(0)",
                    position: "fixed",
                    zIndex: 50,
                    height: "100vh",
                    left: 0,
                    top: 0,
                    display: "flex",
                    flexDirection: "column",
                    fontFamily: FONT_FAMILY,
                }}
            >
                {/* Header */}
                <div
                    className="sidebar-header"
                    style={{
                        padding: "1rem",
                        overflow: "hidden",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                            overflow: "hidden",
                            alignItems: isCollapsed ? "center" : "flex-start",
                            transition: "align-items 0.3s ease-in-out",
                            minWidth: 0,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                justifyContent: isCollapsed ? "center" : "flex-start",
                            }}
                        >
                            <img
                                src={CertisDiamondIcon}
                                alt="Certis"
                                style={{
                                    height: "2.1rem",
                                    width: "auto",
                                    objectFit: "contain",
                                    flexShrink: 0,
                                }}
                            />

                            {/* logo text */}
                            <span
                                style={{
                                    fontSize: "1.5rem",
                                    fontFamily: LOGO_FONT_FAMILY,
                                    fontWeight: 400,
                                    background:
                                        "linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #ffffff 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                    letterSpacing: "0.08em",
                                    whiteSpace: "nowrap",
                                    opacity: isCollapsed ? 0 : 1,
                                    maxWidth: isCollapsed ? 0 : "180px",
                                    overflow: "hidden",
                                    transition: "opacity 0.2s ease-in-out, max-width 0.3s ease-in-out",
                                    pointerEvents: isCollapsed ? "none" : "auto",
                                    lineHeight: 1,
                                }}
                            >
                                CASPER
                            </span>
                        </div>
                    </div>

                    {/* Mobile close */}
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            display: isMobile ? "flex" : "none",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.375rem",
                            borderRadius: "0.5rem",
                            background: "rgba(255, 255, 255, 0.14)",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            flexShrink: 0,
                            fontFamily: "inherit",
                        }}
                        aria-label="Close sidebar"
                    >
                        <X style={{ height: "1.25rem", width: "1.25rem" }} />
                    </button>
                </div>

                {/* Search */}
                <div className="sidebar-search" style={{ flexShrink: 0 }}>
                    {!isCollapsed ? (
                        <div style={{ padding: "0.75rem" }}>
                            <div style={{ position: "relative" }}>
                                <input
                                    className="glass-input"
                                    type="text"
                                    placeholder="Search"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    style={{
                                        padding: "0.5rem 2rem 0.5rem 0.75rem",
                                        fontFamily: "inherit",
                                    }}
                                />
                                {searchValue && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchValue("")}
                                        aria-label="Clear search"
                                        style={{
                                            position: "absolute",
                                            right: "0.5rem",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            padding: "0.2rem",
                                            borderRadius: "999px",
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "rgba(255,255,255,0.86)",
                                        }}
                                    >
                                        <X style={{ height: "0.9rem", width: "0.9rem" }} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: "0.75rem", display: "flex", justifyContent: "center" }}>
                            <button
                                type="button"
                                className="glossy-icon-btn"
                                onClick={() => {
                                    if (isAutoCollapsed) return;
                                    setIsCollapsed(false);
                                }}
                                title="Search"
                            >
                                <Search style={{ height: "1rem", width: "1rem" }} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <div
                    className="sidebar-nav sidebar-nav-scrollable"
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        position: "relative",
                        paddingBottom: "0.5rem",
                    }}
                >
                    {/* MAIN */}
                    <div
                        style={{
                            transform: sidebarTab === "main" ? "translateX(0)" : "translateX(-100%)",
                            opacity: sidebarTab === "main" ? 1 : 0,
                            transition: "transform 0.3s ease-in-out, opacity 0.3s ease-in-out",
                            position: sidebarTab === "main" ? "relative" : "absolute",
                            width: "100%",
                            top: 0,
                            left: 0,
                        }}
                    >
                        {filteredMenuItems.length === 0 ? (
                            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "rgba(255,255,255,0.8)" }}>
                                <p style={{ fontSize: "0.875rem", margin: 0 }}>No results found</p>
                                <p style={{ fontSize: "0.75rem", marginTop: "0.25rem", marginBottom: 0, opacity: 0.8 }}>
                                    Try a different search term
                                </p>
                            </div>
                        ) : (
                            filteredMenuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = isParentActive(item.path, item.subItems);
                                const isExpanded = expandedMenus.has(item.id);
                                const isHovered = hoveredItem === item.id;

                                return (
                                    <div key={item.id} style={{ position: "relative" }}>
                                        <button
                                            type="button"
                                            onClick={() => handleMenuClick(item)}
                                            onMouseEnter={() => setHoveredItem(item.id)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                                            style={{
                                                width: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: isCollapsed ? "center" : "flex-start",
                                                padding: isCollapsed ? "0.75rem" : "0.75rem 1rem",
                                                gap: isCollapsed ? 0 : "0.75rem",
                                                fontFamily: "inherit",
                                            }}
                                            title={isCollapsed ? item.label : undefined}
                                        >
                                            <Icon style={{ height: "1.25rem", width: "1.25rem", flexShrink: 0 }} />

                                            {!isCollapsed && (
                                                <>
                                                    <div className="sidebar-nav-text" style={{ flex: 1, textAlign: "left" }}>
                                                        <div className="sidebar-nav-label">{item.label}</div>
                                                        <div className="sidebar-nav-desc">{item.description}</div>
                                                    </div>

                                                    {item.hasSubMenu && (
                                                        <div style={{ display: "flex", alignItems: "center" }}>
                                                            {isExpanded ? (
                                                                <ChevronDown style={{ height: "1rem", width: "1rem" }} />
                                                            ) : (
                                                                <ChevronRight style={{ height: "1rem", width: "1rem" }} />
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </button>

                                        {/* Tooltip for collapsed */}
                                        {isCollapsed && isHovered && (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    left: "100%",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    marginLeft: "0.5rem",
                                                    padding: "0.5rem 0.75rem",
                                                    backgroundColor: "#111827",
                                                    color: "white",
                                                    borderRadius: "0.5rem",
                                                    fontSize: "0.8rem",
                                                    fontWeight: 600,
                                                    whiteSpace: "nowrap",
                                                    zIndex: 100,
                                                    boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
                                                }}
                                            >
                                                {item.label}
                                                {item.hasSubMenu && <span style={{ opacity: 0.7, marginLeft: "0.25rem" }}>▸</span>}
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        left: "-5px",
                                                        top: "50%",
                                                        transform: "translateY(-50%)",
                                                        width: 0,
                                                        height: 0,
                                                        borderTop: "5px solid transparent",
                                                        borderBottom: "5px solid transparent",
                                                        borderRight: "5px solid #111827",
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Submenu */}
                                        {!isCollapsed && item.hasSubMenu && item.subItems && isExpanded && (
                                            <div
                                                className="submenu-rail"
                                                style={{
                                                    marginLeft: "1rem",
                                                    marginTop: "0.25rem",
                                                    marginBottom: "0.5rem",
                                                    paddingLeft: "1rem",
                                                }}
                                            >
                                                {item.subItems.map((subItem, index) => (
                                                    <React.Fragment key={subItem.id}>
                                                        {index > 0 && (
                                                            <div
                                                                className="submenu-sep"
                                                                style={{ height: "1px", margin: "0.25rem 0.75rem", opacity: 0.25 }}
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSubMenuClick(item.id, subItem.path)}
                                                            className={`sidebar-nav-item ${isSubItemActive(subItem.path) ? "active" : ""}`}
                                                            style={{
                                                                width: "100%",
                                                                marginTop: index === 0 ? "0.25rem" : 0,
                                                                padding: "0.45rem 0.75rem",
                                                                fontFamily: "inherit",
                                                                display: "flex",
                                                                alignItems: "center",
                                                            }}
                                                        >
                                                            <div className="sidebar-nav-text" style={{ flex: 1, textAlign: "left" }}>
                                                                <div className="sidebar-nav-label">{subItem.label}</div>
                                                                <div className="sidebar-nav-desc">{subItem.description}</div>
                                                            </div>
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* SETTINGS */}
                    <div
                        style={{
                            transform: sidebarTab === "settings" ? "translateX(0)" : "translateX(100%)",
                            opacity: sidebarTab === "settings" ? 1 : 0,
                            transition: "transform 0.3s ease-in-out, opacity 0.3s ease-in-out",
                            position: sidebarTab === "settings" ? "relative" : "absolute",
                            width: "100%",
                            top: 0,
                            left: 0,
                        }}
                    >
                        {settingsMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = isParentActive(undefined, item.subItems);
                            const isExpanded = expandedMenus.has(item.id);

                            return (
                                <div key={item.id} style={{ position: "relative" }}>
                                    <button
                                        type="button"
                                        onClick={() => handleMenuClick(item)}
                                        onMouseEnter={() => setHoveredItem(item.id)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: isCollapsed ? "center" : "flex-start",
                                            padding: isCollapsed ? "0.75rem" : "0.75rem 1rem",
                                            gap: isCollapsed ? 0 : "0.75rem",
                                            fontFamily: "inherit",
                                        }}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon style={{ height: "1.25rem", width: "1.25rem", flexShrink: 0 }} />

                                        {!isCollapsed && (
                                            <>
                                                <div className="sidebar-nav-text" style={{ flex: 1, textAlign: "left" }}>
                                                    <div className="sidebar-nav-label">{item.label}</div>
                                                    <div className="sidebar-nav-desc">{item.description}</div>
                                                </div>

                                                {item.hasSubMenu && (
                                                    <div style={{ display: "flex", alignItems: "center" }}>
                                                        {isExpanded ? (
                                                            <ChevronDown style={{ height: "1rem", width: "1rem" }} />
                                                        ) : (
                                                            <ChevronRight style={{ height: "1rem", width: "1rem" }} />
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </button>

                                    {!isCollapsed && item.hasSubMenu && item.subItems && isExpanded && (
                                        <div
                                            className="submenu-rail"
                                            style={{
                                                marginLeft: "1rem",
                                                marginTop: "0.25rem",
                                                marginBottom: "0.5rem",
                                                paddingLeft: "1rem",
                                            }}
                                        >
                                            {item.subItems.map((subItem, index) => (
                                                <React.Fragment key={subItem.id}>
                                                    {index > 0 && (
                                                        <div
                                                            className="submenu-sep"
                                                            style={{ height: "1px", margin: "0.25rem 0.75rem", opacity: 0.25 }}
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSubMenuClick(item.id, subItem.path)}
                                                        className={`sidebar-nav-item ${isSubItemActive(subItem.path) ? "active" : ""}`}
                                                        style={{
                                                            width: "100%",
                                                            marginTop: index === 0 ? "0.25rem" : 0,
                                                            padding: "0.45rem 0.75rem",
                                                            fontFamily: "inherit",
                                                            display: "flex",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <div className="sidebar-nav-text" style={{ flex: 1, textAlign: "left" }}>
                                                            <div className="sidebar-nav-label">{subItem.label}</div>
                                                            <div className="sidebar-nav-desc">{subItem.description}</div>
                                                        </div>
                                                    </button>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom */}
                <div style={{ flexShrink: 0 }}>
                    {/* Main / Settings Tabs */}
                    {!isCollapsed && (
                        <div className="sidebar-tabs-glass">
                            <button
                                onClick={() => setSidebarTab('main')}
                                className={`sidebar-tab ${sidebarTab === 'main' ? 'active' : ''}`}
                                style={{
                                    flex: 1,
                                    padding: '0.625rem 0.5rem',
                                    fontSize: '0.8rem',
                                    fontWeight: sidebarTab === 'main' ? 600 : 400,
                                    color: sidebarTab === 'main' ? '#002855' : '#000000',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Main
                            </button>
                            <button
                                onClick={() => setSidebarTab('settings')}
                                className={`sidebar-tab ${sidebarTab === 'settings' ? 'active' : ''}`}
                                style={{
                                    flex: 1,
                                    padding: '0.625rem 0.5rem',
                                    fontSize: '0.8rem',
                                    fontWeight: sidebarTab === 'settings' ? 600 : 400,
                                    color: sidebarTab === 'settings' ? '#002855' : '#000000',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Settings
                            </button>
                        </div>
                    )}
                    {/* Profile */}
                    <div
                        style={{
                            padding: isCollapsed ? "0.75rem 0.5rem" : "0.75rem 1rem",
                            display: "flex",
                            alignItems: isCollapsed ? "center" : "center",
                            justifyContent: isCollapsed ? "center" : "space-between",
                            flexDirection: isCollapsed ? "column" : "row",
                            gap: isCollapsed ? "0.5rem" : 0,
                        }}
                    >
                        {/* Collapsed: collapse/expand button ABOVE avatar */}
                        {isCollapsed && !isAutoCollapsed && (
                            <button
                                onClick={toggleCollapse}
                                className="glossy-icon-btn"
                                title="Expand sidebar"
                                style={{
                                    padding: "0.35rem",
                                    borderRadius: "0.5rem",
                                    border: "none",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <ChevronRight style={{ height: "1.1rem", width: "1.1rem" }} />
                            </button>
                        )}

                        {/* Avatar + name/email (your existing block, unchanged) */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                flex: isCollapsed ? "none" : 1,
                                justifyContent: isCollapsed ? "center" : "flex-start",
                                width: isCollapsed ? "100%" : "auto",
                            }}
                        >
                            <div
                                style={{
                                    width: "2.25rem",
                                    height: "2.25rem",
                                    backgroundColor: "#3b82f6",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    cursor: isCollapsed ? "pointer" : "default",
                                }}
                                onClick={() => isCollapsed && setShowProfileMenu(!showProfileMenu)}
                                title={isCollapsed ? "Admin User" : undefined}
                            >
                                AD
                            </div>

                            {!isCollapsed && (
                                <div style={{ marginLeft: "0.75rem", flex: 1 }}>
                                    <p style={{ fontSize: "0.8rem", fontWeight: 500, margin: 0 }}>Admin User</p>
                                    <p style={{ fontSize: "0.7rem", margin: 0 }}>admin@bos.sg</p>
                                </div>
                            )}
                        </div>

                        {/* Expanded: collapse button near kebab (optional) */}
                        {!isCollapsed && !isAutoCollapsed && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <button
                                    className="glossy-icon-btn icon-btn-square"
                                    onClick={toggleCollapse}
                                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                                >
                                    <ChevronLeft size={18} />
                                </button>


                                {showProfileMenu && menuPos &&
                                    createPortal(
                                        <>
                                            <div className="menu-overlay" onClick={closeMenu} />
                                            <div
                                                className="glass-acrylic glass-menu"
                                                style={{
                                                    position: "fixed",
                                                    top: menuPos.top,
                                                    left: menuPos.left,
                                                    width: 180,
                                                    transform: "translateY(-100%)",
                                                    zIndex: 9999,
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    className="glass-menu-item"
                                                    onClick={() => handleProfileMenuAction("settings")}
                                                >
                                                    <User style={{ height: "1rem", width: "1rem" }} />
                                                    Profile
                                                </button>

                                                <button
                                                    type="button"
                                                    className="glass-menu-item"
                                                    onClick={() => handleProfileMenuAction("settings")}
                                                >
                                                    <Settings style={{ height: "1rem", width: "1rem" }} />
                                                    Settings
                                                </button>

                                                <div className="glass-menu-divider" />

                                                <button
                                                    type="button"
                                                    className="glass-menu-item danger"
                                                    onClick={() => handleProfileMenuAction("logout")}
                                                >
                                                    <LogOut style={{ height: "1rem", width: "1rem" }} />
                                                    Logout
                                                </button>
                                            </div>
                                        </>,
                                        document.body
                                    )}
                                <button
                                    ref={kebabBtnRef}
                                    className="glossy-icon-btn icon-btn-square"
                                    onClick={() => (showProfileMenu ? closeMenu() : openMenu())}
                                >
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
