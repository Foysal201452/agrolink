import { motion } from "framer-motion";
import { User, Store, ShoppingBag, Truck, Warehouse, Settings } from "lucide-react";

const stakeholders = [
  { icon: User, label: "কৃষক", color: "text-primary" },
  { icon: Store, label: "বিক্রেতা / খুচরা ব্যবসায়ী", color: "text-accent" },
  { icon: ShoppingBag, label: "ভোক্তা", color: "text-primary" },
  { icon: Truck, label: "লজিস্টিকস অপারেটর", color: "text-accent" },
  { icon: Warehouse, label: "গুদাম ব্যবস্থাপক", color: "text-primary" },
  { icon: Settings, label: "প্ল্যাটফর্ম অ্যাডমিন", color: "text-accent" },
];

export default function StakeholdersSection() {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            প্রধান <span className="text-gradient">স্টেকহোল্ডার</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stakeholders.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-gradient-card p-6 text-center shadow-card"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <s.icon className={`h-7 w-7 ${s.color}`} />
              </div>
              <span className="text-sm font-medium text-foreground">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
