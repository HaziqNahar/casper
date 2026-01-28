import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

// Import components
import Sidebar from '../layout/Sidebar';
import Header, { BreadcrumbItem } from '../layout/Header';
// GLOBAL FONT FAMILY
// ==========================================
const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif";

type TabType =
    // Main navigation
    | 'home'
    // Realms
    | 'realms' | 'realms-all' | 'realms-active' | 'realms-inactive'
    // Users
    | 'users' | 'users-all' | 'users-active' | 'users-inactive';

// ==========================================
// PLACEHOLDER COMPONENT
// ==========================================

interface PlaceholderPageProps {
    title: string;
    description?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => (
    <div style={{
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '1.5rem',
    }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#000000' }}>
            {title}
        </h2>
        <p style={{ color: '#000000', fontSize: '0.875rem' }}>
            {description || 'This page is under development.'}
        </p>
    </div>
);

// ==========================================
// DASHBOARD COMPONENT
// ==========================================

const Dashboard: React.FC = () => {
    // Tab State
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        const stored = localStorage.getItem('bos-active-tab');
        if (stored && isValidTab(stored)) {
            return stored;
        }
        return 'home';
    });

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

    // ==========================================
    // DATA FETCHING
    // ==========================================

    useEffect(() => {
        const fetchAllData = async () => {
            try {

                console.log("data");
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };

        fetchAllData();
    }, []);

    // ==========================================
    // RENDER CONTENT
    // ==========================================

    const renderContent = (): React.ReactElement => {
        switch (activeTab) {
            // ==========================================
            // HOME
            // ==========================================
            case 'home':
                return (
                    <div key={activeTab}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                        }}>
                            <div style={{
                                background: 'white',
                                borderRadius: '0.5rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                padding: '1.5rem',
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: '#000000' }}>
                                    Visualization and insights
                                </h3>
                            </div>
                        </div>
                    </div>
                );

            // ==========================================
            // Realms
            // ==========================================
            case 'realms':
            case 'realms-all':
                return <PlaceholderPage key={activeTab} title="All Realms" description="View and manage all realms across the system." />;
            case 'realms-active':
                return (
                    <div key={activeTab} style={{ height: 'calc(100vh - 180px)' }}>


                    </div>
                );
            case 'realms-inactive':
                return (
                    <div key={activeTab} style={{ height: 'calc(100vh - 180px)' }}>


                    </div>
                );
            case 'users':
            case 'users-all':
                return <PlaceholderPage key={activeTab} title="All Users" description="View and manage all users across the system." />;

            case 'users-active':
                return (
                    <div key={activeTab} style={{ height: 'calc(100vh - 180px)' }}>

                    </div>
                );
            case 'users-inactive':
                return (
                    <div key={activeTab} style={{ height: 'calc(100vh - 180px)' }}>

                    </div>
                );

            // ==========================================
            // DEFAULT
            // ==========================================
            default:
                return (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '16rem',
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <Users style={{
                                margin: '0 auto 0.75rem',
                                height: '3rem',
                                width: '3rem',
                                color: '#000000',
                            }} />
                            <h3 style={{
                                marginTop: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#000000',
                            }}>
                                No content selected
                            </h3>
                            <p style={{
                                marginTop: '0.25rem',
                                fontSize: '0.875rem',
                                color: '#000000',
                            }}>
                                Select a tab from the sidebar to view content
                            </p>
                        </div>
                    </div>
                );
        }
    };

    // ==========================================
    // TAB HELPERS
    // ==========================================

    const getTabTitle = (): string => {
        switch (activeTab) {
            // Main
            case 'home': return 'Home';
            case 'realms': return 'Realms';
            case 'realms-all': return 'All Realms';
            case 'realms-active': return 'Active Realms';
            case 'realms-inactive': return 'Inactive Realms';
            case 'users': return 'Users';
            case 'users-all': return 'All Users';
            case 'users-active': return 'Active Users';
            case 'users-inactive': return 'Inactive Users';
            default: return 'Dashboard';
        }
    };

    // ==========================================
    // BREADCRUMB GENERATION
    // ==========================================

    const getBreadcrumbs = (): BreadcrumbItem[] => {
        const home: BreadcrumbItem = { label: 'Home', tab: 'home' };

        switch (activeTab) {
            // Home - just show Home
            case 'home':
                return [{ label: 'Home' }];

            // Realms
            case 'realms':
                return [home, { label: 'Realms' }, { label: 'All Realms' }];
            case 'realms-all':
                return [home, { label: 'Realms' }, { label: 'All Realms' }];
            case 'realms-active':
                return [home, { label: 'Realms' }, { label: 'Active Realms' }];
            case 'realms-inactive':
                return [home, { label: 'Realms' }, { label: 'Inactive Realms' }];

            // User
            case 'users':
                return [home, { label: 'User' }, { label: 'All Users' }];
            case 'users-all':
                return [home, { label: 'User' }, { label: 'All Users' }];
            case 'users-active':
                return [home, { label: 'User' }, { label: 'Active Users' }];
            case 'users-inactive':
                return [home, { label: 'User' }, { label: 'Inactive Users' }];
        }
    };

    const handleTabChange = (tab: string): void => {
        if (isValidTab(tab)) {
            setActiveTab(tab);
            localStorage.setItem('bos-active-tab', tab);
        } else {
            console.warn(`Invalid tab: ${tab}`);
        }
    };

    const handleSidebarToggle = (): void => {
        setSidebarOpen(true);
    };

    const handleSidebarClose = (open: boolean): void => {
        setSidebarOpen(open);
    };

    const handleBreadcrumbClick = (tab: string): void => {
        handleTabChange(tab);
    };

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <>
            <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: FONT_FAMILY }}>
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={handleTabChange}
                    isOpen={sidebarOpen}
                    setIsOpen={handleSidebarClose}
                />

                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: 'var(--sidebar-width, 16rem)',
                    transition: 'margin-left 0.3s ease-in-out'
                }}>
                    <Header
                        title={getTabTitle()}
                        breadcrumbs={getBreadcrumbs()}
                        onMenuClick={handleSidebarToggle}
                        onBreadcrumbClick={handleBreadcrumbClick}
                    />

                    <main style={{
                        flex: 1,
                        padding: '1.5rem',
                        overflowY: 'auto',
                        // NO marginLeft here - the parent div handles it!
                    }}>
                        <div style={{ maxWidth: 'none', margin: 0, width: '100%' }}>
                            {renderContent()}
                        </div>
                    </main>
                </div>
            </div>

        </>
    );
};

// Type guard function
function isValidTab(tab: string): tab is TabType {
    const validTabs = [
        // Main
        'home',
        // Maps
        'realms', 'realms-all', 'realms-active', 'realms-inactive',
        // Cases
        'users', 'users-all', 'users-active', 'users-inactive',
    ];
    return validTabs.includes(tab);
}

export default Dashboard;