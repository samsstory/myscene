

# Unify ShowReviewSheet UI for Shows With and Without Photos

## Problem Identified
The `HeroPhotoSection` component has **two separate rendering paths**:

1. **With photo** (lines 53-128): Recently updated with:
   - White background/black text score badge
   - Edit pencil button in top-left
   - Rank badge with cyan glow effect
   - Full glass metadata bar

2. **Without photo** (lines 130-181): **Still using OLD styling** with:
   - Colored gradient score badge (yellow/green)
   - No edit pencil button
   - No rank badge at all
   - Simpler metadata bar layout

Your screenshot shows a show without a photo, which is why it looks different from the updated design.

---

## Proposed Changes

### File: `src/components/show-review/HeroPhotoSection.tsx`

Update the "no photo" state (lines 130-181) to match the "with photo" state:

1. **Add Edit Pencil Button** (top-left)
   - Same glass pill styling as the photo version
   - Calls `onEditShow` handler

2. **Update Score Badge to White Background/Black Text**
   - Replace `getScoreGradient(score)` gradient with `bg-white`
   - Change text from white to black
   - Remove text shadow

3. **Add Rank Badge with Cyan Glow**
   - Add the `#X All Time` text below the score
   - Apply primary color with glow effect
   - Include the "Rank" button for shows needing more comparisons

4. **Move Score/Rank to Bottom-Right of Metadata Bar**
   - Mirror the layout structure from the photo version
   - Score and rank positioned at bottom-right of the glass bar

---

## Visual Comparison

| Element | With Photo (Current) | Without Photo (Before) | Without Photo (After) |
|---------|---------------------|----------------------|----------------------|
| Score Badge | White bg, black text | Gradient bg, white text | White bg, black text ✓ |
| Edit Pencil | Top-left glass button | Missing | Top-left glass button ✓ |
| Rank Badge | Cyan glow, bottom-right | Missing | Cyan glow, bottom-right ✓ |
| Rank Button | Shown if < 5 comparisons | Missing | Shown if < 5 comparisons ✓ |

---

## Technical Changes

### Lines to Update: 131-177

```tsx
// No Photo State - updated to match photo version
return (
  <div className={cn(
    "relative aspect-[4/3] rounded-xl overflow-hidden",
    "bg-gradient-to-br from-primary/20 via-background to-primary-glow/10",
    "border border-white/10"
  )}>
    {/* Animated glow effect */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

    {/* Top Left: Edit Show Button */}
    <button 
      onClick={onEditShow} 
      className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
    >
      <Pencil className="h-4 w-4 text-white/80" />
    </button>

    {/* Top Right: Scene Logo */}
    <div className="absolute top-3 right-3 px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
      <SceneLogo size="sm" />
    </div>

    {/* Center: Upload Prompt */}
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <div className="p-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20" style={{
        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        boxShadow: "0 0 20px rgba(255,255,255,0.1)"
      }}>
        <Camera className="h-8 w-8 text-white/60" />
      </div>
      <Button variant="outline" className="..." onClick={() => fileInputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : "Add Photo"}
      </Button>
    </div>

    {/* Bottom: Glass Metadata Bar - matching photo version layout */}
    <div className="absolute bottom-0 left-0 right-0 p-4">
      <div className="bg-white/[0.05] backdrop-blur-md rounded-xl border border-white/[0.1] p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Artist/Venue/Date info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-xl text-white tracking-wide truncate">{headliner?.name}</h2>
            {supportingArtists.length > 0 && <p className="text-white/50 text-xs">+ {supportingArtists...}</p>}
            <button onClick={openInMaps}>...</button>
            <p className="text-white/50 text-xs">{formattedDate}</p>
          </div>
          
          {/* Right: Score & Rank Column - NEW */}
          <div className="gap-2 flex-shrink-0 flex-col flex items-end justify-center py-[12px]">
            {/* Score Badge - White background, black text */}
            <div className="px-3 py-1.5 rounded-full bg-white border border-white/20">
              <span className="text-sm font-black text-black tracking-wide">{score.toFixed(1)}</span>
            </div>
            {/* Rank Badge - Prominent with glow */}
            <span className="text-sm font-bold text-primary tracking-wide" style={{
              textShadow: "0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary) / 0.5)"
            }}>
              {rankPosition > 0 ? `#${rankPosition} All Time` : "Unranked"}
            </span>
            {/* Rank Button if needed */}
            {needsMoreRanking && onRankThisShow && (
              <button onClick={onRankThisShow} className="...">
                <Scale className="h-2.5 w-2.5" />
                Rank
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Hidden file input */}
    <Input ref={fileInputRef} ... />
  </div>
);
```

---

## Result
After this change, both the "with photo" and "without photo" states of the ShowReviewSheet will have:
- ✅ Edit pencil button (top-left)
- ✅ Scene logo (top-right)  
- ✅ White score badge with black text
- ✅ Cyan glowing rank badge
- ✅ Rank button for shows needing comparisons
- ✅ Consistent glass metadata bar layout

