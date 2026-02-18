
# Add Upcoming Shows to the Calendar Grid

## What we're building

The calendar view in `Home.tsx` currently only shows past logged shows as solid tiles. We'll upgrade it to a unified timeline that shows both past and future shows on the same grid, with "Today" as a clear visual anchor point.

## Current State

The `renderCalendarView()` function in `src/components/Home.tsx` (lines 656-762):
- Pulls past shows via `getShowsForDate(day)` — filtered from the `shows` state
- Renders each match as a 32x32px tile with a photo/artist image and rank badge
- Empty days get a faint dot
- No awareness of upcoming shows or "today"

The `usePlanUpcomingShow` hook already exposes `upcomingShows` with full data including `show_date`, `artist_image_url`, `artist_name`, `venue_name`, and `rsvp_status`.

## Visual Design

```text
PAST SHOW TILE (solid)          TODAY MARKER            UPCOMING SHOW TILE (ghost)
┌──────────────┐                 ┌──────────────┐        ┌──────────────┐
│ [photo/img]  │                 │  date num    │        │ [artist img] │
│   #3 badge   │                 │  (glowing    │        │  opacity 55% │
│              │                 │   ring)      │        │  dashed bdr  │
└──────────────┘                 └──────────────┘        │  RSVP badge  │
Solid, full-opacity              Cyan/white glow          └──────────────┘
Normal rank overlay              ring around date num      Going=green dot
                                                           Maybe=amber dot
                                                           Not going=dim dot
```

## Exact Changes Required

### 1. `src/components/Home.tsx`

**Import additions (top of file):**
- Import `usePlanUpcomingShow` from `@/hooks/usePlanUpcomingShow`
- Import `isToday`, `isFuture`, `isPast` from `date-fns`
- Import `CheckCircle2`, `AlertCircle` from `lucide-react`

**State addition (inside `Home` component):**
- Call `usePlanUpcomingShow()` to get `upcomingShows` — this hook already handles auth and realtime, so it's a zero-cost addition

**New helper function `getUpcomingShowsForDate(date: Date)`:**
- Filters `upcomingShows` where `show.show_date` matches the given day (using `isSameDay` + `parseISO`)

**Updated `renderCalendarView()` logic per day cell:**

Each day cell now handles three possible states:

- **Today**: Wrap the date number in a glowing ring (`ring-2 ring-cyan-400/70 rounded-full` with a faint glow shadow). Show shows from both `getShowsForDate` and `getUpcomingShowsForDate` if any exist.

- **Past day with shows**: Existing solid tile rendering — unchanged, photo/artist image + rank badge overlay.

- **Future day with upcoming shows**: Ghost tile — same 32x32 structure but with:
  - `opacity-60` on the image
  - `border border-dashed border-white/30` container
  - Small RSVP status dot in bottom-right corner:
    - `going` → emerald dot (`bg-emerald-400`)
    - `maybe` → amber dot (`bg-amber-400`)
    - `not_going` → white/10 dim dot

- **Empty past days**: Keep existing faint dot (`w-1.5 h-1.5 bg-muted-foreground/30`)

- **Empty future days**: Slightly lighter dot or no dot to visually indicate "ahead"

**Today marker on the date number:**
- Currently the calendar does not render date numbers at all — we'll add a small date number label above the tile (or within the cell top) only for "today" so it stands out. This avoids cluttering every cell.
- Alternative: simply give today's cell a subtle `bg-cyan-500/10 rounded-lg` background and a `ring-1 ring-cyan-400/40` border to make it pop without adding text.

**Click behavior for upcoming show tiles:**
- Tap opens the existing `UpcomingShowDetailSheet` (already used in `WhatsNextStrip`)
- Requires adding `selectedUpcomingShow` + `upcomingDetailOpen` state to `Home`, and importing `UpcomingShowDetailSheet`

### 2. No database changes needed
`upcoming_shows` table already exists with RLS. The `usePlanUpcomingShow` hook already fetches data correctly.

### 3. No new files needed
All changes are contained within `Home.tsx`, reusing existing hooks and sheets.

## Implementation Order

1. Add imports (`usePlanUpcomingShow`, date-fns helpers, icons, `UpcomingShowDetailSheet`)
2. Instantiate `usePlanUpcomingShow()` inside `Home` to get `upcomingShows`
3. Add `getUpcomingShowsForDate` helper
4. Add `selectedUpcomingShow` + `upcomingDetailOpen` state
5. Refactor `renderCalendarView()` day cell rendering:
   - Today highlight ring on cell
   - Upcoming ghost tiles with RSVP dot
   - Click handler for upcoming tiles → detail sheet
6. Add `<UpcomingShowDetailSheet>` to the JSX return

## What this looks like end-to-end

When a user navigates to their calendar for the current month, they'll see:
- Their logged past shows as solid tiles (unchanged)
- Today's date highlighted with a glowing ring/background
- Any upcoming planned shows rendered as semi-transparent ghost tiles with a small colored RSVP dot
- Tapping a ghost tile opens the existing Upcoming Show detail sheet (same one used in What's Next strip)
- Future empty days blend subtly into the background, past empty days keep their faint dot

## Technical Notes

- `usePlanUpcomingShow` is already memoized with `useCallback` and subscribes to realtime changes — calling it in `Home` adds no extra network overhead
- The `UpcomingShowDetailSheet` accepts `show`, `open`, `onOpenChange`, `onDelete`, and `onRsvpChange` props — all already wired up in `WhatsNextStrip`, so the same pattern applies here
- The calendar currently navigates months freely (past and future), so ghost tiles will correctly appear on any future month the user browses to
