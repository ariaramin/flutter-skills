# Apps, packages, tests, monorepos, CI, formatter, fix, and IDE tooling

## Contents

- Applications vs Packages
  - Applications
  - Published packages
  - Pub.dev
- Tests
- Test-Specific Exceptions
- Examples
- Monorepos
  - Root Policy
  - Package-Specific Policy
  - Pub Workspaces
  - Monorepo CI
- Shared Lint Configurations
- Custom Analyzer Plugins
- CI Enforcement
- Zero-Diagnostic Policy
- dart analyze vs flutter analyze
  - Flutter repository
  - Pure Dart repository
- dart format
- Formatter Configuration
- dart fix
- IDE Integration

---

# Applications vs Packages

The official `flutter_lints` baseline is designed for apps, packages, and plugins.

Additional policy should still differ.

---

## Applications

Prioritize:

1. correctness;
2. type safety;
3. async safety;
4. widget lifecycle;
5. maintainability;
6. clear state boundaries;
7. low-noise style consistency.

Potential additional rules worth evaluating:

```text
unawaited_futures
discarded_futures
unnecessary_ignore
document_ignores
cancel_subscriptions
close_sinks
```

Do not enable them automatically.

---

## Published packages

Also prioritize:

- public API stability;
- public type clarity;
- deprecation policy;
- documentation;
- package boundaries;
- package dependency correctness.

Current recommended lints already include useful package-facing rules such as:

```text
depend_on_referenced_packages
implementation_imports
library_private_types_in_public_api
package_names
provide_deprecation_message
secure_pubspec_urls
```



Additional package policies may evaluate:

```text
public_member_api_docs
type_annotate_public_apis
```

Do not force those rules onto private applications without a reason.

---

## Pub.dev

Passing `flutter_lints` does not guarantee a perfect pub.dev score.

The Dart team's core lint set participates in pub package scoring, and `flutter_lints` is a superset of the recommended/core sets, but package scoring also evaluates concerns beyond lints.

For a published package, also run a publish validation flow such as:

```sh
flutter pub publish --dry-run
```

as part of release preparation.

---

# Tests

By default, analyze tests using the same baseline.

Do not broadly exclude:

```yaml
analyzer:
  exclude:
    - test/**
```

Tests are code.

Static analysis catches real errors in:

- mocks;
- fixtures;
- test utilities;
- asynchronous tests;
- widget tests.

---

# Test-Specific Exceptions

Some project-specific rules may legitimately be inappropriate in tests.

Prefer:

```dart
// Intentional debug output used by this integration harness.
// ignore: avoid_print
print(testServerResponse);
```

over disabling the rule for all tests because one file needs it.

If an entire test subtree genuinely has different policy, use a nested analysis file deliberately:

```yaml
include: ../analysis_options.yaml

linter:
  rules:
    some_project_specific_rule: false
```

Nested analysis configurations are supported; the analyzer uses a more specific options file for code in that subtree.

Keep such differences rare and documented.

---

# Examples

For reusable packages, treat `example/` as:

```text
executable documentation
```

Prefer analyzing it.

Do not exclude examples because:

```text
"they are only examples"
```

Users copy example code into production applications.

Package examples should demonstrate:

- current APIs;
- sound types;
- current Flutter idioms;
- current lint policy.

---

# Monorepos

Static-analysis architecture matters in a monorepo.

Possible structure:

```text
repository/
├── analysis_options.yaml
├── pubspec.yaml
└── packages/
    ├── app/
    │   └── pubspec.yaml
    ├── design_system/
    │   └── pubspec.yaml
    └── api_client/
        └── pubspec.yaml
```

The analyzer walks upward for `analysis_options.yaml` when a package doesn't have a nearer one. A package-local analysis file can therefore override root policy.

---

## Root Policy

Use the root config for rules that genuinely apply everywhere:

```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  language:
    strict-casts: true

linter:
  rules:
    unnecessary_ignore: true
```

Then add a package-local config only when the package's engineering role differs.

---

## Package-Specific Policy

Example:

```text
packages/public_sdk
→ stricter public API documentation rules

packages/app
→ application correctness/async rules

packages/generated_api
→ generated-code-specific handling
```

Do not create a separate `analysis_options.yaml` in every package with identical contents.

---

## Pub Workspaces

Modern Dart supports Pub workspaces. A workspace provides one shared dependency resolution and can significantly reduce analyzer memory compared with many separately resolved packages.

Pub workspaces require Dart 3.6+.

Dart 3.11+ additionally supports workspace path globs such as:

```yaml
workspace:
  - packages/*
```



Use workspaces when packages are developed together and shared dependency resolution is appropriate.

---

## Monorepo CI

Do not assume:

```text
one command at repository root
```

automatically exercises every Flutter/Dart package exactly as intended.

Verify command scope.

A robust orchestration layer should run the appropriate command for each relevant package/workspace component.

Use:

```text
Flutter package/app
→ flutter analyze

pure Dart package
→ dart analyze --fatal-infos
```

unless the repository has verified workspace tooling that covers all packages centrally.

---

# Shared Lint Configurations

Create an internal shared lint package only when:

- many repositories need the same policy;
- duplicate configuration is causing drift;
- centralized migration is valuable.

Do not create one for a single app just to avoid a 20-line YAML file.

A shared configuration should generally:

```text
inherit official baseline
↓
add organization policy
↓
expose small stable config
```

Avoid turning the internal lint package into:

```text
every Dart lint enabled
+
hundreds of exceptions
+
organization-wide lockstep upgrades
```

---

# Custom Analyzer Plugins

Lint rules cannot enforce every architecture boundary.

Dart 3.10 introduced a first-party analyzer plugin system capable of adding custom diagnostics, warnings, quick fixes, and assists. Modern plugins are declared using the top-level `plugins:` section.

Example shape:

```yaml
plugins:
  company_architecture: ^1.0.0
```

Use custom analyzer plugins only when a rule is:

- organization-specific;
- objectively machine-checkable;
- high-value;
- stable enough to maintain.

Potential valid cases:

- prohibited dependency direction;
- forbidden imports;
- required annotations for internal framework conventions.

Do not create a custom lint to encode every code-review preference.

Legacy `analyzer.plugins` configuration belongs to the old plugin model and is being deprecated; do not use it for new plugin development.

---

# CI Enforcement

Recommended conceptual pipeline:

```text
dependency resolution
↓
format check
↓
static analysis
↓
unit/widget tests
↓
integration/build validation
```

Example:

```sh
flutter pub get

dart format -o none --set-exit-if-changed .

flutter analyze

flutter test
```

For applications that intentionally do not enforce format in CI, omit the formatter check rather than pretending linting performs formatting.

---

# Zero-Diagnostic Policy

A mature Flutter repository should normally aim for:

```text
flutter analyze
→ no diagnostics
```

Current Flutter tooling defaults both `fatal-infos` and `fatal-warnings` to `true`, so info-level lints and warnings cause `flutter analyze` to fail.

This works only if the lint set remains trusted.

If developers routinely see hundreds of low-value diagnostics, they learn to ignore the important ones.

---

# dart analyze vs flutter analyze

## Flutter repository

Prefer:

```sh
flutter analyze
```

Flutter's current command reference explicitly recommends `flutter analyze` instead of `dart analyze` for Flutter projects.

Current Flutter behavior:

```text
fatal infos = true
fatal warnings = true
```

by default.

---

## Pure Dart repository

Use:

```sh
dart analyze
```

Current `dart analyze` normally fails for:

- errors;
- warnings;

but not info-level diagnostics.

To enforce zero info-level diagnostics:

```sh
dart analyze --fatal-infos
```



Do not assume `dart analyze` and `flutter analyze` have identical exit-code policy.

---

# dart format

`dart format` is the Dart formatter.

It is not `flutter_lints`.

Use:

```sh
dart format .
```

to modify source.

Use in CI:

```sh
dart format -o none --set-exit-if-changed .
```

to fail when formatting would change files.

---

# Formatter Configuration

Modern Dart supports formatter configuration inside `analysis_options.yaml`:

```yaml
formatter:
  page_width: 100
  trailing_commas: automate
```

Current defaults include:

```text
page_width = 80
trailing_commas = automate
```

The `page_width` option requires language version 3.7+, and `trailing_commas` configuration requires 3.8+.

Do not enable style lints merely to fight the formatter.

Let formatter-owned concerns remain formatter-owned where possible.

---

# dart fix

Use `dart fix` for diagnostics with supported automated fixes and SDK migration fixes.

Preview:

```sh
dart fix --dry-run
```

Apply:

```sh
dart fix --apply
```



Safe workflow:

```text
clean git state
↓
dart fix --dry-run
↓
inspect proposed categories
↓
dart fix --apply
↓
review diff
↓
flutter analyze
↓
flutter test
```

Do not assume every automated rewrite is semantically irrelevant.

Review changes involving:

- async behavior;
- APIs;
- null handling;
- collections;
- deprecated APIs;
- generated files.

---

# IDE Integration

Dart-enabled IDEs use the analyzer/Analysis Server to surface the same general static-analysis configuration.

Keep developer and CI environments aligned on:

- Flutter SDK version;
- Dart SDK version;
- dependency resolution;
- `analysis_options.yaml`;
- generated files.

When IDE and CI disagree:

1. run `flutter --version`;
2. run `dart --version`;
3. inspect package resolution;
4. inspect nested analysis options;
5. run `flutter analyze` manually;
6. restart the Analysis Server/IDE after configuration changes.

Do not rely on IDE-specific inspections that CI never runs unless they are explicitly part of repository policy.

---

