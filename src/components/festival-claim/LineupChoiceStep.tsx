import { motion } from "framer-motion";
import { Camera, Search, ChevronRight } from "lucide-react";

interface LineupChoiceStepProps {
  onUploadPhoto: () => void;
  onSearchDatabase: () => void;
}

const ChoiceCard = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-center gap-4 rounded-xl border border-white/[0.09] bg-white/[0.05] px-4 py-5 text-left transition-colors hover:bg-white/[0.08] disabled:opacity-50 disabled:pointer-events-none"
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
  </motion.button>
);

const LineupChoiceStep = ({ onUploadPhoto, onSearchDatabase }: LineupChoiceStepProps) => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      How would you like to add your lineup?
    </p>

    <ChoiceCard
      icon={Camera}
      title="Upload Photo"
      subtitle="Snap or upload a lineup poster"
      onClick={onUploadPhoto}
      disabled
    />

    {/* Divider */}
    <div className="flex items-center gap-3">
      <div className="flex-1 border-t border-white/10" />
      <span className="text-xs text-white/30">or</span>
      <div className="flex-1 border-t border-white/10" />
    </div>

    <ChoiceCard
      icon={Search}
      title="Search Database"
      subtitle="Browse festivals we already have on file"
      onClick={onSearchDatabase}
    />

    {/* Coming soon note for upload */}
    <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
      Photo upload coming soon — search works now
    </p>
  </div>
);

export default LineupChoiceStep;
