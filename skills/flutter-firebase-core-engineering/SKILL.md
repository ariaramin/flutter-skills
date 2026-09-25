---
name: flutter-firebase-core-engineering
description: Design, implement, review, debug, secure, test, migrate, and optimize Firebase Core foundations in Flutter applications. Use when a task involves firebase_core, Firebase.initializeApp, FirebaseApp/FirebaseOptions, Firebase.app or Firebase.apps, the default or secondary Firebase app, flutterfire configure/reconfigure, generated firebase_options.dart, google-services.json, GoogleService-Info.plist, Web Firebase options, dev/staging/production projects, flavors/build configurations, wrong-project or core/no-app/core/not-initialized/core/duplicate-app failures, Firebase startup ownership/performance, background entry-point initialization, emulator bootstrap, or migration of old FlutterFire setup. Do not use for product-specific Auth, Firestore, Messaging, Analytics, Crashlytics, Storage, Functions, Remote Config, or Performance behavior beyond their dependency on Core.
---

# Flutter Firebase Core Engineering

Treat Firebase Core as app-instance and configuration infrastructure. Keep its
lifecycle distinct from every downstream FlutterFire product.

## Start with evidence

Before changing code or configuration:

1. Inspect `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints, target
   platforms, flavors/build configurations, and downstream FlutterFire plugins.
2. Identify the locked `firebase_core` and platform implementation versions,
   plus the installed `flutterfire` CLI version.
3. Find every `Firebase.initializeApp`, `Firebase.app`, `Firebase.apps`,
   secondary-app creation/deletion, and background entry point.
4. Inspect `firebase_options.dart`, Android service files/Gradle wiring, Apple
   plist/bundle wiring, Web configuration, and Windows development setup.
5. Map each build flavor/configuration to its exact Firebase project and app
   registration; compare project IDs, app IDs, package names, and bundle IDs.
6. Audit privileged credentials and all Firebase/product work before `runApp`.
7. Verify the platform matrix of every downstream plugin; Core support alone is
   not sufficient.

The bundled guide was validated against `firebase_core 4.13.0` and FlutterFire
CLI `1.4.0` on 2026-08-11. Use the installed package/CLI documentation and
changelogs as the source of truth when versions differ.

## Preserve these invariants

- Initialize Firebase once per intended app instance.
- Use one `[DEFAULT]` app for the normal application case.
- Centralize bootstrap ownership; do not initialize Firebase from screens,
  repositories, or unrelated services.
- Call `WidgetsFlutterBinding.ensureInitialized()` when plugin access precedes
  `runApp`, and keep binding initialization and `runApp` in the same zone.
- Still call `Firebase.initializeApp()` from Flutter when native Android/Apple
  files auto-configure the native default app.
- Initialize Core before using any FlutterFire product plugin.
- Do not eagerly initialize every Firebase product merely because Core exists.
- Prefer `flutterfire configure` and generated platform-aware
  `firebase_options.dart`; do not hand-edit generated options.
- Treat Firebase client options and API keys as client configuration, not Admin
  authorization. Protect access with product security rules and API-key
  restrictions where applicable.
- Never ship service-account JSON, Admin SDK credentials, private keys, signing
  secrets, database credentials, or privileged server tokens in Flutter.
- Select dev/staging/production projects deterministically at build time and
  keep Dart options aligned with native service files for the same build.
- Prefer separate Firebase projects for isolated environments.
- Do not use `kDebugMode` as the complete environment-selection model.
- Do not dynamically delete/recreate or switch the default app for ordinary
  user tenancy or logout.
- Create secondary apps only for genuine simultaneous multi-project needs, then
  verify every downstream plugin supports the named app.
- Do not use `Firebase.apps.isEmpty` as a scattered lifecycle guard.
- Treat `core/duplicate-app` and configuration mismatch as deterministic defects,
  not transient failures to retry blindly.
- Initialize explicitly in background entry points that execute in a separate
  Dart isolate when their workflow requires Firebase.
- Do not use production Firebase projects for automated tests.
- Do not assume Core configures each product's emulator automatically.
- Do not claim Linux support when no platform implementation is registered.
- Treat Windows Firebase support as development-oriented unless current official
  guidance explicitly establishes production support.
- Measure startup in profile/release-like builds and separate Core cost from
  registered plugin and remote-service work.

## Choose the smallest bootstrap

Use this decision order:

1. For a normal app, initialize one default app with generated current-platform
   options, then run the application.
2. If root state requires Firebase, await Core before `runApp` and fail with a
   bounded, actionable startup state.
3. If the first screen is Firebase-independent, render it first and initialize
   optional Firebase-dependent features behind an explicit readiness boundary.
4. For dev/staging/production, select the exact project through flavors/build
   configuration, not runtime user state.
5. Add a named secondary app only when two projects must be active
   simultaneously and all consumers support it.

Do not introduce a bootstrap abstraction unless it centralizes real environment,
readiness, error, testing, or multi-app policy.

## Route to the production guide

Read only the relevant sections of `references/production-guide.md`. Locate
sections before reading them with:

```sh
rg -n '^#{1,3} (SECTION|RELATED SECTION)$' references/production-guide.md
```

Use these search headings:

| Task | Search headings |
|---|---|
| Understand Core versus native/product initialization, API, or platform support | `Package Architecture|Dart vs Native vs Service Initialization|Current API|FirebaseApp|FirebaseOptions|Platform Capability Matrix` |
| Install/configure CLI or generated options | `FlutterFire CLI|Install|Configure|Noninteractive Configuration|Re-run flutterfire configure|flutterfire reconfigure|firebase_options.dart|Do Not Manually Edit Generated Options` |
| Review configuration secrecy and source control | `Are Firebase Options Secrets|Source Control|Security Boundary|NEVER Ship These|API-Key Nuance|Security Rules` |
| Initialize the default app or fix duplicate/lifecycle behavior | `Initialization|Recommended Default|WidgetsFlutterBinding.ensureInitialized|Binding Decision Rule|Keep Binding and runApp in the Same Zone|Default Firebase App|Before Initialization|Native Default Configuration|Duplicate Initialization|Do Not Use Firebase.apps.isEmpty Everywhere|Repeated Initialization Semantics|Hot Reload and Hot Restart` |
| Create, use, or delete secondary apps | `Secondary Firebase Apps|Good Secondary-App Use Cases|Bad Secondary-App Use Cases|Plugin Support for Secondary Apps|Firebase App Deletion|Dynamic Project Switching|Multiple Firebase App Cost` |
| Design or optimize startup | `Startup Model|Startup Decision Framework|Default Recommended Bootstrap|Firebase-Independent First Frame|Startup Performance|Native Core Cost|Web Core Cost|Registered Plugin Cost|Avoid Eager Service Initialization|Parallel Startup Work|Startup Audit|Startup Timing|Do Not Skip await Incorrectly` |
| Configure Android, Apple, Web, Windows, or check Linux | `Android|Firebase App Registration|google-services.json|Google Services Gradle Plugin|Android Flavors / Build Types|iOS|Bundle ID|GoogleService-Info.plist|Apple Build Configurations|macOS|Web|Web JS SDK|Advanced Web Manual Loading|Web Trusted Types|Windows|Linux` |
| Configure environments/flavors and prevent project mismatch | `Environments and Flavors|Environment Selection|Flavor Options Selection|Avoid kDebugMode as the Entire Environment Model|Configuration Verification|Prevent Production/Stage Mismatch|Manual FirebaseOptions|Native Service Files vs Dart Options` |
| Initialize background entry points or isolates | `Background Isolates|Firebase Messaging Background Example|Generic Spawned Isolates` |
| Test Core or configure emulators/demo projects | `Testing|Pure Unit Tests|Widget Tests|Core Integration Tests|Emulator Suite|Demo Project|Do Not Use Production Firebase for Automated Tests` |
| Handle initialization errors or degraded startup | `Error Handling|core/no-app|core/not-initialized|core/duplicate-app|Configuration Failure vs Transient Failure|Initialization Timeout|Fail Fast vs Degraded Mode|Startup Error Screen Pattern` |
| Review architecture, ordering, debugging, or production readiness | `Architecture|Firebase Core Is Not a Service Locator|Multiple FlutterFire Plugins|Plugin Ordering|Performance Anti-Optimization Warnings|Logging|Debugging Guide|Anti-Patterns|Implementation Checklist|Startup Audit Checklist|Code Review Checklist|Production Readiness Checklist|Version-Sensitive Areas|Decision Framework` |

For a full Firebase bootstrap or production-readiness audit, read the entire
guide after completing the repository inventory.

## Implement at the single bootstrap boundary

- Fix repeated initialization in the shared app bootstrap, not with guards in
  every caller.
- Fix wrong-project behavior by aligning flavor selection, generated Dart
  options, native service files, and registered package/bundle IDs.
- Keep product-specific emulator, permissions, listeners, and remote fetching in
  the owning product layer.
- Preserve existing generated-file and CI conventions when sound; regenerate
  deterministically when configuration changes.
- Keep Firebase Core readiness explicit where startup can proceed without it.

## Validate the result

Run the narrowest relevant Dart/Flutter and configuration checks, then test
release-like builds. Cover changed paths from this matrix:

- one default app with the expected name/options on every affected platform;
- exact dev/staging/production project and app IDs for each flavor;
- Android package/service file/Gradle alignment;
- Apple bundle ID/plist/build-configuration alignment;
- Web reload and current options/JS integration;
- background entry-point initialization when changed;
- deterministic configuration failures versus supported degraded behavior;
- emulator/demo isolation without production access;
- downstream plugin access after Core readiness;
- profile/release startup timing when performance changed.

Never claim Firebase production readiness from Core initialization alone. Report
untested platforms, flavors, downstream plugins, and background entry points.
