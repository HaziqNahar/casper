export type ApplicationType =
    | "web"
    | "mobile"
    | "spa"
    | "backend"
    | "m2m";

export type AuthProtocol = "oidc" | "saml";

export type ClientType = "public" | "confidential";

export type EnvironmentType = "dev" | "staging" | "prod";

export type CriticalityLevel = "low" | "medium" | "high" | "critical";

export interface RegisterApplicationForm {
    basics: {
        name: string;
        description: string;
        realmId: string;
        applicationType: ApplicationType;
        ownerTeam: string;
        ownerEmail: string;
        environment: EnvironmentType;
        criticality: CriticalityLevel;
        internetFacing: boolean;
    };
    auth: {
        protocol: AuthProtocol;
        clientId: string;
        clientType: ClientType;
        clientSecret: string;
        grantTypes: string[];
        redirectUris: string[];
        postLogoutRedirectUris: string[];
        webOrigins: string[];
        baseUrl: string;
        adminUrl: string;
    };
    security: {
        requirePkce: boolean;
        requireMfa: boolean;
        allowRefreshToken: boolean;
        allowWildcardRedirects: boolean;
        accessTokenMinutes: number;
        refreshTokenHours: number;
        sessionTimeoutMinutes: number;
        allowedRoles: string[];
        allowedUserTypes: string[];
        allowedRealms: string[];
        scopesDefault: string[];
        scopesOptional: string[];
        customScopes: string[];
    };
}

export type RegistrationStep = 1 | 2 | 3 | 4;