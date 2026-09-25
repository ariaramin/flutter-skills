# Reference: Complete anti-pattern catalog, implementation/review workflows, platform/privacy checklists, and production readiness guidance.

## Contents
- Common Anti-Patterns
- 1. Requesting every permission at startup
- 2. Requesting from `build()`
- 3. Automatically requesting from every `initState`
- 4. Immediately re-requesting after denial
- 5. Treating denied and permanently denied identically
- 6. Treating limited as denied
- 7. Automatically opening settings
- 8. Reopening settings repeatedly
- 9. Blocking entire app for optional permission
- 10. Background location before foreground
- 11. Requesting microphone for still photos
- 12. Full Contacts access for one address
- 13. Legacy storage on Android 13+
- 14. Always requesting location for Bluetooth
- 15. Forgetting Android 13 notification permission
- 16. Missing iOS usage description
- 17. Copying obsolete Podfile macros
- 18. Checking permission on every build
- 19. Polling continuously
- 20. Caching granted forever
- 21. Starting resources before authorization
- 22. Raw `PermissionStatus` throughout domain models
- 23. `BuildContext` in permission service
- 24. Concurrent requests from multiple features
- 25. Permission granted means service enabled
- 26. Permission granted means hardware exists
- 27. Notification permission means push works
- 28. Ignoring external revocation
- 29. Coercive optional permission gate
- 30. Fake system prompt
- New Permission Implementation Workflow
- 1. Identify the exact feature capability
- 2. Determine whether runtime permission is required
- 3. Check for privacy-preserving alternatives
- 4. Identify platforms
- 5. Determine API/version mapping
- 6. Add minimum static platform declarations
- 7. Configure Apple compile-time strategy
- 8. Choose request timing
- 9. Decide rationale strategy
- 10. Check current status
- 11. Request if appropriate
- 12. Interpret exact result
- 13. Handle partial/special states
- 14. Check service
- 15. Check hardware/resource capability
- 16. Gracefully degrade
- 17. Offer settings only when appropriate
- 18. Re-check on return
- 19. Add tests
- 20. Verify privacy
- 21. Verify installed package API
- Existing-Code Review Workflow
- Refactoring Rules
- Code Review Checklist
- Android Checklist
- iOS Checklist
- Privacy Checklist
- Location Checklist
- Media / Photos Checklist
- Notifications Checklist
- Testing Checklist
- Production Readiness Checklist
- Quick Reference
- Final Decision Rules

---

# Common Anti-Patterns

## 1. Requesting every permission at startup

**Bad**

```dart
Future<void> requestEverything() async {
  await <Permission>[
    Permission.camera,
    Permission.microphone,
    Permission.contacts,
    Permission.location,
    Permission.photos,
    Permission.notification,
  ].request();
}
```

**Why it is problematic**

Requests unrelated sensitive access before users understand the value.

**Better**

Request each capability when its feature is invoked.

---

## 2. Requesting from `build()`

**Bad**

```dart
@override
Widget build(BuildContext context) {
  Permission.camera.request();

  return const CameraPage();
}
```

**Why it is problematic**

Build can run many times.

**Better**

Trigger from an explicit user action or controlled lifecycle transition.

---

## 3. Automatically requesting from every `initState`

**Bad**

```dart
@override
void initState() {
  super.initState();
  Permission.contacts.request();
}
```

**Why it is problematic**

Screen construction does not always equal informed user intent.

**Better**

Request when the user invokes the Contacts-dependent action unless entering the screen itself clearly represents that intent.

---

## 4. Immediately re-requesting after denial

**Bad**

```dart
Future<void> forceCamera() async {
  while (!await Permission.camera.isGranted) {
    await Permission.camera.request();
  }
}
```

**Why it is problematic**

Creates coercive loops and stops working when the OS suppresses prompts.

**Better**

Respect denial and wait for renewed user intent.

---

## 5. Treating denied and permanently denied identically

**Bad**

```dart
if (!status.isGranted) {
  await Permission.camera.request();
}
```

**Why it is problematic**

Permanent denial will not produce the normal prompt.

**Better**

Switch on exact status and offer settings only for the settings-recoverable case.

---

## 6. Treating limited as denied

**Bad**

```dart
if (!status.isGranted) {
  showPhotoPermissionError();
}
```

**Why it is problematic**

Selected media/contact access may already be usable.

**Better**

Accept `limited` where feature requirements allow.

---

## 7. Automatically opening settings

**Bad**

```dart
if (status.isPermanentlyDenied) {
  await openAppSettings();
}
```

**Why it is problematic**

Unexpectedly ejects the user from the app.

**Better**

Explain and provide an explicit Settings button.

---

## 8. Reopening settings repeatedly

**Bad**

```text
resume
→ still denied
→ automatically open settings again
```

**Why it is problematic**

Traps the user.

**Better**

Recheck and display recovery UI.

---

## 9. Blocking entire app for optional permission

**Bad**

```dart
if (!await Permission.notification.isGranted) {
  return const AppBlockedScreen();
}
```

**Why it is problematic**

Notifications are often optional.

**Better**

Disable only notification-dependent behavior.

---

## 10. Background location before foreground

**Bad**

```dart
Future<void> requestLocation() async {
  await Permission.locationAlways.request();
}
```

**Why it is problematic**

Modern Android requires foreground authorization first.

**Better**

Request `locationWhenInUse`, then Always only after successful foreground access and feature justification.

---

## 11. Requesting microphone for still photos

**Bad**

```dart
await <Permission>[
  Permission.camera,
  Permission.microphone,
].request();
```

for a still camera.

**Why it is problematic**

Violates least privilege.

**Better**

Request only `Permission.camera`.

---

## 12. Full Contacts access for one address

**Bad**

```dart
await Permission.contacts.request();
```

just to let a user type a recipient.

**Why it is problematic**

Broad access is disproportionate.

**Better**

Provide manual entry/system selection.

---

## 13. Legacy storage on Android 13+

**Bad**

```dart
final status = await Permission.storage.request();
```

for modern image reading.

**Why it is problematic**

Legacy storage is deprecated/disabled there.

**Better**

Use Photo Picker or `Permission.photos` where broad access is justified.

---

## 14. Always requesting location for Bluetooth

**Bad**

```dart
await Permission.location.request();
await Permission.bluetoothScan.request();
```

on every Android version.

**Why it is problematic**

Android 12+ has dedicated Nearby Devices runtime permissions.

**Better**

Use version-appropriate scan/connect/advertise permissions and location only when genuinely required.

---

## 15. Forgetting Android 13 notification permission

**Bad**

Declare no `POST_NOTIFICATIONS` but expect runtime notification authorization on Android 13+.

**Better**

Add:

```xml
<uses-permission
    android:name="android.permission.POST_NOTIFICATIONS" />
```

and request contextually.

---

## 16. Missing iOS usage description

**Bad**

Request camera with no:

```text
NSCameraUsageDescription
```

**Why it is problematic**

Apple requires the key, and package docs warn missing configuration may terminate the app.

**Better**

Add the exact required key with truthful product-specific wording.

---

## 17. Copying obsolete Podfile macros

**Bad**

Copy a blog's full set of old macros.

**Why it is problematic**

Permission names and iOS access models evolve.

**Better**

Copy the macro mapping for the installed `permission_handler` version and enable only used strategies.

---

## 18. Checking permission on every build

**Bad**

```dart
FutureBuilder(
  future: Permission.camera.status,
  builder: ...,
)
```

created repeatedly inside a frequently rebuilding parent.

**Why it is problematic**

Creates unnecessary platform calls and unstable UX.

**Better**

Load at a meaningful boundary and store presentation state.

---

## 19. Polling continuously

**Bad**

```dart
Timer.periodic(
  const Duration(seconds: 1),
  (_) => Permission.location.status,
);
```

**Why it is problematic**

Permission state rarely requires polling.

**Better**

Check before use and after settings/lifecycle events.

---

## 20. Caching granted forever

**Bad**

```dart
prefs.setBool('cameraGranted', true);
```

then never consult OS state again.

**Why it is problematic**

Users/OS can revoke access.

**Better**

Treat OS status as source of truth.

---

## 21. Starting resources before authorization

**Bad**

```text
create camera controller
start Bluetooth scan
then request permission
```

**Why it is problematic**

Creates errors, wasted startup work, and privacy confusion.

**Better**

Authorize first, initialize second.

---

## 22. Raw `PermissionStatus` throughout domain models

**Bad**

```dart
class Order {
  final PermissionStatus cameraPermission;
}
```

**Why it is problematic**

Domain data now depends on a platform integration package.

**Better**

Keep permission state in presentation/application capability models.

---

## 23. `BuildContext` in permission service

**Bad**

```dart
class PermissionService {
  PermissionService(this.context);

  final BuildContext context;
}
```

**Why it is problematic**

Couples platform service to widget lifetime/navigation.

**Better**

Return states; let UI show rationale/settings dialogs.

---

## 24. Concurrent requests from multiple features

**Bad**

```dart
Future.wait([
  Permission.camera.request(),
  Permission.microphone.request(),
  Permission.notification.request(),
]);
```

for unrelated flows.

**Why it is problematic**

Creates competing system authorization UX.

**Better**

Serialize intentional prompts.

---

## 25. Permission granted means service enabled

**Bad**

```dart
if (await Permission.location.isGranted) {
  startLocation();
}
```

**Why it is problematic**

Location Services may be disabled.

**Better**

Check service/capability as well.

---

## 26. Permission granted means hardware exists

**Bad**

```dart
if (await Permission.camera.isGranted) {
  // Assume camera exists.
}
```

**Why it is problematic**

Authorization and hardware availability are different.

**Better**

Initialize/query hardware after permission.

---

## 27. Notification permission means push works

**Bad**

```text
Permission.notification == granted
→ mark PushConfigured=true
```

**Why it is problematic**

Token/backend/APNs/FCM configuration is independent.

**Better**

Model authorization and delivery registration separately.

---

## 28. Ignoring external revocation

**Bad**

Never recheck after Settings.

**Better**

Recheck when the user returns from a relevant settings journey.

---

## 29. Coercive optional permission gate

**Bad**

```text
"Grant contacts access to continue using the app."
```

when Contacts powers only suggestions.

**Better**

Allow manual entry and explain optional enhancement.

---

## 30. Fake system prompt

**Bad**

Build an app dialog visually imitating the OS permission sheet.

**Why it is problematic**

Misleads users about who is requesting consent.

**Better**

Use a clearly app-owned rationale screen.

---

# New Permission Implementation Workflow

Follow this sequence.

## 1. Identify the exact feature capability

Write:

```text
"User scans a QR code"
```

not:

```text
"App needs camera"
```

Start from the user action.

## 2. Determine whether runtime permission is required

Check platform API documentation.

Do not infer from old code.

## 3. Check for privacy-preserving alternatives

Ask:

- system picker?
- manual input?
- intent?
- approximate rather than precise?
- foreground rather than background?
- add-only rather than read/write?

## 4. Identify platforms

Document:

```text
Android
iOS
web
Windows
```

only where feature is supported.

## 5. Determine API/version mapping

Map:

```text
Android <=32
Android 33
Android 34+
iOS <17
iOS 17+
iOS 18+
```

when relevant.

## 6. Add minimum static platform declarations

Add only required:

- Android `uses-permission`;
- iOS Info.plist keys;
- entitlements.

## 7. Configure Apple compile-time strategy

Use SPM detection or CocoaPods macros according to the project.

## 8. Choose request timing

Tie it to user intent.

## 9. Decide rationale strategy

Use rationale only when it improves understanding.

## 10. Check current status

Do not request blindly.

## 11. Request if appropriate

Avoid request when:

- granted;
- restricted;
- permanently denied;
- useful limited access already exists.

## 12. Interpret exact result

Never reduce immediately to bool.

## 13. Handle partial/special states

Design:

```text
limited
restricted
provisional
permanent
```

explicitly.

## 14. Check service

For location/Bluetooth-like capabilities.

## 15. Check hardware/resource capability

Use the feature-specific plugin.

## 16. Gracefully degrade

Keep unrelated functionality available.

## 17. Offer settings only when appropriate

Never automatically navigate.

## 18. Re-check on return

Use lifecycle observation for an active settings flow.

## 19. Add tests

Include clean-install and denied-state tests.

## 20. Verify privacy

Confirm the requested scope still matches actual data use.

## 21. Verify installed package API

Before committing, inspect package version/changelog.

---

# Existing-Code Review Workflow

Before changing permission code, inspect:

### Package

- installed version;
- transitive platform-package versions;
- changelog.

### Permission inventory

For every `Permission.*`, write the feature that requires it.

Remove permissions without a real current feature.

### Android

Inspect:

- manifest;
- `compileSdk`;
- `targetSdk`;
- min SDK;
- legacy `maxSdkVersion`;
- special-access declarations;
- API-level branches.

### iOS

Inspect:

- Info.plist;
- CocoaPods versus SPM;
- macros;
- entitlements;
- Calendar iOS 17 access variants;
- location scope.

### Timing

Search for:

```dart
.request()
```

in:

- `main()`;
- splash screen;
- `build`;
- `initState`.

Verify each is justified.

### Status handling

Search for:

```dart
.isGranted
```

and determine whether limited/provisional/restricted/permanent states are being lost.

### Settings

Inspect:

- automatic settings navigation;
- resume handling;
- repeat loops.

### Service status

Check location/Bluetooth flows.

### State management

Ensure raw package types have not leaked into domain entities unnecessarily.

### Concurrency

Find simultaneous or duplicate requests.

### Tests

Require real OS-version testing around version-sensitive permissions.

---

# Refactoring Rules

Changing permission behavior is user-visible platform behavior.

Preserve:

- previously supported OS versions;
- rationale timing;
- denial fallback;
- restricted behavior;
- limited access;
- settings recovery;
- feature functionality;
- analytics meaning.

Prefer incremental refactors.

Do not combine:

```text
permission cleanup
+
target SDK upgrade
+
new permission model
+
state management rewrite
```

into one untestable change if it can be staged.

---

# Code Review Checklist

- [ ] Every permission maps to a real feature.
- [ ] Minimum scope is requested.
- [ ] System picker/intent alternative was considered.
- [ ] Request timing follows user intent.
- [ ] No permission calls from `build()`.
- [ ] No broad startup request batch.
- [ ] `denied` handled separately.
- [ ] `permanentlyDenied` handled separately.
- [ ] `restricted` handled separately.
- [ ] `limited` handled as partial access where relevant.
- [ ] `provisional` treated as notification-specific.
- [ ] Settings navigation is user-triggered.
- [ ] Relevant permission is rechecked after settings.
- [ ] Optional denial does not block unrelated features.
- [ ] Permission is distinct from service availability.
- [ ] Permission is distinct from hardware capability.
- [ ] Duplicate prompts are coordinated.
- [ ] Raw package types stay out of domain models.
- [ ] Android API-level behavior is verified.
- [ ] iOS static configuration is complete.
- [ ] Platform-specific tests exist.

---

# Android Checklist

- [ ] Stable package's required `compileSdk` is satisfied.
- [ ] `targetSdk` behavior is reviewed separately.
- [ ] Manifest contains only needed permissions.
- [ ] `Permission.storage` is not used as modern Android catch-all.
- [ ] Android 13 media uses correct `READ_MEDIA_*` permissions where necessary.
- [ ] Android 14 partial media is handled.
- [ ] Photo Picker was considered.
- [ ] Android 13 notifications declare/request `POST_NOTIFICATIONS`.
- [ ] Android 12 Bluetooth uses scan/connect/advertise as needed.
- [ ] Location is not blindly requested for Bluetooth.
- [ ] Foreground location precedes background location.
- [ ] Android 11+ background settings flow is tested.
- [ ] Approximate location is tolerated where possible.
- [ ] Special app access is not treated as ordinary runtime prompt.
- [ ] Clean install is tested.
- [ ] Repeated denial is tested.
- [ ] Target-SDK upgrade behavior is tested.

---

# iOS Checklist

- [ ] Every protected feature has correct usage-description key.
- [ ] Usage description is truthful and feature-specific.
- [ ] Active dependency manager is known: SPM or CocoaPods.
- [ ] CocoaPods macros are current if using Pods.
- [ ] SPM permission detection/env vars are understood if using SPM.
- [ ] Unused permission strategies are disabled.
- [ ] Siri/critical-alert entitlements are configured where required.
- [ ] `Permission.calendar` deprecated usage removed.
- [ ] Calendar write-only versus full access is intentional.
- [ ] Photos limited is supported.
- [ ] Contacts limited on iOS 18+ is supported where relevant.
- [ ] Reduced location accuracy is considered separately.
- [ ] Notification provisional state is understood.
- [ ] ATT request is correctly timed if used.
- [ ] Denied/settings recovery is tested.
- [ ] Restricted state is handled.

---

# Privacy Checklist

- [ ] Permission is actually necessary.
- [ ] No “just in case” request.
- [ ] Broad access avoided when picker works.
- [ ] Background access justified.
- [ ] Precise location justified.
- [ ] Full Contacts access justified.
- [ ] Full media access justified.
- [ ] Optional denial preserves core unrelated functionality.
- [ ] Rationale is not coercive.
- [ ] Data collected after permission is minimized.
- [ ] Sensitive data is not unnecessarily logged.
- [ ] Permission analytics do not contain resource contents.
- [ ] Revocation is honored.
- [ ] Static platform declarations match actual product behavior.

---

# Location Checklist

- [ ] Foreground/background requirement classified.
- [ ] Approximate/precise requirement classified.
- [ ] `locationWhenInUse` preferred when sufficient.
- [ ] Background request deferred until justified.
- [ ] Android foreground is granted before Always.
- [ ] Android 11+ settings-mediated background flow tested.
- [ ] iOS usage keys correct.
- [ ] iOS reduced accuracy handled outside generic PermissionStatus.
- [ ] Location service enabled state checked.
- [ ] Feature handles no GPS fix/hardware errors separately.
- [ ] Revocation/settings changes handled.

---

# Media / Photos Checklist

- [ ] System picker considered first.
- [ ] Full library access truly required.
- [ ] iOS add-only used when sufficient.
- [ ] iOS `limited` treated as partial success.
- [ ] Android 13 `READ_MEDIA_*` mapped correctly.
- [ ] Android 14 selected-photo access handled.
- [ ] Legacy storage bounded to old APIs only.
- [ ] Saving-only workflow does not request unnecessary read permission.
- [ ] App refreshes available media after selection/access changes.
- [ ] No assumption that selected resources remain forever.

---

# Notifications Checklist

- [ ] User understands notification value before prompt.
- [ ] Android 13+ `POST_NOTIFICATIONS` configured.
- [ ] Pre-Android-13 behavior tested separately.
- [ ] iOS notification authorization configured.
- [ ] Provisional status handled intentionally.
- [ ] Permission status is separate from push token state.
- [ ] Permission status is separate from backend registration.
- [ ] Denial does not unnecessarily block app.
- [ ] Settings recovery is user-triggered.
- [ ] Channels/categories/settings are validated separately.

---

# Testing Checklist

- [ ] Unit-test every application permission state.
- [ ] Widget-test rationale.
- [ ] Widget-test request happens once.
- [ ] Widget-test settings CTA.
- [ ] Widget-test restricted message.
- [ ] Widget-test limited mode.
- [ ] Integration-test clean install.
- [ ] Integration-test denial.
- [ ] Integration-test permanent denial.
- [ ] Integration-test settings return.
- [ ] Integration-test external revocation.
- [ ] Test service disabled with permission granted.
- [ ] Test Android API boundaries.
- [ ] Test iOS partial access.
- [ ] Test process/lifecycle transitions.
- [ ] Test target-SDK upgrade effects when Android target changes.

---

# Production Readiness Checklist

Do not release until:

- [ ] Every requested permission maps to a real feature.
- [ ] No unnecessary startup permission requests exist.
- [ ] Least privilege has been applied.
- [ ] Privacy-preserving alternatives were evaluated.
- [ ] Android manifest matches actual API-level behavior.
- [ ] Obsolete Android permissions are removed/bounded.
- [ ] Android compile SDK meets installed package requirement.
- [ ] Target-SDK behavior has been reviewed.
- [ ] Android notification handling is correct.
- [ ] Android Bluetooth handling is version-aware.
- [ ] Background location is correctly sequenced.
- [ ] iOS usage descriptions are complete.
- [ ] iOS macros/SPM configuration matches current package.
- [ ] Apple entitlements exist where needed.
- [ ] Deprecated Calendar API is removed.
- [ ] `denied` is handled.
- [ ] `permanentlyDenied` is handled.
- [ ] `restricted` is handled.
- [ ] `limited` is handled.
- [ ] `provisional` is handled if notifications use it.
- [ ] Relevant service status is checked.
- [ ] Hardware capability is checked separately.
- [ ] Settings flow requires explicit user action.
- [ ] Relevant status is rechecked on return.
- [ ] Duplicate simultaneous prompts are prevented.
- [ ] Permission calls are absent from rebuild hot paths.
- [ ] Sensitive resources initialize only after authorization.
- [ ] Clean-install platform tests pass.
- [ ] Version-boundary platform tests pass.
- [ ] Current package APIs/changelog have been reviewed.

---

# Quick Reference

| Situation | Preferred approach |
| --- | --- |
| Feature has no permission requirement | Do not request anything |
| User taps camera feature | Request camera contextually |
| Still photo only | Camera; no microphone |
| Video requires audio | Camera + microphone when both are needed |
| User denied once | Respect; explain/re-request only with renewed intent |
| Permanently denied | Offer app settings |
| Restricted | Explain device/policy restriction; do not loop |
| Limited Photos | Use available subset where feature permits |
| Limited Contacts | Use accessible subset where feature permits |
| Provisional notifications | Treat as noninterruptive notification authorization |
| Location granted, service off | Ask user to enable service; do not request permission again |
| Approximate location sufficient | Do not require precision |
| iOS permission granted | Does not imply full location accuracy |
| Background location needed | Foreground first, then justified background flow |
| Android 11+ background location | Expect settings-mediated grant |
| Android 12+ Bluetooth | Use scan/connect/advertise permissions as required |
| Bluetooth not used for location | Do not blindly request location; evaluate `neverForLocation` |
| Android 13+ notifications | Runtime `POST_NOTIFICATIONS` in context |
| Android 13 media | Use `Permission.photos` / `videos` / `audio` as needed |
| Android 14 partial photo access | Handle `limited` |
| Need one user-selected image | Prefer system photo picker |
| Need one user-selected document | Prefer document picker |
| Need one contact value | Prefer manual/system selection before full contacts |
| Save media only on modern Android | Avoid unnecessary broad read permission |
| iOS calendar write only | `Permission.calendarWriteOnly` |
| iOS full calendar read/write needed | `Permission.calendarFullAccess` |
| Old `Permission.calendar` | Migrate; deprecated |
| Permission checked for button visibility | Check at meaningful state boundary, not every build |
| User returns from settings | Re-check relevant permission |
| Multiple features need same permission | Coordinate/serialize request |
| Optional permission denied | Degrade affected feature only |
| Raw `PermissionStatus` in domain entity | Map to application capability state |
| Permission granted | Still check service/hardware/resource capability |
| Notification granted | Still configure token/backend/channels |
| Web needs camera/mic/location/notifications | Supported subset; follow browser rules |
| Web wants app settings | `openAppSettings()` is not supported |
| Windows generic permission status | Do not assume mobile-like authorization semantics |
| App upgrades target SDK | Re-test relevant Android permission flows |
| GitHub `main` exposes newer permission | Do not use until installed release supports it |

---

# Final Decision Rules

For every new permission request, require the AI coding agent to answer:

```text
1. What exact user feature needs this access?
2. Does the feature require runtime permission?
3. Can a system picker, intent, or manual path avoid it?
4. What is the narrowest permission scope?
5. Which platforms need it?
6. Which OS/API versions behave differently?
7. What Android manifest declaration is required?
8. What iOS usage description is required?
9. What Apple macro/SPM configuration is required?
10. When will the user understand why the request appears?
11. Can the feature work with limited access?
12. What does restricted mean for this flow?
13. When is settings recovery appropriate?
14. What service must also be enabled?
15. What hardware/capability check remains?
16. Can another feature request the same permission concurrently?
17. What happens after external revocation?
18. Which clean-install and denial tests cover the flow?
19. Is the package API verified for the installed version?
20. Does the final design preserve least privilege and user choice?
```

Prioritize engineering decisions in this order:

```text
User privacy
↓
Correct platform behavior
↓
Least privilege
↓
Feature correctness
↓
User trust
↓
Graceful degradation
↓
Maintainability
↓
Testability
↓
Performance
↓
Developer convenience
```

The central rule is:

> **Permission handling is not “ask until granted.” It is a capability-negotiation flow between the user, the operating system, and one specific application feature. Request the least access possible, at the right moment, interpret the exact platform state, and keep the rest of the application useful when the user says no.**
