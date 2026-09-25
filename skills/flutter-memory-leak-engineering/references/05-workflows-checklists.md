# Implementation, Review, Refactoring, and Production Checklists

> Preserved from the supplied research/engineering guide. Use this reference only when the active task needs these details.

## Contents

- New Resource Implementation Workflow
  - 1. Identify the resource
  - 2. Determine cleanup contract
  - 3. Identify owner
  - 4. Decide intended lifetime
  - 5. Determine ownership transfer
  - 6. Implement cleanup
  - 7. Handle replacement
  - 8. Handle failure paths
  - 9. Review callbacks
  - 10. Instrument if custom lifecycle should be leak-tested
  - 11. Write lifecycle test
  - 12. Add leak tracking
  - 13. Investigate retention only if needed
  - 14. Never add ignore before owner analysis
- Existing-Code Leak Review Workflow
  - Controllers
  - Focus/ticker
  - Streams
  - Timers
  - Listeners
  - Static/global state
  - DI
  - State management
  - Routes
  - Caches
  - Async work
  - Overlays/navigation observers
- Leak-Fix Workflow
- Refactoring Rules
- Code Review Checklist
  - Ownership
  - Cleanup
  - References
  - Async
  - DI
  - Testing
- Widget Lifecycle Checklist
- DI Scope Checklist
- Async Resource Checklist
- Leak Test Checklist
- CI Checklist
- Production Readiness Checklist
  - Ownership
  - Widgets/routes
  - Session
  - Listeners/async
  - Globals
  - Testing
  - Profiling
- Quick Reference

---

# New Resource Implementation Workflow

Before adding a lifecycle-sensitive resource:

## 1. Identify the resource

Examples:

```text
controller
subscription
timer
notifier
socket
watcher
overlay
callback
```

## 2. Determine cleanup contract

Does it require:

```text
dispose
close
cancel
remove
unsubscribe
```

## 3. Identify owner

Choose:

- app;
- session;
- feature;
- route;
- widget;
- request;
- test.

## 4. Decide intended lifetime

Write the boundary explicitly.

## 5. Determine ownership transfer

If passed into another component, does the receiver own cleanup?

Do not leave this implicit.

## 6. Implement cleanup

At the real owner boundary.

## 7. Handle replacement

For dependencies that can change:

```text
remove old listener
dispose/cancel old owned resource
attach new
```

## 8. Handle failure paths

If initialization partially succeeds and then fails, release what was acquired.

## 9. Review callbacks

Check whether resource callbacks retain:

- context;
- State;
- route models;
- large data.

## 10. Instrument if custom lifecycle should be leak-tested

Use current allocation instrumentation.

## 11. Write lifecycle test

Mount/create → exercise → release.

## 12. Add leak tracking

Prefer standard not-disposed tracking first.

## 13. Investigate retention only if needed

Enable not-GCed diagnostics selectively.

## 14. Never add ignore before owner analysis

---

# Existing-Code Leak Review Workflow

Before refactoring lifecycle code, inventory:

## Controllers

Search:

```text
TextEditingController
ScrollController
AnimationController
PageController
TabController
```

## Focus/ticker

Search:

```text
FocusNode
Ticker
```

## Streams

Search:

```text
.listen(
StreamSubscription
```

## Timers

Search:

```text
Timer(
Timer.periodic
```

## Listeners

Search:

```text
addListener
addObserver
subscribe
```

and find matching removal.

## Static/global state

Search:

```text
static final
static var
global
singleton
```

## DI

Inspect:

- singleton registrations;
- lazy singletons;
- session scopes;
- route factories;
- disposers.

## State management

Determine who creates and closes each Bloc/Cubit/notifier.

## Routes

Inspect controllers created by page/state and whether pop ends them.

## Caches

Check bounds/eviction.

## Async work

Find callbacks that can outlive owners.

## Overlays/navigation observers

Check explicit remove/unsubscribe.

Do not add cleanup until ownership is understood.

---

# Leak-Fix Workflow

Use this sequence:

1. Reproduce the leak.
2. Add a focused lifecycle/leak test where practical.
3. Identify leak category.
4. Find object creation site.
5. Identify intended owner.
6. Verify explicit cleanup contract.
7. Verify cleanup actually executes.
8. Inspect long-lived references.
9. Fix ownership/reference direction or cleanup.
10. Re-run focused test.
11. Enable retaining-path diagnostics only if necessary.
12. Escalate to DevTools if heap retention remains unclear.
13. Run broader tests.
14. Keep regression coverage.

Do not stop after adding `dispose()` if the object remains strongly referenced.

---

# Refactoring Rules

1. Refactor ownership before cleanup calls.
2. Do not double-dispose externally owned resources.
3. Keep owner and resource lifetime aligned.
4. When moving a resource between scopes, move cleanup responsibility too.
5. Dispose old resources before replacing them when appropriate.
6. Keep cleanup safe under partial initialization.
7. Make idempotent cleanup when lifecycle can legitimately call it more than once.
8. Do not hide short-lived objects in global service locators.
9. Do not use weak references to avoid fixing an incorrect ownership graph unless weak ownership is semantically correct.
10. Preserve regression tests while changing architecture.
11. Profile after lifecycle refactors that alter caching or resource reuse.

---

# Code Review Checklist

## Ownership

- [ ] Creator identified.
- [ ] Owner identified.
- [ ] Ownership transfer explicit.
- [ ] Lifetime scope matches usage.

## Cleanup

- [ ] `dispose`/`close`/`cancel`/remove exists.
- [ ] Cleanup runs on normal exit.
- [ ] Cleanup runs on error/early exit.
- [ ] Replaced resource cleaned up.
- [ ] No double disposal of externally owned resource.

## References

- [ ] No singleton → route/widget reference.
- [ ] No long-lived `BuildContext`.
- [ ] No global callback retaining State.
- [ ] Listener registrations matched with removal.
- [ ] Static collections bounded/cleared.

## Async

- [ ] Timers canceled.
- [ ] Subscriptions canceled.
- [ ] Cancellable work canceled when owner ends.
- [ ] Mounted check not mistaken for cleanup.

## DI

- [ ] Route objects are not app singletons accidentally.
- [ ] Session scope tears down on logout.
- [ ] DI disposers configured where needed.

## Testing

- [ ] Non-trivial lifecycle has test.
- [ ] Owner truly released in test.
- [ ] Ignores justified.
- [ ] Diagnostics scoped.

---

# Widget Lifecycle Checklist

- [ ] Controllers created in `State` are disposed by that `State`.
- [ ] Externally provided controllers are not double-disposed.
- [ ] Focus nodes disposed.
- [ ] Animation/ticker objects disposed.
- [ ] Scroll/page/tab controllers disposed when owned.
- [ ] Listeners removed.
- [ ] `didUpdateWidget` detaches old listenable before attaching new.
- [ ] Timers canceled.
- [ ] Stream subscriptions canceled.
- [ ] Overlay entries removed/disposed.
- [ ] Async completion handles unmounted state.
- [ ] Context not stored outside widget lifetime.
- [ ] Route removal actually tears down the owner.

---

# DI Scope Checklist

- [ ] Application singleton contains only app-lifetime state.
- [ ] Session resources live in session scope.
- [ ] Session scope is destroyed on logout/account switch.
- [ ] Feature controllers are factories/scoped objects, not accidental singletons.
- [ ] Scoped resources have disposer callbacks.
- [ ] Long-lived services do not retain short-lived controller/context.
- [ ] Test DI state reset between tests.
- [ ] Overridden registrations restored/removed.
- [ ] Closing a scope releases listeners/sockets/subscriptions.

---

# Async Resource Checklist

- [ ] Stream subscription stored and canceled.
- [ ] Periodic timer stored and canceled.
- [ ] One-shot timer canceled when result is no longer useful.
- [ ] Animation/ticker stopped/disposed.
- [ ] Network operation cancellation used when supported.
- [ ] Callback does not capture unnecessarily large owner graph.
- [ ] Error branch cleans resources.
- [ ] Replacement operation invalidates/cancels previous work.
- [ ] `mounted` used only for UI-safety, not as cleanup.
- [ ] Test waits for/cancels expected async teardown.

---

# Leak Test Checklist

- [ ] Relevant object is instrumented/trackable.
- [ ] Leak category being tested is enabled.
- [ ] Owner lifecycle actually ended.
- [ ] Route transition finished.
- [ ] Gesture finished.
- [ ] Timer/subscription canceled.
- [ ] Test-created objects have teardown.
- [ ] Framework caches accounted for.
- [ ] Exact GC timing not assumed.
- [ ] Experimental not-GCed tracking used deliberately.
- [ ] Diagnostics enabled only for focused failure.
- [ ] Ignore is narrow and documented.
- [ ] Test passes alone and in suite.
- [ ] Regression failure is deterministic.

---

# CI Checklist

- [ ] Flutter SDK version controlled.
- [ ] leak-tracker integration compatible with SDK.
- [ ] Global test configuration intentional.
- [ ] No broad ignores.
- [ ] Known framework ignores documented.
- [ ] Ordinary suite uses lightweight diagnostics.
- [ ] Focused retention tests separated where practical.
- [ ] Low flake rate.
- [ ] No retry-until-green policy.
- [ ] Failure output points to actionable class/test.
- [ ] Leak suite runs on supported platform.
- [ ] Test/global state reset.
- [ ] New lifecycle regressions fail CI.

---

# Production Readiness Checklist

## Ownership

- [ ] Every disposable has an owner.
- [ ] Ownership transfer documented.
- [ ] Lifetime scopes are coherent.

## Widgets/routes

- [ ] Widget controllers disposed.
- [ ] Route resources released on navigation.
- [ ] No stale route state retained globally.

## Session

- [ ] Session resources close on logout.
- [ ] Account switch releases previous-user resources.

## Listeners/async

- [ ] Listeners removed.
- [ ] Subscriptions canceled.
- [ ] Timers canceled.
- [ ] Async callbacks do not retain obsolete UI unnecessarily.

## Globals

- [ ] No singleton retains `BuildContext`.
- [ ] No singleton retains page `State`.
- [ ] Static collections bounded.
- [ ] Caches have eviction/lifecycle policies.

## Testing

- [ ] Complex lifetimes have leak regression tests.
- [ ] CI leak suite stable.
- [ ] Ignores justified.
- [ ] Experimental retention checks focused.

## Profiling

- [ ] Unexplained memory growth investigated with DevTools.
- [ ] Native/cache growth not mistaken for tracked object leak.
- [ ] Fixed memory regression re-profiled.

---

# Quick Reference

| Situation | Preferred approach |
|---|---|
| `TextEditingController` created by `State` | Dispose in `State.dispose()` |
| `FocusNode` created by `State` | Dispose in `State.dispose()` |
| `AnimationController` | Owner with `TickerProvider` disposes it |
| `ScrollController` created locally | Creator disposes it |
| Manual stream subscription | Cancel at owner teardown |
| Periodic timer | Cancel at owner teardown |
| Manually created Bloc/Cubit | Creator closes it |
| Provider-created Bloc/Cubit | Follow provider ownership contract |
| OverlayEntry | Remove, then dispose |
| Listener added manually | Remove matching listener |
| Long-lived service holds `BuildContext` | Refactor to data/action abstraction |
| Singleton holds route controller | Fix scope/lifetime |
| Session resource survives logout | Destroy session scope / dispose resource |
| Leak says `notDisposed` | Find owner and missing cleanup |
| Leak says `notGCed` | Inspect remaining strong references |
| Leak says `gcedLate` | Investigate temporary retention/GC timing |
| Object disposed but still reported retained | Enable disposal stack + retaining path |
| Test-created disposable | Register `addTearDown` immediately |
| Leak test fails before widget removed | Fix test lifecycle first |
| Route leak | Open → pop → settle → verify |
| Repeated route memory growth | Repeat flow + heap diff |
| Known test-helper object | Targeted ignore with rationale |
| Broad ignore needed to make suite pass | Investigate instead |
| Need creation site | `withCreationStackTrace()` |
| Need disposal site | `withDisposalStackTrace()` |
| Need retaining reference chain | `withRetainingPath()` / DevTools |
| Need experimental disposed-but-retained checking | Targeted `experimentalNotGCed` |
| Global leak test setup | `flutter_test_config.dart` |
| Test-specific settings | `experimentalLeakTesting` |
| Need all leak tracking disabled for one justified test | `withIgnoredAll()` + rationale |
| Cache grows without bound | Add bounds/eviction; use heap profiling |
| Memory grows but leak tests pass | Inspect heap, caches, native memory |
| RSS rises after workflow | Do not call it a Dart leak without heap evidence |
| Passing leak suite | Means configured tracked lifecycle checks passed, not zero memory bugs |
| Need allocation source | DevTools Trace Instances / allocation profiling |
| Need heap change across workflow | DevTools diff snapshots |
| Need retained-object references | Retaining-path/reference inspection |
| Production release monitoring | Use production memory telemetry/profiling, not leak_tracker as release runtime |
| Fixed lifecycle bug | Keep focused regression leak test |

Before approving lifecycle-sensitive code, verify:

```text
Resource created
      ↓
Owner explicitly identified
      ↓
Lifetime selected
      ↓
Cleanup contract identified
      ↓
Replacement/error paths covered
      ↓
Long-lived references reviewed
      ↓
Owner teardown exercised
      ↓
Leak test added when lifecycle is non-trivial
      ↓
Retention diagnostics used only if necessary
      ↓
DevTools used when heap behavior remains unexplained
```

If the owner is unclear, the lifecycle implementation is not finished.
