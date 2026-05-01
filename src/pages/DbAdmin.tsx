import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/auth/auth";

type AdminTables = {
  crops: any[];
  orders: any[];
  order_lines: any[];
  shipments: any[];
  warehouses: any[];
  scan_events?: any[];
  users?: any[];
};

function tryJson(raw: unknown) {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function JsonCell({ value }: { value: unknown }) {
  const parsed = tryJson(value);
  if (!parsed) return <span className="text-muted-foreground">{String(value ?? "")}</span>;
  return (
    <pre className="max-w-[520px] whitespace-pre-wrap break-words text-xs text-foreground/90">
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
}

function SimpleTable({ rows, title }: { rows: any[]; title: string }) {
  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const r of rows) Object.keys(r ?? {}).forEach((k) => keys.add(k));
    return Array.from(keys);
  }, [rows]);

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">Rows: {rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border/30 bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">No rows yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                {columns.map((c) => (
                  <th key={c} className="text-left py-3 pr-4 font-medium whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r?.id ?? r?.orderId ?? idx} className="border-b border-border/30 align-top">
                  {columns.map((c) => {
                    const v = r?.[c];
                    const looksJson = typeof v === "string" && (v.trim().startsWith("{") || v.trim().startsWith("["));
                    return (
                      <td key={c} className="py-3 pr-4 text-foreground">
                        {looksJson ? <JsonCell value={v} /> : <span className="whitespace-nowrap">{String(v ?? "")}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DbAdmin() {
  const [data, setData] = useState<AdminTables | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const { auth, authFetch } = useAuth();

  const load = async () => {
    let cancelled = false;
    const run = async () => {
      try {
        setError("");
        const res = await authFetch("/api/admin/tables");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AdminTables;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          if (!auth) setError("Admin হিসেবে লগইন করুন (তারপর রিফ্রেশ দিন)।");
          else setError("API server চলছে না বা আপনার Admin access নেই।");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            DB <span className="text-gradient">Tables</span>
          </h1>
          <p className="text-muted-foreground">
            SQLite ডাটাবেসের টেবিলগুলো আলাদা করে দেখুন (ডেমো/প্রেজেন্টেশন জন্য)।
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={() => void load()}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            disabled={busy}
          >
            রিফ্রেশ
          </button>
          <button
            onClick={async () => {
              const ok = window.confirm("Crops location rebalance করবেন? (ঢাকা/চট্টগ্রাম/খুলনা/সিলেট evenly distribute)");
              if (!ok) return;
              try {
                setBusy(true);
                const res = await authFetch("/api/admin/rebalance-crops", { method: "POST" });
                if (!res.ok) throw new Error("failed");
                await load();
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            disabled={busy}
          >
            Crops rebalance
          </button>
          <button
            onClick={async () => {
              const ok = window.confirm("Orders/Shipments ডাটা মুছে ফেলবেন? (DB থেকে ডিলিট হবে)");
              if (!ok) return;
              try {
                setBusy(true);
                const res = await authFetch("/api/admin/clear-transactions", { method: "POST" });
                if (!res.ok) throw new Error("failed");
                await load();
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            disabled={busy}
          >
            Orders/Shipments ক্লিয়ার করুন
          </button>
          <div className="text-xs text-muted-foreground sm:ml-auto sm:text-right self-center">
            টার্মিনাল থেকে Bangla কপি-পেস্ট করলে কখনো encoding নষ্ট হতে পারে—এই বাটন দিয়ে ডেমো ডাটা ক্লিন করুন।
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card mb-8">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : null}

        <div className="space-y-6">
          <SimpleTable rows={data?.crops ?? []} title="Table: crops" />
          <SimpleTable rows={data?.orders ?? []} title="Table: orders" />
          <SimpleTable rows={data?.order_lines ?? []} title="Table: order_lines" />
          <SimpleTable rows={data?.shipments ?? []} title="Table: shipments" />
          <SimpleTable rows={data?.warehouses ?? []} title="Table: warehouses" />
          <SimpleTable rows={data?.scan_events ?? []} title="Table: scan_events" />
          <SimpleTable rows={data?.users ?? []} title="Table: users (password redacted)" />
        </div>
      </div>
      <Footer />
    </div>
  );
}

