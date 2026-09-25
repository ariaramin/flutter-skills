# Agent Workflow And Sources

Repository-inspection workflow, implementation/verification sequence, final consistency rules, and authoritative references.

## Contents

- AI Agent Workflow
  - 1. Inspect repository metadata
  - 2. Inspect lib/main.dart
  - 3. Search for other application entry points
  - 4. Inspect existing configuration architecture
  - 5. Inspect Android
  - 6. Inspect iOS
  - 7. Inspect macOS separately
  - 8. Inspect Windows/Linux
  - 9. Inspect Web
  - 10. Detect Firebase/native SDK configuration
  - 11. Inspect CI/CD and IDE configuration
  - 12. Build an environment matrix before editing
  - 13. Propose the minimum necessary change
  - 14. Implement Dart configuration
  - 15. Implement native environment configuration only where necessary
  - 16. Add environment/flavor mismatch validation
  - 17. Validate development
  - 18. Validate staging
  - 19. Validate production
  - 20. Run quality gates
  - 21. Verify final release artifacts
- Final Technical Consistency Rules
- References
  - Flutter flavors and deployment
  - Flutter 3.47 Windows/Linux/Web flavor behavior
  - Dart compilation environment
  - Flutter build modes
  - Android
  - Apple platforms
  - Web
  - Windows and Linux deployment
  - Firebase
  - Security
  - Testing and CI/CD

---

## AI Agent Workflow

When applying this skill to a real Flutter repository, do not begin by creating files.

Follow this order.

### 1. Inspect repository metadata

Read:

```
pubspec.yaml
pubspec.lock
analysis_options.yaml
Flutter version-manager files
README/build documentation

```

Determine:

```
Flutter SDK version
Dart SDK constraint
dependency constraints
supported platforms
existing architecture

```

### 2. Inspect `lib/main.dart`

Determine:

- existing initialization order;
- whether `WidgetsFlutterBinding.ensureInitialized()` is used;
- DI setup;
- error handling;
- logging;
- storage/database initialization;
- Firebase;
- analytics;
- crash reporting;
- networking;
- root widget construction.

Preserve working behavior.

### 3. Search for other application entry points

Search for:

```
main_dev.dart
main_stage.dart
main_staging.dart
main_prod.dart
main_production.dart
main_*.dart

```

Also inspect CI/IDE/build scripts for `-t` or `--target` arguments pointing at them.

### 4. Inspect existing configuration architecture

Search for:

```
String.fromEnvironment
bool.fromEnvironment
int.fromEnvironment
appFlavor
APP_ENV
API_BASE_URL
dotenv
Environment
Flavor
Config
bootstrap

```

Do not create a parallel configuration system if a good typed system already exists.

### 5. Inspect Android

Read the project's actual Gradle files before editing:

```
android/app/build.gradle
android/app/build.gradle.kts
android/build.gradle
android/build.gradle.kts
android/settings.gradle
android/settings.gradle.kts
AndroidManifest.xml files
android/app/src/*

```

Record:

```
productFlavors
flavorDimensions
applicationId
applicationIdSuffix
signingConfigs
source sets
manifest placeholders
native SDK plugins
google-services files

```

Do not convert Groovy to Kotlin DSL merely to implement environments.

### 6. Inspect iOS

Inspect:

```
ios/Runner.xcodeproj
ios/Runner.xcworkspace
ios/Flutter/*.xcconfig
ios/Runner/Info.plist
ios/Podfile
schemes
build configurations
bundle identifiers
signing
entitlements
Firebase/native config

```

Do not overwrite the Xcode project with a generic template.

### 7. Inspect macOS separately

Inspect:

```
macos/Runner.xcodeproj
macos/Flutter/
macos/Runner/Configs/
macos/Runner/*.entitlements
macos/Podfile
schemes
build configurations
bundle IDs
signing

```

Do not infer macOS setup from iOS without checking it.

### 8. Inspect Windows/Linux

First check:

```
flutter --version

```

If Flutter is 3.47+, inspect whether the project's CMake/runner files already contain the newer flavor plumbing.

If older, do not use commands the pinned SDK does not support.

Inspect packaging separately from the Flutter runner.

### 9. Inspect Web

Inspect:

```
web/index.html
web/flutter_bootstrap.js
hosting configuration
CDN/cache configuration
deployment scripts

```

Search for environment values injected through generated assets or runtime scripts.

Do not introduce `--flavor` into web builds.

### 10. Detect Firebase/native SDK configuration

Search for:

```
firebase_core
firebase_options.dart
google-services.json
GoogleService-Info.plist
Firebase.initializeApp
Crashlytics
Analytics
push notification SDKs
maps SDKs
OAuth configuration
native API keys

```

Determine which configuration is required before Dart startup.

### 11. Inspect CI/CD and IDE configuration

Search:

```
.github/
.gitlab-ci.yml
azure-pipelines*
bitrise*
codemagic*
Jenkinsfile
fastlane/
.vscode/
.idea/
scripts/
Makefile
melos scripts

```

Identify:

```
build target
flavor
dart defines
signing
artifact naming
deployment destinations

```

### 12. Build an environment matrix before editing

Record current behavior:

| EnvironmentPlatformNative variantDart entry pointApp IDAPIFirebase/native SDK |
| ----------------------------------------------------------------------------- |

Resolve inconsistencies before implementation.

### 13. Propose the minimum necessary change

Prefer:

```
reuse existing bootstrap
+
introduce/strengthen typed config
+
consolidate main entry points
+
retain working native variants

```

over:

```
rewrite startup
regenerate platform folders
replace DI system
replace CI
replace Firebase setup

```

### 14. Implement Dart configuration

Introduce or adapt:

```
AppEnvironment
AppConfig
EnvironmentConfig
single main.dart

```

Centralize environment declarations.

### 15. Implement native environment configuration only where necessary

Do not add native flavor complexity to a platform if nothing native differs and the project's requirements do not need it.

When native identities/resources differ, use the platform-supported mechanism.

### 16. Add environment/flavor mismatch validation

On flavored targets:

```
appFlavor == APP_ENV

```

must hold.

### 17. Validate development

Check:

```
development identity
development backend
development Firebase/native services
logging policy
analytics policy

```

### 18. Validate staging

Check the same properties independently.

Do not assume staging is correct because development works.

### 19. Validate production

Verify explicitly:

```
production identity
production backend
production native SDK project
production signing
production analytics
production distribution settings

```

### 20. Run quality gates

Run at least:

```
flutter analyze
flutter test

```

plus the relevant integration/native build commands.

### 21. Verify final release artifacts

Before shipment, verify that a production artifact cannot accidentally target staging.

A successful compiler invocation is not enough.

## Final Technical Consistency Rules

An implementation following this skill must satisfy all of these invariants:

```
There is exactly one Dart application entry point.

APP_ENV is always explicitly supplied.

APP_ENV never silently falls back.

AppEnvironment parsing is strict.

Native flavor is independently checked when available.

Build mode never determines application environment.

Dart configuration contains client configuration, not privileged secrets.

Native identity is owned by native build/package configuration.

CI chooses and validates the complete build tuple.

Web does not pretend to have Android/Xcode-style flavor semantics.

Windows/Linux behavior is version-gated because desktop flavor support changed in Flutter 3.47.

Configuration is parsed once and passed explicitly.

Services do not repeatedly inspect global environment state.

Adding an environment does not duplicate application startup.

Production release verification happens before distribution.

```

## References

### Flutter flavors and deployment

- [Flutter — Set up Flutter flavors for Android](https://docs.flutter.dev/deployment/flavors)
- [Flutter — Set up Flutter flavors for iOS and macOS](https://docs.flutter.dev/deployment/flavors-ios)
- [Flutter — ](https://api.flutter.dev/flutter/services/appFlavor-constant.html)[`appFlavor`](https://api.flutter.dev/flutter/services/appFlavor-constant.html)[ API](https://api.flutter.dev/flutter/services/appFlavor-constant.html)
- [Flutter — Deployment documentation](https://docs.flutter.dev/deployment)
- [Flutter 3.47.0 release tag](https://github.com/flutter/flutter/releases/tag/3.47.0)

### Flutter 3.47 Windows/Linux/Web flavor behavior

- [Flutter 3.47 ](https://github.com/flutter/flutter/blob/3.47.0/packages/flutter_tools/lib/src/commands/build_windows.dart)[`build_windows.dart`](https://github.com/flutter/flutter/blob/3.47.0/packages/flutter_tools/lib/src/commands/build_windows.dart)
- [Flutter — Windows flavor support change](https://github.com/flutter/flutter/commit/0145a67ea8f38d8f350e58005d3e39b192622503)
- [Flutter 3.47 ](https://github.com/flutter/flutter/blob/3.47.0/packages/flutter_tools/lib/src/commands/build_linux.dart)[`build_linux.dart`](https://github.com/flutter/flutter/blob/3.47.0/packages/flutter_tools/lib/src/commands/build_linux.dart)
- [Flutter — Linux flavor support change](https://github.com/flutter/flutter/commit/3e48f7a7c18a58b7c0cc99e14814a085f21f2057)
- [Flutter 3.47 ](https://github.com/flutter/flutter/blob/3.47.0/packages/flutter_tools/lib/src/commands/build_web.dart)[`build_web.dart`](https://github.com/flutter/flutter/blob/3.47.0/packages/flutter_tools/lib/src/commands/build_web.dart)
- [Flutter 3.47 CLI option implementation](https://github.com/flutter/flutter/blob/3.47.0/packages/flutter_tools/lib/src/runner/flutter_command.dart)

### Dart compilation environment

- [Dart — Environment declarations](https://dart.dev/libraries/core/environment-declarations)
- [Dart — ](https://api.dart.dev/dart-core/String/String.fromEnvironment.html)[`String.fromEnvironment`](https://api.dart.dev/dart-core/String/String.fromEnvironment.html)
- [Dart — ](https://api.dart.dev/dart-core/bool/bool.fromEnvironment.html)[`bool.fromEnvironment`](https://api.dart.dev/dart-core/bool/bool.fromEnvironment.html)
- [Dart — ](https://api.dart.dev/dart-core/int/int.fromEnvironment.html)[`int.fromEnvironment`](https://api.dart.dev/dart-core/int/int.fromEnvironment.html)
- [Dart — ](https://api.dart.dev/dart-core/bool/bool.hasEnvironment.html)[`bool.hasEnvironment`](https://api.dart.dev/dart-core/bool/bool.hasEnvironment.html)

### Flutter build modes

- [Flutter — Build modes](https://docs.flutter.dev/testing/build-modes)
- [Flutter — ](https://api.flutter.dev/flutter/foundation/kDebugMode-constant.html)[`kDebugMode`](https://api.flutter.dev/flutter/foundation/kDebugMode-constant.html)
- [Flutter — ](https://api.flutter.dev/flutter/foundation/kProfileMode-constant.html)[`kProfileMode`](https://api.flutter.dev/flutter/foundation/kProfileMode-constant.html)
- [Flutter — ](https://api.flutter.dev/flutter/foundation/kReleaseMode-constant.html)[`kReleaseMode`](https://api.flutter.dev/flutter/foundation/kReleaseMode-constant.html)

### Android

- [Android Developers — Configure build variants](https://developer.android.com/build/build-variants)

### Apple platforms

- [Flutter — iOS/macOS flavors](https://docs.flutter.dev/deployment/flavors-ios)
- [Flutter — Build and release a macOS app](https://docs.flutter.dev/deployment/macos)

### Web

- [Flutter — Build and release a web app](https://docs.flutter.dev/deployment/web)

### Windows and Linux deployment

- [Flutter — Build and release a Windows app](https://docs.flutter.dev/deployment/windows)
- [Flutter — Build and release a Linux app](https://docs.flutter.dev/deployment/linux)

### Firebase

- [Firebase — Overview of environments](https://firebase.google.com/docs/projects/dev-workflows/overview-environments)
- [Firebase — Configure multiple projects](https://firebase.google.com/docs/projects/multiprojects)
- [Firebase — Get started with Firebase in Flutter](https://firebase.google.com/docs/flutter/setup)
- [Firebase — Learn about Firebase API keys](https://firebase.google.com/docs/projects/api-keys)

### Security

- [Flutter — Obfuscate Dart code](https://docs.flutter.dev/deployment/obfuscate)
- [RFC 8252 — OAuth 2.0 for Native Apps](https://www.rfc-editor.org/rfc/rfc8252)

### Testing and CI/CD

- [Flutter — Integration testing concepts](https://docs.flutter.dev/cookbook/testing/integration/introduction)
- [Flutter — Integration tests](https://docs.flutter.dev/testing/integration-tests)
- [Flutter — Continuous delivery](https://docs.flutter.dev/deployment/cd)
