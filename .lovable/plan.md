
# Add Photo Option to Edit Show Dialog

## Overview

Add a "Photo" option to the "Edit Show" step selector that displays the current show photo as a thumbnail and allows users to replace it with a new photo.

## Current State

The Edit Show dialog shows 4 options:
- Venue
- Date  
- Artists
- Details & Notes

The `photo_url` field is **not** passed to the `AddShowFlow` component, even though shows have this data.

## Changes Required

### 1. Update AddShowFlow Props Interface

Add `photo_url` to the `editShow` prop type:

```typescript
interface AddShowFlowProps {
  // ...existing props
  editShow?: {
    id: string;
    // ...existing fields
    photo_url?: string | null;  // ADD THIS
  } | null;
}
```

### 2. Update Home.tsx to Pass photo_url

In the `AddShowFlow` component call, include `photo_url`:

```typescript
editShow={editShow ? {
  id: editShow.id,
  venue: editShow.venue,
  // ...existing fields
  photo_url: editShow.photo_url,  // ADD THIS
} : null}
```

### 3. Add Photo State to AddShowFlow

Add state for photo URL and upload handling:

```typescript
const [photoUrl, setPhotoUrl] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
```

Initialize from `editShow.photo_url` in the existing `useEffect`.

### 4. Add Photo Upload Handler

Reuse the photo upload pattern from `ShowReviewSheet`:

```typescript
const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !editShow) return;

  setUploading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${editShow.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('show-photos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('show-photos')
      .getPublicUrl(filePath);

    await supabase.from('shows')
      .update({ photo_url: publicUrl })
      .eq('id', editShow.id);

    setPhotoUrl(publicUrl);
    setHasUnsavedChanges(true);
    toast.success("Photo updated!");
  } catch (error) {
    console.error('Error uploading photo:', error);
    toast.error("Failed to upload photo");
  } finally {
    setUploading(false);
  }
};
```

### 5. Add Photo Option to Step Selector

Insert new option in the step selector UI (between Artists and Details & Notes):

```typescript
{/* Photo Option */}
<button
  onClick={() => fileInputRef.current?.click()}
  disabled={uploading}
  className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all text-left"
>
  <div className="flex items-center gap-3">
    {/* Photo thumbnail or icon */}
    {photoUrl ? (
      <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0">
        <img 
          src={photoUrl} 
          alt="Show photo" 
          className="w-full h-full object-cover"
        />
      </div>
    ) : (
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Camera className="h-5 w-5 text-primary" />
      </div>
    )}
    <div>
      <div className="font-semibold">
        {uploading ? "Uploading..." : "Photo"}
      </div>
      <div className="text-sm text-muted-foreground">
        {photoUrl ? "Tap to change" : "Add a photo"}
      </div>
    </div>
  </div>
</button>

{/* Hidden file input */}
<input
  ref={fileInputRef}
  type="file"
  accept=".jpg,.jpeg,.png,.webp"
  className="hidden"
  onChange={handlePhotoUpload}
/>
```

## Visual Layout

```text
┌─────────────────────────────────────────────────────────────┐
│                        Edit Show                            │
│                 What would you like to edit?                │
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
│  │  [📸 thumbnail]  Photo                              │    │  ← NEW
│  │                  Tap to change                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [⭐]  Details & Notes                              │    │
│  │        Optional details                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              [ Save Changes ]                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Files to Edit

| File | Changes |
|------|---------|
| `src/components/AddShowFlow.tsx` | Add photo_url to props, add upload handler, add Photo option in step selector |
| `src/components/Home.tsx` | Pass photo_url to editShow prop |

## New Imports (AddShowFlow.tsx)

```typescript
import { Camera } from "lucide-react";
import { useRef } from "react";
```

## Technical Notes

1. **Immediate Upload**: Photo is uploaded immediately when selected (same pattern as ShowReviewSheet), not saved with "Save Changes" button
2. **Thumbnail Display**: Shows actual photo as 40x40 thumbnail when exists, otherwise shows Camera icon
3. **Loading State**: Button shows "Uploading..." while photo is being uploaded
4. **Refresh**: `setHasUnsavedChanges(true)` will show the Save Changes button, but the photo is already saved to the database

## Summary

This adds a "Photo" editing option to the Edit Show dialog that:
- Shows the current photo as a thumbnail (if exists)
- Allows users to tap to select a new photo
- Uploads the photo immediately using the existing show-photos storage bucket
- Provides visual feedback during upload
