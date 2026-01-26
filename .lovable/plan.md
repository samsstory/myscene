

# Add Rating Step to Single Show Flow

## Overview
Insert the optional Rating step into the "Add Show" flow so users can rate specific aspects (Artist Performance, Sound, Lighting, Crowd, Venue Vibe) and add notes **before** the show is saved and the Success screen appears.

## Current Flow
```text
Step 1: Search (Artist or Venue)
Step 2: Venue (if artist-first) or Date (if venue-first)
Step 3: Date (if artist-first) or Artists (if venue-first)
         ↓ handleSubmit() called immediately
Step 5: Success Screen
Step 6: Quick Compare (optional)
```

## Proposed Flow
```text
Step 1: Search (Artist or Venue)
Step 2: Venue (if artist-first) or Date (if venue-first)
Step 3: Date (if artist-first) or Artists (if venue-first)
Step 4: Rating/Details (NEW - optional step)
         ↓ handleSubmit() called
Step 5: Success Screen
Step 6: Quick Compare (optional)
```

## Implementation Details

### 1. Update Step Navigation Logic

**File: `src/components/AddShowFlow.tsx`**

- Modify `handleDateSelect()` and `handleArtistsComplete()` to navigate to Step 4 instead of calling `handleSubmit()` directly
- The Rating Step will have a "Save Show" button that calls `handleSubmit()` and a "Skip" option that also calls `handleSubmit()` (submitting without ratings)

### 2. Add Step 4 Rendering for New Shows

Currently, Step 4 only renders `RatingStep` when `showStepSelector` is true (edit mode). Update to also render for new shows:

```typescript
// In renderStepContent(), after step 3 handling:
if (step === 4) {
  return (
    <RatingStep
      rating={showData.rating}
      onRatingChange={(rating) => updateShowData({ rating })}
      artistPerformance={showData.artistPerformance}
      sound={showData.sound}
      lighting={showData.lighting}
      crowd={showData.crowd}
      venueVibe={showData.venueVibe}
      notes={showData.notes}
      onDetailChange={(field, value) => updateShowData({ [field]: value })}
      onSubmit={handleSubmit}
      isEditMode={showStepSelector}
    />
  );
}
```

### 3. Update RatingStep Component

**File: `src/components/add-show-steps/RatingStep.tsx`**

Add a "Skip" option for new shows:
- Primary button: "Save Show" or "Done" 
- Secondary/Ghost button: "Skip for now" → also triggers submit without ratings

Updated props and UI:
```typescript
interface RatingStepProps {
  // ... existing props
  onSkip?: () => void;  // New: for skipping ratings
}
```

New button layout:
```text
+----------------------------------+
| Add Details (Optional)           |
| Rate specific aspects...         |
|                                  |
| [Artist Performance: 1 2 3 4 5]  |
| [Sound: 1 2 3 4 5]               |
| [Lighting: 1 2 3 4 5]            |
| [Crowd: 1 2 3 4 5]               |
| [Venue Vibe: 1 2 3 4 5]          |
|                                  |
| My Take: [textarea]              |
|                                  |
| [    Save Show    ] (primary)    |
| [  Skip for now   ] (ghost)      |
+----------------------------------+
```

### 4. Update Progress Indicator

Update `getTotalSteps()` to return 4 instead of 3, and update the progress bar to show 4 segments.

### 5. Update Back Navigation

Add Step 4 to the `handleBack()` logic so users can go back from Rating to the previous step.

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/components/AddShowFlow.tsx` | Update navigation to go to Step 4 before submit; render RatingStep for new shows; update progress to 4 steps; update back navigation |
| `src/components/add-show-steps/RatingStep.tsx` | Add `onSkip` prop; add "Skip for now" button for non-edit mode |

## User Experience

1. User searches and selects artist/venue
2. User completes venue and date steps
3. User sees Rating step with clear "Optional" messaging
4. User can:
   - Rate aspects and add notes, then tap "Save Show"
   - Or tap "Skip for now" to save without ratings
5. Success screen appears with completed data
6. User can then add photo, share, or rank the show

This approach keeps ratings optional while giving users the opportunity to capture their thoughts while the experience is fresh.

