import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sprout, ShoppingCart, RotateCcw } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/auth/auth";
import type { User } from "@/auth/auth";

function navForUser(user: User | undefined) {
  const role = user?.role;
  const base = [
    { to: "/", label: "হোম" },
    { to: "/marketplace", label: "মার্কেটপ্লেস" },
  ];

  if (!role) {
    return { links: [...base, { to: "/login", label: "লগইন" }], showCart: false, showReset: false };
  }

  if (role === "admin") {
    return {
      links: [
        ...base,
        { to: "/logistics", label: "লজিস্টিকস" },
        { to: "/farmer-dashboard", label: "কৃষক" },
        { to: "/buyer-dashboard", label: "ক্রেতা" },
        { to: "/cart", label: "কার্ট" },
        { to: "/db-admin", label: "DB" },
      ],
      showCart: true,
      showReset: true,
    };
  }

  if (role === "buyer") {
    return {
      links: [...base, { to: "/cart", label: "কার্ট" }, { to: "/buyer-dashboard", label: "ক্রেতা" }],
      showCart: true,
      showReset: false,
    };
  }

  if (role === "farmer") {
    return {
      links: [...base, { to: "/farmer-dashboard", label: "কৃষক ড্যাশবোর্ড" }],
      showCart: false,
      showReset: false,
    };
  }

  // depo / delivery (scanner users)
  return {
    links: [...base, { to: "/scanner", label: "Scan" }],
    showCart: false,
    showReset: false,
  };
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { derived, resetAll } = useAppStore();
  const { auth, logout } = useAuth();

  const { links, showCart, showReset } = useMemo(() => navForUser(auth?.user), [auth?.user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold text-foreground">
            Agro<span className="text-gradient">Link</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {auth ? (
            <button
              type="button"
              onClick={() => logout()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              লগআউট
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {showReset ? (
            <button
              onClick={() => {
                const ok = window.confirm("সব ডাটা রিসেট করবেন? (কার্ট/অর্ডার/শিপমেন্ট/গুদাম সব মুছে যাবে)");
                if (!ok) return;
                resetAll();
              }}
              className="hidden md:inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label="Reset data"
            >
              <RotateCcw className="h-4 w-4" />
              রিসেট
            </button>
          ) : null}
          {showCart ? (
            <Link
              to="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {derived.cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
                  {derived.cartCount}
                </span>
              )}
            </Link>
          ) : null}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border/50 bg-background overflow-hidden"
          >
            <div className="container py-4 flex flex-col gap-1">
              {showReset ? (
                <button
                  onClick={() => {
                    const ok = window.confirm("সব ডাটা রিসেট করবেন? (কার্ট/অর্ডার/শিপমেন্ট/গুদাম সব মুছে যাবে)");
                    if (!ok) return;
                    setOpen(false);
                    resetAll();
                  }}
                  className="px-4 py-3 rounded-lg text-left text-sm font-bold transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  ডাটা রিসেট
                </button>
              ) : null}
              {showCart ? (
                <Link
                  to="/cart"
                  onClick={() => setOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === "/cart"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  কার্ট {derived.cartCount > 0 ? `(${derived.cartCount})` : ""}
                </Link>
              ) : null}
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {auth ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="px-4 py-3 rounded-lg text-left text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  লগআউট
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
