

# Pill-Shaped Liquid Glass Navigation Bar

## Overview

Transform the current full-width bottom navigation bar into a floating, pill-shaped element with a liquid glass aesthetic, inspired by the Oura app reference image. The styling will match the transparent overlay aesthetic from the PhotoOverlayEditor when opacity is set to zero.

---

## Visual Before/After

```text
CURRENT NAVIGATION:
+------------------------------------------------+
| [Home]        [+ FAB]        [Rank]            |
+------------------------------------------------+
     ^               ^               ^
     |    Full-width bar with solid bg     
     |         border-t at top              

PROPOSED NAVIGATION:
                                            
      +---------------------------+    +---+
      |  [Home]   [+ FAB]  [Rank] |    | + |  <- Option A: FAB inside
      +---------------------------+    +---+
                  OR
      +-------------------+         +-------+
      |  [Home]   [Rank]  |         |   +   | <- Option B: FAB separate
      +-------------------+         +-------+
              ^                          ^
    Floating pill shape           Separate FAB
    Liquid glass aesthetic        Same styling
```

**Recommended: Option B** - Matches Oura reference with separate FAB

---

## Liquid Glass Styling Reference

From the PhotoOverlayEditor (opacity = 0) and MapHoverCard:

```css
/* Liquid Glass Effect */
.nav-pill {
  backdrop-blur-xl       /* Strong blur for glass effect */
  bg-black/40            /* Dark translucent base */
  border border-white/20 /* Subtle light border */
  shadow-2xl             /* Deep shadow for depth */
  rounded-full           /* Pill shape */
}
```

---

## Layout Changes

### Current Structure (Dashboard.tsx lines 110-196):
```jsx
<nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50">
  <div className="container mx-auto px-4">
    <div className="flex items-end justify-center h-16 pb-2 gap-12">
      {/* Home button */}
      {/* FAB with menu */}
      {/* Rank button */}
    </div>
  </div>
</nav>
```

### New Structure:
```jsx
{/* Navigation container - positions elements at bottom */}
<div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center items-end gap-4 px-4">
  
  {/* Pill-shaped nav bar */}
  <nav className="backdrop-blur-xl bg-black/40 border border-white/20 rounded-full px-6 py-3 shadow-2xl">
    <div className="flex items-center gap-8">
      {/* Home button */}
      {/* Rank button */}
    </div>
  </nav>
  
  {/* Floating FAB - separate from pill */}
  <div className="relative">
    {/* FAB Menu Options (when open) */}
    {/* Main FAB button */}
  </div>
  
</div>
```

---

## Styling Details

### Pill Container
| Property | Value | Purpose |
|----------|-------|---------|
| `backdrop-blur-xl` | 24px blur | Strong glass effect |
| `bg-black/40` | 40% opacity black | Dark translucent base |
| `border-white/20` | 20% opacity white | Subtle edge highlight |
| `rounded-full` | Full pill shape | Matches Oura design |
| `shadow-2xl` | Large shadow | Floating appearance |
| `px-6 py-3` | Horizontal/vertical padding | Comfortable touch targets |

### Nav Items Inside Pill
| Property | Current | New |
|----------|---------|-----|
| Icons | `h-6 w-6` | `h-5 w-5` (slightly smaller) |
| Labels | `text-xs` | `text-[11px]` (tighter) |
| Gap between items | `gap-12` | `gap-8` (tighter for pill) |
| Active color | `text-primary` | `text-white` with glow |
| Inactive color | `text-muted-foreground` | `text-white/60` |

### FAB Button
| Property | Current | New |
|----------|---------|-----|
| Size | `p-4` (large) | `p-3` (medium) |
| Position | Inline with nav | Separate floating element |
| Background | `bg-primary` | Keep or match glass |
| Shadow | `shadow-glow` | `shadow-2xl` for consistency |

---

## Spacing and Positioning

```text
              Screen Edge
                  |
    +-------------+-------------+
    |                           |
    |      Main Content         |
    |                           |
    |                           |
    +---------------------------+
    |                           |
    |  pb-24 (96px) bottom pad  | <- Increased from pb-20 (80px)
    |                           |
    +---------------------------+
                  ↓
              bottom-6 (24px from edge)
                  ↓
    +-------------------+  +---+
    |  [Home]   [Rank]  |  | + |
    +-------------------+  +---+
              ↑
        Pill floats above safe area
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/Dashboard.tsx` | Modify | Restructure nav to floating pill + separate FAB |
| `src/index.css` | Optional | Add reusable `.glass-pill` utility class |

---

## Implementation Details

### 1. Update main container padding
```tsx
// Before
<div className="min-h-screen bg-gradient-accent pb-20">

// After
<div className="min-h-screen bg-gradient-accent pb-24">
```

### 2. Replace nav element with floating layout
```tsx
{/* Floating Navigation */}
<div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center items-end gap-3 px-4">
  
  {/* Glass Pill Navigation */}
  <nav className="backdrop-blur-xl bg-black/40 border border-white/20 rounded-full px-6 py-2 shadow-2xl">
    <div className="flex items-center gap-10">
      {/* Home */}
      <button
        onClick={() => setActiveTab("home")}
        className={cn(
          "flex flex-col items-center gap-0.5 transition-all py-1",
          activeTab === "home" 
            ? "text-white" 
            : "text-white/60"
        )}
      >
        <HomeIcon className="h-5 w-5" />
        <span className="text-[11px] font-medium">Home</span>
      </button>

      {/* Rank */}
      <button
        onClick={() => setActiveTab("rank")}
        className={cn(
          "flex flex-col items-center gap-0.5 transition-all py-1",
          activeTab === "rank" 
            ? "text-white" 
            : "text-white/60"
        )}
      >
        <Scale className="h-5 w-5" />
        <span className="text-[11px] font-medium">Rank</span>
      </button>
    </div>
  </nav>

  {/* Floating FAB */}
  <div className="relative">
    {showFabMenu && (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setShowFabMenu(false)}
        />
        
        {/* Menu Options - positioned above FAB */}
        <div className="absolute bottom-16 right-0 z-50 flex flex-col gap-3 items-end">
          {/* ... menu items ... */}
        </div>
      </>
    )}
    
    {/* FAB Button */}
    <button
      onClick={() => setShowFabMenu(!showFabMenu)}
      className={cn(
        "backdrop-blur-xl bg-primary/90 border border-white/30 text-primary-foreground rounded-full p-3 shadow-2xl transition-all hover:scale-105 active:scale-95 z-50",
        showFabMenu && "rotate-45 bg-white/20"
      )}
    >
      {showFabMenu ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
    </button>
  </div>
</div>
```

### 3. Remove TooltipProvider wrapper (simplified)
The nav no longer needs the TooltipProvider wrapper since we're simplifying the layout.

---

## Active State Enhancement

Add subtle glow effect for active tab:

```tsx
activeTab === "home" 
  ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" 
  : "text-white/60"
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| FAB menu open | Backdrop covers screen, menu items appear above FAB |
| Very small screens | Pill maintains minimum width, may reduce gap slightly |
| Safe area (notched phones) | `bottom-6` provides clearance, but can add `pb-safe` if needed |

---

## Visual Polish Options (Phase 2)

- Add subtle inner shadow for more depth: `shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]`
- Animate pill on first appearance with `animate-in fade-in slide-in-from-bottom-4`
- Add subtle scale animation on tab switch

