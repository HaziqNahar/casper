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
    MANAGE_REALMS: '/realms/manage',
    CREATE_REALM: '/realms/new',

    APPS: '/apps',
    REGISTER_APPS: '/apps/register',
    MANAGE_APPS: '/apps/manage',

    USERS: '/users',
    CREATE_USER: '/users/create-user',
    MANAGE_USERS: '/users/manage',

    MFA_SETTINGS: '/mfa-settings',
    AUDIT_LOGS: '/audit-logs',
    LOGIN: '/login',

    REALM_ACCESS_REQUEST: '/realms/access/request',
    REALM_ACCESS_APPROVE: '/realms/access/approve',
    REALM_ACCESS_VERIFY: '/realms/access/verify',
    REALM_ACCESS_AUDIT: '/realms/access/audit',

} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

// Route metadata for titles and breadcrumbs
export const ROUTE_CONFIG: Record<string, RouteConfig> = {
    [ROUTES.HOME]: {
        path: ROUTES.HOME,
        title: 'Home',
        breadcrumbs: [{ label: 'Home' }],
    },
    [ROUTES.LOGIN]: {
        path: ROUTES.LOGIN,
        title: 'Login',
        breadcrumbs: [{ label: 'Login' }],
    },
    [ROUTES.MANAGE_REALMS]: {
        path: ROUTES.MANAGE_REALMS,
        title: 'Manage Realms',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'All Realms' },
            { label: 'Manage Realm', path: ROUTES.MANAGE_REALMS },
        ],
    },
    [ROUTES.REALMS]: {
        path: ROUTES.REALMS,
        title: 'Realms',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'All Realms' },
            { label: 'Realm', path: ROUTES.REALMS },
        ],
    },
    [ROUTES.CREATE_REALM]: {
        path: ROUTES.CREATE_REALM,
        title: 'Create Realm',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Create Realm', path: ROUTES.CREATE_REALM },
        ],
    },
    [ROUTES.USERS]: {
        path: ROUTES.USERS,
        title: 'Users',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'All Users' },
            { label: 'Users', path: ROUTES.USERS },
        ],
    },
    [ROUTES.CREATE_USER]: {
        path: ROUTES.CREATE_USER,
        title: 'Create User',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Create User', path: ROUTES.CREATE_USER },
        ],
    },
    [ROUTES.REGISTER_APPS]: {
        path: ROUTES.REGISTER_APPS,
        title: 'Register Application',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Register Application', path: ROUTES.REGISTER_APPS },
        ],
    },
    [ROUTES.MANAGE_APPS]: {
        path: ROUTES.MANAGE_APPS,
        title: 'Manage Application',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'All Applications' },
            { label: 'Manage Application', path: ROUTES.MANAGE_APPS },
        ],
    },
    [ROUTES.APPS]: {
        path: ROUTES.APPS,
        title: 'All Applications',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'All Applications', path: ROUTES.APPS },
        ],
    },
    // MFA Settings
    [ROUTES.MFA_SETTINGS]: {
        path: ROUTES.MFA_SETTINGS,
        title: 'MFA Settings',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'MFA Settings', path: ROUTES.MFA_SETTINGS },
        ],
    },
    [ROUTES.AUDIT_LOGS]: {
        path: ROUTES.AUDIT_LOGS,
        title: 'Audit Logs',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Audit Logs', path: ROUTES.AUDIT_LOGS },
        ],
    },
    [ROUTES.REALM_ACCESS_REQUEST]: {
        path: ROUTES.REALM_ACCESS_REQUEST,
        title: 'Realm Access Request',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Realm Access Request', path: ROUTES.REALM_ACCESS_REQUEST },
        ],
    },
    [ROUTES.REALM_ACCESS_APPROVE]: {
        path: ROUTES.REALM_ACCESS_APPROVE,
        title: 'Realm Access Approve',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Realm Access Approve', path: ROUTES.REALM_ACCESS_APPROVE },
        ],
    },
    [ROUTES.REALM_ACCESS_VERIFY]: {
        path: ROUTES.REALM_ACCESS_VERIFY,
        title: 'Realm Access Verify',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Realm Access Verify', path: ROUTES.REALM_ACCESS_VERIFY },
        ],
    },
    [ROUTES.REALM_ACCESS_AUDIT]: {
        path: ROUTES.REALM_ACCESS_AUDIT,
        title: 'Realm Access Audit',
        breadcrumbs: [
            { label: 'Home', path: ROUTES.HOME },
            { label: 'Realm Access Audit', path: ROUTES.REALM_ACCESS_AUDIT },
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