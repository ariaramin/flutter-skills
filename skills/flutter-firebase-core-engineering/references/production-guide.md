# Firebase Core for Flutter

Validated against:

```text
firebase_core 4.13.0
FlutterFire CLI 1.4.0
```

Validation date:

```text
2026-08-11
```

Current `firebase_core` platform implementations:

```text
Android
iOS
macOS
Web
Windows
```

Not currently registered by `firebase_core`:

```text
Linux
```

Important:

```text
firebase_core platform support
!=
every FlutterFire plugin supports that platform
!=
Firebase considers that platform production-ready
```

Current Firebase guidance specifically warns that Windows Firebase support is for local-development workflows rather than production use.

Always inspect:

```text
pubspec.lock
flutterfire --version
current FlutterFire documentation
firebase_core changelog
downstream plugin platform matrix
```

before making version-sensitive changes.

---

## Purpose

This skill governs production initialization, configuration, environment management, startup architecture, testing, debugging, security, and migration of Firebase Core in Flutter applications.

Use it to reason about:

- `Firebase.initializeApp`
- `Firebase.app`
- `Firebase.apps`
- `FirebaseApp`
- `FirebaseOptions`
- `FirebaseApp.delete`
- the default Firebase app
- secondary/named Firebase apps
- `flutterfire configure`
- `firebase_options.dart`
- Android `google-services.json`
- Apple `GoogleService-Info.plist`
- Flutter Web Firebase configuration
- Windows development configuration
- dev/staging/production Firebase projects
- build flavors/configurations
- Firebase startup performance
- background-isolate initialization
- emulator/testing setup
- initialization failures
- migration from old FlutterFire setup

Firebase Core is infrastructure.

It creates and manages Firebase app instances on which individual FlutterFire service plugins depend.

It is not itself:

- Authentication
- Firestore
- Analytics
- Crashlytics
- Messaging
- Remote Config
- Storage
- Functions
- Performance Monitoring

Each service has its own lifecycle and configuration rules.

---

# Rule Language

- **MUST** — required for correctness or security.
- **SHOULD** — strong production recommendation.
- **MAY** — optional architecture choice.
- **FlutterFire behavior** — documented/current SDK behavior.
- **Platform behavior** — behavior originating in Android, Apple, Web, or Windows Firebase SDKs.
- **Engineering recommendation** — architectural guidance derived from those facts.

---

# When to Use This Skill

Trigger this skill when asked to:

- add Firebase to Flutter
- install `firebase_core`
- run `flutterfire configure`
- generate or regenerate `firebase_options.dart`
- fix Firebase initialization
- configure Android Firebase
- configure iOS Firebase
- configure macOS Firebase
- configure Firebase Web
- configure Windows development Firebase
- add dev/staging/production environments
- add Flutter flavors
- debug the wrong Firebase project
- fix `[core/no-app]`
- fix `[core/not-initialized]`
- fix `[core/duplicate-app]`
- create a secondary Firebase app
- delete a secondary Firebase app
- optimize Firebase startup
- review pre-`runApp` work
- configure Firebase emulators
- initialize Firebase in a background entry point
- migrate old Gradle/Xcode FlutterFire setup
- audit Firebase secrets
- write Firebase bootstrap tests

---

# Core Principles

1. **Initialize Firebase once per intended Firebase app instance.**

2. **Use one `[DEFAULT]` Firebase app for the normal application case.**

3. **Prefer `flutterfire configure` and generated platform-aware Firebase options.**

4. **Still call `Firebase.initializeApp()` from Flutter even when Android/Apple native config already created the native default app.**

5. **Call Core before using any FlutterFire service plugin.**

6. **Do not initialize every Firebase service eagerly merely because Core is initialized.**

7. **Treat Core lifecycle separately from each Firebase product's lifecycle.**

8. **Keep Firebase bootstrap ownership centralized.**

9. **Do not scatter `Firebase.initializeApp()` across screens, repositories, or services.**

10. **Do not use `Firebase.apps.isEmpty` as a generic lifecycle workaround.**

11. **Treat client Firebase configuration as configuration, not privileged backend credentials.**

12. **Never ship service-account/Admin credentials in Flutter.**

13. **Use deterministic build-time environment/project selection.**

14. **Prefer separate Firebase projects for dev/staging/production.**

15. **Do not dynamically switch Firebase projects for ordinary user tenancy.**

16. **Use secondary apps only for genuine simultaneous multi-project requirements.**

17. **Verify secondary-app support for every downstream FlutterFire plugin before relying on it.**

18. **Do not delete/recreate the default app during normal application operation.**

19. **Do not assume `firebase_core` platform support means every FlutterFire product has equivalent support.**

20. **Do not assume native and Web Firebase initialization have identical performance characteristics.**

21. **Do not retry deterministic configuration failures blindly.**

22. **Measure startup in profile/release-like builds before optimizing around Firebase Core.**

---

# Package Architecture

Conceptually:

```text
Flutter application
       |
       v
firebase_core Dart API
       |
       v
FirebasePlatform
       |
       +-----------------------------+
       |                             |
       v                             v
Method-channel implementation     Web implementation
       |                             |
       v                             v
Android / Apple / Windows        Firebase JS SDK
native Firebase SDKs
       |
       v
FirebaseApp instance
       |
       +--> Auth
       +--> Firestore
       +--> Messaging
       +--> Analytics
       +--> Storage
       +--> Remote Config
       +--> ...
```

`firebase_core` establishes the Firebase app.

Individual product plugins then obtain/use that app.

---

# Dart vs Native vs Service Initialization

Keep these concepts separate.

## Dart/Flutter Core initialization

```dart
await Firebase.initializeApp(...);
```

Establishes FlutterFire's Firebase app representation and synchronizes with the platform implementation.

## Native Firebase initialization

Android/Apple SDKs may already know a native default app from packaged configuration files.

FlutterFire discovers that app during Core bootstrap.

## Service-specific initialization

A product such as:

```text
Auth
Messaging
Crashlytics
Remote Config
```

can have additional setup.

`Firebase.initializeApp()` does not mean:

```text
every Firebase product is fully configured
every product has fetched remote data
every permission has been requested
every emulator is configured
```

---

# Current API

Current primary API:

```dart
abstract final class Firebase {
  static List<FirebaseApp> get apps;

  static FirebaseApp app([
    String name = defaultFirebaseAppName,
  ]);

  static Future<FirebaseApp> initializeApp({
    String? name,
    FirebaseOptions? options,
    String? demoProjectId,
  });
}
```

Default application name:

```text
[DEFAULT]
```

---

# `FirebaseApp`

A `FirebaseApp` exposes current properties and lifecycle methods including:

```text
name
options
isAutomaticDataCollectionEnabled
delete()
setAutomaticDataCollectionEnabled(...)
setAutomaticResourceManagementEnabled(...)
```

The latter capabilities can be platform-specific in effect.

Do not use Core's automatic-data-collection setting as a substitute for reading the privacy/collection documentation of each product.

---

# `FirebaseOptions`

Current required constructor values:

```dart
const FirebaseOptions(
  apiKey: '...',
  appId: '...',
  messagingSenderId: '...',
  projectId: '...',
);
```

Current optional values include:

```text
authDomain
databaseURL
storageBucket
measurementId
recaptchaSiteKey
trackingId
deepLinkURLScheme
androidClientId
iosClientId
iosBundleId
appGroupId
```

Do not manually populate these fields for the ordinary default app when FlutterFire CLI can generate them correctly.

---

# Platform Capability Matrix

| Capability | Android | iOS | macOS | Web | Windows | Linux |
|---|---:|---:|---:|---:|---:|---:|
| `firebase_core` implementation | Yes | Yes | Yes | Yes | Yes | No |
| Production Firebase target | Yes | Yes | Product-dependent/beta ecosystem | Yes | **No — development workflow warning** | No FlutterFire Core |
| `flutterfire configure` | Yes | Yes | Yes | Yes | Yes | CLI itself can run on Linux, but Core target is absent |
| Native service file | `google-services.json` | `GoogleService-Info.plist` | `GoogleService-Info.plist` | No | No native Firebase Console app | N/A |
| Generated Dart options | Yes | Yes | Yes | Yes | Yes | No generated Core target normally |
| Native default app discovery | Yes | Yes | Yes | N/A | implementation-specific C++ | N/A |
| Named/secondary Core app | Yes | Yes | Yes | Yes | Core implementation supports apps; verify products | N/A |
| Client options required for normal recommended Dart init | Generated options recommended | Generated options recommended | Generated options recommended | Yes | Generated options | N/A |
| Downstream plugin parity | No | No | No | No | Very limited / development-oriented | N/A |

Never infer downstream plugin support from this table.

Check the official FlutterFire product matrix for every Firebase package used.

---

# FlutterFire CLI

## Install

Current official Firebase Flutter setup:

```shell
dart pub global activate flutterfire_cli
```

FlutterFire CLI requires Firebase CLI tooling to be installed.

Current CLI also has a beta dev-dependency installation mode, but global activation remains the normal documented workflow.

Verify:

```shell
flutterfire --version
```

before relying on newer flags.

---

# Configure

Normal setup:

```shell
flutterfire configure
```

The workflow:

```text
select Firebase project
        ↓
select platforms
        ↓
create/match Firebase app registrations
        ↓
write native service files where applicable
        ↓
generate firebase_options.dart
        ↓
update applicable FlutterFire build integration
```

---

# Noninteractive Configuration

Current CLI supports:

```shell
flutterfire configure \
  --yes \
  --project=my-firebase-project
```

Choose explicit platforms:

```shell
flutterfire configure \
  --yes \
  --project=my-firebase-project \
  --platforms=android,ios,web
```

Do not invent CLI flags.

Run:

```shell
flutterfire configure --help
```

against the installed CLI when writing automation.

---

# Re-run `flutterfire configure`

Official Firebase guidance says rerun it when:

- adding a new supported platform
- adding a Firebase product
- changing Firebase application configuration
- especially when adding products that need build integration such as Crashlytics or Performance
- changing Google sign-in/Realtime Database related configuration where required

Also rerun it deliberately when environment app registrations change.

---

# `flutterfire reconfigure`

Current CLI provides:

```shell
flutterfire reconfigure
```

It uses tracked configuration in `firebase.json` to rewrite service files/Dart configuration and update relevant build integration.

Use it only when the repository is already managed by a compatible current FlutterFire CLI configuration.

Do not assume an old `firebase.json` generated by an ancient CLI is compatible forever.

---

# `firebase_options.dart`

Normal generated file:

```text
lib/firebase_options.dart
```

Use:

```dart
DefaultFirebaseOptions.currentPlatform
```

The generated getter typically selects between:

```text
Web
Android
iOS
macOS
Windows
```

according to the platforms configured in that file.

If code runs on an unconfigured platform, the generated implementation should fail rather than silently connect to a random Firebase project.

---

# Do Not Manually Edit Generated Options

Bad:

```text
flutterfire generated firebase_options.dart
        ↓
developer manually changes projectId
        ↓
native google-services.json still points elsewhere
```

This creates split configuration.

Preferred:

```text
update Firebase/CLI configuration
        ↓
rerun flutterfire configure
```

---

# Are Firebase Options Secrets?

No, not in the backend-credential sense.

Typical client config includes:

```text
API key
Firebase app ID
project ID
messaging sender ID
storage bucket
auth domain
measurement ID
```

Firebase explicitly describes these values as client configuration / non-secret identifiers.

Do not build security around hiding them.

---

# Source Control

Firebase client configuration is not made secure by `.gitignore`.

A normal reproducible project MAY commit:

```text
firebase_options.dart
google-services.json
GoogleService-Info.plist
```

because they are client configuration.

Some organizations instead generate them deterministically in CI.

Either model is acceptable if:

```text
the build receives the exact intended environment config
and
no privileged credential is mixed into those files
```

Do not use source-control secrecy as the Firebase authorization boundary.

---

# Security Boundary

Firebase security comes from service-specific controls such as:

```text
Firebase Authentication
Firestore Security Rules
Realtime Database Rules
Storage Security Rules
IAM
App Check
backend authorization
```

depending on the service.

A hidden API key is not authorization.

---

# NEVER Ship These

Flutter binaries/Web bundles MUST NOT contain:

```text
service-account private key JSON
Firebase Admin SDK private credentials
Google Cloud service-account key
backend private signing key
FCM legacy/server secret
database administrative password
server OAuth client secret
private third-party API secret
```

Those belong in trusted server infrastructure.

---

# API-Key Nuance

Firebase-provisioned API keys are designed for client use and have Firebase-related API restrictions.

Do not automatically reuse them for arbitrary Google APIs.

If the application uses a separate billable Google API:

```text
Maps
Places
Gemini Developer API
other Google Cloud API
```

follow that API's key/restriction guidance separately.

---

# Initialization

## Recommended Default

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/widgets.dart';

import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return const Directionality(
      textDirection: TextDirection.ltr,
      child: Center(
        child: Text('Application'),
      ),
    );
  }
}
```

This remains the standard recommended architecture.

---

# Why `WidgetsFlutterBinding.ensureInitialized()`

`runApp()` initializes `WidgetsFlutterBinding` automatically.

Therefore this is sufficient when no plugin is used first:

```dart
void main() {
  runApp(const App());
}
```

But:

```dart
await Firebase.initializeApp(...)
```

occurs before `runApp`.

Firebase is a Flutter plugin and needs the platform/plugin binding.

Therefore:

```dart
WidgetsFlutterBinding.ensureInitialized();
```

must happen first.

---

# Binding Decision Rule

Use:

```dart
WidgetsFlutterBinding.ensureInitialized();
```

when:

```text
async/plugin/platform work happens before runApp
```

Do not explain it as:

```text
Firebase requires this magical line in every application
```

It is a Flutter binding requirement.

Calling it again is idempotent and not a meaningful startup optimization target.

---

# Keep Binding and `runApp` in the Same Zone

Do not initialize Flutter bindings in one Dart zone and call `runApp()` from another without understanding Flutter's zone requirements.

Avoid unnecessary:

```text
runZoned
runZonedGuarded
```

wrapping around initialization solely because an old tutorial did so.

If another observability/error SDK requires a zone architecture, make sure the binding and app lifecycle are compatible with current Flutter guidance.

---

# Default Firebase App

The default Dart Firebase app name is:

```text
[DEFAULT]
```

Initialize it by omitting `name`:

```dart
final FirebaseApp app =
    await Firebase.initializeApp(
  options:
      DefaultFirebaseOptions.currentPlatform,
);
```

Retrieve:

```dart
final FirebaseApp app =
    Firebase.app();
```

List all apps:

```dart
final List<FirebaseApp> apps =
    Firebase.apps;
```

Most applications need exactly one default app.

---

# Before Initialization

Calling:

```dart
Firebase.app()
```

before an app exists produces a Core no-app error.

Calling a downstream FlutterFire plugin before Core initialization normally produces Core initialization errors.

Fix lifecycle ownership.

Do not catch and suppress the error globally.

---

# Native Default Configuration

On Android, native Firebase may obtain the default app from resources produced from:

```text
google-services.json
```

On iOS/macOS, Firebase may obtain it from:

```text
GoogleService-Info.plist
```

FlutterFire Core discovers these native apps.

Nevertheless, current FlutterFire requires:

```dart
Firebase.initializeApp(...)
```

before Dart FlutterFire plugin use.

---

# Duplicate Initialization

Do not do this:

```dart
await Firebase.initializeApp(
  options:
      DefaultFirebaseOptions.currentPlatform,
);

await Firebase.initializeApp(
  options:
      DefaultFirebaseOptions.currentPlatform,
);
```

as deliberate application architecture.

Current implementation is tolerant of an existing app with sufficiently compatible options and may return it.

That exists partly to support native-app discovery and hot restart.

It is **not** permission to initialize randomly throughout the app.

---

# Do Not Use `Firebase.apps.isEmpty` Everywhere

Anti-pattern:

```dart
if (Firebase.apps.isEmpty) {
  await Firebase.initializeApp(
    options:
        DefaultFirebaseOptions.currentPlatform,
  );
}
```

inside:

```text
screen
repository
service
background task
router
```

Why:

- hides initialization ownership
- can mask wrong configuration
- adds races when several callers start together
- does not address isolate-specific/plugin lifecycle requirements
- makes tests harder to reason about

Preferred:

```text
one known bootstrap path
```

and explicit background-entry-point initialization only where the relevant plugin requires it.

---

# Repeated Initialization Semantics

Current method-channel behavior:

```text
no existing app
    +
valid options
        -> create app

existing same-named app
    +
roughly matching important options
        -> return existing app

existing same-named app
    +
conflicting important options
        -> core/duplicate-app
```

The current compatibility comparison is an implementation detail.

Do not depend on exact compared fields as an application contract.

---

# Hot Reload and Hot Restart

## Hot reload

Normally:

```text
main() does not restart
```

so Firebase bootstrap is not rerun.

## Hot restart

Dart static state restarts while native Firebase app state can remain.

Current Core initialization rediscovers platform-native apps and tolerates compatible options.

Therefore the normal centralized:

```dart
await Firebase.initializeApp(...)
```

pattern is designed to work without custom `Firebase.apps.isEmpty` hacks.

## Browser reload

A full page reload recreates browser/Dart/JavaScript application state.

Flutter hot restart and browser reload are not identical.

---

# Secondary Firebase Apps

Use when the same running application genuinely must connect to more than one Firebase app/project.

Example:

```dart
import 'package:firebase_core/firebase_core.dart';

Future<FirebaseApp> createSecondaryApp() {
  return Firebase.initializeApp(
    name: 'migration-project',
    options: const FirebaseOptions(
      apiKey: 'client-api-key',
      appId: '1:123456:web:abcdef',
      messagingSenderId: '123456',
      projectId: 'migration-project',
    ),
  );
}
```

Retrieve:

```dart
final FirebaseApp secondary =
    Firebase.app('migration-project');
```

---

# Good Secondary-App Use Cases

Potential valid cases:

```text
temporary migration between Firebase projects
application intentionally interacts with two independent projects simultaneously
special infrastructure architecture requiring two Firebase backends
```

Use only if the service plugins involved explicitly support that app instance.

---

# Bad Secondary-App Use Cases

Do not create:

```text
dev app
staging app
prod app
```

simultaneously inside one production process simply to represent environments.

Prefer:

```text
build flavor/configuration
        ↓
exactly one environment's default Firebase app
```

---

# Plugin Support for Secondary Apps

Core supports secondary apps.

That does **not** guarantee this exists for every plugin:

```dart
SomeFirebasePlugin.instanceFor(
  app: secondary,
);
```

Before designing secondary apps:

1. inspect the downstream plugin's current API
2. verify its platform support
3. verify whether its default/native behavior is tied to `[DEFAULT]`
4. verify whether Web/native behavior matches

If plugin documentation does not support named apps, do not invent support.

---

# Firebase App Deletion

Current API:

```dart
await secondary.delete();
```

After deletion:

```text
downstream services tied to that app are disposed
future plugin use with that app fails
```

The default app cannot be deleted through current `FirebaseApp.delete()`.

Do not attempt:

```dart
await Firebase.app().delete();
```

as environment switching.

---

# Dynamic Project Switching

Avoid:

```text
user logs in
    ↓
delete Firebase app
    ↓
initialize tenant-specific Firebase project
```

for ordinary multi-tenancy.

This can create problems with:

- Auth state
- Messaging registration
- Analytics attribution
- caches
- plugin instances
- background callbacks
- service-specific singleton APIs

Ordinary tenants should normally be isolated through:

```text
Auth identity
security rules
data model
backend authorization
```

not by reconstructing Firebase infrastructure.

Use runtime multiple projects only when there is a genuine architectural reason.

---

# Startup Model

Standard:

```text
process launch
      ↓
Flutter binding
      ↓
Firebase Core bootstrap
      ↓
runApp
      ↓
Firebase-dependent application work
      ↓
optional/lazy Firebase services
```

Do not add every Firebase service to the pre-`runApp` phase automatically.

---

# Startup Decision Framework

Ask:

```text
Does anything rendered by the root app immediately require Firebase?
Does any startup-critical plugin require Core before runApp?
Can the initial shell exist without Firebase?
Has Firebase Core actually been measured as a startup bottleneck?
```

---

# Option A — Default Recommended Bootstrap

Use when Firebase is foundational to the application.

```text
binding
→ initialize Core
→ runApp
```

Benefits:

- simple lifecycle
- no "Firebase not ready" race
- all widgets/plugins see initialized Core
- matches official FlutterFire setup

This should remain the default architecture.

---

# Option B — Firebase-Independent First Frame

A Firebase-optional application MAY deliberately render first and initialize Firebase asynchronously.

Only use this when:

- startup measurement shows a meaningful benefit
- the initial UI genuinely does not access FlutterFire
- every Firebase-dependent service is gated
- downstream plugin lifecycle permits delayed setup

Example:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final Future<FirebaseApp> firebaseBootstrap =
      Firebase.initializeApp(
    options:
        DefaultFirebaseOptions.currentPlatform,
  );

  runApp(
    App(
      firebaseBootstrap:
          firebaseBootstrap,
    ),
  );
}

class App extends StatelessWidget {
  const App({
    required this.firebaseBootstrap,
    super.key,
  });

  final Future<FirebaseApp>
      firebaseBootstrap;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: FutureBuilder<FirebaseApp>(
        future: firebaseBootstrap,
        builder: (
          BuildContext context,
          AsyncSnapshot<FirebaseApp>
              snapshot,
        ) {
          if (snapshot.hasError) {
            return BootstrapErrorScreen(
              error: snapshot.error!,
            );
          }

          if (snapshot.connectionState !=
              ConnectionState.done) {
            return const StartupScreen();
          }

          return const HomeScreen();
        },
      ),
    );
  }
}

class StartupScreen extends StatelessWidget {
  const StartupScreen({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child:
            CircularProgressIndicator(),
      ),
    );
  }
}

class BootstrapErrorScreen
    extends StatelessWidget {
  const BootstrapErrorScreen({
    required this.error,
    super.key,
  });

  final Object error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Text(
          'Application initialization failed.\n'
          '${error.runtimeType}',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

class HomeScreen
    extends StatelessWidget {
  const HomeScreen({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Home'),
      ),
    );
  }
}
```

Notice:

```text
no Firebase plugin access
```

occurs before `firebaseBootstrap` completes.

Do not use this architecture merely because it looks more asynchronous.

---

# Startup Performance — HIGH PRIORITY

Do not start with:

```text
Firebase Core is slow
```

Measure.

Core initialization cost has several parts.

---

# Native Core Cost

Android/Apple native paths primarily involve:

```text
Flutter platform call
native Firebase app discovery/configuration
FirebaseOptions conversion
registered FlutterFire plugin constants
Dart FirebaseApp representation
```

Current Android work uses a cached native thread pool for Core operations.

Core itself is not a server availability check.

Therefore arbitrary:

```text
5 retries
10-second HTTP timeout
```

around native `Firebase.initializeApp()` is normally not appropriate.

---

# Web Core Cost

FlutterFire Web currently loads Firebase JS modules dynamically unless they are already supplied.

That may include:

```text
network fetch
module parsing
JS evaluation
registered Firebase service modules
```

Therefore Web initialization should be measured separately.

Do not extrapolate native timings to Web.

---

# Registered Plugin Cost

Core synchronization can query/initialize registered FlutterFire plugin state.

Therefore an application with:

```text
Core only
```

can have a different bootstrap profile from:

```text
Core
Auth
App Check
Firestore
Analytics
Messaging
...
```

Do not attribute the entire observed interval to `firebase_core` without profiling.

---

# Avoid Eager Service Initialization

Bad:

```dart
await Firebase.initializeApp(...);
await initializeAuth();
await initializeAnalytics();
await initializeRemoteConfig();
await initializeMessaging();
await initializeStorage();
await initializeFunctions();
await initializeEverythingElse();

runApp(const App());
```

unless all those dependencies are demonstrably required before first UI.

Preferred:

```text
Core
   ↓
minimum startup-critical service work
   ↓
runApp
   ↓
other service initialization when needed
```

Always verify each product's own documentation.

---

# Core Does Not Initialize Every Product for You

After:

```dart
await Firebase.initializeApp(...);
```

do not conclude:

```text
Messaging permission already handled
Remote Config already fetched
Auth state already resolved
Crashlytics hooks installed
Firestore emulator already connected
Analytics consent already configured
```

Those are product-specific concerns.

---

# Parallel Startup Work

Independent startup tasks MAY be parallelized.

Example dependency graph:

```text
Firebase Core
      |
      +--> Firebase-dependent task
     
local config --------+
                     +--> application ready
local cache ----------+
```

Do not blindly use:

```dart
Future.wait([
  everyStartupTask(),
]);
```

if one task depends on another or several heavy tasks compete for startup disk/CPU/network resources.

Model dependencies first.

---

# Startup Audit

For each pre-`runApp` operation record:

```text
operation
must precede first UI?
depends on Firebase Core?
network?
disk?
CPU?
can defer?
measured duration?
failure behavior?
```

Then optimize the actual blockers.

---

# Startup Timing

Measure in:

```text
profile/release-like builds
physical target devices
```

Flutter's first-frame metric is more meaningful than debug console stopwatch impressions.

You MAY temporarily instrument the Core interval:

```dart
final Stopwatch stopwatch =
    Stopwatch()..start();

await Firebase.initializeApp(
  options:
      DefaultFirebaseOptions.currentPlatform,
);

stopwatch.stop();

debugPrint(
  'Firebase Core: '
  '${stopwatch.elapsedMilliseconds} ms',
);
```

Do not ship noisy startup logging unless operationally useful.

Also measure:

```text
overall first-frame timing
```

because optimizing 20 ms of Core is irrelevant if the application then blocks for two seconds elsewhere.

---

# Do Not Skip `await` Incorrectly

Bad:

```dart
Firebase.initializeApp(
  options:
      DefaultFirebaseOptions.currentPlatform,
);

FirebaseAuth.instance;
```

The Future has not completed.

Preferred:

```dart
await Firebase.initializeApp(
  options:
      DefaultFirebaseOptions.currentPlatform,
);

// Safe to use FlutterFire plugins now.
```

or explicitly gate plugin access behind a shared bootstrap Future.

---

# Android

## Firebase App Registration

The Firebase Android app must use the actual:

```text
applicationId/package name
```

The value is:

- case-sensitive
- immutable for that Firebase app registration

A build variant with a different application ID normally needs its own Firebase Android app registration.

---

# `google-services.json`

Current native Android setup uses:

```text
android/app/google-services.json
```

or build/source-set-specific variants.

This file contains Firebase client configuration.

It is not a service-account secret.

---

# Google Services Gradle Plugin

The plugin:

```text
com.google.gms.google-services
```

runs at build time.

It processes:

```text
google-services.json
```

into Android resources consumed by Firebase SDKs.

It is not:

```text
Google Play services
```

and does not itself determine whether the device has Google Play services.

---

# Do Not Copy Old Gradle Version Snippets Blindly

Firebase's generic Android documentation and FlutterFire's bundled/tooling versions can change independently.

Current FlutterFire CLI 1.3+ derives build-plugin versions from the installed `firebase_core` package where appropriate.

Preferred:

```text
use current FlutterFire CLI
review generated Gradle diff
```

rather than hardcoding a plugin version copied from a two-year-old tutorial.

---

# Google Play Services

Some downstream Firebase Android SDKs require/recommend Google Play services.

Core platform support itself does not mean:

```text
every Firebase product works fully on every Android device
```

Check the downstream SDK.

---

# Android Flavors / Build Types

Current FlutterFire CLI supports explicit Android output paths.

Example:

```shell
flutterfire configure \
  --yes \
  --project=my-dev-project \
  --platforms=android \
  --android-package-name=com.example.app.dev \
  --android-out=android/app/src/dev/google-services.json \
  --out=lib/firebase/dev/firebase_options.dart
```

Production:

```shell
flutterfire configure \
  --yes \
  --project=my-prod-project \
  --platforms=android \
  --android-package-name=com.example.app \
  --android-out=android/app/src/prod/google-services.json \
  --out=lib/firebase/prod/firebase_options.dart
```

The exact Gradle source-set names must match the application's actual flavor/build configuration.

---

# Android Environment Rule

These three must agree:

```text
built applicationId
Firebase Android app registration
google-services.json selected by build
```

And Dart:

```text
FirebaseOptions
```

must point to that same environment.

A staging binary with:

```text
staging native JSON
+
production firebase_options.dart
```

is a broken build.

---

# iOS

## Bundle ID

The Firebase Apple app registration must match the actual bundle ID.

It is:

- case-sensitive
- immutable for that Firebase app registration

Different bundle IDs require separately registered Firebase applications.

---

# `GoogleService-Info.plist`

Normal native Apple configuration uses a matching:

```text
GoogleService-Info.plist
```

FlutterFire CLI can create/write this file.

Do not manually load a custom plist at runtime for a standard single-environment Flutter app when build configuration can select it correctly.

---

# iOS Requirements

Current Firebase Flutter setup requires:

```text
iOS 15+
```

for the current Firebase SDK line.

Always revalidate after FlutterFire major upgrades.

---

# Apple Build Configurations

Current CLI supports build-specific configuration.

Example:

```shell
flutterfire configure \
  --platforms=ios \
  --ios-bundle-id=com.example.app \
  --ios-build-config=Release \
  --ios-out=ios/firebase/prod/GoogleService-Info.plist \
  --out=lib/firebase/prod/firebase_options.dart
```

Configure each build environment intentionally.

The CLI documentation says Apple configuration must be performed from macOS where it needs Xcode project information.

---

# macOS

`firebase_core` currently supports macOS.

Current deployment target:

```text
macOS 10.15+
```

Current general Flutter Firebase setup also requires Keychain Sharing for macOS/macOS Catalyst targets.

Do not assume that every downstream Firebase plugin has production-grade macOS support.

The current FlutterFire matrix marks many “Other Apple” product implementations beta.

---

# Web

Normal initialization:

```dart
await Firebase.initializeApp(
  options:
      DefaultFirebaseOptions.currentPlatform,
);
```

Web needs the generated Firebase Web app options.

There is no:

```text
google-services.json
```

or:

```text
GoogleService-Info.plist
```

for Web.

---

# Web JS SDK

Current FlutterFire Web automatically injects the supported Firebase JavaScript modules.

Do not add old-style code such as:

```html
<script src="firebase-app.js"></script>
<script>
  firebase.initializeApp(...);
</script>
```

to a normal Flutter Web project.

That can:

- load another SDK version
- duplicate Firebase initialization
- conflict with FlutterFire
- increase page startup work

Let FlutterFire manage the JS version.

---

# Advanced Web Manual Loading

FlutterFire officially supports opting individual service scripts out of auto-injection using:

```javascript
window.flutterfire_ignore_scripts = [
  'analytics',
  'firestore'
];
```

but then the application is responsible for loading compatible modules.

Use this only for deliberate advanced requirements such as:

- consent-controlled script loading
- self-hosted JS
- special network policy
- strict Trusted Types/CSP architecture

Do not introduce it as normal setup.

---

# Web Trusted Types

Current FlutterFire Web supports Trusted Types and creates FlutterFire-specific policies during SDK injection.

If Web initialization fails under strict security headers:

```text
inspect CSP
inspect Trusted Types
inspect module loading
inspect browser network failures
```

before adding retries.

---

# Web Environments

Generate distinct Dart configuration files.

Example:

```shell
flutterfire configure \
  --yes \
  --project=my-dev-project \
  --platforms=web \
  --web-app-id=<DEV_WEB_APP_ID> \
  --out=lib/firebase/dev/firebase_options.dart
```

Production:

```shell
flutterfire configure \
  --yes \
  --project=my-prod-project \
  --platforms=web \
  --web-app-id=<PROD_WEB_APP_ID> \
  --out=lib/firebase/prod/firebase_options.dart
```

Then select one deterministically at build time.

---

# Windows

Current `firebase_core` registers a Windows implementation.

FlutterFire CLI configures Windows using a Firebase Web app because Firebase Console has no Windows app registration type.

Example:

```shell
flutterfire configure \
  --yes \
  --project=my-development-project \
  --platforms=windows
```

A specific Web app can be supplied using the current:

```text
--windows-app-id
```

flag.

Critical:

```text
Firebase's Flutter documentation says Windows support
is not intended for production use,
only local-development workflows.
```

Do not design a production Windows Firebase product around `firebase_core` merely because pub.dev displays a Windows badge.

---

# Linux

The current `firebase_core` pubspec does not register a Linux implementation.

Do not generate:

```text
Firebase Core supports Linux
```

based on generic Firebase C++ desktop documentation.

The Firebase C++ SDK has separate desktop-development workflows, but that is not the same as FlutterFire `firebase_core` Linux support.

---

# Environments and Flavors

Firebase currently recommends separate Firebase projects for separate development environments.

Recommended:

```text
Firebase project: my-app-dev
Firebase project: my-app-staging
Firebase project: my-app-prod
```

Within each project, group platform versions of the same end-user application:

```text
dev project
  ├── Android dev app
  ├── iOS dev app
  └── Web dev app

prod project
  ├── Android prod app
  ├── iOS prod app
  └── Web prod app
```

---

# Environment Selection

Use a deterministic build-time value.

Example:

```dart
enum AppEnvironment {
  development,
  staging,
  production,
}

AppEnvironment get appEnvironment {
  const String value =
      String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );

  return switch (value) {
    'development' =>
      AppEnvironment.development,
    'staging' =>
      AppEnvironment.staging,
    'production' =>
      AppEnvironment.production,
    _ => throw StateError(
        'Unsupported APP_ENV: $value',
      ),
  };
}
```

Do not determine Firebase project from the logged-in user.

---

# Flavor Options Selection

If separate generated files exist:

```dart
import 'package:firebase_core/firebase_core.dart';

import 'dev/firebase_options.dart'
    as dev;
import 'prod/firebase_options.dart'
    as prod;
import 'staging/firebase_options.dart'
    as staging;

FirebaseOptions firebaseOptionsFor(
  AppEnvironment environment,
) {
  return switch (environment) {
    AppEnvironment.development =>
      dev.DefaultFirebaseOptions
          .currentPlatform,
    AppEnvironment.staging =>
      staging.DefaultFirebaseOptions
          .currentPlatform,
    AppEnvironment.production =>
      prod.DefaultFirebaseOptions
          .currentPlatform,
  };
}
```

Then:

```dart
await Firebase.initializeApp(
  options: firebaseOptionsFor(
    appEnvironment,
  ),
);
```

The native Android/Apple service file selected by the build MUST match this same environment.

---

# Avoid `kDebugMode` as the Entire Environment Model

This can be acceptable for a trivial two-build prototype:

```text
debug -> dev
release -> prod
```

but real applications often have:

```text
debug prod
profile staging
release staging
release prod
```

Use explicit build configuration/flavor/environment identifiers.

---

# Configuration Verification

During internal/test builds, safely log:

```text
application environment
Firebase app name
Firebase project ID
Firebase app ID suffix/prefix if useful
```

Example:

```dart
final FirebaseApp app =
    Firebase.app();

debugPrint(
  'Firebase app=${app.name} '
  'project=${app.options.projectId}',
);
```

Do not log:

- user access tokens
- refresh tokens
- Admin credentials
- private service keys

---

# Prevent Production/Stage Mismatch

A production pipeline SHOULD verify:

```text
bundle/application ID
environment
Firebase project ID
native config source file
generated Dart options
```

before release.

A useful release assertion in internal CI/integration tests:

```dart
if (appEnvironment ==
        AppEnvironment.production &&
    Firebase.app().options.projectId !=
        'my-production-project') {
  throw StateError(
    'Production build is connected to '
    'the wrong Firebase project.',
  );
}
```

Keep the expected project ID as non-secret build configuration.

---

# Manual `FirebaseOptions`

Use manually constructed options when:

- creating a genuine secondary app
- writing advanced test infrastructure
- generating configuration outside FlutterFire CLI
- a supported custom architecture requires it

Do not manually transcribe default production options from the Firebase Console if:

```text
flutterfire configure
```

can generate them.

Manual transcription creates drift.

---

# Native Service Files vs Dart Options

Do not treat these as interchangeable artifacts.

## Android/Apple native service files

Used by native SDK/build integration.

Examples:

```text
google-services.json
GoogleService-Info.plist
```

## Dart options

Used by FlutterFire Core for a uniform cross-platform initialization API.

Example:

```text
firebase_options.dart
```

Current FlutterFire CLI manages both where applicable.

Do not delete native service files merely because the Dart code passes `FirebaseOptions`.

---

# Background Isolates

Do not generalize one lifecycle rule to every background plugin.

Dart isolates have separate Dart memory/state.

The correct question is:

```text
What does the downstream plugin document
for its background entry point?
```

---

# Firebase Messaging Background Example

Current Messaging documentation says that on Android, its background handler runs in a spawned isolate and must initialize Firebase before using other Firebase services.

Pattern:

```dart
@pragma('vm:entry-point')
Future<void>
    firebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  await Firebase.initializeApp(
    options:
        DefaultFirebaseOptions
            .currentPlatform,
  );

  // Use Firebase services only after
  // initialization when required here.
}
```

Do not copy this pattern into every isolate in the application unless that isolate actually uses FlutterFire and its plugin lifecycle supports it.

Note also that Apple Messaging background execution uses different isolate behavior from Android.

---

# Generic Spawned Isolates

Do not assume:

```dart
Firebase.apps
```

from the main Dart isolate is ordinary shared Dart memory in another isolate.

If an isolate needs platform plugins:

- ensure the Flutter background-isolate/plugin mechanism is supported
- follow the plugin's documentation
- initialize Core in that entry point if required before Firebase plugin use

For pure CPU isolates that do not use Firebase, do not initialize Firebase.

---

# Testing

Use layers.

---

# Pure Unit Tests

Do not initialize real Firebase simply to test:

```text
domain logic
model parsing
repository decisions
state reducers
use cases
```

Inject/fake your repository or service boundary.

Example architecture:

```text
unit test
   ↓
FakeUserRepository
```

not:

```text
unit test
   ↓
real Firebase Core
   ↓
real Firebase
```

---

# Widget Tests

`testWidgets` initializes its own test binding.

Avoid requiring native Firebase unless the widget's purpose is specifically Firebase integration.

Prefer injected fakes for application state.

This makes widget tests:

- deterministic
- fast
- offline
- independent of project configuration

---

# Core Integration Tests

Use integration tests to verify:

```text
Firebase initializes
expected project is selected
expected platform configuration exists
correct environment/flavor mapping
release configuration works
```

Example assertion:

```dart
expect(
  Firebase.app().options.projectId,
  expectedProjectId,
);
```

Run against an isolated Firebase test environment or appropriate emulator configuration—not production.

---

# Emulator Suite

Firebase Core establishes the Firebase app/project identity.

Individual product plugins configure their emulator endpoints.

Examples conceptually:

```text
Firebase Core
      ↓
Firestore.useFirestoreEmulator(...)
Auth.useAuthEmulator(...)
Storage.useStorageEmulator(...)
Functions.useFunctionsEmulator(...)
```

Use the exact current API from each product plugin.

Do not expect:

```dart
Firebase.initializeApp(...)
```

by itself to redirect all products to localhost.

---

# Demo Project

Current Core supports:

```dart
await Firebase.initializeApp(
  demoProjectId: 'demo-my-project',
);
```

Firebase recommends `demo-` project IDs for emulator-only workflows where practical because they cannot accidentally access live Firebase resources.

However:

- keep the emulator CLI project ID consistent
- configure each downstream emulator
- verify how a named/demo app is consumed by the downstream plugin

Do not assume `demoProjectId` alone configures every service.

---

# Do Not Use Production Firebase for Automated Tests

Avoid:

```text
CI integration test
      ↓
production Auth users
production Firestore
production Storage
```

Use:

- demo/emulator project
- dedicated test Firebase project
- staging project where appropriate

This prevents:

- data pollution
- billing surprises
- test notifications
- test analytics
- security risk

---

# Error Handling

Current Core failures use `FirebaseException`.

Useful fields:

```text
plugin
code
message
stackTrace
```

---

# `core/no-app`

Meaning:

```text
requested app does not exist
```

Common cause:

```dart
Firebase.app()
```

before Core initialization or wrong named-app lookup.

Fix lifecycle/configuration.

---

# `core/not-initialized`

Meaning:

```text
Firebase Core/platform setup is not ready
```

Common cause:

```text
FlutterFire plugin used before Firebase.initializeApp()
```

Fix ordering.

---

# `core/duplicate-app`

Meaning:

```text
same app name is being initialized
with conflicting configuration
```

Investigate:

```text
multiple initialization paths
stale native service file
wrong generated options
environment mismatch
manually initialized JS/native Firebase
```

Do not simply catch and ignore it.

---

# Configuration Failure vs Transient Failure

## Usually deterministic

```text
wrong package ID
wrong bundle ID
missing service file
bad FirebaseOptions
wrong project
duplicate conflicting app
unsupported platform
```

Retries do not fix these.

## Potentially transient on Web

```text
Firebase JS module network failure
CSP blocking scripts
Trusted Types misconfiguration
offline browser
```

Diagnose the cause.

Do not loop initialization indefinitely.

---

# Initialization Timeout

Native Core initialization is not normally a remote server operation.

Do not add:

```dart
Firebase.initializeApp(...)
    .timeout(
  const Duration(seconds: 5),
);
```

as a universal rule.

That can turn slow local/plugin startup into an arbitrary application failure without fixing anything.

For Web, if product startup policy needs a bounded network/module-load wait, handle it as part of the application bootstrap UX, not as a claim that Firebase Core has a documented universal timeout.

---

# Fail Fast vs Degraded Mode

## Firebase is foundational

Example:

```text
all application state lives in Firebase
```

Then initialization failure should lead to:

- controlled bootstrap error UI
- safe diagnostic logging
- no partially initialized feature access

## Firebase feature is optional

Example:

```text
optional analytics-only integration
```

The application MAY render without the optional Firebase functionality if the product architecture permits it.

The decision belongs to application requirements.

Do not silently swallow Firebase failure and then let downstream plugins fail unpredictably.

---

# Startup Error Screen Pattern

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  Object? bootstrapError;

  try {
    await Firebase.initializeApp(
      options:
          DefaultFirebaseOptions
              .currentPlatform,
    );
  } catch (
    Object error,
    StackTrace stackTrace,
  ) {
    bootstrapError = error;

    debugPrint(
      'Firebase bootstrap failed: '
      '${error.runtimeType}\n'
      '$stackTrace',
    );
  }

  runApp(
    App(
      bootstrapError:
          bootstrapError,
    ),
  );
}

class App extends StatelessWidget {
  const App({
    required this.bootstrapError,
    super.key,
  });

  final Object? bootstrapError;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: bootstrapError == null
          ? const HomeScreen()
          : const BootstrapErrorScreen(),
    );
  }
}

class HomeScreen
    extends StatelessWidget {
  const HomeScreen({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Home'),
      ),
    );
  }
}

class BootstrapErrorScreen
    extends StatelessWidget {
  const BootstrapErrorScreen({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text(
          'The application could not '
          'initialize required services.',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
```

Do not expose raw Firebase configuration internals to end users.

---

# Architecture

## Small App

The correct architecture can be this simple:

```text
main.dart
    ↓
Firebase.initializeApp()
    ↓
runApp()
```

No `FirebaseCoreRepository` is needed.

---

# Medium/Large App

Centralize startup:

```text
lib/
  bootstrap/
    bootstrap.dart
    app_environment.dart
  firebase/
    firebase_config.dart
```

Potential responsibilities:

```text
bootstrap.dart
  binding
  Core initialization
  other truly essential startup dependencies
  bootstrap error handling

app_environment.dart
  deterministic environment

firebase_config.dart
  generated options selection
```

Do not create abstraction solely to wrap one method call.

---

# Firebase Core Is Not a Service Locator

Avoid:

```dart
class FeatureWidget {
  void doSomething() {
    final app = Firebase.app();
    // discover all dependencies from here
  }
}
```

Feature/application layers should normally depend on the relevant Firebase service/repository, not Core itself.

Core belongs to infrastructure/bootstrap.

---

# Multiple FlutterFire Plugins

Correct conceptual dependency graph:

```text
Firebase Core
   |
   +--> Auth
   +--> Firestore
   +--> Messaging
   +--> Analytics
   +--> Crashlytics
   +--> Remote Config
```

But this does NOT mean:

```text
main()
  await Core
  await every child
  runApp
```

Each child's startup criticality is separate.

---

# Plugin Ordering

Core must precede FlutterFire plugin use.

Beyond that:

```text
consult the current plugin's documentation
```

Examples where ordering may matter include:

- Crashlytics error-handler installation
- App Check activation
- Messaging background handlers
- Auth bootstrap
- Remote Config defaults/fetch
- Analytics consent

Do not put product-specific ordering into Core architecture without verifying its current plugin version.

---

# Performance Anti-Optimization Warnings

Do not:

```text
initialize Firebase twice for reliability
```

Do not:

```text
create multiple Firebase apps to parallelize work
```

Do not:

```text
manually parse google-services.json to save time
```

Do not:

```text
skip await and immediately use plugins
```

Do not:

```text
retry configuration errors
```

Do not:

```text
move Core after runApp blindly
```

Measure and preserve dependency correctness.

---

# Multiple Firebase App Cost

Each additional Firebase app can introduce:

```text
native/Web Firebase app state
service-specific instances
caches
listeners
connections
tokens
configuration complexity
```

depending on downstream services.

Multiple apps are not a startup optimization.

Use the minimum number required by product architecture.

---

# Security Rules

## MUST

- keep service-account credentials server-side
- keep Admin SDK credentials server-side
- use service-specific authorization controls
- keep environment mapping deterministic
- verify production project IDs
- configure API-key restrictions appropriately
- separate test/prod resources

## SHOULD

- use App Check where the downstream service/security model benefits from it
- review Security Rules independently
- use separate Firebase projects per dev environment
- log only non-sensitive config diagnostics

## MUST NOT

- hide a UI control and call that authorization
- treat `firebase_options.dart` secrecy as database security
- embed Admin credentials
- give a Flutter app service-role/backend privileges

---

# Logging

Safe internal startup log:

```text
Firebase initialized
environment=staging
app=[DEFAULT]
project=my-app-staging
```

Avoid:

```text
Firebase Auth access token
refresh token
service account JSON
private key
server credential
```

---

# Debugging Guide

| Symptom | Likely Cause | How to Verify | Fix |
|---|---|---|---|
| `[core/no-app]` | Firebase plugin/app used before Core | Search startup order | Initialize Core before usage |
| `[core/not-initialized]` | Core bootstrap missing | Inspect `main()` | Call `Firebase.initializeApp` |
| `[core/duplicate-app]` | Same name + conflicting config | Compare init paths/options/native files | Remove duplicate owner/fix config |
| Works after `Firebase.apps.isEmpty` workaround only | Bad lifecycle architecture | Search all initialization calls | Centralize initialization |
| Android app connects to wrong project | Wrong source-set JSON/options | Inspect built applicationId/project ID | Regenerate correct flavor config |
| Android says config values missing | JSON/Google Services plugin issue | Inspect `google-services.json`, generated resources, Gradle | Re-run current CLI / fix build integration |
| Android package not matched in Firebase | Wrong application ID | Compare Gradle vs Firebase Console | Register correct Firebase Android app |
| iOS init wrong project | Wrong plist/options | Inspect bundle ID and plist | Configure matching Firebase app |
| Apple app registration rejected/mismatched | Bundle ID mismatch | Compare Xcode bundle ID | Register exact case-sensitive ID |
| macOS plugin fails despite Core working | Downstream beta/unsupported plugin | Check current FlutterFire matrix | Use supported product/platform |
| Web init fails before app | JS module/CSP/network | Browser network/console | Fix CSP/Trusted Types/network |
| Web duplicate Firebase app | Manual JS init + FlutterFire or conflicting Dart init | Search `index.html` and Dart | Let FlutterFire own initialization |
| Web loads wrong Firebase project | Wrong generated Web options | Inspect `Firebase.app().options.projectId` | Regenerate/select correct file |
| Production binary hits staging | Build env and Firebase config mismatch | Log project ID in release candidate | Fix flavor/CI mapping |
| Staging hits production | Wrong options/native resource | Inspect artifact config | Separate Firebase projects/config |
| Hot restart reports duplicate app | Conflicting options/native config | Compare generated options with native resources | Fix stale configuration |
| Plugin works Android but not Windows | Downstream plugin/platform limitation | Check official matrix | Do not infer from Core support |
| Windows works locally, planned for public release | Unsupported production assumption | Review Firebase Windows caution | Use supported production backend |
| Background Messaging cannot use Firestore | Core not initialized in background isolate | Inspect handler | Follow Messaging background setup |
| Integration tests modify production | Wrong Firebase project/emulator config | Inspect test project ID | Use demo/emulator/test project |
| `initializeApp` appears slow on Web | Firebase JS/service modules loading | Browser network/performance panel | Measure modules; defer optional services |
| `initializeApp` appears slow native | Registered plugins/application startup | Profile Core interval and surrounding tasks | Optimize measured blocker |
| Default app deletion throws | Current Core forbids it | Search `Firebase.app().delete()` | Delete secondary only |
| Secondary app service unavailable | Plugin doesn't support secondary apps | Inspect plugin API | Redesign or use supported plugin |
| `firebase_options.dart` changed manually | Generated/native mismatch | Diff against `flutterfire configure` output | Regenerate |

---

# Anti-Patterns

## Anti-pattern: Initialize in every screen

### Bad

```dart
await Firebase.initializeApp();
```

from pages/services repeatedly.

### Why

Creates unclear lifecycle ownership and races.

### Preferred

One app bootstrap.

---

## Anti-pattern: `Firebase.apps.isEmpty` everywhere

### Bad

```dart
if (Firebase.apps.isEmpty) {
  await Firebase.initializeApp();
}
```

### Why

Treats symptoms instead of lifecycle ownership and can hide wrong options.

### Preferred

One known initialization path; explicit plugin-documented background paths.

---

## Anti-pattern: Assume native auto-config means Dart Core call unnecessary

### Why

Current FlutterFire explicitly still requires `Firebase.initializeApp()`.

### Preferred

Call it before FlutterFire plugin use.

---

## Anti-pattern: Manually edit `firebase_options.dart`

### Why

Generated Dart options can diverge from native config and Firebase Console.

### Preferred

Rerun FlutterFire CLI.

---

## Anti-pattern: Treat Firebase API key as Admin secret

### Why

Firebase client keys identify app/project and are intended for clients.

### Preferred

Protect data through rules/IAM/Auth/App Check and keep actual server credentials secret.

---

## Anti-pattern: Service-account JSON in Flutter

### Why

Gives privileged backend credentials to every client.

### Preferred

Trusted backend/Admin infrastructure only.

---

## Anti-pattern: Same Firebase project for every environment

### Why

Can mix:

```text
test users
test data
Analytics
Crashlytics
Messaging
Remote Config
```

with production.

### Preferred

Separate Firebase projects per environment.

---

## Anti-pattern: Wrong config per flavor

### Why

A production binary can silently use staging resources or vice versa.

### Preferred

CI-enforced deterministic mapping.

---

## Anti-pattern: Runtime Firebase project switch per user

### Why

Reconstructs infrastructure and complicates all Firebase product state.

### Preferred

Use Auth/data authorization for ordinary tenancy.

---

## Anti-pattern: Several secondary apps for architecture neatness

### Why

Additional state/complexity with no benefit.

### Preferred

One default app unless simultaneous projects are genuinely needed.

---

## Anti-pattern: Assume every plugin supports secondary apps

### Why

Core capability is not downstream capability.

### Preferred

Verify each plugin.

---

## Anti-pattern: Delete default app on logout

### Why

Current Core forbids default-app deletion, and logout is an Auth concern.

### Preferred

Sign out via Auth and leave Core alive.

---

## Anti-pattern: Initialize every Firebase plugin before `runApp`

### Why

Adds unnecessary startup work.

### Preferred

Only initialize startup-critical products early.

---

## Anti-pattern: Remote Firebase work blamed on Core

### Why

Core native initialization is mainly local bootstrap; service network work is distinct.

### Preferred

Profile boundaries separately.

---

## Anti-pattern: Claim Core never uses network

### Why

FlutterFire Web can dynamically load Firebase JS modules.

### Preferred

Distinguish native vs Web.

---

## Anti-pattern: Retry `core/duplicate-app`

### Why

It is usually a configuration/lifecycle conflict.

### Preferred

Fix options/ownership.

---

## Anti-pattern: Core timeout everywhere

### Why

Native Core is not a remote health check.

### Preferred

Use normal await and diagnose deterministic failure.

---

## Anti-pattern: Copy old Gradle setup

### Why

Firebase/FlutterFire tooling versions evolve.

### Preferred

Use current CLI and review generated build changes.

---

## Anti-pattern: Manual Firebase JS initialization on Web

### Why

Can duplicate/mismatch FlutterFire's tested JS SDK.

### Preferred

Use FlutterFire auto-injection unless advanced requirements demand otherwise.

---

## Anti-pattern: Production Windows assumption

### Why

Current Firebase docs explicitly caution against production Windows Firebase use.

### Preferred

Treat Windows support as development workflow only unless Firebase guidance changes.

---

## Anti-pattern: Initialize Firebase in pure unit tests

### Why

Makes tests slow, platform-dependent, and brittle.

### Preferred

Fake the application's Firebase-backed repositories/services.

---

## Anti-pattern: Core configures every emulator

### Why

Emulator endpoints belong to individual Firebase services.

### Preferred

Configure each service emulator explicitly.

---

## Anti-pattern: Measure only debug startup

### Why

Debug mode has development overhead.

### Preferred

Profile/release-like measurements.

---

# Implementation Checklist

1. [ ] Inspect `pubspec.lock`.
2. [ ] Confirm installed `firebase_core`.
3. [ ] Confirm Flutter/Dart compatibility.
4. [ ] Install/update Firebase CLI.
5. [ ] Install/update FlutterFire CLI.
6. [ ] Identify application environments.
7. [ ] Create/select correct Firebase projects.
8. [ ] Register correct platform apps.
9. [ ] Run `flutterfire configure`.
10. [ ] Select only actual target platforms.
11. [ ] Verify generated `firebase_options.dart`.
12. [ ] Verify Android `google-services.json`.
13. [ ] Verify Apple `GoogleService-Info.plist`.
14. [ ] Verify Web app configuration.
15. [ ] Verify Windows development-only expectation if targeted.
16. [ ] Add `firebase_core`.
17. [ ] Initialize binding before pre-runApp plugin work.
18. [ ] Initialize one default Firebase app.
19. [ ] Remove duplicate Core initialization paths.
20. [ ] Add downstream Firebase plugins.
21. [ ] Rerun `flutterfire configure`.
22. [ ] Initialize only startup-critical Firebase services.
23. [ ] Configure product emulators separately.
24. [ ] Test correct project ID per flavor.
25. [ ] Test release/profile build.
26. [ ] Audit client code for privileged credentials.
27. [ ] Measure startup only if there is a real performance issue.

---

# Startup Audit Checklist

When Firebase startup is suspected of being slow:

- [ ] Time `Firebase.initializeApp`.
- [ ] Measure overall first-frame time.
- [ ] Inspect all `await`s before `runApp`.
- [ ] Identify registered FlutterFire plugins.
- [ ] Identify product-specific startup calls.
- [ ] Identify network fetches.
- [ ] Identify local database/disk work.
- [ ] Identify synchronous CPU work.
- [ ] Check whether Core is initialized more than once.
- [ ] Check number of secondary apps.
- [ ] Profile Web network module loading separately.
- [ ] Check whether optional Firebase products can move later.
- [ ] Test physical release/profile device.
- [ ] Compare cold/warm behavior.
- [ ] Optimize the largest measured blocker.

---

# Code Review Checklist

## Core

- [ ] Exactly one intended default-app bootstrap?
- [ ] Current `Firebase.initializeApp` API?
- [ ] Generated options used?
- [ ] Binding initialized when necessary?
- [ ] No unnecessary `Firebase.apps.isEmpty` hacks?
- [ ] No default app deletion?

## Configuration

- [ ] Correct Firebase project?
- [ ] Correct Android application ID?
- [ ] Correct Apple bundle ID?
- [ ] Correct native service files?
- [ ] Correct generated options?
- [ ] Correct flavor mapping?

## Security

- [ ] No service-account JSON?
- [ ] No Admin credential?
- [ ] No server private key?
- [ ] Client API keys treated correctly?
- [ ] Rules/App Check reviewed in downstream services?

## Startup

- [ ] No unnecessary Firebase product initialization?
- [ ] No service fetch before first frame without requirement?
- [ ] No duplicate Firebase apps?
- [ ] Web module-loading cost considered?
- [ ] Release/profile measurement?

## Secondary Apps

- [ ] Actually required?
- [ ] Unique stable name?
- [ ] Explicit options?
- [ ] Downstream plugin support verified?
- [ ] Lifecycle/deletion deliberate?

## Platforms

- [ ] Android supported?
- [ ] iOS supported?
- [ ] macOS downstream beta limitations reviewed?
- [ ] Web tested?
- [ ] Windows not treated as production?
- [ ] Linux not falsely claimed?

## Background

- [ ] Background plugin docs reviewed?
- [ ] Firebase initialized in entry point where explicitly required?
- [ ] No unnecessary Firebase in pure CPU isolates?

## Tooling

- [ ] Current FlutterFire CLI?
- [ ] `flutterfire configure` recently rerun?
- [ ] Old Gradle snippets removed?
- [ ] Old manual Web Firebase scripts removed?
- [ ] Apple configuration matches current Xcode target/build?

---

# Production Readiness Checklist

- [ ] Production Firebase project exists.
- [ ] Production Android Firebase app verified.
- [ ] Production Apple Firebase app verified.
- [ ] Production Web Firebase app verified.
- [ ] macOS product support reviewed if shipped.
- [ ] Windows not used as unsupported production architecture.
- [ ] Production project ID verified in release candidate.
- [ ] Dev/staging/prod projects separated.
- [ ] Application IDs/bundle IDs match.
- [ ] Native service files match environment.
- [ ] Dart Firebase options match environment.
- [ ] No Admin/service credentials in app.
- [ ] Security Rules reviewed for services.
- [ ] App Check decision reviewed where relevant.
- [ ] Exactly one default Core initialization owner.
- [ ] Secondary apps minimized.
- [ ] Downstream secondary-app support verified.
- [ ] Initialization failure UX reviewed.
- [ ] Background entry points tested.
- [ ] Emulator/test project isolated from production.
- [ ] Android release build tested.
- [ ] iOS release build tested.
- [ ] Web production build tested.
- [ ] macOS tested if applicable.
- [ ] Startup measured in profile/release-like conditions.
- [ ] Optional Firebase service startup reviewed.

---

# Version-Sensitive Areas

Always revalidate these.

## `firebase_core`

Current validation:

```text
4.13.0
```

Recent releases changed:

- native Firebase SDK versions
- Windows integration/linking
- service registration/disposal
- Core initialization documentation
- FirebaseOptions fields

---

## FlutterFire CLI

Current stable validation:

```text
1.4.0
```

Revalidate:

```text
configure flags
reconfigure behavior
multi-build support
Gradle modification
Apple output handling
Windows app mapping
generated firebase_options.dart format
```

---

## Flutter Version

Current Core pubspec requires:

```text
Flutter >= 3.27.0
Dart ^3.6.0
```

Future releases may raise requirements.

---

## Android

Revalidate:

```text
minimum Android support
compile/target SDK
Android Firebase BoM
Google Services Gradle plugin
Gradle/AGP syntax
FlutterFire CLI integration
```

Do not hardcode old Gradle plugin versions.

---

## Apple

Current Core requires:

```text
iOS >= 15
macOS >= 10.15
```

Revalidate:

```text
Xcode
CocoaPods/SPM integration
Firebase Apple SDK
deployment target
build configuration behavior
```

---

## Web

Revalidate:

```text
Firebase JS SDK version
script auto-injection
Trusted Types
registered service initialization
manual ignore-script behavior
```

Web internals evolve rapidly.

---

## Windows

Revalidate both:

```text
firebase_core implementation support
Firebase's production-readiness policy
```

Do not assume the current development-only warning will always remain, and do not assume it has been lifted without checking.

---

## Secondary Apps

Revalidate:

```text
Core behavior
each downstream plugin
each platform
```

Do not assume parity.

---

## Background Isolates

Revalidate using the current downstream plugin.

Messaging requirements are not a universal FlutterFire isolate contract.

---

# Decision Framework

## One project / normal app

Use:

```text
one default Firebase app
```

Recommended:

```dart
await Firebase.initializeApp(
  options:
      DefaultFirebaseOptions.currentPlatform,
);
```

---

## Dev/staging/production

Use:

```text
separate Firebase projects
+
build-time/flavor selection
+
matching native config
+
matching generated Dart options
```

---

## Two Firebase projects simultaneously

Use a named secondary app only if:

```text
runtime simultaneous access is genuinely required
+
the downstream Firebase plugin supports it
```

---

## Firebase required by root state

Use:

```text
await Core before runApp
```

This is the normal official setup.

---

## Firebase optional for first screen

MAY initialize asynchronously around/after first-frame startup, but only if:

```text
no Firebase plugin is touched early
+
lifecycle is explicitly gated
+
measurement justifies the complexity
```

---

## Firebase initialization fails

If essential:

```text
show controlled startup error/fail safely
```

If optional:

```text
degrade that feature deliberately
```

Do not hide failure and continue unpredictably.

---

# Official References

## Firebase Core

https://pub.dev/packages/firebase_core

https://pub.dev/packages/firebase_core/changelog

https://pub.dev/documentation/firebase_core/latest/firebase_core/

https://pub.dev/documentation/firebase_core/latest/firebase_core/Firebase-class.html

https://pub.dev/documentation/firebase_core/latest/firebase_core/FirebaseApp-class.html

https://pub.dev/documentation/firebase_core/latest/firebase_core/FirebaseOptions-class.html

## FlutterFire repository

https://github.com/firebase/flutterfire/tree/main/packages/firebase_core

https://github.com/firebase/flutterfire/blob/main/packages/firebase_core/firebase_core/lib/src/firebase.dart

https://github.com/firebase/flutterfire/blob/main/packages/firebase_core/firebase_core/lib/src/firebase_app.dart

https://github.com/firebase/flutterfire/blob/main/packages/firebase_core/firebase_core_platform_interface/lib/src/method_channel/method_channel_firebase.dart

https://github.com/firebase/flutterfire/blob/main/packages/firebase_core/firebase_core_web/lib/src/firebase_core_web.dart

## Firebase Flutter setup

https://firebase.google.com/docs/flutter/setup

## FlutterFire CLI

https://pub.dev/packages/flutterfire_cli

https://github.com/invertase/flutterfire_cli

## Firebase project environments

https://firebase.google.com/docs/projects/dev-workflows/general-best-practices

https://firebase.google.com/docs/projects/dev-workflows/overview-environments

## Firebase client API keys and security

https://firebase.google.com/docs/projects/api-keys

https://firebase.google.com/support/guides/security-checklist

## Android Firebase setup

https://firebase.google.com/docs/android/setup

https://firebase.google.com/docs/android/learn-more

https://firebase.google.com/docs/android/android-play-services

## Apple Firebase setup

https://firebase.google.com/docs/ios/setup

## Local Emulator Suite

https://firebase.google.com/docs/emulator-suite/connect_and_prototype

https://firebase.google.com/docs/emulator-suite/connect_auth

https://firebase.google.com/docs/emulator-suite/connect_firestore

## Messaging background isolates

https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages

## Flutter bindings

https://api.flutter.dev/flutter/widgets/WidgetsFlutterBinding/ensureInitialized.html

https://api.flutter.dev/flutter/widgets/runApp.html

## Flutter performance metrics

https://docs.flutter.dev/perf/metrics

---

# Final Rules for AI Coding Agents

Before modifying Firebase Core:

```text
1. Read pubspec.lock.
2. Read current firebase_core changelog.
3. Identify target platforms.
4. Check downstream FlutterFire platform support.
5. Identify environment/flavor.
6. Verify Firebase project/app registrations.
7. Inspect native service files.
8. Inspect generated firebase_options.dart.
9. Search every Firebase.initializeApp call.
10. Reduce ownership to intended bootstrap points.
11. Identify secondary apps.
12. Verify downstream secondary-app support.
13. Inspect pre-runApp Firebase service work.
14. Check background entry points.
15. Audit privileged secrets.
16. Run flutterfire configure when configuration changed.
17. Verify production project ID.
18. Test release/profile builds.
19. Measure actual startup before optimizing.
```

For most production Flutter applications, the correct architecture is:

```text
Flutter binding
      ↓
one Firebase Core default app
      ↓
runApp
      ↓
only the Firebase products the app needs
      ↓
optional Firebase work lazily
```

with environment selection:

```text
build flavor
      ↓
exact Firebase project
      ↓
matching native service files
      ↓
matching firebase_options.dart
      ↓
one [DEFAULT] app
```

not:

```text
user logs in
      ↓
guess Firebase project
      ↓
delete/recreate Core
      ↓
initialize several apps
      ↓
hope every plugin follows
```

The highest-priority Firebase Core properties are:

```text
correct project
correct platform config
one clear initialization owner
no privileged secrets
minimal startup blocking
verified downstream plugin lifecycle
```

Optimize measured application startup rather than assuming the Core bootstrap itself is the problem.