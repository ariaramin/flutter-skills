# Reference navigation

Equality modeling, Dart equality fundamentals, Equatable APIs, props, immutability, collections, inheritance, entities, records, generators, and manual equality.

## Contents
- Purpose
- When to Use This Skill
- When NOT to Use Equatable
- Core Principles
- Mental Model
- Dart Equality Fundamentals
  - Identity
  - Value Equality
  - `==`
  - `hashCode`
  - Hash Collections
- Equatable vs Manual Equality vs Generated Equality
- Equatable
- EquatableMixin
  - Current rule
- `props` Design
  - Correct
  - Missing field bug
  - Field classification
- Derived Fields
- Immutability
  - Safe immutable construction
- Nullable Fields
- Primitive Values
- Floating-Point Values
- Nested Objects
  - Nested Equatable object
  - Nested non-Equatable object
- Collections
  - Lists and other ordered Iterables
  - Sets
  - Maps
  - Nested collections
  - Collections containing Equatable objects
  - Collections containing plain objects
- Collection Immutability
- Inheritance
- Sealed State Hierarchies
- Entity vs Value Object Equality
  - Value object
  - Entity
- DTO Equality
- Records
- Code-Generation Alternatives
- Manual Equality

---

# Equatable Engineering Skill for Dart & Flutter

## Purpose

Use this skill when implementing, reviewing, debugging, testing, migrating, or optimizing value equality in production Dart and Flutter code.

Treat `equatable` as an implementation tool for a previously defined equality model. Do not start by adding `extends Equatable`. Start by deciding what the type represents and what it means for two instances of that type to be equal.

This skill is based on current first-party behavior in Equatable 2.1.0, its source and tests, Dart equality documentation, and current Bloc/flutter_bloc behavior. Equatable 2.1.0 requires Dart `>=3.0.0 <4.0.0`. In this version, `Equatable` is an `abstract mixin class`; the legacy `EquatableMixin` is deprecated in favor of `with Equatable`.

---

## When to Use This Skill

Apply this skill when:

- creating immutable domain value objects;
- deciding equality semantics for domain entities;
- implementing immutable Bloc/Cubit states;
- implementing Bloc events where value equality is useful;
- reviewing an existing `props` implementation;
- debugging two objects that compare unexpectedly equal or unequal;
- debugging a Cubit/Bloc state update that appears to be ignored;
- reviewing equality involving `List`, `Set`, `Map`, or nested collections;
- implementing immutable UI/view models;
- deciding whether DTOs require equality;
- migrating manual `operator ==` and `hashCode`;
- migrating away from Equatable toward generated equality or records;
- reviewing objects used as `Set` elements or `Map` keys;
- profiling equality-heavy models;
- reviewing `stringify` and logging exposure;
- reviewing inheritance or sealed state hierarchies.

Do not interpret this skill as a requirement to use Equatable. The correct outcome may be identity equality, records, generated equality, or specialized manual equality.

---

## When NOT to Use Equatable

Avoid Equatable when value equality does not match the meaning or lifecycle of the type.

| Type/situation | Default decision |
| --- | --- |
| `AnimationController`, `TextEditingController`, `ScrollController` | Identity semantics |
| Repository/service instance | Usually identity semantics |
| Database/network client | Identity/resource semantics |
| Stream subscription, socket, file handle | Identity/lifecycle semantics |
| Disposable/resource-owning object | Avoid value equality |
| Mutable aggregate | Avoid custom value equality unless rigorously controlled |
| Type whose equality is never used | Do not add unnecessary equality machinery |
| Model already generated with `==`/`hashCode` | Use generated equality only |
| Short tuple-like internal result | Consider a Dart record |
| Approximate numeric equality | Use specialized modeling/manual equality |
| Domain entity whose equality is identity-based | Model its domain identity deliberately |
| Callback/command object | Usually identity or explicit command semantics |

Examples:

```dart
// Value semantics make sense.
final class Money extends Equatable {
  const Money(this.amountInMinorUnits, this.currency);

  final int amountInMinorUnits;
  final String currency;

  @override
  List<Object> get props => [amountInMinorUnits, currency];
}
```

```dart
// Do not add Equatable merely because the type has fields.
// This object represents one lifecycle/resource instance.
final class VideoSessionController {
  VideoSessionController(this.sessionId);

  final String sessionId;

  Future<void> dispose() async {
    // Release owned resources.
  }
}
```

Ask:

> If two separately constructed objects contain matching data, should the application be allowed to treat them as the same logical value?

If the answer is no, prefer identity semantics.

---

## Core Principles

1. **Define equality semantics before implementing Equatable.**
2. **Use value equality only for types that represent values.**
3. **Keep equality-participating data immutable.**
4. **Include every logically significant value in `props`.**
5. **Exclude a field only because the domain says it does not affect equality, not because omitting it is convenient.**
6. **Do not place unstable lifecycle state, callbacks, random values, or mutable resources in `props`.**
7. **Verify equality semantics of nested objects. Equatable cannot manufacture value equality for arbitrary plain objects.**
8. **Understand Equatable's structural collection behavior before relying on it.**
9. **Never mutate Bloc/Cubit state and expect Equatable to recognize a new state.**
10. **Maintain the rule `a == b` ⇒ `a.hashCode == b.hashCode`.**
11. **Treat objects used as hash keys as deeply immutable with respect to equality.**
12. **Treat changes to `props` as behavioral changes.**
13. **Do not combine multiple authoritative equality implementations on one type.**
14. **Prefer correctness and clarity over equality micro-optimizations.**
15. **Profile large/deep equality before redesigning it for performance.**
16. **Do not expose credentials, tokens, personal information, or secrets via `stringify`.**

Equatable's own README explicitly states that it is designed for immutable objects and notes the danger of mutable values in hash-based collections.

---

## Mental Model

Use this model:

```text
Object A
+
Object B
↓
Identical instance?
├─ yes → equal
└─ no
   ↓
Same Equatable equality domain/runtime type?
├─ no → not equal
└─ yes
   ↓
Compare props in order
↓
Recursively compare supported collections/nested values
↓
Equal / Not equal
↓
Compute hashCode from runtime type + props
```

Current `Equatable.operator ==` first accepts `identical(this, other)`, then requires the other object to participate in Equatable equality, requires matching `runtimeType`, and compares `props`. Its `hashCode` incorporates both `runtimeType` and the hashed properties.

Therefore:

```dart
final class Loading extends Equatable {
  const Loading();

  @override
  List<Object> get props => const [];
}

final class Loaded extends Equatable {
  const Loaded();

  @override
  List<Object> get props => const [];
}
```

`const Loading()` and `const Loaded()` are not equal even though both have empty `props`, because their runtime types differ.

---

## Dart Equality Fundamentals

### Identity

Identity asks:

> Are these references the exact same object?

Use:

```dart
identical(a, b)
```

The default `Object.operator ==` behavior is identity-based: two ordinary objects compare equal only when they are the same object unless the class overrides equality. Dart documents `==` as an equivalence relation that should be reflexive, symmetric, transitive, total, and consistent over time.

### Value Equality

Value equality asks:

> Do these objects represent the same logical value?

Example:

```dart
Money(1000, 'USD')
Money(1000, 'USD')
```

These are two distinct instances but can reasonably represent one logical value.

### `==`

Dart evaluates `x == y` by invoking equality on the left operand, except for null handling. Use `identical` only when exact object identity is intended.

### `hashCode`

If custom equality considers two objects equal, their hash codes must also be equal:

```text
a == b
→
a.hashCode == b.hashCode
```

The reverse is not required: hash collisions are allowed.

Dart's analyzer explicitly requires equality and hash code overrides to remain paired because hash maps depend on the contract.

### Hash Collections

Objects used as `HashSet` elements or `HashMap` keys must have stable equality and hash codes over time. Dart documents this requirement directly.

Never mutate equality-defining data after insertion into a hash-based collection.

---

## Equatable vs Manual Equality vs Generated Equality

| Need | Preferred approach |
| --- | --- |
| Ordinary immutable named value type | Equatable is often appropriate |
| Existing superclass plus value equality | `with Equatable` |
| Boilerplate-free generated data model already in use | Generated equality |
| Short-lived tuple-like result | Dart record |
| Highly specialized equality | Manual implementation |
| Approximate/epsilon comparison | Specialized model/manual comparison |
| Identity/lifecycle semantics | No custom value equality |
| Performance-critical custom algorithm verified by profiling | Specialized manual implementation |
| Existing manual equality with complex domain semantics | Preserve semantics first; migrate only with tests |

Use **one authoritative equality implementation per type**.

Do not layer Equatable on a class whose generator already emits `operator ==` and `hashCode`.

---

## Equatable

Current Equatable 2.1.0 supports both extending and mixing in `Equatable`.

Prefer extending it when no other superclass is required:

```dart
import 'package:equatable/equatable.dart';

final class Money extends Equatable {
  const Money({
    required this.amountInMinorUnits,
    required this.currency,
  });

  final int amountInMinorUnits;
  final String currency;

  @override
  List<Object> get props => [
        amountInMinorUnits,
        currency,
      ];
}
```

Use `List<Object?>` when nullable equality fields exist:

```dart
final class Profile extends Equatable {
  const Profile({
    required this.name,
    this.avatarUrl,
  });

  final String name;
  final Uri? avatarUrl;

  @override
  List<Object?> get props => [
        name,
        avatarUrl,
      ];
}
```

Nullable `props` are explicitly supported by the current package documentation.

---

## EquatableMixin

### Current rule

Do **not** introduce new uses of:

```dart
with EquatableMixin
```

`EquatableMixin` is deprecated in Equatable 2.1.0 with the instruction to use `Equatable` itself as a mixin.

When a type already extends another class:

```dart
import 'package:equatable/equatable.dart';

class FrameworkBase {
  const FrameworkBase();
}

final class ScreenDescriptor extends FrameworkBase with Equatable {
  const ScreenDescriptor({
    required this.route,
    required this.title,
  });

  final String route;
  final String title;

  @override
  List<Object> get props => [route, title];
}
```

When reviewing legacy code:

```dart
class LegacyValue with EquatableMixin {
  // ...
}
```

prefer migration to:

```dart
class LegacyValue with Equatable {
  // ...
}
```

provided the project's Equatable version supports the 2.1.0 API.

---

## `props` Design

Treat `props` as the executable definition of the type's logical value.

For every candidate property ask:

> Should two instances be considered different when this field differs?

If yes, include it.

If no, determine whether the field is truly outside the logical equality definition.

### Correct

```dart
final class UserProfileState extends Equatable {
  const UserProfileState({
    required this.name,
    required this.isLoading,
  });

  final String name;
  final bool isLoading;

  @override
  List<Object> get props => [
        name,
        isLoading,
      ];
}
```

### Missing field bug

```dart
final class UserState extends Equatable {
  const UserState({
    required this.name,
    required this.isLoading,
  });

  final String name;
  final bool isLoading;

  @override
  List<Object> get props => [name];
}
```

Here:

```dart
const a = UserState(name: 'Ava', isLoading: false);
const b = UserState(name: 'Ava', isLoading: true);

print(a == b); // true
```

The implementation says loading status does not participate in equality.

For Bloc/Cubit state this can suppress an intended state emission.

Correct it:

```dart
@override
List<Object> get props => [name, isLoading];
```

### Field classification

Typically include:

- scalar values that define the model;
- status enums;
- IDs when identity is part of semantics;
- nested immutable values;
- nullable logical values;
- semantically relevant collections.

Usually exclude:

- caches computed only for performance;
- callbacks;
- controllers;
- stream subscriptions;
- logger instances;
- repositories/services;
- derived values fully determined by already included properties;
- mutable implementation details;
- transient diagnostic metadata unless the domain explicitly treats it as state.

Do not exclude a field merely because "it causes rebuilds." If changing that field represents a new logical state, equality should reflect that.

---

## Derived Fields

A field completely determined by other equality-defining fields is usually redundant.

```dart
final class Rectangle extends Equatable {
  const Rectangle({
    required this.width,
    required this.height,
  });

  final double width;
  final double height;

  double get area => width * height;

  @override
  List<Object> get props => [width, height];
}
```

Do not ordinarily add `area` because it carries no independent information.

This is an architectural recommendation, not an Equatable package restriction. Equatable will compare whatever you put in `props`.

Include a computed property only when it has independent equality semantics or is not guaranteed to remain a pure function of existing equality fields.

---

## Immutability

Immutability is a correctness requirement, not a style preference.

This looks superficially immutable:

```dart
final class User extends Equatable {
  const User(this.roles);

  final List<String> roles;

  @override
  List<Object> get props => [roles];
}
```

But `final` only prevents replacing the `roles` reference. The list contents may still mutate:

```dart
final roles = <String>['reader'];
final user = User(roles);

final before = user.hashCode;

roles.add('admin');

final after = user.hashCode;

assert(before != after);
```

Equatable's own tests confirm that modifying collection contents changes the object's calculated hash code.

That can break:

- hash collection lookup;
- equality consistency assumptions;
- caching;
- Bloc state modeling;
- selector behavior;
- test reliability.

### Safe immutable construction

Prefer an immutable snapshot:

```dart
final class User extends Equatable {
  User({required Iterable<String> roles})
      : roles = List.unmodifiable(roles);

  final List<String> roles;

  @override
  List<Object> get props => [roles];
}
```

For nullable or nested inputs, copy as deeply as your mutation boundaries require.

An unmodifiable outer list does not automatically freeze mutable objects contained inside it.

---

## Nullable Fields

Use `List<Object?>` whenever nullable properties participate:

```dart
final class ProfileState extends Equatable {
  const ProfileState({
    required this.userId,
    this.errorMessage,
  });

  final String userId;
  final String? errorMessage;

  @override
  List<Object?> get props => [
        userId,
        errorMessage,
      ];
}
```

`null` behaves as a normal equality value.

Two instances containing `null` in the same equality positions can be equal. A null value and a non-null value differ.

Equatable's current source uses nullable objects throughout its equality utilities.

---

## Primitive Values

For ordinary immutable scalar fields, include them directly:

```dart
final class Preferences extends Equatable {
  const Preferences({
    required this.fontScale,
    required this.darkMode,
    required this.localeCode,
    required this.sortMode,
  });

  final int fontScale;
  final bool darkMode;
  final String localeCode;
  final SortMode sortMode;

  @override
  List<Object> get props => [
        fontScale,
        darkMode,
        localeCode,
        sortMode,
      ];
}

enum SortMode { newest, oldest }
```

No wrapping or special equality logic is required.

---

## Floating-Point Values

Equatable does not add tolerance or approximate equality.

Its utility code delegates numeric comparison to normal Dart numeric equality.

Therefore:

```dart
0.1 + 0.2
```

does not become approximately equal to another `double` merely because it appears in `props`.

Dart also specifies special behavior such as `NaN != NaN`.

For money, prefer exact representations such as minor integer units or decimal-specific modeling.

For scientific or measurement data where tolerance matters, make the semantics explicit rather than expecting Equatable to supply epsilon equality.

Example:

```dart
final class TemperatureReading {
  const TemperatureReading(this.celsius);

  final double celsius;

  bool approximatelyEquals(
    TemperatureReading other, {
    double epsilon = 1e-6,
  }) {
    return (celsius - other.celsius).abs() <= epsilon;
  }
}
```

Do not casually turn approximate domain comparison into global `operator ==`; determine whether approximate comparison actually satisfies the equality relation required by your data structures.

---

## Nested Objects

### Nested Equatable object

```dart
final class Address extends Equatable {
  const Address({
    required this.city,
    required this.countryCode,
  });

  final String city;
  final String countryCode;

  @override
  List<Object> get props => [city, countryCode];
}

final class UserProfile extends Equatable {
  const UserProfile({
    required this.name,
    required this.address,
  });

  final String name;
  final Address address;

  @override
  List<Object> get props => [name, address];
}
```

The containing type delegates nested value semantics to `Address`.

### Nested non-Equatable object

```dart
class PlainAddress {
  PlainAddress(this.city);

  final String city;
}

final class UserProfile extends Equatable {
  const UserProfile(this.address);

  final PlainAddress address;

  @override
  List<Object> get props => [address];
}
```

Two separately created `PlainAddress('Tallinn')` objects retain whatever equality `PlainAddress` defines. If it uses default `Object` equality, they compare by identity.

Equatable does not inspect arbitrary object fields.

Before adding a nested field to `props`, verify how that nested type implements `==` and `hashCode`.

---

## Collections

Current Equatable 2.1.0 performs structural comparison for supported collection values appearing in `props`. This behavior comes from current source and tests, not from an assumption about Dart's built-in collection `==`.

### Lists and other ordered Iterables

For `Iterable` values other than `Set`:

- lengths must match;
- elements are compared position by position;
- nested supported collections are recursively compared;
- order matters.

Thus:

```dart
['A', 'B'] != ['B', 'A']
```

inside Equatable structural property comparison.

Equatable tests verify nested iterable equality and equality between different list implementations containing the same ordered values.

### Sets

Sets are compared structurally without requiring iteration order to match.

Current source checks matching lengths and verifies that each element in one set has an equal element in the other. Current tests explicitly verify equal sets created in different orders.

### Maps

Maps are compared by:

- same size;
- corresponding keys;
- recursively compared associated values.

Insertion order is not part of equality. Current tests verify that maps with the same entries in different insertion orders compare equally and receive the same Equatable hash code.

### Nested collections

Current equality utilities recursively dispatch across:

- `Set`;
- `Iterable`;
- `Map`;
- Equatable values;
- ordinary object equality.

Therefore nested lists/maps/sets are structurally compared according to those rules.

### Collections containing Equatable objects

Element comparison invokes those objects' equality semantics.

### Collections containing plain objects

Their own equality behavior still applies.

```dart
final first = [
  PlainAddress('Tallinn'),
];

final second = [
  PlainAddress('Tallinn'),
];
```

Structural list traversal does not imply structural introspection of `PlainAddress`.

---

## Collection Immutability

Structural comparison does **not** make mutable collections safe.

Bad:

```dart
final class SearchState extends Equatable {
  const SearchState(this.results);

  final List<String> results;

  @override
  List<Object> get props => [results];
}

final results = <String>['A'];
final state = SearchState(results);

results.add('B');
```

The logical value and hash code of `state` have now changed without creating a new state.

Prefer:

```dart
final class SearchState extends Equatable {
  SearchState({required Iterable<String> results})
      : results = List.unmodifiable(results);

  final List<String> results;

  @override
  List<Object> get props => [results];
}
```

For sets:

```dart
items = Set.unmodifiable(items);
```

For maps:

```dart
values = Map.unmodifiable(values);
```

Use immutable collection libraries only when their stronger guarantees justify the dependency.

---

## Inheritance

Equatable equality requires matching runtime types. Base and subclass instances therefore do not compare equal merely because they expose matching properties.

When a subclass adds logical state, extend the parent's properties:

```dart
class BaseState extends Equatable {
  const BaseState(this.id);

  final int id;

  @override
  List<Object> get props => [id];
}

final class LoadedState extends BaseState {
  const LoadedState(super.id, this.data);

  final String data;

  @override
  List<Object> get props => [
        ...super.props,
        data,
      ];
}
```

Failing to include parent equality values changes subclass semantics:

```dart
@override
List<Object> get props => [data]; // Usually wrong if id remains significant.
```

Do not blindly spread `super.props` either. First verify that the superclass equality contract is intended to remain part of the subclass's logical value.

---

## Sealed State Hierarchies

Equatable does not provide sealed-union semantics. Dart's `sealed`, `final`, `base`, and related class modifiers control subtype relationships; Equatable supplies equality.

A useful state hierarchy:

```dart
import 'package:equatable/equatable.dart';

sealed class ProfileState extends Equatable {
  const ProfileState();
}

final class ProfileInitial extends ProfileState {
  const ProfileInitial();

  @override
  List<Object> get props => const [];
}

final class ProfileLoading extends ProfileState {
  const ProfileLoading();

  @override
  List<Object> get props => const [];
}

final class ProfileLoaded extends ProfileState {
  const ProfileLoaded(this.profile);

  final Profile profile;

  @override
  List<Object> get props => [profile];
}

final class ProfileFailure extends ProfileState {
  const ProfileFailure(this.message);

  final String message;

  @override
  List<Object> get props => [message];
}
```

`ProfileInitial()` and `ProfileLoading()` remain unequal because Equatable requires the same runtime type.

---

## Entity vs Value Object Equality

Do not equate "has data fields" with "all fields belong in equality."

### Value object

```text
Money(amount, currency)
```

Usually represents a complete value. Compare defining fields.

### Entity

```text
User(id, name, email)
```

The correct answer depends on the domain.

If a `User` represents one persistent person/account across changing attributes, identity may be based on `id`:

```dart
final class UserIdentity extends Equatable {
  const UserIdentity(this.id);

  final String id;

  @override
  List<Object> get props => [id];
}
```

But a snapshot such as:

```text
UserSnapshot(id, name, email)
```

may legitimately use full value semantics.

Do not blindly use:

```dart
props => [id];
```

or:

```dart
props => [id, name, email];
```

until the equality domain has been defined.

Ask:

- Does changing `name` produce a new value or merely change attributes of the same entity?
- Is equality being used for entity identity, state snapshots, deduplication, or presentation?
- Could two separate entities ever contain all the same descriptive fields?
- Could one entity legitimately change those fields while remaining the same entity?

This is domain modeling guidance, not a rule imposed by Equatable.

---

## DTO Equality

Do not automatically extend every API DTO with Equatable.

DTO value equality is useful when the DTO is actually compared for:

- tests;
- caching;
- deduplication;
- state comparison;
- memoization;
- collection membership.

If DTOs are only decoded, transformed, and discarded, custom equality may add unnecessary API surface.

Prefer a generated modeling system if serialization and immutable data-class generation already provide equality.

---

## Records

Modern Dart records automatically provide structural `==` and `hashCode` based on record shape and fields.

Use a record for concise internal tuple-like values:

```dart
(String name, int age) parseUser() {
  return ('Ava', 30);
}
```

Use a dedicated named model when:

- domain meaning deserves a named abstraction;
- validation belongs with the type;
- methods/behavior belong with the value;
- serialization is required;
- public API clarity matters;
- future evolution is likely.

Do not create an Equatable wrapper around a record merely to obtain equality the record already provides.

---

## Code-Generation Alternatives

If the codebase uses a generator that already generates:

- immutable fields;
- `copyWith`;
- `operator ==`;
- `hashCode`;

use that equality implementation.

Do not layer:

```dart
GeneratedModel extends Equatable
```

on top of another generated equality system without a concrete need.

Rule:

> Use one authoritative equality implementation per type.

---

## Manual Equality

Manual `operator ==` and `hashCode` remain appropriate when Equatable's standard property equality is not the actual contract.

Examples:

- specialized domain equality;
- compatibility rules spanning multiple runtime types;
- measured performance-critical equality;
- nonstandard normalization;
- explicit canonicalization.

When manually implementing equality, preserve Dart's equivalence and hash contract requirements.

Do not manually override `==` on an Equatable type merely to work around incorrect `props`. Fix the design or use one intentional manual equality implementation.

---

