import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/auth/auth";
import { toast } from "@/components/ui/sonner";

export default function Login() {
  const { auth, login, register, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname as string | undefined;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<"buyer" | "farmer">("buyer");
  const [displayName, setDisplayName] = useState("");

  const quickAccounts = useMemo(
    () => [
      { label: "ক্রেতা (buyer)", username: "buyer" },
      { label: "কৃষক (farmer)", username: "farmer" },
      { label: "Admin", username: "admin" },
      { label: "ঢাকা ডিপো", username: "dhaka" },
      { label: "চট্টগ্রাম ডিপো", username: "ctg" },
      { label: "খুলনা ডিপো", username: "khulna" },
      { label: "সিলেট ডিপো", username: "sylhet" },
      { label: "ডেলিভারি ম্যান", username: "delivery" },
    ],
    [],
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient">লগইন</span>
          </h1>
          <p className="text-muted-foreground">ক্রেতা, কৃষক, ডিপো বা ডেলিভারি হিসেবে লগইন করুন। (QR স্ক্যান শুধু ডিপো/ডেলিভারি)</p>
        </motion.div>

        <div className="max-w-xl rounded-2xl border border-border/50 bg-gradient-card p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "login" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === "register" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Register (Buyer/Farmer)
            </button>
          </div>

          {auth ? (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 mb-5">
              <p className="text-sm text-foreground font-semibold">
                লগইন: {auth.user.displayName ?? auth.user.username} ({auth.user.role}
                {auth.user.area ? ` • ${auth.user.area}` : ""})
              </p>
              <button
                onClick={() => logout()}
                className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Logout
              </button>
            </div>
          ) : null}

          <div className="space-y-4">
            {mode === "register" ? (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "buyer" | "farmer")}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="farmer">Farmer</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display name (Bangla)</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder={role === "buyer" ? "যেমন: ঢাকা ফ্রেশ মার্কেট" : "যেমন: আব্দুল করিম"}
                  />
                </div>
              </>
            ) : null}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="buyer / farmer / admin …"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="1234"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Demo password: 1234</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                disabled={busy}
                onClick={async () => {
                  try {
                    setBusy(true);
                    const u =
                      mode === "login"
                        ? await login(username.trim(), password)
                        : await register({
                            username: username.trim(),
                            password,
                            role,
                            displayName: displayName.trim(),
                            buyerName: role === "buyer" ? displayName.trim() : undefined,
                            farmerName: role === "farmer" ? displayName.trim() : undefined,
                          });
                    toast(mode === "login" ? "লগইন সফল" : "রেজিস্টার সফল");
                    if (u.role === "admin") navigate(from ?? "/logistics");
                    else if (u.role === "buyer") navigate(from ?? "/buyer-dashboard");
                    else if (u.role === "farmer") navigate(from ?? "/farmer-dashboard");
                    else if (u.role === "depo" || u.role === "delivery") navigate(from ?? "/scanner");
                    else navigate(from ?? "/marketplace");
                  } catch {
                    toast(mode === "login" ? "Login failed" : "Register failed", {
                      description: mode === "login" ? "Username/password ভুল।" : "Username আগেই আছে বা তথ্য ভুল।",
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {mode === "login" ? "Login" : "Register"}
              </button>
              <button
                onClick={() => navigate("/marketplace")}
                className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
              >
                মার্কেটপ্লেস
              </button>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Quick fill</p>
            <div className="flex flex-wrap gap-2">
              {quickAccounts.map((a) => (
                <button
                  key={a.username}
                  onClick={() => {
                    setMode("login");
                    setUsername(a.username);
                    setPassword("1234");
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

