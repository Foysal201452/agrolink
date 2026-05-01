import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Users, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import heroImg from "@/assets/hero-farm.jpg";

const stats = [
  { icon: Users, label: "সক্রিয় কৃষক", value: "12,000+" },
  { icon: TrendingUp, label: "গড় লাভ বৃদ্ধি", value: "35%" },
  { icon: Truck, label: "মাসে ডেলিভারি", value: "50K+" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImg} alt="স্মার্ট কৃষির দৃশ্য" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      <div className="container relative z-10 pt-24 pb-16">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              স্মার্ট ফার্ম মার্কেটপ্লেস
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6"
          >
            মধ্যস্বত্বভোগী কমিয়ে{" "}
            <span className="text-gradient">কৃষকের লাভ বাড়ান</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-xl mb-8"
          >
            AgroLink কৃষকদের সরাসরি ক্রেতাদের সাথে যুক্ত করে, রিয়েল-টাইম লজিস্টিকস ট্র্যাকিং দেয়
            এবং সাপ্লাই চেইনের অদক্ষতা কমায়।
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-6 py-3 font-heading text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              মার্কেটপ্লেস দেখুন <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/farmer-dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              কৃষক ড্যাশবোর্ড
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-xl bg-gradient-card border border-border/50 p-5 shadow-card"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
