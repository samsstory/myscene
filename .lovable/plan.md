

## Deep Analysis: Setup Quests — What's Wrong & How to Fix

### Root Cause

The quests were built as **three entirely new sheet components** (`ProfilePhotoSheet`, `SpotifyConnectSheet`, `HomeCityPickerSheet`) that duplicate logic already existing in Profile settings — but with subtle differences that cause bugs:

| Quest | Profile Settings | Quest Sheet | Problem |
|-------|-----------------|-------------|---------|
| Profile Photo | `handleAvatarUpload` — uploads to storage, updates `profiles.avatar_url` | `ProfilePhotoSheet` — same logic but adds `?t=` cache-buster | Two different upload paths; quest version saves a URL with `?t=` appended, Profile version doesn't. Inconsistent avatar URLs in DB |
| Home City | Inline Mapbox search + `selectCity()` | `HomeCityPickerSheet` — duplicates same Mapbox search + save | Two copies of same logic, minor differences |
| Spotify | `initiateSpotifyAuth()` call | `SpotifyConnectSheet` — wraps same call in a full sheet | Unnecessary 70-line component for a single button click |
| Log Show | `onAddShow()` | Calls `onAddShow()` | Works fine, no duplication |

Additionally, the **animation system** in `SetupQuestsCard` is overengineered — tracking `hidden`, `animatingOut`, `prevCompletedKey` with refs, timers, and multiple `useEffect` dependencies. This complexity is why the animations keep breaking.

### The Fix: Remove Duplicates, Simplify Animation

**1. Delete `ProfilePhotoSheet.tsx`**
- Quest tap triggers a hidden `<input type="file">` directly on the SceneView (same pattern as Profile's `fileInputRef`)
- Upload handler reuses the exact same logic as Profile's `handleAvatarUpload`
- Add the `?t=` cache-buster to Profile's upload too, for consistency

**2. Delete `SpotifyConnectSheet.tsx`**
- Quest tap calls `initiateSpotifyAuth()` directly — no sheet needed, the OAuth redirect happens immediately

**3. Keep `HomeCityPickerSheet.tsx`** (it needs a search UI, can't be a single click)
- No changes needed, it works correctly

**4. Simplify `SetupQuestsCard.tsx` animation**
- Remove the `hidden`/`animatingOut`/`prevCompletedKey` tracking system
- Show all incomplete quests. Completed quests simply don't render (they're filtered out by the parent)
- When `useSetupQuests` refetches and a quest flips to `completed`, it disappears from the list naturally via `AnimatePresence exit` animation
- This is ~50 fewer lines and eliminates the timing bugs

**5. Fix `SceneView.tsx`**
- Remove `photoSheetOpen`/`spotifySheetOpen` state
- Add a hidden file input ref for avatar upload
- Simplify `handleQuestTap` to directly execute actions instead of opening sheets

**6. Fix `Profile.tsx` avatar upload**
- Add `?t=` cache-buster to match, so avatar URLs are consistent everywhere

### Files Changed
- **Delete**: `src/components/home/ProfilePhotoSheet.tsx`, `src/components/home/SpotifyConnectSheet.tsx`
- **Edit**: `src/components/home/SetupQuestsCard.tsx` (simplify animation)
- **Edit**: `src/components/home/SceneView.tsx` (remove sheet state, add file input, simplify quest handlers)
- **Edit**: `src/components/Profile.tsx` (add cache-buster to avatar upload)
- **Edit**: `src/hooks/useSetupQuests.ts` (no changes needed, hook is clean)

