# Rule selection, signal, migrations, analyzer performance, boundaries, and debugging

## Contents

- Lint Rule Selection
- Correctness Rules
- Async / Future Rules
- Flutter Async Context Safety
- Resource Lifecycle Rules
- API Design Rules
- Style Rules
- Flutter-Specific Rules
    - avoid_unnecessary_containers
    - no_logic_in_create_state
    - avoid_web_libraries_in_flutter
    - use_build_context_synchronously
    - sort_child_properties_last
- Signal-to-Noise
- Rule Adoption Threshold
- Deprecated and Removed Rules
    - Example: replaced by analyzer diagnostic
    - Example: language made rule obsolete
    - Example: still-valid rule removed from Flutter defaults
- Deprecation Handling
- Lint Debt
- Legacy Boundary Strategy
- Upgrade / Migration Workflow
  - Step 1 — Record current toolchain
  - Step 2 — Read changelogs
  - Step 3 — Update compatible version
  - Step 4 — Resolve dependencies
  - Step 5 — Run analysis before auto-fixing
  - Step 6 — Inspect fix availability
  - Step 7 — Apply safe fixes
  - Step 8 — Manually fix architectural cases
  - Step 9 — Remove obsolete configuration
  - Step 10 — Format and test
- Analyzer Performance
  - Common contributors
- Pub Workspaces and Analysis Performance
- Analyzer Plugins and Performance
- Runtime Performance Boundary
- Architecture Boundaries
- Security Boundaries
- Code Review Role
- Debugging Workflow
  - Unknown lint rule
  - Rule unexpectedly not active
  - Rule unexpectedly active
  - CI fails but IDE passes
  - IDE fails but CI passes
  - Analyzer is very slow
  - Newly upgraded project has many violations
  - Generated file suddenly fails analysis

---

# Lint Rule Selection

Do not select rules by counting them.

For each candidate rule ask:

```text
What problem does it catch?
Is that problem relevant here?
Is the diagnostic actionable?
How many existing violations exist?
What false-positive rate does it have?
Does it overlap analyzer/language behavior?
Can it be auto-fixed?
What migration cost does it create?
Would formatter/tests/review enforce this better?
```

---

# Correctness Rules

Prioritize rules that identify likely incorrect behavior.

Current inherited examples include:

```text
await_only_futures
collection_methods_unrelated_type
control_flow_in_finally
empty_catches
exhaustive_cases
hash_and_equals
null_closures
recursive_getters
unrelated_type_equality_checks
valid_regexps
void_checks
```

These generally deserve more weight than cosmetic preferences.

---

# Async / Future Rules

Current `flutter_lints` includes:

```text
await_only_futures
use_build_context_synchronously
```

It does **not** currently enable:

```text
unawaited_futures
discarded_futures
```

by default.

`unawaited_futures` requires Future-returning calls in async functions to be awaited or explicitly marked using `unawaited(...)`.

`discarded_futures` targets Future-returning calls made in synchronous functions where ignoring the Future is likely accidental.

These can be valuable additions in async-heavy applications.

Evaluate them against:

- intentionally fire-and-forget event dispatch;
- telemetry;
- cache warming;
- test helpers.

When a Future is intentionally unawaited, prefer:

```dart
import 'dart:async';

unawaited(refreshCache());
```

over an ignore comment where that accurately communicates intent.

---

# Flutter Async Context Safety

`use_build_context_synchronously` is part of the baseline.

After an async gap, check:

```dart
if (!context.mounted) {
  return;
}
```

for a local/argument `BuildContext`.

For a `State`'s own context:

```dart
if (!mounted) {
  return;
}
```

before using `context`.

Do not disable the rule globally because async navigation code needs mounted checks.

---

# Resource Lifecycle Rules

Rules such as:

```text
cancel_subscriptions
close_sinks
```

exist in Dart's lint catalog but are **not** part of the current `flutter_lints` baseline.

Evaluate them before adoption.

Do not falsely claim `flutter_lints` automatically detects every:

- undisposed AnimationController;
- undisposed TextEditingController;
- forgotten ChangeNotifier;
- unclosed arbitrary resource.

It does not.

Resource ownership still requires:

- code review;
- tests;
- framework patterns;
- potentially additional/custom analysis.

---

# API Design Rules

Packages should place extra weight on:

```text
implementation_imports
library_private_types_in_public_api
provide_deprecation_message
depend_on_referenced_packages
```

The `implementation_imports` rule, for example, protects consumers from importing another package's `lib/src/` implementation.

Private applications may not need every package-documentation lint.

---

# Style Rules

Treat pure style rules as lower priority than:

- correctness;
- type safety;
- lifecycle safety.

Examples include choices such as:

```text
prefer_single_quotes
directives_ordering
```

These can improve consistency but rarely justify disruptive migrations on their own.

Do not make a legacy rewrite expensive solely to satisfy personal style preference.

---

# Flutter-Specific Rules

Current direct Flutter rules are intentionally small.

Understand their purpose rather than mechanically silencing them.

### `avoid_unnecessary_containers`

Removes `Container` wrappers that have no configuration and therefore add no useful intent.

### `no_logic_in_create_state`

Keeps `createState()` as simple State construction rather than initialization/business logic.

### `avoid_web_libraries_in_flutter`

Prevents inappropriate use of web-only libraries in Flutter packages that are not web plugins.

### `use_build_context_synchronously`

Guards BuildContext lifecycle across async gaps.

### `sort_child_properties_last`

Improves structural readability of Flutter widget creation.

Do not treat all Flutter-specific lints as runtime-performance optimizations.

---

# Signal-to-Noise

The most important property of a lint suite is not size.

It is:

```text
high percentage of diagnostics
that developers agree should be acted upon
```

Prefer:

```text
80 trusted rules
```

over:

```text
180 rules
+
40 routinely ignored
```

A low-value lint can reduce the practical value of every high-value diagnostic around it.

---

# Rule Adoption Threshold

Adopt a lint when most are true:

- catches a real recurring issue;
- low false-positive rate;
- clear fix;
- team understands rationale;
- migration is feasible;
- long-term maintenance is acceptable;
- doesn't significantly conflict with another chosen rule.

Reject or defer when:

- mostly aesthetic;
- large legacy churn with little value;
- high false-positive rate;
- architecture/test tooling is better suited;
- feature is experimental/deprecated;
- analyzer already enforces the same behavior.

---

# Deprecated and Removed Rules

Lint configuration evolves with Dart.

A rule can become:

- deprecated;
- removed;
- redundant;
- replaced by a language/analyzer diagnostic;
- removed from the recommended set while remaining valid as an optional lint.

These cases are different.

### Example: replaced by analyzer diagnostic

`avoid_null_checks_in_equality_operators` is deprecated because the analyzer warning `non_nullable_equals_parameter` replaced its role. Current documentation explicitly instructs users to remove the lint from analysis options.

### Example: language made rule obsolete

`prefer_equal_for_default_values` was removed in Dart 3.0 because the old alternative syntax is no longer relevant.

### Example: still-valid rule removed from Flutter defaults

`prefer_const_constructors` remains a stable lint, but it is no longer in `flutter_lints`.

Do not conflate:

```text
not in flutter_lints
```

with:

```text
lint removed from Dart
```

---

# Deprecation Handling

When analyzer reports use of a deprecated API:

```text
read replacement docs
↓
read migration notes
↓
understand behavior change
↓
migrate
↓
run tests
```

Do not permanently suppress deprecation diagnostics merely because migration is inconvenient.

A short-lived suppression can be acceptable during a controlled migration when:

- replacement is blocked;
- removal deadline is documented;
- affected scope is narrow.

---

# Lint Debt

Treat analyzer/lint debt as technical debt.

Do not accept:

```text
2,000 existing diagnostics
+
"we only care about new ones"
```

without an actual migration mechanism.

Recommended migration:

```text
measure diagnostics by rule
↓
rank by correctness/value
↓
adopt one category
↓
apply safe fixes
↓
manually fix remaining cases
↓
enable CI gate
↓
move to next category
```

Do not introduce new violations while legacy cleanup is active.

---

# Legacy Boundary Strategy

If a legacy subsystem cannot migrate immediately, isolate policy clearly.

Prefer:

```text
legacy/
interop/
generated/
```

with deliberate scoped configuration.

Avoid hundreds of unrelated:

```dart
// ignore: ...
```

directives spread throughout new code.

A bounded legacy exception communicates:

```text
this area is being migrated
```

rather than making every file look equally exempt.

---

# Upgrade / Migration Workflow

Treat every Flutter/Dart/lint upgrade as a policy migration.

## Step 1 — Record current toolchain

Run:

```sh
flutter --version
dart --version
```

Record resolved:

```text
flutter_lints
lints
```

from the dependency graph/lockfile.

---

## Step 2 — Read changelogs

Inspect:

- Flutter release notes;
- Dart release notes;
- `flutter_lints` changelog;
- `lints` changelog.

Do not jump from old to new lint policy without knowing which diagnostics changed.

---

## Step 3 — Update compatible version

Update the dev dependency only when SDK constraints permit.

Do not install `flutter_lints 6.0.0` into a Dart version below 3.8.

---

## Step 4 — Resolve dependencies

```sh
flutter pub get
```

Then inspect the actually resolved `lints` version.

Remember that the transitive `lints` dependency may add a rule without changing the top-level `flutter_lints` major version.

---

## Step 5 — Run analysis before auto-fixing

```sh
flutter analyze
```

Group new diagnostics by rule.

Do not immediately run a repository-wide auto-fix without understanding the diff.

---

## Step 6 — Inspect fix availability

```sh
dart fix --dry-run
```

---

## Step 7 — Apply safe fixes

```sh
dart fix --apply
```

Review the diff.

---

## Step 8 — Manually fix architectural cases

Pay special attention to:

- async control flow;
- BuildContext;
- public APIs;
- type conversions;
- generated code;
- deprecations.

---

## Step 9 — Remove obsolete configuration

Delete:

- removed lint names;
- deprecated rules;
- obsolete severity overrides;
- unnecessary ignores;
- migration-only exclusions.

---

## Step 10 — Format and test

```sh
dart format .
flutter analyze
flutter test
```

Then run relevant integration/build tests.

---

# Analyzer Performance

Linting primarily affects **developer/analyzer time**, not application runtime.

If analysis is slow, measure before weakening diagnostics.

---

## Common contributors

Investigate:

- huge repositories;
- many independent package analysis contexts;
- cyclic/symbolic-link layouts;
- unnecessary generated output under analyzed roots;
- analyzer plugins;
- large dependency graphs;
- duplicate analyzer processes;
- antivirus/file I/O issues;
- monorepo structure.

Dart provides Analysis Server diagnostics specifically for performance investigation.

---

# Pub Workspaces and Analysis Performance

Without a workspace, opening many independently resolved packages can cause the analyzer to create separate analysis contexts and consume more memory.

Pub workspaces use a shared dependency resolution and can reduce analyzer memory.

Prefer that structural optimization before disabling useful diagnostics.

---

# Analyzer Plugins and Performance

Plugins add analysis work and memory cost.

The legacy plugin system is explicitly documented as having significant memory considerations, especially in large monorepos.

Modern analyzer plugins improve integration but are still additional analysis workload.

Do not install analyzer plugins merely because they exist.

Require a measurable engineering benefit.

---

# Runtime Performance Boundary

Strong rule:

> **Enabling more lints does not make the release binary faster by itself.**

Some lint-guided code changes may incidentally affect runtime characteristics, but lint configuration is not a performance profiler.

The removal of Flutter's three broad const lints is an instructive example: the Flutter team evaluated real-world performance and did not find sufficient evidence to justify the ongoing lint noise.

If the goal is:

```text
faster frames
lower memory
smaller startup time
```

use:

- profile mode;
- DevTools;
- frame timing;
- allocation analysis;
- application benchmarks.

Do not enable stylistic lints and call it performance optimization.

---

# Architecture Boundaries

Lints can help architecture indirectly through:

- type discipline;
- import hygiene;
- API visibility;
- async correctness;
- immutable API patterns.

They do not inherently understand:

```text
presentation
→ domain
→ data
```

or enforce that:

```text
domain must not import Flutter
```

unless a specific built-in/custom rule encodes that constraint.

Use:

- package/module boundaries;
- dependency direction;
- code review;
- architecture tests;
- custom analyzer plugins where justified.

Do not claim `flutter_lints` enforces Clean Architecture.

---

# Security Boundaries

`flutter_lints` includes limited hygiene such as `secure_pubspec_urls`, but static lint policy does not replace:

- dependency vulnerability scanning;
- secret scanning;
- authorization testing;
- secure-storage design;
- cryptographic review;
- input validation;
- threat modeling;
- backend security.

A lint-clean project is not necessarily secure.

---

# Code Review Role

Static analysis should eliminate deterministic mechanical arguments before human review.

Do not spend code-review comments on:

```text
this rule is already enforced in CI
```

unless the context explains a deeper design problem.

Human review should focus on:

- product correctness;
- architecture;
- concurrency;
- state ownership;
- API quality;
- security;
- performance;
- maintainability.

Flag ignores and configuration changes because they alter what tooling will enforce in future code.

---

# Debugging Workflow

## Unknown lint rule

Symptom:

```text
'foo_rule' is not a recognized lint rule
```

Inspect:

1. Flutter SDK version;
2. Dart SDK version;
3. resolved `flutter_lints`;
4. resolved `lints`;
5. rule spelling;
6. current official rule documentation;
7. rule status: stable/deprecated/removed;
8. whether the config was copied from a newer SDK.

If removed, remove or replace it.

Do not suppress the “unknown lint” warning without understanding why the rule disappeared.

---

## Rule unexpectedly not active

Inspect:

1. correct `analysis_options.yaml`;
2. `include: package:flutter_lints/flutter.yaml`;
3. nested `analysis_options.yaml`;
4. local `linter.rules` override;
5. included-file order;
6. current analyzer root;
7. package/workspace boundaries;
8. resolved lint version.

---

## Rule unexpectedly active

Inspect:

- inherited Flutter rules;
- `package:lints`;
- transitive `lints` version;
- organization shared config;
- nested/local analysis file;
- analyzer plugin diagnostics.

Do not assume every active lint appears explicitly in the current file.

---

## CI fails but IDE passes

Check:

```text
SDK version
dependency lock
working directory
analysis options
generated files
IDE SDK path
CI flutter channel/version
```

Then run the exact CI command locally.

Do not debug editor display settings before comparing actual command-line output.

---

## IDE fails but CI passes

Inspect:

- stale Analysis Server;
- wrong IDE Flutter SDK;
- package resolution not refreshed;
- ungenerated local files;
- nested project opened in IDE;
- plugin-only IDE inspections.

Restart analyzer only after verifying the configuration itself.

---

## Analyzer is very slow

Inspect:

1. workspace/package structure;
2. generated directories;
3. symbolic links;
4. analyzer plugins;
5. repeated independent package contexts;
6. system file I/O/security software;
7. analyzer diagnostics report.

Do not start by disabling lints.

---

## Newly upgraded project has many violations

Determine whether the source is:

```text
new flutter_lints rule
new transitive package:lints rule
new analyzer diagnostic
new language rule
new formatter output
deprecated API
```

These require different migration responses.

---

## Generated file suddenly fails analysis

Do not edit it.

Inspect:

1. generator version;
2. source annotations/config;
3. Dart SDK compatibility;
4. changed lint set;
5. whether generator should emit ignores;
6. whether generated output should be lint-suppressed rather than excluded.

---

