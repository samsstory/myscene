import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music2, MapPin, Calendar } from "lucide-react";

// Mock data - will be replaced with real data from Supabase
const mockShows = [
  {
    id: "1",
    artists: [{ name: "Arctic Monkeys", isHeadliner: true }],
    venue: { name: "Madison Square Garden", location: "New York, NY" },
    date: "2024-03-15",
    rating: 5,
  },
  {
    id: "2",
    artists: [
      { name: "The Strokes", isHeadliner: true },
      { name: "Wallows", isHeadliner: false },
    ],
    venue: { name: "The Forum", location: "Los Angeles, CA" },
    date: "2024-02-28",
    rating: 4,
  },
  {
    id: "3",
    artists: [{ name: "Tame Impala", isHeadliner: true }],
    venue: { name: "Red Rocks Amphitheatre", location: "Morrison, CO" },
    date: "2024-01-20",
    rating: 5,
  },
];

const getRatingEmoji = (rating: number) => {
  const emojis = ["😞", "😕", "😐", "😊", "🤩"];
  return emojis[rating - 1] || "😐";
};

const Feed = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Show History</h2>
        <Badge variant="secondary" className="text-sm">
          {mockShows.length} shows
        </Badge>
      </div>

      {mockShows.length === 0 ? (
        <Card className="border-border shadow-card">
          <CardContent className="py-16 text-center">
            <Music2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No shows yet</h3>
            <p className="text-muted-foreground">
              Start logging your concert experiences!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {mockShows.map((show) => (
            <Card
              key={show.id}
              className="border-border shadow-card hover:shadow-glow transition-all duration-300 group"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Music2 className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {show.artists
                            .filter((a) => a.isHeadliner)
                            .map((a) => a.name)
                            .join(", ")}
                        </h3>
                      </div>
                      {show.artists.filter((a) => !a.isHeadliner).length > 0 && (
                        <p className="text-sm text-muted-foreground ml-7">
                          with{" "}
                          {show.artists
                            .filter((a) => !a.isHeadliner)
                            .map((a) => a.name)
                            .join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-7">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{show.venue.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(show.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-4xl ml-4">{getRatingEmoji(show.rating)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed;
