

# ShowReviewSheet Feature Enhancements

## Overview
Add five missing features to complete the ShowReviewSheet as a comprehensive show details view with full sharing, editing, and management capabilities.

## Features to Implement

| Feature | Description | Pattern Reference |
|---------|-------------|-------------------|
| Send to Friends | Web Share API for SMS/iMessage sharing | `PhotoOverlayEditor.handleShareWithFriends` |
| Edit Review | Ghost button to modify ratings/notes | Existing `onEdit` prop (unused after header removal) |
| Delete Show | Confirmation dialog + transactional delete | `Home.tsx` AlertDialog pattern |
| Supporting Artists | Display openers below headliner | `show.artists` array filtering |
| Rank Comparisons | Show basis for ranking (e.g., "from 12 comparisons") | `comparisonsCount` already passed to HeroPhotoSection |

## Implementation Details

### 1. Send to Friends Button

Add a "Send" ghost button that uses the Web Share API pattern from PhotoOverlayEditor.

**Location**: Secondary actions row (alongside "Change Photo" and "Remove")

**Logic**:
```typescript
const handleSendToFriends = async () => {
  const headliner = show.artists.find(a => a.isHeadliner) || show.artists[0];
  const shareText = `Check out this show: ${headliner?.name} at ${show.venue.name}!`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: `${headliner?.name} at ${show.venue.name}`,
        text: shareText,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast({ title: "Share failed", variant: "destructive" });
      }
    }
  } else {
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(shareText);
    toast({ title: "Copied to clipboard" });
  }
};
```

**UI**: Ghost button with `MessageCircle` or `Send` icon, positioned in secondary actions row.

### 2. Edit Review Button

Re-expose the `onEdit` callback that was removed with the header.

**Location**: Secondary actions row

**UI**:
```typescript
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

### 3. Delete Show with Confirmation

Add AlertDialog confirmation flow matching the Home.tsx pattern.

**New Props**:
```typescript
interface ShowReviewSheetProps {
  // ... existing props
  onDelete?: (showId: string) => void;
}
```

**State**:
```typescript
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
```

**UI**: Red-tinted ghost button with `Trash2` icon at the end of secondary actions.

**Dialog**:
```typescript
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this show?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete <strong>{headliner?.name}</strong> at {show.venue.name}.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction 
        onClick={() => onDelete?.(show.id)}
        className="bg-destructive text-destructive-foreground"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 4. Supporting Artists Display

Show opener/supporting acts below the headliner in the HeroPhotoSection metadata bar.

**File**: `src/components/show-review/HeroPhotoSection.tsx`

**Logic**:
```typescript
const headliner = artists.find(a => a.isHeadliner) || artists[0];
const supportingArtists = artists.filter(a => !a.isHeadliner && a.name !== headliner?.name);
```

**UI Addition** (below headliner name):
```typescript
{supportingArtists.length > 0 && (
  <p className="text-white/40 text-xs mt-0.5 truncate">
    with {supportingArtists.map(a => a.name).join(', ')}
  </p>
)}
```

### 5. Rank Comparisons Context

Display how many comparisons were used to calculate the ranking.

**File**: `src/components/show-review/HeroPhotoSection.tsx`

**Current** (line 89-91):
```typescript
<p className="text-white/50 text-xs mt-1.5">
  {rankPosition > 0 ? `#${rankPosition} All Time` : "Unranked"}
</p>
```

**Updated**:
```typescript
<p className="text-white/50 text-xs mt-1.5">
  {rankPosition > 0 
    ? `#${rankPosition} All Time${comparisonsCount > 0 ? ` · ${comparisonsCount} comparisons` : ''}`
    : "Unranked"
  }
</p>
```

This leverages the `comparisonsCount` prop that's already being passed but not displayed.

## Updated Secondary Actions Layout

Replace the current conditional photo-only actions with a comprehensive row:

```text
┌─────────────────────────────────────────────────────────────┐
│  [📤 Send]   [✏️ Edit Review]   [📷 Change Photo]   [🗑️]   │
└─────────────────────────────────────────────────────────────┘
```

**Code Structure**:
```typescript
{/* Secondary Actions - Always visible */}
<div className="flex gap-2 justify-center flex-wrap">
  <Button variant="ghost" size="sm" onClick={handleSendToFriends}>
    <Send className="h-4 w-4 mr-2" />
    Send
  </Button>
  <Button variant="ghost" size="sm" onClick={() => { onOpenChange(false); onEdit(show); }}>
    <Pencil className="h-4 w-4 mr-2" />
    Edit Review
  </Button>
  {photoUrl && (
    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
      <Upload className="h-4 w-4 mr-2" />
      Change Photo
    </Button>
  )}
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={() => setShowDeleteConfirm(true)}
    className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

## Files to Edit

| File | Changes |
|------|---------|
| `src/components/ShowReviewSheet.tsx` | Add Send handler, Edit button, Delete dialog, reorganize secondary actions |
| `src/components/show-review/HeroPhotoSection.tsx` | Add supporting artists display, enhance rank with comparisons count |

## New Imports (ShowReviewSheet.tsx)

```typescript
import { Send, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
```

## Props Update

The `onDelete` callback needs to be added to `ShowReviewSheetProps` and wired up from `Home.tsx` to trigger the existing delete logic.

## Summary

These additions complete the ShowReviewSheet as a full-featured show management view:
- **Share**: Instagram (primary) + Send to Friends (secondary)
- **Edit**: Quick access to modify review details
- **Delete**: Safe removal with confirmation
- **Context**: Supporting artists and ranking basis visible at a glance

