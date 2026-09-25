# Immutability and API visibility contracts

Use this reference for `@immutable`, deep-vs-shallow immutability, `_private`, `@protected`, `@internal`, `@visibleForTesting`, and testing-boundary design.

## Table of contents

- [Immutability](#immutability)
  - [What `@immutable` means](#what-immutable-means)
  - [`final` is not deep immutability](#final-is-not-deep-immutability)
  - [Shallow analyzer contract vs semantic deep immutability](#shallow-analyzer-contract-vs-semantic-deep-immutability)
    - [Analyzer-level immutable check](#analyzer-level-immutable-check)
    - [Strong value immutability](#strong-value-immutability)
  - [Do not infer thread safety](#do-not-infer-thread-safety)
- [Flutter and `@immutable`](#flutter-and-immutable)
- [Immutable Flutter State Example](#immutable-flutter-state-example)
- [Immutability-Related Lints](#immutability-related-lints)
- [API Visibility](#api-visibility)
- [`_private`](#private)
- [`@protected`](#protected)
- [`@internal`](#internal)
  - [`_private` vs `@internal`](#private-vs-internal)
- [`@internal` Is Not Security](#internal-is-not-security)
- [`@visibleForTesting`](#visiblefortesting)
  - [Prefer public behavioral tests first](#prefer-public-behavioral-tests-first)
- [Weak Testing Boundary Anti-Pattern](#weak-testing-boundary-anti-pattern)

---

# Immutability

## What `@immutable` means

`@immutable` tells tooling that:

- the annotated class should be immutable;
- its subtypes should also be immutable;
- all direct and inherited instance fields must be `final`.

Violations produce `must_be_immutable`.

Example:

```
import 'package:meta/meta.dart';

@immutable
final class UserProfile {
  const UserProfile({
    required this.id,
    required this.displayName,
  });

  final String id;
  final String displayName;
}

```

---

## `final` is not deep immutability

This is insufficient for a strong value-object contract:

```
@immutable
final class BadCartState {
  const BadCartState(this.items);

  final List<String> items;
}

```

The field reference cannot be reassigned, but the referenced list can still be mutable.

Dart's `final` guarantees that the variable is assigned once. It does not make every object reachable through the reference immutable.

Safer ownership boundary:

```
import 'package:meta/meta.dart';

@immutable
final class CartState {
  CartState(Iterable<String> items)
      : items = List<String>.unmodifiable(items);

  final List<String> items;
}

```

For const data:

```
@immutable
final class Menu {
  const Menu({
    required this.items,
  });

  final List<String> items;
}

const menu = Menu(
  items: <String>['Home', 'Settings'],
);

```

A constant collection is immutable, but do not imply arbitrary `final List` instances are.

---

## Shallow analyzer contract vs semantic deep immutability

Distinguish:

### Analyzer-level immutable check

```
All instance fields are final.

```

### Strong value immutability

```
No reachable mutable state can change the object's observable value.

```

`@immutable` primarily enforces the former.

When the domain requires the latter:

- defensively copy caller-owned mutable collections;
- expose unmodifiable views or immutable collections;
- avoid exposing mutable collaborators;
- ensure nested domain values honor equivalent contracts;
- document intentional shared mutable references explicitly.

---

## Do not infer thread safety

Never say:

> `@immutable` makes this class thread-safe.

It does not.

Deep immutability can simplify concurrency reasoning, but an analyzer annotation alone cannot make mutable referenced objects safe.

---

# Flutter and `@immutable`

Flutter's own `Widget` API is immutable: widget objects describe configuration and their fields are expected to be final. This is one reason `@immutable` is familiar throughout Flutter framework code.

For application code, good candidates include:

- immutable UI state;
- navigation configuration;
- design-system tokens;
- domain value objects;
- request/filter specifications;
- immutable events/commands;
- configuration snapshots.

Do **not** annotate inherently mutable objects merely because they participate in Flutter:

- controllers;
- repositories with mutable caches;
- `ChangeNotifier`-style state holders;
- mutable service objects;
- resource managers.

---

# Immutable Flutter State Example

```
import 'package:meta/meta.dart';

@immutable
final class SearchState {
  SearchState({
    required this.query,
    required Iterable<SearchResult> results,
    required this.isLoading,
  }) : results = List<SearchResult>.unmodifiable(results);

  final String query;
  final List<SearchResult> results;
  final bool isLoading;

  @UseResult('Assign or emit the returned state.')
  SearchState copyWith({
    String? query,
    Iterable<SearchResult>? results,
    bool? isLoading,
  }) {
    return SearchState(
      query: query ?? this.query,
      results: results ?? this.results,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

@immutable
final class SearchResult {
  const SearchResult({
    required this.id,
    required this.title,
  });

  final String id;
  final String title;
}

```

Here:

- `@immutable` validates final-field discipline;
- defensive copying prevents external mutation of the state collection;
- `@UseResult` makes accidentally discarding `copyWith()` suspicious.

No annotation in this example makes Flutter render faster by itself.

---

# Immutability-Related Lints

Useful complementary lints include:

```
prefer_const_constructors_in_immutables
prefer_const_literals_to_create_immutables
avoid_equals_and_hash_code_on_mutable_classes

```

The first encourages `const` constructors in classes annotated `@immutable`; the second encourages constant collection literals passed to immutable constructors; the third discourages value equality on classes that are not marked immutable.

Do not confuse the lint with the annotation.

`@immutable` itself does not force every constructor to be `const`.

---

# API Visibility

Dart does not have Java-style language keywords for `public`, `protected`, and `private`. Identifiers beginning with `_` are private to their Dart library.

Use the following hierarchy.

```
Who should access this API?

Only code in the same Dart library?
    → `_private`

Multiple libraries in the same package, but not package consumers?
    → package structure / lib/src
      + consider `@internal`

Subclass implementation code?
    → consider `@protected`

External subclasses may override but should not otherwise call it?
    → consider `@visibleForOverriding`

Tests need exceptional access?
    → consider `@visibleForTesting`

Normal package consumers?
    → normal public API

```

---

# `_private`

Prefer library privacy when the member should genuinely be inaccessible outside one Dart library.

```
class TokenCache {
  final Map<String, String> _tokens = {};
}

```

This is a **language-level** privacy boundary.

Do not make `_tokens` public and annotate it `@internal` merely because another file could theoretically need it someday.

---

# `@protected`

`@protected` is for subclass-facing instance members.

Example:

```
import 'package:meta/meta.dart';

abstract base class DataController {
  @protected
  void reportFailure(Object error) {
    // Shared subclass extension point.
  }
}

```

It communicates that ordinary consumers should not invoke the method.

It does **not** create Java-style access control.

The analyzer can report invalid uses through:

```
invalid_use_of_protected_member

```

but code does not become runtime-inaccessible.

Use when:

- subclass implementation is a supported extension point;
- making the member `_private` would prevent intended subclass access across a library boundary;
- ordinary callers should not depend on it.

Avoid it when:

- the member should simply be private;
- inheritance is not a supported API;
- composition is a better design.

---

# `@internal`

`@internal` expresses a **package** boundary.

Example package layout:

```
lib/
  my_package.dart
  src/
    connection_pool.dart

```

```
// lib/src/connection_pool.dart

import 'package:meta/meta.dart';

@internal
final class ConnectionPoolDiagnostics {
  const ConnectionPoolDiagnostics(this.activeCount);

  final int activeCount;
}

```

Code in the same package can use the declaration across Dart-library boundaries, while external package use is diagnosed.

Relevant diagnostics include:

```
invalid_internal_annotation
invalid_use_of_internal_member
invalid_export_of_internal_element
invalid_export_of_internal_element_indirectly

```

The Dart linter also provides `implementation_imports` to discourage consumers from importing another package's `lib/src`implementation files.

## `_private` vs `@internal`

Use `_private` when:

```
same Dart library only

```

Use `@internal` when:

```
several libraries in the same package need the declaration,
but consumers must not depend on it

```

Do not use `@internal` as a substitute for putting implementation code under `lib/src`.

The strongest package design generally combines:

```
lib/src structure
+ curated exports
+ @internal where additional analyzer intent is valuable

```

---

# `@internal` Is Not Security

A consumer that bypasses analyzer conventions or imports implementation files can still potentially compile code depending on them.

Do not use `@internal` to protect:

- credentials;
- authorization;
- secrets;
- privileged actions;
- trusted execution.

It is an API-compatibility boundary, not an authorization boundary.

---

# `@visibleForTesting`

Use when a declaration must technically be public enough for a test to access, but production code should not treat it as supported API.

```
import 'package:meta/meta.dart';

class SessionParser {
  Session parse(String input) {
    return _decode(input);
  }

  @visibleForTesting
  Session decodeForTesting(String input) {
    return _decode(input);
  }

  Session _decode(String input) {
    // Real parser implementation.
    return Session(input);
  }
}

final class Session {
  const Session(this.id);

  final String id;
}

```

Current documentation explicitly recognizes test-directory use, including tests from another package under the documented analyzer behavior.

## Prefer public behavioral tests first

Before adding `@visibleForTesting`, ask:

1. Can this be tested through public behavior?
2. Is the private method actually a separate collaborator?
3. Would extracting a parser/strategy/service create a cleaner architecture?
4. Am I exposing implementation details merely because the existing design is difficult to test?

Use `@visibleForTesting` only when exceptional access is the smaller design compromise.

---

# Weak Testing Boundary Anti-Pattern

Bad:

```
class CheckoutController {
  @visibleForTesting
  void step1() {}

  @visibleForTesting
  void step2() {}

  @visibleForTesting
  void step3() {}

  @visibleForTesting
  void step4() {}
}

```

If tests need nearly every internal phase, the design probably needs decomposition.

Prefer:

```
abstract interface class PaymentValidator {
  ValidationResult validate(Payment payment);
}

final class CheckoutController {
  CheckoutController(this.validator);

  final PaymentValidator validator;

  Future<void> checkout(Payment payment) async {
    final result = validator.validate(payment);
    // ...
  }
}

```

Now the collaborator can be tested directly without widening controller internals.

---
