"use client";

const ACCESS_TOKEN_KEY = "triipzy_access_token";
const REFRESH_TOKEN_KEY = "triipzy_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (!accessToken || !refreshToken) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function decodeJWTPayload(token: string): { exp?: number; [key: string]: unknown } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 < Date.now() + 30000;
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const json = await res.json();
    const data = json.data ?? json;
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token ?? refreshToken;

    setTokens(newAccessToken, newRefreshToken);
    return newAccessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export async function silentRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function ensureValidToken(): Promise<string | null> {
  const accessToken = getAccessToken();
  if (!accessToken) return null;

  if (!isTokenExpired(accessToken)) {
    return accessToken;
  }

  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = await ensureValidToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const newToken = await doRefresh();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        const retryRes = await fetch(url, { ...options, headers });
        if (retryRes.ok) {
          const text = await retryRes.text();
          if (!text) return {} as T;
          try {
            const json = JSON.parse(text);
            return json.data ?? (json as T);
          } catch {
            return text as T;
          }
        }
      }
    }
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    throw new Error("Unauthorized");
  }

  const text = await res.text();
  if (!text) return {} as T;

  try {
    const json = JSON.parse(text);
    if (!res.ok) {
      throw new Error(json.error || json.message || res.statusText || "Request failed");
    }
    return json.data ?? (json as T);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return text as T;
    }
    throw err;
  }
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
