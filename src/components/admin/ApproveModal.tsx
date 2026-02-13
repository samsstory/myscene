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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ApproveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  waitlistEntry: {
    id: string;
    phone_number: string;
    country_code: string;
  } | null;
  onApproved: () => void;
}

export function ApproveModal({ open, onOpenChange, waitlistEntry, onApproved }: ApproveModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!waitlistEntry || !email || !password) return;
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
            password,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to approve");
      }

      const notifiedMsg = result.notified ? " A welcome email was sent." : "";
      toast({ title: "User approved", description: `Account created for ${email}.${notifiedMsg}` });
      setEmail("");
      setPassword("");
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
            Create an account for {waitlistEntry?.phone_number} ({waitlistEntry?.country_code})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <Input
              id="password"
              type="text"
              placeholder="Temp password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={loading || !email || !password}>
            {loading ? "Creating..." : "Approve & Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
