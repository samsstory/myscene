import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

export type TimeFilter = "all" | "week" | "month" | "later";

export const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "later", label: "Later" },
];

export default function TimeFilterDropdown({ value, onChange }: { value: TimeFilter; onChange: (v: TimeFilter) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-white/50 hover:text-white/70 bg-white/[0.06] border border-white/[0.08] transition-all"
      >
        {TIME_OPTIONS.find(o => o.value === value)?.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-lg border border-white/[0.12] bg-[hsl(var(--background))] shadow-lg py-1 min-w-[120px]">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors ${
                value === opt.value
                  ? "text-primary bg-primary/10"
                  : "text-foreground/70 hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
