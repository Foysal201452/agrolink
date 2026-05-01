import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Package, Clock, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/auth/auth";
import { useAppStore } from "@/store/app-store";
import { formatTaka } from "@/lib/money";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const months = ["জানু", "ফেব", "মার্চ", "এপ্রি", "মে", "জুন", "জুল", "আগ", "সেপ্ট", "অক্ট", "নভে", "ডিসে"];

function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const orderStatusLabel: Record<string, string> = {
  Delivered: "ডেলিভারি সম্পন্ন",
  "In Transit": "পথে আছে",
  Processing: "প্রক্রিয়াধীন",
  Completed: "সম্পন্ন",
};

export default function BuyerDashboard() {
  const { auth } = useAuth();
  const { state, derived } = useAppStore();
  const welcome = auth?.user.role === "admin" ? "অ্যাডমিন" : auth?.user.displayName ?? state.buyerName;
  const [qrOrderId, setQrOrderId] = useState<string>("");

  const totalOrders = derived.ordersDetailed.length;
  const totalSpent = derived.ordersDetailed.reduce((sum, o) => sum + o.total, 0);
  const pendingDelivery = derived.ordersDetailed.filter((o) => o.order.status !== "Delivered" && o.order.status !== "Completed").length;

  const purchaseData = (() => {
    const now = new Date();
    const keys: Array<{ key: string; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push({ key: ymKey(d), label: months[d.getMonth()]! });
    }

    const totals = new Map<string, number>();
    for (const o of derived.ordersDetailed) {
      const createdAt = new Date(o.order.createdAtMs);
      const key = ymKey(createdAt);
      totals.set(key, (totals.get(key) ?? 0) + o.total);
    }

    return keys.map((k) => ({ month: k.label, amount: Math.round(totals.get(k.key) ?? 0) }));
  })();

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            ক্রেতা <span className="text-gradient">ড্যাশবোর্ড</span>
          </h1>
          <p className="text-muted-foreground">ফিরে আসায় স্বাগতম, {welcome}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10">
          {[
            { icon: ShoppingBag, label: "মোট অর্ডার", value: String(totalOrders) },
            { icon: CreditCard, label: "মোট খরচ", value: formatTaka(totalSpent) },
            { icon: Package, label: "ডেলিভারি বাকি", value: String(pendingDelivery) },
            { icon: Clock, label: "গড় ডেলিভারি সময়", value: "—" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 rounded-xl border border-border/50 bg-gradient-card p-5 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-heading text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card">
            <h2 className="font-heading text-lg font-semibold mb-4">ক্রয় ইতিহাস</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={purchaseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  formatter={(value) => [formatTaka(Number(value)), "মোট"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card">
            <h2 className="font-heading text-lg font-semibold mb-4">অর্ডার ট্র্যাকিং</h2>
            <div className="space-y-4">
              {derived.ordersDetailed.length === 0 ? (
                <div className="rounded-lg border border-border/30 bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">এখনো কোনো অর্ডার নেই। মার্কেটপ্লেস থেকে কার্টে যোগ করে অর্ডার দিন।</p>
                </div>
              ) : derived.ordersDetailed.slice(0, 3).map(({ order, itemsLabel, farmerNames }) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-border/30 bg-muted/30 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.id} — {farmerNames}</p>
                    <p className="text-xs text-muted-foreground">{itemsLabel}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    order.status === "Delivered" || order.status === "Completed" ? "bg-primary/20 text-primary" :
                    order.status === "In Transit" ? "bg-accent/20 text-accent" :
                    "bg-secondary text-secondary-foreground"
                  }`}>{orderStatusLabel[order.status] ?? order.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card">
          <h2 className="font-heading text-lg font-semibold mb-4">সব অর্ডার</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-3 font-medium">অর্ডার আইডি</th>
                  <th className="text-left py-3 font-medium">কৃষক</th>
                  <th className="text-left py-3 font-medium">পণ্য</th>
                  <th className="text-left py-3 font-medium">মোট</th>
                  <th className="text-left py-3 font-medium">তারিখ</th>
                  <th className="text-left py-3 font-medium">স্ট্যাটাস</th>
                  <th className="text-right py-3 font-medium">QR</th>
                </tr>
              </thead>
              <tbody>
                {derived.ordersDetailed.map(({ order, itemsLabel, total, farmerNames }) => (
                  <tr key={order.id} className="border-b border-border/30">
                    <td className="py-3 font-heading font-medium text-foreground">{order.id}</td>
                    <td className="py-3 text-foreground">{farmerNames}</td>
                    <td className="py-3 text-muted-foreground">{itemsLabel}</td>
                    <td className="py-3 font-medium text-primary">{formatTaka(total)}</td>
                    <td className="py-3 text-muted-foreground">{order.dateLabel}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        order.status === "Delivered" || order.status === "Completed" ? "bg-primary/20 text-primary" :
                        order.status === "In Transit" ? "bg-accent/20 text-accent" :
                        "bg-secondary text-secondary-foreground"
                      }`}>{orderStatusLabel[order.status] ?? order.status}</span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setQrOrderId(order.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        Show
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />

      <Dialog open={!!qrOrderId} onOpenChange={(v) => setQrOrderId(v ? qrOrderId : "")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order QR</DialogTitle>
            <DialogDescription>এই QR কোডটি স্ক্যান করলে অর্ডার আইডি পাওয়া যাবে: {qrOrderId}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center rounded-xl border border-border/50 bg-white p-4">
            <QRCode value={qrOrderId || "—"} size={220} />
          </div>
          <div className="text-xs text-muted-foreground break-all">
            Payload: <span className="text-foreground font-medium">{qrOrderId}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
