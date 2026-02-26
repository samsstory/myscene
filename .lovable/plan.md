

## Verification: Dedup Sort Consistency

Confirmed — the existing pattern in `useTextImportUpload.ts` already handles this correctly:

- **Existing shows side** (line 49): `.map(a => a.artist_name.toLowerCase()).sort()`
- **New shows side** (line 73): `.map(a => a.name.toLowerCase()).sort().join(",")`

Both lowercase first, then alphabetical sort. Order-independent and case-normalized. The new `usePendingEmailImports` hook will copy this exact pattern verbatim.

No plan changes required. Ready to build.

