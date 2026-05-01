import { motion } from "framer-motion";
import { ShoppingCart, Truck, BarChart3, Warehouse, Shield, Globe } from "lucide-react";

const features = [
  {
    icon: ShoppingCart,
    title: "সরাসরি মার্কেটপ্লেস",
    description: "কৃষকরা ছবি সহ পণ্য তালিকাভুক্ত করে নিজেরাই দাম নির্ধারণ করতে পারেন। ক্রেতারা সরাসরি কিনবেন — মাঝখানে কোনো মধ্যস্বত্বভোগী নেই।",
  },
  {
    icon: Truck,
    title: "লজিস্টিকস ট্র্যাকিং",
    description: "ফার্ম থেকে ক্রেতা পর্যন্ত রিয়েল-টাইম ডেলিভারি ট্র্যাকিং, সাথে হাব-টু-হাব ট্রান্সফার ম্যানেজমেন্ট।",
  },
  {
    icon: BarChart3,
    title: "স্মার্ট ড্যাশবোর্ড",
    description: "কৃষকের জন্য লাভের বিশ্লেষণ এবং ক্রেতার জন্য কেনাকাটার ইতিহাস—সবই রিয়েল-টাইমে।",
  },
  {
    icon: Warehouse,
    title: "গুদাম ব্যবস্থাপনা",
    description: "ইনভেন্টরি ট্র্যাকিং, স্টোরেজ মনিটরিং এবং কার্যকর হাব-টু-হাব ট্রান্সফার।",
  },
  {
    icon: Shield,
    title: "দামের স্বচ্ছতা",
    description: "ন্যায্য ও দৃশ্যমান মূল্য—যাতে কৃষক এবং ভোক্তা দুজনই সেরা ডিল পান।",
  },
  {
    icon: Globe,
    title: "বাজারে প্রবেশাধিকার",
    description: "স্থানীয় বাজারের বাইরে পৌঁছান এবং বিভিন্ন অঞ্চলের ক্রেতাদের সাথে যুক্ত হন।",
  },
];

export default function FeaturesSection() {
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
            মূল <span className="text-gradient">ফিচারসমূহ</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            কৃষি সাপ্লাই চেইন বদলাতে যা যা দরকার—সব এক জায়গায়।
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-xl bg-gradient-card border border-border/50 p-6 shadow-card transition-all hover:border-primary/30 hover:shadow-glow"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
