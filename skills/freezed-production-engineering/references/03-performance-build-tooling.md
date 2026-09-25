# Reference: Runtime/memory/build performance, build_runner, generated-file policy, CI, migrations, and generator diagnostics.

Original source lines: 1923–2485

## Table of contents

- [55. Runtime performance analysis](#55-runtime-performance-analysis)
  - [Object allocation](#object-allocation)
  - [`copyWith`](#copywith)
  - [Equality](#equality)
  - [`hashCode`](#hashcode)
  - [Pattern matching](#pattern-matching)
  - [JSON](#json)
  - [Collection views](#collection-views)
- [56. Memory efficiency](#56-memory-efficiency)
- [57. Large collections](#57-large-collections)
- [58. Build-time performance](#58-build-time-performance)
- [59. Code size](#59-code-size)
- [60. Build runner workflow](#60-build-runner-workflow)
- [61. Do not blindly use `--delete-conflicting-outputs`](#61-do-not-blindly-use---delete-conflicting-outputs)
- [62. Current `build_runner --only-check`](#62-current-buildrunner---only-check)
- [63. Generated-file ownership](#63-generated-file-ownership)
- [64. Committing generated files](#64-committing-generated-files)
  - [Commit generated source when it provides benefits such as:](#commit-generated-source-when-it-provides-benefits-such-as)
  - [Ignore generated source when:](#ignore-generated-source-when)
- [65. CI patterns](#65-ci-patterns)
  - [If generated files are committed](#if-generated-files-are-committed)
  - [If generated files are ignored](#if-generated-files-are-ignored)
- [66. Freezed major-version migration](#66-freezed-major-version-migration)
- [67. Dart primary constructors](#67-dart-primary-constructors)
- [68. Common diagnostics](#68-common-diagnostics)
  - [Missing `.freezed.dart`](#missing-freezeddart)
  - [Missing `.g.dart`](#missing-gdart)
  - [Error after upgrading to Freezed 3](#error-after-upgrading-to-freezed-3)
  - [`copyWith` member missing](#copywith-member-missing)
  - [Unknown union discriminator](#unknown-union-discriminator)
  - [Generic JSON failure](#generic-json-failure)
  - [Converter failure](#converter-failure)
- [69. Stale generated code](#69-stale-generated-code)
- [70. `.dart_tool` and clean builds](#70-darttool-and-clean-builds)

---

# 55. Runtime performance analysis

## Object allocation

A generated Freezed implementation is an ordinary Dart object.

Construction allocates an object like other object-oriented model designs.

The annotation itself does not make construction mysteriously expensive.

## `copyWith`

`copyWith` normally allocates a new outer object.

Nested unchanged references are shared unless new values are explicitly constructed.

Cost becomes relevant when:

- models are copied at extremely high frequency
- each update creates large replacement collections
- deeply nested chains create several new path objects per operation

## Equality

Potentially one of the largest Freezed-specific runtime concerns for large state.

The expensive part is not the `==` operator call itself but the amount of structure it must compare.

## `hashCode`

Hash calculation similarly depends on field/collection structure.

Avoid repeatedly hashing enormous mutable-looking value graphs without understanding why.

## Pattern matching

Native Dart pattern matching over generated union subclasses is ordinary compiled Dart control flow.

There is no reason to add generated `when` dispatch just for performance.

## JSON

JSON serialization allocates maps/lists/strings and performs conversion work.

This is a serialization cost, not evidence that Freezed itself is globally slow.

Avoid decoding massive payloads synchronously in latency-sensitive UI work when the payload itself is the real problem.

## Collection views

Unmodifiable wrappers add a layer of collection access/protection.

Do not disable them on speculation.

Measure a real bottleneck first.

---

# 56. Memory efficiency

Repeated immutable state updates do not necessarily duplicate the entire object graph.

Example:

```
final next = state.copyWith(
  selectedId: '123',
);

```

can reuse unchanged nested references.

Memory problems more commonly come from:

- keeping long state histories
- replay/debug state retention
- large replacement collections
- caches retaining old models
- unnecessarily duplicated DTO/domain graphs
- snapshots containing giant mutable payloads
- repeated deserialization

When memory matters:

1. inspect retained-object ownership
2. inspect collection copying
3. inspect state history
4. inspect duplicate model layers
5. inspect caches
6. only then optimize generated-model mechanics

---

# 57. Large collections

Consider:

```
@freezed
abstract class SearchState with _$SearchState {
  const factory SearchState({
    required List<SearchResult> results,
    required String query,
  }) = _SearchState;
}

```

This may be completely appropriate for 30 results.

It may deserve architecture scrutiny for 100,000 complex results compared many times per second.

Questions to ask:

- How often is state emitted?
- How often is equality invoked?
- Is the collection typically the same reference?
- How often is it rebuilt?
- Does the screen need all items in its state?
- Could paging reduce ownership?
- Does a repository/provider already own the data?
- Would selection by ID/revision be enough?

Never invent a complex store abstraction solely because a model contains a `List`.

Scale matters.

---

# 58. Build-time performance

Build generation is a real cost of generator-heavy repositories.

The cost grows with:

- number of annotated libraries
- number of generated models
- number of builders in the build graph
- source analysis
- generated source volume
- clean-build frequency
- serializer complexity
- build invalidation patterns

Current `build_runner` releases include substantial incremental-build performance work, including documented performance improvements in the 2.13 series and later improvements.

Freezed itself notes that formatting generated files can significantly slow generation.

### Build-performance practices

- prefer watch/incremental workflows during active development
- avoid routinely deleting `.dart_tool`
- avoid unnecessary clean builds
- do not codegen trivial private objects without benefit
- keep generator versions mutually compatible
- avoid unnecessary global options that create extra work
- investigate which builder is slow before blaming all code generation
- avoid regenerating the entire monorepo when tooling supports narrower workflows and repository scripts provide them

---

# 59. Code size

Generated models increase:

- generated source-line count
- files visible to tools
- analyzer/source-processing work
- review diff size if generated code is committed

Do not infer release binary size directly from generated source size.

Release compilation and tree shaking determine which code survives into the application binary.

If code size matters, measure the target build using Flutter's app-size tooling instead of counting `.freezed.dart` lines.

Generated code can materially affect source-tree/build ergonomics without necessarily producing a proportional release-binary increase.

---

# 60. Build runner workflow

For current tooling, the basic one-time command is:

```
dart run build_runner build

```

For active editing:

```
dart run build_runner watch

```

`json_serializable` itself documents `dart run build_runner build` as the standard generation command.

Use `flutter pub` or `dart pub` dependency commands according to the repository, but generation normally uses the Dart runner entry point.

---

# 61. Do not blindly use `--delete-conflicting-outputs`

Older Freezed documentation and many tutorials show:

```
dart run build_runner watch -d

```

Current `build_runner` behavior is version-sensitive.

Since `build_runner` 2.7.0, the `-d` flag is ignored because conflicting outputs are automatically handled as though deletion were enabled. `build_runner` 2.16 also changed modified-output handling further.

Therefore:

- do not cargo-cult `--delete-conflicting-outputs`
- inspect the repository's `build_runner` version
- follow repository scripts if intentional
- on old toolchains, understand why the flag is required before using it
- on current toolchains, do not present it as a magical fix

Repeated conflicts may indicate:

- stale generated ownership
- branch switching
- renamed source files
- incorrect part files
- generator-version changes
- manually edited outputs

Diagnose the cause.

---

# 62. Current `build_runner --only-check`

`build_runner` 2.16.0 introduced:

```
dart run build_runner build --only-check

```

This performs generation logically, writes nothing, compares expected outputs with files on disk, and fails when committed/generated output differs. It is explicitly designed for continuous builds/tests.

This is useful for CI repositories that **commit generated files**.

Version-gate it:

Do not add this command to a repository whose `build_runner` version predates support.

---

# 63. Generated-file ownership

Never edit:

```
*.freezed.dart
*.g.dart

```

by hand.

Change the source declaration, annotations, or generator configuration and regenerate.

Current `build_runner` 2.16 explicitly restores incorrect generated outputs by default, further reinforcing that generated files are tool-owned.

Generated code is useful for:

- debugging generation
- understanding actual equality behavior
- verifying annotations propagated
- diagnosing serializer output

It is not the source of truth for manual edits.

---

# 64. Committing generated files

There is no universal rule for every Dart/Flutter repository.

## Commit generated source when it provides benefits such as:

- checkout builds/analyzes without generation
- generated API changes are visible in review
- package publication requires generated library source to be present
- consumers should not need your dev generator
- CI wants deterministic generated-diff checks
- repository conventions already commit generated files

## Ignore generated source when:

- the application has a reliable generation step before analysis/build
- the repository deliberately minimizes generated diffs
- every supported developer/CI workflow consistently runs generation
- existing policy is mature and reproducible

For publishable packages, ensure any generated library source required by consumers is present in the published package. Do not assume downstream consumers will run your dev generators.

### AI rule

Follow the repository's established generated-file policy unless the task is specifically to redesign that policy.

Do not change `.gitignore` casually during an unrelated model edit.

---

# 65. CI patterns

## If generated files are committed

On a compatible current `build_runner`:

```
dart run build_runner build --only-check
dart format --output=none --set-exit-if-changed .
dart analyze
dart test

```

Flutter repositories may use:

```
flutter analyze
flutter test

```

according to their existing workflow.

For older `build_runner`, reproduce the repository's generation workflow and fail on a generated Git diff.

## If generated files are ignored

CI should normally:

1. fetch dependencies
2. run code generation
3. format/check according to repository policy
4. analyze
5. run tests
6. build as required

A CI checkout that cannot regenerate required generated source is not reproducible.

---

# 66. Freezed major-version migration

Never treat:

```
freezed 2.x → 3.x

```

or:

```
3.x → 4.x

```

as a routine version bump.

Freezed 3 introduced significant changes, including:

- factory-style data classes needing an appropriate `abstract`/`sealed` declaration
- new support for classic/non-factory style
- changes around generated union APIs
- generator/output changes

Freezed 3.0 removed generated `when`/`map`, while 3.1 later restored them. Current docs still recommend native Dart matching instead.

Freezed 4 is currently prerelease, so its evolving Dart 3.13/primary-constructor behavior must not be silently introduced into stable code.

### Major-upgrade workflow

1. Read the migration guide.
2. Read changelog entries from installed version through target.
3. Check Dart minimum.
4. Check analyzer/build/source-gen compatibility.
5. Check `freezed_annotation`.
6. Check `json_serializable`/`json_annotation`.
7. Check build\_runner minimum.
8. update syntax deliberately
9. regenerate
10. analyze
11. run serialization fixtures
12. run domain/state tests
13. inspect public generated API changes
14. check exhaustive switches
15. inspect Git diff for accidental model churn

---

# 67. Dart primary constructors

Do not confuse Freezed's README terminology with Dart's new language feature.

Historically Freezed has called its redirecting-factory model style "primary constructors" because it simulated data-class-like primary declarations.

Dart now has an actual primary-constructor language feature requiring Dart 3.13. The official Dart docs state that this syntax reduces declaration boilerplate but does not change runtime semantics.

Therefore:

- verify language version before using new syntax
- do not assume Dart primary constructors replace equality/copying/JSON
- do not mix Freezed prerelease examples into stable Freezed 3 repositories
- expect this area to remain version-sensitive during Dart 3.13/Freezed 4 adoption

---

# 68. Common diagnostics

Diagnose generator problems from the root error before cleaning everything.

## Missing `.freezed.dart`

Check:

- `freezed` dev dependency
- `freezed_annotation` dependency
- annotation presence
- exact `part 'filename.freezed.dart';`
- source filename
- generator command
- analyzer/build errors preceding the missing output

## Missing `.g.dart`

Check:

- `json_serializable`
- `json_annotation`
- `.g.dart` part directive
- `fromJson`
- whether Freezed recognizes the factory
- JSON annotation/converter type errors

The current Freezed docs specifically note that the Freezed JSON detection expects the `fromJson` factory in its recognized arrow form.

## Error after upgrading to Freezed 3

Check whether a factory-style single-constructor class needs:

```
abstract class

```

or a union needs:

```
sealed class

```

rather than blindly adding suppressions.

## `copyWith` member missing

Check:

- `copyWith: false`
- static type of the reference
- union common versus variant-specific properties
- generator staleness
- incompatible generated source

## Unknown union discriminator

Check:

- JSON union key
- backend discriminator
- `FreezedUnionValue`
- global `union_key`
- casing configuration
- fallback policy
- need for a custom converter

## Generic JSON failure

Check:

- `genericArgumentFactories`
- exact `fromJsonT` signature
- nested type argument serializers
- caller-supplied serializer functions

## Converter failure

Check:

- `JsonConverter<T, S>` types
- whether `S` is actually the wire representation
- nullable converter handling
- field annotation placement
- collection element conversion

---

# 69. Stale generated code

Symptoms can include:

- constructor signature mismatch
- missing copyWith parameter
- analyzer errors in generated files
- JSON mapper referencing deleted fields
- old variant names
- duplicate outputs

Correct response:

1. inspect source changes
2. inspect generated part names
3. run normal generation
4. inspect the first generator error
5. confirm dependency compatibility

Use cache/clean operations only when evidence indicates cache corruption or a major build-graph transition.

Do **not** immediately recommend:

```
flutter clean

```

That command targets broader Flutter build artifacts and is not a universal Freezed diagnosis.

Similarly, deleting every generated file can hide rather than explain ownership problems.

---

# 70. `.dart_tool` and clean builds

`build_runner` maintains build state/caches under `.dart_tool`.

Do not routinely delete it.

A clean generator state may be appropriate after:

- severe cache corruption
- major build-system migration
- broken workspace transition
- generator graph changes that cannot be reconciled normally

But clean builds discard incremental work and make development slower.

Prefer a normal incremental build first.

---

