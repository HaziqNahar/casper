import React, { useState, useEffect } from 'react';
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

    // Track sidebar width from CSS variable
    const [sidebarWidth, setSidebarWidth] = useState('256px');

    // Listen to CSS variable changes
    useEffect(() => {
        const updateSidebarWidth = () => {
            const width = getComputedStyle(document.documentElement)
                .getPropertyValue('--sidebar-width')
                .trim();
            setSidebarWidth(width || '256px');
        };

        // Initial update
        updateSidebarWidth();

        // Create observer for CSS variable changes
        const observer = new MutationObserver(updateSidebarWidth);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style']
        });

        return () => observer.disconnect();
    }, []);

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
        <div
            className="app-shell"
            style={{
                display: "flex",
                height: "100vh",
                backgroundColor: "transparent", // IMPORTANT
                fontFamily: FONT_FAMILY,
            }}
        >
            <Sidebar isOpen={sidebarOpen} setIsOpen={handleSidebarClose} />

            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: 'var(--sidebar-width, 16rem)',
                    transition: 'margin-left 0.3s ease-in-out',
                }}
            >
                <Header
                    title={routeConfig.title}
                    breadcrumbs={getBreadcrumbs()}
                    onMenuClick={handleSidebarToggle}
                />

                <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
                    <div style={{ maxWidth: 'none', margin: 0, width: '100%' }}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;