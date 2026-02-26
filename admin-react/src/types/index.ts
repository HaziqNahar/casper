// src/types/index.ts
export type TableData = Record<string, unknown>;

export type RealmStatus = "Active" | "Inactive" | "Draft";
export type UserStatus = "Active" | "Inactive" | "Pending";

export interface UserRow extends TableData {
    uuid: string;
    id: number;
    staffId?: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    status: UserStatus;
    isDeleted: boolean;
    lastLogin?: string;
}

export interface RealmRow extends TableData {
    id: string;
    name: string;
    status: RealmStatus;
    createdAt: string;
    updatedAt?: string;
    userCount: number;
    mfaRequired?: boolean;
    passwordInheritance?: "inherit" | "override";
    sessionTimeoutMins?: number;
}

export interface AppRow extends TableData {
    id: string;
    name: string;
    clientId: string;
    protocol: "oidc" | "saml";
    enabled: boolean;

    publicClient: boolean;
    serviceAccountsEnabled: boolean;
    standardFlowEnabled: boolean;
    directAccessGrantsEnabled: boolean;
    implicitFlowEnabled: boolean;

    rootUrl?: string;
    baseUrl?: string;
    adminUrl?: string;

    redirectUris: string[];
    webOrigins: string[];

    clientSecretMasked?: string;
    clientScopes: string[];
    realmRoles: string[];
    protocolMappers: Array<{ name: string; protocol: string; mapperType: string }>;
}

// Keep legacy names for DataContext
export type Users = UserRow;
export type Realms = RealmRow;
export type Apps = AppRow;