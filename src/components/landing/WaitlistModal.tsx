import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WaitlistPhoneInput from "./WaitlistPhoneInput";

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

const WaitlistModal = ({ open, onOpenChange, source = "modal" }: WaitlistModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Join the Waitlist
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center pt-1">
            Be among the first to experience Scene
          </p>
        </DialogHeader>
        
        <div className="py-4">
          <WaitlistPhoneInput 
            source={source} 
            onSuccess={() => onOpenChange(false)} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WaitlistModal;
