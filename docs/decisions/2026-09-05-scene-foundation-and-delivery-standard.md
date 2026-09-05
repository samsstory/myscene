# ADR: Scene foundation and delivery standard

**Status:** Accepted

**Date:** 2026-09-05

**Decider:** Sam

**Related:** [Scene Alpha Recovery Plan](../plans/2026-07-26-scene-alpha-recovery-plan.md), [Scene Engineering Constitution](../foundation/2026-09-05-scene-engineering-constitution.md)

## Context

Scene is being rebuilt as a premium, cross-platform native app while the founder leads product without needing to become a full-time engineer. The prior backend was not owned by the company and the legacy web code has accumulated broad product and privacy debt. The new owned Scene Alpha backend is clean.

The risk is not only a bad technical choice. It is drifting into inconsistent product decisions, overbuilt systems, unclear data handling, and changes that cannot be safely maintained by a small AI-enabled team.

## Decision

Scene adopts a lightweight engineering operating system:

- React Native + Expo is the one fan-client codebase for iOS and Android.
- Supabase in the owned Scene Alpha project is the alpha backend.
- The system remains a modular monolith until a demonstrated constraint requires more infrastructure.
- Every meaningful feature receives a short contract before implementation.
- Every irreversible, cross-cutting, or costly decision receives an ADR.
- New mobile code has strict typing, linting, formatting, domain tests, and authorization tests from day one.
- Releases require real-device proof, a rollback path, and a concise release note.
- Personal concert data is private by default; shares are deliberate, revocable artifacts.
- `AGENTS.md` is the operational instruction set for AI-assisted contributors.

## Alternatives considered

### Move fastest with direct prompting and minimal process

**Benefit:** lowest immediate friction.

**Rejected because:** it creates invisible architectural decisions, unpredictable quality, and security debt that a small team cannot afford to unwind later.

### Build a heavy enterprise platform before the alpha

**Benefit:** extensive theoretical controls.

**Rejected because:** it delays learning, adds operational burden, and builds for scale before the core product loop is proven.

### Lightweight, enforceable quality ratchet

**Benefit:** makes good decisions repeatable while preserving speed.

**Accepted because:** it matches a founder-led, AI-enabled team and produces clear acquisition-quality evidence without premature complexity.

## Consequences

- A request may be deferred when it does not support the alpha loop or fails the privacy/taste/durability filters.
- Work begins with a short decision or feature artifact more often, but avoids expensive rework.
- The legacy app is not a template for new privacy or architecture decisions.
- CI is introduced alongside the new mobile workspace rather than turned on against existing legacy failures.

## Action items

1. [ ] Create the Expo workspace with a clean TypeScript and test baseline.
2. [ ] Define domain contracts for identity, private memories, and share artifacts.
3. [ ] Write the first feature contract before schema or mobile implementation.
4. [ ] Create an alpha release checklist and make it a required gate before TestFlight distribution.
