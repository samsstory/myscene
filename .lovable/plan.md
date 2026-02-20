

# "I Was There" Button for Discovery Cards

## The Problem
Currently, the Popular Near Me and Explore grids use a generic `+` icon on cards, which is the same pattern used for adding upcoming shows. Since the core goal is helping users **log past shows they've already attended**, the interaction should feel more personal and intentional -- "I was there" communicates this perfectly.

The Scene Feed cards (friend activity) currently have no add-to-profile action at all, which is a missed opportunity since seeing a friend's show is a strong trigger for "oh yeah, I was at that one too."

## Where "I Was There" Should Appear

### 1. Popular Near Me and Explore Cards (ArtistCard + EventCard in PopularFeedGrid)
- **Current**: Hidden `+` circle icon in top-right, only visible on hover/active
- **Change**: Replace with a visible pill-style button at the bottom of the card: `"I was there"` with a small hand/checkmark icon
- Always visible (not hidden behind hover), since this is the primary call-to-action
- Tapping triggers the existing `onQuickAdd` flow with show type pre-filled

### 2. Scene Feed Cards (FriendActivityFeed -- RichImageCard + CompactCard)
- **Current**: No add action exists on these cards
- **Change**: Add an `"I was there"` button
  - **RichImageCard** (image cards): A frosted-glass pill overlaid at the bottom-right of the card
  - **CompactCard** (text-only cards): A subtle text button aligned to the right side
- Only show this on **logged** show cards (not upcoming shows -- those would use a different "I'm going" pattern)
- Tapping opens the AddShowFlow pre-filled with the artist name, venue, and show type from the friend's activity item

## Design Language
- The button text: **"I was there"** -- short, personal, low-friction
- Icon: A small raised-hand or checkmark icon (using Lucide's `Hand` or `Check` icon)
- Style: Frosted glass pill (`bg-white/10 backdrop-blur-sm border border-white/15`) to match the existing card design language
- On tap: brief scale animation via `motion.button` with `whileTap={{ scale: 0.95 }}`

## Technical Details

### Files to Modify

**`src/components/home/PopularFeedGrid.tsx`**
- Update `ArtistCard` and `EventCard` components
- Replace the hidden `+` circle with a visible `"I was there"` pill button at the bottom of each card, positioned next to the artist/event name area
- Keep `onQuickAdd` callback unchanged -- the button just becomes more visible and labeled

**`src/components/home/FriendActivityFeed.tsx`**
- Add an `onIWasThere` callback prop to `FriendActivityFeedProps`
- In `RichImageCard`: add a bottom-right frosted pill button for logged shows
- In `CompactCard`: add a right-aligned text button for logged shows
- Only render the button when `item.type === "logged"` (past shows, not upcoming)
- The callback passes the activity item's artist name, venue, and show type to the parent

**`src/components/Home.tsx`**
- Pass an `onIWasThere` handler to `FriendActivityFeed`
- The handler opens `AddShowFlow` pre-filled with the artist, venue, and show type from the tapped activity item
- Reuse the existing `editShow` / `editDialogOpen` state to trigger the flow with pre-filled data

### Data Flow
```text
User taps "I was there" on a card
  --> Parent receives artist name, venue name, show type
  --> Opens AddShowFlow with pre-filled data
  --> User confirms/adjusts details
  --> Show is saved to their profile
```

### Edge Cases
- If the user has already logged the same show, the AddShowFlow's existing duplicate detection will handle it
- For compact feed cards without images, the button stays subtle so it doesn't dominate the card
- The button should stop event propagation so it doesn't also trigger the card's own tap handler (e.g., opening a detail view in the future)

