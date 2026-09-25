# Build Commands, Flavors, Symbols, Dependencies, Secrets & CI/CD

Source-preserving excerpt from the uploaded production release skill. Use when the core SKILL.md routes to this topic.

# Build Command Reference

## Inspect exact options

Always prefer:

```bash
flutter build <target> -h
```

before introducing an advanced flag.

---

## Android Play

```bash
flutter build appbundle --release
```

Artifact:

```text
build/app/outputs/bundle/release/app.aab
```

Use for Play distribution.

---

## Android direct APK

```bash
flutter build apk --release --split-per-abi
```

Use where an APK distribution channel requires it.

---

## iOS

```bash
flutter build ipa --release
```

Produces Xcode archive + IPA.

---

## macOS

```bash
flutter build macos --release
```

Then use Xcode/App Store or Developer ID/notarization workflow as appropriate.

---

## Windows

```powershell
flutter build windows --release
```

Produces the Windows release layout; package separately when MSIX/installer distribution is required.

---

## Linux

```bash
flutter build linux --release
```

Distribute/package the complete generated bundle.

---

## Web JavaScript path

```bash
flutter build web --release
```

Output:

```text
build/web
```



---

## Web WebAssembly

```bash
flutter build web --release --wasm
```

Use only after browser and package compatibility verification.

---

## Custom entry point

Use when the repository intentionally has multiple entry points:

```bash
flutter build appbundle \
  --release \
  --target lib/main_production.dart
```

Do not introduce multiple `main_*.dart` files merely because flavors exist.

---

## Flavor

Android example:

```bash
flutter build appbundle \
  --release \
  --flavor production
```

For Apple platforms, Flutter flavors map onto appropriately configured Xcode schemes/configurations.

---

## Compile-time definitions

```bash
flutter build appbundle \
  --release \
  --dart-define=API_BASE_URL=https://api.example.com
```

or:

```bash
flutter build appbundle \
  --release \
  --dart-define-from-file=config/production.json
```

Treat all supplied values as public client configuration.

Never provide a private backend secret here.

---

# Flavors and Environment Configuration

Use flavors for:

- dev/staging/production endpoints
- package/bundle IDs
- icons
- application names
- analytics project selection
- feature environments

Do not use flavors as cryptographic secrecy.

---

## Android flavors

Use Android product flavors intentionally.

Example release:

```bash
flutter build appbundle \
  --release \
  --flavor production
```

Flutter supports flavor-specific assets and exposes the active flavor through Flutter APIs.

Avoid duplicating large assets into every flavor unnecessarily.

---

## iOS/macOS flavors

Configure:

- Xcode schemes
- Debug/Profile/Release configurations
- bundle IDs
- xcconfig values
- signing
- flavor-specific assets

Do not create a `Release-production` configuration based on a Debug configuration.

Preserve the expected Debug/Profile/Release inheritance.

---

## Release environment validation

Add an automated assertion/test/build inspection that catches:

- development hostname
- staging project ID
- emulator API
- local proxy
- debug analytics project
- mock payment backend
- debug-only feature toggle

before production promotion.

---

# Obfuscation and Symbols

## Obfuscation

Supported native Flutter targets can use:

```bash
flutter build <target> \
  --release \
  --obfuscate \
  --split-debug-info=artifacts/symbols/<release-id>
```

Flutter Web does not use this Dart obfuscation mechanism; Web release builds are minified instead.

---

## What obfuscation does

It makes Dart symbol names less readable.

It does **not**:

- encrypt application assets
- hide API secrets
- make authorization trustworthy
- prevent reverse engineering
- stop runtime instrumentation

Flutter explicitly describes obfuscation as symbol renaming rather than encryption.

---

## Symbolication

For Flutter split-debug symbols:

```bash
flutter symbolize \
  -i stack_trace.txt \
  -d path/to/app.<architecture>.symbols
```

Keep the exact symbol file corresponding to the released binary.

---

## Symbol retention matrix

| Platform | Preserve |
|---|---|
| Android | Flutter split symbols, R8 mapping, native symbols as configured |
| iOS | `.xcarchive`, dSYMs, Flutter split symbols |
| macOS | archive, dSYMs, Flutter split symbols |
| Windows | PDBs for native code, Flutter split symbols |
| Linux | Flutter split symbols plus native symbols where build/tooling provides them |
| Web | matching source maps when generated/required |

Symbols may be uploaded privately to an approved crash-analysis service.

Private signing keys must never be bundled with symbols.

---

# Dependencies and Plugins

Before release run an explicit dependency review.

Inspect:

```bash
flutter pub outdated
```

Do not automatically execute a mass upgrade.

Review:

- direct dependency versions
- transitive dependencies
- abandoned packages
- native plugins
- min SDK/deployment target changes
- Windows/Linux binary dependencies
- SwiftPM/CocoaPods compatibility
- Web compatibility
- Wasm compatibility
- application size impact

---

## Lockfile

Application repositories should keep the tested dependency lockfile.

For production dependency retrieval, Dart documents:

```bash
dart pub get --enforce-lockfile
```

to fail rather than silently changing locked dependency versions/content hashes.

If the project's normal Flutter workflow wraps dependency retrieval differently, preserve that workflow while retaining lockfile integrity.

---

## Do not upgrade during release unless required

A package upgrade that changes:

- Android SDK
- AGP
- Kotlin
- Swift
- native APIs
- plugin permissions
- Web support

is a development migration, not a harmless release optimization.

Perform it separately unless it is the necessary fix for the release.

---

# Signing and Secrets

## Files that must remain private

Examples:

- Android upload/app signing private keys
- keystores
- `key.properties` with passwords
- Apple certificate private keys
- App Store Connect private keys
- provisioning credentials
- Developer ID private keys
- Windows signing certificates/private keys
- CI service-account credentials
- package registry credentials

Never print their contents.

Never "temporarily" commit them.

---

## Files that may be sent to approved diagnostic/store systems

Depending on platform:

- dSYMs
- R8 mapping
- native symbol archives
- PDBs
- source maps
- Flutter symbol maps

Treat symbol files as internal artifacts even if they do not contain signing secrets.

---

## Files that must ship

Examples:

- final AAB/APK package
- final IPA through Apple workflow
- signed/notarized macOS application/package
- Windows release dependencies or packaged MSIX
- complete Linux bundle inside its package
- complete Web deployment output

---

## Files that should never ship

- keystore passwords
- private signing keys
- CI access tokens
- backend secrets
- production database credentials
- source-control deploy keys
- internal administrative credentials

---

# CI/CD

Use a provider-neutral pipeline.

## Stage 1 — Environment

Record:

```bash
flutter --version
flutter doctor -v
```

Pin the Flutter SDK/revision rather than using an uncontrolled moving stable channel during a reproducible release.

Record native toolchain versions.

---

## Stage 2 — Dependency restore

Use tested lockfiles.

Fail if CI would silently resolve a different production dependency set.

Caches may accelerate this step but must be disposable.

---

## Stage 3 — Static quality

Run the repository's required:

```bash
flutter analyze
flutter test
```

plus formatting/lint policies established by the project.

---

## Stage 4 — Integration/platform validation

Run tests that cross:

- platform channels
- native plugins
- permissions
- storage
- authentication
- deep links
- critical business flow

A Dart-only unit test cannot validate native plugin implementation.

---

## Stage 5 — Release build

Use the exact production command and environment.

Do not let CI infer production/staging from branch naming without explicit validation.

---

## Stage 6 — Artifact validation

Validate:

- artifact exists
- architecture
- version
- package ID/bundle ID
- signing
- production configuration
- expected native dependencies
- no debug menu/backdoor
- size threshold

---

## Stage 7 — Symbol archival

Store:

```text
artifact
symbols
build metadata
commit SHA
toolchain versions
checksums
```

before upload.

---

## Stage 8 — Distribution

Use:

- Play internal testing
- TestFlight
- Store flighting/testing
- staging Web environment
- controlled desktop channel

before broad release.

Flutter's continuous-delivery documentation recommends proving local release builds before moving release automation into cloud CI.

---

# Safe Cleanup Rules

Do not start troubleshooting with:

```bash
flutter clean
```

mechanically.

`flutter clean` removes generated build state including build outputs and Dart tooling state.

First determine whether stale outputs are plausibly involved.

Use cleanup when:

- signing/build configuration changed and cached state is known to interfere
- documented migration requires it
- generated build state is corrupt/stale

Before cleaning, preserve:

- release artifacts
- size-analysis output
- generated symbols
- diagnostics needed for comparison

Never delete user signing material as part of cleanup.

---

# Pre-Release Validation

## Repository

- [ ] Release commit identified.
- [ ] Working tree understood.
- [ ] Flutter/Dart versions recorded.
- [ ] Native toolchains recorded.
- [ ] `pubspec.lock` reviewed.
- [ ] No accidental dependency churn.

## Configuration

- [ ] Production flavor/scheme selected.
- [ ] Production API endpoint selected.
- [ ] No localhost/dev API.
- [ ] No test credential.
- [ ] No backend secret embedded.
- [ ] Version/build number correct.

## Quality

- [ ] `flutter analyze` succeeds.
- [ ] Required tests succeed.
- [ ] Integration tests succeed.
- [ ] Critical native plugin workflows tested.

## Performance

- [ ] Profile/release baseline exists.
- [ ] Startup is acceptable.
- [ ] Critical animations/scrolling profiled.
- [ ] CPU hot paths reviewed.
- [ ] Memory growth reviewed.
- [ ] Network startup path reviewed.

## Size

- [ ] Release artifact size measured.
- [ ] Size regression compared with prior production release.
- [ ] Largest changed categories understood.
- [ ] Unused/oversized assets reviewed.

## Signing

- [ ] Correct production signing identity.
- [ ] Private keys remain outside repository.
- [ ] CI release access restricted.
- [ ] Certificate expiry/rotation understood.

## Symbols

- [ ] Flutter symbols archived if generated.
- [ ] Native symbols archived.
- [ ] Apple archives/dSYMs archived.
- [ ] Android mapping/native symbols archived.
- [ ] Windows PDBs archived where required.
- [ ] Web source maps archived if used.

## Platform

- [ ] Android AAB tested through Play internal track where relevant.
- [ ] Play target API policy rechecked.
- [ ] iOS archive validated.
- [ ] TestFlight build tested.
- [ ] macOS notarization validated for direct distribution.
- [ ] Windows package passes certification tooling where applicable.
- [ ] Linux package tested on intended distro baseline.
- [ ] Web deployment tested behind real hosting/CDN.

---

