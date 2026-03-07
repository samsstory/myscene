import { memo, useCallback, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import { type QuestStep, useSetupQuestsMinimized } from "@/hooks/useSetupQuests";
import { Skeleton } from "@/components/ui/skeleton";

interface SetupQuestsCardProps {
  quests: QuestStep[];
  completedCount: number;
  totalCount: number;
  isLoading: boolean;
  onQuestTap: (questId: QuestStep["id"]) => void;
}

const RING_SIZE = 48;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const progress = total > 0 ? completed / total : 0;
  const offset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="relative flex items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={RING_STROKE}
        />
        <motion.circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-xs font-bold text-foreground">
        {completed}/{total}
      </span>
    </div>
  );
}

function QuestRow({ quest, onTap, justCompleted }: { quest: QuestStep; onTap: () => void; justCompleted: boolean }) {
  return (
    <motion.button
      onClick={quest.completed ? undefined : onTap}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors ${
        quest.completed
          ? "bg-primary/[0.06] opacity-60 cursor-default"
          : "bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer border border-white/[0.06]"
      }`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={
        justCompleted
          ? {
              opacity: [1, 1, 1, 0],
              scale: [1, 1, 1.08, 0.6],
              x: [0, -4, 4, -3, 3, 0, 0, 0],
              y: [0, 0, 0, -10],
            }
          : { opacity: 1, y: 0 }
      }
      exit={{ opacity: 0, scale: 0.6, y: -10, transition: { duration: 0.3 } }}
      transition={
        justCompleted
          ? { duration: 0.8, ease: "easeInOut", times: [0, 0.4, 0.7, 1] }
          : { duration: 0.25 }
      }
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
        style={{ background: "hsl(var(--muted) / 0.3)" }}
      >
        <span className="text-sm">{quest.icon}</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{quest.label}</p>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
          {quest.description}
        </p>
      </div>

      {/* Arrow */}
      {!quest.completed && (
        <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
          <ChevronDown className="h-3 w-3 text-primary rotate-[-90deg]" />
        </div>
      )}
    </motion.button>
  );
}

function SetupQuestsCardInner({ quests, completedCount, totalCount, isLoading, onQuestTap }: SetupQuestsCardProps) {
  const { minimized, toggle } = useSetupQuestsMinimized();

  // Track which quests just completed so we can animate them out
  const prevCompleted = useRef<Set<string>>(new Set(quests.filter(q => q.completed).map(q => q.id)));
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevCompleted.current;
    const newlyDone = quests.filter(q => q.completed && !prev.has(q.id)).map(q => q.id);
    if (newlyDone.length > 0) {
      setAnimatingOut(new Set(newlyDone));
      // After animation, hide them
      const timer = setTimeout(() => {
        setHidden(h => {
          const next = new Set(h);
          newlyDone.forEach(id => next.add(id));
          return next;
        });
        setAnimatingOut(new Set());
      }, 850);
      prevCompleted.current = new Set(quests.filter(q => q.completed).map(q => q.id));
      return () => clearTimeout(timer);
    }
    prevCompleted.current = new Set(quests.filter(q => q.completed).map(q => q.id));
  }, [quests]);

  const handleQuestTap = useCallback(
    (id: QuestStep["id"]) => onQuestTap(id),
    [onQuestTap]
  );

  const visibleQuests = quests.filter(q => !hidden.has(q.id) || animatingOut.has(q.id));

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-card/80 backdrop-blur-xl p-5 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.section
      className="rounded-2xl border border-white/[0.08] bg-card/80 backdrop-blur-xl overflow-hidden"
      layout
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header — always visible */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 p-4 pb-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <ProgressRing completed={completedCount} total={totalCount} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Set Up Your Scene
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {completedCount === 0
              ? "Complete these to unlock your stats"
              : `${completedCount} of ${totalCount} complete — unlock your stats`}
          </p>
        </div>
        {minimized ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Quest rows — collapsible */}
      <AnimatePresence initial={false}>
        {!minimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1.5">
              <AnimatePresence mode="popLayout">
                {visibleQuests.map((quest) => (
                  <QuestRow
                    key={quest.id}
                    quest={quest}
                    onTap={() => handleQuestTap(quest.id)}
                    justCompleted={animatingOut.has(quest.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

const SetupQuestsCard = memo(SetupQuestsCardInner);
export default SetupQuestsCard;
