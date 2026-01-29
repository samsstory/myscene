

# Bulk Upload UI Redesign - Scene Aesthetic Alignment

## Current State Analysis

Based on my review of the screenshot you provided and the codebase, here are the issues:

### Visual Problems

1. **Generic Card Styling**: The current `PhotoReviewCard` uses basic `bg-card` with dashed borders - lacks the premium glassmorphism treatment seen in other Scene components

2. **No Mesh Gradient Background**: The dialog/cards don't have the signature cyan/coral mesh gradients that define Scene's aesthetic

3. **Yellow Accent Color Mismatch**: The artist search dropdown uses a bright yellow (`bg-yellow-500`) for selected items - this clashes with Scene's cyan/coral palette

4. **Flat Input Fields**: Standard shadcn inputs without the glass effect or subtle glows

5. **Missing Noise Texture**: The tactile 3% opacity fractal noise overlay is absent from cards

6. **No Luminous Effects**: Text and icons lack the soft glow (`textShadow`) that gives Scene its premium feel

7. **Plain Progress Indicator**: "0 of 2 ready" text is plain - could be a visual progress element

### UX Problems

1. **"Add Info" Label Confusion**: When collapsed, empty cards show "Add Info" in orange - not immediately clear what needs to be done

2. **Hidden Photo Actions**: Edit/delete photo overlay only appears on hover - not discoverable on mobile

3. **Buried Rating Section**: The "+ Add rating & notes" toggle is easy to miss and takes extra taps to expand

4. **No Visual Hierarchy**: All cards look the same weight - completed vs incomplete states aren't immediately obvious

5. **Progress Feels Invisible**: Users can't quickly scan which shows are ready vs need attention

---

## Proposed Design Changes

### 1. Dialog Container Enhancement

**File:** `src/components/BulkUploadFlow.tsx`

Add mesh gradient background and noise texture to the dialog:

```tsx
<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto relative">
  {/* Mesh gradient background */}
  <div className="absolute inset-0 overflow-hidden rounded-lg">
    <div className="absolute inset-0 animate-pulse-glow"
      style={{ background: "radial-gradient(ellipse at 20% 10%, hsl(189 94% 55% / 0.06) 0%, transparent 50%)" }} />
    <div className="absolute inset-0"
      style={{ background: "radial-gradient(ellipse at 80% 90%, hsl(17 88% 60% / 0.06) 0%, transparent 50%)" }} />
    {/* Noise texture */}
    <div className="absolute inset-0 opacity-[0.03]"
      style={{ backgroundImage: `url("data:image/svg+xml,...")` }} />
  </div>
  {/* Content with relative positioning */}
  <div className="relative z-10">
    ...
  </div>
</DialogContent>
```

### 2. Glassmorphism Review Cards

**File:** `src/components/bulk-upload/PhotoReviewCard.tsx`

Transform cards to match Scene's glass aesthetic:

**Before:**
```tsx
<div className={cn(
  "rounded-xl border bg-card transition-all",
  isValid ? "border-primary/50" : "border-border border-dashed"
)}>
```

**After:**
```tsx
<div className={cn(
  "rounded-xl transition-all duration-300",
  "bg-white/[0.03] backdrop-blur-sm border",
  isValid 
    ? "border-primary/40 shadow-[0_0_20px_hsl(189_94%_55%/0.15)]" 
    : "border-white/[0.08] border-dashed"
)}>
```

### 3. Enhanced Thumbnail with Status Ring

Add a colored ring around thumbnails to show completion status:

```tsx
<div className={cn(
  "relative flex-shrink-0",
  isValid && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background rounded-lg"
)}>
  <img src={previewUrl} className="w-12 h-12 object-cover rounded-lg" />
  {/* Checkmark badge for complete */}
  {isValid && (
    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
      <Check className="h-3 w-3 text-primary-foreground" />
    </div>
  )}
</div>
```

### 4. Fix Yellow Selection Color

**File:** `src/components/bulk-upload/ArtistTagInput.tsx`

Replace yellow with cyan brand color for selected search results:

**Before:**
```tsx
className="...hover:bg-accent text-sm transition-colors"
```

**After:**
```tsx
className={cn(
  "w-full text-left px-3 py-2.5 text-sm transition-all duration-150",
  "hover:bg-primary/10 hover:border-l-2 hover:border-primary"
)}
```

### 5. Glowing Input Fields

Add subtle glow on focus to input fields matching Scene aesthetic:

```tsx
<Input
  className={cn(
    "h-10 bg-white/[0.03] border-white/[0.1]",
    "focus:ring-primary/30 focus:border-primary/50",
    "focus:shadow-[0_0_12px_hsl(189_94%_55%/0.15)]"
  )}
/>
```

### 6. Visual Progress Bar

Replace "0 of 2 ready" text with a styled progress indicator:

```tsx
<div className="flex items-center gap-3">
  {/* Progress dots */}
  <div className="flex gap-1.5">
    {photos.map((_, idx) => (
      <div 
        key={idx}
        className={cn(
          "w-2 h-2 rounded-full transition-all duration-300",
          reviewedShows.get(photos[idx].id)?.isValid
            ? "bg-primary shadow-[0_0_8px_hsl(189_94%_55%/0.6)]"
            : "bg-white/20"
        )}
      />
    ))}
  </div>
  <span className={cn(
    "text-sm font-medium",
    validShows.length > 0 ? "text-primary" : "text-muted-foreground"
  )}>
    {validShows.length} of {photos.length} ready
  </span>
</div>
```

### 7. Better Empty State Label

Change "Add Info" to clearer language with icon:

```tsx
<div className="flex items-center gap-2">
  <span className="text-base" style={{ textShadow: '0 0 8px rgba(255,255,255,0.2)' }}>
    ✦
  </span>
  <span className="text-sm text-white/60">
    {artists.length > 0 ? artists.map(a => a.name).join(", ") : "Who'd you see?"}
  </span>
</div>
```

### 8. Always-Visible Photo Actions on Mobile

Make edit/delete icons always visible on expanded cards:

```tsx
{isExpanded && (
  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 rounded-lg">
    <button className="p-1.5 rounded-full bg-white/20 backdrop-blur-sm">
      <Pencil className="h-3.5 w-3.5 text-white" />
    </button>
    <button className="p-1.5 rounded-full bg-white/20 backdrop-blur-sm hover:bg-destructive/80">
      <X className="h-3.5 w-3.5 text-white" />
    </button>
  </div>
)}
```

### 9. Inline Rating Preview

Show rating summary in collapsed state if ratings exist:

```tsx
{/* Show mini rating pills in collapsed state */}
{hasRatings && !isExpanded && (
  <div className="flex gap-1 mt-1">
    {[artistPerformance, sound, lighting, crowd, venueVibe]
      .filter(v => v !== null)
      .slice(0, 3)
      .map((val, idx) => (
        <span key={idx} className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center">
          {val}
        </span>
      ))}
  </div>
)}
```

### 10. Enhanced CTA Button

Apply Scene's signature gradient to the primary action button:

```tsx
<Button
  onClick={handleAddAll}
  disabled={validShows.length === 0 || isSubmitting}
  className={cn(
    "w-full py-6 text-base font-semibold rounded-xl",
    "bg-gradient-to-r from-cyan-500 via-primary to-coral",
    "shadow-lg shadow-primary/25",
    "hover:shadow-primary/40 hover:scale-[1.01]",
    "disabled:opacity-50 disabled:shadow-none",
    "transition-all duration-200"
  )}
  size="lg"
>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/BulkUploadFlow.tsx` | Add mesh gradient background + noise texture |
| `src/components/bulk-upload/BulkReviewStep.tsx` | Visual progress dots, enhanced CTA button |
| `src/components/bulk-upload/PhotoReviewCard.tsx` | Glassmorphism cards, status rings, better labels, always-visible photo actions |
| `src/components/bulk-upload/ArtistTagInput.tsx` | Fix yellow color → cyan, add glow effects to input |

---

## Summary of Improvements

**Visual:**
- Mesh gradient backgrounds matching Scene brand
- Glassmorphism cards with subtle blur and glow
- Fixed color palette (cyan/coral, no yellow)
- Luminous text effects
- Noise texture for tactile feel

**UX:**
- Visual progress dots showing completion at a glance
- Status rings on thumbnails for quick scanning
- Always-visible photo edit/delete on mobile
- Clearer empty state labeling
- Rating preview in collapsed state

