# Authoritative sources

Verified during skill authoring on 2026-09-07. Recheck current documentation against pinned tool versions before implementation.

## Android and Gradle

- [Enable app optimization with R8](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization)
- [Use R8 in full mode](https://developer.android.com/topic/performance/app-optimization/full-mode)
- [About keep rules](https://developer.android.com/topic/performance/app-optimization/keep-rules-overview)
- [Keep rule use cases and examples](https://developer.android.com/topic/performance/app-optimization/keep-rule-examples)
- [Additional keep rule types](https://developer.android.com/topic/performance/app-optimization/additional-keep-rules)
- [Customize which resources to keep](https://developer.android.com/topic/performance/app-optimization/customize-which-resources-to-keep)
- [Optimization for library authors](https://developer.android.com/topic/performance/app-optimization/library-optimization)
- [Troubleshoot optimization](https://developer.android.com/topic/performance/app-optimization/troubleshoot-the-optimization)
- [R8 Configuration Analyzer](https://developer.android.com/topic/performance/app-optimization/r8-configuration-analyzer)
- [Analyze your build with APK Analyzer](https://developer.android.com/studio/debug/apk-analyzer)
- [Android App Bundle format](https://developer.android.com/guide/app-bundle/app-bundle-format)
- [Include native debug symbols](https://developer.android.com/build/include-native-symbols)
- [Baseline Profiles](https://developer.android.com/topic/performance/baselineprofiles/overview)
- [Gradle configuration cache](https://docs.gradle.org/current/userguide/configuration_cache.html)
- [Gradle build cache performance](https://docs.gradle.org/current/userguide/build_cache_performance.html)
- [ProGuard manual](https://www.guardsquare.com/manual/home)

## Kotlin and libraries

- [kotlinx.serialization Android shrinking guidance](https://github.com/Kotlin/kotlinx.serialization/blob/master/README.md#android)
- [Gson R8/ProGuard troubleshooting](https://github.com/google/gson/blob/main/Troubleshooting.md#android---r8--proguard)
- [Gson packaged rules](https://github.com/google/gson/blob/main/gson/src/main/resources/META-INF/proguard/gson.pro)

## Apple

- [Reducing your app's size](https://developer.apple.com/documentation/xcode/reducing-your-app-s-size)
- [Xcode build settings reference](https://developer.apple.com/documentation/xcode/build-settings-reference)
- [Distributing your app for beta testing and releases](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)

## Flutter and Dart

- [Measuring your app's size](https://docs.flutter.dev/perf/app-size)
- [Obfuscating Dart code](https://docs.flutter.dev/deployment/obfuscate)
- [Deferred components](https://docs.flutter.dev/perf/deferred-components)
- [Flutter DevTools app size tool](https://docs.flutter.dev/tools/devtools/app-size)
- [Dart compilation](https://dart.dev/tools/dart-compile)

## React Native

- [Performance overview](https://reactnative.dev/docs/performance)
- [Publishing to Google Play Store](https://reactnative.dev/docs/signed-apk-android)
- [Bundled Hermes](https://reactnative.dev/architecture/bundled-hermes)

Use primary documentation for behavior. Maintainer repositories are appropriate for version-specific consumer rules. Do not source production rules from unattributed snippets.
