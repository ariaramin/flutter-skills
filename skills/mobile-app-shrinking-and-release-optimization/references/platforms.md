# Platform playbooks

## Apple platforms

Measure with App Store Connect for a released/TestFlight build or generate Xcode's `App Thinning Size Report.txt` for all compatible variants. The `.app`, `.xcarchive`, and upload IPA contain material that users may not receive, including diagnostic artifacts.

Inspect:

- executable and framework segments, duplicate dynamic frameworks, architecture slices
- asset catalogs, duplicate images/video/audio, localizations, fonts, and on-demand content
- release optimization, `DEAD_CODE_STRIPPING`, strip settings, linker map, and exported symbols
- Objective-C selectors/runtime lookup, `NSClassFromString`, storyboards/nibs, C callbacks, registration tables, Swift/ObjC export, and reflection

Use supported Xcode defaults before custom compiler/linker flags. Generate `DWARF with dSYM File` for releases, strip the shipped product as appropriate, retain the matching dSYM privately, and verify crash symbolication. Apple upload processing and DRM can change final size; treat the store result as authoritative.

## Flutter

Build and measure per target:

```sh
flutter build appbundle --release --analyze-size
flutter build ipa --release --analyze-size
```

Supported combinations vary by Flutter version; verify with `flutter build <target> -h`. Use DevTools' app-size view to inspect the generated analysis file. Analyze Dart code, assets/fonts, engine/runtime, native plugins, and platform binaries separately.

For obfuscated Dart releases:

```sh
flutter build appbundle --release --obfuscate --split-debug-info=build/symbols/android
```

The command is illustrative; choose a private durable symbol path and archive it with the exact build identity. Repeat separately for each platform/architecture as required. Symbol names are not a stable persistence or reflection contract.

Deferred components can move optional Android code/assets out of the initial install but add Play delivery configuration and runtime states. Use Dart deferred imports, run Flutter's component validation, and check duplicated assets across components. Debug builds do not reproduce delivery behavior.

## React Native

Use a production/release build with development mode off. Attribute:

- JavaScript source/bundle or Hermes bytecode
- duplicate packages and module side effects
- images/fonts and resolver behavior
- Hermes/alternate engine and native runtime binaries
- Android DEX/resources/native ABIs
- iOS executable/frameworks/assets

Inspect the pinned React Native template and documentation because Hermes generation, source maps, native-module registration, and architecture defaults change. Retain source maps and engine/native symbols from the exact build. Test minified Android and stripped iOS paths as native apps, including native modules, deep links, background tasks, and release-only engine behavior.

Dynamic `require`, computed module paths, and asset lookup can defeat static analysis or bundling assumptions. Prefer static imports and explicit registries. Do not promise JavaScript tree shaking without verifying the actual Metro transform and bundle.

## Kotlin Multiplatform

Create a target table before optimizing:

| Target | Output | Optimizer | Symbols |
|---|---|---|---|
| Android | AAB/APK/AAR | R8 plus Android resource shrinker | R8 mapping plus native symbols |
| iOS device/simulator | framework/app | Kotlin/Native and Apple linker/Xcode | dSYM and Kotlin/native crash metadata |
| Other | target-specific | target compiler/linker | target-specific |

Audit expect/actual implementations, exported ObjC/Swift surface, C interop, resource packaging, static/dynamic framework linkage, and target-specific dependencies. A dependency present in common source can produce different size and reachability behavior per target.

## Cross-platform release gate

For each platform:

1. Record toolchain and dependency versions.
2. Build the store-equivalent release.
3. Measure delivered and installed variants.
4. Inventory code, assets, resources, frameworks/native libraries, and ABIs.
5. Preserve and upload exact symbols/maps.
6. Install on representative devices and run critical dynamic flows.
7. Benchmark startup/runtime separately.
8. Stage rollout and monitor production regressions.
