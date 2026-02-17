

# iOS Safe Area Compliance with Visual Dynamic Island Overlay

## Overview
Two-part approach: (1) a toggleable Dynamic Island overlay visible in the browser preview so you can always see exactly what's behind the notch, and (2) CSS safe-area padding fixes across all screens.

---

## Part 1: Dynamic Island Dev Overlay

Create a new component (`src/components/ui/DynamicIslandOverlay.tsx`) that renders a fixed, semi-transparent Dynamic Island shape at the top-center of the viewport. This overlay is purely visual — it doesn't block clicks (using `pointer-events: none`) — so you can interact with the app normally while seeing exactly what would be hidden on a real iPhone.

- Fixed position at the very top of the screen, centered horizontally
- Shaped and sized to match the iPhone 15/16 Dynamic Island (126 x 37 pts, pill shape)
- Includes a subtle status bar area (time, signal, battery) for realism
- Semi-transparent black so you can see content underneath
- Uses `pointer-events: none` so it never interferes with the app
- Only rendered in development mode (`import.meta.env.DEV`) — automatically excluded from production builds
- Can be toggled on/off via a small button in the corner (persisted to localStorage)

This component will be added to `Dashboard.tsx`, `Auth.tsx`, `Demo.tsx`, and `Install.tsx` so it appears on all app screens during development.

---

## Part 2: Safe Area CSS and Layout Fixes

### New CSS utilities (`src/index.css`)
- `pb-safe` — padding-bottom using `env(safe-area-inset-bottom)`
- `pl-safe` / `pr-safe` — left/right safe area padding

### Screen-by-screen fixes

**Dashboard.tsx (header)**
- Add `pt-safe` to the sticky header so the logo and avatar clear the Dynamic Island

**Dashboard.tsx (bottom nav)**
- Add `pb-safe` to the floating navigation container so it clears the home indicator

**Auth.tsx**
- Add `pt-safe` to the page container

**Demo.tsx**
- Add `pt-safe` to the sticky header

**Install.tsx**
- Add `pt-safe` to the sticky header

**AddShowFlow.tsx**
- Change dialog top positioning to `top-[max(1rem,env(safe-area-inset-top))]`

**Toast viewport (`src/components/ui/toast.tsx`)**
- Add top safe-area padding so toasts don't render behind the notch

**LandingHero.tsx (v1)**
- Verify `pt-safe` is applied (v2 already has it)

---

## Technical Details

### DynamicIslandOverlay component

```text
+--------------------------------------------------+
|  [Dynamic Island pill - 126x37, fixed top-center] |  <-- pointer-events: none
|  [Status bar: 9:41, signal, wifi, battery icons]  |
+--------------------------------------------------+
|                                                    |
|            Normal app content below                |
|                                                    |
+--------------------------------------------------+
```

- File: `src/components/ui/DynamicIslandOverlay.tsx`
- Rendered conditionally: `{import.meta.env.DEV && <DynamicIslandOverlay />}`
- Toggle button: small phone icon in bottom-left corner, only in dev mode
- State stored in `localStorage` key `scene-dev-island-overlay`

### Files to create
- `src/components/ui/DynamicIslandOverlay.tsx`

### Files to modify
- `src/index.css` — add `pb-safe`, `pl-safe`, `pr-safe` utilities
- `src/pages/Dashboard.tsx` — add overlay + `pt-safe` on header + `pb-safe` on nav
- `src/pages/Auth.tsx` — add overlay + `pt-safe`
- `src/pages/Demo.tsx` — add overlay + `pt-safe`
- `src/pages/Install.tsx` — add overlay + `pt-safe`
- `src/components/AddShowFlow.tsx` — safe-area-aware top positioning
- `src/components/ui/toast.tsx` — top safe-area padding
- `src/components/landing/LandingHero.tsx` — verify/add `pt-safe`

