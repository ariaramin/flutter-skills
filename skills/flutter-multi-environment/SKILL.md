---
name: flutter-multi-environment
description: Design, implement, migrate, review, debug, test, and maintain production Flutter development/staging/production environments and flavors while keeping exactly one Dart app entry point at lib/main.dart. Use whenever a Flutter task mentions flavors, environments, dev/staging/prod, --flavor, appFlavor, productFlavors, Xcode schemes, --dart-define, --dart-define-from-file, environment-specific API endpoints, bundle/application IDs, Firebase per environment, flavor-aware CI/CD, IDE launch configs, or eliminating main_dev.dart/main_staging.dart/main_prod.dart. Also use it to decide whether a value belongs in native flavor configuration, Dart compile-time configuration, runtime configuration, or secret management. Version-gate Windows/Linux flavor behavior against the project's pinned Flutter SDK.
compatibility: Written against Flutter 3.47.0 behavior verified in August 2026. Android/iOS/macOS flavor concepts are official Flutter workflows; Windows/Linux --flavor support is version-sensitive and must be checked against the repository's pinned SDK. Web must not be treated as having Android/Xcode-style native flavors.
---

# Flutter Multi-Environment Architecture

## Purpose

Implement and maintain multi-environment Flutter applications—normally `development`, `staging`, and `production`—with exactly one Dart application entry point:

```text
lib/main.dart
```

Never create environment-specific Dart entry points such as:

```text
lib/main_dev.dart
lib/main_staging.dart
lib/main_prod.dart
```

Treat these as four separate concerns:

```text
native build flavor / scheme
≠ Dart compile-time configuration
≠ runtime configuration
≠ secret management
```

## Mandatory Operating Rules

1. Keep `lib/main.dart` as the only Dart application entry point.
2. Use a canonical environment vocabulary everywhere: `development`, `staging`, `production` unless an existing public build contract requires a migration period.
3. Use a typed immutable `AppEnvironment` + `AppConfig` boundary rather than scattered string checks.
4. Use `APP_ENV` as the authoritative Dart-side environment declaration.
5. Use native flavor/build configuration for native identity, resources, signing references, entitlements, manifests, native SDK files, and other values that must exist before Dart starts.
6. Use Dart compile-time definitions for client-visible Dart configuration that is fixed per artifact.
7. Fail closed on missing or malformed required configuration. Never silently default to production.
8. When `appFlavor` is available, validate it against `APP_ENV` and fail startup on mismatch.
9. Keep build mode (`debug`, `profile`, `release`) independent from deployment environment (`development`, `staging`, `production`). A staging release build is valid.
10. Parse configuration once at startup and pass typed values through the composition root. Do not repeatedly read environment globals in features/services.
11. Never treat `--dart-define`, `.env` input files, obfuscation, or compiled client values as secret storage.
12. CI/CD owns deterministic environment selection, release gates, signing/store credentials, artifact identity checks, and publication policy.
13. Prefer targeted edits to an existing native project. Never regenerate platform directories blindly to “get flavors”.
14. Version-gate Windows/Linux flavor work against the project's pinned Flutter SDK.
15. Do not use `flutter build web --flavor ...`; web environment selection is primarily Dart-define driven.

## First Decision: What Kind of Configuration Is This?

```text
Does the value need to be fixed into a separately buildable artifact?
|
+-- No
|   `-- Runtime configuration. Do not model it as a build flavor merely for convenience.
|
`-- Yes
    |
    +-- Does it affect native identity/resources/signing/entitlements/native SDK setup?
    |   `-- Native flavor/scheme/build configuration.
    |
    +-- Is it client-visible Dart behavior/configuration?
    |   `-- Dart compile-time configuration.
    |
    `-- Is it actually confidential?
        `-- Do not embed it in the Flutter client. Keep it server-side or in CI/signing infrastructure.
```

Typical **runtime** concerns include user-selectable server/tenant, remotely managed rollout percentages, authenticated provisioning, region discovery, and server-driven experiments.

Typical **native** concerns include Android application ID, Apple bundle ID, app name/icon, manifest/plist values, entitlements, URL schemes, source-set resources, native SDK config, signing references, desktop packaging identity.

Typical **Dart compile-time** concerns include `APP_ENV`, public API base URL, client logging policy, analytics enablement policy, public client identifiers, and build-specific client feature policy.

## Required Architecture

Use one orchestration source (developer command or CI matrix row) to select the canonical environment and feed both native and Dart configuration consistently:

```text
canonical environment selection
          |
          +--> native flavor / scheme / build config
          |      `--> identity, resources, signing refs, native SDK config
          |
          `--> Dart compile-time configuration
                 `--> APP_ENV, API endpoint, typed client behavior
```

Dart-side source of truth: `APP_ENV`.

Native-side source of truth: each platform's native build system.

Consistency check: `appFlavor` vs typed `APP_ENV` on flavored targets.

## Repository Inspection Before Editing

Before changing code, inspect:

- `pubspec.yaml`, `pubspec.lock`, Flutter version managers/pins, CI images, `flutter --version` evidence;
- `lib/main.dart` and every `main_*.dart` or other app entry point;
- current bootstrap/DI/service initialization order;
- all `String.fromEnvironment`, `bool.fromEnvironment`, `int.fromEnvironment`, `appFlavor`, `kDebugMode`, environment enums, `.env` loaders, config assets;
- `android/app/build.gradle(.kts)`, manifests, source sets, signing config, Firebase/native SDK files;
- iOS/macOS Xcode schemes, build configurations, xcconfig chains, plist/entitlement setup, Podfile mappings;
- Windows/Linux CMake/runner/template age before assuming `--flavor` support;
- web bootstrap/deployment config and cache/deployment topology;
- VS Code/JetBrains/Xcode launch configurations;
- CI matrices, release scripts, artifact naming, publication credentials and gates.

Preserve deliberate existing behavior. Migrate incrementally.

For the full inspection sequence, read `references/agent-workflow-and-sources.md`.

## Canonical Environment Model

Prefer:

```dart
enum AppEnvironment {
  development('development'),
  staging('staging'),
  production('production');

  const AppEnvironment(this.wireName);

  final String wireName;

  static AppEnvironment? tryParse(String value) {
    for (final environment in values) {
      if (environment.wireName == value) return environment;
    }
    return null;
  }
}
```

Use the same names for:

- `APP_ENV`;
- Flutter `--flavor` where supported;
- Android product flavors;
- Apple schemes;
- Windows/Linux flavors where supported;
- CI matrix values;
- public config filenames.

Avoid translating `dev` → `development`, `prod` → `production` unless preserving an existing external contract during migration.

## Single `main.dart` Boundary

`main.dart` should orchestrate only:

1. read compile-time configuration;
2. read `appFlavor`;
3. parse/validate typed configuration;
4. reject native/Dart mismatch;
5. enter shared bootstrap/composition root.

Canonical shape:

```dart
import 'package:flutter/services.dart' show appFlavor;

import 'app/app.dart';
import 'app/bootstrap.dart';
import 'config/environment_config.dart';

Future<void> main() async {
  final config = EnvironmentConfig.fromCompileTime(
    nativeFlavor: appFlavor,
  );

  await bootstrap(
    config: config,
    appFactory: (config) => App(config: config),
  );
}
```

Do not put a large environment switch or environment-specific initialization graph in `main()`.

## Dart Compile-Time Configuration

Prefer `--dart-define-from-file` for normal multi-value environment contracts:

```bash
flutter run \
  --flavor staging \
  --dart-define-from-file=config/staging.json
```

Use individual `--dart-define` for a small number of explicit overrides or debugging:

```bash
flutter run \
  --dart-define=APP_ENV=development \
  --dart-define=API_BASE_URL=https://api.dev.example.com
```

Centralize `String.fromEnvironment`/`bool.hasEnvironment` reads in one configuration adapter. Do not scatter them across features.

For safety-critical booleans or numbers, prefer strict string parsing when fallback semantics would hide malformed configuration.

## Configuration Contract

A practical baseline:

| Key | Required | Example/allowed values | Default policy |
|---|---:|---|---|
| `APP_ENV` | yes | `development`, `staging`, `production` | none |
| `API_BASE_URL` | yes | absolute HTTP(S) URI | none |
| `LOG_LEVEL` | optional | app-defined enum | environment policy |
| `ANALYTICS_ENABLED` | optional | exact `true` / `false` | conservative default |

Rules:

- Never infer `APP_ENV` from API URL, package ID, display name, or build mode.
- Never make missing `APP_ENV` mean production.
- Validate URL shape and environment-specific transport policy before connecting to services.
- Keep the configuration object immutable.

Read `references/architecture-and-configuration.md` for the complete typed parser, config classes, bootstrap implementation, validation policy, configuration precedence, and dependency-injection guidance.

## Native Flavor Consistency

On targets where Flutter provides a flavor, perform an independent check:

```dart
if (nativeFlavor != null &&
    nativeFlavor.isNotEmpty &&
    nativeFlavor != configuration.environment.wireName) {
  throw ConfigurationException(
    'Native flavor "$nativeFlavor" does not match '
    'APP_ENV "${configuration.environment.wireName}".',
  );
}
```

Do not rely on this runtime check alone for production. CI must validate the pair before building/publishing, and release pipelines should inspect final artifact identity where practical.

## Platform Routing

### Android

Use Gradle product flavors for native application identity/resources. Common pattern:

```kotlin
android {
    flavorDimensions += "environment"

    productFlavors {
        create("development") {
            dimension = "environment"
            applicationIdSuffix = ".dev"
            versionNameSuffix = "-dev"
            resValue("string", "app_name", "Example Dev")
        }
        create("staging") {
            dimension = "environment"
            applicationIdSuffix = ".staging"
            versionNameSuffix = "-staging"
            resValue("string", "app_name", "Example Staging")
        }
        create("production") {
            dimension = "environment"
            resValue("string", "app_name", "Example")
        }
    }
}
```

Use source sets or build settings for native variant resources/files instead of scripts that mutate one shared file in place.

### iOS / macOS

Use shared lowercase Xcode schemes with custom build configurations:

```text
development -> Debug-development / Profile-development / Release-development
staging     -> Debug-staging     / Profile-staging     / Release-staging
production  -> Debug-production  / Profile-production  / Release-production
```

Keep custom configurations chained to Flutter's existing xcconfig setup. Inspect CocoaPods mappings and signing/entitlement behavior rather than inventing a generic copy-script solution.

### Windows / Linux

Flavor support is SDK-version sensitive. With Flutter 3.47.0, build/run flavor plumbing exists; older projects/templates may need targeted native adoption. Never assume an old repository has the required CMake/runner integration merely because the installed global Flutter SDK is new.

### Web

Do not model web builds as Android/Xcode-style native flavors. Build separate artifacts using Dart defines:

```bash
flutter build web \
  --release \
  --dart-define-from-file=config/production.json
```

If one built artifact must switch backend/environment after deployment, that is a separate runtime-configuration architecture with explicit loading, validation, caching, and version semantics.

Read `references/platforms-and-native-integration.md` before editing any native platform or Firebase/native SDK setup.

## Build Commands

Native flavored target example:

```bash
flutter run \
  --flavor development \
  --dart-define-from-file=config/development.json

flutter build appbundle \
  --release \
  --flavor production \
  --dart-define-from-file=config/production.json
```

Web:

```bash
flutter run \
  -d chrome \
  --dart-define-from-file=config/development.json

flutter build web \
  --release \
  --dart-define-from-file=config/production.json
```

Keep every IDE launch configuration pointed at `lib/main.dart`.

Read `references/workflow-ci-testing-performance.md` for Android/iOS/macOS/Windows/Linux/Web commands, IDE examples, integration-test invocation, CI/CD matrix design, artifact naming, and release gates.

## Security Boundary

Assume every value compiled or bundled into a Flutter client is recoverable.

Never embed:

- database passwords;
- service-account private keys;
- privileged backend API secrets;
- confidential OAuth client secrets;
- signing private keys;
- keystore/signing passwords;
- cloud administrative credentials;
- long-lived privileged bearer tokens.

Use backend/server secret management for backend secrets and CI/signing infrastructure for signing/store credentials.

Client-visible configuration such as API endpoints, public client IDs, Firebase client configuration, and non-authoritative feature policy may be build-specific, but it is not secret merely because CI injected it.

## Firebase / Native SDK Rule

Treat Firebase as an example of native environment configuration, not as the flavor architecture itself.

- Register native apps against the correct environment-specific application/bundle IDs.
- On Android, prefer build-variant source-set placement for `google-services.json` rather than a script that repeatedly overwrites one shared file.
- On Apple platforms, inspect actual FlutterFire/native initialization, target membership, plist behavior, Analytics/Crashlytics/notifications, and build configurations before selecting a strategy.
- Validate app configuration before connecting to the selected backend/native project.
- Never ship service-account or privileged server credentials in the app.

Read `references/platforms-and-native-integration.md` for full native SDK guidance.

## CI/CD Contract

Model build intent as a deliberate tuple:

```text
environment × platform × build mode
```

CI should:

1. pin the Flutter SDK/toolchain;
2. select one canonical environment;
3. select matching public Dart config;
4. select matching native flavor/scheme where supported;
5. preflight `APP_ENV`, native variant, expected app identity, endpoint policy, and signing identity;
6. inject signing/store credentials separately from Dart config;
7. run analysis/tests;
8. build artifact;
9. inspect artifact identity/provenance;
10. publish only after release gates pass.

Do not build every Cartesian product automatically. Build only combinations that serve a deployment/testing purpose.

## Testing Requirements

At minimum unit-test pure configuration parsing for:

- each valid environment;
- missing/unknown `APP_ENV`;
- missing/invalid API URL;
- staging/production transport policy;
- native/Dart mismatch;
- exact boolean parsing;
- unknown enum/log values;
- whitespace/canonical-name errors;
- default policy behavior.

Then use environment-aware integration/native build tests where they materially prove native packaging/SDK selection.

Keep the parser pure so unit tests do not require Flutter engine/platform startup.

## Performance Rules

Do not micro-optimize environment parsing. Prefer:

- compile-time configuration rather than runtime asset parsing when runtime mutability is unnecessary;
- one parse/validation at startup;
- no expensive I/O during configuration declaration;
- no duplicated bootstraps;
- no SDK initialization before configuration validation;
- no environment-driven service graph duplication when a configured dependency is enough.

Measure startup before claiming performance improvements.

## Migration Rules

When converting a project that already has `main_dev.dart`, `main_staging.dart`, etc.:

1. inventory all entry points and platform build variants;
2. capture initialization ordering and environment-specific behavior;
3. extract shared bootstrap without changing behavior;
4. introduce typed immutable configuration;
5. make `lib/main.dart` the shared entry point;
6. move Dart values to the compile-time configuration contract;
7. preserve native identity/resources/build setup;
8. update IDE/CI commands to pass flavor + define file where applicable;
9. validate each environment and final artifact;
10. only then remove obsolete entry points.

Do not collapse native distinctions that are still required.

Read `references/migration-validation-troubleshooting.md` for the full migration phases, validation checklist, failure modes, anti-patterns, and troubleshooting tree.

## Critical Anti-Patterns

Reject these patterns unless a documented repository constraint makes them temporarily necessary:

- `main_dev.dart`, `main_staging.dart`, `main_prod.dart`;
- duplicated bootstrap functions per environment;
- build mode (`kDebugMode`) used to infer deployment environment;
- silent fallback to production;
- `String.fromEnvironment` scattered throughout features;
- services branching on environment everywhere instead of receiving configured dependencies;
- hardcoded production/staging URLs in feature code;
- runtime `.env` asset parsing when configuration is truly build-time fixed;
- build-time secrets embedded with Dart defines;
- scripts that copy/mutate native config files in place before every build;
- manually editing Flutter-generated/ephemeral config as the source of truth;
- assuming web supports `--flavor` like Android/iOS;
- assuming Windows/Linux flavor support on older Flutter versions/templates;
- using unrelated names (`dev`, `stage`, `prod`) across layers without a migration need;
- releasing a production-identity artifact with staging Dart configuration.

## New Environment Procedure

To add `qa`, `preview`, or another persistent build environment:

1. decide whether it truly needs a separate build identity;
2. add one canonical `AppEnvironment` wire value;
3. add its public Dart config file;
4. add native variant/scheme only where native differentiation is required;
5. add matching CI/IDE build rows;
6. add validation/tests;
7. verify identifiers, native SDK registrations, deep links/OAuth redirect registrations, push setup, and store/distribution implications;
8. do **not** create another `main_*.dart`.

## Release Invariants

Before shipment, enforce all of these:

```text
exactly one Dart app entry point
APP_ENV explicitly supplied
strict environment parsing
no silent production fallback
native flavor checked against APP_ENV when available
build mode independent from environment
client config contains no privileged secrets
native identity controlled by native build/package config
CI validates complete build tuple
web does not pretend to have native product flavors
Windows/Linux flavor behavior version-gated
configuration parsed once and passed explicitly
services do not repeatedly inspect global environment state
new environments do not duplicate startup
production artifact verified before distribution
```

## Reference Loading Guide

Read only what the task requires:

- `references/architecture-and-configuration.md` — architecture decisions, typed config implementation, compile-time definitions, bootstrap, dependency boundaries.
- `references/platforms-and-native-integration.md` — Android/iOS/macOS/Web/Windows/Linux implementation, identifiers/resources, Firebase/native SDKs, security.
- `references/workflow-ci-testing-performance.md` — build commands, IDE configs, CI/CD, tests, performance, adding environments.
- `references/migration-validation-troubleshooting.md` — migration, validation, failure modes, anti-patterns, troubleshooting, decision matrix.
- `references/agent-workflow-and-sources.md` — exact AI repository-inspection workflow, final consistency rules, and authoritative source list.

## AI Execution Workflow

When asked to implement flavors/environments in a repository:

1. Inspect the repository and pinned Flutter version first.
2. Build an environment/platform/mode matrix before editing.
3. Decide what belongs in native build config vs Dart compile-time config vs runtime config vs secret management.
4. Preserve existing native identities, signing, entitlements, SDK initialization, and working bootstrap order.
5. Implement the typed Dart configuration boundary and single `main.dart` first.
6. Add or adapt native variants only where required.
7. Add mismatch validation.
8. Update developer/IDE/CI commands.
9. Test configuration parsing and each required platform/environment combination.
10. Inspect production artifact identity and endpoint policy before declaring the migration complete.

Do not report success merely because one local `flutter run` command compiled.
