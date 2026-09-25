# Annotation placement, combinations, and performance reality

Use this reference for legal/meaningful placement, annotation combinations, redundancy checks, performance claims, and the specialist compiler/build exceptions.

## Table of contents

- [No Code Generation](#no-code-generation)
- [Annotation Placement](#annotation-placement)
  - [Class](#class)
  - [Member](#member)
  - [Parameter](#parameter)
  - [Constructor](#constructor)
  - [Public test seam](#public-test-seam)
  - [Library/public declaration](#librarypublic-declaration)
- [Annotation Combinations](#annotation-combinations)
  - [Useful: `@protected` + `@mustCallSuper`](#useful-protected-mustcallsuper)
  - [Useful: `@immutable` + Dart class modifier](#useful-immutable-dart-class-modifier)
  - [Useful: `@useResult` + immutable transformation](#useful-useresult-immutable-transformation)
  - [Potentially useful: `@internal` + `@experimental`](#potentially-useful-internal-experimental)
  - [Usually redundant: `@sealed` + native modifier](#usually-redundant-sealed-native-modifier)
  - [Suspicious: `@mustBeOverridden` on an abstract member](#suspicious-mustbeoverridden-on-an-abstract-member)
  - [Suspicious: `@nonVirtual` in a completely closed hierarchy](#suspicious-nonvirtual-in-a-completely-closed-hierarchy)
- [Performance Reality](#performance-reality)
  - [What `meta` can improve](#what-meta-can-improve)
- [What Ordinary `meta.dart` Annotations Generally Do Not Improve Directly](#what-ordinary-metadart-annotations-generally-do-not-improve-directly)
- [`@immutable` Is Not a Flutter Optimization Switch](#immutable-is-not-a-flutter-optimization-switch)
- [`@useResult` Does Not Change Generated Logic](#useresult-does-not-change-generated-logic)
- [`@protected` Does Not Change Method Dispatch](#protected-does-not-change-method-dispatch)
- [`dart2js.dart` Exception](#dart2jsdart-exception)
- [`RecordUse` Exception](#recorduse-exception)
- [Build and Binary Impact](#build-and-binary-impact)

---

# No Code Generation

Ordinary `package:meta` use does not require:

```
build_runner
source_gen
generated .g.dart files

```

Annotations are metadata consumed by analysis/tooling.

Do not add a generator merely to use `@immutable`, `@protected`, or related annotations.

`RecordUse` and link-hook tooling are specialized build integrations and should not be confused with normal annotation code generation.

---

# Annotation Placement

Always verify an annotation's supported declaration target.

Examples:

## Class

```
@immutable
final class UserState {}

```

## Member

```
class Base {
  @protected
  void hook() {}
}

```

## Parameter

```
void register(@mustBeConst String id) {}

```

## Constructor

```
class LiteralValue {
  @literal
  const LiteralValue(this.value);

  final int value;
}

```

## Public test seam

```
@visibleForTesting
void resetCacheForTesting() {}

```

## Library/public declaration

```
@experimental
library;

```

where supported by the annotation and current Dart metadata syntax.

For custom annotations, use `@Target(...)` so misuse receives `invalid_annotation_target`.

Do not guess annotation targets from names.

---

# Annotation Combinations

## Useful: `@protected` + `@mustCallSuper`

Typical lifecycle extension point:

```
@protected
@mustCallSuper
void attach() {
  // Required base bookkeeping.
}

```

Flutter uses this combination on several lifecycle hooks.

---

## Useful: `@immutable` + Dart class modifier

```
@immutable
final class Credentials {
  const Credentials(this.username);

  final String username;
}

```

These solve different problems:

```
@immutable → field/state contract
final class → external subtyping contract

```

Not redundant.

---

## Useful: `@useResult` + immutable transformation

```
@useResult
AppState copyWith(...) => ...;

```

Very strong signal when ignoring the result means the requested update disappears.

---

## Potentially useful: `@internal` + `@experimental`

Usually challenge this combination.

`@internal` already says outside-package consumers should not use the API. `@experimental` may still communicate instability to internal package libraries, but combining them for external API signaling is often redundant/confusing.

Use only when the internal stability distinction matters inside the package.

---

## Usually redundant: `@sealed` + native modifier

Avoid:

```
@sealed
final class Foo {}

```

unless preserving a legacy package-boundary diagnostic has a deliberate compatibility reason.

For new code, choose the native class modifier that directly expresses the intended contract.

---

## Suspicious: `@mustBeOverridden` on an abstract member

If the member has no implementation:

```
abstract void perform();

```

already requires concrete subclasses to implement it.

`@mustBeOverridden` is designed for the case where a concrete inherited implementation exists.

---

## Suspicious: `@nonVirtual` in a completely closed hierarchy

If:

```
final class Service

```

has no possible external subclass, member-level `@nonVirtual` usually adds no value for external consumers.

It may still matter to same-library subtypes if such subtypes exist, but challenge the need.

---

# Performance Reality

## What `meta` can improve

Directly:

- analyzer feedback;
- API-contract clarity;
- refactoring safety;
- package-boundary clarity;
- migration guidance;
- subclassing correctness;
- immutable-field validation;
- lifecycle correctness;
- detection of discarded results;
- detection of inappropriate API use.

Indirectly, those benefits can lead to better architecture and fewer bugs.

---

# What Ordinary `meta.dart` Annotations Generally Do Not Improve Directly

Do not claim that adding ordinary annotations directly improves:

- Flutter frame rendering speed;
- widget rebuild cost;
- CPU execution speed;
- database throughput;
- networking;
- startup latency;
- memory allocation;
- garbage collection;
- AOT performance;
- isolate communication;
- tree shaking.

No official `meta` documentation establishes those as effects of annotations such as `@immutable`, `@protected`, `@useResult`, or `@internal`.

---

# `@immutable` Is Not a Flutter Optimization Switch

Incorrect:

> Add `@immutable` so widgets rebuild faster.

Correct:

> Use `@immutable` to communicate and statically validate an immutability contract. Flutter's widget architecture relies on immutable widget descriptions, but the annotation itself does not constitute a documented runtime optimization.

If you need Flutter performance improvements, profile actual:

- rebuild scope;
- layout;
- painting;
- image decoding;
- shader work;
- allocation;
- state propagation.

Do not prescribe metadata.

---

# `@useResult` Does Not Change Generated Logic

It changes static analysis.

This:

```
@useResult
Result parse(String value) => ...;

```

does not make parsing faster.

It makes:

```
parse(input);

```

more likely to be identified as a bug.

---

# `@protected` Does Not Change Method Dispatch

A protected method remains a normal Dart member at runtime.

The annotation affects supported use/analyzer feedback, not invocation speed or dispatch semantics.

---

# `dart2js.dart` Exception

`noInline` and `tryInline` are explicitly compiler hints for dart2js and therefore are different from normal analyzer metadata.

They should still be used only in specialized, benchmark-driven compiler-sensitive code.

Never spread them through ordinary app code.

---

# `RecordUse` Exception

`RecordUse` deliberately affects compilation/post-compile tooling by collecting usage data from reachable code.

It is not a general runtime speed optimization.

---

# Build and Binary Impact

Do not promise:

> `meta` adds exactly zero bytes.

Compiler retention and optimization details are implementation-specific, and specialist annotations can affect compilation.

The safe engineering statement is:

> Ordinary `meta.dart` APIs are documented as tool/static-analysis contracts rather than runtime facilities. Do not add them for binary-size, startup, or runtime-performance reasons.

There is no `build_runner` requirement for ordinary use.

---
