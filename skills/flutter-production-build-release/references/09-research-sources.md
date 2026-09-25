# Research Sources — Reference Navigation

This file preserves the uploaded primary-source catalog verbatim below. Use it when verifying current Flutter/Dart/platform behavior or citing the basis for a release rule.

# Flutter Production Build & Release — Research Sources

**Research date:** 2026-08-09  
**Primary Flutter documentation context:** Flutter 3.44.7  
**Primary Dart documentation context:** Dart 3.12.x

Sources are grouped by the engineering decision they establish. Official Flutter/Dart and platform-owner documentation is preferred throughout.

---

# 1. Flutter Version and Supported Platforms

## Flutter Deployment

URL:

`https://docs.flutter.dev/deployment`

Establishes:

- current Flutter deployment documentation hub
- Android, iOS, macOS, Windows, Linux, Web release guides
- documentation version context

The page states that current site documentation reflects Flutter 3.44.7 unless otherwise noted.

## Supported Deployment Platforms

URL:

`https://docs.flutter.dev/reference/supported-platforms`

Establishes the current supported/tested ranges and architectures for:

- Android
- iOS
- Windows
- macOS
- Linux
- Web browsers/Wasm

As of Flutter 3.44.7, Android support begins at API 24, iOS at version 13, and desktop support includes x64/Arm64 according to each platform's matrix.

---

# 2. Flutter Build Modes

## Flutter's Build Modes

URL:

`https://docs.flutter.dev/testing/build-modes`

Establishes:

- debug purpose
- profile purpose
- release purpose
- why debug performance isn't representative
- Web compilation differences
- requirement to use real mobile hardware for representative profile analysis



---

# 3. Flutter CLI

## Flutter CLI Reference

URL:

`https://docs.flutter.dev/reference/flutter-cli`

Establishes:

- top-level Flutter commands
- `flutter build`
- `flutter analyze`
- `flutter test`
- `flutter doctor`
- command discovery

Operational rule derived from the CLI and obfuscation documentation:

```bash
flutter build <target> -h
```

should be treated as authoritative for flags supported by the repository's pinned SDK.

---

# 4. Application Size

## Measuring Your App's Size

URL:

`https://docs.flutter.dev/perf/app-size`

Establishes:

- debug build sizes are not representative
- upload size differs from user download size
- supported `--analyze-size` commands
- DevTools analysis JSON
- `--split-debug-info`
- removal/optimization of assets



## DevTools App Size Tool

URL:

`https://docs.flutter.dev/tools/devtools/app-size`

Establishes:

- Dart AOT tree shaking in profile/release
- code/native/assets/fonts size analysis
- snapshot diffing



---

# 5. Flutter Performance

## Performance Best Practices

URL:

`https://docs.flutter.dev/perf/best-practices`

Establishes guidance around:

- build cost
- lazy list/grid construction
- layout/intrinsic passes
- `saveLayer`
- opacity
- clipping
- animation rebuilds



## Improving Rendering Performance

URL:

`https://docs.flutter.dev/perf/rendering-performance`

Establishes the requirement to evaluate rendering in profile mode rather than debug mode.

## DevTools Performance View

URL:

`https://docs.flutter.dev/tools/devtools/performance`

Establishes:

- frame chart
- UI/raster timing
- jank
- shader-related events
- widget/layout/paint tracing
- native Flutter profiling

It also states that Web profiling uses Chrome DevTools rather than the native Flutter DevTools Performance view.

## DevTools Overview

URL:

`https://docs.flutter.dev/tools/devtools`

Establishes tooling for:

- UI inspection
- CPU
- performance
- memory
- network
- app size



---

# 6. Dart/Flutter Concurrency

## Concurrency and Isolates

URL:

`https://docs.flutter.dev/perf/isolates`

Establishes:

- main isolate behavior
- use of helper isolates for large blocking computations
- `Isolate.run`
- long-lived isolate tradeoffs
- message-transfer overhead
- Flutter Web lack of Dart isolate support
- `compute()` executing on the main thread on Web



---

# 7. Memory

## DevTools Memory View

URL:

`https://docs.flutter.dev/tools/devtools/memory`

Establishes:

- Dart heap concepts
- leaks vs bloat
- allocation profiling
- memory snapshots
- retained objects
- instance tracing



---

# 8. Web Performance

## Debug Performance for Web Apps

URL:

`https://docs.flutter.dev/perf/web-performance`

Establishes:

- Chrome DevTools profiling for Flutter Web
- profile-mode Web performance analysis
- Flutter timeline events in browser performance tooling



---

# 9. Android Flutter Release

## Build and Release an Android App

URL:

`https://docs.flutter.dev/deployment/android`

Establishes:

- Android signing
- Flutter-managed SDK defaults
- application IDs
- release versioning
- AAB production build
- split APK build
- supported Android Flutter ABIs
- R8 behavior
- manifest review
- internal Play testing guidance

Important current details:

```bash
flutter build appbundle
flutter build apk --split-per-abi
```

and the documentation explicitly notes that the shrink flag currently has no effect because release code shrinking is always enabled.

---

# 10. Google Play Target API

## Meet Google Play's Target API Level Requirement

URL:

`https://developer.android.com/google/play/requirements/target-sdk`

Establishes Google's time-sensitive submission policy.

As researched on 2026-08-09, the next transition is on 2026-08-31, when ordinary new applications and updates must target API 36 or later. Platform-category exceptions are documented separately on the same page.

This source must be rechecked for every future Play release.

---

# 11. Android R8 / App Optimization

## Enable App Optimization With R8

URL:

`https://developer.android.com/topic/performance/app-optimization/enable-app-optimization`

Establishes:

- Android's production optimization recommendations
- AGP-version-specific configuration
- AGP 9.3+ optimization DSL



## Customize Which Resources to Keep

URL:

`https://developer.android.com/topic/performance/app-optimization/customize-which-resources-to-keep`

Establishes:

- resource shrinking behavior
- AGP 9.3+ versus earlier DSL differences
- need to configure according to actual AGP version



---

# 12. iOS Flutter Release

## Build and Release an iOS App

URL:

`https://docs.flutter.dev/deployment/ios`

Establishes:

- iOS minimum support
- version/build numbering
- `flutter build ipa`
- generated `.xcarchive`
- generated `.ipa`
- export methods
- `ExportOptions.plist`
- Xcode validation/distribution
- TestFlight/App Store workflow



---

# 13. Apple Archive and Distribution

## Distributing Your App for Beta Testing and Releases

URL:

`https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases`

Establishes:

- Xcode archives
- validation before distribution
- App Store/TestFlight distribution workflow
- archive semantics



---

# 14. Apple Crash Symbols

## Building Your App to Include Debugging Information

URL:

`https://developer.apple.com/documentation/xcode/building-your-app-to-include-debugging-information`

Establishes:

- dSYMs
- matching build UUID requirement
- requirement to retain exact matching symbols
- recommendation to retain Xcode archives for distributed builds



## App Store Connect — View Builds and Metadata

URL:

`https://developer.apple.com/help/app-store-connect/manage-builds/view-builds-and-metadata/`

Establishes:

- symbol metadata
- historical bitcode/dSYM behavior
- Apple no longer accepting new bitcode submissions from Xcode 14+



---

# 15. Xcode Bitcode Status

## Xcode 14 Release Notes

URL:

`https://developer.apple.com/documentation/Xcode-Release-Notes/xcode-14-release-notes`

Establishes that bitcode became deprecated and is no longer part of the modern application-submission model.

---

# 16. Swift Package Manager / CocoaPods

## Swift Package Manager for App Developers

URL:

`https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-app-developers`

Establishes:

- Flutter 3.44 enables SwiftPM by default
- CocoaPods remains supported in maintenance mode
- fallback to CocoaPods where dependencies are not yet SwiftPM-compatible
- CocoaPods registry read-only transition



## Swift Package Manager for Plugin Authors

URL:

`https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-plugin-authors`

Establishes:

- current dual SwiftPM/CocoaPods plugin compatibility expectations
- gradual migration behavior



---

# 17. macOS Flutter Release

## Build and Release a macOS App

URL:

`https://docs.flutter.dev/deployment/macos`

Establishes:

- App Store workflow
- signing
- versioning
- Xcode archive/distribution



## Building macOS Apps With Flutter

URL:

`https://docs.flutter.dev/platform-integration/macos/building`

Establishes:

```bash
flutter build macos
open macos/Runner.xcworkspace
```

and the direct-distribution notarization requirement.

---

# 18. macOS Notarization

## Notarizing macOS Software Before Distribution

URL:

`https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution`

Establishes:

- Developer ID signing
- Hardened Runtime
- secure timestamp
- notarization
- direct distribution
- supported notarized containers
- Xcode notarization



## Migrating to the Latest Notarization Tool

URL:

`https://developer.apple.com/documentation/technotes/tn3147-migrating-to-the-latest-notarization-tool`

Establishes:

- migration from `altool`
- `notarytool`
- end of `altool` notarization submissions



---

# 19. Windows Flutter Release

## Build and Release a Windows Desktop App

URL:

`https://docs.flutter.dev/deployment/windows`

Establishes:

- Microsoft Store deployment
- Windows package validation
- Windows App Certification Kit
- versioning/package considerations



## Desktop Support for Flutter

URL:

`https://docs.flutter.dev/platform-integration/desktop`

Establishes first-party Flutter desktop release commands:

```bash
flutter build windows
flutter build macos
flutter build linux
```



---

# 20. Windows MSIX

## Using WinApp CLI With Flutter

URL:

`https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/flutter`

Establishes:

- Flutter Windows release directory contents
- package identity
- MSIX packaging using Microsoft's `winapp`
- signing/testing workflow



## What Is MSIX?

URL:

`https://learn.microsoft.com/en-us/windows/msix/overview`

Establishes:

- MSIX as the modern Windows application packaging format
- package identity
- install/update semantics
- package integrity/signing



## Windows Code Signing Options

URL:

`https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options`

Establishes:

- Microsoft Store MSIX signing behavior
- direct-distribution signing responsibilities
- modern Windows signing choices



## Sign an MSIX Package

URL:

`https://learn.microsoft.com/en-us/windows/msix/package/signing-package-overview`

Establishes:

- MSIX signing requirement
- certificate trust
- timestamping
- development versus production signing



---

# 21. Linux Flutter Build and Distribution

## Build Linux Apps With Flutter

URL:

`https://docs.flutter.dev/platform-integration/linux/building`

Establishes:

```bash
flutter build linux --release
```

plus:

- generated bundle layout
- requirement to distribute all bundle contents
- use of `ldd`
- system-library dependencies
- references to `.deb`/`.rpm` packaging



## Build and Release a Linux App to the Snap Store

URL:

`https://docs.flutter.dev/deployment/linux`

Establishes Flutter's officially documented Snap Store release workflow and links to other downstream deployment resources.

---

# 22. Flutter Web Release

## Build and Release a Web App

URL:

`https://docs.flutter.dev/deployment/web`

Establishes:

```bash
flutter build web
flutter build web --wasm
```

and:

- `build/web`
- release minification
- tree shaking
- WebAssembly deployment headers



## Building a Web Application With Flutter

URL:

`https://docs.flutter.dev/platform-integration/web/building`

Establishes production Web build commands and Chrome DevTools performance tooling.

---

# 23. Flutter Web WebAssembly

## Support for WebAssembly

URL:

`https://docs.flutter.dev/platform-integration/web/wasm`

Establishes:

- `--wasm`
- dependency compatibility
- JS fallback
- browser compatibility considerations
- WebAssembly server requirements



---

# 24. Flutter Web Service Workers and Caching

## Web FAQ

URL:

`https://docs.flutter.dev/platform-integration/web/faq`

Establishes:

- Flutter no longer generates/manages a service worker by default
- custom service workers are required for explicit offline/caching use cases
- cache-header considerations for preventing stale application code



---

# 25. Dart Dependency Locking

## How to Use Packages

URL:

`https://dart.dev/tools/pub/packages`

Establishes:

```bash
dart pub get --enforce-lockfile
```

for production dependency retrieval that fails when dependency resolution or content hashes no longer match the tested lockfile.

---

# 26. Flutter Obfuscation

## Obfuscate Dart Code

URL:

`https://docs.flutter.dev/deployment/obfuscate`

Establishes:

- supported targets
- `--obfuscate`
- `--split-debug-info`
- `flutter symbolize`
- matching-symbol requirement
- lack of Flutter Web Dart-obfuscation support
- limitations of obfuscation as security



---

# 27. Flutter Continuous Delivery

## Continuous Delivery With Flutter

URL:

`https://docs.flutter.dev/deployment/cd`

Establishes:

- recommendation to validate local release builds first
- Android AAB production flow
- iOS IPA production flow
- CI automation context



---

# Source Selection Rules Used

The research applied this priority:

1. Flutter official documentation
2. Dart official documentation
3. Flutter/Dart official APIs/tooling
4. Android Developers
5. Apple Developer Documentation
6. Microsoft Learn
7. officially linked Linux deployment guidance
8. browser/platform-owner documentation where required

Third-party tutorials were not used to establish core build/release rules.

---

# Freshness Rules

Re-check these at every future major release:

- Flutter supported platforms
- Play target API requirements
- Flutter CLI flags
- AGP/Gradle/JDK compatibility
- Xcode/iOS requirements
- SwiftPM/CocoaPods transition
- Microsoft Store/MSIX tooling
- Flutter Web renderer/Wasm behavior
- service-worker behavior
- store signing requirements

Treat versioned source documentation as more authoritative than copied historical release instructions.