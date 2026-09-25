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
