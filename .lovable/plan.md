

## Problem
The search input in the FindFriendsSheet auto-focuses on open, which triggers the mobile keyboard immediately and covers the sheet content. Users should have to explicitly tap the search field first.

## Changes

### 1. Prevent auto-focus on the search input (`FindFriendsSheet.tsx`)
- Add `autoFocus={false}` to the search `<input>` (line 233) and the phone `<input>` in `PhoneLookup` (line 154)
- This ensures the keyboard only opens when the user explicitly taps a field

### 2. Increase sheet height for keyboard visibility (`FindFriendsSheet.tsx`)
- Change `max-h-[80dvh]` to `max-h-[92dvh]` on the `SheetContent` (line 218) so when the keyboard does open, both the search field and phone number field remain visible above it
- Add `min-h-[60dvh]` to ensure the sheet is tall enough by default

Two small edits, both in `FindFriendsSheet.tsx`.

