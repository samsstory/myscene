

## Make Landing V2 the Default

A simple route swap in `App.tsx` to make the V2 landing page the default experience.

### Change Summary

**File:** `src/App.tsx`

| Current Route | Current Component | New Route | New Component |
|---------------|-------------------|-----------|---------------|
| `/` | `Index` (original) | `/` | `IndexV2` (V2) |
| `/landing-v2` | `IndexV2` | `/landing-v1` | `Index` (original) |

### What This Means

- **Visitors to your site** will now see the V2 landing page by default
- **The original landing page** will still be accessible at `/landing-v1` if you want to compare or revert
- **No other changes needed** - all imports are already in place

### Technical Details

```tsx
// Before
<Route path="/" element={<Index />} />
<Route path="/landing-v2" element={<IndexV2 />} />

// After  
<Route path="/" element={<IndexV2 />} />
<Route path="/landing-v1" element={<Index />} />
```

