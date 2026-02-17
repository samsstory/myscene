import { useState } from "react";
import { Bug, Send, Loader2 } from "lucide-react";
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

const bugSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Please describe what went wrong")
    .max(2000, "Description must be under 2000 characters"),
});

export default function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const result = bugSchema.safeParse({ description });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You need to be logged in to report a bug.");
      setSubmitting(false);
      return;
    }

    const deviceInfo = {
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      platform: navigator.platform,
      standalone: (navigator as any).standalone ?? window.matchMedia("(display-mode: standalone)").matches,
    };

    const { error: dbError } = await supabase.from("bug_reports" as any).insert({
      user_id: session.user.id,
      description: result.data.description,
      page_url: window.location.pathname,
      user_agent: navigator.userAgent,
      device_info: deviceInfo,
    } as any);

    setSubmitting(false);

    if (dbError) {
      toast.error("Failed to send report. Please try again.");
      return;
    }

    toast.success("Thanks! We're on it.");
    setDescription("");
    setOpen(false);
  };

  return (
    <>
      {/* Floating bug button — bottom-left */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Report a bug"
        className={cn(
          "fixed bottom-8 left-5 z-50 flex h-11 w-11 items-center justify-center rounded-full",
          "backdrop-blur-xl bg-black/40 border border-white/15 shadow-lg",
          "text-white/60 hover:text-primary hover:border-primary/40 transition-all hover:scale-110 active:scale-95"
        )}
      >
        <Bug className="h-4.5 w-4.5" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
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
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
