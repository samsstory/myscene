

## Update: Rename "Openers" to "Additional Artists"

### What changes

This is a terminology update across the approved plan. Everywhere the flow references "openers" or "Did you see any openers?", it should use "additional artists" instead.

**Specifically in the plan:**

1. **`OpenersPromptStep.tsx`** → Rename to **`AdditionalArtistsPromptStep.tsx`**
   - Prompt text: **"Did you see any other artists at this event?"** (instead of "Did you see any openers?")
   - Yes/No buttons remain the same
   - Callbacks: `onAddArtists()` / `onSkip()` (not `onAddOpeners`)

2. **`AddShowFlow.tsx`** — Internal naming
   - Sub-step flag: `showAdditionalArtists` (not `showOpenersAdder`)
   - Step label in progress dots: "Artists" (not "Openers")

3. **User-facing copy** — No mention of "openers" anywhere. The prompt is simply about whether there were other artists at the event, which covers openers, support acts, surprise guests, and co-headliners without forcing a hierarchy label.

Everything else from the previously approved plan remains unchanged — same step order (`Type → Search → AdditionalArtistsPrompt → [ArtistsStep if Yes] → EventName → Venue → Date → Rating → Success`), same show_type inference logic, same ELO ranking behavior.

