# iOS & macOS Production Release

Source-preserving excerpt from the uploaded production release skill. Use when the core SKILL.md routes to this topic.

# iOS

## Recommended build

For App Store/TestFlight distribution:

```bash
flutter build ipa --release
```

Flutter creates:

```text
build/ios/archive/*.xcarchive
build/ios/ipa/*.ipa
```

The command supports version/build overrides and current Flutter supports export-method/export-options workflows where available.

---

## Export methods

For non-App-Store scenarios, current Flutter documentation includes:

```bash
flutter build ipa --release --export-method ad-hoc
flutter build ipa --release --export-method development
flutter build ipa --release --export-method enterprise
```

Availability remains Flutter-version dependent.

Verify:

```bash
flutter build ipa -h
```

For reproducible Xcode export configuration:

```bash
flutter build ipa \
  --release \
  --export-options-plist=path/to/ExportOptions.plist
```

Flutter documents this as a way to reuse Xcode-generated export settings.

---

## Deployment target

Flutter 3.44.7 supports iOS 13 and later. Plugins/native code can require a higher minimum.

Set the project deployment target to the highest required minimum among:

- Flutter
- application requirements
- plugins
- native frameworks

Do not lower a plugin's supported minimum by editing metadata alone.

---

## Signing

Automatic signing is usually appropriate for standard Xcode workflows.

Use manual signing when there is an explicit reason such as:

- controlled enterprise signing
- advanced CI provisioning
- multiple managed profiles
- organization-specific signing policy

Do not toggle between signing modes as a blind troubleshooting step.

Validate:

- Team
- bundle ID
- distribution certificate
- provisioning profile
- capabilities
- entitlements
- build configuration

---

## Swift Package Manager vs CocoaPods

As of **Flutter 3.44**, Flutter enables Swift Package Manager by default for iOS/macOS native dependencies.

Flutter still supports CocoaPods in maintenance mode and falls back where dependencies are not yet SwiftPM-compatible. Flutter also notes that the CocoaPods registry becomes permanently read-only on December 2, 2026.

Therefore:

- inspect the project's actual integration first
- do not assume every current project is CocoaPods-only
- do not force a SwiftPM migration during release cleanup unless required
- do not remove CocoaPods support from plugins while compatibility is still needed
- validate native plugins under the project's package-manager mode

---

## Bitcode

Do not add legacy bitcode advice.

Xcode 14 deprecated bitcode, and Apple no longer accepts new bitcode submissions from Xcode 14 or later.

---

## dSYMs and archives

For every distributed Apple build:

**Retain the complete Xcode archive and matching dSYMs.**

Apple states that dSYM files must match the exact binary UUID and explicitly recommends retaining the archive for every distributed build.

Archive by:

```text
platform/
version/
build-number/
commit/
archive/
dSYMs/
flutter-symbols/
```

Do not regenerate dSYMs later and assume they will match.

---

## iOS validation

Before submission:

- test physical-device release
- validate minimum supported OS where practical
- validate signing
- validate entitlements
- validate privacy configuration
- validate native plugin behavior
- create/archive release
- run Xcode Validate App
- upload to TestFlight
- test installed TestFlight build
- verify crash symbol upload/retention
- submit only after TestFlight-equivalent validation

Xcode's archive/distribution workflow includes explicit validation before distribution.

---

# macOS

## Flutter build

```bash
flutter build macos --release
```

For Apple distribution workflows, open:

```bash
open macos/Runner.xcworkspace
```

Flutter documents building the release app first and then using Xcode for App Store/direct distribution workflows.

---

## Mac App Store

Validate:

- bundle ID
- App Sandbox
- entitlements
- signing team
- App Store certificate/profile
- minimum OS
- supported architectures
- native plugins

Then archive/validate/distribute through Xcode.

---

## Direct distribution

For distribution outside the Mac App Store, use:

```text
Developer ID signing
+
Hardened Runtime
+
notarization
```

Apple requires appropriately signed Developer ID software and Hardened Runtime for notarization workflows.

Do not use legacy `altool` notarization automation.

Apple stopped accepting `altool` notarization uploads on November 1, 2023. Use Xcode's notarization workflow or `notarytool`.

---

## Architectures

Current Flutter supports macOS x64 and Arm64.

If the product supports both Intel and Apple Silicon:

- inspect produced binary architectures
- validate native frameworks/plugins for both
- test both hardware families or representative CI devices
- ensure packaging preserves the intended architectures

Do not assume a third-party `.dylib` or framework is universal.

---

## Symbols

Preserve:

- Xcode archive
- dSYMs
- Flutter split-debug-info if used
- native framework symbols where needed

---

