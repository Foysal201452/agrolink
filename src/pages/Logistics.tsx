import { motion } from "framer-motion";
import { Package, Truck, Warehouse as WarehouseIcon, MapPin, Clock, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useAuth } from "@/auth/auth";
import { useAppStore } from "@/store/app-store";
import { toast } from "@/components/ui/sonner";
import QRCode from "react-qr-code";

const stepColor: Record<string, string> = {
  "Collected": "bg-accent/20 text-accent",
  "At Village Hub": "bg-primary/20 text-primary",
  "In Transit": "bg-primary/20 text-primary",
  "At City Hub": "bg-primary/20 text-primary",
  "Out for Delivery": "bg-primary/20 text-primary",
  "Delivered": "bg-secondary text-secondary-foreground",
};

const stepLabel: Record<string, string> = {
  "Collected": "গ্রাম থেকে সংগ্রহ",
  "At Village Hub": "গ্রাম হাবে পৌঁছেছে",
  "In Transit": "পরিবহণে আছে",
  "At City Hub": "শহর হাবে পৌঁছেছে",
  "Out for Delivery": "ডেলিভারির পথে",
  "Delivered": "ডেলিভারি সম্পন্ন",
};

export default function Logistics() {
  const { auth } = useAuth();
  const { state, advanceShipmentStep, refreshFromServer } = useAppStore();

  useEffect(() => {
    // Lightweight polling so hub/status updates appear after depot scans.
    if (auth?.user.role !== "admin") return;
    const t = window.setInterval(() => {
      void refreshFromServer();
    }, 2500);
    return () => window.clearInterval(t);
  }, [auth?.user.role, refreshFromServer]);

  const shipments = state.shipments;
  const warehouses = state.warehouses;

  const orderLocationLabel = (shipmentStep: string, route: { villageHub: string; cityHub: string }) => {
    if (shipmentStep === "At Village Hub") return route.villageHub;
    if (shipmentStep === "At City Hub") return route.cityHub;
    if (shipmentStep === "Out for Delivery") return `${route.cityHub} → ডেলিভারি`;
    if (shipmentStep === "In Transit") return "হাবগুলোর মধ্যে ট্রানজিট";
    if (shipmentStep === "Collected") return "গ্রাম থেকে সংগ্রহ হচ্ছে";
    if (shipmentStep === "Delivered") return "ডেলিভারি সম্পন্ন";
    return shipmentStep;
  };

  const ordersWithWarehouse = state.orders.map((o) => {
    const sh = state.shipments.find((s) => s.orderId === o.id);
    return {
      orderId: o.id,
      buyerName: o.buyerName,
      status: o.status,
      hub: sh ? orderLocationLabel(sh.step, sh.route) : "—",
      shipmentId: sh?.id ?? "—",
    };
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            লজিস্টিকস <span className="text-gradient">ট্র্যাকিং</span>
          </h1>
          <p className="text-muted-foreground">রিয়েল-টাইমে শিপমেন্ট ও গুদামের ইনভেন্টরি পর্যবেক্ষণ করুন।</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Truck, label: "সক্রিয় শিপমেন্ট", value: String(shipments.filter((s) => s.step !== "Delivered").length) },
            { icon: WarehouseIcon, label: "গুদাম", value: String(warehouses.length) },
            { icon: Package, label: "আজকের প্যাকেজ", value: String(Math.max(0, shipments.length)) },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 rounded-xl border border-border/50 bg-gradient-card p-5 shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="font-heading text-xl font-semibold mb-4">অর্ডার এখন কোথায়</h2>
        <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card mb-12 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left py-3 font-medium">অর্ডার আইডি</th>
                <th className="text-left py-3 font-medium">ক্রেতা</th>
                <th className="text-left py-3 font-medium">শিপমেন্ট</th>
                <th className="text-left py-3 font-medium">বর্তমান হাব/অবস্থান</th>
                <th className="text-left py-3 font-medium">স্ট্যাটাস</th>
                  <th className="text-right py-3 font-medium">QR</th>
              </tr>
            </thead>
            <tbody>
              {ordersWithWarehouse.length === 0 ? (
                <tr className="border-b border-border/30">
                  <td className="py-4 text-muted-foreground" colSpan={5}>এখনো কোনো অর্ডার নেই।</td>
                </tr>
              ) : (
                ordersWithWarehouse.map((row) => (
                  <tr key={row.orderId} className="border-b border-border/30">
                    <td className="py-3 font-heading font-medium text-foreground">{row.orderId}</td>
                    <td className="py-3 text-foreground">{row.buyerName}</td>
                    <td className="py-3 text-muted-foreground">{row.shipmentId}</td>
                    <td className="py-3 text-foreground">{row.hub}</td>
                    <td className="py-3 text-muted-foreground">{row.status}</td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center justify-end rounded-md bg-white p-1">
                        <QRCode value={row.orderId} size={56} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <h2 className="font-heading text-xl font-semibold mb-4">সক্রিয় শিপমেন্ট</h2>
        <div className="space-y-3 mb-12">
          {shipments.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card">
              <p className="text-sm text-muted-foreground">এখনো কোনো শিপমেন্ট নেই। কার্ট থেকে অর্ডার দিলে এখানে শিপমেন্ট দেখা যাবে।</p>
            </div>
          ) : shipments.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/50 bg-gradient-card p-5 shadow-card"
            >
              <div className="flex items-center gap-4">
                <span className="font-heading text-sm font-bold text-muted-foreground">{s.id}</span>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {s.route.village}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.route.city}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground max-w-[320px] truncate" title={s.itemsLabel}>{s.itemsLabel}</span>
                {s.eta !== "—" && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> আনুমানিক সময়: {s.eta}
                  </span>
                )}
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${stepColor[s.step]}`}>{stepLabel[s.step] ?? s.step}</span>
                {s.step !== "Delivered" && (
                  <button
                    onClick={() => {
                      void advanceShipmentStep(s.id);
                      toast("স্ট্যাটাস আপডেট হয়েছে");
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    পরের ধাপ
                  </button>
                )}
              </div>

              <div className="w-full sm:hidden pt-2 border-t border-border/30 text-xs text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  <span>গ্রাম হাব: <span className="text-foreground">{s.route.villageHub}</span></span>
                  <span>শহর হাব: <span className="text-foreground">{s.route.cityHub}</span></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <h2 className="font-heading text-xl font-semibold mb-4">গুদামের অবস্থা</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {warehouses.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="min-w-0">
                  <h3 className="font-heading text-sm font-semibold text-foreground truncate">{w.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {w.kind === "village" ? "গ্রাম সংগ্রহ হাব" : "সিটি হাব"} • {w.area}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{w.temp}</span>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>ধারণক্ষমতা</span>
                  <span>{Math.round((w.items / w.maxItems) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-primary transition-all"
                    style={{ width: `${Math.round((w.items / w.maxItems) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{w.items.toLocaleString()} / {w.maxItems.toLocaleString()} ইউনিট</p>
            </motion.div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
