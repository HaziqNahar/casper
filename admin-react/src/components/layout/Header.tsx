import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Clock, Calendar, ChevronRight, LayoutGrid, Bell, AlertTriangle } from "lucide-react";
import { ROUTES } from "../../config/routes";
import AccessActorSwitcher from "../access/AccessActorSwitcher";
import { authApi } from "../../services/authApi";
import { governanceApi } from "../../services/governanceApi";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";

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
    tabs?: { label: string; path: string }[];
    activePath?: string;
}

type HeaderApprovalRequest = {
    id: string;
    requestedAt: string;
    status: string;
    slaHours: number;
};

const Header: React.FC<HeaderProps> = ({ title, subtitle, breadcrumbs, onMenuClick, tabs, activePath }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { pushToast } = useToast();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMobile, setIsMobile] = useState(window.innerWidth < 480);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
    const [overdueApprovalCount, setOverdueApprovalCount] = useState(0);
    const notificationInitRef = useRef(false);
    const previousPendingRef = useRef(0);
    const previousOverdueRef = useRef(0);

    const { pathname } = useLocation();
    const currentPath = activePath ?? pathname;

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

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    const quickMenuItems = [
        { label: "Home", icon: "📊", path: ROUTES.HOME, visible: true },
        { label: "Create User", icon: "👤", path: ROUTES.CREATE_USER, visible: user?.role === "Admin" || Boolean(user?.isSuperAdmin) },
        { label: "Register App", icon: "🗺️", path: ROUTES.REGISTER_APPS, visible: user?.role === "Admin" || Boolean(user?.isSuperAdmin) },
        { label: "Approval Queue", icon: "📝", path: ROUTES.APPROVAL_REQUESTS, visible: Boolean(user?.isSuperAdmin) },
    ].filter((item) => item.visible);

    const loadGovernanceAlerts = useCallback(async () => {
        if (!user) {
            setIsSuperAdmin(false);
            setPendingApprovalCount(0);
            setOverdueApprovalCount(0);
            notificationInitRef.current = false;
            previousPendingRef.current = 0;
            previousOverdueRef.current = 0;
            return;
        }

        try {
            const me = await authApi.me();
            const nextIsSuperAdmin = Boolean(me.isSuperAdmin);
            setIsSuperAdmin(nextIsSuperAdmin);

            if (!nextIsSuperAdmin) {
                setPendingApprovalCount(0);
                setOverdueApprovalCount(0);
                notificationInitRef.current = false;
                previousPendingRef.current = 0;
                previousOverdueRef.current = 0;
                return;
            }

            const requests = await governanceApi.approvalRequests<HeaderApprovalRequest[]>();
            const now = Date.now();
            const pending = requests.filter((row) => row.status === "Pending");
            const overdue = pending.filter((row) => {
                const requestedAtMs = new Date(row.requestedAt).getTime();
                const slaHours = Math.max(1, row.slaHours || 4);
                const dueAtMs = requestedAtMs + slaHours * 60 * 60 * 1000;
                return dueAtMs <= now;
            });

            const nextPending = pending.length;
            const nextOverdue = overdue.length;

            setPendingApprovalCount(nextPending);
            setOverdueApprovalCount(nextOverdue);

            if (notificationInitRef.current) {
                if (nextPending > previousPendingRef.current) {
                    const delta = nextPending - previousPendingRef.current;
                    pushToast(
                        delta === 1
                            ? "1 new approval request is waiting for review"
                            : `${delta} new approval requests are waiting for review`,
                        "info"
                    );
                }

                if (nextOverdue > previousOverdueRef.current) {
                    const delta = nextOverdue - previousOverdueRef.current;
                    pushToast(
                        delta === 1
                            ? "1 approval request has breached SLA"
                            : `${delta} approval requests have breached SLA`,
                        "warning"
                    );
                }
            } else {
                notificationInitRef.current = true;
            }

            previousPendingRef.current = nextPending;
            previousOverdueRef.current = nextOverdue;
        } catch {
            // Keep header resilient if approval APIs are unavailable.
        }
    }, [pushToast, user]);

    useEffect(() => {
        const immediate = window.setTimeout(() => {
            void loadGovernanceAlerts();
        }, 0);
        const timer = window.setInterval(() => {
            void loadGovernanceAlerts();
        }, 60000);
        return () => {
            window.clearTimeout(immediate);
            window.clearInterval(timer);
        };
    }, [loadGovernanceAlerts]);

    const approvalBadgeCount = overdueApprovalCount > 0 ? overdueApprovalCount : pendingApprovalCount;
    const approvalButtonTitle = overdueApprovalCount > 0
        ? `${overdueApprovalCount} overdue approval ${overdueApprovalCount === 1 ? "request" : "requests"}`
        : pendingApprovalCount > 0
            ? `${pendingApprovalCount} pending approval ${pendingApprovalCount === 1 ? "request" : "requests"}`
            : "No pending approval requests";

    const renderBreadcrumbs = () => {
        if (!breadcrumbs || breadcrumbs.length === 0) {
            if (subtitle) {
                return (
                    <p className="header-subtitle">
                        {subtitle}
                    </p>
                );
            }
            return null;
        }

        return (
            <nav className="header-breadcrumbTrail">
                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    const isClickable = crumb.path && !isLast;

                    return (
                        <React.Fragment key={index}>
                            {isClickable ? (
                                <button
                                    onClick={() => handleBreadcrumbClick(crumb.path!)}
                                    className="header-breadcrumbLink"
                                >
                                    {crumb.label}
                                </button>
                            ) : (
                                <span className={isLast ? "header-breadcrumbCurrent" : "header-breadcrumbText"}>
                                    {crumb.label}
                                </span>
                            )}
                            {!isLast && (
                                <span className="header-breadcrumbChevronPair" aria-hidden="true">
                                    <ChevronRight size={14} className="header-breadcrumbChevron header-breadcrumbChevron--tight" />
                                    <ChevronRight size={14} className="header-breadcrumbChevron" />
                                </span>
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>
        );
    };

    const renderTabs = () =>
        tabs && tabs.length > 0 ? (
            <div className="header-tabsRow">
                {tabs.map((t) => {
                    const isActive = currentPath === t.path;
                    return (
                        <button
                            key={t.path}
                            onClick={() => navigate(t.path)}
                            className={`header-tabButton ${isActive ? "is-active" : ""}`}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>
        ) : null;

    return (
        <header className="app-header-glass" style={{ fontFamily: FONT_FAMILY }}>
            <div className="header-mainRow">
                {isMobile && (
                    <button
                        onClick={onMenuClick}
                        type="button"
                        aria-label="Open sidebar"
                    >
                        <Menu style={{ height: "1.15rem", width: "1.15rem" }} />
                    </button>
                )}

                <div className="header-titleBlock">
                    <h2 className="header-title">{title}</h2>
                    {renderBreadcrumbs()}
                    {renderTabs()}
                </div>
            </div>

            <div className="header-actionsSide">
                <div className="header-toolbarGlass">
                    <div className="header-actorSlot">
                        <AccessActorSwitcher />
                    </div>
                    <div className="widgetstyle">
                        <Calendar className="header-widgetIcon" />
                        <span className="header-widgetText">{formatDate(currentTime)}</span>

                        <div className="header-widgetDivider" />

                        <Clock className="header-widgetIcon" />
                        <span className="header-widgetTime">
                            {formatTime(currentTime)}
                        </span>
                    </div>

                    {isSuperAdmin && (
                        <button
                            type="button"
                            className="iconButtonStyle"
                            onClick={() => navigate(ROUTES.APPROVAL_REQUESTS)}
                            title={approvalButtonTitle}
                            style={{
                                backgroundColor: overdueApprovalCount > 0 ? "rgba(248, 113, 113, 0.22)" : "rgba(255, 255, 255, 0.15)",
                                borderColor: overdueApprovalCount > 0 ? "rgba(248, 113, 113, 0.45)" : undefined,
                            }}
                        >
                            {overdueApprovalCount > 0 ? (
                                <AlertTriangle size={18} color="#dc2626" />
                            ) : (
                                <Bell size={18} color={"var(--kc-primary, #3b82f6)"} />
                            )}
                            {approvalBadgeCount > 0 && (
                                <span
                                    className="header-approvalBadge"
                                    style={{ background: overdueApprovalCount > 0 ? "#dc2626" : "#0f766e" }}
                                >
                                    {approvalBadgeCount > 99 ? "99+" : approvalBadgeCount}
                                </span>
                            )}
                        </button>
                    )}

                    <div ref={quickMenuRef} className="header-quickMenuWrap">
                        <button
                            className="iconButtonStyle"
                            onClick={() => setShowQuickMenu(!showQuickMenu)}
                            style={{
                                backgroundColor: showQuickMenu ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.15)",
                            }}
                            title="Quick Menu"
                        >
                            <LayoutGrid size={18} color={"var(--kc-primary, #3b82f6)"} />
                        </button>

                        {showQuickMenu && (
                            <div className="header-quickMenu">
                                <div className="header-quickMenuList">
                                    {quickMenuItems.map((item, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleQuickMenuClick(item.path)}
                                            className="header-quickMenuItem"
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