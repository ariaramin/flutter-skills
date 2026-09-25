# Supplemental Current Practices (Not Attributed to Andrey)

This file exists to keep the skill useful in 2026 without rewriting channel history.

## Android architecture current-context check [S]

Android's official **Guide to app architecture** (crawled current, dated 2026-04-14 in the source) continues to frame robust architecture around clear app layers and modern Android app composition. The current official guide should be consulted whenever an implementation depends on contemporary Android APIs/framework recommendations.

Official source:
`https://developer.android.com/topic/architecture`

## How to use this file

When channel material describes an architecture principle that is stable—separation of concerns, clear data flow, testability—preserve it.

When implementation depends on framework versions—SwiftUI observation APIs, Jetpack Compose/navigation APIs, Android background execution, storage/security APIs—verify current official documentation before generating production code.

## Supplemental engineering rules [S]

- Prefer structured concurrency/cancellation over detached fire-and-forget work.
- Use idempotency/deduplication for retried mutations.
- Add jitter to backoff for fleet-scale retry synchronization.
- Treat local database migrations as production-critical behavior.
- Use stable navigation arguments for deep links/process restoration.
- Measure performance with platform profiling rather than guessing.
- Keep sensitive tokens/data in platform-appropriate protected storage.
- Avoid framework-specific types in domain policy only when that independence provides real value.

These are **not claims about the channel**; they are current operational guardrails.
