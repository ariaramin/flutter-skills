# Example — Architecture Review

## Scenario

A social feed screen uses one `FeedViewModel` that:
- calls REST directly;
- stores an in-memory list;
- appends pages with `page=2,3...`;
- writes likes directly to network;
- retries every exception three times immediately;
- passes the whole `Post` object to details;
- loses all state when app is killed.

## Review

### Finding 1 — Network ownership is coupled to presentation

**Risk:** UI lifecycle controls data behavior; hard to add persistence/offline behavior; tests must mock networking inside presentation.

**Minimal correction:** introduce a cohesive feed data boundary/repository and keep presentation focused on state/events.

**Evidence:** D1 Facebook mock praises repository + presentation/domain/data separation.

### Finding 2 — Pagination does not match a mutation-heavy feed

**Risk:** offset/page-number pagination can produce duplicate/missed items when new posts arrive.

**Recommendation:** evaluate cursor pagination because feed order changes while user scrolls. Track cursor/end/loading/error/dedupe state.

**Alternative:** retain offset if backend dataset is stable and page-number access is required.

**Evidence:** D1 + D2 pagination material.

### Finding 3 — Like action has no optimistic/offline model

**Risk:** slow UI feedback; failure semantics unclear; offline interaction impossible.

**Recommendation:** if product requires fast/offline likes, model pending mutation with request ID and status, update UI optimistically, persist if restart survival is required, reconcile with backend.

**Switch condition:** for irreversible/high-risk operations, prefer server confirmation first.

**Evidence:** D1 Facebook offline deep dive.

### Finding 4 — Immediate retry loop

**Risk:** outage amplification, battery/data waste, rate limit.

**Recommendation:** classify retryable failures; bounded exponential backoff; terminal user-visible state.

**Evidence:** D1 retry deep dive.

### Finding 5 — Whole object in navigation

**Risk:** details screen can receive stale post state and restoration/deep links become harder.

**Recommendation:** pass post ID/minimal route params; details resolves current state.

**Evidence:** D1 navigation discussion; exact generalization is S.

### Finding 6 — No prefetch

**Risk:** visible loading at page boundary.

**Recommendation:** add bounded prefetch threshold if network/data budget permits.

**Evidence:** D1 instructor feedback explicitly identifies prefetch as missed discussion.

## Proposed target flow

```text
FeedScreen
  ↓ events / observes state
FeedStateHolder
  ↓
(optional FeedUseCase if business orchestration earns it)
  ↓
FeedRepository
  ├─ Local DB / cache
  ├─ Remote API
  └─ PendingMutationStore
```

The exact class names are not important; responsibility/data flow is.
