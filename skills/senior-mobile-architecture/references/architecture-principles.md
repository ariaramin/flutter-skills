# Architecture Principles

Each principle includes evidence level and an operational interpretation.

## P1 — Requirements precede architecture [D1/C]

**Evidence:** Facebook mock opens with clarifying questions and explicit functional/nonfunctional/out-of-scope buckets; Andrey's course emphasizes a structured blueprint and problem decomposition.

**Operational rule:** Never select MVVM/MVI/Clean/repository/GraphQL/etc. before the requirements expose a reason.

**Ask:**
- What must the user be able to do?
- What must still work offline?
- What scale/latency/data constraints matter?
- What is explicitly not part of this design?

---

## P2 — Architecture is a dependency/responsibility graph [D1/D2/C]

Accessible material repeatedly centers architecture layers, repositories, DI, SOLID, and pattern comparison.

**Operational rule:** For every component, define:
- responsibility;
- inputs/outputs;
- owned state;
- dependencies;
- lifecycle;
- failure modes;
- testing seam.

If two boxes cannot be explained this way, the diagram is decorative.

---

## P3 — Separate presentation, domain, and data when the boundaries are meaningful [D1/C]

Instructor feedback explicitly praises a three-layer presentation/domain/data solution in the Facebook mock. Current course curriculum includes architecture fundamentals and architecture-pattern comparison.

**Operational rule:**
- Presentation owns rendering/interactions and presentation state.
- Domain owns reusable business decisions when such a boundary earns its cost.
- Data owns data acquisition/persistence/synchronization policy.

**Do not:** force a domain layer into a CRUD screen with no independent business rules merely to satisfy a template. That nuance is supplemental tradeoff reasoning, not a direct quote.

---

## P4 — Repositories own data-access policy, not arbitrary feature behavior [D1/I]

The Facebook design routes local/remote access through repositories and discusses sharing/splitting data sources.

**Operational rule:** Repository responsibilities can include:
- choose cache/local/remote source;
- map persistence/network models;
- coordinate refresh;
- expose a coherent data contract.

Avoid making repositories catch-all orchestrators for UI logic, navigation, analytics, and unrelated business rules.

---

## P5 — Mobile architecture must model unreliable connectivity [D1/C]

Offline viewing/writing, synchronization, network conditions, data efficiency, and error handling are treated as first-class design concerns in the Facebook mock; the mind-map includes mobile domain knowledge, storage, and performance.

**Operational rule:** Every remote-backed feature should explicitly answer:
- cache/no cache;
- stale behavior;
- offline read behavior;
- offline write behavior;
- retry/reconciliation behavior.

---

## P6 — The user experience is part of consistency design [D1]

Optimistic likes/comments are paired with pending state, retries, and terminal-failure communication.

**Operational rule:** Do not discuss “eventual consistency” only at database level. Define exactly what the user sees before, during, and after reconciliation.

---

## P7 — Select pagination based on dataset behavior [D1/D2]

Dedicated pagination video exposes offset vs cursor plus “how to choose”; Facebook mock selects cursor for a changing feed.

**Operational rule:**
- Cursor: strong default for mutation-heavy, infinite-scroll feeds and stable continuation.
- Offset: simple and useful for relatively stable datasets/page navigation.
- Keyset/seek and hybrid strategies: supplemental options for specialized backends.

Always define page size, end condition, duplicate handling, refresh semantics, and prefetch trigger.

---

## P8 — Retry policy must be bounded and user-aware [D1]

Facebook deep dive uses exponential backoff, retry limits, and user notification after failure.

**Operational rule:** Retry only failures likely to recover; bound attempts; add jitter where many clients may synchronize; protect non-idempotent mutations; expose final state.

---

## P9 — Realtime is a protocol tradeoff, not a WebSocket reflex [D2/D1]

Dedicated WebSockets video compares WebSockets with polling, long polling, and SSE. Facebook mock also mentions SSE/WebSockets/gRPC as alternatives.

**Operational rule:** Decide based on directionality, frequency, latency, connection cost, background restrictions, proxy/network behavior, and client/server complexity.

---

## P10 — Dependency injection protects change/test boundaries [D1/D2/C]

DI appears in dedicated iOS content, Top 5 concepts, current course, and is praised in Facebook feedback.

**Operational rule:** Inject dependencies that vary, perform side effects, require test control, or cross ownership boundaries. Do not inject every pure utility by default.

---

## P11 — Library architecture is API/lifecycle architecture [D2/C]

File Downloader chapters distinguish “How to Design a Library” from general app design and cover resumable/background downloads.

**Operational rule:** Before library internals, define:
- public API;
- lifecycle/ownership;
- cancellation/resume semantics;
- persistence/background guarantees;
- callback/stream/event model;
- error taxonomy;
- caller configuration.

---

## P12 — Performance design begins with the access pattern [D1/C]

Facebook feedback praises caching/CDN thinking and explicitly recommends feed prefetching. Andrey's mind-map includes Performance & Optimization.

**Operational rule:** Prefer targeted strategies—pagination, prefetch, cache, media resizing, batching—over generic “optimize everything.”

---

## P13 — Modularity is a scaling tool [D1/I]

The Facebook candidate argues for feature/library modules and interface contracts to support large apps/teams. The instructor does not reject this and gives strong overall architecture feedback, but no universal threshold is directly taught in the accessible transcript.

**Operational rule:** Modularize when it improves ownership, dependency control, build isolation, reuse, or parallel development. Keep boundaries coarse enough to remain comprehensible.

---

## P14 — Senior architecture answers include alternatives [D1/C]

Instructor feedback explicitly praises mentioning alternatives and explaining tradeoffs; the current course emphasizes explaining not just tools but why and tradeoffs.

**Operational rule:** Every significant recommendation includes at least one alternative and a switch condition.
