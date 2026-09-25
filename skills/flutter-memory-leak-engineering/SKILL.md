---
name: flutter-memory-leak-engineering
description: Diagnose, prevent, test, and regress-test Flutter/Dart memory lifecycle defects using leak_tracker, leak_tracker_flutter_testing, FlutterMemoryAllocations, and DevTools Memory. Use this skill whenever Flutter work involves controllers, FocusNode, AnimationController, ScrollController, ChangeNotifier, subscriptions, timers, listeners, Bloc/Cubit disposal, GetIt/session scopes, route or widget retention, unexplained memory growth, leak_tracker failures, leak-test false positives, disposal/GC confusion, caches, BuildContext retention, or memory-leak CI—even if the user only says “memory keeps growing” or “find the leak.”
compatibility: Targets the supplied leak_tracker 11.0.2-era guidance and current Flutter leak-test integration described in the bundled source. Verify version-sensitive leak_tracker, leak_tracker_flutter_testing, FlutterMemoryAllocations, and experimentalLeakTesting APIs against the repository's actual Flutter/Dart/package versions before editing code.
---
# Flutter Memory Leak Engineering
## Operating rules
- Diagnose ownership before adding cleanup calls.
- Treat `leak_tracker` as lifecycle verification, not as a universal heap leak detector.
- Distinguish `notDisposed`, `notGCed`, and `gcedLate`; they describe different failures and require different fixes.
- Separate disposal from garbage collection: disposed objects can remain retained, and collected objects can still have violated a cleanup contract.
- Prefer one clear owner for every disposable/cancelable/removable resource.
- Keep longer-lived objects from retaining shorter-lived widgets, routes, sessions, controllers, or `BuildContext` unless the lifetime is intentional.
- Use standard not-disposed checking as the high-signal default; enable expensive/experimental retention diagnostics only for focused investigations.
- Do not silence failures before finding the creation site, owner, teardown path, and retaining reference.
- Do not treat increasing RSS as proof of a tracked Dart lifecycle leak.
- Escalate unresolved growth or retaining chains to Flutter DevTools Memory.
- Keep fixed lifecycle bugs as deterministic regression tests.
- Preserve repository architecture unless ownership/lifetime is actually wrong.
## Research baseline and freshness
The supplied guide targets `leak_tracker` 11.0.2 and the current split between:
- `leak_tracker` for core tracking/classification;
- `leak_tracker_testing` for test helpers;
- `leak_tracker_flutter_testing` for Flutter widget-test integration;
- Flutter `FlutterMemoryAllocations` for framework lifecycle instrumentation;
- Flutter DevTools Memory for heap, diff, allocation, and retaining-reference investigation.
The guide explicitly notes that direct leak-tracker DevTools integration from older releases was removed in 11.0.0. Do not copy old tutorials that assume that integration still exists.

Before implementation:
1. inspect `pubspec.yaml` and `pubspec.lock`;
2. identify Flutter and Dart versions;
3. identify current leak-tracker package versions;
4. verify `experimentalLeakTesting`, `LeakTesting.settings`, and allocation instrumentation against that SDK;
5. treat running-app, Web, not-GCed, and other experimental behavior as version-sensitive.
## Reference routing
Load only the references needed for the task:
| Task | Read |
|---|---|
| Need exact leak categories, package roles, setup, instrumentation, GC semantics, settings, or ignore APIs | `references/01-tracker-foundations.md` |
| Need ownership analysis, Flutter controller/listener lifetimes, `BuildContext`, closures, caches, Bloc/Cubit, DI scopes, or async lifetime guidance | `references/02-ownership-lifetimes.md` |
| Need widget/route tests, false-positive analysis, report interpretation, DevTools escalation, CI, regression testing, or performance overhead | `references/03-testing-diagnostics-ci.md` |
| Reviewing/fixing common lifecycle mistakes | `references/04-antipatterns.md` |
| Implementing a new resource, auditing an existing repository, refactoring, or running production-readiness checklists | `references/05-workflows-checklists.md` |
Do not load every reference by default.
## Core mental model
For every lifecycle-sensitive object, reason through:
```text
create
→ instrumentation observes creation where supported
→ owner retains/uses object
→ owner's lifetime ends or object is replaced
→ required cleanup executes
→ unnecessary strong references are released
→ object becomes unreachable
→ GC eventually reclaims it
```
Classify the failure at the first broken transition.
### `notDisposed`
Interpret as a cleanup-contract failure first.

Investigate:
1. who created the object;
2. who owns it;
3. whether ownership was transferred;
4. what event ends ownership;
5. which cleanup API is required (`dispose`, `close`, `cancel`, `remove`, `removeListener`, etc.);
6. whether normal, error, replacement, and early-return paths invoke it.
Do not fix a `notDisposed` report by adding cleanup to an arbitrary consumer.
### `notGCed`
Interpret as disposed-but-retained.

Investigate strong references from:
- static/global collections;
- app singletons;
- session objects after logout;
- listener registries/event buses;
- closures;
- caches;
- DI scopes;
- test/framework state.
Use focused retaining-path diagnostics and DevTools when the chain is unclear.
### `gcedLate`
Interpret as delayed retention, not automatic permanent leakage.

Check:
- active animations/transitions;
- queued callbacks/microtasks;
- pending async work;
- test teardown timing;
- temporary framework ownership;
- repeated workflows that accumulate retained objects.
## Ownership decision procedure
Before changing code, answer:
1. **Resource:** What exactly requires lifecycle management?
2. **Creator:** Which object/function creates it?
3. **Owner:** Which scope is responsible for its lifetime?
4. **Lifetime:** App, session, feature, route, widget, request, or test?
5. **Cleanup:** Which explicit operation ends it?
6. **Transfer:** Is another component intentionally taking ownership?
7. **Replacement:** Can the resource be swapped before owner teardown?
8. **References:** Can any longer-lived object retain it after cleanup?
9. **Verification:** Can the lifecycle be reproduced in a focused test?
The creator is normally the owner unless ownership transfer is explicit.
## Typical Flutter ownership
Use the bundled lifecycle table for details. High-frequency cases:
- `TextEditingController`, `FocusNode`, `ScrollController`, `AnimationController`, `ValueNotifier`, locally created `ChangeNotifier` → creator disposes.
- `StreamSubscription` → caller of `listen()` cancels.
- `Timer` → starter cancels.
- manually created Bloc/Cubit → creator closes unless ownership is transferred to an owning provider.
- provider-created Bloc/Cubit → follow provider ownership contract; do not double-close.
- manually created `OverlayEntry` → remove, then dispose.
- app/session socket → app/session owner closes.
- manually registered listener/observer → registrant removes/unsubscribes.
Externally provided controllers/resources are not automatically owned by the receiver.
## Lifetime-direction rule
Prefer:
```text
short-lived object
→ depends on
long-lived service
```
Treat this as suspicious:
```text
long-lived singleton/service
→ strong reference to
route/widget/session object
```
Especially inspect:
- singleton → `BuildContext`;
- singleton → `State`;
- singleton → route controller;
- global callback/listener → page object;
- app scope → current-user resource that should end on logout.
## Repository inspection workflow
Before modifying lifecycle code:
1. Search controllers: `TextEditingController`, `ScrollController`, `PageController`, `TabController`, `AnimationController`.
2. Search focus/ticker objects: `FocusNode`, `Ticker`.
3. Search subscriptions: `.listen(`, `StreamSubscription`.
4. Search timers: `Timer(`, `Timer.periodic`.
5. Search listener APIs: `addListener`, `addObserver`, `subscribe`; find matching removal.
6. Search global/static retention: `static final`, `static var`, singleton registries, global collections.
7. Inspect DI registrations, scopes, and disposal callbacks.
8. Inspect manually created state-management objects and provider ownership.
9. Inspect route-owned controllers and whether route pop actually destroys the owner.
10. Inspect caches for bounds/eviction/lifecycle reset.
11. Inspect async callbacks that may outlive owners.
12. Inspect overlays, navigation observers, sockets, database watchers, and custom registries.
Do not add cleanup until ownership is understood.
## Implementation workflow for a new resource
1. Identify its cleanup contract.
2. Choose its owner/lifetime explicitly.
3. Keep dependency direction from shorter-lived toward longer-lived services.
4. Make ownership transfer explicit in API design.
5. Store handles required for teardown: subscription, timer, listener callback, overlay entry, etc.
6. Implement cleanup at the owner boundary.
7. Clean the old resource before replacement when appropriate.
8. Clean partial initialization on error/early exit.
9. Minimize callback captures; avoid retaining `BuildContext` or whole state graphs unnecessarily.
10. Instrument custom objects when leak regression tests need lifecycle visibility.
11. Add a focused create/exercise/release test for non-trivial lifetimes.
12. Start with ordinary not-disposed tracking; investigate retention only when needed.
## Flutter widget and route test pattern
Design leak tests as:
```text
mount/create
→ exercise
→ unmount/pop
→ settle/cancel expected async work
→ leak evaluation
```
A test that leaves the owner intentionally mounted is not a valid proof that its owned controller leaked.

For route tests:
```text
open route
→ exercise
→ pop
→ finish transition
→ verify route absent
→ leak evaluation
```
Use repeated open/close cycles when the suspected defect accumulates over navigation.
## Global test setup
For Flutter widget suites, the supplied guide uses `test/flutter_test_config.dart` with:
- `LeakTesting.enable()`;
- global `LeakTesting.settings`;
- `createdByTestHelpers: true` when helper-created objects should be filtered.
Keep global diagnostics lightweight. Per-test differences belong in `experimentalLeakTesting`.

Do not mutate global leak settings casually inside ordinary `setUp` blocks.
## Focused diagnostic escalation
Escalate in this order:
1. default leak test;
2. identify class/category;
3. `withCreationStackTrace()` to locate creation;
4. verify owner cleanup;
5. if disposed but retained, `withDisposalStackTrace()`;
6. enable targeted experimental not-GCed tracking if relevant;
7. `withRetainingPath()` for the focused reproduction;
8. use DevTools Memory for heap snapshots, diffs, allocation tracing, and retaining references when needed.
Do not enable creation/disposal stacks plus retaining paths for every CI test; the guide notes meaningful CPU/memory/test-time overhead.
## Test false-positive triage
Before adding an ignore, verify:
- owner actually unmounted/popped;
- route transition finished;
- test gesture ended;
- manually created `OverlayEntry` was removed before disposal;
- async work/timers/subscriptions completed or were canceled;
- test-created disposables use `addTearDown`;
- Flutter image-cache retention is relevant to the test;
- helper/framework-created objects are correctly classified;
- exact GC timing is not being assumed.
Only after that, add the narrowest ignore with a documented reason/upstream issue where applicable.

Do not normalize application-owned leaks with count-based budgets.
## Test false-negative triage
A passing leak suite only means configured tracked lifecycle violations were not observed.

Escalate beyond leak_tracker when the suspected issue may be:
- uninstrumented custom objects;
- an intentionally reachable but unbounded collection;
- image/data cache bloat;
- native/plugin memory;
- GPU/platform-view resources;
- large allocation churn;
- release-only behavior;
- Web/version-specific behavior not reproduced by widget tests.
## Caches
Differentiate intentional retention from leakage.

A healthy cache should have an explicit policy such as:
- maximum size/count;
- TTL;
- LRU/eviction;
- lifecycle reset;
- memory-pressure response.
An app-global unbounded map retaining every value can be a serious memory defect even if leak_tracker never reports it.

Use heap profiling and cache metrics for that class of problem.
## BuildContext and closure retention
Do not store `BuildContext` in long-lived services.

A closure is risky when its lifetime exceeds the lifetime of the widget/state/data it captures. When a global registry, event bus, singleton, timer, or subscription stores that callback, remove it at teardown or redesign the interaction.

A `mounted` check protects UI mutation after disposal; it does not cancel the resource and is not a lifecycle cleanup strategy.

For non-cancelable Futures, use stale-result/generation guards where needed, but recognize that they do not release the Future early.
## DI and session scopes
Use DI lifetime analysis when route/session resources survive too long.

Preferred shape:
```text
App scope
→ long-lived repositories/infrastructure

Session scope
→ user-specific sockets/caches/repositories

Route/feature scope
→ controller / Bloc / Cubit / subscriptions
```
On logout/account switch:
1. close/dispose session resources;
2. pop/reset the session scope;
3. clear/revoke credentials/data according to security/domain requirements;
4. verify no app singleton retains session objects.
Popping DI scope does not automatically erase secure storage, database data, or server tokens.
## State-management rules
- If code manually creates a Bloc/Cubit, its creator normally owns `close()`.
- If an owning provider creates it, let the provider close it according to its contract.
- Do not register route-specific mutable Bloc/Cubit/controller state as an app singleton for convenience.
- Apply the same ownership reasoning to Provider, Riverpod, ChangeNotifier, and custom state systems.
## Replacement and update lifecycle
Leaks often occur before final `dispose()` because resources are replaced.

When an input/dependency changes:
```text
remove listener/cancel/dispose old owned resource
→ assign/create new resource
→ attach new listener
```
For widget lifecycle code, inspect `didUpdateWidget` and similar update hooks for duplicate listener registration or missing detachment.
## Error-path cleanup
Handle partial initialization:
```text
acquire A
→ acquire B
→ C fails
→ release B if created
→ release A
→ rethrow/return failure
```
Do not write cleanup only for the happy path.
## Leak-fix workflow
1. Reproduce the issue narrowly.
2. Add a focused lifecycle/leak test where practical.
3. Identify the leak category.
4. Find the creation site.
5. Identify intended owner and lifetime.
6. Verify the explicit cleanup contract.
7. Verify cleanup executes.
8. Inspect long-lived references.
9. Fix the closest actual owner/retainer.
10. Re-run the focused test.
11. Add retaining-path diagnostics only if needed.
12. Escalate to DevTools if heap behavior remains unexplained.
13. Run the broader suite.
14. Keep regression coverage.
Do not stop at “added `dispose()`” if a strong reference still retains the object.
## DevTools escalation
Use DevTools Memory when:
- memory grows while leak tests pass;
- not-GCed persists and retaining cause is unclear;
- a cache/global collection is suspected;
- native/external memory dominates;
- repeated navigation increases retained counts;
- allocation origin needs investigation.
Workflow:
1. define a repeatable scenario;
2. capture baseline memory/heap snapshot;
3. repeat lifecycle;
4. capture diff snapshot;
5. identify growing classes/instances;
6. inspect inbound/retaining references;
7. trace allocations if creation sites are unclear;
8. fix ownership/retention;
9. repeat the same profile.
Do not “fix” unexplained growth by indiscriminately clearing memory.
## CI strategy
Keep the main leak suite high-signal:
```text
widget/integration lifecycle tests
→ LeakTesting globally enabled
→ not-disposed checks
→ helper filtering where justified
→ targeted retention tests separately
```
CI rules:
- control Flutter/package versions;
- use a supported stable test platform;
- keep expensive diagnostics off by default;
- avoid broad ignores;
- document known framework ignores;
- fail application-owned disposal regressions;
- do not retry-until-green;
- track flakiness;
- isolate/reset global test state;
- preserve fixed leak tests.
## Performance policy
Leak tracking has overhead, and focused stack/retaining-path diagnostics are materially more expensive.

Optimize the diagnostic configuration before optimizing tracker internals:
- ordinary suite: lightweight lifecycle checks;
- focused local test: creation/disposal stacks as needed;
- focused retention case: experimental not-GCed + retaining path;
- heap/global growth: DevTools Memory.
Do not ship heavy leak diagnostics into production by default. The supplied guide treats widget tests as the primary mature use case and release tracking as disabled/not the intended production strategy.
## Anti-pattern gates
Reject these fixes/assumptions:
- adding `dispose()` without knowing ownership;
- disposing an externally owned controller;
- using `mounted` instead of canceling a timer/subscription;
- assuming `dispose()` means unreachable;
- assuming GC means cleanup was correct;
- storing `BuildContext` in a singleton;
- leaving manually registered callbacks/listeners in global registries;
- making route controllers app singletons;
- leaving user/session resources alive after logout;
- keeping unbounded static caches;
- using broad ignore rules to make CI pass;
- expecting exact GC timing;
- enabling maximum leak diagnostics across the full suite;
- treating RSS growth as proof of a particular Dart leak;
- treating a passing leak suite as proof of no memory problem;
- disposing `OverlayEntry` without removing it first;
- relying on garbage collection for resources requiring deterministic cleanup.
Read `references/04-antipatterns.md` for concrete examples and corrections.
## Review report format
When reviewing or fixing memory lifecycle code, report:
### Symptom
What grows, remains retained, fails leak testing, or survives a lifecycle boundary.
### Evidence
Leak category/report, reproduction, heap trend, retaining path, or lifecycle code evidence.
### Ownership
Creator, owner, intended lifetime, and cleanup contract.
### Root cause
Choose the actual class of failure:
- missing disposal/cancel/remove;
- disposed but retained;
- delayed expected retention;
- lifetime inversion;
- unbounded cache/global state;
- test lifecycle/false positive;
- uninstrumented/native memory requiring DevTools.
### Change
Smallest ownership/lifecycle correction.
### Verification
Focused test plus broader suite/profile where applicable.
### Residual risk
Experimental/version-sensitive behavior, uninstrumented objects, native memory, or untested platform flow.
## Production definition of done
Memory lifecycle work is complete when:
1. every affected disposable/cancelable resource has a clear owner;
2. ownership transfer is explicit;
3. cleanup runs on normal, replacement, error, and teardown paths as applicable;
4. externally owned objects are not double-disposed;
5. no app/session singleton unintentionally retains route/widget objects;
6. `BuildContext`/`State` is not stored beyond its intended lifetime;
7. listeners/subscriptions/timers/sockets are removed or canceled at the correct boundary;
8. route/session DI lifetimes match actual ownership;
9. caches/global collections have intentional bounds or lifecycle policy;
10. leak tests release the owner before asserting cleanup;
11. application-owned leak reports are fixed rather than broadly ignored;
12. expensive diagnostics are focused, not permanently enabled suite-wide;
13. fixed lifecycle defects have regression coverage;
14. unexplained memory growth has been escalated to heap/native profiling where leak_tracker cannot prove the cause;
15. no claim of “memory leak fixed” is made without reproducing and verifying the relevant lifecycle or heap behavior.
