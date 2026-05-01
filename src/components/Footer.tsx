import { Sprout } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Sprout className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-bold">AgroLink</span>
        </div>
        <p className="text-sm text-muted-foreground">© ২০২৬ AgroLink। স্মার্ট ফার্ম মার্কেটপ্লেস ও লজিস্টিকস প্ল্যাটফর্ম।</p>
      </div>
    </footer>
  );
}
