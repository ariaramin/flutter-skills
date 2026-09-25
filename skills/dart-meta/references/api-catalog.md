# Current package API, versions, and specialist libraries

Use this reference when selecting a specific `package:meta` API, checking current/legacy status, custom annotation targets, or specialist `dart2js`/`RecordUse` behavior. The content preserves the supplied August 12, 2026 research baseline.

## Table of contents

- [Current Package Version and Evolution](#current-package-version-and-evolution)
- [Complete Current Public API](#complete-current-public-api)
  - [`package:meta/meta.dart`](#packagemetametadart)
- [`Immutable`](#immutable)
- [`RecordUse`](#recorduse)
- [`Required` and `required`](#required-and-required)
- [`UseResult` and `useResult`](#useresult-and-useresult)
- [`alwaysThrows`](#alwaysthrows)
- [`awaitNotRequired`](#awaitnotrequired)
- [`checked`](#checked)
- [`doNotStore`](#donotstore)
- [`doNotSubmit`](#donotsubmit)
- [`experimental`](#experimental)
- [`factory`](#factory)
- [`immutable`](#immutable)
- [`internal`](#internal)
- [`isTest` and `isTestGroup`](#istest-and-istestgroup)
- [`literal`](#literal)
- [`mustBeConst`](#mustbeconst)
- [`mustBeOverridden`](#mustbeoverridden)
- [`mustCallSuper`](#mustcallsuper)
- [`nonVirtual`](#nonvirtual)
- [`optionalTypeArgs`](#optionaltypeargs)
- [`protected`](#protected)
- [`redeclare`](#redeclare)
- [`reopen`](#reopen)
- [`sealed`](#sealed)
- [`virtual`](#virtual)
- [`visibleForOverriding`](#visibleforoverriding)
- [`visibleForTesting`](#visiblefortesting)
- [`package:meta/meta_meta.dart`](#packagemetametametadart)
  - [`Target`](#target)
- [Complete `TargetKind` Inventory](#complete-targetkind-inventory)
- [`package:meta/dart2js.dart`](#packagemetadart2jsdart)
  - [Operating rule](#operating-rule)

---

# Current Package Version and Evolution

At the research baseline:

```
dependencies:
  meta: ^1.19.0

```

is the current stable line for projects whose Dart SDK permits it. `meta 1.19.0` requires Dart 3.5 or newer. Prefer letting `dart pub add meta` or `flutter pub add meta` resolve the actual version compatible with the project's SDK and existing dependencies rather than copying a constraint blindly.

Important recent changes include:

- **1.19.0:** `RecordUse` and `mustBeConst` became stable.
- **1.18.3:** `TargetKind.importDirective` added.
- **1.18.2:** `visibleForTesting` documentation corrected to match analyzer behavior, including use from other packages' `test/`directories.
- **1.18.1:** `awaitNotRequired` gained typedef support.
- **1.18.0:** `redeclare` became stable; more directive `TargetKind`s were added; `TargetKind.directive` deprecated.
- **1.17.0:** `awaitNotRequired` added, `Required`/`required` deprecated, minimum SDK moved to Dart 3.5.
- **1.15.0:** `mustBeOverridden` semantics clarified for concrete subclasses.
- **1.14.0:** `doNotSubmit` and `mustBeConst` introduced.
- **1.10.0:** `redeclare` introduced.
- **1.9.x:** `reopen` and `mustBeOverridden` introduced/stabilized; `alwaysThrows` deprecated in favor of `Never`.
- Older releases introduced `useResult`, `internal`, `doNotStore`, `nonVirtual`, `sealed`, testing annotations, and others.

When maintaining old code, check the package changelog before assuming an old annotation remains recommended.

---

# Complete Current Public API

The following inventory is based on `meta 1.19.0`. The current `meta.dart` API exports four classes and twenty-six annotation constants.

## `package:meta/meta.dart`

| APIPurposeAnalyzer/tool effectRuntime/build effectTypical scopeStatus / preferred use |                                                                                          |                                                  |                           |                                 |                                                    |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------- | ------------------------------- | -------------------------------------------------- |
| `Immutable`                                                                           | Configurable immutability annotation with optional reason                                | Supports immutable-class analysis                | None documented           | Apps/packages/frameworks        | Current                                            |
| `RecordUse`                                                                           | Records reachable uses of declarations for post-compile tooling                          | Compiler/tooling integration                     | **Build/compiler effect** | Build/link-hook tooling         | Current, specialist                                |
| `Required`                                                                            | Historical required-named-parameter annotation class                                     | Historical analyzer support                      | None                      | Legacy                          | **Deprecated**; use Dart `required`                |
| `UseResult`                                                                           | Configurable must-use-result annotation, including optional reason/conditional exemption | Produces result-use diagnostics                  | None documented           | Apps/packages                   | Current                                            |
| `alwaysThrows`                                                                        | Historical "function always throws" annotation                                           | Historical control-flow hint                     | None                      | Legacy                          | **Deprecated**; return `Never`                     |
| `awaitNotRequired`                                                                    | Marks a `Future`-producing API as safe to ignore                                         | Interacts with async-result lints                | None                      | Package/framework APIs          | Current, specialized                               |
| `checked`                                                                             | Historical checked/covariant annotation                                                  | No current effect                                | None                      | Legacy                          | **Deprecated/obsolete**; use `covariant`           |
| `doNotStore`                                                                          | Marks values that must not escape into persistent fields/top-level storage               | Lifetime/escape diagnostics                      | None                      | Framework/tooling               | Current, specialized                               |
| `doNotSubmit`                                                                         | Marks temporary development APIs/usages that must not be checked in                      | Reports references in checked-in code            | None                      | Tool/test-framework development | Current, specialized                               |
| `experimental`                                                                        | Marks unstable public API                                                                | Analyzer can diagnose external experimental use  | None                      | Reusable packages/frameworks    | Current                                            |
| `factory`                                                                             | Marks a method that must return a newly allocated object or `null`                       | Validates method behavior                        | None                      | Framework/tooling               | Current, specialized                               |
| `immutable`                                                                           | Standard immutable-class annotation                                                      | `must_be_immutable`and related tooling           | None                      | Apps/packages/Flutter           | Current, broadly useful                            |
| `internal`                                                                            | Public Dart declaration intended only inside its package                                 | Internal-use/export diagnostics                  | None                      | Packages/large apps             | Current                                            |
| `isTest`                                                                              | Marks a custom test-framework function introducing one test                              | IDE/tool test discovery semantics                | None                      | Test-framework authors          | Current, specialized                               |
| `isTestGroup`                                                                         | Marks a custom test-framework function introducing a test group                          | IDE/tool test discovery semantics                | None                      | Test-framework authors          | Current, specialized                               |
| `literal`                                                                             | Requires invoking a const constructor with `const` when arguments permit                 | Literal-constructor diagnostics                  | None itself               | Framework/API authors           | Current, specialized                               |
| `mustBeConst`                                                                         | Requires a corresponding argument to be a constant expression                            | Constant-argument diagnostic                     | None                      | Tooling/package APIs            | Current, stable since 1.19                         |
| `mustBeOverridden`                                                                    | Requires concrete subclasses to directly override a member                               | Missing-override diagnostic                      | None                      | Framework/package APIs          | Current                                            |
| `mustCallSuper`                                                                       | Requires overrides to invoke the superclass implementation                               | `must_call_super`                                | None                      | Lifecycle/framework APIs        | Current                                            |
| `nonVirtual`                                                                          | Declares a member that must not be overridden                                            | Override diagnostics                             | None                      | Package/framework APIs          | Current                                            |
| `optionalTypeArgs`                                                                    | Says generic type arguments may safely be omitted                                        | Exempts configured type-argument lints           | None                      | Framework/package APIs          | Current, specialized                               |
| `protected`                                                                           | Declares subclass-oriented member use                                                    | Protected-use diagnostics                        | None                      | Framework/package APIs          | Current                                            |
| `redeclare`                                                                           | Marks extension-type member redeclaration                                                | Validates actual redeclaration; complements lint | None                      | Extension-type authors          | Current                                            |
| `reopen`                                                                              | Explicitly acknowledges relaxing inherited class-modifier restrictions                   | Complements `implicit_reopen` lint               | None                      | Package API maintainers         | Current, specialized                               |
| `required`                                                                            | Historical required-named-parameter annotation constant                                  | Historical analyzer support                      | None                      | Legacy                          | **Deprecated**; use keyword `required`             |
| `sealed`                                                                              | Historical package-level subtyping restriction                                           | Analyzer detects cross-package subtyping         | None                      | Legacy/package APIs             | Current but usually superseded by Dart 3 modifiers |
| `useResult`                                                                           | Marks returned value as needing to be used                                               | `unused_result`                                  | None                      | Apps/packages                   | Current                                            |
| `virtual`                                                                             | Historical field-overriding annotation                                                   | No current effect                                | None                      | Legacy                          | **Deprecated**, remove                             |
| `visibleForOverriding`                                                                | Public member exists only so external types can override it                              | Rejects ordinary external references             | None                      | Framework/package APIs          | Current, specialized                               |
| `visibleForTesting`                                                                   | Public declaration exists only for tests                                                 | Testing-visibility diagnostics                   | None                      | Apps/packages                   | Current; use sparingly                             |

The current API list and top-level purpose of each item are published in the official `meta.dart` API reference.

---

# `Immutable`

`Immutable` is the annotation class underlying `@immutable`.

Use:

```
@Immutable('Instances are application state snapshots')
final class SessionState {
  const SessionState(this.userId);

  final String userId;
}

```

The `reason` can be included in tooling feedback. The annotation applies to the class and its subtypes. Official `meta` semantics define an immutable class for this check as one whose instance fields, including inherited fields, are all `final`.

Prefer the simple constant:

```
@immutable

```

unless a reason materially helps maintainers.

---

# `RecordUse`

`RecordUse` is **not** an ordinary API-contract annotation.

It records usages of annotated declarations in reachable executable code during compilation and makes those records available to post-compile steps such as link hooks. Metadata-only references are not recorded. It is restricted to declarations under a package's `lib/` directory.

Use only when building tooling that consumes recorded-use information.

Do not add:

```
@RecordUse()

```

to application APIs because "usage tracking sounds useful."

It is unrelated to analytics, logging, Flutter rebuild tracking, or ordinary dead-code reporting.

---

# `Required` and `required`

These are legacy APIs.

Do not write:

```
void save({
  @required String? value,
}) {}

```

Write:

```
void save({
  required String value,
}) {}

```

`Required` and `required` are explicitly deprecated because Dart has provided the language-level `required` keyword since Dart 2.12.

---

# `UseResult` and `useResult`

The simple form:

```
@useResult
ValidationResult validate();

```

The reason-bearing form:

```
@UseResult('The returned state contains the requested change.')
AppState copyWith({
  String? title,
});

```

`UseResult.unless` supports an API where supplying a specific named parameter means the result has otherwise been handled.

Ignoring an annotated result produces the analyzer diagnostic:

```
unused_result

```

The result counts as used when, for example, it is assigned, returned, passed to another function, placed into a collection/record, used in a pattern or condition, or used as an invocation target.

Use this only when discarding the value is likely a programmer mistake.

---

# `alwaysThrows`

Legacy.

Before:

```
@alwaysThrows
fail(String message) {
  throw StateError(message);
}

```

After:

```
Never fail(String message) {
  throw StateError(message);
}

```

Prefer the language-level `Never` return type.

---

# `awaitNotRequired`

Use this annotation only for an API whose returned `Future` is **genuinely safe to ignore**.

Its contract includes two important promises:

- the future should not complete with an error that callers need to handle;
- its completed value requires no disposal or further handling.

The annotation interacts with async lints such as `discarded_futures` and `unawaited_futures`; it does not change scheduling, error propagation, or runtime behavior itself.

Example:

```
@awaitNotRequired
Future<void> writeBestEffortTelemetry(TelemetryEvent event) async {
  try {
    await telemetrySink.write(event);
  } catch (_) {
    // Deliberately contained by this API's documented contract.
  }
}

```

Do **not** annotate:

```
Future<void> saveUserData()

```

merely because most callers currently forget to await it.

If failure matters, fix the callers.

---

# `checked`

Legacy and obsolete.

Use Dart's `covariant` language modifier where covariant parameter behavior is actually required.

Do not preserve `@checked` in modernized code.

---

# `doNotStore`

`@doNotStore` represents a borrowed/ephemeral value contract.

Official semantics specifically warn against:

- assigning the returned value to a field;
- assigning it to a top-level variable;
- returning it from an unannotated API.

It does **not** simply prohibit every local variable assignment.

Example:

```
@doNotStore
ScratchBuffer acquireScratchBuffer() => _sharedScratch;

```

Potentially acceptable:

```
void encode() {
  final buffer = acquireScratchBuffer();
  useImmediately(buffer);
}

```

Conceptually invalid:

```
class Encoder {
  late ScratchBuffer buffer;

  void initialize() {
    buffer = acquireScratchBuffer();
  }
}

```

Do not infer runtime lifetime enforcement from the name. The annotation does not invalidate an object or prevent a stale reference from being used at runtime.

---

# `doNotSubmit`

Use for temporary developer-only switches whose **use should never reach a submitted/merged revision**.

Official examples include temporary test parameters such as local skip/solo behavior. References are intended to be diagnosed even from the same library except in narrowly documented propagation cases.

Do not use it as:

- a production feature flag;
- a security switch;
- a replacement for compile-time environment configuration;
- a long-lived "TODO".

---

# `experimental`

Use on genuinely unstable **public** APIs whose contract explicitly permits incompatible changes outside normal semantic-versioning guarantees.

```
@experimental
final class NextGenerationParser {
  // ...
}

```

The annotation can apply at library or declaration level. Applying it to a class applies the experimental status to its members, but not automatically to subclasses.

Use it when:

- users need early access;
- the API shape is still likely to change;
- consumers are expected to consciously accept instability.

Do not use it to excuse poor API design indefinitely.

An experimental API should eventually:

- stabilize;
- be redesigned;
- or be removed.

`@experimental` is different from:

| ContractMeaning            |                                                               |
| -------------------------- | ------------------------------------------------------------- |
| `@experimental`            | External use exists, but stability is not promised            |
| `@internal`                | External package consumers should not use it at all           |
| `@Deprecated(...)`         | Consumers should migrate away                                 |
| prerelease package version | Stability policy applies to the whole release/package context |

If production application code must consume an experimental dependency:

1. isolate it behind a local adapter;
2. test dependency upgrades;
3. avoid leaking its types throughout the app;
4. document accepted compatibility risk.

---

# `factory`

Do not confuse `@factory` with a Dart factory constructor.

`@factory` applies to an instance or static **method** and says it should either be abstract or return a newly allocated object or `null`. The analyzer can report an implementation that violates that contract.

Specialized example:

```
abstract class NodeBuilder {
  @factory
  Node createNode();
}

```

For ordinary application factories, a Dart constructor or normal named method usually communicates enough.

Use `@factory` only when callers/implementers benefit from the allocation contract.

---

# `immutable`

See the dedicated **Immutability** section below.

---

# `internal`

See **API Visibility**.

---

# `isTest` and `isTestGroup`

These annotations are primarily for authors of test frameworks or test-wrapper APIs.

They tell IDE/test tooling that a function invocation represents:

- one test: `@isTest`;
- a group of tests: `@isTestGroup`.

Do not confuse them with `package:test` features such as:

- timeout;
- retry;
- tags;
- test configuration.

Ordinary Flutter application tests normally do not need these annotations.

---

# `literal`

`@literal` applies to a `const` constructor and asks analysis tooling to require a `const` invocation whenever its arguments permit a constant invocation.

This is stronger than merely declaring a constructor `const`: Dart normally allows a const constructor to be invoked without writing `const` outside a constant context.

Use only where the literal-like API contract is intentional.

Do not add `@literal` merely as a perceived Flutter performance optimization.

Prefer ordinary:

```
const MyWidget(...)

```

and relevant const lints in application code unless an API specifically requires literal invocation semantics.

---

# `mustBeConst`

`@mustBeConst` marks a parameter whose corresponding argument must be recognized as a constant expression.

It became stable in `meta 1.19.0`.

Example:

```
void registerResource(
  @mustBeConst String resourceName,
) {
  // ...
}

```

Important limitations documented by `meta`:

- the Dart type system itself does not encode "constant value" in the parameter type;
- an override does not automatically inherit the annotation on its parameter;
- a caller can potentially call through a supertype whose corresponding parameter lacks the annotation;
- tooling may not recognize every theoretically constant expression equally in every context.

Therefore `@mustBeConst` is an analyzer contract, not an unbreakable type-system guarantee.

Use mainly for specialized APIs whose build/tool behavior genuinely depends on compile-time-known arguments.

---

# `mustBeOverridden`

Use when a base member has a concrete implementation but **every concrete subclass must deliberately provide its own implementation**.

Conceptually:

```
abstract class Serializer {
  @mustBeOverridden
  String formatName() => 'unknown';
}

```

This differs from an abstract member because the inherited implementation can still exist and be called where appropriate.

Current semantics require a direct concrete override in concrete subclasses; abstract subclasses and relevant abstract/sealed intermediate declarations are not required to provide one immediately. This behavior was clarified in recent `meta` releases.

Prefer:

```
abstract String formatName();

```

when no useful inherited implementation is needed.

Use `@mustBeOverridden` only when retaining a concrete base implementation is part of the design.

It does not imply `@mustCallSuper`.

---

# `mustCallSuper`

See **Inheritance Contracts** and **Lifecycle Contracts**.

---

# `nonVirtual`

See **Inheritance Contracts**.

---

# `optionalTypeArgs`

The Dart language always allows generic type arguments to be omitted where inference/defaulting permits. `@optionalTypeArgs` exists to tell configured analysis/lints that omission is intentional.

It notably exempts APIs from `always_specify_types`-style requirements.

Use mainly in reusable API design.

Do not add it in an application that does not enable a lint requiring explicit type arguments.

---

# `protected`

See **API Visibility**.

---

# `redeclare`

Use only with extension types.

Extension-type members that share a name with superinterface members are **redeclarations**, not normal class overrides. `@redeclare` confirms that the name collision is intentional and lets the analyzer report cases where the member no longer actually redeclares anything. The opt-in `annotate_redeclares` lint can require this annotation on redeclarations.

Example:

```
import 'package:meta/meta.dart';

extension type UserId(String value) implements String {
  @redeclare
  int get length => value.length;
}

```

Do not use `@override` for this semantic purpose.

---

# `reopen`

Use `@reopen` only when a subtype intentionally relaxes access restrictions implied by a superinterface's class modifiers and the package uses the `implicit_reopen` lint.

It documents that the API maintainer knowingly chose the more permissive subtype declaration.

It does not itself alter Dart's language restrictions.

This is a package-maintainer annotation, not a normal Flutter application annotation.

---

# `sealed`

See **Modern Dart Class Modifiers vs Legacy Meta**.

---

# `virtual`

Deprecated and semantically obsolete.

Remove it.

The official API says it no longer has any meaning because modern Dart allows the historical field-overriding scenario directly.

---

# `visibleForOverriding`

This is more specialized than `@protected`.

Use it when a public-looking member exists so external subclasses can **override** it, but ordinary external invocation/reference should not form part of the supported API.

Do not use it merely because a method is overridable.

A method marked `@protected` is intended for subclass use, including calls from appropriate subclass context. A method marked `@visibleForOverriding` is intended to exist primarily as an overriding seam.

This is useful for framework/package API design and uncommon in application code.

---

# `visibleForTesting`

See **Testing Boundaries**.

---

# `package:meta/meta_meta.dart`

The current library exports:

- `Target`
- `TargetKind`

It exists to describe legal targets for **custom annotations**.

## `Target`

Apply `@Target(...)` to an annotation class:

```
import 'package:meta/meta_meta.dart';

@Target({
  TargetKind.classType,
  TargetKind.mixinType,
})
final class DomainType {
  const DomainType();
}

```

The analyzer can then diagnose using `@DomainType()` on unsupported declaration kinds through `invalid_annotation_target`. `Target`itself is intended for classes usable as annotations and is not intended as a base type for application inheritance.

Use this when authoring a real annotation library.

Do not use `Target` for ordinary application classes.

---

# Complete `TargetKind` Inventory

Current public `TargetKind` values include:

| ValueMeaning        |                                                              |
| ------------------- | ------------------------------------------------------------ |
| `classType`         | Class declaration                                            |
| `constructor`       | Generative or factory constructor                            |
| `directive`         | Generic directive target; **deprecated**                     |
| `enumType`          | Enum declaration                                             |
| `enumValue`         | Individual enum value                                        |
| `exportDirective`   | `export` directive                                           |
| `extension`         | Extension declaration                                        |
| `extensionType`     | Extension type declaration                                   |
| `field`             | Instance/static field                                        |
| `function`          | Top-level function                                           |
| `getter`            | Getter                                                       |
| `importDirective`   | `import` directive                                           |
| `library`           | First directive representing library-level annotation target |
| `method`            | Method                                                       |
| `mixinType`         | Mixin declaration                                            |
| `optionalParameter` | Optional formal parameter                                    |
| `overridableMember` | Overridable instance member                                  |
| `parameter`         | Formal parameter                                             |
| `partOfDirective`   | `part of` directive                                          |
| `setter`            | Setter                                                       |
| `topLevelVariable`  | Top-level variable                                           |
| `type`              | Declaration introducing a type                               |
| `typedefType`       | Typedef declaration                                          |
| `typeParameter`     | Type parameter                                               |
| `values`            | All current `TargetKind` values                              |

The current API documents these targets. `TargetKind.directive` is deprecated after more specific directive kinds were introduced.

Do not introduce new code with:

```
TargetKind.directive

```

when the exact directive target can be specified.

---

# `package:meta/dart2js.dart`

The current public API is:

```
noInline
tryInline

```

`noInline` requests that dart2js not inline a method.

`tryInline` requests that dart2js attempt to inline a method even where its normal size heuristics might not. The compiler is still free to be constrained by what can technically be inlined.

The library explicitly calls these features experimental and says they are not expected to be useful except for low-level framework authors.

## Operating rule

Never recommend:

```
@noInline

```

or:

```
@tryInline

```

to optimize normal Flutter code without:

1. a web-specific performance problem;
2. dart2js being the relevant compiler;
3. a benchmark;
4. generated-code/performance analysis;
5. a strong reason normal compiler heuristics are inadequate.

These are compiler hints, not API-design metadata.

---
