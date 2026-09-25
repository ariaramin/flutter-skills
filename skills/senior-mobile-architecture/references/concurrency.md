# Concurrency & Asynchronous Work

## Evidence status

The channel/mind-map clearly includes async/mobile architecture concerns, and the Facebook mock mentions Kotlin coroutines plus background/offline work, but a full concurrency-focused transcript was not accessible. Therefore most concrete rules below are **S — supplemental**, aligned with the channel's architectural reasoning style rather than directly attributed teaching.

## Core rules [S]

1. Every async operation has an owner.
2. Ownership defines cancellation.
3. UI-scoped work should usually cancel when the owning UI state is gone unless product behavior requires continuation.
4. Durable/background work must be moved to a lifecycle mechanism that can outlive a screen/process as required.
5. Concurrent writes need serialization, conflict detection, or commutative/idempotent semantics.
6. “Latest wins” searches/autocomplete should cancel or ignore stale results.
7. Retry queues must prevent duplicate in-flight mutation attempts.
8. Shared mutable state must have a clear synchronization model.

## Race-condition checklist [S]

- Two refreshes complete out of order.
- Pagination append completes after refresh reset.
- User toggles like repeatedly while prior mutation is pending.
- Auth token refresh races multiple requests.
- Local edit and remote push update arrive concurrently.
- Screen closes while network callback completes.
- Download resumes while previous worker still holds task state.

## Cancellation model [S]

For each operation document:
- initiator;
- owner;
- cancellation trigger;
- cleanup;
- whether result may be ignored vs underlying work must stop;
- durable recovery path.

## Background work [D2/S]

File Downloader chapters explicitly include background downloads and resumability [D2]. Implementation should separate task identity/state from transient screen lifecycle [S].

A robust downloader task generally needs:
- stable task ID;
- persisted progress/metadata if resume is promised;
- platform background execution adapter;
- cancellation/pause/resume semantics;
- integrity/finalization step;
- retry/network policy.
