# Anti-patterns, implementation workflows, review gates, and production checklists

## Contents

- Common Anti-Patterns
  - 1. Copying a random internet lint configuration
  - 2. Enabling every rule
  - 3. Disabling every annoying rule
  - 4. Having no analysis configuration
  - 5. Manually duplicating flutter_lints
  - 6. Using removed lint names
  - 7. Assuming rules removed from Flutter defaults are deprecated
  - 8. Editing generated files
  - 9. Excluding every generated and source directory
  - 10. ignore_for_file across production files
  - 11. Ignoring an unknown rule without reading docs
  - 12. Treating warnings as harmless indefinitely
  - 13. Local-only analysis
  - 14. Different SDKs in IDE and CI
  - 15. Disabling strict checks because JSON is dynamic
  - 16. Enabling every strict mode in one legacy PR
  - 17. Package-authoring policy imposed on an app
  - 18. Weakening analysis to speed CI
  - 19. Lint-clean means correct
  - 20. Lint-clean means secure
  - 21. Linting replaces tests
  - 22. Lints automatically improve runtime performance
  - 23. Keeping obsolete overrides after upgrade
  - 24. Adding new debt while cleaning old debt
  - 25. Copying an old Flutter template
  - 26. Global ignore for one exception
  - 27. Local ignores when the rule is globally wrong
  - 28. Fighting dart format with style lints
  - 29. Assuming strict_top_level_inference equals strict inference mode
  - 30. Assuming flutter_lints 6.0 always means lints 6.0
- New Project Configuration Workflow
  - 1. Identify SDK versions
  - 2. Inspect current Flutter template
  - 3. Add compatible flutter_lints
  - 4. Start with official baseline
  - 5. Run analyzer
  - 6. Evaluate project-specific problems
  - 7. Evaluate strict modes separately
  - 8. Define generated-code policy
  - 9. Configure CI
  - 10. Align IDE/toolchain
  - 11. Document overrides
  - 12. Keep configuration small
- Existing Project Review Workflow
- Lint Upgrade Workflow
- Rule-Adoption Workflow
  - 1. Read official documentation
  - 2. Identify the engineering problem
  - 3. Measure violations
  - 4. Inspect false positives
  - 5. Decide scope
  - 6. Check automated fixes
  - 7. Apply fixes
  - 8. Handle deliberate exceptions
  - 9. Enforce in CI
- Code Review Workflow
- Refactoring Rules
- analysis_options Checklist
- Generated Code Checklist
- CI Checklist
- Monorepo Checklist
- Upgrade Checklist
- Production Readiness Checklist
- Quick Reference
- Final Engineering Decision Rules

---

# Common Anti-Patterns

## 1. Copying a random internet lint configuration

**Bad**

```yaml
linter:
  rules:
    # 180 copied rules from a blog post
    always_specify_types: true
    omit_local_variable_types: true
```

**Why it is problematic**

Rules can conflict, be obsolete, or target a completely different repository style.

**Better**

```yaml
include: package:flutter_lints/flutter.yaml
```

Then add individually justified rules.

---

## 2. Enabling every rule

**Bad**

```text
"More lints = better code."
```

**Why it is problematic**

Dart explicitly notes lints can disagree and have false positives.

**Better**

Adopt high-value rules after measuring violations and noise.

---

## 3. Disabling every annoying rule

**Bad**

```yaml
linter:
  rules:
    use_build_context_synchronously: false
```

because fixing async context handling requires work.

**Why it is problematic**

The rule addresses real lifecycle risk.

**Better**

Fix context lifetime or document a genuine exception.

---

## 4. Having no analysis configuration

**Bad**

Delete `analysis_options.yaml`.

**Why it is problematic**

The repository silently loses intentional lint policy.

**Better**

```yaml
include: package:flutter_lints/flutter.yaml
```

---

## 5. Manually duplicating flutter_lints

**Bad**

```yaml
linter:
  rules:
    avoid_print: true
    avoid_unnecessary_containers: true
    # ...copy hundreds...
```

**Why it is problematic**

Upgrades become manual and drift from official policy.

**Better**

Use `include`.

---

## 6. Using removed lint names

**Bad**

```yaml
linter:
  rules:
    prefer_equal_for_default_values: true
```

**Why it is problematic**

The rule was removed in Dart 3.0.

**Better**

Remove obsolete policy and follow current language semantics.

---

## 7. Assuming rules removed from Flutter defaults are deprecated

**Bad**

```text
prefer_const_constructors is obsolete
```

**Why it is problematic**

It remains a valid optional lint; it was only removed from `flutter_lints`.

**Better**

Distinguish rule-set membership from lint lifecycle status.

---

## 8. Editing generated files

**Bad**

```dart
// generated_api.g.dart
// Hand-edited to satisfy the analyzer.
```

**Why it is problematic**

Regeneration overwrites changes.

**Better**

Fix generator input/configuration or generated-code analysis policy.

---

## 9. Excluding every generated and source directory

**Bad**

```yaml
analyzer:
  exclude:
    - lib/**
    - test/**
```

**Why it is problematic**

Static analysis becomes meaningless.

**Better**

Exclude only files that intentionally should not be analyzed.

---

## 10. `ignore_for_file` across production files

**Bad**

```dart
// ignore_for_file: type=lint
```

on dozens of normal source files.

**Why it is problematic**

Removes the repository's lint policy precisely where it matters.

**Better**

Use targeted line suppression or reconsider the rule globally.

---

## 11. Ignoring an unknown rule without reading docs

**Bad**

```yaml
analyzer:
  errors:
    undefined_lint_warning: ignore
```

**Why it is problematic**

The config may be stale or incompatible with the SDK.

**Better**

Identify the lint's current status.

---

## 12. Treating warnings as harmless indefinitely

**Bad**

```text
"CI only fails errors; warnings can accumulate."
```

**Why it is problematic**

Warnings often indicate real correctness risks and permanent debt destroys signal.

**Better**

Use a maintained zero-diagnostic policy.

---

## 13. Local-only analysis

**Bad**

```text
Developer is expected to remember flutter analyze.
```

**Why it is problematic**

Policy becomes optional.

**Better**

Run analysis in CI.

---

## 14. Different SDKs in IDE and CI

**Bad**

```text
Developer: Flutter 3.x
CI: unrelated Flutter 3.y
```

with no repository toolchain policy.

**Why it is problematic**

Analyzer diagnostics and formatter output can change across SDKs.

**Better**

Keep toolchain versions aligned and review upgrades deliberately.

---

## 15. Disabling strict checks because JSON is dynamic

**Bad**

```yaml
analyzer:
  language:
    strict-casts: false
```

solely because one HTTP layer uses `jsonDecode`.

**Why it is problematic**

A dynamic boundary should not force the entire application to lose type checking.

**Better**

Validate/cast at the boundary and keep typed application code.

---

## 16. Enabling every strict mode in one legacy PR

**Bad**

```yaml
analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
```

followed by 2,000 suppressions.

**Why it is problematic**

The migration creates more lint debt than type safety.

**Better**

Enable incrementally.

---

## 17. Package-authoring policy imposed on an app

**Bad**

Require API documentation on every private application implementation class.

**Why it is problematic**

Creates documentation noise without consumer value.

**Better**

Reserve package-facing rules for package-facing APIs unless the app has a specific documentation policy.

---

## 18. Weakening analysis to speed CI

**Bad**

```yaml
analyzer:
  exclude:
    - lib/features/**
```

because analysis takes 25 seconds.

**Why it is problematic**

Correctness is traded for unmeasured speed.

**Better**

Profile analyzer/workspace/generated-file structure.

---

## 19. Lint-clean means correct

**Bad**

```text
flutter analyze passes
→ feature is correct
```

**Why it is problematic**

Static analysis cannot verify product behavior.

**Better**

Run tests and review behavior.

---

## 20. Lint-clean means secure

**Bad**

```text
No analyzer errors → security review complete.
```

**Why it is problematic**

Analyzer is not a security program.

**Better**

Use dedicated security processes.

---

## 21. Linting replaces tests

**Bad**

```text
Strong lints mean unit tests are unnecessary.
```

**Better**

Use static analysis and tests for their different strengths.

---

## 22. Lints automatically improve runtime performance

**Bad**

Enable many style lints expecting faster frames.

**Why it is problematic**

Lint rules operate during engineering/analysis.

**Better**

Profile runtime performance.

---

## 23. Keeping obsolete overrides after upgrade

**Bad**

```yaml
linter:
  rules:
    old_rule: false
```

for a rule no longer present.

**Why it is problematic**

Configuration becomes misleading.

**Better**

Audit overrides during every major lint/SDK migration.

---

## 24. Adding new debt while cleaning old debt

**Bad**

```text
Legacy violations are allowed,
therefore new code may add them too.
```

**Better**

Freeze new violations while migrating existing ones.

---

## 25. Copying an old Flutter template

**Bad**

Copy an `analysis_options.yaml` from a Flutter 2.x repository.

**Why it is problematic**

Lint membership, Dart syntax, formatter behavior, and analyzer configuration evolve.

**Better**

Inspect the template produced by the repository's current Flutter SDK.

---

## 26. Global ignore for one exception

**Bad**

```yaml
linter:
  rules:
    avoid_print: false
```

because one CLI diagnostic function intentionally prints output.

**Better**

Use a targeted suppression for that code.

---

## 27. Local ignores when the rule is globally wrong

**Bad**

Hundreds of:

```dart
// ignore: rule_name
```

across the repository.

**Why it is problematic**

The repository clearly does not agree with the rule.

**Better**

Make an explicit project-wide policy decision.

---

## 28. Fighting dart format with style lints

**Bad**

Add multiple line-breaking/trailing-comma policies that conflict with current formatter behavior.

**Better**

Let `dart format` own formatting and reserve lints for concerns it does not already deterministically solve.

---

## 29. Assuming `strict_top_level_inference` equals strict inference mode

**Bad**

```text
flutter_lints has strict_top_level_inference
→ strict-inference is already enabled
```

**Why it is problematic**

They are separate mechanisms.

**Better**

Evaluate `analyzer.language.strict-inference` independently.

---

## 30. Assuming flutter_lints 6.0 always means lints 6.0

**Bad**

```text
flutter_lints = 6.0.0
→ effective Dart recommended set is fixed forever
```

**Why it is problematic**

Its dependency is `lints: ^6.0.0`.

**Better**

Inspect the resolved dependency graph/lockfile.

---

# New Project Configuration Workflow

## 1. Identify SDK versions

Run:

```sh
flutter --version
dart --version
```

---

## 2. Inspect current Flutter template

Generate or inspect the current SDK template rather than copying old configuration.

Current templates use:

```yaml
flutter_lints: ^6.0.0
```

and:

```yaml
include: package:flutter_lints/flutter.yaml
```



---

## 3. Add compatible flutter_lints

Use the highest appropriate version compatible with the project's SDK.

Do not upgrade the lint package independently of an incompatible old Dart SDK.

---

## 4. Start with official baseline

```yaml
include: package:flutter_lints/flutter.yaml
```

Do not start from a 200-rule custom config.

---

## 5. Run analyzer

```sh
flutter analyze
```

Confirm a clean baseline.

---

## 6. Evaluate project-specific problems

Ask whether the project specifically needs:

- future-use rules;
- resource-lifecycle rules;
- stricter types;
- public API documentation;
- ignore governance.

---

## 7. Evaluate strict modes separately

Estimate violations before enabling.

---

## 8. Define generated-code policy

Choose:

- analyze;
- lint-suppress;
- exclude.

Document the reason.

---

## 9. Configure CI

At minimum:

```sh
dart format -o none --set-exit-if-changed .
flutter analyze
flutter test
```

if formatting enforcement is part of repository policy.

---

## 10. Align IDE/toolchain

Developers and CI must use compatible SDK versions.

---

## 11. Document overrides

Any disabled inherited rule should have a clear repository-level reason.

---

## 12. Keep configuration small

Add rules only when they solve an identified engineering problem.

---

# Existing Project Review Workflow

Before modifying lint policy, inspect:

1. Flutter SDK version;
2. Dart SDK version;
3. `flutter_lints` version;
4. resolved `lints` version;
5. `analysis_options.yaml`;
6. all nested analysis files;
7. analyzer excludes;
8. `analyzer.errors`;
9. strict language settings;
10. local lint additions;
11. disabled inherited rules;
12. source ignore directives;
13. generated-code strategy;
14. test-specific policy;
15. example policy;
16. CI commands;
17. formatter policy;
18. analyzer plugins;
19. monorepo/workspace setup;
20. current diagnostics.

For every non-default configuration entry ask:

> Why does this exist?

If nobody can answer, investigate before retaining it.

---

# Lint Upgrade Workflow

1. Read `flutter_lints` changelog.
2. Read `lints` changelog.
3. Verify new SDK requirements.
4. Update dependency.
5. Resolve dependencies.
6. Inspect resolved `lints`.
7. Run `flutter analyze`.
8. Group new diagnostics by rule.
9. Run `dart fix --dry-run`.
10. Apply safe fixes.
11. Review behavior-sensitive fixes.
12. Regenerate generated code if required.
13. Remove obsolete overrides.
14. Remove stale ignores.
15. Run formatter.
16. Run tests.
17. Commit configuration and migration together.
18. Keep CI at zero new debt.

---

# Rule-Adoption Workflow

Before enabling any new rule:

## 1. Read official documentation

Do not act on the rule name alone.

## 2. Identify the engineering problem

Write one sentence:

```text
This rule catches...
```

If that sentence is purely:

```text
"I personally prefer this style"
```

treat it as low priority.

## 3. Measure violations

Run analysis with the rule enabled.

Count:

- total;
- production;
- tests;
- generated code.

## 4. Inspect false positives

Review a representative sample.

## 5. Decide scope

Maybe:

```text
published packages only
```

rather than all applications.

## 6. Check automated fixes

```sh
dart fix --dry-run
```

## 7. Apply fixes

Review semantic changes.

## 8. Handle deliberate exceptions

Prefer narrow ignores.

## 9. Enforce in CI

Only after repository is clean.

---

# Code Review Workflow

When reviewing Dart/Flutter code:

1. Run analyzer.
2. Do not manually nitpick issues tooling already deterministically enforces unless context matters.
3. Inspect newly introduced ignore directives.
4. Inspect `analysis_options.yaml` changes carefully.
5. Review architecture.
6. Review correctness.
7. Review async/resource ownership.
8. Review security.
9. Review runtime performance.
10. Verify tests.

Static analysis should reduce mechanical review workload, not replace engineering judgment.

---

# Refactoring Rules

Changing analysis configuration can alter repository policy even when runtime code is unchanged.

Treat changes to these as substantive:

```text
include
strict-casts
strict-inference
strict-raw-types
analyzer.errors
analyzer.exclude
linter.rules
plugins
```

A pull request that changes:

```yaml
use_build_context_synchronously: false
```

is not “just YAML.”

It changes what all future code is allowed to do.

Require engineering review.

---

# analysis_options Checklist

- [ ] File is committed to version control.
- [ ] Correct `flutter_lints` include is present.
- [ ] Installed lint version is SDK-compatible.
- [ ] Effective transitive `lints` version is understood.
- [ ] Local rules are intentional.
- [ ] Disabled inherited rules have justification.
- [ ] No removed/deprecated lint names remain.
- [ ] Analyzer exclusions are narrow.
- [ ] Severity overrides are intentional.
- [ ] Strict modes are intentional.
- [ ] Formatter settings are intentional.
- [ ] Include ordering is understood.
- [ ] No obsolete legacy analyzer options remain.
- [ ] Plugin configuration uses current APIs.

---

# Generated Code Checklist

- [ ] Generated files are clearly identifiable.
- [ ] Manual edits are prohibited unless generator allows them.
- [ ] Generator is compatible with current Dart SDK.
- [ ] Decision to analyze/suppress/exclude is documented.
- [ ] `ignore_for_file: type=lint` is generated, not hand-maintained repeatedly.
- [ ] Exclusions do not hide application source.
- [ ] Generated public APIs remain testable.
- [ ] Generator is rerun after SDK/API migrations.
- [ ] Generated code does not create persistent analyzer errors.

---

# CI Checklist

- [ ] CI uses a defined Flutter SDK.
- [ ] Dependencies are resolved consistently.
- [ ] Formatting policy is enforced if required.
- [ ] `flutter analyze` runs for Flutter packages/apps.
- [ ] Pure Dart packages use appropriate Dart analysis.
- [ ] Info-level diagnostics are fatal when zero-diagnostic policy is intended.
- [ ] Tests run independently of analysis.
- [ ] Analysis is not duplicated unnecessarily across jobs.
- [ ] Generated code exists before analysis if repository workflow requires generation.
- [ ] CI does not exclude source solely for speed.
- [ ] Local and CI commands match.

---

# Monorepo Checklist

- [ ] Root analysis policy exists where appropriate.
- [ ] Package-local configs exist only for genuine differences.
- [ ] Include chains are understandable.
- [ ] Every package resolves required config dependencies.
- [ ] Flutter and pure Dart packages use appropriate analysis commands.
- [ ] Workspace support is considered.
- [ ] Analyzer memory is monitored for large repositories.
- [ ] Shared generated directories are scoped correctly.
- [ ] CI actually analyzes every intended package.
- [ ] Public packages can add API-specific rules.
- [ ] App packages are not burdened with irrelevant publishing policy.
- [ ] Analyzer plugins are configured at supported workspace/package scope.

---

# Upgrade Checklist

- [ ] Flutter release notes read.
- [ ] Dart release notes read.
- [ ] `flutter_lints` changelog read.
- [ ] `lints` changelog read.
- [ ] Minimum SDK constraints verified.
- [ ] Effective lint set reviewed.
- [ ] Newly added rules identified.
- [ ] Removed/deprecated rules identified.
- [ ] Analyzer diagnostics changes identified.
- [ ] Formatter changes identified.
- [ ] `dart fix --dry-run` reviewed.
- [ ] Obsolete ignores removed.
- [ ] Generated code regenerated.
- [ ] Analyzer passes.
- [ ] Formatter passes.
- [ ] Tests pass.
- [ ] CI policy updated.

---

# Production Readiness Checklist

Before considering repository static analysis production-ready:

- [ ] Project includes the current compatible official Flutter lint configuration.
- [ ] `analysis_options.yaml` is version-controlled.
- [ ] No stale/removed lint names exist.
- [ ] Local rule additions solve identified problems.
- [ ] Disabled rules are justified.
- [ ] Effective `lints` transitive version is understood.
- [ ] Strict analysis settings are deliberate.
- [ ] Generated-code policy is defined.
- [ ] No broad production source exclusions exist.
- [ ] Ignore directives are narrow.
- [ ] Stale ignores are removed.
- [ ] Test code is analyzed.
- [ ] Package examples are analyzed where practical.
- [ ] Flutter analysis passes in CI.
- [ ] Formatter check runs when repository policy requires it.
- [ ] Tests remain independent quality gates.
- [ ] Developer/CI SDK versions are aligned.
- [ ] Monorepo analysis scope is verified.
- [ ] Analyzer plugins are justified.
- [ ] Analysis performance has been measured before coverage is weakened.
- [ ] Lint policy remains high-signal.

---

# Quick Reference

| Situation | Preferred approach |
| --- | --- |
| New Flutter app | Start with current compatible `flutter_lints` |
| Current Flutter template | `flutter_lints: ^6.0.0` + `include: package:flutter_lints/flutter.yaml` |
| Need extra project rule | Evaluate value/noise, then enable explicitly |
| Rule is annoying | Understand why it exists before disabling |
| One deliberate exception | Narrow `ignore`, ideally with rationale |
| Hundreds of same ignore | Reconsider project-wide rule policy |
| Generated file violates style lint | Fix generator or suppress lints at generated boundary |
| Generated file has analyzer error | Fix generator/version compatibility rather than hand-edit |
| Unowned generated/vendor code | Consider narrow `analyzer.exclude` |
| Need stronger dynamic safety | Evaluate `strict-casts` |
| Inference repeatedly falls to dynamic | Evaluate `strict-inference` |
| Raw generic types proliferate | Evaluate `strict-raw-types` |
| `strict_top_level_inference` active | Remember it is already inherited; not equivalent to strict-inference mode |
| Async Futures frequently dropped | Evaluate `unawaited_futures` and `discarded_futures` |
| Resource lifecycle mistakes common | Evaluate lifecycle lints; test false positives |
| Huge legacy violation count | Stage migration and block new debt |
| CI fails after SDK upgrade | Identify analyzer vs lint vs formatter change |
| IDE passes, CI fails | Compare SDK, lockfile, options, working directory |
| Analyzer slow | Measure analysis contexts/plugins/I/O/generated scope |
| Large monorepo | Consider Pub workspaces and shared policy |
| Published package | Consider stricter public API/documentation policy |
| Private app | Prioritize correctness/type/async/widget maintainability |
| Rule deprecated | Remove or follow replacement diagnostic |
| Rule removed from Flutter defaults | Decide whether optional use still benefits repository |
| Rule removed from Dart | Delete obsolete configuration |
| Need format enforcement | `dart format -o none --set-exit-if-changed .` |
| Need static analysis in Flutter | `flutter analyze` |
| Need pure Dart analysis | `dart analyze`, add `--fatal-infos` for zero-info gate |
| Need automated migrations | `dart fix --dry-run`, then `dart fix --apply` |
| Want faster runtime | Use runtime profiling, not more lints |
| Need architecture enforcement | Use modules/tests/review; custom analyzer plugin only when justified |
| Need security assurance | Use dedicated security controls |
| Want every lint enabled | Do not; optimize for signal |
| `prefer_const_constructors` warning absent | Expected: no longer part of current Flutter baseline |
| Same flutter_lints version behaves differently | Inspect resolved transitive `lints` version |

---

# Final Engineering Decision Rules

When configuring or reviewing Flutter static analysis, reason in this order:

```text
1. What Flutter and Dart SDK versions are in use?
2. Which flutter_lints version is installed?
3. Which package:lints version is actually resolved?
4. What configuration is inherited?
5. What diagnostics come from the language/analyzer?
6. What diagnostics come from lints?
7. What repository problem would an additional rule solve?
8. Is that better solved by types, tests, formatting, architecture, or review?
9. What migration cost will the rule create?
10. What false-positive/noise cost will it create?
11. Does generated/test/example code need different treatment?
12. Can strict typing strengthen the repository?
13. Are ignores narrow and justified?
14. Does IDE behavior match CI?
15. Does CI fail on the intended diagnostic levels?
16. Are analyzer exclusions hiding real source?
17. Are any configuration entries deprecated or obsolete?
18. Is analyzer performance actually measured?
19. Will the policy remain understandable after the next SDK upgrade?
20. Does the resulting suite remain trusted by developers?
```

Optimize in this order:

```text
Correctness
↓
Type safety
↓
Maintainability
↓
Diagnostic signal
↓
Team consistency
↓
Migration safety
↓
CI reliability
↓
Analyzer performance
↓
Style preference
```

The central rule is:

> **Use `flutter_lints` as the official high-signal baseline, then add only rules whose engineering value justifies their migration and noise cost. Static analysis should make important problems harder to miss—not make developers better at ignoring warnings.**
