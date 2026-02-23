

# Refactoring Plan (Keeping Demo Data)

## 1. Refactor FriendsGoingSection to reuse FriendChip

**File:** `src/components/home/FriendsGoingSection.tsx`

The card rendering inside `FriendsGoingSection` (lines 109-204) is nearly identical to `FriendChip.tsx`. The refactor will:

- Convert each `GroupedEvent` into a `GroupedFriendShow` shape (which `FriendChip` expects)
- Replace the 95-line inline card JSX with a `<FriendChip />` call
- Keep the grouping logic + toggle state management in `FriendsGoingSection` -- only the rendering is delegated
- The component drops from ~209 lines to ~90 lines

**Key mapping:** `GroupedEvent.friends` maps to `GroupedFriendShow.allFriends`, and `GroupedEvent.representative` provides the base `FriendShow` fields.

---

## 2. Extract TimeFilterDropdown to its own file

**New file:** `src/components/home/upcoming/TimeFilterDropdown.tsx`

- Move the `TimeFilterDropdown` component (lines 59-100 of `WhatsNextStrip.tsx`) and the `TimeFilter` type + `TIME_OPTIONS` constant into this new file
- Export `TimeFilter` type so `WhatsNextStrip` can import it
- `WhatsNextStrip` imports from `./upcoming/TimeFilterDropdown` instead of defining inline

This removes ~45 lines from WhatsNextStrip and follows the existing pattern of extracting sub-components into `upcoming/`.

---

## 3. Extract SpotifyIcon to a shared UI component

**New file:** `src/components/ui/SpotifyIcon.tsx`

- Move the inline `SpotifyIcon` SVG component (lines 12-18 of `ForYouFeed.tsx`) into a reusable file
- Update `ForYouFeed.tsx` to import from `@/components/ui/SpotifyIcon`
- Any future Apple Music integration page can also import shared brand icons from the same location

---

## 4. Create a reusable SectionLabel component

**New file:** `src/components/home/SectionLabel.tsx`

The pattern `text-sm uppercase tracking-[0.12em] font-semibold text-white/35` with optional `textShadow` appears 4+ times across `WhatsNextStrip.tsx` and `SceneView.tsx`. This refactor:

- Creates a tiny `<SectionLabel>` component (~15 lines) that accepts `children` and an optional `glow` prop (for the text-shadow variant)
- Replaces all inline `<h3>` section headers in `WhatsNextStrip.tsx` (line 235) and `SceneView.tsx` (lines 107, 123, 145) with `<SectionLabel>`

---

## Files Summary

| Action | File | What changes |
|--------|------|-------------|
| Edit | `src/components/home/FriendsGoingSection.tsx` | Replace inline card JSX with `<FriendChip />` |
| Create | `src/components/home/upcoming/TimeFilterDropdown.tsx` | Extract dropdown + type + constant |
| Edit | `src/components/home/WhatsNextStrip.tsx` | Import TimeFilterDropdown; replace inline headers with SectionLabel |
| Create | `src/components/ui/SpotifyIcon.tsx` | Extract SVG icon |
| Edit | `src/components/home/ForYouFeed.tsx` | Import SpotifyIcon from new file |
| Create | `src/components/home/SectionLabel.tsx` | Shared section header component |
| Edit | `src/components/home/SceneView.tsx` | Use SectionLabel for all headers |

**Not touched:** DEMO_10_FRIENDS stays in WhatsNextStrip.tsx as-is.

