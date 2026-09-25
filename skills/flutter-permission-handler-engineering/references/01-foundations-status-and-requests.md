# Reference: Foundations, package setup, status semantics, rationale, request timing, and request coordination.

## Contents
- permission_handler Engineering Skill for Flutter
- Purpose
- Responsibility Boundaries
- When to Use This Skill
- When NOT to Request a Permission
- Core Principles
- Mental Model
- Package Setup
- Current Core API
- PermissionStatus
- Prefer Explicit Status Handling
- Permission Checking
- Permission Requesting
- Request Timing
- Rationale
- Multiple Permissions
- Concurrency / Request Coordination

---

# permission_handler Engineering Skill for Flutter

## Purpose

Use this skill when designing, implementing, reviewing, debugging, testing, securing, or migrating runtime-permission flows in Flutter applications that use `permission_handler`.

Treat permission handling as **privacy-sensitive product behavior**, not as a mechanical plugin call.

Use this skill to make senior-level decisions about:

- whether a feature requires runtime permission at all;
- whether a system picker, intent, manual-entry flow, or narrower capability avoids broad access;
- which `Permission` maps to the actual feature;
- Android API-level differences;
- iOS static privacy declarations and compile-time configuration;
- `PermissionStatus` semantics;
- background/foreground permission sequencing;
- service availability versus authorization;
- limited/partial access;
- rationale timing;
- settings recovery;
- request coordination;
- feature degradation;
- platform testing;
- migration across package and OS changes.

### Version baseline

The current stable package published on pub.dev is:

```yaml
permission_handler: ^12.0.3
```

Pub.dev lists Dart 3.5 as its minimum Dart SDK and Android, iOS, web, and Windows as supported top-level platforms. ([pub.dev](https://pub.dev/packages/permission_handler/versions))

The current repository default branch is already ahead of stable: it contains `13.0.0` changes, including Android `compileSdkVersion 37` and Android 17 local-network permission support. Do **not** copy unreleased/newer-main APIs such as the new Android local-network permission into a `12.0.3` application. Always inspect the installed package/version or matching repository tag before migration. ([pub.dev](https://pub.dev/packages/permission_handler/changelog))

For stable `12.0.x`, the official README requires Android `compileSdkVersion 35`. Do not confuse this with the application's `targetSdkVersion`; target SDK is a separate application/policy decision that changes platform behavior.

---

## Responsibility Boundaries

Always distinguish three layers.

### `permission_handler` responsibility

The package can:

- query supported permission statuses;
- request supported permissions;
- expose `PermissionStatus`;
- expose selected platform service statuses;
- expose Android rationale information;
- request several permissions together;
- open the application's settings page where supported;
- map platform-specific authorization results into its cross-platform status enum.

The package does **not** decide whether your product should request a permission.

### Operating-system responsibility

Android, iOS, browsers, and desktop operating systems decide:

- whether a system prompt exists;
- whether the prompt can be shown again;
- whether the user grants full, limited, provisional, approximate, temporary, or no access;
- whether policy or parental controls prevent access;
- whether a permission is automatically revoked;
- whether background access can be granted;
- where special app access is configured;
- how behavior changes with OS and target SDK versions.

### Application responsibility

The application must decide:

- whether permission is actually needed;
- which scope is sufficient;
- when the request is justified by user intent;
- whether to explain the request first;
- how denial affects the feature;
- whether partial access is useful;
- when settings should be offered;
- what to do after returning from settings;
- whether the hardware/service is actually usable;
- what data is collected after authorization.

`permission_handler` is an OS integration mechanism. It is **not** a substitute for privacy architecture.

---

## When to Use This Skill

Apply this skill for:

- camera;
- microphone;
- location;
- background location;
- photo/media-library access;
- Android media permissions;
- contacts;
- calendars/reminders;
- Bluetooth/Nearby Devices;
- notifications;
- speech recognition;
- sensors;
- activity recognition;
- Android storage migration;
- Android special app access;
- App Tracking Transparency;
- permission-related platform configuration;
- permission architecture/code review;
- permission debugging;
- settings-return flows;
- package migration;
- Android API-level upgrades;
- iOS privacy configuration changes.

---

## When NOT to Request a Permission

Before adding `Permission.*`, ask:

```text
What exact user capability needs protected data?
        ↓
Can the feature work without broad access?
        ↓
Can a system picker / intent / manual input solve it?
        ↓
Can a narrower permission solve it?
        ↓
Is runtime permission actually required on this OS/version?
        ↓
Only then add/request permission
```

### Prefer no permission when possible

Examples:

| Requirement | Prefer |
| --- | --- |
| User selects one image | System photo picker |
| User attaches several selected photos | System photo picker |
| User enters one email/phone number | Manual entry before full Contacts access |
| User dials a telephone number | `tel:` intent rather than phone-state permission |
| User composes an SMS | `sms:` intent rather than SMS-reading permission |
| User chooses a document | System document picker |
| App saves its own private files | App-specific storage |
| App adds shared media on modern Android | MediaStore/platform API without broad read permission where supported |
| User pairs a companion Bluetooth device | Android Companion Device Manager where it satisfies the use case |
| Approximate location is sufficient | Do not request unnecessary precision |
| One foreground location result is sufficient | Do not request background location |

Android explicitly recommends minimizing permission requests and using alternatives such as system pickers or manual input where they meet the feature need.

Apple's Photos picker lets users grant access only to selected items without granting general photo-library authorization.

### Never request permissions “just in case”

Do not request:

```text
camera
microphone
contacts
location
notifications
photos
```

at application startup simply because the app might need them eventually.

Strong rule:

> **Request only the minimum permission needed for the current feature, at the moment the user is about to use that feature.**

---

## Core Principles

1. **Request the minimum privilege necessary.**
2. **Request permissions in feature context.**
3. **Do not request every likely permission at startup.**
4. **Do not bundle unrelated permissions.**
5. **Do not request broad library access when a system picker is sufficient.**
6. **Do not request background access if foreground access solves the feature.**
7. **Treat every `PermissionStatus` distinctly.**
8. **Do not loop permission requests after denial.**
9. **Do not automatically open settings.**
10. **Offer settings only through an explicit user action.**
11. **Re-check the relevant permission after returning from settings.**
12. **Do not cache `granted` forever.**
13. **Distinguish authorization from system-service state.**
14. **Distinguish authorization from hardware capability.**
15. **Treat `limited` as partial access, not automatic failure.**
16. **Treat `restricted` as fundamentally different from ordinary denial.**
17. **Treat `provisional` as notification-specific.**
18. **Preserve unrelated application functionality after optional denial.**
19. **Keep package-specific permission APIs out of domain entities.**
20. **Do not store `BuildContext` in permission services.**
21. **Coordinate simultaneous permission requests.**
22. **Do not call permission APIs from `build()`.**
23. **Do not poll permission status.**
24. **Initialize cameras, scanners, location streams, or recorders only after authorization.**
25. **Verify Android behavior by API level and target SDK.**
26. **Add only required Android manifest declarations.**
27. **Add only required Apple usage-description keys/macros.**
28. **Test first-install, previously denied, permanently denied, restricted, partial, and settings-return states.**
29. **Assume users can revoke permission outside the app.**
30. **Never optimize consent conversion by coercing users.**

---

## Mental Model

Use this flow:

```text
User intends to use feature
        ↓
Does feature actually require permission?
        ├── no → use feature
        └── yes
              ↓
Can a privacy-preserving alternative avoid permission?
        ├── yes → use picker/intent/narrow API
        └── no
              ↓
Check current PermissionStatus
              ↓
Interpret exact state
              ├── granted
              ├── limited
              ├── provisional
              ├── denied
              ├── permanentlyDenied
              └── restricted
              ↓
If requestable, decide whether rationale is appropriate
              ↓
Request only required permission(s)
              ↓
Interpret returned state again
              ↓
Check system service if relevant
              ↓
Check feature/hardware capability
              ↓
Use feature / degrade gracefully / offer settings
```

Do **not** reduce this to:

```text
final allowed = await Permission.camera.request().isGranted;
```

when denial, settings recovery, partial access, service status, or privacy requirements matter.

---

## Package Setup

### Dependency

For the current stable release:

```yaml
dependencies:
  flutter:
    sdk: flutter
  permission_handler: ^12.0.3
```

Import:

```dart
import 'package:permission_handler/permission_handler.dart';
```

### Android

Stable `12.0.x` documentation requires:

```gradle
android {
    compileSdkVersion 35
}
```

or the equivalent modern Gradle DSL configuration.

Then add only the permissions required by the feature to:

```text
android/app/src/main/AndroidManifest.xml
```

Do not paste the repository's complete example manifest into production.

### iOS

Choose the configuration model matching the application.

#### Swift Package Manager

Current package documentation says SPM requires:

- Flutter 3.24+;
- Xcode 15+.

With SPM, `permission_handler` detects enabled permission code from relevant `Info.plist` usage-description keys. Notifications are enabled by default because they do not have an ordinary usage-description key; critical-alert code is disabled by default because it needs Apple's special entitlement.

#### CocoaPods

For CocoaPods, enable only required compile-time permission macros in the Podfile and add matching `Info.plist` usage descriptions. Unused permissions should remain disabled.

---

## Current Core API

### Check

```dart
final PermissionStatus status = await Permission.camera.status;
```

Shortcut:

```dart
final bool granted = await Permission.camera.isGranted;
```

### Request

```dart
final PermissionStatus result = await Permission.camera.request();
```

### Multiple permissions

```dart
final Map<Permission, PermissionStatus> result = await <Permission>[
  Permission.camera,
  Permission.microphone,
].request();
```

### Android rationale

```dart
final bool shouldExplain =
    await Permission.camera.shouldShowRequestRationale;
```

The Dart API explicitly returns `false` for this API on non-Android platforms.

### Service status

For `PermissionWithService` permissions:

```dart
final ServiceStatus locationService =
    await Permission.locationWhenInUse.serviceStatus;
```

### Open settings

```dart
final bool opened = await openAppSettings();
```

`openAppSettings()` returns whether the settings page could be opened.

---

## PermissionStatus

Current stable `PermissionStatus` values are:

```dart
PermissionStatus.denied
PermissionStatus.granted
PermissionStatus.restricted
PermissionStatus.limited
PermissionStatus.permanentlyDenied
PermissionStatus.provisional
```



### `denied`

Meaning:

- access is not granted;
- the package considers the permission requestable/not permanently blocked.

`denied` does **not** necessarily prove the user actively pressed “Deny” during this session.

The package documentation explicitly uses `denied` for both:

- permission not requested yet;
- previously denied but still requestable.

Do not build analytics or UX that assumes:

```text
denied == user definitely rejected us
```

### `granted`

Meaning:

> The OS authorization represented by this permission is granted.

It does **not** guarantee:

- hardware exists;
- camera initialization succeeds;
- microphone is not in use elsewhere;
- Bluetooth is enabled;
- location services are enabled;
- GPS has a fix;
- the network is available;
- push delivery is configured;
- a requested photo still exists;
- the user granted precise location.

Always distinguish permission from capability.

### `restricted`

Meaning:

- the OS prevents access;
- the user cannot simply resolve it through the normal permission prompt;
- examples include parental/device restrictions.

Current public docs describe this as iOS-only.

Do not:

```text
restricted
→ request again
→ request again
→ request again
```

Instead explain that the device/account policy prevents the feature.

### `limited`

Meaning:

- the application has partial access;
- some of the protected resource can still be used.

Current platform-interface documentation identifies limited access for iOS and Android 14+, and the Android implementation maps Android 14 Selected Photos Access into `limited` for visual media. iOS 18 Contacts can also expose limited contact authorization.

Treat:

```text
limited != denied
```

Feature policy should answer:

```text
Can this feature work with the user-selected subset?
```

If yes, continue.

### Documentation discrepancy: `isLimited`

The `permission_handler 12.0.3` shortcut documentation still describes `isLimited` mainly as iOS photos/iOS 18 contacts, while the platform-interface docs and current Android implementation also support Android 14 visual-media partial access. Treat this as a version-sensitive documentation inconsistency and verify the installed Android implementation when partial-media behavior matters.

### `permanentlyDenied`

Meaning:

- another ordinary `.request()` will not produce the normal permission dialog;
- user action in settings may be required.

Current platform-interface docs describe:

- Android 11+: plugin interpretation after repeated denial;
- older Android: “never ask again” behavior;
- iOS: an explicit user denial is mapped to permanently denied for permissions the system will not prompt again.

Correct UX:

```text
permanentlyDenied
↓
explain feature limitation
↓
show optional "Open Settings"
↓
user explicitly taps it
↓
app leaves foreground
↓
user may or may not change permission
↓
app resumes
↓
re-check
```

Never automatically open settings as soon as the status is observed.

### `provisional`

This is notification-specific.

It means the application is provisionally authorized to send noninterruptive notifications on Apple platforms.

Do not interpret `provisional` as a generic “partial permission.”

### Permission-handler notification nuance

The current Apple implementation can **report** provisional authorization, but its ordinary `Permission.notification.request()` implementation requests sound, alert, and badge authorization rather than requesting Apple's `.provisional` option.

If the product specifically needs to initiate Apple's provisional-notification flow, use an appropriate notification/native integration. Do not invent a `permission_handler` provisional-request parameter.

---

## Prefer Explicit Status Handling

For production flows, prefer:

```dart
enum PermissionOutcome {
  granted,
  limited,
  provisional,
  denied,
  permanentlyDenied,
  restricted,
}

PermissionOutcome mapPermissionStatus(PermissionStatus status) {
  return switch (status) {
    PermissionStatus.granted => PermissionOutcome.granted,
    PermissionStatus.limited => PermissionOutcome.limited,
    PermissionStatus.provisional => PermissionOutcome.provisional,
    PermissionStatus.denied => PermissionOutcome.denied,
    PermissionStatus.permanentlyDenied =>
      PermissionOutcome.permanentlyDenied,
    PermissionStatus.restricted => PermissionOutcome.restricted,
  };
}
```

over a single boolean.

### Callback-chain caution

The package provides:

```dart
Permission.camera
    .onGrantedCallback(...)
    .onDeniedCallback(...)
    .request();
```

These callbacks are convenient, but the current package Dart implementation stores callback slots as static fields in the extension implementation. For coordinated or concurrent permission workflows, prefer switching on the returned `PermissionStatus`; this is easier to test and avoids relying on callback isolation.

---

## Permission Checking

Check permission:

- immediately before capability use if external revocation matters;
- when rendering a permission-specific recovery screen;
- after returning from system settings;
- at another meaningful lifecycle boundary when the feature is active.

Do not check permission:

- every widget build;
- every animation frame;
- every scroll event;
- every second on a timer.

Example:

```dart
Future<bool> canUseCamera() async {
  final status = await Permission.camera.status;
  return status.isGranted;
}
```

Do not treat this as a hardware check.

---

## Permission Requesting

Correct request pattern:

```dart
Future<PermissionStatus> requestCameraIfAppropriate() async {
  final current = await Permission.camera.status;

  if (current.isGranted ||
      current.isLimited ||
      current.isProvisional ||
      current.isRestricted ||
      current.isPermanentlyDenied) {
    return current;
  }

  return Permission.camera.request();
}
```

This intentionally avoids another request when the state cannot usefully produce a normal system prompt.

---

## Request Timing

Request at the point of understandable user intent.

Good:

```text
User taps "Scan QR code"
↓
camera authorization check
↓
request if needed
↓
camera initializes
```

Good:

```text
User enables "Alert me when price changes"
↓
explain notification benefit
↓
request notifications
```

Bad:

```text
splash screen
↓
camera
↓
microphone
↓
contacts
↓
photos
↓
location
↓
notifications
```

Permission requests are trust events. Timing changes their meaning.

---

## Rationale

### Android

Use:

```dart
final shouldShow =
    await Permission.locationWhenInUse.shouldShowRequestRationale;
```

when deciding whether an educational explanation may be useful.

The Android implementation delegates to Android's `shouldShowRequestPermissionRationale` mechanism. It also keeps internal denial history to distinguish ordinary from permanent denial.

### Do not use rationale boolean as the full state machine

`shouldShowRequestRationale == false` can occur:

- before the first request;
- after permanent denial;
- when the permission is unsupported/missing;
- outside the Android path.

Therefore never implement:

```dart
if (!await Permission.camera.shouldShowRequestRationale) {
  await openAppSettings();
}
```

Use the actual `PermissionStatus`.

### Rationale content

Explain:

- what the feature does;
- why access is needed;
- what still works if declined.

Do not:

- guilt users;
- claim access is mandatory when it is optional;
- hide unrelated functionality;
- imitate the system prompt visually.

---

## Multiple Permissions

Current API:

```dart
Future<Map<Permission, PermissionStatus>> requestVideoPermissions() {
  return <Permission>[
    Permission.camera,
    Permission.microphone,
  ].request();
}
```

Group permissions only when they are necessary for the **same immediate action**.

Appropriate:

```text
User starts video recording
→ camera + microphone
```

Potentially inappropriate:

```text
User opens profile
→ contacts + location + notifications + camera
```

### Prefer sequencing when requirements differ

If camera is mandatory but microphone is optional:

```text
request camera
↓
granted
↓
offer video-audio feature
↓
request microphone only if user wants audio
```

Do not request microphone for still-image capture.

---

## Concurrency / Request Coordination

Multiple system permission prompts should not compete.

Avoid:

```text
Camera screen requests camera
+
voice component requests microphone
+
background coordinator requests notifications
```

at the same time.

The ATT API is one example where Apple's platform rules make concurrent authorization prompts especially problematic. More generally, system permission prompts are user-facing modal OS interactions.

For complex apps, serialize permission requests.

```dart
import 'dart:async';

class PermissionRequestQueue {
  Future<void> _tail = Future<void>.value();

  Future<T> run<T>(Future<T> Function() operation) {
    final completer = Completer<T>();

    _tail = _tail.then((_) async {
      try {
        completer.complete(await operation());
      } catch (error, stackTrace) {
        completer.completeError(error, stackTrace);
      }
    });

    return completer.future;
  }
}
```

Usage:

```dart
final queue = PermissionRequestQueue();

final status = await queue.run(
  () => Permission.camera.request(),
);
```

Keep this coordinator in presentation/application infrastructure, not the domain model.

---

