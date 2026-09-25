# Reference: Android API-level behavior, manifests, media, notifications, Bluetooth, location, background access, and special app access.

## Contents
- Android
- Android Mental Model
- Android API-Level Matrix
- Android Manifest
- Android Storage / Media
- Android Photos / Partial Access
- Android Notifications
- Android Bluetooth
- Android Location
- Android Background Location
- Android Permanently Denied Behavior
- Android One-Time and Auto-Reset Permissions
- Android Nearby Wi-Fi
- Android Special App Access

---

# Android

## Android Mental Model

Android behavior depends on all of:

```text
device OS version
+
application targetSdkVersion
+
manifest declaration
+
current user decision/history
+
permission_handler version
```

Never reason from API level alone.

---

## Android API-Level Matrix

| Android | Key permission changes relevant to production |
| --- | --- |
| API 23 / Android 6 | Runtime dangerous-permission model introduced |
| API 26 / Android 8 | Background execution/location limits tightened; Companion Device Manager available for some companion pairing |
| API 29 / Android 10 | `ACCESS_BACKGROUND_LOCATION`; scoped-storage transition; background location separates from foreground |
| API 30 / Android 11 | One-time camera/microphone/location access; permission auto-reset; background location must be granted through settings for modern-target apps |
| API 31 / Android 12 | `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE`; approximate-versus-precise location UX |
| API 33 / Android 13 | Runtime `POST_NOTIFICATIONS`; `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`; Nearby Wi-Fi permission |
| API 34 / Android 14 | Selected Photos Access / `READ_MEDIA_VISUAL_USER_SELECTED`; exact-alarm fresh-install behavior changes |
| API 35–36 | Re-check target-specific platform changes; do not invent new `Permission` groups merely from OS version |
| API 37 / Android 17 | Repository `13.0.0` work introduces local-network permission; **not part of stable `12.0.3` baseline** |

Android's modern privacy rules are target-sensitive. Re-run permission integration tests whenever `targetSdkVersion` changes.

---

## Android Manifest

Declare only what the feature requires.

### Camera

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

### Microphone

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### Notifications on Android 13+

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Foreground location

Approximate only:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

Precise-capable:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### Background location

Only if genuinely required:

```xml
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

### Android 13 media

```xml
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
```

Add only categories used.

### Android 14 Selected Photos Access

If the app implements its own media gallery and needs controlled partial-media reselection:

```xml
<uses-permission
    android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />
```

Prefer Android's Photo Picker when it meets the use case. Android recommends it because it avoids broad media-library permission.

---

## Android Storage / Media

### Do not use `Permission.storage` as a modern catch-all

The package documents that `Permission.storage` maps to legacy:

```text
READ_EXTERNAL_STORAGE
WRITE_EXTERNAL_STORAGE
```

and always returns denied on Android 13+ because those permissions were deprecated/disabled for modern media access.

Use:

```dart
Permission.photos
Permission.videos
Permission.audio
```

when broad media access is genuinely necessary on Android 13+.

### Legacy compatibility

For apps supporting Android 12/API 32 and below that actually need legacy shared-media reading, use an API-bounded declaration:

```xml
<uses-permission
    android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
```

Then use runtime OS-version mapping in presentation/platform infrastructure.

Do not request obsolete storage permission on modern Android merely because an old tutorial does.

### Adding files

Android documentation states that apps on Android 10+ can add files to shared storage without legacy broad storage permission in many common cases.

Do not request read permission merely to save an exported image.

### Broad filesystem management

`Permission.manageExternalStorage` corresponds to Android's special `MANAGE_EXTERNAL_STORAGE` access.

This is not a normal photo-picker replacement.

It is high-risk/sensitive, and Google Play restricts acceptable use cases. The package README explicitly calls this out.

Use only for legitimate file-manager/backup-style requirements that satisfy policy.

---

## Android Photos / Partial Access

Android 14 adds Selected Photos Access.

Possible results include:

```text
full access
→ PermissionStatus.granted

selected subset
→ PermissionStatus.limited

no access
→ denied/permanentlyDenied as applicable
```

Current Android package implementation checks the visual-user-selected permission and can map partial visual-media access to `limited`.

Do not implement:

```dart
if (!status.isGranted) {
  showError();
}
```

for a feature capable of working with selected assets.

Use:

```dart
bool canReadAnySelectedMedia(PermissionStatus status) {
  return status.isGranted || status.isLimited;
}
```

`permission_handler` does not itself provide a full media-reselection/gallery-management UI. Use Android's media picker/platform APIs for that UX.

---

## Android Notifications

Android 13/API 33 introduced runtime:

```text
POST_NOTIFICATIONS
```

for ordinary non-exempt notifications.

Manifest:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Request only after users understand the value:

```dart
Future<PermissionStatus> requestNotifications() {
  return Permission.notification.request();
}
```

On pre-Android-13 systems there is no equivalent runtime `POST_NOTIFICATIONS` dialog. The plugin checks platform notification enablement instead.

Do not blindly trust older package README wording that “notification shows no dialog” across all Android versions; Android 13+ explicitly has a runtime notification prompt. Platform documentation and the current Android implementation take precedence for modern behavior.

Good request moments:

- after user enables reminders;
- after user follows an alertable item;
- after user opts into message notifications.

Poor request moment:

- splash screen before explaining what notifications are for.

---

## Android Bluetooth

### Android 12/API 31+

Use feature-specific permissions:

```dart
Permission.bluetoothScan
Permission.bluetoothConnect
Permission.bluetoothAdvertise
```

as appropriate.

Android requires:

```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
```

only for needed operations.

These are runtime Nearby Devices permissions on Android 12+.

### Do not automatically request location on modern Bluetooth

If scan results are **not** used to derive physical location, Android allows:

```xml
<uses-permission
    android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
```

and legacy location can be bounded:

```xml
<uses-permission
    android:name="android.permission.ACCESS_FINE_LOCATION"
    android:maxSdkVersion="30" />
```

Android warns `neverForLocation` can filter certain BLE beacons, so use it only when the assertion is truthful.

### Older Android

On Android 11 and lower, Bluetooth scanning traditionally required location because scan results could reveal location.

Use OS-version-aware policy.

### Bluetooth adapter versus permission

```text
Nearby-device permission granted
≠
Bluetooth radio enabled
```

Check the actual Bluetooth service/adapter through the Bluetooth feature library.

`Permission.bluetooth` itself is a `PermissionWithService`, but do not confuse it with the modern Android 12 scan/connect/advertise runtime groups.

---

## Android Location

### Prefer `locationWhenInUse`

For new foreground-only features, make intent explicit:

```dart
Permission.locationWhenInUse
```

rather than requesting Always.

### Approximate versus precise

Android 12+ allows users to grant approximate location even when the application requests precise access. Android recommends requesting only coarse access when that satisfies the feature.

`permission_handler` does not expose separate high-level `PermissionStatus` enum values named “approximate” and “precise.”

Therefore:

```text
PermissionStatus.granted
```

does not, by itself, tell business code what actual accuracy a feature can obtain.

Use the feature-specific location library/native API to inspect or tolerate actual accuracy.

### Service state

```dart
final permission =
    await Permission.locationWhenInUse.status;

final service =
    await Permission.locationWhenInUse.serviceStatus;
```

Possible:

```text
permission = granted
service = disabled
```

In that case, another permission request is the wrong response.

Explain that location services are disabled.

---

## Android Background Location

Treat background location as exceptional.

Use only if background access is essential to a user-facing feature such as genuinely continuous location sharing or geofencing.

Android explicitly recommends evaluating whether background access is necessary and removing it when it is not.

### Required sequence

Do:

```text
foreground location
↓
granted
↓
background-location explanation at feature step
↓
locationAlways
```

Do not request foreground and background together.

Android 11+ ignores combined foreground/background requests for modern-target apps.

Example:

```dart
Future<PermissionStatus> requestBackgroundLocation() async {
  final foreground =
      await Permission.locationWhenInUse.request();

  if (!foreground.isGranted) {
    return foreground;
  }

  return Permission.locationAlways.request();
}
```

### Android 10

Android 10 can expose an “Allow all the time” option directly in the location dialog.

### Android 11+

Users grant background access through a system settings page rather than an ordinary foreground permission dialog.

Do not promise identical UI across Android versions.

---

## Android Permanently Denied Behavior

The Android implementation does more than simply call the system rationale API.

Its source documents the denial state machine and stores whether a permission was denied previously so it can distinguish:

```text
not requested
denied once
denied repeatedly / no further prompt
```



Important implementation nuance:

Determining denied versus permanently denied requires an attached Android `Activity`. Current native source resolves to ordinary denied if no Activity is available.

Therefore perform interactive requests from foreground application flows, not headless/background execution.

---

## Android One-Time and Auto-Reset Permissions

Android 11 added one-time permission behavior for:

- location;
- microphone;
- camera.

Android can also automatically reset sensitive permissions for unused apps.

This is another reason not to cache:

```text
camera permission = true forever
```

Re-check before meaningful protected capability use.

---

## Android Nearby Wi-Fi

Current stable package exposes:

```dart
Permission.nearbyWifiDevices
```

for modern Android nearby Wi-Fi behavior.

Do not automatically substitute location permission on Android 13+ where the platform provides a dedicated nearby Wi-Fi runtime permission.

Verify the feature's exact Android API and target-SDK requirements before declaring either.

---

## Android Special App Access

These are not ordinary dangerous-runtime permission dialogs:

```dart
Permission.manageExternalStorage
Permission.systemAlertWindow
Permission.requestInstallPackages
Permission.accessNotificationPolicy
Permission.scheduleExactAlarm
Permission.ignoreBatteryOptimizations
```

The package documentation notes that several of these open corresponding settings intents.

Treat them as special access:

```text
explain
↓
user explicitly chooses to continue
↓
request/open special settings
↓
app resumes
↓
re-check
```

### Exact alarms

Exact alarms are a particularly policy-sensitive example.

Android 14 no longer pre-grants `SCHEDULE_EXACT_ALARM` to many fresh installs targeting Android 13+. Android recommends exact alarms only for genuinely precise user-facing timing requirements.

Do not request it for ordinary background scheduling where WorkManager/inexact alarms suffice.

---

