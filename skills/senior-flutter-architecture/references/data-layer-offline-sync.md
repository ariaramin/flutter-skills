# Data Layer, Caching, Offline & Synchronization

## Repository source of truth [F/B-D1]

The repository presents one coherent model interface regardless of whether data comes from remote, local DB, memory cache, file system, or platform source.

The UI should not contain:
```dart
if (connected) {
  api.load();
} else {
  database.load();
}
```

That source-selection policy belongs behind the data boundary.

## Services [F]

Examples:
- `ApiService`
- `DatabaseService`
- `SecureStorageService`
- `FileService`
- `PlatformLocationService`

Services wrap external sources. Repositories combine them into app behavior.

## Read strategies

### Remote-first with local fallback
Use when freshness is more important than immediate offline consistency.

### Local-first
Render local data immediately; refresh remote; update local; repository emits new model.

Good for:
- feeds;
- user content;
- catalogs;
- apps where fast startup/offline read matters.

### Cache-aside
Read cache if valid, fetch on miss/stale, update cache.

Define freshness explicitly.

## Offline-first [F/B-D1]

Official Flutter architecture guidance describes repositories combining local and remote data sources and acting as a single access point independent of connectivity.

Questions:
- what works offline?
- how stale may data be?
- are writes accepted offline?
- must pending writes survive process death?
- what sync trigger exists?
- what happens on conflict?
- what does UI show while pending?

## Optimistic write state machine [B-D1]

```text
user intent
→ local optimistic state
→ persist/track pending mutation if required
→ remote attempt
→ ack → committed
→ retryable failure → pending/retry state
→ terminal/conflict → rollback or user-resolution state
```

Never silently discard failed writes.

## Connectivity

Do not treat “network interface exists” as proof that the server is reachable.
Connectivity signals can influence UX/scheduling, but real request outcomes remain authoritative.

## Pagination [B-D1/B-D2]

Presentation state should track:
- items;
- initial load;
- next-page load;
- cursor/page key;
- `hasMore`;
- next-page error;
- refresh state.

Repository/API owns page contract and deduplication policy.

Use cursor pagination for mutation-heavy feeds when backend supports it; offset can be simpler for stable collections/random page access.

## Prefetch [B-D1]

Prefetch when:
- the next data is highly predictable;
- network/latency cost justifies it;
- memory/data budget is acceptable.

Tune threshold from real behavior.

## Mapping models

Separate remote DTO / DB entity / domain model when semantics differ:
- field names/encoding differ;
- local metadata exists;
- domain invariants differ;
- backend versioning should not leak.

Do not create three identical classes merely because a diagram says so.

## Error mapping

Boundary:
```text
transport/platform exception
→ service/data error
→ repository/domain failure
→ presentation message/action
```

Preserve technical details for logging/diagnostics without exposing raw exceptions to users.

## Retry

Retry only when:
- transient;
- safe/idempotent/deduplicated;
- budgeted.

Use backoff/jitter as appropriate.
Do not retry validation/auth/permission failures as if transient.

## Sync conflict framework

Identify:
- authoritative fields;
- mutation version/timestamp;
- mergeability;
- server rejection semantics;
- user resolution path.

Possible policies:
- server wins;
- client wins;
- last-write-wins;
- field merge;
- conflict surface to user.

Choose from product semantics, not convenience.

## Security

Sensitive values may require secure platform-backed storage rather than a general preferences/database layer.
Do not log secrets/tokens/raw sensitive payloads.
