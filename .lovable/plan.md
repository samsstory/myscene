

## Plan: Festival-Aware Success Screen

### Problem
The `BulkSuccessStep` component is context-unaware. When a user claims a festival lineup, the success screen:
1. Shows a generic "X shows added" header instead of the festival name
2. Renders a 2-column grid of individual show cards (mostly placeholder images) — overwhelming for 10+ artists
3. Says "Tap to share your review on Instagram" — misleading since festival claims have no photos
4. Share text is generic ("Just added X shows to my Scene") instead of festival-specific
5. "Create Review Photo" appears for single shows even from festival flow — no photo to review
6. PWA install prompt — already fixed in previous change

### Changes

**1. `BulkUploadFlow.tsx` — Pass festival context to success screen**
- Pass `selectedFestival` (or just `festivalName: string | null`) as a new prop to `BulkSuccessStep`
- This lets the success screen branch its UI based on whether the claim was a festival or a regular bulk upload

**2. `BulkSuccessStep.tsx` — Add `festivalName` prop and branch the UI**

- **New prop**: `festivalName?: string | null`
- Derive `isFestival = !!festivalName`

- **Header**: When `isFestival`, show `"{festivalName}" logged` with a subtitle like `"{N} sets added to your rankings"` instead of the generic count

- **Compact artist summary** (replaces the grid for festivals): A single card listing artist names as inline comma-separated text or wrapped tags — no tall grid of mostly-placeholder cards. Show artist images inline as small avatar circles where available, `✦` fallback where not.

- **Remove misleading prompts for festivals**:
  - Hide "Tap to share your review on Instagram" hint
  - Hide "Create Review Photo" button (no photos to work with)
  
- **Festival-specific share text**: Change from `"Just added X shows"` to `"Just claimed {festivalName} on SCENE — {N} sets logged! 🎵"`

- **Keep universal actions**: Rank, Add More, Done — these apply to all flows

### Technical Detail

```text
BulkSuccessStepProps
  + festivalName?: string | null

BulkUploadFlow
  success step: <BulkSuccessStep festivalName={selectedFestival?.event_name} ... />

BulkSuccessStep render logic:
  isFestival = !!festivalName

  Header:
    isFestival → "{festivalName} logged" + "{N} sets added"
    else       → "{N} show(s) added" (existing)

  Body:
    isFestival → compact artist list card (names + avatars)
    else       → existing grid/single-show card (unchanged)

  Actions:
    isFestival → Share Festival, Rank These Sets, Add More, Done
    else       → existing Create Review Photo, Send to Friends, Rank, Share, Add More, Done
```

### Files Modified
- `src/components/bulk-upload/BulkSuccessStep.tsx` — add `festivalName` prop, branch header/body/actions
- `src/components/BulkUploadFlow.tsx` — pass `selectedFestival?.event_name` to success step

