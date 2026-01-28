
# Edit Show UX Refinement: Pencil Button & Photo Priority

## Overview

Streamline the edit flow by making the pencil icon in the ShowReviewSheet open the full edit dialog (AddShowFlow) and reorder the edit options to prioritize photo editing.

| Change | Current Behavior | New Behavior |
|--------|------------------|--------------|
| Pencil icon (top-left) | Opens file picker for photo change | Opens Edit Show dialog |
| "Edit Review" button | Visible in bottom actions | Removed |
| Photo option in Edit dialog | 4th position (after Artists) | 1st position (before Venue) |

## Changes Required

### 1. Update HeroPhotoSection Pencil Button

Change the pencil button from triggering `onChangePhoto` (file upload) to `onEditShow` (open edit dialog).

**File**: `src/components/show-review/HeroPhotoSection.tsx`

**Prop Changes**:
```typescript
interface HeroPhotoSectionProps {
  // Remove: onChangePhoto?: () => void;
  onEditShow?: () => void;  // NEW: Open edit dialog
  // ... rest of props
}
```

**Button Update** (line 70-75):
```typescript
<button
  onClick={onEditShow}  // Changed from onChangePhoto
  className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
>
  <Pencil className="h-4 w-4 text-white/80" />
</button>
```

### 2. Update ShowReviewSheet

Wire up the new `onEditShow` prop and remove the "Edit Review" button from the actions row.

**File**: `src/components/ShowReviewSheet.tsx`

**Changes**:

1. Add `handleEditShow` handler:
```typescript
const handleEditShow = () => {
  onOpenChange(false);
  onEdit(show);
};
```

2. Update HeroPhotoSection props (line 391-405):
```typescript
<HeroPhotoSection
  photoUrl={photoUrl}
  uploading={uploading}
  score={score}
  artists={show.artists}
  venue={show.venue}
  date={show.date}
  rankPosition={rankData.position}
  rankTotal={rankData.total}
  comparisonsCount={rankData.comparisons}
  onPhotoUpload={handlePhotoUpload}
  fileInputRef={fileInputRef}
  onEditShow={handleEditShow}  // NEW: Opens edit dialog
  onRankThisShow={onNavigateToRank ? handleRankThisShow : undefined}
/>
```

3. Remove "Edit Review" button (delete lines 482-493):
```typescript
// REMOVE THIS BLOCK:
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    onOpenChange(false);
    onEdit(show);
  }}
  className="text-white/50 hover:text-white hover:bg-white/10"
>
  <Pencil className="h-4 w-4 mr-2" />
  Edit Review
</Button>
```

### 3. Reorder Edit Options in AddShowFlow

Move the Photo option to the top of the step selector, making it the first editing option.

**File**: `src/components/AddShowFlow.tsx`

**Reorder step selector buttons** (lines 670-788):

Current order:
1. Venue
2. Date
3. Artists
4. Photo
5. Details & Notes

New order:
1. **Photo** (moved to top)
2. Venue
3. Date
4. Artists
5. Details & Notes

The Photo button block (lines 724-762) should be moved before the Venue button (line 675).

## Updated Visual Flow

### ShowReviewSheet Actions (After Changes)

```text
┌─────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────┐  │
│  │   [✏️]         HERO PHOTO               [Scene]      │  │
│  │        ↑                                             │  │
│  │   Tapping opens                                      │  │
│  │   Edit Show dialog                                   │  │
│  │                                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              [✦ Share to Instagram]                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [📤 Send]  [💾 Save]  [🗑️]                               │  │
│                    ↑                                        │
│              "Edit Review" removed                          │
└─────────────────────────────────────────────────────────────┘
```

### Edit Show Dialog (After Reorder)

```text
┌─────────────────────────────────────────────────────────────┐
│                        Edit Show                            │
│                 What would you like to edit?                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [📸 thumbnail]  Photo                              │    │  ← FIRST
│  │                  Tap to change                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [📍]  Venue                                        │    │
│  │        Printworks London                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [📅]  Date                                         │    │
│  │        1/31/2023                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [🎵]  Artists                                      │    │
│  │        John Summit, Groove Armada                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [⭐]  Details & Notes                              │    │
│  │        Optional details                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Files to Edit

| File | Changes |
|------|---------|
| `src/components/show-review/HeroPhotoSection.tsx` | Replace `onChangePhoto` prop with `onEditShow` |
| `src/components/ShowReviewSheet.tsx` | Wire up `onEditShow`, remove "Edit Review" button |
| `src/components/AddShowFlow.tsx` | Move Photo option to first position in step selector |

## Technical Notes

1. **Single Entry Point**: The pencil icon now serves as the only edit entry point, simplifying the UX
2. **Photo Priority**: Moving Photo to the top reflects that it's often the most important visual element users want to update
3. **Cleanup**: The hidden file input and upload handler in ShowReviewSheet can remain for now (still used by the "no photo" state upload button)
4. **Consistent Pattern**: This aligns with the memory note about "Edit Show" dialog including photo management

## Summary

This change creates a cleaner, more intuitive editing experience:
- **Single edit entry point** via pencil icon
- **Photo-first editing** matches the visual hierarchy of the review sheet
- **Reduced button clutter** in the actions row
