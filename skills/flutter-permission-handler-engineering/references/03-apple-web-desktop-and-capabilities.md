# Reference: iOS configuration, limited access, Web/Windows behavior, permission vs service/capability, privacy-preserving alternatives, feature-specific flows, settings return.

## Contents
- iOS
- iOS Mental Model
- iOS Info.plist
- iOS Permission Macros — CocoaPods
- iOS Swift Package Manager
- iOS Photos / Limited Access
- iOS Contacts / Limited Access
- iOS Location
- iOS Notifications
- iOS Tracking
- iOS Calendar
- iOS Assistant/Siri
- macOS / Desktop / Web
- macOS
- Web
- Windows
- Permission vs Service Status
- Permission vs Capability
- Privacy-Preserving Alternatives
- Camera
- Microphone
- Photos / Media
- Location
- Background Location
- Bluetooth
- Notifications
- Contacts
- Calendar and Reminders
- SMS / Phone
- Sensors / Specialized Permissions
- Open App Settings
- App Lifecycle / Return from Settings

---

# iOS

## iOS Mental Model

Successful permission handling requires both:

```text
compiled permission strategy
+
required Info.plist privacy declaration
+
OS authorization state
```

A Dart request alone is insufficient.

The package README warns that checking/requesting a permission without corresponding required iOS privacy configuration can terminate the app.

---

## iOS Info.plist

Add only keys for features the application actually uses.

Current package documentation maps:

| Permission | Usage-description key |
| --- | --- |
| Camera | `NSCameraUsageDescription` |
| Microphone | `NSMicrophoneUsageDescription` |
| Contacts | `NSContactsUsageDescription` |
| Speech | `NSSpeechRecognitionUsageDescription` |
| Photos | `NSPhotoLibraryUsageDescription` |
| Photos add-only | `NSPhotoLibraryAddUsageDescription` |
| Location when in use | `NSLocationWhenInUseUsageDescription` |
| Location always | `NSLocationAlwaysAndWhenInUseUsageDescription` |
| Calendar pre-iOS 17 | `NSCalendarsUsageDescription` |
| Calendar write-only iOS 17+ | `NSCalendarsWriteOnlyAccessUsageDescription` |
| Calendar full access iOS 17+ | `NSCalendarsFullAccessUsageDescription` |
| Reminders | `NSRemindersUsageDescription` |
| Media library | `NSAppleMusicUsageDescription` |
| Motion/sensors | `NSMotionUsageDescription` |
| Bluetooth | `NSBluetoothAlwaysUsageDescription` |
| Tracking | `NSUserTrackingUsageDescription` |
| Siri/assistant | `NSSiriUsageDescription` |



Usage descriptions must explain the actual feature, not generic wording such as:

```text
"We need this permission."
```

Apple confirms camera and microphone usage-description keys are required when their APIs are accessed.

---

## iOS Permission Macros — CocoaPods

With CocoaPods, enable only needed permission strategies.

Selective example:

```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)

    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',

        'PERMISSION_CAMERA=1',
        'PERMISSION_MICROPHONE=1',
        'PERMISSION_CONTACTS=1',
        'PERMISSION_PHOTOS=1',

        # Use these only if needed:
        'PERMISSION_LOCATION_WHENINUSE=1',

        # Keep unused strategies disabled.
        'PERMISSION_LOCATION=0',
        'PERMISSION_NOTIFICATIONS=0',
        'PERMISSION_APP_TRACKING_TRANSPARENCY=0',
      ]
    end
  end
end
```

Official current macro names include:

| Feature | Macro |
| --- | --- |
| Calendar / write-only | `PERMISSION_EVENTS` |
| Calendar full access | `PERMISSION_EVENTS_FULL_ACCESS` |
| Reminders | `PERMISSION_REMINDERS` |
| Contacts | `PERMISSION_CONTACTS` |
| Camera | `PERMISSION_CAMERA` |
| Microphone | `PERMISSION_MICROPHONE` |
| Speech | `PERMISSION_SPEECH_RECOGNIZER` |
| Photos | `PERMISSION_PHOTOS` |
| Photos add-only | `PERMISSION_PHOTOS_ADD_ONLY` |
| Location full strategy | `PERMISSION_LOCATION` |
| When-in-use only | `PERMISSION_LOCATION_WHENINUSE` |
| Notifications | `PERMISSION_NOTIFICATIONS` |
| Media library | `PERMISSION_MEDIA_LIBRARY` |
| Sensors | `PERMISSION_SENSORS` |
| Bluetooth | `PERMISSION_BLUETOOTH` |
| Tracking | `PERMISSION_APP_TRACKING_TRANSPARENCY` |
| Critical alerts | `PERMISSION_CRITICAL_ALERTS` |
| Assistant/Siri | `PERMISSION_ASSISTANT` |



Do not copy a five-year-old Podfile macro block from a tutorial.

---

## iOS Swift Package Manager

With current SPM setup, relevant permission strategies are inferred from `Info.plist`.

There is no ordinary Info.plist usage-description key for notification authorization, so the package enables notifications by default under SPM.

To opt out for SPM builds:

```sh
export PERMISSION_NOTIFICATIONS=0
```

Critical alerts are disabled by default because they require Apple's entitlement.

To enable after receiving the entitlement:

```sh
export PERMISSION_CRITICAL_ALERTS=1
```

After changing SPM permission environment variables or relevant Info.plist keys, the official README recommends clearing Xcode DerivedData so `Package.swift` is reevaluated.

Do not mix CocoaPods macro instructions into an SPM project without understanding which dependency system is active.

---

## iOS Photos / Limited Access

iOS 14 introduced limited photo-library access.

Possible states:

```text
authorized
limited
denied
restricted
not determined
```

Apple explicitly describes limited access as a user-selected subset of photos/resources.

Correct:

```dart
bool canBrowseAccessiblePhotos(PermissionStatus status) {
  return status.isGranted || status.isLimited;
}
```

Incorrect:

```dart
bool canBrowseAccessiblePhotos(PermissionStatus status) {
  return status.isGranted;
}
```

when the feature can work with the selected subset.

### Prefer PhotosPicker for selection

Apple explicitly states that `PhotosPicker`/`PHPickerViewController` allows access to user-selected items without requiring photo-library authorization.

Therefore:

```text
"Choose profile picture"
→ system photo picker
```

is preferable to:

```text
"Choose profile picture"
→ request entire photo library
```

### Managing limited-library selection

`permission_handler` reports authorization status; it is not a complete limited-photo selection-management UI.

If the app needs to let users add/change selected library resources, integrate the appropriate PhotosUI/PhotoKit mechanism or a Flutter plugin that exposes it.

---

## iOS Contacts / Limited Access

Modern iOS includes limited Contacts authorization: the app can access a user-selected subset of contacts. Apple documents `CNAuthorizationStatus.limited`.

Current `permission_handler` 12.x documentation describes `limited` support for Contacts on iOS 18+.

Do not automatically tell users “Contacts permission denied” when the package returns `.limited`.

If the workflow can use the selected contacts:

```text
limited
→ continue with accessible contacts
```

Request full access only if the feature genuinely requires it.

---

## iOS Location

Prefer:

```dart
Permission.locationWhenInUse
```

for foreground functionality.

Use:

```dart
Permission.locationAlways
```

only for genuine background use.

Required static keys follow the requested scope:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>...</string>
```

and, if Always is truly needed:

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>...</string>
```

### Reduced versus full accuracy

Apple exposes a separate `CLAccuracyAuthorization`:

```text
fullAccuracy
reducedAccuracy
```



`PermissionStatus` does not model those as separate values.

Therefore:

```text
Permission.locationWhenInUse == granted
```

does **not** guarantee full/precise accuracy.

If the feature requires precise location, inspect accuracy through a location-specific plugin/native API.

Apple's temporary full-accuracy request also requires a purpose key in:

```text
NSLocationTemporaryUsageDescriptionDictionary
```

and is outside the generic `permission_handler` status model.

---

## iOS Notifications

`Permission.notification` handles authorization status and ordinary notification authorization.

Possible relevant statuses include:

- denied/permanently denied mapping;
- granted;
- provisional.

Apple defines provisional authorization as permission for noninterruptive notifications.

### Do not equate authorization with push configuration

Notification permission does not prove:

- APNs entitlement exists;
- device token registration succeeded;
- Firebase/APNs backend is configured;
- notification channels/categories are correct;
- remote delivery will succeed.

The current Apple permission-handler request implementation registers the app for remote notifications after ordinary authorization succeeds, but complete push infrastructure remains the application's responsibility.

---

## iOS Tracking

Use:

```dart
Permission.appTrackingTransparency
```

only when the product actually performs tracking that requires ATT authorization.

Required:

```xml
<key>NSUserTrackingUsageDescription</key>
<string>...</string>
```

Apple requires that description when calling ATT APIs.

Request before tracking begins, but do not assume startup is the best moment.

Explain the feature/value context.

ATT is not a generic analytics-consent API; verify the application's data practices and Apple's current policy.

---

## iOS Calendar

`Permission.calendar` is deprecated.

For iOS 17+ use:

```dart
Permission.calendarWriteOnly
```

when creating events without broad read access, or:

```dart
Permission.calendarFullAccess
```

only when full access is actually required.

The package introduced these separate permissions in 11.1.0 and deprecated `Permission.calendar`.

Apply least privilege:

```text
app only inserts event
→ calendarWriteOnly
```

not:

```text
app only inserts event
→ calendarFullAccess
```

---

## iOS Assistant/Siri

`Permission.assistant` maps to SiriKit-related permission on supported Apple platforms and requires:

```xml
<key>NSSiriUsageDescription</key>
<string>...</string>
```

The package README additionally warns that the Siri entitlement:

```text
com.apple.developer.siri
```

must be configured.

A usage-description key alone does not create an entitlement.

---

# macOS / Desktop / Web

## macOS

Current stable top-level `permission_handler 12.0.3` advertises:

- Android;
- iOS;
- web;
- Windows.

It does **not** list macOS as a supported top-level platform on pub.dev.

Although the Apple implementation/history contains macOS-related code and particular permission notes, do not assume complete top-level macOS support.

For macOS production work:

1. verify the exact current package release;
2. verify whether macOS is endorsed by that release;
3. otherwise use a macOS-specific permission/capability integration.

---

## Web

Web support is officially endorsed but narrow.

Current first-party web implementation supports requests/checks for:

```dart
Permission.camera
Permission.microphone
Permission.notification
Permission.location
```

Other permission checks/requests are unsupported/unimplemented in the current web delegate.

### Web behavior

The current implementation:

- requests camera via `getUserMedia`;
- requests microphone via `getUserMedia`;
- immediately stops the created media track after triggering permission;
- requests notifications through browser Notification API;
- requests location through browser geolocation;
- maps browser `prompt` to `denied`;
- maps browser `denied` to `permanentlyDenied`;
- returns `false` from `openAppSettings`;
- returns `false` for rationale.

Do not design a mobile-style:

```text
permanently denied
→ openAppSettings
```

flow on web.

Browser permission behavior also depends on browser security requirements, origins, secure context, and user gestures. Use browser-specific capability handling where necessary.

---

## Windows

Windows is an endorsed implementation.

However, the current first-party Windows native implementation returns:

- `granted` for generic permission checks;
- `granted` for generic permission requests;
- `false` for `openAppSettings`;
- service information for selected service-oriented capabilities such as location/Bluetooth.

Therefore do **not** treat:

```dart
await Permission.camera.status
```

on Windows as equivalent to Android/iOS runtime privacy authorization.

Use feature-specific Windows capability/privacy APIs when the application depends on actual Windows resource availability.

---

# Permission vs Service Status

Use this model:

| Question | API layer |
| --- | --- |
| Is this app authorized? | `PermissionStatus` |
| Is the associated system service enabled? | `ServiceStatus`, where supported |
| Does device hardware exist? | Feature-specific API |
| Is hardware currently usable? | Feature-specific API |
| Is resource/data available? | Feature-specific API |

Current `ServiceStatus` values:

```dart
ServiceStatus.disabled
ServiceStatus.enabled
ServiceStatus.notApplicable
```



Example:

```dart
Future<bool> canAttemptLocation() async {
  final permission =
      await Permission.locationWhenInUse.status;

  if (!permission.isGranted) {
    return false;
  }

  final service =
      await Permission.locationWhenInUse.serviceStatus;

  return service.isEnabled;
}
```

This still does not guarantee a location fix.

---

# Permission vs Capability

### Camera

```text
Permission.camera = granted
```

does not prove:

- camera exists;
- desired lens exists;
- initialization succeeds;
- camera isn't reserved by another process.

Use `camera` plugin/device APIs after authorization.

### Microphone

Granted does not prove recorder initialization succeeds.

### Bluetooth

Permission granted does not mean:

```text
Bluetooth adapter is on
```

### Location

Permission granted does not mean:

```text
Location Services is on
GPS fix is available
accuracy is precise
```

### Notifications

Granted does not mean:

```text
push token exists
backend knows token
APNs/FCM delivery works
channel is enabled
```

---

# Privacy-Preserving Alternatives

Always ask before broad access:

### Photos

Need a few selected files?

Prefer system photo picker.

Android and Apple both explicitly provide privacy-preserving picker APIs that avoid broad photo-library permission.

### Contacts

Need one telephone number?

Prefer:

- manual entry;
- a system contact selection API if available through the app's integration;

before reading the complete address book.

### Location

Need a delivery city?

Ask for city/postcode manually.

Need approximate nearby suggestions?

Prefer coarse/approximate location.

### Bluetooth pairing

For appropriate Android companion-device use cases, consider Companion Device Manager, which can perform system-assisted pairing without the older broad location permission model.

---

# Camera

Recommended flow:

```text
user selects camera feature
↓
check camera status
↓
if denied/requestable → request
↓
if granted → initialize camera
↓
if permanent → offer settings
↓
if restricted → explain device restriction
↓
failure to initialize → hardware/camera error, not permission denial
```

Do not initialize the camera before permission.

Do not request microphone with camera for still-photo-only features.

---

# Microphone

Request only for:

- voice recording;
- audio capture;
- video recording where audio is needed;
- speech APIs that actually need microphone input.

Do not request microphone for:

- mute video capture;
- playback;
- camera stills.

On Android, package docs note `Permission.speech` maps to microphone access; on iOS speech-recognition authorization is distinct from microphone authorization. The product may therefore need both microphone and speech authorization for speech-to-text on iOS.

---

# Photos / Media

Decision:

```text
Need user to choose media
→ picker, no broad library permission

Need app to maintain its own gallery/browser
→ permission may be justified
→ handle limited access

Need to save only
→ prefer add-only / permissionless platform path
```

On iOS, use:

```dart
Permission.photosAddOnly
```

for add-only access where appropriate rather than full Photos access.

On Android 13+ use category-specific media permissions only when broad read access is actually needed.

---

# Location

Classify requirements before code:

```text
approximate vs precise
+
foreground vs background
+
one-shot vs continuous
```

Do not let a single boolean called:

```dart
needsLocation
```

hide these product distinctions.

Preferred baseline:

```dart
Permission.locationWhenInUse
```

Background access is a separate feature decision.

---

# Background Location

Before implementation, document:

- why foreground access is insufficient;
- user-visible feature requiring background data;
- retention/data minimization;
- Android Play policy implications;
- iOS background-mode requirements;
- battery implications.

Then request foreground first.

Never request Always permission “for future use.”

---

# Bluetooth

Classify actual operation:

```text
scan?
connect?
advertise?
derive physical location?
```

Then request only corresponding modern Android permission(s).

Do not write:

```dart
await Permission.location.request();
await Permission.bluetoothScan.request();
```

for every Bluetooth feature regardless of API version.

---

# Notifications

Treat notifications as optional unless the entire product genuinely depends on them.

Contextual timing:

```text
user enables daily reminder
→ notification permission
```

rather than:

```text
app first frame
→ notification permission
```

After denial:

- feature can remain configured;
- explain that alerts cannot currently be delivered;
- permit enabling from Settings later.

---

# Contacts

Full Contacts access is sensitive.

Request it only when the application genuinely needs to browse/read contacts.

Do not request it merely to prefill one field.

On iOS 18, limited Contacts access is valid partial success.

---

# Calendar and Reminders

Request only at the calendar/reminder feature boundary.

Prefer:

```dart
Permission.calendarWriteOnly
```

when write-only calendar capability is enough on iOS 17+.

Use full access only when reading existing events is actually necessary.

---

# SMS / Phone

`Permission.sms` and `Permission.phone` are Android-oriented sensitive permissions.

Do not request them simply to:

- open a telephone dialer;
- open an SMS composer.

Use URI intents when that satisfies the user action.

Request telephony/SMS access only for capabilities requiring protected phone/SMS APIs and verify current Google Play policy restrictions.

---

# Sensors / Specialized Permissions

Current API includes specialized groups such as:

```dart
Permission.sensors
Permission.sensorsAlways
Permission.activityRecognition
Permission.accessMediaLocation
Permission.appTrackingTransparency
Permission.backgroundRefresh
Permission.criticalAlerts
Permission.assistant
Permission.nearbyWifiDevices
Permission.scheduleExactAlarm
```

Do not assume every constant behaves as a normal prompt on every platform.

Before use verify:

1. supported platform;
2. OS version;
3. manifest/entitlement requirement;
4. whether `.request()` causes a prompt, settings navigation, or only status inspection;
5. policy implications.

`Permission.backgroundRefresh`, for example, is fundamentally a background-refresh status/capability concept on Apple platforms, not an ordinary generic permission dialog.

---

# Open App Settings

Use:

```dart
Future<bool> openPermissionSettings() async {
  return openAppSettings();
}
```

only after explicit user choice.

Correct UX:

```text
Feature cannot continue because permission is permanently denied.
[Cancel] [Open Settings]
```

Incorrect:

```dart
if (status.isPermanentlyDenied) {
  await openAppSettings();
}
```

as automatic side effect.

Do not automatically reopen settings when the user returns without changing anything.

---

# App Lifecycle / Return from Settings

`openAppSettings()` does not emit a package-level “permission changed” stream.

Re-check after application resume when a settings journey is active.

Complete example:

```dart
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

class CameraPermissionGate extends StatefulWidget {
  const CameraPermissionGate({super.key});

  @override
  State<CameraPermissionGate> createState() =>
      _CameraPermissionGateState();
}

class _CameraPermissionGateState
    extends State<CameraPermissionGate>
    with WidgetsBindingObserver {
  PermissionStatus? _status;
  bool _awaitingSettingsReturn = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        _awaitingSettingsReturn) {
      _awaitingSettingsReturn = false;
      _refresh();
    }
  }

  Future<void> _refresh() async {
    final status = await Permission.camera.status;

    if (!mounted) {
      return;
    }

    setState(() {
      _status = status;
    });
  }

  Future<void> _request() async {
    final result = await Permission.camera.request();

    if (!mounted) {
      return;
    }

    setState(() {
      _status = result;
    });
  }

  Future<void> _openSettings() async {
    final opened = await openAppSettings();

    if (opened) {
      _awaitingSettingsReturn = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _status;

    if (status == null) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (status.isGranted) {
      return const Center(
        child: Text('Camera access is available.'),
      );
    }

    if (status.isPermanentlyDenied) {
      return Center(
        child: FilledButton(
          onPressed: _openSettings,
          child: const Text('Open Settings'),
        ),
      );
    }

    if (status.isRestricted) {
      return const Center(
        child: Text(
          'Camera access is restricted by this device.',
        ),
      );
    }

    return Center(
      child: FilledButton(
        onPressed: _request,
        child: const Text('Allow Camera'),
      ),
    );
  }
}
```

Re-check only the permission relevant to the active settings flow.

---

