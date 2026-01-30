
# Demo Mode Implementation Plan

## Overview
Create a frictionless demo experience that showcases Scene using a snapshot of your real show data. Visitors can explore the full app without signing up, then convert to a real account when ready.

## How It Works

1. **Special Demo Route**: `/demo` will load the Dashboard with your frozen show data
2. **Your Account Stays Private**: Your live account at `/dashboard` remains untouched and continues syncing
3. **No Sign-in Required**: Demo visitors see a realistic, populated experience immediately
4. **Soft Conversion**: A subtle banner invites users to create an account to save their own shows

## Data Snapshot

Your current data will be copied to a dedicated demo user:
- **28 shows** (Factory Town, Seismic, Exchange LA, etc.)
- **28 rankings** with ELO scores from your comparisons
- **108 comparisons** for realistic ranking confidence
- Artists, venues, photos, and notes all preserved

## User Experience Flow

```text
Landing Page
     │
     ▼ Click "Live Demo"
     │
┌────────────────────────────────────┐
│  /demo                             │
│  ─────────────────────────────────│
│  Full Dashboard Experience         │
│  • Stat Pills (28 Shows, etc.)     │
│  • Rankings View                   │
│  • Globe/Map View                  │
│  • Show Detail Sheets              │
│  ─────────────────────────────────│
│  [ Banner: "Create account to      │
│    start your own collection" ]    │
└────────────────────────────────────┘
     │
     ▼ Click Banner/CTA
     │
Sign Up → /dashboard (their own data)
```

## Technical Approach

### 1. Create Demo User and Seed Data
- Create a demo account in the database with a fixed ID
- Copy your current shows, artists, rankings, and comparisons to this demo user
- Update photo URLs to point to your existing public storage URLs

### 2. New Route: `/demo`
- Add `/demo` route to App.tsx
- Renders a `DemoProvider` wrapper around Dashboard

### 3. Demo Context
- `useDemoMode()` hook provides:
  - `isDemoMode: boolean`
  - `demoUserId: string` (the fixed demo user ID)
- All data-fetching hooks check this context first

### 4. Modified Data Hooks
- `useHomeStats`, `Home.tsx` fetch methods, etc. will:
  - In demo mode: Query using the demo user ID (bypasses RLS via service key in edge function)
  - In normal mode: Query using the authenticated user ID (existing behavior)

### 5. Demo Edge Function
- New `get-demo-data` edge function
- Uses service role key to fetch demo user's data
- Returns the same structure as client-side queries
- No authentication required

### 6. UI Adaptations in Demo Mode
- **Disable writes**: Add Show, Delete, Edit buttons show "Sign up to unlock"
- **Soft banner**: Bottom banner with "Create your own collection"
- **Hide profile settings**: No account management in demo

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/demo` route |
| `src/contexts/DemoContext.tsx` | New context for demo state |
| `src/pages/Demo.tsx` | New page wrapping Dashboard in demo mode |
| `src/hooks/useDemoMode.ts` | Hook to access demo context |
| `src/components/DemoBanner.tsx` | Soft conversion CTA banner |
| `src/components/Home.tsx` | Check demo mode for data fetching |
| `src/hooks/useHomeStats.ts` | Support demo user ID queries |
| `src/pages/Dashboard.tsx` | Conditionally hide write actions in demo |
| `supabase/functions/get-demo-data/index.ts` | Edge function to serve demo data |
| Database migration | Create demo user + seed data |

## Demo Restrictions (What's Disabled)

- Adding new shows (FAB shows tooltip "Sign up to add")
- Editing/deleting shows
- Profile settings
- Photo uploads
- Ranking comparisons (view-only)

## Privacy Considerations

- Your email/profile info is NOT included in the demo
- Only show data (artists, venues, dates, photos, rankings) is copied
- Demo user has a generic display name like "Music Fan"

## Next Steps After Implementation

1. Update Landing Page button to link to `/demo` instead of `/dashboard`
2. Track demo engagement for conversion analytics
3. Consider adding a "Copy my demo data" feature for converting users
