import { Bell } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import SceneLogo from "@/components/ui/SceneLogo";

const DashboardHeader = () => (
  <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 pt-safe">
    <div className="container mx-auto px-4 py-4 flex items-center justify-between">
      <SceneLogo size="lg" className="text-white" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-white/60" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          No notifications yet
        </TooltipContent>
      </Tooltip>
    </div>
  </header>
);

export default DashboardHeader;
