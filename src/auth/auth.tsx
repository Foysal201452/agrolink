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

function normalizeUsername(s: string) {
  return s.trim().toLowerCase().normalize("NFKC");
}

const RESERVED_USERNAMES = new Set([
  "admin",
  "buyer",
  "farmer",
  "dhaka",
  "ctg",
  "khulna",
  "sylhet",
  "delivery",
]);

async function readAuthError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
  } catch {
    // ignore
  }
  if (res.status === 409) return "Username already exists";
  if (res.status === 400) return "Invalid username, password, or display name";
  if (res.status === 401) return "Invalid credentials";
  if (res.status >= 500) return "Server error — try again";
  return fallback;
}

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
        let res: Response;
        try {
          res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              username: normalizeUsername(username),
              password: password.trim(),
            }),
          });
        } catch {
          throw new Error("API server চালু নেই — টার্মিনালে npm run dev:all চালান");
        }
        if (!res.ok) throw new Error(await readAuthError(res, "login failed"));
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
        const username = normalizeUsername(payload.username);
        const password = payload.password.trim();
        const displayName = payload.displayName.trim();

        if (username.length < 3) {
          throw new Error("Username কমপক্ষে ৩ অক্ষর হতে হবে");
        }
        if (password.length < 4) {
          throw new Error("Password কমপক্ষে ৪ অক্ষর হতে হবে");
        }
        if (!displayName) {
          throw new Error("Display name (Bangla) লিখুন");
        }
        if (RESERVED_USERNAMES.has(username)) {
          throw new Error(
            `"${username}" ডেমো অ্যাকাউন্ট — অন্য username বেছে নিন (যেমন: myshop01)`,
          );
        }

        let res: Response;
        try {
          res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              username,
              password,
              role: payload.role,
              displayName,
              buyerName: payload.role === "buyer" ? (payload.buyerName?.trim() || displayName) : undefined,
              farmerName: payload.role === "farmer" ? (payload.farmerName?.trim() || displayName) : undefined,
            }),
          });
        } catch {
          throw new Error("API server চালু নেই — টার্মিনালে npm run dev:all চালান");
        }
        if (!res.ok) throw new Error(await readAuthError(res, "register failed"));
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

