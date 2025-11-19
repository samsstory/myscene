import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, Music, MapPin, TrendingUp, Activity } from "lucide-react";
import { toast } from "sonner";

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
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
}) => {
  const handleShare = () => {
    toast.success("Sharing feature coming soon! 📸");
  };

  return (
    <Card className="border-border shadow-card hover:shadow-glow transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full"
          onClick={handleShare}
        >
          <Share2 className="h-3 w-3 mr-2" />
          Share
        </Button>
      </CardContent>
    </Card>
  );
};

const Stats = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Stats</h2>
        <Badge variant="secondary" className="text-sm">
          Updated daily
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Shows This Year"
          value={mockStats.showsThisYear}
          icon={Activity}
        />
        <StatCard
          title="Shows This Month"
          value={mockStats.showsThisMonth}
          icon={Music}
        />
        <StatCard
          title="Most Seen Artist"
          value={mockStats.mostSeenArtist}
          subtitle={`${mockStats.mostSeenArtistCount} shows`}
          icon={Music}
        />
        <StatCard
          title="Favorite Venue"
          value={mockStats.mostVisitedVenue}
          subtitle={`${mockStats.mostVisitedVenueCount} visits`}
          icon={MapPin}
        />
        <StatCard
          title="Activity Rank"
          value={`Top ${100 - mockStats.userPercentile}%`}
          subtitle={`More active than ${mockStats.userPercentile}% of users`}
          icon={TrendingUp}
        />
        <StatCard
          title="Distance Danced"
          value={mockStats.distanceDanced}
          subtitle="Estimated from show duration"
          icon={Activity}
        />
      </div>

      <Card className="border-border shadow-card mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Create beautiful story overlays to share your concert journey on Instagram
          </p>
          <Button className="w-full shadow-glow" onClick={() => toast.success("Coming soon! 📸")}>
            Generate Story Image
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stats;
