

## Profile Setup Step — After First Show Logged

### Context
New users sign up, see the WelcomeCarousel, log their first show, and land on the SuccessStep. Currently there's no prompt to set display name or home city, which are critical for friend discovery and location-based features (Upcoming Near You, Scene Top Charts). The user wants a mandatory profile setup screen that appears **after the first show is logged**.

### Design

**Trigger**: After the first show's SuccessStep, before returning to the dashboard. The SuccessStep already detects `isFirstShow` — we'll add a new state that shows a `ProfileSetupSheet` when the user taps "Done" on their first show.

**Fields collected** (mandatory, no skip):
1. **Display name** — text input, pre-filled from email prefix if available
2. **Home city** — reuses existing `HomeCityPickerSheet` search/geocoding logic inline (Mapbox autocomplete + browser geolocation button)

**UI**: Full-screen sheet with Scene glassmorphism styling. Two-field form with a single "Let's go" CTA button. Button disabled until both fields are filled and a city is geocoded.

### Implementation Steps

1. **Create `ProfileSetupSheet.tsx`** (`src/components/onboarding/ProfileSetupSheet.tsx`)
   - Full-screen Sheet with dark glassmorphism background
   - Headline: "Set up your profile"
   - Display name input (pre-filled from `session.user.email` prefix)
   - Inline city search field reusing Mapbox geocoding logic from `HomeCityPickerSheet` (search-as-you-type + geolocation detect button)
   - "Let's go" button — upserts `profiles` with `full_name`, `home_city`, `home_latitude`, `home_longitude`
   - On success: calls `onComplete` callback

2. **Wire into SuccessStep** (`src/components/add-show-steps/SuccessStep.tsx`)
   - After detecting `isFirstShow`, set a `showProfileSetup` state
   - Show `ProfileSetupSheet` before the push notification interstitial
   - On complete, proceed to existing push prompt / done flow

3. **No DB changes needed** — `profiles` table already has `full_name`, `home_city`, `home_latitude`, `home_longitude` columns. The `handle_new_user` trigger already creates a profile row on signup.

### Technical Details
- Reuse Mapbox geocoding fetch from `HomeCityPickerSheet` (same `MAPBOX_TOKEN`, same API call pattern)
- Use `supabase.from("profiles").update()` with `eq("id", session.user.id)` — RLS already allows users to update their own profile
- Pre-fill display name: `session.user.email?.split("@")[0]` with title-casing
- Validate: name must be non-empty trimmed string, city must have lat/lng resolved
- Wrap component with `React.memo` per project conventions

