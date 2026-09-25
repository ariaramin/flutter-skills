# Firebase Messaging for Flutter

## Navigation

- [Core principles](#core-principles)
- [Architecture and initialization](#recommended-architecture)
- [Permissions and privacy](#permission-handling)
- [Tokens and backend registration](#token-and-registration-management)
- [Message handling, parsing, routing, and reliability](#foreground-message-handling)
- [Notification presentation](#notification-presentation)
- [Android](#android-configuration)
- [Apple and macOS](#apple-configuration)
- [Web](#web-configuration)
- [Topics and sending security](#topics)
- [Performance and reliability](#performance-rules)
- [Testing and debugging](#testing-checklist)
- [Anti-patterns](#common-anti-patterns)
- [Implementation checklist](#implementation-checklist)
- [Code-review checklist](#code-review-checklist)
- [Version-sensitive behavior](#version-sensitivity)
- [Official sources](#official-references)

Validated against official sources: 2026-08-11  
Reference package: `firebase_messaging 16.5.0`  
Official package platforms: Android, iOS, macOS, Web

---

## Purpose

This skill governs production use of Firebase Cloud Messaging (FCM) through FlutterFire's `firebase_messaging` package.

Use it to design, implement, review, debug, migrate, or optimize:

- Firebase Messaging initialization
- notification permission flows
- FCM registration/token synchronization
- foreground message handling
- background message handling
- notification interaction/tap routing
- notification presentation
- Android notification channels and priority
- APNs integration
- Web Push/service-worker integration
- topic subscriptions
- backend device-registration models
- delivery reliability
- FCM security boundaries
- messaging-related startup/runtime performance
- production testing and release verification

This skill is not documentation for Firebase Admin SDK, `flutter_local_notifications`, APNs, WorkManager, or browser service workers in general. It describes their boundaries only where they directly affect `firebase_messaging`.

---

## Authority and Rule Language

When this skill distinguishes rules:

- **MUST**: required for correctness, security, supported platform behavior, or an explicitly documented platform/plugin requirement.
- **SHOULD**: official recommendation or strong production default.
- **MAY**: optional behavior appropriate only for specific product requirements.
- **Engineering recommendation**: derived from documented FCM/platform behavior rather than an API-level requirement.

If this skill conflicts with the currently installed package documentation, package source, native Firebase SDK documentation, or current platform documentation, revalidate the affected behavior and prefer the newest authoritative source.

Do not copy old FlutterFire tutorials without checking the currently installed package.

---

# When to Use This Skill

Trigger this skill when asked to:

- add push notifications to a Flutter application
- configure `firebase_messaging`
- review an existing FCM implementation
- fix notifications that work only in foreground/background
- fix notification-tap routing
- implement `getInitialMessage()`
- implement `onMessageOpenedApp`
- implement `onBackgroundMessage`
- manage FCM registration tokens
- synchronize tokens with a backend
- handle token rotation
- manage notification permission
- configure Android 13+ notification permission
- configure Android notification channels
- configure APNs
- configure iOS/macOS push notifications
- configure Firebase Messaging for Flutter Web
- configure a messaging service worker
- subscribe users to FCM topics
- diagnose duplicate notifications
- diagnose release-only background failures
- reduce messaging startup work
- improve messaging battery/network efficiency
- make notification processing idempotent
- secure deep links/actions received through FCM
- migrate a legacy Firebase Messaging implementation

---

# Core Principles

1. **Treat FCM as a delivery hint/event transport, not a durable job queue.**
   Message delivery, ordering, background execution, and callback execution are not universally guaranteed.

2. **Keep authoritative business state on the backend.**
   A notification should generally tell the application that something changed, not be the sole durable copy of critical state.

3. **Separate receipt from interaction.**
   Receiving a message and the user later tapping a notification are distinct events. Do not use one global "already processed" flag that accidentally suppresses the tap.

4. **Register global listeners exactly once.**
   `onMessage`, native interaction streams, and token lifecycle listeners belong to application-scoped infrastructure, not individual widgets.

5. **Do not request permission blindly during startup.**
   Request notification permission at a product-appropriate moment where the user understands the value.

6. **Do not call `getToken()` merely because the app launched.**
   Token acquisition should follow notification eligibility/consent and backend registration needs.

7. **Treat a registration token as an installation routing identifier, not a user identity.**

8. **Make backend registration idempotent.**
   Sending the same token/session association repeatedly must not create duplicate device records.

9. **Expect token/registration changes.**
   Never permanently cache a token with the assumption that it cannot rotate.

10. **Keep background work short.**
    Parse, validate, persist minimal state if necessary, then exit. Use supported OS scheduling or later foreground reconciliation for expensive work.

11. **Never navigate from an Android background isolate.**

12. **Never place FCM server credentials in a Flutter application.**

13. **Treat notification payload data as untrusted input.**
    Validate it before navigation, API access, or state changes.

14. **Use notification topics for broadcast segmentation, not authorization.**

15. **Use Android high-priority delivery only for time-sensitive, user-visible notifications.**

16. **Do not assume notification presentation behavior is identical across platforms.**

17. **Do not blindly show a local notification for every received FCM notification payload.**
    Background notification messages may already be displayed by the OS/FCM SDK.

18. **Revalidate version-sensitive behavior whenever `firebase_messaging`, Firebase native SDKs, Flutter, Android target SDK, Xcode/iOS SDK, or browser/service-worker architecture changes.**

---

# Package Architecture

`firebase_messaging` is the FlutterFire bridge between Dart code and Firebase Cloud Messaging.

Conceptually:

```text
Trusted sender
  |
  | Firebase Admin SDK / FCM HTTP v1
  v
FCM backend
  |
  +--> Android: Firebase Messaging native SDK / Google Play services
  |
  +--> iOS/macOS: FCM -> APNs -> Apple device
  |
  +--> Web: FCM -> Web Push -> browser service worker
  |
  v
firebase_messaging Flutter plugin
  |
  v
Application transport/routing layer
```

`firebase_core` initializes the Firebase application used by `firebase_messaging`.

The package does not replace:

- APNs
- Android notification channels
- browser Web Push/service workers
- a trusted FCM sending backend
- application authorization
- durable background job scheduling
- application navigation architecture
- local notification presentation when custom presentation is needed

---

# Platform Capability Matrix

| Capability | Android | iOS | macOS | Web |
|---|---|---|---|---|
| Official package support | Yes | Yes | Yes | Yes |
| Delivery transport | FCM / Google Play services | FCM via APNs | FCM via APNs | Web Push |
| User notification permission | Runtime on Android 13+; notification settings also user-controlled | Required for user-visible notifications | Required | Browser permission |
| `FirebaseMessaging.onMessage` | Yes | Yes | Yes | Yes |
| Dart `onBackgroundMessage` execution | Yes; separate Dart isolate | Yes; not Android-style separate isolate | Yes; not Android-style separate isolate | Background delivery belongs to JS service worker, not Dart handler |
| `@pragma('vm:entry-point')` for native background callback | Required/recommended for release tree shaking | Keep on shared native handler | Keep on shared native handler | Not applicable to JS service worker |
| `getInitialMessage()` | Supported | Supported | Supported | Current web implementation returns `null` |
| `onMessageOpenedApp` | Native notification interactions | Native notification interactions | Native notification interactions | Do not design web routing around native tap APIs |
| `getToken()` | Yes | Yes; APNs token readiness matters | Yes; APNs integration matters | Yes; pass VAPID public key |
| `onTokenRefresh` | Use app-lifetime listener | Use app-lifetime listener | Use app-lifetime listener | Current FlutterFire web implementation is a no-op stream |
| Client topic subscribe/unsubscribe | Supported | Supported | Supported | Current FlutterFire web implementation: unsupported |
| Foreground OS presentation by default | No visible FCM banner by default | No visible banner unless configured | Apple presentation rules | Foreground page receives message; application decides UX |
| Foreground presentation API | Android channels/local presentation as needed | `setForegroundNotificationPresentationOptions` | `setForegroundNotificationPresentationOptions` | Apple API is no-op |
| Background notification payload display | Normally OS/FCM SDK | Normally APNs/system | Normally system | Service worker/browser |
| Background data execution guaranteed | No | No | No | No |
| Auto-init controls | Supported; native metadata available | Supported; native plist setting available | Revalidate current package behavior | Current web implementation does not offer equivalent runtime control |
| Google Play services dependency | Yes | No | No | No |
| APNs configuration | No | Yes | Yes | No |
| Service worker | No | No | No | Required for background Web Push |

Do not implement a single branch-free lifecycle strategy and assume it behaves identically on all four platforms.

---

# Recommended Architecture

Use the minimum structure needed to keep transport, permissions, registration, routing, and UI responsibilities separate.

A medium/large application may use:

```text
lib/
  notifications/
    messaging_coordinator.dart
    messaging_permission_service.dart
    messaging_registration_repository.dart
    notification_parser.dart
    notification_router.dart
    background_message_handler.dart
```

Web additionally has:

```text
web/
  firebase-messaging-sw.js
```

A smaller application may combine files, but preserve these responsibilities.

## Messaging coordinator

Owns:

- one application-lifetime `onMessage` subscription
- one application-lifetime native interaction subscription
- one native token-refresh subscription
- one `getInitialMessage()` check
- coordination between parser, registration repository, presentation layer, and router

It SHOULD NOT:

- contain widget-specific state
- contain authentication implementation
- send server-side FCM messages
- perform arbitrary navigation directly without app/router readiness
- own unrelated Firebase services

## Permission service

Owns:

- reading notification settings
- requesting permission after application UX decides to ask
- mapping platform authorization state into application state

It SHOULD NOT:

- silently request permission during constructor/startup
- own backend token registration

## Registration repository

Owns:

- retrieving the current registration token when needed
- APNs-token readiness handling on Apple
- token refresh handling
- local "last successfully synchronized registration" state
- idempotent backend registration/upsert
- account reassociation
- logout detachment
- retry state

It SHOULD NOT interpret notification payloads.

## Notification parser

Owns:

- schema validation
- event/action type validation
- version validation
- conversion from `RemoteMessage.data` to a domain-level intent

It SHOULD contain no navigation.

## Notification router

Owns:

- routing a validated interaction
- waiting until navigation state is available
- authentication checks
- authorization/resource-access checks
- fallback behavior for deleted/missing content

It SHOULD NOT inspect arbitrary FCM payload fields throughout widgets.

## Background handler

Owns only work that is actually valid and necessary while background execution is available.

It MUST NOT:

- navigate
- mutate widget state
- assume the foreground application's in-memory service graph exists on Android
- perform unbounded work

---

# Installation

Add the packages:

```shell
flutter pub add firebase_core
flutter pub add firebase_messaging
flutterfire configure
```

Use the current FlutterFire CLI-generated Firebase configuration rather than manually duplicating Firebase options unless the project has a deliberate custom Firebase setup.

For the reference package version `16.5.0`, the package declares:

```text
Dart:    ^3.6.0
Flutter: >=3.27.0
```

Always validate the constraints of the actually installed version.

---

# Firebase Project Configuration

## Required

The Flutter application MUST correspond to correctly registered Firebase applications for each target.

Typical generated/native configuration includes:

- Android Firebase application configuration
- Apple Firebase application configuration
- Web Firebase application configuration
- generated `firebase_options.dart`

Use:

```dart
await Firebase.initializeApp(
  options: DefaultFirebaseOptions.currentPlatform,
);
```

after:

```dart
WidgetsFlutterBinding.ensureInitialized();
```

## Security note

Firebase client configuration, including the Firebase Web API key, is not equivalent to a server credential.

Do not "secure" Firebase by trying to hide normal Firebase client configuration.

Server-side FCM authorization credentials are different and MUST remain in a trusted server environment.

---

# Initialization

## Production sequence

Before `runApp`, normally do only:

1. Flutter binding initialization.
2. Firebase Core initialization.
3. Native background-handler registration.
4. Any tiny synchronous configuration that genuinely must exist before application execution.

Example:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';

import 'firebase_options.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  final eventId = message.data['event_id'];
  final type = message.data['type'];

  if (eventId is! String || eventId.isEmpty) {
    return;
  }

  if (type is! String || type.isEmpty) {
    return;
  }

  // Keep background work short, idempotent, and isolate-safe.
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  FirebaseMessaging.onBackgroundMessage(
    firebaseMessagingBackgroundHandler,
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

The production application's actual root widget will naturally replace the demonstration `App`.

## After application startup

SHOULD generally happen after `runApp` or as part of app-scope bootstrap:

- global foreground listener registration
- global interaction listener registration
- initial-notification interaction capture
- token refresh listener registration
- permission UX
- token acquisition
- backend registration
- topic reconciliation
- notification-related analytics

This avoids placing unnecessary network/permission work on the critical Flutter startup path.

## Keep lazy

Keep these operations lazy until needed:

- `requestPermission()`
- `getToken()`
- topic synchronization
- local notification presentation plugin initialization if the feature does not need it immediately
- notification analytics services
- non-critical remote content fetches

---

# Permission Handling

## Rule

**MUST NOT request notification permission automatically at startup unless the product has a documented UX/legal reason for doing so.**

The official Firebase Flutter codelab performs this at startup only for demonstration and explicitly recommends asking when the user needs the notification-dependent feature.

Examples of appropriate moments:

- user enables "Order updates"
- user enables "Messages"
- onboarding explains a concrete notification benefit and user continues
- user enables an alert/reminder feature
- a product action genuinely requires notifications

## Current API

```dart
final NotificationSettings settings =
    await FirebaseMessaging.instance.requestPermission(
  alert: true,
  announcement: false,
  badge: true,
  carPlay: false,
  criticalAlert: false,
  provisional: false,
  sound: true,
);
```

Request only features actually used.

Do not turn on:

- `announcement`
- `carPlay`
- `criticalAlert`
- `provisional`

merely because those arguments exist.

## Authorization states

Model at least:

```text
authorized
denied
notDetermined
provisional
```

Do not collapse everything into `bool notificationsEnabled`.

Also distinguish:

- OS authorization
- whether the application has previously shown its own rationale
- whether the application has already asked
- application-level notification preference
- category/channel-specific state where relevant

## Android 13+

Android API 33+ uses runtime `POST_NOTIFICATIONS` permission.

For new installs, notifications begin disabled until permission is granted.

When targeting Android 13+, the application controls when it asks and SHOULD use a contextual request.

### Important ambiguity

On Android 13+, the Flutter plugin cannot always distinguish:

- user has not yet been asked
- user explicitly denied

from `AuthorizationStatus.denied` alone.

If the product needs that distinction, persist an application-owned `didRequestNotificationPermission` flag.

Do not use repeated calls to `requestPermission()` as a state-detection technique.

## Android below 13

Do not assume the same runtime-prompt semantics.

The user can still disable application notifications through system settings.

## Apple

Apple recommends requesting authorization in context.

The system normally presents the authorization prompt only on the first request; subsequent application calls do not repeatedly present it.

Check current notification settings because users can change them externally.

## Provisional Apple permission

Use provisional authorization only when the product intentionally wants Apple's quiet-notification trial model.

It is not a universal substitute for permission UX.

## `getToken()` interaction

Current Flutter FCM documentation notes that token retrieval can result in a notification permission request when permission has not yet been granted.

Therefore:

**SHOULD explicitly complete the product's permission flow before calling `getToken()` when user-visible notifications are being enabled.**

Do not let an incidental token lookup unexpectedly become the permission UX.

---

# Privacy-Aware Auto Initialization

FCM auto initialization may generate registration information and upload identifier/configuration data.

Only disable auto initialization when product/privacy requirements actually require this.

## iOS documented configuration

`Info.plist` can disable messaging auto initialization:

```xml
<key>FirebaseMessagingAutoInitEnabled</key>
<false/>
```

Then enable it after the relevant consent:

```dart
await FirebaseMessaging.instance.setAutoInitEnabled(true);
```

The runtime setting persists across restarts.

## Android documented configuration

Firebase documentation requires disabling both relevant automatic collection paths when the goal is to prevent FCM automatic initialization:

```xml
<meta-data
    android:name="firebase_messaging_auto_init_enabled"
    android:value="false" />

<meta-data
    android:name="firebase_analytics_collection_enabled"
    android:value="false" />
```

Do not add the Analytics setting casually: it affects Firebase Analytics collection and may have wider product implications.

Enable messaging later through:

```dart
await FirebaseMessaging.instance.setAutoInitEnabled(true);
```

## Version warning

`firebase_messaging 16.5.0` includes an iOS fix relating to respecting disabled Messaging auto initialization.

Revalidate consent/auto-init behavior after package upgrades.

---

# Token and Registration Management

## Current Flutter API

The current Flutter package exposes:

```dart
FirebaseMessaging.instance.getToken()
FirebaseMessaging.instance.deleteToken()
FirebaseMessaging.instance.onTokenRefresh
```

Web token retrieval additionally uses:

```dart
FirebaseMessaging.instance.getToken(
  vapidKey: webVapidPublicKey,
)
```

## 2026 FID transition

Current native Firebase SDK documentation is transitioning from legacy FCM token APIs toward Firebase Installation ID-based registration.

For example, current native Android Firebase documentation deprecates `getToken()` in favor of native `register()` when the FID registration mode is enabled.

However:

**`firebase_messaging 16.5.0` does not currently expose the native `register()/unregister()` API in Dart.**

Therefore:

- MUST use the Dart APIs currently provided by the installed Flutter package.
- MUST NOT fabricate `FirebaseMessaging.register()` Dart code.
- MUST revalidate this section during future plugin upgrades.

---

# Apple Token Readiness

FCM on Apple platforms uses APNs.

Current Flutter FCM documentation explicitly warns that the APNs token may not yet be available when application code begins making FCM plugin API requests.

Before token-dependent operations on Apple:

```dart
final String? apnsToken =
    await FirebaseMessaging.instance.getAPNSToken();

if (apnsToken == null) {
  // Defer registration reconciliation.
  return;
}

final String? fcmToken =
    await FirebaseMessaging.instance.getToken();
```

Do not:

```dart
while (await messaging.getAPNSToken() == null) {
  // tight retry loop
}
```

If unavailable:

- defer
- retry at a later bounded lifecycle opportunity
- keep the application functional

APNs-token availability is not a reason to stall application startup.

---

# Current Token Helper

A production service can centralize platform-aware token retrieval:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

Future<String?> getCurrentMessagingToken({
  required FirebaseMessaging messaging,
  required String webVapidPublicKey,
}) async {
  if (kIsWeb) {
    return messaging.getToken(
      vapidKey: webVapidPublicKey,
    );
  }

  if (defaultTargetPlatform == TargetPlatform.iOS ||
      defaultTargetPlatform == TargetPlatform.macOS) {
    final String? apnsToken = await messaging.getAPNSToken();

    if (apnsToken == null) {
      return null;
    }
  }

  return messaging.getToken();
}
```

A returned `null` is a normal state to handle, not an assertion failure.

---

# When to Acquire a Registration Token

SHOULD retrieve/synchronize a token when:

- notification permission/eligibility has been established
- the application needs to register this installation with the backend
- the authenticated user changes
- the application detects a registration refresh
- local registration state indicates synchronization is pending
- bounded reconciliation detects that the backend mapping may be stale

SHOULD NOT retrieve one:

- from every widget build
- from every route
- repeatedly during splash startup
- before the application actually needs notification registration
- in a tight timer
- simply to "make sure FCM still works"

The official Firebase Flutter codelab explicitly notes that normal applications should not request the token during startup because `getToken()` makes a blocking call to FCM that can take time.

---

# Backend Registration Model

Never model:

```text
FCM token == user
```

Prefer a conceptual model such as:

```text
MessagingRegistration
  registration_row_id
  current_registration_value
  platform
  environment
  user_id nullable
  app_version optional
  created_at
  last_successful_sync_at
  last_seen_at
  disabled_at nullable
```

A backend-generated registration row ID is useful because the transport registration value itself may rotate.

## Account transitions

When User A logs out and User B later logs in on the same device:

1. detach the registration from User A on the backend
2. remove/reconcile any private audience/topic state
3. associate the installation's current registration with User B only after User B is authenticated
4. make the operations idempotent

Do not depend on `deleteToken()` as the only logout mechanism.

A token is installation-level routing state, not an authentication credential.

---

# Token Synchronization Strategy

## Native platforms

Register the refresh listener once for the application lifetime:

```dart
late final StreamSubscription<String> _tokenSubscription;

void startTokenRefreshListener(
  FirebaseMessaging messaging,
  Future<void> Function(String token) reconcileToken,
) {
  _tokenSubscription = messaging.onTokenRefresh.listen(
    (String token) {
      reconcileToken(token);
    },
    onError: (Object error, StackTrace stackTrace) {
      // Send sanitized diagnostics to the application's error system.
    },
  );
}
```

If the containing service can be destroyed, cancel the subscription:

```dart
Future<void> dispose() async {
  await _tokenSubscription.cancel();
}
```

Do not start this listener from multiple pages/providers.

## On every emitted registration

Treat it as potentially new.

Compare it against locally persisted **successful synchronization state** before performing a backend write.

Conceptually:

```text
desired =
  token
  + authenticated account identity
  + backend environment
  + registration schema/version

if desired == lastSuccessfulSync:
    skip network request
else:
    idempotent backend upsert
    persist lastSuccessfulSync only after server success
```

This reduces:

- unnecessary requests
- repeated writes
- duplicate registration rows
- startup network load

## Backend endpoint

The registration endpoint SHOULD be idempotent.

Repeated equivalent requests should converge on the same state.

Recommended semantics are an upsert rather than an unconditional insert.

---

# Web Token Reconciliation

Current `firebase_messaging` Web implementation does **not** provide a functioning Dart `onTokenRefresh` stream.

Do not write:

```dart
FirebaseMessaging.instance.onTokenRefresh.listen(...);
```

and assume that covers web registration rotation.

Instead, on Web:

1. request permission at the appropriate UX moment
2. call `getToken(vapidKey: ...)`
3. compare it with locally/backend-known registration state
4. synchronize only if needed
5. repeat reconciliation at bounded lifecycle points

Reasonable reconciliation opportunities include:

- notification opt-in
- authenticated application session bootstrap when notifications are enabled
- service-worker/VAPID configuration changes
- a deliberately throttled maintenance reconciliation

Do not call it continuously on every Flutter rebuild or route transition.

---

# Token Freshness and Stale Registration Cleanup

Firebase recommends maintaining registration timestamps on the backend.

Current FCM guidance treats approximately one month of inactivity as a reasonable default threshold for considering a registration stale, subject to product needs.

Android FCM registrations that have been inactive for an extended period are eventually expired; current Firebase guidance documents a 270-day Android inactivity expiration behavior.

Use server cleanup to remove stale or invalid registrations.

When an FCM send returns a permanent invalid-registration result, remove or disable that registration.

For HTTP v1:

- `UNREGISTERED` is a permanent registration failure.
- `INVALID_ARGUMENT` should only be interpreted as an invalid registration when the payload itself has already been validated as correct.

Do not delete registrations on every transient FCM send failure.

---

# `deleteToken()`

`deleteToken()` MAY be appropriate when the product explicitly intends to remove the current messaging registration.

It is not a substitute for backend account detachment.

Do not assume deletion is permanent while messaging auto initialization/use remains enabled; registration can be recreated later.

Logout normally requires backend reassociation first.

---

# Message Types

FCM supports three practical message shapes.

## Notification message

Contains a notification payload.

Typical behavior:

```text
foreground:
  delivered to application callback
  not automatically shown as normal visible foreground notification

background:
  FCM/native platform normally displays notification

terminated:
  platform may display notification
  user interaction can launch application
```

Notification messages are collapsible.

## Data message

Contains application-defined data.

Application code interprets the payload.

Advantages:

- application controls semantics
- useful for synchronization/events

Tradeoff:

- background execution is platform constrained
- data-only delivery must not be treated as guaranteed

## Notification + data

In background, the system commonly displays the notification portion.

Application data is made available according to platform/lifecycle behavior, especially around user interaction.

In foreground, application code receives both portions.

---

# Choosing a Message Type

Use **notification + data** when:

- a user-visible background notification should be reliably presented by platform notification infrastructure
- application routing needs structured identifiers

Use **data-only** when:

- no automatic OS presentation is desired
- application-controlled processing is appropriate
- the product accepts platform background restrictions

Do not convert everything to data-only merely to gain presentation control.

That may trade away the native automatic notification behavior and expose the application to stricter background delivery constraints.

---

# Payload Size and Schema

FCM payload capacity is limited; current Firebase documentation allows messages up to roughly 4096 bytes for common FCM message payloads.

Do not transport large domain objects through FCM.

Prefer:

```json
{
  "type": "order.updated",
  "version": "1",
  "event_id": "evt_123",
  "resource_id": "order_456"
}
```

Then retrieve authoritative state through the authenticated backend.

Avoid reserved FCM key namespaces including Firebase/Google-reserved message keys.

---

# Payload Security

FCM transport protection does not make the payload application-level end-to-end encrypted content.

Assume notification contents may be exposed:

- to notification UI
- on a lock screen depending on user settings
- in platform delivery infrastructure
- to diagnostics/logging if your application logs them

Do not send:

- passwords
- access tokens
- refresh tokens
- private keys
- server credentials
- complete highly sensitive records

Prefer opaque resource/event identifiers.

---

# Foreground Message Handling

Register once:

```dart
late final StreamSubscription<RemoteMessage> _foregroundSubscription;

void startForegroundListener(
  Future<void> Function(RemoteMessage message) handleMessage,
) {
  _foregroundSubscription = FirebaseMessaging.onMessage.listen(
    (RemoteMessage message) {
      handleMessage(message);
    },
  );
}
```

Foreground callbacks SHOULD:

1. validate payload
2. convert to a domain event
3. update only required state
4. optionally present foreground UI/local notification
5. defer expensive remote fetching if not immediately needed

Avoid:

```dart
FirebaseMessaging.onMessage.listen((message) async {
  await reloadEveryRepository();
  await downloadLargeAssets();
  notifyListeners();
  navigatorKey.currentState!.push(...);
});
```

A transport event should not cause unrelated application-wide rebuilds.

---

# Native Background Messages

Register:

```dart
FirebaseMessaging.onBackgroundMessage(
  firebaseMessagingBackgroundHandler,
);
```

Handler:

```dart
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  final String? eventId = message.data['event_id'] as String?;
  final String? type = message.data['type'] as String?;

  if (eventId == null ||
      eventId.isEmpty ||
      type == null ||
      type.isEmpty) {
    return;
  }

  // Perform only short, isolate-safe, idempotent work.
}
```

For more defensive parsing where values may not have the expected type:

```dart
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(
  RemoteMessage message,
) async {
  final Object? rawEventId = message.data['event_id'];
  final Object? rawType = message.data['type'];

  if (rawEventId is! String || rawEventId.isEmpty) {
    return;
  }

  if (rawType is! String || rawType.isEmpty) {
    return;
  }

  // Perform only short, isolate-safe, idempotent work.
}
```

---

# Background Handler Rules

## MUST

The handler MUST:

- be top-level
- not be anonymous
- be retained for release builds with `@pragma('vm:entry-point')`
- tolerate duplicate delivery
- tolerate missing/malformed data
- finish quickly
- avoid UI operations
- avoid navigation
- avoid assumptions about foreground widget state

## Android isolate

Android executes the Flutter background callback in a separate Dart isolate.

Therefore:

- ordinary foreground singleton memory is not shared as an application-state mechanism
- `BuildContext` is unavailable
- navigator access is invalid
- UI state cannot be manipulated directly
- isolate/plugin compatibility matters

Do not rely on:

```dart
globalProvider.currentUser
globalNavigatorKey.currentState
someForegroundSingleton.pendingOrders
```

inside the background isolate.

## Firebase initialization in background execution

If background work uses another Firebase service, initialize Firebase before using that service according to the current FlutterFire background-handler guidance:

```dart
await Firebase.initializeApp(
  options: DefaultFirebaseOptions.currentPlatform,
);
```

Do not initialize unrelated Firebase products or large service graphs simply because an FCM callback occurred.

## Plugin availability

Do not assume every Flutter plugin can run in a background isolate.

Before adding a plugin call to an Android FCM background handler, verify that the plugin explicitly supports that execution context.

## Deadlines

FlutterFire documentation warns that long background tasks can be terminated; its guidance describes a roughly 30-second upper bound.

Native Android FCM documentation also emphasizes completing `onMessageReceived` promptly.

Treat these limits as a kill boundary, not as a target work budget.

**Engineering recommendation:** routine background FCM work should normally be measured in milliseconds or a few seconds, not tens of seconds.

## Good background work

Examples:

- validate a compact payload
- write a small idempotent receipt marker
- update minimal local metadata
- schedule supported operating-system work
- record that foreground reconciliation is required

## Bad background work

Examples:

- multiple large HTTP calls
- image processing
- bulk database migration
- synchronizing an entire account
- route navigation
- rebuilding dependency injection containers
- polling for completion
- waiting for an arbitrary retry delay
- downloading large files

---

# Notification Interaction Handling

Native applications need both:

```dart
FirebaseMessaging.onMessageOpenedApp
```

and:

```dart
FirebaseMessaging.instance.getInitialMessage()
```

These cover different lifecycle paths.

## Background -> opened

Register one application-lifetime listener:

```dart
late final StreamSubscription<RemoteMessage> _openedSubscription;

void startOpenedListener(
  Future<void> Function(RemoteMessage message) handleInteraction,
) {
  _openedSubscription =
      FirebaseMessaging.onMessageOpenedApp.listen(handleInteraction);
}
```

## Terminated -> launched

Call exactly once per application bootstrap:

```dart
final RemoteMessage? initialMessage =
    await FirebaseMessaging.instance.getInitialMessage();

if (initialMessage != null) {
  await handleNotificationInteraction(initialMessage);
}
```

Do not call `getInitialMessage()` from multiple widgets.

---

# Unified Interaction Flow

Recommended:

```text
onMessageOpenedApp --------\
                            \
getInitialMessage ---------> validate payload
                              |
                              v
                         map to intent
                              |
                              v
                       interaction dedup
                              |
                              v
                    wait until app/router ready
                              |
                              v
                    authentication check
                              |
                              v
                    authorization/resource check
                              |
                              v
                           navigate
```

The router may need to queue a pending interaction until:

- application shell mounted
- router initialized
- authentication restored
- required bootstrap state loaded

Do not discard an initial notification merely because navigation is not ready at the instant `getInitialMessage()` returns.

---

# Receipt Deduplication vs Interaction Deduplication

Do not use:

```text
if message/event was seen in background:
    ignore notification tap
```

That merges two separate semantic actions.

Prefer:

```text
receipt_event_id     -> deduplicates processing side effects
interaction_event_id -> deduplicates navigation/user action
```

A notification can legitimately be:

1. received in background
2. minimally persisted
3. automatically displayed
4. tapped later
5. routed into application UI

All without performing the same business side effect twice.

---

# Notification Payload Parsing

Use a stable application-defined schema.

Example:

```dart
typedef NotificationIntent = ({
  String eventId,
  String type,
  String resourceId,
  int version,
});

NotificationIntent? parseNotificationIntent(
  RemoteMessage message,
) {
  final Object? eventIdValue = message.data['event_id'];
  final Object? typeValue = message.data['type'];
  final Object? resourceIdValue = message.data['resource_id'];
  final Object? versionValue = message.data['version'];

  if (eventIdValue is! String || eventIdValue.isEmpty) {
    return null;
  }

  if (typeValue is! String || typeValue.isEmpty) {
    return null;
  }

  if (resourceIdValue is! String || resourceIdValue.isEmpty) {
    return null;
  }

  if (versionValue is! String) {
    return null;
  }

  final int? version = int.tryParse(versionValue);

  if (version != 1) {
    return null;
  }

  return (
    eventId: eventIdValue,
    type: typeValue,
    resourceId: resourceIdValue,
    version: version,
  );
}
```

Then whitelist known types:

```dart
bool isSupportedNotificationType(String type) {
  return switch (type) {
    'order.updated' => true,
    'message.received' => true,
    'account.alert' => true,
    _ => false,
  };
}
```

Do not feed arbitrary `message.data['route']` directly into a navigator without validation.

---

# Notification Routing

The routing layer MUST treat notification data as untrusted.

Before opening protected content:

1. validate schema
2. validate action type
3. validate version
4. validate identifier format
5. ensure authenticated session is appropriate
6. ask authoritative application/backend state whether the user may access the resource
7. handle missing/deleted resources safely
8. navigate only when router state is ready

Example decision:

```text
order.updated / order_123
      |
      +-- no authenticated user -> login/inbox fallback
      |
      +-- authenticated but no access -> safe fallback
      |
      +-- order removed -> notification center/inbox
      |
      +-- authorized -> order details
```

A deep-link identifier is never proof of authorization.

---

# Message IDs and Idempotency

`RemoteMessage.messageId` can be useful for diagnostics/deduplication where present.

Do not use it as the only business idempotency identifier.

Prefer the sender to include a stable domain-level:

```text
event_id
```

or:

```text
action_id
```

An event may be retried or represented by multiple transport messages.

Business idempotency should therefore be keyed to application semantics rather than only transport identity.

Persist deduplication state when duplicate side effects across process death would be harmful.

An in-memory `Set<String>` alone is not sufficient for durable correctness.

---

# Message Ordering

Do not depend on FCM delivery order.

If event order matters:

- include a domain version/revision/timestamp
- fetch current authoritative state
- ignore obsolete revisions
- make operations idempotent

Example:

```text
push says order revision = 17
local revision = 18

=> do not overwrite local state with revision 17
```

---

# Collapse Semantics

Use collapsible messages when only the newest state matters.

Good examples:

- "inbox changed"
- "weather data updated"
- "feed has new state"
- "synchronize resource X"

Do not use collapse semantics when every individual event must remain independently visible/auditable.

Notification messages are inherently collapsible in FCM.

Current Android FCM behavior limits the number of simultaneously stored collapse keys per registration, so do not create unbounded dynamic collapse keys.

---

# TTL

Set message TTL based on the business usefulness window.

Examples:

```text
typing indicator     -> very short TTL
delivery ETA update  -> short TTL
daily reminder       -> relevant expiration
security event       -> depends on product model
generic campaign     -> campaign-defined lifetime
```

Do not accept a default long TTL for data that becomes misleading within minutes.

A stale notification can be worse than a dropped notification.

For Apple, use the corresponding APNs expiration semantics when constructing messages server-side.

---

# Notification Presentation

Transport and presentation are separate responsibilities.

`firebase_messaging` handles FCM transport/lifecycle.

A presentation layer decides:

- whether foreground message should appear visibly
- Android channel
- sound
- badge
- icon
- local notification content

---

# Foreground Presentation on Apple

By default, foreground notification messages do not automatically present a normal visible notification.

If the product wants foreground Apple presentation:

```dart
await FirebaseMessaging.instance
    .setForegroundNotificationPresentationOptions(
  alert: true,
  badge: true,
  sound: true,
);
```

Configure this once as application policy, not once per message.

Actual presentation remains subject to the user's current OS notification settings.

The current package changelog documents persistence-related behavior for these options; revalidate after major plugin changes.

---

# Foreground Presentation on Android

A foreground `onMessage` callback does not automatically provide a heads-up FCM notification.

If the product requires a visible foreground system notification:

- define an appropriate Android notification channel
- use high channel importance only for genuinely high-interruption notifications
- invoke a local notification presentation layer when required

`flutter_local_notifications` is a common presentation solution, but keep its responsibilities separate:

```text
firebase_messaging
  -> receives transport event

notification parser
  -> validates/domain maps

presentation service
  -> optionally displays local foreground notification
```

Do not turn the messaging service itself into documentation for the local-notification plugin.

---

# Avoid Duplicate Notifications

A common failure:

```text
FCM notification payload arrives while app backgrounded
    |
    +--> system automatically displays notification
    |
    +--> background handler also creates local notification
```

Result:

```text
two notifications
```

Preferred alternatives:

### Strategy A: platform auto-display

Use notification/mixed messages for background presentation.

Only manually present foreground messages.

### Strategy B: application-controlled presentation

Deliberately use data-only messages and an application presentation layer, while accepting the stricter delivery/background constraints.

Do not combine both strategies indiscriminately.

---

# Android Configuration

## Google Play services

Standard Android FCM delivery depends on Google Play services.

Test Android emulators with Google APIs/Play services and physical devices for real power-management/OEM behavior.

---

# Android 13+ Permission

Target modern Android SDK behavior and request `POST_NOTIFICATIONS` contextually.

Do not rely on old target-SDK prompt timing.

A user denial or disabled notification permission can prevent visible notifications even while FCM transport behavior appears otherwise healthy.

---

# Android Notification Channels

Android 8.0/API 26+ requires visible notifications to use a notification channel.

Channel properties such as importance are effectively fixed after creation; users also gain control over channel settings.

Therefore:

**MUST treat channel IDs as stable product configuration.**

Do not create:

```text
notification_169324234
notification_169324235
notification_169324236
```

for individual messages.

Prefer:

```text
orders
messages
security_alerts
marketing
```

only where separate user controls/interruptiveness genuinely make sense.

## Importance

High importance may produce:

- sound
- heads-up/interruption

subject to device/user settings.

Do not mark all notifications high importance.

If a product changes the semantic importance of a channel later, using a new channel ID may be required; creating the same channel ID with a different importance does not reliably rewrite the user's existing channel configuration.

---

# Android Default Notification Channel

FCM can use a configured default channel for incoming notification payloads.

Optional manifest metadata:

```xml
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="general_notifications" />
```

The referenced channel must actually be created appropriately by the application/native presentation integration.

Do not configure a nonexistent channel ID and assume FCM will infer its desired importance.

---

# Android Default Icon

Optional FCM metadata:

```xml
<meta-data
    android:name="com.google.firebase.messaging.default_notification_icon"
    android:resource="@drawable/ic_stat_notification" />
```

Use a proper Android notification icon rather than assuming the normal launcher image renders correctly as a status-bar icon.

---

# Android Default Color

Optional:

```xml
<meta-data
    android:name="com.google.firebase.messaging.default_notification_color"
    android:resource="@color/notification_color" />
```

This affects presentation only where applicable.

---

# Android Delivery Priority

Do not confuse:

```text
FCM delivery priority
```

with:

```text
Android notification channel importance
```

They solve different problems.

## Normal priority

Use for:

- background synchronization hints
- non-urgent informational updates
- work that does not need to wake a sleeping device immediately

During Doze, delivery may be delayed.

## High priority

Use only for:

- time-sensitive
- user-visible
- genuinely urgent notification use cases

High priority may wake a sleeping device and provide a short processing opportunity.

It does **not** grant arbitrary long-running background execution.

Firebase documents that repeated high-priority messages that do not result in user-visible notifications may be deprioritized or proxied.

Therefore never use high priority merely to work around background restrictions.

---

# Android Doze and App Standby

Expect normal-priority messages to be delayed during power-saving states.

Do not fight Doze by:

- continuous retries
- fake high-priority notifications
- persistent custom socket connections purely to replace FCM
- background polling

Design state reconciliation instead.

---

# Android Long Work

If Android must perform work longer than the FCM callback budget:

- persist the minimal event/request
- schedule appropriate Android background work, typically through platform-supported scheduling such as WorkManager
- make the work idempotent

Do not keep the FCM callback alive waiting for the operation.

Whether a Flutter scheduling plugin is suitable in the background isolate must be verified separately.

---

# Android Force Stop

If the user force-stops the application from Android system settings, messaging does not simply bypass that user action.

The application must be manually reopened before normal messaging behavior resumes.

Do not attempt to engineer around force-stop semantics.

---

# Android Notification Delegation

Current native Android Firebase Messaging SDKs include notification-delegation behavior on newer Android versions.

The current `firebase_messaging 16.5.0` Dart API does not expose the full native delegation-control API.

Therefore:

- leave native delegation behavior at supported defaults unless there is a tested product requirement
- do not invent a Dart `setNotificationDelegationEnabled()` API
- revalidate this behavior when upgrading the plugin/native SDK

---

# Android Direct Boot

Firebase's native Android SDK supports an advanced Direct Boot configuration for messages received before user unlock.

This requires native Android-specific components/configuration and storage constraints.

It is **not** part of the standard FlutterFire Dart background-handler setup.

Do not claim that the normal Flutter background handler automatically makes an application Direct-Boot capable.

If Direct Boot is required:

1. treat it as a separate native architecture decision
2. follow the current Firebase Android Direct Boot guide
3. audit every dependency for device-encrypted-storage compatibility
4. explicitly verify FlutterFire support for the desired path

---

# Apple Configuration

FCM on iOS and macOS ultimately relies on APNs.

Successful Firebase project setup is not sufficient by itself; Apple-side push configuration must also be correct.

---

# iOS Required Setup

Current Flutter FCM setup requires:

1. Firebase iOS application correctly configured.
2. Push Notifications capability enabled.
3. Appropriate Background Modes enabled for required background behavior.
4. APNs authentication credentials uploaded to Firebase.
5. Standard FlutterFire method-swizzling behavior retained.
6. Physical-device testing.

For background push behavior, enable the relevant Xcode Background Modes including remote notifications according to Firebase's Flutter setup documentation.

---

# APNs Authentication

Use an APNs authentication key/certificate configuration supported by current Firebase Console/Apple documentation.

With token-based APNs authentication, upload the `.p8` authentication key and associated Apple identifiers to Firebase.

Never embed the APNs private key into the Flutter application.

---

# Apple Method Swizzling

This is an important Flutter-specific rule.

Generic native Firebase Apple documentation describes manual integration paths when method swizzling is disabled.

However, the Flutter FCM documentation states that method swizzling is required for the Flutter FCM plugin's standard Apple-device token handling.

Therefore:

**MUST NOT disable Firebase Messaging method swizzling in a normal FlutterFire Messaging application merely because a native Firebase tutorial says manual integration is possible.**

Revalidate directly against current FlutterFire docs before adopting a non-standard native integration.

---

# iOS UIScene / Version 16.5+

Recent `firebase_messaging` releases added UIScene lifecycle support and related fixes.

Version `16.5.0` specifically documents early notification-delegate setup for applications adopting UIScene because Flutter plugin registration may occur too late for Apple's notification center delegate requirement.

Current package documentation shows an Objective-C integration equivalent to:

```objective-c
#import <firebase_messaging/FLTFirebaseMessagingPlugin.h>
```

and early invocation of:

```objective-c
[FLTFirebaseMessagingPlugin configureNotificationCenterDelegate];
```

inside the appropriate application launch delegate before returning.

**Version-sensitive rule:** if the application adopts UIScene, read the currently installed `firebase_messaging` README/changelog and use its exact native setup.

Do not mechanically translate the current Objective-C example into Swift without verifying the exported current plugin API.

If the application does not adopt UIScene, do not add this customization merely because it exists.

---

# Apple Silent / Background Notifications

Background notifications on Apple platforms are low-priority background update mechanisms.

They are:

- not guaranteed
- subject to system scheduling
- subject to throttling
- inappropriate as the sole mechanism for critical guaranteed work

For APNs background pushes, current Apple/Firebase guidance uses appropriate background headers such as:

```text
apns-push-type: background
apns-priority: 5
```

and the relevant `content-available` payload.

Do not send Apple data/background pushes with high APNs priority purely to force execution.

Current Firebase guidance requires normal priority for Apple data messages.

---

# Apple Background Frequency

Apple documents that background notifications may be throttled and advises against excessive rates.

Do not design a product requiring frequent silent pushes to keep an application synchronized continuously.

Use them as hints and reconcile from the backend when the application is active.

---

# iOS Force-Quit Behavior

If the user explicitly swipes the application away/force-quits it, background message handling is constrained until the application is reopened.

Do not promise silent-background execution after explicit user termination.

---

# Apple Foreground Presentation

Configure once if desired:

```dart
await FirebaseMessaging.instance
    .setForegroundNotificationPresentationOptions(
  alert: true,
  badge: true,
  sound: true,
);
```

Do not both enable Apple foreground OS presentation and always create a second local notification unless duplicate presentation is intentionally desired.

---

# Apple Rich Notification Media

Images/advanced mutation may require an Apple Notification Service Extension.

That is an optional presentation capability, not a core `firebase_messaging` requirement.

Do not add a service extension unless the product needs rich notification mutation/media.

---

# macOS

macOS uses Apple push infrastructure and shares many Apple notification concepts:

- APNs
- permission
- foreground presentation settings
- notification interactions

Firebase's Flutter setup also requires correct macOS Firebase configuration.

For Firebase installation identity on macOS, current Firebase Flutter setup documentation requires the appropriate Keychain Sharing capability.

Do not treat macOS as identical to iOS in testing.

`firebase_messaging 16.5.0` fixed a macOS issue where `getInitialMessage()` could hang indefinitely, so interaction-launch behavior must be regression-tested after messaging upgrades.

---

# Web Configuration

Web FCM depends on:

- supported browser Push API
- secure context/HTTPS
- browser notification permission
- Web Push credentials
- Firebase Messaging service worker

Localhost may receive browser-specific secure-context treatment for development, but production deployment must use secure hosting.

---

# VAPID

Configure a Web Push certificate key pair in Firebase.

Pass the **public VAPID key** to the client:

```dart
final String? token =
    await FirebaseMessaging.instance.getToken(
  vapidKey: webVapidPublicKey,
);
```

The VAPID public key is designed to be provided to the client.

Do not place server/service credentials in browser code.

---

# Web Service Worker

Background FCM on Web executes through the browser's JavaScript service worker, commonly:

```text
web/firebase-messaging-sw.js
```

The Dart native-style `onBackgroundMessage` callback is not the Web background execution mechanism.

A typical service worker initializes Firebase Messaging with the application's Web Firebase config and handles background push behavior through Firebase's JavaScript Messaging SDK.

Use the current Firebase Web Messaging documentation for the exact JavaScript SDK version/import style.

Do not hardcode an old Firebase JavaScript SDK version from an outdated tutorial.

---

# Custom Web Service Worker Path

Current `firebase_messaging` supports a custom service-worker script path through `getToken()`.

If using a non-default path, verify the installed API:

```dart
final String? token =
    await FirebaseMessaging.instance.getToken(
  vapidKey: webVapidPublicKey,
  serviceWorkerScriptPath: '/firebase-messaging-sw.js',
);
```

The `serviceWorkerScriptPath` capability was added in the 16.x package line and is version-sensitive.

---

# Modern Flutter Service Worker Architecture

Do not copy legacy Flutter Web guidance that assumes Flutter automatically generates and manages `flutter_service_worker.js`.

Modern Flutter does not generate/manage an offline-caching service worker by default.

For a new Flutter Web application:

- configure the Firebase Messaging service worker deliberately
- use normal current Flutter bootstrap
- only add/manage a separate offline-caching service worker if the application actually needs one

If the application owns multiple service workers:

- deliberately choose scopes
- verify registration order
- verify which worker controls which URLs
- verify update behavior
- verify that they do not unintentionally replace each other

---

# Web Worker Caching and Deployment

Service-worker changes are notoriously susceptible to browser caching.

If a deployed messaging worker is stale:

- inspect the active service worker in browser developer tools
- inspect its scope
- inspect update/install status
- verify hosting cache headers
- consider short/no cache lifetimes for worker scripts
- test worker upgrades on actual deployed HTTPS builds

Do not assume a successful Flutter deployment means users immediately run the newest worker.

---

# Web Foreground vs Background

## Foreground

Messages arrive through Flutter's:

```dart
FirebaseMessaging.onMessage
```

The application decides whether to:

- update in-page UI
- show a toast/banner
- invoke browser notification presentation through an appropriate Web layer

## Background / closed page

The Firebase Messaging service worker handles push behavior.

Notification/mixed messages can be displayed by browser push infrastructure.

Data handling is subject to service-worker/platform behavior.

---

# Web Notification Click Routing

Do not design Web notification routing around:

```dart
getInitialMessage()
```

because the current FlutterFire Web implementation returns `null`.

Instead use normal Web navigation/deep-link architecture.

FCM Web supports notification links through Web push options such as `fcm_options.link`.

The target link must follow current Web Push/FCM security requirements such as HTTPS.

A notification click should route the browser to an application URL that the Flutter Web router can interpret normally.

If using a custom service-worker notification-click handler, treat it as JavaScript/browser infrastructure and test page focus/open behavior explicitly.

---

# Web `onTokenRefresh`

Current FlutterFire Web implementation exposes no effective Dart token-refresh event stream.

Use bounded explicit `getToken(vapidKey: ...)` reconciliation instead.

This is a platform-specific exception to the normal mobile token-listener architecture.

---

# Web Topics

Current FlutterFire Web implementation does not support:

```dart
subscribeToTopic()
unsubscribeFromTopic()
```

and throws `UnimplementedError`.

Do not invoke client topic APIs on Web.

If the product needs topic-style Web audience membership, manage the registration through a trusted backend/Admin SDK according to current FCM server capabilities.

---

# Topics

Current Flutter APIs include:

```dart
await FirebaseMessaging.instance.subscribeToTopic('news');
await FirebaseMessaging.instance.unsubscribeFromTopic('news');
```

on supported native platforms.

---

# Topic Naming

Use conservative FCM-valid topic identifiers.

Current native Firebase Messaging API documentation specifies:

```text
[a-zA-Z0-9-_.~%]{1,900}
```

Use that constraint unless current platform/package documentation becomes stricter.

Do not put:

- raw email addresses
- access tokens
- sensitive customer information
- arbitrary unbounded user-generated text

into topic names.

---

# When Topics Are Appropriate

Use topics for broad, public or low-sensitivity fan-out such as:

```text
weather_tallinn
product_announcements
sports_team_123
status_updates
```

FCM topic messaging is optimized for throughput/fan-out rather than the lowest possible delivery latency to one individual registration.

For small/time-sensitive audiences, direct registration targeting or backend-managed groups may be more appropriate.

---

# Topics Are Not Authorization

Clients can request subscription to topic names.

Therefore:

```text
topic == premium_users
```

does not prove:

```text
subscriber is authorized premium user
```

Never use topic membership as the only authorization check for sensitive content.

For private audiences:

- derive eligibility server-side
- minimize sensitive payload contents
- enforce authorization when protected content is fetched/opened

---

# Topic Limits and Efficiency

Current FCM topic guidance includes limits such as:

- up to 2000 topic subscriptions per application instance
- backend batch subscription operations with bounded batch size
- project subscription rate limits

Do not design per-document/per-record unbounded topic subscription models.

Avoid repeatedly calling:

```dart
subscribeToTopic(...)
```

on every app launch.

Native FCM topic state is persistent and synchronization is retried internally.

Reconcile desired subscriptions when:

- preference changes
- user/account changes
- registration state changes
- application policy changes

not continuously.

Backend bulk-topic operations that receive throttling SHOULD use exponential backoff.

---

# Upstream Messaging

Do not implement FCM client-to-server sending.

Native FCM upstream APIs have been decommissioned and the current Flutter `FirebaseMessaging` API does not expose an application `send()` method.

For client -> backend communication use:

- authenticated HTTPS
- callable/function API where appropriate
- WebSocket/realtime application protocol
- another explicit application API

For backend -> FCM use:

- Firebase Admin SDK
- FCM HTTP v1

---

# Sending Security

FCM messages MUST be sent from a trusted environment.

Never ship:

- service-account JSON
- private service-account key
- FCM OAuth access token
- legacy FCM server key
- backend signing credentials

inside a Flutter binary or Flutter Web bundle.

Mobile application binaries and Web bundles must be assumed inspectable.

---

# Firebase API Keys

A normal Firebase client API key/config object is not an FCM server credential.

Firebase documents Firebase API keys as project/application identifiers for API routing rather than authorization secrets.

Apply Firebase-recommended key restrictions, but do not confuse client API-key exposure with leaking a service-account credential.

---

# App Check

Firebase App Check MAY protect a custom backend endpoint used for operations such as device-registration synchronization.

Example boundary:

```text
Flutter client
  -> authenticated user credential
  -> optional App Check assertion
  -> backend registration endpoint
```

App Check does not:

- encrypt FCM payloads end-to-end
- replace application authentication
- make a topic an authorization mechanism
- turn untrusted deep-link data into trusted data

Use it as an additional backend-abuse signal/security layer where appropriate.

---

# Performance Rules

## HIGH PRIORITY — Startup

### MUST NOT

- call `requestPermission()` automatically in `main()` merely because FCM is installed
- call `getToken()` on every startup without a product need
- subscribe to all topics on every startup
- perform notification-related API fetches before `runApp` unless startup truly depends on them

### SHOULD

Keep pre-`runApp` work to:

```text
Flutter binding
Firebase Core
background handler registration
```

plus application-critical bootstrap.

The official Firebase Flutter FCM codelab explicitly warns that `getToken()` can make a blocking FCM call and should not normally run during startup.

---

## HIGH PRIORITY — Listener Lifetime

Register global streams exactly once.

Bad:

```dart
@override
Widget build(BuildContext context) {
  FirebaseMessaging.onMessage.listen(...);
  return ...;
}
```

Every rebuild can create another subscription.

Preferred:

```text
app-scope messaging coordinator
    starts once
    owns subscriptions
    cancels on service disposal
```

---

## HIGH PRIORITY — Token Network Efficiency

Persist the last successful registration synchronization state.

Only write to the backend when:

- registration value changed
- user association changed
- environment changed
- server registration is known missing/stale
- an intentionally scheduled freshness reconciliation requires it

Do not upload an identical registration on every app launch.

---

## HIGH PRIORITY — Background Work

Keep background callbacks minimal.

Do not:

- fetch a complete user profile
- run several APIs sequentially
- initialize an entire analytics/DI stack
- generate large images
- wait for a retry timer

If a notification needs immediate rich visible content, prefer providing appropriate notification payload content rather than expecting unrestricted background fetching.

---

## HIGH PRIORITY — Android Priority

Use normal delivery priority for nonurgent work.

Reserve high priority for urgent user-visible events.

High priority is not a performance accelerator for arbitrary sync work.

Misuse wastes battery and may cause FCM to reduce future high-priority handling.

---

## HIGH PRIORITY — UI State

Do not place every incoming `RemoteMessage` into global reactive application state.

Convert only meaningful domain changes into state consumed by the relevant UI.

Avoid:

```text
message stream
 -> global notifier
 -> entire app rebuild
```

Prefer:

```text
message
 -> validation/domain conversion
 -> targeted state invalidation or inbox update
```

---

## HIGH PRIORITY — Topic Efficiency

Do not subscribe/unsubscribe continuously.

Maintain desired topic state and reconcile changes.

---

## HIGH PRIORITY — Plugin Initialization

Do not initialize:

- local notification plugin
- database
- analytics
- unrelated Firebase plugins

inside every FCM callback unless that callback genuinely requires them.

---

## Network and Battery Efficiency

SHOULD:

- use FCM rather than application-managed polling for notification wakeups
- use collapse semantics for latest-state signals
- choose useful TTL
- batch/reconcile backend state rather than perform per-field requests
- avoid unnecessary high-priority messages
- avoid repeated registration writes
- avoid background polling
- defer noncritical refreshes until foreground

---

# Reliability Rules

## No universal delivery guarantee

Do not claim:

```text
server sent message
=> callback will definitely execute
```

Reasons include:

- network state
- device offline duration
- TTL expiry
- FCM collapse behavior
- Android Doze
- app standby
- force stop
- Apple throttling
- explicit user termination
- browser/service-worker state
- platform prioritization
- invalid registration

Critical business state MUST remain recoverable without receiving every FCM callback.

---

# Reconciliation Pattern

For important resources:

```text
FCM event:
    "resource X changed"

application:
    mark X stale
    fetch authoritative X when appropriate
```

On foreground/resume, reconcile state that must be correct even if a push was missed.

Do not rely on a sequence of push payloads as the only database replication protocol.

---

# Retries

Retry only operations where retry is meaningful.

## Good retry candidate

Backend token registration:

```text
network timeout
 -> preserve pending state
 -> exponential backoff / later lifecycle retry
 -> idempotent backend upsert
```

## Bad retry candidate

Permission denied:

```text
while denied:
    requestPermission()
```

User permission is not a network failure.

## APNs token unavailable

Use deferred bounded reconciliation, not a busy loop.

## Invalid payload

Do not retry parsing forever.

Reject/sanitize/log.

---

# Duplicate Messages

Every side-effecting message handler SHOULD be idempotent.

Possible approach:

```text
event_id
  -> durable processed-event store
  -> side effect only once
```

Choose retention according to domain requirements.

Do not allow the dedup table to grow without bound.

---

# Malformed and Unknown Messages

Safe behavior:

```text
unknown type
 -> ignore or store sanitized diagnostic

unsupported version
 -> ignore or route to compatibility fallback

missing resource_id
 -> do not navigate

malformed identifier
 -> reject
```

Do not crash the application because a push sender deployed a newer schema first.

---

# Security Rules

## MUST

- send FCM only from trusted backend infrastructure
- use Admin SDK or FCM HTTP v1
- keep service-account/server credentials off clients
- validate notification data
- enforce auth and authorization after a notification opens protected content
- treat registration values as sensitive routing identifiers
- remove sensitive account association on logout
- protect token-registration backend endpoints
- minimize sensitive payload contents
- sanitize logs

## MUST NOT

- ship server keys
- place OAuth send credentials in Dart
- use topic membership as authorization
- trust a resource ID because it came from FCM
- log full tokens routinely in production
- include authentication tokens in notification payloads
- execute arbitrary server-provided routes/actions
- assume transport encryption is application-level end-to-end encryption

---

# Logging

Development:

```dart
debugPrint('FCM message id: ${message.messageId}');
```

can be useful.

Production logs SHOULD avoid:

```text
full registration token
full sensitive payload
access tokens
personal notification body
```

Prefer redacted IDs and structured diagnostics.

---

# Analytics and Delivery Metrics

Use FCM delivery metrics/analytics only when the product needs them.

Do not enable telemetry purely because an API exists.

Current Dart `setDeliveryMetricsExportToBigQuery` behavior is platform-specific; the current API documents Android support, while other platforms require their documented native/service-worker integration.

If enabling delivery export:

- verify current platform instructions
- honor product privacy/consent requirements
- do not assume BigQuery metrics mean every message reached visible UI

Distinguish FCM acceptance from actual device delivery.

---

# Error Handling

## Permission denied

Do:

- persist UX state if useful
- continue application normally
- explain how the feature is affected
- optionally provide a route to application/system notification settings through appropriate platform integration

Do not repeatedly prompt.

## Token null

Treat as unavailable registration state.

Retry later at a bounded opportunity.

## APNs token null

Defer FCM token-dependent work.

Do not crash or spin.

## Backend registration fails

Keep last-known desired registration pending.

Retry idempotently.

## Token refresh synchronization fails

Do not add another refresh listener.

Keep the new desired registration pending and retry backend synchronization.

## Unknown event

Reject safely.

## Route missing

Fallback to:

- inbox
- home
- refresh
- safe "content unavailable"

according to product behavior.

---

# Testing Checklist

A production application MUST test more than a single Firebase Console foreground notification.

## Android matrix

| Scenario | Verify |
|---|---|
| Foreground notification payload | `onMessage`; foreground presentation policy |
| Foreground data payload | parser/domain handling |
| Background notification payload | OS display |
| Background data payload | handler when platform permits |
| Mixed payload | presentation + data behavior |
| Terminated notification tap | `getInitialMessage()` |
| Background notification tap | `onMessageOpenedApp` |
| Android 13 permission not asked | application UX state |
| Permission granted | expected notification behavior |
| Permission denied | graceful behavior |
| Channel disabled by user | application does not assume heads-up |
| High-importance channel | correct heads-up behavior where OS permits |
| Normal priority in Doze | delayed behavior tolerated |
| High priority use case | immediate user-visible notification semantics |
| Force stop | messaging resumes after manual reopen |
| Token change/reinstall | backend registration updates |
| Release build | background entry point survives tree shaking |
| Multiple simultaneous notifications | no ANR/crash |

Use Android emulators with Google Play services, but also verify physical devices for power-management/OEM behavior.

---

# iOS Matrix

| Scenario | Verify |
|---|---|
| Permission not determined | contextual request |
| Permission denied | no repeated prompt |
| Permission authorized | visible notifications |
| Provisional | quiet behavior as designed |
| Foreground notification | configured presentation |
| Background notification | APNs/FCM presentation |
| Silent/background data | application tolerates missed/delayed execution |
| Background notification tap | interaction routing |
| Terminated notification tap | `getInitialMessage()` |
| APNs token unavailable initially | deferred token sync |
| Reinstall/token change | registration reconciliation |
| Swipe-away/force-quit | no guarantee until reopen |
| Physical device | real APNs path |
| Release build | background/lifecycle path |
| UIScene if adopted | current early delegate setup |

Do not treat simulator-only testing as sufficient FCM/APNs production validation.

---

# macOS Matrix

Verify:

- Firebase app configuration
- notification permission
- Keychain Sharing requirement
- foreground presentation
- background notification
- terminated interaction
- `getInitialMessage()`
- token/APNs behavior
- physical/release build where relevant

For current package versions, specifically regression-test the initial-message path because 16.5.0 fixed a macOS hanging issue there.

---

# Web Matrix

| Scenario | Verify |
|---|---|
| Supported browser | Push API available |
| HTTPS deployment | service worker active |
| Permission default | no surprise token-triggered prompt |
| Permission granted | token retrieval |
| Permission denied | graceful state |
| VAPID key | correct project/public key |
| Foreground message | Dart `onMessage` |
| Background notification | browser/service worker |
| Closed tab click | URL/link routing |
| Worker update | new worker activates correctly |
| Worker caching | no stale script |
| Custom worker path | registration uses expected script |
| Token reconciliation | explicit `getToken`, not refresh stream |
| Topic use | no client topic API assumption |
| Deployment scope | worker controls intended URLs |

Do not mark Web tests complete because `flutter run -d chrome` succeeded.

Test the deployed HTTPS artifact.

---

# Cross-Platform Release Matrix

For each supported platform verify:

```text
permission:
  not requested
  granted
  denied

message:
  notification
  data
  notification + data

state:
  foreground
  background
  terminated / closed where applicable

interaction:
  no tap
  tap from background
  tap from terminated state where supported

registration:
  initial registration
  refresh/reconciliation
  login
  logout
  account switch

robustness:
  duplicate event
  malformed data
  unknown schema version
  nonexistent resource
  expired authentication
  network offline
  backend registration failure
```

---

# Firebase Console Testing

Firebase Console test sends are useful for basic transport validation.

They are not enough to verify:

- custom data schema
- collapse behavior
- TTL
- APNs headers
- Android priority
- server audience logic
- idempotency
- backend token cleanup
- all HTTP v1 payload options

For production verification, also send controlled messages from the same trusted sending path used by the application backend.

---

# Debugging Guide

| Symptom | Likely cause | Verify | Fix |
|---|---|---|---|
| Android receives callback but no visible notification | foreground auto-presentation expectation | application state, channel, local presentation | implement foreground presentation policy |
| Android background notification invisible | permission/channel/config | Android 13 permission, channel/user settings, payload channel | correct permission/channel |
| Android no heads-up | low channel importance | channel settings | use appropriate high-importance channel if product warrants it |
| Changing channel importance has no effect | channel already exists | system channel settings | create deliberate new channel ID if semantics changed |
| Android background handler works debug but not release | tree shaking/handler shape | top-level + pragma | add `@pragma('vm:entry-point')`, release-test |
| Android background handler crashes using plugin | plugin not background-isolate safe | plugin docs/logcat | remove/replace/schedule work differently |
| Duplicate Android notifications | OS auto-display + local display | inspect payload + background handler | choose one presentation strategy |
| Android high-priority message delayed | permission/user-visible requirement/deprioritization/power state | payload, FCM metrics, notification visibility | use high only for legitimate urgent visible notification |
| iOS receives no FCM | APNs/project/capability problem | APNs key, Firebase app, Push capability | correct Apple/Firebase configuration |
| iOS token call fails/returns unavailable early | APNs token race | `getAPNSToken()` | defer token reconciliation |
| iOS token integration broken after native changes | swizzling disabled | Info.plist/native delegate | restore supported FlutterFire swizzling setup |
| iOS foreground message has no banner | expected default | `onMessage`, presentation options | configure foreground presentation |
| iOS silent push unreliable | expected platform constraint | APNs headers, background mode, device state | use push as hint; reconcile authoritative state |
| iOS + UIScene notification lifecycle broken | early delegate configuration missing/version mismatch | installed plugin README/changelog | apply exact current UIScene setup |
| macOS startup tap hangs on old package | historical plugin issue | installed version | upgrade/retest current package |
| `getInitialMessage()` handled twice | called from multiple services/widgets | code search | call once in coordinator |
| Tap ignored during startup | navigator/auth not ready | router initialization sequence | queue validated intent until ready |
| Tap opens protected content incorrectly | route treated as trusted | auth/resource checks | authorize before navigation |
| Backend has duplicate devices | unconditional token inserts | registration endpoint/database | use idempotent upsert + persisted sync state |
| Old user receives device notifications | token not detached on logout | backend mapping | update association during session transition |
| Web foreground works, background does not | missing/incorrect worker | DevTools worker registration/scope | correct messaging service worker |
| Web worker never updates | cache/lifecycle issue | DevTools active worker/cache headers | fix worker caching/version deployment |
| Web `onTokenRefresh` never fires | current implementation behavior | installed web plugin source | explicit bounded `getToken` reconciliation |
| Web `getInitialMessage()` null | current implementation behavior | platform implementation | use Web URL/service-worker routing |
| Web topic subscription throws | unsupported in current implementation | platform check | manage audience from trusted backend |
| Topic receives unauthorized content | topic used as auth boundary | sender/audience model | server-authorize protected data |
| Push accepted by FCM but user says none arrived | acceptance != delivery | delivery metrics/device state | diagnose transport; never claim guaranteed delivery |

---

# Common Anti-Patterns

## 1. Permission request in `main()`

Problem:

```dart
await FirebaseMessaging.instance.requestPermission();
```

during every startup.

Why:

- hurts UX
- prompts before value is understood
- adds unnecessary startup work
- official Firebase guidance recommends contextual permission

Preferred:

```text
show feature/rationale
 -> user enables notifications
 -> request OS permission
 -> register installation
```

---

## 2. `getToken()` on every launch

Problem:

```dart
Future<void> main() async {
  ...
  final token = await FirebaseMessaging.instance.getToken();
  ...
}
```

Why:

- adds FCM call to startup
- official Firebase Flutter codelab says the token request can block/take time
- often causes duplicate backend registration traffic

Preferred:

- lazy token retrieval
- persisted successful-sync state
- refresh/reconciliation handling

---

## 3. Upload token unconditionally

Problem:

```dart
await api.registerDevice(await messaging.getToken());
```

every launch.

Why:

- redundant network/write load
- creates duplicate rows if server endpoint is poorly designed
- unnecessary battery/network work

Preferred:

```text
compare desired registration
to last successful registration
then idempotent upsert only if needed
```

---

## 4. Listeners inside widgets

Problem:

```dart
Widget build(BuildContext context) {
  FirebaseMessaging.onMessage.listen(...);
  ...
}
```

Why:

- rebuilds create duplicate listeners
- repeated processing
- memory/resource leaks

Preferred:

one app-scope messaging coordinator.

---

## 5. Navigation in background handler

Problem:

```dart
@pragma('vm:entry-point')
Future<void> background(RemoteMessage message) async {
  navigatorKey.currentState!.pushNamed('/orders');
}
```

Why:

- Android handler uses another isolate
- UI may not exist
- notification receipt is not user interaction

Preferred:

- background handler records minimal state
- taps route through `onMessageOpenedApp` / `getInitialMessage`
- router waits until app ready

---

## 6. Heavy work in `onMessage`

Problem:

```dart
FirebaseMessaging.onMessage.listen((message) async {
  await fetchEverything();
  await rebuildAllCaches();
});
```

Why:

- transport callback becomes application bottleneck
- unnecessary network/CPU usage
- may cause UI jank

Preferred:

validate -> targeted domain event -> minimal required update.

---

## 7. Heavy background processing

Problem:

```text
push
 -> 10 network calls
 -> image download
 -> database migration
 -> analytics upload
```

Why:

- limited OS execution time
- unreliable completion
- battery cost

Preferred:

minimal durable marker/scheduling/reconciliation.

---

## 8. Forgetting `getInitialMessage()`

Problem:

only:

```dart
FirebaseMessaging.onMessageOpenedApp.listen(...);
```

Why:

terminated-launch interaction is a separate lifecycle case.

Preferred:

handle both native APIs.

---

## 9. Calling `getInitialMessage()` everywhere

Why:

- duplicate routing
- unclear ownership
- consumed-once semantics

Preferred:

one coordinator reads it once.

---

## 10. One dedup key for both receipt and tap

Problem:

```text
background handler marks event handled
tap sees handled
tap ignored
```

Preferred:

separate receipt idempotency from user-interaction idempotency.

---

## 11. Assuming silent push guarantees work

Why:

Apple and Android background execution is constrained.

Preferred:

backend remains authoritative; reconcile later.

---

## 12. High priority for all Android pushes

Why:

- battery impact
- violates FCM priority intent
- can cause deprioritization/proxy behavior

Preferred:

normal unless immediate user-visible urgency exists.

---

## 13. Changing Android channel importance in code

Problem:

```text
same channel ID
old importance LOW
new code says HIGH
```

Why:

importance is effectively immutable after channel creation and user-controlled.

Preferred:

stable semantic channel strategy; new ID if product semantics genuinely require migration.

---

## 14. Auto-displayed notification plus local background notification

Why:

duplicate visible notifications.

Preferred:

manual foreground presentation only, or deliberate data-only architecture.

---

## 15. Disabling Apple swizzling from a generic native tutorial

Why:

standard FlutterFire Messaging documentation requires swizzling for its token handling.

Preferred:

keep standard FlutterFire configuration unless current FlutterFire docs explicitly support the intended custom integration.

---

## 16. Immediate Apple `getToken()` assumption

Why:

APNs token may not yet be available.

Preferred:

check `getAPNSToken()` and defer.

---

## 17. Treating Web as mobile

Problem assumptions:

```text
Web onTokenRefresh works
Web getInitialMessage works
Web subscribeToTopic works
Dart background handler handles Web pushes
```

All are incorrect for the current FlutterFire Web implementation.

Preferred:

explicit Web architecture.

---

## 18. Legacy Flutter Web worker snippets

Why:

modern Flutter no longer automatically generates/manages the historical Flutter caching service worker.

Preferred:

current Firebase messaging worker + current Flutter bootstrap, with explicit custom offline worker only if required.

---

## 19. Topic as access control

Problem:

```text
subscribeToTopic("customer_42_private")
therefore client is authorized
```

Why:

client topic subscription is not an authorization boundary.

Preferred:

trusted backend authorization and minimal notification content.

---

## 20. Topic subscription on every startup

Why:

unnecessary operations and rate consumption.

Preferred:

desired-state reconciliation on actual subscription changes.

---

## 21. Server credentials in Flutter

Problem:

```dart
const serverKey = '...';
```

Why:

client applications are inspectable; credential compromise permits unauthorized sending.

Preferred:

trusted backend + Admin SDK/HTTP v1.

---

## 22. Using old upstream FCM send APIs

Why:

FCM upstream messaging is decommissioned.

Preferred:

application API for client -> server.

---

## 23. Treating `messageId` as domain identity

Why:

transport identity and business-event identity are different.

Preferred:

sender-provided stable `event_id`.

---

## 24. Full sensitive data in notification payload

Why:

notification data may be exposed outside authenticated application UI.

Preferred:

minimal identifier + authenticated fetch.

---

## 25. Token equals authenticated user

Why:

one device can change accounts and registration can rotate.

Preferred:

backend registration association model.

---

## 26. Delete token as complete logout handling

Why:

registration may regenerate and backend stale association may remain.

Preferred:

detach backend association first; delete only if product policy requires registration removal.

---

## 27. Tight retry loop waiting for APNs/token/network

Why:

wastes resources and can stall startup.

Preferred:

bounded lifecycle retry/backoff.

---

## 28. Inventing native FID Dart APIs

Problem:

```dart
await FirebaseMessaging.instance.register();
```

Current Flutter package does not expose this native method.

Preferred:

use current Flutter package APIs and revalidate after upgrades.

---

## 29. Assuming native Direct Boot works automatically in Flutter

Why:

native Direct Boot requires special Android configuration and storage constraints.

Preferred:

dedicated native design/research if requirement exists.

---

# Implementation Checklist

Follow this sequence.

## 1. Verify versions

- [ ] inspect `pubspec.yaml`
- [ ] inspect `pubspec.lock`
- [ ] check current pub.dev package
- [ ] read package changelog for installed/target version
- [ ] check FlutterFire README for platform migration notes
- [ ] verify Flutter/Dart constraints

## 2. Configure Firebase Core

- [ ] run/update `flutterfire configure`
- [ ] verify each target Firebase app
- [ ] initialize `firebase_core` correctly
- [ ] remove duplicate/manual stale Firebase configuration

## 3. Configure Android

- [ ] Firebase Android app configured
- [ ] Google Play services environment supported
- [ ] Android 13+ permission flow designed
- [ ] notification channels designed
- [ ] default channel metadata added only if required
- [ ] notification icon configured where required
- [ ] color configured only if needed
- [ ] delivery priority chosen server-side by use case
- [ ] release background-handler test
- [ ] Doze/high-priority behavior tested

## 4. Configure iOS

- [ ] Firebase iOS app configured
- [ ] Push Notifications capability
- [ ] Background Modes as required
- [ ] APNs key/certificate uploaded
- [ ] standard FlutterFire swizzling retained
- [ ] APNs token readiness handled
- [ ] foreground presentation policy chosen
- [ ] UIScene current package requirements checked
- [ ] physical-device test

## 5. Configure macOS

- [ ] Firebase macOS app configured
- [ ] notification capability/permission
- [ ] APNs setup
- [ ] Keychain Sharing requirement
- [ ] initial-message regression test

## 6. Configure Web

- [ ] Firebase Web app configured
- [ ] VAPID public key
- [ ] HTTPS deployment
- [ ] Firebase Messaging service worker
- [ ] worker scope checked
- [ ] worker caching/update behavior checked
- [ ] explicit token reconciliation
- [ ] no native topic API assumption
- [ ] no `getInitialMessage()` dependency

## 7. Background handler

- [ ] top-level
- [ ] `@pragma('vm:entry-point')`
- [ ] registered once
- [ ] no UI/navigation
- [ ] no unverified isolate-incompatible plugins
- [ ] short bounded work
- [ ] idempotent
- [ ] Firebase initialized there only if another Firebase service needs it

## 8. Permission architecture

- [ ] contextual UX
- [ ] no startup prompt by default
- [ ] authorization status modeled
- [ ] Android "not asked vs denied" state modeled if product needs it
- [ ] provisional Apple behavior used only deliberately
- [ ] no repeated denial prompt

## 9. Registration architecture

- [ ] token not treated as user
- [ ] APNs readiness checked
- [ ] Web VAPID supplied
- [ ] native refresh listener once
- [ ] Web explicit reconciliation
- [ ] last successful sync persisted
- [ ] backend upsert idempotent
- [ ] logout association cleanup
- [ ] account switch tested
- [ ] stale registrations cleaned server-side

## 10. Message schema

- [ ] stable `type`
- [ ] `version`
- [ ] `event_id`
- [ ] minimal resource identifiers
- [ ] no secrets
- [ ] unknown versions safely rejected
- [ ] reserved FCM key names avoided

## 11. Message handling

- [ ] `onMessage`
- [ ] background handler
- [ ] native `onMessageOpenedApp`
- [ ] native `getInitialMessage`
- [ ] Web URL/service-worker interaction path
- [ ] receipt and tap dedup separated

## 12. Presentation

- [ ] Android foreground policy
- [ ] Android channel importance
- [ ] Apple foreground presentation policy
- [ ] no OS/local duplicate display
- [ ] sender payload matches channel/presentation design

## 13. Reliability

- [ ] duplicate-safe
- [ ] out-of-order-safe
- [ ] critical state reconciles from backend
- [ ] TTL intentional
- [ ] collapse semantics intentional
- [ ] missing message does not corrupt state
- [ ] transient registration retries idempotent

## 14. Security

- [ ] Admin SDK/HTTP v1 only on trusted backend
- [ ] no server credentials in app
- [ ] token-registration endpoint authenticated
- [ ] App Check considered where appropriate
- [ ] notification data validated
- [ ] protected routes authorization-checked
- [ ] production logs sanitized

## 15. Release validation

- [ ] Android release build
- [ ] iOS physical release/ad-hoc/TestFlight path
- [ ] macOS release path
- [ ] deployed Web HTTPS path
- [ ] terminated interaction
- [ ] background message
- [ ] permission states
- [ ] account transition
- [ ] token reconciliation
- [ ] duplicates/malformed payload

---

# Code Review Checklist

When reviewing existing Firebase Messaging code, inspect in this order.

## Initialization

- [ ] Is Firebase initialized once correctly?
- [ ] Is startup performing unnecessary messaging work?
- [ ] Is background handler registration app-scoped?
- [ ] Are platform branches explicit where required?

## Permissions

- [ ] Is permission requested contextually?
- [ ] Is `getToken()` accidentally triggering permission?
- [ ] Is Android 13 handled?
- [ ] Is denied/not-yet-asked ambiguity modeled if required?
- [ ] Are Apple capabilities requested only when actually used?

## Background handler

- [ ] Top-level?
- [ ] `@pragma('vm:entry-point')`?
- [ ] Short?
- [ ] Idempotent?
- [ ] Isolate safe?
- [ ] No UI?
- [ ] No navigation?
- [ ] No large network/CPU workload?

## Listeners

Search for:

```text
FirebaseMessaging.onMessage.listen
FirebaseMessaging.onMessageOpenedApp.listen
onTokenRefresh.listen
```

- [ ] Are they each registered only once?
- [ ] Are subscriptions disposed when their owner is disposable?
- [ ] Are listeners absent from `build()` methods?

## Registration

- [ ] Is `getToken()` overused?
- [ ] Is registration uploaded every launch?
- [ ] Is backend upsert idempotent?
- [ ] Is local last-success state persisted?
- [ ] Is account association correct?
- [ ] Is token rotation handled?
- [ ] Is Web handled separately?
- [ ] Is Apple APNs token readiness handled?

## Routing

- [ ] Is `getInitialMessage()` handled once?
- [ ] Is `onMessageOpenedApp` handled?
- [ ] Does Web use appropriate URL/service-worker architecture?
- [ ] Is routing delayed until app readiness?
- [ ] Is payload parsed centrally?
- [ ] Are protected resources authorization-checked?

## Presentation

- [ ] Are foreground notifications intentionally presented?
- [ ] Are Android channels stable?
- [ ] Does server payload use correct channel?
- [ ] Is a local notification duplicated with OS auto-display?
- [ ] Are Apple presentation options deliberate?

## Reliability

- [ ] Stable domain event IDs?
- [ ] Idempotency?
- [ ] Out-of-order handling?
- [ ] Backend state reconciliation?
- [ ] Appropriate collapse keys?
- [ ] Appropriate TTL?
- [ ] No "delivery is guaranteed" assumption?

## Security

Search for:

```text
serverKey
Authorization: key=
service_account
private_key
Bearer
```

- [ ] No sender credentials in client?
- [ ] No sensitive payload contents?
- [ ] No token/full payload logging?
- [ ] Topic not used as authorization?
- [ ] Deep-link actions validated?

## Platform setup

- [ ] Android permission/channels/icon?
- [ ] Apple capabilities/APNs/swizzling?
- [ ] UIScene requirements if applicable?
- [ ] macOS Keychain behavior?
- [ ] Web worker/VAPID/HTTPS/current Flutter bootstrap?

---

# Version Sensitivity

Always revalidate these areas.

## 1. Registration/FID migration — HIGH PRIORITY

Native Firebase Messaging SDKs are moving away from legacy token APIs toward Firebase Installation ID-based registration.

At validation time:

```text
native Android:
  getToken deprecated
  register/unregister available behind current native configuration

Flutter firebase_messaging 16.5.0:
  getToken available
  deleteToken available
  onTokenRefresh available
  no Dart register/unregister equivalent
```

Never infer that native API migration has automatically reached Flutter.

Check current Flutter package API first.

---

## 2. Web platform implementation — HIGH PRIORITY

At `firebase_messaging 16.5.0`:

```text
onTokenRefresh:
  no-op on Web

getInitialMessage:
  null on Web

subscribeToTopic:
  unsupported on Web

unsubscribeFromTopic:
  unsupported on Web

Dart background handler:
  not Web service-worker execution
```

These are implementation-level behaviors that can change.

Re-check `firebase_messaging_web` after upgrades.

---

## 3. iOS UIScene

Recent 16.x FlutterFire releases changed UIScene lifecycle support.

At 16.5.0, current package documentation adds an early notification-center delegate configuration requirement for applications adopting UIScene.

Always read the current README/changelog before modifying native AppDelegate/SceneDelegate code.

---

## 4. Apple initial-message behavior

Recent releases have contained:

- iOS initial-message race fixes
- UIScene lifecycle fixes
- iOS duplicate-message fixes
- macOS `getInitialMessage()` hang fix

Regression-test interaction routing after every messaging upgrade.

---

## 5. Apple method swizzling

Do not infer Flutter behavior from generic native Firebase Apple documentation.

Revalidate against the Flutter FCM setup guide because standard FlutterFire currently requires swizzling.

---

## 6. Android target SDK permission behavior

Android notification permission depends on OS version and target SDK.

Revalidate when:

- target SDK changes
- compile SDK changes
- Flutter Android templates migrate
- Android platform notification rules change

---

## 7. Android channels

Channel behavior is platform-level and user-controlled.

Never assume a plugin upgrade can rewrite an existing user's channel importance.

---

## 8. Android high-priority policy

Firebase may evolve high-priority delivery/deprioritization/proxy rules.

Recheck current Android FCM priority guidance for products that depend on urgent delivery.

---

## 9. Android notification delegation

Underlying native Firebase Messaging delegation APIs/behavior may evolve independently of the Dart surface.

Do not add native overrides from old examples without validating current FlutterFire behavior.

---

## 10. Android Direct Boot

Direct Boot is a native advanced feature.

Revalidate current FlutterFire support before attempting to combine it with Dart background execution.

---

## 11. Web service-worker architecture

Both Flutter Web bootstrap and Firebase JavaScript Messaging evolve.

Revalidate:

- generated Flutter worker behavior
- service-worker registration
- worker scopes
- Firebase JS module/compat strategy
- cache/update guidance
- browser support

Do not retain old `flutter_service_worker.js` snippets indefinitely.

---

## 12. Local notification integration

If `flutter_local_notifications` or another presentation package is added, its:

- Android channel APIs
- notification tap APIs
- isolate rules
- Apple delegate behavior
- permission behavior

must be independently version-validated.

Do not assume this skill's `firebase_messaging` validation covers another package.

---

# Production Decision Rules

When asked "what should I implement?", apply these defaults.

## If the app only needs normal user-visible pushes

Prefer:

```text
notification + data payload
native OS background presentation
onMessage for foreground
optional local foreground presentation
native tap APIs
validated routing
```

This is simpler than data-only custom presentation.

## If the app needs full notification presentation control

Consider:

```text
data-only payload
application/local presentation
```

only after explicitly accepting the platform background-delivery tradeoffs.

## If the event is critical business state

Use:

```text
FCM = invalidation/hint
backend = source of truth
foreground/reconnect = reconciliation
```

Never:

```text
FCM payload = sole durable state transition
```

## If user-specific delivery is required

Prefer backend-managed registration targeting.

Do not create a private-looking topic and assume it is secure.

## If many users need the same public event

Topics can be appropriate.

## If notification processing needs long work

FCM callback records/schedules minimal work.

Do not perform the long work inline.

## If navigation occurs from a notification

Always:

```text
validate
 -> wait for router/auth readiness
 -> authenticate
 -> authorize resource
 -> navigate
```

## If Web is supported

Design Web separately from native before claiming feature completion.

---

# Official References

Primary Flutter package and source:

- https://pub.dev/packages/firebase_messaging
- https://pub.dev/packages/firebase_messaging/changelog
- https://pub.dev/documentation/firebase_messaging/latest/firebase_messaging/FirebaseMessaging-class.html
- https://github.com/firebase/flutterfire/tree/main/packages/firebase_messaging
- https://github.com/firebase/flutterfire/tree/main/packages/firebase_messaging/firebase_messaging
- https://github.com/firebase/flutterfire/tree/main/packages/firebase_messaging/firebase_messaging_web
- https://github.com/firebase/flutterfire/blob/main/VERSIONS.md

Firebase for Flutter:

- https://firebase.google.com/docs/flutter/setup
- https://firebase.google.com/docs/cloud-messaging/flutter/get-started
- https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages
- https://firebase.google.com/codelabs/firebase-fcm-flutter

FCM architecture, payloads, delivery, and registration:

- https://firebase.google.com/docs/cloud-messaging
- https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type
- https://firebase.google.com/docs/cloud-messaging/customize-messages/collapsible-message-types
- https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-priority
- https://firebase.google.com/docs/cloud-messaging/android-message-priority
- https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan
- https://firebase.google.com/docs/cloud-messaging/manage-tokens
- https://firebase.google.com/docs/cloud-messaging/topic-messaging
- https://firebase.google.com/docs/cloud-messaging/manage-topic-subscriptions

FCM sending/security:

- https://firebase.google.com/docs/cloud-messaging/server-environment
- https://firebase.google.com/docs/cloud-messaging/send/v1-api
- https://firebase.google.com/docs/projects/api-keys
- https://firebase.google.com/docs/app-check/flutter/custom-resource

Android:

- https://firebase.google.com/docs/cloud-messaging/android/receive-messages
- https://firebase.google.com/docs/cloud-messaging/android-message-priority
- https://firebase.google.com/docs/cloud-messaging/customize-messages/android-direct-boot
- https://firebase.google.com/docs/reference/android/com/google/firebase/messaging/FirebaseMessaging
- https://firebase.google.com/docs/reference/android/com/google/firebase/messaging/FirebaseMessagingService
- https://developer.android.com/develop/ui/views/notifications/notification-permission
- https://developer.android.com/develop/ui/views/notifications/channels

Apple:

- https://firebase.google.com/docs/cloud-messaging/ios/get-started
- https://firebase.google.com/docs/cloud-messaging/ios/receive-messages
- https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications
- https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app

Web:

- https://firebase.google.com/docs/cloud-messaging/web/get-started
- https://firebase.google.com/docs/cloud-messaging/web/receive-messages
- https://docs.flutter.dev/platform-integration/web/faq

---

# Final Rule for AI Agents

Before modifying a production Firebase Messaging implementation:

1. inspect installed versions
2. inspect existing native configuration
3. identify every supported platform
4. identify current payload shape and trusted sender
5. identify permission UX
6. identify registration/backend model
7. identify every listener and background handler
8. identify notification presentation strategy
9. identify routing/deep-link behavior
10. identify reliability assumptions
11. identify security boundaries
12. identify unnecessary startup/background work

Then make the smallest architecture change that restores correctness.

Do not "fix" Firebase Messaging by:

- adding more listeners
- calling `getToken()` more often
- forcing all messages high priority
- adding arbitrary delays
- repeatedly requesting permission
- adding a local notification to every callback
- disabling Apple swizzling
- copying an old service-worker template
- moving navigation into a background handler
- shipping server credentials
- inventing APIs from the native SDK that the current Flutter package does not expose

Correct production Firebase Messaging architecture is deliberately boring:

```text
minimal startup
contextual permission
one listener owner
idempotent registration
small validated payloads
short background callbacks
deliberate presentation
safe interaction routing
backend reconciliation
platform-specific testing
```

Prefer that design.
