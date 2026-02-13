import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

// The demo user ID - this is the user whose data we'll display in demo mode
// This bypasses auth and uses RLS policies that allow public read access to this user's data
export const DEMO_USER_ID = "da422baa-3f54-4fac-88bb-5137bc085ddc";

// Type for demo-created shows (matches the Show interface used in DemoHome)
export interface DemoLocalShow {
  id: string;
  artists: { name: string; isHeadliner: boolean }[];
  venue: {
    name: string;
    location: string;
  };
  date: string;
  rating?: number | null;
  datePrecision?: string;
  tags?: string[];
  notes?: string | null;
  venueId?: string | null;
  photo_url?: string | null;
  isLocalDemo?: boolean;
}

interface DemoContextValue {
  isDemoMode: boolean;
  demoUserId: string;
  demoLocalShows: DemoLocalShow[];
  addDemoShow: (show: DemoLocalShow) => void;
  addDemoShows: (shows: DemoLocalShow[]) => void;
  clearDemoShows: () => void;
  getDemoShowCount: () => number;
}

const DemoContext = createContext<DemoContextValue | null>(null);

interface DemoProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

const MAX_DEMO_SHOWS = 5; // Limit demo shows to encourage signup

export const DemoProvider = ({ children, enabled = false }: DemoProviderProps) => {
  const [demoLocalShows, setDemoLocalShows] = useState<DemoLocalShow[]>([]);

  // Cleanup blob URLs when component unmounts or shows are cleared
  useEffect(() => {
    return () => {
      demoLocalShows.forEach(show => {
        if (show.photo_url?.startsWith('blob:')) {
          URL.revokeObjectURL(show.photo_url);
        }
      });
    };
  }, []);

  const addDemoShow = useCallback((show: DemoLocalShow) => {
    setDemoLocalShows(prev => {
      if (prev.length >= MAX_DEMO_SHOWS) {
        return prev; // Don't add more if at limit
      }
      return [{ ...show, isLocalDemo: true }, ...prev];
    });
  }, []);

  const addDemoShows = useCallback((shows: DemoLocalShow[]) => {
    setDemoLocalShows(prev => {
      const remaining = MAX_DEMO_SHOWS - prev.length;
      if (remaining <= 0) return prev;
      
      const showsToAdd = shows.slice(0, remaining).map(s => ({ ...s, isLocalDemo: true }));
      return [...showsToAdd, ...prev];
    });
  }, []);

  const clearDemoShows = useCallback(() => {
    // Revoke blob URLs before clearing
    demoLocalShows.forEach(show => {
      if (show.photo_url?.startsWith('blob:')) {
        URL.revokeObjectURL(show.photo_url);
      }
    });
    setDemoLocalShows([]);
  }, [demoLocalShows]);

  const getDemoShowCount = useCallback(() => demoLocalShows.length, [demoLocalShows]);

  return (
    <DemoContext.Provider 
      value={{ 
        isDemoMode: enabled, 
        demoUserId: DEMO_USER_ID,
        demoLocalShows,
        addDemoShow,
        addDemoShows,
        clearDemoShows,
        getDemoShowCount,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemoMode = (): DemoContextValue => {
  const context = useContext(DemoContext);
  // Default to non-demo mode if not wrapped in provider
  if (!context) {
    return { 
      isDemoMode: false, 
      demoUserId: DEMO_USER_ID,
      demoLocalShows: [],
      addDemoShow: () => {},
      addDemoShows: () => {},
      clearDemoShows: () => {},
      getDemoShowCount: () => 0,
    };
  }
  return context;
};
