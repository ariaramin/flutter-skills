# Architecture And Configuration

Architecture, single-entrypoint configuration, typed environment model, compile-time definitions, bootstrap, implementation, and dependency boundaries.

## Contents

- Purpose
- Core Principles
- When to Use This Skill
- When Not to Use This Skill
- Architecture Decision
  - Decision
  - Why not make native flavor the only source of truth?
  - Why not make Dart defines the only mechanism?
- Resolved Design Questions
  - 1. Flavors, Dart defines, or both?
  - 2. What is the source of truth for AppEnvironment?
  - 3. How is drift between native flavor and Dart configuration prevented?
  - 4. Can Flutter read the selected flavor directly from Dart?
  - 5. When is --dart-define-from-file preferable?
  - 6. Which configuration belongs in Dart?
  - 7. Which configuration belongs in native projects?
  - 8. Which configuration belongs in CI/CD?
  - 9. What must never be embedded as Flutter client configuration?
  - 10. How does Web differ?
  - 11. What flavor capabilities exist on desktop?
  - 12. How should release mismatches be detected?
  - 13. How is a new environment added?
  - 14. How should integration tests select environments?
  - 15. What architecture best balances simplicity and scalability?
- Environment Model
- Single Entry-Point Strategy
- Configuration Precedence
- Compile-Time Configuration
  - --dart-define
  - --dart-define-from-file
  - String.fromEnvironment
  - bool.fromEnvironment
  - int.fromEnvironment
- Configuration Contract
- Bootstrap Architecture
- Recommended Project Structure
- Implementation
  - main.dart
  - AppEnvironment
  - AppConfig
  - Environment Parsing
  - Validation
  - Bootstrap
  - Dependency Injection

---

# Flutter Multi-Environment Architecture

## Purpose

Use this skill to implement, migrate, review, or maintain a Flutter application that supports multiple deployment environments—typically `development`, `staging`, and `production`—while retaining exactly one Dart application entry point:

```
lib/main.dart

```

Do not introduce environment-specific entry points such as:

```
lib/main_dev.dart
lib/main_staging.dart
lib/main_prod.dart

```

The architecture in this skill separates four concerns that must not be conflated:

```
Build flavor
≠
Dart compile-time configuration
≠
runtime configuration
≠
secret management

```

The design is based on current Flutter/Dart behavior and verified against Flutter 3.47.0, tagged August 11, 2026. Flutter 3.47 is especially important because Windows and Linux flavor plumbing was added in that release cycle. An agent modifying an existing repository MUST inspect the project's pinned Flutter version before assuming these newer desktop capabilities are available.

## Core Principles

1. `lib/main.dart` is the only Dart application entry point.
2. Dart application behavior is selected through strongly typed compile-time configuration.
3. `APP_ENV` is the authoritative Dart-side environment declaration.
4. Native flavors/build configurations control native packaging concerns where applicable.
5. The canonical environment name must be identical everywhere: `development`, `staging`, `production`.
6. On platforms with native flavor support, `appFlavor` is used as an independent consistency check against `APP_ENV`.
7. Missing or malformed configuration fails closed. Never silently default to production or another environment.
8. Configuration is immutable after startup.
9. Environment decisions are centralized in the configuration/composition layer rather than scattered throughout business logic.
10. Build mode and application environment are independent dimensions.
11. Build-time configuration is not secret storage.
12. Client-side authorization decisions must never depend solely on environment or feature-flag values that an attacker can inspect or manipulate.
13. Native configuration stays native when it concerns identifiers, signing, entitlements, native resources, packaging, or SDK configuration that must exist before Dart starts.
14. CI/CD owns deterministic orchestration, release gates, and sensitive build credentials.
15. Prefer incremental modification of existing working projects over platform-directory regeneration or architectural rewrites.

Flutter's `kDebugMode`, `kProfileMode`, and `kReleaseMode` describe compilation/build modes. They do **not** mean development, staging, or production. A staging build can legitimately be a release-mode binary, and production may occasionally be built in profile mode for controlled investigation. Flutter documents all three as compile-time constants.

## When to Use This Skill

Use this architecture when one codebase needs separately buildable application environments with different endpoints, client configuration, application identities, analytics destinations, native SDK configuration, or similar deployment settings.

It works particularly well when development and staging builds need to coexist with production on a device, when CI must deterministically produce environment-specific artifacts, or when a large application needs configuration without duplicating startup logic.

## When Not to Use This Skill

Do not model an environment as a build flavor when the value must legitimately change after the application has been built.

Examples include:

- user-selectable tenant/server instances;
- remotely managed feature rollout percentages;
- runtime region discovery;
- configuration delivered after authentication;
- dynamic enterprise provisioning;
- server-driven experimentation.

Those are runtime configuration concerns.

A runtime configuration system may coexist with this architecture, but build identity such as `APP_ENV`, package identifiers, signing identity, and environment isolation must remain deterministic.

Do not introduce a runtime `.env` parser merely to replace compile-time Dart defines. If configuration does not need to change after compilation, runtime asset parsing adds startup work, another failure mode, asset exposure, and synchronization complexity without improving secrecy.

## Architecture Decision

### Decision

Use a combination of:

```
Canonical CI/developer environment selection
                 │
                 ├── Native flavor/build configuration
                 │   └── native identity/resources/signing/SDK settings
                 │
                 └── Dart compile-time configuration
                     └── APP_ENV/API endpoint/typed app behavior

```

For Dart application behavior, `APP_ENV` is the source of truth.

For native identity and native build behavior, the platform's build system is the source of truth.

The build command or CI matrix row is the orchestration source of truth that must provide both values consistently.

On platforms where Flutter exposes a flavor through `appFlavor`, compare it with `APP_ENV` and terminate startup if they disagree.

This is an **engineering architecture derived from documented Flutter behavior**, not a Flutter requirement that every application must use this exact contract.

### Why not make native flavor the only source of truth?

Flutter exposes the selected flavor through `package:flutter/services.dart` as `appFlavor`, which is backed by the `FLUTTER_APP_FLAVOR` compilation environment declaration. This is useful and should be validated.

However, native flavor semantics are not identical across every target. Android uses product flavors; Apple platforms map Flutter flavors onto Xcode schemes/build configurations; Flutter 3.47 introduced Windows/Linux desktop flavor plumbing; and `flutter build web` still has Dart/web define support without a corresponding flavor option.

`APP_ENV` therefore provides the cleanest portable Dart contract, while `appFlavor` provides a second signal on flavored targets.

### Why not make Dart defines the only mechanism?

Dart defines cannot change:

- Android application IDs by themselves;
- Apple bundle identifiers by themselves;
- app signing identities;
- Android resource source sets;
- Xcode entitlements;
- native app icons;
- package manifests;
- native SDK initialization that occurs before Dart startup.

Those concerns belong to the native build system.

## Resolved Design Questions

### 1. Flavors, Dart defines, or both?

Use **both** where native environment variation exists.

Use Dart compile-time declarations for Dart application configuration. Use native flavors/build configurations for native application identity and native build concerns.

Web remains primarily Dart-define driven.

### 2. What is the source of truth for `AppEnvironment`?

`APP_ENV`.

Parse it once into an `AppEnvironment` enum at startup. Do not derive Dart environment implicitly from API URLs, app labels, build mode, or package identifiers.

### 3. How is drift between native flavor and Dart configuration prevented?

Use the same canonical environment name in the build matrix and pass it to both systems.

For example:

```
environment = staging

native flavor = staging
APP_ENV      = staging

```

Then verify:

```
if (nativeFlavor != null &&
    nativeFlavor != configuration.environment.wireName) {
  throw ConfigurationException(...);
}

```

CI must also run a preflight validation before the release artifact is published.

### 4. Can Flutter read the selected flavor directly from Dart?

Yes. Flutter exposes `appFlavor` from `package:flutter/services.dart`. It is `null` when no flavor is supplied.

Do not use that fact to pretend every platform has identical native flavor semantics.

### 5. When is `--dart-define-from-file` preferable?

Use it when an environment has several stable client configuration values. It creates an auditable configuration bundle and avoids long command lines and shell-quoting differences.

Use individual `--dart-define` arguments for a small number of explicit overrides.

In Flutter 3.47, `--dart-define-from-file` accepts `.json` and `.env` files, can be repeated, and an explicit `--dart-define` with the same key takes precedence over a value loaded from a file.

### 6. Which configuration belongs in Dart?

Examples:

- application environment;
- public API base URL;
- Dart feature policy;
- log level;
- analytics enablement policy;
- observability policy;
- public client identifiers used from Dart;
- client-visible experiment configuration that is intentionally build-specific.

### 7. Which configuration belongs in native projects?

Examples:

- Android application ID;
- Apple bundle identifier;
- desktop native/package identity;
- app display name where represented by native metadata;
- icons and native resources;
- manifest placeholders;
- entitlements/capabilities;
- URL schemes;
- signing configuration references;
- native SDK configuration required before Dart startup.

### 8. Which configuration belongs in CI/CD?

CI owns:

- environment/build matrix selection;
- exact Flutter SDK version;
- build mode;
- flavor/scheme selection;
- which public define file is passed;
- signing credentials;
- store credentials;
- certificates and provisioning inputs;
- release policy;
- artifact naming;
- release approvals;
- preflight mismatch validation.

### 9. What must never be embedded as Flutter client configuration?

Never embed genuinely confidential backend credentials, service-account private keys, privileged server API secrets, confidential OAuth client secrets, signing private keys, keystore passwords, or equivalent server-side credentials.

### 10. How does Web differ?

Compile a separate web artifact for each build environment using Dart defines.

Do not use `flutter build web --flavor`. Flutter 3.47's web build command exposes Dart defines and `--web-define`, but not `usesFlavorOption()`.

### 11. What flavor capabilities exist on desktop?

- macOS: official Flutter flavor workflow through Xcode schemes/build configurations.
- Windows: Flutter 3.47 added `--flavor` build/run plumbing, flavor-namespaced output, and flavored binary naming.
- Linux: Flutter 3.47 added `--flavor` build/run plumbing; generated templates propagate `FLUTTER_APP_FLAVOR`, flavor binary naming, and a suffixed `APPLICATION_ID`.
- Older Flutter versions do not necessarily have Windows/Linux support.

Windows flavor-specific icons, package manifests, installer configuration, and similar assets remain project responsibilities. Linux flavor-specific icons, `.desktop` files, and distribution packaging likewise remain project responsibilities.

### 12. How should release mismatches be detected?

Use three layers:

```
pre-build CI validation
        +
runtime APP_ENV ↔ appFlavor validation
        +
post-build/native artifact verification

```

A production pipeline must explicitly check the environment config, expected native variant, expected production application identifier, expected production endpoint policy, and signing identity before publishing.

Do not rely solely on runtime failure.

### 13. How is a new environment added?

Add:

- one enum value;
- one public configuration file;
- the necessary native variant/build configuration;
- corresponding CI matrix rows;
- validation/tests.

Do not create another `main_*.dart`.

### 14. How should integration tests select environments?

Pass the same Dart define file as the application build. Where the target uses native flavor configuration, also select the corresponding flavor.

Flutter's current test command accepts both Dart define and flavor options, and `integration_test` remains Flutter's SDK-supported whole-app testing mechanism. Verify support against the repository's pinned SDK before changing older CI jobs.

### 15. What architecture best balances simplicity and scalability?

A strongly typed immutable `AppConfig`, populated once from compile-time declarations, validated against native flavor when available, and passed through the application's composition root.

Use native variants only for genuinely native variation.

That avoids both extremes:

```
everything in native flavors

```

and:

```
everything in Dart if/else statements

```

## Environment Model

Use an enum with canonical wire names:

```
enum AppEnvironment {
  development('development'),
  staging('staging'),
  production('production');

  const AppEnvironment(this.wireName);

  final String wireName;

  static AppEnvironment? tryParse(String value) {
    for (final environment in values) {
      if (environment.wireName == value) {
        return environment;
      }
    }
    return null;
  }
}

```

Keep canonical names lowercase and identical across:

- `APP_ENV`;
- Flutter `--flavor`;
- Android product flavor names;
- Apple scheme names;
- Windows/Linux flavor names when supported;
- CI matrix values;
- public config filenames.

Avoid translations such as:

```
dev → development
stage → staging
prod → production

```

unless an existing repository already depends on them and a temporary migration mapping is necessary.

## Single Entry-Point Strategy

`lib/main.dart` should do only orchestration:

1. read compile-time configuration;
2. read `appFlavor`;
3. parse and validate configuration;
4. reject environment/flavor mismatch;
5. pass the immutable configuration into the application bootstrap.

Recommended:

```
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

Do not add target-specific entry points.

Do not put a large environment switch into `main()`.

## Configuration Precedence

Use this precedence model:

```
1. CI/developer selects canonical environment
2. native flavor/scheme receives that environment where supported
3. --dart-define-from-file supplies the Dart configuration contract
4. explicit --dart-define may override a file value intentionally
5. Dart parser validates APP_ENV
6. appFlavor is checked against APP_ENV when non-null
7. runtime remote configuration may alter only explicitly runtime-mutable policy

```

Flutter's current tool explicitly defines individual `--dart-define` values as higher precedence than matching keys from `--dart-define-from-file`.

Because overrides can create hidden differences between local and CI builds, use them sparingly. Production CI should normally derive a complete deterministic configuration from version-controlled or deterministically generated input rather than accumulate ad-hoc overrides.

## Compile-Time Configuration

Dart environment declarations are compilation configuration, not operating-system process environment variables. Dart documents `String.fromEnvironment`, `bool.fromEnvironment`, `int.fromEnvironment`, and `bool.hasEnvironment` as compile-time environment declaration APIs. They are guaranteed when invoked in constant contexts.

Dart compilers can use compile-time environment values to remove branches that are provably unreachable. That does not mean arbitrary dependencies disappear merely because a configuration object contains an environment value.

### `--dart-define`

Example:

```
flutter run \
  --dart-define=APP_ENV=development \
  --dart-define=API_BASE_URL=https://api.dev.example.com

```

Prefer repeating the argument:

```
--dart-define=KEY_A=value \
--dart-define=KEY_B=value

```

Current Flutter tooling configures this as a repeatable multi-option with comma splitting disabled.

Use this form when:

- there are very few values;
- a CI job needs one explicit public override;
- debugging a build locally;
- temporarily testing configuration behavior.

Do not use it for confidential values.

### `--dart-define-from-file`

Preferred for a normal multi-value environment:

```
flutter run \
  --dart-define-from-file=config/development.json

```

Flutter 3.47 accepts `.json` and `.env` files and allows the option to be repeated. Explicit `--dart-define` values win on key collisions.

Prefer JSON for committed public configuration because it is structured, reviewable, and less dependent on shell conventions.

Example:

```
{
  "APP_ENV": "development",
  "API_BASE_URL": "https://api.dev.example.com",
  "LOG_LEVEL": "debug",
  "ANALYTICS_ENABLED": "false"
}

```

Equivalent `.env`-style files are supported by current Flutter tooling, but this is still **build-time compilation configuration**. It is not the same architectural pattern as bundling an `.env` asset and parsing it after startup.

### `String.fromEnvironment`

Example:

```
const environmentName = String.fromEnvironment('APP_ENV');

```

Do not scatter calls like this across the codebase.

Centralize all environment declaration access in one boundary such as `EnvironmentConfig.fromCompileTime()`.

Dart's own `do_not_use_environment` lint warns about the hidden-global-state effect of environment declarations. Centralizing the declarations and immediately converting them into an explicit typed dependency avoids propagating that global-state model throughout the application. This centralization is engineering guidance derived from Dart's documented behavior.

### `bool.fromEnvironment`

`bool.fromEnvironment` recognizes supported boolean strings and otherwise falls back to its default. This can accidentally turn malformed input into a valid-looking value.

For strict production configuration, prefer:

```
const exists = bool.hasEnvironment('ANALYTICS_ENABLED');
const rawValue = String.fromEnvironment('ANALYTICS_ENABLED');

```

and then parse `true`/`false` yourself.

### `int.fromEnvironment`

`int.fromEnvironment` is appropriate when fallback semantics are deliberately acceptable.

When a number is operationally critical, read it as a string and validate it explicitly so malformed or missing input cannot silently use a default.

## Configuration Contract

Recommended baseline:

| KeyRequiredAllowed valuesDefault |     |                                                     |                    |
| -------------------------------- | --- | --------------------------------------------------- | ------------------ |
| `APP_ENV`                        | yes | `development`, `staging`, `production`              | none               |
| `API_BASE_URL`                   | yes | absolute `http`/`https` URI                         | none               |
| `LOG_LEVEL`                      | no  | `trace`, `debug`, `info`, `warning`, `error`, `off` | environment policy |
| `ANALYTICS_ENABLED`              | no  | exact `true` or `false`                             | `false`            |

Production and staging API URLs should require HTTPS unless the application's documented network architecture gives a specific reason otherwise.

Development may permit HTTP because local/emulator services commonly require it; platform cleartext/network-security configuration remains a separate native concern.

If an optional value is safety-, privacy-, or compliance-critical for a particular repository, promote it to a required value rather than relying on a default.

Never infer `APP_ENV` from `API_BASE_URL`.

Never make missing `APP_ENV` mean production.

## Bootstrap Architecture

The composition root owns initialization sequencing.

Recommended order:

```
parse configuration
→ validate environment/flavor agreement
→ initialize WidgetsFlutterBinding
→ initialize critical platform/native bridges
→ initialize dependency container
→ initialize networking
→ initialize storage
→ initialize logging/observability
→ initialize analytics/crash reporting as policy permits
→ initialize optional SDKs
→ construct root widget
→ runApp

```

The exact dependency order varies by repository. Preserve existing ordering when it is intentional.

Do not initialize an SDK and then attempt to disable it later if initialization itself sends data or performs environment-specific work.

Failure policy:

- malformed build configuration: fatal;
- native/Dart environment mismatch: fatal;
- required infrastructure initialization failure: normally fatal;
- genuinely optional observability failure: repository policy may allow degraded startup.

Configuration must be validated before connecting to backend services.

## Recommended Project Structure

```
lib/
├── main.dart
├── app/
│   ├── app.dart
│   └── bootstrap.dart
├── config/
│   ├── app_config.dart
│   ├── app_environment.dart
│   └── environment_config.dart
└── ...

config/
├── development.json
├── staging.json
└── production.json

test/
└── config/
    └── environment_config_test.dart

```

Do not mechanically create these files if the repository already has a clean equivalent architecture. Adapt existing naming and dependency boundaries.

## Implementation

### `main.dart`

```
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

This assumes the existing root `App` widget is changed to accept the immutable `AppConfig`.

Do not replace an existing application's UI merely to match this example.

### `AppEnvironment`

`lib/config/app_environment.dart`:

```
enum AppEnvironment {
  development('development'),
  staging('staging'),
  production('production');

  const AppEnvironment(this.wireName);

  final String wireName;

  static AppEnvironment? tryParse(String value) {
    for (final environment in values) {
      if (environment.wireName == value) {
        return environment;
      }
    }
    return null;
  }
}

```

### `AppConfig`

`lib/config/app_config.dart`:

```
import 'app_environment.dart';

enum AppLogLevel {
  trace,
  debug,
  info,
  warning,
  error,
  off;

  static AppLogLevel? tryParse(String value) {
    for (final level in values) {
      if (level.name == value) {
        return level;
      }
    }
    return null;
  }
}

final class AppConfig {
  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.logLevel,
    required this.analyticsEnabled,
  });

  final AppEnvironment environment;
  final Uri apiBaseUrl;
  final AppLogLevel logLevel;
  final bool analyticsEnabled;

  bool get isProduction => environment == AppEnvironment.production;
}

```

The object is immutable. Do not expose setters or replace it at runtime.

### Environment Parsing

`lib/config/environment_config.dart`:

```
import 'app_config.dart';
import 'app_environment.dart';

final class ConfigurationException implements Exception {
  const ConfigurationException(this.message);

  final String message;

  @override
  String toString() => 'ConfigurationException: $message';
}

final class EnvironmentConfig {
  const EnvironmentConfig._();

  static AppConfig fromCompileTime({
    String? nativeFlavor,
  }) {
    const hasAppEnv = bool.hasEnvironment('APP_ENV');
    const appEnv = String.fromEnvironment('APP_ENV');

    const hasApiBaseUrl = bool.hasEnvironment('API_BASE_URL');
    const apiBaseUrl = String.fromEnvironment('API_BASE_URL');

    const hasLogLevel = bool.hasEnvironment('LOG_LEVEL');
    const logLevel = String.fromEnvironment('LOG_LEVEL');

    const hasAnalyticsEnabled =
        bool.hasEnvironment('ANALYTICS_ENABLED');
    const analyticsEnabled =
        String.fromEnvironment('ANALYTICS_ENABLED');

    return parse(
      appEnv: hasAppEnv ? appEnv : null,
      apiBaseUrl: hasApiBaseUrl ? apiBaseUrl : null,
      logLevel: hasLogLevel ? logLevel : null,
      analyticsEnabled:
          hasAnalyticsEnabled ? analyticsEnabled : null,
      nativeFlavor: nativeFlavor,
    );
  }

  static AppConfig parse({
    required String? appEnv,
    required String? apiBaseUrl,
    String? logLevel,
    String? analyticsEnabled,
    String? nativeFlavor,
  }) {
    final rawEnvironment = _required(
      key: 'APP_ENV',
      value: appEnv,
    );

    final environment = AppEnvironment.tryParse(rawEnvironment);
    if (environment == null) {
      throw ConfigurationException(
        'APP_ENV must be one of '
        '${AppEnvironment.values.map((e) => e.wireName).join(', ')}; '
        'received "$rawEnvironment".',
      );
    }

    if (nativeFlavor != null &&
        nativeFlavor.isNotEmpty &&
        nativeFlavor != environment.wireName) {
      throw ConfigurationException(
        'Native Flutter flavor "$nativeFlavor" does not match '
        'APP_ENV "${environment.wireName}".',
      );
    }

    final apiUri = _parseApiBaseUrl(
      raw: _required(
        key: 'API_BASE_URL',
        value: apiBaseUrl,
      ),
      environment: environment,
    );

    final parsedLogLevel = logLevel == null
        ? _defaultLogLevel(environment)
        : _parseLogLevel(logLevel);

    final parsedAnalyticsEnabled = analyticsEnabled == null
        ? false
        : _parseStrictBool(
            key: 'ANALYTICS_ENABLED',
            value: analyticsEnabled,
          );

    return AppConfig(
      environment: environment,
      apiBaseUrl: apiUri,
      logLevel: parsedLogLevel,
      analyticsEnabled: parsedAnalyticsEnabled,
    );
  }

  static String _required({
    required String key,
    required String? value,
  }) {
    if (value == null || value.isEmpty) {
      throw ConfigurationException(
        '$key is required and has no default.',
      );
    }

    if (value != value.trim()) {
      throw ConfigurationException(
        '$key must not contain leading or trailing whitespace.',
      );
    }

    return value;
  }

  static Uri _parseApiBaseUrl({
    required String raw,
    required AppEnvironment environment,
  }) {
    final uri = Uri.tryParse(raw);

    if (uri == null ||
        !uri.hasScheme ||
        uri.host.isEmpty ||
        (uri.scheme != 'http' && uri.scheme != 'https')) {
      throw ConfigurationException(
        'API_BASE_URL must be an absolute HTTP(S) URI; '
        'received "$raw".',
      );
    }

    if (uri.userInfo.isNotEmpty ||
        uri.query.isNotEmpty ||
        uri.fragment.isNotEmpty) {
      throw ConfigurationException(
        'API_BASE_URL must not contain credentials, '
        'a query string, or a fragment.',
      );
    }

    if (environment != AppEnvironment.development &&
        uri.scheme != 'https') {
      throw ConfigurationException(
        '${environment.wireName} API_BASE_URL must use HTTPS.',
      );
    }

    return uri;
  }

  static AppLogLevel _parseLogLevel(String raw) {
    if (raw != raw.trim()) {
      throw ConfigurationException(
        'LOG_LEVEL must not contain leading or trailing whitespace.',
      );
    }

    final level = AppLogLevel.tryParse(raw);
    if (level == null) {
      throw ConfigurationException(
        'LOG_LEVEL must be one of '
        '${AppLogLevel.values.map((value) => value.name).join(', ')}; '
        'received "$raw".',
      );
    }

    return level;
  }

  static bool _parseStrictBool({
    required String key,
    required String value,
  }) {
    return switch (value) {
      'true' => true,
      'false' => false,
      _ => throw ConfigurationException(
          '$key must be exactly "true" or "false"; '
          'received "$value".',
        ),
    };
  }

  static AppLogLevel _defaultLogLevel(
    AppEnvironment environment,
  ) {
    return switch (environment) {
      AppEnvironment.development => AppLogLevel.debug,
      AppEnvironment.staging => AppLogLevel.info,
      AppEnvironment.production => AppLogLevel.warning,
    };
  }
}

```

### Validation

The parser must reject:

```
missing APP_ENV
unknown APP_ENV
missing API_BASE_URL
invalid URI
non-HTTP(S) URI
non-HTTPS staging URL
non-HTTPS production URL
native flavor mismatch
malformed boolean values
unknown logging levels
whitespace-corrupted canonical values

```

The validation should be pure Dart so it can be tested without booting Flutter or touching platform channels.

### Bootstrap

`lib/app/bootstrap.dart`:

```
import 'dart:async';

import 'package:flutter/widgets.dart';

import '../config/app_config.dart';

typedef AppInitializer = FutureOr<void> Function(
  AppConfig config,
);

typedef AppFactory = Widget Function(
  AppConfig config,
);

Future<void> bootstrap({
  required AppConfig config,
  required AppFactory appFactory,
  Iterable<AppInitializer> initializers =
      const <AppInitializer>[],
}) async {
  WidgetsFlutterBinding.ensureInitialized();

  for (final initialize in initializers) {
    await initialize(config);
  }

  runApp(appFactory(config));
}

```

This bootstrap is intentionally infrastructure-agnostic.

For an existing application, preserve its initialization code by moving the existing calls into ordered initializers or by extending the composition root directly.

Do not create three environment-specific bootstrap functions.

### Dependency Injection

Register/pass the already parsed `AppConfig` as an immutable dependency.

Good:

```
AppConfig
  ↓
API client configuration
analytics initializer
logging initializer
repository composition
feature policy

```

Avoid:

```
if (environment == AppEnvironment.production) {
  // ...
}

```

inside dozens of services.

A service that only needs a URL should normally receive the URL or a configured client rather than the entire environment.

For example:

```
final class ApiClientConfig {
  const ApiClientConfig({
    required this.baseUrl,
  });

  final Uri baseUrl;
}

```

Build that value in the composition root from `AppConfig`.

This reduces environment coupling and makes services straightforward to test.
