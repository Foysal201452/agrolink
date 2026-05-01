import { motion } from "framer-motion";

const stack = [
  { category: "ফ্রন্টএন্ড", items: ["React", "Flutter"], color: "border-primary/40 bg-primary/5" },
  { category: "ব্যাকএন্ড", items: ["Node.js", "Django"], color: "border-accent/40 bg-accent/5" },
  { category: "ডেটাবেস", items: ["PostgreSQL", "Firebase"], color: "border-primary/40 bg-primary/5" },
  { category: "টুলস", items: ["REST APIs", "Cloud Hosting"], color: "border-accent/40 bg-accent/5" },
];

export default function TechStackSection() {
  return (
    <section className="py-24 bg-gradient-hero">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            টেকনোলজি <span className="text-gradient">স্ট্যাক</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stack.map((s, i) => (
            <motion.div
              key={s.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl border ${s.color} p-6 text-center`}
            >
              <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{s.category}</h3>
              <div className="flex flex-col gap-2">
                {s.items.map((item) => (
                  <span key={item} className="text-foreground font-medium">{item}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
