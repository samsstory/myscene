

# Standardize Show Card Text Layout + Edmtrain Card Cleanup

## Goal
Unify the bottom text area across all three show card types (UpcomingChip, FriendChip, EdmtrainEventCard) and move the Edmtrain ticket button styling into the detail sheet.

---

## Current State vs. Target

| Element | UpcomingChip (My Shows) | FriendChip (Friends Going) | EdmtrainEventCard (Discover) | **Target (all cards)** |
|---|---|---|---|---|
| **Friend avatars** | AvatarStack (top-left area, in bottom section) | Stacked avatars top-left | None | AvatarStack top-left (max 3 + overflow) |
| **Artist name** | line-clamp-2 | line-clamp-1 | line-clamp-2 | line-clamp-2 |
| **Friend name text** | None | "Alex going" / "Alex + 2 more going" | None | **Remove entirely** |
| **Venue** | Truncated, inline with date | Truncated, inline with date | Truncated, inline with date | Own line, truncated |
| **Date** | "MMM d" inline with venue | "MMM d" inline with venue | "MMM d" inline with venue | Own line or shared with venue: `Venue . MMM d` |
| **Bottom extras** | None | None | Ticket button + Edmtrain logo | **Remove ticket + logo from card** |

---

## Changes

### 1. FriendChip -- Remove friend name text, standardize layout

**File:** `src/components/home/upcoming/FriendChip.tsx`

- Remove the `goingLabel` line ("Alex going" / "Alex + 2 more going") -- the `<p>` at lines 113-118
- Change artist name from `line-clamp-1` to `line-clamp-2` to match UpcomingChip
- Keep the stacked friend avatars in the top-left (already correct)
- Keep the quick add/remove toggle in the top-right (already correct)
- Bottom text becomes: Artist (2 lines max), then `Venue . MMM d` on a single meta line (matching UpcomingChip's existing pattern)

### 2. EdmtrainEventCard -- Remove ticket button and Edmtrain logo from card

**File:** `src/components/home/EdmtrainEventCard.tsx`

- Remove the entire bottom row (lines 104-129): the Ticket `<a>` button and Edmtrain logo
- This makes the card's bottom content match the standard: title (line-clamp-2), optional artist subtitle, then venue/date meta line
- Slightly reduce padding (`p-3` to `p-2.5`) to match other chips if needed for visual consistency

### 3. ShowDetailSheet -- Replace plain-text ticket link with liquid glass button

**File:** `src/components/home/ShowDetailSheet.tsx`

- Replace the current simple `<a>` ticket link (lines 199-208, plain text with a Ticket icon and "View Tickets") with a styled liquid glass button matching the current EdmtrainEventCard ticket style:
  - `bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2.5`
  - Ticket icon + "View Tickets" label
  - This becomes the universal ticket button for all show detail sheets (upcoming, friend, edmtrain)

### 4. UpcomingChip -- Minor tweak for venue/date line consistency

**File:** `src/components/home/upcoming/UpcomingChip.tsx`

- Already mostly correct; ensure the venue/date meta line format matches: `Venue . MMM d` (venue first, then date) -- currently shows `dateLabel . venueLabel`, so reverse the order to `venueLabel . dateLabel` for consistency with EdmtrainEventCard's pattern
- Keep AvatarStack in the bottom section (already using it)
- No other changes needed

---

## Files Summary

| Action | File | What changes |
|---|---|---|
| Edit | `src/components/home/upcoming/FriendChip.tsx` | Remove friend name text line; change artist to line-clamp-2; reorder venue/date |
| Edit | `src/components/home/EdmtrainEventCard.tsx` | Remove ticket button + Edmtrain logo from card bottom |
| Edit | `src/components/home/ShowDetailSheet.tsx` | Replace plain ticket link with liquid glass button style |
| Edit | `src/components/home/upcoming/UpcomingChip.tsx` | Reorder meta line to venue first, then date |

---

## What stays the same

- RSVP badge (top-right on UpcomingChip) -- unique to "my shows"
- Quick add/remove toggle (top-right on FriendChip) -- unique to friend cards  
- CalendarPlus / scheduled status badge (top-right on EdmtrainEventCard) -- unique to discovery
- Festival badge (top-left) -- stays on all card types that support it
- Friend avatars (top-left on FriendChip, bottom section on UpcomingChip) -- both use AvatarStack, positioning stays per card type
- DEMO_10_FRIENDS data -- untouched
- Edmtrain attribution in the detail sheet footer -- stays as-is

