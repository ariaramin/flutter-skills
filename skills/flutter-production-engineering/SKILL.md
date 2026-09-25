---
name: flutter-production-engineering
description: >-
  Production-grade Flutter and Dart engineering guidance for architecture, performance, scalability, cross-platform behavior, testing, profiling, and maintainability. Use when designing, building, profiling, optimizing, refactoring, or reviewing Flutter apps across Android, iOS, web, Windows, macOS, and Linux. Trigger on Flutter performance jank, frame drops, memory leaks, rebuild optimization, slivers, state architecture, isolates, platform adaptation, or release preparation.
metadata:
  category: mobile-development
  framework: flutter
  language: dart
  version: 1.0.0
  researched_version: "Flutter 3.47 / Dart 3.13"
  researched_on: "2026-09-04"
---

# Flutter Production Engineering

## Mission

Act as a senior/principal Flutter engineer. Design, implement, review, debug, profile, optimize, and refactor Flutter applications for production across Android, iOS, web, Windows, macOS, and Linux.

Optimize for:
- Correctness and maintainability
- Predictable state ownership and testability
- Accessibility (a11y)
- Responsive and adaptive behavior
- Low UI and raster frame cost
- Controlled memory use and reasonable startup time
- Efficient I/O and data processing
- Measurable performance
- Platform-appropriate interaction and upgrade resilience

Do not turn Flutter folklore into universal rules.

---

## Evidence Levels for Performance Reasoning

When analyzing or asserting performance behavior, distinguish four explicit evidence levels:

1. **Framework behavior** — Behavior established by Flutter/Dart APIs or engine architecture.
2. **Official recommendation** — A recommendation explicitly documented by Flutter/Dart teams.
3. **Optimization hypothesis** — A change likely to help based on known behavior but not yet measured in the target application.
4. **Measured improvement** — An improvement demonstrated with profiling, benchmarks, timeline traces, or representative measurements.

> [!CRITICAL]
> **Never present an optimization hypothesis as a measured improvement.**
> Always use this loop for performance work:
> `measure → identify bottleneck → understand cause → change → measure again`

Flutter's widget layer is immutable configuration, the element tree preserves framework identity/state across rebuilds, and render objects perform layout and painting. Treat rebuild, layout, paint, compositing, and rasterization as related but distinct costs.

---

## Core Engineering Principles

- **Prefer the simplest architecture that preserves clear ownership**: Do not introduce repositories, use cases, global state containers, isolates, caches, custom render objects, or routing abstractions merely because a large application might eventually need them. Add complexity only when actual requirements justify it.
- **Keep state close to its owner**: Store ephemeral UI state near the widget that owns it. Lift state only when multiple consumers or longer-lived workflows require shared ownership. Never make state global to avoid passing dependencies.
- **Make expensive work explicit**: Never hide significant parsing, sorting, network access, database operations, image processing, or synchronous computation inside:
  - `build`
  - Getters called from `build`
  - Constructors repeatedly invoked by `build`
  - Item builders (`itemBuilder`)
  - `shouldRepaint`
  - Layout callbacks (unless the work is intrinsically layout-dependent)
- **Prefer lazy work for potentially large data**: Construct, load, decode, transform, and retain only the data needed for the current interaction when practical.
- **Optimize the bottleneck, not the code style**: A `const` widget, selector, isolate, cache, or `RepaintBoundary` is not automatically an optimization. Understand which pipeline stage is expensive before changing it.
- **Preserve platform semantics**: Share business behavior without assuming every platform must share identical navigation, input, sizing, lifecycle, or presentation behavior.
- **Treat accessibility as production correctness**: Semantics, keyboard access, focus, scalable text, usable hit targets, and accessible animation behavior are mandatory requirements.
- **Prefer measurement on representative targets**: Never judge runtime performance from debug mode. Use **profile mode** on representative hardware for performance investigation, and release-mode-like conditions for validation. Web performance should additionally be inspected with browser tooling.

---

## Mandatory Workflow

### 1. Before Writing Code
Determine:
- Target platforms and supported Flutter/Dart versions.
- Required window sizes, orientations, and display features.
- Touch, mouse, keyboard, stylus, and accessibility expectations.
- State ownership, data lifetime, and restoration requirements.
- Navigation and deep-link requirements.
- Expected collection sizes, image dimensions, and data sources.
- Offline/network expectations and whether CPU-bound work exists.
- Test boundaries.
- Inspect existing project conventions before introducing new architecture or packages. Check current Flutter APIs when an implementation is version-sensitive; do not rely on remembered deprecated APIs.

### 2. While Writing Code
- Keep `build` deterministic and side-effect free.
- Use immutable widget inputs and constrain resource ownership.
- Dispose owned resources (`AnimationController`, `ScrollController`, `FocusNode`, `StreamSubscription`, timers).
- Use lazy collection construction where collection size makes it relevant.
- Localize state observation to the subtree that depends on it.
- Use appropriate constraints rather than device-name checks.
- Preserve accessibility semantics.
- Handle loading, empty, error, retry, and cancellation/stale-result behavior deliberately.

### 3. Before Optimizing
Answer:
1. What user-visible problem exists?
2. Is the bottleneck UI isolate work, layout, paint, rasterization, I/O, memory, startup, or size?
3. On which device/platform does it occur?
4. What measurement demonstrates it?
5. What framework behavior explains it?
Do not optimize from intuition alone when measurement is practical.

### 4. Before Completing a Task
Verify:
- Correctness, null-safety, and static typing.
- Lifecycle cleanup and error paths.
- Async race behavior and stale-response prevention.
- Platform behavior and responsive layout.
- Keyboard and focus behavior where applicable.
- Semantics and accessibility.
- Tests and analyzer/lints.
- Profiling evidence for claimed performance improvements.

---

## Flutter Framework Mental Model

Application code participates in this pipeline:
```
framework receives state/input changes
  → dirty elements rebuild widgets
    → changed render configuration may trigger layout
      → changed visual output may trigger paint
        → layer/display-list information is composited
          → engine rasterizes the scene
            → platform presents the frame
```

- **Widgets**: Temporary immutable configurations.
- **Elements**: Persistent framework objects connecting widget configurations with state and render objects.
- **Render objects**: Perform layout, painting, hit testing, and related rendering work.

A parent rebuild does not mean every descendant necessarily performs expensive layout and paint. Likewise, preventing a widget rebuild does not automatically solve raster or layout jank. When reviewing performance, identify which pipeline stage is actually expensive.

### Identity and Updates
- Flutter updates an existing element when the new widget has the same `runtimeType` and `key`.
- Use keys to express identity when sibling identity would otherwise be ambiguous (e.g., reordering collections).
- Do not use keys as generic performance annotations.
- `GlobalKey` has significant lifecycle and reparenting overhead. Own them outside `build`, and use them only when their specific capabilities are required.

### Box Constraints
Reason with box layout using the fundamental rule:
> **Constraints go down → sizes go up → parents position children**

Do not infer a child's available dimensions from physical device size when parent constraints are what govern layout.

### Frame Scheduling
- Do not hard-code "16 ms" as a universal performance target.
- A 60 Hz display presents roughly every 16.7 ms; a 120 Hz display presents roughly every 8.3 ms. Treat the actual refresh interval and platform behavior as the frame budget.
- The UI isolate must finish framework/Dart work in time for frame production, and raster work must also fit the presentation schedule.
- Modern Flutter native threading topology has evolved; do not build architecture on obsolete assumptions that platform and UI work always live on permanently separate OS threads.

---

## Core Widget and Rebuild Rules

### Rule: Keep `build` Cheap and Side-Effect Free
`build` can be invoked frequently and potentially once per frame during active changes. There is no valid exception for initiating uncontrolled side effects from `build`.

**Anti-Pattern:**
```dart
@override
Widget build(BuildContext context) {
  repository.fetchUser(); // Side effect! Duplicates network I/O on every rebuild
  final parsed = parseLargeDocument(rawData); // Synchronous CPU block
  return UserView(parsed);
}
```

**Preferred Pattern:**
Initiate lifecycle-driven work in the owning state/controller/view model, cache resulting state, and let `build` describe that state.
```dart
class UserScreen extends StatefulWidget {
  const UserScreen({super.key});

  @override
  State<UserScreen> createState() => _UserScreenState();
}

class _UserScreenState extends State<UserScreen> {
  late final Future<User> _userFuture;

  @override
  void initState() {
    super.initState();
    _userFuture = context.read<UserRepository>().fetchUser();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: _userFuture,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const ErrorView();
        }
        if (!snapshot.hasData) {
          return const LoadingView();
        }
        return UserView(user: snapshot.requireData);
      },
    );
  }
}
```

### Rule: Localize Rebuilds to the State Dependency
Prefer the narrowest state observation that remains understandable (`setState`, `ValueListenableBuilder`, `ListenableBuilder`, `AnimatedBuilder`, `InheritedWidget`, `InheritedNotifier`, or state-library selectors).
- `setState` itself is not inherently slow; the issue is how much affected work is below the state boundary.
- The callback passed to `setState` must be synchronous; perform only the state mutation inside it.
- Cancel the source of post-disposal callbacks instead of merely checking `mounted` around every callback.

### Rule: Reuse Stable Children in Builder-Based APIs
For `AnimatedBuilder`, `ValueListenableBuilder`, `TweenAnimationBuilder`, and similar APIs, pass stable subtrees through their `child` parameter when the subtree does not depend on the changing value to avoid reconstructing that subtree on each tick.

### Rule: Use `const` Deliberately, Not Ceremonially
Prefer `const` where inputs are compile-time constants and the widget is naturally immutable. This avoids repeated allocations, canonicalizes objects, and allows Flutter to short-circuit rebuilds. Do not claim `const` automatically prevents every descendant rebuild, layout, or paint.

### Rule: Prefer Reusable Widget Classes Over Large UI Helper Methods
Extract UI subtrees into small `StatelessWidget` or `StatefulWidget` classes when this improves identity, testability, readability, state localization, constant construction, and DevTools profiling visibility.

### Rule: Do Not Allocate Expensive Transient Objects Repeatedly in `build`
Optimize allocations only when they are expensive, numerous enough to appear in profiling, resource-owning, causing GC pressure, or repeatedly recreating equivalent work. Do not cache trivial objects merely to eliminate all allocation.

---

## Layout Rules

- **Direct one-pass constraints**: Use `Row`, `Column`, `Flex`, `Expanded`, `Flexible`, `Stack`, and `Positioned` according to actual constraints.
- **`Expanded` vs `Flexible`**: Use `Expanded` when the child must consume its remaining flex allocation. Use `Flexible` when the child may occupy less than the allocation. Do not use either to "fix" constraints without understanding the parent.
- **`LayoutBuilder`**: Use when a subtree must adapt to the constraints its parent gives it. Do not use `LayoutBuilder` merely to obtain device width when media queries or ordinary constraints suffice.
- **Specific `MediaQuery` aspect methods**: Use `MediaQuery.sizeOf(context)`, `paddingOf`, `viewInsetsOf`, `textScalerOf`, `disableAnimationsOf` instead of `MediaQuery.of(context)` to avoid rebuilds on unrelated environmental changes.
- **Intrinsic layout**: `IntrinsicHeight` and `IntrinsicWidth` add speculative/additional layout passes. Use them only when genuinely required and the subtree is small. Avoid in repeated lists, scrolling items, or grids.
- **Avoid accidental nested multi-pass layout**: Watch for combinations of intrinsic measurements, shrink-wrapped scrollables with expensive children, or repeated layout passes in DevTools layout traces.

---

## List, Grid, and Sliver Performance

- **Lazy construction**: Use `ListView.builder` / `GridView.builder` for large, dynamic, remotely paginated, or potentially unbounded collections. For small, bounded collections (e.g. 5 settings tiles), an eager `ListView(children: ...)` is simpler and completely appropriate.
- **Child lifecycle in lazy slivers**: Lazy slivers destroy offscreen child element/render subtrees. Keep durable domain/business state outside ephemeral row widget subtrees. Use keep-alive only for UI state that actually requires retention.
- **Prefer known extents**:
  - Same known extent: `itemExtent` or `SliverFixedExtentList` (allows layout geometry computation without child layout passes).
  - Representative widget extent: `prototypeItem` or `SliverPrototypeExtentList`.
  - Varied extents cheaply computable: `itemExtentBuilder`. Keep the callback cheap and deterministic.
- **`shrinkWrap: true`**: Use only when the scrollable genuinely must size itself to content and data is strictly constrained. Shrink wrapping forces expensive extent recomputations during scrolling. Do not use it to silence unbounded height errors; prefer `Expanded`, `Flexible`, or slivers.
- **Nested scrollables**: Avoid nesting independently scrolling `ListView`s along the same axis. For complex scrolling surfaces, use a single `CustomScrollView` composing slivers (`SliverToBoxAdapter`, `SliverList.builder`, `SliverGrid.builder`). Use `NestedScrollView` only for coordinated header/tab interactions.
- **Reordering and identity**: Provide stable keys when builder children can reorder. Do not use list index as identity when items can reorder.
- **Scroll cache extent**: Do not blindly enlarge offscreen cache extent. Recent ListView APIs use `scrollCacheExtent` instead of the deprecated `cacheExtent`.
- **Image-heavy feeds**: Lazily build rows, constrain rendered dimensions, specify `cacheWidth`/`cacheHeight`/`ResizeImage`, paginate data, bound cache growth, and avoid expensive blur/filter effects on every moving item.
- **Pagination**: Model pagination as explicit state (items, initial loading, loading next, end reached, retryable error). Prevent duplicate concurrent page requests.

---

## State, Async, and Lifecycle Essentials

- **State scoping**:
  - *Widget-local*: State only affects one widget/subtree and its lifetime matches it (hover, expansion, local text editing). Use `setState` or `ValueNotifier`.
  - *Feature state*: Multiple widgets on a screen share it, async commands mutate it, and loading/error states belong together. Use a feature controller/view model.
  - *Shared application state*: Truly shared cross-feature concerns (authenticated session, user preferences).
- **Unidirectional data flow**: `events/commands → state owner → new state → UI`. Never have UI widgets reach through layers to directly mutate persistence.
- **Dart concurrency model**: `Future` and `Stream` provide asynchronous sequencing on Dart's event loop, but synchronous CPU-heavy code still blocks the isolate.
- **Isolate decision rule**: Move work off the UI isolate with `Isolate.run` (or `compute`) only when all are true:
  1. It is CPU-bound (not waiting on I/O).
  2. Profiling proves it materially blocks UI frames or responsiveness.
  3. Inputs and results are practical to transfer.
  4. Isolation overhead does not outweigh the benefit.
  Pass minimal explicit inputs to isolate closures to avoid capturing large enclosing scopes. Note: Dart on the web does not provide native isolate parallelism; `compute` on web runs on the main event loop.
- **Memory ownership and disposal**: Always dispose owned controllers (`AnimationController`, `ScrollController`, `TextEditingController`, `FocusNode`), subscriptions, timers, and listeners in `dispose()`. Remove listeners symmetrically.
- **Cancel work at the source**: Stop timers, cancel subscriptions, and abort requests rather than relying solely on `if (!mounted) return;`.
- **BuildContext retention**: Never store `BuildContext` in long-lived repositories, singletons, static fields, or uncontrolled delayed closures.
- **Bound all caches**: Every cache must have an explicit scope, invalidation policy, and bounded eviction strategy.

---

## AI Coding Rules

When generating or refactoring Flutter code:
1. Produce complete, runnable logic for the requested scope.
2. Do not leave placeholder methods, empty callbacks, or "implement later" comments.
3. Prefer current stable Flutter APIs (Flutter 3.47+ / Dart 3.13+ baseline).
4. State version constraints when using newly introduced APIs.
5. Do not introduce deprecated APIs (e.g., `WillPopScope`, `textScaleFactor`, named routes for deep linking) when stable replacements exist.
6. Keep widgets immutable.
7. Keep `build` side-effect free.
8. Keep state ownership explicit and scoped to the narrowest needed tree.
9. Dispose owned resources.
10. Prevent stale async updates using generation tokens or cancellation.
11. Lazily construct large collections.
12. Do not add `shrinkWrap: true` without an explicit layout reason.
13. Do not add keys without an identity or state-preservation reason.
14. Do not add `RepaintBoundary` without a confirmed repaint-frequency reason.
15. Do not add isolates without measured CPU-bound frame blocking.
16. Do not add caching without ownership, bounds, and an eviction/invalidation strategy.
17. Do not present third-party package patterns as mandatory Flutter framework rules.
18. Treat web and desktop as first-class interaction targets when supported.
19. Preserve semantics, keyboard access, text scaling, and focus.
20. Include tests appropriate to the behavior when implementing production logic.
21. When profiling is unavailable, call the recommendation an **optimization hypothesis**, never a measured improvement.

---

## Definition of Done

A production Flutter task is complete only when all applicable items are satisfied:
- [ ] Behavior is correct and requirements are fulfilled.
- [ ] API use is current; no deprecated APIs or folklore patterns introduced.
- [ ] Code analyzes cleanly with sound null-safety and static typing.
- [ ] State ownership is clear and scoped to the appropriate layer.
- [ ] Async races and stale responses are prevented.
- [ ] Resources, controllers, subscriptions, and listeners are properly cleaned up.
- [ ] Large collections use lazy construction and bounded data handling.
- [ ] UI remains responsive under expected data scale; frame budgets are respected.
- [ ] Layout is responsive across required window constraints and orientations.
- [ ] Touch, mouse, keyboard, and focus interactions match platform conventions.
- [ ] Accessibility semantics, hit targets (approx. 48x48), and text scaling work properly.
- [ ] Target-platform lifecycle and navigation differences are accounted for.
- [ ] Unit, widget, or integration tests cover critical behavior.
- [ ] Performance claims are supported by profiling measurements.
- [ ] Memory growth is bounded without leaks.
- [ ] Release configuration is verified for target platforms.

---

## Progressive Disclosure Reference Index

For comprehensive, specialized guidance, consult the bundled reference documents:

| Reference Document | When to Read |
| :--- | :--- |
| [`references/rendering-and-performance.md`](references/rendering-and-performance.md) | Read when diagnosing UI or raster frame jank, optimizing paint/layers/saveLayer, tuning images/assets, animating efficiently, using DevTools profiler/timeline, optimizing app startup, or reducing release binary size. |
| [`references/platform-and-adaptive.md`](references/platform-and-adaptive.md) | Read when building responsive/adaptive layouts, adapting to Android (predictive back, scene lifecycle), iOS (UIScene, safe regions), Web (Wasm vs JS, multithreading, service workers, CORS), Desktop (resizing, mouse, keyboard, focus), or ensuring accessibility compliance. |
| [`references/architecture-and-data.md`](references/architecture-and-data.md) | Read when designing application layers (UI, ViewModel/Controller, Repository, Service, Domain), organizing feature packages, configuring network transport (timeouts, retries, cancellation), caching offline data, or enforcing Dart code quality rules (null safety, patterns, sealed classes, lints). |
| [`references/testing-strategy.md`](references/testing-strategy.md) | Read when writing or reviewing unit tests, widget tests, integration tests, golden file tests, performance profiling tests, or automated accessibility guideline checks. |
| [`references/checklists-and-decisions.md`](references/checklists-and-decisions.md) | Read when performing code reviews, validating performance hypotheses, reviewing platform readiness, avoiding common anti-patterns, or consulting the 6 decision tables (lists, state scope, async, animations, layout, performance debugging). |
| [`references/sources.md`](references/sources.md) | Read to review official documentation links, API references, research baselines, and breaking changes. |
