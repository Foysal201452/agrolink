import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Package, ShoppingCart, Plus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/auth/auth";
import { useAppStore, type CropCategoryKey } from "@/store/app-store";
import { toast } from "@/components/ui/sonner";
import { formatTaka } from "@/lib/money";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const months = ["জানু", "ফেব", "মার্চ", "এপ্রি", "মে", "জুন", "জুল", "আগ", "সেপ্ট", "অক্ট", "নভে", "ডিসে"];

function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const orderStatusLabel: Record<string, string> = {
  Completed: "সম্পন্ন",
  "In Transit": "পথে আছে",
  Processing: "প্রক্রিয়াধীন",
  Delivered: "ডেলিভারি সম্পন্ন",
};

export default function FarmerDashboard() {
  const { auth } = useAuth();
  const isAdmin = auth?.user.role === "admin";
  const { state, derived, addListing, deactivateListing } = useAppStore();
  const myListings = isAdmin ? state.crops : state.crops.filter((c) => c.farmer === state.farmerName);
  const myActiveListings = myListings.filter((c) => c.active);

  const cityOptions = useMemo(() => {
    const cities = state.warehouses
      .filter((w) => w.kind === "city")
      .map((w) => w.area)
      .filter(Boolean);
    const unique = Array.from(new Set(cities));
    return unique.length ? unique : ["ঢাকা", "চট্টগ্রাম", "খুলনা", "সিলেট"];
  }, [state.warehouses]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "120",
    unit: "kg",
    location: "ঢাকা",
    harvest: "এপ্রি ২০২৬",
    category: "Vegetables" as CropCategoryKey,
    image: "🥬",
    farmerOverride: "",
  });

  const recentOrders = (isAdmin ? derived.ordersDetailed : derived.ordersDetailed.filter((o) => o.farmerNames.includes(state.farmerName))).slice(
    0,
    6,
  );

  const revenue = (isAdmin ? derived.ordersDetailed : derived.ordersDetailed.filter((o) => o.farmerNames.includes(state.farmerName))).reduce(
    (sum, o) => sum + (isAdmin ? o.total : o.order.lines.filter((l) => l.snapshot.farmer === state.farmerName).reduce((s, l) => s + l.qty * l.snapshot.price, 0)),
    0,
  );

  const activeListings = myActiveListings.length;
  const ordersThisWeek = recentOrders.length;

  const salesData = (() => {
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
      const lineTotal = isAdmin
        ? o.total
        : o.order.lines.filter((l) => l.snapshot.farmer === state.farmerName).reduce((sum, l) => sum + l.qty * l.snapshot.price, 0);
      if (lineTotal > 0) totals.set(key, (totals.get(key) ?? 0) + lineTotal);
    }

    return keys.map((k) => ({ month: k.label, sales: Math.round(totals.get(k.key) ?? 0) }));
  })();

  const onOpenAddListing = () => {
    setForm((f) => ({
      ...f,
      name: "",
      price: "120",
      unit: "kg",
      location: cityOptions[0] ?? "ঢাকা",
      harvest: "এপ্রি ২০২৬",
      category: "Vegetables",
      image: "🥬",
      farmerOverride: "",
    }));
    setOpen(true);
  };

  const onSubmitListing = async () => {
    const name = form.name.trim();
    if (!name) {
      toast("পণ্যের নাম দিন");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast("ভুল দাম", { description: "দাম সঠিকভাবে দিন।" });
      return;
    }

    const farmerForListing = isAdmin ? (form.farmerOverride.trim() || state.farmerName) : state.farmerName;
    if (isAdmin && !farmerForListing.trim()) {
      toast("কৃষকের নাম দিন", { description: "অ্যাডমিন হিসেবে তালিকার জন্য কৃষক নাম লিখুন।" });
      return;
    }

    await addListing({
      name,
      farmer: farmerForListing,
      location: form.location,
      price,
      unit: form.unit.trim() || "kg",
      rating: 4.6,
      harvest: form.harvest.trim() || "এপ্রি ২০২৬",
      category: form.category,
      image: form.image.trim() || "🌿",
    });
    setOpen(false);
    toast("তালিকাভুক্ত করা হয়েছে", { description: `${name} মার্কেটপ্লেসে যুক্ত হয়েছে।` });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            কৃষক <span className="text-gradient">ড্যাশবোর্ড</span>
          </h1>
          <p className="text-muted-foreground">
            ফিরে আসায় স্বাগতম, {isAdmin ? "অ্যাডমিন" : auth?.user.displayName ?? state.farmerName}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10">
          {[
            { icon: DollarSign, label: "মোট আয়", value: formatTaka(revenue) },
            { icon: TrendingUp, label: "এই মাসের লাভ", value: "—" },
            { icon: Package, label: "সক্রিয় তালিকা", value: String(activeListings) },
            { icon: ShoppingCart, label: "এই সপ্তাহের অর্ডার", value: String(ordersThisWeek) },
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card">
            <h2 className="font-heading text-lg font-semibold mb-4">বিক্রির সারসংক্ষেপ</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(162, 82%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(162, 82%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  formatter={(value) => [formatTaka(Number(value)), "বিক্রি"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                />
                <Area type="monotone" dataKey="sales" stroke="hsl(162, 82%, 50%)" fillOpacity={1} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold">{isAdmin ? "সব তালিকা (অ্যাডমিন)" : "আমার তালিকা"}</h2>
              <button
                onClick={onOpenAddListing}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <Plus className="h-3 w-3" /> যোগ করুন
              </button>
            </div>
            <div className="space-y-3">
              {myListings.length === 0 ? (
                <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">এখনো কোনো তালিকা নেই। “যোগ করুন” চাপুন।</p>
                </div>
              ) : myListings.slice(0, 6).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/30 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {l.name} {!l.active ? <span className="text-xs text-muted-foreground">(ডিঅ্যাক্টিভ)</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{l.location} • {l.harvest}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-heading font-semibold text-primary">{formatTaka(l.price)}/{l.unit}</span>
                    {l.active && (
                      <button
                        onClick={() => {
                          void deactivateListing(l.id);
                          toast("তালিকা সরানো হয়েছে", { description: "এই পণ্যটি মার্কেটপ্লেসে আর দেখাবে না।" });
                        }}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        সরান
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card">
          <h2 className="font-heading text-lg font-semibold mb-4">সাম্প্রতিক অর্ডার</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-3 font-medium">অর্ডার আইডি</th>
                  <th className="text-left py-3 font-medium">ক্রেতা</th>
                  <th className="text-left py-3 font-medium">পণ্য</th>
                  <th className="text-left py-3 font-medium">পরিমাণ</th>
                  <th className="text-left py-3 font-medium">মোট</th>
                  <th className="text-left py-3 font-medium">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr className="border-b border-border/30">
                    <td className="py-4 text-muted-foreground" colSpan={6}>এখনো কোনো অর্ডার নেই।</td>
                  </tr>
                ) : recentOrders.map(({ order, itemsLabel, total }) => (
                  <tr key={order.id} className="border-b border-border/30">
                    <td className="py-3 font-heading font-medium text-foreground">{order.id}</td>
                    <td className="py-3 text-foreground">{order.buyerName}</td>
                    <td className="py-3 text-foreground">{itemsLabel}</td>
                    <td className="py-3 text-muted-foreground">—</td>
                    <td className="py-3 font-medium text-primary">{formatTaka(total)}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        order.status === "Completed" || order.status === "Delivered" ? "bg-primary/20 text-primary" :
                        order.status === "In Transit" ? "bg-accent/20 text-accent" :
                        "bg-secondary text-secondary-foreground"
                      }`}>{orderStatusLabel[order.status] ?? order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>নতুন তালিকা যোগ করুন</DialogTitle>
            <DialogDescription>
              Location এখন শুধু আপনার সিস্টেমে থাকা Depo/Storage থেকে সিলেক্ট করা যাবে।
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">পণ্যের নাম</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="যেমন: তাজা টমেটো"
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {isAdmin ? (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">কৃষকের নাম (অ্যাডমিন)</label>
                <input
                  value={form.farmerOverride}
                  onChange={(e) => setForm((f) => ({ ...f, farmerOverride: e.target.value }))}
                  placeholder={state.farmerName}
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ) : null}

            <div>
              <label className="text-xs font-medium text-muted-foreground">দাম (৳)</label>
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">ইউনিট</label>
              <input
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                placeholder="kg / bunch"
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Location (Depo/Storage)</label>
              <select
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">হারভেস্ট</label>
              <input
                value={form.harvest}
                onChange={(e) => setForm((f) => ({ ...f, harvest: e.target.value }))}
                placeholder="এপ্রি ২০২৬"
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">ক্যাটাগরি</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CropCategoryKey }))}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Grains">Grains</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">ইমেজ (ইমোজি বা URL)</label>
              <input
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="🥬 বা https://..."
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              type="button"
            >
              বাতিল
            </button>
            <button
              onClick={() => void onSubmitListing()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
              type="button"
            >
              তালিকাভুক্ত করুন
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
