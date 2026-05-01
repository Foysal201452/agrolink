import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAppStore } from "@/store/app-store";
import { toast } from "@/components/ui/sonner";
import { formatTaka } from "@/lib/money";
import { CropImage } from "@/components/CropImage";

export default function Cart() {
  const navigate = useNavigate();
  const { state, derived, setBuyerName, setBuyerArea, setQty, removeLine, clearCart, placeOrder } = useAppStore();
  const cityOptions = ["ঢাকা", "চট্টগ্রাম", "খুলনা", "সিলেট"] as const;

  const onCheckout = async () => {
    if (derived.cartLinesDetailed.length === 0) {
      toast("কার্ট খালি", { description: "অর্ডার দিতে হলে আগে কিছু পণ্য যোগ করুন।" });
      return;
    }
    if (!state.buyerName.trim()) {
      toast("ক্রেতার নাম দিন", { description: "অর্ডার দিতে হলে ক্রেতার নাম লিখুন।" });
      return;
    }
    await placeOrder();
    toast("অর্ডার গ্রহণ করা হয়েছে", { description: "আপনার অর্ডার প্রসেসিং শুরু হয়েছে।" });
    navigate("/buyer-dashboard");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3">
            <ShoppingCart className="h-7 w-7 text-primary" />
            আমার <span className="text-gradient">কার্ট</span>
          </h1>
          <p className="text-muted-foreground">
            মোট আইটেম: <span className="text-foreground font-medium">{derived.cartCount}</span>
          </p>
        </motion.div>

        {derived.cartLinesDetailed.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-gradient-card p-8 shadow-card text-center">
            <p className="text-muted-foreground mb-4">আপনার কার্টে কোনো পণ্য নেই।</p>
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              মার্কেটপ্লেসে যান
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {derived.cartLinesDetailed.map((line) => (
                <div
                  key={line.crop.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/50 bg-gradient-card p-5 shadow-card"
                >
                  <div className="flex items-center gap-4">
                    <CropImage src={line.crop.image} alt={line.crop.name} size={56} />
                    <div>
                      <p className="font-heading font-semibold text-foreground">{line.crop.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.crop.farmer} • {line.crop.location}
                      </p>
                      <p className="text-sm font-heading font-semibold text-primary">
                        {formatTaka(line.crop.price)}
                        <span className="text-xs text-muted-foreground font-normal">/{line.crop.unit}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-1.5">
                      <button
                        onClick={() => setQty(line.crop.id, Math.max(1, line.qty - 1))}
                        className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-medium text-foreground">{line.qty}</span>
                      <button
                        onClick={() => setQty(line.crop.id, line.qty + 1)}
                        className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">লাইন টোটাল</p>
                      <p className="font-heading font-semibold text-foreground">{formatTaka(line.lineTotal)}</p>
                    </div>

                    <button
                      onClick={() => removeLine(line.crop.id)}
                      className="h-9 w-9 rounded-lg border border-border/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border/50 bg-gradient-card p-6 shadow-card h-fit">
              <h2 className="font-heading text-lg font-semibold mb-4">অর্ডার সারাংশ</h2>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">ক্রেতার নাম</label>
                  <input
                    value={state.buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="যেমন: ঢাকা ফ্রেশ মার্কেট"
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">ডেলিভারি শহর</label>
                  <select
                    value={state.buyerArea}
                    onChange={(e) => setBuyerArea(e.target.value as (typeof cityOptions)[number])}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {cityOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    নির্বাচিত শহর অনুযায়ী শিপমেন্ট সংশ্লিষ্ট ডিপো/হাবে যাবে।
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">মোট</span>
                <span className="font-heading font-semibold text-foreground">{formatTaka(derived.cartTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">ডেমো প্রজেক্ট: ডেলিভারি/ট্যাক্স গণনা করা হয়নি।</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onCheckout}
                  className="rounded-lg bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  অর্ডার দিন
                </button>
                <button
                  onClick={() => {
                    clearCart();
                    toast("কার্ট খালি করা হয়েছে");
                  }}
                  className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  কার্ট খালি করুন
                </button>
                <Link
                  to="/marketplace"
                  className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted text-center"
                >
                  আরও পণ্য যোগ করুন
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

