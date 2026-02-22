/** Minimal artist shape used across bulk-upload and simple components */
export interface BaseArtist {
  name: string;
  isHeadliner: boolean;
}

/** Full artist with optional Spotify metadata */
export interface Artist extends BaseArtist {
  imageUrl?: string;
  spotifyId?: string;
}

/** Canonical show model used throughout the app */
export interface Show {
  id: string;
  artists: Artist[];
  venue: {
    name: string;
    location: string;
  };
  date: string;
  datePrecision?: string | null;
  tags?: string[];
  notes?: string | null;
  venueId?: string | null;
  latitude?: number;
  longitude?: number;
  photo_url?: string | null;
  photo_declined?: boolean;
  eventName?: string | null;
  eventDescription?: string | null;
  showType?: string;
  /** Only present on local demo shows */
  isLocalDemo?: boolean;
}

/** ELO ranking data for a show */
export interface ShowRanking {
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}

/** Computed rank position info */
export interface RankInfo {
  position: number | null;
  total: number;
  comparisonsCount: number;
}
