# Flutter Expert Tips — Complete Skill Bundle

This file concatenates the canonical skill, analysis, references, examples, and quality audit for convenient review. The directory files remain the source of truth.


---

# File: `SKILL.md`

---
name: flutter-expert-tips
description: Operational Flutter/Dart engineering guidance synthesized from vandadnp/flutter-tips-and-tricks and bizz84/flutter-tips-and-tricks, modernized for current Flutter/Dart. Use for implementation, review, debugging, refactoring, performance work, and API modernization.
---

# Flutter Expert Tips

## Purpose

Use this skill to make small, evidence-driven Flutter/Dart engineering decisions while building, reviewing, debugging, refactoring, or optimizing a real application.

The source repositories contain hundreds of useful micro-patterns, language idioms, UI techniques, debugging tools, architecture opinions, package-specific recipes, and historical APIs. Treat them as a knowledge corpus, not as unquestionable current best practice.

This skill converts that corpus into operational rules and adds a modernization gate so old snippets are never copied blindly.

## Activate This Skill When

Use it when the task involves one or more of:

- Flutter/Dart code generation or refactoring.
- Reviewing widgets, state, routing, async code, streams, forms, lists, rendering, platform code, or tests.
- Diagnosing crashes, stale `BuildContext`, lifecycle bugs, leaks, jank, layout exceptions, or rebuild problems.
- Improving Dart idioms, null safety, collections, records/patterns, type safety, or error handling.
- Deciding whether a compact Flutter trick is appropriate in production.
- Modernizing code written against older Flutter/Dart releases.
- Evaluating a performance optimization before applying it.
- Separating universal framework guidance from Riverpod/Bloc/Firebase/Dio or other package-specific recipes.

## Do Not Use It As

- A mandate to rewrite working code into clever extensions.
- A reason to introduce a state-management library the project does not already need.
- A substitute for official package/framework documentation when an API is version-sensitive.
- A license to optimize without evidence.
- A catalog of snippets to paste without understanding lifecycle, constraints, ownership, or error semantics.

## Required Analysis Workflow

1. **Understand the feature first.** Identify user-visible behavior, data flow, state ownership, navigation, async boundaries, and platform constraints.
2. **Inspect surrounding code.** Read callers, owners, lifecycle boundaries, tests, abstractions, and existing conventions before proposing changes.
3. **Classify the issue.** Separate correctness/crash, resource leak, security/reliability, significant performance, maintainability, and style.
4. **Select applicable rules.** Consult only the relevant reference files. Do not mechanically apply the whole skill.
5. **Check version sensitivity.** If the rule names a Flutter/Dart/package API that may have changed, verify current official docs before coding.
6. **Choose the smallest safe change.** Preserve existing architecture unless the current design causes a concrete problem.
7. **Implement idiomatically.** Prefer framework/language primitives over custom helpers when they express the intent directly.
8. **Verify.** Run or recommend formatting, analysis, targeted tests, and—when performance is the claim—profile-mode measurement.
9. **Explain non-obvious changes.** State the Flutter-specific reason, not just “cleaner code.”

## Finding Priority

Report and fix in this order unless the task demands otherwise:

1. correctness / crash / corrupted state;
2. resource or subscription leak;
3. security / privacy / reliability;
4. significant measured or structurally obvious performance problem;
5. maintainability / testability;
6. stylistic or convenience improvement.

Do not bury a crash risk under style comments.

## Status Vocabulary

Every non-trivial recommendation should conceptually fit one of these statuses:

- **Preferred** — safe default for the described trigger.
- **Situational** — useful when stated preconditions hold.
- **Avoid** — usually inferior or risky even if legal.
- **Legacy** — historical/contextual; do not introduce into new code without a reason.
- **Deprecated** — API or approach is formally deprecated; use its supported replacement.
- **Needs verification** — validity depends on current package/framework docs or project version.

## Core Decision Rules

### Build methods must be pure enough to rerun

**Trigger:** `build()` starts I/O, creates a request, navigates, mutates state, starts timers, or performs expensive work.  
**Diagnosis:** Flutter controls rebuild frequency; side effects can repeat and heavy work can miss frames.  
**Action:** Move effects to event callbacks, lifecycle methods, state objects/controllers, or explicit effect/listener mechanisms. Precompute/cache expensive derived values when justified.  
**Verification:** Rebuild the parent repeatedly and confirm no duplicate effect/request and no changed behavior.

### Do not create restartable async work in `build()`

**Trigger:** `FutureBuilder(future: fetch())`, stream/controller creation, or subscription setup happens inline in `build()`.  
**Diagnosis:** Parent rebuilds can restart work or create new subscriptions.  
**Action:** Obtain the future/stream earlier (`initState`, dependency/state layer, provider, repository) unless recreation is explicitly desired.  
**Verification:** Trigger unrelated rebuilds and confirm the operation does not restart.

### Guard `BuildContext` across async gaps

**Trigger:** Code awaits and then uses a `BuildContext` for navigation, inherited data, dialogs, snackbars, or theme access.  
**Diagnosis:** The associated element may have unmounted or moved.  
**Action:** Prefer obtaining durable collaborators before the gap when semantically valid; otherwise check `context.mounted` immediately before context use. Never store a context as long-lived state.  
**Verification:** Start the operation, navigate away before completion, and confirm no stale-context exception or unwanted UI.

### Dispose owned resources

**Trigger:** A `State`, controller, service, or scoped object creates an `AnimationController`, `TextEditingController`, `ScrollController`, `FocusNode`, timer, stream subscription, notifier listener, isolate/port, or other closeable resource.  
**Diagnosis:** The owner may outlive its UI need or continue callbacks after teardown.  
**Action:** Define explicit ownership and dispose/cancel/close exactly once at the matching lifecycle boundary. Do not dispose borrowed resources.  
**Verification:** Repeatedly mount/unmount and inspect logs/memory/listener counts for continued activity.

### Prefer lazy construction for large scrollable collections

**Trigger:** A large or unbounded list/grid eagerly creates all children.  
**Diagnosis:** Eager widget construction increases build cost and memory.  
**Action:** Prefer `ListView.builder`, `ListView.separated`, `GridView.builder`, slivers, or another lazy delegate when item count/shape warrants it. Supply `itemCount` when known.  
**Verification:** Instrument item construction and confirm only visible/near-visible items are built.

### Respect Flutter constraints before changing dimensions

**Trigger:** Overflow, unbounded-size, tight/loose constraint bugs, fixed widths for text, or nested scrollables.  
**Diagnosis:** Flutter layout is constraint-driven; desired size is not authority.  
**Action:** Trace constraints parent → child and size child → parent. Prefer `Expanded`, `Flexible`, `ConstrainedBox`, `LayoutBuilder`, `Align`, `AspectRatio`, `FractionallySizedBox`, or sliver primitives according to the actual constraint problem.  
**Verification:** Test smallest/largest supported sizes, text scaling, orientation, and platform variants.

### Treat intrinsic sizing as a fallback, not a default

**Trigger:** A proposed solution uses `IntrinsicWidth`/`IntrinsicHeight` to avoid fixed dimensions.  
**Diagnosis:** Intrinsic layout can require speculative extra passes and can be expensive in deep trees/lists.  
**Action:** First seek a constraints-based solution. Use intrinsic widgets only for bounded, simple subtrees where they solve a real layout requirement.  
**Verification:** Confirm the subtree is small and profile if it is repeated or scrolling.

### Localize rebuilds

**Trigger:** A small state change rebuilds a large subtree or expensive descendant tree.  
**Diagnosis:** Excess invalidation can amplify frame work.  
**Action:** Move state/listeners closer to the changing UI, extract stable child widgets, use `const` where values are compile-time constant, and use selector/listen APIs only when they improve real boundaries.  
**Verification:** Use DevTools rebuild stats/profile mode before and after when performance matters.

### Prefer widgets over UI helper functions for reusable subtrees

**Trigger:** Large methods return widgets and hide dependencies or rebuild boundaries.  
**Diagnosis:** Helper functions lack widget identity and constructor semantics; dedicated widgets improve composition, const opportunities, and isolated rebuild reasoning.  
**Action:** Extract meaningful reusable UI into small `StatelessWidget`/`StatefulWidget` classes; keep tiny local builders when extraction would add noise.  
**Verification:** API remains focused and call sites become clearer rather than merely more fragmented.

### Use `const` as a semantic and performance hint, not a superstition

**Trigger:** Immutable widgets/values can be compile-time constants.  
**Diagnosis:** Const instances can be canonicalized and let Flutter short-circuit work when the same child instance is reached.  
**Action:** Use `const` where natural and let lints help. Do not contort APIs or duplicate widgets just to increase a “const count.”  
**Verification:** `dart analyze` remains clean; behavior is unchanged.

### Move only genuinely CPU-heavy work off the UI isolate

**Trigger:** Parsing/computation takes long enough to threaten frame budget.  
**Diagnosis:** CPU work blocks frame processing on native platforms if run on the UI isolate.  
**Action:** Measure first. For suitable sendable inputs/results, use `compute`/`Isolate.run` or a longer-lived isolate for repeated work. Remember `compute` runs on the current event loop on web. I/O itself is normally asynchronous and is not a reason to spawn an isolate.  
**Verification:** Profile before/after and confirm transfer/serialization overhead does not erase the gain.

### Prefer direct alpha when only one image/color needs transparency

**Trigger:** `Opacity` wraps a single `Image` or color solely to make it translucent.  
**Diagnosis:** Fractional `Opacity` can require an intermediate buffer.  
**Action:** Apply alpha to the image/color directly where semantics are equivalent; use `AnimatedOpacity`/`FadeTransition` for animated subtree opacity. If opacity zero should disable interaction, handle hit testing too.  
**Verification:** Visual output, semantics, and pointer behavior are unchanged.

### Do not hide secrets with client-side configuration

**Trigger:** A secret/server credential is placed in `.env`, assets, `--dart-define`, source constants, or obfuscated client code.  
**Diagnosis:** Values shipped to a client can be extracted. Configuration mechanisms are not secret storage.  
**Action:** Keep privileged secrets and privileged API calls on a trusted backend. Client-identification keys may be shipped only when their provider explicitly designs them for client use and restrictions/security rules are configured.  
**Verification:** Inspect release artifacts/config and threat-model what an attacker gains if every shipped value is known.

### Model expected failures explicitly at boundaries

**Trigger:** Repository/service APIs throw heterogeneous infrastructure exceptions directly into UI/state code.  
**Diagnosis:** Callers become coupled to transport/storage implementation and error handling becomes inconsistent.  
**Action:** At meaningful boundaries, translate expected recoverable failures into a project-consistent result/failure model; preserve unexpected programmer errors and stack traces rather than swallowing them.  
**Verification:** Tests cover success, expected failure, cancellation, and unexpected error propagation.

### Cancellation must match the underlying operation

**Trigger:** UI scopes start requests/searches that become irrelevant when query/page/scope changes.  
**Diagnosis:** Ignoring a future result is not necessarily the same as canceling network/CPU work.  
**Action:** Prefer APIs with real cancellation support (for example a client cancellation token/subscription cancel). `CancelableOperation` can control completion semantics but cannot magically abort work the underlying API cannot cancel.  
**Verification:** Confirm both callbacks and underlying work stop when cancellation is required.

### Streams require ownership and error semantics

**Trigger:** Stream transformations, controllers, subscriptions, retries, merges, debounce/throttle, or initial values are introduced.  
**Diagnosis:** Broadcast/single-subscription behavior, error forwarding, cancellation, and backpressure-like semantics can change subtly.  
**Action:** State who owns subscription/controller closure; preserve errors unless intentionally transformed; use standard/package operators when they express the behavior clearly; avoid bespoke transformers for common operations unless dependency constraints justify them.  
**Verification:** Test data, error, done, cancellation, multiple listeners (if applicable), and timing boundaries.

### Prefer simple built-in collection/language features before clever operators

**Trigger:** Custom `+`, `-`, subscripts, `compactMap`, zip/tuple, map-filter, or range extensions are proposed.  
**Diagnosis:** They can improve local readability but surprise maintainers, allocate eagerly, hide complexity, or duplicate modern Dart features/packages.  
**Action:** Prefer standard collection literals, spreads, null-aware elements, records, patterns, `where`, `map`, `expand`, `fold`, `Map.update`, and explicit helpers. Introduce extensions only when semantics are obvious, tested, and repeatedly useful.  
**Verification:** A reader can infer behavior without opening the extension implementation.

## Architecture Rules

- Architecture exists to control dependency direction, state ownership, test seams, and change cost—not to maximize folders.
- Prefer feature-oriented organization when it keeps related UI/state/domain/data code discoverable; shared cross-cutting infrastructure can remain under core/shared modules.
- Program important boundaries to abstractions when multiple implementations, testing fakes, or volatile infrastructure justify the seam.
- Do not create a repository/use-case/interface layer for every trivial call. Add a boundary when it buys isolation, policy, reuse, or testability.
- Keep UI-specific state close to UI; keep business/data source-of-truth outside ephemeral list-item/widget subtrees.
- State-management tips in the source corpus (especially Riverpod/Bloc/Hooks) are **package-specific examples**, not universal mandates. Preserve the project's established state solution unless changing it solves a concrete problem.
- Backend-agnostic design is valuable at deliberate interfaces; pretending every dependency is swappable can produce ceremony without realistic benefit.

## Debugging Workflow

1. Reproduce deterministically and reduce the problem.
2. Read the first relevant exception plus stack trace; do not fix downstream symptoms first.
3. For layout issues, use Widget Inspector / debug paint and trace constraints.
4. For network issues, inspect DevTools Network and server response details.
5. For rebuild/jank issues, use profile mode, Performance view, rebuild stats, raster/UI timing, and repaint debugging.
6. For lifecycle issues, log ownership transitions and reproduce rapid navigation/mount-unmount.
7. For async issues, test cancellation, out-of-order completion, unmount during await, and duplicate requests.
8. For state bugs, identify the single source of truth and all writers/listeners.
9. Make one focused change.
10. Add/regress a targeted test whenever practical.

## Performance Workflow

1. Establish whether the issue is startup, UI thread, raster/GPU, memory, network, I/O, or build size.
2. Reproduce in **profile mode** on representative hardware; debug timing is not a performance baseline.
3. Capture evidence with DevTools/timeline/rebuild/repaint/image diagnostics.
4. Fix algorithmic/eager work before micro-optimizing syntax.
5. Common structural checks:
   - eager long lists/grids;
   - heavy work in `build()`;
   - broad rebuild scope;
   - repeated parsing/decoding/allocation;
   - oversized images/assets;
   - avoidable intrinsic layout;
   - costly opacity/saveLayer/clipping effects;
   - unnecessary work after a scope is disposed;
   - expensive synchronous work on the UI isolate.
6. Re-measure the same scenario.
7. Keep the optimization only when it improves the target metric without unacceptable complexity.

## Review Checklist

### Correctness
- [ ] No side effects accidentally triggered by rebuild.
- [ ] Async work has intentional ownership and restart semantics.
- [ ] `BuildContext` is not stored or used unsafely after awaits.
- [ ] Error/cancellation paths preserve useful stack/context.
- [ ] Layout code follows constraints rather than device-specific guesses.
- [ ] Navigation semantics match replace/go vs push-stack intent.

### Resources
- [ ] Owned controllers, focus nodes, timers, subscriptions, listeners, clients/ports are disposed/canceled/closed.
- [ ] Borrowed resources are not disposed by the borrower.
- [ ] List item state that must survive scrolling lives at an appropriate level or uses an intentional keep-alive strategy.

### Performance
- [ ] Large collections build lazily.
- [ ] No heavy computation/I/O in `build()`.
- [ ] Rebuild scope is proportional to changed state.
- [ ] Intrinsic layout and compositing effects are justified.
- [ ] Images are appropriately sized/cached for the use case.
- [ ] CPU offloading is based on measurement.

### Maintainability
- [ ] Standard Dart/Flutter APIs are preferred over surprising custom operators.
- [ ] Reusable UI is composed into focused widgets where useful.
- [ ] Abstractions correspond to real volatility/testing/policy seams.
- [ ] Package-specific patterns do not leak through unrelated layers unnecessarily.

### Security / Reliability
- [ ] No privileged secret is shipped to the client.
- [ ] Logs do not expose secrets/PII in release.
- [ ] Retries have bounded policy and do not duplicate non-idempotent writes.
- [ ] Remote-config/force-update paths fail safely.

### Testing / Tooling
- [ ] `dart format` / `dart analyze` pass.
- [ ] Relevant unit/widget/integration tests pass.
- [ ] Platform variants are covered when behavior differs.
- [ ] Performance claims were checked in profile mode.

## Reference Routing

Read only what the task needs:

- `references/dart-idioms.md` — collections, null safety, records/patterns, constructors, equality, extensions, errors.
- `references/widgets-and-context.md` — build purity, context, composition, navigation, MediaQuery, UI patterns.
- `references/lifecycle-and-resources.md` — disposal, ownership, app lifecycle, controllers, listeners.
- `references/layout-and-rendering.md` — constraints, scrolling, intrinsic layout, images, painting, animation.
- `references/async-and-streams.md` — futures, streams, cancellation, debounce/throttle, isolates.
- `references/performance.md` — profiling and structural performance rules.
- `references/architecture.md` — feature structure, abstractions, state, repositories, initialization.
- `references/testing-and-debugging.md` — tests, DevTools, logging, CI, diagnostics.
- `references/forms-accessibility-localization.md` — input, semantics, adaptive UI, text scaling, localization.
- `references/platform-tooling-security.md` — platform checks, web interop, flavors, config, secrets, release tooling.
- `references/modernization-and-legacy.md` — known outdated/deprecated/suspicious corpus advice.
- `references/source-map.md` — traceability from normalized rules to repository paths.
- `examples/good-patterns.md` / `examples/anti-patterns.md` — concise code patterns.

## Obsolete Advice Rule

Before copying any source-repository snippet that touches a versioned API:

1. check the project SDK constraints and dependency versions;
2. inspect analyzer deprecations;
3. verify current official Flutter/Dart/package docs;
4. preserve the *intent* of the old tip;
5. implement the current supported API;
6. mark uncertain package-specific guidance as **Needs verification** rather than guessing.

Never silence a deprecation merely to preserve an old snippet.

## Overengineering Guard

Reject a “clever” change when all are true:

- existing code is correct and clear;
- no measured performance/reliability problem exists;
- the new abstraction is used once or twice;
- it adds indirection, dependencies, or unfamiliar operators;
- the benefit is mostly theoretical.

Prefer boring, local, testable Flutter code.

## Current API validation

When a rule touches deprecation, platform behavior, rendering cost, or a version-sensitive Flutter/Dart API, consult `references/validation-sources.md` and then the linked official documentation. Repository source material never overrides current official API guidance.

---

# File: `ANALYSIS.md`

# Repository Analysis Summary

## Corpus character

### `vandadnp/flutter-tips-and-tricks`

- Last observed repository commit in the inspected history: December 30, 2022.
- Organized as a large `tipsandtricks/` corpus; most topics have a Markdown entry plus a Dart snippet and often an infographic.
- Strongest value: Dart expressiveness, collections/extensions, streams/futures, compact Flutter widget recipes, animations, network snippets, resource/cancellation ideas.
- Main risk: the corpus predates several modern Dart/Flutter changes, so exact snippets must be treated as historical until analyzer/current docs confirm them.
- Some tips intentionally demonstrate clever/custom operators and generic conversions. These are useful teaching devices but not universal production guidance.

### `bizz84/flutter-tips-and-tricks`

- README indexes 256 numbered tips; latest observed commit is September 23, 2025 (`Tip 256`).
- Strongest value: production workflow, architecture/testing, BuildContext, side effects, DevTools/performance, Riverpod patterns, Firebase, platform/build tooling, and newer Dart/Flutter changes.
- Main risk: many entries are package/tool/version specific. Some “tips” are intentionally concise and need conditions (for example intrinsic sizing, Container replacement, remote-config force upgrades).

## Synthesis method

1. Used both README indexes as the complete topic inventory/taxonomy source.
2. Inspected representative/high-impact source files and source snippets for semantics.
3. Deduplicated recurring themes: async context safety, lazy lists, stream/future handling, disposal, reusable widgets, error models, architecture boundaries, platform configuration, performance diagnostics.
4. Separated framework-agnostic rules from Riverpod/Bloc/Hooks/Firebase/Dio/tooling recipes.
5. Cross-checked version-sensitive high-impact items against current official Flutter/Dart API/documentation.
6. Converted durable rules to **Trigger → Diagnosis → Action → Verification** behavior in `SKILL.md` and references.
7. Kept old ideas when useful, but labeled exact old APIs as legacy/deprecated/needs verification.

## Key deduplicated rules

1. Build methods must tolerate frequent reruns and should not orchestrate effects.
2. Do not create restartable futures/streams/controllers in build unintentionally.
3. Never assume a `BuildContext` survives an async gap; use `context.mounted` or redesign effect ownership.
4. Dispose/cancel/close resources according to explicit ownership.
5. Build large scrollable collections lazily.
6. Solve layout via constraints before fixed pixels or intrinsic sizing.
7. Localize rebuilds and use `const` naturally.
8. Prefer dedicated reusable widgets for meaningful UI subtrees; avoid fragmentation.
9. Profile before performance optimization; debug mode is not a benchmark.
10. Offload measured CPU-heavy work only; `compute` is not a generic async solution.
11. Treat fractional opacity/compositing and oversized images as potential raster/memory costs.
12. Model expected recoverable failures explicitly at service/repository boundaries where useful.
13. Preserve stack traces and do not silently swallow unexpected errors.
14. Cancellation must propagate to the real underlying work to save resources.
15. Define stream ownership, errors, done, cancellation, and listener semantics.
16. Prefer standard modern Dart features before custom collection operators/helpers.
17. Architecture should reduce change/test cost, not maximize layers.
18. Preserve the project's existing state-management solution unless migration solves a concrete issue.
19. Client build configuration is not secret storage.
20. Platform/build/vendor recipes must be verified against the consuming project's versions.

## Notable modernization findings

- `dart:html` is deprecated; current Dart uses `package:web` / `dart:js_interop`.
- Old Dart macros/`JsonCodable` experiment should not be taught; work on the macro experiment was stopped.
- `Matrix4.translate/scale/scaled` dynamic methods are deprecated in favor of typed `*ByDouble` / `*ByVector*` variants.
- `Color.withOpacity` is deprecated; use `withValues(alpha: ...)`.
- `WillPopScope` is deprecated; use `PopScope`.
- `IntrinsicWidth` is explicitly documented as relatively expensive and potentially O(N²) with tree depth.
- `MediaQuery.of` should be replaced by aspect-specific getters when only one field is needed.
- `debugPrint` logs in release mode, so it must not be assumed safe/debug-only.
- `compute` runs on the current event loop on web, separate isolate on native.

## Scope note

The two repositories contain hundreds of visual examples and companion images. The generated skill does not duplicate every UI screenshot recipe. Instead it indexes those topics into the taxonomy and extracts the engineering decision that an AI agent can apply. Source traceability focuses on normalized rules and representative paths, which keeps the skill maintainable rather than turning it into a copied archive.

---

# File: `references/architecture.md`

# Architecture and Maintainability

## Architecture goals

Optimize for:

- clear dependency direction;
- explicit state ownership;
- testable policies;
- replaceable volatile infrastructure where realistic;
- feature discoverability;
- minimal ceremony.

## Feature-first vs layer-first

The Bizzotto corpus explicitly discusses feature-first/layer-first organization. Normalize the decision:

### Prefer feature-oriented grouping when

- the app has multiple user-facing features;
- developers usually change UI/state/data for one feature together;
- feature ownership/modules matter.

Example:

```text
lib/
  core/
  features/
    checkout/
      data/
      domain/   # only if domain abstractions earn their cost
      presentation/
    profile/
      ...
```

### Layer-oriented grouping can be fine when

- app is small;
- layer boundaries dominate development flow;
- team conventions make navigation predictable.

Do not reorganize a stable codebase for taxonomy aesthetics alone.

## Repository pattern

Repositories are valuable when they:

- aggregate/cache multiple data sources;
- translate infrastructure errors/models;
- define an application/domain-facing persistence/query contract;
- enable tests/fakes;
- isolate a volatile backend.

Avoid “repository per endpoint” wrappers that only forward one method with no policy/seam benefit.

## Program to interfaces, selectively

An abstract interface is justified when at least one is true:

- production and fake/test implementations exist;
- backend/provider may realistically change;
- the boundary protects domain/application code from vendor types;
- multiple implementations are already needed.

Do not add an interface to every final class by default.

## Backend-agnostic design

Useful at deliberate boundaries. Keep Firebase/Dio/SQLite/platform types from leaking throughout app state/domain code where replacement/testing matters.

But not every SDK must be wrapped. UI-specific framework APIs can stay in presentation; thin wrappers around stable primitives may add no value.

## State ownership

Use a single source of truth for durable state.

Separate:

- ephemeral widget state (focus, controller, animation, local expansion);
- feature/application state (loading/data/failure, selections that survive rebuilds);
- persistent/domain data;
- cross-cutting service state (auth/connectivity/config) with explicit scope.

## State-management packages

The source corpus is heavily Riverpod-oriented and also includes Bloc/Hooks. Treat package recipes as examples.

Agent behavior:

1. identify the project's existing state system;
2. follow its idioms;
3. apply universal principles (ownership, side effects, cancellation, immutability, testability);
4. do not migrate packages during unrelated work.

## Immutability

Immutable state/models reduce accidental shared mutation and make equality/change reasoning easier. Prefer creating new state values rather than mutating a published state object.

Do not deep-copy giant graphs unnecessarily; choose data structures and state granularity thoughtfully.

## Initialization

Explicitly model app readiness:

- bootstrap required dependencies;
- render a startup/loading/error state;
- inject ready dependencies;
- lazy-init optional/feature dependencies where appropriate.

Avoid starting critical async initialization in random widget builds.

## Global variables and singletons

Global constants/stateless service locators are not automatically harmful; global **mutable hidden state** is the danger.

Singleton drawbacks include:

- test order coupling;
- hidden dependencies;
- lifecycle ambiguity;
- difficult replacement.

Use dependency injection/explicit constructors when a dependency affects behavior and tests.

## Side-effect boundaries

Keep rendering declarative; place effects in controllers/state/effect listeners/services.

A useful flow:

```text
UI event -> state/controller intent -> use case/repository -> result
        <- state update/effect decision <-
```

Do not force every app to use “use case” classes. A controller can call a repository directly in a simple feature.

## Error model

Translate recoverable infrastructure failures at a meaningful boundary into project-level failures/result values when callers need typed handling.

Preserve unexpected errors and stacks. Avoid a single `Failure.unknown` that erases diagnostic information.

## Dependency volatility

Wrap high-volatility/vendor services more aggressively when switching cost matters: analytics, crash reporting, remote config, backend gateways, payments. Keep the interface focused on product needs rather than mirroring vendor APIs.

## Overengineering test

Before adding a layer ask:

- What dependency does this isolate?
- What policy belongs here?
- What test becomes easier?
- What future change becomes cheaper?
- Is that change plausible?

If answers are weak, keep the code local.

---

# File: `references/async-and-streams.md`

# Async, Futures, Streams, Cancellation, Isolates

## Future ownership

A future represents work with lifecycle semantics. Ask:

- who starts it;
- can it restart;
- can it become irrelevant;
- can it be canceled;
- how errors are surfaced;
- whether completion order matters.

## `Future.wait`

Use for independent work that can run concurrently.

```dart
final (user, settings) = await () async {
  final results = await Future.wait([
    repository.loadUser(),
    repository.loadSettings(),
  ]);
  return (results[0] as User, results[1] as Settings);
}();
```

For heterogeneous futures, records plus separate awaits/concurrency helpers may be clearer. Understand `Future.wait` error/cleanup semantics before relying on partial results.

Do not parallelize operations with ordering/dependency requirements.

## Avoid needless `async`/`await`

If a function simply returns a future unchanged, returning it directly avoids an extra async boundary and preserves the original stack behavior more directly.

```dart
Future<User> load() => repository.loadUser();
```

Use `async`/`await` when it improves control flow, error handling, cleanup, or readability.

## Cleanup with `try/finally`

A 2022 source example chains `Future.then(...).onError(...)` to run API cleanup. Preserve the intent but prefer explicit structured cleanup when ownership matters.

```dart
final client = HttpClient();
try {
  return await checkout(client);
} finally {
  client.close();
}
```

If failure requires a compensating remote action, keep that action explicit and decide what happens if cleanup itself fails.

## Cancellation

Cancellation has layers:

1. **ignore result** — caller stops caring;
2. **cancel subscription/timer** — stops future callbacks from that resource;
3. **cancel transport/operation** — underlying network/worker stops doing work.

`CancelableOperation` can make caller-facing completion cancelable, but underlying work only stops if the underlying API supports cancellation and the cancellation hook actually triggers it.

For search/request scopes, prefer transport-native cancellation tokens when available.

## `unawaited`

Use to document intentional fire-and-forget work.

```dart
unawaited(analytics.track('opened_profile'));
```

Ensure errors are handled by the called API or intentionally routed. Do not use `unawaited` to silence a future you should await.

## Streams

### Controller ownership

Prefer creating controllers only when you truly need imperative event production. Close owned controllers. If data can be expressed with `async*`, existing streams, or state objects, avoid unnecessary controllers.

### Transformations

Common operations include:

- `map`, `where`, `asyncMap`, `expand`;
- timeout/recovery;
- debounce/throttle/combineLatest via packages when needed;
- initial values / start-with behavior.

Before using package operators, confirm:

- single vs broadcast stream behavior;
- cancellation propagation;
- error propagation;
- whether events can be dropped/reordered.

## Error handling

Do not absorb stream errors by converting them to empty data unless “error means no data” is actually the domain policy.

A source tip demonstrates absorbing/recovering errors; production code should instead explicitly choose among:

- propagate error to UI/state;
- map infrastructure error to domain failure;
- retry bounded transient failures;
- recover with cached data;
- terminate stream.

## Debounce vs throttle

- **Debounce:** wait for inactivity; good for search queries.
- **Throttle:** limit execution rate while events continue; good for high-frequency gestures/telemetry depending on semantics.

Test with fake time where possible.

## Async startup

App initialization should not create a permanently blank/crashed app when one optional dependency fails.

Classify dependencies:

- required to render anything;
- required only for a feature;
- optional telemetry/config.

Give required initialization a user-visible error/retry path. Initialize optional services defensively.

## Isolates and `compute`

Use for CPU work that risks frame drops (parsing, transforms, algorithms), not ordinary async network waiting.

Current Flutter behavior:

- native: `compute` executes in a separate isolate (conceptually `Isolate.run`);
- web: callback runs on the current event loop, so it does not create true parallel execution.

Inputs/results must satisfy sendability constraints on native platforms.

Measure transfer/copy overhead, especially for large object graphs.

## Retry

A robust retry policy specifies:

- which failures are retryable;
- maximum attempts/time;
- delay/backoff/jitter if needed;
- idempotency safety;
- cancellation;
- user-visible final failure.

Never blindly retry a payment/write that may have succeeded server-side without idempotency protection.

---

# File: `references/dart-idioms.md`

# Dart Idioms and Data Rules

## Prefer language primitives over bespoke “cleverness”

The Vandad corpus contains many useful experiments with custom operators, extensions, range helpers, compact-map helpers, map subscripts, custom iterables, zip/tuple emulation, and generic conversion. These teach Dart's extension/operator capabilities well, but production code should first ask whether modern Dart already makes the operation clear.

### Preferred

- collection `if`, `for`, spread (`...`) and null-aware spread (`...?`).
- null-aware collection elements where supported by the project's Dart language version.
- records for small structural multi-values.
- patterns/destructuring for structured parsing when it improves clarity.
- `where`, `map`, `expand`, `fold`, `Map.update`, `Set`, and standard constructors.
- named helpers when behavior is domain-specific.

### Situational

Custom extensions are valuable when:

- the operation repeats across the codebase;
- the receiver/return type makes semantics obvious;
- complexity/allocation behavior is understood;
- the name is discoverable and unsurprising;
- tests define edge cases.

### Avoid

- overloading `+`/`-` for collection semantics that teammates cannot predict;
- extensions that silently swallow invalid input;
- generic “convert anything to int/string” helpers that erase type errors;
- deep recursive flatten/search helpers without depth/shape assumptions;
- performance claims based only on concise syntax.

## Const, final, var

Use `const` for compile-time immutable values and widgets when natural. Use `final` for runtime single-assignment values. Use `var` when inference is obvious and mutability is intentional or the variable remains effectively single-purpose.

Do not treat “prefer const over final over var” as a total ordering for every declaration: they encode different semantics.

```dart
const timeout = Duration(seconds: 10);
final startedAt = DateTime.now();
var retryCount = 0;
```

## Type annotations

Prefer explicit public API types and explicit types where inference hides important contracts. Local inference is idiomatic when the type is obvious.

```dart
Future<User> loadUser(UserId id) async { ... }
final user = await loadUser(id);
```

Avoid `dynamic` as an escape hatch for JSON. Parse at the boundary.

## JSON parsing

**Trigger:** `Map<String, dynamic>` flows deep into application code.  
**Action:** validate/convert near the transport boundary into typed models. Patterns can make structural checks concise, but generated serializers/manual constructors are still appropriate.

```dart
User parseUser(Object? json) {
  return switch (json) {
    {'id': final String id, 'name': final String name} => User(id: id, name: name),
    _ => throw const FormatException('Invalid user payload'),
  };
}
```

## Null safety

- Prefer promotion and null-aware syntax over `!`.
- `!` is appropriate only when an invariant is stronger than the static type and is locally obvious/tested.
- Do not convert null into a fabricated default unless the domain actually defines that default.
- Be careful with helpers named “safe list” or “optional first”; they may hide data-quality bugs. Prefer `firstOrNull`-style APIs only when “missing” is valid domain state and the API is available via the chosen standard/package approach.

## Equality and hashing

When overriding `==`, also provide a consistent `hashCode`. Prefer `Object.hash` / `Object.hashAll` for straightforward fields.

```dart
@immutable
class Point {
  const Point(this.x, this.y);
  final int x;
  final int y;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is Point && other.x == x && other.y == y;

  @override
  int get hashCode => Object.hash(x, y);
}
```

Do not use `identical` when semantic equality is required; it tests identity/canonicalization.

## List/map equality

Dart collection `==` is not a universal deep structural equality operation. Choose order-sensitive vs order-insensitive semantics explicitly and use appropriate utilities/normalization.

Avoid converting to `Set` when duplicate multiplicity matters.

## Constructors

### Factory constructors

Use when construction may:

- return a cached/subtype/existing instance;
- validate/normalize before returning an instance;
- delegate to a private implementation.

Use a regular generative constructor when no alternative instance behavior is needed.

### Static factory method vs `factory`

Prefer the form that best communicates the API. `factory` participates in constructor syntax and can return another implementation; named static methods can communicate actions such as `parse`, `load`, or `tryCreate` more clearly.

## Enums, records, patterns

Older corpus tips on “classes as enums”, tuples, and associated values should be reconsidered with modern Dart:

- enhanced enums can own fields/methods;
- records replace many ad-hoc tuple classes;
- patterns can destructure records/lists/maps/classes;
- sealed class hierarchies remain appropriate for sum types with behavior/state beyond enum cases.

Do not modernize mechanically; keep a class if it encodes identity, invariants, extensibility, or domain behavior.

## Function tear-offs

Prefer a tear-off when a callback already matches the required signature.

```dart
items.map(parseItem); // Prefer
items.map((item) => parseItem(item)); // Extra wrapper unless adaptation is needed
```

## `unawaited` and ignored futures

Use `unawaited(future)` to document intentional fire-and-forget behavior. Use `.ignore()` when you intentionally discard both value and errors according to the API semantics—but do not use either to hide meaningful failures.

For analytics/telemetry fire-and-forget calls, ensure the SDK handles errors internally or attach an explicit error strategy.

## Exceptions and stack traces

- `rethrow` preserves the current exception and stack when inside `catch`.
- If translating an exception but preserving a chosen stack, use supported stack-preserving mechanisms such as `Error.throwWithStackTrace` where appropriate.
- Do not catch `Object` and return a default unless the boundary explicitly defines that recovery.

```dart
try {
  return await api.load();
} on ApiException catch (e, st) {
  Error.throwWithStackTrace(UserLoadException(e), st);
}
```

## Experimental/reflection features

### Dart mirrors

`dart:mirrors` is not a normal Flutter cross-platform solution. Reflection-based tips are educational/VM-specific and should be marked **Legacy/Situational** for Flutter app code.

### Macros

A source tip demonstrated experimental `JsonCodable` macros. Work on that macro experiment was stopped. Do not teach the old macro snippet as a current serialization solution. Use supported code generation/manual serialization or current language features appropriate to the project.

---

# File: `references/forms-accessibility-localization.md`

# Forms, Input, Accessibility, Localization, Adaptivity

## Forms

Use `Form` + validation when multiple inputs have coordinated submit/validation behavior. For one simple field, a controller/value validation flow may be enough.

## Numeric input

A numeric keyboard is only a keyboard hint; it does not guarantee valid numeric text. Combine:

- suitable `keyboardType`;
- `inputFormatters` when restriction is appropriate;
- validation/parsing at submit/domain boundary.

Do not block locale-valid input accidentally (decimal separators, minus sign) without product requirements.

## Controllers and focus

`TextEditingController` and `FocusNode` are resources. Own/dispose them at a predictable widget/controller scope.

Avoid mirroring every keystroke into multiple independent sources of truth. Decide whether controller text or application state is authoritative and synchronize deliberately.

## Password/sensitive fields

`obscureText`/masking protects casual shoulder-surfing, not device compromise. Never log sensitive values. Configure autofill/content types according to platform security/user experience requirements.

## Debounced search

Debounce text-change-driven requests and cancel/ignore obsolete results. Verify out-of-order responses cannot overwrite a newer query.

## Selection

Use `SelectionArea` for multi-widget selectable regions and `SelectableText` for standalone selectable text. Ensure gestures do not conflict with custom recognizers/scrolling.

## Accessibility

Review:

- semantic labels/roles/actions;
- focus order and keyboard navigation on desktop/web;
- text scaling;
- contrast and color-independent status communication;
- minimum usable touch targets;
- screen-reader behavior for custom painters/gestures;
- reduced-motion considerations where applicable.

Do not rely on custom icon appearance alone to convey status.

## Semantics identifiers vs labels

Automation identifiers and accessible labels serve different consumers. Keep human-readable semantics meaningful even if a stable test identifier exists.

## Localization

- use Flutter's localization generation/delegates rather than scattered hard-coded strings;
- avoid concatenating translated sentence fragments where grammar/order varies;
- pass parameters into localized messages;
- test RTL and long text;
- account for text scaling and locale-specific numbers/dates.

BuildContext localization extensions can improve ergonomics, but they should wrap generated localization access rather than hiding missing-locale failures.

## Hard-coded strings

Not every string must be localized (debug labels, technical identifiers), but user-visible product copy should normally come from localization resources when the app is localized.

## Adaptive UI

Material/Cupertino adaptive dialogs/components can make platform experiences feel native. Use product design requirements as authority; platform adaptivity is not mandatory when the app intentionally uses one cross-platform design language.

## Keyboard shortcuts

`CallbackShortcuts`/shortcut APIs are useful on desktop/web for productivity. Ensure shortcuts do not conflict with text input/platform conventions and keep every critical action accessible through visible UI.

---

# File: `references/layout-and-rendering.md`

# Layout, Rendering, Images, Scrolling, Animation

## Constraint-first debugging

Remember: **constraints go down, sizes go up, parents set positions**.

For overflow/unbounded errors:

1. identify the first widget with incorrect constraints;
2. inspect its parent constraints;
3. decide whether the child needs a tighter constraint, flex allocation, scrolling, or a different layout primitive;
4. avoid adding arbitrary fixed pixels unless the design truly requires them.

## Fixed width vs responsive content

A source tip recommends `IntrinsicWidth` instead of fixed width so text scaling does not break layout. Preserve the intent—avoid brittle fixed widths—but modernize the rule:

### Preferred order

1. natural constraints / flexible layout;
2. `Flexible` / `Expanded` / `Wrap` / `OverflowBar` / `ConstrainedBox`;
3. component-level `LayoutBuilder` or proportional sizing where appropriate;
4. intrinsic sizing only for small bounded subtrees that genuinely need intrinsic measurement.

`IntrinsicWidth`/`IntrinsicHeight` can perform additional speculative layout and should not be repeated throughout large lists/trees without measurement.

## Row/Column spacing

When the project's Flutter SDK supports native `spacing`, prefer it for uniform gaps. On older SDKs, explicit `SizedBox`/separator patterns are fine. Do not add a third-party “gap” dependency solely for one trivial spacing case unless it is already a project convention.

## Lists and grids

### Small fixed collection

`ListView(children: [...])` is clear and fine.

### Large/unbounded collection

Use lazy builders.

```dart
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ItemTile(item: items[index]),
)
```

Supply stable keys when item identity matters through reorder/insert operations. Consider `findChildIndexCallback`/appropriate delegates for complex reordering/state preservation.

### State in list rows

Do not rely on an offscreen row widget's `State` as the source of truth for durable business state. Lazy lists may destroy/recreate children. Keep durable data outside the row or intentionally opt into keep-alive behavior when justified.

## Nested scrolling

Avoid `shrinkWrap: true` as a reflex. It can force expensive measurement of the scroll contents. Prefer a single scrollable/sliver composition when large lists are nested in a page.

Use `CustomScrollView` + slivers for complex coordinated scrolling (headers, lists, grids, app bars).

## Infinite scrolling / pagination

- request pages before the user reaches the hard end;
- prevent duplicate concurrent page requests;
- stop when end-of-data is known;
- surface retry for failures;
- preserve existing results during next-page loading;
- cancel/ignore obsolete requests when query/filter changes.

## Images

### Decode/display size

Oversized decoded images waste memory/raster bandwidth. Use DevTools diagnostics and request/cache appropriately sized variants where possible.

### Aspect ratio

Use `AspectRatio`, `FittedBox`, `BoxFit`, or known dimensions to avoid layout jumps and distortion.

### Network loading

Retries should be bounded and only used for retryable failures. Avoid infinite retry loops. Consider cache/error placeholders and cancellation when the owning scope disappears.

### SVG/vector assets

Preloading/compiling may remove first-use work, but measure and follow the vector package's current API. Build-time vector compilation is package/tool-version specific.

## Opacity

Fractional `Opacity` can introduce an intermediate buffer. If only one color or image needs alpha, apply alpha directly.

```dart
// Prefer for a color
ColoredBox(color: color.withValues(alpha: 0.5));
```

For animated opacity, use `AnimatedOpacity` for implicit animation or `FadeTransition` when an animation is already owned.

If opacity reaches zero and interaction must stop, add `IgnorePointer`/appropriate visibility semantics.

## Clipping, blur, shadows, gradients

These are valid visual tools, not free effects.

- avoid repeated complex clips/blur in scrolling cells without profiling;
- prefer direct rounded-rectangle painting/layout over unnecessary clip + saveLayer combinations when equivalent;
- keep shader/gradient effects bounded;
- profile raster thread/GPU when visual effects correlate with jank.

## Repaint debugging

Use:

- DevTools performance/repaint tooling;
- `debugRepaintRainbowEnabled` in debug diagnostics;
- paint/debug size visualizations.

A repaint is not automatically bad; optimize only when expensive content repaints unnecessarily.

## Animations

### Prefer implicit animations when

- one/few properties transition from old to new;
- no complex orchestration is needed.

Examples: `AnimatedContainer`, `AnimatedPositioned`, `AnimatedSwitcher`, `AnimatedOpacity`.

### Prefer explicit animation/controller when

- sequencing/reversing/flinging is needed;
- multiple animations coordinate;
- gesture-driven progress is required.

Controllers are resources: dispose them.

## Jitter when swapping widgets

Use stable constraints/`AnimatedSwitcher`/consistent sizing when alternate widgets have different dimensions and the product expects a smooth transition. Do not hide genuine content-size changes with forced dimensions that break accessibility.

---

# File: `references/lifecycle-and-resources.md`

# Lifecycle and Resource Ownership

## Ownership rule

For every closeable/cancelable resource, answer:

1. Who creates it?
2. Who owns it?
3. When does it become invalid?
4. Who disposes/cancels/closes it?
5. Can callbacks arrive after disposal?

The creator is often the owner, but dependency injection can transfer ownership. Never blindly dispose resources received from a parent/service.

## Common `State`-owned resources

- `AnimationController`
- `TextEditingController`
- `ScrollController`
- `PageController`
- `FocusNode`
- `TabController`
- `StreamSubscription`
- `Timer`
- listeners added to `Listenable`s
- platform/event channel subscriptions
- isolate receive ports or long-lived worker handles

```dart
class _SearchState extends State<SearchPage> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  StreamSubscription<Result>? _subscription;

  @override
  void dispose() {
    _subscription?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }
}
```

If disposal itself is asynchronous, follow the API's lifecycle model; Flutter's `State.dispose()` is synchronous, so async teardown may need to be initiated earlier or owned by another scope.

## Listener symmetry

When registering a listener manually, remove the same listener when ownership ends.

```dart
@override
void initState() {
  super.initState();
  widget.notifier.addListener(_onChanged);
}

@override
void didUpdateWidget(covariant MyWidget oldWidget) {
  super.didUpdateWidget(oldWidget);
  if (oldWidget.notifier != widget.notifier) {
    oldWidget.notifier.removeListener(_onChanged);
    widget.notifier.addListener(_onChanged);
  }
}

@override
void dispose() {
  widget.notifier.removeListener(_onChanged);
  super.dispose();
}
```

This pattern is more important than any particular state-management library.

## App lifecycle

`WidgetsBindingObserver`/lifecycle APIs are useful for pause/resume/inactive/detached concerns such as:

- pausing sensors/media;
- saving transient state;
- refreshing stale data on resume;
- reacting to locale/metrics changes when lower-level access is required.

Do not treat lifecycle callbacks as guaranteed process-shutdown hooks; mobile OSes can terminate processes without a graceful callback.

## Stream/provider disposal

The corpus contains Riverpod `StreamProvider` disposal examples. Generalize the principle:

- subscriptions should be scoped to the consumer/owner;
- auto-dispose behavior is useful only when recreation cost/state loss is acceptable;
- cancellation must propagate to the underlying source when possible;
- do not keep a network/socket stream alive merely because a provider/container is global.

## Text controllers in state-management objects

A source tip stores `TextEditingController` in Bloc-oriented code. Treat this as **Situational**.

Usually prefer:

- keep controller/focus ownership in the widget layer;
- send text values/events into application state;
- store domain text state independently from framework controllers.

Move a controller outside the widget only when its lifecycle is explicitly owned and UI coupling is intentional.

## Network clients

Creating a fresh `HttpClient`/client per tiny call can lose connection reuse; never leave long-lived clients unclosed when the API requires closure. Conversely, do not close a shared injected client from an individual repository method.

Define client ownership at app/service scope.

## Timers and debounce

A debounce timer must be canceled when superseded and when the owning scope ends.

```dart
Timer? _debounce;

void onQueryChanged(String query) {
  _debounce?.cancel();
  _debounce = Timer(const Duration(milliseconds: 300), () {
    search(query);
  });
}

void disposeDebounce() => _debounce?.cancel();
```

For complex reactive pipelines, a stream/state library operator may express cancellation more safely than hand-managed timers.

## Animation controllers

- create with a valid ticker provider;
- dispose exactly once;
- avoid starting an animation from `build()`;
- prefer implicit animation widgets when they express the transition and no custom controller coordination is required.

## Verification recipes

### Leak check

1. Open/close the feature repeatedly.
2. Trigger controllers/subscriptions/timers.
3. Leave the route.
4. Confirm no callbacks/logs/state writes continue.
5. Inspect memory/allocation behavior if symptoms persist.

### Race check

1. Start async work.
2. Navigate away immediately.
3. Re-open the feature.
4. Complete old/new operations out of order.
5. Verify stale completion cannot overwrite newer state.

---

# File: `references/modernization-and-legacy.md`

# Modernization, Legacy, Deprecated, and Suspicious Advice

Validation baseline: current Flutter/Dart official API/documentation available in August 2026. Package-specific advice still requires the consuming project's actual dependency versions.

| Source idea | Status | Modern treatment |
|---|---|---|
| `dart:html` / old web DOM APIs | **Deprecated** | Use `package:web` + `dart:js_interop`; prefer `dart.library.js_interop` for modern conditional web imports. |
| Dart `JsonCodable` macros experiment | **Legacy / abandoned experiment** | Do not use old macro experiment; use supported serializers/codegen/manual parsing/current language features. |
| `Matrix4.translate`, `scale`, `scaled` dynamic overloads | **Deprecated** | Use typed `translateByDouble/Vector*`, `scaleByDouble/Vector*`, `scaledBy*` APIs as appropriate. |
| `Color.withOpacity` | **Deprecated** | Use `color.withValues(alpha: value)` to avoid precision-loss deprecation. |
| `WillPopScope` | **Deprecated** | Use `PopScope` / current predictive-back-compatible APIs. |
| `IntrinsicWidth` as general replacement for fixed width | **Situational** | Preserve responsive intent, but prefer constraints/flex first; intrinsic layout is relatively expensive. |
| `MediaQuery.of(context)` for one property | **Situational** | Prefer aspect methods such as `MediaQuery.sizeOf`, `paddingOf`, etc. |
| `debugPrint` assumed debug-only | **Avoid assumption** | It can log in release; gate debug logs and use production logging/privacy policy. |
| Raw `dart:io HttpClient` snippets as generic Flutter networking | **Situational / platform-specific** | Native-only; define ownership/close behavior. Prefer a portable injectable client abstraction when cross-platform/testability matters. |
| `compute` as generic async/background solution | **Situational** | Use for measured CPU-heavy work; on web it runs on current event loop. Ordinary async I/O does not need an isolate. |
| “Replace `Container` with nested widgets” as blanket optimization | **Situational** | Do it for semantic clarity or measured hot-path reasons, not style dogma. |
| Hand-rolled `compactMap`, ranges, tuples, enum classes | **Situational / often legacy** | Re-check modern Dart records, patterns, enhanced enums, null-aware collections, standard methods/packages. |
| Custom `+`/`-` collection operators | **Situational** | Use only when semantics are obvious and repeated; prefer standard operations for public/team code. |
| Reflection (`dart:mirrors`) for object descriptions | **Legacy/VM-specific** | Not a normal Flutter cross-platform technique; use explicit/generated diagnostics/serialization. |
| Riverpod pre-generator/provider APIs from 2022 | **Needs verification** | Preserve state/ownership idea, then check installed Riverpod version/current docs. |
| Flutter Hooks examples | **Needs verification** | Package-specific; only apply in projects using Hooks and current APIs. |
| Firebase snippets from 2022 | **Needs verification** | Verify current FlutterFire/Firebase SDK, security rules, platform config. |
| Store/build scripts, Gradle/Xcode/Fastlane/Codemagic tips | **Needs verification** | Toolchain/store rules are volatile; use current vendor docs. |
| `ThemeData.platform` as platform-detection mechanism | **Avoid for capability logic** | Useful for theming/tests. Use correct platform/capability APIs for behavior. |
| Connectivity status == internet available | **Avoid** | Connectivity is a hint; real requests still need timeout/error handling. |
| Catch error and return empty stream/list universally | **Avoid** | Only if domain semantics define that recovery; otherwise surface/translate the failure. |
| Infinite retry helpers | **Avoid** | Bound retries, classify errors, honor cancellation/idempotency. |
| `shrinkWrap: true` to fix any nested scroll issue | **Situational** | Fine for small bounded content; for large content prefer unified slivers/constraints. |

## Modern APIs worth preferring

### MediaQuery aspect access

```dart
final size = MediaQuery.sizeOf(context);
final padding = MediaQuery.paddingOf(context);
```

### Color alpha

```dart
final translucent = color.withValues(alpha: 0.5);
```

### Predictive back

```dart
PopScope(
  canPop: canLeave,
  child: child,
)
```

Use the current callback variant required by the project's Flutter SDK if handling pop results; verify signature before copying version-specific code.

### Modern web import direction

```dart
import 'package:web/web.dart' as web;
```

Interop details differ from `dart:html`; follow Dart's migration guide rather than search/replace alone.

## Suspicious convenience tips requiring judgment

The corpus intentionally explores Dart expressiveness. Treat these as educational, not default architecture:

- throwing enums;
- generic “anything to int” conversions;
- XOR swaps;
- custom integer subclasses/types for arithmetic tricks;
- dynamic function invocation/noSuchMethod-style patterns;
- recursive deep map dot notation;
- URL shorteners/network status probes embedded directly in app code;
- bespoke stream operators that duplicate established package/core behavior.

Use only when the project has a concrete need and the behavior is obvious/tested.

---

# File: `references/performance.md`

# Performance Playbook

## Principle: measure in profile mode

Debug mode includes assertions, instrumentation, and compilation/runtime characteristics that invalidate many timing conclusions.

Before optimizing, identify the bottleneck category:

- build/layout;
- raster/painting/compositing;
- CPU computation;
- memory/GC;
- image decode/cache;
- I/O/network;
- startup;
- binary/build size.

## High-value structural checks

### 1. Heavy work in build

Look for parsing, sorting large collections, regex work, JSON decode, synchronous file operations, object graph construction, requests, logging loops.

Move expensive stable work out; compute derived values closer to source/state updates when appropriate.

### 2. Rebuild scope

- localize state changes;
- extract stable children;
- use const constructors naturally;
- use selector mechanisms if a broad listener is proven costly;
- avoid overriding widget equality as a rebuild hack.

### 3. Lazy scrolling

Prefer builders/slivers for large data. Provide `itemCount` when known. Avoid building offscreen expensive widgets eagerly.

### 4. Intrinsic layout

`IntrinsicWidth`/`IntrinsicHeight` add speculative layout. Avoid in deep/repeated trees where constraints can solve the same problem.

### 5. `shrinkWrap`

`shrinkWrap` is often necessary for small nested content, but can make scroll views measure more content. Prefer a unified sliver scroll structure for large dynamic pages.

### 6. Images

- avoid decoding huge images for tiny thumbnails;
- use cache dimensions/appropriate variants where available;
- investigate oversized-image diagnostics;
- pre-cache only when it improves a real interaction and does not explode memory.

### 7. Opacity/saveLayer/compositing

Fractional opacity and some effects can require offscreen buffers. Avoid wrapping a single image/color in `Opacity` when direct alpha is equivalent.

### 8. CPU isolates

Offload work that takes enough milliseconds to threaten frames. Do not offload tiny computations just because isolates sound faster.

### 9. Allocation

Do not allocate controllers, futures, streams, regexes, large lists/maps, or expensive immutable objects repeatedly in `build` when they can safely be stable.

But ordinary small widget objects are expected; do not prematurely cache every widget.

## Const guidance

Official Flutter performance guidance recommends const constructors when possible because stable identical widget instances can short-circuit traversal work.

Use lints to catch easy opportunities. Avoid cargo-cult claims such as “const prevents all rebuilds.” Parents can rebuild; const mainly gives stable canonical widget instances and reduces work when the framework reaches the same instance.

## MediaQuery specificity

Prefer aspect methods (`sizeOf`, `paddingOf`, etc.) over `MediaQuery.of` when only one field is needed, reducing rebuilds caused by unrelated media changes.

## Profiling workflow

1. Define scenario and device.
2. Run profile build.
3. Record timeline with DevTools.
4. Identify UI/raster spikes.
5. Toggle rebuild/repaint diagnostics if relevant.
6. Inspect CPU profile for expensive Dart work.
7. Inspect memory when leaks/GC suspected.
8. Inspect image/network views where relevant.
9. Apply one change.
10. Re-run the same trace and compare.

## Performance anti-patterns from tip culture

### “Replace `Container` with nested widgets for performance”

Treat as **Maintainability/Situational**, not a universal optimization. `Container` is a convenience widget that composes primitives; replace it when doing so clarifies intent or avoids unnecessary behavior in a hot path proven by profiling, not as a blanket style rule.

### “Use IntrinsicWidth, not fixed width”

The responsiveness intent is correct, but intrinsic sizing is not free. Prefer constraints/flex first.

### “Move everything to compute/isolate”

Wrong. Transfer/spawn overhead and web behavior matter.

### “Use const everywhere”

Prefer it where natural. Do not redesign runtime values around artificial const-ness.

## Verification metrics

Depending on the issue, compare:

- frame build/raster time;
- missed/janky frames;
- CPU samples;
- allocation/memory growth;
- image memory;
- startup duration;
- request count/data transfer;
- number/scope of rebuilds/repaints.

---

# File: `references/platform-tooling-security.md`

# Platform, Tooling, Build, Release, Security

## Platform detection

Prefer capability/design checks over platform checks when possible.

When platform branching is required:

- `kIsWeb` distinguishes web compilation;
- `defaultTargetPlatform` describes Flutter target platform semantics and can be overridden in tests/themes;
- `Platform` from `dart:io` is unavailable on web;
- conditional imports isolate platform-specific APIs cleanly.

Do not import `dart:io` into code that must compile for web unless guarded by separate conditional libraries.

## Web interop modernization

Legacy `dart:html`-based tips are **Deprecated/Legacy** for new code.

Use `package:web` and `dart:js_interop` for current browser/JS APIs. For conditional imports, current Dart guidance uses `dart.library.js_interop` rather than `dart.library.html` when targeting modern web interop/Wasm compatibility.

## Configuration vs secrets

`--dart-define`, `--dart-define-from-file`, environment files, assets, and compile-time environment getters are excellent configuration mechanisms.

They are **not** secure storage for privileged secrets in a mobile/web client.

Safe examples may include:

- API base URL;
- flavor name;
- client/public project identifier;
- feature/build toggle whose disclosure is acceptable.

Server-only examples:

- OpenAI/server API secret;
- Stripe secret key;
- Firebase Admin/service credentials;
- Supabase service-role key;
- private signing/admin secrets.

## Feature/release toggles

Compile-time toggles are useful when a feature must be removed/selected per build. Remote config is useful when product behavior must change after release.

Remote config needs defaults, fetch/activate failure handling, and safe rollout semantics. Never make startup depend indefinitely on a remote config fetch.

## Flavors

Use flavors when builds differ in bundle IDs, Firebase projects, endpoints, assets, names/icons, signing, or build-time behavior.

Keep flavor selection explicit and test each supported build. Avoid scattering flavor `if` statements throughout features; centralize configuration.

## Firebase configuration

Repository tips cover FlutterFire CLI/multiple flavors. These are highly version-sensitive. Always verify current FlutterFire docs/CLI output before copying scripts.

## API clients

For portable HTTP client code, prefer a package/client abstraction that supports the target platforms and test injection. Raw `dart:io HttpClient` is native-only and lower-level.

Set intentional timeout/retry/cancellation policies. Validate TLS using platform/client-supported trust mechanisms; do not disable certificate validation in production.

## Connectivity

A connectivity signal does not prove internet reachability or backend availability. Treat network-status packages as hints for UX, not as authorization to skip real request error handling.

## Deep/universal links

Test:

- cold start;
- warm/background app;
- authenticated/unauthenticated redirects;
- malformed/unknown links;
- web history/back behavior;
- platform association files/config.

Do not put sensitive tokens in URLs without understanding logs/history/referrers.

## Release/build tooling

Source tips include Xcode, Android Gradle, Fastlane, Codemagic, screenshot automation, App Store compliance, privacy manifests, source-map upload, self-hosted runners.

Classify all such tips **Needs verification** unless current tool/vendor documentation is checked, because build systems and store requirements change frequently.

## Generated code

- use build_runner/watch mode when appropriate;
- generated files can be marked `linguist-generated` for GitHub review readability;
- control generator ordering only using supported builder configuration;
- never manually edit generated output unless the generator explicitly expects it.

## Logging and privacy

Release logs must avoid:

- auth tokens;
- passwords;
- medical/financial/private user data;
- full request/response bodies containing sensitive fields;
- server secrets.

Debug logging should still be treated cautiously because debug artifacts can be shared.

## Force update

Remote force-update mechanisms are risky:

- cache last-known-good config;
- tolerate config outage;
- support minimum vs recommended version semantics;
- avoid accidentally locking every user out;
- test rollback before release.

---

# File: `references/source-map.md`

# Source Traceability Map

The repository READMEs were used as corpus indexes, and representative/high-impact source files were inspected for semantics. This map records the strongest normalized production rules. Many source tips are visual micro-recipes; those are represented by domain rather than duplicated one-row-per-screenshot.

Statuses reflect the normalized rule, not necessarily the source author's original label.

| Normalized rule / topic | Repository | Source path | Skill area | Status |
|---|---|---|---|---|
| Build must avoid side effects/heavy work | bizz84 | `tips/0170-build-method-do-dont/index.md` | Widgets / Performance | Preferred |
| Dispose owned controllers | bizz84 | `tips/0168-dispose-to-avoid-memory-leaks/index.md` | Lifecycle | Preferred |
| Async BuildContext safety | bizz84 | `tips/0060-build-context-async-gaps/index.md` | Widgets / Correctness | Preferred |
| `context.mounted` | bizz84 | `tips/0090-context-mounted/index.md` | Widgets / Correctness | Preferred |
| Lazy large lists | vandadnp | `tipsandtricks/infinite-listview-in-flutter/infinite-listview-in-flutter.md` | Lists / Performance | Preferred |
| Paginated ListView | vandadnp | `tipsandtricks/paginated-listview-in-flutter/paginated-listview-in-flutter.md` | Lists | Situational |
| Infinite scrolling | vandadnp | `tipsandtricks/infinite-scrolling-in-flutter/infinite-scrolling-in-flutter.md` | Lists | Situational |
| Scroll-to-index | bizz84 | `tips/0151-scroll-to-index/index.md` | Lists | Situational |
| Reorder list items | vandadnp | `tipsandtricks/reordering-items-inside-list-views-in-flutter/reordering-items-inside-list-views-in-flutter.md` | Lists | Situational |
| `CustomScrollView` / sliver composition | vandadnp | `tipsandtricks/custom-scroll-views-in-flutter/custom-scroll-views-in-flutter.md` | Lists / Layout | Preferred when complex scrolling |
| Constraint-based layout | vandadnp | `tipsandtricks/placing-constraints-on-widgets-in-flutter/placing-constraints-on-widgets-in-flutter.md` | Layout | Preferred |
| Proportional constraints | vandadnp | `tipsandtricks/proportional-constraints-in-flutter/proportional-constraints-in-flutter.md` | Layout | Situational |
| Aspect ratio | vandadnp | `tipsandtricks/aspect-ratio-in-flutter/aspect-ratio-in-flutter.md` | Layout | Preferred when ratio is semantic |
| FractionallySizedBox with Stack | bizz84 | `tips/0221-stack-fractionally-sized-box/index.md` | Layout | Situational |
| Intrinsic width vs fixed text width | bizz84 | `tips/0136-intrinsic-width/index.md` | Layout | Situational; expensive |
| Native Row/Column spacing | bizz84 | `tips/0216-spacing-row-column/index.md` | Layout | Preferred on supported SDK |
| `OverflowBar` | bizz84 | `tips/0179-overflowbar-widget/index.md` | Layout | Situational |
| Reusable widgets | bizz84 | `tips/0145-build-reusable-widgets/index.md` | Composition | Preferred with judgment |
| Composition aggressively | bizz84 | `tips/0032-flutter-tip-use-composition-aggressively/index.md` | Composition | Preferred with overengineering guard |
| Replace Container with primitives | bizz84 | `tips/0135-replace-container-nested-widgets/index.md` | Composition / Perf | Situational |
| Specific MediaQuery dependencies | bizz84 | `tips/0108-media-query-inherited-model/index.md` | Widgets / Perf | Preferred modernized |
| Responsive split view | bizz84 | `tips/0001-flutter-reusable-split-view-on-mobile-desktop-and-web/index.md` | Responsive UI | Situational |
| Responsive layout with SizedBox/Center | bizz84 | `tips/0013-responsive-flutter-card-layout-with-sizedbox-center/index.md` | Responsive UI | Situational |
| AnimatedContainer | bizz84 | `tips/0077-animatedcontainer/index.md` | Animation | Preferred for simple implicit animation |
| Animated containers | vandadnp | `tipsandtricks/animated-containers-in-flutter/animated-containers-in-flutter.md` | Animation | Preferred for simple transitions |
| Fade between widgets | vandadnp | `tipsandtricks/fade-between-widgets-in-flutter/fade-between-widgets-in-flutter.md` | Animation | Situational |
| SlideTransition | vandadnp | `tipsandtricks/slidetransition-in-flutter/slidetransition-in-flutter.md` | Animation | Situational |
| Animated lists | vandadnp | `tipsandtricks/animated-lists-in-flutter/animated-lists-in-flutter.md` | Animation / Lists | Situational |
| Image aspect ratio | vandadnp | `tipsandtricks/image-aspect-ratio-in-flutter/image-aspect-ratio-in-flutter.md` | Images | Preferred |
| Image opacity | vandadnp | `tipsandtricks/image-opacity-in-flutter/image-opacity-in-flutter.md` | Rendering | Modernize to direct alpha when possible |
| Transparent image opacity | bizz84 | `tips/0169-transparent-images-with-opacity/index.md` | Rendering | Preferred concept |
| Preload SVG | bizz84 | `tips/0150-preload-svgs/index.md` | Images / Perf | Situational; measure |
| Vector graphics compiler | bizz84 | `tips/0161-vector-graphics-compiler/index.md` | Assets / Perf | Needs package verification |
| Highlight oversized images | bizz84 | `tips/0132-highlight-oversized-images/index.md` | Debugging / Perf | Preferred diagnostic |
| Repaint rainbow | bizz84 | `tips/0245-debug-repaint-rainbow-enabled/index.md` | Debugging | Preferred diagnostic |
| DevTools rebuild stats | bizz84 | `tips/0182-devtools-performance-rebuild-stats/index.md` | Performance | Preferred diagnostic |
| DevTools performance/jank | bizz84 | `tips/0005-use-the-devtools-to-identify-jank-and-shader-compilation-issues/index.md` | Performance | Preferred |
| Debug paint | bizz84 | `tips/0134-debug-paint-size/index.md` | Debugging | Preferred diagnostic |
| Widget Inspector | bizz84 | `tips/0031-how-to-use-the-flutter-widget-inspector/index.md` | Debugging | Preferred |
| DevTools Network | bizz84 | `tips/0118-network-view-devtools/index.md` | Debugging | Preferred |
| DevTools Logging | bizz84 | `tips/0188-flutter-devtools-logging-page/index.md` | Debugging | Preferred |
| `debugFillProperties` | bizz84 | `tips/0225-debug-fill-properties/index.md` | Debugging | Situational |
| `debugPrint` prints in release | bizz84 | `tips/0141-dont-use-debug-print/index.md` | Logging / Security | Preferred warning |
| `dart:developer.log` arguments | bizz84 | `tips/0177-log-function-args/index.md` | Logging | Preferred diagnostic |
| Unawaited analytics | bizz84 | `tips/0176-use-unawaited-analytics-calls/index.md` | Async | Situational |
| await vs unawaited vs ignore | bizz84 | `tips/0178-await-vs-unawaited-vs-ignore/index.md` | Async | Preferred mental model |
| Unawaited and ignore | vandadnp | `tipsandtricks/unawaited-and-ignore-in-dart/unawaited-and-ignore-in-dart.md` | Async | Preferred mental model |
| Future.wait | bizz84 | `tips/0080-future.wait/index.md` | Async | Preferred when independent |
| Wait multiple futures | vandadnp | `tipsandtricks/waiting-for-multiple-futures-in-dart/waiting-for-multiple-futures-in-dart.md` | Async | Preferred when independent |
| Return Future without needless async/await | bizz84 | `tips/0106-return-no-await/index.md` | Async / Dart | Preferred when transparent |
| API cleanup | vandadnp | `tipsandtricks/async-api-cleanup-in-flutter/async-api-cleanup-in-flutter.dart` | Async / Resources | Intent preferred; modernize implementation |
| Cancelable API | vandadnp | `tipsandtricks/cancelable-apis-in-flutter/cancelable-apis-in-flutter.dart` | Async / Cancellation | Situational; underlying work matters |
| Dio CancelToken + Riverpod | bizz84 | `tips/0172-dio-cancel-token-riverpod/index.md` | Cancellation | Package-specific |
| Debouncing with Timer | bizz84 | `tips/0156-debouncing-timer/index.md` | Async / Input | Preferred simple case |
| Debouncing streams | vandadnp | `tipsandtricks/debouncing-streams-in-flutter/debouncing-streams-in-flutter.md` | Streams | Situational |
| Throttling user input | vandadnp | `tipsandtricks/throttling-user-input-in-flutter/throttling-user-input-in-flutter.md` | Async / Input | Situational |
| Stream timeout between events | vandadnp | `tipsandtricks/stream-timeout-between-events-in-flutter/stream-timeout-between-events-in-flutter.md` | Streams | Situational |
| StreamQueue | vandadnp | `tipsandtricks/streamqueue-in-flutter/streamqueue-in-flutter.md` | Streams | Situational |
| Stream controller sink | vandadnp | `tipsandtricks/streamcontroller-sink-in-flutter/streamcontroller-sink-in-flutter.md` | Streams | Situational |
| Stream error recovery | vandadnp | `tipsandtricks/recovering-stream-errors-in-flutter/recovering-stream-errors-in-flutter.md` | Streams / Reliability | Situational |
| Absorb stream errors | vandadnp | `tipsandtricks/absorb-stream-errors-in-flutter/absorb-stream-errors-in-flutter.md` | Streams | Avoid as blanket behavior |
| `compute` | vandadnp | `tipsandtricks/compute-in-flutter/compute-in-flutter.dart` | Performance / Isolates | Situational; CPU-heavy only |
| Result type | vandadnp | `tipsandtricks/result-type-in-dart/result-type-in-dart.md` | Error handling | Situational / preferred boundary pattern |
| try/catch vs Result | bizz84 | `tips/0062-try-catch-result-type/index.md` | Error handling | Preferred mental model |
| Errors vs Exceptions | bizz84 | `tips/0061-flutter-errors-vs-exceptions/index.md` | Error handling | Preferred mental model |
| Error.throwWithStackTrace | bizz84 | `tips/0205-throw-error-with-stack-trace/index.md` | Error handling | Situational / preferred when translating |
| Capture stack trace | vandadnp | `tipsandtricks/capturing-stack-traces-in-dart-exceptions/capturing-stack-traces-in-dart-exceptions.md` | Error handling | Preferred |
| `rethrow` | vandadnp | `tipsandtricks/rethrowing-exceptions-in-dart/rethrowing-exceptions-in-dart.md` | Error handling | Preferred |
| Error handling at startup | bizz84 | `tips/0128-error-handling-app-startup/index.md` | Reliability | Preferred |
| Async dependency initialization | bizz84 | `tips/0131-future-provider-require-value/index.md` | Initialization | Package-specific; concept preferred |
| Architecture rules | bizz84 | `tips/0037-rules-to-follow-for-good-app-architecture/index.md` | Architecture | Preferred with judgment |
| Architecture comparison | bizz84 | `tips/0038-popular-architectures-for-flutter-development/index.md` | Architecture | Situational |
| Feature-first vs layer-first | bizz84 | `tips/0039-flutter-project-structure-feature-first-or-layer-first/index.md` | Architecture | Situational |
| Repository interfaces | bizz84 | `tips/0021-repositories-as-abstract-classes/index.md` | Architecture / Testing | Preferred when seam justified |
| Backend-agnostic apps | bizz84 | `tips/0101-backend-agnostic/index.md` | Architecture | Preferred at deliberate boundaries |
| Singleton drawbacks | bizz84 | `tips/0057-singletons-flutter/index.md` | Architecture | Preferred warning |
| Global variables | bizz84 | `tips/0117-are-global-variables-bad/index.md` | Architecture | Situational; mutable hidden state is risk |
| Immutable classes | vandadnp | `tipsandtricks/immutable-classes-in-dart/immutable-classes-in-dart.md` | Dart / State | Preferred |
| Copying Bloc state | vandadnp | `tipsandtricks/copying-bloc-state-in-flutter/copying-bloc-state-in-flutter.md` | State | Package-specific |
| Async Bloc init | vandadnp | `tipsandtricks/async-bloc-init-in-flutter/async-bloc-init-in-flutter.md` | State / Init | Package-specific |
| Riverpod watch/read/listen | bizz84 | `tips/0046-riverpod-difference-between-ref-watch-ref-read-ref-listen/index.md` | State | Needs installed-version verification |
| Riverpod fetch vs mutate | bizz84 | `tips/0121-riverpod-fetch-vs-mutate-data/index.md` | State | Package-specific concept |
| Riverpod stream disposal | vandadnp | `tipsandtricks/riverpod-streamprovider-disposal/riverpod-streamprovider-disposal.md` | Lifecycle / State | Needs installed-version verification |
| ValueNotifier | vandadnp | `tipsandtricks/valuenotifier-in-flutter/valuenotifier-in-flutter.md` | State | Preferred small-state tool |
| Side effects with ValueNotifier | bizz84 | `tips/0230-side-effects-value-notifier/index.md` | State / Effects | Situational |
| WidgetsBindingObserver | bizz84 | `tips/0034-how-to-use-widgetsbindingobserver/index.md` | Lifecycle | Situational |
| GoRouter go vs push | bizz84 | `tips/0036-gorouter-go-vs-push/index.md` | Navigation | Preferred mental model; verify version |
| Navigator observer | bizz84 | `tips/0189-navigator-observer/index.md` | Navigation | Situational |
| GoRouter delegate listener | bizz84 | `tips/0251-go-router-delegate-listener/index.md` | Navigation / Analytics | Needs go_router version verification |
| Universal app links | vandadnp | `tipsandtricks/universal-app-links-in-flutter/universal-app-links-in-flutter.md` | Navigation / Platform | Needs platform verification |
| Route launch argument | bizz84 | `tips/0232-flutter-run-route/index.md` | Tooling / Navigation | Preferred debug tool when supported |
| TextFormField numeric setup | bizz84 | `tips/0244-text-form-field-numeric/index.md` | Forms | Preferred with locale validation |
| TextField validation | bizz84 | `tips/0012-how-to-validate-a-textfield-in-flutter/index.md` | Forms | Preferred |
| Filter TextField input | vandadnp | `tipsandtricks/filtering-textfield-input-in-flutter/filtering-textfield-input-in-flutter.md` | Forms | Situational |
| Focus TextFields | vandadnp | `tipsandtricks/focusing-manually-on-textfields-in-flutter/focusing-manually-on-textfields-in-flutter.md` | Forms / Lifecycle | Situational |
| SelectionArea | bizz84 | `tips/0133-selection-area/index.md` | Accessibility / UX | Preferred when multi-widget selection needed |
| Semantics identifiers | bizz84 | `tips/0237-semantics-identifiers/index.md` | Accessibility / Testing | Preferred for stable UI automation |
| Accessibility tools | bizz84 | `tips/0087-accessibility-tools/index.md` | Accessibility | Package-specific diagnostic |
| Localization | bizz84 | `tips/0070-localizations/index.md` | Localization | Preferred; verify generator APIs |
| Localization delegates | vandadnp | `tipsandtricks/localization-delegates-in-flutter/localization-delegates-in-flutter.md` | Localization | Concept preferred; APIs may be old |
| Adaptive alert dialog | bizz84 | `tips/0248-adaptive-alert-dialog/index.md` | Adaptivity | Situational |
| ThemeData.platform testing | bizz84 | `tips/0249-themedata-platform/index.md` | Testing / Adaptivity | Preferred test lever |
| Conditional imports | bizz84 | `tips/0166-conditional-imports/index.md` | Platform | Preferred; modernize web condition |
| defaultTargetPlatform + kIsWeb | bizz84 | `tips/0165-default-target-platform/index.md` | Platform | Preferred when platform check is required |
| kIsWeb | bizz84 | `tips/0065-kIsWeb/index.md` | Platform | Preferred |
| dart:html external URL redirect | bizz84 | `tips/0120-set-html-window-url/index.md` | Web | Legacy; migrate package:web |
| API keys client/server | bizz84 | `tips/0208-api-keys-client-server/index.md` | Security | Preferred |
| dart-define from files | bizz84 | `tips/0175-dart-define-from-file-env-json/index.md` | Config | Preferred config, not secrets |
| API key JSON/dart-define | bizz84 | `tips/0102-dart-define-from-file/index.md` | Config / Security | Config only; not secret storage |
| Release toggles | bizz84 | `tips/0241-release-toggles-dart-define/index.md` | Build config | Preferred where compile-time toggle fits |
| int/bool fromEnvironment | bizz84 | `tips/0240-int-bool-from-environment/index.md` | Build config | Preferred |
| Flavors | bizz84 | `tips/0142-flutter-run-flavor/index.md` | Build | Preferred concept |
| Flavor-specific assets | bizz84 | `tips/0147-bundle-assets-based-on-flavor/index.md` | Build | Needs SDK verification |
| Firebase multiple flavors | bizz84 | `tips/0201-firebase-init-multiple-flavors/index.md` | Firebase / Build | Needs FlutterFire verification |
| Remote Config initialization | bizz84 | `tips/0247-firebase-remote-config-init/index.md` | Reliability | Needs Firebase verification |
| Force update with Remote Config | bizz84 | `tips/0199-force-update-helper/index.md` | Reliability | Situational / risky |
| Force upgrade failure lesson | bizz84 | `tips/0157-force-upgrade-gone-wrong/index.md` | Reliability | Preferred caution |
| Firestore transactions | vandadnp | `tipsandtricks/firestore-transactions-in-flutter/firestore-transactions-in-flutter.md` | Persistence | Needs Firebase verification |
| Firebase batch operations | vandadnp | `tipsandtricks/firebase-batch-operations-in-flutter/firebase-batch-operations-in-flutter.md` | Persistence | Needs Firebase verification |
| Server timestamp | bizz84 | `tips/0089-server-timestamp/index.md` | Persistence | Needs Firebase verification |
| Security Rules Playground | bizz84 | `tips/0100-security-rules-playground/index.md` | Security / Firebase | Preferred tool, vendor-specific |
| Fake repositories for tests | bizz84 | `tips/0041-using-fake-repositories-for-testing/index.md` | Testing | Preferred |
| Testing functions that throw | bizz84 | `tips/0048-testing-functions-that-throw/index.md` | Testing | Preferred |
| Test tags | bizz84 | `tips/0058-using-test-tags/index.md` | Testing | Situational |
| Test variants | bizz84 | `tips/0055-run-multiple-test-variants/index.md` | Testing | Situational |
| Custom test timeout | bizz84 | `tips/0052-custom-test-timeout/index.md` | Testing | Situational; don't mask hangs |
| Golden/robot testing | bizz84 | `tips/0051-golden-image-testing-with-robot-testing/index.md` | Testing | Situational |
| CI tests | bizz84 | `tips/0026-running-tests-with-github-actions/index.md` | CI | Preferred concept |
| `dart fix --apply` | bizz84 | `tips/0091-dart-fix-apply/index.md` | Tooling | Preferred after review |
| Flutter lints | bizz84 | `tips/0004-flutter-lints-package/index.md` | Tooling | Preferred |
| `build_runner` watch | bizz84 | `tips/0075-build-runner-watch/index.md` | Tooling | Situational |
| Dart 3.8 null-aware elements | bizz84 | `tips/0252-null-aware-elements-dart-3.8/index.md` | Dart | Preferred on supported language version |
| Dart 3.7 wildcard variables | bizz84 | `tips/0228-wildcard-variables-dart-3.7/index.md` | Dart | Preferred on supported version |
| Dart records equality | bizz84 | `tips/0109-records-equality/index.md` | Dart | Preferred |
| Dart list destructuring | bizz84 | `tips/0111-destructure-lists-dart/index.md` | Dart | Preferred when clearer |
| Dart conditional JSON parsing | bizz84 | `tips/0113-conditional-json-parsing/index.md` | Dart / Parsing | Preferred when clearer |
| Enhanced enums | bizz84 | `tips/0050-dart-2-17-enhanced-enums-with-members/index.md` | Dart | Preferred modern feature |
| Type aliases | bizz84 | `tips/0073-enhance-readability-with-typdef/index.md` | Dart | Situational |
| Object.hash | vandadnp | `tipsandtricks/object-hash-in-dart/object-hash-in-dart.md` | Dart / Equality | Preferred |
| Factory constructors | vandadnp | `tipsandtricks/factory-constructors-in-dart/factory-constructors-in-dart.md` | Dart | Preferred when semantics fit |
| Custom collection operators | vandadnp | `tipsandtricks/iterable-plus-minus-in-dart/iterable-plus-minus-in-dart.md` | Dart | Situational |
| CompactMap custom helpers | vandadnp | `tipsandtricks/iterable-compactmap-in-dart/iterable-compactmap-in-dart.md` | Dart | Situational |
| Reflection object description | vandadnp | `tipsandtricks/dart-object-description-using-reflection/dart-object-description-using-reflection.md` | Dart | Legacy/VM-specific |
| Experimental JsonCodable macros | bizz84 | `tips/0160-dart-macros-json-codable/index.md` | Dart | Legacy/abandoned experiment |
| Matrix4 deprecated APIs | bizz84 | `tips/0255-matrix4-vector3/index.md` | Rendering / Dart | Deprecated old methods; use typed replacements |
| Color API deprecations | bizz84 | `tips/0219-color-deprecations-flutter-3.27/index.md` | Rendering | Modern replacement required |

---

# File: `references/taxonomy.md`

# Knowledge Taxonomy

This taxonomy normalizes the two source repositories into production-oriented domains. The repositories include far more UI micro-recipes than belong in `SKILL.md`; those are grouped here by the engineering decision they support.

## 1. Dart Language and Type System

- `const`, `final`, inference, explicit annotations, type aliases.
- Null safety, promotion, optional chaining, null-aware spread/elements.
- Functions as first-class values, tear-offs, optional callbacks, callable classes.
- Constructors, factory constructors, initializer lists, abstract-class constructors.
- Enums/enhanced enums, records, patterns, destructuring, switch expressions.
- Generics, covariance, `Comparable`, equality/hash, `Object.hash`.
- Mixins, implicit interfaces, extension methods/types.
- Annotations such as `@mustCallSuper` / `@useResult`.
- Reflection/dynamic invocation: generally niche and platform-constrained.

## 2. Collections and Data Transformation

- `map`, `where`, `expand`, `fold`, `reduce`, `single`, indexing/enumeration.
- Map updates/merges/filtering/key-value transforms.
- Set-based deduplication and equality semantics.
- Flattening/nesting/grouping/pagination/rotation/range/zip-like operations.
- JSON parsing and typed conversion.
- Custom iterable/list/map implementations.
- Custom operators (`+`, `-`, subscripts): convenience-only, situational.

## 3. Futures, Async, Streams, Isolates

- `Future.wait`, error propagation, cleanup, retries, timeout.
- `unawaited`, ignored futures, fire-and-forget semantics.
- Stream creation, controllers, sinks, transforms, merging, expansion.
- Debounce/throttle, initial values, stream queues, lazy/periodic streams.
- Cancellation and scope disposal.
- `compute`/isolates for CPU work.
- Async initialization and dependency readiness.

## 4. Widgets, Context, Composition

- Pure/restartable `build()` mental model.
- Reusable widgets vs helper functions.
- `BuildContext` lifecycle and async gaps.
- Inherited data (`MediaQuery`, theme, localization).
- dialogs/snackbars/sheets/tooltips/menus/chips/tiles/buttons.
- adaptive Material/Cupertino behavior.
- `ValueNotifier`, `ChangeNotifier`, Hooks, Bloc, Riverpod examples.

## 5. Layout, Constraints, Scrolling

- parent constraints → child size → parent position mental model.
- `Expanded`, `Flexible`, `SizedBox`, `ConstrainedBox`, `LimitedBox`.
- `AspectRatio`, `FractionallySizedBox`, `LayoutBuilder`, orientation/responsiveness.
- `Row`/`Column` spacing, `Wrap`, `OverflowBar`.
- `ListView`, `GridView`, slivers, pagination, infinite scrolling.
- scroll controllers, scroll-to-index, reordering, dismissing.
- `IntrinsicWidth`: useful but expensive; situational.

## 6. Rendering, Images, Painting, Animation

- image sizing, aspect ratio, tint, opacity, retry/loading frames, preloading.
- oversized image diagnostics and asset compilation.
- gradients, shadows, clipping, custom painters/paths, blur/frost/vignette.
- `Opacity` and offscreen compositing costs.
- implicit animations, transition widgets, animation controllers.
- animated lists/icons/position/opacity/shadows.
- repaint debugging and GPU/jank inspection.

## 7. Forms and Input

- `TextField`/`TextFormField` validation and keyboard configuration.
- numeric input formatters and keyboard type.
- focus ownership/disposal.
- multiline, censoring/password masking, selection behavior.
- autocomplete, toggles, radio/checklist controls.
- debounce/throttle for search/input.

## 8. Accessibility, Localization, Adaptivity

- semantics/identifiers and automated UI tests.
- text selection and text scaling implications.
- localization delegates and generated localization workflow.
- platform-aware/adaptive dialogs and controls.
- `ThemeData.platform` as a test lever, not a production platform detector.

## 9. Navigation and Lifecycle

- Navigator/go_router stack semantics.
- return values from routes/dialogs.
- observers/screen tracking.
- app lifecycle with `WidgetsBindingObserver` or modern lifecycle listeners when appropriate.
- deep/universal links and route-start tooling.
- `BuildContext` safety around navigation.

## 10. Networking, Persistence, Backend

- HTTP requests, status/errors/timeouts, redirects, certificates.
- caching and retry policy.
- local file/assets/temp caching and SQLite examples.
- Firebase/Firestore transactions, batching, server timestamps, queries, security rules.
- repository boundaries and backend-agnostic interfaces.
- webhooks and server responsibilities.

## 11. Error Handling and Reliability

- error vs exception distinctions.
- domain-specific exceptions/result types.
- preserving stack traces (`rethrow`, `Error.throwWithStackTrace`).
- app startup failure handling.
- bounded retry and cleanup.
- force-update/remote-config failure modes.

## 12. Performance and Memory

- lazy list construction.
- minimizing rebuild scope and using stable/const children.
- no side effects/heavy work in build.
- controller/subscription disposal.
- oversized image detection.
- intrinsic layout caution.
- opacity/saveLayer caution.
- CPU profiling and isolate decisions.
- DevTools rebuild/repaint/performance diagnostics.

## 13. Testing, Debugging, Observability

- unit/widget/integration/golden tests.
- fakes and repository interfaces.
- testing throws and async failures.
- tags, variants, timeouts, coverage.
- Semantics identifiers for black-box UI automation.
- DevTools Network, Logging, Performance, Inspector.
- `debugFillProperties`, `dart:developer.log`, repaint rainbow, debug paint.

## 14. Architecture and Maintainability

- feature-first vs layer-first tradeoffs.
- program to interfaces where volatility/testing justify it.
- state ownership and side effects.
- reusable widgets and aggressive composition without fragmentation.
- initialization boundaries.
- avoid global mutable state and singleton coupling.
- preserve project conventions and avoid package-driven architecture churn.

## 15. Platform, Build, Release, Tooling

- flavors and Firebase configuration.
- `--dart-define` / `--dart-define-from-file` as configuration, not secret storage.
- conditional imports and platform detection.
- Web: migrate legacy `dart:html` to `package:web`/JS interop.
- Android Gradle/Kotlin DSL and Xcode tooling (version-sensitive).
- screenshots, Fastlane, CI, source maps, release scripts.
- analyzer/lints, `dart fix`, formatter, build_runner, IDE assists.

---

# File: `references/testing-and-debugging.md`

# Testing, Debugging, DevTools, Observability

## Test by risk

### Unit tests

Best for:

- parsing/validation;
- state reducers/controllers;
- repositories with fakes;
- retry/error logic;
- collection/business algorithms.

### Widget tests

Best for:

- rendering states;
- interactions/navigation intents;
- form validation;
- semantics/accessibility structure;
- responsive/platform variants.

### Integration/UI tests

Best for:

- end-to-end critical flows;
- platform plugins;
- navigation/deep-link behavior;
- screenshot/store flows where needed.

### Golden tests

Useful for stable visual contracts. Avoid making every pixel of rapidly changing product UI a golden burden.

## Testing thrown exceptions

Pass a tear-off/closure to `expect`, rather than invoking the throwing function before the matcher can observe it.

```dart
expect(() => parse('bad'), throwsFormatException);
```

For async failures, await the matcher according to `flutter_test`/`test` APIs.

## Fakes

Repository interfaces can support deterministic fakes without network/storage. Prefer small hand-written fakes for simple contracts; use mocking frameworks when interaction verification or broad interfaces justify them.

## Test variants/tags/timeouts

The corpus contains useful runner/tooling tips. Use them deliberately:

- variants for theme/platform/config matrices;
- tags for selective suites;
- custom timeouts only when a legitimate operation needs them, not to mask hangs.

## Semantics identifiers

Identifiers can make external UI automation more robust than coordinate/text guessing. Keep identifiers stable, meaningful, and not coupled to localized display text.

Do not add identifiers in ways that damage semantic labels for accessibility.

## DevTools route by symptom

### Layout/visual hierarchy
- Widget Inspector
- debug paint/size visualization

### Network
- Network view
- inspect URL/method/status/headers/timing/body where safe

### Logging
- DevTools Logging page
- `dart:developer.log` with names/errors/stacks

### Jank/performance
- Performance timeline
- CPU profiler
- rebuild statistics
- repaint rainbow/debug diagnostics

### Memory/leaks
- Memory view/allocation snapshots
- repeated mount/unmount reproduction

## `debugFillProperties`

Implement for complex reusable widgets/objects when richer inspector diagnostics materially improve debugging.

```dart
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  super.debugFillProperties(properties);
  properties.add(StringProperty('userId', userId));
  properties.add(FlagProperty('loading', value: loading, ifTrue: 'loading'));
}
```

Do not expose secrets/PII through diagnostics.

## Logging

`debugPrint` can log in release mode. Therefore:

- gate debug-only logs with `kDebugMode`/assert as appropriate;
- use a structured logging/crash reporting policy for production;
- never log tokens, passwords, secrets, full sensitive payloads.

`dart:developer.log` is useful for named structured developer events and stack/error attachment, but still needs release/privacy policy.

## Repaint rainbow

Use `debugRepaintRainbowEnabled` to identify repainting regions in debug diagnostics. It tells you *where* repaint occurs, not whether repaint cost is a real user-visible problem.

## CI

Minimum healthy Flutter CI generally includes:

```text
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test
```

Adjust for monorepos/platform packages. Integration/golden tests can run separately by cost/platform.

## Coverage

Coverage is a diagnostic, not a quality score. Use it to find untested critical logic; do not write trivial tests solely to raise percentage.

## Fix tools

- `dart fix --dry-run` before applying broad automated migrations.
- `dart fix --apply` when changes are understood/reviewed.
- formatter/lints are version-sensitive; follow current SDK behavior.

---

# File: `references/validation-sources.md`

# Current Flutter/Dart Validation Sources

Validation date: **2026-08-15**.

These official sources are the modernization authority for rules in this skill. Repository tips remain valuable source material, but current Flutter/Dart documentation wins when they conflict.

## Flutter framework and API

| Topic | Official source | Why it matters |
|---|---|---|
| `BuildContext` after async gaps | https://api.flutter.dev/flutter/widgets/BuildContext/mounted.html | Requires a mounted check before interacting with a context after an asynchronous gap. |
| `BuildContext` lifetime | https://api.flutter.dev/flutter/widgets/BuildContext-class.html | Reinforces that context-derived values are tied to the element tree and should not be retained casually. |
| `FutureBuilder` lifecycle | https://api.flutter.dev/flutter/widgets/FutureBuilder-class.html | Futures should be obtained before `build`, not created as a side effect of rebuilding. |
| Lazy lists | https://api.flutter.dev/flutter/widgets/ListView-class.html | Distinguishes eager child lists from builder-based lazy construction. |
| Intrinsic measurement | https://api.flutter.dev/flutter/widgets/IntrinsicWidth-class.html | Documents the extra speculative layout pass and potential O(N²) behavior. |
| Aspect-specific media queries | https://api.flutter.dev/flutter/widgets/MediaQuery/sizeOf.html | Supports narrower rebuild dependencies when only size is needed. |
| Predictive-back migration | https://api.flutter.dev/flutter/widgets/WillPopScope-class.html | `WillPopScope` is deprecated; use `PopScope` for modern back-navigation behavior. |
| Color alpha API | https://api.flutter.dev/flutter/dart-ui/Color/withOpacity.html | `withOpacity` is deprecated in favor of `withValues` to avoid precision loss. |
| Modern color mutation | https://api.flutter.dev/flutter/dart-ui/Color/withValues.html | Current replacement for changing alpha/components. |
| Matrix4 translation | https://api.flutter.dev/flutter/package-vector_math_vector_math/Matrix4/translate.html | Dynamic translation API is deprecated; typed variants are preferred. |
| Matrix4 scaling | https://api.flutter.dev/flutter/package-vector_math_vector_math/Matrix4/scale.html | Dynamic scale API is deprecated; typed variants are preferred. |
| Isolate helper | https://api.flutter.dev/flutter/foundation/compute.html | Defines when `compute` is useful and its web/native execution semantics. |
| Opacity cost | https://api.flutter.dev/flutter/widgets/Opacity-class.html | Documents intermediate-buffer cost and alternatives for images/colors/animation. |
| Debug logging | https://api.flutter.dev/flutter/foundation/debugPrint.html | `debugPrint` can execute in release builds; production logging needs an explicit policy. |
| Performance guidance | https://docs.flutter.dev/perf/best-practices | Source for rebuild localization, `const`, widgets over helper methods, `saveLayer`, and rendering-cost guidance. |

## Dart language and interop

| Topic | Official source | Why it matters |
|---|---|---|
| Modern web interop | https://dart.dev/interop/js-interop/package-web | `package:web` + `dart:js_interop` replace direct `dart:html` usage for modern Dart web code. |
| `dart:html` migration | https://dart.dev/interop/js-interop/package-web | Prevents new code from depending on legacy web libraries that are being removed from the supported direction. |
| Dart macros status | https://dart.dev/resources/dart-3-7 | Dart 3.7 release material records that the earlier experimental macros direction was discontinued. |
| Dart language evolution | https://dart.dev/language | Use current language documentation before preserving custom helpers that newer Dart syntax or standard APIs can replace. |

## Validation policy for agents

1. Prefer the repository rule when it is conceptual and still valid.
2. Prefer official Flutter/Dart documentation for API lifecycle, deprecation, performance characteristics, and platform behavior.
3. For package-specific advice (Riverpod, Dio, Firebase, Hooks, go_router, etc.), verify against that package's current official documentation before editing production code.
4. If a repository tip depends on a version-specific API and current validity is not established, label it **Needs verification against current Flutter/Dart documentation** rather than guessing.
5. Do not modernize syntax mechanically when semantics, platform behavior, or package ownership may have changed.

---

# File: `references/widgets-and-context.md`

# Widgets, BuildContext, State, and Navigation

## Treat `build()` as repeatable rendering

A build method can run frequently and for reasons unrelated to the local widget. It should describe UI from current state, not orchestrate external work.

### Avoid

```dart
Widget build(BuildContext context) {
  analytics.trackScreen('home');
  fetchData();
  return const HomeView();
}
```

### Prefer

Put effects in explicit event/lifecycle/state mechanisms, depending on ownership.

## Future/stream builders

Do not create a new future in `FutureBuilder.future` during `build` unless restarting on every parent rebuild is intentionally part of the behavior.

```dart
class _ProfileState extends State<Profile> {
  late final Future<User> _user;

  @override
  void initState() {
    super.initState();
    _user = widget.repository.loadUser();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: _user,
      builder: (context, snapshot) { ... },
    );
  }
}
```

If dependencies can change, update the future in `didUpdateWidget`/`didChangeDependencies` or, more often, let an application/state layer own the operation.

## BuildContext

A `BuildContext` identifies an element location, not a global service handle.

### Rules

- Do not store `BuildContext` in repositories/services/singletons.
- Do not cache inherited values for arbitrary future use unless the value itself is designed to outlive the context.
- After an `await`, either avoid context use or check `context.mounted` immediately before use.
- Sometimes acquire a durable object before the gap (for example a messenger/navigator state) when that object remains semantically valid for the intended UI.

```dart
onPressed: () async {
  await controller.save();
  if (!context.mounted) return;
  Navigator.of(context).pop();
}
```

## MediaQuery

Prefer aspect-specific accessors such as `MediaQuery.sizeOf(context)` or `paddingOf` when only one property is needed. `MediaQuery.of(context)` subscribes to the entire `MediaQueryData` and can rebuild for unrelated changes.

Do not use screen width alone as a proxy for every adaptive decision. Prefer constraints at the component's actual layout boundary (`LayoutBuilder`) when parent space matters.

## Composition

The source corpus correctly emphasizes composition, but “extract everything” is not the goal.

Extract a widget when it has one or more of:

- meaningful UI responsibility/name;
- reusable configuration;
- separate rebuild/state boundary;
- non-trivial layout/testing behavior;
- useful `const` construction.

Keep a tiny local builder/helper when a new class would reduce readability.

## Stateful vs stateless

Use stateful widgets for ephemeral framework/UI state that belongs to the widget lifecycle (controller ownership, animation, local selection). Move business/source-of-truth state out when it must survive widget recreation, coordinate features, or be tested independently.

## ValueNotifier / ChangeNotifier / package state managers

The repositories show `ValueNotifier`, `ChangeNotifier`, Bloc, Hooks, and extensive Riverpod techniques.

Normalize them as follows:

- `ValueNotifier` is excellent for one small value with simple listener semantics.
- `ChangeNotifier` is useful for modest mutable observable state, but can become broad/implicit if overloaded.
- Bloc/Riverpod/Hooks patterns are package-specific. Follow the project's established state-management approach.
- Do not introduce a package because one repository tip uses it.

## Side effects

Effects belong at explicit boundaries:

- user callbacks (`onPressed`, `onTap`, submit/refresh);
- lifecycle hooks with correct ownership;
- state-management listener/effect APIs;
- navigation observers for navigation-level analytics;
- service/repository layers for I/O.

Avoid effects in getters, `build`, equality/hash, or model `toString`.

## Navigation

### Push vs replace/location navigation

For Navigator/go_router, decide whether the user should be able to return to the previous route.

- “push” semantics add a page on top.
- “go/replace location” semantics set a new route location/stack according to router configuration.

Do not choose based on shorter syntax.

### Observers and analytics

Navigator observers/router delegate listeners can support screen tracking, but verify current router APIs and avoid double-reporting redirects/nested navigator changes.

### Async navigation

Guard context after awaits. Also protect against duplicate submits causing two route pushes.

## Dialogs, snackbars, sheets

Reusable wrappers are helpful when they encode app-wide policy (styling, error mapping, adaptivity), not merely to shorten one call.

Return typed values from dialogs/routes rather than mutating remote UI state through hidden globals.

## Pop handling

Older code using `WillPopScope` should be treated as **Deprecated** in current Flutter; use `PopScope` and current predictive-back-compatible APIs.

## Selection and rich text

- `SelectionArea` can enable selection across multiple widgets.
- `SelectableText` remains useful for a single text region.
- `TextSpan`/`RichText` allow mixed styles/recognizers; own/dispose recognizers if you create long-lived recognizer instances.

## Platform/adaptive widgets

Use adaptive Material/Cupertino presentation when it serves product behavior. Test platform branches explicitly. `ThemeData.platform` can help exercise different UI branches in tests; it should not become a substitute for correct capability/platform logic.

---

# File: `examples/anti-patterns.md`

# Anti-Patterns

## 1. Request in build

```dart
// Avoid
Widget build(BuildContext context) {
  repository.refresh();
  return const Body();
}
```

Why: rebuilds can duplicate the request.

## 2. New future on every build

```dart
// Avoid
FutureBuilder<User>(
  future: repository.loadUser(),
  builder: ...,
)
```

Why: parent rebuilds can restart work.

## 3. Stale context

```dart
// Avoid
onPressed: () async {
  await repository.save();
  Navigator.of(context).pop();
}
```

Prefer a mounted check or context-independent effect design.

## 4. Undisposed controllers

```dart
// Avoid
final controller = AnimationController(vsync: this);
// no dispose()
```

## 5. Eager long list

```dart
// Avoid for thousands of rows
ListView(
  children: users.map(UserTile.new).toList(),
)
```

Use a lazy builder when the collection is large.

## 6. Intrinsic sizing in every row

```dart
// Avoid as a default in a long scrolling list
ListView.builder(
  itemBuilder: (_, index) => IntrinsicWidth(
    child: ComplexRow(item: items[index]),
  ),
)
```

First solve the constraints directly; intrinsic layout adds extra work.

## 7. Opacity around a single color/image

```dart
// Avoid when direct alpha is equivalent
Opacity(
  opacity: 0.5,
  child: ColoredBox(color: Colors.blue),
)
```

Prefer a color with alpha.

## 8. Shipping a server secret

```dart
// Avoid
const openAiSecret = String.fromEnvironment('OPENAI_API_KEY');
```

Compile-time configuration is extractable from a client build. Proxy privileged calls through a trusted server.

## 9. Connectivity as truth

```dart
// Avoid
if (await connectivity.isConnected) {
  await api.call(); // assumes backend is reachable
}
```

Always handle the real request result/timeout.

## 10. Swallowing every error

```dart
// Avoid
try {
  return await api.load();
} catch (_) {
  return const [];
}
```

This can turn outages/corruption into believable empty data.

## 11. Clever operator hiding work

```dart
// Avoid unless a project-standard, obvious extension exists
final filtered = users - blockedUsers;
```

Prefer explicit set/filter semantics when readers otherwise need to inspect operator code.

## 12. Global mutable singleton state

```dart
// Avoid
class Session {
  static User? currentUser;
}
```

Hidden global writes complicate tests/lifecycle. Use explicit scoped state/dependencies.

## 13. Infinite retry

```dart
// Avoid
while (true) {
  try {
    return await api.chargeCard();
  } catch (_) {}
}
```

Non-idempotent writes require explicit idempotency/retry policy.

## 14. Old web API in new code

```dart
// Deprecated direction
import 'dart:html';
```

Use modern `package:web` / JS interop guidance.

## 15. Deprecated opacity API

```dart
// Deprecated
final color = Colors.black.withOpacity(0.5);
```

```dart
// Prefer
final color = Colors.black.withValues(alpha: 0.5);
```

---

# File: `examples/good-patterns.md`

# Good Patterns

## 1. Async context safety

```dart
Future<void> saveAndClose(BuildContext context) async {
  await repository.save();
  if (!context.mounted) return;
  Navigator.of(context).pop();
}
```

Why: the element can unmount during `await`.

## 2. Stable FutureBuilder future

```dart
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.repository});
  final UserRepository repository;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late Future<User> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.load();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: _future,
      builder: (context, snapshot) => switch (snapshot) {
        AsyncSnapshot(hasError: true, error: final error) => ErrorView(error: error),
        AsyncSnapshot(hasData: true, data: final user?) => ProfileView(user: user),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}
```

## 3. Resource ownership

```dart
class SearchField extends StatefulWidget {
  const SearchField({super.key, required this.onChanged});
  final ValueChanged<String> onChanged;

  @override
  State<SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<SearchField> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      focusNode: _focusNode,
      onChanged: widget.onChanged,
    );
  }
}
```

## 4. Lazy list

```dart
ListView.separated(
  itemCount: users.length,
  itemBuilder: (context, index) => UserTile(
    key: ValueKey(users[index].id),
    user: users[index],
  ),
  separatorBuilder: (_, __) => const Divider(height: 1),
)
```

## 5. Specific MediaQuery dependency

```dart
final width = MediaQuery.sizeOf(context).width;
```

Why: does not subscribe to every MediaQuery field.

## 6. Direct color alpha

```dart
DecoratedBox(
  decoration: BoxDecoration(
    color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
  ),
  child: child,
)
```

## 7. Typed repository boundary

```dart
abstract interface class ProfileRepository {
  Future<Result<Profile, ProfileFailure>> load(ProfileId id);
}

final class ApiProfileRepository implements ProfileRepository {
  ApiProfileRepository(this._api);
  final ProfileApi _api;

  @override
  Future<Result<Profile, ProfileFailure>> load(ProfileId id) async {
    try {
      final dto = await _api.getProfile(id.value);
      return Success(dto.toDomain());
    } on NotFoundException {
      return const Failure(ProfileFailure.notFound());
    } on NetworkException {
      return const Failure(ProfileFailure.network());
    }
  }
}
```

Use the project's existing Result type rather than introducing a new one just for this pattern.

## 8. Bounded debounce

```dart
class QueryDebouncer {
  QueryDebouncer(this.delay);
  final Duration delay;
  Timer? _timer;

  void run(void Function() action) {
    _timer?.cancel();
    _timer = Timer(delay, action);
  }

  void dispose() => _timer?.cancel();
}
```

## 9. CPU-heavy parsing with compute

```dart
Future<List<Item>> parseItems(String jsonText) {
  return compute(_parseItems, jsonText, debugLabel: 'parse-items');
}

List<Item> _parseItems(String jsonText) {
  final data = jsonDecode(jsonText) as List<dynamic>;
  return [
    for (final value in data)
      Item.fromJson(value as Map<String, dynamic>),
  ];
}
```

Use only after measuring enough parsing cost to justify it; web does not get a separate isolate from `compute`.

## 10. Explicit cleanup

```dart
Future<T> withClient<T>(Future<T> Function(HttpClient client) body) async {
  final client = HttpClient();
  try {
    return await body(client);
  } finally {
    client.close();
  }
}
```

Do not use this helper if the project intentionally shares a long-lived injected client.

---

# File: `QUALITY_AUDIT.md`

# Final Quality Audit

## Coverage

- [x] Both repositories inventoried through their maintained README topic indexes.
- [x] High-impact code/source entries sampled and inspected directly.
- [x] Dart, widgets/context, lifecycle, layout/rendering, async/streams, performance, architecture, testing/debugging, forms/accessibility/localization, platform/tooling/security covered.
- [x] Package-specific ecosystems (Riverpod, Bloc, Hooks, Firebase, Dio) separated from universal rules.

## Deduplication

- [x] Repeated async/context/disposal/list/performance/error topics merged into stronger normalized rules.
- [x] Equivalent Dart collection tricks grouped instead of repeated.
- [x] UI micro-recipes remain discoverable through taxonomy/source map without bloating `SKILL.md`.

## Modernization

- [x] `dart:html` marked deprecated; modern `package:web` direction documented.
- [x] obsolete Dart macros experiment marked legacy/abandoned.
- [x] Matrix4 dynamic transform APIs marked deprecated.
- [x] `Color.withOpacity` marked deprecated.
- [x] `WillPopScope` marked deprecated.
- [x] Intrinsic sizing downgraded to situational due official performance warning.
- [x] MediaQuery aspect-specific accessors preferred.
- [x] `debugPrint` release behavior captured.
- [x] `compute` native vs web behavior captured.

## Agent usability

- [x] Main skill is operational rather than encyclopedic.
- [x] Important rules use Trigger → Diagnosis → Action → Verification.
- [x] Finding priority distinguishes correctness/leaks/security/performance/maintainability/style.
- [x] Explicit overengineering guard included.
- [x] References route by task domain.
- [x] Examples include concise Avoid/Prefer-style patterns.

## Technical caution

- [x] No package-specific API is declared universally current without a verification caveat.
- [x] Performance claims are tied to profiling or official framework behavior.
- [x] Secret/config guidance distinguishes public client identifiers from privileged credentials.
- [x] Error-handling rules avoid swallowing programmer/unexpected failures.
- [x] Cancellation guidance distinguishes ignoring completion from canceling underlying work.

## Traceability

- [x] Source map includes both repositories and concrete paths for major normalized rules.
- [x] Modernization status recorded where source-era advice may be obsolete.
- [x] Repository prose is synthesized rather than copied wholesale.

## Remaining maintenance rule

Before applying any version-sensitive package/tooling rule in a future project, the consuming agent must verify the project's SDK/dependency versions and current official documentation. This is intentional: a static skill should encode durable decision logic, not freeze volatile package syntax.
