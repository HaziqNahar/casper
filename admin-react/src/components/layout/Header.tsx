
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Menu,
    LayoutGrid,
    Clock,
    Calendar,
    ChevronRight
} from 'lucide-react';
import { ROUTES } from '../../config/routes';

// Global font family constant
const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

// Breadcrumb types - updated to use path instead of tab
export interface BreadcrumbItem {
    label: string;
    path?: string;
}

interface HeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    onMenuClick: () => void;
    onBreadcrumbClick?: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, breadcrumbs, onMenuClick }) => {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showQuickMenu, setShowQuickMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 480);
    const quickMenuRef = useRef<HTMLDivElement>(null);

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 480);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            //     setShowNotifications(false);
            // }
            if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
                setShowQuickMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // // Mock notifications data
    // const notifications: Notification[] = [
    //     {
    //         id: '1',
    //         type: 'info',
    //         title: 'New CCMS Case Received',
    //         message: 'Case #CC2024-0156 has been auto-dispatched to PW001.',
    //         time: '10 mins ago',
    //         read: false
    //     },
    //     {
    //         id: '2',
    //         type: 'alert',
    //         title: 'CCMS KPI Breach Alert',
    //         message: 'Case #CC2024-0148 exceeded SLA by 15 mins.',
    //         time: '17 mins ago',
    //         read: false
    //     },
    //     {
    //         id: '3',
    //         type: 'warning',
    //         title: 'Warden Status Update',
    //         message: 'PW003 has gone offline in Sector B.',
    //         time: '25 mins ago',
    //         read: true
    //     },
    //     {
    //         id: '4',
    //         type: 'info',
    //         title: 'URA Submission Complete',
    //         message: 'Batch #URA-2024-089 processed successfully.',
    //         time: '1 hour ago',
    //         read: true
    //     },
    //     {
    //         id: '5',
    //         type: 'alert',
    //         title: 'System Alert',
    //         message: 'Database backup completed with warnings.',
    //         time: '2 hours ago',
    //         read: true
    //     }
    // ];

    // // Filter notifications by tab
    // const getFilteredNotifications = () => {
    //     switch (activeNotificationTab) {
    //         case 'criticality':
    //             return notifications.filter(n => n.type === 'alert' || n.type === 'warning');
    //         case 'system':
    //             return notifications.filter(n => n.title.toLowerCase().includes('system') || n.title.toLowerCase().includes('database'));
    //         default:
    //             return notifications;
    //     }
    // };

    // const getNotificationIcon = (type: string) => {
    //     switch (type) {
    //         case 'alert':
    //             return <AlertCircle style={{ height: '1rem', width: '1rem', color: '#dc2626' }} />;
    //         case 'warning':
    //             return <AlertTriangle style={{ height: '1rem', width: '1rem', color: '#f59e0b' }} />;
    //         default:
    //             return <Info style={{ height: '1rem', width: '1rem', color: '#3b82f6' }} />;
    //     }
    // };

    // const unreadCount = notifications.filter(n => !n.read).length;

    // Format date and time
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-SG', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-SG', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    // // Mock weather data
    // const weather = {
    //     temp: '31',
    //     condition: 'Partly Cloudy'
    // };

    // Common widget style for consistent sizing - matches icon button styling
    const widgetStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.875rem',
        backgroundColor: '#f3f4f6',
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        color: '#000000',
        fontSize: '0.8rem',
        fontWeight: 500,
        height: '2.25rem',
    };

    // Common button style for consistent sizing
    const iconButtonStyle: React.CSSProperties = {
        padding: '0.5rem',
        borderRadius: '0.375rem',
        backgroundColor: '#f3f4f6',
        border: '1px solid #e5e7eb',
        color: '#000000',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        height: '2.25rem',
        width: '2.25rem',
        fontFamily: 'inherit',
    };
    // Handle breadcrumb click - navigate to path
    const handleBreadcrumbClick = (path: string) => {
        navigate(path);
    };

    // Handle quick menu navigation
    const handleQuickMenuClick = (path: string) => {
        setShowQuickMenu(false);
        navigate(path);
    };

    // Render breadcrumbs
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
                        color: '#000000',
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
                                        color: '#3b82f6',
                                        cursor: 'pointer',
                                        textDecoration: 'none',
                                        transition: 'color 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#1d4ed8'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
                                >
                                    {crumb.label}
                                </button>
                            ) : (
                                <span style={{
                                    fontWeight: isLast ? 600 : 500,
                                    color: '#000000',
                                }}>
                                    {crumb.label}
                                </span>
                            )}
                            {!isLast && (
                                <ChevronRight
                                    size={14}
                                    style={{
                                        margin: '0 0.375rem',
                                        color: '#000000',
                                        flexShrink: 0
                                    }}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>
        );
    };

    return (
        <header className="header" style={{ fontFamily: FONT_FAMILY }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                {/* Mobile menu button - only show below 480px */}
                <button
                    onClick={onMenuClick}
                    style={{
                        display: isMobile ? 'flex' : 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        marginRight: '0.75rem',
                        borderRadius: '0.375rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#000000',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    <Menu style={{ height: '1.5rem', width: '1.5rem' }} />
                </button>

                {/* Title Section */}
                <div style={{ flex: 1 }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#000000',
                        letterSpacing: '0.025em',
                        lineHeight: 1.2
                    }}>{title}</h2>
                    {renderBreadcrumbs()}
                </div>
            </div>

            {/* Header Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                {/* Date/Time Widget */}
                <div style={widgetStyle}>
                    <Calendar style={{ height: '0.9rem', width: '0.9rem', color: '#000000' }} />
                    <span>{formatDate(currentTime)}</span>
                    <div style={{
                        width: '1px',
                        height: '1rem',
                        backgroundColor: '#d1d5db',
                        margin: '0 0.125rem'
                    }} />
                    <Clock style={{ height: '0.9rem', width: '0.9rem', color: '#000000' }} />
                    <span style={{ fontFamily: "'Inter', monospace", minWidth: '60px' }}>{formatTime(currentTime)}</span>
                </div>
                {/* Quick Menu / Grid Button */}
                <div ref={quickMenuRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowQuickMenu(!showQuickMenu)}
                        style={{
                            ...iconButtonStyle,
                            backgroundColor: showQuickMenu ? '#002855' : '#f3f4f6',
                            color: showQuickMenu ? 'white' : '#000000'
                        }}
                        title="Quick Menu"
                    >
                        <LayoutGrid style={{ height: '1.125rem', width: '1.125rem' }} />
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
                                    { label: 'Manage User', icon: '📝', path: ROUTES.MANAGE_USERS },
                                    { label: 'Manage Apps', icon: '🗺️', path: ROUTES.MANAGE_APPS },
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