
# Standardize Bottom Navigation Across Landing Page Mockups

## Overview
Update all phone mockups on the landing page to use the consistent "glass pill + FAB" navigation style shown in the GlobeShowcase. Each mockup will highlight the appropriate navigation item based on its context.

## Navigation Style Reference (from GlobeShowcase)
- **Glass pill**: `bg-white/[0.06] backdrop-blur-md border border-white/[0.08]` containing Home, Globe, Crown icons
- **Active icon**: Primary color with glow effect `filter: drop-shadow(0 0 4px hsl(var(--primary)))`
- **Inactive icons**: `text-white/40`
- **FAB**: Separate circular button with primary background and glow shadow

---

## Changes by Mockup

### 1. RankingSpotlight.tsx - Crown Selected
**File**: `src/components/landing/RankingSpotlight.tsx`

Add bottom navigation with Crown icon highlighted:

```tsx
// Add imports
import { Home, Globe, Crown, Plus } from "lucide-react";

// Add bottom nav after ranking preview
<div className="px-4 py-2.5 flex items-center justify-center gap-4">
  <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
    <Home className="w-4 h-4 text-white/40" />
    <Globe className="w-4 h-4 text-white/40" />
    <Crown
      className="w-4 h-4 text-primary"
      style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }}
    />
  </div>
  <div
    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg"
    style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
  >
    <Plus className="w-4 h-4 text-primary-foreground" />
  </div>
</div>
```

---

### 2. CaptureShowcase.tsx (Rating Screen) - Plus FAB Selected
**File**: `src/components/landing/CaptureShowcase.tsx`

This mockup shows the "Add Show" review process, so the + FAB should be selected/glowing more prominently.

**Changes needed:**
- Move the action buttons (Save to Scene, Share to Instagram) and logged timestamp up into the rating bars area
- Add bottom glass pill nav with + FAB highlighted (more glow, different styling to show "active")

```tsx
// Add imports
import { Home, Globe, Crown, Plus } from "lucide-react";

// Restructured layout:
// 1. Combine rating bars with action context
// 2. Add bottom nav with FAB highlighted

<div className="px-4 py-2.5 flex items-center justify-center gap-4">
  <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
    <Home className="w-4 h-4 text-white/40" />
    <Globe className="w-4 h-4 text-white/40" />
    <Crown className="w-4 h-4 text-white/40" />
  </div>
  {/* FAB with enhanced glow to show "selected" state */}
  <div
    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg ring-2 ring-primary/30"
    style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.6)" }}
  >
    <Plus className="w-4 h-4 text-primary-foreground" />
  </div>
</div>
```

---

### 3. LogShowcase.tsx - Plus FAB Selected
**File**: `src/components/landing/LogShowcase.tsx`

Replace the current simple row of icons with the glass pill + FAB layout, with FAB highlighted.

**Current** (lines 64-75):
```tsx
<div className="px-4 py-2 flex justify-around items-center border-t border-white/10">
  <Home className="w-4 h-4 text-white/40" />
  <Globe className="w-4 h-4 text-white/40" />
  <Crown className="w-4 h-4 text-white/40" />
  <div className="w-6 h-6 rounded-full ...">
    <Plus className="w-3 h-3 text-white" />
  </div>
</div>
```

**New**:
```tsx
<div className="px-4 py-2.5 flex items-center justify-center gap-4">
  <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
    <Home className="w-4 h-4 text-white/40" />
    <Globe className="w-4 h-4 text-white/40" />
    <Crown className="w-4 h-4 text-white/40" />
  </div>
  <div
    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg ring-2 ring-primary/30"
    style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.6)" }}
  >
    <Plus className="w-4 h-4 text-primary-foreground" />
  </div>
</div>
```

---

### 4. LandingHero.tsx - Home Selected
**File**: `src/components/landing/LandingHero.tsx`

Replace the current simple row (lines 122-133) with the glass pill + FAB layout, with Home highlighted.

**Current**:
```tsx
<div className="px-4 py-2 flex justify-around items-center border-t border-white/10">
  <Home className="w-4 h-4 text-primary" style={{ filter: "drop-shadow..." }} />
  <Globe className="w-4 h-4 text-white/40" />
  <Crown className="w-4 h-4 text-white/40" />
  <div className="w-6 h-6 rounded-full bg-primary ...">
    <Plus className="w-3 h-3 text-white" />
  </div>
</div>
```

**New**:
```tsx
<div className="px-4 py-2.5 flex items-center justify-center gap-4">
  <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
    <Home
      className="w-4 h-4 text-primary"
      style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }}
    />
    <Globe className="w-4 h-4 text-white/40" />
    <Crown className="w-4 h-4 text-white/40" />
  </div>
  <div
    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg"
    style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
  >
    <Plus className="w-4 h-4 text-primary-foreground" />
  </div>
</div>
```

---

## Files to Modify

| File | Change | Selected Icon |
|------|--------|---------------|
| `src/components/landing/RankingSpotlight.tsx` | Add glass pill nav + FAB | Crown |
| `src/components/landing/CaptureShowcase.tsx` | Add glass pill nav, move content up | Plus FAB |
| `src/components/landing/LogShowcase.tsx` | Replace simple nav with glass pill + FAB | Plus FAB |
| `src/components/landing/LandingHero.tsx` | Replace simple nav with glass pill + FAB | Home |

**No changes needed:**
- `GlobeShowcase.tsx` - Already has correct styling (Globe selected)
- `ShareExperience.tsx` - Instagram story view, no app nav appropriate

---

## Visual Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    Consistent Nav Layout                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌─────────────────────────┐     ┌──────┐                    │
│    │  🏠    🌐    👑         │     │  +   │                    │
│    │  Glass Pill (3 icons)  │     │ FAB  │                    │
│    └─────────────────────────┘     └──────┘                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Mockup           │ Home │ Globe │ Crown │ FAB                   │
├──────────────────┼──────┼───────┼───────┼───────────────────────┤
│ Hero             │  ●   │       │       │                       │
│ Log              │      │       │       │ ● (ring glow)         │
│ Capture/Rating   │      │       │       │ ● (ring glow)         │
│ Ranking          │      │       │   ●   │                       │
│ Globe            │      │   ●   │       │                       │
└──────────────────┴──────┴───────┴───────┴───────────────────────┘

● = Selected (primary color + glow)
FAB ring glow = ring-2 ring-primary/30 + enhanced boxShadow
```
