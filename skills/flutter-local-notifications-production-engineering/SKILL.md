---
name: flutter-local-notifications-production-engineering
description: "Design, implement, review, debug, test, optimize, and migrate production Flutter notification systems with flutter_local_notifications. Use this skill whenever work involves notification permissions, Android channels, scheduled or exact alarms, timezone/DST recurrence, notification IDs or payloads, cold-start/tap routing, background actions, reboot recovery, reconciliation, cross-platform support, Web/Windows/Linux limitations, or deciding between local notifications, push, and background execution—even for a simple schedule-a-notification request."
compatibility: "Verify repository Flutter/Dart SDKs, installed flutter_local_notifications version, platform targets, and native build configuration before version-sensitive changes. Bundled source baseline is flutter_local_notifications 22.3.0 from August 2026."
---
# Flutter Local Notifications Production Engineering

Treat `flutter_local_notifications` as a **platform-notification integration boundary**, not a business scheduler, durable job engine, or proof that business logic executed.

Use this model:
```text
durable business notification intent
→ platform capability + permission policy
→ stable notification identity + payload
→ OS scheduling/presentation
→ lifecycle response
→ validated application intent
→ authoritative auth/data check
→ route/action
```

## Reference routing
| Need | Read |
|---|---|
| Version/API/initialization/package architecture/build baseline | `references/01-foundations-api-initialization.md` |
| Android channels/permissions/alarms/reboot/actions; iOS/macOS/Linux/Windows/Web | `references/02-platform-integrations.md` |
| Timezone/DST, IDs, payloads, routing, reconciliation, architecture, security/performance | `references/03-scheduling-routing-security.md` |
| Testing, devices, diagnostics, errors, bugs, anti-patterns | `references/04-testing-diagnostics-antipatterns.md` |
| Full code examples, native config, migration, push coexistence, release checklists | `references/05-code-migration-release.md` |

Consult the relevant reference before making version- or platform-sensitive changes.

## 1. Classify the requirement first
Answer before coding:
```text
Where does the event originate?
Notification or actual execution?
Immediate or scheduled?
One-time or recurring?
Wall-clock or elapsed recurrence?
Approximate or genuinely exact?
Must Android reboot recovery work?
Can activation occur from a terminated app?
What if permission is denied?
Is displayed content sensitive?
```
Choose:
```text
locally known reminder/timer/event → local notification
server-originated event → push notification
business/background execution → background task/service/server job
```
Never use notification delivery to enforce payment, expiry, revocation, synchronization, authorization, or another critical transition.

## 2. Inspect the repository
Inspect `pubspec.yaml`, `pubspec.lock`, SDK constraints, installed plugin version, Android manifest/build config, Apple lifecycle/deployment targets, Windows identity, Linux/Web integration, router/auth, persistence, background packages, push packages, timezone setup, DI/state management, and tests.
Search for:
```text
FlutterLocalNotificationsPlugin initialize( show( zonedSchedule(
periodicallyShow( pendingNotificationRequests( getNotificationAppLaunchDetails(
cancel( AndroidNotificationChannel AndroidScheduleMode
SCHEDULE_EXACT_ALARM USE_EXACT_ALARM POST_NOTIFICATIONS
ScheduledNotificationReceiver ScheduledNotificationBootReceiver
ActionBroadcastReceiver @pragma('vm:entry-point') TZDateTime NotificationResponse
```
Flag duplicate initialization, deprecated APIs, random IDs, dynamic channels, naive recurrence, payload trust, permission spam, stale schedules, and exact alarms used by default.

## 3. Version-gate syntax and native requirements
The supplied baseline is `flutter_local_notifications 22.3.0`. Modern 22.x code uses named-parameter APIs.
Do not introduce obsolete patterns:
```text
schedule(...)
showDailyAtTime(...)
showWeeklyAtDayAndTime(...)
Time(...)
androidAllowWhileIdle
onDidReceiveLocalNotification
old positional signatures
```
Do not force an older repository onto the source baseline merely to make snippets compile. Preserve newer compatible native toolchains rather than downgrading them to examples.

## 4. Initialize once
Initialize at one intentional application lifecycle boundary. If plugin work runs before `runApp()`, initialize Flutter bindings first. Await initialization when later logic depends on categories, callbacks, launch details, or scheduling.
Do not initialize per notification or bootstrap unrelated application services just because notification setup runs early.

## 5. Request permissions contextually
Preferred UX:
```text
user enables notification feature
→ explain value
→ request system permission
→ granted: enable delivery
→ denied: preserve coherent product state and expose delivery limitation
```
Do not prompt every startup. Permission denial is normal user state, not corruption.
On Web, prompt only from a direct user gesture. On Apple platforms, avoid automatic initialization-time prompts unless intentional.

## 6. Persist business intent separately from OS state
The reminder database, not the OS notification queue, is authoritative.
Persist application-level intent such as:
```text
logical reminder ID
enabled
schedule type
UTC instant or local calendar components
IANA timezone ID
recurrence
stable platform notification ID
payload entity reference
schedule schema/revision
last delivery capability/error
```
This enables recovery after permissions, timezone changes, upgrades, reboot, schedule drift, or platform resets.

## 7. Treat Android channel IDs as product contracts
Use stable semantic IDs:
```text
reminders.v1
messages.v1
downloads.v1
```
Do not create channels per entity.
Once created, changing importance/sound/vibration in Dart does not reliably rewrite an installed user's channel. If behavior must materially change, use deliberate channel versioning such as `reminders.v2`.
Do not delete/recreate channels to bypass user preferences.

## 8. Match importance to real urgency
Do not make ordinary reminders, marketing, or informational notifications high/max importance merely to force heads-up behavior. Use interruption levels users would reasonably expect. Remember users can override channel behavior.

## 9. Use the least-powerful Android scheduling mode
Default policy:
```text
inexact
→ inexactAllowWhileIdle only when idle delivery matters
→ exact only for genuine precise timing
→ exactAllowWhileIdle only for precise idle timing
→ alarmClock only for actual alarm-clock semantics
```
Do not request exact-alarm access for convenience. If approximate timing satisfies the feature, keep it approximate so Android can batch wakeups.
Before an exact mode, check current capability and provide an inexact fallback when semantics allow it.
Exact alarms are not guaranteed business execution.

## 10. Add only required Android manifest capabilities
Do not copy the example app manifest wholesale.
Add only feature-specific items actually used, such as scheduled receivers, boot receiver/`RECEIVE_BOOT_COMPLETED`, action receiver, justified exact-alarm permission, full-screen intent for legitimate alarm/call use, foreground-service declarations for real foreground work, or DND policy access when truly required.
Do not add both exact-alarm permission paths thoughtlessly.

## 11. Model reboot and force-stop honestly
Configure documented Android receivers if schedules must survive reboot/update. Do not promise normal delivery after user force-stop; reconcile durable reminder intent after explicit relaunch.
Uninstall/data clearing destroys local state. Reconstruct schedules from authoritative data where product architecture permits.

## 12. Keep actions stable and background callbacks small
Use stable machine IDs and localized labels:
```text
category: reminder.v1
action: reminder.open
action: reminder.snooze
```
Use `@pragma('vm:entry-point')` for native-invoked background Dart entry points where required.
Background callbacks should parse/validate, perform only small safe work, record diagnostics, and return.
Do not use `BuildContext`, navigation, Activity-bound plugins, broad app bootstrap, migrations, or long workflows from a background isolate.
If UI must open, foreground the app and hand off to normal lifecycle routing.

## 13. Preserve platform differences
Do not pretend every platform supports the same features.
Important supplied constraints:
```text
Linux  → no plugin scheduled/pending notifications
Windows→ one-time schedule supported; repeating plugin schedules unsupported
Web    → immediate notifications supported; scheduled/repeating unsupported
macOS  → do not assume Android/iOS background-isolate callback behavior
```
Reject unsupported operations before plugin invocation when possible. Do not fake Web/Linux scheduling with a long-lived Flutter timer/process.

## 14. Model time semantics explicitly
Classify each schedule:
```text
absolute event           → UTC instant
one local calendar event → local components + named timezone
daily at 08:00           → named zone + calendar recurrence
every 24 elapsed hours   → duration/interval
```
Never silently convert between them.
This is wrong for “daily at 08:00”:
```dart
previous.add(const Duration(hours: 24));
```
Across DST, elapsed and wall-clock time differ.

## 15. Use named time zones for wall-clock schedules
Initialize timezone data before zoned scheduling. Persist IANA zones such as `Europe/Tallinn`; do not rely on an ambiguous local `DateTime` when future rules matter.
The `timezone` package does not discover the device zone itself; use the repository's platform mechanism or a maintained dependency.
Test DST spring-forward gaps, fall-back folds, timezone changes, day/month/year boundaries, leap years, and edits near firing time. Define product policy for ambiguous/nonexistent local times.

## 16. Use calendar recurrence for calendar intent
Use zoned/calendar recurrence for daily local time, weekly weekday/time, monthly, or yearly schedules. Use interval APIs only for true elapsed-time recurrence.
Do not assume periodic APIs are portable to Windows, Linux, or Web.

## 17. Use deterministic notification IDs
IDs must allow later replacement/cancellation.
Prefer fixed reserved IDs for singleton notifications, persistent domain/UUID→32-bit mappings, stable IDs for recurring reminders, and distinct reserved namespaces for summaries.
Avoid timestamps, randomness, and runtime `hashCode` when identity must survive restarts/builds.
Persist generated mappings when the domain ID is not already a safe stable integer.

## 18. Keep payloads small, versioned, and untrusted
Payloads are routing references, not domain snapshots:
```json
{"v":1,"type":"reminder","id":"8f0e..."}
```
On activation:
1. parse defensively;
2. allowlist schema version/type;
3. validate identifier format;
4. re-read authoritative data;
5. verify entity existence;
6. verify current authentication;
7. verify current authorization;
8. route only after checks.
Never store tokens, passwords, API keys, sessions, authorization claims, or unnecessary PII in payloads.

## 19. Centralize response routing
Prefer:
```text
NotificationResponse
→ NotificationPayloadParser
→ NotificationIntent
→ NotificationRouteCoordinator
→ router
```
Support foreground/warm response, background→foreground response, cold-start launch, and deferred routing until router/auth readiness.
Use `getNotificationAppLaunchDetails()` for cold-start launch detection where applicable.
Do not navigate during pre-`runApp()` initialization or use global `BuildContext` hacks.

## 20. Reconcile from durable intent
Use event-driven reconciliation:
```text
create/enable → schedule
edit/move → cancel old + schedule desired
delete/disable → cancel
permission/exact access/timezone restored → reconcile affected reminders
schema/algorithm upgrade → deliberate migration/reconciliation
```
Do not reschedule unchanged reminders. Do not reconcile from widget builds.
For large future sets, schedule a bounded/rolling window when semantics allow; platform pending queues are not unlimited storage.

## 21. Cancel/update intentionally
Distinguish cancel-one, cancel-pending, and remove-all semantics. Do not use `cancelAll()` unless the product truly means remove every delivered and pending notification owned by this integration.
For portable pending replacement, prefer:
```text
stable logical ID
→ cancel old schedule
→ schedule desired state
```

## 22. Keep rich media/progress bounded
Rich notifications may involve network, disk, decode, attachments, and cleanup. The plugin is not a media downloader/cache.
Application code should own timeouts, bounded response size, caching, fallback, and temporary-file cleanup.
Do not synchronously fetch/decode large assets on a latency-critical path.
For progress, update one stable ID and throttle by meaningful time/percentage thresholds—not every byte/chunk.

## 23. Keep plugin types at the integration boundary
UI/state should model product concepts:
```text
reminderEnabled
schedule
notificationPermission
deliveryCapability
lastSchedulingFailure
```
Do not spread `AndroidNotificationDetails`, `DarwinNotificationDetails`, or plugin instances through presentation state.
A medium app may use:
```text
NotificationService          plugin/native integration
ReminderScheduler            business→platform schedule mapping
NotificationPayloadParser    routing envelope validation
NotificationRouteCoordinator lifecycle/router handoff
```
A tiny app may need one small service. Avoid forwarding-layer ceremony.

## 24. Optimize mechanisms that actually cost resources
Prioritize:
- exact alarms and idle wakeups
- huge future schedule sets
- repeated pending/active queries
- repeated full reconciliation
- repeated timezone setup
- background Flutter-engine startup
- media download/decode
- excessive progress updates
- oversized payloads
Do not micro-optimize tiny `NotificationDetails` construction while wasting battery with unnecessary exact alarms.
At startup, do only what lifecycle correctness requires.

## 25. Treat notification activation as a security entry point
Threat-model malformed/stale payloads, deleted resources, logout/account changes, authorization changes, deep-link abuse, stale actions, lock-screen disclosure, and sensitive logs.
Payload data is never authorization.
Re-check current application rules before exposing protected content or executing actions.
Review notification bodies for lock-screen privacy and prefer generic secure wording when content is sensitive.

## 26. Test application policy separately from OS behavior
Unit-test application-owned logic:
- next-occurrence calculation
- UTC/local conversion
- DST cases
- ID allocation
- payload parsing and malformed rejection
- schedule-mode policy
- reconciliation diff
- permission transitions
- action routing
Integration-test expected plugin calls and routing handoff.
Do not write tests that merely prove plugin internals.

## 27. Validate lifecycle on real devices
### Android
Test API 33+ permission grant/deny, disabled notifications, exact access when used, inexact/exact behavior, Doze/idle, reboot, app update, force-stop + explicit relaunch, terminated tap, foreground/background actions, channel migration on an existing install, and release icons/sounds.
### Apple
Test permissions, foreground presentation, cold-start activation, actions, timezone/DST, and actual callback lifecycle.
### Windows/Linux/Web
Test only the supported subset and actual shipped packaging/browser environments.

## 28. Classify errors instead of swallowing them
Use categories:
```text
expected user state
recoverable platform limitation
configuration defect
programming defect
unexpected runtime failure
```
Examples: permission denied = user state; Web scheduling = limitation; missing receiver/icon = configuration; ID collision/invalid timezone = programming defect; `PlatformException` = runtime failure.
Log safe metadata such as notification type, logical/platform IDs, schedule kind, Android mode, UTC instant, zone ID, recurrence, platform, capability state, and error code. Do not log sensitive bodies/payloads.

## 29. Migration workflow
Before a major upgrade:
1. inspect installed/target versions;
2. read changelog and target docs;
3. audit deprecated calls/signatures;
4. audit Android manifest and build requirements;
5. audit deployment targets;
6. inspect callback/background semantics;
7. inspect scheduling/exact-alarm semantics;
8. inspect platform implementation changes;
9. test existing Android channels on an already-installed app;
10. test persisted reminders/schedules;
11. test cold-start routing;
12. test coexistence with push infrastructure.
Preserve stable channel IDs, notification IDs, schedule semantics, and routing contracts during migration.

## 30. Existing-code audit gates
Flag immediately:
- deprecated `schedule()` or removed daily/weekly helpers
- positional API syntax in a modern repository
- timezone data/device zone never initialized
- UTC/local confusion
- 24-hour arithmetic for wall-clock recurrence
- exact alarms as default
- missing exact capability handling
- missing Android notification-permission UX
- same channel ID reused after intended sound/importance change
- dynamic per-entity channels
- invalid status icon
- missing schedule/boot receiver where required
- missing `@pragma('vm:entry-point')`
- `BuildContext`/Activity-only plugin in background callback
- huge or sensitive payloads
- payload used as authorization
- random IDs/collisions
- reminder edits/deletes leaving stale schedules
- thousands of occurrences eagerly scheduled
- pending queries from widget builds
- repeated plugin initialization
- startup permission spam
- routing before router/auth readiness
- foreground Apple presentation assumed automatic
- periodic support assumed portable
- notification trigger used as business execution

## Production definition of done
Approve only when:
- installed plugin/API compatibility is verified;
- platform limitations are explicit;
- initialization occurs once;
- permission prompting is contextual and denial graceful;
- Android channels are stable product contracts;
- channel migrations are deliberate;
- notification IDs are deterministic;
- exact alarms are avoided or justified;
- exact access is handled when needed;
- timezone data and named zones are correct;
- DST semantics match product intent;
- Android reboot recovery is configured where required;
- force-stop behavior is not overstated;
- foreground/background/cold-start interaction is handled;
- background callbacks are small and UI-independent;
- durable reminder intent is separate from OS schedules;
- edits/deletes cancel or replace schedules;
- stale schedules can be reconciled;
- payloads are small, versioned, non-secret, and validated;
- activation re-checks current auth/access;
- unsupported platform features fail explicitly;
- schedule volume is bounded;
- platform queries/rescheduling are not wasteful;
- release notification resources work;
- automated tests pass;
- real-device lifecycle/timezone tests pass.

## Final rule
Before implementing, answer:
```text
What causes the event?
Notification or actual background execution?
Absolute, wall-clock, or elapsed timing?
How exact must it really be?
What durable data is authoritative?
What permissions/platform capabilities are needed?
What stable channel/notification IDs represent it?
What happens on reboot, force-stop, logout, timezone change, and upgrade?
What does a tap/action mean after state changes?
What private information reaches the lock screen?
```
Then derive the smallest reliable platform configuration from durable application intent.

**Notification delivery is a user-facing signal; it is never proof that business logic executed.**
