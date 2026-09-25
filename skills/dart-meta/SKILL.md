---
name: dart-meta
description: Senior production guidance for Dart `package:meta` in Flutter and Dart codebases. Use this skill whenever code imports or may need `package:meta`, adds/reviews annotations, models immutable state/value objects, designs package/public/internal/protected APIs, defines subclass/lifecycle contracts, uses `@useResult`/testing seams/experimental APIs/deprecations/custom annotations, responds to meta-related analyzer diagnostics, migrates legacy annotations to modern Dart language features, or audits whether metadata is useful, redundant, misleading, or wrongly claimed as a performance optimization—even when the user only asks “which annotation should I use?” or “modernize this Dart API”.
compatibility: Best used with access to the target Dart/Flutter project so the resolved Dart SDK, `meta` version, analyzer configuration, package boundaries, and public API compatibility can be inspected. The bundled research baseline is August 12, 2026; verify version-sensitive APIs before production changes.
---

# Dart `package:meta`

Use `package:meta` as an **API-contract and static-analysis tool**, not as annotation decoration and not as a general runtime optimization mechanism.

## Operating hierarchy

When expressing a contract, prefer the strongest accurate mechanism in this order:

```text
Dart language guarantee
        ↓
Architecture / real privacy or package boundary
        ↓
Analyzer-enforced metadata contract
        ↓
Lint-enforced convention
        ↓
Documentation-only intent
```

Default rule:

> If Dart can express the invariant directly, use Dart. If architecture/privacy can express it more strongly, use architecture/privacy. Use `meta` when analyzer/tooling can catch a realistic misuse that the stronger layers cannot express cleanly.

Specialist exceptions exist: `package:meta/dart2js.dart` compiler hints and `RecordUse` have compiler/build-tooling effects. Do not generalize those effects to ordinary `meta.dart` annotations.

## Non-negotiable rules

1. Prefer modern Dart language features over historical metadata when semantics match.
2. Use an annotation only when it communicates a **real contract** and catches or documents a plausible misuse.
3. Do not add metadata for cosmetic consistency or “more explicit” code when it provides no meaningful contract.
4. Do not claim ordinary `meta.dart` annotations improve Flutter rebuild speed, CPU execution, AOT, tree shaking, startup, memory, database/network performance, or binary size.
5. Treat `@immutable` as a correctness/analyzer contract, not a Flutter optimization switch.
6. Distinguish final-field compliance from semantic/deep immutability; protect collection ownership when observable mutation would violate the value contract.
7. Prefer `_private` for same-library privacy.
8. Prefer package structure (`lib/src`, curated exports) before relying on `@internal` as the sole package boundary.
9. Treat `@protected` as a supported subclass-extension contract, not Java-style access control.
10. Treat `@internal` as API governance, not security or authorization.
11. Use `@visibleForTesting` sparingly; test public behavior or extract a collaborator first when that creates cleaner design.
12. Use `@mustCallSuper` only when the superclass implementation preserves a real invariant/resource/lifecycle obligation.
13. Use `@mustBeOverridden` only when retaining a concrete base implementation is intentional and every concrete subclass must still make an explicit override decision.
14. Use `@nonVirtual` only when the class remains intentionally extensible but one concrete member must not be overridden.
15. Use `@useResult` only when discarding the value is likely a programmer bug; avoid result-annotation noise.
16. Use `@awaitNotRequired` only when the returned `Future` is genuinely safe to ignore under the documented contract; never use it merely to silence async lints.
17. Use `@experimental` for genuinely unstable **public** APIs whose consumers consciously accept compatibility risk; otherwise keep the API internal.
18. Give deprecations actionable migration guidance and do not promise removal dates/versions without actual package policy.
19. Treat metadata changes in published packages as API-design changes that can affect supported use even when method signatures stay the same.
20. Avoid deprecated legacy `meta` APIs in new code except when demonstrating or performing migration.
21. Do not suppress meta-related analyzer diagnostics broadly just to make analysis green; first determine whether the caller, annotation, or architecture is wrong.
22. Do not copy Flutter-framework annotation density into ordinary application code without framework-like extension requirements.
23. Verify the annotation exists in the project's resolved `meta` version and is legal on the intended target.
24. Keep `meta` as a direct dependency when production code under `lib/` imports it; do not rely on a transitive dependency.
25. Ordinary `meta` use does not require code generation or `build_runner`.

## Load references progressively

Read only what the task requires. For a broad package/API audit, read the references in this order.

| Need | Reference |
|---|---|
| Current API catalog, version evolution, deprecated/current annotations, `meta_meta`, `TargetKind`, `RecordUse`, dart2js hints | `references/api-catalog.md` |
| `@immutable`, deep immutability, `_private`, `@protected`, `@internal`, `@visibleForTesting` | `references/immutability-visibility.md` |
| Inheritance contracts, `@mustCallSuper`, `@mustBeOverridden`, `@nonVirtual`, native class modifiers, legacy `@sealed` migration | `references/inheritance-modern-dart.md` |
| `@useResult`, async result rules, Flutter lifecycle, deprecation, testing boundaries | `references/results-lifecycle-deprecation.md` |
| Flutter app vs package/framework guidance, analyzer/lints, dependency rules | `references/flutter-package-tooling.md` |
| Annotation placement/combinations, redundancy, runtime-performance reality, compiler/build exceptions | `references/annotation-combinations-performance.md` |
| Annotation decision trees, anti-patterns, code-review/migration checklists, AI operating rules | `references/decision-trees-review.md` |
| Production code and before/after examples | `references/patterns-examples.md` |
| Architecture placement, tests, analyzer diagnostics, suppression strategy | `references/architecture-testing-debugging.md` |
| Official source catalog and research baseline | `references/sources.md` |

## Phase 1 — Inspect the project before editing

Before adding, removing, or changing metadata, inspect the relevant project state:

- Dart SDK/language version;
- resolved `meta` version and whether it is a direct dependency;
- `analysis_options.yaml` and enabled lints;
- whether the code is application-internal, package-internal, public package API, framework-like extension API, or tooling code;
- Dart library boundaries and `lib/src`/export structure;
- existing class modifiers and subtype relationships;
- tests that rely on public/test seams;
- downstream callers/subclasses when changing published API contracts;
- whether the reported problem is compile-time/analyzer behavior or runtime behavior.

Do not choose an annotation from its name alone.

## Phase 2 — Classify the intended contract

For every proposed annotation, answer:

1. What concrete misuse are we preventing?
2. Can Dart express this directly with a language/type/class-modifier feature?
3. Can library privacy, package structure, composition, or a clearer interface enforce it more strongly?
4. Is analyzer/tool behavior actually provided for this annotation in the resolved version?
5. Is the annotation valid on this declaration kind?
6. Is the contract true for every intended caller/subclass?
7. Is this an app-level need or a package/framework/tooling-level need?
8. Does it create compatibility obligations for future maintainers?
9. Would ignoring the annotation plausibly produce a bug?
10. Is anyone expecting a runtime-performance effect that the annotation does not provide?

If no concrete answer exists, omit the annotation.

## Phase 3 — Prefer modern Dart first

Before reaching for `meta`, use native Dart when it expresses the semantics accurately:

```text
required named parameter          → required
never returns normally            → Never
closed direct subtype family      → sealed class
no external subtype               → final class
extend but not implement          → base class
implement but not extend          → interface / abstract interface class
nullability contract              → sound null-safety types
covariant parameter               → covariant
```

Do not mechanically replace legacy `@sealed` with Dart `sealed`; the historical metadata and native modifier have different package-vs-library subtype boundaries. Inspect existing subtype locations and compatibility first.

## Phase 4 — Choose metadata by intent

Use this as the first-pass decision matrix:

| Intent | Preferred mechanism |
|---|---|
| Same Dart library only | `_private` |
| Same package implementation, not consumers | `lib/src` + curated exports; optionally `@internal` |
| Subclass-facing member | `@protected` |
| External subclass may override but ordinary external code should not call/reference | `@visibleForOverriding` |
| Override must execute base invariant | `@mustCallSuper` |
| Concrete base implementation exists but every concrete subclass must replace it | `@mustBeOverridden` |
| One member must remain non-overridable | `@nonVirtual` |
| Immutable class field discipline | `@immutable` / `@Immutable(reason)` |
| Ignored return value is likely a bug | `@useResult` / `@UseResult(reason)` |
| Returned Future is intentionally safe to ignore | `@awaitNotRequired` |
| Unstable public API | `@experimental` |
| Narrow exceptional test seam | `@visibleForTesting` |
| Value must not escape into persistent storage | `@doNotStore` |
| Temporary developer-only use must not be submitted | `@doNotSubmit` |
| Argument must be compile-time constant | `@mustBeConst` |
| Extension-type member intentionally redeclares | `@redeclare` |
| Intentional reopening under class-modifier lint policy | `@reopen` |
| Custom annotation target validation | `Target` / `TargetKind` from `meta_meta.dart` |
| Reachable-use recording for link/build hooks | `RecordUse`, specialist |
| dart2js inlining control | `noInline` / `tryInline`, specialist and benchmark-driven |

Consult `references/api-catalog.md` before using specialized APIs.

## Phase 5 — Apply contract-specific gates

### Immutability

Use `@immutable` only when the type is intended to represent immutable value/configuration/state. Ensure all fields are final and, when semantic immutability matters, prevent external mutation of owned collections or collaborators.

Do not infer:

- deep immutability from `final` alone;
- thread safety from `@immutable`;
- faster Flutter rendering from `@immutable`.

Flutter widget subclasses already inherit an immutable framework contract; do not redundantly annotate every custom widget merely for decoration.

### Visibility

Choose the narrowest real boundary first:

```text
same library            → _private
same package            → lib/src + curated exports (+ @internal if useful)
subclass extension API  → @protected
override-only seam      → @visibleForOverriding
exceptional test seam   → @visibleForTesting
```

If a class needs many test-only public members, refactor the architecture instead of widening more internals.

### Inheritance/lifecycle

Use `@mustCallSuper` only when omitting the call breaks an invariant. An empty current base body can still carry a meaningful contract if the API promises the call is required, but verify the actual declaration/documentation before editing overrides.

Use language-level class modifiers for type-level inheritance restrictions; use metadata for member-level or analyzer-only contracts that Dart does not directly express.

### Result usage

Use `@useResult` where:

```text
ignored result ≈ likely bug
```

Strong candidates include immutable copy/update methods, validation/parse/transaction results, and result/error wrappers. Ordinary getters and harmless formatting methods generally do not need it.

Do not confuse `@useResult` with `@awaitNotRequired`; they express very different caller intent.

### Experimental/deprecated APIs

For a public API that may change incompatibly and genuinely needs early consumers, mark it `@experimental` and document the instability. If users do not need early access, keep it internal instead.

For deprecation, prefer `@Deprecated('Use X instead...')` with a concrete migration path. Use targeted `Deprecated.*` forms when only a capability such as subclassing/implementation is being phased out and the supplied project SDK supports the intended API.

### Custom annotations and specialist tooling

Use `Target`/`TargetKind` only when authoring a real custom annotation library and target validation is meaningful.

Use `RecordUse` only for build/link-hook tooling that consumes reachable-use records.

Use `noInline`/`tryInline` only when dart2js is the relevant compiler, a real web performance problem exists, benchmarks/generated-code analysis justify intervention, and normal compiler heuristics are demonstrably inadequate.

## Phase 6 — Handle analyzer diagnostics correctly

When analysis reports a meta-related diagnostic:

1. identify the annotation/contract involved;
2. inspect the declaration and supported use boundary;
3. decide whether the caller violates a correct contract;
4. decide whether the annotation itself is wrong/stale;
5. decide whether architecture has drifted away from the original contract;
6. fix the root cause;
7. suppress only when the exceptional use is intentional, local, documented, and narrower than redesigning the API.

Do not globally suppress diagnostics such as immutable, protected/internal-use, must-call-super, non-virtual, missing-override, unused-result, or testing-visibility failures merely to pass CI.

Read `references/architecture-testing-debugging.md` for diagnostic-specific guidance.

## Phase 7 — Review published-package compatibility

For reusable/public packages, treat API-governance decisions deliberately:

- May consumers construct the type?
- May they extend it?
- May they implement it?
- May they mix it in?
- Is the subtype family closed?
- Which extension points are supported?
- Which overrides must call super?
- Which members must not be overridden?
- Is the API stable, experimental, internal, or deprecated?
- What compatibility window applies to migrations?

Adding native `base`, `interface`, `final`, or `sealed` modifiers to an existing public API can be breaking. Changing/removing analyzer contracts can also alter supported usage. Do compatibility analysis before “modernizing” a published package.

## Phase 8 — Performance discipline

If the user asks for performance improvements, do **not** prescribe ordinary `meta.dart` annotations as optimization knobs.

Instead:

1. profile the actual runtime problem;
2. identify whether it is rebuild/layout/paint, allocation, I/O, algorithmic work, compiler output, or another real mechanism;
3. optimize that mechanism;
4. use metadata only if it improves correctness/API discipline around the optimization.

The only bundled research exceptions are specialized compiler/build contracts such as dart2js hints and `RecordUse`; even these are not general Flutter performance annotations.

## Phase 9 — Validate changes

When tooling is available:

- run formatter;
- run `dart analyze` / `flutter analyze` as appropriate;
- run tests covering public behavior and subclass/lifecycle contracts;
- verify immutable models cannot be observably mutated through exposed collections where that guarantee matters;
- verify package exports do not expose intended internal implementation accidentally;
- verify deprecation messages are actionable;
- verify no broad ignore/suppression was introduced without justification;
- verify dependency declaration is direct when `lib/` imports `meta`;
- verify changed public class modifiers/annotations do not silently break supported consumers;
- verify version-sensitive APIs against the project's resolved SDK and `meta` version.

If tooling is unavailable, explicitly state what remains unverified.

## Repair order for annotation-heavy or legacy code

Fix in this order:

1. replace superseded legacy metadata with correct modern Dart where semantics match;
2. repair real privacy/package architecture (`_private`, `lib/src`, exports);
3. correct false or misleading annotations;
4. repair immutability ownership problems;
5. repair inheritance/lifecycle contracts;
6. repair testing seams;
7. repair result-use and async-result policy;
8. improve experimental/deprecation lifecycle;
9. configure useful analyzer/lints selectively;
10. remove decorative/redundant metadata;
11. investigate runtime performance separately.

## Output expectations

For non-trivial design/review/migration tasks, make the reasoning reviewable. Include as appropriate:

- the contract being protected;
- why Dart language/architecture was or was not sufficient;
- the chosen annotation and analyzer/tooling effect;
- whether the pattern is app-oriented or package/framework-oriented;
- compatibility implications for public APIs;
- exact files/code changed;
- analyzer/test validation performed;
- remaining version or downstream-consumer risks.

Do not claim an annotation has runtime behavior unless the supplied research explicitly establishes that effect.

## Final completion gate

Before declaring the work complete, answer **yes** to every applicable item:

- Was the intended misuse/invariant identified explicitly?
- Was a Dart language feature considered before metadata?
- Was real privacy/architecture considered before visibility annotations?
- Does each annotation match its actual analyzer/tooling semantics?
- Is the annotation legal for the declaration and available in the resolved version?
- Are immutable types semantically immutable to the degree their API promises?
- Are protected/internal/testing seams no wider than necessary?
- Does every `@mustCallSuper` protect a real invariant?
- Is every `@useResult` signal selective and meaningful?
- Is every `@awaitNotRequired` future genuinely safe to ignore?
- Are experimental APIs intentionally public and lifecycle-managed?
- Do deprecations provide a migration path?
- Were legacy annotations migrated according to semantics rather than name similarity?
- Were public package compatibility effects reviewed?
- Were analyzer diagnostics fixed rather than broadly suppressed?
- Are runtime-performance claims separated from static-analysis metadata?
- Were specialist compiler/build annotations kept out of ordinary app code without evidence?
- Were analysis/tests run or remaining validation gaps stated?

If any applicable answer is **no**, continue improving the design or report the unresolved gap explicitly.
