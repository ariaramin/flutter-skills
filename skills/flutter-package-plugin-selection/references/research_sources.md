# Flutter Package Selection Research Sources

**Research date:** 2026-08-09

The sources below establish the operational rules used by `skill.md`.

Primary Flutter/Dart/platform documentation is preferred. Package-specific sources are included as calibration evidence rather than as universal package recommendations.

---

## Flutter Package and Plugin Architecture

### S01 — Flutter Packages and Plugins Overview

**Title:** Using packages  
**URL:** https://docs.flutter.dev/packages-and-plugins  
**Establishes:** Official Flutter package/plugin ecosystem guidance and package consumption workflow.  
**Context:** Current Flutter documentation reviewed 2026-08-09.

### S02 — Developing Flutter Packages and Plugins

**Title:** Developing packages & plugins  
**URL:** https://docs.flutter.dev/packages-and-plugins/developing-packages  
**Establishes:** Dart packages vs Flutter plugins, federated plugins, endorsed/non-endorsed implementations, declared platform support, plugin lifecycle, native platform structure.  
**Context:** Flutter 3.44-era documentation; cross-platform plugin architecture.

### S03 — Flutter FFI Integration

**Title:** Bind to native code using FFI  
**URL:** https://docs.flutter.dev/platform-integration/bind-native-code  
**Establishes:** Current Flutter native-code/FFI package approach and build hooks.  
**Context:** Current Flutter guidance; native packages.

### S04 — Legacy FFI Plugin Guidance

**Title:** Legacy FFI plugin package  
**URL:** https://docs.flutter.dev/platform-integration/legacy-ffi-plugin  
**Establishes:** Situations where legacy plugin/FFI arrangements and native library loading remain relevant.  
**Context:** Native platform/FFI compatibility.

### S05 — Flutter Favorites

**Title:** Flutter Favorites  
**URL:** https://docs.flutter.dev/packages-and-plugins/favorites  
**Establishes:** Favorite designation is a positive ecosystem signal, not a guarantee that a package is correct for a specific project; evaluation includes license, usability, dependencies, performance/resource considerations, and publisher/source quality.  
**Context:** Reviewed 2026-08-09.  
Web verification:

---

## pub.dev Discovery and Quality Signals

### S06 — pub.dev Search

**Title:** Searching for packages  
**URL:** https://pub.dev/help/search  
**Establishes:** Current search syntax including exact phrase, `package:`, `dependency:`, `dependency*:`, `topic:`, `publisher:`, `sdk:`, `runtime:`, and `updated:` operators; search ranking is discovery-oriented.  
**Context:** pub.dev current behavior reviewed 2026-08-09.  
Web verification:

### S07 — pub.dev Scoring

**Title:** Package scoring on pub.dev  
**URL:** https://pub.dev/help/scoring  
**Establishes:** Meanings and limitations of likes, pub points, and download counts; pub points focus on package conventions, documentation/static analysis, platform/toolchain readiness, and dependency freshness rather than proving application-specific quality.  
**Context:** Current pub.dev scoring model reviewed 2026-08-09.  
Web verification:

### S08 — Verified Publishers

**Title:** Verified publishers  
**URL:** https://dart.dev/tools/pub/verified-publishers  
**Establishes:** Publisher verification establishes control of a domain/publisher identity; useful for provenance but not a package security certification.  
**Context:** Current Dart/pub infrastructure.  
Web verification:

### S09 — pub.dev Policy

**Title:** pub.dev policy  
**URL:** https://pub.dev/policy  
**Establishes:** Package publication/discontinuation behavior and limitations of rankings/recommendations as suitability guarantees.  
**Context:** Current pub.dev policy.

---

## Dart Dependency Resolution and Inspection

### S10 — `dart pub unpack`

**Title:** dart pub unpack  
**URL:** https://dart.dev/tools/pub/cmd/pub-unpack  
**Establishes:** Exact published package versions can be downloaded/extracted locally for source inspection.  
**Context:** Available in modern Dart SDKs.  
Web verification:

### S11 — `dart pub deps`

**Title:** dart pub deps  
**URL:** https://dart.dev/tools/pub/cmd/pub-deps  
**Establishes:** Dependency graph inspection, including JSON output suitable for direct/transitive dependency analysis.  
**Context:** Dart/Flutter dependency audit workflow.  
Web verification:

### S12 — `dart pub outdated`

**Title:** dart pub outdated  
**URL:** https://dart.dev/tools/pub/cmd/pub-outdated  
**Establishes:** Distinction between current, upgradable, resolvable, and latest package versions.  
**Context:** Important for avoiding “latest automatically wins.”  
Web verification:

### S13 — Pub Versioning

**Title:** Package versioning  
**URL:** https://dart.dev/tools/pub/versioning  
**Establishes:** Dependency version selection is constrained by the complete package graph.  
**Context:** Dependency conflict/version-selection decisions.  
Web verification:

### S14 — `pub get` / Lockfile Enforcement

**Title:** dart pub get  
**URL:** https://dart.dev/tools/pub/cmd/pub-get  
**Establishes:** Lockfile enforcement and content-hash validation through `--enforce-lockfile`.  
**Context:** Production/CI reproducibility.  
Web verification:

### S15 — Dependency Overrides

**Title:** Package dependencies  
**URL:** https://dart.dev/tools/pub/dependencies  
**Establishes:** How dependencies and overrides work and why overrides require caution.  
**Context:** Conflict resolution and temporary override policy.  
Web verification:

### S16 — Pubspec

**Title:** The pubspec file  
**URL:** https://dart.dev/tools/pub/pubspec  
**Establishes:** SDK/environment constraints and package metadata semantics.  
**Context:** Compatibility validation.

### S17 — Pub Workspaces

**Title:** Pub workspaces  
**URL:** https://dart.dev/tools/pub/workspaces  
**Establishes:** Shared dependency resolution/lockfile considerations in multi-package Dart/Flutter repositories.  
**Context:** Monorepos.

---

## Performance and Binary Size

### S18 — Flutter DevTools Performance

**Title:** Use the Performance view  
**URL:** https://docs.flutter.dev/tools/devtools/performance  
**Establishes:** Profile-oriented Flutter performance analysis; debug behavior should not be treated as production performance.  
**Context:** Benchmark methodology.  
Web verification:

### S19 — Flutter App Size Tool

**Title:** App size tool  
**URL:** https://docs.flutter.dev/tools/devtools/app-size  
**Establishes:** Analyzing Flutter binary-size composition and comparing builds.  
**Context:** Dependency binary-size evaluation.  
Web verification:

### S20 — Flutter App Size Guidance

**Title:** Measuring your app's size  
**URL:** https://docs.flutter.dev/perf/app-size  
**Establishes:** Debug build size is not representative and release/profile analysis should be used.  
**Context:** Production dependency footprint.  
Web verification:

### S21 — Platform Channels

**Title:** Writing custom platform-specific code  
**URL:** https://docs.flutter.dev/platform-integration/platform-channels  
**Establishes:** Platform-channel messaging, serialization, thread requirements, background task queues, and isolate considerations.  
**Context:** Plugin performance/native integration review.  
Web verification:

---

## Current Apple/Flutter Build Integration

### S22 — Swift Package Manager for Flutter Apps

**Title:** Swift Package Manager for app developers  
**URL:** https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-app-developers  
**Establishes:** Current Flutter SwiftPM/CocoaPods integration behavior for iOS/macOS projects.  
**Context:** Flutter 3.44-era Apple build ecosystem.  
Web verification:

### S23 — Swift Package Manager for Plugin Authors

**Title:** Swift Package Manager for plugin authors  
**URL:** https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-plugin-authors  
**Establishes:** Plugin-side SwiftPM support requirements and coexistence with CocoaPods.  
**Context:** Apple plugin compatibility.  
Web verification:

---

## Flutter Web / Wasm

### S24 — Flutter WebAssembly

**Title:** WebAssembly support  
**URL:** https://docs.flutter.dev/platform-integration/web/wasm  
**Establishes:** Wasm build compatibility requirements and dependency restrictions around legacy Web APIs.  
**Context:** Required when Web/Wasm is a target.  
Web verification:

### S25 — Flutter Web Renderers

**Title:** Web renderers  
**URL:** https://docs.flutter.dev/platform-integration/web/renderers  
**Establishes:** Flutter Web renderer/runtime considerations.  
**Context:** Web performance/compatibility evaluation.

---

## Android Security, Privacy, and Permissions

### S26 — Android SDK Best Practices

**Title:** SDK best practices  
**URL:** https://developer.android.com/guide/practices/sdk-best-practices  
**Establishes:** Applications remain responsible for understanding permissions and data collection introduced by SDKs.  
**Context:** Android third-party SDK review.  
Web verification:

### S27 — Android Permissions

**Title:** Permissions on Android  
**URL:** https://developer.android.com/guide/topics/permissions/overview  
**Establishes:** Least-privilege permission principles and permission behavior inherited from libraries.  
**Context:** Android plugin integration.  
Web verification:

### S28 — Android Data Safety

**Title:** Declare your app's data use  
**URL:** https://developer.android.com/privacy-and-security/declare-data-use  
**Establishes:** Third-party SDK data collection must be accounted for in application privacy/Data Safety declarations.  
**Context:** Android privacy review.

---

## Apple Privacy and Third-Party SDKs

### S29 — Apple Third-Party SDK Requirements

**Title:** Upcoming third-party SDK requirements / privacy requirements  
**URL:** https://developer.apple.com/support/third-party-SDK-requirements/  
**Establishes:** Application responsibility for included third-party SDK behavior, privacy manifests, and SDK-signing ecosystem requirements.  
**Context:** Apple distribution/privacy review.  
Web verification:

### S30 — Apple Privacy Manifests

**Title:** Privacy manifest files  
**URL:** https://developer.apple.com/documentation/bundleresources/privacy-manifest-files  
**Establishes:** `PrivacyInfo.xcprivacy` and declared privacy behavior.  
**Context:** iOS/macOS package/native SDK review.

### S31 — Required Reason APIs

**Title:** Describing use of required reason API  
**URL:** https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api  
**Establishes:** Apple Required Reason API declaration requirements and privacy constraints.  
**Context:** Apple native dependencies.

---

## Linux and Desktop

### S32 — Flutter Linux Setup

**Title:** Set up Linux development  
**URL:** https://docs.flutter.dev/platform-integration/linux/setup  
**Establishes:** Baseline Linux build tooling/system dependencies; plugins may introduce additional system requirements.  
**Context:** Linux plugin compatibility.  
Web verification:

### S33 — Flutter Desktop

**Title:** Desktop support for Flutter  
**URL:** https://docs.flutter.dev/platform-integration/desktop  
**Establishes:** Desktop build/platform support model.  
**Context:** Windows/macOS/Linux package evaluation.

---

## Code Generation

### S34 — build_runner

**Title:** Build with build_runner  
**URL:** https://dart.dev/tools/build_runner  
**Establishes:** Build/watch/test generation workflow and associated project build integration.  
**Context:** Generator-package evaluation.  
Web verification:

---

# Representative Package Calibration Sources

The following packages were inspected to exercise the evaluation method against a concrete but limited example: **simple, non-sensitive cross-platform key-value settings**.

This is not a universal package ranking.

---

## shared_preferences

### S35 — pub.dev Package Page

**Title:** shared_preferences  
**URL:** https://pub.dev/packages/shared_preferences  
**Establishes:** Current package version, publisher, platform support, API guidance, storage semantics, dependencies, and explicit warning that it should not be used for critical data.  
**Version context:** 2.5.5 as reviewed 2026-08-09.  
Web verification:

### S36 — CHANGELOG

**Title:** shared_preferences changelog  
**URL:** https://pub.dev/packages/shared_preferences/changelog  
**Establishes:** Recent maintenance history, introduction of newer async/cache APIs, SDK/support updates, and release significance.  
**Version context:** Through 2.5.5.  
Web verification:

### S37 — Repository

**Title:** flutter/packages — shared_preferences  
**URL:** https://github.com/flutter/packages/tree/main/packages/shared_preferences/shared_preferences  
**Establishes:** Official source, federated structure, tests, implementation relationship, repository ownership.  
**Context:** Main repository; exact release tag should be used for version-specific code conclusions.  
Web verification:

### S38 — Issue Tracker

**Title:** Flutter shared_preferences issues  
**URL:** https://github.com/flutter/flutter/issues?q=is%3Aissue+is%3Aopen+label%3A%22p%3A+shared_preferences%22  
**Establishes:** Current issue health and platform-specific reports.  
**Context:** Dynamic; inspect individual affected versions before drawing conclusions.  
Web verification:

### S39 — License

**Title:** shared_preferences license  
**URL:** https://pub.dev/packages/shared_preferences/license  
**Establishes:** BSD-3-Clause licensing.  
**Version context:** Package licensing reviewed with current package.

---

## flutter_secure_storage

### S40 — pub.dev Package Page

**Title:** flutter_secure_storage  
**URL:** https://pub.dev/packages/flutter_secure_storage  
**Establishes:** Current version, supported platforms, secure-storage scope, platform-specific setup, Web experimental/security notes, and native requirements.  
**Version context:** 11.0.0, published 2026-08-06, reviewed 2026-08-09.  
Web verification:

### S41 — CHANGELOG

**Title:** flutter_secure_storage changelog  
**URL:** https://pub.dev/packages/flutter_secure_storage/changelog  
**Establishes:** 11.0.0 breaking migration behavior, Android minimum/build changes, security-related legacy removal, and recent platform fixes.  
**Version context:** Through 11.0.0.  
Web verification:

### S42 — Repository

**Title:** flutter_secure_storage repository  
**URL:** https://github.com/juliansteenbakker/flutter_secure_storage/tree/develop/flutter_secure_storage  
**Establishes:** Source implementation, federated/native packages, tests, build code, and ownership.  
**Context:** Repository branch; version-specific review should use the matching release/tag.  
Web verification:

### S43 — Issue Tracker

**Title:** flutter_secure_storage issues  
**URL:** https://github.com/juliansteenbakker/flutter_secure_storage/issues  
**Establishes:** Current platform/build/security/regression reports.  
**Context:** Dynamic; inspect affected versions individually.  
Web verification:

### S44 — License

**Title:** flutter_secure_storage license  
**URL:** https://pub.dev/packages/flutter_secure_storage/license  
**Establishes:** Package license terms.  
**Context:** Review underlying native/system components separately where relevant.

---

## shared_prefs

### S45 — pub.dev Versions

**Title:** shared_prefs versions  
**URL:** https://pub.dev/packages/shared_prefs/versions  
**Establishes:** Very small release history and current publication age.  
**Version context:** 0.1.0 as reviewed 2026-08-09.  
Web verification:

### S46 — pub.dev Package Page

**Title:** shared_prefs  
**URL:** https://pub.dev/packages/shared_prefs  
**Establishes:** Scope as a wrapper around `shared_preferences`, including its seed-key convenience behavior and direct dependency relationship.  
**Version context:** 0.1.0.

### S47 — License

**Title:** shared_prefs license  
**URL:** https://pub.dev/packages/shared_prefs/license  
**Establishes:** Package license terms.  
**Version context:** 0.1.0.

---

# Additional Representative Ecosystem Sources

### S48 — path_provider

**URL:** https://pub.dev/packages/path_provider  
**Establishes:** Example of an actively maintained Flutter-team federated plugin.  
**Context:** Architecture calibration, not a storage-value candidate.

### S49 — url_launcher

**URL:** https://pub.dev/packages/url_launcher  
**Establishes:** Example of federated platform implementations and a package with release/retraction history worth checking.  
**Context:** Release-management calibration.

---

# Source-Use Rules

For future package research:

- re-open every current package page
- record exact version
- record checked date
- do not reuse version numbers from this file as “latest”
- inspect exact release source where code-level findings matter
- validate dynamic issue/PR status again
- re-check Flutter/Dart/platform documentation when toolchain behavior matters
- preserve conflicts between sources instead of smoothing them over
