---
name: flutter-production-engineering
description: >-
  Use when writing, debugging, reviewing, refactoring, modernizing, or maintaining
  Dart and Flutter code; investigating rendering, startup, CPU, or memory problems;
  or changing Flutter architecture, reliability, testing, or cross-platform behavior.
metadata:
  category: mobile-development
  framework: flutter
  language: dart
  version: 1.1.0
  researched_on: "2026-10-16"
  validated_local_sdk: "Flutter 3.47.6 stable / Dart 3.13.5"
---

# Flutter Production Engineering

## 1. Purpose and operating principles

Deliver correct, maintainable Flutter/Dart changes with explicit ownership and proportionate verification across Android, iOS, web, Windows, macOS, and Linux. Work within the user's actual platforms and SDK constraints.

Use **Trigger → Diagnose → Choose → Implement → Verify → Stop** for each decision. A working implementation with no demonstrated problem may need no change.

- **MUST** preserve required behavior, public contracts, authorization, data integrity, resource ownership, and accessibility.
- **SHOULD** follow Effective Dart, existing project conventions, and the simplest design that addresses the observed problem.
- **MAY** introduce abstractions, packages, concurrency, caches, or optimizations when their concrete benefit exceeds their maintenance and runtime cost.
- **MUST NOT** represent recommendations as framework requirements, speculative speedups as measurements, or unexecuted checks as passes.

Source precedence: version-relevant official documentation, API contracts/implementation, maintained package documentation, established engineering principles, supplied references, then explicitly labeled engineering judgment. Inspect conflicting rules individually. Research context and unresolved evidence live in [sources](references/sources.md).

## 2. Mandatory project discovery

Before editing, inspect the relevant project instructions and dirty changes, then:

1. Check the pinned toolchain, `pubspec.yaml` SDK constraints and dependencies, and `analysis_options.yaml`. The package's language lower bound can restrict syntax even on a newer installed SDK. Inspect lockfile versions only when dependency behavior matters.
2. Find the affected symbols, direct callers, routes, exports, tests, fixtures, and CI checks. Read their implementations before choosing a change.
3. Identify existing architecture, state management, DI, routing, reusable UI, persistence policy, target platforms, and resource owners. Do not infer packages from example code.
4. Establish current behavior, requested change, error cases, data lifetime, and acceptance criteria. For defects, reproduce or isolate the failing path; for legacy changes, capture uncertain behavior first.
5. State a short plan sized to the task. Identify SDK/API compatibility and verification gaps. Ask only for information that blocks a sound decision; continue independent investigation.

Keep unrelated edits intact. Read only the supporting guide needed by the current task:

| Task | Reference |
| --- | --- |
| Language, layers, state, async, networking, persistence | [Architecture and data](references/architecture-and-data.md) |
| Jank, CPU, memory, images, startup, app size | [Rendering and performance](references/rendering-and-performance.md) |
| Adaptive UI, accessibility, localization, platform integration | [Platform and adaptive](references/platform-and-adaptive.md) |
| Tests, analysis, CI, profiling evidence | [Testing strategy](references/testing-strategy.md) |
| Refactoring, legacy modernization, code review | [Refactoring and review](references/refactoring-and-review.md) |
| Anti-pattern symptoms and decision shortcuts | [Checklists and decisions](references/checklists-and-decisions.md) |

## 3. Code-quality standards

Use `UpperCamelCase` for types, `lowerCamelCase` for members, and `lowercase_with_underscores` for files. Follow formatter/import rules and local lint configuration; avoid unrelated style migrations.

Prefer inference where the type is evident and explicit types where they clarify public contracts or prevent unintended `dynamic`. Validate external shapes and values before trusting casts. Model absence with nullable types; use `!` or `late` only with a demonstrable invariant.

Prefer `final` for stable bindings and `const` for valid compile-time values. A final collection remains mutable; protect shared snapshots when mutation would violate ownership. Keep equality and `hashCode` consistent and avoid mutable map/set keys.

Choose functions/classes by responsibility and reason to change, not line limits. Keep side effects explicit. Document public contracts, units, failure behavior, and non-obvious decisions rather than narrating code. Use generics, records, patterns, modifiers, mixins, and extensions only when they clarify the contract within the supported language version.

Catch failures at a boundary that can recover, translate, or report them. Preserve stack traces with `rethrow` when propagating. Do not swallow programmer errors or replace failures with false success. Follow the existing Result/exception model rather than adding a parallel error framework.

## 4. Architecture decision framework

Locate the actual coupling, ownership, or testing problem before creating a boundary. Official app architecture strongly recommends UI/data separation, repositories, MVVM, DI, and immutable data; its package choices and optional domain layer are recommendations, not universal requirements.

Keep ephemeral UI state local (`setState` is appropriate). Move shared or durable state to its existing feature/application owner. Inject dependencies through existing constructors or DI; dispose them at their owning scope.

Add a repository for a meaningful data/policy boundary; add a use case for complex or reused orchestration. Avoid forwarding layers and an interface per class. Preserve feature-first or layer-first organization unless an authorized migration solves demonstrated coupling. Inspect exported APIs and all consumers before changing boundaries.

## 5. Flutter UI engineering rules

Widgets describe immutable configuration; elements retain identity; render objects lay out and paint. A rebuild does not necessarily imply layout or repaint. Updating an element generally requires matching `runtimeType` and key.

- Keep `build` descriptive and cheap. Create lifecycle-owned futures outside repeated builds; refresh when their actual inputs change. Subscribe/unsubscribe when dependencies change and dispose only owned resources.
- Keep `setState` callbacks synchronous. Cancel owned callbacks/work where supported; reject obsolete completions and post-disposal state changes, including error/finally paths.
- After an async gap, check the mounted status of the context actually used before navigating or accessing it. A notifier/controller needs its own disposal policy; it has no widget `mounted` property.
- Extract widget classes where state isolation, reuse, identity, readability, or profiling benefits. Extraction alone does not guarantee less work. Stable `child` instances and valid `const` construction can skip parent-driven updates; inherited dependencies may still rebuild them.
- Use stable domain keys for reordered stateful items. Keep required `GlobalKey`s long-lived; avoid blanket key insertion or widget equality overrides.
- Reason from parent constraints. Use lazy builders for large/unbounded collections; eager children suit small fixed lists. Known extents help only when correct under actual content and text scaling. Use slivers for composed scrolling; do not silence constraint errors with blanket `shrinkWrap`.
- Reuse theme tokens and existing components; add `ThemeExtension` only for cohesive custom theme values. Preserve semantics, keyboard focus, text scaling, reduced motion, RTL, and platform navigation.

## 6. Performance optimization playbook

Classify each proposed change as **verified bottleneck**, **plausible bottleneck requiring measurement**, **maintainability improvement**, or **speculative/potentially harmful micro-optimization**. Separately identify documented framework behavior and measured application outcomes.

Record the device/browser, OS, SDK, build mode, renderer, dataset, interaction, cold/warm state, and metric. Measure representative native targets in profile mode and validate release behavior; use browser Performance/Memory tools for web. Detailed diagnostic instrumentation can perturb timings.

Determine whether the limiting stage is build/layout, paint/raster, synchronous CPU, allocation/retention, I/O, startup, or bundle size. Change that stage, rerun the same workload, and check correctness and memory tradeoffs. Use display refresh interval (about 16.7 ms at 60 Hz, 8.3 ms at 120 Hz), not a universal frame budget.

Native `Isolate.run`/`compute` can isolate expensive CPU work; startup, transfer, and result publication cost still matter. Dart isolates are unsupported on web; web `compute` runs on the current event loop. Chunking only helps work that actually yields; one monolithic JSON decode still blocks. Consider a browser worker only when needed and verify its integration separately.

Stop when the agreed user-visible target is met without regression. If profiles are unavailable, provide a hypothesis and exact measurement plan, then report performance acceptance as unverified. See the [performance guide](references/rendering-and-performance.md) for stage-specific choices.

## 7. Refactoring decision system

Name the behavior to preserve and the observed maintenance cost. Add a characterization test when behavior is uncertain. Choose the smallest transformation: rename, extract, move, inline, simplify a condition, or isolate a dependency seam.

Search callers before changing signatures or moving code. Preserve error handling, state lifetime, keys, persistence schemas, ordering, and public exports. Separate behavior changes, dependency/SDK migrations, and mechanical cleanup when they need distinct evidence. Stop once the demonstrated smell is resolved; do not modernize untouched code as a side effect.

## 8. Senior code-review protocol

Read the diff and relevant surrounding code/callers. Check correctness/regressions, dependency direction, API compatibility, Dart types/equality, lifecycle/async behavior, memory/performance, security, accessibility, platform behavior, and test quality.

Report only actionable findings supported by a reachable failure path. For each: **severity; file and tight line span; trigger; impact; evidence; smallest correction; regression check**. Distinguish confirmed defects from hypotheses and preferences. Explain missing evidence. If no defects are found, say so and state verification limits. Read the [review guide](references/refactoring-and-review.md) for severity and legacy decisions.

## 9. Testing and validation protocol

Choose the smallest check that can catch the failure. Use actual paths and the project's pinned SDK. Example shapes, after substituting existing affected files:

```sh
dart format --output=none --set-exit-if-changed lib/feature.dart test/feature_test.dart
flutter analyze lib/feature.dart test/feature_test.dart
flutter test test/feature_test.dart
```

For pure Dart packages, use `dart analyze` and `dart test` with the relevant file. Format only intended files when applying formatting. Preview `dart fix --dry-run` before a deliberate migration; inspect fixes rather than applying repository-wide changes automatically.

Add behavior tests for non-trivial logic and regressions. Use integration/device checks for plugin, storage, routing, lifecycle, or native behavior that unit/widget tests cannot establish. Run platform builds only when required by the change or project. Broaden checks for shared/risky changes and satisfy required CI gates; a full suite/build is not the default for every edit.

Report executed commands and results separately from proposed checks, pre-existing failures, unavailable tooling, and pending device/profile evidence. Never weaken lints, assertions, or tests to obtain a pass.

## 10. Anti-patterns and correction strategies

Use [the decision table](references/checklists-and-decisions.md) to connect symptoms, impact, corrections, and exceptions. Reject blanket bans on `setState`, fixed widget/file lengths, mandatory packages/layers, arbitrary payload thresholds, automatic parallelization, universal repaint boundaries, and unsupported performance numbers.

## 11. Task-specific execution workflows

For every task: **Inspect → Understand → Diagnose → Plan → Change → Verify → Report**. Size each stage to the request.

| Task | Diagnosis and change | Verification and stop |
| --- | --- | --- |
| New feature | Trace existing flow; define state/error/data ownership; implement one complete vertical slice using current boundaries. | Verify user behavior and failure paths; stop at accepted scope. |
| Bug fix | Reproduce, inspect callers, isolate root cause; fix the shared cause once. | Focused regression fails before/passes after; stop when affected paths work. |
| Refactor | Capture behavior; select one transformation that reduces actual complexity. | Characterization tests and caller compatibility; stop when the smell is resolved. |
| Performance | Establish baseline and limiting stage; test one justified intervention. | Same workload before/after, correctness and memory; stop at agreed target. |
| Legacy modernization | Inventory SDK/deprecations and consumers; add seams/characterization; migrate incrementally. | Analyze/test each step; verify minimum supported SDK and affected targets. |
| Review | Trace diff, contracts, callers and tests; identify reachable defects. | Evidence-based findings or no findings; report untested paths without editing unless asked. |
| Architecture improvement | Identify coupling/change cost; compare keeping, moving, extracting, or merging a boundary. | Verify consumers, DI/routing, behavior and ownership; stop before speculative layers. |

## 12. Final quality gates

Check applicable gates, marking irrelevant or unavailable ones explicitly:

- Functional requirements and intended behavior hold; unintended behavior/API/data changes are absent.
- Dart/API choices fit supported SDKs, conventions, and static analysis.
- Architecture, state ownership, dependencies, and complexity are justified.
- Regression tests exercise behavior, failure paths, and async ordering where relevant.
- Owned resources are released; stale/disposed callbacks cannot publish state.
- UI preserves accessibility, localization, responsive constraints, and required platform interaction.
- Input validation, authorization, secret handling, logging, and durable data remain safe.
- Performance claims have comparable evidence; hypotheses and missing profiles are labeled.
- Relevant formatting, analysis, tests, builds, and required CI checks are reported accurately.
- Documentation/contracts match the change; the final report states outcome, verification, and remaining risks.
