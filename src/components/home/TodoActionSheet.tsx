import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight, ArrowUpDown, UserCircle, Tag, Camera } from "lucide-react";

interface TodoStats {
  profileIncomplete: boolean;
  unrankedCount: number;
  incompleteTagsCount: number;
  missingPhotosCount: number;
}

interface TodoActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: TodoStats;
  onCompleteProfile: () => void;
  onRankShows: () => void;
  onFixTags: () => void;
  onFixPhotos: () => void;
}

export default function TodoActionSheet({
  open,
  onOpenChange,
  stats,
  onCompleteProfile,
  onRankShows,
  onFixTags,
  onFixPhotos,
}: TodoActionSheetProps) {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-left text-lg font-bold">Things to do</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 mt-4 pb-4">
          {stats.profileIncomplete && (
            <TodoRow
              icon={<UserCircle className="h-4 w-4 text-primary" />}
              label="Complete your profile"
              onClick={() => { close(); onCompleteProfile(); }}
            />
          )}
          {stats.unrankedCount > 0 && (
            <TodoRow
              icon={<ArrowUpDown className="h-4 w-4 text-primary" />}
              label={`${stats.unrankedCount} ${stats.unrankedCount === 1 ? 'show' : 'shows'} to rank`}
              onClick={() => { close(); onRankShows(); }}
            />
          )}
          {stats.incompleteTagsCount > 0 && (
            <TodoRow
              icon={<Tag className="h-4 w-4 text-primary" />}
              label={`${stats.incompleteTagsCount} ${stats.incompleteTagsCount === 1 ? 'show needs' : 'shows need'} highlights`}
              onClick={() => { close(); onFixTags(); }}
            />
          )}
          {stats.missingPhotosCount > 0 && (
            <TodoRow
              icon={<Camera className="h-4 w-4 text-primary" />}
              label={`${stats.missingPhotosCount} ${stats.missingPhotosCount === 1 ? 'show needs' : 'shows need'} a photo`}
              onClick={() => { close(); onFixPhotos(); }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TodoRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-white/30" />
    </button>
  );
}
