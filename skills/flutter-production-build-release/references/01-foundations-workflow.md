# Foundations, Inspection, Decision Trees & Build Modes

Source-preserving excerpt from the uploaded production release skill. Use when the core SKILL.md routes to this topic.

# Flutter Production Build & Release

## Purpose

Use this skill when preparing, optimizing, packaging, exporting, validating, or releasing a production Flutter application across Android, iOS, macOS, Windows, Linux, or Web.

Operate as a release engineer, not as a code-cleanup bot.

The objective is to produce the correct artifact for the intended distribution channel, with:

- reproducible inputs
- correct platform configuration
- validated signing
- measured performance
- controlled application size
- retained crash symbols
- production-safe environment configuration
- tested native dependencies
- platform-specific packaging
- reliable rollback and diagnosis

Do not claim a build is production-ready merely because `flutter build` succeeds.

---

## Research and Version Basis

This guidance is based primarily on Flutter's current stable documentation, which states that it reflects **Flutter 3.44.7** unless otherwise noted. Current Flutter support includes Android API 24–37, iOS 13–26, Windows 10/11 on x64 and Arm64, macOS on x64 and Arm64, Linux on x64 and Arm64, and Web with browser-dependent JavaScript/WebAssembly support.

Treat every native toolchain rule as version-sensitive.

Before making release changes, record:

```bash
flutter --version
flutter doctor -v
```

Also identify:

- Dart version
- Android Gradle Plugin version
- Gradle version
- Java/JDK version
- Kotlin Gradle Plugin version
- Android SDK versions
- Xcode version
- selected Apple signing team
- Visual Studio version/workloads
- Linux distribution/toolchain
- browser support requirements
- current dependency lockfile

Do not blindly upgrade toolchains to whatever is newest during release preparation.

When an exact CLI option matters, verify it against the project's installed SDK:

```bash
flutter build <target> -h
```

Flutter's flags evolve. Prefer the help output from the pinned release SDK over tutorials written for another Flutter version.

---

## When to Use

Use this skill for:

- preparing an app for production
- generating Android AABs or APKs
- generating iOS archives/IPAs
- building macOS applications
- packaging Windows releases
- preparing Linux bundles/packages
- deploying Flutter Web
- reducing application size
- profiling startup, rendering, CPU, or memory
- configuring build flavors
- configuring production endpoints
- setting release versions
- configuring signing
- fixing release-only failures
- diagnosing R8 issues
- diagnosing Xcode archive/signing failures
- validating native plugins
- preserving crash symbols
- configuring CI/CD
- store submission preparation
- direct desktop distribution
- notarization
- release regression investigation

---

# Core Principles

## 1. Inspect before editing

Never start release work by changing configuration.

First determine:

```text
Repository
↓
Flutter/Dart version
↓
Target platform(s)
↓
Distribution channel
↓
Existing release configuration
↓
Signing model
↓
Dependencies/plugins
↓
Current measured baseline
↓
Required change
```

Preserve working project-specific configuration.

---

## 2. Measure before optimizing

Do not optimize based on intuition.

Use:

```text
Baseline
↓
Profile
↓
Identify bottleneck
↓
Make one targeted change
↓
Profile again
↓
Compare equivalent measurements
↓
Keep or revert
```

Flutter explicitly recommends profile builds for performance analysis; debug mode is not representative of production execution.

---

## 3. Use release artifacts for release decisions

Do not compare:

- debug APK size
- debug startup
- emulator animation timing
- simulator performance

against production requirements.

Debug mode prioritizes development speed, hot reload, assertions, and debugging.

Profile mode preserves enough instrumentation for meaningful profiling.

Release mode is optimized for deployment.

---

## 4. Preserve symbols

A successful release without matching symbols can create an undiagnosable production incident.

Archive symbol artifacts using the exact build/version/commit identity.

Never casually delete:

- Flutter `--split-debug-info` output
- Android R8 mapping data
- Android native symbols
- iOS/macOS dSYM files
- Xcode archives
- Windows PDB files
- Web source maps when the crash-monitoring strategy depends on them

---

## 5. Never embed production secrets

Treat anything compiled into a Flutter application as recoverable.

This includes values supplied through:

- Dart source
- `.env`
- `--dart-define`
- `--dart-define-from-file`
- Android resources
- iOS/macOS configuration
- Web JavaScript/configuration
- flavor configuration

Use compile-time variables for configuration, not server secrets.

---

## 6. Respect platform-native release formats

Prefer the platform's intended distribution mechanism.

Examples:

- Google Play → AAB
- App Store → archive/IPA workflow
- Microsoft Store → packaged Windows application, commonly MSIX
- direct macOS distribution → signed + notarized artifact
- Linux → Flutter bundle wrapped by an appropriate distribution package
- Web → complete `build/web` deployment with correct HTTP behavior

Do not assume one packaging model applies everywhere.

---

## 7. Release preparation is not permission for unrelated rewrites

Avoid:

- architecture rewrites
- mass state-management migrations
- speculative dependency upgrades
- regenerating all platform projects
- unrequested package replacements
- wholesale Gradle/Xcode modernization

Prefer the smallest change that produces a verified release improvement.

---

## 8. CI caches are disposable

Dependency/build caches improve speed.

They are not authoritative release inputs.

A release pipeline must be reproducible from a clean machine using pinned/versioned inputs.

---

# Repository Inspection Workflow

Before modifying a project, inspect at minimum:

```text
pubspec.yaml
pubspec.lock

lib/
assets/

android/
  app/build.gradle or build.gradle.kts
  settings.gradle / settings.gradle.kts
  gradle.properties
  AndroidManifest.xml
  flavor source sets
  signing references

ios/
  Runner.xcodeproj
  Runner.xcworkspace where present
  xcconfig files
  schemes
  Info.plist
  entitlements

macos/
  Runner.xcodeproj
  xcconfig
  entitlements

windows/
  runner/
  CMakeLists.txt

linux/
  runner/
  CMakeLists.txt

web/
  index.html
  manifest.json
  custom service worker if present

CI configuration
release scripts
store/upload automation
```

Then determine:

### Project identity

- application/package ID
- bundle IDs
- version
- build number
- product name

### Environment model

- dev
- staging
- production
- flavors/schemes
- API host selection
- feature flags

### Native dependencies

For each plugin determine:

- supported platforms
- native code
- minimum OS requirement
- Android SDK requirement
- Apple package-manager behavior
- Windows DLL/runtime needs
- Linux shared-library needs
- Web/Wasm compatibility

### Release configuration

Identify:

- Android release signing
- Apple signing/provisioning
- macOS entitlements
- Windows packaging/signing
- Linux package method
- Web hosting configuration

### Existing production diagnostics

Identify:

- crash reporting
- native symbols
- Dart split-debug symbols
- source maps
- release artifact retention

Do not overwrite any of these without understanding their role.

---

# Decision Tree

## Android

```text
Android
↓
Google Play?
├─ Yes
│  ↓
│  Validate app ID/version/signing
│  ↓
│  Recheck target API policy
│  ↓
│  Build AAB
│  ↓
│  Validate R8/release behavior
│  ↓
│  Test through Play internal testing
│  ↓
│  Preserve Dart/native/R8 symbols
│
└─ No
   ↓
   Does destination support AAB?
   ├─ Yes → consider AAB
   └─ No → build split APKs where operationally practical
```

---

## iOS

```text
iOS
↓
Validate bundle ID + signing + entitlements
↓
Validate deployment target/plugins
↓
Build IPA/archive
↓
Validate archive
↓
TestFlight
↓
Preserve Xcode archive + dSYMs + Dart symbols
↓
App Store submission
```

---

## macOS

```text
macOS
↓
Mac App Store or direct?
├─ App Store
│  ↓
│  sandbox/capabilities/signing
│  ↓
│  build + archive
│  ↓
│  validate + distribute through App Store
│
└─ Direct
   ↓
   Developer ID signing
   ↓
   Hardened Runtime
   ↓
   notarization
   ↓
   staple/verify
   ↓
   package/distribute
```

---

## Windows

```text
Windows
↓
Build Flutter release directory
↓
Store or direct?
├─ Microsoft Store
│  ↓
│  package, preferably MSIX for modern packaged flow
│  ↓
│  certification validation
│  ↓
│  submit
│
└─ Direct
   ↓
   release folder or installer/MSIX
   ↓
   sign package/installer appropriately
   ↓
   validate target machines and updates
```

A normal `flutter build windows` creates a release directory; it does **not** itself guarantee an MSIX package. Microsoft now documents `winapp` for Flutter/MSIX packaging, while Flutter's own Windows release guidance has also referenced downstream packaging tooling. Distinguish Flutter build output from Windows installer packaging.

---

## Linux

```text
Linux
↓
flutter build linux --release
↓
Validate complete bundle
↓
Inspect system library dependencies
↓
Choose distribution package/channel
↓
Test on target distro/version/architecture
↓
Publish
```

Flutter directly produces the Linux application bundle. Snap Store deployment is officially documented by Flutter; `.deb`, `.rpm`, Flatpak, AppImage, and similar formats require downstream packaging workflows rather than a universal `flutter build` format.

---

## Web

```text
Web
↓
Browser support requirements
↓
JS build or Wasm?
↓
Dependency compatibility
↓
Release build
↓
Serve build/web
↓
Validate routing/base href
↓
Validate cache/compression/security headers
↓
Profile browser startup/runtime
↓
Deploy + smoke test actual CDN/host
```

---

# Flutter Build Modes

## Debug

Use for development.

Characteristics include:

- hot reload
- assertions
- service extensions
- source-level debugging
- execution optimized for development cycle rather than runtime speed
- native Dart code generally using JIT compilation
- Flutter Web debug output not minified or tree-shaken

Do not use debug mode for:

- app size measurements
- startup benchmarks
- frame-time comparisons
- final memory comparisons
- release qualification

Flutter explicitly warns that debug-mode performance is not representative.

---

## Profile

Use for performance analysis.

On mobile/native platforms it behaves close to release while preserving tracing/service extensions.

Use:

```bash
flutter run --profile
```

Profile mobile performance on physical hardware, not an emulator/simulator.

For Flutter Web, use Chrome DevTools for performance profiling because Flutter DevTools does not attach to profile-mode Web applications in the same way as native applications.

---

## Release

Use for production deployment.

Release mode:

- disables assertions
- removes development service extensions
- applies compiler optimizations
- optimizes startup/execution/package footprint
- tree-shakes unreachable code

Native release/profile builds use Dart AOT compilation; debug native builds use JIT compilation.

Flutter Web release builds are minified and tree-shaken. Standard JavaScript builds use Flutter's web compiler path, while `--wasm` adds the WebAssembly build path.

---

