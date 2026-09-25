---
name: flutter-lints-static-analysis-engineering
description: Configure, review, migrate, debug, and enforce Flutter/Dart static analysis with flutter_lints, analysis_options.yaml, analyzer strict modes, generated-code policy, CI gates, monorepos, dart fix, and lint-rule governance. Use this skill whenever a Flutter/Dart task mentions flutter_lints, analyzer warnings, flutter analyze, analysis_options.yaml, strict-casts/inference/raw-types, lint debt, generated-code ignores, CI analysis failures, SDK/lint upgrades, or deciding which lints to enable—even when the user only asks to “fix the lints” or improve code quality.
compatibility: Applies to Flutter/Dart repositories using flutter_lints or compatible analyzer configuration. The bundled source baseline reflects flutter_lints 6.0.0 and its August 2026 ecosystem context; inspect the repository's actual Flutter/Dart SDK, lockfile, resolved lints version, analyzer options, and package status before making version-sensitive changes.
---
# Flutter Lints & Static Analysis Engineering
## Mission
Treat static analysis as an engineering-quality system, not a rule-count competition.

Optimize for:
1. correctness;
2. type safety;
3. maintainability;
4. diagnostic signal;
5. migration safety;
6. CI reliability;
7. understandable repository policy;
8. analyzer performance only after coverage is correct.

Start with the official compatible Flutter lint baseline, inspect the **effective** configuration, then add or remove policy only when the engineering value is clear.

Do not equate:
```text
dart format
!= flutter_lints
!= flutter analyze
!= flutter test
!= runtime correctness
!= security
!= runtime performance
```
## Reference routing
Load detailed references only when needed:
- Read `references/01-baseline-effective-rules.md` for what `flutter_lints` does, the current baseline, effective/transitive rule-set resolution, includes, inheritance, overrides, and analyzer/lint mental models.
- Read `references/02-analyzer-strictness-generated.md` for analyzer configuration, exclusions, severities, `strict-casts`, `strict-inference`, `strict-raw-types`, ignore governance, and generated-code policy.
- Read `references/03-repository-ci-tooling.md` for app/package/test/example differences, monorepos, Pub workspaces, shared configs, analyzer plugins, CI, `flutter analyze`, `dart analyze`, formatter, `dart fix`, and IDE alignment.
- Read `references/04-rule-selection-migration-debugging.md` for rule selection, async/resource/API/style rules, signal-to-noise, deprecated/removed rules, lint debt, upgrade workflows, analyzer performance, architecture/security boundaries, and debugging.
- Read `references/05-antipatterns-workflows-checklists.md` for the full anti-pattern catalog, new/existing-project workflows, lint-adoption workflow, review rules, and production checklists.

When exact version behavior matters, verify the repository's installed SDK/package graph instead of assuming the bundled baseline is still current.
## Non-negotiable engineering principles
- Prefer the official compatible `flutter_lints` configuration as the starting point.
- Keep `analysis_options.yaml` version-controlled and review changes as repository policy changes.
- Inspect inherited and transitive policy before manually adding rules.
- Fix code before suppressing diagnostics when the diagnostic is valid.
- Use local suppression for genuine local exceptions; use global policy changes only when the team rejects the rule globally.
- Keep generated-code ownership explicit; never hand-edit generated output merely to satisfy analysis.
- Keep tests and examples analyzed unless there is a deliberate, documented exception.
- Do not exclude production code to make analysis faster or green.
- Treat SDK/lint upgrades as migrations, not dependency bumps.
- Keep IDE and CI toolchains aligned.
- Prevent new lint debt while legacy debt is being removed.
- Prefer a smaller trusted rule set over a large ignored one.
## Required workflow
Follow this sequence for every static-analysis task.
### 1. Inspect the repository before editing policy
Record:
```text
Flutter SDK version
Dart SDK version
flutter_lints declared version
flutter_lints resolved version
lints resolved version
analysis_options.yaml locations
nested analysis_options.yaml files
pubspec / workspace structure
CI analysis commands
generated-code workflow
current diagnostics
```
Useful commands include:
```bash
flutter --version
dart --version
flutter pub deps
flutter analyze
```
For pure Dart packages, use the repository's Dart-specific analysis command instead.

Do not infer the effective rule set from the top-level `flutter_lints` constraint alone. Its transitive `lints` dependency can change the inherited rule set within an allowed version range.
### 2. Find the actual policy chain
Resolve configuration in precedence order:
```text
package:flutter_lints/flutter.yaml
↓
shared organization config, if any
↓
root analysis_options.yaml
↓
package/subtree analysis_options.yaml
↓
local analyzer/linter overrides
↓
source ignore directives
```
If multiple includes are used, preserve their order intentionally; later configuration can override earlier configuration.

Do not duplicate inherited rules manually unless a local override requires explicit map syntax.
### 3. Classify each diagnostic correctly
Determine whether it comes from:
- Dart language/type rules;
- analyzer diagnostics;
- linter diagnostics;
- formatter changes;
- generated-code incompatibility;
- analyzer plugin diagnostics;
- deprecated/removed API use.

Do not respond to every diagnostic by changing `linter.rules`.

Current analyzer severity policy uses:
```text
info
warning
error
ignore
```
Do not invent a separate configurable `hint` severity.
### 4. Establish the baseline
For a modern Flutter repository, prefer a minimal baseline:
```yaml
include: package:flutter_lints/flutter.yaml
```
Add a compatible dev dependency according to the repository's SDK and dependency policy.

Do not copy a historical Flutter template or a random 150-rule internet configuration.
### 5. Inspect effective rule membership before adding rules
Before enabling a lint manually, answer:
1. Is it already inherited from `flutter_lints`?
2. Is it inherited transitively from `package:lints`?
3. Is it already enforced as an analyzer/language diagnostic?
4. Is the rule still stable, deprecated, removed, or merely absent from Flutter defaults?

Do not confuse:
```text
not in flutter_lints
```
with:
```text
removed from Dart
```
A valid optional lint may simply no longer be part of the official Flutter baseline.
### 6. Evaluate strict analyzer modes independently
Treat these as analyzer language modes, not lints:
```yaml
analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
```
Adopt each independently.

Use this decision logic:
- `strict-casts`: strong candidate when dynamic data is isolated at typed boundaries.
- `strict-inference`: valuable when failed inference silently becomes `dynamic`; migration can be noisy in generic/legacy code.
- `strict-raw-types`: valuable when raw generic types erode type information.

Do not assume `strict_top_level_inference` means analyzer `strict-inference` is already enabled; they are different mechanisms.

For legacy repositories:
```text
measure violations
→ enable one mode
→ fix typed core
→ isolate dynamic boundaries
→ update generators
→ enforce clean CI
→ consider next mode
```
Avoid turning strict-mode adoption into hundreds of suppressions.
### 7. Add project-specific rules only after a value/noise review
For every candidate rule, document:
```text
Problem caught:
Affected scope:
Existing violation count:
False-positive/noise rate:
Automated fix availability:
Migration cost:
Long-term value:
Why formatter/tests/review are insufficient:
```
Prefer rules that catch likely incorrect behavior or unsafe async/type patterns over purely aesthetic preferences.

Possible high-value candidates in some repositories include Future-handling, ignore-governance, or resource-lifecycle rules, but do not enable them automatically.
### 8. Keep formatting policy separate
Use `dart format` for formatting.

Typical CI check:
```bash
dart format -o none --set-exit-if-changed .
```
Do not add style lints solely to fight current formatter behavior.

If using modern formatter configuration in `analysis_options.yaml`, ensure the repository's Dart language version supports those options.
### 9. Govern ignores explicitly
Use narrow ignores only after understanding the diagnostic.

Preferred exception pattern:
```dart
// Rationale explaining why the normal fix is inappropriate here.
// ignore: diagnostic_name
someCode();
```
Use file-level ignores only when the entire file truly follows different policy.

Reserve:
```dart
// ignore_for_file: type=lint
```
primarily for generated boundaries where suppressing lints is intentional.

If the repository has many ignores, consider enabling governance rules such as stale-ignore detection or documented-ignore requirements after measuring migration cost.
### 10. Choose an explicit generated-code policy
Choose one strategy per generated-code family:
**Analyze normally** when generated output is owned, published, or generator correctness should be checked.

**Suppress lints but preserve analyzer diagnostics** when generated code should remain type-correct but style policy is irrelevant.

**Exclude narrowly** only when vendor/generated output is intentionally outside analyzer ownership or measured cost/noise justifies losing diagnostics.

Never hand-edit generated output to silence diagnostics when regeneration will overwrite the fix.

Change the source annotations, generator, template, version, or analysis boundary instead.
### 11. Keep app/package/test/example policy intentional
For applications, prioritize correctness, type safety, async/lifecycle safety, and maintainability.

For published packages/plugins, additionally review public API quality, documentation, dependency boundaries, and deprecation policy.

Analyze tests by default. Tests can contain real type/async/resource bugs.

Treat package `example/` code as executable documentation and analyze it where practical.

Do not impose package-authoring documentation policy on every private app class without a reason.
### 12. Design monorepo policy for discoverability
Prefer:
```text
root baseline
↓
small shared organization policy, if justified
↓
rare package-specific override
```
Do not create identical `analysis_options.yaml` files in every package.

Use package-local policy only when package roles genuinely differ.

Consider Pub workspaces when shared dependency resolution is appropriate; they can reduce duplicated analyzer contexts in large repositories.

Verify CI actually analyzes every intended Flutter and pure Dart package.
### 13. Enforce analysis in CI
For Flutter packages/apps, prefer:
```bash
flutter analyze
```
For pure Dart packages, use:
```bash
dart analyze
```
and add `--fatal-infos` when a zero-info policy is intended.

A typical Flutter quality pipeline is:
```text
dependency resolution
→ generated code, if required
→ format check, if policy requires it
→ flutter analyze
→ tests
→ build/integration validation
```
Do not claim linting replaces tests.
### 14. Use `dart fix` as a reviewed migration tool
Use:
```bash
dart fix --dry-run
dart fix --apply
```
Workflow:
```text
clean git state
→ dry run
→ inspect fix categories
→ apply
→ review diff
→ format
→ analyze
→ test
```
Review behavior-sensitive rewrites involving async flow, null handling, deprecated APIs, collection semantics, or generated code.
### 15. Treat lint/SDK upgrades as migrations
Before upgrading:
1. record Flutter/Dart versions;
2. record resolved `flutter_lints` and `lints`;
3. read relevant changelogs/release notes when current verification is available;
4. update only to a compatible version;
5. resolve dependencies;
6. inspect the new resolved `lints` version;
7. run analysis before auto-fixing;
8. group new diagnostics by source/rule;
9. review `dart fix --dry-run`;
10. fix architectural cases manually;
11. regenerate generated code when needed;
12. remove obsolete rules/overrides/ignores;
13. format and test;
14. commit policy and migration together.

Do not leave obsolete lint names in configuration after the toolchain no longer recognizes them.
### 16. Keep a zero-diagnostic policy only if the suite is trusted
A mature repository should normally aim for clean analysis.

Do not normalize thousands of warnings/infos indefinitely.

If existing debt is large:
```text
inventory by rule
→ rank by correctness/value
→ freeze new violations
→ migrate one category
→ enable clean gate for that category
→ repeat
```
A low-signal suite teaches developers to ignore high-value diagnostics.
### 17. Debug configuration before suppressing symptoms
When a lint is unknown, unexpectedly active, or unexpectedly absent, inspect:
- SDK versions;
- resolved `flutter_lints` and `lints`;
- rule spelling/status;
- include chain/order;
- nested options files;
- local rule overrides;
- analyzer root/workspace;
- plugin diagnostics.

When IDE and CI disagree, compare the exact SDK, lockfile, working directory, generated files, and command-line analysis before changing policy.

When analyzer performance is poor, investigate workspaces, analysis contexts, generated roots, symlinks, plugins, dependency graph, file I/O, and analyzer diagnostics before excluding useful source.
### 18. Keep architecture, security, and runtime performance as separate gates
Static analysis can support architecture indirectly through type/import/API rules, but it does not automatically enforce application layering.

Use package boundaries, architecture tests, review, or modern analyzer plugins only when the constraint is stable and machine-checkable.

Static analysis does not replace:
- secret scanning;
- dependency vulnerability scanning;
- authorization tests;
- cryptographic/security review;
- runtime profiling;
- performance benchmarks.

Do not claim that enabling more lints makes a release binary faster.
## High-value decision tables
### Suppression decision
| Situation | Preferred action |
| --- | --- |
| Diagnostic is valid | Fix code |
| One deliberate exception | Narrow local ignore with rationale |
| Whole generated family has style-only noise | Generator-emitted `type=lint` suppression |
| Rule is globally unsuitable | Explicit project-wide override |
| Rule causes large debt but is valuable | Stage migration; freeze new violations |
| Rule name is unknown | Verify SDK/rule status; do not suppress blindly |
### Generated-code decision
| Situation | Preferred policy |
| --- | --- |
| Generated public/owned code | Analyze normally |
| Type correctness matters, style does not | Suppress lints, keep analyzer diagnostics |
| Vendor/unowned output outside responsibility | Narrow exclusion may be justified |
| Generator emits invalid Dart | Fix generator/version/input, not output manually |
### Strict-mode decision
| Setting | Main purpose | Default approach |
| --- | --- | --- |
| `strict-casts` | Reject implicit downcasts from `dynamic` | Strong candidate for typed modern code |
| `strict-inference` | Flag inference failures that become `dynamic` | Adopt after measuring generic/legacy noise |
| `strict-raw-types` | Require generic type arguments | Usually valuable; stage legacy migration |
## Required output when reviewing a repository
When the user asks for a lint/static-analysis review, report:
1. **Toolchain** — Flutter, Dart, `flutter_lints`, resolved `lints`.
2. **Effective policy** — includes, nested configs, strict modes, overrides, plugins.
3. **Diagnostic inventory** — grouped by source/rule and severity.
4. **High-risk issues** — correctness/type/async/lifecycle issues first.
5. **Policy problems** — stale rules, broad ignores/excludes, duplicate config, SDK drift.
6. **Generated-code strategy** — analyze/suppress/exclude and why.
7. **Recommended changes** — smallest justified set, ordered by value.
8. **Migration plan** — including `dart fix` only where appropriate.
9. **CI gates** — exact commands and fatality policy.
10. **Validation** — analyzer, formatter, tests, and package/build checks relevant to the repository.

Separate:
```text
source-observed fact
```
from:
```text
recommended policy change
```
when reviewing an existing codebase.
## Validation gate
Before completing a configuration or migration:
- ensure the selected `flutter_lints` version is SDK-compatible;
- confirm the resolved `lints` version;
- ensure include paths resolve;
- ensure no unknown/removed lint names remain;
- verify strict modes are intentional;
- verify excludes are narrow;
- verify ignores are justified;
- verify generated-code handling is reproducible;
- regenerate code if the project requires it;
- run the repository's formatter check if enforced;
- run `flutter analyze` for Flutter targets;
- run appropriate Dart analysis for pure Dart packages;
- run tests independently;
- verify CI uses the same toolchain/configuration.

Do not declare success because `analysis_options.yaml` parses. Validate the effective repository behavior.
## Production definition of done
Static-analysis work is complete only when:
- the effective policy is known rather than guessed;
- the official compatible Flutter baseline is inherited;
- additions solve explicit engineering problems;
- disabled rules have deliberate rationale;
- no stale/removed rules remain;
- strict modes are intentional and sustainable;
- generated-code policy is explicit;
- production source is not broadly excluded;
- ignores are narrow and stale ignores are removed;
- tests/examples are analyzed where appropriate;
- monorepo/package scopes are correct;
- IDE and CI toolchains are aligned;
- CI enforces the intended diagnostic levels;
- analysis remains high-signal;
- analyzer-performance changes did not weaken coverage without evidence;
- runtime correctness, security, and performance remain covered by their own validation systems.
## Final rule
Use `flutter_lints` as the official high-signal baseline, then add only rules whose engineering value justifies their migration and noise cost.

The goal is not to maximize diagnostics. The goal is to make important problems difficult to miss while keeping the policy trusted, explainable, and maintainable.
