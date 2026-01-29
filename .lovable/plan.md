

# Hero Phone Mockup Enhancement Plan

## Goal
Transform the hero phone mockup into a polished, authentic representation of the Scene app UI that makes a strong first impression.

---

## Changes Overview

### 1. Keep Odesza
Already present - no change needed.

### 2. Add White Score Badge on Expanded Card
Add a clean white/light score badge (e.g., "9.2") to the Fred again.. expanded card, positioned bottom-left above the artist name.

### 3. No Instagram Icon
Confirmed - will not add IG icon to expanded card.

### 4. Add Rank Badges to Collapsed Cards
Each collapsed card will display rank context on the right side (e.g., "#2 All Time", "#3 All Time").

### 5. Add Photo Background to Collapsed Cards
Match the real app's collapsed state: subtle photo background at 20% opacity behind each collapsed card.

### 6. Remove Hand Styling and Phone Outline
**File: `src/components/landing/PhoneMockup.tsx`**
- Set `showHand={false}` default or remove hand entirely
- Simplify the phone frame to just show the screen content with minimal chrome

**File: `src/components/landing/LandingHero.tsx`**
- Pass `showHand={false}` to PhoneMockup

### 7. Fix Overlap and Z-Index Order
Each card should properly overlap the one below it with descending z-index:

```text
Expanded (Fred again..)  → z-[60]
Odesza                   → z-[50], mt-[-12px]
Mau P                    → z-[40], mt-[-12px]  
Post Malone              → z-[30], mt-[-12px]
The Blaze                → z-[20], mt-[-12px]
T-Pain                   → z-[10], mt-[-12px]
```

Increase negative margin from `-6px` to `-12px` for more pronounced overlap.

### 8. Add Proper Bottom Nav Icons
Replace generic circles with actual icons from lucide-react:
- **Home** icon (active state with primary glow)
- **Globe** icon
- **Crown/Medal** icon (for Rankings)
- **Plus** icon (FAB style)

---

## Updated MockShowCard Structure

```text
┌─────────────────────────────────┐
│ [SCENE ✦]                   [👤]│  ← Header with logo + avatar
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ #1                          │ │  ← Rank badge (top-left)
│ │     [Concert Photo]         │ │
│ │                             │ │
│ │ [9.2]                       │ │  ← White score badge
│ │ Fred again..                │ │  ← Artist name with glow
│ │ Alexandra Palace  SCENE ✦   │ │  ← Venue + watermark
│ └─────────────────────────────┘ │
│ ╔═══════════════════════════════╗ ← Overlaps below
│ ║ Odesza              #2 All   ║ │  ← Photo bg, z-50
│ ╠═══════════════════════════════╣
│ ║ Mau P               #3 All   ║ │  ← z-40
│ ╠═══════════════════════════════╣
│ ║ Post Malone         #4 All   ║ │  ← z-30
│ ╠═══════════════════════════════╣
│ ║ The Blaze           #5 All   ║ │  ← z-20
│ ╠═══════════════════════════════╣
│ ║ T-Pain              #6 All   ║ │  ← z-10
│ ╚═══════════════════════════════╝
├─────────────────────────────────┤
│  [🏠]    [🌐]    [👑]    [➕]  │  ← Bottom nav icons
└─────────────────────────────────┘
```

---

## Technical Implementation

### File 1: `src/components/landing/PhoneMockup.tsx`
- Remove hand illustration entirely (delete lines 21-36)
- Simplify phone frame styling - remove thick bezel, just keep subtle rounded corners
- Remove side buttons for cleaner look

### File 2: `src/components/landing/LandingHero.tsx`

**Import Lucide icons:**
```tsx
import { Home, Globe, Crown, Plus } from "lucide-react";
```

**Expanded Card Updates:**
- Add white score badge: `bg-white/90 text-black font-bold rounded-full px-2 py-0.5 text-xs`

**Collapsed Cards - New Structure:**
```tsx
// Each collapsed card with photo bg and rank
<div className="relative z-[50] mt-[-12px]">
  <div className="relative rounded-xl overflow-hidden bg-white/[0.03] backdrop-blur-sm border border-white/[0.05]">
    {/* Photo background at 20% opacity */}
    <div 
      className="absolute inset-0 bg-cover bg-center opacity-20"
      style={{ backgroundImage: "url('...')" }}
    />
    <div className="relative py-4 px-4 flex items-center justify-between">
      <span className="font-bold text-sm text-white/90">Odesza</span>
      <span className="text-[10px] text-white/50">#2 All Time</span>
    </div>
  </div>
</div>
```

**Bottom Nav:**
```tsx
<div className="px-4 py-3 flex justify-around items-center border-t border-white/10">
  <Home className="w-5 h-5 text-primary" />
  <Globe className="w-5 h-5 text-white/40" />
  <Crown className="w-5 h-5 text-white/40" />
  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
    <Plus className="w-4 h-4 text-white" />
  </div>
</div>
```

---

## Sample Photo URLs for Collapsed Cards

| Artist | Photo |
|--------|-------|
| Odesza | `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80` |
| Mau P | `https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400&q=80` |
| Post Malone | `https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400&q=80` |
| The Blaze | `https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80` |
| T-Pain | `https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80` |

