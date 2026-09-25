# Anti-Patterns, Failure Recovery & Production Validation

Source-preserving excerpt from the uploaded production release skill. Use when the core SKILL.md routes to this topic.

# Common Anti-Patterns

## Benchmarking debug builds

**Bad**

```text
Debug app stutters → rewrite rendering architecture
```

**Better**

Reproduce in profile mode on representative hardware first.

---

## Running `flutter clean` after every failure

**Bad**

```text
build error
→ flutter clean
→ random upgrade
→ retry
```

**Better**

Read the first root-cause error, inspect toolchain/configuration changes, then clean only when stale generated state is plausible.

---

## Shipping dev configuration

**Bad**

```text
production app → api-staging.example.com
```

**Better**

Use explicit production environment selection plus automated validation.

---

## Using `--dart-define` for a server secret

**Bad**

```bash
flutter build appbundle \
  --dart-define=STRIPE_SECRET=...
```

**Better**

Keep privileged secrets on the backend. Use Dart defines only for recoverable client configuration.

---

## Deleting symbols after successful upload

**Bad**

```text
release uploaded
→ delete build outputs
→ no matching crash symbols
```

**Better**

Archive artifacts and symbols before release promotion.

---

## Enabling obfuscation and calling the app secure

**Bad**

```text
--obfuscate = secret protection
```

**Better**

Treat it as optional reverse-engineering friction and keep symbol maps.

---

## Shipping APK to Play by default

**Bad**

```bash
flutter build apk
```

for ordinary Play production.

**Better**

```bash
flutter build appbundle
```

for normal Play distribution.

---

## Recommending current Flutter `--no-shrink`

**Bad**

```bash
flutter build appbundle --no-shrink
```

as a production fix.

**Better**

Diagnose R8/keep-rule issues. Current Flutter documentation states the shrink flag has no effect and release code shrinking is always enabled.

---

## Blanket ProGuard keep rules

**Bad**

```proguard
-keep class ** { *; }
```

**Better**

Add narrow rules only for code requiring reflection/dynamic discovery.

---

## Upgrading AGP during release cleanup

**Bad**

```text
Release fails
→ migrate to newest AGP DSL
```

**Better**

Inspect existing Flutter/Gradle/AGP compatibility first. Treat major native-build upgrades as separate migrations.

---

## Legacy iOS bitcode configuration

**Bad**

```text
Enable bitcode for modern App Store submission
```

**Better**

Remove obsolete bitcode assumptions; Apple stopped accepting new bitcode submissions with Xcode 14+.

---

## Assuming CocoaPods is still Flutter's only/default Apple path

**Bad**

```text
Every iOS plugin requires CocoaPods
```

**Better**

Flutter 3.44 uses SwiftPM by default while retaining CocoaPods compatibility/fallback.

---

## Using `altool` for macOS notarization

**Bad**

```bash
xcrun altool --notarize-app ...
```

**Better**

Use Xcode notarization or `notarytool`.

---

## Assuming Flutter directly builds MSIX

**Bad**

```bash
flutter build msix
```

**Better**

Build Windows with Flutter, then use the selected Windows packaging workflow.

---

## Assuming Flutter directly emits every Linux package format

**Bad**

```text
flutter build appimage
flutter build flatpak
```

**Better**

Build the Flutter Linux bundle, then use the chosen downstream packaging system.

---

## Using obsolete Web renderer advice

**Bad**

Copying old renderer flags without checking the pinned SDK.

**Better**

Use the current Flutter Web build model and choose normal JS versus `--wasm` based on current browser/package requirements.

---

## Relying on Flutter-generated Web service worker

**Bad**

Assuming every current Flutter build produces a managed offline service worker.

**Better**

Flutter no longer generates/manages one by default; implement a custom service worker when required.

---

## Moving all CPU work to isolates

**Bad**

```text
isolates = faster
```

**Better**

Move only measured main-isolate CPU bottlenecks; account for spawn/message overhead. Flutter Web `compute()` still executes on the main thread.

---

## Comparing package size to RAM

**Bad**

```text
IPA is 70 MB → app uses 70 MB RAM
```

**Better**

Measure artifact/download/install/memory separately.

---

## Rebuilding platform projects wholesale

**Bad**

```bash
flutter create .
```

during routine release preparation.

**Better**

Use only when a documented migration or intentionally regenerated platform scaffold is required, and review all native project changes before committing.

---

# Failure Recovery

## General

When a release build fails:

1. Capture the exact command.
2. Preserve the complete first failing output.
3. Run `flutter --version`.
4. Run `flutter doctor -v`.
5. Inspect recent dependency/toolchain/configuration changes.
6. Reproduce locally if CI-only.
7. Use verbose diagnostics when needed.
8. Fix the identified layer.
9. Rebuild from known inputs.
10. Do not randomly upgrade several toolchains simultaneously.

---

## Android

Inspect in order:

```text
Flutter error
↓
Gradle task
↓
JDK/Gradle/AGP/Kotlin compatibility
↓
Android SDK configuration
↓
plugin/native dependency
↓
signing
↓
R8
```

For R8:

- capture missing-class/method details
- inspect plugin vendor rules
- use targeted keep rules
- regression-test the release build

For signing:

- verify keystore path
- alias
- credentials supplied by secret store
- signing configuration selected

Never recreate the production signing key because of a local path error.

---

## iOS

Inspect:

- Xcode build/archive log
- selected scheme
- release configuration
- Team
- bundle ID
- certificate
- provisioning profile
- entitlements
- plugin dependency integration
- deployment target

Open the Xcode workspace and diagnose native errors there when the Flutter CLI only surfaces an aggregate failure.

Do not delete provisioning/signing assets as the first troubleshooting step.

---

## macOS

For archive/signing/notarization failures:

- inspect nested signatures
- inspect entitlement mismatch
- verify Developer ID identity
- verify Hardened Runtime
- inspect notarization log
- verify package contents after signing
- re-notarize corrected artifact

Do not switch back to deprecated `altool`.

---

## Windows

Check:

- Visual Studio installation/workloads through `flutter doctor -v`
- target architecture
- native DLL availability
- plugin CMake/build failure
- package identity
- MSIX manifest
- signing/trust
- Windows App Certification Kit output

Do not assume a missing DLL is a Flutter-engine issue until dependency ownership is identified.

---

## Linux

Check:

- compiler/CMake/Ninja
- GTK development/runtime dependencies
- native plugin libraries
- architecture
- `ldd`
- distro compatibility
- packaging runtime dependencies

Reproduce on the same distro generation used by target users.

---

## Web

First distinguish:

### Compile failure

Likely:

- Dart error
- package incompatibility
- Wasm incompatibility
- unsupported JS interop

### Hosting failure

Likely:

- incorrect base href
- missing SPA rewrite
- stale CDN cache
- wrong MIME type
- CSP
- CORS
- missing COEP/COOP
- custom service-worker caching
- missing build file

Inspect browser Console + Network before modifying Dart code.

---

# Production Definition of Done

A Flutter release is production-ready only when:

- [ ] Exact source revision is known.
- [ ] Flutter/Dart versions are recorded.
- [ ] Native toolchains are reproducible.
- [ ] Dependency lockfile is respected.
- [ ] Correct production flavor/configuration is selected.
- [ ] No server-only secrets are embedded.
- [ ] Static analysis passes.
- [ ] Required tests pass.
- [ ] Critical native integrations are tested.
- [ ] Production release artifact builds successfully.
- [ ] Correct package/bundle/application ID is present.
- [ ] Correct version/build number is present.
- [ ] Release signing is verified.
- [ ] Required architectures are present.
- [ ] Unsupported/unneeded architectures are not shipped unnecessarily where packaging supports filtering.
- [ ] Release size is measured against baseline.
- [ ] Startup and critical interaction performance are measured using profile/release-appropriate tooling.
- [ ] Memory behavior is acceptable.
- [ ] Production network configuration is verified.
- [ ] No development endpoints or debug backdoors remain.
- [ ] Platform permissions/capabilities are reviewed.
- [ ] Store/package validation succeeds.
- [ ] Matching Dart/native symbol artifacts are archived.
- [ ] Crash diagnostics can symbolicate the release.
- [ ] Artifact checksum/build metadata is archived.
- [ ] Controlled pre-production distribution is tested.
- [ ] Rollback/re-release path is understood.
- [ ] No claim of success is made without verification when tools are available.

---

# Final Agent Rules

When acting on a real repository:

1. Inspect before editing.
2. Determine target platform and distribution channel.
3. Record the exact Flutter/Dart/native toolchain.
4. Preserve existing release/signing configuration.
5. Use current official commands.
6. Verify version-sensitive flags with local CLI help.
7. Measure performance before optimization.
8. Never benchmark production decisions in debug mode.
9. Prefer targeted changes over rewrites.
10. Never embed server secrets.
11. Never expose signing keys.
12. Never delete symbols.
13. Do not upgrade dependencies blindly.
14. Do not migrate AGP/Xcode/package managers merely as cleanup.
15. Use AAB for ordinary Google Play releases.
16. Preserve Xcode archives/dSYMs for Apple releases.
17. Notarize direct Developer ID macOS releases.
18. Distinguish Windows Flutter output from Windows installer packaging.
19. Distinguish Linux Flutter bundles from downstream distro packaging.
20. Use current Flutter Web JS/Wasm guidance, not legacy renderer/service-worker advice.
21. Validate the actual distributed artifact, not merely the source tree.
22. Re-profile after every performance optimization.
23. Re-run platform tests after native/plugin changes.
24. Preserve build provenance and diagnostic artifacts.
25. Never claim production readiness until the Definition of Done is satisfied.