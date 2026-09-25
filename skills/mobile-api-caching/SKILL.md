---
name: mobile-api-caching
description: >
  Design, review, debug, implement, test, and measure production API/data
  caching for iOS/Swift, Android/Kotlin, Flutter/Dart, React Native/TypeScript,
  and Kotlin Multiplatform. Use whenever a mobile task mentions cache-first,
  network-first, stale-while-revalidate, offline-first, TTL, ETag,
  Cache-Control, local persistence, cache invalidation, duplicate requests,
  stale data, optimistic writes, background sync, or making API-backed screens
  load faster or survive poor connectivity. Apply it to architecture and code
  reviews even when the user asks only about latency or repeated calls. Do not
  use for image-pipeline-only tuning or server/CDN-only cache configuration.
compatibility: >
  Inspect the repository's pinned SDKs, HTTP clients, persistence libraries,
  and target OS versions before relying on implementation-specific behavior.
---

# Mobile API Caching

Design caches as explicit correctness policies, not generic speed features. A
cache is usually a derived copy; offline-first storage is a local replica with
synchronization responsibilities.

## Operating workflow

1. Trace the real data flow before editing: UI state, repository/store, memory
   cache, database/files, HTTP client cache, network API, mutations, logout,
   background work, and every caller of the affected read/write path.
2. Record the current SDK/package versions and supported platforms. Verify
   version-sensitive behavior in primary documentation or source.
3. Define the resource contract: authority, identity, sensitivity, freshness
   budget, maximum tolerable staleness, offline behavior, mutation semantics,
   persistence need, size, and recovery path.
4. Reuse the highest existing layer that can own the policy. Do not create a
   second cache in a view model when the repository or HTTP stack already owns
   equivalent data.
5. Select a strategy with the decision model below; define keys, metadata,
   invalidation, bounds, concurrency, and failure behavior before storing data.
6. Implement the smallest complete policy at the shared boundary.
7. Leave one deterministic test for every non-trivial branch and measure the
   same representative workflow cold, warm, stale, and offline.

Classify claims as **documented**, **platform/library-dependent**,
**engineering choice**, or **measured**. Read
[`references/authoritative-sources.md`](references/authoritative-sources.md)
before making a platform/API claim or choosing a version-sensitive mechanism.

## Mental model and ownership

Use this hierarchy only where each layer has a distinct job:

```text
UI state -> repository policy -> memory -> local database/files -> HTTP cache
         -> transport -> backend/CDN
```

- UI state owns presentation and transient interaction state, not cache policy.
- The repository/data layer owns resource identity, read strategy, refresh,
  mutation reconciliation, and the source exposed to higher layers.
- Memory owns short-lived decoded objects and in-flight request sharing. Bound
  it by count/weight and clear or trim it under lifecycle/memory pressure.
- A local database owns queryable, restart-safe domain data and offline state.
  It needs schemas, migrations, indexes, transactions, and corruption recovery.
- Files own reconstructible blobs when database queries are unnecessary.
- The HTTP cache owns protocol freshness, validators, representations, and
  conditional requests. Prefer it for cacheable HTTP resources rather than
  recreating HTTP semantics in domain code.
- The backend/CDN defines validators, server freshness, invalidation signals,
  idempotency, and conflict/version semantics where possible.

Choose one authoritative source per resource. In offline-first systems, the
local database is normally the read source of truth and network sync updates
it. In online-only critical flows, the server response may remain authoritative.
Never let two layers independently invent TTL or invalidation for the same
resource; document the owner and make lower layers subordinate.

## Strategy selection

| Strategy | Initial speed | Freshness | Offline | Network cost | Complexity | Good fit | Main risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Network-only | Slow/variable | Highest available | None | Highest | Low | OTP, critical authorization, irreversible decisions | Unusable on poor networks |
| Cache-only | Fast | Unknown unless checked | Yes | None | Low | Explicit offline/archive view | Silent stale or missing data |
| Network-first | Slow on failure | High | Fallback only | High | Medium | Profile or status where freshness matters | Long timeout before fallback |
| Cache-first | Fast on hit | Policy-dependent | Yes | Low | Medium | Versioned/static reference data | Indefinite staleness |
| Stale-while-revalidate | Fast | Eventual | Yes if persisted | Medium | Medium | Feeds/catalogs where stale is safe | Refresh races, hidden errors |
| Cache-and-network | Fast then fresh | Eventual | Yes if persisted | High | Medium | UI that must render cache and every fresh result | Duplicate UI events/flicker |
| In-memory | Fastest | Process-scoped | Until process death | Low | Low | Session reuse, decoded models, single-flight | Unbounded memory |
| Offline-first replica | Fast local | Eventual by sync contract | Full/partial | Controlled | High | Core features that must work disconnected | Conflict and queue correctness |

Related write patterns are not read strategies:

- **Read-through:** the cache owner loads on miss.
- **Write-through:** commit authoritative write and cache update together where
  the consistency boundary permits it.
- **Write-back/write-behind:** persist mutation intent locally, then sync; this
  is a reliability subsystem requiring idempotency, retries, and conflicts.
- **Refresh-ahead:** refresh hot entries before soft expiry; use only when
  measured demand justifies background work and battery/network cost.

### Decision model

Answer in order for each resource:

1. Would a stale value authorize, charge, transfer, unlock, verify, or cause an
   irreversible action? Use network-only or network-first without stale fallback.
2. Must the feature read or write through process death and disconnection? Use
   an offline-first local replica and define synchronization; a cache is not enough.
3. Can the UI safely show stale data while refresh runs? Use stale-while-
   revalidate or cache-and-network with an explicit stale indicator when material.
4. Must the data survive restart but is it fully reconstructible? Use bounded
   persistent cache storage; otherwise prefer bounded memory.
5. Is it immutable and content-addressed/versioned? Use cache-first with a long
   freshness lifetime; HTTP `immutable` is valid only during that lifetime.
6. Does freshness matter more than startup latency, but stale fallback is safe?
   Use network-first with a short, deliberate fallback threshold.
7. Can the server emit `Cache-Control` and validators? Let the HTTP cache handle
   transfer reuse; add application caching only for a separate domain/UX need.
8. If none applies, do not add a cache.

Then document: soft TTL, hard TTL/retention, refresh triggers, key dimensions,
mutation invalidation, bounds, and observability.

### Resource defaults to challenge, not copy blindly

| Data | Starting policy |
| --- | --- |
| Payment/balance/inventory/permissions | Network-first or online-only; never silently use stale data for a decision |
| Auth token, password, OTP/verification code | Do not put in a general response cache; minimize memory lifetime and use protected credential storage only where required |
| User profile | SWR or network-first fallback; user by account; invalidate/update on mutation |
| Catalog/product/article list/home feed | SWR or cache-and-network; page-aware keys and bounded retention |
| Static versioned configuration/assets | HTTP/cache-first with versioned keys and long freshness |
| Feature flags | Short freshness, server-defined defaults, fail-safe behavior; do not let stale flags weaken security |
| Search/autocomplete | Short bounded memory cache; normalized query, filters, locale, and session scope |
| Notifications/chat/messages | Local replica plus ordered sync; cursors, tombstones, dedupe IDs, and conflict rules |
| Dashboard | Per-widget policy; never give one TTL to mixed-criticality data |
| Images/media | Delegate to the platform/image pipeline and size decoded assets; do not duplicate raw and decoded caches without measurement |

## HTTP cache semantics

Apply RFC semantics only through a compliant HTTP cache. An application-level
map that ignores response headers is not an HTTP cache.

- `max-age=N`: the response becomes stale when its current age exceeds N
  seconds; it is not an eviction deadline.
- `s-maxage`: overrides freshness for shared caches, not a private mobile cache.
- `no-cache`: storage is allowed, but reuse requires successful validation.
- `no-store`: do not intentionally store the request or response. It is not a
  complete privacy control, so still minimize sensitive data and logs.
- `must-revalidate`: after staleness, do not reuse without successful origin
  validation; disconnected stale fallback is forbidden.
- `immutable`: while fresh, clients should not revalidate unless explicitly
  overridden. Use with versioned resources, not mutable URLs.
- `stale-while-revalidate=N`: may serve stale during the stated window while
  asynchronously validating. It is an HTTP extension, not proof every client
  implements application-level SWR.
- `stale-if-error=N`: may permit stale reuse on qualifying errors during the
  stated window; decide separately whether the product can safely show it.
- `Expires`: supplies an absolute freshness time when stronger freshness
  directives do not override it; clock skew makes relative directives preferable.
- `Age`: contributes to the stored response's current age; it is not a TTL.
- `Vary`: extends representation matching with named request-header values.
  `Vary: *` prevents reuse for another request.
- `ETag`/`If-None-Match` and `Last-Modified`/`If-Modified-Since` enable
  conditional validation. A `304` carries no selected representation body;
  update stored metadata and reuse the stored body according to HTTP rules.

Prefer server-driven freshness and validators for transport reuse. Add a domain
cache when the UI needs decoded/queryable/offline data, but do not assign a
second contradictory HTTP TTL. Preserve relevant validators and representation
dimensions when the application performs conditional requests itself.

## Keys, metadata, freshness, and bounds

Build a deterministic canonical key from every input that can change the
response: namespace/schema version, method, normalized URL/path, sorted and
normalized query parameters, canonical body digest when safe and necessary,
pagination cursor/page, filters/sort, locale, region, API version, tenant,
account ID, authorization/permission scope, app configuration, and response
representation. Use a stable cryptographic digest only to shorten the canonical
identity; never use randomized language hash functions.

Never put raw tokens, passwords, or sensitive bodies in keys or logs. Namespace
private entries by a stable non-secret account/tenant identifier. On logout,
account switch, or permission downgrade, cancel scoped in-flight work and
delete or rotate every memory, disk, database, and derived representation in
that namespace.

Store enough metadata to decide safely: created/written time, last validated
time, soft expiry, hard expiry/retention, schema/content/API version, validator,
account/tenant namespace, request generation, dependency tags, and sync state.
Use a monotonic clock for in-process elapsed durations; use an injected wall
clock for persisted expiry and tolerate clock changes explicitly.

- **Soft expiry:** cached content may be shown, but trigger one refresh.
- **Hard expiry:** content must not be shown; treat as a miss or explicit error.
- **Retention:** storage cleanup deadline; may exceed reuse eligibility when
  validators make retained bytes useful.

Every cache needs a bound: maximum entries/bytes, eviction policy, cleanup
trigger, and recovery path. Also bound pages, in-flight work, retry attempts,
refresh queues, and pending mutations. Treat corrupt/unreadable entries as
misses and delete only the reconstructible affected entry; never hide loss of
non-reconstructible offline mutations.

## Invalidation and mutations

TTL limits age; it does not know that a mutation changed data. Prefer the
narrowest valid mechanism:

1. Update the canonical entity and affected query indexes transactionally from
   a successful mutation response.
2. Otherwise invalidate the entity and dependency/tagged queries.
3. Use server events/version tokens when external writers can change data.
4. Rotate a namespace for account, permission, API, or schema boundaries.
5. Use broad clearing only for a proven global invariant change.

For optimistic writes, record a client mutation ID, base/server version,
pending state, rollback or reconciliation rule, and idempotency key when the
server supports it. Do not overwrite optimistic/newer data with an older read.
Represent deletions with tombstones until every synchronization peer can
distinguish deletion from absence.

## Concurrency and request deduplication

Keep one repository-owned in-flight task/future/promise per complete cache key:

```text
load(key, policy):
  if reusable cache entry exists: return it (and start one refresh if soft-stale)
  if inFlight[key] exists: await that operation
  generation = currentGeneration(key)
  task = fetch, validate, and decode
  inFlight[key] = task
  try:
    value = await task
    if generation is still current: atomically persist value and metadata
    return the newest accepted value
  finally:
    remove inFlight[key] only if it still refers to task
```

Share transport work only for semantically identical requests. Separate each
caller's UI cancellation from cancellation of the shared request; cancel the
underlying request only when policy says no consumer remains. Use generations,
server versions, or compare-and-set writes so late responses cannot overwrite
newer refreshes or mutations. Apply one refresh task per key to prevent cache
stampedes.

## Robust read algorithms

### Cache-first

```text
entry = cache.read(key)
if entry exists and now < hardExpiry and now < softExpiry: return entry.value
if entry is hard-expired: discard its reusable value but retain validators if allowed
return singleFlight(key) {
  conditional network fetch using retained validator
  on 304: refresh metadata and return stored body
  on valid 2xx: atomically store versioned value, metadata, and validator
  on failure: return stale only if policy permits and hard expiry was not crossed
}
```

### Network-first

```text
try singleFlight(key) network request within the explicit fallback threshold
on valid response: store if policy permits and return fresh
on retryable transport/5xx failure: return permitted non-hard-expired cache as stale
on 4xx/auth failure: do not hide it with stale fallback unless explicitly safe
```

### Stale-while-revalidate / cache-and-network

```text
if reusable entry exists:
  emit cached value with freshness metadata
  start one generation-guarded refresh for key; publish only accepted newer data
  keep cached data on refresh failure when policy permits, and expose refresh error
else:
  await single-flight network load
```

Cache-and-network always requests; SWR requests only when policy says stale or
refresh is otherwise triggered. Avoid flicker by comparing semantic version or
content before publishing the second value.

### Conditional HTTP request

```text
send If-None-Match when ETag exists, otherwise If-Modified-Since when available
if 304: merge allowed response metadata, reuse stored body, update validation time
if valid 2xx: validate schema, replace body/metadata atomically
otherwise: apply resource-specific failure policy
```

## Offline-first synchronization

An offline-first feature reads exclusively from its local source of truth.
Network work changes the local source transactionally; observers then update.

```text
read: observe local database query
sync:
  acquire unique sync lease
  upload eligible pending mutations with stable IDs/idempotency
  fetch remote changes from durable cursor/version
  resolve conflicts by domain rule, never client receipt time alone
  apply entities, tombstones, cursor, and acknowledgements atomically
  retry retryable failures with bounded exponential backoff + jitter
```

Persist pending mutations before optimistic UI acknowledges them when loss would
matter. Distinguish retryable transport/5xx/429 failures from permanent 4xx,
auth-required, validation, and conflict failures. Connectivity status is only a
hint to attempt work, never proof the request will succeed. Surface pending,
failed, conflicted, and stale states when users need to act.

Background execution is opportunistic and platform-constrained. On Android,
use WorkManager for deferrable persistent sync and unique work to avoid
duplicates. On Apple platforms, use the appropriate system background task or
background URLSession and assume scheduling may be deferred. Foreground/resume
sync must still make the feature correct.

## Persistence and platform guidance

Choose the lightest storage that satisfies the contract:

- RAM for session-only, cheap-to-rebuild values.
- The compliant HTTP cache for response reuse and validation.
- Key-value storage for small non-sensitive scalar/config values, not relational
  queries or large response graphs.
- Files for reconstructible blobs with atomic replace and bounded cleanup.
- SQLite/Room/Core Data/SwiftData or an existing database for indexed,
  relational, transactional, observable, or offline-first domain data.
- Protected storage for credentials/keys, not bulk response caching.

Account for serialization/decoding, indexes, migration time, startup reads,
write amplification, disk-full behavior, backup eligibility, encryption, and
cache size. Do not load or rewrite an entire dataset when a page, delta, or
indexed query suffices.

### iOS / Swift / SwiftUI

- Prefer `URLSession` with `.useProtocolCachePolicy` and `URLCache` for ordinary
  HTTP semantics; `URLCache` combines memory and disk and can be configured per
  session. Verify policy behavior on supported OS versions.
- HTTPS responses may be written to disk by the default protocol policy. For
  sensitive responses, disable storage or restrict it to memory after threat
  modeling; do not assume HTTPS means safe at-rest caching.
- `URLCache` APIs are thread-safe, but compound read-then-store operations can
  still race. Keep single-flight/generation control above them.
- Keep repository/cache state out of SwiftUI views. Use actors or otherwise
  isolate mutable in-memory state; use structured concurrency and cancellation.
- Treat cache directories as purgeable. Use Core Data/SwiftData or the existing
  store only when domain querying, durability, or synchronization requires it.

### Android / Kotlin / Jetpack Compose

- Keep repositories as the policy boundary; expose observable local data with
  `Flow` where the architecture already uses it. Do not put caching in Composables.
- Use Room rather than raw SQLite for non-trivial structured local data, and use
  transactions for multi-table cache/sync updates.
- Configure and test the installed HTTP client's cache; an HTTP client dependency
  does not prove disk caching is enabled. Preserve server cache semantics.
- Use coroutines for lifecycle-bound in-process work and WorkManager for
  deferrable work that must survive app/process exit. Use unique work for sync.

### Flutter / Dart

- Put cache policy in repositories/services, not widgets or state presentation.
- Dart networking APIs do not imply a persistent HTTP response cache. Verify the
  exact client/interceptors and platform behavior before claiming HTTP caching.
- Use key-value persistence for simple values and an existing SQL/database layer
  for structured offline data. Isolates do not share heap caches; coordinate
  through explicit messages or the persistence owner.
- Flutter's shared `ImageCache` is an in-memory decoded-image concern, not a
  general disk or API cache.

### React Native / TypeScript

- React Native supplies `fetch`/`XMLHttpRequest`, but transport behavior crosses
  JavaScript/native boundaries. Verify the current RN version, platform, and
  installed networking/data library rather than assuming browser cache behavior.
- Keep server-state caching outside components; centralize keys, invalidation,
  request sharing, persistence hydration, and account cleanup.
- Async Storage is unencrypted key-value persistence; do not use it for tokens,
  secrets, bulk relational data, or as a substitute for a database.
- Use React Native image cache controls only for images; do not generalize them
  to API `fetch` responses.

### Kotlin Multiplatform

- Keep portable policy, canonical keys, metadata, and deterministic tests in
  common code when behavior is truly shared.
- Inject platform storage, clocks, connectivity hints, and HTTP engines through
  existing boundaries. Verify each engine's HTTP-cache and persistence behavior;
  common APIs do not guarantee identical native storage semantics.
- If the project uses Ktor, its `HttpCache` supports pluggable storage, including
  persistent storage where the target implementation supports it; inspect the
  pinned Ktor version and selected engines before coding.

## Failure handling

- Offline/timeout/DNS/connection errors: serve stale only within the resource's
  allowed window; otherwise expose offline/unavailable state.
- `5xx`/`429`: preserve safe cached content, honor server retry guidance, and
  use bounded backoff with jitter; avoid automatic retries for unsafe writes.
- `4xx`: generally do not retry. Treat `401/403` as auth/permission transitions,
  cancel private in-flight work, and prevent stale privileged data reuse.
- Corruption/schema mismatch: migrate when designed; otherwise invalidate only
  reconstructible entries. Never discard a mutation queue silently.
- Disk full/write failure: return the successfully fetched value if safe, report
  persistence failure, and avoid claiming offline durability.
- Refresh failure with stale content: retain and label the content if permitted;
  do not replace useful cached data with an empty error screen.

## Performance and observability

Measure cold/warm startup, time to useful content, request count, transferred
bytes, p50/p95 latency, hit/miss/stale-hit/revalidation ratios, duplicate calls,
decode/serialization CPU, memory and disk bytes, eviction churn, refresh/sync
failures, queue depth, and battery/network conditions for background work.

Instrument decisions, not payloads: resource class, hashed/non-secret key ID,
policy, hit state, age bucket, duration, bytes, validator outcome, and error
class. Never log tokens, authorization headers, raw private keys/bodies, PII, or
health/financial content. Sample high-volume events and define metric semantics
so a high hit ratio cannot conceal unsafe staleness.

Avoid repeated JSON decoding, full-dataset hydration, unnecessary database
writes, synchronous main-thread disk I/O, refresh-on-every-appearance, broad
prefetch, and duplicate raw/decoded copies. Keep a cache only when measured UX,
latency, bytes, or reliability gains exceed correctness, privacy, startup, and
maintenance costs.

## Security rules

- Minimize caching of credentials, OTPs, authorization decisions, payment or
  medical data. If persistence is required, document the threat model, retention,
  access control, encryption, backup exclusion, deletion, and account isolation.
- Keep encryption keys in the platform keystore/keychain; never beside encrypted
  data or hardcoded in the app. Encryption does not replace key separation,
  invalidation, or access control.
- Respect server `no-store`; do not override it casually in an application cache.
- Validate cached schemas and untrusted server data before use. Protect keys from
  cross-user collision and cache poisoning; bind entries to trusted origin,
  representation, account, and version.
- Logout must clear all accessible private copies, validators, derived views,
  pending notifications, and in-flight results according to retention policy.

## Testing

Use injected/fake clocks and deterministic schedulers; never wait for real TTLs.
Test the contract at the repository/store boundary:

- hit, miss, soft expiry, hard expiry, forced refresh, and eviction bounds;
- conditional `304`, validator replacement, and server `no-store`;
- exact key isolation for account, tenant, locale, filters, body, and pages;
- mutation update/invalidation and dependent queries;
- concurrent identical misses produce one request; different keys do not;
- cancellation, refresh failure, and out-of-order responses cannot overwrite
  newer data;
- offline startup/restart, pending mutation recovery, retries, conflicts, and
  tombstones;
- corruption, schema migration, disk full/write failure, and cache purge;
- logout/account switch/permission downgrade removes or isolates private data;
- pagination dedupe/order/cursors and pull-to-refresh generation reset.

Run integration tests against a controllable HTTP server and real storage, then
test platform-dependent behavior on each supported target. Profile release-like
builds with representative dataset sizes and network conditions.

## Anti-patterns and preferred alternatives

| Avoid | Harm/symptom | Prefer |
| --- | --- | --- |
| Cache everything | Privacy, stale state, storage/maintenance growth | Explicit resource contracts; no cache by default |
| One global TTL | Critical data stale or static data refetched | Per-resource freshness budgets |
| TTL-only invalidation | Mutations leave known-wrong views | Mutation/tag/version invalidation plus TTL |
| Unbounded memory/disk/pages | OOM, disk churn, long startup | Entry/byte/page bounds and targeted eviction |
| Parallel cache owners | Conflicting values and refresh storms | One repository policy owner |
| Network-first with default long timeout | Slow offline fallback | Deliberate fallback threshold and cancellation |
| Cache-first without freshness | Indefinite stale data | Soft/hard expiry or content versioning |
| SWR without single-flight/version guards | Stampede and stale overwrite | One refresh per key plus generation/version check |
| Connectivity equals reachability | Requests still fail | Attempt request and handle its result |
| Persist raw API blobs forever | Migration/corruption and excess data | Versioned domain records or bounded reconstructible blobs |
| Cache-first called offline-first | Writes/sync/conflicts are missing | Local source of truth plus durable sync contract |
| Clear all caches on any mutation | Jank and excess traffic | Entity/dependency invalidation |

## Review checklist

- [ ] Existing owners/callers and all cache layers were traced.
- [ ] Source of truth and cache/offline contract are explicit per resource.
- [ ] Strategy matches the harm of stale data, not a generic default.
- [ ] HTTP semantics are delegated to a verified compliant layer.
- [ ] Keys cover representation and account/tenant dimensions without secrets.
- [ ] Soft/hard expiry, invalidation, versioning, bounds, and recovery exist.
- [ ] Mutations update/invalidate every affected entity/query.
- [ ] Single-flight and stale-response overwrite prevention are tested.
- [ ] Logout, account switch, process death, pagination, and corruption are tested.
- [ ] Sensitive persistence, encryption keys, backups, logs, and deletion were reviewed.
- [ ] Cold/warm/stale/offline metrics demonstrate a net benefit.

When reporting work, state the chosen policy and why, authoritative source,
freshness/staleness contract, storage/key/invalidation design, concurrency and
failure behavior, files changed, checks actually run, measured results, and any
unverified platform behavior.
