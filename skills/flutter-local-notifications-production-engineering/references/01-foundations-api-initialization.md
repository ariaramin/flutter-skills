# Source reference: Foundations, version contract, repository inspection, plugin architecture, API surface, initialization, platform capability matrix, Android build baseline

## Table of contents

- [skill.md — Production-grade `flutter_local_notifications`engineering](#skillmd-production-grade-flutterlocalnotificationsengineering)
  - [Purpose](#purpose)
- [1. Research baseline and version contract](#1-research-baseline-and-version-contract)
- [2. AI coding-agent operating rules](#2-ai-coding-agent-operating-rules)
- [3. Repository reconnaissance](#3-repository-reconnaissance)
- [4. Plugin architecture](#4-plugin-architecture)
- [5. When to use local notifications](#5-when-to-use-local-notifications)
- [6. Local notification vs push vs background execution](#6-local-notification-vs-push-vs-background-execution)
- [7. Current API surface](#7-current-api-surface)
- [8. Initialization](#8-initialization)
- [9. Platform capability matrix](#9-platform-capability-matrix)
- [10. Android build requirements](#10-android-build-requirements)
# skill.md — Production-grade `flutter_local_notifications`engineering

## Purpose

Use this skill when integrating, reviewing, debugging, migrating, or optimizing `flutter_local_notifications` in a Flutter repository.

The central rule is:

> Treat `flutter_local_notifications` as a platform-notification integration boundary, not as a business scheduler or background-execution engine. Persist business intent separately, use the least-powerful scheduling mechanism that satisfies the product requirement, design stable notification identities and Android channels, handle permissions and lifecycle explicitly, model wall-clock schedules with real time zones, and optimize for reliability, battery efficiency, privacy, and maintainability across every supported platform.

A notification appearing on one development device is not evidence that a notification subsystem is production-ready.

---

# 1. Research baseline and version contract

Research baseline: **August 9, 2026**.

At this baseline, pub.dev lists:

- `flutter_local_notifications` **22.3.0**
- minimum Flutter SDK: **3.38.1**
- package platforms: **Android, iOS, macOS, Linux, Windows, Web**
- the 21.x line raised the minimum Dart SDK to **3.10.0**
- Android minimum API became **24**
- iOS minimum became **13**
- macOS minimum became **10.15**
- the 21.x changelog raised Android `compileSdk` to **36**
- current Android examples use Java 17 and core-library desugaring
- 20.x converted the major public methods such as `initialize`, `show`, `cancel`, `zonedSchedule`, and periodic APIs to **named parameters**
- 22.0 introduced Web support
- 22.2 introduced opt-in dismissal callbacks and documents that macOS callbacks remain on the main isolate
- 22.3 introduced `openAppNotificationSettings()` for supported native platforms.

**Repository code wins over this document.** Before modifying an application, inspect `pubspec.lock` and the README/API/changelog belonging to the installed release. Do not copy syntax from the latest README into an application pinned to an older major version.

There is currently a documentation inconsistency worth knowing: the README prose says `compileSdk` 35 minimum while its example uses 36, and the 21.0.0 changelog explicitly records the move to `compileSdk` 36. For a 22.x repository, use the requirements of the installed release/tag and project build configuration rather than blindly copying one sentence from the live README.

---

# 2. AI coding-agent operating rules

When working on notification code:

1. Inspect the repository before modifying anything.
2. Verify the installed plugin version and Flutter/Dart/platform targets.
3. Determine whether the trigger is local, remote, or actual background work.
4. Do not use local notifications to execute critical business logic.
5. Initialize the plugin once.
6. Request only permissions required by enabled product features.
7. Treat Android notification channel IDs as long-lived product contracts.
8. Never assume changing channel properties in Dart changes a channel already created on a user's Android device.
9. Prefer inexact Android alarms unless product requirements genuinely require precise timing.
10. Do not request exact-alarm access merely because it makes implementation convenient.
11. Model wall-clock schedules with named time zones.
12. Never implement “every day at 08:00” as repeated `Duration(hours: 24)` arithmetic.
13. Use deterministic notification IDs.
14. Persist durable reminder intent in application storage.
15. Cancel deleted or disabled reminders and reschedule edited reminders.
16. Keep payloads small, versioned, and non-secret.
17. Validate notification payloads before routing.
18. Re-check current authentication and authorization after notification activation.
19. Keep background callbacks small and independent of UI state.
20. Never access a UI `BuildContext` from a notification background isolate.
21. Use `@pragma('vm:entry-point')` for native-invoked background Dart entry points where required.
22. Do not mark ordinary notifications high/max/critical priority.
23. Do not create a channel per entity.
24. Do not poll pending notifications from widget builds.
25. Test lifecycle, scheduling, permission, timezone, DST, reboot, and release-build behavior on real devices.

---

# 3. Repository reconnaissance

Before implementation, inspect:

- `pubspec.yaml`
- `pubspec.lock`
- Flutter and Dart SDK constraints
- `android/app/src/main/AndroidManifest.xml`
- Android Gradle/Kotlin build files
- Android `minSdk`, `compileSdk`, `targetSdk`
- iOS deployment target
- iOS `AppDelegate` and, where applicable, `UIScene` lifecycle configuration
- macOS deployment target and notification setup
- Windows packaging/MSIX configuration
- Linux desktop integration
- Web service-worker/application setup
- routing
- authentication
- persistence/database code
- background-task packages
- push-notification packages such as Firebase Messaging
- timezone packages
- dependency injection
- state management
- notification tests and CI.

Search the repository for:

```
FlutterLocalNotificationsPlugin
initialize(
show(
zonedSchedule(
periodicallyShow(
periodicallyShowWithDuration(
pendingNotificationRequests(
getActiveNotifications(
getNotificationAppLaunchDetails(
cancel(
cancelAll(
AndroidNotificationChannel
AndroidScheduleMode
SCHEDULE_EXACT_ALARM
USE_EXACT_ALARM
POST_NOTIFICATIONS
ScheduledNotificationReceiver
ScheduledNotificationBootReceiver
ActionBroadcastReceiver
@pragma('vm:entry-point')
timezone
TZDateTime
NotificationResponse

```

Audit specifically for duplicate initialization, deprecated APIs, random IDs, dynamic channel IDs, naïve `DateTime`recurrence, unguarded payload parsing, repeated permission prompts, stale schedules, unnecessary exact alarms, and application-wide notification abstractions that duplicate infrastructure already present.

---

# 4. Plugin architecture

The repository is federated. The app-facing `flutter_local_notifications` package sits above a common platform interface and federated Linux, Windows, and Web implementations. Android plus Darwin implementation code remains within the main package. The repository currently contains `flutter_local_notifications`, `flutter_local_notifications_platform_interface`, `flutter_local_notifications_linux`, `flutter_local_notifications_windows`, and `flutter_local_notifications_web`.

The native integrations are approximately:

| PlatformNative notification layer |                                                                |
| --------------------------------- | -------------------------------------------------------------- |
| Android                           | AndroidX `NotificationCompat`, channels and Android alarm APIs |
| iOS                               | User Notifications framework                                   |
| macOS                             | User Notifications framework                                   |
| Windows                           | C++/WinRT Toast/App Notification infrastructure                |
| Linux                             | Freedesktop Desktop Notifications over desktop services/DBus   |
| Web                               | Browser Notifications API                                      |

The package documents these platform integrations directly.

Dart should own:

- product-level notification intent
- ID selection
- payload encoding/parsing
- timezone and recurrence calculations
- policy decisions such as exact versus inexact
- route handoff
- reconciliation logic.

Native/platform frameworks own:

- actual presentation
- notification-center behavior
- Android channels
- platform scheduling
- user permission state
- operating-system throttling
- Doze/Focus/DND behavior
- lock-screen presentation
- platform-specific persistence and lifecycle.

The plugin does **not** turn Flutter into a continuously running process and does not convert a notification trigger into a durable business-job execution engine.

---

# 5. When to use local notifications

Use a local notification when the trigger is derivable from local device/application state, for example:

- a user-created reminder
- a timer completion
- a locally known appointment
- a download completion generated by work already occurring locally
- a scheduled habit reminder.

Prefer push notification infrastructure when the triggering event originates remotely:

- incoming messages
- account activity
- backend job completion
- fraud/security alerts generated server-side
- order status changes
- remote collaboration events.

Use a background-task API when you need execution rather than user-visible notification delivery.

Examples include Android WorkManager, an appropriate foreground service, Apple background-task APIs, or server-side jobs.

A local notification must never be the mechanism that enforces an expiry, charges money, revokes access, submits data, or performs another critical business transition.

---

# 6. Local notification vs push vs background execution

| MechanismTrigger sourceWorks offlineTimingExecutes business logic?User-visible by definition?Typical use |                        |                             |                                               |                                                     |                                       |                                           |
| -------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------- | --------------------------------------------- | --------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| Local notification                                                                                       | Device-known state     | Yes                         | OS-dependent; exact only in constrained cases | **No**                                              | Yes                                   | Reminder, timer                           |
| Push notification                                                                                        | Remote server/provider | No delivery without network | Network/OS-dependent                          | Server may already have executed logic              | Usually                               | Message, server event                     |
| Background task                                                                                          | Local/system scheduler | Often                       | Best-effort unless special platform mechanism | Yes                                                 | No                                    | Sync, maintenance                         |
| Android foreground service                                                                               | Local running work     | Yes                         | Ongoing execution while allowed               | Yes                                                 | Requires visible service notification | Active navigation, transfer, ongoing work |
| Alarm                                                                                                    | Device scheduler       | Yes                         | Exact or inexact according to API/policy      | Wakes component; not a substitute for backend state | Not necessarily                       | Alarm-clock semantics                     |

---

# 7. Current API surface

For modern 22.x code, use the named-parameter APIs. The cross-platform class currently exposes operations including:

- `initialize(...)`
- `show(...)`
- `zonedSchedule(...)`
- `periodicallyShow(...)`
- `periodicallyShowWithDuration(...)`
- `cancel(...)`
- `cancelAll()`
- `cancelAllPendingNotifications()`
- `pendingNotificationRequests()`
- `getActiveNotifications()`
- `getNotificationAppLaunchDetails()`
- `resolvePlatformSpecificImplementation<T>()`
- `openAppNotificationSettings()` on the supported platform implementations.

Current Android-specific APIs include channel management, permission checks/requests, exact-alarm access, notification-enabled checks, full-screen intent access, and DND policy access.

The following older patterns must not be introduced into modern code:

```
schedule(...)
showDailyAtTime(...)
showWeeklyAtDayAndTime(...)
Time(...)
androidAllowWhileIdle: ...
onDidReceiveLocalNotification
old positional show/initialize/zonedSchedule signatures

```

The deprecated scheduling APIs were progressively replaced by `zonedSchedule`, while 18.x removed older deprecated scheduling parameters and callbacks; 20.x moved major APIs to named parameters.

---

# 8. Initialization

Initialize once at a lifecycle point where notification integration is required.

Initialization may occur before `runApp()` or later in application startup. The package explicitly permits initialization in `main`or on the first relevant application page. If initialization occurs before `runApp()` and invokes plugins, call `WidgetsFlutterBinding.ensureInitialized()`. Await initialization when subsequent logic depends on launch details, scheduling, categories, or notification callbacks being ready.

Do not initialize the entire application graph merely because notification initialization runs early.

For iOS/macOS, avoid automatically triggering the permission prompt during initialization unless that is intentionally the product UX. Set permission flags to false and request them contextually.

For Web, permission prompting must originate from a user interaction; it must not be attempted automatically at startup.

---

# 9. Platform capability matrix

“Partial” means the package or underlying OS exposes only part of the capability or behavior varies materially by environment.

| CapabilityAndroidiOSmacOSWindowsLinuxWeb |                  |                                         |                                         |                                                           |                                       |                                                                  |
| ---------------------------------------- | ---------------- | --------------------------------------- | --------------------------------------- | --------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Basic notification                       | Supported        | Supported                               | Supported                               | Supported                                                 | Supported                             | Supported                                                        |
| One-time schedule                        | Supported        | Supported                               | Supported                               | Supported                                                 | **Unsupported**                       | **Unsupported**                                                  |
| Periodic/repeating schedule              | Supported        | Supported                               | Supported                               | **Unsupported**                                           | **Unsupported**                       | **Unsupported**                                                  |
| Actions                                  | Supported        | Supported                               | Supported                               | Supported                                                 | Partial/server-dependent              | Partial/browser-dependent                                        |
| Dart background action isolate           | Supported        | Supported                               | **No; main isolate behavior**           | Platform-specific; do not assume Darwin/Android semantics | **No terminated background callback** | Service-worker/browser lifecycle, not Android-style Dart isolate |
| Custom sound                             | Supported        | Supported                               | Supported                               | Supported                                                 | Partial/server-dependent              | Unsupported as portable plugin behavior                          |
| Rich images/attachments                  | Supported        | Supported                               | Supported                               | Supported                                                 | Partial/server-dependent              | Partial/browser-dependent                                        |
| Grouping/threading                       | Supported        | Supported via Darwin threading          | Supported via Darwin threading          | Platform-specific Windows header/group constructs         | No portable guarantee                 | No portable grouping contract                                    |
| Progress                                 | Supported        | No generic plugin progress notification | No generic plugin progress notification | Supported                                                 | Unsupported as portable feature       | Unsupported as portable feature                                  |
| Active-notification query                | Supported        | Supported                               | Supported                               | Partial; package identity matters                         | Not a portable documented capability  | Not a portable documented capability                             |
| Runtime permission API                   | Android 13+      | Supported                               | Supported                               | Platform/system settings                                  | Platform/system-specific              | Supported; user gesture mandatory                                |
| Exact-alarm special access               | Android-specific | N/A                                     | N/A                                     | N/A                                                       | N/A                                   | N/A                                                              |
| Reboot rescheduling                      | Receiver-based   | OS-managed scheduling                   | OS-managed scheduling                   | OS-managed scheduling                                     | No scheduling                         | No scheduling                                                    |

Linux explicitly lacks scheduled/pending-notification support. Windows explicitly lacks repeating notifications and has package-identity restrictions for cancellation/active-notification retrieval. Web supports immediate notifications but browsers do not support this plugin's scheduled/repeating notifications.

---

# 10. Android build requirements

For current 22.x integration, inspect the installed release but expect:

- Android minimum API **24**
- Java **17**
- core-library desugaring
- current package documentation uses `desugar_jdk_libs` 2.1.4
- plugin AGP baseline documented as 8.11.1
- 21.0.0 changelog moved the plugin to `compileSdk` **36**.

The plugin requires desugaring even when the application does not use scheduled notifications.

Do not copy historical ProGuard/GSON rules from old tutorials. Recent plugin releases removed the old GSON-specific requirement.

For notification icons and custom sounds used by release builds, verify resource shrinking does not eliminate dynamically referenced resources.

---

