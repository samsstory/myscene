

# Enhanced Globe Showcase - Worldwide Music History with Year Toggle

## Overview
Transform the landing page globe mockup to better showcase a user's global music journey across multiple years, with more geographical diversity and an interactive year timeline.

## Changes

### 1. Year Toggle with Progressive Growth
Display 3 years showing a growing music journey:
- **2024**: 10 cities (starting year)
- **2025**: 15 cities (expanding horizons)
- **2026**: 18 cities (global explorer)

Each year has ~30% unique cities to show clear visual differences when toggling.

### 2. Zoom Out for Global View
**Current**: `zoom: 1.3`
**New**: `zoom: 0.9` 

This shows more of the Earth's curvature and makes the worldwide distribution of markers more impactful.

### 3. City Distribution by Year

**2024 - 10 Cities (Foundation Year)**
```
North America: Los Angeles, New York, Austin, Chicago
Europe: London, Berlin, Amsterdam
Asia: Tokyo
South America: São Paulo
Oceania: Sydney
```

**2025 - 15 Cities (Expanding)**
```
Returning (70%): Los Angeles, New York, London, Berlin, Tokyo, Sydney, São Paulo
+ Austin, Amsterdam, Chicago
New (30%): Paris, Barcelona, Seoul, Buenos Aires, Melbourne
```

**2026 - 18 Cities (Global Explorer)**
```
Returning (70%): New York, Los Angeles, London, Paris, Berlin, Tokyo, Seoul, Sydney, Melbourne, São Paulo, Buenos Aires
New (30%): San Francisco, Toronto, Ibiza, Bangkok, Singapore, Cape Town, Mexico City
```

### 4. Add Year Toggle UI
Horizontal toggle positioned above the stats overlay:
- Display years: 2024, 2025, 2026, "All"
- Active year highlighted with primary cyan color
- Switching years filters which markers are visible
- Smooth fade animation for markers appearing/disappearing

---

## Technical Implementation

### File: `src/components/landing/LandingGlobe.tsx`

**Updated city markers with year data:**
```typescript
const CITY_MARKERS = [
  // === CORE CITIES (appear in all years) ===
  { coordinates: [-73.99, 40.73], count: 4, years: [2024, 2025, 2026] },   // New York
  { coordinates: [-118.24, 34.05], count: 3, years: [2024, 2025, 2026] },  // Los Angeles
  { coordinates: [-0.12, 51.51], count: 3, years: [2024, 2025, 2026] },    // London
  { coordinates: [13.40, 52.52], count: 2, years: [2024, 2025, 2026] },    // Berlin
  { coordinates: [139.69, 35.69], count: 2, years: [2024, 2025, 2026] },   // Tokyo
  { coordinates: [151.21, -33.87], count: 2, years: [2024, 2025, 2026] },  // Sydney
  { coordinates: [-46.63, -23.55], count: 2, years: [2024, 2025, 2026] },  // São Paulo
  
  // === 2024 ONLY ===
  { coordinates: [-97.74, 30.27], count: 2, years: [2024] },               // Austin
  { coordinates: [-87.63, 41.88], count: 1, years: [2024] },               // Chicago
  { coordinates: [4.90, 52.37], count: 1, years: [2024] },                 // Amsterdam
  
  // === 2025+ (new in 2025) ===
  { coordinates: [2.35, 48.85], count: 2, years: [2025, 2026] },           // Paris
  { coordinates: [2.17, 41.39], count: 2, years: [2025, 2026] },           // Barcelona
  { coordinates: [126.98, 37.57], count: 1, years: [2025, 2026] },         // Seoul
  { coordinates: [-58.38, -34.60], count: 1, years: [2025, 2026] },        // Buenos Aires
  { coordinates: [144.96, -37.81], count: 1, years: [2025, 2026] },        // Melbourne
  
  // === 2026 ONLY (new in 2026) ===
  { coordinates: [-122.42, 37.77], count: 2, years: [2026] },              // San Francisco
  { coordinates: [-79.38, 43.65], count: 1, years: [2026] },               // Toronto
  { coordinates: [1.40, 38.91], count: 3, years: [2026] },                 // Ibiza
  { coordinates: [100.50, 13.76], count: 1, years: [2026] },               // Bangkok
  { coordinates: [103.82, 1.35], count: 1, years: [2026] },                // Singapore
  { coordinates: [18.42, -33.93], count: 1, years: [2026] },               // Cape Town
  { coordinates: [-99.13, 19.43], count: 2, years: [2026] },               // Mexico City
];
```

**Add year filtering logic:**
```typescript
interface LandingGlobeProps {
  selectedYear: number | 'all';
}

const LandingGlobe = ({ selectedYear }: LandingGlobeProps) => {
  const filteredMarkers = useMemo(() => {
    if (selectedYear === 'all') return CITY_MARKERS;
    return CITY_MARKERS.filter(m => m.years.includes(selectedYear));
  }, [selectedYear]);
  
  // Update GeoJSON source when year changes
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('city-markers');
    if (source && 'setData' in source) {
      source.setData(createGeoJSON(filteredMarkers));
    }
  }, [selectedYear, filteredMarkers]);
};
```

**Reduce zoom level:**
```typescript
const map = new mapboxgl.Map({
  // ...
  zoom: 0.9,  // Was 1.3
});
```

### File: `src/components/landing/GlobeShowcase.tsx`

**Add year toggle and dynamic stats:**
```typescript
const YEARS = [2024, 2025, 2026, 'all'] as const;

const GlobeMockup = () => {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  
  const yearStats = useMemo(() => {
    const markers = selectedYear === 'all' 
      ? CITY_MARKERS 
      : CITY_MARKERS.filter(m => m.years.includes(selectedYear));
    
    const shows = markers.reduce((sum, m) => sum + m.count, 0);
    const cities = markers.length;
    // Derive countries from coordinates
    const countries = new Set(markers.map(m => getCountryFromCoords(m.coordinates))).size;
    
    return { shows, cities, countries };
  }, [selectedYear]);

  return (
    <div className="h-full w-full bg-background flex flex-col">
      {/* ... header ... */}
      
      <div className="flex-1 relative min-h-0">
        <LandingGlobe selectedYear={selectedYear} />

        {/* Year Toggle */}
        <div className="absolute top-3 left-3 right-3">
          <div className="flex justify-center gap-1">
            {YEARS.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "px-2 py-1 text-xs rounded-full transition-all",
                  selectedYear === year
                    ? "bg-primary text-primary-foreground"
                    : "bg-black/40 text-white/60 backdrop-blur-sm"
                )}
              >
                {year === 'all' ? 'All' : year}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Stats */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-black/60 backdrop-blur-md rounded-xl p-3">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <span className="text-white font-bold text-lg">{yearStats.countries}</span>
                <p className="text-white/50 text-[10px]">countries</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="text-white font-bold text-lg">{yearStats.cities}</span>
                <p className="text-white/50 text-[10px]">cities</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <span className="text-white font-bold text-lg">{yearStats.shows}</span>
                <p className="text-white/50 text-[10px]">shows</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## Visual Summary

```
Year Toggle Behavior:

┌──────────────────────────────────────────────────┐
│  2024 (10 cities)    2025 (15 cities)    2026 (18 cities)
│  ─────────────────   ─────────────────   ─────────────────
│  New York ●          New York ●          New York ●
│  Los Angeles ●       Los Angeles ●       Los Angeles ●
│  London ●            London ●            London ●
│  Berlin ●            Berlin ●            Berlin ●
│  Tokyo ●             Tokyo ●             Tokyo ●
│  Sydney ●            Sydney ●            Sydney ●
│  São Paulo ●         São Paulo ●         São Paulo ●
│  Austin ●            Paris ●             Paris ●
│  Chicago ●           Barcelona ●         Barcelona ●
│  Amsterdam ●         Seoul ●             Seoul ●
│                      Buenos Aires ●      Buenos Aires ●
│                      Melbourne ●         Melbourne ●
│                      Austin ●            San Francisco ●
│                      Chicago ●           Toronto ●
│                      Amsterdam ●         Ibiza ●
│                                          Bangkok ●
│                                          Singapore ●
│                                          Cape Town ●
│                                          Mexico City ●
└──────────────────────────────────────────────────┘

Stats update dynamically:
2024: 5 countries | 10 cities | ~20 shows
2025: 7 countries | 15 cities | ~32 shows  
2026: 10 countries | 18 cities | ~42 shows
All:  10 countries | 22 cities | ~47 shows
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/landing/LandingGlobe.tsx` | Add selectedYear prop, update markers with years array, decrease zoom to 0.9, filter GeoJSON on year change |
| `src/components/landing/GlobeShowcase.tsx` | Add year toggle UI (2024, 2025, 2026, All), manage selectedYear state, calculate dynamic stats per year |

