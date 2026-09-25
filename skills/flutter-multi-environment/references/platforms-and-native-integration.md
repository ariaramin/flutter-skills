# Platforms And Native Integration

Platform capability matrix; Android, iOS, macOS, web, Windows, Linux; native identity/resources; Firebase/native SDK integration; secret-management boundaries.

## Contents

- Configuration Files
- Platform Capability Matrix
- Platform Configuration
  - Android
  - iOS
  - macOS
  - Web
  - Windows
  - Linux
- Android Product Flavors
- Apple Schemes and Build Configurations
- Application IDs and Bundle IDs
- Native Resources
- Firebase / Native SDK Configuration
  - FlutterFire initialization
  - Android Firebase configuration
  - Apple Firebase configuration
  - Web Firebase configuration
  - Firebase API keys are not generic secrets
- Security and Secret Management
  - Build-time variables are not secure secrets
  - Appropriate client configuration
  - Values that must not be embedded
  - Where secrets belong

---

## Configuration Files

Example development configuration:

```
{
  "APP_ENV": "development",
  "API_BASE_URL": "https://api.dev.example.com",
  "LOG_LEVEL": "debug",
  "ANALYTICS_ENABLED": "false"
}

```

Example staging configuration:

```
{
  "APP_ENV": "staging",
  "API_BASE_URL": "https://api.staging.example.com",
  "LOG_LEVEL": "info",
  "ANALYTICS_ENABLED": "true"
}

```

Example production configuration:

```
{
  "APP_ENV": "production",
  "API_BASE_URL": "https://api.example.com",
  "LOG_LEVEL": "warning",
  "ANALYTICS_ENABLED": "true"
}

```

These values are illustrative.

If these files contain only client-visible configuration, committing them is normally preferable because it makes builds reproducible and reviewable.

Putting such a file in `.gitignore` does not make its values secret once compiled into an application.

If files are generated, generation must be deterministic and CI must retain enough provenance to reproduce the artifact.

## Platform Capability Matrix

| PlatformNative flavor mechanism`--flavorappFlavor`Primary Dart configuration |                                              |                                    |                   |              |
| ---------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------- | ----------------- | ------------ |
| Android                                                                      | Gradle product flavors                       | yes                                | yes               | Dart defines |
| iOS                                                                          | Xcode schemes + build configurations         | yes                                | yes               | Dart defines |
| macOS                                                                        | Xcode schemes + build configurations         | yes                                | yes               | Dart defines |
| Windows, Flutter 3.47+                                                       | Flutter/CMake flavor plumbing                | yes                                | yes               | Dart defines |
| Linux, Flutter 3.47+                                                         | Flutter/CMake flavor plumbing                | yes                                | yes               | Dart defines |
| Web                                                                          | no corresponding native product-flavor model | **no for ****`flutter build web`** | do not rely on it | Dart defines |

Flutter's public deployment documentation describes Android and Apple flavor setup, while Flutter 3.47's tool source and merged platform changes establish the newer Windows/Linux behavior. The web build command continues to use Dart/web defines without a flavor option.

## Platform Configuration

### Android

Use Android product flavors for:

- application IDs;
- display names;
- flavor-specific resources;
- icons;
- manifest values/placeholders;
- native SDK configuration;
- native files selected by source set;
- co-installable variants.

Android's build system defines build variants as combinations of product flavors and build types, with flavor dimensions used to organize flavors. Product flavors can override properties from `defaultConfig`, including application identifiers and version suffixes.

Representative modern Kotlin DSL:

```
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

Keep the production identifier as the base `applicationId` in `defaultConfig` when suffixing non-production variants fits the project's identity model.

Use a resource in the manifest:

```
<application
    android:label="@string/app_name"
    ...>

```

Do not duplicate Android manifests when a resource, manifest placeholder, or source-set override is sufficient.

Do not store the Dart API base URL in Gradle merely because Android has flavors. Dart application configuration belongs in the Dart configuration contract.

### iOS

Flutter maps flavors to shared Xcode schemes and custom build configurations. Xcode itself uses schemes/build configurations rather than Flutter's terminology. Flutter's current flavor guide explicitly documents this workflow.

For each environment, use a lowercase shared scheme such as:

```
development
staging
production

```

Create corresponding build configurations such as:

```
Debug-development
Profile-development
Release-development

Debug-staging
Profile-staging
Release-staging

Debug-production
Profile-production
Release-production

```

Scheme action mapping should follow the appropriate mode:

```
Run      → Debug-<environment>
Test     → Debug-<environment>
Profile  → Profile-<environment>
Analyze  → Debug-<environment>
Archive  → Release-<environment>

```

Flutter's Apple flavor guidance requires the schemes to be shared for CLI/CI use and requires custom configurations to remain based on Flutter's existing configuration chain rather than replacing it with a Pods-only base configuration.

Use custom settings for values such as:

```
APP_DISPLAY_NAME
PRODUCT_BUNDLE_IDENTIFIER

```

Then reference them from `Info.plist`, for example:

```
<key>CFBundleDisplayName</key>
<string>$(APP_DISPLAY_NAME)</string>

```

Do not edit Flutter-generated configuration files such as generated/ephemeral settings as the permanent source of project configuration.

Where CocoaPods is used, inspect and update the `Podfile` build-configuration mapping so each custom Flutter build configuration maps to the correct CocoaPods debug/release mode, as documented by Flutter's flavor setup.

### macOS

Do not assume macOS is identical to iOS, but the current Flutter flavor documentation explicitly covers both iOS and macOS using Xcode schemes and custom build configurations.

Use:

```
flutter run -d macos --flavor staging ...
flutter build macos --flavor production ...

```

when the repository's pinned Flutter version supports the configured scheme.

macOS native concerns additionally include:

- bundle identifier;
- application display metadata;
- entitlements;
- App Sandbox configuration;
- Hardened Runtime where applicable;
- signing;
- notarization/distribution requirements.

Preserve the repository's existing macOS entitlement split. Debug/profile configurations often require capabilities related to debugging/JIT behavior that must not be casually copied into release configuration. Flutter documents macOS entitlement and signing requirements separately from application flavors.

### Web

Use Dart compile-time configuration:

```
flutter build web \
  --release \
  --dart-define-from-file=config/production.json

```

Do not use:

```
flutter build web --flavor production

```

Flutter 3.47's `BuildWebCommand` registers `usesDartDefineOption()` and `usesWebDefineOption()` but no `usesFlavorOption()`.

`--web-define` has a different responsibility from `--dart-define`: it supports variables used by Flutter's web templates such as the web bootstrap/index layer. Do not use it as a replacement for `APP_ENV` inside Dart.

Build separate deployment artifacts for separate environments.

For example:

```
development → dev.example.com
staging     → staging.example.com
production  → example.com

```

All client-side web configuration must be assumed publicly inspectable in generated JavaScript/Wasm, HTML, assets, browser developer tools, and network traffic.

Account for hosting/CDN/browser caching. Environment-specific artifacts should not share mutable deployment locations in a way that can accidentally serve staging bootstrap/configuration with production assets or vice versa. Flutter's web documentation notes that stale browser/CDN artifacts can cause frontend/version mismatch problems.

If one already-built web artifact genuinely must point at different environments at runtime, that is a separate runtime-config architecture. Load and validate runtime configuration deliberately before application initialization, establish cache/version semantics, and accept the additional startup/deployment complexity.

### Windows

Flutter 3.47 added Windows desktop flavor support.

The 3.47 tool's Windows build command calls `usesFlavorOption()`. Flutter's Windows flavor change also introduced flavor-namespaced build output, passed `FLUTTER_APP_FLAVOR` into CMake, suffixed generated binary names, and exposed the flavor through Dart's `appFlavor`.

Representative:

```
flutter run -d windows \
  --flavor development \
  --dart-define-from-file=config/development.json

```

```
flutter build windows \
  --release \
  --flavor production \
  --dart-define-from-file=config/production.json

```

Important limitations:

- flavor-specific icons remain project configuration;
- Windows package identity remains project/distribution configuration;
- `Package.appxmanifest` remains project responsibility where packaging uses it;
- installer scripts remain project responsibility;
- signing remains project/CI responsibility.

The Flutter 3.47 change deliberately provides flavor plumbing rather than prescribing every packaging system.

For an existing project created before these templates existed, do not blindly run `flutter create .` and overwrite platform customizations. Inspect the current Windows CMake/runner files and compare only the required flavor plumbing with the template for the repository's SDK version.

For Flutter <3.47, do not assume Windows `--flavor` works. Continue using Dart defines for Dart behavior and explicit native packaging configuration unless the project upgrades.

### Linux

Flutter 3.47 similarly added Linux desktop flavor support.

The 3.47 Linux build command registers `usesFlavorOption()`. The corresponding Flutter change propagates `FLUTTER_APP_FLAVOR` to CMake, uses flavor-namespaced build output, suffixes generated binary names, and causes the generated Linux template to suffix its `APPLICATION_ID` when a flavor is supplied.

Representative:

```
flutter run -d linux \
  --flavor development \
  --dart-define-from-file=config/development.json

```

```
flutter build linux \
  --release \
  --flavor production \
  --dart-define-from-file=config/production.json

```

The project remains responsible for flavor-specific:

- icons;
- `.desktop` files;
- Snap/deb/rpm/AppImage metadata;
- distribution packaging;
- signing where applicable.

Flutter explicitly kept these packaging concerns out of the generic flavor plumbing.

Existing pre-3.47 Linux projects may need a targeted CMake/template adaptation to consume the new flavor plumbing. Preserve custom native build logic.

For Flutter <3.47, use Dart defines as the portable application environment mechanism unless the repository has its own native flavor implementation.

## Android Product Flavors

Android flavor configuration and Dart application configuration are related but separate:

```
--flavor staging
       │
       └── Android/Gradle:
           applicationId
           resources
           manifest
           native SDK files
           signing/variant selection

--dart-define-from-file=config/staging.json
       │
       └── Dart:
           APP_ENV
           API_BASE_URL
           log policy
           analytics policy

```

Use the same canonical environment name for both.

A staging command therefore becomes:

```
flutter run \
  --flavor staging \
  --dart-define-from-file=config/staging.json

```

`appFlavor == "staging"` and `APP_ENV == "staging"` are independently produced and checked at startup.

## Apple Schemes and Build Configurations

The relationship should be understood as:

```
Flutter --flavor staging
        ↓
shared Xcode scheme "staging"
        ↓
Debug-staging / Profile-staging / Release-staging
        ↓
bundle identifier / display name / native resources / signing settings
        ↓
Dart appFlavor = "staging"

```

Separately:

```
--dart-define-from-file=config/staging.json
        ↓
APP_ENV = staging
        ↓
typed AppEnvironment.staging

```

The second path is not redundant: it contains Dart application configuration and gives the application an independent consistency contract.

## Application IDs and Bundle IDs

For applications that should coexist on one device, give development and staging distinct native identifiers.

Illustrative:

| EnvironmentAndroid application ID / Apple bundle ID |                           |
| --------------------------------------------------- | ------------------------- |
| development                                         | `com.example.app.dev`     |
| staging                                             | `com.example.app.staging` |
| production                                          | `com.example.app`         |

Do not assume changing a display name changes identity.

Changing an API URL does not change native application identity.

Keep production identity stable unless an actual migration is intended.

Firebase, push notification services, OAuth redirect registration, universal links/app links, associated domains, and store provisioning often depend on these native identities and must be reviewed when a new environment identifier is added.

## Native Resources

Native resources belong to the native platform when they affect the host application before Flutter/Dart starts.

Examples:

```
Android:
  app label
  launcher icon
  manifest placeholders
  XML resources
  google-services.json
  deep-link hosts

Apple:
  display name
  bundle identifier
  app icons
  URL schemes
  entitlements
  plist-backed native SDK values

Windows:
  runner resources
  executable metadata
  package manifest
  installer metadata

Linux:
  application ID
  binary name
  desktop entry
  icon/package metadata

```

Do not create environment-specific copies of every native file when source-set/build-setting substitution is sufficient.

## Firebase / Native SDK Configuration

Firebase is an example of a native SDK configuration problem, not the architecture itself.

Firebase recommends separate projects for separate environments when isolation between development/testing and production is required.

Each native Firebase app registration must match the corresponding Android application ID or Apple bundle ID.

### FlutterFire initialization

The standard FlutterFire setup initializes Flutter bindings and then initializes Firebase using generated `FirebaseOptions`.

Configuration validation should therefore happen before Firebase connects to the selected backend project.

Conceptually:

```
validate AppConfig
→ WidgetsFlutterBinding.ensureInitialized()
→ resolve environment-specific Firebase client options
→ Firebase.initializeApp(...)
→ initialize dependent services
→ runApp

```

### Android Firebase configuration

Firebase officially supports multiple `google-services.json` files for Android build variants by placing them in variant-specific source directories.

For example:

```
android/app/
├── src/
│   ├── development/
│   │   └── google-services.json
│   ├── staging/
│   │   └── google-services.json
│   └── production/
│       └── google-services.json

```

Use the project's actual Android variant hierarchy if build types and multiple flavor dimensions produce more specific variants.

Do not write a pre-build script that repeatedly copies a random Firebase JSON file over `android/app/google-services.json`.

The Android Google Services plugin processes variant configuration before Dart application startup, and Firebase's initialization provider can run before application code.

### Apple Firebase configuration

Firebase documents that Apple apps commonly make environment selection a build-time decision. It supports separate target membership when environments use separate targets and also documents explicit loading of named plist files for a single target, with an important warning that explicit runtime plist selection can affect Analytics collection in some circumstances.

Therefore:

1. inspect which Firebase products/plugins are in use;
2. inspect whether the application currently relies on a default `GoogleService-Info.plist`;
3. inspect FlutterFire-generated options;
4. preserve any native behavior that must occur before Dart startup;
5. prefer deterministic Xcode/build configuration over shell scripts that mutate files in place;
6. verify Analytics/Crashlytics/notifications separately after any environment change.

Do not prescribe a single plist-copy trick to every FlutterFire application.

### Web Firebase configuration

Firebase web client configuration is client-visible configuration.

Compile/select the correct Firebase project configuration for each web environment, but do not classify its normal client identifiers as backend secrets.

### Firebase API keys are not generic secrets

Firebase documents that Firebase API keys are identifiers used to associate requests with projects and should be restricted appropriately; server credentials such as service-account private keys remain sensitive.

Never place service-account JSON or server credentials in the Flutter application.

## Security and Secret Management

### Build-time variables are not secure secrets

Treat anything compiled into a Flutter client as recoverable by an attacker with access to the artifact.

Relevant attack surfaces include:

```
APK/AAB extraction
IPA/application bundle inspection
native binary string/static analysis
desktop executable inspection
generated web JavaScript/Wasm
bundled assets
runtime instrumentation
reverse engineering
network observation

```

Flutter's obfuscation documentation explicitly warns that storing secrets in an application is poor security practice and that obfuscation does not protect resources or prevent reverse engineering. Web obfuscation is not available as a secret-protection mechanism.

Native OAuth applications are likewise considered public clients: a static secret distributed with every copy of an installed application cannot be relied on as confidential.

Therefore:

```
CI secret → --dart-define → client binary

```

does **not** remain a secret merely because CI injected it securely.

### Appropriate client configuration

Usually acceptable, subject to product-specific rules:

- API base URLs;
- public feature configuration;
- OAuth public client IDs;
- redirect URIs;
- Firebase client configuration;
- analytics project/client IDs;
- public telemetry endpoints;
- non-authoritative feature flags.

### Values that must not be embedded

Never embed:

- database passwords;
- privileged API credentials;
- private backend API keys;
- OAuth confidential client secrets;
- service-account private keys;
- signing private keys;
- keystore passwords;
- certificate private material;
- cloud provider administrative credentials;
- long-lived privileged bearer tokens.

### Where secrets belong

```
backend secrets         → server-side secret manager
service credentials     → backend/server workload identity
signing credentials     → CI secure secret/file store or signing service
store credentials       → CI secure secret store
client-visible config   → versioned/generated client configuration

```

Feature flags in a client are not authorization controls.

Server APIs must enforce access independently of environment or client configuration.
