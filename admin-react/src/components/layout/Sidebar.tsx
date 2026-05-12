import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    AppWindow,
    HardDrive,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Globe,
    LayoutDashboard,
    LogOut,
    MoreVertical,
    Search,
    Settings,
    User,
    Users,
    X,
} from "lucide-react";
import { ROUTES } from "../../config/routes";
import { useAuth } from "../../context/AuthContext";
import CertisDiamondIcon from "../../assets/logos/Certis Diamond Iconsmall.png";

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
    const { logout, user } = useAuth();
    const { pathname: currentPath } = useLocation();

    const profileName = useMemo(() => {
        const username = user?.username?.trim();
        if (!username) return "Admin User";
        return username;
    }, [user?.username]);

    const profileSecondary = user?.email || "admin@casper.local";
    const profileInitials = useMemo(() => {
        const source = profileName.trim();
        if (!source) return "AD";
        const parts = source.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }, [profileName]);

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
                description: "Manage Realms",
                hasSubMenu: true,
                subItems: [
                    {
                        id: "realms-all",
                        label: "All Realms",
                        description: "View all realms",
                        path: ROUTES.REALMS,
                    },
                    {
                        id: "realms-access-request",
                        label: "Realm Access Request",
                        description: "Request access to a realm",
                        path: ROUTES.REALM_ACCESS_REQUEST,
                    },
                    {
                        id: "realms-access-approve",
                        label: "Realm Access Approve",
                        description: "Approve realm access requests",
                        path: ROUTES.REALM_ACCESS_APPROVE,
                    },
                    {
                        id: "realms-access-verify",
                        label: "Realm Access Verify",
                        description: "Verify realm access",
                        path: ROUTES.REALM_ACCESS_VERIFY,
                    },
                    {
                        id: "realms-access-audit",
                        label: "Realm Access Audit",
                        description: "Audit realm access",
                        path: ROUTES.REALM_ACCESS_AUDIT,
                    },
                ],
            },
            {
                id: "applications",
                label: "Applications",
                icon: AppWindow,
                description: "Manage and track Apps",
                hasSubMenu: true,
                subItems: [
                    {
                        id: "applications-all",
                        label: "All Applications",
                        description: "View all applications",
                        path: ROUTES.APPS,
                    },
                ],
            },
            {
                id: "inventory",
                label: "Equipment",
                icon: HardDrive,
                description: "Track devices and assets",
                hasSubMenu: true,
                subItems: [
                    {
                        id: "inventory-all",
                        label: "Asset Inventory",
                        description: "View equipment and assets",
                        path: ROUTES.EQUIPMENT_ASSETS,
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
                        path: ROUTES.USERS,
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
                    {
                        id: "audit-logs",
                        label: "Audit Logs",
                        description: "Review sensitive admin actions",
                        path: ROUTES.AUDIT_LOGS,
                    },
                    {
                        id: "approval-requests",
                        label: "Approval Requests",
                        description: "Review high-impact action requests",
                        path: ROUTES.APPROVAL_REQUESTS,
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
    const navScrollRef = useRef<HTMLDivElement | null>(null);

    const getResponsiveState = (width: number) => ({
        isMobile: width < 480,
        isAutoCollapsed: width >= 480 && width < 900,
        isFullWidth: width >= 900,
    });

    const initialState = getResponsiveState(window.innerWidth);
    const [isMobile, setIsMobile] = useState(initialState.isMobile);
    const [isAutoCollapsed, setIsAutoCollapsed] = useState(initialState.isAutoCollapsed);
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

    useEffect(() => {
        navScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }, [currentPath, sidebarTab]);

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
            if (isCollapsed) {
                // keep your existing behavior for expanded mode
                if (isAutoCollapsed) return;
                setIsCollapsed(false);
                setExpandedMenus((prev) => new Set(prev).add(item.id));
                return;
            }

            setExpandedMenus((prev) => {
                const next = new Set(prev);
                if (next.has(item.id)) next.delete(item.id);
                else next.add(item.id);
                return next;
            });
            return;
        }

        if (item.path) navigate(item.path);
        if (isMobile) setIsOpen(false);
    };

    const handleSubMenuClick = (parentId: string, subPath: string) => {
        const state =
            subPath === ROUTES.REALMS
                ? { resetRealmsToList: Date.now() }
                : subPath === ROUTES.USERS
                    ? { resetUsersToList: Date.now() }
                    : subPath === ROUTES.APPS
                        ? { resetAppsToList: Date.now() }
                : undefined;

        navigate(subPath, state ? { state } : undefined);
        setExpandedMenus((prev) => new Set(prev).add(parentId));
        if (isMobile) setIsOpen(false);
    };

    const toggleCollapse = () => {
        if (isAutoCollapsed && isCollapsed) return;

        setIsCollapsed(!isCollapsed);

        if (!isCollapsed) {
            setExpandedMenus(new Set());
            setSidebarTab("main");
        }
    };

    // Profile menu
    const kebabBtnRef = useRef<HTMLButtonElement | null>(null);

    const closeMenu = () => {
        setShowProfileMenu(false);
    };

    // Close profile menu on ESC
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeMenu();
        };
        if (showProfileMenu) window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [showProfileMenu]);

    const handleProfileMenuAction = (action: "profile" | "settings" | "logout") => {
        closeMenu();
        if (action === "profile") {
            if (user?.sub) {
                navigate(ROUTES.PROFILE);
            }
            return;
        }
        if (action === "settings") console.log("Opening settings...");
        if (action === "logout") {
            void (async () => {
                try {
                    await logout();
                } finally {
                    navigate(ROUTES.LOGIN, { replace: true });
                }
            })();
        }
    };

    const sidebarWidth = isCollapsed ? "70px" : "256px";

    const scrollbarStyles = `
    .sidebar-nav-scrollable::-webkit-scrollbar { width: 6px; }
    .sidebar-nav-scrollable::-webkit-scrollbar-track { background: transparent; }
    .sidebar-nav-scrollable::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.28); border-radius: 3px; }
    .sidebar-nav-scrollable::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.40); }
  `;

    const navPanelClassName = (tab: SidebarTab) =>
        `sidebar-nav-panel ${sidebarTab === tab ? "is-active" : ""}`;

    const navButtonClassName = (isActive: boolean, collapsed: boolean) =>
        `sidebar-nav-item ${isActive ? "active" : ""} ${collapsed ? "is-collapsed" : "is-expanded"}`;

    return (
        <>
            <style>{scrollbarStyles}</style>

            {isMobile && isOpen && (
                <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
            )}

            <aside
                className={`sidebar glass-mica-dark ${isOpen ? "sidebar-open" : ""} ${isCollapsed ? "is-collapsed" : ""
                    }`}
                style={{
                    width: isMobile ? "256px" : sidebarWidth,
                    minWidth: isMobile ? "256px" : sidebarWidth,
                    transition:
                        "width 0.3s ease-in-out, min-width 0.3s ease-in-out, transform 0.3s ease-in-out",
                    transform: isMobile && !isOpen ? "translateX(-100%)" : "translateX(0)",
                    zIndex: 50,
                    height: "100vh",
                    left: 0,
                    top: 0,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div className="sidebar-header">
                    <div className={`sidebar-brandWrap ${isCollapsed ? "is-collapsed" : ""}`}>
                        <div className={`sidebar-brandRow ${isCollapsed ? "is-collapsed" : ""}`}>
                            <img
                                src={CertisDiamondIcon}
                                alt="Certis"
                                className="sidebar-brandIcon"
                            />

                            <span className={`sidebar-brandText ${isCollapsed ? "is-collapsed" : ""}`}>
                                CASPER
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsOpen(false)}
                        className={`sidebar-closeBtn ${isMobile ? "is-mobile-visible" : ""}`}
                        aria-label="Close sidebar"
                    >
                        <X className="sidebar-closeIcon" />
                    </button>
                </div>

                {/* Search */}
                <div className="sidebar-search">
                    {!isCollapsed ? (
                        <div className="sidebar-searchInner">
                            <div className="sidebar-searchFieldWrap">
                                <input
                                    className="glass-input sidebar-searchInput"
                                    type="text"
                                    placeholder="Search"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                                {searchValue && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchValue("")}
                                        aria-label="Clear search"
                                        className="sidebar-searchClear"
                                    >
                                        <X className="sidebar-searchClearIcon" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="sidebar-searchCollapsed">
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
                    ref={navScrollRef}
                >
                    {/* MAIN */}
                    <div className={navPanelClassName("main")}>
                        {filteredMenuItems.length === 0 ? (
                            <div className="sidebar-emptyState">
                                <p className="sidebar-emptyTitle">No results found</p>
                                <p className="sidebar-emptyDescription">
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
                                    <div key={item.id} className="sidebar-navItemWrap">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleMenuClick(item);
                                            }}
                                            onMouseEnter={() => {
                                                setHoveredItem(item.id);
                                            }}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            className={navButtonClassName(isActive, isCollapsed)}
                                            title={isCollapsed ? item.label : undefined}
                                        >
                                            <Icon className="sidebar-navItemIcon" />

                                            {!isCollapsed && (
                                                <>
                                                    <div className="sidebar-nav-text">
                                                        <div className="sidebar-nav-label">{item.label}</div>
                                                        <div className="sidebar-nav-desc">{item.description}</div>
                                                    </div>

                                                    {item.hasSubMenu && (
                                                        <div className="sidebar-navChevron">
                                                            {isExpanded ? (
                                                                <ChevronDown className="sidebar-navChevronIcon" />
                                                            ) : (
                                                                <ChevronRight className="sidebar-navChevronIcon" />
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </button>

                                        {/* Tooltip for collapsed */}
                                        {isCollapsed && isHovered && (
                                            <div className="sidebar-navTooltip">
                                                <div className="sidebar-navTooltipTitle">
                                                    {item.label}
                                                </div>
                                                <div className="sidebar-navTooltipDescription">
                                                    {item.description}
                                                </div>
                                            </div>
                                        )}

                                        {/* Submenu (expanded mode only) */}
                                        {!isCollapsed && item.hasSubMenu && item.subItems && isExpanded && (
                                            <div className="submenu-rail">
                                                {item.subItems.map((subItem, index) => (
                                                    <React.Fragment key={subItem.id}>
                                                        {index > 0 && (
                                                            <div className="submenu-sep" />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSubMenuClick(item.id, subItem.path)}
                                                            className={`sidebar-nav-item ${isSubItemActive(subItem.path) ? "active" : ""}`}
                                                            style={index === 0 ? { marginTop: "0.25rem" } : undefined}
                                                        >
                                                            <div className="sidebar-nav-text">
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
                    <div className={navPanelClassName("settings")}>
                        {settingsMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = isParentActive(undefined, item.subItems);
                            const isExpanded = expandedMenus.has(item.id);

                            return (
                                <div key={item.id} className="sidebar-navItemWrap">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleMenuClick(item);
                                        }}
                                        onMouseEnter={() => {
                                            setHoveredItem(item.id);
                                        }}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        className={navButtonClassName(isActive, isCollapsed)}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon className="sidebar-navItemIcon" />

                                        {!isCollapsed && (
                                            <>
                                                <div className="sidebar-nav-text">
                                                    <div className="sidebar-nav-label">{item.label}</div>
                                                    <div className="sidebar-nav-desc">{item.description}</div>
                                                </div>

                                                {item.hasSubMenu && (
                                                    <div className="sidebar-navChevron">
                                                        {isExpanded ? (
                                                            <ChevronDown className="sidebar-navChevronIcon" />
                                                        ) : (
                                                            <ChevronRight className="sidebar-navChevronIcon" />
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </button>

                                    {!isCollapsed && item.hasSubMenu && item.subItems && isExpanded && (
                                        <div className="submenu-rail">
                                            {item.subItems.map((subItem, index) => (
                                                <React.Fragment key={subItem.id}>
                                                    {index > 0 && (
                                                        <div className="submenu-sep" />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSubMenuClick(item.id, subItem.path)}
                                                        className={`sidebar-nav-item ${isSubItemActive(subItem.path) ? "active" : ""}`}
                                                        style={index === 0 ? { marginTop: "0.25rem" } : undefined}
                                                    >
                                                        <div className="sidebar-nav-text">
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
                <div className="sidebar-footer">
                    {!isCollapsed && (
                        <div className="sidebar-tabs-glass">
                            <button
                                onClick={() => setSidebarTab("main")}
                                className={`sidebar-tab ${sidebarTab === "main" ? "active" : ""}`}
                            >
                                Main
                            </button>
                            <button
                                onClick={() => setSidebarTab("settings")}
                                className={`sidebar-tab ${sidebarTab === "settings" ? "active" : ""}`}
                            >
                                Settings
                            </button>
                        </div>
                    )}

                    <div className={`sidebar-profile-card ${isCollapsed ? "is-collapsed" : ""}`}>
                        {isCollapsed && !isAutoCollapsed && (
                            <button
                                onClick={toggleCollapse}
                                className="glossy-icon-btn sidebar-expand-btn"
                                title="Expand sidebar"
                            >
                                <ChevronRight style={{ height: "1.1rem", width: "1.1rem" }} />
                            </button>
                        )}

                        <div className="sidebar-user">
                            <div
                                className={`sidebar-avatar ${isCollapsed ? "is-clickable" : ""}`}
                                onClick={() => isCollapsed && setShowProfileMenu(!showProfileMenu)}
                                title={isCollapsed ? profileName : undefined}
                            >
                                {profileInitials}
                            </div>

                            {!isCollapsed && (
                                <div className="sidebar-user-meta">
                                    <p className="sidebar-user-name">{profileName}</p>
                                    <p className="sidebar-user-email">{profileSecondary}</p>
                                </div>
                            )}
                        </div>

                        {!isCollapsed && !isAutoCollapsed && (
                            <div className="sidebar-profile-actions sidebar-profile-actionsWrap">
                                <button
                                    className="glossy-icon-btn icon-btn-square"
                                    onClick={toggleCollapse}
                                    title="Collapse sidebar"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                <button
                                    ref={kebabBtnRef}
                                    className="glossy-icon-btn icon-btn-square"
                                    onClick={() => setShowProfileMenu((v) => !v)}
                                >
                                    <MoreVertical size={18} />
                                </button>

                                {showProfileMenu && (
                                    <>
                                        <div
                                            onClick={() => setShowProfileMenu(false)}
                                            className="menu-overlay"
                                        />

                                        <div className="sidebar-profileMenu">
                                            <button
                                                onClick={() => handleProfileMenuAction("profile")}
                                                className="sidebar-profileMenuItem"
                                            >
                                                <User style={{ height: "1rem", width: "1rem" }} />
                                                Profile
                                            </button>

                                            <button
                                                onClick={() => handleProfileMenuAction("settings")}
                                                className="sidebar-profileMenuItem"
                                            >
                                                <Settings style={{ height: "1rem", width: "1rem" }} />
                                                Settings
                                            </button>

                                            <div className="sidebar-profileMenuDivider" />

                                            <button
                                                onClick={() => handleProfileMenuAction("logout")}
                                                className="sidebar-profileMenuItem is-danger"
                                            >
                                                <LogOut style={{ height: "1rem", width: "1rem" }} />
                                                Logout
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;