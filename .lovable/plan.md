
# Redesign Stat Pills to Match Scene Logo Aesthetic

## Summary

Transform the current "card-style" stat pills into minimal, elegant typography-driven elements that match the Scene logo's glowing, airy aesthetic—using subtle text shadows, wide tracking, and reduced visual weight instead of heavy borders and backgrounds.

---

## Current State Analysis

**Current Stat Pills:**
- Solid card backgrounds (`bg-card`) with visible borders
- Rounded rectangular shapes (`rounded-2xl`)
- Primary color icons with gradient highlights
- Chunky, button-like appearance

**Scene Logo Aesthetic:**
- Text-driven, no heavy backgrounds
- Multi-layer glow effect (`textShadow`)
- Wide letter-spacing (`tracking-[0.25em]`)
- White/translucent coloring (`text-white/75`)
- Uppercase, bold typography
- Ethereal, floating appearance

---

## Design Direction

Transform pills from "tappable cards" → "glowing typographic elements" that feel like they're part of the same visual system as the logo.

### Visual Changes

| Aspect | Current | Proposed |
|--------|---------|----------|
| Background | Solid card color | Transparent or very subtle (`bg-white/5`) |
| Border | Visible borders | Invisible or ultra-thin glow |
| Icons | Solid primary color | Subtle, smaller, muted |
| Label text | Small muted | Uppercase, tracked, glowing |
| Value text | Large bold | Slightly smaller, glowing white |
| Spacing | Compact pills | More airy, horizontal flow |

---

## Implementation

### 1. Update StatPills Component Styling

**File:** `src/components/home/StatPills.tsx`

Replace the current card-based styling with Scene-logo-inspired typography:

```tsx
// Current button styling
className={cn(
  "flex-shrink-0 px-4 py-3 rounded-2xl bg-card border transition-all text-left",
  stat.highlight ? "border-primary/30 bg-gradient-to-br from-primary/10 to-card" : "border-border",
  isInteractive && "hover:border-primary/50 hover:bg-accent/50 active:scale-95 cursor-pointer",
  !isInteractive && "cursor-default"
)}

// New minimal glow styling
className={cn(
  "flex-shrink-0 px-3 py-2 rounded-xl transition-all text-center",
  "bg-white/[0.03] backdrop-blur-sm",
  isInteractive && "hover:bg-white/[0.08] active:scale-95 cursor-pointer",
  !isInteractive && "cursor-default"
)}

// Add glow text styling to labels and values
style={{
  textShadow: isInteractive 
    ? "0 0 8px rgba(255,255,255,0.3), 0 0 16px rgba(255,255,255,0.1)"
    : undefined
}}
```

### 2. Typography & Layout Updates

**Label styling:**
```tsx
// Current
<span className="text-xs text-muted-foreground">{stat.label}</span>

// New - uppercase, tracked, smaller
<span className="text-[9px] uppercase tracking-[0.15em] text-white/50 font-medium">
  {stat.label}
</span>
```

**Value styling:**
```tsx
// Current
<span className={cn("text-xl font-bold", stat.highlight && "bg-gradient-primary bg-clip-text text-transparent")}>
  {stat.value}
</span>

// New - cleaner, glowing white
<span 
  className="text-lg font-bold text-white/90"
  style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}
>
  {stat.value}
</span>
```

### 3. Simplify Icon Presentation

Make icons smaller and more subtle:

```tsx
// Current
{stat.icon && <stat.icon className="h-3.5 w-3.5 text-primary" />}

// New - smaller, muted, optional glow
{stat.icon && (
  <stat.icon 
    className="h-3 w-3 text-white/40" 
    style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.2))" }}
  />
)}
```

### 4. Remove Chevron Indicators

The chevron adds visual clutter. Interactive state is communicated through hover glow instead:

```tsx
// Remove this section entirely
{isInteractive && (
  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
)}
```

### 5. Adjust Container Layout

Update the flex gap and padding for a more airy feel:

```tsx
// Current
<div className="flex gap-3 pb-2">

// New - tighter gap, centered alignment
<div className="flex gap-2 pb-2 items-center">
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/home/StatPills.tsx` | Complete styling overhaul to match Scene logo aesthetic |

---

## Visual Result

**Before:** Heavy, card-like buttons with solid backgrounds and visible borders

**After:** Floating, typographic elements with:
- Ultra-subtle glass background (`bg-white/[0.03]`)
- Glowing text effects matching the Scene logo
- Uppercase, tracked labels
- Clean white values with subtle shadow
- Muted, smaller icons
- Hover glow effect instead of border changes

---

## Technical Details

**Key CSS properties to match Scene logo:**

| Property | Value | Purpose |
|----------|-------|---------|
| `tracking-[0.15em]` | Wide letter-spacing | Matches logo's airy feel |
| `text-white/50` | Translucent labels | Subtle hierarchy |
| `textShadow` | Multi-layer glow | Luminous effect |
| `bg-white/[0.03]` | Near-invisible background | Floaty appearance |
| `backdrop-blur-sm` | Subtle blur | Glass effect |
| `uppercase` | All caps labels | Typography consistency |

This creates a cohesive visual language where the stat pills feel like they belong to the same design system as the Scene logo watermark.
