---
name: flutter-caching
description: >
  Design, implement, review, debug, test, and measure production caching in
  Flutter/Dart apps across Android, iOS, Web, Windows, macOS, and Linux. Use
  when a Flutter task mentions caching, offline data, stale data, TTL,
  invalidation, request deduplication, cache keys, response storage, cache
  directories, HTTP Cache-Control/ETag, cache-first/network-first/
  stale-while-revalidate, or memory/disk growth. Use for architectural cache
  decisions even when the user only asks to make loading faster. Do not use
  for image-pipeline-only work, a specific Dio client, or a specific
  Drift/Hive schema change; use the corresponding specialized skill instead.
compatibility: >
  Inspect the repository's pinned Flutter/Dart/package versions and supported
  platforms before relying on implementation-specific cache behavior. This
  skill gives cross-cutting cache policy; it does not assume a package adds a
  persistent HTTP cache.
---

# Flutter Caching

Make data correct first, then reduce repeated work. A cache is a derived copy;
it is not durable user data or a source of truth unless the feature explicitly
defines a local replica.

## Scope and evidence

Classify claims while working:

- **Documented:** a framework, protocol, or platform contract.
- **Platform/package-dependent:** verify the exact SDK, package, and target.
- **Engineering choice:** explain the product trade-off.
- **Measured:** report a reproducible before/after metric; never call a size or
  policy optimal without it.

Read [authoritative-sources.md](references/authoritative-sources.md) when a
claim affects implementation, platform behavior, or a version-sensitive API.

## Inspect before adding or changing a cache

1. Inspect the Flutter/Dart versions, target platforms, lockfile, current
   repositories/data sources, HTTP clients, persistence, image loading, and
   observability.
2. Search all readers, writers, cache constructors, keys, eviction, refresh,
   logout/account-switch, and lifecycle paths. Reuse the existing owner and
   policy when sound; do not add a parallel cache.
3. Define per resource: authoritative source, identity, account/tenant scope,
   sensitivity, maximum staleness, offline contract, mutation consistency,
   size, access frequency, and recovery after eviction/corruption.
4. Capture a baseline with representative data, device/build mode, network
   state, and cold/warm cache state. Choose the smallest mechanism that fixes a
   measured or clearly material cost.
5. Define freshness, invalidation, limits, and failure behavior *before*
   persisting or serving a cache hit. A cache hit is not proof the value is
   valid.

## Choose the layer deliberately

| Need | Default | Important constraint |
| --- | --- | --- |
| Repeat work only during one process/session | Bounded in-memory cache | Lost on restart and must have eviction. |
| Small, simple app setting | Key-value persistence | Not a general query store or secret vault. |
| Offline structured domain data | Local database/local source | Model schema, sync, and conflict policy. |
| Reconstructible blobs/documents | File cache | Treat cache locations as purgeable. |
| HTTP resource with server support | HTTP freshness + validators | Do not assume Dart client adds persistence. |
| Repeated identical in-flight load | Single-flight request map | Remove failed/completed requests correctly. |
| Images | Use Flutter image cache plus correctly sized source | See `flutter-image-performance` for pipeline details. |
| Payment, balance, inventory, permission, or critical auth state | Network-first/online-only as required | Never silently accept stale fallback. |

| Strategy | Latency | Persists | Offline reads | Consistency / complexity |
| --- | --- | --- | --- | --- |
| Memory | Lowest | No | Process only | Eviction; low |
| File/key-value | Low | Usually | Yes if retained | TTL/schema; medium |
| Local database replica | Low | Usually | Yes | Sync/conflicts; high |
| HTTP cache/revalidation | Varies | Client-dependent | Client-dependent | Server headers; medium |
| Network-only | Network | No | No | Freshest; low |

Do not cache merely because a request exists. Avoid caching very cheap,
one-shot, sensitive, or correctness-critical data unless its cache contract is
explicit.

## Ownership, keys, and freshness

Put read, write, refresh, and invalidation policy in the repository/data layer,
not widgets or isolated call sites. For offline-first features, expose the
defined local source through the repository and update it from remote sync.

A cache key MUST represent every value that changes the result: resource ID,
account/tenant, authorization/permission context when applicable, locale,
representation/version, query parameters, filters, sort, cursor/page, and
image rendition. Never use raw secrets or tokens as a key. Namespace
per-user/tenant persistent data and clear or rotate that namespace on logout,
account switch, or relevant permission change.

Store enough metadata to make decisions: written/validated timestamp,
expiration or server freshness directive, schema/API/content version, validator
(`ETag`/`Last-Modified`) where supported, and sync/mutation state. Treat an
unreadable or corrupt entry as a miss; delete only that reconstructible entry
and surface an error if it cannot safely be rebuilt.

Choose one explicit read policy per resource:

- **Cache-first:** mostly immutable content; refresh through a defined path.
- **Network-first with fallback:** fresh data matters, but offline fallback is
  acceptable and visibly stale when material.
- **Stale-while-revalidate:** return permitted cached data now, refresh once in
  the background, then publish the newer value. Never use for harmful stale
  decisions.
- **Local-first/offline-first:** a local replica is the UI read source; define
  sync, mutation queue, conflict resolution, and user-visible sync status.
- **Network-only:** use where a cached answer is unsafe or misleading.

TTL is a product freshness budget, not a substitute for invalidation. Prefer
server-provided HTTP freshness and conditional revalidation for HTTP resources.
After a successful mutation, update or invalidate every affected entity/query;
use versions/generations to prevent an older response overwriting newer state.
Handle forced refresh as a policy override, not by silently deleting unrelated
caches.

## HTTP and images

HTTP cache semantics belong to the HTTP layer. `Cache-Control`, `ETag`,
`Last-Modified`, conditional requests, and `Vary` govern freshness and
representation selection when the server/client cache supports them. Verify the
actual transport: Dart `http`/Dio usage alone is not evidence of a durable HTTP
response cache. Do not invent client headers to compensate for absent server
semantics, and do not cache personalized responses across users.

Flutter's `ImageProvider` uses the shared in-memory `ImageCache`; it is not a
disk cache or HTTP cache. The documented cache has entry and byte limits, but
live images have distinct retention behavior. Use stable provider identity;
request/decode close to display size; measure decoded memory; and use narrow,
bounded prefetch. Do not clear the global image cache as a routine fix. Route
image-specific work to `flutter-image-performance`.

## Bounds, lifecycle, and platforms

Every cache MUST define a bounded resource policy: maximum entries/bytes, TTL
where relevant, eviction order, cleanup trigger, and reconstruction path. Bound
pending loads, retries, refreshes, pages, and mutation queues too. Prefer
targeted entity/query invalidation over global clears.

- **Android/iOS/macOS:** cache directories are for regenerable data and may be
  removed by the system. Do not put critical data or secrets there.
- **Web:** browser HTTP cache, storage quota/eviction, IndexedDB, Cache API,
  service workers, CORS, and origin partitioning are browser controlled. Verify
  browser and renderer behavior; do not project native cache behavior onto Web.
- **Windows/Linux:** filesystem availability and cache locations differ by
  platform and packaging. Resolve paths through the repository's platform
  storage mechanism and test the shipped target; keep caches reconstructible.
- **All targets:** react to memory pressure through the existing lifecycle
  owner; do not promise that process memory or cache directories survive.

Persist sensitive content only after a threat-model decision. Do not casually
cache tokens, credentials, medical/financial/private data, or authorization
responses. Use protected storage where appropriate, minimize retention, redact
cache keys/bodies/headers from logs, and ensure logout/account switching removes
accessible user-scoped copies.

## Concurrency and writes

Use a repository-owned single-flight map keyed by the complete cache identity
for concurrent misses. Share only equivalent requests, let callers handle their
own UI lifetime/cancellation, and remove the in-flight entry in `finally` so
failures do not become permanent. Bound retries and use backoff only when the
operation is safe to retry.

Guard persistence against reordering: attach a revision, generation, validator,
or monotonic write rule; write only if the response is still current. Make
multi-record consistency updates atomic in the selected store. Isolates do not
share Dart heap memory; coordinate through the persistence owner or explicit
messages, and verify the library's multi-isolate contract.

Offline write-back is synchronization, not a simple cache. Persist pending
mutation intent, idempotency/conflict metadata, retry limits, and visible
failure/recovery behavior. Do not queue non-idempotent or time-sensitive writes
without server support and a conflict design.

## Implementation and review rules

- MUST inject a clock where expiration is tested; avoid real-time delays.
- MUST keep cache ownership and cleanup out of widgets.
- MUST invalidate/update after successful mutation, and test it.
- MUST isolate account/tenant-scoped data and test logout/account switch.
- MUST remove in-flight work after success and failure, and test concurrent
  callers receive one equivalent load.
- SHOULD add a small bounded cache only after an existing solution cannot own
  the policy. Prefer a `Map` only when an explicit bound and invalidation make
  it safe.
- SHOULD record hit, miss, stale-hit, revalidation, eviction, error, latency,
  disk bytes, and decoded-image-memory metrics without logging sensitive data.
- AVOID a cache abstraction with one use, unbounded maps, global clears,
  fire-and-forget writes, real-delay tests, and treating cache directories as
  durable storage.

Review every change for: incomplete keys; missing invalidation; stale fallback
on critical state; unbounded memory/disk/pending work; user-data leakage;
duplicate requests; stale response overwrite; schema/version recovery; Web or
platform assumptions; and a missing cold/warm/offline measurement.

## Validate

Add focused deterministic tests for the relevant contract: hit/miss, expiration,
forced refresh, invalidation after mutation, corrupt entry, offline/stale
behavior, bounded eviction, concurrent miss deduplication, failed refresh,
out-of-order writes, logout/account switch, and persistent schema/version
change. Test the critical supported platforms when storage/network behavior is
platform-dependent.

Measure the same representative workflow cold and warm: request count/bytes,
time to useful content, p50/p95 latency, frame timing/jank, CPU, Dart/external
memory, decoded-image bytes, disk usage, cache hit/stale-hit/revalidation rate,
and eviction churn. Keep the cache only when the benefit outweighs its
correctness, privacy, startup, and maintenance cost.
