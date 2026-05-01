import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type User = {
  id: string;
  username: string;
  role: "admin" | "buyer" | "farmer" | "depo" | "delivery";
  area: string | null;
  displayName: string | null;
  buyerName: string | null;
  farmerName: string | null;
};

type AuthState = {
  token: string;
  user: User;
};

const STORAGE_KEY = "agrolink_auth_v1";

const AuthContext = createContext<{
  auth: AuthState | null;
  login: (username: string, password: string) => Promise<User>;
  register: (payload: {
    username: string;
    password: string;
    role: "buyer" | "farmer";
    displayName: string;
    buyerName?: string;
    farmerName?: string;
  }) => Promise<User>;
  logout: () => void;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AuthState;
      if (parsed?.token && parsed?.user?.id) {
        const u = parsed.user as User;
        setAuth({
          token: parsed.token,
          user: {
            ...u,
            displayName: u.displayName ?? null,
            buyerName: u.buyerName ?? null,
            farmerName: u.farmerName ?? null,
            area: u.area ?? null,
          },
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (!auth) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // ignore
    }
  }, [auth]);

  const value = useMemo(() => {
    return {
      auth,
      login: async (username: string, password: string) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) throw new Error("login failed");
        const data = (await res.json()) as { token: string; user: User };
        const user: User = {
          ...data.user,
          displayName: data.user.displayName ?? null,
          buyerName: data.user.buyerName ?? null,
          farmerName: data.user.farmerName ?? null,
          area: data.user.area ?? null,
        };
        setAuth({ token: data.token, user });
        return user;
      },
      register: async (payload) => {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("register failed");
        const data = (await res.json()) as { token: string; user: User };
        const user: User = {
          ...data.user,
          displayName: data.user.displayName ?? null,
          buyerName: data.user.buyerName ?? null,
          farmerName: data.user.farmerName ?? null,
          area: data.user.area ?? null,
        };
        setAuth({ token: data.token, user });
        return user;
      },
      logout: () => setAuth(null),
      authFetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers ?? {});
        if (auth?.token) headers.set("authorization", `Bearer ${auth.token}`);
        return fetch(input, { ...init, headers });
      },
    };
  }, [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

