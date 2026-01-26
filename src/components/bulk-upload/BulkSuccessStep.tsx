import { CheckCircle2, PartyPopper, Plus, Instagram, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BulkSuccessStepProps {
  addedCount: number;
  onAddMore: () => void;
  onDone: () => void;
  onViewFeed: () => void;
  onRank: () => void;
}

const BulkSuccessStep = ({ addedCount, onAddMore, onDone, onViewFeed, onRank }: BulkSuccessStepProps) => {
  return (
    <div className="text-center space-y-6 py-8">
      {/* Success icon */}
      <div className="relative inline-block">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <PartyPopper className="absolute -top-2 -right-2 h-8 w-8 text-yellow-500 animate-bounce" />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          {addedCount} show{addedCount !== 1 ? 's' : ''} added!
        </h2>
        <p className="text-muted-foreground">
          Don't forget to share your memories and review on Instagram.
        </p>
      </div>

      {/* Action Cards */}
      <div className="space-y-3 pt-2">
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={onViewFeed}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Share Your Shows</h3>
              <p className="text-sm text-muted-foreground">Create stories and posts from your Feed</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={onRank}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Rank Your Shows</h3>
              <p className="text-sm text-muted-foreground">Compare them against your collection</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4">
        <Button onClick={onAddMore} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add More Shows
        </Button>
        <Button onClick={onDone} className="w-full">
          Done
        </Button>
      </div>
    </div>
  );
};

export default BulkSuccessStep;
