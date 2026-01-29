
# Improve Map View UI with Year Toggle and Stats Pill

This plan adds a year toggle selector and a dynamic stats pill to the Map View (Show Globe) feature to match the design shown on the landing page preview.

---

## What You'll Get

1. **Year Toggle Bar** - Horizontal selector buttons (2024, 2025, 2026, All) positioned at the top of the map
2. **Dynamic Stats Pill** - A compact stats display showing Countries, Cities, Venues, and Shows that updates based on the selected year
3. **Filtered Map Data** - The map markers and data will filter to show only shows from the selected year

---

## Implementation Approach

### 1. Add Year State and Filtering Logic to MapView

- Add `selectedYear` state to track the currently selected year filter ("all" | specific year)
- Calculate the unique years from the user's show data to dynamically populate the toggle options
- Filter shows based on the selected year before processing country/city/venue data

### 2. Create Year Toggle Component

- Position at the top-center of the map (similar to GlobeShowcase mockup)
- Use the same styling from the landing page: rounded pill buttons with active state highlighting
- Include "All" option for viewing all shows across years

### 3. Update Stats Calculation

- The existing `mapStats` useMemo will be updated to filter based on selected year
- Stats will dynamically recalculate when year changes: Countries, Cities, Venues, Shows

### 4. Create Stats Pill Component

- Replace or update the existing `MapStatsCard` component
- Use the compact horizontal pill design from the preview (Countries · Cities · Shows format)
- Position below the year toggle, centered

### 5. Remove Old Stats Card

- The existing bottom-right positioned `MapStatsCard` will be removed or repurposed
- The new stats will be integrated into the top overlay area

---

## Technical Details

### Files to Create
- `src/components/map/MapYearToggle.tsx` - New component for year selection buttons

### Files to Modify
- `src/components/MapView.tsx` - Add year state, filtering logic, and integrate new components
- `src/components/map/MapStatsCard.tsx` - Restyle to match the compact horizontal pill design from the preview

### Data Flow
```text
User's Shows (from props)
    ↓
Extract Unique Years → Populate Year Toggle Options
    ↓
Filter Shows by Selected Year
    ↓
Calculate Stats (Countries, Cities, Venues, Shows)
    ↓
Display in Stats Pill
    ↓
Process Country/City Data for Map Markers
```

### Key Logic Changes

1. **Year Extraction**:
   - Parse `show.date` to extract years from user's actual show data
   - Sort years descending (newest first)
   - Add "All" option at the end

2. **Show Filtering**:
   - Filter `shows` prop before processing country/city groupings
   - When year is "all", use all shows
   - When specific year is selected, filter to shows matching that year

3. **Stats Recalculation**:
   - The `mapStats` useMemo dependency array will include `selectedYear`
   - All derived data (countryData, cityData) will use filtered shows

### Styling

- Year toggle pills: `bg-white/[0.04] text-white/50` (inactive), `bg-primary text-primary-foreground` (active)
- Stats pill: `bg-white/[0.03] backdrop-blur-sm` with subtle separator dots
- Positioned in a centered column layout at the top of the map

---

## Expected Result

The Map View will have a cohesive header overlay containing:
- Year toggle buttons matching the user's actual show years plus "All"
- Dynamic stats that update instantly when switching years
- Clean, minimal glass-morphism styling matching the landing page preview
