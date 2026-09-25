# Flutter Package Research Findings

**Research date:** 2026-08-09

## Executive Finding

Production dependency selection in Flutter cannot be reduced to pub.dev popularity.

The strongest operational pattern is:

```text
repository context
→ precise requirement
→ native/no-package check
→ broad discovery
→ scope normalization
→ shortlist
→ release/repository/platform inspection
→ dependency/native/security/performance review
→ proof/benchmark where needed
→ weighted decision
→ integration validation
```

The methodology must allow:

> No suitable third-party package exists.

---

# 1. pub.dev Metrics Are Secondary Evidence

Current pub.dev scoring documentation exposes:

- likes
- pub points
- download counts

but these do not collectively prove:

- runtime correctness
- architectural suitability
- security
- privacy
- performance superiority

Download counts are themselves not direct user counts.

Pub points emphasize packaging conventions, documentation/static analysis, platform/toolchain readiness, and dependency health. [S07]

**Implication:** An AI agent must never say:

```text
Package X is best because it has the most likes.
```

without package-specific engineering evidence.

---

# 2. pub.dev Search Is More Powerful Than Basic Keyword Search

Current pub.dev search supports operators including:

```text
package:
dependency:
dependency*:
topic:
publisher:
sdk:
runtime:
updated:
```

as well as exact phrases. [S06]

**Implication:** Candidate discovery should deliberately use synonyms, solution classes, runtime/platform filters, and dependency relationships rather than stopping at the first query.

---

# 3. Verified Publisher Is Provenance, Not Certification

A verified publisher demonstrates identity/domain control.

It does not establish:

- secure implementation
- good API
- good performance
- project suitability

[S08]

**Implication:** Treat verified publisher status as a positive provenance signal only.

---

# 4. Flutter Favorite Is Not an Automatic Winner

Flutter's own Favorite guidance makes project-specific evaluation necessary even for designated packages. [S05]

**Implication:** Favorite status can increase shortlist confidence but cannot bypass dependency, platform, security, or performance review.

---

# 5. Federated Plugins Require Platform-by-Platform Inspection

Flutter's federated-plugin architecture separates:

- app-facing package
- platform interface
- platform implementations

and platform implementations can be endorsed or non-endorsed. [S02]

**Risk:** An app-facing package can look active while a required implementation package is stale or functionally incomplete.

**Implication:** Maintenance/platform evaluation must reach the implementation-package level.

---

# 6. Platform Support Is Not Binary

“Android + iOS + Web + Desktop” is insufficient evidence.

Real questions include:

- same feature set?
- same data semantics?
- same performance?
- same security?
- same cleanup behavior?
- same minimum OS/toolchain?
- community or endorsed implementation?
- Wasm-compatible Web implementation?

**Implication:** Maintain a functional-parity matrix.

---

# 7. Flutter Web Requires Separate Wasm Compatibility Review

Current Flutter Web/Wasm guidance requires dependencies to use compatible Web APIs. Legacy Web interop can prevent Wasm builds. [S24]

**Implication:** “Web supported” and “Web/Wasm supported” are different requirements.

Browser support must also be verified against the project's actual targets.

---

# 8. Apple Plugin Build Integration Is Changing

Current Flutter 3.44-era guidance enables Swift Package Manager support by default for Flutter iOS/macOS projects while retaining compatibility/fallback considerations for plugins that do not yet support it. [S22][S23]

**Implication:** Apple package evaluation now needs explicit SwiftPM review in addition to legacy CocoaPods assumptions.

Do not freeze today's build-system behavior into a permanent rule; re-check current Flutter documentation on future research dates.

---

# 9. Package Version Resolution Is a Graph Problem

Dart's solver works over the dependency graph, and `pub outdated` distinguishes:

- current
- upgradable
- resolvable
- latest

[S12][S13]

**Implication:** “Package X latest is 4.0.0” does not imply 4.0.0 is the correct version for the repository.

---

# 10. Exact Package Source Can Be Inspected Reproducibly

Modern Dart provides `pub unpack` for downloading an exact published package version. [S10]

**Implication:** When README/repository-main/release information conflicts, inspect the exact release artifact instead of guessing.

---

# 11. Lockfile Integrity Can Be Enforced

Dart supports:

```bash
pub get --enforce-lockfile
```

to enforce resolved lockfile/content expectations. [S14]

**Implication:** Flutter applications should treat `pubspec.lock` as production dependency state, review its diffs, and keep dependency updates deliberate.

---

# 12. Dependency Overrides Should Be Temporary Exceptions

Official Dart dependency guidance makes clear that overrides can bypass dependency constraints and potentially break the application. [S15]

**Implication:** Any production override should have:

- reason
- owner
- upstream tracking
- test coverage
- removal condition

---

# 13. Native Code Changes the Risk Model

Pure-Dart source size is not an adequate measure for a plugin or FFI package.

Native dependencies can introduce:

- ABI restrictions
- threading assumptions
- app permissions
- additional SDKs
- binary size
- startup work
- system packages
- signing/distribution requirements

Platform channels also add serialization/thread-boundary considerations. [S21]

**Implication:** Plugin/FFI/native-SDK packages need a separate native-risk section.

---

# 14. Performance Must Be Measured in Production-Representative Modes

Flutter's tooling explicitly distinguishes debug tooling from profile/release performance analysis. [S18]

**Implication:** Dependency benchmarks must compare equivalent:

- device
- OS
- Flutter version
- build mode
- data
- cache state
- iteration count

README claims should be classified rather than repeated.

---

# 15. Binary Size Must Include Native and Transitive Cost

Flutter size-analysis tools can attribute Dart/native/assets components and compare builds. [S19][S20]

**Implication:** A three-method Dart API can still be a large dependency if it pulls:

- native SDKs
- multiple architectures
- fonts/assets
- codegen
- platform implementations

---

# 16. Privacy Review Must Include Underlying SDK Behavior

Both Apple and Android place responsibility on the application for privacy/data behavior of included third-party SDKs. [S26][S29]

**Implication:** Package review must investigate:

- telemetry
- endpoints
- identifiers
- permissions
- storage
- platform privacy declarations

not merely Dart-level API calls.

---

# 17. Security-Sensitive Categories Need Higher Acceptance Thresholds

Packages involving:

- credentials
- auth
- payments
- cryptography
- secure storage

should not be evaluated with the same weights as a color utility.

**Implication:** Security/correctness/provenance dominate convenience.

Custom cryptography should not be invented to avoid a dependency.

---

# 18. Maintenance Must Be Judged by Meaningful Changes

A recent version number is insufficient.

Example:

A release containing only:

```text
documentation fixes
metadata
formatting
```

does not provide the same evidence as:

```text
new SDK compatibility
native API migration
security fix
crash fix
platform implementation repair
```

**Implication:** Inspect CHANGELOG content and repository work.

---

# 19. Representative `shared_preferences` Finding

Current `shared_preferences` version reviewed: **2.5.5**.

Its documentation:

- positions it as simple preferences storage
- supports the six primary Flutter targets
- explicitly says it should not be used for critical data
- presents newer async/cache-oriented APIs
- describes cache coherence caveats with multiple isolates/engines/external writes

[S35][S36]

**Implication:** Package selection must consider API mode and data durability semantics, not merely package name.

---

# 20. Representative `flutter_secure_storage` Finding

Current version reviewed: **11.0.0**, published 2026-08-06. [S40][S41]

The 11.0.0 CHANGELOG contains meaningful breaking/platform/security-related changes, including Android build/minimum changes and migration implications for data created using deprecated legacy cryptographic paths. [S41]

A version-specific Android-requirement discrepancy can be observed between current release information and some generic README setup text.

**Implication:** CHANGELOG + exact release code/build configuration can supersede stale README wording.

This is precisely why “read the README” is not a sufficient dependency-review process.

---

# 21. Similar Package Names Can Hide Scope Mismatch

`shared_preferences` and `flutter_secure_storage` can both store key/value-style data, but they solve different security requirements.

Comparing them on popularity alone would produce a category error.

**Implication:** Normalize solution class before scoring.

---

# 22. Thin Wrappers Need to Earn Their Dependency Cost

The reviewed `shared_prefs` 0.1.0 package adds a convenience layer while depending on `shared_preferences`; its release history is very small. [S45]

That does not make the package inherently unsafe.

But if the project does not need its unique seed-key abstraction, the extra package adds:

- dependency surface
- API indirection
- another maintenance point

without solving a new requirement.

**Implication:** Focused wrappers should be adopted only when their added abstraction has concrete value.

---

# 23. No Trustworthy Universal Performance Ranking Was Found for the Calibration Packages

The representative package exercise did not uncover primary-source evidence sufficient to claim:

```text
Package A is universally faster than package B.
```

**Implication:** The matrix deliberately labels architectural implications separately from measured performance.

For performance-sensitive storage, benchmark actual operations using production-equivalent builds.

---

# 24. The “Smallest Package” Is Not Necessarily the Smallest Solution

A project-owned six-platform native implementation may have zero pub.dev dependencies while costing far more:

- code
- testing
- maintenance
- native expertise
- release risk

**Implication:** Minimize total ownership surface, not just dependency count.

---

# 25. Existing Repository Context Can Reverse a Recommendation

A package that is generally strong may be a bad choice if it requires:

- Flutter upgrade
- Dart upgrade
- Android `minSdk` increase
- AGP/Kotlin upgrade
- iOS target increase
- migration of existing data
- another conflicting framework
- unsupported Web target

**Implication:** Package research performed without `pubspec.yaml` and platform config is incomplete for an existing application.

---

# Rejected Research Behaviors

The following approaches were explicitly rejected:

- ranking by likes
- ranking by pub points
- ranking by downloads
- ranking by GitHub stars
- choosing first search result
- trusting badges without implementation inspection
- trusting README performance statements
- assuming current release means healthy maintenance
- assuming verified publisher means secure
- assuming Flutter Favorite means best
- forcing one package to win
- recommending a generic package without project context

---

# Unresolved Uncertainties

Because this research produces a reusable skill rather than selecting a dependency for one repository, the following are intentionally unresolved until task runtime:

- actual Flutter SDK
- actual Dart SDK
- target platforms
- actual minimum OS versions
- actual existing dependency graph
- performance budget
- application privacy classification
- licensing policy
- native/FFI acceptance
- binary-size constraints
- Web browser/Wasm requirements
- existing dependency conflicts

These must be populated before a real package recommendation.

---

# Final Research Finding

A reliable AI dependency agent should behave more like a dependency architect than a package search engine.

Its decision function should resemble:

```text
best_dependency =
    satisfies_mandatory_requirements
    AND compatible_with_repository
    AND acceptable_security_privacy
    AND acceptable_platform_behavior
    AND acceptable_maintenance_risk
    AND acceptable_total_ownership_cost
```

Popularity is useful for discovery and ecosystem context.

It is not the decision.
