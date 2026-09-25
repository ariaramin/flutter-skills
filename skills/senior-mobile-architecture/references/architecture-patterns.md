# Architecture Pattern Catalog

This catalog separates **channel-supported presence** from supplemental implementation advice.

## Layered Presentation / Domain / Data [D1/C]

**Channel support:** Explicitly praised in Facebook mock feedback; course includes App Architecture Fundamentals.

**Use when:**
- business rules need independent testing/reuse;
- multiple data sources require policy/coordination;
- UI framework should not dictate data/business behavior;
- team ownership benefits from clear contracts.

**Costs:** mapping/boilerplate, more indirection, risk of empty pass-through layers.

**Avoid dogma:** domain layer may be optional in simple features [S].

---

## Repository Pattern [D1]

**Observed role:** mediate between client feature logic and local/remote data sources; coordinate cache/DB/remote path.

**Good repository:** cohesive around a domain/data capability.

**Bad repository:** “everything service” with unrelated APIs, UI state, navigation, and business workflows.

---

## Dependency Injection [D1/D2/C]

**Observed role:** architecture/testing seam and dependency control.

**Prefer DI for:** network/storage clients, clocks/IDs, analytics, remote config, services, repositories, platform boundaries.

**Avoid:** container/service-locator calls scattered through domain logic [S].

---

## MVC / MVP / MVVM / MVI [D2/C]

Channel/course explicitly compares these families, but detailed transcript-level preference was not accessible.

**Agent rule:** Never claim the creator universally prefers one. Compare them using:
- state ownership;
- directionality of events/data;
- testability;
- UI-framework fit;
- complexity/boilerplate;
- team familiarity.

---

## Clean Architecture [D2]

Mentioned in the SwiftUI-era architecture video description.

**Agent rule:** Treat Clean Architecture as a dependency-boundary idea, not a mandated folder tree. Introduce only boundaries that protect real policy from volatile mechanisms [S].

---

## Unidirectional Data Flow [I/S]

Strongly compatible with state ownership and modern declarative UI, but no direct transcript statement was captured in this pass.

**Use when:** predictable event → state transitions and replayable/debuggable flows matter.

---

## Local-first / Offline-capable repository [D1]

**Observed flow:** local store/DB and remote data source coordinated through repositories; offline mutations captured locally and later synchronized.

**Variants:**
- cache-first read;
- stale-while-revalidate;
- network-first with fallback;
- local database as observable serving source [S].

Choose explicitly per feature.

---

## Optimistic Mutation Queue [D1]

**Observed:** likes/comments update UI immediately, persist pending interaction metadata, synchronize later, surface failure.

**Essential fields [D1/S synthesis]:**
- mutation/request ID;
- entity ID;
- operation type;
- payload;
- status;
- timestamp/order;
- retry metadata.

---

## Router / Navigation Boundary [D1]

Facebook mock uses a router/backstack concept and passes a post ID into navigation.

**Operational interpretation:** navigation should carry stable minimal arguments and allow destination state to be resolved by its owner.

---

## Feature/Capability Modules [D1/I]

Candidate proposes feature modules plus reusable/library/data/domain/API components for scale/team parallelism.

**Use when:** module ownership and dependency contracts produce real organizational/build value.

**Avoid:** one module per class/use-case/repository without independent ownership or build boundary [S].

---

## SDK / Library Facade [D2/C]

File Downloader content explicitly includes library design, resumability, background downloads.

**Recommended shape [S informed by D2 topic]:**
- small stable facade;
- task handle/ID;
- progress stream/callback;
- cancellation/resume;
- persisted task state if promised;
- pluggable storage/network policy where appropriate.
