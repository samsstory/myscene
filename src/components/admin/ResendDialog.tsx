import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getStoredTemplate } from "./EmailTemplateEditor";

interface ResendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waitlistEntry: {
    id: string;
    email?: string | null;
    phone_number: string;
    country_code: string;
  } | null;
  onSent: () => void;
}

export function ResendDialog({ open, onOpenChange, waitlistEntry, onSent }: ResendDialogProps) {
  const stored = getStoredTemplate();
  const [email, setEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState(stored.resendSubject);
  const [emailBody, setEmailBody] = useState(stored.resendBody);
  const [loading, setLoading] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    if (waitlistEntry?.email) setEmail(waitlistEntry.email);
  }, [waitlistEntry]);

  const handleSend = async () => {
    if (!waitlistEntry || !email) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            waitlistId: waitlistEntry.id,
            email,
            emailSubject,
            emailBody,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send");
      toast({ title: "Email sent", description: `Notification sent to ${email}` });
      const fresh = getStoredTemplate();
      setEmail("");
      setEmailSubject(fresh.resendSubject);
      setEmailBody(fresh.resendBody);
      setCustomizeOpen(false);
      onOpenChange(false);
      onSent();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Welcome Email</DialogTitle>
          <DialogDescription>
            Send notification to {waitlistEntry?.email || waitlistEntry?.phone_number}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="resend-email">Email Address</Label>
            <Input
              id="resend-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Collapsible open={customizeOpen} onOpenChange={setCustomizeOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                Customize Email
                <ChevronDown className={`h-4 w-4 transition-transform ${customizeOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label htmlFor="resend-subject">Subject</Label>
                <Input
                  id="resend-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resend-body">Body</Label>
                <Textarea
                  id="resend-body"
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{"{{email}}"}</code> as a placeholder.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={loading || !email}>
            {loading ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
