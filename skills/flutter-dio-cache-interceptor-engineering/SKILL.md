---
name: flutter-dio-cache-interceptor-engineering
description: >-
  Use when adding, reviewing, debugging, testing, or tuning dio_cache_interceptor in a Flutter or Dart Dio client. Covers CacheOptions, CachePolicy, HTTP revalidation, cache stores, offline fallback, authenticated-user key isolation, invalidation, platform compatibility, and 4.x migration. Trigger for stale Dio responses, cache misses, force refresh, ETag or 304 behavior, store selection, or logout cache cleanup when dio_cache_interceptor is present or proposed. Do not use for generic Flutter object/image caching, server/CDN cache design, or non-Dio HTTP clients.
metadata:
  package: dio_cache_interceptor
  researched_version: 4.0.7
  researched_on: "2026-09-02"
---

# dio_cache_interceptor — Flutter Production Skill

## Purpose

Use this skill to make endpoint-specific, evidence-based decisions about `dio_cache_interceptor`. Optimize correctness and isolation before hit rate. Inspect the repository's existing Dio, authentication, persistence, dependency-injection, and testing conventions before adding an abstraction or dependency.

## Research Basis

- Research date: 2026-09-02.
- Target: `dio_cache_interceptor` 4.0.7, Dart SDK constraint `^3.8.0`, Dio `^5.2.0+1`, and `http_cache_core` `^1.1.4` in the published archive.
- Reviewed: current pub.dev readme, API docs, example, versions and changelog; the maintainer-linked `llfbandit/dart_http_cache` repository; the exact 4.0.7 pub archive; core strategy/interceptor/store source and official tests; first-party store pages and source.
- Documentation gaps: the package does not publish performance numbers, cache-size recommendations for persistent stores, a complete interceptor-order contract, request coalescing, encryption key management, or an offline-first synchronization model. Measure and design these in the application.
- Verified package behavior is labeled **Package**. Standards context is **HTTP**. Advice derived for production is **Recommendation**.
- Known discrepancies: the main readme calls Isar available on all platforms, while the current `http_cache_isar_store` package metadata excludes web. The main readme calls MMKV iOS/Android-only, while its package metadata also advertises desktop. Treat Isar as non-web and MMKV as mobile-only until the chosen versions are validated on every target. The file-store package is listed for web by pub.dev metadata, but its web implementation is a no-op.

## When to Use This Skill

Use it when a task involves:

- adding caching to a shared Dio client;
- reviewing cache policy, keys, storage, or invalidation;
- reducing safe read latency or network use;
- implementing explicit stale-on-error behavior;
- debugging stale, missing, duplicate, or wrong-user responses;
- selecting a memory or persistent store;
- handling ETag, Last-Modified, 304, refresh, or logout cleanup;
- migrating pre-4.x options or old `dio_cache_interceptor_*_store` package names.

## When NOT to Cache

Do not cache by default when a response contains credentials, one-time secrets, payment/health data, rapidly changing authorization, or data whose stale display can cause harm. Avoid caching mutations, unbounded/high-cardinality search, huge downloads/streams, and responses already held by a repository/database unless the second cache has a measured purpose. Respect server `no-store` under normal policies. If requirements force sensitive persistence, document threat model, retention, device backup behavior, deletion, and verified encryption properties.

## Mental Model

1. **Package:** the interceptor handles GET; POST is eligible only with `allowPostMethod: true`. Other methods pass through and do not invalidate anything.
2. **Package:** `request` looks up by key. A fresh entry resolves immediately. An expired entry with ETag, Last-Modified, or Date adds a conditional header and reaches the network.
3. **HTTP:** a validator lets the origin answer 304. **Package:** when a matching entry exists, 304 headers refresh the stored response and Dio receives the cached body with its stored status, normally 200.
4. **Package:** a normal network response is stored only when status/directive checks allow it. `no-store` prevents storage under normal policies; `no-cache` means store but revalidate, not "never store."
5. **Package:** configured network failures or status codes may resolve directly from any retained entry. That error path does not perform the normal freshness check; bound retention with `maxStale` when stale fallback has a business limit.
6. **Application:** endpoint semantics, user/tenant/locale key dimensions, invalidation after writes, encryption keys, request deduplication, background sync, conflict resolution, and UI stale-state disclosure remain application responsibilities.

## Installation and Dependencies

Use the versioned public packages appropriate to the project SDK:

```yaml
dependencies:
  dio: ^5.2.0+1
  dio_cache_interceptor: ^4.0.7
```

Add exactly one persistent store only when restart persistence is required. Current ecosystem names are `http_cache_file_store`, `http_cache_drift_store`, `http_cache_hive_store`, `http_cache_isar_store`, `http_cache_objectbox_store`, `http_cache_sembast_store`, and `http_cache_mmkv_store`. Do not copy old examples importing `dio_cache_interceptor_*_store` without checking the selected version.

## Recommended Architecture

Own one `CacheStore`, one base `CacheOptions`, and one shared `Dio` at the application network-composition boundary. Inject Dio into API clients; keep endpoint policy and invalidation near the repository that understands the data. Do not add the interceptor independently in each feature.

```dart
import 'package:dio/dio.dart';
import 'package:dio_cache_interceptor/dio_cache_interceptor.dart';

final class NetworkRuntime {
  NetworkRuntime({required this.dio, required this.cacheStore, required this.cache});

  final Dio dio;
  final CacheStore cacheStore;
  final CacheOptions cache;

  Future<void> close() async {
    dio.close(force: true);
    await cacheStore.close();
  }
}

NetworkRuntime createNetworkRuntime({required String baseUrl}) {
  final store = MemCacheStore(maxSize: 7 * 1024 * 1024, maxEntrySize: 500 * 1024);
  final cache = CacheOptions(store: store, policy: CachePolicy.request);
  final dio = Dio(BaseOptions(baseUrl: baseUrl))
    ..interceptors.add(DioCacheInterceptor(options: cache));
  return NetworkRuntime(dio: dio, cacheStore: store, cache: cache);
}
```

The wrapper is justified only if the application already has a composition/lifecycle object. Otherwise create these three values in the existing DI registration.

## Core Configuration

| Option | Meaning | Recommended Usage | Risks / Notes |
|---|---|---|---|
| `store` | Store used for lookup/write; non-null is required by `DioCacheInterceptor`, optional in request overrides | Share one lifecycle-managed instance | A request override may select another store; close resources at app/service shutdown |
| `policy` | Network/cache strategy; default `request` | Keep `request` globally; override narrowly | Force variants override origin cacheability checks in 4.0.7 |
| `hitCacheOnErrorCodes` | Status codes allowed to fall back to retained cache; default `[]` | Add only explicitly tolerated transient codes, often selected 5xx | Can hide a real server response and return stale data |
| `hitCacheOnNetworkFailure` | Fall back on connection/timeout failures; default `false` | Enable per offline-tolerant endpoint | Error fallback bypasses normal freshness; use a retention/business bound |
| `keyBuilder` | Produces the store key; default hashes only `url.toString()` with UUID v5 | Override for representation dimensions and POST bodies | Default ignores headers and body; collisions can leak or corrupt data |
| `maxStale` | Absolute retention deadline set from now; overrides deletion timing; default `null` | Bound how long an entry may remain available, especially for stale fallback | It is not response freshness. Supplying it on later hits can extend/change retention; 4.0.7 reduces repeated writes to roughly half-window renewals |
| `priority` | `low`, `normal`, or `high` cleanup tier; default `normal` | Classify entries only if cleanup uses priorities | It does not establish HTTP freshness |
| `cipher` | App-provided async body/header encrypt/decrypt hooks; default `null` | Use only with reviewed key storage and rotation | No encryption is provided by default; extra CPU/I/O and key-loss risk |
| `allowPostMethod` | Makes POST eligible; default `false` | Rarely, for safe query-style POST with body-aware key | Default key ignores body; force policies can store responses origin marked uncacheable |

`copyWith` cannot clear a nullable `maxStale`, `store`, or `cipher` in the current 4.0.7 API because null means "keep the old value." Construct a new request `CacheOptions` when a field must become null.

## Cache Policies

| Policy | Behavior | Best For | Avoid When |
|---|---|---|---|
| `request` | Return fresh cache; otherwise conditionally revalidate or request; store only directive-eligible responses | Normal HTTP-aware caching | Origin sends no useful validators/freshness and app must impose caching |
| `refresh` | Always request; store only when response directives permit | Pull-to-refresh with compliant origins | User expects stale-only/offline behavior without fallback options |
| `noCache` | Always request, delete the matching previous entry on response, and do not save | Sensitive or explicit bypass requests | You merely want revalidation; use request `Cache-Control: no-cache` or `refresh` |
| `forceCache` | Return retained entry without HTTP freshness check; on miss, request and force storage | Explicit app-owned TTL data from an origin without cache headers | Sensitive, authorization-changing, `no-store`, downloads, or strict freshness |
| `refreshForceCache` | Always request and force storage | Explicit refresh for app-owned forced caches | Responses whose origin cache directives must remain authoritative |

Critical 4.0.7 source fact: force policies enter the save path before status, attachment, request/response `no-store`, and cache-directive checks. Apply them only to known safe endpoints, never as a global shortcut.

Decision:

- Need origin-defined freshness and revalidation → `request`.
- Need network now and cache only if the origin permits → `refresh`.
- Need no lookup and no saved replacement → `noCache`.
- Origin lacks cache headers but product owns a bounded cache contract → `forceCache` plus `maxStale`.
- Need a forced-cache refresh → `refreshForceCache`.
- Need stale-on-connectivity/status failure → configure fallback separately; policy names do not imply offline fallback.

## Choosing a Cache Store

| Store | Persistence | Platforms | Strengths | Trade-offs | Recommended Use |
|---|---|---|---|---|---|
| `MemCacheStore` | No | All package platforms | Built in, LRU, byte caps; default 7 MB total/500 KB entry | Cleared on `close`/restart; each response held in RAM | Tests, ephemeral/public data, first implementation |
| `BackupCacheStore` | Depends on children | Children intersection | Reads primary then secondary; writes/cleans both | Double writes; source does not promote a secondary hit into primary | Only when measured two-tier behavior is needed |
| `FileCacheStore` | Yes | Android/iOS/desktop; no-op on web | Simple filesystem persistence | One-file style I/O/cleanup; provide app cache directory; not web | Modest native caches without an existing DB |
| `DriftCacheStore` | Yes | Android/iOS/desktop/web with setup | Queryable DB and background-capable Drift backend | SQLite/native setup; web requires `sqlite3.wasm` and `drift_worker.js` | Larger persistent caches or apps already using Drift |
| `HiveCacheStore` / `IsolatedHiveCacheStore` | Yes | Android/iOS/desktop/web | Lazy box avoids loading all values; optional Hive cipher; isolated variant available | Box lifecycle/setup; verify cipher/key policy | Cross-platform persistence, especially when Hive CE already exists |
| `SembastCacheStore` | Yes | Android/iOS/desktop/web | Pure-Dart-style DB with web backend | Less ecosystem usage; still persistent I/O and serialized scans for path operations | Cross-platform persistence when Sembast already fits |
| `IsarCacheStore` | Yes | Android/iOS/desktop; not web in current package metadata | Native object DB | Generated/native dependencies; community Isar versions pinned | Apps already committed to compatible Isar Community |
| `ObjectBoxCacheStore` | Yes | Android/iOS/desktop; no web | Native object DB | Native libraries/codegen footprint | Apps already using ObjectBox and needing one store stack |
| `MMKVCacheStore` | Yes | Conservatively Android/iOS | Fast key-value backend and optional crypt key | Flutter/native initialization; platform docs conflict | Existing validated MMKV mobile apps only |

Use `MemCacheStore` for deterministic tests. For mobile/desktop persistence, use the store already present unless measurements justify another database. On web choose Hive, Sembast, or correctly provisioned Drift; never choose `FileCacheStore`. Persistent stores need an OS-appropriate cache directory, not a source or documents directory by habit; account for OS eviction and backups.

## Production Setup

Native persistent example using the current file-store package:

```yaml
dependencies:
  dio: ^5.2.0+1
  dio_cache_interceptor: ^4.0.7
  http_cache_file_store: ^2.0.2
  path_provider: ^2.0.0
```

```dart
import 'package:dio/dio.dart';
import 'package:dio_cache_interceptor/dio_cache_interceptor.dart';
import 'package:http_cache_file_store/http_cache_file_store.dart';
import 'package:path_provider/path_provider.dart';

Future<NetworkRuntime> createPersistentNetworkRuntime(String baseUrl) async {
  final root = await getTemporaryDirectory();
  final store = FileCacheStore('${root.path}/http-cache');
  final cache = CacheOptions(
    store: store,
    policy: CachePolicy.request,
    hitCacheOnNetworkFailure: false,
  );
  final dio = Dio(BaseOptions(baseUrl: baseUrl))
    ..interceptors.add(DioCacheInterceptor(options: cache));
  return NetworkRuntime(dio: dio, cacheStore: store, cache: cache);
}
```

Place an auth interceptor before cache when it supplies key inputs needed by a custom builder. Place response logging after cache if it must observe cache-resolved responses, and redact credentials/content. Verify order with an interceptor test; the package does not define the rest of the application's ordering.

## Request-Level Overrides

Derive request options from the shared instance so store and key strategy stay consistent:

```dart
final response = await runtime.dio.get<Map<String, Object?>>(
  '/catalog',
  options: runtime.cache.copyWith(
    policy: CachePolicy.refresh,
    maxStale: const Duration(days: 1),
  ).toOptions(),
);
```

Use `CacheOptions(store: null, policy: ..., keyBuilder: ...)` only when intentionally inheriting the interceptor store. Do not scatter unrelated full option objects through UI widgets.

## Cache Key Design

**Package:** the default key is deterministic UUID v5 of the complete request URI. Query string and API version in the URI participate; headers and body do not. The package stores `Vary` but does not automatically use it to partition keys.

Use a stable custom builder when the same URI can represent different users, tenants, roles, locales, formats, feature variants, or POST bodies. Prefer a stable account/tenant identifier, never a rotating bearer token. Do not store raw PII in keys; feed a synthetic URI into the default UUID builder:

```dart
CacheKeyBuilder scopedKeyBuilder({
  required String Function() accountId,
  required String Function() localeTag,
}) {
  return ({required Uri url, Map<String, String>? headers, Object? body}) {
    final material = Uri(
      scheme: 'cache-key',
      host: 'local',
      queryParameters: {
        'url': url.toString(),
        'account': accountId(),
        'locale': localeTag(),
      },
    );
    return CacheOptions.defaultCacheKeyBuilder(url: material);
  };
}
```

For query-style POST, add a canonical body representation. JSON map insertion order is not a semantic canonicalization; normalize/sort the body in the repository before hashing or do not cache POST.

Dangerous: default URL key for `/me`, `/dashboard`, localized `/catalog`, tenant-dependent `/config`, or POST `/search`. Correct: include stable account/tenant/locale/representation/body dimensions, keep pagination/query parameters, and clear obsolete scopes on identity/environment changes.

## HTTP Caching and Revalidation

- **Package:** cache triggers include ETag, Last-Modified, Expires, or `Cache-Control: max-age`. Normal policies do not cache merely because a GET returned 200.
- **Package:** freshness uses Age, Date, Expires, max-age, request/response timestamps, request max-age/min-fresh/max-stale, and response must-revalidate/no-cache. Max-age takes precedence over Expires. A queryless URL with Last-Modified may receive the RFC heuristic of 10% of document age; queried URLs do not.
- **HTTP:** `no-cache` permits storage but requires validation. `no-store` forbids storage for the request/response under normal policies. `must-revalidate` prevents serving stale via request max-stale in the normal strategy.
- **Package:** ETag produces `If-None-Match`; otherwise Last-Modified or Date may produce `If-Modified-Since`. Existing caller conditions take precedence; If-None-Match removes If-Modified-Since.
- **Package:** 304 is converted to usable cached content only if an entry exists. Without one, 304 passes through. Updated headers include Cache-Control, Age, Date, ETag, Last-Modified, Expires, Content-Location, and Vary.
- **Application:** this is not a shared proxy cache, does not infer business invalidation, and does not coalesce concurrent misses. Add single-flight only after duplicate calls are observed and cancellation semantics are defined.

## Cache Invalidation

Mutations are not automatic invalidation signals. After a successful POST/PUT/PATCH/DELETE, evict affected reads before publishing refreshed state.

```dart
Future<void> updateProduct(NetworkRuntime runtime, String id, Object data) async {
  await runtime.dio.patch<void>('/products/$id', data: data);
  await runtime.cacheStore.deleteFromPath(
    RegExp(r'/products(?:/|$)'),
  );
}
```

Use anchored/restrictive patterns and `queryParams` when possible; path operations can match many entries and persistent stores may scan. For an exact known entry, keep its `response.extra[extraCacheKey]` and call `store.delete(key)`. For manual refresh use `refresh` or `refreshForceCache`, matching the cache contract. On logout/account/tenant/environment switch, clear the user store before activating the next identity. On incompatible stored schema or policy changes, perform one version-gated `clean()` migration. `clean(staleOnly: true)` removes entries past package `maxStale`, not all HTTP-expired entries.

## Authentication and Security

- Treat the cache as a data store and trust boundary. Neither the base package nor ordinary stores promise encryption by default.
- Partition private keys by stable user, tenant, role/entitlement, locale, and environment whenever those change representation.
- Prefer separate public and private stores when public cache retention should survive logout. Otherwise `await store.clean()` is the safest logout/account-switch boundary.
- Never put access/refresh tokens in cache bodies, URLs, persisted key material, or logs. Do not key by a rotating token.
- `CacheCipher` encrypts serialized headers and body only with the algorithm supplied by the app. Review authenticated encryption, nonce use, key storage/rotation, failure recovery, and backups. Hive/MMKV store-level encryption is separate; do not claim either is enabled without configuration and a test.
- Force policies can override `no-store` in 4.0.7 source. Do not use them on authenticated/sensitive endpoints unless an explicit product/security decision replaces origin directives.

## Offline and Failure Handling

`hitCacheOnNetworkFailure: true` covers connection-style Dio failures such as connect/send/receive timeouts when a retained entry exists. `hitCacheOnErrorCodes` opts selected HTTP statuses into fallback. Cancellation is not converted into cache. Cache fallback is automatic only after these options are set.

Because the error path loads the retained entry without the normal freshness decision, set `maxStale` to the maximum tolerable retention and expose stale/offline state at the repository/UI level. A cache miss still throws. A successful mutation is never queued. Build connectivity messaging, write queue, conflict policy, and synchronization separately.

In 4.0.7, request/response store exceptions are converted to rejected `DioException`s rather than hanging. A write failure can therefore reject an otherwise successful network response. On the error hook, cache-store failure is suppressed and the original Dio error continues. Decide whether cache availability is critical, instrument failures, and test the selected store.

## Performance Engineering

1. Cache fewer, valuable endpoints; avoid duplicate repository/database caches without measured benefit.
2. Use bounded `MemCacheStore`; its defaults are 7 MB total and 500 KB per entry, and it rejects oversized entries. Keep `maxEntrySize * 5 <= maxSize`.
3. Choose an existing store stack to avoid another database/runtime. Persistent hits still pay read and deserialization cost.
4. Bound retention with endpoint-specific `maxStale` and schedule cleanup around app lifecycle or storage pressure; do not clean on every request.
5. Keep key construction deterministic and cheap. Canonicalize only required dimensions; never perform I/O in a key builder.
6. Avoid large response caching, streams, and attachments. Normal policies reject streams/attachments; force policies bypass that save check.
7. Cipher work encrypts/decrypts headers and body. Profile latency, allocations, and battery on target hardware.
8. Parallel misses are not deduplicated. Confirm duplicates in traces before adding a shared in-flight future map.
9. Measure cache hit/miss/revalidation/fallback counts, serialized sizes, store latency, startup cost, eviction, and endpoint freshness. The project publishes no representative benchmark.

## Cross-Platform Guidance

### Android / iOS

Use an OS cache directory for disposable file/database caches and verify backup/exclusion behavior. Drift requires the documented SQLite Flutter support; Hive, Sembast, Isar, ObjectBox, and MMKV bring their own initialization/native constraints. Test cold start, upgrade, low-storage eviction, and logout deletion on devices.

### Web

Use memory, Hive, Sembast, or provisioned Drift. File store is a no-op. Drift requires matching `sqlite3.wasm` and `drift_worker.js` assets. Current Isar and ObjectBox store packages do not advertise web. Browser storage is origin-scoped and user-clearable; test quotas, private browsing, deploy subpaths, and multi-tab behavior. Do not describe browser persistence as secure storage.

### Windows / macOS / Linux

Memory, file, Drift, Hive, Sembast, Isar, and ObjectBox are candidates according to current package metadata, subject to native setup. Choose an application-specific cache path rather than the process working directory. Verify packaging of native libraries, sandbox entitlements, concurrent instances, cleanup, and upgrades. Treat MMKV desktop as unverified because official surfaces conflict.

## Testing Strategy

Use `MemCacheStore` plus a deterministic fake Dio adapter. Assert both returned data and network-call count.

```dart
test('second fresh request is a cache hit', () async {
  final store = MemCacheStore();
  final cache = CacheOptions(store: store);
  final adapter = CountingAdapter(
    statusCode: 200,
    body: '{"value":1}',
    headers: {Headers.contentTypeHeader: ['application/json'], 'cache-control': ['max-age=60']},
  );
  final dio = Dio()..httpClientAdapter = adapter;
  dio.interceptors.add(DioCacheInterceptor(options: cache));

  await dio.get<Map<String, Object?>>('/value');
  final second = await dio.get<Map<String, Object?>>('/value');

  expect(adapter.calls, 1);
  expect(second.extra[extraFromNetworkKey], isFalse);
});
```

`CountingAdapter` is application test infrastructure, not a package API. Add one focused case each for miss/write, clock-controlled expiry or short TTL, ETag/304 body restoration, refresh network call, noCache deletion, mutation invalidation, network/status fallback, store failure, user/tenant/locale isolation, POST body isolation if enabled, and selected persistent-store platform integration. Avoid real delays where a fake clock/controlled headers suffice; where package internals use `DateTime.now`, use narrow durations conservatively.

## Observability and Debugging

Inspect `response.extra[extraCacheKey]` and `response.extra[extraFromNetworkKey]`; do not expose key material or payloads in production logs. Record endpoint template, policy, outcome (network/cache/revalidated/fallback), status, duration, and size with PII-safe tags.

Troubleshooting order:

1. Confirm interceptor presence, order, request method, request override, and selected store instance.
2. Log the sanitized final URI and key dimensions; compare account/tenant/locale/pagination/body.
3. Inspect origin Cache-Control, ETag, Last-Modified, Date, Expires, Age, Vary, status, response type, and attachment headers.
4. Distinguish HTTP expiry from package `maxStale` retention.
5. Verify whether force policy, offline/status fallback, or request `no-cache` changed the path.
6. Check mutation/logout/environment invalidation and whether a broad regex missed or overmatched.
7. Surface store read/write/close exceptions and measure store latency.
8. For duplicate requests, confirm simultaneous misses; the interceptor has no documented single-flight behavior.

Wrong-user responses almost always mean a missing key scope or missing identity-transition clear. Unexpected misses commonly mean no cache directive, oversized memory entry, different query URI/key dimensions, `no-store`, refresh/noCache, attachment/stream, eviction, or another store instance.

## Common Mistakes

| Mistake | Why It Is a Problem | Correct Approach |
|---|---|---|
| One force policy globally | Overrides origin checks and freshness | Default to `request`; force only audited endpoints |
| Assuming default key follows `Vary` | URL-only key ignores headers/body | Encode required representation dimensions |
| Caching POST with default key | Different bodies collide | Keep disabled or canonicalize body into key |
| Treating `maxStale` as freshness TTL | It controls retained-entry deletion and may renew on use | Use origin freshness or force contract deliberately |
| Enabling fallback without stale limit | Errors can return old retained data | Set business retention and expose stale state |
| Forgetting logout/account switch | Persistent private data crosses identity boundaries | Scope keys and clear/swap private store atomically |
| Assuming persistence is encrypted | Base behavior is plaintext serialization | Verify/configure cipher and key management |
| Using file store on web | Implementation does nothing | Use memory/Hive/Sembast/provisioned Drift |
| Expecting mutation invalidation | Non-GET methods are skipped | Evict affected reads after successful mutation |
| Creating store/client per feature | Fragments cache and leaks lifecycle resources | Share at network composition boundary |
| Expecting request deduplication | Concurrent misses may all hit network | Add measured application-level single-flight |
| Ignoring cache-store errors | Reads/writes can affect request success | Instrument and test failure semantics |

## Anti-Patterns

Do not use a blanket forced cache:

```dart
// Dangerous: can store origin no-store responses and ignore HTTP freshness.
CacheOptions(store: store, policy: CachePolicy.forceCache);
```

Use normal semantics globally and opt in narrowly:

```dart
final baseCache = CacheOptions(store: store);
await dio.get('/metadata', options: baseCache.toOptions());
await dio.get(
  '/legacy-static-config',
  options: baseCache.copyWith(
    policy: CachePolicy.forceCache,
    maxStale: const Duration(hours: 6),
  ).toOptions(),
);
```

Do not assume `/me` is isolated because Authorization differs. The default key ignores it. Prefer a user-scoped key and full private-store cleanup on logout.

## Review Checklist

- [ ] Package/API guidance matches the resolved versions and Dart SDK.
- [ ] Each endpoint is classified cacheable/non-cacheable with freshness impact.
- [ ] Normal policy respects origin directives; every force policy is justified.
- [ ] Key covers URI plus user, tenant, locale, representation, and POST body where applicable.
- [ ] Store fits every target and has correct initialization, directory, lifecycle, and bounds.
- [ ] Private persistence, encryption claim, backup, logout, and account switching are reviewed.
- [ ] Mutations, manual refresh, environment changes, and schema upgrades define invalidation.
- [ ] Offline/status fallback has an explicit stale-data limit and UI contract.
- [ ] Tests cover hit, miss, revalidation, refresh, invalidation, fallback, and identity isolation.
- [ ] Logging is PII-safe; store failures and cache outcomes are observable.
- [ ] Performance claims come from target profiling, not generic assumptions.

## AI Agent Workflow

1. Locate repository instructions and the actual shared Dio construction.
2. Trace interceptors, API clients, repositories, auth transitions, and existing persistence end to end.
3. Inventory target platforms and resolved package versions.
4. Classify each endpoint's cacheability, freshness, sensitivity, and stale tolerance.
5. Identify user/tenant/locale/version/pagination/body representation boundaries.
6. Reuse an existing suitable store; otherwise choose the smallest platform-correct store.
7. Default to `request`; justify every override and error fallback.
8. Design stable keys without secrets and define mutation/identity/environment invalidation.
9. Implement at the shared boundary with request overrides at the owning repository, not UI.
10. Add the smallest deterministic tests that fail for collisions, stale misuse, or missing eviction.
11. Profile representative payloads and store operations on target platforms.
12. Document verified package facts, engineering choices, server assumptions, and unverified limits.

## Decision Trees

### Should this endpoint be cached?

Read-only and safe to retain? If no → do not cache. Representation stable for a bounded period or validator-backed? If no → do not cache. Can every auth/tenant/locale/body variant be keyed and invalidated? If no → fix design or do not cache. Does cache duplicate a better local source? If yes → skip unless measured. Otherwise cache with explicit freshness and retention.

### Which cache policy should I use?

Origin directives useful → `request`. Need user refresh but still respect origin storage → `refresh`. Need bypass and deletion → `noCache`. Origin lacks directives and app owns a bounded contract → narrow `forceCache`; use `refreshForceCache` for its explicit refresh. Add failure fallback only when stale data is acceptable.

### Which cache store should I use?

No restart requirement/test → bounded memory. Restart requirement → reuse app's supported persistence. Web → Hive/Sembast/provisioned Drift, not file. Native simple/modest → file. Existing Drift/Hive/Sembast/Isar/ObjectBox/MMKV → prefer matching stack after platform verification. Add two-tier backup only after measurement.

### Should this cache survive application restarts?

If data is cheap, sensitive, fast-changing, or already persisted → no. If cold-start/offline value exceeds storage/security/upgrade cost and retention is bounded → yes, with OS-appropriate storage, cleanup, migration, and logout rules.

### When should I invalidate it?

Invalidate after a successful mutation that changes the represented resource/list; on logout/account/tenant/environment change; when entitlements or locale change if they affect representation; on incompatible cache schema; and when product freshness requires manual refresh. Prefer exact keys, then restrictive path/query eviction, then full private-store clear at security boundaries.

## Production Recipes

### 1. Normal HTTP-aware caching

Goal: use origin freshness/validators. Configure `CacheOptions(store: store)` and `CachePolicy.request`. Caveat: without ETag, Last-Modified, Expires, or max-age, a normal response is not stored.

### 2. Offline-tolerant read endpoint

```dart
final offlineRead = baseCache.copyWith(
  hitCacheOnNetworkFailure: true,
  hitCacheOnErrorCodes: const [500, 502, 503, 504],
  maxStale: const Duration(days: 2),
);
await dio.get('/catalog', options: offlineRead.toOptions());
```

Goal: return retained catalog data during transient failure. Caveat: fallback may be HTTP-expired; label stale state and treat a miss as a real error.

### 3. Pull-to-refresh / force-refresh flow

```dart
await dio.get('/feed', options: baseCache.copyWith(policy: CachePolicy.refresh).toOptions());
```

Goal: require network while preserving compliant cache update. Caveat: combine with failure fallback only if refresh may deliberately show old data.

### 4. Persistent mobile cache

Use the file-store setup above with `getTemporaryDirectory()`, or reuse the app's supported Hive/Drift store. Caveat: test OS eviction, upgrades, storage pressure, privacy, and shutdown; persistent does not mean guaranteed or encrypted.

### 5. Ephemeral in-memory cache

```dart
final store = MemCacheStore(maxSize: 4 * 1024 * 1024, maxEntrySize: 256 * 1024);
final cache = CacheOptions(store: store);
```

Goal: bounded session cache without disk. Caveat: oversized entries are skipped and restart clears everything.

### 6. User-specific authenticated caching

```dart
final privateCache = CacheOptions(
  store: privateStore,
  keyBuilder: scopedKeyBuilder(
    accountId: () => session.requireUserId(),
    localeTag: () => locale.currentTag,
  ),
);
```

Goal: isolate `/me` and entitlement-sensitive reads. Caveat: also clear `privateStore` before switching identity; closures must read current state synchronously and reliably.

### 7. Invalidating data after mutation

Perform the mutation, await success, then `delete` exact known keys or call a restrictive `deleteFromPath`; finally refetch if the UI requires current server state. Caveat: invalidate lists/aggregates as well as the detail endpoint.

### 8. Clearing user cache on logout

```dart
Future<void> logout() async {
  await privateStore.clean();
  await authSession.clear();
}
```

Goal: remove retained private responses before another user can become active. Caveat: coordinate request cancellation and auth transition so an in-flight old-user response cannot repopulate the store after cleaning.

## Final Best-Practice Defaults

For a typical application: one shared Dio/interceptor/store; `CachePolicy.request`; GET only; default URL key only for truly public URI-complete representations; custom stable scoped keys for auth/tenant/locale variants; no error fallback globally; bounded `MemCacheStore` unless restart/offline value justifies persistence; endpoint-specific `maxStale`; explicit post-mutation and logout invalidation; PII-safe outcome metrics; deterministic interceptor tests; device/browser profiling. Deviate only from documented endpoint semantics and record the reason.

## Sources

- Package, readme, example, changelog, versions: https://pub.dev/packages/dio_cache_interceptor
- API library: https://pub.dev/documentation/dio_cache_interceptor/4.0.7/dio_cache_interceptor/
- `CacheOptions`: https://pub.dev/documentation/dio_cache_interceptor/4.0.7/dio_cache_interceptor/CacheOptions-class.html
- `CachePolicy`: https://pub.dev/documentation/dio_cache_interceptor/4.0.7/dio_cache_interceptor/CachePolicy.html
- Official repository: https://github.com/llfbandit/dart_http_cache
- Interceptor source: https://github.com/llfbandit/dart_http_cache/blob/master/dio_cache_interceptor/lib/src/dio_cache_interceptor.dart
- Cache strategy source: https://github.com/llfbandit/dart_http_cache/blob/master/http_cache_core/lib/src/model/cache/cache_strategy.dart
- Core/cache store source: https://github.com/llfbandit/dart_http_cache/tree/master/http_cache_core/lib/src
- Official interceptor/core tests: https://github.com/llfbandit/dart_http_cache/tree/master/dio_cache_interceptor/test and https://github.com/llfbandit/dart_http_cache/tree/master/http_cache_core/test
- Drift store: https://pub.dev/packages/http_cache_drift_store
- File store: https://pub.dev/packages/http_cache_file_store
- Hive store: https://pub.dev/packages/http_cache_hive_store
- Isar store: https://pub.dev/packages/http_cache_isar_store
- ObjectBox store: https://pub.dev/packages/http_cache_objectbox_store
- Sembast store: https://pub.dev/packages/http_cache_sembast_store
- MMKV store: https://pub.dev/packages/http_cache_mmkv_store
- HTTP caching semantics (current standard): https://www.rfc-editor.org/rfc/rfc9111
- Conditional requests: https://www.rfc-editor.org/rfc/rfc9110.html#name-conditional-requests
