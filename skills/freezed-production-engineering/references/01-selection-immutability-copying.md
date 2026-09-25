# Reference: Selection, value semantics, immutability, equality, copyWith, constructors, defaults, and native Dart alternatives.

Original source lines: 1–1169

## Table of contents

  - [name: freezed-production-engineering description: Production-grade guidance for deciding when and how to use Freezed in modern Flutter and Dart repositories, including immutable modeling, sealed unions, JSON serialization, performance, build\_runner, migrations, diagnostics, and architecture tradeoffs.](#name-freezed-production-engineering-description-production-grade-guidance-for-deciding-when-and-how-)
- [Freezed Production Engineering Skill](#freezed-production-engineering-skill)
  - [1. Purpose](#1-purpose)
- [2. Core engineering philosophy](#2-core-engineering-philosophy)
- [3. Current version baseline](#3-current-version-baseline)
- [4. What Freezed currently provides](#4-what-freezed-currently-provides)
  - [Package responsibilities](#package-responsibilities)
- [5. Runtime versus build-time cost](#5-runtime-versus-build-time-cost)
- [6. Does this model actually need Freezed?](#6-does-this-model-actually-need-freezed)
- [7. When Freezed is usually valuable](#7-when-freezed-is-usually-valuable)
- [8. When Freezed is often unnecessary](#8-when-freezed-is-often-unnecessary)
- [9. Modern Dart changes the decision](#9-modern-dart-changes-the-decision)
- [10. Repository reconnaissance](#10-repository-reconnaissance)
- [11. Dependency setup](#11-dependency-setup)
- [12. Simple immutable data model](#12-simple-immutable-data-model)
- [13. Native Dart alternative](#13-native-dart-alternative)
- [14. Immutability: what Freezed guarantees](#14-immutability-what-freezed-guarantees)
  - [What Freezed does NOT guarantee](#what-freezed-does-not-guarantee)
- [15. Collection immutability and ownership](#15-collection-immutability-and-ownership)
- [16. Disabling collection protection](#16-disabling-collection-protection)
- [17. Equality and hashCode](#17-equality-and-hashcode)
  - [Runtime implication](#runtime-implication)
- [18. Equality in state-management systems](#18-equality-in-state-management-systems)
- [19. `copyWith`](#19-copywith)
- [20. Nested `copyWith`](#20-nested-copywith)
- [21. Collection updates and `copyWith`](#21-collection-updates-and-copywith)
- [22. Disabling `copyWith`](#22-disabling-copywith)
- [23. Constructors and custom behavior](#23-constructors-and-custom-behavior)
- [24. Business logic placement](#24-business-logic-placement)
- [25. Validation and `@Assert`](#25-validation-and-assert)
- [26. Default values](#26-default-values)
- [27. Non-constant defaults](#27-non-constant-defaults)
- [28. Classic Freezed classes](#28-classic-freezed-classes)
- [29. Freezed unions](#29-freezed-unions)
- [30. Do not use a union for every state](#30-do-not-use-a-union-for-every-state)
- [31. Modern Dart pattern matching](#31-modern-dart-pattern-matching)
- [32. `when`, `map`, `maybeWhen`, and historical code](#32-when-map-maybewhen-and-historical-code)
- [33. Shared union fields](#33-shared-union-fields)

---

---

## name: freezed-production-engineering description: Production-grade guidance for deciding when and how to use Freezed in modern Flutter and Dart repositories, including immutable modeling, sealed unions, JSON serialization, performance, build\_runner, migrations, diagnostics, and architecture tradeoffs.

# Freezed Production Engineering Skill

## 1. Purpose

Use this skill when creating, reviewing, refactoring, debugging, or migrating Dart models that may use `freezed`.

The goal is not to maximize Freezed adoption. The goal is to choose the simplest modeling mechanism that gives the repository the required correctness, value semantics, serialization behavior, maintainability, and runtime characteristics.

The governing principle is:

> **Use Freezed where generated value semantics, immutable copying, serialization integration, or sealed modeling materially simplify the system. Prefer native Dart when it provides the same correctness with less machinery.**

Freezed is a source-code generator for data classes, tagged unions, copying, equality, and related model boilerplate. It integrates with `json_serializable` rather than replacing it.

---

# 2. Core engineering philosophy

An AI coding agent using this skill MUST follow these rules:

1. **Inspect before modifying.**
2. **Verify installed versions before choosing syntax.**
3. **Ask whether the model actually needs Freezed.**
4. **Prefer repository consistency unless there is a concrete reason to improve it.**
5. **Prefer native Dart when it is simpler and equally safe.**
6. **Do not introduce Freezed solely to avoid writing a few straightforward lines of code.**
7. **Use Freezed when generated value semantics remove meaningful boilerplate or correctness risk.**
8. **Do not duplicate DTO/entity/model/state layers without a semantic boundary that justifies them.**
9. **Treat serialization as an external contract, not an incidental model feature.**
10. **Consider equality cost before putting large collections or deep graphs into value-equal state.**
11. **Prefer modern Dart pattern matching for sealed variants.**
12. **Never manually edit ****`.freezed.dart`**** or ****`.g.dart`****.**
13. **Regenerate after annotated source changes.**
14. **Do not use code generation to compensate for poor model boundaries.**
15. **Do not disable immutability or equality protections merely for convenience.**
16. **Do not use Freezed as an architecture layer.**
17. **Optimize for code future maintainers can understand without understanding generator internals.**
18. **When documentation and repository behavior disagree, investigate versions before changing code.**
19. **Treat a major Freezed upgrade as a migration, not a routine dependency bump.**
20. **Measure performance problems before attributing them to Freezed.**

---

# 3. Current version baseline

As of August 2026:

- Current stable `freezed`: **3.2.5**
- Stable Freezed 3.2.x requires Dart **3.8+**
- Current prerelease line: **4.0.0-dev.3**
- Current `freezed_annotation`: **3.1.0**
- Current `json_serializable`: **6.14.1**
- Current `build_runner`: **2.16.0**
- Current Dart language documentation reflects **Dart 3.12.2**
- Dart primary constructors require language version **3.13**, so they must not be assumed available in stable Dart 3.12 repositories.

Freezed 4 prereleases already contain changes related to upcoming Dart primary-constructor support. Do not generate Freezed 4/Dart 3.13 syntax for a normal stable repository unless the repository has explicitly opted into that prerelease toolchain.

### Version rule

Never infer compatibility from the Freezed version alone.

The installed generator set must be solved together:

- Dart SDK
- Flutter SDK
- `freezed`
- `freezed_annotation`
- `build_runner`
- `json_serializable`
- `json_annotation`
- analyzer/source-gen constraints

For example, Freezed 3.2.5 can support Dart 3.8, while the newest supporting generators may require newer Dart versions. Therefore, "`pub add` the latest versions" is not a safe migration strategy for an older repository.

---

# 4. What Freezed currently provides

A normal immutable factory-style Freezed class can generate:

- immutable properties
- implementation classes
- `copyWith`
- `operator ==`
- `hashCode`
- `toString`
- collection protection
- union implementations
- variant-specific generated classes
- nested/deep `copyWith` helpers for nested Freezed models
- integration hooks for JSON generation

The official Freezed documentation describes the generated value semantics directly.

## Package responsibilities

### `freezed`

`freezed` is the **generator**.

It runs through Dart's build system and generates `.freezed.dart` output. It belongs in `dev_dependencies` for normal applications/packages.

### `freezed_annotation`

`freezed_annotation` contains the annotations and small runtime-visible declarations imported by source code.

It belongs in `dependencies`. The package itself describes itself as the annotations package for the Freezed generator.

### `build_runner`

`build_runner` discovers and executes builders such as Freezed and `json_serializable`.

It belongs in `dev_dependencies`.

### `json_serializable`

`json_serializable` generates JSON encoding/decoding code.

It belongs in `dev_dependencies` when generated JSON support is required.

### `json_annotation`

`json_annotation` contains annotations such as:

- `JsonSerializable`
- `JsonKey`
- `JsonConverter`
- `JsonEnum`
- `JsonValue`

It belongs in `dependencies` when those annotations or generated JSON models are used.

### `.freezed.dart`

Generated primarily by Freezed.

It contains generated model implementations, value semantics, copying, union support, and other Freezed-generated APIs.

### `.g.dart`

Generated by `json_serializable` and related source generators.

For a Freezed JSON model, this contains the JSON mapping functions used by Freezed's generated implementation.

Freezed explicitly states that it does not independently generate the ordinary JSON mapping implementation; it coordinates with `json_serializable` when it detects a valid `fromJson` factory.

---

# 5. Runtime versus build-time cost

Freezed is primarily a **build-time source-generation technique**, not a runtime reflection framework.

Do not translate this into the inaccurate statement "Freezed has zero runtime cost."

The generator itself is not shipped as runtime behavior, but the generated Dart code obviously runs at runtime.

Potential runtime costs come from what the generated model does:

- allocating model instances
- allocating new instances through `copyWith`
- structural equality
- collection equality
- `hashCode`
- unmodifiable collection views
- JSON mapping
- union variant objects
- ordinary method calls

Those are normal Dart operations generated ahead of time.

The major engineering cost of adopting Freezed is usually:

- build generation
- dependency/version coordination
- generated source volume
- analyzer workload
- migration coupling
- understanding generated public APIs

Do not claim either "`Freezed is fast`" or "`Freezed is slow`" without identifying a specific operation.

---

# 6. Does this model actually need Freezed?

Before annotating a class, answer all of these:

1. Does it need value equality?
2. Does it need `copyWith`?
3. Does it need JSON serialization?
4. Does it represent multiple mutually exclusive variants?
5. Does native Dart already solve the problem simply?
6. Is it large or instantiated very frequently?
7. Does it contain large collections?
8. Would structural equality be expensive?
9. Is code generation worth its build/maintenance cost?
10. Is this API, domain, persistence, configuration, or UI state?
11. Does this repository already use Freezed consistently?
12. Will adding Freezed improve or reduce readability?

Then classify the model as one of:

- plain native Dart class
- native Dart sealed hierarchy
- Freezed immutable data class
- Freezed union
- Freezed + JSON model
- manual/custom implementation

Do not start with an annotation and justify it afterward.

---

# 7. When Freezed is usually valuable

Freezed is usually worth considering for:

- immutable state with several fields and frequent `copyWith`
- DTOs where value equality/copying are genuinely useful
- JSON models with substantial serialization boilerplate
- value-like objects with multiple fields
- sealed results with payload-bearing variants
- immutable reducer/state-machine state
- models where manually maintaining equality/hash/copying is error-prone
- variants where exhaustive pattern matching gives real correctness benefits

The benefit grows when several generated features are useful simultaneously.

A ten-field immutable JSON DTO that needs:

- equality
- copying
- defaults
- generated JSON

is a much stronger Freezed candidate than a one-field local wrapper.

---

# 8. When Freezed is often unnecessary

Prefer native Dart when dealing with:

- mutable services
- repositories
- controllers
- coordinators
- caches
- object-identity entities
- tiny configuration holders
- simple private implementation classes
- one-field wrappers without value-model complexity
- finite choices adequately represented by an enum
- simple sealed hierarchies that do not need generated copying/equality
- lifecycle-heavy classes
- classes with significant imperative initialization
- hot-path objects where structural equality is unwanted
- models whose generated features are mostly disabled
- objects already generated/owned by another persistence/codegen system

Freezed should not become a default annotation for "classes containing fields."

---

# 9. Modern Dart changes the decision

Dart 3 introduced class modifiers including `sealed`, `final`, `base`, and `interface`. A native `sealed` hierarchy gives the compiler a known set of subtypes and enables exhaustive switch checking.

Dart also has:

- patterns
- object patterns
- destructuring
- exhaustive switch expressions
- records
- enhanced enums
- named parameters
- extension methods
- `const`
- modern class modifiers

These features remove some historical reasons to depend on Freezed.

They do **not**, however, currently make a plain nominal Dart class automatically provide all of:

- value equality
- `hashCode`
- `copyWith`
- generated JSON
- collection-aware equality

Dart records provide concise structural aggregate values and structural equality, making them useful for local/transient aggregates, but they are not a universal replacement for named domain models with stable nominal APIs.

Dart 3.13 primary constructors reduce constructor/field declaration boilerplate, but the official language documentation states that they change declaration syntax rather than runtime behavior. They do not by themselves provide Freezed-style value semantics. They must also not be emitted into Dart 3.12 repositories.

---

# 10. Repository reconnaissance

Before creating or changing a Freezed model, inspect:

- `pubspec.yaml`
- Dart SDK constraint
- Flutter SDK/toolchain
- `pubspec.lock` for applications
- installed `freezed`
- installed `freezed_annotation`
- installed `build_runner`
- installed `json_serializable`
- installed `json_annotation`
- `analysis_options.yaml`
- `build.yaml`
- existing `.freezed.dart`
- existing `.g.dart`
- existing Freezed syntax
- model directory organization
- state-management package
- persistence packages
- custom `JsonConverter`s
- JSON naming conventions
- union discriminators
- code-generation scripts
- Makefiles/task runners
- CI generation steps
- whether generated source is committed
- formatter/analyzer policy
- current migration work

Determine whether the repository predominantly uses:

- Freezed factory models
- Freezed classic models
- native Dart models
- native sealed classes
- mixed patterns

Do not casually introduce a second modeling convention.

When a repository's syntax looks old, check its installed Freezed version before "fixing" it.

---

# 11. Dependency setup

For a current compatible Flutter project, the conceptual dependency split is:

```
dependencies:
  flutter:
    sdk: flutter
  freezed_annotation: <repository-compatible-version>

  # Only when JSON annotations/generated serialization are used:
  json_annotation: <repository-compatible-version>

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: <repository-compatible-version>
  freezed: <repository-compatible-version>

  # Only when JSON generation is used:
  json_serializable: <repository-compatible-version>

```

The official Freezed installation instructions place `freezed` and `build_runner` in dev dependencies while `freezed_annotation` is a regular dependency. JSON usage adds `json_annotation` plus the `json_serializable` dev dependency.

Do not copy version numbers from this skill into an older repository without checking its SDK constraints.

---

# 12. Simple immutable data model

Use Freezed when the object genuinely has value semantics and generated copying/equality remove meaningful maintenance burden.

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_profile.freezed.dart';

@freezed
abstract class UserProfile with _$UserProfile {
  const factory UserProfile({
    required String id,
    required String displayName,
    String? avatarUrl,
  }) = _UserProfile;
}

```

For current Freezed 3.x factory syntax, a single-constructor model generally uses `abstract class`, while a multi-constructor union normally uses `sealed class`. This was an important Freezed 3 migration change.

Use `const factory` whenever every field/default permits const construction and const instances are useful.

---

# 13. Native Dart alternative

Reject Freezed when it adds more machinery than value.

For example, a tiny event hierarchy that needs only type-safe exhaustiveness—not JSON, copying, or structural equality—can be native Dart:

```
sealed class SearchAction {
  const SearchAction();
}

final class QueryChanged extends SearchAction {
  const QueryChanged(this.query);

  final String query;
}

final class SearchSubmitted extends SearchAction {
  const SearchSubmitted();
}

String describeAction(SearchAction action) => switch (action) {
  QueryChanged(:final query) => 'Query changed to "$query"',
  SearchSubmitted() => 'Search submitted',
};

```

Dart's `sealed` modifier already provides the closed hierarchy and exhaustive pattern-matching behavior required here.

Do not add Freezed merely to reduce those few lines unless repository consistency or additional requirements justify it.

---

# 14. Immutability: what Freezed guarantees

With normal `@freezed` factory-style models, generated properties are immutable from the model's public assignment API.

That means code cannot simply assign:

```
profile.displayName = 'Other';

```

Freezed also protects `List`, `Map`, and `Set` properties by default using unmodifiable collection views. Mutation through the exposed property then throws. This can be disabled with `makeCollectionsUnmodifiable: false`.

## What Freezed does NOT guarantee

Do not assume this:

> `@freezed` means every object reachable from this instance is deeply immutable.

That is false.

Example:

```
class MutableCounter {
  MutableCounter(this.value);

  int value;
}

@freezed
abstract class DashboardState with _$DashboardState {
  const factory DashboardState({
    required MutableCounter counter,
  }) = _DashboardState;
}

```

The field reference cannot be replaced directly, but this remains legal:

```
final state = DashboardState(counter: MutableCounter(1));
state.counter.value = 2;

```

`final` prevents reassignment of the reference. It does not recursively freeze the referenced object.

---

# 15. Collection immutability and ownership

The current `Freezed` annotation documents `makeCollectionsUnmodifiable` as converting collections into:

- `UnmodifiableListView`
- `UnmodifiableMapView`
- `UnmodifiableSetView`

This is an important ownership detail.

An **unmodifiable view is not the same thing as a guaranteed defensive snapshot**.

If another owner retains the mutable backing collection and mutates that backing collection, an unmodifiable view can still observe those changes.

Therefore, when accepting a collection from an untrusted or independently mutable ownership boundary, normalize ownership before constructing long-lived value state.

For example:

```
List<String> snapshotTags(Iterable<String> input) {
  return List<String>.unmodifiable(input);
}

```

Then:

```
final state = ArticleState(
  tags: snapshotTags(externalMutableTags),
);

```

This is particularly important when objects:

- are used as map/set keys
- are memoized
- are cached by equality/hash
- are emitted as state
- must preserve historical values

Freezed's default protection prevents mutation through the Freezed getter. It does not make arbitrary input graphs recursively immutable.

---

# 16. Disabling collection protection

Freezed supports:

```
@Freezed(makeCollectionsUnmodifiable: false)
abstract class MutableCollectionContainer
    with _$MutableCollectionContainer {
  const factory MutableCollectionContainer({
    required List<String> items,
  }) = _MutableCollectionContainer;
}

```

This makes mutations through the collection possible.

Do this only when the model's mutation semantics are deliberate.

Before disabling protection ask:

- Is this object truly supposed to have value semantics?
- Can `hashCode` change while the object is in a `Set` or as a `Map` key?
- Can state change without a new object being emitted?
- Will selectors/rebuild logic detect the mutation?
- Would a native mutable class be clearer?

If mutable collection semantics are fundamental to the class, a native mutable object may be a better design than an "immutable" Freezed object with its central immutability mechanism disabled.

---

# 17. Equality and hashCode

Freezed normally generates `operator ==` and `hashCode` for immutable models. It supports disabling them through `equal: false`.

Collection-valued models receive collection-aware equality rather than plain collection identity semantics.

## Runtime implication

Structural equality is not free.

Comparing:

```
State(
  5 primitive fields,
  1 list containing 50,000 nested value objects
)

```

may require significant traversal when the list contents differ only late in the comparison.

The cost depends on:

- number of fields
- location of the first difference
- collection sizes
- nesting depth
- equality implementation of nested elements
- number/frequency of comparisons
- whether identical references allow fast paths

The correct optimization is usually not "turn off equality everywhere."

Instead investigate:

- why the huge graph is one state value
- whether a repository/cache should own large data
- whether UI state should hold IDs/revisions instead
- whether selectors can observe a smaller slice
- whether identity semantics are actually what the object requires

---

# 18. Equality in state-management systems

Generated equality can be highly useful because common Flutter state-management mechanisms compare values or suppress duplicate state.

For example, `ValueNotifier` bases notifications on whether the new value compares unequal to the old value, making immutable value types a natural fit. Bloc/Cubit similarly avoids emitting a state equal to the current state.

Riverpod's selective-listening APIs likewise rely on comparing selected values to decide whether the selected result changed.

`ChangeNotifier` is different: notification is explicitly controlled by `notifyListeners`, so Freezed equality does not itself determine notifications.

### Rule

Do not interpret value equality as automatically improving performance.

Equality can:

- suppress redundant updates
- improve deterministic state semantics

while simultaneously:

- costing CPU when large graphs are compared frequently

Design the state boundary first.

---

# 19. `copyWith`

Freezed's generated `copyWith` distinguishes:

- an omitted parameter → preserve the existing value
- an explicitly supplied `null` → set a nullable field to `null`

This behavior is officially supported.

Example:

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'account.freezed.dart';

@freezed
abstract class Account with _$Account {
  const factory Account({
    required String id,
    String? nickname,
  }) = _Account;
}

```

Usage:

```
const original = Account(
  id: 'user-42',
  nickname: 'Ada',
);

// nickname stays "Ada".
final renamedId = original.copyWith(id: 'user-43');

// nickname is explicitly cleared.
final cleared = original.copyWith(nickname: null);

```

Do not write manual sentinel logic merely to support nullable `copyWith`. Freezed already solves this.

---

# 20. Nested `copyWith`

When a Freezed model owns another Freezed model, generated nested copy helpers can reduce repetition.

The official documentation supports chains such as:

```
final updated = company.copyWith.director.assistant(
  name: 'Grace Hopper',
);

```

For nullable nested paths, generated helpers may require nullable invocation, such as `?.call(...)`.

Treat this as **nested copying convenience**, not a recursive deep clone.

Only the modified path receives newly created objects. Other referenced objects remain shared.

That structural sharing is usually desirable.

If callers semantically need:

- "approve order"
- "apply server patch"
- "advance workflow"
- "replace basket contents"

prefer a meaningful model/service method over an opaque chain of generic `copyWith`s when it improves domain readability.

---

# 21. Collection updates and `copyWith`

This:

```
final next = state.copyWith(
  items: [...state.items, newItem],
);

```

has two separate operations:

1. Dart constructs a new `List`.
2. `copyWith` constructs a new state instance that references that list.

Freezed does not magically mutate or deep-copy the old list.

The collection copy cost comes primarily from the list operation, not from the existence of the generated `copyWith` API.

In tight loops or huge collections, repeatedly constructing:

```
items = [...items, element];

```

can be far more important than the cost of the Freezed object itself.

Batch changes where appropriate.

---

# 22. Disabling `copyWith`

Freezed supports:

```
@Freezed(copyWith: false)

```

when generated copying is not appropriate.

Before doing that, ask whether Freezed still provides enough value.

If a model has:

- `copyWith: false`
- `equal: false`
- no JSON
- no union

a plain Dart class may communicate its semantics more clearly.

---

# 23. Constructors and custom behavior

Factory-style Freezed classes normally use redirecting factory constructors:

```
@freezed
abstract class Product with _$Product {
  const factory Product({
    required String id,
    required String name,
  }) = _Product;
}

```

To add instance methods/getters that the generated implementation inherits, define a private constructor:

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'money.freezed.dart';

@freezed
abstract class Money with _$Money {
  const Money._();

  const factory Money({
    required int minorUnits,
    required String currency,
  }) = _Money;

  bool get isZero => minorUnits == 0;

  Money add(Money other) {
    if (currency != other.currency) {
      throw ArgumentError.value(
        other.currency,
        'other.currency',
        'Currency must match $currency',
      );
    }

    return copyWith(
      minorUnits: minorUnits + other.minorUnits,
    );
  }
}

```

The private `ClassName._()` constructor causes generated classes to subclass the Freezed declaration rather than merely implement its interface, allowing methods to be inherited.

---

# 24. Business logic placement

Model behavior belongs inside the model when it:

- directly expresses the model's own invariant
- depends only on its fields
- has deterministic value semantics
- makes valid transitions clearer

Keep logic outside when it:

- performs I/O
- accesses repositories
- depends on clocks/network/storage unless explicitly injected
- coordinates several aggregates
- executes use-case/application behavior
- normalizes unstable external payloads

Freezed does not imply an anemic-domain-model architecture, nor does it justify turning a data container into an application service.

---

# 25. Validation and `@Assert`

Freezed currently supports `@Assert`.

However, Dart assertions are intended for development/debug checking and are not a release-build validation mechanism.

Therefore:

**Never use ****`@Assert`**** as the sole validation for:**

- untrusted network input
- authorization rules
- security-sensitive invariants
- persisted data integrity
- required production business invariants

Use explicit runtime validation instead.

Example:

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'percentage.freezed.dart';

@freezed
abstract class Percentage with _$Percentage {
  const Percentage._();

  const factory Percentage._value({
    required double value,
  }) = _Percentage;

  static Percentage checked(double value) {
    if (value < 0 || value > 100 || value.isNaN) {
      throw ArgumentError.value(
        value,
        'value',
        'Percentage must be between 0 and 100.',
      );
    }

    return Percentage._value(value: value);
  }
}

```

The production invariant does not depend on assertions being enabled.

---

# 26. Default values

For compile-time constant defaults use `@Default`:

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'filters.freezed.dart';

@freezed
abstract class Filters with _$Filters {
  const factory Filters({
    @Default('') String query,
    @Default(false) bool includeArchived,
    @Default(<String>[]) List<String> tags,
  }) = _Filters;
}

```

Freezed's documentation states that when JSON serialization is enabled, `@Default` also supplies an equivalent JSON default configuration.

Use defaults intentionally.

Avoid silently defaulting a missing API field if a missing field actually represents a schema violation.

These two meanings are different:

```
missing `items` means []

```

and:

```
`items` must exist; absence means malformed API data

```

Model the contract rather than suppressing errors.

---

# 27. Non-constant defaults

`@Default` is for constant annotation values.

For values such as:

```
DateTime.now()

```

Freezed documents two main options:

- classic-class syntax
- a private constructor that supplies initialization behavior

Do not put time-dependent or random values into an API-facing model casually.

When deterministic testing matters, it may be clearer to let the call site supply the value.

---

# 28. Classic Freezed classes

Freezed 3 supports "classic" normal Dart classes in addition to its redirecting-factory style.

Example:

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'audit_stamp.freezed.dart';
part 'audit_stamp.g.dart';

@freezed
@JsonSerializable()
class AuditStamp with _$AuditStamp {
  AuditStamp({
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now().toUtc();

  @override
  final DateTime createdAt;

  factory AuditStamp.fromJson(Map<String, Object?> json) =>
      _$AuditStampFromJson(json);

  Map<String, Object?> toJson() => _$AuditStampToJson(this);
}

```

In classic mode, Freezed generates the value-oriented features such as `copyWith`, equality, `hashCode`, and `toString`, while ordinary `json_serializable` annotation/use is explicit. The official docs recommend this form when advanced constructor logic makes factory-style declarations awkward.

Prefer classic mode over elaborate generator tricks when normal Dart constructor semantics make the model clearer.

---

# 29. Freezed unions

Use a Freezed union when the states are **genuinely mutually exclusive** and each variant can carry a distinct valid payload.

Example:

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'session_state.freezed.dart';

@freezed
sealed class SessionState with _$SessionState {
  const factory SessionState.signedOut() = SessionSignedOut;

  const factory SessionState.loading() = SessionLoading;

  const factory SessionState.authenticated({
    required SessionUser user,
  }) = SessionAuthenticated;

  const factory SessionState.failure({
    required String message,
  }) = SessionFailure;
}

@freezed
abstract class SessionUser with _$SessionUser {
  const factory SessionUser({
    required String id,
    required String displayName,
  }) = _SessionUser;
}

```

Multiple Freezed constructors produce mutually exclusive generated variants. Fields that are not present on every constructor cannot be accessed directly from the union base until the value is narrowed.

This is useful because invalid combinations such as:

```
authenticated = true
user = null
error != null
loading = true

```

are impossible to represent.

---

# 30. Do not use a union for every state

A union is not inherently superior to one immutable state object.

A field-based state is often better when conditions legitimately coexist:

```
@freezed
abstract class FeedViewState with _$FeedViewState {
  const factory FeedViewState({
    @Default(false) bool isRefreshing,
    String? selectedPostId,
    @Default('') String filter,
    String? nonFatalError,
  }) = _FeedViewState;
}

```

Examples of coexisting concerns:

- data can remain visible while refreshing
- an error banner can coexist with old content
- a selected item can coexist with loading another resource
- filtering can coexist with pagination

A union is appropriate when transitions represent truly exclusive semantic modes.

Do not create ten variants merely because a state-management tutorial did.

---

# 31. Modern Dart pattern matching

The default way to consume a current Freezed union is Dart's native pattern matching.

```
String sessionLabel(SessionState state) => switch (state) {
  SessionSignedOut() => 'Sign in',
  SessionLoading() => 'Loading…',
  SessionAuthenticated(:final user) => 'Hello ${user.displayName}',
  SessionFailure(:final message) => message,
};

```

This:

- narrows the variant
- destructures fields
- allows exhaustiveness checking
- uses ordinary Dart language syntax

The current Freezed README explicitly labels generated `when`/`map` APIs as **legacy** and recommends native Dart `switch`expressions instead.

---

# 32. `when`, `map`, `maybeWhen`, and historical code

Freezed's history is version-sensitive here.

Freezed 3.0 removed generated `when`/`map`; Freezed 3.1 restored them. The current Freezed 3.2 documentation still classifies those helpers as legacy because Dart now has native sealed-class pattern matching.

Therefore:

- do not claim these APIs no longer exist in current 3.2.x
- do not teach them as the preferred new style
- retain them when necessary for an existing repository
- use native `switch` for new code where the repository's Dart version supports it
- verify Freezed version before migrating old usage

Do not copy an old tutorial's `when` pattern merely because it compiles.

---

# 33. Shared union fields

Consider:

```
@freezed
sealed class SearchResult with _$SearchResult {
  const factory SearchResult.person({
    required String id,
    required String displayName,
    required int age,
  }) = PersonSearchResult;

  const factory SearchResult.company({
    required String id,
    required String displayName,
    required int employeeCount,
  }) = CompanySearchResult;
}

```

`id` and `displayName` are shared and can be exposed at the common level.

`age` and `employeeCount` require narrowing.

Prefer pattern matching:

```
String resultDetails(SearchResult result) => switch (result) {
  PersonSearchResult(:final age) => 'Age: $age',
  CompanySearchResult(:final employeeCount) =>
    'Employees: $employeeCount',
};

```

Do not scatter `is`/`as` casts through business logic when a `switch` expresses the exhaustiveness more clearly.

---

