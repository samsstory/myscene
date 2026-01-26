
# Minimal Check Icon Buttons for VS Battle

## Design

Replace the current "This One" buttons with ghost buttons containing only a checkmark icon:

```text
+------------------+     +------------------+
|   [Show Card]    |     |   [Show Card]    |
+------------------+     +------------------+
       [ ✓ ]       VS          [ ✓ ]
```

## Implementation

### Button Style

```tsx
<Button 
  onClick={() => handleChoice(showPair[0].id)}
  disabled={comparing}
  variant="ghost"
  size="icon"
  className="w-full h-10"
>
  <Check className="h-5 w-5" />
</Button>
```

- `variant="ghost"` - subtle background on hover only
- `size="icon"` combined with `w-full` - full width tap target but icon-sized height
- Single `Check` icon from lucide-react (already available)

### Changes Summary

| Element | Current | New |
|---------|---------|-----|
| Pick buttons | Filled primary, Trophy icon + "This One" | Ghost, Check icon only |
| Skip text | "Can't decide? Skip this one" | "Can't Compare" |
| Trophy import | Used | Remove (no longer needed) |
| Check import | Not used | Add to imports |

## File to Modify

`src/components/Rank.tsx`:
1. Update lucide-react imports: remove `Trophy`, add `Check`
2. Change both pick buttons to ghost variant with Check icon
3. Update skip button text to "Can't Compare"

## Visual Result

- Cards remain the visual focus
- Checkmark provides clear "select this" affordance
- Full-width tap target for easy mobile use
- Clean, minimal aesthetic matching the dark theme
