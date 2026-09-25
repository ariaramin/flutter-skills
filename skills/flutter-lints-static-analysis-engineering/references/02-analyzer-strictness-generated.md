# Analyzer policy, strict modes, ignores, and generated code

## Contents

- Analyzer Configuration
- Analyzer Exclusions
- Severity Overrides
- Strict Analysis
  - Strict Analysis Decision Table
- strict-casts
    - Strong candidate when
    - Stage carefully when
- strict-inference
- strict-raw-types
- Strict Analysis Adoption Strategy
- Ignore Directives
  - Line ignore
  - Multiple diagnostics
  - File-level ignore
  - Suppress all lints
- Ignore Hygiene
- Generated Code
  - Strategy A — Analyze generated code normally
  - Strategy B — Suppress lints, preserve other analysis
  - Strategy C — Exclude generated files
- Generated Code Ownership Rule

---

# Analyzer Configuration

The analyzer-specific section is separate from `linter:`:

```yaml
analyzer:
  ...
```

Use it for:

- file exclusions;
- severity policy;
- strict language analysis settings;
- supported analyzer configuration.

---

# Analyzer Exclusions

Syntax:

```yaml
analyzer:
  exclude:
    - build/**
    - lib/src/generated/**
    - test/fixtures/generated/**
```

Glob paths are relative to the directory containing `analysis_options.yaml`.

Use exclusions for:

- generated output that intentionally should not be diagnosed;
- vendored code not owned by the team;
- build artifacts;
- test-data files containing intentionally invalid Dart.

Do not use:

```yaml
analyzer:
  exclude:
    - lib/**
```

to “make CI green.”

The current Flutter package template excludes `build/**` and platform-generated directories, but does **not** blanket-exclude normal Dart source or every `*.g.dart` file.

---

# Severity Overrides

Use:

```yaml
analyzer:
  errors:
    dead_code: error
```

to change a diagnostic's severity.

Supported severity values are:

```text
info
warning
error
ignore
```



A severity override changes analyzer policy. It does not change the Dart language.

Do not demote a true compile-time correctness issue merely to make an analysis command return zero.

A team might temporarily alter severity during migration, but:

- document the reason;
- add removal criteria;
- avoid making temporary suppression permanent.

---

# Strict Analysis

The analyzer supports three stricter language-analysis modes:

```yaml
analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
```

All default to `false`, and they can be enabled independently.

These are analyzer-language modes, **not lint rules**.

---

## Strict Analysis Decision Table

| Setting | Catches | Typical value | Migration risk |
| --- | --- | --- | --- |
| `strict-casts` | Implicit downcasts from `dynamic` | High in modern typed code | Dynamic JSON/interoperability boundaries |
| `strict-inference` | Inference failures that become `dynamic` | High for packages/mature apps | Generic/legacy code can generate significant migration work |
| `strict-raw-types` | Generic types with omitted type arguments | Usually high | Legacy APIs/generated interop may be noisy |

Do not enable all three automatically.

---

# `strict-casts`

`strict-casts: true` prevents implicit casts from `dynamic` to more specific types.

The official example is a `jsonDecode` result implicitly being passed as a `List<String>`; strict casts requires the conversion to become explicit or safely validated.

Prefer typed boundary validation:

```dart
import 'dart:convert';

String readName(String source) {
  final Object? decoded = jsonDecode(source);

  if (decoded is! Map<String, dynamic>) {
    throw const FormatException('Expected a JSON object.');
  }

  final Object? value = decoded['name'];

  if (value is! String) {
    throw const FormatException('Expected a string name.');
  }

  return value;
}
```

Do not defeat strict casts with:

```dart
final result = dynamicValue as Whatever;
```

everywhere without validating the boundary.

### Strong candidate when

- application code is mostly typed;
- APIs have typed models;
- JSON is decoded at explicit boundaries;
- FFI/platform/dynamic integration is isolated.

### Stage carefully when

- legacy code relies heavily on `dynamic`;
- generated APIs expose raw dynamic data;
- JavaScript interop is pervasive.

---

# `strict-inference`

`strict-inference: true` reports situations where the analyzer cannot infer a meaningful static type and would otherwise choose `dynamic`.

Bad:

```dart
final values = {};
```

when the intended map type matters.

Better:

```dart
final values = <String, int>{};
```

Do not interpret strict inference as:

> “Write an explicit type on every local variable.”

It targets failed/unsafe inference, not ordinary safe inference.

---

# `strict-raw-types`

This mode reports raw generic types.

Bad:

```dart
List values = <String>[];
```

Better:

```dart
List<String> values = <String>[];
```

or, when the values intentionally vary:

```dart
List<Object?> values = <Object?>[];
```

`List` without type arguments effectively loses useful generic information and can propagate `dynamic`.

---

# Strict Analysis Adoption Strategy

For a legacy repository:

```text
measure violations
↓
identify boundary-heavy directories
↓
enable one strict option
↓
fix typed core code
↓
isolate dynamic interop
↓
update generated code/generator
↓
enable CI enforcement
↓
repeat for next option
```

Do not flip every strict mode on and then suppress hundreds of diagnostics.

---

# Ignore Directives

## Line ignore

```dart
// This SDK call is intentionally retained until the compatibility layer is removed.
// ignore: deprecated_member_use
legacyApi();
```

An ignore can also be placed on the same line.

---

## Multiple diagnostics

```dart
// ignore: first_rule, second_rule
someExpression();
```

---

## File-level ignore

```dart
// ignore_for_file: avoid_print
```

This affects the whole file.

Use file-level suppression only when the file genuinely follows a different policy.

---

## Suppress all lints

Dart supports:

```dart
// ignore_for_file: type=lint
```

which suppresses linter diagnostics for the file. This is particularly useful for generated code.

Do not place this in manually maintained production code as a general escape hatch.

---

# Ignore Hygiene

For every ignore, ask:

1. What exact diagnostic is being suppressed?
2. Why is the normal fix inappropriate?
3. Is the exception genuinely local?
4. Could generator/configuration changes solve it?
5. Should the whole repository disable the rule instead?
6. Will the suppression become stale?
7. Does the ignore deserve a rationale comment?

Consider enabling:

```yaml
linter:
  rules:
    document_ignores: true
    unnecessary_ignore: true
```

for repositories that want strong suppression governance.

`document_ignores` requires explanation around ignore directives; `unnecessary_ignore` flags suppressions that no longer suppress a produced diagnostic. Neither is part of the current default `flutter_lints` set.

---

# Generated Code

Generated code requires a deliberate policy.

There is no universal rule that every generated file must be excluded.

Use one of these strategies.

---

## Strategy A — Analyze generated code normally

Prefer this when:

- generated code is committed;
- generated output is part of a published library;
- generator regressions matter;
- generated output usually satisfies project rules.

Benefit:

```text
generator produces broken Dart
→ analyzer catches it
```

Cost:

- style lints may produce noise outside application control.

---

## Strategy B — Suppress lints, preserve other analysis

Have the generator emit:

```dart
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
```

This is often the best boundary when:

- generated code should remain syntactically/type-correct;
- stylistic lint policy is irrelevant;
- you still want non-lint diagnostics.

Do not add this manually after every generation run.

Fix the:

- generator;
- template;
- generator configuration.

---

## Strategy C — Exclude generated files

```yaml
analyzer:
  exclude:
    - lib/src/generated/**
```

Use when:

- output is third-party/vendor-owned;
- the code intentionally cannot satisfy current analyzer policy;
- measured analyzer cost/noise justifies exclusion.

Tradeoff:

You lose diagnostics from those files.

Do not exclude generated code reflexively merely because the filename ends in:

```text
.g.dart
.freezed.dart
.mocks.dart
```

---

# Generated Code Ownership Rule

Strong principle:

> **Never hand-edit generated code merely to satisfy analysis unless the generator explicitly defines the file as partially user-owned.**

Fix the:

- source declaration;
- generator version;
- generator template;
- generator configuration;
- analyzer scope.

---

