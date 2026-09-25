# Flutter/application/package guidance and analyzer integration

Use this reference when deciding whether metadata fits application code versus reusable package/framework code, configuring analyzer/lints, and declaring the dependency correctly.

## Table of contents

- [Flutter-Specific Guidance](#flutter-specific-guidance)
  - [Widgets](#widgets)
- [State Models](#state-models)
- [Controllers and View Models](#controllers-and-view-models)
- [Design Systems](#design-systems)
- [Framework vs Application Patterns](#framework-vs-application-patterns)
- [Package Author Guidance](#package-author-guidance)
  - [For each public class, decide](#for-each-public-class-decide)
- [Stable Public API](#stable-public-api)
- [Protected Extension API](#protected-extension-api)
- [Experimental API](#experimental-api)
- [Internal API](#internal-api)
- [Application Author Guidance](#application-author-guidance)
- [Analyzer Integration](#analyzer-integration)
  - [Analyzer diagnostics vs lints](#analyzer-diagnostics-vs-lints)
- [Important Meta-Related Analyzer Diagnostics](#important-meta-related-analyzer-diagnostics)
- [Linter Integration](#linter-integration)
- [Async Lint Policy](#async-lint-policy)
- [`optionalTypeArgs` and Lints](#optionaltypeargs-and-lints)
- [Dependency Management](#dependency-management)
- [When `meta` Can Be a Dev Dependency](#when-meta-can-be-a-dev-dependency)

---

# Flutter-Specific Guidance

## Widgets

Flutter `Widget` types already participate in an immutable framework contract.

For custom widgets:

```
final class ProductTile extends StatelessWidget {
  const ProductTile({
    super.key,
    required this.product,
  });

  final Product product;

  @override
  Widget build(BuildContext context) {
    // ...
    return const SizedBox();
  }
}

```

You normally do not need to redundantly add `@immutable` to every widget subclass because the inherited Flutter contract already applies.

Add your own annotation when it clarifies a separate application/domain type, not as decoration.

---

# State Models

`@immutable` is often appropriate for:

```
Bloc/Cubit state snapshots
Redux-style state
Riverpod/Notifier immutable state values
view state DTOs
domain value objects
navigation state

```

provided the state is genuinely immutable, including collection ownership where required.

Do not annotate the mutable controller/notifier itself.

---

# Controllers and View Models

For a reusable base controller, useful contracts may include:

```
abstract base class ScreenController {
  @nonVirtual
  Future<void> initialize() async {
    await onInitialize();
    _initialized = true;
  }

  bool _initialized = false;

  bool get initialized => _initialized;

  @protected
  Future<void> onInitialize();
}

```

For application-internal controllers that are never subclassed, prefer simpler composition and `final class` rather than creating framework-like protected APIs.

---

# Design Systems

A reusable design-system package may legitimately use:

- `@immutable` for tokens/configuration values;
- `@internal` for package implementation helpers;
- `@protected` for intentional component subclass extension points;
- `@experimental` for prerelease components;
- `@Deprecated(...)` for migration between component APIs;
- `@useResult` for immutable transformation APIs.

This is more annotation-heavy than a typical application because the package exposes a supported API surface.

---

# Framework vs Application Patterns

Flutter itself is an extensible framework and therefore uses metadata to define contracts for thousands of downstream applications.

Do not conclude:

> Flutter uses `@protected`, therefore my app service needs `@protected`.

An app usually controls all call sites and can often use:

```
_private
final class
composition
small package boundaries

```

instead.

Framework patterns are justified by framework-scale extensibility.

---

# Package Author Guidance

Reusable packages should treat `meta` as part of API governance.

## For each public class, decide

- May consumers construct it?
- May consumers extend it?
- May consumers implement it?
- May consumers mix it in?
- Is the subtype family closed?
- Are protected extension points supported?
- Which overrides must call super?
- Which members must not be overridden?
- Is the API stable?
- Is a migration/deprecation path required?

Use Dart class modifiers first for type-level restrictions.

Use `meta` for remaining member- and tooling-level contracts.

---

# Stable Public API

Prefer no instability annotation.

Example:

```
abstract interface class KeyValueStore {
  Future<String?> read(String key);

  Future<void> write(String key, String value);
}

```

The language directly expresses "interface contract, not reusable implementation."

---

# Protected Extension API

```
abstract base class CachedStore {
  @protected
  Future<String?> loadFromSource(String key);

  @nonVirtual
  Future<String?> read(String key) async {
    // Shared algorithm.
    return loadFromSource(key);
  }
}

```

This is a deliberate framework-style API.

Document whether protected methods are compatibility-stable.

---

# Experimental API

If a package exposes:

```
@experimental
Future<NewResult> queryWithPlanner(...);

```

do not simultaneously advertise it as semver-stable in package documentation.

The metadata, API docs, changelog, and versioning policy must agree.

---

# Internal API

Implementation declarations:

```
lib/src/

```

should not accidentally leak through public return/parameter types.

An `@internal` class exposed in the signature of a supposedly public stable API defeats the intended boundary.

Review exported types transitively.

---

# Application Author Guidance

Most Flutter applications need only a small subset of `meta`.

Most useful:

```
@immutable
@useResult
@visibleForTesting   ← sparingly
@internal            ← in multi-package/large modular code
@protected           ← only intentional inheritance APIs
@mustCallSuper       ← only custom lifecycle frameworks

```

Less common in ordinary apps:

```
@experimental
@nonVirtual
@mustBeOverridden
@visibleForOverriding
@awaitNotRequired
@doNotStore
@literal
@factory
@mustBeConst
@reopen
@redeclare
@isTest
@isTestGroup
RecordUse
dart2js pragmas

```

Do not turn a normal application into a mini framework without need.

---

# Analyzer Integration

## Analyzer diagnostics vs lints

Dart analysis supports configurable diagnostic severity:

```
info
warning
error

```

and individual diagnostics/lints can be reconfigured or ignored through `analysis_options.yaml`.

A **diagnostic triggered by a ****`meta`**** contract** is not the same thing as an opt-in lint.

For example:

```
@useResult
int compute() => 1;

void run() {
  compute();
}

```

can produce `unused_result` because of the annotation itself.

By contrast:

```
prefer_const_constructors_in_immutables

```

must be enabled as a lint or brought in through an included ruleset.

---

# Important Meta-Related Analyzer Diagnostics

The current analyzer diagnostic catalog includes relevant diagnostics such as:

| ContractImportant diagnostics |                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@immutable`                  | `must_be_immutable`                                                                                                                                    |
| `@protected`                  | `invalid_use_of_protected_member`                                                                                                                      |
| `@internal`                   | `invalid_internal_annotation`, `invalid_use_of_internal_member`, `invalid_export_of_internal_element`, `invalid_export_of_internal_element_indirectly` |
| `@visibleForTesting`          | `invalid_use_of_visible_for_testing_member`, `invalid_visibility_annotation`                                                                           |
| `@visibleForOverriding`       | `invalid_visible_for_overriding_annotation`, `invalid_use_of_visible_for_overriding_member`                                                            |
| `@mustCallSuper`              | `must_call_super`                                                                                                                                      |
| `@nonVirtual`                 | `invalid_non_virtual_annotation`, `invalid_override_of_non_virtual_member`                                                                             |
| `@mustBeOverridden`           | `missing_override_of_must_be_overridden`                                                                                                               |
| `@useResult`                  | `unused_result`                                                                                                                                        |
| `@doNotStore`                 | `assignment_of_do_not_store`, `return_of_do_not_store`                                                                                                 |
| `@doNotSubmit`                | `invalid_use_of_do_not_submit_member`                                                                                                                  |
| `@awaitNotRequired`           | `invalid_await_not_required_annotation`; also affects relevant async lints                                                                             |
| `@mustBeConst`                | `non_const_argument_for_const_parameter`                                                                                                               |
| `@factory`                    | `invalid_factory_method_decl`, `invalid_factory_method_impl`                                                                                           |
| `@literal`                    | `invalid_literal_annotation`, `non_const_call_to_literal_constructor`                                                                                  |
| `@sealed`                     | `invalid_sealed_annotation`, `subtype_of_sealed_class`                                                                                                 |
| `@reopen`                     | `invalid_reopen_annotation`                                                                                                                            |
| `@redeclare`                  | `redeclare_on_non_redeclaring_member`                                                                                                                  |
| `@Target`                     | `invalid_annotation_target`                                                                                                                            |
| deprecation                   | `deprecated_member_use`, plus targeted deprecation diagnostics                                                                                         |

Do not suppress these globally merely to make `dart analyze` green.

First determine whether:

- caller is violating a correct contract;
- declaration has an incorrect annotation;
- architecture no longer matches the annotation.

---

# Linter Integration

A reasonable meta-focused package/application lint supplement may look like:

```
linter:
  rules:
    depend_on_referenced_packages: true
    implementation_imports: true
    prefer_const_constructors_in_immutables: true
    prefer_const_literals_to_create_immutables: true
    avoid_equals_and_hash_code_on_mutable_classes: true
    deprecated_consistency: true
    provide_deprecation_message: true

```

For specialized package code, consider:

```
linter:
  rules:
    annotate_redeclares: true
    implicit_reopen: true

```

only if the project actually uses extension-type redeclarations or public class-modifier hierarchies.

`depend_on_referenced_packages` specifically requires a package to declare packages it imports directly instead of relying on transitive dependencies.

Do not add a huge linter configuration solely because `meta` is present.

---

# Async Lint Policy

`@awaitNotRequired` interacts with:

```
unawaited_futures
discarded_futures

```

depending on which rules the project enables.

Choose the project's asynchronous-call policy intentionally.

Do not annotate APIs simply to silence async lints.

---

# `optionalTypeArgs` and Lints

`@optionalTypeArgs` only matters when a lint such as:

```
always_specify_types

```

would otherwise require explicit type arguments. The official lint documentation explicitly recognizes this exemption.

Do not add the annotation if the project has no relevant rule.

---

# Dependency Management

If production code under `lib/` imports:

```
import 'package:meta/meta.dart';

```

declare `meta` as a direct normal dependency.

```
dependencies:
  meta: ^1.19.0

```

subject to the project's SDK/resolution.

Do not rely on Flutter or another dependency bringing `meta` transitively.

The official `depend_on_referenced_packages` rule explains that directly referenced packages should be explicitly declared so they remain available and version constraints are under your control.

---

# When `meta` Can Be a Dev Dependency

If `meta` is imported **only** from private development/test tooling such as:

```
test/
tool/

```

and no production/public library imports it, a `dev_dependency` can be appropriate.

The Dart lint documentation distinguishes regular vs dev dependencies based on whether the package is referenced from public code such as `lib`/`bin` or only private development code.

For reusable packages, if an annotation appears in an API declaration under `lib/`, `meta` belongs in `dependencies`.

---
