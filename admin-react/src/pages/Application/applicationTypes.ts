export type AppStatus = "Enabled" | "Disabled";
export type AppAuthMethod = "oidc" | "saml";

export interface ApplicationRow {
    id: string;
    name: string;
    clientId: string;
    authMethod: AppAuthMethod;
    status: AppStatus;
    publicClient: boolean;
    redirectUris: string[];
    postLogoutRedirectUris?: string[];
    webOrigins: string[];
    rootUrl?: string;
    baseUrl?: string;
    adminUrl?: string;
    ownerRealm?: string;
    linkedRealmCount?: number;
    accessUserCount?: number;
    updatedAt?: string;
    description?: string;
    clientSecretMasked?: string;
    clientSecretStorage?: string;
    clientSecretSecretName?: string;
    clientSecretRotatedAtUtc?: string;
    previousClientSecretExpiresAtUtc?: string;
}