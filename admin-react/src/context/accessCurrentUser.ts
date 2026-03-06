// src/context/accessCurrentUser.ts
export type AccessUserRole = "requester" | "approver" | "verifier" | "admin";

export type AccessCurrentUser = {
    username: string;
    role: AccessUserRole;
    displayName?: string;
};

const STORAGE_KEY = "access_current_user";

const DEFAULT_USER: AccessCurrentUser = {
    username: "admin",
    role: "admin",
    displayName: "Admin",
};

function readStoredUser(): AccessCurrentUser {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_USER;

        const parsed = JSON.parse(raw) as Partial<AccessCurrentUser>;
        if (!parsed.username || !parsed.role) return DEFAULT_USER;

        return {
            username: parsed.username,
            role: parsed.role,
            displayName: parsed.displayName || parsed.username,
        };
    } catch {
        return DEFAULT_USER;
    }
}

function writeStoredUser(user: AccessCurrentUser) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function getAccessCurrentUser(): AccessCurrentUser {
    if (typeof window === "undefined") return DEFAULT_USER;
    return readStoredUser();
}

export function setAccessCurrentUser(next: AccessCurrentUser) {
    if (typeof window === "undefined") return;
    writeStoredUser(next);
}

export function getAccessActor(): string {
    return getAccessCurrentUser().username;
}

export function getAccessRole(): AccessUserRole {
    return getAccessCurrentUser().role;
}