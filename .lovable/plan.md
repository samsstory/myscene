

## Redesign PWA Auth Screen — Full-Bleed Background Photo

### What Changes

**`src/pages/PwaAuth.tsx`** — Complete layout rework:

- **Background**: Use the same landing page hero image (`/images/fred-again-msg-mobile.webp`) as a full-screen background covering the entire viewport (no boxed container)
- **Gradient overlay**: Heavy bottom-to-top fade from black/`bg-background` covering the lower ~60% of the screen, so the photo melts into darkness
- **Logo**: SceneLogo centered vertically in the upper-middle area, layered on top of the photo
- **Tagline**: "Track, rank, and share every concert" directly below the logo
- **Log In button**: Cyan full-width rounded button near the bottom
- **Sub-text**: Change "Create an account" to **"New to Scene? Sign Up"** with "Sign Up" as the tappable part

### Layout Structure
```text
┌──────────────────────┐
│                      │
│   (background photo  │
│    full bleed)       │
│                      │
│      SCENE ✦         │
│  Track, rank, and    │
│  share every concert │
│                      │
│  ┌────────────────┐  │
│  │    Log In      │  │  ← gradient fade to black here
│  └────────────────┘  │
│  New to Scene? Sign Up│
└──────────────────────┘
```

### Technical Details
- Remove the `<img>` in its own rounded box; replace with a full-viewport `absolute inset-0` background image
- Add gradient overlay: `bg-gradient-to-t from-background via-background/90 to-transparent` positioned over the image
- Keep existing motion animations
- Keep navigation logic (`/auth` and `/auth?tab=signup`)

