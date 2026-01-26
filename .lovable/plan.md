
# Fix Done Button + Add Post-Add Success Page with Photo Upload

## Part 1: Fix the Done Button Bug

### Problem
For new shows, after the final step calls `handleSubmit()`:
1. Show is saved to the database
2. Step is set to 4
3. `RatingStep` is incorrectly rendered (inside `entryPoint` conditionals) instead of `QuickCompareStep`
4. Clicking "Done" calls `handleSubmit()` again, attempting to create a duplicate show

### Solution
Modify the step 4 rendering logic to only show `RatingStep` in edit mode (`showStepSelector === true`). For new shows at step 4, let the code fall through to `renderQuickCompareStep()`.

### File: `src/components/AddShowFlow.tsx`

**Changes to artist-first flow (around line 730):**
```tsx
if (step === 4) {
  if (showStepSelector) {
    // Only show RatingStep in edit mode
    return (
      <RatingStep ... />
    );
  }
  // For new shows, fall through to QuickCompareStep below
}
```

**Changes to venue-first flow (around line 800):**
```tsx
if (step === 4) {
  if (showStepSelector) {
    // Only show RatingStep in edit mode
    return (
      <RatingStep ... />
    );
  }
  // For new shows, fall through to QuickCompareStep below
}
```

---

## Part 2: Add Post-Add Success Page with Photo Upload

### New User Flow
```
Add Show → Save to DB → Success Page
                        ├── Add a Photo (optional, stored in Supabase Storage)
                        ├── Share to Instagram
                        ├── Quick Compare (rank against other shows)
                        └── Done (close dialog)
```

### New Component: `src/components/add-show-steps/SuccessStep.tsx`

A celebratory success screen with three action cards:

**UI Structure:**
- Checkmark icon with "Show Added!" header
- Show summary (artist, venue, date)
- Three action cards:
  1. **Add Photo** - Opens file picker, uploads to `show-photos` bucket
  2. **Share to Instagram** - Triggers existing share flow
  3. **Rank It** - Goes to Quick Compare step
- "Done" button at bottom to close

**Props:**
```tsx
interface SuccessStepProps {
  show: AddedShowData;
  onAddPhoto: (file: File) => Promise<void>;
  onShare: () => void;
  onRank: () => void;
  onDone: () => void;
}
```

### Database Changes

**Storage Bucket** (if not already exists):
- Bucket name: `show-photos`
- Public: `true` (for easy display)
- RLS: Users can only upload/delete their own show photos

**Shows Table Update:**
- Add column: `photo_url TEXT` (nullable) - stores the public URL of the uploaded photo

### Changes to `src/components/AddShowFlow.tsx`

1. **Import SuccessStep**
2. **Add step 5 for Success page**
3. **Update `handleSubmit()` to go to step 5 (Success) instead of step 4 (QuickCompare)**
4. **Add photo upload handler:**
```tsx
const handlePhotoUpload = async (file: File) => {
  // Upload to Supabase Storage
  const fileName = `${addedShow.id}-${Date.now()}.${file.type.split('/')[1]}`;
  const { data, error } = await supabase.storage
    .from('show-photos')
    .upload(fileName, file);
  
  if (error) throw error;
  
  // Get public URL and update show record
  const { data: { publicUrl } } = supabase.storage
    .from('show-photos')
    .getPublicUrl(fileName);
  
  await supabase
    .from('shows')
    .update({ photo_url: publicUrl })
    .eq('id', addedShow.id);
};
```

5. **Render SuccessStep at step 5:**
```tsx
if (step === 5) {
  return (
    <SuccessStep
      show={addedShow}
      onAddPhoto={handlePhotoUpload}
      onShare={handleShareShow}
      onRank={() => setStep(6)} // QuickCompare moves to step 6
      onDone={resetAndClose}
    />
  );
}
```

6. **Move QuickCompare to step 6**

### Step Flow Summary

| Step | New Shows | Edit Mode |
|------|-----------|-----------|
| 1 | UnifiedSearch | VenueStep |
| 2 | Venue/Date | DateStep |
| 3 | Date/Artists | ArtistsStep |
| 4 | (reserved) | RatingStep |
| 5 | SuccessStep | - |
| 6 | QuickCompareStep | - |

---

## Files to Create/Modify

1. **Create:** `src/components/add-show-steps/SuccessStep.tsx` - New success page component
2. **Modify:** `src/components/AddShowFlow.tsx` - Fix step 4 bug, add step 5/6 flow, add photo upload handler
3. **Create:** Database migration for:
   - `show-photos` storage bucket with RLS policies
   - Add `photo_url` column to `shows` table
