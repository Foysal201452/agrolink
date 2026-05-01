import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, MapPin, Calendar, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/auth";
import { useAppStore } from "@/store/app-store";
import { toast } from "@/components/ui/sonner";
import { formatTaka } from "@/lib/money";

import avocadoImg from "@/images/avocado.jpg";
import bananasImg from "@/images/bananas.jpg";
import cornImg from "@/images/corn.jpg";
import mangoesImg from "@/images/mangoes.jpg";
import peasImg from "@/images/peas.jpg";
import potatoesImg from "@/images/potatoes.jpg";
import riceImg from "@/images/rice.jpg";
import tomatoImg from "@/images/tomato.jpg";

function isImageUrl(value: string) {
  const v = value.trim();
  return /^https?:\/\//i.test(v) || v.startsWith("/");
}

const seedImageMap: Record<string, string> = {
  tomato: tomatoImg,
  corn: cornImg,
  avocado: avocadoImg,
  peas: peasImg,
  mango: mangoesImg,
  rice: riceImg,
  potatoes: potatoesImg,
  bananas: bananasImg,
};

function resolveBackgroundSrc(raw: string) {
  const v = (raw ?? "").trim();
  const m = /^seed:([a-z0-9_-]+)$/i.exec(v);
  if (m) {
    const key = m[1]!.toLowerCase();
    return seedImageMap[key] ?? null;
  }
  if (isImageUrl(v)) return v;
  return null;
}

const categories = [
  { key: "All", label: "সব" },
  { key: "Vegetables", label: "সবজি" },
  { key: "Fruits", label: "ফল" },
  { key: "Grains", label: "শস্য" },
] as const;

export default function Marketplace() {
  const { auth } = useAuth();
  const { state, addToCart } = useAppStore();
  const canCart = auth?.user.role === "buyer" || auth?.user.role === "admin";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = state.crops.filter(
    (c) =>
      c.active &&
      (category === "All" || c.category === category) &&
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            ফার্ম <span className="text-gradient">মার্কেটপ্লেস</span>
          </h1>
          <p className="text-muted-foreground">কৃষকের কাছ থেকে সরাসরি তাজা পণ্য দেখুন ও কিনুন।</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ফসল খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  category === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
          {filtered.map((crop, i) => {
            const bg = resolveBackgroundSrc(crop.image);
            const emoji = bg ? null : (crop.image ?? "").trim();

            return (
              <motion.div
                key={crop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 shadow-card transition-all hover:border-primary/40 hover:shadow-glow hover:shadow-glow/40"
              >
                {/* Background image */}
                {bg ? (
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-0 bg-center bg-cover"
                    style={{ backgroundImage: `url(${bg})` }}
                    whileHover={{ scale: 1.06 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                ) : (
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-primary/25 via-black/10 to-black/40" />
                )}

                {/* Overlay for readability */}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/80" />

                {/* Content */}
                <div className="relative p-6 min-h-[320px] flex flex-col">
                  {emoji && (
                    <div className="mb-4">
                      <div className="inline-flex items-center justify-center rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur">
                        <span className="text-4xl leading-none">{emoji}</span>
                      </div>
                    </div>
                  )}

                  <h3 className="font-heading text-xl font-extrabold text-white tracking-tight drop-shadow-sm">{crop.name}</h3>
                  <p className="text-sm text-white/85 mb-3 font-semibold drop-shadow-sm">{crop.farmer} কর্তৃক</p>

                  <div className="flex items-center gap-3 text-xs text-white/80 mb-4 font-semibold">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-white/90" />{crop.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-white/90" />{crop.harvest}</span>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-2xl font-extrabold text-white drop-shadow">
                        {formatTaka(crop.price)}
                        <span className="text-xs text-white/75 font-semibold">/{crop.unit}</span>
                      </span>
                      <span className="flex items-center gap-1 text-sm text-white font-bold drop-shadow">
                        <Star className="h-4 w-4 fill-current text-white" />
                        {crop.rating}
                      </span>
                    </div>

                    {canCart ? (
                      <button
                        type="button"
                        onClick={() => {
                          addToCart(crop.id, 1);
                          toast("কার্টে যোগ হয়েছে", { description: `${crop.name} যোগ করা হয়েছে।` });
                        }}
                        className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow"
                      >
                        কার্টে যোগ করুন
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        state={{ from: { pathname: "/marketplace" } }}
                        className="mt-5 block w-full text-center rounded-xl border border-white/25 bg-white/10 py-3 text-sm font-extrabold text-white backdrop-blur transition-all hover:bg-white/15"
                      >
                        কিনতে লগইন করুন
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}
