---
name: flutter-permission-handler-engineering
description: Design, implement, review, debug, test, migrate, and secure Flutter runtime-permission flows using `permission_handler`. Use this skill whenever a Flutter task involves camera, microphone, location, background location, photos/media, contacts, calendars, Bluetooth/Nearby Devices, notifications, tracking, sensors, Android special access, permission statuses, rationale/settings recovery, Android/iOS permission configuration, permission-related upgrades, or privacy-preserving alternatives—even when the user only asks why a permission prompt fails or whether an app should request a permission.
compatibility: The bundled research baseline targets stable `permission_handler` 12.0.3. Inspect the repository's actual Flutter/Dart SDK, locked package/platform-package versions, Android compile/target SDK, manifest, iOS dependency manager, Info.plist, entitlements, and current target platforms before applying version-sensitive behavior. Do not copy unreleased APIs from repository main into an older installed release.
---
# Flutter Permission Handler Engineering
## Mission
Treat runtime permission handling as privacy-sensitive product behavior, not as a mechanical plugin call.
Prioritize: user privacy → correct platform behavior → least privilege → feature correctness → user trust → graceful degradation → maintainability → testability → performance → developer convenience.
Central invariant:
> Request the least access necessary for one understandable user action, interpret the exact platform state, and keep unrelated application functionality useful when the user says no.
## Operating Rules
1. Start from the user capability, not from `Permission.*`.
2. Ask whether runtime permission is required at all.
3. Prefer picker, intent, manual input, approximate scope, foreground scope, or add-only access when it removes broader permission.
4. Never request permissions “just in case” or batch unrelated sensitive permissions at startup.
5. Never request/check permission from `build()` and never poll permission state.
6. Treat the OS as authorization source of truth; do not persist `granted = true` as authority.
7. Handle `denied`, `permanentlyDenied`, `restricted`, `limited`, and `provisional` deliberately.
8. Treat `limited` as partial access, `restricted` as device/account policy, and `provisional` as notification-specific.
9. Do not loop permission requests after denial.
10. Never open system settings automatically; offer it through explicit user action and re-check after resume.
11. Distinguish permission from service state, hardware availability, and feature initialization.
12. Initialize camera, recorder, scanner, Bluetooth scan, location stream, or similar resources only after authorization.
13. Serialize competing permission prompts in complex applications.
14. Keep `Permission`, `PermissionStatus`, and `BuildContext` out of domain entities/services.
15. Keep Android/iOS static declarations minimal and aligned with product behavior.
16. Re-test when target SDK, OS baseline, package version, or Apple privacy configuration changes.
17. Never describe permission routing as backend authorization or a security boundary.
## Reference Routing
- `references/01-foundations-status-and-requests.md` — package setup, responsibility boundaries, statuses, rationale, timing, multiple requests, and coordination.
- `references/02-android-permissions.md` — Android API levels, manifest, media/storage, notifications, Bluetooth, location/background location, Nearby Wi-Fi, and special app access.
- `references/03-apple-web-desktop-and-capabilities.md` — iOS configuration, CocoaPods/SPM, limited Photos/Contacts, location accuracy, notifications, ATT, calendar, Web/Windows differences, service/capability checks, settings return, and feature flows.
- `references/04-architecture-testing-debugging-and-migration.md` — service boundaries, Bloc/Cubit/DI, revocation, errors, performance, observability, testing, debugging, and migration.
- `references/05-antipatterns-workflows-and-checklists.md` — full anti-pattern catalog, implementation/review workflows, platform/privacy checklists, and production readiness.
When behavior is uncertain, prefer the installed release and matching platform implementation over old tutorials or repository `main`.
## Repository Inspection
Before editing permission behavior, inspect:
```text
pubspec.yaml + lockfile
Flutter/Dart versions
permission_handler + platform package versions
Android compileSdk / targetSdk / minSdk
AndroidManifest.xml permissions and maxSdkVersion bounds
iOS dependency manager: CocoaPods or SPM
Info.plist usage descriptions
Podfile macros or SPM permission configuration
Apple entitlements
all Permission.* / .status / .request / .isGranted usages
openAppSettings() and lifecycle-resume flows
service-status checks
feature-specific hardware initialization
permission tests
```
Search for high-risk patterns: `.request()` in `main`/splash/`build`/`initState`, `Permission.storage`, `locationAlways`, broad Contacts/Photos access, special app access, automatic `openAppSettings()`, concurrent request Futures, persisted grant booleans, or raw `PermissionStatus` in domain models.
Do not refactor until each permission maps to a real feature.
## Decision Workflow
### 1. Name the user capability
Write the behavior first: “User scans a QR code”, “records voice”, “selects one photo”, “enables reminders”. Do not begin with “the app needs camera/location”.
### 2. Challenge the permission requirement
Ask whether the feature can use no permission, a system picker, manual input, an external intent, approximate location, foreground-only access, or add-only access. Prefer the narrower design when it satisfies the product.
### 3. Identify platform/version scope
Document only relevant combinations such as Android ≤32/33/34+, target-SDK behavior, iOS <17/17+/18+, Web, and Windows. Do not invent one universal prompt model.
### 4. Configure static declarations
Add only the manifest/privacy declarations required by the feature. On iOS, identify CocoaPods vs SPM before changing permission configuration.
### 5. Request at understandable user intent
Good:
```text
Tap Scan QR → optional rationale → request camera → initialize camera
```
Bad:
```text
First frame → camera + contacts + location + notifications
```
### 6. Check current status
```dart
final status = await Permission.camera.status;
```
Do not re-request states that cannot or need not produce a useful prompt: granted, useful limited access, restricted, or permanently denied. Handle provisional according to notification policy.
### 7. Decide rationale
On Android, `shouldShowRequestRationale` is one signal, not a state machine. Never infer permanent denial from it alone. Explain what the feature does, why access is needed, and what remains usable if declined. Do not imitate the OS sheet or pressure the user.
### 8. Request only the immediate permission set
Group only permissions required for the same action. Video with audio may justify camera + microphone; still photography does not. Sequence mandatory and optional capabilities separately.
### 9. Map exact result into application state
Preserve at least: granted, limited, provisional, denied, permanently denied, restricted. Do not reduce immediately to Boolean.
### 10. Check service and capability
After authorization, verify what the feature still needs:
```text
location permission → Location Services → actual location result
Bluetooth permission → adapter enabled → scan/connect capability
camera permission → camera exists → controller initializes
notification permission → token/backend/channel configuration
```
Do not show permission recovery UI for a hardware/service/configuration failure.
### 11. Degrade gracefully
Disable only the dependent capability unless the product truly cannot function without it. Examples: Contacts denied → manual entry; notifications denied → app remains usable; Photos limited → use accessible subset.
### 12. Recover through Settings deliberately
```text
explain limitation → user taps Open Settings → app resumes → re-check relevant permission → update feature state
```
Never auto-open Settings or create a settings loop.
## PermissionStatus Policy
| Status | Default response |
|---|---|
| `granted` | Continue, then check service/hardware/resource capability |
| `limited` | Continue if partial access satisfies the feature; otherwise explain why broader access is needed |
| `provisional` | Notification-specific noninterruptive authorization |
| `denied` | Respect; request again only after renewed user intent and while requestable |
| `permanentlyDenied` | Explain and offer explicit Settings action |
| `restricted` | Explain device/account policy; do not loop request/settings |
Remember that `denied` may also represent not-yet-requested state depending on platform/history.
## Privacy-Preserving Alternatives Gate
Before broad access, evaluate:
| Need | Prefer |
|---|---|
| One/few photos | System photo picker |
| One document | System document picker |
| One phone/email/contact value | Manual input or system selection |
| Dial or compose SMS | `tel:` / `sms:` intent |
| App-private files | App-specific storage |
| Save shared media on modern Android | Platform media API without broad read where supported |
| Approximate nearby experience | Coarse/approximate location |
| Foreground-only location | `locationWhenInUse` |
| Add calendar event only on modern iOS | `calendarWriteOnly` |
Broad access requires an explicit product reason.
## Android Gate
Before Android changes, read `references/02-android-permissions.md` and reason from:
```text
OS API level + targetSdkVersion + manifest + user history + installed package version
```
Key rules:
- Stable 12.0.x documentation requires compile SDK 35; verify the repository before changing build config.
- Compile SDK and target SDK are different decisions.
- `Permission.storage` is not a modern Android 13+ media solution.
- Prefer Photo Picker when broad media-library access is unnecessary.
- Android 13+ notifications use `POST_NOTIFICATIONS`.
- Android 12+ Bluetooth uses scan/connect/advertise according to operation; do not add location unless truly required.
- Handle Android 14 selected media as `limited` where supported by the installed implementation.
- Request foreground location before background location; Android 11+ background access may be settings-mediated.
- Treat all-files access, overlay, exact alarms, install packages, and battery-optimization exemption as special app access, not ordinary dangerous permissions.
- Re-test affected flows after target-SDK upgrades.
Do not copy unreleased Android 17/local-network APIs into stable 12.x projects.
## Apple Gate
Before iOS changes, read `references/03-apple-web-desktop-and-capabilities.md` and reason from:
```text
permission API + Info.plist + CocoaPods macro OR SPM config + entitlement + OS authorization state
```
Key rules:
- Missing privacy declarations can terminate the app when protected APIs are accessed.
- Enable only permission strategies actually used.
- Do not mix CocoaPods and SPM configuration instructions.
- Use `calendarWriteOnly` vs `calendarFullAccess` deliberately on iOS 17+; do not introduce deprecated `Permission.calendar`.
- Treat Photos/Contacts `limited` as usable partial authorization when the feature supports it.
- Generic location permission does not encode reduced vs full accuracy.
- Notification authorization does not prove APNs/FCM/token/backend delivery.
- ATT is not generic analytics consent.
- Siri/critical-alert entitlements are separate from usage-description text.
## Web / Windows Gate
Do not assume mobile semantics. Web support is narrower, browser secure-context/origin/user-gesture rules matter, and `openAppSettings()` is not a mobile-style recovery path. On Windows, generic plugin permission checks do not represent the same runtime-privacy model as Android/iOS; use feature-specific Windows capability/privacy APIs when actual authorization matters. Verify installed support before asserting macOS behavior.
## Architecture
For nontrivial applications, prefer:
```text
UI
↓
Bloc / Cubit / Riverpod / coordinator
↓
AppPermissionService
↓
permission_handler
↓
OS
```
The permission abstraction should map plugin states into application states, centralize platform/version policy where useful, remain free of `BuildContext`, and return state rather than showing dialogs/navigation. Presentation owns rationale UI, settings CTA, navigation, and degradation. Use an application-scoped request coordinator if multiple features can trigger OS prompts concurrently.
Do not build a large permission framework for a trivial one-permission app unless it adds real policy/testability value.
## Revocation and Lifecycle
Assume permission can change outside the app through Settings, one-time permission expiry, Android auto-reset, device policy, or limited Photos/Contacts selection changes. Re-check only at meaningful boundaries: immediately before protected capability use when stale authorization matters, after relevant Settings return, or when re-entering an active feature whose permission may have changed. Do not poll.
If launching Settings, track that a relevant settings journey is active and re-check on `AppLifecycleState.resumed`.
## Performance Rules
Permission checks are rarely the primary bottleneck. Optimize correctness first: no status Future recreated on every build, no periodic polling, no duplicate simultaneous prompts, and no heavy camera/recorder/scanner/location initialization before authorization.
## Security and Privacy Rules
Permission grant is consent to one OS capability, not backend authorization. Minimize requested scope and data collected after grant; avoid protected resource contents in logs/analytics; preserve user choice; make optional denial survivable. Reject coercive rationale, repeated prompts, fake system dialogs, or blocking unrelated functionality merely to raise consent rate.
## Testing Gate
Read `references/04-architecture-testing-debugging-and-migration.md` for full coverage.
Unit-test application policy with fakes for granted, denied, permanently denied, restricted, limited when relevant, and provisional when relevant.
Widget-test rationale/recovery UI, one request per explicit interaction, settings CTA, partial-access UX, and restricted UX.
Real platform tests should cover clean install, first prompt, grant, deny, repeated/permanent denial, settings recovery, external revocation, permission granted + service disabled, lifecycle resume, relevant Android API boundaries, and relevant Apple partial/restricted/accuracy states.
Do not use a device with unknown long-lived permission history as the only clean-user test.
## Debugging Workflow
When a request does nothing or always returns denied, inspect in this order:
1. installed package version;
2. target platform support;
3. OS/API support for the permission;
4. Android manifest declaration;
5. Android target-SDK behavior;
6. iOS Info.plist key;
7. CocoaPods macro or SPM configuration;
8. required entitlement;
9. exact current status;
10. foreground Activity/app availability;
11. whether it is special app access rather than a normal prompt;
12. whether the actual failure is service/hardware/configuration rather than authorization.
Typical diagnoses: Android 13+ `Permission.storage` denial is expected; iOS prompt failure may be prior permanent denial or missing static config; location can be granted while Location Services is disabled; settings recovery may fail because the user changed nothing or the platform does not support opening app settings.
Never broaden permission scope merely to make a prompt appear.
## Migration Workflow
Treat package, OS, and target-SDK changes as behavioral migrations. Before upgrading: record package/platform-package versions; read changelog and platform changes; verify Flutter/Dart minimums and Android compile SDK; review target-SDK behavior, manifest, Info.plist, CocoaPods/SPM config, entitlements, deprecated/new constants, and status semantics; then run clean-install, denied, settings-return, Android API-boundary, and Apple partial-state tests.
Do not upgrade and only fix compile errors until green.
## Anti-Patterns
Reject without explicit justification:
- request-all-at-startup flows;
- permission work from `build()`;
- unconditional requests from every screen `initState`;
- request loops after denial;
- treating denied/permanent or limited/denied identically;
- automatic Settings navigation or reopen loops;
- blocking whole app for optional capability;
- background location before foreground;
- microphone for still photography;
- full Contacts access for one value;
- legacy Android storage for modern media;
- unconditional location for Bluetooth;
- missing Android 13 notification permission;
- missing Apple usage descriptions or copied obsolete Podfile macros;
- permission checks every rebuild or continuous polling;
- persisted grant booleans as authority;
- resource initialization before authorization;
- `PermissionStatus` in domain entities or `BuildContext` in permission services;
- concurrent unrelated request Futures;
- conflating permission with service/hardware/push delivery;
- fake system prompts or coercive gates.
See `references/05-antipatterns-workflows-and-checklists.md` for the full supplied catalog and corrected patterns.
## Reporting Format
When implementing/reviewing permissions, report:
```text
Feature capability
Permission actually required?
Privacy-preserving alternative considered
Target platforms / OS-version boundaries
Static platform declarations
Status/request state machine
Rationale and timing
Limited/restricted/permanent behavior
Settings recovery
Service/hardware checks
Architecture owner
Concurrency coordination
Tests performed / required
Version-sensitive assumptions
Remaining risks
```
Do not report “permission handled” when only `.request()` was added.
## Production Gate
Do not approve release until relevant checks pass:
- every permission maps to a real feature and minimum privilege is used;
- picker/intent/manual alternatives were evaluated;
- no unnecessary startup requests exist;
- Android manifest is minimal/version-aware, compile SDK requirement is satisfied, and target-SDK behavior is reviewed;
- modern Android media/notification/Bluetooth/location behavior is correct and background location is justified/sequenced;
- Apple usage descriptions are truthful/complete, CocoaPods/SPM config matches the project, and required entitlements exist;
- deprecated permission APIs are removed where applicable;
- all relevant statuses are handled distinctly and partial access works where possible;
- service/hardware state is checked separately;
- Settings is user-triggered and rechecked on return;
- simultaneous prompts are coordinated;
- no permission work occurs in rebuild hot paths;
- sensitive resources initialize only after authorization;
- clean-install, denial-state, and relevant OS/API-boundary tests pass;
- current installed package behavior has been verified.
If any answer is unknown, treat the permission implementation as incomplete.
