# Decision trees, anti-patterns, review gates, and AI operating rules

Use this reference during design/review/refactoring when choosing an annotation, auditing annotation density, performing migration, or deciding whether a contract belongs in Dart, architecture, metadata, lint, or documentation.

## Table of contents

- [Decision Tree — Should I Add `@immutable`?](#decision-tree-should-i-add-immutable)
- [Decision Tree — `_private`, `@protected`, or `@internal`?](#decision-tree-private-protected-or-internal)
- [Decision Tree — Should I Use `@visibleForTesting`?](#decision-tree-should-i-use-visiblefortesting)
- [Decision Tree — Should I Use `@mustCallSuper`?](#decision-tree-should-i-use-mustcallsuper)
- [Decision Tree — `@sealed` or Native Modifiers?](#decision-tree-sealed-or-native-modifiers)
- [Decision Tree — Should This API Be `@experimental`?](#decision-tree-should-this-api-be-experimental)
- [Decision Tree — Should This Return Value Use `@useResult`?](#decision-tree-should-this-return-value-use-useresult)
- [Decision Tree — Deprecate or Remove?](#decision-tree-deprecate-or-remove)
- [Anti-Patterns](#anti-patterns)
- [Code Review Strategy](#code-review-strategy)
  - [Necessity](#necessity)
  - [Language alternative](#language-alternative)
  - [Correctness](#correctness)
  - [Consumers](#consumers)
  - [Architecture](#architecture)
  - [Evolution](#evolution)
  - [Runtime claims](#runtime-claims)
- [Code Review Checklist](#code-review-checklist)
- [Migration Checklist](#migration-checklist)
- [Senior Annotation Decision Matrix](#senior-annotation-decision-matrix)
- [AI Operating Rules](#ai-operating-rules)
  - [Before Writing Code](#before-writing-code)
- [While Writing Code](#while-writing-code)
- [During Code Review](#during-code-review)
- [During Refactoring](#during-refactoring)
- [During Performance Work](#during-performance-work)
- [Final Engineering Principles](#final-engineering-principles)

---

# Decision Tree — Should I Add `@immutable`?

```
Is this object intended to represent a value/snapshot/configuration?
    NO → probably do not annotate.
    YES
      ↓
Should its observable state remain unchanged after construction?
    NO → do not annotate.
    YES
      ↓
Are all instance fields final, including inherited state?
    NO → fix design first.
    YES
      ↓
Can referenced collections/objects mutate observable state?
    YES → establish defensive/unmodifiable ownership.
    NO / intentionally immutable
      ↓
Use @immutable if analyzer-visible contract is useful.

```

---

# Decision Tree — `_private`, `@protected`, or `@internal`?

```
Only the same Dart library should use it?
    → _private

Multiple libraries inside this package need it,
but consumers should not?
    → lib/src + curated exports
      → consider @internal

Only subclass implementation code should call it?
    → @protected

External subclasses should override it
but ordinary calls are unsupported?
    → @visibleForOverriding

Normal consumers should use it?
    → normal public API

```

---

# Decision Tree — Should I Use `@visibleForTesting`?

```
Can public behavior test this?
    YES → test public behavior.
    NO
      ↓
Is this logic a cohesive collaborator that should be extracted?
    YES → extract and test collaborator.
    NO
      ↓
Is a narrow testing seam materially simpler and safe?
    NO → redesign.
    YES → @visibleForTesting may be justified.

```

---

# Decision Tree — Should I Use `@mustCallSuper`?

```
Does the base implementation preserve a real invariant?
    NO → do not annotate.
    YES
      ↓
Would an override be invalid if it omitted super?
    NO → document recommendation instead, if needed.
    YES
      ↓
Use @mustCallSuper.

```

Never add it only because the base method exists.

---

# Decision Tree — `@sealed` or Native Modifiers?

```
New Dart 3+ code?
    YES
      ↓
Need known closed direct subtype family / exhaustive switches?
    → sealed class

Need nobody outside library to subtype?
    → final class

Need external extension but not implementation?
    → base class

Need external implementation but not extension?
    → interface class

Maintaining legacy package-level @sealed behavior?
    → analyze package-vs-library boundary before migration

```

Use legacy `@sealed` only when its specific package-level semantics remain deliberately required.

---

# Decision Tree — Should This API Be `@experimental`?

```
Is the declaration public?
    NO → @experimental is usually the wrong boundary.

Could its source/API contract change incompatibly soon?
    NO → keep stable.
    YES
      ↓
Do consumers genuinely need early access?
    NO → keep it internal.
    YES
      ↓
Can consumers tolerate instability?
    NO → do not publish it yet.
    YES → mark @experimental and document scope.

```

---

# Decision Tree — Should This Return Value Use `@useResult`?

```
Can callers safely ignore the result?
    YES → no annotation.
    NO / ignoring is very likely a bug
      ↓
Would analyzer feedback meaningfully catch mistakes?
    YES → @useResult / @UseResult(reason)

```

Strong candidates:

```
immutable copy methods
validation result
parse result
transaction result
error/result wrapper

```

Weak candidates:

```
ordinary getters
debug formatting
best-effort convenience methods

```

---

# Decision Tree — Deprecate or Remove?

```
Is this private/internal with no supported consumers?
    → remove/refactor normally.

Is it public and consumers may still depend on it?
    ↓
Can it be removed without violating compatibility policy?
    YES → remove.
    NO
      ↓
Provide replacement/migration API first.
      ↓
@Deprecated('Use ... instead. ...')
      ↓
Keep through documented compatibility window.
      ↓
Remove in an appropriate breaking release.

```

---

# Anti-Patterns

| Anti-patternWhy it failsCorrect approach                                          |                                                      |                                                               |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Add `@immutable` for performance                                                  | Annotation is a correctness/static-analysis contract | Use for true immutability; profile performance separately     |
| `@immutable` with mutable exposed collections                                     | Final reference does not imply deep immutable state  | Defensive copy/unmodifiable data                              |
| Treat `@protected` as real access control                                         | It is analyzer intent, not language privacy          | Use `_private`/architecture for real encapsulation            |
| Use `@internal` instead of `lib/src` organization                                 | Annotation alone is a weak package boundary          | Use package structure + exports + annotation where useful     |
| Expose half a class with `@visibleForTesting`                                     | Tests become coupled to implementation               | Test behavior or extract collaborators                        |
| Add `@mustCallSuper` "just in case"                                               | Creates unnecessary subclass obligations             | Use only for a real invariant                                 |
| Remove `super` call because base body is currently empty                          | Violates inherited API contract                      | Honor annotation                                              |
| Use `@mustBeOverridden` instead of an abstract member with no base implementation | Weaker/more complex than language                    | Use `abstract` member                                         |
| Use legacy `@sealed` automatically                                                | Modern Dart has stronger, richer modifiers           | Choose `sealed`/`base`/`interface`/`final` by semantics       |
| Mechanically replace `@sealed` with `sealed class`                                | Package boundary differs from library boundary       | Audit subtype layout first                                    |
| Mark every method `@useResult`                                                    | Creates analyzer noise                               | Mark only likely-bug discards                                 |
| Use `@awaitNotRequired` to hide missing `await`s                                  | Masks error-handling bugs                            | Annotate only genuinely safe fire-and-forget APIs             |
| Leave APIs `@experimental` forever                                                | Avoids making stability decisions                    | Stabilize, redesign, or remove                                |
| Deprecate with `"Deprecated"`                                                     | No migration path                                    | Name replacement and migration direction                      |
| Treat `@internal` as security                                                     | Analyzer contract can be bypassed                    | Enforce authorization/runtime security elsewhere              |
| Add `@literal` for presumed Flutter speed                                         | Annotation is analysis intent                        | Use normal const design/lints unless literal contract matters |
| Use `@doNotStore` as object-lifetime enforcement                                  | No runtime invalidation                              | Treat as analyzer lifetime guidance                           |
| Copy Flutter framework metadata into app code                                     | Framework has different extensibility obligations    | Use simpler app architecture when possible                    |
| Import `meta` transitively via Flutter                                            | Dependency can disappear/change                      | Declare direct dependency                                     |
| Use `@factory` on a Dart factory constructor                                      | It is an annotation for methods                      | Use language `factory` constructor syntax                     |
| Use `RecordUse` as analytics                                                      | It serves compile/link tooling                       | Use an analytics system                                       |
| Use dart2js inline hints without profiling                                        | Compiler heuristics usually know better              | Benchmark specialized web compiler code                       |

---


# Code Review Strategy

For every annotation encountered, ask:

## Necessity

- What misuse does this detect?
- Would code be equally understandable without it?

## Language alternative

- Is there now a Dart keyword/modifier that is stronger?

## Correctness

- Does implementation actually satisfy the annotation?
- Do inherited members preserve the contract?

## Consumers

- Does annotation affect callers?
- subclasses?
- implementers?
- tests?
- only package tooling?

## Architecture

- Is metadata compensating for an inappropriate public API?
- Should this declaration be private/internal instead?
- Should inheritance be replaced with composition?

## Evolution

- Is this annotation part of a published compatibility contract?
- Will changing/removing it break downstream assumptions?

## Runtime claims

- Is anyone citing the annotation as a performance optimization?
- Is there authoritative evidence for that specific annotation?

---

# Code Review Checklist

-  Every annotation has a concrete purpose.
-  Native Dart language features are preferred where they provide stronger or clearer enforcement.
-  Legacy `@required`, `@checked`, `@alwaysThrows`, and `@virtual` have been removed/replaced.
-  Legacy `@sealed` has been reviewed against modern class modifiers.
-  `@immutable` classes contain only final instance fields.
-  `@immutable` state does not unintentionally expose mutable collection/object state.
-  `@immutable` is not being claimed as a runtime optimization.
-  `@protected` is used only for real subclass extension points.
-  `@protected` is not treated as language-level access control.
-  `@internal` declarations are not exported accidentally.
-  Other packages do not depend on `lib/src`.
-  `@visibleForTesting` is narrow and exceptional.
-  Tests prefer observable behavior or extracted collaborators.
-  `@mustCallSuper` corresponds to a genuine invariant.
-  Overrides honor required super-call ordering.
-  `@mustBeOverridden` is used only when a concrete inherited implementation is intentional.
-  `@nonVirtual` protects a real fixed algorithm/member.
-  `@useResult` is limited to results whose silent discard is likely erroneous.
-  `@awaitNotRequired` is used only when future errors/results genuinely require no handling.
-  `@experimental` public APIs have an explicit instability policy.
-  Deprecated APIs provide migration guidance.
-  Package authors considered targeted `Deprecated` constructors where appropriate.
-  `@doNotStore`, `@mustBeConst`, `@factory`, `@literal`, and related specialized metadata are not used without a concrete tooling need.
-  `@redeclare` is used only for extension-type redeclarations.
-  `@reopen` corresponds to an intentional class-modifier decision.
-  `isTest`/`isTestGroup` are confined to test-framework-style APIs.
-  Custom annotations use `Target` where target validation is valuable.
-  `RecordUse` is used only for compiler/link-hook workflows.
-  dart2js inline hints are benchmark-driven and web-compiler-specific.
-  `meta` is declared as a direct dependency when imported from production code.
-  No blanket analyzer suppression hides contract violations.
-  No runtime-performance claim is made without authoritative evidence.

---

# Migration Checklist

When modernizing an older Flutter/Dart project:

-  Upgrade Dart/Flutter first according to project compatibility requirements.
-  Resolve a current compatible `meta` version.
-  Replace `@required` with Dart `required`.
-  Replace `Required(...)` with Dart `required` plus normal documentation.
-  Replace `@alwaysThrows` with `Never` return types.
-  Replace `@checked` with `covariant` where required.
-  Remove `@virtual`.
-  Audit `@sealed`; choose modern `sealed`, `base`, `final`, or `interface` based on actual semantics.
-  Do not mechanically change package-level sealing into library-level sealing.
-  Review class-modifier changes for package breaking-change impact.
-  Keep `@protected` only where inheritance remains intentional.
-  Remove `@mustCallSuper` where no true invariant exists; preserve it where one does.
-  Replace unnecessary `@visibleForTesting` seams with behavioral tests or extracted collaborators.
-  Audit `@immutable` classes for mutable collections/nested state.
-  Add `@useResult` only to genuinely must-use transformations/results.
-  Review experimental APIs; stabilize or remove stale experiments.
-  Upgrade deprecation messages with concrete replacements.
-  Replace broad deprecated `TargetKind.directive` usage with specific current directive kinds.
-  If using extension types, consider current `@redeclare` semantics and `annotate_redeclares`.
-  Review newly stable `mustBeConst`/`RecordUse` only if the project already has a use case; do not adopt them merely because they are new.
-  Remove any old references to `meta`'s historical `unawaited`; modern Dart's async APIs should be used instead.
-  Run `dart analyze` after each migration phase.
-  Treat new diagnostics as design feedback rather than suppressing them wholesale.

---

# Senior Annotation Decision Matrix

| NeedBest first choice                                |                                            |
| ---------------------------------------------------- | ------------------------------------------ |
| Library-private declaration                          | `_name`                                    |
| Package-private implementation                       | `lib/src`, exports, optionally `@internal` |
| Required named parameter                             | `required`                                 |
| Function never returns normally                      | `Never`                                    |
| Closed subtype family                                | Dart `sealed`                              |
| No external subtypes                                 | Dart `final`                               |
| Extend but not implement                             | Dart `base`                                |
| Implement but not extend                             | Dart `interface`                           |
| Subclass-facing member                               | `@protected`                               |
| Override-only public seam                            | `@visibleForOverriding`                    |
| Override must call base implementation               | `@mustCallSuper`                           |
| Concrete member every concrete subclass must replace | `@mustBeOverridden`                        |
| Member must not be overridden                        | `@nonVirtual`                              |
| Value-object field discipline                        | `@immutable`                               |
| Silent result discard is likely a bug                | `@useResult`                               |
| Future intentionally safe to ignore                  | `@awaitNotRequired`                        |
| Unstable public API                                  | `@experimental`                            |
| Test-only public seam                                | `@visibleForTesting`                       |
| Ephemeral value must not be persisted                | `@doNotStore`                              |
| Temporary code must not be submitted                 | `@doNotSubmit`                             |
| Argument must be compile-time constant               | `@mustBeConst`                             |
| Extension-type redeclaration                         | `@redeclare`                               |
| Intentional class-modifier reopening                 | `@reopen`                                  |
| Custom annotation target validation                  | `Target` / `TargetKind`                    |
| Reachable-use link-hook recording                    | `RecordUse`                                |
| dart2js inlining control                             | `noInline` / `tryInline`, specialist only  |

---

# AI Operating Rules

## Before Writing Code

The AI MUST:

1. inspect the project's Dart SDK/language version;
2. check whether `meta` is already a **direct** dependency;
3. inspect existing architecture and package boundaries;
4. prefer a Dart language feature over metadata where it expresses the contract accurately;
5. verify the annotation exists in the project's resolved `meta` version;
6. verify the annotation's legal target;
7. determine whether the annotation causes analyzer behavior, lint behavior, tooling behavior, or only communicates intent;
8. determine whether the pattern is application-oriented or package/framework-oriented;
9. avoid copying historical Flutter/meta examples using deprecated annotations;
10. avoid adding annotations for cosmetic consistency alone.

---

# While Writing Code

The AI MUST:

- use annotations only where they add meaningful contract information;
- keep immutable models semantically immutable where practical, not merely final-field-compliant;
- use `_private` before weaker visibility metadata when the library boundary suffices;
- use package structure before `@internal` as the sole mechanism;
- keep protected APIs narrow;
- make `@mustCallSuper` correspond to actual base behavior;
- use `@useResult` selectively;
- give deprecations actionable replacements;
- preserve analyzer correctness;
- avoid broad `ignore` directives;
- use modern Dart syntax;
- avoid deprecated `meta` APIs except in explicit migration examples.

---

# During Code Review

The AI MUST ask:

> Is this annotation solving a real API-design problem, or merely decorating the code?

Then ask:

```
Can Dart enforce this more strongly?

Is this API public only because an annotation is compensating for poor structure?

Does the annotation match actual runtime/design semantics?

Will callers/subclasses be able to honor the contract?

Does this introduce avoidable compatibility obligations?

```

---

# During Refactoring

The AI MUST treat analyzer metadata as part of API intent.

Before removing:

```
@mustCallSuper
@nonVirtual
@internal
@protected
@useResult

```

determine whether downstream code relies on the stated contract.

For published packages, changing contract annotations can alter supported usage even where Dart signatures are unchanged.

---

# During Performance Work

The AI MUST NOT recommend ordinary `meta.dart` annotations as runtime optimizations without authoritative evidence.

Specifically, never propose:

```
@immutable for faster rebuilds
@useResult for faster calls
@protected for faster dispatch
@internal for better tree shaking
@mustCallSuper for better AOT

```

These are unsupported claims.

If performance is the task:

1. profile;
2. identify runtime bottleneck;
3. optimize the actual runtime mechanism;
4. use metadata only if it improves correctness around that optimization.

`dart2js.dart` compiler hints are a specialized exception and still require evidence.

---

# Final Engineering Principles

1. **Language enforcement beats metadata when semantics match.**
2. **Metadata beats comments when analyzer tooling can enforce the contract.**
3. **Comments still matter where intent cannot be enforced.**
4. **Architecture beats visibility annotations when a real boundary can be designed.**
5. **`@immutable`**** is a correctness contract, not a speed flag.**
6. **`@protected`**** is an extension-point contract, not access control.**
7. **`@internal`**** is a package API policy, not security.**
8. **`@visibleForTesting`**** is an exception, not a testing architecture.**
9. **`@mustCallSuper`**** should protect an invariant, not tradition.**
10. **`@useResult`**** should preserve signal by remaining selective.**
11. **Experimental APIs require active lifecycle management.**
12. **Deprecations must teach migration.**
13. **Framework annotations are not automatically application best practices.**
14. **Do not keep legacy metadata where modern Dart provides stronger language semantics.**
15. **Never trade architecture for annotation density.**

---
