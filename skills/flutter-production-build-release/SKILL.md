---
name: flutter-production-build-release
description: Prepare, optimize, package, sign, validate, troubleshoot, and release production Flutter applications across Android, iOS, macOS, Windows, Linux, and Web. Use this skill whenever Flutter work mentions production builds, AAB/APK, IPA/Xcode archives, TestFlight/App Store, macOS notarization, Windows/MSIX, Linux packaging, Web deployment/Wasm/CDN caching, release flavors, signing, symbols, app size, release-only failures, CI/CD, store submission, rollback, or “make this Flutter app production-ready”—even when the request is framed as build cleanup or performance optimization.
---

# Flutter Production Build & Release

Operate as a release engineer, not a cleanup bot. Produce the correct artifact for the intended channel with reproducible inputs, validated signing, controlled configuration, measured performance/size, retained diagnostics, and platform-specific distribution validation.

## Operating rules

1. Inspect the repository before changing release configuration.
2. Determine target platform **and distribution channel** before choosing commands.
3. Record the exact Flutter/Dart/native toolchain; native release rules are version-sensitive.
4. Verify advanced CLI flags against the pinned SDK with `flutter build <target> -h`.
5. Use debug for development, profile for performance investigation, and release for deployment.
6. Never use debug behavior or size as production evidence.
7. Measure before optimizing; preserve behavior and make the narrowest justified change.
8. Treat Flutter build output and platform packaging/distribution as separate layers.
9. Preserve existing working signing/flavor/native-package configuration unless a verified requirement forces change.
10. Do not upgrade Flutter, AGP, Gradle, JDK, Kotlin, Xcode, SwiftPM/CocoaPods mode, dependencies, or platform scaffolds merely as release cleanup.
11. Respect `pubspec.lock`; do not run uncontrolled dependency upgrades during release preparation.
12. Treat CI caches as disposable acceleration, never as authoritative release inputs.
13. Never embed backend secrets or signing private keys into Flutter source, Dart defines, assets, native resources, Web config, or repository history.
14. Keep release diagnostics before promotion: Flutter symbols, native symbols/mappings, Apple archives/dSYMs, PDBs, and source maps where used.
15. Validate the artifact users actually receive through the real channel when possible: Play internal testing, TestFlight, Windows certification/package install, notarized macOS package, target Linux distro/package, actual Web host/CDN.
16. Do not claim production readiness merely because `flutter build` exits successfully.

## Research baseline and freshness guard

The bundled research was validated on 2026-08-09 against Flutter 3.44.7 and Dart 3.12.x. Re-check current documentation when the repository or release date materially differs.

Version-sensitive items include:

- supported platform/OS ranges
- Google Play target API policy
- Flutter CLI flags
- AGP/Gradle/JDK/Kotlin compatibility
- Xcode/iOS/macOS requirements
- SwiftPM/CocoaPods transition behavior
- Windows/MSIX tooling
- Flutter Web JS/Wasm behavior
- service-worker behavior
- store signing/notarization requirements

Read `references/08-research-findings.md` before making current-policy or stale-advice claims. Use `references/09-research-sources.md` when source attribution or current verification is required.

## Current researched stale-advice corrections

Do not repeat these as timeless facts; they are current findings from the bundled research:

- Ordinary Google Play distribution favors AAB, not a fat APK.
- Current Flutter docs say `--[no-]shrink` has no effect; do not use `--no-shrink` as a modern R8 fix.
- Current Flutter Android support begins above the historical multidex pain point; do not add multidex preemptively.
- Apple bitcode submission advice is obsolete for modern Xcode/App Store workflows.
- Flutter 3.44 enables Swift Package Manager by default for Apple native dependencies while CocoaPods remains supported/fallback-capable.
- `altool` is obsolete for modern macOS notarization; use current Xcode/notary tooling.
- `flutter build windows` creates a Windows release layout, not automatically an MSIX/installer.
- `flutter build linux` creates a Linux application bundle, not every distro package format.
- Current Flutter Web uses normal JS and optional `--wasm`; old HTML-renderer recipes are stale.
- Flutter no longer generates/manages a service worker by default; custom offline caching is application-owned.
- Flutter Web `compute()` does not create native-style Dart isolate parallelism.
- Obfuscation is reverse-engineering friction, not secret protection.

# Reference routing

Load only what the task needs:

| Task | Reference |
|---|---|
| Core principles, repository inspection, distribution decision trees, build modes | `references/01-foundations-workflow.md` |
| Android AAB/APK, SDKs, Play policy, signing, R8, manifest, versioning | `references/02-android.md` |
| iOS/macOS IPA/archive, signing, SwiftPM/CocoaPods, dSYMs, notarization | `references/03-apple.md` |
| Windows, Linux, Flutter Web, MSIX, Linux bundles, Wasm, caching, headers | `references/04-desktop-web.md` |
| Profiling, rendering, CPU, startup, memory, networking, app-size workflow | `references/05-performance-size.md` |
| Build commands, flavors, config, obfuscation/symbols, dependencies, secrets, CI/CD, pre-release validation | `references/06-build-config-ci.md` |
| Anti-patterns, failure recovery, production definition of done, final agent rules | `references/07-validation-recovery.md` |
| Consolidated source-derived findings and stale-guidance resolutions | `references/08-research-findings.md` |
| Primary Flutter/Dart/platform source catalog | `references/09-research-sources.md` |

# Release workflow

## 1. Inspect the repository

At minimum inspect relevant files and tooling:

```text
pubspec.yaml
pubspec.lock
lib/
assets/
android/
ios/
macos/
windows/
linux/
web/
CI configuration
release scripts
store/upload automation
```

Record:

- source revision and working-tree state
- Flutter and Dart versions
- target platforms and architectures
- intended distribution channel per platform
- app/package/bundle IDs
- version and build number
- flavors/schemes/environment selection
- production endpoints and public configuration
- direct/transitive/native dependencies
- signing model and credential source
- diagnostic/symbol retention strategy
- existing store or deployment automation

Also run when available:

```bash
flutter --version
flutter doctor -v
flutter analyze
flutter test
```

Inspect native toolchain versions rather than guessing them.

## 2. Identify the distribution target

A platform name alone is insufficient.

Examples:

```text
Android → Google Play / another AAB channel / direct APK

iOS → TestFlight/App Store / ad hoc / enterprise / development export

macOS → Mac App Store / direct Developer ID distribution

Windows → Microsoft Store/MSIX / direct MSIX / installer / release folder

Linux → Snap / deb / rpm / Flatpak / AppImage / other downstream package

Web → static host/CDN, browser matrix, JS or Wasm, routing/cache/offline requirements
```

Do not copy one channel's signing/package assumptions into another.

## 3. Freeze release inputs

Before final build, know the tested inputs:

- source revision
- Flutter/Dart version
- native toolchains
- lockfiles
- production configuration
- signing credentials supplied externally

For application repositories keep the tested `pubspec.lock` and use lockfile-enforcing dependency retrieval when compatible with the project's workflow.

Do not let final release preparation silently resolve a different dependency graph.

## 4. Establish quality and production-like baselines

Run repository-required analysis/tests and platform integration tests before release packaging.

For performance or size work:

1. define the metric
2. capture baseline in profile/release-appropriate conditions
3. identify the bottleneck/category
4. make one targeted change
5. repeat the same measurement
6. keep only meaningful improvements

Never optimize a debug-only symptom without reproducing it appropriately.

## 5. Build the platform-native release artifact

Use the repository's pinned SDK and verify flags locally.

Common current commands from the research baseline:

```bash
# Android Play
flutter build appbundle --release

# Android APK channel
flutter build apk --release --split-per-abi

# iOS
flutter build ipa --release

# macOS
flutter build macos --release

# Windows
flutter build windows --release

# Linux
flutter build linux --release

# Web JavaScript
flutter build web --release

# Web Wasm when justified
flutter build web --release --wasm
```

Do not invent unsupported Flutter build targets such as `flutter build msix`, `flutter build appimage`, or `flutter build flatpak`.

## 6. Validate artifact identity and configuration

Verify the actual release artifact contains the intended:

- package/bundle/application ID
- version/build number
- architecture(s)
- signing identity
- production environment
- native dependencies
- permissions/entitlements/capabilities
- no debug menu/backdoor/test credentials
- no staging/local endpoints

Do not infer final Android manifest behavior from one source manifest; inspect merged/release output when plugins/flavors contribute entries.

## 7. Measure size correctly

Keep these distinct:

| Metric | Meaning |
|---|---|
| Build artifact | local APK/AAB/IPA/package bytes |
| Store upload | uploaded package size |
| User download | delivered bytes after store/device filtering/compression |
| Installed size | disk footprint after install |
| Runtime memory | RAM during execution |

Use `--analyze-size` only on targets supported by the pinned SDK. Confirm with CLI help rather than assuming parity across platforms.

Optimize by category, not intuition:

1. identify largest changed category
2. remove truly unused assets
3. optimize oversized images/fonts/localizations
4. review large dependencies/native libraries
5. use platform delivery splitting where appropriate
6. re-run size analysis

Do not replace packages solely because they look large without measuring real impact.

## 8. Preserve diagnostics before promotion

Archive release-specific material by immutable release identity.

Recommended manifest fields:

```text
platform
version
build number
commit SHA
Flutter/Dart versions
native toolchain versions
artifact path + checksum
signing identity metadata (not private keys)
Flutter split-debug symbols
R8 mapping/native symbols where applicable
Apple xcarchive + dSYMs
Windows PDBs where generated
Web source maps when used
```

Never delete the only matching diagnostics after a successful upload.

## 9. Validate through the real distribution layer

Examples:

- Android: upload AAB to Play internal testing and test Play-generated delivery.
- iOS: validate Xcode archive, upload to TestFlight, test the installed TestFlight build.
- macOS direct: verify Developer ID signing, Hardened Runtime, notarization, stapling/verification as applicable.
- Windows: validate the chosen package, installation/update/uninstall, and certification requirements.
- Linux: test packaged output on intended distro/architecture and validate linked runtime dependencies.
- Web: deploy to actual host/CDN and verify routing, MIME types, headers, caching, compression, CSP/CORS/auth integrations, and browser compatibility.

A local build success does not prove store/CDN-processed behavior.

## 10. Promote with rollback and diagnosis ready

Before broad release confirm:

- prior production artifact/version is identifiable
- release can be rolled back or superseded according to channel constraints
- crash symbolication path works
- build metadata is retained
- signing/key expiry and rotation are understood
- support/incident owners know the artifact identity

# Platform gates

## Android gate

Read `references/02-android.md` for full detail.

At minimum:

- choose AAB for ordinary Play distribution
- use split APKs where APK-only channels justify them
- re-check current Play target API policy at release time
- preserve existing compatible Flutter/AGP/Gradle/JDK/Kotlin stack unless migration is required
- protect upload/app signing credentials
- diagnose R8 problems with narrow rules, not blanket disabling
- inspect merged manifest and plugin/native ABI support
- validate through Play internal testing for Play releases

Do not hardcode a permanent `targetSdk` value into the skill; store policy changes with time.

## iOS gate

Read `references/03-apple.md`.

At minimum:

- validate bundle ID, Team, signing, provisioning, entitlements, deployment target
- build/archive through current Flutter/Xcode workflow
- test physical-device release and TestFlight where applicable
- retain exact `.xcarchive` and dSYMs
- inspect actual SwiftPM/CocoaPods integration instead of assuming one
- do not introduce obsolete bitcode advice

## macOS gate

Choose the distribution path first:

**Mac App Store:** App Store signing/sandbox/capabilities/archive validation.

**Direct:** Developer ID signing + Hardened Runtime + current notarization workflow.

Do not use deprecated `altool` automation for new notarization workflows.

## Windows gate

Read `references/04-desktop-web.md`.

Separate:

```text
flutter build windows
→ Flutter release directory
→ selected package/installer layer
→ signing/trust
→ Store/direct distribution
```

For MSIX, validate identity, architecture, capabilities, version, signing model, install/upgrade/uninstall, and certification tooling where relevant.

## Linux gate

Separate Flutter's generated bundle from downstream distro packaging.

Validate:

- complete bundle contents
- target architecture
- `ldd`/native shared-library requirements
- oldest intended distro/runtime baseline
- package install/upgrade/uninstall behavior

Do not present ecosystem packaging tools as Flutter CLI functionality.

## Web gate

Read `references/04-desktop-web.md`.

Determine:

- browser support matrix
- JS vs Wasm choice
- dependency/Wasm compatibility
- base path and SPA routing
- caching policy per file category
- compression
- source-map policy
- CSP and other hosting headers
- COOP/COEP requirements when using threaded Wasm rendering
- custom service-worker strategy only if the product needs offline/caching behavior

Do not assume `--wasm` is always faster or universally compatible.

# Environment and secrets

Use flavors/schemes/Dart defines for **public client configuration**, such as:

- environment selection
- API base URL
- public project IDs
- client-visible feature configuration

Do not use them to hide:

- backend API secrets
- database credentials
- payment-provider secret keys
- signing private keys
- CI service credentials

If the compiled application needs a value, assume the user can recover it.

Add automated release checks for accidental development configuration.

# Obfuscation and symbol handling

Use Flutter obfuscation only when reverse-engineering friction justifies it and the target supports it:

```bash
flutter build <target> \
  --release \
  --obfuscate \
  --split-debug-info=artifacts/symbols/<release-id>
```

It does not encrypt assets, create authorization, or protect server secrets.

Archive the exact matching symbol files before promotion and keep them private/controlled according to the diagnostic policy.

# Performance gate

Do not let release optimization become speculative refactoring.

Measure relevant dimensions independently:

- rendering/frame timing
- startup/first useful interaction
- CPU hotspots
- memory/retention/native-image pressure
- network request count/bytes/latency
- app size categories

Use representative hardware and production-like modes. For Web, use browser profiling appropriate to the deployed build.

Keep the fix only when the target metric improves without unacceptable regressions or unjustified complexity.

# Dependency and native-plugin gate

Before release-impacting dependency changes inspect:

- current direct/transitive versions
- repository/maintenance/advisory state when relevant
- Android SDK/AGP/Kotlin/JDK effects
- iOS/macOS deployment target and SwiftPM/CocoaPods effects
- native architectures/binaries
- Windows/Linux runtime libraries
- Web/Wasm compatibility
- permissions/entitlements
- application size/startup effects

Treat major upgrades as reviewed migrations rather than invisible release cleanup.

# CI/CD release stages

A provider-neutral release pipeline should perform:

1. **Environment** — pin/record Flutter and native toolchains.
2. **Dependency restore** — honor tested lockfiles; caches remain disposable.
3. **Static quality** — analyzer/tests/lints required by repository.
4. **Integration/platform validation** — critical native/plugin flows.
5. **Release build** — explicit production target/configuration.
6. **Artifact validation** — identity, version, architecture, signing, environment, size threshold.
7. **Symbol archival** — artifact, symbols, metadata, checksums before upload.
8. **Controlled distribution** — internal/testing channel before broad release.

Restrict signing/release credentials and never print them to logs.

# Failure recovery

When a release build fails:

1. capture the exact command and first root-cause failure
2. record `flutter --version` and `flutter doctor -v`
3. identify which layer failed: Dart/Flutter, dependency, native toolchain, signing, optimizer, package, host/CDN
4. inspect recent changes
5. preserve useful artifacts/logs
6. fix the identified layer
7. rebuild from known inputs
8. avoid changing multiple toolchains simultaneously

Use `flutter clean` only when stale/corrupt generated state is a plausible cause or documentation calls for it. Preserve diagnostics/symbols/artifacts first.

Platform-specific recovery is in `references/07-validation-recovery.md`.

# Release report format

For a real production-release task, return a concise evidence-backed report containing:

```text
Release date / research date
Source revision
Flutter/Dart/native toolchains
Target platform(s)
Distribution channel(s)
Production configuration
Dependency/lockfile status
Build command(s)
Artifact path(s) and checksums
Version/build identifiers
Signing validation
Architecture validation
Performance baseline/result
Size baseline/result
Symbols/diagnostics archived
Platform/store validation performed
Known risks / unresolved blockers
Rollback/re-release plan
Production readiness verdict
```

If validation could not be executed, state exactly what remains unverified. Do not convert an untested assumption into a pass.

# Production definition of done

Do not approve a production release until applicable conditions are demonstrated:

- exact source revision known
- Flutter/Dart/native toolchains recorded
- tested dependency lockfile respected
- correct production flavor/config selected
- no server-only secrets embedded
- analyzer/tests and required integration tests pass
- release artifact builds successfully
- package/bundle/application ID correct
- version/build number correct
- production signing verified
- required architectures/native dependencies present
- platform permissions/capabilities reviewed
- release size compared with baseline
- startup/critical performance checked in appropriate mode
- memory/network behavior acceptable where relevant
- no development endpoints/debug backdoors remain
- store/package/host validation performed
- matching diagnostic symbols archived
- artifact checksum/build metadata archived
- controlled pre-production distribution tested
- rollback/re-release path understood
- no unresolved release blocker remains

Never state “production-ready” solely because code looks optimized or a build command succeeded.
