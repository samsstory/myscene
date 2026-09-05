# Scene engineering operating system

Scene is a premium consumer product. Treat every change as if it will be examined by a future acquirer, an iOS/Android reviewer, and a user trusting us with personal concert memories.

## Product and architecture boundary

- The fan product is one React Native + Expo application for iOS and Android. iPhone TestFlight ships first; Android compatibility is maintained from the first feature.
- The existing Vite/React application is legacy web: preserve it for operator tools, invite generation, and public share pages. Do not extend it as a second consumer mobile app.
- Scene Alpha Supabase project ref is `socecmittzxakuttdhma`. It is the only backend authorized for new alpha work. Never point new code at the legacy project.
- Do not copy legacy schema wholesale. New data is private by default and created through additive, reviewed migrations.
- Keep a modular monolith. Do not add microservices, a separate API layer, or a new vendor unless a documented constraint requires it.

## Non-negotiable product rules

- A concert memory, photo, note, ranking, and comparison belong to its creator and are private by default.
- Sharing creates a narrow, revocable artifact. It never grants raw-table access to a private memory.
- Collect the minimum data that directly powers the current alpha. No contact syncing, background location, broad social graph, or push permission in the core path.
- Never ship generic social-network scope ahead of the core loop: remember, rank, reveal, share, compare.
- Preserve existing work. Reuse, reshape, or hide it. Do not delete a legacy feature or data model without explicit approval.

## Before implementation

Read `docs/audit/2026-09-05-current-app-inventory.md` and map the requested capability to existing behavior before proposing new production code. Preserve valuable implementation and distinguish source presence from runtime verification. Resolve the inventory's product/privacy conflicts explicitly before implementing affected schemas or access policies.

For every meaningful feature, write or update a short feature contract in `docs/contracts/` before production code. It must state:

1. User outcome and non-goals.
2. Happy path, empty state, failure state, and recovery.
3. Data created/read and its privacy classification.
4. Analytics signal that proves whether the feature works.
5. Test cases, including owner, unrelated signed-in user, and anonymous visitor when data is involved.

Use an ADR in `docs/decisions/` for irreversible, cross-cutting, or costly decisions: architecture, vendor selection, authentication, data model, sharing semantics, platform capability, or release strategy.

## Code rules

- Make the smallest coherent change. Do not mix a feature with unrelated refactors.
- Keep domain rules and validation platform-neutral. UI code orchestrates; it does not own authorization or ranking truth.
- Define contracts at boundaries. No `any`, implicit data shape, or client-only authorization for new alpha code.
- Server/database policies enforce ownership. Client filtering is for experience, never security.
- Keep secrets server-side. Expo receives only public configuration. Never commit credentials, database passwords, service-role keys, or access tokens.
- Prefer supported Expo and Supabase capabilities over custom native code or bespoke infrastructure.
- Make accessibility, loading, offline/poor-network behavior, and destructive-action recovery part of the feature, not polish added later.

## Quality ratchet

New alpha code starts clean and stays clean: strict TypeScript, formatting, linting, unit tests for domain rules, and integration tests for authorization/data behavior.

The legacy application has existing quality debt. Do not claim it is clean or let its failures block the new mobile foundation. Do not worsen it. Any touched legacy area must leave with equal or better checks than it had.

Before a user-facing alpha release, verify on a physical iPhone and an Android emulator/device as appropriate, validate critical deep links/auth/photos/sharing, and run privacy tests with owner, unrelated user, and anonymous states.

## Documentation and operations

- Keep `docs/plans/2026-07-26-scene-alpha-recovery-plan.md` as the authoritative alpha product context.
- Keep `docs/design/2026-07-26-scene-figma-directions.md` as the visual baseline. Electric Canon is the approved direction; constellation work is future exploration only.
- Record operational procedures in `docs/runbooks/` once an external service, release, incident, or manual process becomes repeatable.
- Every release has a rollback path and a short release note. Never run destructive data operations against production without explicit approval and a recovery plan.

## AI collaboration protocol

When asked to build, an agent must state the intended user outcome, affected data/privacy surface, and verification plan before making consequential changes. On completion, report what changed, what was tested, remaining risk, and the next recommended move in plain language.
