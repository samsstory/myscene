import { useState, useEffect } from "react";
import { Bug, Send } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { BugReportType } from "@/hooks/useBugReportPrompt";

const bugSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Please describe what went wrong")
    .max(2000, "Description must be under 2000 characters"),
});

interface BugReportButtonProps {
  /** Control open state externally (e.g. from BugPromptBanner) */
  externalOpen?: boolean;
  onExternalClose?: () => void;
  prefillDescription?: string;
  errorContext?: Record<string, unknown> | null;
  reportType?: BugReportType;
}

export default function BugReportButton({
  externalOpen,
  onExternalClose,
  prefillDescription,
  errorContext,
  reportType,
}: BugReportButtonProps = {}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync external open
  useEffect(() => {
    if (externalOpen) {
      setDescription(prefillDescription || "");
      setOpen(true);
    }
  }, [externalOpen, prefillDescription]);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      onExternalClose?.();
    }
  };

  const handleSubmit = () => {
    const result = bugSchema.safeParse({ description });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError(null);

    const reportDescription = result.data.description;
    const deviceInfo = {
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      platform: navigator.platform,
      standalone: (navigator as any).standalone ?? window.matchMedia("(display-mode: standalone)").matches,
    };
    const pageUrl = window.location.pathname;
    const userAgent = navigator.userAgent;

    // Optimistic: close immediately, show toast, persist in background
    setDescription("");
    handleOpenChange(false);
    toast.success("Thanks! We're on it.");

    // Fire-and-forget background persist
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase.from("bug_reports" as any).insert({
          user_id: session.user.id,
          description: reportDescription,
          page_url: pageUrl,
          user_agent: userAgent,
          device_info: deviceInfo,
          type: reportType || "manual",
          error_context: errorContext || null,
        } as any);
      } catch {
        // Best-effort
      }
    })();
  };

  return (
    <>
      {/* Bug button — rendered inline, parent controls positioning */}
      <button
        onClick={() => {
          setDescription("");
          setOpen(true);
        }}
        aria-label="Report a bug"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          "backdrop-blur-xl bg-black/40 border border-white/15 shadow-lg",
          "text-white/60 hover:text-primary hover:border-primary/40 transition-all hover:scale-110 active:scale-95"
        )}
      >
        <Bug className="h-4 w-4" />
      </button>

      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="bg-card border-border">
          <DrawerHeader>
            <DrawerTitle className="text-lg">Spotted a bug?</DrawerTitle>
            <DrawerDescription>
              Tell us what went wrong — we'll include your device and page info automatically.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <Textarea
              placeholder="What went wrong?"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (error) setError(null);
              }}
              maxLength={2000}
              rows={4}
              className="resize-none bg-muted/50 border-white/10"
            />
            {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {description.length}/2000
            </p>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} className="gap-2">
              <Send className="h-4 w-4" />
              Send Report
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
