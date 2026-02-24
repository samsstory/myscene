

# Step 1: Redesign PhotoSelectStep as Unified Method Picker

## What Changes

The `PhotoSelectStep` component gets redesigned from a simple photo upload box into a multi-method landing page. All four show-logging methods appear on a single screen inside the existing `BulkUploadFlow` dialog.

No changes to `AddChoiceSheet`, `DashboardSheets`, or `Dashboard`. Everything stays inside `BulkUploadFlow`.

## New Layout

```text
┌─────────────────────────────────────┐
│  Add a Show                    ✕    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  📸  [Camera icon]         │    │
│  │  Tap to browse your         │    │
│  │  photo library              │    │
│  │                             │    │
│  │  "We'll grab date/location  │    │
│  │   from metadata, you add    │    │
│  │   the artist"               │    │
│  └─────────────────────────────┘    │
│                                     │
│  ────────── or ──────────           │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎪 Add from Lineup         │    │
│  │  Upload a festival poster   │    │
│  │  or search our database —   │    │
│  │  tap the artists you saw    │    │
│  │  to add them all at once    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── Other ways to add ────────      │
│  📋 Paste a list from Notes         │
│  🔍 Search manually                 │
└─────────────────────────────────────┘
```

## Visual Specifications

**Photo Upload Box** (existing dashed-border area):
- Keeps current `Camera` icon, dashed border, and `h-48` height
- Updated subtitle: "We'll grab date and location from metadata, you add the artist"
- No styling changes — retains current appearance

**"or" divider**:
- `border-t border-white/10` with centered "or" text at `text-xs text-white/30`

**"Add from Lineup" card**:
- `Tent` icon from lucide-react
- Cyan/purple gradient icon container (matching the "Log a Show" card style from `AddChoiceSheet`)
- `min-h-[120px]`, glassmorphism: `bg-white/[0.05] border border-white/[0.09]`
- Title: "Add from Lineup" at 18px bold
- Subtitle at 14px, 70% opacity
- `motion.button` with `whileTap={{ scale: 0.97 }}` and arrow icon on right
- Clear visual distinction from the dashed-border photo box above

**"Other ways to add" section**:
- Divider: `text-xs text-white/40 uppercase tracking-wider` label with `border-t border-white/10 pt-4 mt-6`
- Two compact text rows (not cards): `ClipboardList` and `Search` icons, text only, smaller touch targets
- Same text-link styling as current "Paste a list instead" and "Search manually" but with icons

## Code Changes

### File 1: `src/components/bulk-upload/PhotoSelectStep.tsx`

**Props interface** — add `onFromLineup?: () => void` alongside existing `onPasteList` and `onAddManually`.

**When `selectedPhotos.length === 0`** (the initial state), replace the current layout with:
1. Photo upload box (keep existing dashed-border button, update subtitle copy)
2. "or" divider
3. "Add from Lineup" card (new `motion.button` with `Tent` icon, cyan gradient, subtitle)
4. "Other ways to add" divider
5. "Paste a list from Notes" text row (currently "Paste a list instead")
6. "Search manually" text row (keep existing behavior)

**When `selectedPhotos.length > 0`** (photos selected), keep the existing photo grid + continue button exactly as-is. The lineup card and secondary options disappear once photos are selected — user has committed to the photo path.

**Header section**: Remove the current centered Camera icon + "Add Multiple Shows At Once" header. The dialog title "Add a Show" from `BulkUploadFlow` already serves as the header. The methods below are self-explanatory.

### File 2: `src/components/BulkUploadFlow.tsx`

**Step type**: Add `'lineup-choice'` to the `Step` union type. (Steps 2-3 will add `'lineup-search'` and `'lineup-grid'` later.)

**Pass `onFromLineup`** to `PhotoSelectStep` — sets step to `'lineup-choice'`.

**`getTitle()`**: Add case for `'lineup-choice'` returning `'Add from Lineup'`.

**Back navigation**: `lineup-choice` → `select`.

**Header back button**: Add `'lineup-choice'` to the condition that shows the back arrow.

**Rendering**: For now, `lineup-choice` step renders a placeholder (or the `LineupChoiceStep` component if we build it in the same step — but per the plan we build it in Step 3). A simple "Coming soon" placeholder is fine for now so the navigation wiring is testable.

## What Does NOT Change

- `AddChoiceSheet.tsx` — no changes
- `DashboardSheets.tsx` — no changes  
- `Dashboard.tsx` — no changes
- The photo upload flow after selecting photos (grid, continue button, smart-match, review, success) — all unchanged
- "Search Manually" behavior: closes `BulkUploadFlow` dialog and opens `AddShowFlow` wizard (existing `onAddManually` callback). The transition is not jarring because the dialog closes first, then the wizard opens after 150ms.

## Testing

After this step, you can:
1. Tap FAB → "Log a Show" → see the new unified method picker
2. Tap the photo upload box → existing photo flow works as before
3. Tap "Add from Lineup" → navigates to placeholder step with back button
4. Tap "Paste a list from Notes" → existing text import flow
5. Tap "Search manually" → closes dialog, opens manual wizard

