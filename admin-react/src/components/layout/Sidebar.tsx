import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    X,
    Settings,
    LogOut,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    LayoutDashboard,
    MoreVertical,
    User,
    Search,
    Menu,
    Globe,
    Users,

} from 'lucide-react';
import { ROUTES } from '../../config/routes';

// Import the Certis Diamond Icon
import CertisDiamondIcon from '../../assets/logos/Certis Diamond Iconsmall.png';

// Global font family constant
const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

// Logo font - Lato Regular for CES MOZART
const LOGO_FONT_FAMILY = "'Lato', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    setIsOpen,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
    const [sidebarTab, setSidebarTab] = useState<'main' | 'settings'>('main');
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    // Responsive breakpoints:
    // - Mobile (hamburger): < 480px
    // - Auto-collapsed (icon-only): 480px - 899px  
    // - Full sidebar: >= 900px
    const getResponsiveState = (width: number) => ({
        isMobile: width < 480,
        isAutoCollapsed: width >= 480 && width < 900,
        isFullWidth: width >= 900
    });

    const initialState = getResponsiveState(window.innerWidth);
    const [isMobile, setIsMobile] = useState(initialState.isMobile);
    const [isAutoCollapsed, setIsAutoCollapsed] = useState(initialState.isAutoCollapsed);
    const [isCollapsed, setIsCollapsed] = useState(initialState.isAutoCollapsed);

    // Handle window resize for responsive behavior
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const state = getResponsiveState(width);

            const wasMobile = isMobile;

            setIsMobile(state.isMobile);
            setIsAutoCollapsed(state.isAutoCollapsed);

            // Auto-collapse for small screens (480-899px)
            if (state.isAutoCollapsed) {
                setIsCollapsed(true);
                setExpandedMenus(new Set());
            }

            // Auto-expand for full width screens (>= 900px) when coming from auto-collapsed
            if (state.isFullWidth && isAutoCollapsed) {
                setIsCollapsed(false);
            }

            // Close sidebar when entering mobile view
            if (state.isMobile && !wasMobile) {
                setIsOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobile, isAutoCollapsed, setIsOpen]);

    // Auto-expand parent menu based on current path
    useEffect(() => {
        const allMenuItems = [...menuItems, ...settingsMenuItems];
        allMenuItems.forEach(item => {
            if (item.subItems) {
                const hasActiveChild = item.subItems.some(sub => sub.path === currentPath);
                if (hasActiveChild) {
                    setExpandedMenus(prev => new Set(prev).add(item.id));
                    // Also switch to the correct sidebar tab
                    if (settingsMenuItems.some(s => s.id === item.id)) {
                        setSidebarTab('settings');
                    } else {
                        setSidebarTab('main');
                    }
                }
            }
        });
    }, [currentPath]);

    const menuItems = [
        {
            id: 'home',
            label: 'Home',
            icon: LayoutDashboard,
            description: 'System overview',
            path: ROUTES.HOME
        },
        {
            id: 'realms',
            label: 'Realms',
            icon: Globe,
            description: 'Interactive map view',
            hasSubMenu: true,
            subItems: [
                {
                    id: 'realms-all',
                    label: 'All Realms',
                    description: 'View all realms',
                    path: ROUTES.REALMS_ALL
                },
                {
                    id: 'realms-active',
                    label: 'Active Realms',
                    description: 'View active realms',
                    path: ROUTES.REALMS_ACTIVE
                },
                {
                    id: 'realms-inactive',
                    label: 'Inactive Realms',
                    description: 'View inactive realms',
                    path: ROUTES.REALMS_INACTIVE
                }
            ]
        },
        {
            id: 'users',
            label: 'Users',
            icon: Users,
            description: 'Manage and track users',
            hasSubMenu: true,
            subItems: [
                {
                    id: 'users-all',
                    label: 'All Users',
                    description: 'View all users',
                    path: ROUTES.USERS_ALL
                },
                {
                    id: 'users-active',
                    label: 'Active Users',
                    description: 'View active users',
                    path: ROUTES.USERS_ACTIVE
                },
                {
                    id: 'users-inactive',
                    label: 'Inactive Users',
                    description: 'View inactive users',
                    path: ROUTES.USERS_INACTIVE
                }
            ]
        },
    ];

    // Settings menu items
    const settingsMenuItems = [
        {
            id: 'administration',
            label: 'Administration',
            icon: Settings,
            description: 'System administration',
            hasSubMenu: true,
            subItems: [
                {
                    id: 'MFA-settings',
                    label: 'MFA Settings',
                    description: 'Manage MFA settings',
                    path: ROUTES.MFA_SETTINGS,
                },
            ]
        },
    ];

    const handleMenuClick = (itemId: string, itemPath?: string) => {
        // Search in both main menu and settings menu
        const menuItem = menuItems.find(item => item.id === itemId) ||
            settingsMenuItems.find(item => item.id === itemId);

        if (menuItem?.hasSubMenu) {
            // If collapsed, expand sidebar first
            if (isCollapsed) {
                setIsCollapsed(false);
                const newExpanded = new Set(expandedMenus);
                newExpanded.add(itemId);
                setExpandedMenus(newExpanded);
                return;
            }

            const newExpanded = new Set(expandedMenus);
            if (newExpanded.has(itemId)) {
                newExpanded.delete(itemId);
            } else {
                newExpanded.add(itemId);
            }
            setExpandedMenus(newExpanded);
            return;
        }

        // Navigate to path if available
        if (itemPath) {
            navigate(itemPath);
        }

        if (isMobile) {
            setIsOpen(false);
        }
    };

    const handleSubMenuClick = (parentId: string, subPath: string) => {
        navigate(subPath);

        const newExpanded = new Set(expandedMenus);
        newExpanded.add(parentId);
        setExpandedMenus(newExpanded);

        if (isMobile) {
            setIsOpen(false);
        }
    };

    const isSubItemActive = (subPath: string): boolean => {
        return currentPath === subPath;
    };
    const isParentActive = (parentPath?: string, subItems?: any[]): boolean => {
        if (parentPath && currentPath === parentPath) return true;
        if (!subItems) return false;
        return subItems.some(sub => currentPath === sub.path);
    };

    // Filter menu items based on search
    const filteredMenuItems = menuItems.filter(item => {
        if (!searchValue.trim()) return true;
        const search = searchValue.toLowerCase();
        const matchesLabel = item.label.toLowerCase().includes(search);
        const matchesDescription = item.description.toLowerCase().includes(search);
        const matchesSubItems = item.subItems?.some(
            sub => sub.label.toLowerCase().includes(search) || sub.description.toLowerCase().includes(search)
        );
        return matchesLabel || matchesDescription || matchesSubItems;
    });

    const handleProfileMenuAction = (action: 'settings' | 'logout') => {
        setShowProfileMenu(false);
        if (action === 'settings') {
            console.log('Opening settings...');
        } else if (action === 'logout') {
            console.log('Logging out...');
        }
    };

    const toggleCollapse = () => {
        // Don't allow expanding if in the auto-collapsed breakpoint (480-899px)
        if (isAutoCollapsed && isCollapsed) {
            return; // Prevent expansion in this range
        }

        setIsCollapsed(!isCollapsed);
        if (!isCollapsed) {
            // When collapsing, close all expanded menus
            setExpandedMenus(new Set());
        }
    };

    // Sidebar width based on collapsed state
    const sidebarWidth = isCollapsed ? '70px' : '256px';

    // Update CSS variable when collapsed state changes
    useEffect(() => {
        // On mobile, sidebar overlays content, so width should be 0
        if (isMobile) {
            document.documentElement.style.setProperty('--sidebar-width', '0px');
        } else {
            document.documentElement.style.setProperty(
                '--sidebar-width',
                isCollapsed ? '70px' : '16rem'
            );
        }
    }, [isCollapsed, isMobile]);

    // Custom scrollbar styles
    const scrollbarStyles = `
    .sidebar-nav-scrollable::-webkit-scrollbar {
      width: 6px;
    }
    .sidebar-nav-scrollable::-webkit-scrollbar-track {
      background: transparent;
    }
    .sidebar-nav-scrollable::-webkit-scrollbar-thumb {
      background-color: #d1d5db;
      border-radius: 3px;
    }
    .sidebar-nav-scrollable::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af;
    }
  `;

    return (
        <>
            {/* Inject scrollbar styles */}
            <style>{scrollbarStyles}</style>

            {/* Mobile overlay */}
            {isMobile && isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 40
                    }}
                />
            )}

            {/* Sidebar */}
            <div
                className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
                style={{
                    width: isMobile ? '256px' : sidebarWidth,
                    minWidth: isMobile ? '256px' : sidebarWidth,
                    transition: 'width 0.3s ease-in-out, min-width 0.3s ease-in-out, transform 0.3s ease-in-out',
                    transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
                    position: 'fixed',
                    zIndex: 50,
                    height: '100vh',
                    left: 0,
                    top: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: FONT_FAMILY,
                }}
            >
                {/* Sidebar Header */}
                <div className="sidebar-header" style={{
                    padding: '1rem',
                    justifyContent: 'flex-start',
                    overflow: 'hidden',
                    flexShrink: 0
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        overflow: 'hidden',
                        alignItems: isCollapsed ? 'center' : 'flex-start',
                        transition: 'align-items 0.3s ease-in-out',
                        minWidth: 0
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            alignItems: isCollapsed ? 'center' : 'flex-start',
                            width: isCollapsed ? 'auto' : '100%',
                            transition: 'all 0.3s ease-in-out'
                        }}>
                            {/* Logo row - icon then text, following dimension guide from reference
                  X = cap-height of text (approx fontSize for uppercase)
                  Icon height = 1.05X
                  Gap between icon and text = Y (consistent spacing)
              */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem', /* Reduced gap to prevent text cutoff */
                                justifyContent: isCollapsed ? 'center' : 'flex-start',
                                transition: 'justify-content 0.3s ease-in-out'
                            }}>
                                {/* Diamond icon - height is 1.05X where X is text cap-height
                    Text fontSize = 1.5rem, so icon = 1.5 * 1.05 ≈ 1.575rem */}
                                <img
                                    src={CertisDiamondIcon}
                                    alt="Certis"
                                    style={{
                                        height: '2.1rem', /* Adjusted to maintain proportion */
                                        width: 'auto',
                                        objectFit: 'contain',
                                        flexShrink: 0,
                                        transition: 'transform 0.3s ease-in-out'
                                    }}
                                />
                                {/* Text - Lato Regular font with gradient */}
                                <span style={{
                                    fontSize: '1.5rem', /* Slightly reduced for better fit */
                                    fontFamily: LOGO_FONT_FAMILY,
                                    fontWeight: 400, /* Regular weight for Lato */
                                    background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #ffffff 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    letterSpacing: '0.08em', /* Slightly increased for MOZART style */
                                    whiteSpace: 'nowrap',
                                    opacity: isCollapsed ? 0 : 1,
                                    maxWidth: isCollapsed ? 0 : '180px',
                                    overflow: 'hidden',
                                    transition: 'opacity 0.2s ease-in-out, max-width 0.3s ease-in-out',
                                    pointerEvents: isCollapsed ? 'none' : 'auto',
                                    lineHeight: 1 /* Ensure consistent cap-height alignment */
                                }}>
                                    CES CASPER
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Mobile close button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            display: isMobile ? 'flex' : 'none',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.375rem',
                            borderRadius: '0.375rem',
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            flexShrink: 0,
                            opacity: isCollapsed ? 0 : 1,
                            position: isCollapsed ? 'absolute' : 'relative',
                            pointerEvents: isCollapsed ? 'none' : 'auto',
                            transition: 'opacity 0.2s ease-in-out',
                            fontFamily: 'inherit',
                        }}
                    >
                        <X style={{ height: '1.25rem', width: '1.25rem' }} />
                    </button>
                </div>

                {/* Search/Filter Input */}
                <div style={{ flexShrink: 0 }}>
                    {!isCollapsed ? (
                        <div style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                flex: 1,
                                position: 'relative'
                            }}>
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem 2rem 0.5rem 0.75rem',
                                        fontSize: '0.8rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        backgroundColor: '#ffffff',
                                        color: '#000000',
                                        outline: 'none',
                                        transition: 'border-color 0.2s, box-shadow 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#3b82f6';
                                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = '#d1d5db';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                                {searchValue && (
                                    <button
                                        onClick={() => setSearchValue('')}
                                        style={{
                                            position: 'absolute',
                                            right: '0.5rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            padding: '0.125rem',
                                            borderRadius: '50%',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: '#000000',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'color 0.2s',
                                            fontFamily: 'inherit',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#000000'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                                    >
                                        <X style={{ height: '0.875rem', width: '0.875rem' }} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Collapsed: Show only search icon
                        <div style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={() => setIsCollapsed(false)}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #d1d5db',
                                    color: '#000000',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background-color 0.2s',
                                    fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                title="Search"
                            >
                                <Search style={{ height: '1rem', width: '1rem' }} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation Menu - SCROLLABLE */}
                <div
                    className="sidebar-nav sidebar-nav-scrollable"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        position: 'relative',
                        paddingBottom: '0.5rem'
                    }}
                >
                    {/* Main Navigation Content */}
                    <div style={{
                        transform: sidebarTab === 'main' ? 'translateX(0)' : 'translateX(-100%)',
                        opacity: sidebarTab === 'main' ? 1 : 0,
                        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
                        position: sidebarTab === 'main' ? 'relative' : 'absolute',
                        width: '100%',
                        top: 0,
                        left: 0
                    }}>
                        {filteredMenuItems.length === 0 ? (
                            <div style={{
                                padding: '2rem 1rem',
                                textAlign: 'center',
                                color: '#000000',
                            }}>
                                <p style={{ fontSize: '0.875rem' }}>No results found</p>
                                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
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
                                    <div key={item.id} style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => handleMenuClick(item.id, item.path)}
                                            onMouseEnter={() => setHoveredItem(item.id)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                                            style={{
                                                width: '100%',
                                                justifyContent: isCollapsed ? 'center' : 'flex-start',
                                                padding: isCollapsed ? '0.75rem' : '0.75rem 1rem',
                                                color: '#000000',
                                                fontFamily: 'inherit',
                                            }}
                                            title={isCollapsed ? item.label : undefined}
                                        >
                                            <Icon style={{
                                                height: '1.25rem',
                                                width: '1.25rem',
                                                marginRight: isCollapsed ? 0 : '0.75rem',
                                                flexShrink: 0,
                                                color: '#000000'
                                            }} />
                                            {!isCollapsed && (
                                                <>
                                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                                        <div style={{ fontWeight: 600, color: '#000000' }}>{item.label}</div>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 400, color: '#000000' }}>
                                                            {item.description}
                                                        </div>
                                                    </div>
                                                    {item.hasSubMenu && (
                                                        <div style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center', color: '#000000' }}>
                                                            {isExpanded ? (
                                                                <ChevronDown style={{ height: '1rem', width: '1rem' }} />
                                                            ) : (
                                                                <ChevronRight style={{ height: '1rem', width: '1rem' }} />
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </button>

                                        {/* Tooltip for collapsed state */}
                                        {isCollapsed && isHovered && (
                                            <div style={{
                                                position: 'absolute',
                                                left: '100%',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                marginLeft: '0.5rem',
                                                padding: '0.5rem 0.75rem',
                                                backgroundColor: '#1f2937',
                                                color: 'white',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.8rem',
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap',
                                                zIndex: 100,
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                            }}>
                                                {item.label}
                                                {item.hasSubMenu && (
                                                    <span style={{ opacity: 0.7, marginLeft: '0.25rem' }}>▸</span>
                                                )}
                                                {/* Tooltip arrow */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: '-4px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    width: 0,
                                                    height: 0,
                                                    borderTop: '4px solid transparent',
                                                    borderBottom: '4px solid transparent',
                                                    borderRight: '4px solid #1f2937'
                                                }} />
                                            </div>
                                        )}

                                        {/* Submenu - only show when expanded and not collapsed */}
                                        {!isCollapsed && item.hasSubMenu && item.subItems && isExpanded && (
                                            <div style={{
                                                marginLeft: '1rem',
                                                marginTop: '0.25rem',
                                                marginBottom: '0.5rem',
                                                paddingLeft: '1rem',
                                                borderLeft: '2px solid #e5e7eb'
                                            }}>
                                                {item.subItems.map((subItem, index) => (
                                                    <React.Fragment key={subItem.id}>
                                                        {index > 0 && (
                                                            <div style={{
                                                                height: '1px',
                                                                backgroundColor: '#f0f0f0',
                                                                margin: '0.25rem 0.75rem'
                                                            }} />
                                                        )}
                                                        <button
                                                            onClick={() => handleSubMenuClick(item.id, subItem.path)}
                                                            className={`sidebar-nav-item ${isSubItemActive(subItem.path) ? 'active' : ''}`}
                                                            style={{
                                                                width: '100%',
                                                                marginLeft: 0,
                                                                marginTop: index === 0 ? '0.25rem' : '0',
                                                                fontSize: '0.875rem',
                                                                padding: '0.5rem 0.75rem',
                                                                color: '#000000',
                                                                fontFamily: 'inherit',
                                                            }}
                                                        >
                                                            <div style={{ flex: 1, textAlign: 'left' }}>
                                                                <div style={{ fontWeight: 600, color: '#000000' }}>{subItem.label}</div>
                                                                <div style={{ fontSize: '0.7rem', fontWeight: 400, color: '#000000' }}>
                                                                    {subItem.description}
                                                                </div>
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

                    {/* Settings Content */}
                    <div style={{
                        transform: sidebarTab === 'settings' ? 'translateX(0)' : 'translateX(100%)',
                        opacity: sidebarTab === 'settings' ? 1 : 0,
                        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
                        position: sidebarTab === 'settings' ? 'relative' : 'absolute',
                        width: '100%',
                        top: 0,
                        left: 0
                    }}>
                        {settingsMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = isParentActive(undefined, item.subItems);
                            const isExpanded = expandedMenus.has(item.id);
                            const isHovered = hoveredItem === item.id;
                            return (
                                <div key={item.id} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => handleMenuClick(item.id)}
                                        onMouseEnter={() => setHoveredItem(item.id)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                                        style={{
                                            width: '100%',
                                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                                            padding: isCollapsed ? '0.75rem' : '0.75rem 1rem',
                                            color: '#000000',
                                            fontFamily: 'inherit',
                                        }}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon style={{
                                            height: '1.25rem',
                                            width: '1.25rem',
                                            marginRight: isCollapsed ? 0 : '0.75rem',
                                            flexShrink: 0,
                                            color: '#000000'
                                        }} />
                                        {!isCollapsed && (
                                            <>
                                                <div style={{ flex: 1, textAlign: 'left' }}>
                                                    <div style={{ fontWeight: 600, color: '#000000' }}>{item.label}</div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 400, color: '#000000' }}>
                                                        {item.description}
                                                    </div>
                                                </div>
                                                {item.hasSubMenu && (
                                                    <div style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center', color: '#000000' }}>
                                                        {isExpanded ? (
                                                            <ChevronDown style={{ height: '1rem', width: '1rem' }} />
                                                        ) : (
                                                            <ChevronRight style={{ height: '1rem', width: '1rem' }} />
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </button>

                                    {/* Tooltip for collapsed state */}
                                    {isCollapsed && isHovered && (
                                        <div style={{
                                            position: 'absolute',
                                            left: '100%',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            marginLeft: '0.5rem',
                                            padding: '0.5rem 0.75rem',
                                            backgroundColor: '#1f2937',
                                            color: 'white',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            zIndex: 100,
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        }}>
                                            {item.label}
                                            {item.hasSubMenu && (
                                                <span style={{ opacity: 0.7, marginLeft: '0.25rem' }}>▸</span>
                                            )}
                                            <div style={{
                                                position: 'absolute',
                                                left: '-4px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: 0,
                                                height: 0,
                                                borderTop: '4px solid transparent',
                                                borderBottom: '4px solid transparent',
                                                borderRight: '4px solid #1f2937'
                                            }} />
                                        </div>
                                    )}

                                    {/* Submenu */}
                                    {!isCollapsed && item.hasSubMenu && item.subItems && isExpanded && (
                                        <div style={{
                                            marginLeft: '1rem',
                                            marginTop: '0.25rem',
                                            marginBottom: '0.5rem',
                                            paddingLeft: '1rem',
                                            borderLeft: '2px solid #e5e7eb'
                                        }}>
                                            {item.subItems.map((subItem, index) => (
                                                <React.Fragment key={subItem.id}>
                                                    {index > 0 && (
                                                        <div style={{
                                                            height: '1px',
                                                            backgroundColor: '#f0f0f0',
                                                            margin: '0.25rem 0.75rem'
                                                        }} />
                                                    )}
                                                    <button
                                                        onClick={() => handleSubMenuClick(item.id, subItem.path)}
                                                        className={`sidebar-nav-item ${isSubItemActive(subItem.path) ? 'active' : ''}`}
                                                        style={{
                                                            width: '100%',
                                                            marginLeft: 0,
                                                            marginTop: index === 0 ? '0.25rem' : '0',
                                                            fontSize: '0.875rem',
                                                            padding: '0.5rem 0.75rem',
                                                            color: '#000000',
                                                            fontFamily: 'inherit',
                                                        }}
                                                    >
                                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                                            <div style={{ fontWeight: 600, color: '#000000' }}>{subItem.label}</div>
                                                            <div style={{ fontSize: '0.7rem', fontWeight: 400, color: '#000000' }}>
                                                                {subItem.description}
                                                            </div>
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

                {/* Bottom Section: Collapse Toggle + Tabs + User Profile */}
                <div style={{
                    flexShrink: 0,
                    background: 'white',
                    borderTop: '1px solid #e5e7eb'
                }}>
                    {/* Collapse Toggle Button - hide in auto-collapsed range */}
                    {!isAutoCollapsed && (
                        <div style={{
                            padding: '0.5rem',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: isCollapsed ? 'center' : 'flex-end'
                        }}>
                            <button
                                onClick={toggleCollapse}
                                style={{
                                    padding: '0.375rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #e5e7eb',
                                    color: '#000000',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    fontFamily: 'inherit',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                    e.currentTarget.style.color = '#000000';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#000000';
                                }}
                                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                                {isCollapsed ? (
                                    <ChevronRight style={{ height: '1rem', width: '1rem' }} />
                                ) : (
                                    <ChevronLeft style={{ height: '1rem', width: '1rem' }} />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Main / Settings Tabs */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #e5e7eb'
                    }}>
                        <button
                            onClick={() => setSidebarTab('main')}
                            style={{
                                flex: 1,
                                padding: isCollapsed ? '0.5rem' : '0.625rem 0.5rem',
                                fontSize: '0.8rem',
                                fontWeight: sidebarTab === 'main' ? 600 : 400,
                                color: sidebarTab === 'main' ? '#002855' : '#000000',
                                backgroundColor: sidebarTab === 'main' ? '#f8fafc' : 'transparent',
                                border: 'none',
                                borderBottom: sidebarTab === 'main' ? '2px solid #002855' : '2px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                fontFamily: 'inherit',
                            }}
                            title={isCollapsed ? 'Main' : undefined}
                        >
                            {isCollapsed ? (
                                <Menu style={{ height: '1rem', width: '1rem' }} />
                            ) : (
                                'Main'
                            )}
                        </button>
                        <button
                            onClick={() => setSidebarTab('settings')}
                            style={{
                                flex: 1,
                                padding: isCollapsed ? '0.5rem' : '0.625rem 0.5rem',
                                fontSize: '0.8rem',
                                fontWeight: sidebarTab === 'settings' ? 600 : 400,
                                color: sidebarTab === 'settings' ? '#002855' : '#000000',
                                backgroundColor: sidebarTab === 'settings' ? '#f8fafc' : 'transparent',
                                border: 'none',
                                borderBottom: sidebarTab === 'settings' ? '2px solid #002855' : '2px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'inherit',
                            }}
                            title={isCollapsed ? 'Settings' : undefined}
                        >
                            {isCollapsed ? (
                                <Settings style={{ height: '1rem', width: '1rem' }} />
                            ) : (
                                'Settings'
                            )}
                        </button>
                    </div>

                    {/* User Profile Section */}
                    <div style={{
                        padding: isCollapsed ? '0.75rem 0.5rem' : '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'space-between'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            flex: isCollapsed ? 'none' : 1,
                            justifyContent: isCollapsed ? 'center' : 'flex-start'
                        }}>
                            <div style={{
                                width: '2.25rem',
                                height: '2.25rem',
                                backgroundColor: '#3b82f6',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: isCollapsed ? 'pointer' : 'default',
                            }}
                                onClick={() => isCollapsed && setShowProfileMenu(!showProfileMenu)}
                                title={isCollapsed ? 'Admin User' : undefined}
                            >
                                AD
                            </div>
                            {!isCollapsed && (
                                <div style={{ marginLeft: '0.75rem', flex: 1 }}>
                                    <p style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        color: '#000000',
                                        margin: 0,
                                    }}>
                                        Admin User
                                    </p>
                                    <p style={{
                                        fontSize: '0.7rem',
                                        color: '#000000',
                                        margin: 0,
                                    }}>
                                        admin@bos.sg
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Kebab Menu - only show when not collapsed */}
                        {!isCollapsed && (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    style={{
                                        padding: '0.375rem',
                                        borderRadius: '0.375rem',
                                        backgroundColor: showProfileMenu ? '#f3f4f6' : 'transparent',
                                        border: 'none',
                                        color: '#000000',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background-color 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                    onMouseLeave={(e) => {
                                        if (!showProfileMenu) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    <MoreVertical style={{ height: '1.25rem', width: '1.25rem' }} />
                                </button>

                                {/* Dropdown Menu */}
                                {showProfileMenu && (
                                    <>
                                        <div
                                            style={{
                                                position: 'fixed',
                                                inset: 0,
                                                zIndex: 40
                                            }}
                                            onClick={() => setShowProfileMenu(false)}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            right: 0,
                                            marginBottom: '0.5rem',
                                            width: '140px',
                                            backgroundColor: 'white',
                                            borderRadius: '0.5rem',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                            border: '1px solid #e5e7eb',
                                            zIndex: 50,
                                            overflow: 'hidden'
                                        }}>
                                            <button
                                                onClick={() => handleProfileMenuAction('settings')}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.625rem',
                                                    padding: '0.625rem 0.875rem',
                                                    fontSize: '0.8rem',
                                                    color: '#000000',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'background-color 0.2s',
                                                    fontFamily: 'inherit',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <User style={{ height: '1rem', width: '1rem' }} />
                                                Profile
                                            </button>
                                            <button
                                                onClick={() => handleProfileMenuAction('settings')}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.625rem',
                                                    padding: '0.625rem 0.875rem',
                                                    fontSize: '0.8rem',
                                                    color: '#000000',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'background-color 0.2s',
                                                    fontFamily: 'inherit',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <Settings style={{ height: '1rem', width: '1rem' }} />
                                                Settings
                                            </button>
                                            <div style={{ height: '1px', backgroundColor: '#e5e7eb' }} />
                                            <button
                                                onClick={() => handleProfileMenuAction('logout')}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.625rem',
                                                    padding: '0.625rem 0.875rem',
                                                    fontSize: '0.8rem',
                                                    color: '#dc2626',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'background-color 0.2s',
                                                    fontFamily: 'inherit',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <LogOut style={{ height: '1rem', width: '1rem' }} />
                                                Logout
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Dropdown Menu for collapsed state */}
                        {isCollapsed && showProfileMenu && (
                            <>
                                <div
                                    style={{
                                        position: 'fixed',
                                        inset: 0,
                                        zIndex: 40
                                    }}
                                    onClick={() => setShowProfileMenu(false)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    marginBottom: '0.5rem',
                                    width: '140px',
                                    backgroundColor: 'white',
                                    borderRadius: '0.5rem',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                    border: '1px solid #e5e7eb',
                                    zIndex: 50,
                                    overflow: 'hidden'
                                }}>
                                    <button
                                        onClick={() => handleProfileMenuAction('settings')}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.625rem',
                                            padding: '0.625rem 0.875rem',
                                            fontSize: '0.8rem',
                                            color: '#000000',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background-color 0.2s',
                                            fontFamily: 'inherit',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <User style={{ height: '1rem', width: '1rem' }} />
                                        Profile
                                    </button>
                                    <button
                                        onClick={() => handleProfileMenuAction('settings')}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.625rem',
                                            padding: '0.625rem 0.875rem',
                                            fontSize: '0.8rem',
                                            color: '#000000',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background-color 0.2s',
                                            fontFamily: 'inherit',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Settings style={{ height: '1rem', width: '1rem' }} />
                                        Settings
                                    </button>
                                    <div style={{ height: '1px', backgroundColor: '#e5e7eb' }} />
                                    <button
                                        onClick={() => handleProfileMenuAction('logout')}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.625rem',
                                            padding: '0.625rem 0.875rem',
                                            fontSize: '0.8rem',
                                            color: '#dc2626',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background-color 0.2s',
                                            fontFamily: 'inherit',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <LogOut style={{ height: '1rem', width: '1rem' }} />
                                        Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;



