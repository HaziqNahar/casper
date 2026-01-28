import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header, { BreadcrumbItem } from './Header';
import { getRouteConfig } from '../../config/routes';

// ==========================================
// GLOBAL FONT FAMILY
// ==========================================
const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

// ==========================================
// DASHBOARD LAYOUT COMPONENT
// ==========================================

const DashboardLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const location = useLocation();

    // Get route config based on current path
    const routeConfig = getRouteConfig(location.pathname);

    // Convert route breadcrumbs to Header breadcrumb format
    const getBreadcrumbs = (): BreadcrumbItem[] => {
        return routeConfig.breadcrumbs.map(bc => ({
            label: bc.label,
            ...(bc.path && { path: bc.path }),
        }));
    };

    const handleSidebarToggle = (): void => {
        setSidebarOpen(true);
    };

    const handleSidebarClose = (open: boolean): void => {
        setSidebarOpen(open);
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            backgroundColor: '#f3f4f6',
            fontFamily: FONT_FAMILY
        }}>
            {/* Sidebar - now handles navigation internally */}
            <Sidebar
                isOpen={sidebarOpen}
                setIsOpen={handleSidebarClose}
            />

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                marginLeft: 'var(--sidebar-width, 16rem)',
                transition: 'margin-left 0.3s ease-in-out'
            }}>
                {/* Header - now handles breadcrumb navigation internally */}
                <Header
                    title={routeConfig.title}
                    breadcrumbs={getBreadcrumbs()}
                    onMenuClick={handleSidebarToggle}
                />

                {/* Page Content - Outlet renders the matched child route */}
                <main style={{
                    flex: 1,
                    padding: '1.5rem',
                    overflowY: 'auto',
                }}>
                    <div style={{ maxWidth: 'none', margin: 0, width: '100%' }}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;