# ADR: React Native + Expo for the Scene Mobile Client

**Status:** Accepted  
**Date:** July 27, 2026  
**Decider:** Sam  
**Related:** [Scene Alpha Recovery Plan](../plans/2026-07-26-scene-alpha-recovery-plan.md)

## Context

Scene's alpha is iPhone-only through TestFlight, but the product should be available to Android users after beta. The current fan-facing experience is a Vite/React web application wrapped with Capacitor for iOS. Its product model, Supabase backend, ranking foundations, show features, and web/operator surfaces are valuable and must be preserved.

The approved alpha visual direction calls for a premium, mobile-native consumer experience. Building the customer app only in SwiftUI would create a second Android app after beta. Keeping the current web UI as the mobile UI would preserve the most screen code but limits the freedom to rebuild the product as a first-class mobile experience.

## Decision

Build the fan-facing Scene mobile client in **React Native with Expo**.

- Use one TypeScript/React mobile codebase for iOS and Android.
- Ship the first alpha only to iPhone users through TestFlight.
- Do not maintain a duplicate fan-facing consumer experience in the existing web app.
- Retain the existing React web app for personal-invite generation, public share pages, internal/operator tools, and future web surfaces.
- Preserve the existing Capacitor/iOS work. Audit it for credentials, deep-link knowledge, assets, and reusable capability work, but do not make it the alpha client shell.

## What is shared

Move or expose these as shared, platform-neutral modules where practical:

- Supabase access and domain types
- ranking logic and derived collection behavior
- validation and authorization rules
- analytics event definitions
- copy, images, icons, and design tokens
- API contracts and business rules

## What is rebuilt

The mobile UI is rebuilt in React Native. The current web DOM components, Tailwind/CSS styling, Radix/shadcn components, browser routing, and browser-only interaction code are not assumed to be portable.

## Alternatives considered

### Continue with React + Capacitor

**Benefit:** fastest path to keep existing web screens.  
**Rejected because:** the alpha is a substantial fan-facing product redesign, and the team wants the freedom of a mobile-native UI without creating an Android rebuild after beta.

### SwiftUI for iOS, Android later

**Benefit:** maximum iPhone-specific control.  
**Rejected because:** Android is a near-term public-launch requirement, not a distant possibility. A separate Android consumer app would duplicate the future UI rebuild.

### React Native + Expo

**Benefit:** native iOS and Android user interfaces from one React/TypeScript mobile client, with direct access to platform-specific native code where it earns its complexity.  
**Accepted because:** it aligns the alpha visual ambition with the post-beta distribution plan while preserving the existing product and backend work.

## Consequences

- The reviewable alpha prototype begins in React Native + Expo, using mock data before production data or schema changes.
- The iPhone alpha can use platform-specific polish without blocking Android compatibility.
- Android is continuously checked during development but has no beta cohort until the iPhone alpha is stable.
- Product rules, privacy, and data migration remain backend concerns shared by both web and mobile clients.
- The current web app remains useful rather than becoming a dead branch of the product.

## Immediate work

1. Inventory current consumer features and classify each as reuse now, reshape later, hide for alpha, or retire only with explicit approval.
2. Create the React Native + Expo review prototype for the locked alpha flow using mock data.
3. Complete the Phase 0 privacy, data, and existing-Capacitor audit before production implementation.
