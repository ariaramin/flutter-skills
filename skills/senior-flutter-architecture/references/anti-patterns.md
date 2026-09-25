# Flutter Anti-Pattern Library

## 1. Network Call in `build()`

**Symptoms:** request is created during rendering or indirectly recreated by rebuild.

**Why it happens:** convenient access to context/state.

**Risk:** duplicate calls, race conditions, render side effects.

**Fix:** presentation owner/repository owns request lifecycle; view renders state.

## 2. Giant Stateful Screen

**Symptoms:** controllers, API calls, validation, navigation, persistence, business rules, and hundreds of widget lines in one `State`.

**Risk:** untestable coupling and rebuild/lifecycle bugs.

**Fix:** separate view-local lifecycle from feature presentation/data responsibilities.

## 3. `BuildContext` as Dependency Injection Everywhere

**Symptoms:** data/domain objects accept context or call provider/router/theme.

**Risk:** Flutter-tree coupling, difficult tests, hidden dependencies.

**Fix:** resolve typed dependencies at composition/UI boundary.

## 4. Provider/BLoC/Riverpod as Architecture

**Symptoms:** architecture discussion consists only of package names.

**Risk:** state propagation mechanism does not solve data ownership, offline sync, repositories, or native boundaries.

**Fix:** design ownership/data flow first.

## 5. Boolean Soup State

`isLoading`, `hasError`, `isEmpty`, `isRefreshing`, `isSuccess` can form contradictory states.

**Fix:** explicit state model/state machine where complexity warrants it.

## 6. Duplicate Source of Truth

Widget field, provider state, repository cache, and DB all mutate independently.

**Fix:** designate authority and make other copies derived/cached with reconciliation rules.

## 7. Repository God Object

One repository contains auth, analytics, navigation, formatting, network, DB, and unrelated feature logic.

**Fix:** split by cohesive model/capability; use-case orchestrates cross-repository logic if needed.

## 8. Use-Case Per Method

Every repository method has a one-line use-case.

**Risk:** boilerplate and cognitive load.

**Fix:** create domain/use-case boundary only for complexity/reuse/policy.

## 9. Service Locator Everywhere

Business objects call global locator internally.

**Risk:** hidden graph, global state, fragile tests.

**Fix:** constructor injection; locator/container at composition boundaries.

## 10. Async Result After Owner Is Gone

Screen starts operation; later callback mutates disposed state or navigation.

**Fix:** correct ownership, cancellation/stale-result handling, lifecycle checks for truly local work.

## 11. Stale Search Race

Older request overwrites latest query.

**Fix:** cancellation/latest-wins/request generation identity.

## 12. Stream Leak

Subscription/controller lives beyond owner or is recreated without closing.

**Fix:** explicit lifetime/disposal.

## 13. Full Data Load for Infinite List

UI downloads entire dataset and relies on lazy widget rendering only.

**Fix:** API/client pagination + presentation page state.

## 14. Named Routes by Habit

Complex deep-link app uses named routes despite routing-state limitations.

**Fix:** evaluate Router/routing package under current Flutter guidance.

## 15. DTO Everywhere

Raw server model flows into UI and local DB.

**Risk:** backend schema becomes app architecture.

**Fix:** map at boundary when semantics diverge.

## 16. Platform Channel in Feature Widget

Widget knows method names/result codes.

**Fix:** typed Dart platform adapter/plugin.

## 17. Isolate Cargo Cult

Small work moved to isolates because “performance.”

**Risk:** serialization/startup complexity with no gain.

**Fix:** profile; use isolate for meaningful CPU-bound blocking work.

## 18. RepaintBoundary Everywhere

**Risk:** layer/memory overhead and complexity.

**Fix:** apply after profiling.

## 19. Core Dumping Ground

Everything reused once moves to `core/common/utils`.

**Fix:** keep code near feature until stable shared responsibility emerges.

## 20. Package Explosion

Dozens of tiny internal packages without ownership/reuse/build reason.

**Fix:** stronger boundaries only where they buy something.

## 21. Stateful Global Singleton

Mutable session/feature state remains forever and is not reset on logout/tests.

**Fix:** explicit app/session scope and reset/dispose semantics.

## 22. Error = Snackbar

Every failure becomes a generic snackbar and state disappears.

**Fix:** model recoverable/stale/content/error state according to context.

## 23. Catch-All Exception Swallowing

`catch (_) {}` or return `false`.

**Risk:** invisible data loss and impossible diagnosis.

**Fix:** typed mapping + telemetry + user behavior.

## 24. Fire-and-Forget Mutation

Write future is not awaited and no persistent owner tracks it.

**Risk:** process death/data loss/error disappearance.

**Fix:** await or hand ownership to a durable queue/repository.

## 25. Architecture Rewrite as Feature Work

Small feature becomes migration to a new state package/folder architecture.

**Fix:** minimal coherent change; propose migration separately with measurable value.
