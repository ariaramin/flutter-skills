---
name: flutter-firebase-analytics
description: Use when adding, configuring, designing, reviewing, debugging, testing, migrating, or optimizing Firebase Analytics in a Flutter app with FlutterFire firebase_analytics. Covers Firebase setup, GA4 recommended and custom events, event taxonomies and parameters, user IDs and properties, consent and collection control, screen and Router analytics, ecommerce purchases and refunds, DebugView, BigQuery, privacy and PII, cardinality, performance, environment separation, and cross-platform API differences. Trigger on Flutter Firebase Analytics, firebase_analytics, FirebaseAnalyticsObserver, logEvent, setUserId, setUserProperty, setConsent, duplicate or missing events, screen tracking, ecommerce measurement, or Analytics schema design. Do not use for generic application logs, Crashlytics, performance traces, backend audit logs, or non-Flutter GA4 work unless it directly affects the FlutterFire integration.
---

# Flutter Firebase Analytics

Build or repair useful, privacy-aware product measurement without turning
Analytics into application infrastructure.

## Workflow

1. Inspect before editing:
   - Read `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints, and the
     installed `firebase_analytics` changelog.
   - Identify every supported platform, Firebase project/environment, and
     native or Web collection configuration.
   - Search all Analytics initialization, event calls, user identity and
     property updates, consent changes, route observers, manual screen views,
     ecommerce events, and tests.
   - Determine event ownership, collection-before-consent requirements,
     identity lifecycle, reporting consumers, and duplicate-event risks.
2. Read the relevant sections of `references/production-guide.md`. Locate
   sections with `rg -n '^#|^##' references/production-guide.md`; do not load
   the entire reference when a focused section is sufficient.
3. Revalidate version-sensitive behavior against the installed package and
   current official FlutterFire, Firebase, GA4, Android, and Apple
   documentation. Prefer installed source and current official documentation
   when they conflict with the bundled August 2026 baseline.
4. Reuse the application's existing lifecycle, dependency injection,
   navigation, authentication, state-management, and testing patterns. Fix the
   shared event source with the smallest complete change.
5. Validate the affected flow with a fake or focused test, then use DebugView
   on every supported target where runtime behavior matters. Treat normal
   report latency separately from event emission.

## Reference Routing

- For installation or platform setup, read `Package Architecture`, `Platform
  Capability Matrix`, `Current Compatibility Baseline`, `Installation`, and
  `Platform Configuration`.
- For architecture or implementation, read `Initialization Strategy`,
  `Analytics Service Lifecycle`, `Recommended Architecture`, `Typed Analytics
  Events`, `Event Ownership`, and `Logging a Custom Event`.
- For schema design, read `Event Taxonomy` through `Schema Migration Strategy`,
  plus `Recommended Events` and `Event Limits`.
- For identity, privacy, or consent, read `User Identity` through `Consent and
  Privacy`, plus `Personally Identifiable Information` and `Privacy Rules`.
- For navigation, read `Screen Tracking` through `Navigation Analytics`.
- For commerce, read `Ecommerce Analytics` through `In-App Purchases and
  Subscriptions`.
- For performance or reliability, read `Performance Rules`, `Network and
  Battery Efficiency`, `Offline Behavior`, and `Reliability Rules`.
- For reporting and diagnostics, read `Custom Definitions`, `BigQuery
  Considerations`, `DebugView`, `Development Traffic`, `Environment Strategy`,
  and `Debugging Guide`.
- For reviews or migrations, use `Anti-Patterns`, `Implementation Checklist`,
  `Code Review Checklist`, `Version-Sensitive Areas`, and `Production Decision
  Rules`.

## Non-Negotiable Rules

- Treat Analytics as asynchronous product measurement, never a delivery
  acknowledgement, business state, accounting ledger, audit log, or command
  queue.
- Prefer a documented GA4 recommended event when its semantics fit. Keep event
  names and meanings stable and centrally owned.
- Never derive event or parameter names from IDs, timestamps, routes, user
  input, or other unbounded data.
- Never log from `build()`, frame, scroll, keystroke, or per-request paths.
- Keep one application-scoped Analytics service. Do not add interfaces,
  factories, or repositories unless the existing project needs them for
  substitution or testing.
- Never send PII, credentials, tokens, sensitive content, raw backend objects,
  or privacy-sensitive error text. Use opaque, policy-approved user IDs.
- Treat user properties as stable segmentation dimensions and avoid redundant
  writes or high-cardinality reporting dimensions.
- Choose one owner for screen measurement. Do not combine automatic observer
  tracking and manual screen logging for the same transition.
- Emit purchases only after authoritative success. Use stable transaction IDs
  and idempotent instrumentation; Analytics is not financial truth.
- Keep Analytics off critical product paths. Do not block navigation,
  authentication, checkout, or startup on event logging.
- Treat collection control, consent categories, advertising measurement, and
  Apple ATT as distinct decisions. Configure pre-consent behavior before SDK
  initialization when policy requires it.
- Do not invent an offline queue; use the SDK's asynchronous buffering unless
  a measured requirement proves it insufficient.
- Guard unsupported Web and macOS APIs and verify FlutterFire exposure rather
  than inferring parity from native Firebase SDKs.
- Separate development and production data when practical, and validate with
  DebugView before relying on standard reports.

## Output Expectations

When implementing, make the smallest reviewable diff and add one focused
runnable check for non-trivial mapping, deduplication, routing, consent, or
purchase logic. When reviewing, report findings by severity with exact file
and line locations, then state validation gaps. Call out any behavior that
still requires a physical device, release build, deployed Web origin,
DebugView session, or GA/BigQuery configuration.

## Examples

Should trigger:

- "Add Firebase Analytics to this Flutter app."
- "Design GA4 events and parameters for our onboarding funnel."
- "Why are screen views or purchases duplicated in DebugView?"
- "Review our `setUserId`, consent, and logout behavior for PII risks."
- "Track Router 2.0 navigation and ecommerce without blocking the UI."

Should not trigger:

- "Add structured application logging" unless Analytics misuse is being
  replaced.
- "Configure Crashlytics or Firebase Performance Monitoring" unless the task
  also changes Analytics boundaries.
- "Implement GA4 Measurement Protocol on a Node backend" unless Flutter event
  compatibility is part of the request.
