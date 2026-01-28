// ==========================================
// ROUTE CONFIGURATION
// ==========================================

export interface RouteConfig {
    path: string;
    title: string;
    breadcrumbs: BreadcrumbConfig[];
}

export interface BreadcrumbConfig {
    label: string;
    path?: string;
}

// Route paths as constants for type safety
export const ROUTES = {
    // Main
    HOME: '/',
    REALMS: '/realms',
    REALMS_ACTIVE: '/realms/active',
    REALMS_INACTIVE: '/realms/inactive',
    REALMS_ALL: '/realms/all',
    CREATE_REALMS: '/realms/create',
    MANAGE_REALMS: '/realms/manage',

    APPS: '/apps',
    APPS_ACTIVE: '/apps/active',
    APPS_INACTIVE: '/apps/inactive',
    APPS_ALL: '/apps/all',
    CREATE_APPS: '/apps/create',
    MANAGE_APPS: '/apps/manage',

    USERS: '/users',
    USERS_ACTIVE: '/users/active',
    USERS_INACTIVE: '/users/inactive',
    USERS_ALL: '/users/all',
    CREATE_USERS: '/users/create',
    MANAGE_USERS: '/users/manage',

    MFA_SETTINGS: '/mfa-settings',
    AUDIT_LOGS: '/audit-logs',

} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

// Route metadata for titles and breadcrumbs
export const ROUTE_CONFIG: Record<string, RouteConfig> = {
    // Home
    [ROUTES.HOME]: {
        path: ROUTES.HOME,
        title: 'Home',
        breadcrumbs: [{ label: 'Home' }],
    },

    // Realms
    [ROUTES.REALMS]: {
        path: ROUTES.REALMS,
        title: 'Realms',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Realms' },
            { label: 'Realms' },
        ],
    },
    [ROUTES.REALMS_ACTIVE]: {
        path: ROUTES.REALMS_ACTIVE,
        title: 'Active Realms',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Realms' },
            { label: 'Active Realms' },
        ],
    },
    [ROUTES.REALMS_INACTIVE]: {
        path: ROUTES.REALMS_INACTIVE,
        title: 'Inactive Realms',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Realms' },
            { label: 'Inactive Realms' },
        ],
    },
    [ROUTES.REALMS_ALL]: {
        path: ROUTES.REALMS_ALL,
        title: 'All Realms',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Realms' },
            { label: 'All Realms' },
        ],
    },

    // Users
    [ROUTES.USERS]: {
        path: ROUTES.USERS,
        title: 'Users',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Users' },
            { label: 'All Users' },
        ],
    },
    [ROUTES.USERS_ACTIVE]: {
        path: ROUTES.USERS_ACTIVE,
        title: 'Active Users',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Users' },
            { label: 'Active Users' },
        ],
    },
    [ROUTES.USERS_INACTIVE]: {
        path: ROUTES.USERS_INACTIVE,
        title: 'Inactive Users',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Users' },
            { label: 'Inactive Users' },
        ],
    },
    [ROUTES.USERS_ALL]: {
        path: ROUTES.USERS_ALL,
        title: 'All Users',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Users' },
            { label: 'All Users' },
        ],
    },

    // MFA Settings
    [ROUTES.MFA_SETTINGS]: {
        path: ROUTES.MFA_SETTINGS,
        title: 'MFA Settings',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'MFA Settings' },
        ],
    },
};

// Helper function to get route config
export const getRouteConfig = (path: string): RouteConfig => {
    return ROUTE_CONFIG[path] || {
        path,
        title: 'Dashboard',
        breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Dashboard' }],
    };
};