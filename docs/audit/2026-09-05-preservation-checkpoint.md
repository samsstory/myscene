# Scene preservation checkpoint

Date: 2026-09-05
Purpose: preserve the existing application and accumulated visual, native-shell, product and audit work before alpha implementation.

## Recovery reference

Local annotated tag: `scene-preservation-2026-09-05`
Local branch: `codex/scene-preservation-2026-09-05`
Parent commit: `b64946f` (`Make event registry skip venue`)

The tag identifies the checkpoint commit containing this document. This is a preservation snapshot, not a release or a claim that the application passes its quality gates. It is local only until explicitly pushed or backed up elsewhere.

To inspect it without modifying the current checkout:

```sh
git show --stat scene-preservation-2026-09-05
git diff scene-preservation-2026-09-05 -- src supabase/migrations
```

Use a separate Git worktree if a runnable historical copy is needed. Do not reset the current worktree or database to recover old code.

## Included

- Existing committed web application and legacy migration/function sources, unchanged by this checkpoint.
- Current package and lockfile changes adding Capacitor dependencies.
- Capacitor configuration and iOS source/project/assets, excluding generated build output.
- Engineering instructions, decisions, product plans, visual research/directions and decision board.
- Source inventory and observed public/demo/signed-in walkthrough findings.
- Ignore rules preventing future accidental inclusion of backend CLI caches and new environment files.

## Excluded and retained locally

- `supabase/.temp/`: local CLI connection/cache state, including project linking details. It remains on disk, not in the checkpoint.
- Ignored dependencies, web build output, iOS generated/copied web assets, local IDE state and local environment overrides.
- No database dump, customer-data export, credentials export, production settings snapshot or outside-workspace image archive was created. Referenced external mockup files are not automatically backed up by Git.

The already-tracked `.env` was classified by variable names and decoded key role: it contains the legacy Supabase project identifier, URL and an anonymous/public client key. It is not a service-role credential. It is preserved as existing legacy configuration; this does not authorize using the legacy backend for new alpha code.

## Review and limits

- Checked candidate text for private-key blocks, common provider secret formats, credential-bearing URLs, literal secret assignments and non-anonymous JWTs. No pattern findings in checkpoint candidates. This is a targeted local check, not exhaustive secret-history certification.
- No application logic, customer memories, votes, followers or database schema was deliberately changed to create this checkpoint.
- Prior web build passed, but application TypeScript and lint failed. See the [inventory](2026-09-05-current-app-inventory.md) for exact baseline results. The iOS shell/package mismatch is preserved, not repaired.
- Public/private defaults conflict between product and engineering documents. The [walkthrough](2026-09-05-runtime-walkthrough.md) also records sample social content and automatic ranking initialization. Preservation does not resolve or endorse these issues.

Next: decide profile/memory visibility and choose a bounded, tested reuse contract before implementing new mobile behavior. Keep historical source intact and test write-heavy mechanics in an isolated environment.
