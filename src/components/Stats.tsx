import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, Music, MapPin, TrendingUp, Activity, Trophy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Mock stats - will be calculated from real data
const mockStats = {
  showsThisYear: 12,
  showsThisMonth: 3,
  mostSeenArtist: "Arctic Monkeys",
  mostSeenArtistCount: 4,
  mostVisitedVenue: "Madison Square Garden",
  mostVisitedVenueCount: 3,
  userPercentile: 85,
  distanceDanced: "2.4 miles",
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  gradient?: string;
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleShare = () => {
    toast.success("Sharing feature coming soon! 📸");
  };

  return (
    <div 
      className="perspective-1000 cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={cn(
        "relative w-full h-48 transition-transform duration-500 transform-style-3d",
        isFlipped && "rotate-y-180"
      )}>
        {/* Front */}
        <Card className={cn(
          "absolute inset-0 backface-hidden border-border/50 overflow-hidden",
          "hover:shadow-glow transition-all duration-300",
          gradient || "bg-gradient-to-br from-card via-card to-card/80"
        )}>
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </h3>
              <Icon className="h-8 w-8 text-primary/80" />
            </div>
            <div>
              <div className="text-5xl font-black bg-gradient-primary bg-clip-text text-transparent mb-2">
                {value}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="text-xs text-muted-foreground/60 flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              Tap to share
            </div>
          </CardContent>
        </Card>

        {/* Back */}
        <Card className="absolute inset-0 backface-hidden rotate-y-180 border-border/50 bg-gradient-to-br from-primary/20 via-card to-secondary/20">
          <CardContent className="p-6 h-full flex flex-col justify-center items-center gap-4">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-center text-sm text-muted-foreground">
              Share this stat to your story
            </p>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="w-full shadow-glow"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share to Instagram
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Stats = () => {
  const [showSharePreview, setShowSharePreview] = useState(false);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black bg-gradient-primary bg-clip-text text-transparent">
            Your Stats
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Your concert journey, by the numbers</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          Updated daily
        </Badge>
      </div>

      {/* Activity Rank Badge - Celebratory */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 via-primary/20 to-secondary/20 border border-primary/30">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent animate-pulse" />
        <CardContent className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Trophy className="h-16 w-16 text-accent animate-bounce" />
              <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Activity Rank
              </div>
              <div className="text-5xl font-black bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
                Top {100 - mockStats.userPercentile}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                More active than {mockStats.userPercentile}% of users! 🎉
              </p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <StatCard
          title="Shows This Year"
          value={mockStats.showsThisYear}
          icon={Activity}
          gradient="bg-gradient-to-br from-primary/20 via-card to-card"
        />
        <StatCard
          title="Shows This Month"
          value={mockStats.showsThisMonth}
          icon={Music}
          gradient="bg-gradient-to-br from-secondary/20 via-card to-card"
        />
        <StatCard
          title="Most Seen Artist"
          value={mockStats.mostSeenArtist}
          subtitle={`${mockStats.mostSeenArtistCount} shows`}
          icon={Music}
          gradient="bg-gradient-to-br from-accent/20 via-card to-card"
        />
        <StatCard
          title="Favorite Venue"
          value={mockStats.mostVisitedVenue}
          subtitle={`${mockStats.mostVisitedVenueCount} visits`}
          icon={MapPin}
          gradient="bg-gradient-to-br from-primary/20 via-card to-secondary/10"
        />
        <StatCard
          title="Distance Danced"
          value={mockStats.distanceDanced}
          subtitle="Estimated from show duration"
          icon={Activity}
          gradient="bg-gradient-to-br from-secondary/20 via-card to-accent/10"
        />
      </div>

      {/* Share All Stats */}
      <Card className="border-primary/30 shadow-glow overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-secondary opacity-10" />
        <CardContent className="relative p-8 text-center">
          <div className="mb-4">
            <Share2 className="h-12 w-12 mx-auto text-primary mb-3" />
            <h3 className="text-2xl font-bold mb-2">Share Your Story</h3>
            <p className="text-muted-foreground">
              Create a stunning visual of your concert journey to share on Instagram
            </p>
          </div>
          <Button 
            size="lg" 
            className="w-full md:w-auto shadow-glow text-lg font-bold"
            onClick={() => {
              setShowSharePreview(!showSharePreview);
              toast.success("Generating your share card! 📸");
            }}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Generate Share Card
          </Button>
          
          {showSharePreview && (
            <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 animate-scale-in">
              <p className="text-sm text-muted-foreground mb-3">Preview</p>
              <div className="bg-background/50 backdrop-blur rounded-lg p-6 space-y-3">
                <div className="text-4xl font-black bg-gradient-primary bg-clip-text text-transparent">
                  {mockStats.showsThisYear} Shows
                </div>
                <div className="text-2xl font-bold text-foreground">
                  Top {100 - mockStats.userPercentile}% Most Active
                </div>
                <div className="text-lg text-muted-foreground">
                  {mockStats.mostSeenArtist} • {mockStats.mostVisitedVenue}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Stats;
