# Inheritance contracts and modern Dart alternatives

Use this reference for `@mustCallSuper`, `@mustBeOverridden`, `@nonVirtual`, template-method APIs, Dart 3 class modifiers, and migration away from legacy metadata such as `@sealed`.

## Table of contents

- [Inheritance Contracts](#inheritance-contracts)
- [`@mustCallSuper`](#mustcallsuper)
- [Do Not Add `@mustCallSuper` Casually](#do-not-add-mustcallsuper-casually)
- [Empty Super Implementations](#empty-super-implementations)
- [`@mustBeOverridden`](#mustbeoverridden)
- [`@nonVirtual`](#nonvirtual)
- [Template-Method Pattern](#template-method-pattern)
- [Modern Dart Class Modifiers vs Legacy Meta](#modern-dart-class-modifiers-vs-legacy-meta)
  - [Decision matrix](#decision-matrix)
- [`@sealed` vs Dart `sealed`](#sealed-vs-dart-sealed)
- [Legacy Sealing Migration](#legacy-sealing-migration)
- [Class Modifier Compatibility Warning](#class-modifier-compatibility-warning)
- [Language Features That Supersede Legacy `meta`](#language-features-that-supersede-legacy-meta)

---

# Inheritance Contracts

Use this decision model:

```
Can Dart express the inheritance restriction directly?
    → use class modifiers first

Need subclass-only member access?
    → @protected

Need external subclasses to override but not call/reference?
    → @visibleForOverriding

Need override to call base implementation?
    → @mustCallSuper

Need every concrete subclass to supply its own override,
while retaining a base implementation?
    → @mustBeOverridden

Need one concrete member to remain non-overridable?
    → @nonVirtual

```

---

# `@mustCallSuper`

Use when omitting the superclass call breaks an invariant.

```
import 'package:meta/meta.dart';

abstract base class LifecycleController {
  bool _started = false;

  bool get isStarted => _started;

  @protected
  @mustCallSuper
  void onStart() {
    _started = true;
  }
}

final class FeatureController extends LifecycleController {
  @override
  void onStart() {
    super.onStart();
    // Feature-specific initialization.
  }
}

```

The analyzer reports:

```
must_call_super

```

if an override fails the required call contract.

---

# Do Not Add `@mustCallSuper` Casually

Bad reason:

> The super implementation exists.

Bad reason:

> Calling super is probably polite.

Bad reason:

> Flutter does it a lot.

Good reason:

> The superclass performs bookkeeping/resources/state transition that every override must preserve.

Only annotate a real invariant.

---

# Empty Super Implementations

An inherited implementation may currently be empty and still be annotated `@mustCallSuper`.

If the public API contract says super must be called, callers must honor it even if today's body happens to do nothing.

Why?

- the base class may gain invariant work later;
- intermediate subclasses may add required work;
- the annotation is part of the inheritance contract.

Do not remove a required `super` call after inspecting only the current implementation.

---

# `@mustBeOverridden`

Use when subclasses need both:

- access to a reusable/default inherited implementation;
- responsibility to explicitly decide their own behavior.

Example:

```
import 'package:meta/meta.dart';

abstract base class Command {
  @mustBeOverridden
  String auditLabel() => runtimeType.toString();
}

```

If no inherited implementation is useful, prefer:

```
abstract base class Command {
  String auditLabel();
}

```

The language-level abstract member is stronger and simpler.

---

# `@nonVirtual`

Use to prohibit overriding an individual concrete member:

```
import 'package:meta/meta.dart';

abstract base class Repository {
  @nonVirtual
  Future<void> refresh() async {
    await beforeRefresh();
    await load();
    await afterRefresh();
  }

  @protected
  Future<void> beforeRefresh() async {}

  @protected
  Future<void> load();

  @protected
  Future<void> afterRefresh() async {}
}

```

This supports a template-method pattern:

```
refresh()                 ← fixed orchestration
  beforeRefresh()         ← extension point
  load()                  ← extension point
  afterRefresh()          ← extension point

```

The analyzer can reject overriding `refresh`.

If no subclassing should exist at all, a language-level `final class` is usually stronger.

---

# Template-Method Pattern

Prefer:

```
abstract base class Importer {
  @nonVirtual
  Future<void> run() async {
    final data = await load();
    await validate(data);
    await persist(data);
  }

  @protected
  Future<List<int>> load();

  @protected
  Future<void> validate(List<int> data) async {}

  @protected
  Future<void> persist(List<int> data);
}

```

over merely documenting:

```
/// Do not override this.
Future<void> run() async {}

```

when subclassing is intentional but orchestration must remain fixed.

---

# Modern Dart Class Modifiers vs Legacy Meta

Dart 3 language modifiers include:

```
abstract
base
interface
final
sealed
mixin

```

They provide language-enforced control over how types can be extended, implemented, or mixed in outside the declaring library.

## Decision matrix

| IntentPrefer                                                              |                                                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------ |
| Cannot instantiate but external subtype behavior otherwise normal         | `abstract class`                                       |
| Consumers may extend/reuse implementation but not implement independently | `base class`                                           |
| Consumers may implement contract but not extend implementation            | `interface class` / usually `abstract interface class` |
| Consumers outside library must not subtype at all                         | `final class`                                          |
| Closed direct subtype family + exhaustive pattern matching                | `sealed class`                                         |
| Class is intentionally usable as class and mixin                          | `mixin class`                                          |
| One member should not be overridden                                       | `@nonVirtual`                                          |
| Member is subclass-facing                                                 | `@protected`                                           |
| Override must call base body                                              | `@mustCallSuper`                                       |

---

# `@sealed` vs Dart `sealed`

Historical `@sealed` and modern `sealed class` do **not** have identical boundaries.

`@sealed` says subclasses/implementers/mixins should remain within the same **package**.

Modern:

```
sealed class Result {}

```

restricts direct subtyping to the same **library** and participates in exhaustive pattern matching.

Therefore never perform this migration mechanically:

```
@sealed
class Foo

```

→

```
sealed class Foo

```

without checking where existing subtypes live.

---

# Legacy Sealing Migration

Before:

```
import 'package:meta/meta.dart';

@sealed
class Operation {}

```

If all intended direct subtypes can live in the same library and exhaustive switching is useful:

```
sealed class Operation {}

final class ReadOperation extends Operation {}

final class WriteOperation extends Operation {}

```

If the real goal is simply:

> no external package should subtype this public implementation,

consider:

```
final class Operation {}

```

If the real goal is:

> external code may extend but not implement,

consider:

```
base class Operation {}

```

If the real goal is:

> external code may implement but not inherit implementation,

consider:

```
abstract interface class Operation {}

```

Choose by semantics, not annotation-name similarity.

---

# Class Modifier Compatibility Warning

Adding `base`, `interface`, `final`, or `sealed` to an existing public package API can be a breaking change because it removes previously available subclassing/implementation capabilities. Official Dart API-maintainer guidance explicitly recommends treating these restrictions as package API changes that may require a major version bump.

Do not "modernize" a published API without compatibility analysis.

---

# Language Features That Supersede Legacy `meta`

| Old/meta approachModern Dart alternativePreferWhy |                                                             |                                                  |                                             |
| ------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `@required` / `Required`                          | `required`                                                  | Language keyword                                 | Stronger, native syntax                     |
| `@alwaysThrows`                                   | `Never` return type                                         | `Never`                                          | Type-system/control-flow semantics          |
| `@checked`                                        | `covariant`                                                 | `covariant`                                      | Native parameter modifier                   |
| `@sealed`                                         | `sealed`, `base`, `final`, `interface` as semantics require | Language modifier                                | Language enforcement; richer semantics      |
| `@virtual`                                        | Nothing                                                     | Remove                                           | Annotation has no current meaning           |
| informal non-null contract                        | sound null-safety types                                     | Dart types                                       | Language-enforced                           |
| metadata-only required parameter                  | `required` + null safety                                    | Dart language                                    | Stronger                                    |
| informal immutable local tuple DTO                | record where appropriate                                    | Dart record                                      | Native immutable aggregate                  |
| extension-type redeclaration comments             | `@redeclare`                                                | `@redeclare` still needed                        | No equivalent redeclare keyword             |
| member-level "don't override" comments            | `@nonVirtual`                                               | `@nonVirtual` where class must remain extensible | No direct member-level final-method keyword |

Records are immutable aggregate values, but they do not replace domain classes that need named semantics, methods, invariants, or stable public nominal types.

---
