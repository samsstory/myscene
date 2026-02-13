import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ApproveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waitlistEntry: {
    id: string;
    email?: string;
    phone_number: string;
    country_code: string;
  } | null;
  onApproved: () => void;
}

export function ApproveModal({ open, onOpenChange, waitlistEntry, onApproved }: ApproveModalProps) {
  const [loading, setLoading] = useState(false);

  const email = waitlistEntry?.email;

  const handleApprove = async () => {
    if (!waitlistEntry || !email) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-waitlist`,
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
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to approve");
      }

      const notifiedMsg = result.notified ? " Welcome email sent." : "";
      toast({ title: "User approved", description: `Account created for ${email}.${notifiedMsg}` });
      onOpenChange(false);
      onApproved();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Approve Waitlist Entry</DialogTitle>
          <DialogDescription>
            Create a beta account for <span className="font-medium text-foreground">{email || waitlistEntry?.phone_number}</span> and send them a welcome email with login credentials?
          </DialogDescription>
        </DialogHeader>
        {!email && (
          <p className="text-sm text-destructive">
            This entry has no email address. Cannot create an account without one.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={loading || !email}>
            {loading ? "Creating..." : "Approve & Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
