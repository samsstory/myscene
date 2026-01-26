import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface SwipeInstructionsProps {
  topShowName: string;
  bottomShowName: string;
}

export const SwipeInstructions = ({ topShowName, bottomShowName }: SwipeInstructionsProps) => {
  return (
    <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" />
        <span className="max-w-[80px] truncate">{bottomShowName}</span>
      </div>
      
      <div className="flex flex-col items-center gap-0.5">
        <ChevronDown className="h-4 w-4" />
        <span>Skip</span>
      </div>
      
      <div className="flex items-center gap-1">
        <span className="max-w-[80px] truncate">{topShowName}</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );
};

export default SwipeInstructions;
