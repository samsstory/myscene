import { useRef } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";

export type ContentView = "home" | "calendar" | "globe" | "rankings" | "rank" | "friends";

interface PillNavItem {
  id: ContentView;
  label: string;
  badge?: number;
}

interface ContentPillNavProps {
  activeView: ContentView;
  onViewChange: (view: ContentView) => void;
  rankNudge?: boolean; // shows a dot on Rank when there are unranked shows
}

const PILLS: PillNavItem[] = [
  { id: "home", label: "Home" },
  { id: "calendar", label: "Schedule" },
  { id: "rankings", label: "My Shows" },
  { id: "rank", label: "H2H" },
  { id: "friends", label: "Friends" },
  { id: "globe", label: "Globe" },
];

export default function ContentPillNav({ activeView, onViewChange, rankNudge }: ContentPillNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-0.5"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      <LayoutGroup>
        {PILLS.map((pill) => {
          const isActive = activeView === pill.id;
          return (
            <motion.button
              key={pill.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => onViewChange(pill.id)}
              className={cn(
                "relative flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 border",
                isActive
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-white/[0.06] border-white/[0.10] text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.09]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="pill-active-bg"
                  className="absolute inset-0 rounded-full bg-primary/10"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{pill.label}</span>
              {pill.id === "rank" && rankNudge && !isActive && (
                <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_hsl(var(--primary)/0.8)]" />
              )}
            </motion.button>
          );
        })}
      </LayoutGroup>
    </div>
  );
}
