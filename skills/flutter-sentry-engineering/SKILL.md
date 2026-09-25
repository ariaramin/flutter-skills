---
name: flutter-sentry-engineering
description: Design, implement, review, debug, secure, test, migrate, and tune production Sentry observability in Flutter and Dart applications. Use when a task involves sentry_flutter, crash or handled-exception reporting, missing or duplicate Sentry events, scopes, users, tags, breadcrumbs, filtering, tracing, distributed tracing, HTTP or Dio instrumentation, profiling, app-start or frame measurements, Android ANRs, Apple app hangs, Session Replay, screenshots, attachments, structured Sentry Logs, releases, dist, dSYM or ProGuard/R8 uploads, Flutter obfuscation, Web source maps, symbolication, privacy, offline delivery, isolates, or Sentry CI/CD. Do not use for product analytics, audit logging, generic application logging without Sentry, or backend-only Sentry integrations.
---

# Flutter Sentry Engineering

Treat Sentry as production observability infrastructure. Optimize for actionable,
symbolicated failures with deliberate privacy, cost, and runtime budgets.

## Start with evidence

Before changing code:

1. Inspect `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints, and target
   platforms.
2. Identify the locked `sentry_flutter`, `sentry`, `sentry_dart_plugin`, HTTP,
   Dio, routing, and state-management versions.
3. Find every Sentry initialization, capture call, scope mutation, navigator
   observer, transaction/span, filtering hook, and shutdown/flush call.
4. Inspect native Android, Apple, desktop, and Web build configuration relevant
   to the requested platforms.
5. Inspect release, `dist`, obfuscation, source-map, and debug-symbol CI steps.
6. Separate current repository behavior from version-sensitive guidance.

The bundled guide was validated against stable `sentry_flutter 9.26.0` on
2026-08-11. When the installed version differs, use its API and changelog as the
source of truth. Revalidate major-version changes before reusing tracing,
profiling, Replay, scope, build-tooling, or native-integration guidance.

## Preserve these invariants

- Initialize once and early with `SentryFlutter.init(..., appRunner: ...)` for
  the normal Flutter path.
- Do not add duplicate global handlers already installed by Sentry Flutter.
- Assign one owner to automatic versus manual capture; avoid capture-and-rethrow
  duplicates.
- Report unexpected actionable failures, not validation outcomes or ordinary
  control flow.
- Keep telemetry failure from changing core product behavior.
- Keep `sendDefaultPii` disabled unless a deliberate privacy decision enables
  it.
- Never send credentials, tokens, cookies, payment secrets, API keys, or
  sensitive private content.
- Keep `beforeSend`, `beforeBreadcrumb`, and event processors cheap and
  deterministic.
- Use low-cardinality transaction names and spans only around meaningful work.
- Restrict trace propagation to trusted participants.
- Budget errors, traces, profiles, Replay, attachments, screenshots, and Logs
  independently.
- Do not default production tracing, profiling, or Replay to 100 percent.
- Keep runtime `release` and `dist` aligned with the artifacts uploaded for the
  exact deployed binary.
- Treat unsymbolicated production failures as a broken release pipeline.
- Reuse Sentry's transport, caching, and backpressure; do not add a second
  telemetry queue.
- Do not flush or close after each event.
- Do not mutate shared scope from Flutter rebuild paths.
- Do not build new functionality on retired Sentry Metrics.

## Choose the smallest complete capability set

When asked to add Sentry, implement in this order:

1. correct early initialization;
2. automatic Dart, Flutter, and supported native crash capture;
3. correct environment, release, and `dist` metadata;
4. matching symbol/debug-artifact upload;
5. privacy-safe user and diagnostic context;
6. noise filtering and duplicate ownership;
7. release-like verification.

Add optional features only when they answer a named debugging question:

- Add tracing for latency breakdowns.
- Add distributed tracing for cross-service latency.
- Add profiling only on supported platforms and sampled traces.
- Add navigator instrumentation for route performance.
- Add Replay or screenshots for visual reproduction after privacy review.
- Add ANR or app-hang tracking for responsiveness diagnostics.
- Add structured Sentry Logs only for bounded operational messages.

For each optional feature, evaluate platform support, runtime cost, payload and
quota cost, sensitive-data exposure, and a concrete verification method.

## Route to the production guide

Read only the relevant sections of
`references/production-guide.md`. Because the guide is comprehensive, locate
sections before reading them with:

```sh
rg -n '^#{1,3} (SECTION|RELATED SECTION)$' references/production-guide.md
```

Use these search headings:

| Task | Search headings |
|---|---|
| Install, configure credentials, environments, initialize | `Installation|DSN and Credentials|Environment Strategy|Release and Dist|Initialization` |
| Diagnose missing, silent, duplicate, fatal, handled, isolate, or background errors | `Automatic Error Capture|Silent Flutter Errors|Spawned Isolates|Background Isolates|Manual Exception Capture|Fatal vs Non-Fatal|Deduplication` |
| Filter noise and manage grouping | `Noise Reduction Strategy|Exception-Type Filters|ignoreErrors|beforeSend|Event Processors|Error Grouping and Fingerprinting` |
| Add users, tags, contexts, extras, or breadcrumbs without scope leaks | `Scope and Context|Prevent Scope Leakage|User Context|Account Switching|Anonymous Users|Tags|Extras|Breadcrumbs` |
| Instrument navigation | `Navigation Instrumentation|Route Names|SentryNavigatorObserver|Navigator 2.0|Nested Navigators|Tabs|Modals` |
| Add tracing, sampling, spans, or distributed traces | `Performance Monitoring|Enable Tracing|Sampling Strategy|tracesSampler|Static Tracing Lifecycle|Child Spans|Span Streaming Lifecycle|Transaction Naming|Distributed Tracing|Trace Propagation Targets` |
| Instrument `package:http` or Dio | `HTTP Instrumentation|package:http|Dio|HTTP Failure Capture|Avoid Duplicate HTTP Errors|HTTP Privacy` |
| Add profiling, startup, TTID/TTFD, frame, ANR, or hang diagnostics | `Profiling|App Start|Standalone App-Start Tracing|TTID and TTFD|Slow and Frozen Frames|Android ANRs|Apple App Hangs` |
| Configure native crashes, releases, symbols, obfuscation, or Web source maps | `Native Crash Capture|Releases and Symbolication|Sentry Dart Plugin|Android Symbolication|Apple Symbolication|Flutter Web Source Maps|Dart Symbol Mapping File|Release Pipeline` |
| Handle sessions, offline delivery, flush, screenshots, attachments, Replay, or Logs | `Release Health and Sessions|Offline Behavior|Flush and Close|Screenshots|View Hierarchy|Attachments|Session Replay|Structured Sentry Logs` |
| Audit privacy, performance, reliability, or architecture | `Privacy and Security|Performance Rules|Reliability Rules|Application Architecture|State Management Integration` |
| Test, debug, review, migrate, or prepare production | `Testing Strategy|Verification Matrix|Debugging Guide|Common Anti-Patterns|Implementation Checklist|Code Review Checklist|Production Readiness Checklist|Version-Sensitive Areas` |

For a full Sentry architecture or production-readiness audit, read the entire
guide after completing the repository inventory.

## Implement at the shared ownership boundary

- Fix initialization defects in the single initialization path.
- Fix duplicate capture where automatic and manual ownership overlap.
- Put reusable privacy and filtering policy in the existing global hook rather
  than scattering guards across call sites.
- Keep feature-specific context temporary; use an event scope when global scope
  would leak between users, requests, or concurrent work.
- Keep application-facing reporting behind the repository's existing
  observability abstraction when one exists. Do not introduce an interface or
  wrapper solely for Sentry unless it removes actual coupling or makes critical
  behavior testable.
- Keep navigation, business rules, and user-facing recovery outside telemetry
  callbacks.

## Validate the result

Run the narrowest relevant checks, then verify behavior in release-like builds.
Cover the changed paths from this matrix:

- handled Dart exception;
- uncaught async/root exception;
- Flutter framework exception outside known framework limitations;
- native crash on each supported native target;
- correct environment, release, and `dist` in Sentry;
- symbolicated Dart and native stacks from the deployed artifact;
- filtering, deduplication, redaction, and scope behavior;
- tracing propagation only to intended targets;
- offline recovery without an application-owned queue;
- isolate/background capture when changed;
- optional feature sampling and platform behavior when enabled.

Never claim production observability is ready from a debug-only Dart exception
test. Report untested platform and release-pipeline paths explicitly.
