import { Sheet, SheetContent } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { Camera, CalendarDays, Sparkles, ArrowRight } from "lucide-react";

interface AddChoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogShow: () => void;
  onPlanShow: () => void;
}

export default function AddChoiceSheet({ open, onOpenChange, onLogShow, onPlanShow }: AddChoiceSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-white/10 bg-background/95 backdrop-blur-xl px-0 pb-safe"
        style={{ maxHeight: "60vh" }}
      >
        <div className="px-5 pt-5 pb-8 space-y-3">
          {/* Handle pill */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />

          {/* Log a Show — primary action */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { onOpenChange(false); setTimeout(onLogShow, 150); }}
            className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05] border border-white/[0.09] hover:bg-white/[0.09] hover:border-white/[0.16] transition-all text-left"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(189 94% 55% / 0.25), hsl(250 80% 60% / 0.18))",
                border: "1px solid hsl(189 94% 55% / 0.3)",
                boxShadow: "0 0 16px hsl(189 94% 55% / 0.2)",
              }}
            >
              <Camera className="h-5 w-5 text-primary" style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.7))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">Log a Show</p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                Add a concert you've already been to
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>

          {/* Plan a Show */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { onOpenChange(false); setTimeout(onPlanShow, 150); }}
            className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05] border border-white/[0.09] hover:bg-white/[0.09] hover:border-white/[0.16] transition-all text-left"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(17 88% 60% / 0.22), hsl(45 93% 58% / 0.15))",
                border: "1px solid hsl(17 88% 60% / 0.3)",
                boxShadow: "0 0 16px hsl(17 88% 60% / 0.18)",
              }}
            >
              <CalendarDays className="h-5 w-5 text-secondary" style={{ filter: "drop-shadow(0 0 6px hsl(var(--secondary) / 0.7))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">Plan a Show</p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                Save an upcoming show with Magic Add or manually
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>

          {/* Subtle AI hint */}
          <p className="text-center text-[11px] text-white/25 pt-1 flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" />
            Magic Add uses AI to read screenshots, links &amp; posters
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
