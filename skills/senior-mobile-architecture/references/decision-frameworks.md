# Decision Frameworks

Use these frameworks to prevent pattern-first answers.

## 1. UI vs domain vs data placement [D1/C/S]

Ask in order:
1. Is this purely view formatting/interaction state? → **Presentation**.
2. Is it a business decision independent of UI/network/database? → **Domain**.
3. Does it fetch/persist/cache/synchronize/map infrastructure data? → **Data**.
4. Is it orchestration across multiple domain capabilities? → domain application/use-case coordinator if complexity justifies it [S].
5. Would moving it alter dependency direction or make tests simpler?

**Red flag:** a rule moves layers only to satisfy a folder convention.

---

## 2. Do we need a domain layer? [D1/C/S]

Use a domain layer when at least one is true:
- logic is substantial and UI-independent;
- multiple screens/features reuse it;
- it composes several repositories;
- it is policy that should survive framework/infrastructure replacement;
- independent testing materially improves confidence.

Skip/keep thin when:
- feature is CRUD-like;
- “use cases” are 1:1 pass-through wrappers;
- the extra mapping/indirection has no ownership value.

Evidence note: channel directly supports layered architecture; optionality criteria are supplemental operationalization.

---

## 3. REST vs GraphQL vs realtime channel [D2/D1/S]

### REST
Prefer when:
- resource/operation contracts are stable;
- HTTP semantics/caching/debuggability matter;
- team/backend already uses REST;
- request-response dominates.

### GraphQL
Prefer when:
- clients need flexible field selection/aggregation;
- schema/tooling and cache complexity are accepted;
- multiple client surfaces otherwise over/under-fetch heavily.

### WebSocket
Prefer when:
- bidirectional low-latency messaging is frequent;
- persistent connection cost is justified.

### SSE
Prefer when:
- server→client stream dominates;
- simpler one-way streaming is sufficient.

### Polling/long-polling
Prefer when:
- update frequency is modest;
- infrastructure/background constraints make persistent connections unattractive.

**Always discuss:** mobile backgrounding, reconnect strategy, ordering, duplication, auth refresh, battery/data cost [S].

---

## 4. Offset vs cursor pagination [D1/D2]

### Cursor
Choose when:
- collection changes frequently;
- infinite scroll is primary;
- duplicates/missed items due to insertions are costly;
- stable continuation matters more than jumping to page N.

### Offset
Choose when:
- collection is relatively stable;
- simple page-number/random-access UX is useful;
- backend cost is acceptable.

Then define:
- page size;
- refresh/reset cursor semantics;
- deduplication;
- prepend vs append;
- end-of-list marker;
- error/retry state;
- prefetch threshold.

---

## 5. Cache vs persistent database [D1/C/S]

Ask:
1. Must data survive process death/reboot? → persistent storage.
2. Must app work offline? → persistent storage for required data.
3. Is data cheap and safe to refetch? → memory/disk cache may suffice.
4. Are relationships/transactions important? → relational DB often fits.
5. Is data key-value/config/preferences? → key-value store.
6. Is media/blob content involved? → file/blob cache + metadata DB.
7. Is sensitivity high? → minimize persistence/encrypt/protect according to platform policy [S].

---

## 6. Optimistic vs pessimistic write [D1/S]

### Optimistic
Use when:
- immediate UI feedback matters;
- success probability is high;
- operation is reversible/reconcilable;
- mutation identity can prevent duplicates.

Must define rollback/reconciliation, pending state, retry, conflict policy, terminal UX.

### Pessimistic
Use when:
- irreversible/high-risk side effect occurs (e.g. certain financial actions);
- server validation is critical before UI commitment;
- conflicting concurrent writes are costly.

---

## 7. Retry or fail fast? [D1/S]

Retry only if:
- failure is plausibly transient;
- request is idempotent or deduplicated;
- retry does not violate UX/business semantics;
- budget/backoff exists.

Fail fast for:
- validation/permission errors;
- nonrecoverable client contract errors;
- exhausted retry budget;
- operations requiring user correction.

---

## 8. Single module vs multi-module [D1/I/S]

Score 0–2 each:
- independent team ownership;
- independent release/build/test value;
- reusable capability;
- dependency-boundary enforcement;
- build-time isolation benefit;
- feature size/volatility.

0–3: keep together.
4–7: introduce a coarse boundary.
8–12: strong modularization candidate.

The scoring is supplemental; the channel-supported insight is that modularity can support large-scale team/codebase growth.

---

## 9. App component vs reusable library [D2/C]

Choose library/SDK boundary when:
- behavior is reused by multiple features/apps;
- caller needs stable API independent of internals;
- lifecycle/configuration can be made explicit;
- versioning/backward compatibility can be owned.

Do not extract a library merely to “clean up folders.”

---

## 10. Pass object vs ID in navigation [D1/S]

Prefer stable ID/minimal arguments when:
- destination can re-resolve fresh data;
- model is large/mutable;
- process restoration/deep links matter;
- object serialization is fragile.

Pass small immutable value objects only when they are genuinely navigation input rather than duplicated source-of-truth state.

---

## 11. Prefetch or wait for demand? [D1/S]

Prefetch when:
- next access is predictable (infinite feed, media carousel);
- latency reduction is meaningful;
- bandwidth/battery/memory budget permits;
- cancellation/eviction exists.

Wait for demand when:
- access is speculative;
- data is large/expensive;
- user may be on constrained network;
- freshness invalidates early work quickly.
