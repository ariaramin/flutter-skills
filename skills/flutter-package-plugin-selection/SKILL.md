---
name: flutter-package-plugin-selection
description: Evidence-based discovery, evaluation, selection, integration, upgrading, replacement, and rejection of Flutter/Dart packages, plugins, FFI libraries, native SDK wrappers, generators, and tooling. Use whenever a Flutter/Dart task involves choosing or adding a dependency, comparing pub.dev options, auditing an existing dependency, validating platform support, reducing dependency/binary footprint, resolving conflicts, reviewing package security/privacy/performance, deciding whether local/native code is better, or planning a package migration—even if the user only asks “which package should I use?”.
compatibility: Requires repository/file inspection. For real package selection, use current web access to verify pub.dev metadata, official docs, releases, repositories, platform requirements, issues/advisories, and exact versions. Shell access is strongly preferred for pub/dependency/build validation.
---

# Flutter Package & Plugin Selection

## Goal
Choose the smallest, safest, maintainable solution that satisfies the real engineering requirement while accounting for runtime behavior, build impact, platform support, security, privacy, performance, dependency footprint, migration cost, and long-term ownership.

A valid outcome is:
> Do not add a third-party dependency.

Treat every recommendation as a current, evidence-backed engineering decision—not a popularity ranking.

## Progressive disclosure
Read bundled references only when useful:
- `references/package_selection_checklist.md` — exhaustive production audit/final gate.
- `references/package_evaluation_matrix.md` — comparison matrix, weighting, and calibration example.
- `references/research_findings.md` — rationale and representative lessons.
- `references/research_sources.md` — primary-source basis. Re-open live sources for current facts; never reuse its package versions as “latest”.

## Non-negotiable rules
1. Inspect the existing repository before recommending a package for an existing project.
2. Define the requirement before searching pub.dev.
3. Check existing project capabilities, Flutter/Dart native APIs, and a small local implementation before third-party options.
4. Do not add a dependency for trivial deterministic code unless it materially improves correctness, compatibility, or maintenance.
5. Do not reject a mature package merely because equivalent code could theoretically be rewritten locally.
6. Search broadly, normalize solution scope, then shortlist only serious candidates.
7. Inspect serious candidates beyond pub.dev landing pages.
8. Re-verify current stable version, release date, SDK constraints, deprecation state, and required platform implementations every time.
9. Treat likes, downloads, pub points, search position, verified publisher status, GitHub stars, and Flutter Favorite status as secondary signals only.
10. Inspect direct/transitive dependencies; for plugins/FFI/native SDKs also inspect native/build dependencies.
11. Apply higher scrutiny to security/privacy/performance-sensitive, native, FFI, background, database, auth, payment, and infrastructure dependencies.
12. Do not repeat README performance/security claims as facts without evidence.
13. Benchmark performance-sensitive candidates under equivalent profile/release conditions when performance affects the decision.
14. Do not force a winner when evidence is insufficient or all candidates are unsuitable.
15. Choose the newest appropriate stable version compatible with the repository—not blindly the newest release.
16. Avoid prereleases and permanent `dependency_overrides` unless explicitly justified.
17. Do not modify unrelated dependencies merely to accommodate a candidate unless that upgrade cost is accepted.
18. Do not claim integration success until relevant analyzer/tests/builds pass.
19. Mark missing critical evidence `UNKNOWN`; never silently convert uncertainty into a pass.
20. Record research date and exact evaluated versions.

# Workflow

## 1. Inspect repository context
For an existing repo, inspect as relevant:
- `pubspec.yaml`, `pubspec.lock`, Flutter/Dart versions.
- direct/transitive graph, constraints, overrides, overlapping dependencies.
- architecture/DI/state-management conventions and infrastructure boundaries.
- targeted platform folders, minimum OS/browser/toolchain versions, and CI/build targets.

Useful baseline commands:
```bash
flutter --version
dart --version
flutter doctor -v
flutter pub deps --json
flutter pub outdated
flutter analyze
flutter test
```
Use corresponding `dart pub` commands for pure Dart projects.

Do not introduce overlapping functionality until existing capabilities have been ruled out.

## 2. Define the requirement
Create a compact requirement record before discovery.

Capture:
- **Capability:** exact operation, inputs/outputs, errors, async/stream/cancellation, persistence/offline/background, concurrency/isolate, durability.
- **Platforms:** required Android/iOS/macOS/Windows/Linux/Web/Wasm targets and minimum OS/browser versions.
- **Repository compatibility:** Flutter/Dart plus relevant AGP/Gradle/Kotlin/Java, Swift/SwiftPM/CocoaPods, Visual Studio/CMake/system-library constraints.
- **Nonfunctional constraints:** startup/latency/frame time, memory, CPU, network, battery, binary size, call frequency/data volume.
- **Security/privacy:** sensitivity, telemetry restrictions, permissions, storage/network rules.
- **Ownership:** native/FFI/build-hook/codegen acceptance, bundled/downloaded binaries, fork tolerance, migration/replacement tolerance, license/commercial limits.

A mandatory requirement failure cannot be rescued by popularity or aggregate score.

## 3. Evaluate no-package and solution classes
Consider in this order:
1. existing project capability
2. Flutter/Dart native API
3. small maintainable local implementation
4. focused third-party dependency
5. larger framework/library
6. direct platform-native implementation

This is a preference order, not a rigid rule. Complex cryptography, payments, authentication, secure storage, databases, media codecs, background execution, hardware access, and difficult multi-platform integrations often justify mature dependencies.

Normalize scope before comparison. Never compare ordinary preferences, secure credential storage, and databases as equivalent “storage packages,” or unrelated caching layers as equivalent “cache packages.”

## 4. Discover broadly
Use multiple pub.dev capability terms, synonyms, implementation terms, and filters.

Useful operators include:
```text
"exact phrase"
package:prefix
dependency:package_name
dependency*:package_name
topic:storage
publisher:example.com
sdk:flutter
sdk:dart
runtime:web
runtime:native-aot
updated:1y
```
Search results are discovery signals, not production rankings.

Aim for roughly 2–5 serious candidates after broad discovery.

## 5. Build a candidate fact sheet
For each serious candidate record:
- exact stable version and release date
- package type: pure Dart, Flutter package, plugin, federated plugin, FFI, native SDK wrapper, generator, or dev tool
- publisher/verified status and repository ownership/provenance
- SDK/Flutter constraints
- declared platforms and actual required-platform implementations
- deprecation/discontinuation/archive/successor status
- repository/docs/issues/license links
- direct dependencies and last meaningful maintenance
- major caveat and confidence

Package type determines review depth.

## 6. Apply hard gates before scoring
Normally reject when a mandatory condition applies, including:
- deprecated package with supported successor
- archived/unmaintained package where required maintenance is unavailable
- missing mandatory target or required platform implementation
- incompatible Flutter/Dart/OS/toolchain constraints
- unresolved severe security, data-loss, or critical native-crash issue relevant to use
- mandatory telemetry/permissions violating policy
- incompatible license or unavailable native/system dependency
- required feature only in unacceptable prerelease form
- critical build conflict without safe resolution
- advertised platform support without required real feature parity

Treat single maintainer, low popularity, infrequent releases, many issues, sparse docs/tests, recent ownership transfer, large graph, personal publisher, no Favorite status, or older stable versions as soft risk signals—not automatic failures.

## 7. Deep-inspect shortlisted candidates
Inspect enough primary evidence to support the decision:
1. current pub.dev page and stable version
2. official docs linked from pub.dev
3. official repository
4. exact release tag/published package when code-level findings matter
5. CHANGELOG/release history
6. direct/transitive dependencies
7. platform implementations/native build files
8. relevant source code
9. license, tests, CI
10. high-impact issues and critical PRs
11. primary security advisories
12. telemetry/network/privacy behavior
13. lifecycle/resource APIs
14. migration requirements

When evidence conflicts:
1. identify source version/platform
2. prefer release-specific source and exact published artifact over repository `main`
3. prefer current CHANGELOG/build files over stale generic setup text
4. reproduce high-impact uncertainty when practical
5. record the discrepancy

Useful commands:
```bash
dart pub unpack package_name:1.2.3 --no-resolve
flutter pub deps --json
flutter pub outdated
```

## 8. Evaluate maintenance, API, lifecycle, and errors
### Maintenance
Judge meaningful work rather than release count: SDK/platform migrations, bug/security fixes, build updates, critical issue response, stale critical PRs, archive/deprecation status, ownership continuity, and CI health.

Classify cadence as healthy/stable, mature/low-change, rapid but justified, high-churn, dormant, or abandoned.

### API quality
Inspect typed/idiomatic Dart design, null safety, async/stream/cancellation semantics, error model, resource ownership, testability/DI, global mutable state, and package-specific types leaking into business/domain code.

### Lifecycle
Identify controllers, listeners, subscriptions, timers, isolates, threads, sockets, files, databases, native handles, observers, caches, and background services. Find and validate cleanup methods such as `dispose`, `close`, `cancel`, `shutdown`, `destroy`, or `stop`.

### Errors
Determine exception/error types, platform codes, timeout/retry/cancellation behavior, offline/permission-denied behavior, partial failures, corruption behavior, and fallback semantics. Penalize packages that silently discard important failures.

## 9. Verify each required platform
Never rely only on badges. Classify each target as official/full, official but limited, experimental, partial, community-maintained, or unsupported, and record feature parity.

Verify platform-specific requirements appropriate to the task:
- **Android:** min/compile SDK, AGP/Gradle/Kotlin/Java, Maven/native libs/ABIs, manifest components, permissions, services, R8/ProGuard, backup/Data Safety.
- **iOS/macOS:** deployment targets, Swift/ObjC, SwiftPM/CocoaPods, frameworks, entitlements, `Info.plist`, privacy manifests/Required Reason APIs, Keychain/background/sandbox behavior.
- **Windows:** Visual Studio/MSVC/Windows SDK, CMake, DLL/runtime redistribution, architectures.
- **Linux:** CMake/GTK/`pkg-config`, system libraries, package-manager prerequisites, runtime services.
- **Web:** browser support, JS interop/dependencies, Wasm, secure context, storage APIs, CSP/CORS, workers/permissions, external scripts.

Re-check current Flutter Apple and Web/Wasm guidance at research time; do not freeze historical toolchain assumptions.

For federated plugins, identify app-facing package, platform interface, endorsed/non-endorsed implementations, and verify maintenance/version compatibility/feature parity for every required implementation.

## 10. Review total dependency and build cost
Compare the full graph, not package source size. In an isolated branch/worktree when practical:
```bash
flutter pub deps --json > /tmp/deps-before.json
# add candidate
flutter pub deps --json > /tmp/deps-after.json
```
Review new transitives, native SDKs, federated implementations, generators/analyzer/build deps, duplicated capability, system dependencies, and unrelated upgrade pressure.

Use dry runs before accepting churn:
```bash
flutter pub add package_name:^1.2.3 --dry-run
flutter pub upgrade package_name --dry-run
flutter pub upgrade --major-versions --dry-run
```
Do not use `dependency_overrides` merely to silence the solver.

## 11. Review native/FFI risk when applicable
Inspect material native/build code for:
- UI/platform-thread blocking and high-frequency platform-channel serialization
- pointer/resource ownership, allocation/free symmetry, native handles, callbacks after disposal
- global state/thread assumptions and deprecated APIs
- ABI/architecture/signing/distribution requirements
- downloaded binary provenance/checksums
- underlying native licenses

Do not assume FFI is automatically faster; benchmark relevant workloads.

## 12. Review security, privacy, permissions, and network behavior
Raise scrutiny for auth, cryptography, secure storage, payments, networking, WebViews/JS bridges, file/archive handling, databases, background services, and vendor SDKs.

Investigate as relevant:
- credential/token/key handling and storage/backups
- TLS/certificate behavior
- sensitive logging
- dynamic/remote code/scripts
- endpoints, telemetry, analytics, identifiers, background traffic
- least-privilege permissions
- Android Data Safety implications
- Apple privacy manifest/Required Reason API implications
- package/native/vendor licenses

Do not infer security from popularity, publisher identity, stars, Favorite status, or package name. Do not invent custom cryptography to avoid a dependency.

## 13. Evaluate performance with evidence
Classify each performance claim:
1. independently benchmarked
2. maintainer benchmarked
3. implementation-supported but unbenchmarked
4. unsupported marketing claim

Inspect startup/initialization, CPU, memory/allocations, latency/throughput, disk/network I/O, caching/eviction, bridge overhead, isolates/threads, frame-time effects, and binary size as relevant.

Benchmark with equivalent device, OS, Flutter version, build mode, dataset, cache state, concurrency, and iterations. Prefer profile/release evidence; never use debug timing as production proof.

For binary-size-sensitive decisions, compare actual production artifacts with Flutter size-analysis tooling—not source-file size.

## 14. Score only after evidence collection
Use task-specific weights. A neutral starting point:

| Category | Weight |
|---|---:|
| Functional fit | 20 |
| Platform support | 12 |
| Maintenance | 10 |
| API quality | 8 |
| Performance | 8 |
| Security | 8 |
| Privacy | 5 |
| Dependency footprint | 6 |
| Native/build complexity | 5 |
| Documentation/tests | 5 |
| Release stability | 4 |
| Integration complexity | 3 |
| Repository compatibility | 4 |
| Replaceability | 2 |
| **Total** | **100** |

Rate applicable categories 0–5 or `UNKNOWN`:
```text
5 = strongly satisfies with good evidence
4 = satisfies with minor tradeoff
3 = acceptable with meaningful caveat
2 = material weakness
1 = major weakness
0 = fails
UNKNOWN = insufficient evidence
```

Optional calculation:
```text
weighted_score = Σ(category_weight × category_rating / 5)
```
Adjust weights to the task. Security/correctness dominate for auth/crypto; durability/migrations for databases; performance/memory for image/rendering; analyzer/build compatibility for generators. Numeric scores never override hard blockers.

Read `references/package_evaluation_matrix.md` for the detailed reusable matrix and calibration.

## 15. Make the decision explicitly
For multiple serious candidates, create a mandatory-requirement matrix before the recommendation:

| Requirement | Candidate | Evidence | Risk | Verdict |
|---|---|---|---|---|
| Required platform | A | current source/build | limitation | Pass/Fail |
| Flutter compatibility | A | constraint/dry run | upgrade | Pass/Conditional/Fail |
| Privacy rule | A | source/vendor docs | telemetry | Pass/Fail |
| Performance budget | A | benchmark | p95 over budget | Pass/Fail |

Do not force a winner if critical evidence is unknown.

# High-impact proof of concept
When project/tool access permits, validate high-impact finalists in a minimal isolated POC:
- dependency resolves and required production targets build
- happy and failure paths
- permissions/offline behavior
- lifecycle/disposal/reinitialization/background-foreground behavior
- multiple isolate/engine behavior when relevant
- coexistence with current dependencies
- performance-critical workload and binary-size delta when relevant

Keep the POC narrow; do not turn evaluation into unrelated refactoring.

# Version, lockfile, and override policy
Choose the newest appropriate stable version compatible with the repository.

For Flutter applications:
- use sensible semantic constraints
- commit `pubspec.lock`
- review lockfile changes
- avoid unrelated resolution churn
- use deterministic CI/deployment

Where supported and appropriate:
```bash
flutter pub get --enforce-lockfile
```

If an override is temporarily unavoidable, record exact package/version/source, reason, bypassed constraint, affected platforms, validation, upstream issue/PR, owner, and removal condition/expiry.

# Integration after selection
After choosing a dependency:
1. capture a clean baseline and use an isolated branch/worktree
2. add only the intended compatible stable version
3. inspect lockfile and dependency-graph diffs
4. perform current verified platform setup only
5. add an application-owned adapter only when replacement/architecture cost justifies it
6. initialize at the correct lifecycle point; prefer lazy initialization when correct
7. implement cleanup/resource ownership
8. translate package errors at boundaries when useful while retaining diagnostics
9. minimize permissions/privacy surface
10. add targeted unit/integration/platform tests
11. benchmark profile/release behavior when performance-sensitive
12. compare binary-size impact when material
13. build every required target and run analyzer/tests
14. document operational, upgrade, migration, and replacement constraints

Avoid spreading package-specific infrastructure types across business/domain logic when replacement cost would be high.

# Required final report
For every real package-selection task return, in this order:
```text
Research date
Repository context
Requirements
Native/no-package analysis
Discovery approach
Candidate shortlist
Evidence / mandatory-requirement matrix
Hard rejections
Weighted scorecard (when useful)
Best choice
- exact package/version
- why it wins
- confidence
Tradeoffs
Runner-up
- when it is preferable
Rejected candidates
- evidence-backed reason
No-package option
Platform integration notes
Security/privacy notes
Performance evidence/benchmark
Testing / validation results or plan
Upgrade/replacement strategy
Unresolved uncertainties
Sources
```
If repository access, target requirements, or live-source verification is missing, state exactly which conclusions are provisional.

# Production approval gate
Approve only when relevant evidence demonstrates:
- real capability fit and exact version
- acceptable current maintenance/provenance
- mandatory target/toolchain compatibility
- acceptable dependency/native/build footprint
- acceptable security/privacy/permission behavior
- recorded acceptable licensing state
- correct lifecycle/resource ownership and error handling
- required native/platform configuration
- relevant tests and production/profile builds pass
- performance/binary-size budgets pass where required
- migration/replacement implications are understood
- no hard blocker remains

Otherwise conclude:
> Not approved for production adoption.

# Anti-patterns
Reject these behaviors:
- first-result, likes/downloads/pub-points/stars/Favorite-driven selection
- trusting platform badges without implementation inspection
- trusting README performance/security adjectives
- treating a recent release as proof of maintenance
- treating verified publisher as security certification
- comparing mismatched solution classes
- ignoring transitives/native SDKs/licenses/permissions
- benchmarking candidates in different environments/modes
- calling a package lightweight from Dart API size alone
- choosing latest blindly or copying old tutorial setup
- default prereleases or permanent overrides
- adding a large framework for one helper
- leaking package-specific infrastructure types throughout the app
- replacing a working dependency without evidence of meaningful benefit
- ranking by issue count instead of severity/reproduction/fix health
- claiming cross-platform parity when required behavior differs

For the exhaustive final checklist, read `references/package_selection_checklist.md`.
