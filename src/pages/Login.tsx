import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sprout } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/auth/auth";
import { toast } from "@/components/ui/sonner";
import heroImg from "@/assets/hero-farm.jpg";

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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container flex-1 pt-24 pb-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-0 lg:items-stretch lg:rounded-3xl lg:overflow-hidden lg:border lg:border-primary/15 lg:shadow-card lg:bg-card">
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative min-h-[240px] overflow-hidden rounded-2xl border border-primary/20 shadow-card ring-1 ring-inset ring-white/10 lg:min-h-[min(640px,calc(100vh-12rem))] lg:rounded-none lg:border-0 lg:shadow-none lg:ring-0"
          >
            <img
              src={heroImg}
              alt="কৃষিক্ষেত ও সবজি—AgroLink"
              className="absolute inset-0 h-full w-full object-cover saturate-[0.88] contrast-[1.02]"
            />
            {/* Teal scrim aligned with app primary — readable text without gray-on-warm clash */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-primary/88 via-emerald-900/72 to-[hsl(196_42%_14%/0.92)]"
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/15 lg:bg-gradient-to-r lg:from-black/20 lg:via-transparent lg:to-transparent" aria-hidden />
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 lg:justify-center lg:p-10">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/15 shadow-lg backdrop-blur-md">
                <Sprout className="h-6 w-6 text-white drop-shadow-sm" aria-hidden />
              </div>
              <p className="font-heading max-w-md text-xl font-bold leading-snug tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.78),0_2px_18px_rgba(0,0,0,0.5)] sm:text-2xl lg:text-3xl">
                কৃষক থেকে ক্রেতা—<span className="font-extrabold text-emerald-50">এক প্ল্যাটফর্মে</span>
              </p>
              <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] sm:text-base">
                নিরাপদ লগইনের মাধ্যমে মার্কেটপ্লেস, অর্ডার ও লজিস্টিকস ট্র্যাকিং—সবই আপনার ভূমিকা অনুযায়ী।
              </p>
            </div>
          </motion.div>

          <div className="flex flex-col justify-center border-primary/[0.07] px-0 pb-2 lg:border-l lg:bg-gradient-to-br lg:from-card lg:to-primary/5 lg:px-10 lg:py-12 xl:px-14">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
                <span className="text-gradient">লগইন</span>
              </h1>
              <p className="text-sm font-medium text-muted-foreground sm:text-base sm:leading-relaxed">
                ক্রেতা, কৃষক, ডিপো বা ডেলিভারি হিসেবে লগইন করুন। (QR স্ক্যান শুধু ডিপো/ডেলিভারি)
              </p>
            </motion.div>

            <div className="max-w-xl rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-card ring-1 ring-primary/[0.06] lg:max-w-none">
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
              <p className="mt-1 text-[11px] text-muted-foreground">
                {mode === "register"
                  ? "নতুন অ্যাকাউন্ট: username ৩+ অক্ষর, password ৪+ অক্ষর। buyer/farmer/admin ইউজারনেম ব্যবহার করবেন না।"
                  : "Demo password: 1234"}
              </p>
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
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Unknown error";
                    toast(mode === "login" ? "Login failed" : "Register failed", {
                      description: msg,
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
        </div>
      </div>
      <Footer />
    </div>
  );
}

