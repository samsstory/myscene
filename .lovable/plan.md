
# Plan: Context-Aware Navigation Button with Toggle Behavior

## Overview

Replace the multi-part breadcrumb (`World > USA > Los Angeles`) with a single context-aware button that:
- Shows the current location name
- Clicking navigates "up" one level
- At World level, clicking navigates back "down" to the last viewed country/city

---

## Design

### Button States and Behavior

| Current View | Button Display | Click Action |
|--------------|----------------|--------------|
| World (no history) | `🌍 World` | No action (disabled/static) |
| World (has history) | `🌍 World` | Navigate to last country |
| Country (e.g., USA) | `← USA` | Navigate to World |
| City (e.g., Los Angeles) | `← Los Angeles` | Navigate to USA (country level) |

### Visual Design
- Compact pill-shaped button with glassmorphism styling
- Arrow icon (←) when there's a "back" action
- Globe icon (🌍) when at World level
- Smooth hover/active states matching existing UI

---

## Implementation

### 1. Add Navigation History State

Add state to remember the last visited country and city in `MapView.tsx`:

```typescript
// Existing state
const [viewLevel, setViewLevel] = useState<'country' | 'city' | 'venue'>('country');
const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
const [selectedCity, setSelectedCity] = useState<string | null>(null);

// NEW: History state for "drill back down" functionality
const [lastCountry, setLastCountry] = useState<string | null>(null);
const [lastCity, setLastCity] = useState<string | null>(null);
```

### 2. Update Navigation Logic

Modify `handleBreadcrumbNavigate` to save history before navigating up:

```typescript
const handleNavButtonClick = () => {
  if (viewLevel === 'venue') {
    // At venue level: go back to city level
    setViewLevel('city');
    setVenueData([]);
    setSelectedCity(null);
    setHoveredVenue(null);
  } else if (viewLevel === 'city') {
    // At city level: save current country, go to world
    setLastCountry(selectedCountry);
    setLastCity(null); // Clear city history when going to world
    setViewLevel('country');
    setSelectedCountry(null);
    setCityData([]);
    setHoveredCity(null);
  } else if (viewLevel === 'country' && lastCountry) {
    // At world level with history: drill back to last country
    handleCountryClick(lastCountry);
  }
  // At world level without history: do nothing
};
```

Also update city selection to save the city name for potential re-drill:

```typescript
// When user clicks a city, save it to history
const handleCityClick = (cityName: string) => {
  setLastCity(cityName);
  // ... existing city click logic
};
```

### 3. Replace MapBreadcrumb Component

Simplify `MapBreadcrumb.tsx` to a single button:

```typescript
import { ArrowLeft, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapNavButtonProps {
  viewLevel: 'country' | 'city' | 'venue';
  selectedCountry: string | null;
  selectedCity: string | null;
  hasHistory: boolean;
  onClick: () => void;
}

const MapNavButton = ({ 
  viewLevel, 
  selectedCountry, 
  selectedCity, 
  hasHistory,
  onClick 
}: MapNavButtonProps) => {
  // Determine button text and icon
  const getButtonContent = () => {
    if (viewLevel === 'venue' && selectedCity) {
      return { icon: ArrowLeft, text: selectedCity };
    }
    if (viewLevel === 'city' && selectedCountry) {
      return { icon: ArrowLeft, text: selectedCountry };
    }
    // World level
    return { icon: Globe, text: 'World' };
  };

  const { icon: Icon, text } = getButtonContent();
  const isClickable = viewLevel !== 'country' || hasHistory;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
        "backdrop-blur-xl bg-black/40 border border-white/10",
        isClickable 
          ? "hover:bg-black/60 hover:scale-105 active:scale-95 cursor-pointer" 
          : "opacity-60 cursor-default"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{text}</span>
    </button>
  );
};

export default MapNavButton;
```

### 4. Update MapView Integration

Replace the breadcrumb usage in `MapView.tsx`:

```typescript
{/* Navigation button */}
<div className="absolute top-4 left-4 z-10">
  <MapNavButton
    viewLevel={viewLevel}
    selectedCountry={selectedCountry}
    selectedCity={selectedCity}
    hasHistory={!!lastCountry}
    onClick={handleNavButtonClick}
  />
</div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/map/MapBreadcrumb.tsx` | Replace with simplified `MapNavButton` component |
| `src/components/MapView.tsx` | Add history state, update navigation logic, update component usage |

---

## User Experience Flow

```text
Starting at World View:
┌─────────────────┐
│ 🌍 World        │  ← Button is static (no history yet)
└─────────────────┘

User clicks USA dot → drills into country:
┌─────────────────┐
│ ← USA           │  ← Click to go back to World
└─────────────────┘

User clicks Los Angeles dot → drills into city:
┌─────────────────┐
│ ← Los Angeles   │  ← Click to go back to USA
└─────────────────┘

User clicks back → returns to USA level:
┌─────────────────┐
│ ← USA           │  ← Click to go back to World
└─────────────────┘

User clicks back → returns to World:
┌─────────────────┐
│ 🌍 World        │  ← Now clickable! (has USA in history)
└─────────────────┘

User clicks World button → drills back to USA:
┌─────────────────┐
│ ← USA           │  ← Right back where they were
└─────────────────┘
```

---

## Technical Notes

- History is stored in component state, so it resets when leaving the Globe view
- Only the most recent country is remembered (not a full navigation stack)
- The button at World level with history acts as a "re-enter" shortcut
- Matches the existing glassmorphism styling of other map UI elements
