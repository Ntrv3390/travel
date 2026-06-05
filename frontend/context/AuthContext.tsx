"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api, setTokens, clearTokens, getAccessToken, decodeJWTPayload, silentRefresh } from "@/lib/api-client";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  createdAt?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const accessToken = getAccessToken();
      const refreshToken = localStorage.getItem("triipzy_refresh_token");

      // If no access token but refresh token exists, silently refresh
      if ((!accessToken || !decodeJWTPayload(accessToken)) && refreshToken) {
        const newToken = await silentRefresh();
        if (!newToken) {
          setLoading(false);
          return;
        }
      } else if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const u = await api.get<User>("/api/v1/auth/profile");
        setUser(u);
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Background auto-refresh: check every 30s, refresh if token expires within 5 min
  useEffect(() => {
    const interval = setInterval(() => {
      const accessToken = getAccessToken();
      if (!accessToken) return;

      const payload = decodeJWTPayload(accessToken);
      if (!payload || !payload.exp) return;

      const expiresAt = payload.exp * 1000;
      const fiveMinutes = 5 * 60 * 1000;
      if (expiresAt - Date.now() < fiveMinutes) {
        silentRefresh().catch(() => {});
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; refresh_token: string; user: User }>("/api/v1/auth/signin", { email, password });
    setTokens(res.access_token, res.refresh_token);
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.post<{ access_token: string; refresh_token: string; user: User }>("/api/v1/auth/signup", { email, password, name });
    setTokens(res.access_token, res.refresh_token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post("/api/v1/auth/signout");
    } catch {
      // ignore failure — clear locally regardless
    }
    clearTokens();
    setUser(null);
  }, []);

  const isAdmin = useMemo(() => user?.role === "admin" || user?.role === "superadmin", [user]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
