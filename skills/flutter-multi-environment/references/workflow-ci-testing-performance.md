# Workflow Ci Testing Performance

Developer/build commands, IDE setup, CI/CD, testing strategy, performance, logging, and adding environments.

## Contents

- Development Workflow
- Build Commands
  - Android
  - iOS
  - macOS
  - Windows — Flutter 3.47+
  - Linux — Flutter 3.47+
  - Web
  - Tests
- IDE Configuration
  - VS Code
  - Android Studio / IntelliJ
  - Xcode
- CI/CD
  - Build Matrix
  - Deterministic Builds
  - Pre-build Validation
  - Artifact Naming
  - Secrets
  - Release Gates
- Testing Strategy
  - Unit-test configuration parsing
  - Required configuration test coverage
  - Integration tests
  - Testability rule
- Performance Considerations
  - Compile-time configuration
  - Startup cost
  - Logging
  - Tree shaking
  - Evaluation

---

## Development Workflow

A developer should choose an environment explicitly.

Preferred mental model:

```
environment = development
platform    = android
mode        = debug

```

These are independent values.

A release-mode staging build is valid:

```
environment = staging
platform    = android
mode        = release

```

Flutter's build mode documentation treats debug/profile/release as compilation/performance modes, independently of application deployment environments.

## Build Commands

### Android

Development:

```
flutter run \
  --flavor development \
  --dart-define-from-file=config/development.json

```

Staging APK:

```
flutter build apk \
  --release \
  --flavor staging \
  --dart-define-from-file=config/staging.json

```

Production AAB:

```
flutter build appbundle \
  --release \
  --flavor production \
  --dart-define-from-file=config/production.json

```

Flutter documents Android flavor selection with `flutter run --flavor` and Android flavored APK/App Bundle builds.

### iOS

Development:

```
flutter run \
  --flavor development \
  --dart-define-from-file=config/development.json

```

Staging device build:

```
flutter build ios \
  --release \
  --flavor staging \
  --dart-define-from-file=config/staging.json

```

Production IPA:

```
flutter build ipa \
  --release \
  --flavor production \
  --dart-define-from-file=config/production.json

```

### macOS

Development:

```
flutter run \
  -d macos \
  --flavor development \
  --dart-define-from-file=config/development.json

```

Production:

```
flutter build macos \
  --release \
  --flavor production \
  --dart-define-from-file=config/production.json

```

### Windows — Flutter 3.47+

Development:

```
flutter run \
  -d windows \
  --flavor development \
  --dart-define-from-file=config/development.json

```

Production:

```
flutter build windows \
  --release \
  --flavor production \
  --dart-define-from-file=config/production.json

```

### Linux — Flutter 3.47+

Development:

```
flutter run \
  -d linux \
  --flavor development \
  --dart-define-from-file=config/development.json

```

Production:

```
flutter build linux \
  --release \
  --flavor production \
  --dart-define-from-file=config/production.json

```

### Web

Development:

```
flutter run \
  -d chrome \
  --dart-define-from-file=config/development.json

```

Production:

```
flutter build web \
  --release \
  --dart-define-from-file=config/production.json

```

Do not append `--flavor` to the web build command.

### Tests

Static analysis:

```
flutter analyze

```

Unit/widget tests:

```
flutter test

```

Environment-aware integration test:

```
flutter test integration_test \
  -d <device-id> \
  --dart-define-from-file=config/staging.json

```

On a target whose integration test requires native flavor selection and whose pinned Flutter SDK supports it:

```
flutter test integration_test \
  -d <device-id> \
  --flavor staging \
  --dart-define-from-file=config/staging.json

```

Flutter's current test command registers both Dart define and flavor options. Flutter's official integration test package supports running whole-app tests using `flutter test integration_test`.

For web integration testing, follow Flutter's current browser integration-test workflow rather than assuming native flavor behavior.

## IDE Configuration

### VS Code

Every environment launch configuration should still point to:

```
lib/main.dart

```

Example Android/iOS/macOS flavored launch:

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Flutter: Development",
      "request": "launch",
      "type": "dart",
      "program": "lib/main.dart",
      "toolArgs": [
        "--flavor",
        "development",
        "--dart-define-from-file=config/development.json"
      ]
    },
    {
      "name": "Flutter: Staging",
      "request": "launch",
      "type": "dart",
      "program": "lib/main.dart",
      "toolArgs": [
        "--flavor",
        "staging",
        "--dart-define-from-file=config/staging.json"
      ]
    },
    {
      "name": "Flutter: Production",
      "request": "launch",
      "type": "dart",
      "program": "lib/main.dart",
      "toolArgs": [
        "--flavor",
        "production",
        "--dart-define-from-file=config/production.json"
      ]
    }
  ]
}

```

For Web, create launch configurations without `--flavor`.

For Windows/Linux, use flavored IDE configurations only when the pinned Flutter SDK is 3.47+ and the native project has adopted the corresponding flavor-aware templates/configuration.

### Android Studio / IntelliJ

Create Flutter run configurations that:

```
Dart entrypoint: lib/main.dart
Additional Flutter args:
  --flavor development
  --dart-define-from-file=config/development.json

```

Repeat for staging/production.

The exact UI labels can vary by Flutter/JetBrains plugin version. The invariant is that the run configuration launches the same `lib/main.dart`.

### Xcode

Use the correct shared environment scheme when debugging native Apple behavior.

Do not treat an Xcode scheme environment variable as a substitute for the Dart `APP_ENV` contract unless the repository has explicitly implemented and tested that alternative build integration.

Prefer Flutter CLI/IDE-driven builds for normal Flutter development so Dart define arguments are supplied consistently.

## CI/CD

### Build Matrix

Model CI as:

```
environment × platform × build mode

```

For example:

| EnvironmentPlatformModeNative flavor |               |         |             |
| ------------------------------------ | ------------- | ------- | ----------- |
| development                          | Android       | debug   | development |
| staging                              | Android       | release | staging     |
| production                           | Android       | release | production  |
| staging                              | iOS           | release | staging     |
| production                           | Web           | release | none        |
| production                           | Windows 3.47+ | release | production  |

Do not blindly produce every Cartesian-product combination. Build only combinations that have a deployment/testing purpose.

### Deterministic Builds

CI should:

1. pin the Flutter SDK version;
2. use the repository lockfile according to project policy;
3. select one canonical environment;
4. select the matching public configuration;
5. select the matching native flavor/scheme when applicable;
6. validate configuration before building;
7. inject signing/store credentials separately;
8. run tests;
9. build the artifact;
10. inspect the resolved artifact identity;
11. publish only after release gates pass.

Flutter's continuous-delivery guidance recommends validating build/release workflows before automation and uses platform build commands such as App Bundle and IPA as the build boundary.

### Pre-build Validation

For every release job, assert:

```
job environment             == production
config APP_ENV               == production
native flavor/scheme         == production
expected native app identity == production identity
API policy                   == approved production endpoint
signing identity             == production signing identity

```

For staging, perform the equivalent staging checks.

Do not allow a production artifact to be created from an arbitrary mutable config file supplied by a developer workstation.

### Artifact Naming

Use names that contain enough identity to prevent accidental distribution:

```
example-android-production-release-1.8.0+145.aab
example-ios-staging-release-1.8.0+145.ipa
example-web-production-release-1.8.0+145.zip

```

Artifact filenames are not security boundaries, but they substantially reduce operational ambiguity.

### Secrets

CI secret systems may hold:

- Android signing keystore material;
- signing passwords;
- Apple certificates/private keys;
- provisioning credentials;
- notarization credentials;
- store publishing credentials.

Do not transform those secrets into Dart defines.

### Release Gates

Production release should require:

```
configuration preflight passes
native/Dart environment pair is canonical
static analysis passes
unit tests pass
integration/smoke tests pass
production identifier verified
production endpoint policy verified
production signing verified
artifact generated from pinned toolchain
artifact provenance recorded

```

For high-risk systems, inspect the final artifact rather than trusting source configuration alone.

## Testing Strategy

### Unit-test configuration parsing

`test/config/environment_config_test.dart`:

```
import 'package:flutter_test/flutter_test.dart';

import '../../lib/config/app_config.dart';
import '../../lib/config/app_environment.dart';
import '../../lib/config/environment_config.dart';

void main() {
  group('EnvironmentConfig', () {
    test('parses production configuration', () {
      final config = EnvironmentConfig.parse(
        appEnv: 'production',
        apiBaseUrl: 'https://api.example.com',
        logLevel: 'warning',
        analyticsEnabled: 'true',
        nativeFlavor: 'production',
      );

      expect(
        config.environment,
        AppEnvironment.production,
      );
      expect(
        config.apiBaseUrl,
        Uri.parse('https://api.example.com'),
      );
      expect(
        config.logLevel,
        AppLogLevel.warning,
      );
      expect(config.analyticsEnabled, isTrue);
    });

    test('rejects missing APP_ENV', () {
      expect(
        () => EnvironmentConfig.parse(
          appEnv: null,
          apiBaseUrl: 'https://api.example.com',
        ),
        throwsA(isA<ConfigurationException>()),
      );
    });

    test('rejects unknown APP_ENV', () {
      expect(
        () => EnvironmentConfig.parse(
          appEnv: 'qa',
          apiBaseUrl: 'https://api.example.com',
        ),
        throwsA(isA<ConfigurationException>()),
      );
    });

    test('rejects native flavor mismatch', () {
      expect(
        () => EnvironmentConfig.parse(
          appEnv: 'production',
          apiBaseUrl: 'https://api.example.com',
          nativeFlavor: 'staging',
        ),
        throwsA(isA<ConfigurationException>()),
      );
    });

    test('rejects HTTP in staging', () {
      expect(
        () => EnvironmentConfig.parse(
          appEnv: 'staging',
          apiBaseUrl: 'http://api.staging.example.com',
          nativeFlavor: 'staging',
        ),
        throwsA(isA<ConfigurationException>()),
      );
    });

    test('permits HTTP in development', () {
      final config = EnvironmentConfig.parse(
        appEnv: 'development',
        apiBaseUrl: 'http://10.0.2.2:8080',
        nativeFlavor: 'development',
      );

      expect(
        config.environment,
        AppEnvironment.development,
      );
    });

    test('rejects malformed analytics boolean', () {
      expect(
        () => EnvironmentConfig.parse(
          appEnv: 'production',
          apiBaseUrl: 'https://api.example.com',
          analyticsEnabled: 'yes',
          nativeFlavor: 'production',
        ),
        throwsA(isA<ConfigurationException>()),
      );
    });

    test('applies safe production log default', () {
      final config = EnvironmentConfig.parse(
        appEnv: 'production',
        apiBaseUrl: 'https://api.example.com',
        nativeFlavor: 'production',
      );

      expect(
        config.logLevel,
        AppLogLevel.warning,
      );
    });

    test('analytics is disabled by default', () {
      final config = EnvironmentConfig.parse(
        appEnv: 'development',
        apiBaseUrl: 'https://api.dev.example.com',
        nativeFlavor: 'development',
      );

      expect(config.analyticsEnabled, isFalse);
    });
  });
}

```

### Required configuration test coverage

At minimum test:

```
development valid
staging valid
production valid
missing APP_ENV
invalid APP_ENV
missing API_BASE_URL
invalid URL
native flavor mismatch
malformed bool
malformed enum-like values
production HTTPS policy
staging HTTPS policy
optional defaults

```

### Integration tests

Run integration tests against actual environment builds where practical.

High-value cases:

- app starts;
- resolved environment is expected;
- configured API host is expected;
- environment-specific authentication succeeds;
- push/deep-link configuration is correct;
- Firebase/analytics project is correct;
- no production resources are used by development/staging or vice versa.

Flutter's `integration_test` package is an SDK-supported solution for whole-app testing on mobile, desktop, and web, with platform-specific execution requirements.

### Testability rule

Never make tests depend on changing a global compile-time environment after the process has started.

Test the pure parser directly.

The thin `fromCompileTime()` adapter needs little behavior of its own; the important parsing and validation logic lives in a normal function that accepts explicit values.

## Performance Considerations

### Compile-time configuration

Dart environment declarations are known to the compiler, and constant environment checks can allow unreachable branches to be eliminated.

Do not overstate this.

This:

```
const enabled = bool.fromEnvironment('SOME_BUILD_FEATURE');

if (enabled) {
  // compiler may be able to remove the unreachable branch
}

```

has stronger compile-time optimization potential than:

```
if (config.environment == AppEnvironment.development) {
  // normal runtime property branch
}

```

Do not distort the architecture merely to chase trivial branch elimination.

### Startup cost

Parsing a small set of strings and a URI once is not normally a meaningful Flutter startup bottleneck, but performance claims should be measured in the target application.

More consequential startup decisions include:

- initializing unnecessary SDKs;
- synchronous I/O;
- blocking storage migrations;
- expensive dependency graphs;
- analytics/network initialization;
- loading runtime configuration over the network.

### Logging

Do not equate production with release mode.

Use environment policy to control application logging and build-mode constants for debug instrumentation.

For code that genuinely exists only in debug builds, use `kDebugMode` or assertions according to Flutter guidance. Flutter specifically notes that `kReleaseMode` can make profile and release behavior diverge, reducing performance-test representativeness.

### Tree shaking

Flutter/Dart release builds apply compiler optimizations/tree shaking appropriate to the target.

Do not claim that a dependency is removed merely because its initialization is disabled in `AppConfig`. The compiler must be able to prove code is unreachable.

### Evaluation

This architecture's main advantages are:

| ConcernEffect        |                                                                            |
| -------------------- | -------------------------------------------------------------------------- |
| Startup performance  | minimal configuration work; actual SDK initialization still dominates      |
| Binary optimization  | compatible with compile-time constants; no universal binary-size guarantee |
| Runtime overhead     | one-time parsing plus ordinary immutable configuration access              |
| Build complexity     | moderate because native variants must be maintained                        |
| Developer ergonomics | explicit repeatable commands                                               |
| CI reliability       | strong when matrix/config validation is enforced                           |
| Testability          | strong due to pure parser and explicit dependencies                        |
| Security             | clear separation of config from credentials                                |
| Platform consistency | one Dart contract with native platform adaptations                         |
| Maintainability      | no duplicated app entry points/bootstrap                                   |
| Scalability          | adding an environment primarily changes configuration and native metadata  |
