# Research Findings — Reference Navigation

This file preserves the uploaded research findings verbatim below. Use it for current-version conclusions, conflicts, stale-guidance corrections, and evidence-backed release decisions.

# Flutter Production Build & Release — Research Findings

**Research date:** 2026-08-09  
**Flutter documentation baseline:** 3.44.7  
**Dart baseline:** 3.12.x

---

# Executive Findings

The strongest cross-platform conclusion is that Flutter release engineering must remain **platform-specific after the Dart/Flutter compilation step**.

Flutter provides a common application framework and common `flutter build` interface, but production distribution still depends materially on:

- Android Gradle/Play behavior
- Xcode and Apple signing
- macOS notarization
- Windows package identity/signing
- Linux distro/runtime packaging
- browser/CDN behavior

A production playbook that treats every target as "run `flutter build` and upload the result" is incomplete.

---

# 1. Flutter Documentation Baseline

Current Flutter deployment documentation states that it reflects Flutter **3.44.7** unless otherwise noted.

Current supported deployment matrix includes:

- Android API 24–37
- iOS 13–26
- Windows 10/11, x64 and Arm64
- macOS x64 and Arm64
- Linux x64 and Arm64
- Web with browser-dependent JavaScript/Wasm support



### Operational consequence

An AI agent must determine the repository's actual Flutter version before applying this guidance.

Do not force a Flutter 3.44 project structure onto an older pinned application without migration analysis.

---

# 2. Build Mode Findings

Flutter's official guidance is unambiguous:

```text
debug   → development
profile → performance analysis
release → deployment
```

Debug mode prioritizes development speed and includes instrumentation that makes performance and size unrepresentative.

Profile mode exists specifically for performance investigation.

Release mode enables production optimization.

### Deprecated/bad advice

Avoid:

```text
"The debug app feels slow, so optimize it."
```

Performance work should begin by reproducing the issue in profile/release-appropriate conditions.

---

# 3. AOT/JIT Finding

For native Flutter:

- debug relies on JIT-oriented development behavior
- profile/release use Dart AOT compilation

Flutter's App Size documentation explicitly ties AOT tree shaking to profile/release builds and distinguishes it from debug JIT compilation.

For Web:

- debug and production compilation differ
- release is minified/tree-shaken
- `--wasm` introduces the current WebAssembly path



---

# 4. Application Size Finding

The research repeatedly confirms that these metrics are distinct:

```text
upload package
download bytes
installed bytes
runtime memory
```

Flutter explicitly warns that store upload-package size is not representative of user download size because stores can filter architectures and resources.

### Operational consequence

Never write a release report such as:

```text
"The app uses 80 MB because the IPA is 80 MB."
```

Measure each dimension independently.

---

# 5. `--analyze-size` Scope

Flutter's current app-size page documents `--analyze-size` for:

- APK
- App Bundle
- iOS
- Linux
- macOS
- Windows

It does not list Web in the supported command examples.

### Operational consequence

Do not infer unsupported target flags from another platform.

Always confirm:

```bash
flutter build <target> -h
```

---

# 6. Android Distribution Finding

Flutter currently recommends an **Android App Bundle** for ordinary Google Play distribution:

```bash
flutter build appbundle
```

For APK-only channels it recommends architecture splits:

```bash
flutter build apk --split-per-abi
```



### Deprecated/bad advice

Avoid using a fat APK as the default Play production artifact.

Avoid shipping one APK containing every ABI when per-ABI delivery is practical.

---

# 7. Android ABI Finding

Flutter's current Android release documentation lists release support for:

- ARM32 / `armeabi-v7a`
- ARM64 / `arm64-v8a`
- x86_64



### Caveat

Do not manually delete architectures without inspecting native plugins.

A Dart package may be architecture-neutral while a bundled native SDK is not.

---

# 8. Android SDK Finding

Modern Flutter project templates expose Flutter-managed values such as:

```text
flutter.compileSdkVersion
flutter.minSdkVersion
flutter.targetSdkVersion
```

Flutter states they usually need changing only when application/plugin requirements justify it.

### Operational consequence

Do not pin or raise SDK values mechanically.

Reasons to change them include:

- Play policy
- required Android API
- plugin minimum
- application support policy

---

# 9. Google Play Target API Time Boundary

This was a critical date-sensitive finding.

The research date is **2026-08-09**.

Google states that beginning **2026-08-31**, ordinary new applications and application updates must target **Android 16 / API 36** or later, with separate thresholds for Wear OS, Automotive, TV, and XR.

### Consequence

A permanent skill must not say:

```text
"targetSdk must always be 36"
```

Instead:

```text
Recheck current Play target API policy at release time.
```

The exact threshold is store policy, not a stable Flutter constant.

---

# 10. Android R8 Documentation Conflict

Flutter's current Android release documentation contains historical wording suggesting:

```text
--no-shrink
```

but immediately contains an explicit current note that:

```text
--[no-]shrink has no effect
```

and code shrinking remains enabled in release builds.

### Resolution

Treat the explicit current note as controlling behavior.

Do not recommend `--no-shrink` as a modern solution.

Diagnose:

- reflection
- dynamic class lookup
- plugin rules
- native SDK keep requirements

instead.

---

# 11. Android R8/AGP Version Conflict

Android's newest optimization documentation now has different configuration models by AGP version.

AGP 9.3+ uses newer optimization configuration, while prior AGP releases retain the older minification/resource-shrinking DSL.

### Resolution

Do not blindly paste Google's newest AGP DSL into a Flutter project.

First determine:

```text
Flutter version
↓
AGP version
↓
Gradle version
↓
JDK
↓
current build files
```

Native-toolchain migration must be a controlled compatibility change.

---

# 12. Multidex Advice Is Mostly Legacy for Current Flutter Support

Flutter 3.44.7's Android supported baseline begins at API 24.

Flutter's Android release page describes native multidex support for API 21+ and the older special handling below that threshold.

### Conclusion

Do not proactively add `androidx.multidex` configuration to a current supported Flutter application.

Only handle multidex when an actual project/toolchain requirement exists.

---

# 13. iOS Artifact Finding

Current Flutter iOS release command:

```bash
flutter build ipa
```

produces:

```text
build/ios/archive/*.xcarchive
build/ios/ipa/*.ipa
```



The archive is important beyond packaging because it contains release diagnostic information.

---

# 14. Apple Symbol Retention Finding

Apple's documentation is strong on build-specific symbols.

A dSYM only matches the binary with the corresponding build UUID.

Apple explicitly instructs developers to retain the Xcode archive for every distributed application build.

### Operational consequence

Artifact retention must include:

```text
IPA/package
xcarchive
dSYMs
Flutter split symbols
commit/build metadata
```

Do not assume dSYMs can be regenerated later from source.

---

# 15. Bitcode Advice Is Obsolete

Apple deprecated bitcode with Xcode 14 and no longer accepts new bitcode submissions under the modern Xcode flow.

### Deprecated advice to reject

- "Enable bitcode before submitting Flutter iOS."
- "Download newly generated App Store dSYMs because Apple recompiles every current upload from bitcode."

Those belong to historical workflows.

---

# 16. SwiftPM Became a Major Flutter 3.44 Change

As of Flutter 3.44:

- Swift Package Manager is enabled by default for Flutter iOS/macOS native dependencies
- CocoaPods remains supported in maintenance mode
- Flutter can fall back where a dependency lacks SwiftPM support
- Flutter notes a permanent read-only transition for the CocoaPods registry on December 2, 2026



### Consequence

Old guidance saying:

```text
"Run pod install for every Flutter Apple build because all plugins are CocoaPods-based"
```

is no longer universally accurate.

### Nuance

Existing projects can still be CocoaPods-based.

Do not force a package-manager migration merely to prepare a release.

---

# 17. macOS Distribution Has Two Distinct Paths

## Mac App Store

Uses App Store signing/distribution.

## Direct distribution

Requires a Developer ID-oriented workflow and notarization.

Apple's notarization documentation requires correctly signed binaries and Hardened Runtime for modern Developer ID notarization.

### Consequence

Do not apply Mac App Store sandbox/signing instructions blindly to direct distribution, or vice versa.

---

# 18. `altool` Notarization Is Obsolete

Apple stopped accepting notarization uploads through `altool` on November 1, 2023.

Current supported choices include Xcode's notarization workflow and `notarytool`.

### Deprecated advice

Reject:

```bash
xcrun altool --notarize-app ...
```

for new notarization automation.

---

# 19. Windows Flutter Output vs Windows Packaging

A significant distinction emerged:

```bash
flutter build windows
```

creates a Windows release layout.

It does not itself imply:

```text
MSIX generated
installer generated
Store package generated
```

Microsoft currently documents `winapp` for taking Flutter release output through package identity/MSIX workflows.

Flutter's own Store documentation also separates Flutter build from Windows package validation/deployment.

### Conclusion

An AI agent must label:

- Flutter build output
- Windows package format
- Windows installer/update strategy

as separate layers.

---

# 20. Windows MSIX Finding

Microsoft describes MSIX as the modern Windows packaging format with:

- package identity
- clean install/uninstall
- update semantics
- package integrity



For Microsoft Store MSIX distribution, Microsoft re-signs the package after certification. Direct/off-Store distribution requires the publisher's appropriate signing/trust model.

### Consequence

Do not tell developers to buy/manage a certificate for Store MSIX if the Store workflow does not require that publisher-side production signing step.

Likewise, do not assume an unsigned direct MSIX can be installed normally.

---

# 21. Linux Build Output vs Packaging

Flutter's Linux build documentation says:

```bash
flutter build linux --release
```

creates a bundle whose entire contents must be distributed together.

It also tells developers to inspect linked OS libraries using `ldd`.

Flutter separately documents Snap Store release.

### Conclusion

Official Flutter behavior:

```text
Flutter builds Linux bundle
```

Distribution/package choice:

```text
Snap
deb
rpm
Flatpak
AppImage
other
```

belongs to downstream packaging/channel tooling.

Do not invent Flutter CLI commands for those formats.

---

# 22. Flutter Web Build Model Has Changed

Current core commands are:

```bash
flutter build web
flutter build web --wasm
```



### Deprecated advice

Avoid old Flutter Web recipes centered on:

- HTML renderer selection
- obsolete renderer flags
- assuming all browsers execute the Wasm path
- generated Flutter service-worker configuration

Use the exact current Web documentation for the pinned Flutter version.

---

# 23. WebAssembly Has Browser and Dependency Constraints

Flutter's current WebAssembly documentation explicitly requires:

- compatible dependencies
- appropriate JS interop
- compatible browser/runtime
- server configuration

and retains JavaScript fallback where WasmGC support is unavailable.

The supported-platform matrix currently reports Wasm support for current Chrome/Edge while Firefox/Safari remain JavaScript-only in Flutter's support matrix.

### Conclusion

Do not recommend:

```text
"Always build Flutter Web with --wasm because it is faster."
```

Choose it based on:

- user browser mix
- dependency compatibility
- hosting controls
- measured performance

---

# 24. Flutter Web Service-Worker Behavior Changed

Flutter's Web FAQ now states:

> Flutter no longer generates or manages a service worker by default.

A custom service worker is required when the application needs offline support or an advanced caching strategy.

### Deprecated advice

Reject old deployment playbooks that depend on:

- automatically generated `flutter_service_worker.js`
- Flutter-managed default PWA caching behavior
- obsolete `--pwa-strategy` recipes

without checking the actual SDK.

---

# 25. Web Cache Policy Must Be File-Aware

Flutter's Web FAQ specifically discusses preventing stale application scripts and using cache headers that allow update discovery.

### Conclusion

Do not configure all `build/web` files with years-long immutable caching.

Long immutable caching is appropriate only when the resource naming/versioning scheme genuinely makes that safe.

Entry/bootstrap/update-discovery resources need revalidation behavior.

---

# 26. Isolates Are Not a Generic Speed Switch

Flutter's official isolate guidance says the key reason to use a helper isolate is large computation causing main-isolate UI jank.

It also notes:

- isolate spawn/message transfer has cost
- longer-lived isolates can make sense for repeated workloads
- Web does not support Dart isolates
- `compute()` runs on the Web main thread



### Deprecated/bad advice

Reject:

```text
"Wrap every JSON parse in compute() for performance."
```

Measure first.

---

# 27. Rendering Optimization Must Be Trace-Driven

Flutter identifies potentially expensive behaviors such as:

- `saveLayer`
- opacity
- clipping
- intrinsic layout
- rebuilding animation-independent subtrees
- eager long-list construction



### Important nuance

None should be treated as "always bad."

Correct workflow:

```text
trace
→ identify cost
→ change
→ trace again
```

---

# 28. Frame Budget Is Refresh-Rate Dependent

Flutter DevTools documents both 60 fps and 120 fps rendering contexts.

### Conclusion

The common "16 ms frame budget" shorthand applies to approximately 60 Hz.

A 120 Hz device has about half that interval.

Performance guidance should refer to the target display refresh interval rather than treating 16 ms as universal.

---

# 29. Memory Findings

Flutter DevTools differentiates:

- memory leaks
- memory bloat
- heap allocation
- retained objects
- snapshots



Frequent GC events do not automatically prove a problem; Flutter's DevTools documentation says frequent collection can occur without a performance issue.

### Conclusion

Do not optimize GC count alone.

Look for:

- growing retained heap
- retained disposed objects
- image/raster bloat
- OOM
- jank correlated with allocation

---

# 30. Obfuscation Is Not Security

Flutter's documentation is explicit that Dart obfuscation renames symbols and does not encrypt application resources.

Flutter Web does not use the same Dart obfuscation workflow.

### Conclusion

Do not present:

```bash
--obfuscate
```

as protection for:

- API keys
- server credentials
- authorization logic

Use it only for reverse-engineering friction and only when symbol retention is operationally sound.

---

# 31. Split Debug Symbols Are Operationally Important

Flutter documents:

```bash
--obfuscate
--split-debug-info=<directory>
```

and requires the resulting matching symbol material for future symbolication.

### Conclusion

Release pipelines should archive symbols **before** uploading/promoting the binary.

A successful store submission is not a replacement for internal symbol retention.

---

# 32. Dart Dependency Reproducibility

Dart recommends:

```bash
dart pub get --enforce-lockfile
```

when deploying production code, so retrieval fails rather than resolving untested dependency changes.

### Conclusion

For application repositories:

- commit `pubspec.lock`
- review changes
- reproduce tested resolution
- do not run uncontrolled `pub upgrade` during release

---

# 33. CI Caching vs Reproducibility

Caches can include:

- pub cache
- Gradle cache
- Flutter artifacts
- native package caches

but cache presence must not determine whether the release can be rebuilt.

### Engineering inference

A release should be reconstructable on a clean worker from:

```text
source revision
Flutter version
native toolchains
lockfiles
production configuration
signing secrets supplied externally
```

This is an engineering synthesis rather than a claim that Flutter guarantees bit-for-bit deterministic binaries across all native platform toolchains.

---

# 34. Production Secrets and Dart Defines

`--dart-define` and configuration files are useful for selecting:

- API endpoints
- public project IDs
- environment
- feature flags

They do not create server-side secrecy.

### Conclusion

If the compiled Flutter code needs the value, assume the end user can recover it.

Signing credentials and backend secrets must stay out of the application build.

---

# 35. `flutter clean` Should Not Be Reflexive

Flutter release docs sometimes mention `flutter clean` after specific native configuration changes, such as signing-related Gradle edits.

### Conclusion

This is a targeted stale-build remedy, not a universal first troubleshooting step.

A release agent should:

1. inspect the error
2. preserve artifacts
3. determine whether generated state is stale
4. clean only if justified

---

# 36. Store Validation Should Test the Store-Processed Artifact

Important examples:

### Android

Test AAB through Play internal testing because Google Play generates delivered APKs from the bundle. Flutter explicitly recommends internal/alpha/beta testing of the App Bundle.

### Apple

Use Xcode Validate App and TestFlight before App Store production.

### Windows

Run Windows App Certification Kit for Store packages.

### macOS direct

Verify signing/notarization of the actual package distributed to users.

### Web

Test through the actual CDN/host because routing, headers, caching, MIME types, and cross-origin policy are not reproduced fully by a local build.

---

# 37. Platform Artifacts Must Be Kept Distinct

| Target | Flutter/native build output | Distribution layer |
|---|---|---|
| Android | APK/AAB | Play or direct store/channel |
| iOS | xcarchive + IPA | TestFlight/App Store/ad hoc/enterprise |
| macOS | `.app`/archive | App Store or signed/notarized direct package |
| Windows | release directory | MSIX/Store/direct installer/layout |
| Linux | release bundle | Snap/downstream distro packaging |
| Web | `build/web` | HTTP host/CDN |

This distinction prevents many incorrect cross-platform recommendations.

---

# 38. Source Maps and Native Symbols Have Different Roles

Do not group every diagnostic artifact under one generic "symbols.zip."

Different systems need different matching files.

### Dart

Flutter split-debug symbols.

### Android

Potentially:

- Flutter symbols
- R8 mapping
- native symbols

### Apple

- Xcode archive
- dSYMs
- Flutter symbols

### Windows

- PDBs
- Flutter symbols

### Web

- JavaScript source maps where generated

### Conclusion

Create a release manifest that identifies exact paths and artifact IDs.

---

# 39. Release Optimization Must Not Cause Dependency Churn

A release-size/performance task does not justify automatically replacing packages.

A dependency may affect:

- native SDK levels
- signing
- permissions
- runtime initialization
- binary size
- architecture support
- Web/Wasm compatibility

### Conclusion

Measure the dependency's real impact before replacing it.

A major package upgrade should be its own reviewed change where practical.

---

# 40. Current Guidance That Should Explicitly Be Avoided

The following recommendations are stale, incomplete, or unsafe in a current Flutter 3.44.x context:

## Android

Avoid:

```text
Use --no-shrink when R8 breaks release.
```

Current docs say the flag has no effect.

Avoid:

```text
Manually add multidex to every large app.
```

Current supported Android baseline already uses native multidex-capable API levels.

Avoid:

```text
Upgrade to the newest AGP during final release cleanup.
```

AGP configuration is version-specific.

---

## iOS/macOS

Avoid:

```text
Enable bitcode for modern App Store submission.
```

Bitcode submission advice is obsolete.

Avoid:

```text
Flutter Apple plugins always use CocoaPods.
```

Flutter 3.44 uses SwiftPM by default while CocoaPods remains supported.

Avoid:

```text
Use altool to notarize macOS releases.
```

Use Xcode/notarytool.

---

## Windows

Avoid:

```text
flutter build windows creates an installer/MSIX automatically.
```

It creates Flutter's Windows release output; packaging is an additional layer.

---

## Linux

Avoid:

```text
Flutter officially builds AppImage/Flatpak/deb/rpm through flutter build.
```

Flutter directly creates the Linux application bundle; downstream tooling performs distro packaging.

---

## Web

Avoid:

```text
Select the HTML renderer using old Flutter Web renderer recipes.
```

Follow current JS/Wasm guidance.

Avoid:

```text
Flutter generates and manages the PWA service worker by default.
```

It no longer does.

Avoid:

```text
Always use --wasm.
```

Browser and dependency compatibility remain real constraints.

---

## Performance

Avoid:

```text
Benchmark debug mode.
```



Avoid:

```text
Every rebuild is bad.
Every opacity is bad.
Every isolate makes code faster.
Frequent GC means a memory leak.
```

Official Flutter performance tooling requires measurement and context.

---

# Final Synthesis

A senior Flutter release workflow should operate as:

```text
Inspect repository
↓
Record toolchain
↓
Identify distribution target
↓
Preserve signing/configuration
↓
Restore locked dependencies
↓
Analyze + test
↓
Establish release/profile baseline
↓
Make targeted fixes
↓
Build platform-native release artifact
↓
Measure size/performance
↓
Validate signing/configuration
↓
Archive symbols and build metadata
↓
Test through real distribution channel
↓
Promote release
↓
Retain diagnostic artifacts
```

The strongest rule from the research is:

**Do not optimize, migrate, clean, package, sign, or upload by habit. Determine which platform layer owns the requirement, verify the exact toolchain version, make the narrowest justified change, and validate the artifact users will actually receive.**