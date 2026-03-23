

## PWA Splash Screen + Auth Screen

### Overview
Create two new components for PWA users: a splash screen (1.5s auto-dismiss) and a mobile-first auth landing screen. Route PWA users to this flow instead of the marketing landing page.

### New Files

**1. `src/pages/PwaSplash.tsx`**
- Full-screen dark background with centered SceneLogo (large) and subtle cyan glow animation
- After 1.5s, auto-navigates to `/pwa-auth` using `useNavigate`
- Matches the uploaded Figma screen 0: logo centered, minimal, dark

**2. `src/pages/PwaAuth.tsx`**
- Full-screen mobile layout matching uploaded Figma screen 1:
  - Top: SceneLogo centered
  - Middle: concert crowd image (use a stock/placeholder concert image in `/public/images/`)
  - Tagline text: "Track, rank, and share every concert"
  - Cyan "Log In" button (full-width, rounded) → navigates to `/auth` with signin tab
  - "Sign Up" text link below → navigates to `/auth` with signup tab (pass `?tab=signup` query param)
- Dark background with subtle mesh gradients consistent with existing design system

### Modified Files

**3. `src/App.tsx`**
- Add routes: `/pwa-splash` and `/pwa-auth`
- Change the `/` route: detect standalone mode via `window.matchMedia('(display-mode: standalone)').matches`
  - If standalone + not authenticated → render `<PwaSplash />`
  - If not standalone → render `<IndexV2 />` (current behavior)
- Implementation: create a small wrapper component `RootRoute` that checks standalone mode and auth state, renders accordingly

**4. `src/pages/Auth.tsx`**
- Read `?tab=signup` from URL params; if present, default the Tabs to `"signup"` instead of `"signin"`
- Hide the "Back to website" link when in standalone mode (no website to go back to)

### Design Details
- Splash: pure black/dark bg (`bg-background`), SceneLogo `size="lg"` scaled up, subtle pulse glow behind it, fade-out transition after 1.5s
- Auth screen: uses existing design tokens (cyan primary, dark card bg, glass effects)
- Concert crowd image: add a placeholder image at `/public/images/concert-crowd.jpg` — can be swapped later with a real photo

