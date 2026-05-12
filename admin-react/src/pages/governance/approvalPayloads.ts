export type RealmDeactivationApprovalPayload = {
    status: "Inactive";
    realmName: string;
    userCount: number;
    pendingAccessRequests: number;
    impactSummary: string;
};

export type AppDeactivationApprovalPayload = {
    status: "Disabled";
    appName: string;
    ownerRealm: string | null;
    linkedRealmCount: number;
    accessUserCount: number;
    redirectUriCount: number;
    postLogoutRedirectUriCount: number;
    impactSummary: string;
};

export type AppAccessGrantApprovalPayload = {
    requestedStatus: "Granted";
    realmId: string;
    realmName: string;
    appId: string;
    appName: string;
    userId: string;
    username: string;
    displayName: string;
    impactSummary: string;
};

export function buildRealmDeactivationApprovalPayload(
    realmName: string,
    userCount: number,
    pendingAccessRequests: number
): RealmDeactivationApprovalPayload {
    return {
        status: "Inactive",
        realmName,
        userCount,
        pendingAccessRequests,
        impactSummary: `Realm deactivation affects ${userCount} assigned user(s).`,
    };
}

export function buildAppDeactivationApprovalPayload(input: {
    appName: string;
    ownerRealm: string | null;
    linkedRealmCount: number;
    accessUserCount: number;
    redirectUriCount: number;
    postLogoutRedirectUriCount: number;
}): AppDeactivationApprovalPayload {
    return {
        status: "Disabled",
        appName: input.appName,
        ownerRealm: input.ownerRealm,
        linkedRealmCount: input.linkedRealmCount,
        accessUserCount: input.accessUserCount,
        redirectUriCount: input.redirectUriCount,
        postLogoutRedirectUriCount: input.postLogoutRedirectUriCount,
        impactSummary: `Application deactivation affects ${input.accessUserCount} user(s) across ${input.linkedRealmCount} linked realm(s).`,
    };
}

export function buildAppAccessGrantApprovalPayload(input: {
    realmId: string;
    realmName: string;
    appId: string;
    appName: string;
    userId: string;
    username: string;
    displayName: string;
}): AppAccessGrantApprovalPayload {
    return {
        requestedStatus: "Granted",
        realmId: input.realmId,
        realmName: input.realmName,
        appId: input.appId,
        appName: input.appName,
        userId: input.userId,
        username: input.username,
        displayName: input.displayName,
        impactSummary: `Grant ${input.displayName} access to ${input.appName} in ${input.realmName}.`,
    };
}