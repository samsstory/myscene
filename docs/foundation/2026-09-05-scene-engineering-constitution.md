# Scene engineering constitution

**Status:** Accepted

**Date:** 2026-09-05

**Owners:** Sam and the Scene engineering team

## The standard

Scene should feel effortless to a fan because the system beneath it is deliberate. We will move quickly by making the safe, simple path the default, not by skipping discipline and fixing it later.

The target is a product that can withstand due diligence: clear ownership of infrastructure and data, a legible codebase, repeatable releases, explicit privacy controls, and evidence that the product works on real devices.

## The five filters

Every product request, design, migration, and line of production code must pass these filters.

| Filter | Question | Standard |
| --- | --- | --- |
| User value | Does this deepen remembering, ranking, revealing, sharing, or comparing? | If it does not help the alpha loop, defer it. |
| Taste | Does it make Scene feel more intentional, calm, and emotionally premium? | Fewer strong interactions beat more features. |
| Trust | Would a fan understand what we collect, what is private, and what sharing does? | Private by default. Explicit, revocable sharing. |
| Durability | Can a new engineer or future acquirer understand and safely change this? | Small modules, typed contracts, documented decisions, no hidden magic. |
| Evidence | How will we know it works in real use? | Define the event, test, and release check before implementation. |

## Architecture posture

### One customer app, two supported platforms

The customer experience is React Native + Expo. We ship iOS first while continuously preserving Android compatibility. We do not build parallel iOS and Android products or maintain the legacy web UI as a duplicate fan app.

### Modular monolith

Scene is intentionally a modular monolith:

- Expo client for the fan experience.
- Supabase for authentication, Postgres, storage, and narrowly scoped server functions.
- Existing web app for public/share and operator surfaces.
- Platform-neutral domain modules for types, validation, ranking, analytics definitions, and copy where sharing is genuinely useful.

This is enough architecture for a high-quality alpha. Add a service, vendor, queue, or abstraction only when a measured constraint requires it.

### Owned infrastructure

All new production work uses the owned **Scene Alpha** Supabase project (`socecmittzxakuttdhma`). Credentials belong to Sam’s organization and are never embedded in source or client bundles beyond approved public keys.

The legacy database is not a production dependency for the new app. It is a frozen reference while data recovery options are assessed with user consent.

## Data and privacy rules

1. **Private canon:** personal show data is visible only to its creator by default.
2. **Share artifacts:** a share is a deliberately shaped, revocable representation with a token and an expiry policy. It is not a permission to query a user’s raw records.
3. **Least collection:** no exact home location, contact upload, background location, or behavioral collection unless it is both essential and explicitly approved.
4. **Database-enforced trust:** Row Level Security and server-side checks are the authority. UI visibility is not a security boundary.
5. **Deletion is a product capability:** we design account, memory, share, and media deletion paths before expanding beyond alpha.
6. **No silent transfers:** importing legacy data requires the individual’s active authorization and moves only their own data.

## Product delivery discipline

Every meaningful feature begins with a one-page contract in `docs/contracts/`. The contract defines outcome, scope, behavior, data, privacy, success signal, and verification.

Every decision that would be expensive to reverse has an ADR. An ADR is not ceremony. It prevents us from rediscovering why we chose a path six months later.

Every release follows a short checklist: schema/policy review, automated checks, real-device flow, analytics visibility, rollback path, and release note.

## Quality ratchet

The new mobile codebase begins with strict standards. New code cannot add TypeScript escapes, untyped API contracts, or untested authorization behavior.

We will not let existing web-app debt paralyze the rebuild. The legacy app is preserved, not declared healthy. Each legacy area we touch must be left no worse than we found it. New mobile code has its own clean baseline and CI gate from its first commit.

## A founder-friendly workflow

Sam should be able to speak in outcomes, not implementation instructions. The translation into a safe build follows this sequence:

```text
Outcome → feature contract → visual/interaction decision → data/privacy design
        → implementation → automated checks → real-device proof → release note
```

An agent or engineer must surface tradeoffs early, choose the smallest reliable approach, and translate the technical result back into product terms. No hidden scope, silent data access, or “we can clean it up later” decisions.

## Measures that matter

We judge the system by evidence, not activity:

- invitee reaches first saved memory;
- invitee reaches 5 shows and starts ranking;
- invitee reaches the Opening Scene reveal at 10 shows;
- a share or comparison leads to another meaningful collection action;
- privacy/authorization tests remain green;
- critical flows work on real devices;
- releases are reversible and incidents are diagnosable.

## Immediate implementation sequence

1. Create the Expo mobile workspace and strict quality baseline, using mock data first.
2. Define the alpha domain contracts and the first feature contract: personal invite to first saved memory.
3. Create the minimal private-by-default Scene Alpha schema and adversarial authorization tests.
4. Establish CI and a device-release checklist before adding more product surface.
