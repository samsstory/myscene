import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotesQuoteCardProps {
  notes: string | null | undefined;
}

export const NotesQuoteCard = ({ notes }: NotesQuoteCardProps) => {
  if (!notes) return null;

  return (
    <div 
      className={cn(
        "rounded-xl p-4",
        "bg-white/[0.03] backdrop-blur-sm",
        "border border-white/[0.08]"
      )}
    >
      <div className="flex items-start gap-3">
        <Quote className="h-5 w-5 text-white/30 flex-shrink-0 mt-0.5 rotate-180" />
        <div className="flex-1">
          <p 
            className="text-sm font-medium uppercase tracking-[0.15em] text-white/40 mb-2"
            style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
          >
            My Take
          </p>
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
            {notes}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotesQuoteCard;
