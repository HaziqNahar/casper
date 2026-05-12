/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, clearAccessToken, getAccessToken, setAccessToken } from "../services/apiClient";
import { authApi, type AuthUser } from "../services/authApi";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string, returnUrl?: string) => Promise<{ redirectUrl?: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === "true";
const bypassUser: AuthUser = {
  sub: "dev-bypass",
  username: "dev-admin",
  email: "admin@casper.local",
  role: "Admin",
  isSuperAdmin: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(bypassAuth ? bypassUser : null);
  const [loading, setLoading] = useState(!bypassAuth);

  const refreshMe = useCallback(async () => {
    if (bypassAuth) {
      setUser(bypassUser);
      return;
    }

    try {
      if (!getAccessToken()) {
        setUser(null);
        return;
      }

      const me = await authApi.me();
      setUser({ sub: me.sub, username: me.username, email: me.email, role: me.role, isSuperAdmin: me.isSuperAdmin });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    if (bypassAuth) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        await refreshMe();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshMe]);

  const login = useCallback(async (username: string, password: string, returnUrl?: string) => {
    if (bypassAuth) {
      setUser(bypassUser);
      return { redirectUrl: returnUrl || "/admin/" };
    }

    const loginResponse = await authApi.login({ username, password, returnUrl });
    if (!loginResponse.accessToken) {
      throw new Error("Login response did not include an access token.");
    }

    setAccessToken(loginResponse.accessToken);
    await refreshMe();
    return { redirectUrl: loginResponse.redirectUrl };
  }, [refreshMe]);

  const logout = useCallback(async () => {
    if (bypassAuth) {
      setUser(bypassUser);
      return;
    }

    try {
      await authApi.logout();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login,
    logout,
    refreshMe,
  }), [user, loading, login, logout, refreshMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}