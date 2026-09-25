# Reference: Application abstractions, Bloc/DI integration, revocation, errors, performance, observability, testing, debugging, and package migration.

## Contents
- Permission Service Architecture
- Bloc/Cubit Integration
- Riverpod / Provider Integration
- Dependency Injection
- Required vs Optional Permissions
- Permission Revocation
- Error Handling
- Performance
- Observability
- Testing Strategy
- Unit Tests
- Widget Tests
- Integration Tests
- Android Version Tests
- iOS Tests
- Service Disabled Test
- Clean-Install Testing
- Testing Settings Return
- Debugging Workflow
- Request Does Nothing
- Status Is Always Denied
- `isPermanentlyDenied` Looks Unexpected
- Android Permission Never Appears
- Android Storage Always Denied
- Android Bluetooth Requires Unexpected Location
- iOS App Crashes/Terminates on Permission Access
- iOS Prompt Never Appears
- Limited Photos Behave Like Denied
- `openAppSettings()` Does Not Resolve the Problem
- Migration Workflow

---

# Permission Service Architecture

For more than a few permission flows, hide plugin-specific details behind a presentation/platform abstraction.

```dart
enum AppPermissionState {
  granted,
  limited,
  provisional,
  denied,
  permanentlyDenied,
  restricted,
}

abstract interface class AppPermissionService {
  Future<AppPermissionState> cameraStatus();
  Future<AppPermissionState> requestCamera();
}
```

Implementation:

```dart
import 'package:permission_handler/permission_handler.dart';

final class PermissionHandlerService
    implements AppPermissionService {
  const PermissionHandlerService();

  @override
  Future<AppPermissionState> cameraStatus() async {
    return _map(await Permission.camera.status);
  }

  @override
  Future<AppPermissionState> requestCamera() async {
    return _map(await Permission.camera.request());
  }

  AppPermissionState _map(PermissionStatus status) {
    return switch (status) {
      PermissionStatus.granted =>
        AppPermissionState.granted,
      PermissionStatus.limited =>
        AppPermissionState.limited,
      PermissionStatus.provisional =>
        AppPermissionState.provisional,
      PermissionStatus.denied =>
        AppPermissionState.denied,
      PermissionStatus.permanentlyDenied =>
        AppPermissionState.permanentlyDenied,
      PermissionStatus.restricted =>
        AppPermissionState.restricted,
    };
  }
}
```

Benefits:

- deterministic unit tests;
- one place for platform/version mapping;
- application state does not depend directly on plugin enums;
- policy remains consistent.

Do not create a 5,000-line permission framework when the app requests one camera permission.

---

# Bloc/Cubit Integration

Keep permission UI orchestration separate from domain data.

Preferred:

```text
User action
↓
Cubit/application coordinator
↓
PermissionService
↓
permission_handler
↓
mapped application capability state
↓
feature state
```

Do not put `BuildContext` inside Cubit/service.

Example:

```dart
import 'package:flutter_bloc/flutter_bloc.dart';

sealed class CameraAccessState {
  const CameraAccessState();
}

final class CameraAccessIdle extends CameraAccessState {
  const CameraAccessIdle();
}

final class CameraAccessChecking extends CameraAccessState {
  const CameraAccessChecking();
}

final class CameraAccessReady extends CameraAccessState {
  const CameraAccessReady();
}

final class CameraAccessDenied extends CameraAccessState {
  const CameraAccessDenied();
}

final class CameraAccessNeedsSettings
    extends CameraAccessState {
  const CameraAccessNeedsSettings();
}

final class CameraAccessRestricted
    extends CameraAccessState {
  const CameraAccessRestricted();
}

class CameraAccessCubit extends Cubit<CameraAccessState> {
  CameraAccessCubit(this._permissions)
      : super(const CameraAccessIdle());

  final AppPermissionService _permissions;

  Future<void> requestAccess() async {
    emit(const CameraAccessChecking());

    final status = await _permissions.requestCamera();

    switch (status) {
      case AppPermissionState.granted:
        emit(const CameraAccessReady());
      case AppPermissionState.permanentlyDenied:
        emit(const CameraAccessNeedsSettings());
      case AppPermissionState.restricted:
        emit(const CameraAccessRestricted());
      case AppPermissionState.denied:
      case AppPermissionState.limited:
      case AppPermissionState.provisional:
        emit(const CameraAccessDenied());
    }
  }
}
```

The UI decides whether to show the rationale/settings button.

---

# Riverpod / Provider Integration

Apply the same boundary:

```text
provider/notifier
→ application permission abstraction
→ plain application state
```

Do not spread:

```dart
PermissionStatus
```

through repositories/entities merely because Riverpod makes it easy to expose.

---

# Dependency Injection

A permission service can usually be application-scoped because it contains little or no mutable UI state.

A permission **request coordinator** can also be application-scoped if it intentionally serializes prompts across features.

Do not inject:

- `BuildContext`;
- widget references;
- dialogs;
- Navigator state;

into the low-level permission service.

Presentation chooses UI.

---

# Required vs Optional Permissions

Classify each permission.

### Essential to a feature

Example:

```text
camera permission
→ QR scanner
```

Denial disables scanner only.

### Optional enhancement

Example:

```text
contacts permission
→ suggest recipients
```

Manual entry remains.

### Product-level essential

Rarely, a permission may be essential to the app's core purpose.

Even then:

- explain why;
- permit denial;
- provide exit/recovery;
- do not repeatedly prompt.

---

# Permission Revocation

Permissions can change because:

- user changes Settings;
- OS one-time permission expires;
- Android auto-resets unused app permissions;
- device policy changes;
- selected-photo/contact sets change.

Never store:

```dart
bool cameraGranted = true;
```

in persistent storage and trust it indefinitely.

Persistent values may record UX history such as:

```text
we already explained why camera is useful
```

but current OS authorization must come from the OS.

---

# Error Handling

Do not collapse everything to:

```text
permissionFailed
```

Use a categorized model such as:

```dart
enum CapabilityFailure {
  permissionDenied,
  permissionPermanentlyDenied,
  permissionRestricted,
  partialAccessInsufficient,
  serviceDisabled,
  hardwareUnavailable,
  unsupportedPlatform,
  configurationError,
  operationFailed,
}
```

Examples:

```text
camera denied
≠
camera hardware unavailable

location granted + service disabled
≠
location permission denied

photo limited
≠
photo denied

missing Info.plist key
≠
user denied
```

---

# Performance

Permission checks are normally not the performance bottleneck.

Optimize correctness first.

### Avoid polling

Bad:

```dart
Timer.periodic(
  const Duration(milliseconds: 500),
  (_) => Permission.camera.status,
);
```

Good:

- before camera use;
- after settings resume;
- when returning to an active feature whose permission may have changed.

### Avoid checks in build

Widget rebuilds can occur frequently and unpredictably.

Never perform platform-channel permission work because Flutter happened to rebuild.

### Lazy resource initialization

Do:

```text
permission granted
↓
initialize camera
```

not:

```text
initialize camera
↓
request permission
```

Apply the same principle to:

- microphone recorder;
- Bluetooth scanner;
- location stream.

---

# Observability

Log only safe metadata.

Reasonable:

```text
permission=camera
flow=qr_scan
before=denied
after=granted
platform=android
api=34
```

Avoid logging:

- selected photo names;
- contact data;
- precise coordinates;
- microphone contents;
- unnecessary identifiers.

Permission analytics should improve UX, not fingerprint or pressure users.

---

# Testing Strategy

## Unit Tests

Do not make business/presentation policy depend directly on platform dialogs.

Fake the permission abstraction.

```dart
final class FakePermissionService
    implements AppPermissionService {
  FakePermissionService({
    required this.current,
    required this.requestResult,
  });

  AppPermissionState current;
  AppPermissionState requestResult;

  int requestCount = 0;

  @override
  Future<AppPermissionState> cameraStatus() async {
    return current;
  }

  @override
  Future<AppPermissionState> requestCamera() async {
    requestCount++;
    current = requestResult;
    return requestResult;
  }
}
```

Test:

- granted;
- denied;
- permanently denied;
- restricted;
- limited;
- provisional where relevant.

---

## Widget Tests

Test application UI, not actual system dialogs.

Verify:

```text
denied
→ request button/rationale

permanent
→ settings button

restricted
→ policy explanation

limited
→ partial-content UX

granted
→ feature proceeds
```

Also assert request happens once per explicit interaction.

---

## Integration Tests

Real permission behavior must be validated on platform environments.

Test:

- clean install;
- first prompt;
- grant;
- deny;
- dismiss prompt where platform allows;
- repeated denial;
- permanent denial;
- settings recovery;
- permission revocation;
- service disabled;
- app resume;
- process restart;
- relevant OS-version transitions.

---

## Android Version Tests

At minimum, test around the API boundaries used by the feature.

Examples:

### Media

```text
API 32
→ legacy read storage path if still supported

API 33
→ READ_MEDIA_*

API 34+
→ selected photos / limited access
```

### Bluetooth

```text
API 30
→ legacy Bluetooth/location behavior

API 31+
→ Nearby Devices runtime permissions
```

### Notifications

```text
API 32
→ no POST_NOTIFICATIONS runtime dialog

API 33+
→ runtime notification permission
```

### Background location

```text
API 29
→ Android 10 behavior

API 30+
→ settings-mediated background grant
```

---

## iOS Tests

Test:

- first request;
- denial;
- settings recovery;
- restricted where possible;
- Photos limited;
- Contacts limited on iOS 18+ if feature uses it;
- notifications provisional status if supported by surrounding notification architecture;
- location when-in-use versus Always;
- reduced location accuracy where feature precision matters;
- ATT if used.

Configuration failures should be caught during development before release.

---

## Service Disabled Test

For location:

```text
permission = granted
Location Services = off
```

Ensure UI says:

```text
Enable Location Services
```

not:

```text
Grant location permission
```

---

## Clean-Install Testing

A simulator/device with months of permission history is not equivalent to a new user.

Test clean state by:

- uninstall/reinstall where the platform resets permission state appropriately;
- resetting simulator privacy state;
- using platform tooling/ADB where appropriate.

---

## Testing Settings Return

Test:

```text
permanently denied
↓
tap Open Settings
↓
grant permission
↓
resume
↓
feature updates
```

and:

```text
tap Open Settings
↓
change nothing
↓
resume
↓
no request loop
```

---

# Debugging Workflow

## Request Does Nothing

Inspect in this order:

1. installed `permission_handler` version;
2. target platform is supported;
3. permission exists on this OS/API;
4. Android manifest declaration exists;
5. iOS Info.plist key exists;
6. CocoaPods macro/SPM configuration includes feature;
7. current status is already permanent/restricted;
8. request runs while foreground Activity/app is available;
9. target SDK behavior;
10. feature uses a special-access settings flow rather than normal dialog.

---

## Status Is Always Denied

Inspect:

### Android

- permission missing from manifest;
- permission obsolete on this API;
- old `Permission.storage` on Android 13+;
- OS-version mismatch;
- missing attached Activity for permanent-denial classification;
- wrong media permission for device version.

### iOS

- missing compile-time permission strategy;
- missing Info.plist usage description;
- wrong calendar permission on iOS 17+.

### Web

- unsupported permission;
- browser Permissions API limitations.

---

## `isPermanentlyDenied` Looks Unexpected

Check:

- previous denial history;
- Android repeated denial;
- iOS behavior where explicit denial is effectively settings-only afterward;
- whether the request happened without a foreground Activity on Android;
- package version.

Do not infer permanent denial solely from Android rationale boolean.

---

## Android Permission Never Appears

Check:

1. permission declared;
2. current Android API;
3. app target SDK;
4. permission still exists on that API;
5. already permanently denied;
6. special-access permission instead of runtime permission;
7. notification behavior pre/post API 33.

---

## Android Storage Always Denied

On Android 13+ this is expected for:

```dart
Permission.storage
```

Use modern media permissions or a system picker.

---

## Android Bluetooth Requires Unexpected Location

Inspect:

- Android API level;
- whether `BLUETOOTH_SCAN` modern permission is used;
- legacy location manifest declarations;
- whether scan results genuinely derive physical location;
- whether `neverForLocation` is appropriate.

Do not solve by globally requesting location on every Android version.

---

## iOS App Crashes/Terminates on Permission Access

Inspect:

1. required Info.plist key;
2. current dependency mechanism;
3. CocoaPods macro if applicable;
4. entitlement where required;
5. actual permission feature being called.

The package explicitly warns missing iOS usage descriptions can terminate the application.

---

## iOS Prompt Never Appears

Check:

- user already denied previously;
- permission status is `permanentlyDenied`;
- required macro is disabled;
- SPM permission was not compiled in;
- Info.plist key is absent;
- wrong iOS permission variant is used;
- app is not in the correct foreground state for a platform-specific API.

---

## Limited Photos Behave Like Denied

Inspect application mapping.

Bad:

```dart
if (!status.isGranted) {
  return PhotoAccessBlocked();
}
```

Better:

```dart
if (status.isGranted || status.isLimited) {
  return AccessiblePhotoLibrary();
}
```

---

## `openAppSettings()` Does Not Resolve the Problem

Check:

- user actually changed permission;
- permission is restricted rather than user-changeable;
- app rechecked after resume;
- browser/Windows implementation supports settings opening;
- feature has a service/hardware failure instead.

---

# Migration Workflow

Before upgrading:

1. record installed `permission_handler` version;
2. inspect top-level package changelog;
3. inspect platform-package changes if relevant;
4. inspect Dart/Flutter minimum requirements;
5. inspect Android compile SDK requirement;
6. inspect target-SDK behavior changes;
7. inspect Android manifest permissions;
8. inspect iOS Info.plist;
9. inspect CocoaPods macros/SPM configuration;
10. inspect new/deprecated `Permission` constants;
11. inspect `PermissionStatus` behavior changes;
12. run clean-install tests;
13. run previously-denied tests;
14. run settings-return tests;
15. run representative Android API tests;
16. run iOS limited/restricted tests.

### Known migration-sensitive changes

Examples from package history:

- `12.0.0`: Android compile SDK moved to 35;
- `12.0.2`: SPM configuration documentation added;
- `11.3.0`: `Permission.backgroundRefresh`;
- `11.2.0`: `Permission.assistant`;
- `11.1.0`: iOS 17 Calendar split and `Permission.calendar` deprecation;
- `10.3.x`: provisional notification status support era;
- `10.2.x`: Android 13 media and exact-alarm work;
- `10.0.0`: Android 13 `POST_NOTIFICATIONS` compile SDK transition;
- `8.2.x`: Android 12 Bluetooth runtime groups;
- `8.0.0`: iOS compile-time permission exclusion/macros;
- repository `13.0.0`: Android compile SDK 37 and Android 17 local-network work, not stable `12.0.3` behavior.

Do not blindly upgrade permission infrastructure with `flutter pub upgrade` and assume OS behavior is unchanged.

---

