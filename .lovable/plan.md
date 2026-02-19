

# Rename Show Types: Set / Show / Festival

## Summary

Rename the three event classifications from their current values (`show`, `showcase`, `festival`) to (`set`, `show`, `festival`) with updated labels and descriptions throughout the database and UI.

| Current DB value | Current UI label | New DB value | New UI label | New description |
|---|---|---|---|---|
| `show` | Solo Show | `set` | Set | 1 artist, 1 performance |
| `showcase` | Showcase | `show` | Show | Multiple sets, different artists, 1 event |
| `festival` | Festival | `festival` | Festival | Multiple artists, multiple sets, multiple stages |

---

## Phase 1: Database Migration

Run a SQL migration to update all existing rows:

```text
UPDATE shows SET show_type = 'set' WHERE show_type = 'show';
UPDATE shows SET show_type = 'show' WHERE show_type = 'showcase';
```

Order matters: rename `show` -> `set` first, then `showcase` -> `show`, to avoid collisions.

Also update the default column value from `'show'` to `'set'`:

```text
ALTER TABLE shows ALTER COLUMN show_type SET DEFAULT 'set';
```

---

## Phase 2: UI Changes (all files)

### 2A. ShowTypeStep.tsx (type selector cards)
- Change `ShowType` union: `'set' | 'show' | 'festival'`
- Update the three card definitions:
  - `set` / Music icon / "Set" / "1 artist, 1 performance."
  - `show` / Layers icon / "Show" / "Multiple sets, different artists, 1 event."
  - `festival` / Tent icon / "Festival" / "Multiple artists, multiple sets, multiple stages."

### 2B. UnifiedSearchStep.tsx
- Update `UnifiedShowType` union to `'set' | 'show' | 'festival'`
- Change `isEventMode` check from `showcase` to `show`
- Update heading/placeholder strings:
  - `show` -> "Name this event or night" (was showcase)
  - `festival` stays the same
  - `set` -> "Search for an artist" (was show)

### 2C. VenueStep.tsx
- Update type annotations from `'show' | 'showcase' | 'festival'` to `'set' | 'show' | 'festival'`

### 2D. AddShowFlow.tsx
- Update all `showType` comparisons: `'show'` -> `'set'`, `'showcase'` -> `'show'`
- Update the edit-mode label map: `{ set: "Set", show: "Show", festival: "Festival" }`

### 2E. Home.tsx
- Update filter state type: `"all" | "set" | "show" | "festival"`
- Update `typeCounts` keys and filter pill labels:
  - `set` -> "Sets"
  - `show` -> "Shows"
  - `festival` -> "Festivals"

### 2F. DemoAddShowFlow.tsx
- Update `showType` type annotation

### 2G. useFriendActivity.ts
- Update comment from `'show' | 'showcase' | 'festival'` to `'set' | 'show' | 'festival'`

### 2H. CompareShowSheet.tsx
- No logic changes needed (passes through raw `show_type` value)

---

## Phase 3: ELO Ranking Pool Alignment

The ranking/comparison system segments by `show_type`. Since `festival` is unchanged, only the pool labels shift. The smart-pairing logic in `CompareShowSheet.tsx` and `Rank.tsx` uses the raw DB value, so once the migration runs and the UI sends the new values, pools automatically align. No additional ranking code changes expected, but will verify during implementation.

---

## Risk Considerations

- **Data migration order** is critical to avoid `show` -> `show` collision. The two-step UPDATE handles this.
- **Existing demo data** served by the `get-demo-data` edge function may contain old values. Will check and update if needed.
- **In-flight sessions**: Users with the old app version cached could still send `showcase`. The DB accepts any text, so no hard failure, but the value would be orphaned. Low risk for 50 beta users.

