import React, { useCallback } from "react";
import { Check, SkipForward } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type {
  PendingImport,
  ParsedEmailShow,
} from "@/hooks/usePendingEmailImports";

interface EmailImportReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imports: PendingImport[];
  confirmedIndices: Map<string, Set<number>>;
  onConfirmShow: (importId: string, index: number, show: ParsedEmailShow) => void;
  onConfirmAll: (importId: string) => void;
  onDismiss: (importId: string) => void;
}

const confidenceDot: Record<string, string> = {
  high: "bg-emerald-400",
  medium: "bg-amber-400",
  low: "bg-red-400",
};

const EmailImportReviewSheet = React.memo(function EmailImportReviewSheet({
  open,
  onOpenChange,
  imports,
  confirmedIndices,
  onConfirmShow,
  onConfirmAll,
  onDismiss,
}: EmailImportReviewSheetProps) {
  const totalShows = imports.reduce((s, i) => s + i.parsed_shows.length, 0);

  const handleClose = useCallback(() => {
    // Dismiss any remaining imports on close
    imports.forEach((imp) => {
      const confirmed = confirmedIndices.get(imp.id);
      const allDone = confirmed && confirmed.size >= imp.parsed_shows.length;
      if (!allDone) onDismiss(imp.id);
    });
    onOpenChange(false);
  }, [imports, confirmedIndices, onDismiss, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl bg-background border-t border-white/[0.08] flex flex-col p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <SheetTitle className="text-base font-bold tracking-tight text-foreground">
            Shows from your email
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {totalShows} show{totalShows !== 1 ? "s" : ""} found — review before adding
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {imports.map((imp) => {
            const confirmedSet = confirmedIndices.get(imp.id) || new Set<number>();
            const allConfirmed = confirmedSet.size >= imp.parsed_shows.length;

            return (
              <div key={imp.id} className="space-y-3">
                {imp.email_subject && (
                  <p className="text-xs text-muted-foreground truncate">
                    📧 {imp.email_subject}
                  </p>
                )}

                {imp.parsed_shows.map((show, idx) => {
                  const isConfirmed = confirmedSet.has(idx);

                  return (
                    <div
                      key={`${imp.id}-${idx}`}
                      className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                        isConfirmed
                          ? "border-white/[0.04] bg-white/[0.02] opacity-50"
                          : "border-white/[0.08] bg-white/[0.04]"
                      }`}
                    >
                      {/* Confidence dot */}
                      <span
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          confidenceDot[show.confidence] || confidenceDot.medium
                        }`}
                      />

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {show.artist}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {show.venue}
                          {show.date ? ` · ${show.date}` : ""}
                        </p>
                      </div>

                      {/* Actions */}
                      {isConfirmed ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => onConfirmShow(imp.id, idx, show)}
                          className="flex-shrink-0 rounded-lg bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/25 transition-colors"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Bulk actions */}
                {!allConfirmed && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onConfirmAll(imp.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Add All
                    </button>
                    <button
                      onClick={() => onDismiss(imp.id)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.10] text-muted-foreground text-xs font-medium hover:bg-white/[0.10] transition-colors"
                    >
                      <SkipForward className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Skip
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-white/[0.06]">
          <p className="text-[11px] text-muted-foreground/60 text-center">
            From emails forwarded to your Scene address
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
});

export default EmailImportReviewSheet;
