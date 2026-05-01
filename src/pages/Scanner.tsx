import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/auth/auth";
import { toast } from "@/components/ui/sonner";

type ScanResult = {
  orderId: string;
  action?: string;
  role?: string;
  area?: string | null;
  shipmentStep?: string;
  cityHub?: string;
  buyerName?: string;
  orderStatus?: string;
};

export default function Scanner() {
  const { auth, authFetch } = useAuth();
  const navigate = useNavigate();

  const regionId = useMemo(() => `qr-reader-${Math.random().toString(16).slice(2)}`, []);
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!auth) {
      navigate("/login", { state: { from: { pathname: "/scanner" } } });
      return;
    }
    if (auth.user.role === "admin") {
      toast("Scanner access denied", { description: "Admin এর জন্য স্ক্যান বন্ধ করা হয়েছে। Depot/Delivery দিয়ে স্ক্যান করুন।" });
      navigate("/logistics");
      return;
    }
    if (auth.user.role !== "depo" && auth.user.role !== "delivery") {
      toast("Depot/Delivery only", { description: "Scanner ব্যবহার করতে Depot/Delivery হিসেবে লগইন করুন।" });
      navigate("/login", { state: { from: { pathname: "/scanner" } } });
    }
  }, [auth, navigate]);

  useEffect(() => {
    if (!auth) return;
    let stopped = false;

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(regionId);
        qrRef.current = scanner;

        const devices = await Html5Qrcode.getCameras();
        await scanner.start(
          // Prefer back camera on mobile
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (busy) return;
            const orderId = (decodedText ?? "").trim();
            if (!orderId) return;

            try {
              setBusy(true);
              setMsg("Updating order status…");
              const res = await authFetch("/api/scan", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ orderId }),
              });
              const json = (await res.json()) as any;
              if (!res.ok) throw new Error(json?.error || "scan failed");

              const payload: ScanResult = {
                orderId,
                action: json?.event?.action,
                role: json?.event?.role,
                area: json?.event?.area ?? null,
                shipmentStep: json?.shipment?.step,
                cityHub: json?.shipment?.route?.cityHub,
                buyerName: json?.order?.buyerName,
                orderStatus: json?.order?.status,
              };
              setLast(payload);
              setMsg("Order status updated.");
              toast("Scan OK", { description: `${orderId} আপডেট হয়েছে।` });
            } catch {
              setMsg("Scan failed.");
              toast("Scan failed", { description: "OrderId ভুল বা login নেই।" });
            } finally {
              setBusy(false);
            }
          },
          () => {
            // ignore frame errors
          },
        );
      } catch {
        toast("Camera error", { description: "ক্যামেরা permission দিন বা অন্য ব্রাউজার ব্যবহার করুন।" });
      }
    };

    start();

    return () => {
      stopped = true;
      const s = qrRef.current;
      qrRef.current = null;
      if (s) {
        void s.stop().catch(() => undefined).finally(() => {
          if (!stopped) return;
          void s.clear().catch(() => undefined);
        });
      }
    };
  }, [auth, authFetch, busy, regionId]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            QR <span className="text-gradient">Scanner</span>
          </h1>
          <p className="text-muted-foreground">
            Logged in: {auth?.user.username} ({auth?.user.role}{auth?.user.area ? ` • ${auth.user.area}` : ""})
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-gradient-card p-6 shadow-card">
            <div className="rounded-xl overflow-hidden border border-border/50 bg-black">
              <div id={regionId} className="min-h-[360px]" />
            </div>
            {msg ? (
              <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground">
                {msg}
              </div>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              টিপস: QR কোড স্ক্যান হলে অটোমেটিক `/api/scan` কল হবে এবং Logistics/DB Admin আপডেট হবে।
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-gradient-card p-6 shadow-card">
            <h2 className="font-heading text-lg font-semibold mb-3">Last scan</h2>
            {last ? (
              <div className="space-y-2 text-sm">
                <div className="text-foreground font-semibold break-all">{last.orderId}</div>
                <div className="text-muted-foreground">
                  Action: <span className="text-foreground font-medium">{last.action ?? "—"}</span>
                </div>
                <div className="text-muted-foreground">
                  Shipment: <span className="text-foreground font-medium">{last.shipmentStep ?? "—"}</span>
                </div>
                <div className="text-muted-foreground">
                  Hub: <span className="text-foreground font-medium">{last.cityHub ?? "—"}</span>
                </div>
                <div className="text-muted-foreground">
                  Order:{" "}
                  <span className="text-foreground font-medium">
                    {last.orderStatus ?? "—"}{last.buyerName ? ` • ${last.buyerName}` : ""}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">এখনো স্ক্যান হয়নি।</p>
            )}

            <button
              onClick={() => navigate("/db-admin")}
              className="mt-6 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Open DB Admin
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

