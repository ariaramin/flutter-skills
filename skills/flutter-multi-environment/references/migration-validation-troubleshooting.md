# Migration Validation Troubleshooting

Migration workflow, validation checklist, common failure modes, anti-patterns, troubleshooting, and decision matrix.

## Contents

- Adding a New Environment
- Migrating an Existing Project
  - Phase 1 — Inventory
  - Phase 2 — Capture existing behavior
  - Phase 3 — Extract shared bootstrap
  - Phase 4 — Add typed configuration
  - Phase 5 — Introduce lib/main.dart
  - Phase 6 — Move environment values out of entry points
  - Phase 7 — Preserve native configuration
  - Phase 8 — Update developer commands
  - Phase 9 — Update CI
  - Phase 10 — Validate before deleting old entry points
- Validation Checklist
- Common Failure Modes
  - Missing APP_ENV
  - Flavor/config mismatch
  - Build mode used as environment
  - Configuration scattered through services
  - Build-time secret injection
  - Manual file mutation
  - Generated-file edits
- Anti-Patterns
  - Environment-specific main_*.dart
  - Duplicated bootstrap functions
  - Hardcoded production URLs
  - Runtime .env parsing without runtime requirements
  - Secrets committed to repositories
  - Large environment-specific if/else trees
  - Duplicated service implementations for configuration-only differences
  - Manual file copying before builds
  - Unsupported flavor assumptions
  - Unrelated environment names
  - Silent fallback to production
  - Production binary targeting staging
- Troubleshooting
  - appFlavor is null
  - Apple flavor fails to build
  - Android flavor cannot find native configuration
  - Windows/Linux --flavor rejected
  - Web --flavor rejected
  - API URL is unexpectedly empty
  - Boolean typo silently changed behavior
- Decision Matrix

---

## Adding a New Environment

Suppose a new environment `preview` is genuinely required.

First decide whether it is an actual deployment environment or merely a runtime feature state.

If it is a deployment environment:

1. add `preview` to `AppEnvironment`;
2. add `config/preview.json`;
3. add validation tests;
4. add Android flavor if Android native identity/resources differ;
5. add Apple shared scheme/build configurations if Apple builds need the environment;
6. add Windows/Linux flavor configuration when using Flutter 3.47+ and native variation is required;
7. configure web deployment target;
8. add native SDK/Firebase registrations as necessary;
9. add CI matrix entry;
10. add IDE launch configuration;
11. validate application identity and service endpoints.

Do not add:

```
main_preview.dart
bootstrap_preview.dart

```

## Migrating an Existing Project

For a repository currently using:

```
lib/main_dev.dart
lib/main_staging.dart
lib/main_prod.dart

```

migrate incrementally.

### Phase 1 — Inventory

Diff the entry points.

Classify every difference as:

```
configuration
initialization policy
root widget configuration
native concern
accidental duplication

```

Do not refactor unrelated application architecture at this stage.

### Phase 2 — Capture existing behavior

Write tests or a migration matrix recording:

```
environment
API URL
app identifier
display name
Firebase project
analytics setting
logging setting
native SDK files
initialization differences

```

This becomes the migration acceptance contract.

### Phase 3 — Extract shared bootstrap

Move identical startup behavior into one bootstrap path.

Do not change environment-specific behavior yet.

### Phase 4 — Add typed configuration

Introduce:

```
AppEnvironment
AppConfig
EnvironmentConfig

```

Make configuration parsing testable.

### Phase 5 — Introduce `lib/main.dart`

Create the single orchestration entry point and route all current initialization through it.

### Phase 6 — Move environment values out of entry points

Move endpoints, feature settings, and client policy to the compile-time configuration contract.

Move native identity/resource behavior into native variants where it belongs.

### Phase 7 — Preserve native configuration

Do not discard existing Android flavors, Apple schemes, Firebase source sets, entitlements, signing, or other native setup merely because Dart entry points have been consolidated.

### Phase 8 — Update developer commands

Replace:

```
flutter run -t lib/main_staging.dart

```

with:

```
flutter run \
  --flavor staging \
  --dart-define-from-file=config/staging.json

```

where native flavor is supported/used.

For web:

```
flutter run \
  -d chrome \
  --dart-define-from-file=config/staging.json

```

### Phase 9 — Update CI

Remove environment-specific Dart target selection.

CI should always target the normal application entry point and express environment through flavor/configuration.

### Phase 10 — Validate before deleting old entry points

Validate every supported environment/platform combination.

Only then remove `main_dev.dart`, `main_staging.dart`, and `main_prod.dart`.

## Validation Checklist

-  Inspect `pubspec.yaml` before making changes.
-  Record Flutter and Dart SDK constraints.
-  Verify the actual Flutter SDK used by CI.
-  Confirm only `lib/main.dart` acts as the application entry point after migration.
-  Confirm development builds use development services.
-  Confirm staging builds use staging services.
-  Confirm production builds use production services.
-  Confirm production cannot silently fall back to staging.
-  Confirm missing `APP_ENV` fails.
-  Confirm invalid `APP_ENV` fails.
-  Confirm native flavor and Dart environment agree.
-  Confirm native identifiers correspond to the selected environment.
-  Confirm app display names/icons are correct where environment-specific.
-  Confirm secrets are not embedded as client configuration.
-  Confirm Android flavor builds succeed.
-  Confirm Apple scheme/configuration builds succeed.
-  Confirm macOS entitlements/signing remain correct.
-  Confirm Web configuration is validated independently and does not use `flutter build web --flavor`.
-  Confirm Windows/Linux flavor usage matches the project's pinned Flutter version.
-  Confirm Windows/Linux packaging metadata is intentionally configured.
-  Confirm Firebase/native SDK configuration matches each native identifier.
-  Confirm development Firebase/native services cannot write to production unintentionally.
-  Confirm `flutter analyze` passes.
-  Confirm configuration unit tests pass.
-  Confirm relevant integration tests pass.
-  Confirm release build commands are documented.
-  Confirm CI reproduces local builds deterministically.
-  Confirm production release gates inspect expected application identity.
-  Confirm production release gates verify approved production endpoint policy.
-  Confirm signing credentials remain outside Dart defines/client config.
-  Confirm adding a new environment does not require another Dart entry point.

## Common Failure Modes

### Missing `APP_ENV`

Bad:

```
const env = String.fromEnvironment(
  'APP_ENV',
  defaultValue: 'production',
);

```

Why it is dangerous:

A forgotten build argument becomes a production application.

Required behavior:

```
missing APP_ENV → configuration error

```

### Flavor/config mismatch

Example:

```
--flavor production
--dart-define-from-file=config/staging.json

```

The application must reject startup because:

```
appFlavor = production
APP_ENV   = staging

```

CI should catch this before artifact publication.

### Build mode used as environment

Bad:

```
final baseUrl = kReleaseMode
    ? productionUrl
    : stagingUrl;

```

Why it is wrong:

A staging release build becomes production.

### Configuration scattered through services

Bad:

```
if (env == AppEnvironment.production) { ... }

```

repeated throughout networking, repositories, analytics, state management, and UI.

Instead resolve concrete dependencies once in the composition root.

### Build-time secret injection

Bad:

```
flutter build appbundle \
  --dart-define=BACKEND_ADMIN_SECRET="$SECRET"

```

The CI variable was secret before compilation. The client value is not.

### Manual file mutation

Bad:

```
copy staging google-services.json → google-services.json
build
copy production google-services.json → google-services.json
build

```

This is race-prone, workspace-state dependent, and easy to ship incorrectly.

Use platform build-variant/resource mechanisms or deterministic generated configuration.

### Generated-file edits

Do not make permanent project configuration by modifying Flutter-generated/ephemeral files that the tool can overwrite.

Modify stable project-level build configuration.

## Anti-Patterns

### Environment-specific `main_*.dart`

Reject by default.

They duplicate orchestration and eventually diverge in:

- error handling;
- initialization order;
- analytics setup;
- dependency registration;
- framework initialization;
- plugin initialization.

They are unnecessary when environment differences are configuration.

### Duplicated bootstrap functions

Reject:

```
bootstrapDevelopment()
bootstrapStaging()
bootstrapProduction()

```

unless the startup processes are genuinely different applications rather than environments of one application.

### Hardcoded production URLs

Reject production URLs embedded throughout networking code.

A public production URL may safely exist in a committed config file, but it should still be centralized and validated.

### Runtime `.env` parsing without runtime requirements

Reject by default.

Using `flutter_dotenv` or equivalent does not make configuration secret and is not required for compile-time environment selection.

### Secrets committed to repositories

Reject.

Also reject secret-looking values passed to Dart defines merely because the file itself is ignored.

### Large environment-specific `if/else` trees

Reject.

Map environment to immutable configuration and construct the correct dependencies at the composition root.

### Duplicated service implementations for configuration-only differences

Reject:

```
DevelopmentApiService
StagingApiService
ProductionApiService

```

when the only difference is `baseUrl`.

Use one implementation with injected configuration.

### Manual file copying before builds

Reject unless an authoritative SDK/build process explicitly requires a controlled generation/copy step and the result is deterministic.

Prefer source sets, Xcode configuration, build-system resources, or generated options.

### Unsupported flavor assumptions

Reject version-blind statements such as:

```
Flutter flavors only work on Android/iOS

```

and:

```
Flutter --flavor works identically everywhere

```

Both are now inaccurate.

Flutter 3.47 supports desktop flavor plumbing on Windows/Linux, while Web build remains different.

### Unrelated environment names

Avoid:

```
Android: dev
iOS: staging
Dart: stage
CI: preprod

```

for the same logical environment.

Canonical names eliminate an entire class of mapping bugs.

### Silent fallback to production

Never permit it.

### Production binary targeting staging

Treat this as a release-blocking defect.

## Troubleshooting

### `appFlavor` is null

Check:

1. whether the platform/build command actually received `--flavor`;
2. whether the pinned Flutter SDK supports flavor on that target;
3. whether Apple scheme names are shared/lowercase as required;
4. whether Windows/Linux is using Flutter 3.47+;
5. whether the application is Web, where flavor should not be the primary mechanism.

A null `appFlavor` is acceptable for define-only targets such as Web because `APP_ENV` remains required.

### Apple flavor fails to build

Inspect:

```
shared scheme existence
scheme spelling/case
Debug/Profile/Release configuration mapping
Flutter xcconfig inheritance
Podfile custom build-configuration mappings
bundle identifier
provisioning/signing
native SDK resource membership

```

Do not fix it by bypassing Flutter-generated settings wholesale.

### Android flavor cannot find native configuration

Inspect the exact variant name and Android source-set hierarchy.

Remember that the actual variant may combine:

```
product flavor × build type

```

Android defines source-set merge precedence for build variants.

### Windows/Linux `--flavor` rejected

Check:

```
flutter --version
flutter build windows --help
flutter build linux --help

```

Flutter 3.47 contains the flavor support described here. Older SDKs may not.

Do not force new commands into an older pinned repository without either upgrading or using its existing architecture.

### Web `--flavor` rejected

Remove it.

Use:

```
--dart-define-from-file=config/<environment>.json

```

### API URL is unexpectedly empty

Confirm the build command actually supplies `API_BASE_URL`.

`String.fromEnvironment` does not read ordinary runtime OS environment variables.

### Boolean typo silently changed behavior

Do not use a permissive default for safety-sensitive booleans.

Use `bool.hasEnvironment` plus strict string parsing as shown in this skill.

## Decision Matrix

| ConcernDart DefineNative Flavor / Build ConfigRuntime ConfigCI Secret |                                 |                                     |                                   |                                                |
| --------------------------------------------------------------------- | ------------------------------- | ----------------------------------- | --------------------------------- | ---------------------------------------------- |
| `APP_ENV`                                                             | **yes**                         | mirrored as flavor where supported  | no                                | no                                             |
| API base URL                                                          | **yes, normally**               | no unless native SDK needs it       | only if intentionally mutable     | no                                             |
| Dart feature flag                                                     | yes for build-fixed behavior    | no unless native code also needs it | yes for server-controlled rollout | no                                             |
| Logging policy                                                        | yes                             | rarely                              | optionally remote-adjustable      | no                                             |
| Analytics enablement                                                  | yes                             | native too if SDK requires it       | possible if product supports it   | no                                             |
| Android application ID                                                | no                              | **yes**                             | no                                | no                                             |
| Apple bundle ID                                                       | no                              | **yes**                             | no                                | no                                             |
| Windows/Linux package identity                                        | not by itself                   | native/build/package config         | no                                | no                                             |
| App display name                                                      | optionally mirrored             | **normally native**                 | no                                | no                                             |
| App icon                                                              | no                              | **native resource**                 | no                                | no                                             |
| Native SDK config                                                     | sometimes Dart options          | **yes when native-bound**           | only if SDK supports it safely    | provisioning input may come from CI            |
| Firebase client config                                                | yes/generated where appropriate | yes for native files/identity       | supported in some SDK scenarios   | **not generally a secret**                     |
| OAuth public client ID                                                | yes and/or native metadata      | often native redirect config too    | possible                          | no                                             |
| OAuth confidential client secret                                      | **never**                       | **never**                           | never deliver to client           | backend only                                   |
| Signing key/private cert                                              | never                           | build system references it          | never                             | **yes**                                        |
| Keystore password                                                     | never                           | no source-code embedding            | never                             | **yes**                                        |
| Backend privileged secret                                             | **never**                       | **never**                           | **never deliver to client**       | backend secret management                      |
| Service-account private key                                           | **never**                       | **never**                           | **never deliver to client**       | backend/CI only if required for server tooling |
