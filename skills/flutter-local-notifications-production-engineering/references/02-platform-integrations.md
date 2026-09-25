# Source reference: Android manifest/channels/permissions/alarms/lifecycle, iOS/macOS, Linux, Windows, and Web platform behavior

## Table of contents

- [11. Android Manifest: add only what the feature needs](#11-android-manifest-add-only-what-the-feature-needs)
- [12. Android notification channels](#12-android-notification-channels)
- [13. Android importance and UX](#13-android-importance-and-ux)
- [14. Android 13+ notification permission](#14-android-13-notification-permission)
- [15. Android exact alarms](#15-android-exact-alarms)
    - [`SCHEDULE_EXACT_ALARM`](#scheduleexactalarm)
    - [`USE_EXACT_ALARM`](#useexactalarm)
- [16. Android schedule-mode decision table](#16-android-schedule-mode-decision-table)
- [17. Doze, App Standby, battery optimization, OEM restrictions](#17-doze-app-standby-battery-optimization-oem-restrictions)
- [18. Android reboot, update, force-stop, data clearing](#18-android-reboot-update-force-stop-data-clearing)
- [19. Android icons](#19-android-icons)
- [20. Android custom sounds](#20-android-custom-sounds)
- [21. Android actions and background callbacks](#21-android-actions-and-background-callbacks)
- [22. Android full-screen intents and foreground services](#22-android-full-screen-intents-and-foreground-services)
- [23. iOS notification architecture](#23-ios-notification-architecture)
- [24. iOS foreground behavior](#24-ios-foreground-behavior)
- [25. iOS categories and actions](#25-ios-categories-and-actions)
- [26. iOS scheduling and pending limits](#26-ios-scheduling-and-pending-limits)
- [27. iOS cold-start handling](#27-ios-cold-start-handling)
- [28. macOS](#28-macos)
- [29. Linux](#29-linux)
- [30. Windows](#30-windows)
- [31. Web](#31-web)
# 11. Android Manifest: add only what the feature needs

Since plugin version 16, its own manifest intentionally contains only the minimal baseline declarations. Applications using scheduling, actions, exact alarms, foreground services, full-screen intents, or DND bypass must add the feature-specific components they actually require.

Typical requirements:

| FeatureApp-side requirement |                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Ordinary notification       | `POST_NOTIFICATIONS`/baseline plugin integration; runtime prompt on API 33+         |
| Scheduled notification      | scheduled notification receiver                                                     |
| Survive reboot/update       | `RECEIVE_BOOT_COMPLETED` + boot receiver                                            |
| Notification actions        | `ActionBroadcastReceiver`                                                           |
| Exact schedule              | `SCHEDULE_EXACT_ALARM` **or** qualified `USE_EXACT_ALARM` path                      |
| Full-screen intent          | `USE_FULL_SCREEN_INTENT` plus applicable Android policy/configuration               |
| Foreground service          | appropriate `FOREGROUND_SERVICE*` permissions, service declaration and service type |
| DND bypass                  | `ACCESS_NOTIFICATION_POLICY`, explicit user access and suitable channel             |

Do not paste the example application's complete manifest into production “just in case.” The example demonstrates many unrelated capabilities and intentionally contains more configuration than most applications require.

---

# 12. Android notification channels

Android 8.0/API 26+ routes notifications through channels.

A channel is a **long-lived user-visible configuration object**, not a disposable Dart configuration object.

Once an Android channel exists, an application cannot freely change its notification behavior. Importance, sound, vibration behavior, and similar characteristics are effectively fixed from the application's perspective; users may additionally override channel settings themselves. Creating the same channel again with different behavior does not rewrite the existing user's channel.

Therefore:

```
reminders.v1
messages.v1
downloads.v1

```

are good kinds of stable IDs.

This is bad:

```
reminder_42031
reminder_42032
reminder_42033

```

unless each item genuinely represents a separately user-configurable product category.

Define each channel by:

- stable machine ID
- user-facing localized name
- user-facing description
- semantic product purpose
- appropriate importance
- sound policy
- vibration policy.

When a production release genuinely needs materially different channel behavior, deliberate channel versioning may be appropriate:

```
reminders.v1
reminders.v2

```

Do not delete/recreate an existing channel merely to defeat user preferences.

---

# 13. Android importance and UX

Importance should express actual user urgency.

Use default or lower importance for ordinary reminders and informational events unless the product requires interruption.

Use high/max importance only when interruption genuinely matches user expectations.

Do not make every channel high importance merely to increase the probability of a heads-up display. Users control channel behavior and may disable or downgrade noisy channels.

---

# 14. Android 13+ notification permission

Android 13/API 33 introduced the `POST_NOTIFICATIONS` runtime permission for ordinary notifications.

For new installs on modern Android, notifications are not automatically granted. Applications targeting the relevant modern SDK can choose the contextual moment to request the permission. Denial blocks non-exempt notification presentation. On older target behavior, denial/re-prompt rules differ, which is another reason to use the plugin's current APIs rather than hand-built SDK heuristics.

Permission prompting is a **product UX decision**.

Preferred flow:

```
User enables "Daily reminder"
        ↓
Explain why notifications are needed
        ↓
Request system permission
        ↓
Granted → schedule
Denied  → keep product state coherent, show disabled-delivery state

```

Do not repeatedly prompt at every startup.

Do not treat permission denial as application corruption.

Do not assume that storing a reminder means the OS can display it.

---

# 15. Android exact alarms

Exact alarms are a restricted power-sensitive mechanism.

Android explicitly recommends inexact alarms for most scheduling use cases because the system can batch them and reduce wakeups. Exact alarms should be reserved for genuinely time-sensitive user-facing requirements. Modern Android exact scheduling may require special access, and Android 14 tightened default access for newly installed applications.

Two relevant permission paths exist:

### `SCHEDULE_EXACT_ALARM`

- special user-controlled access
- should be checked with `canScheduleExactNotifications()`
- may be requested through the plugin
- can be revoked
- code must handle lack/revocation.

### `USE_EXACT_ALARM`

- intended only for qualifying core functionality
- subject to platform/store policy
- must not be added merely to avoid a permission flow.

Google Play limits `USE_EXACT_ALARM` to applications whose core use qualifies for the permission.

If “somewhere around 09:00” is acceptable, do not use an exact alarm.

---

# 16. Android schedule-mode decision table

Current `AndroidScheduleMode` values are `inexact`, `inexactAllowWhileIdle`, `exact`, `exactAllowWhileIdle`, and `alarmClock`.

| ModePrecisionIdle behaviorExact accessRelative power costRecommended use |                              |                                               |                                    |                   |                                                  |
| ------------------------------------------------------------------------ | ---------------------------- | --------------------------------------------- | ---------------------------------- | ----------------- | ------------------------------------------------ |
| `inexact`                                                                | Approximate                  | May defer in idle                             | No                                 | Lowest            | Default reminder                                 |
| `inexactAllowWhileIdle`                                                  | Approximate                  | May run while idle                            | No exact-alarm permission          | Higher            | Idle delivery matters but exact minute does not  |
| `exact`                                                                  | Precise target               | May defer during low-power idle               | Yes on restricted Android versions | Higher            | Rare precise timing where idle wake not required |
| `exactAllowWhileIdle`                                                    | Precise target               | Allowed through idle subject to OS throttling | Yes                                | High              | Genuinely precise user alarm/reminder            |
| `alarmClock`                                                             | Strong alarm-clock semantics | Runs through idle                             | Yes                                | Highest/intrusive | Actual alarm-clock class feature                 |

Use the **least powerful mode** that satisfies the documented product requirement.

Do not describe even exact Android alarms as guaranteed-to-the-second business execution.

---

# 17. Doze, App Standby, battery optimization, OEM restrictions

Android may delay background work and alarms in Doze/App Standby. Idle-aware alarm modes exist specifically because ordinary alarms may be deferred. Even allow-while-idle execution remains subject to Android throttling and power-management rules.

The package also warns that customized Android distributions can prevent scheduled notifications from behaving as expected in the background. This is an OS/OEM restriction and cannot be repaired purely inside the Flutter plugin.

Therefore:

- promise reminder semantics, not impossible delivery guarantees
- choose exact/idle modes only from product requirements
- expose reasonable diagnostics
- test representative real devices
- never use notification delivery as proof that business logic executed.

---

# 18. Android reboot, update, force-stop, data clearing

For scheduled notifications that should survive reboot, configure the documented scheduled receiver and boot receiver plus `RECEIVE_BOOT_COMPLETED`.

The plugin's documented boot receiver responds to events including device boot and package replacement so cached schedules can be registered again.

This does **not** mean schedules survive every lifecycle event.

A force-stopped Android application is intentionally placed into a stopped state and is prevented from ordinary implicit self-start behavior until the user explicitly interacts with it again. Therefore, do not promise delivery after force-stop. Reconcile reminder intent when the application becomes active again.

Application-data clearing/uninstall destroys application-owned reminder/plugin state. If reminders are server-backed, reconstruct desired local schedules from authoritative data after the application's state is restored.

---

# 19. Android icons

Use a proper Android notification/status icon stored as a drawable resource.

Although launcher/mipmap resources can technically be referenced, the plugin documentation points developers toward drawable resources for notification icons. Launcher artwork is not automatically a good status-bar notification icon.

Verify icons in **release builds** with resource shrinking enabled.

An invalid/missing resource is a configuration defect; do not silently fall back in production without diagnostics.

---

# 20. Android custom sounds

Store Android notification sounds as appropriate raw resources.

On Android 8+, channel sound and vibration behavior belongs to the channel and is established when the channel is initially created. Supplying another sound later with the same channel ID will not change the existing installed channel.

When changing a production channel's fundamental sound policy:

1. decide whether a channel migration is justified
2. create a deliberate versioned channel ID if needed
3. preserve user expectations
4. avoid generating a new channel for every sound variation.

---

# 21. Android actions and background callbacks

Android notification actions use stable internal action IDs plus separate user-visible labels.

Bad:

```
actionId = "Open reminder"

```

Better:

```
actionId = "reminder.open"
label    = localized "Open"

```

For Android/iOS actions that do not explicitly foreground the application, the package can execute the callback in a separate Flutter engine/isolate. Native-invoked background callbacks must be preserved with `@pragma('vm:entry-point')`. Android background isolates do not have an Activity context, so plugins requiring an Activity cannot be assumed to work there.

Keep callbacks small:

```
parse response
validate action identifier
perform minimal safe persistence/work if appropriate
record safe diagnostic result
return

```

Do not:

```
initialize the entire app
create navigation context
run database migrations
perform long network workflows
trust stale payload authorization

```

If a user action must open application UI, configure an action that foregrounds the application and hand routing to normal app lifecycle logic.

---

# 22. Android full-screen intents and foreground services

Full-screen intents and foreground services solve specific Android problems; they are not tools for making ordinary notification delivery “more reliable.”

Full-screen intents are strongly intrusive and modern Android policy limits their appropriate use, especially for alarm/call-style functionality. The plugin exposes configuration and a permission-request API where applicable.

A foreground service is an execution mechanism for ongoing user-noticeable work and requires the appropriate service type/permissions. Its required notification is a consequence of the service lifecycle, not a replacement for correctly modeling a local reminder.

---

# 23. iOS notification architecture

iOS uses `UNUserNotificationCenter`.

The operating system controls authorization, presentation, lock-screen behavior, Focus behavior, notification center, and scheduling. Applications register categories/actions and supply notification requests.

Authorization should be requested in context. Apple records the user's response; repeated authorization calls do not repeatedly produce a fresh system prompt.

The plugin currently exposes Darwin initialization settings for:

- alert permission
- sound permission
- badge permission
- provisional authorization
- critical notification permission
- custom notification-settings UI support
- default foreground alert/banner/list/badge/sound behavior
- categories/actions.

Do not invent authorization capabilities that are not exposed by the installed plugin.

Critical alerts require Apple's relevant entitlement/approval and should not be treated as ordinary permission.

---

# 24. iOS foreground behavior

Do not assume an iOS notification automatically presents a visible banner while the application is foregrounded.

Foreground presentation is controlled through `UNUserNotificationCenterDelegate` behavior and the plugin's Darwin presentation settings. Current Darwin settings include default alert, banner, list, sound, and badge presentation controls, and `DarwinNotificationDetails` can refine notification behavior.

Decide intentionally whether a foreground notification should:

- display a banner
- be placed in notification center
- play sound
- update badge
- instead become in-app UI.

Avoid redundant “notification + snackbar + modal” presentation for the same foreground event.

---

# 25. iOS categories and actions

Darwin actions are registered through `DarwinNotificationCategory`.

Current action APIs support plain and text-input actions. Action options include semantics such as foreground, destructive, and authentication-required behavior.

Treat category and action IDs as durable internal contracts:

```
category: reminder.v1
action:   reminder.open
action:   reminder.snooze

```

Do not use localized labels as IDs.

Changing a label does not require changing its action identity.

---

# 26. iOS scheduling and pending limits

Use `zonedSchedule`/calendar recurrence for user-facing wall-clock schedules.

Apple's `UNCalendarNotificationTrigger` models repeating calendar components, which is semantically appropriate for “every day at 08:00.”

The package README warns that iOS retains only a bounded set of pending notifications and currently cites a value of 64. However, Apple's well-known explicit “64” language comes from older/deprecated `UILocalNotification` documentation; modern `UNUserNotificationCenter` documentation does not expose that numeric limit as a public modern contract. Treat scheduling capacity as bounded and design rolling-window scheduling where a product may create large future sets rather than building correctness around an undocumented modern numeric guarantee.

---

# 27. iOS cold-start handling

`onDidReceiveNotificationResponse` is not sufficient for every cold-start path.

Use `getNotificationAppLaunchDetails()` during startup to determine whether the notification plugin caused application launch. The plugin documentation specifically distinguishes launch handling from normal response callbacks.

Do not navigate immediately from pre-`runApp()` initialization.

Instead:

```
notification launch response
        ↓
parse into application route intent
        ↓
store/queue intent
        ↓
router + authentication become ready
        ↓
validate current entity/access
        ↓
navigate

```

---

# 28. macOS

macOS uses Apple's User Notifications framework but must not be treated as identical to iOS.

Current plugin minimum: macOS **10.15**.

Darwin permissions, categories, actions, presentation options, attachments, and scheduling are available, subject to macOS behavior. Current package versions also support opening notification settings.

A key current lifecycle distinction: do not assume Android/iOS-style background Dart isolate behavior on macOS. Current plugin changelog behavior keeps relevant macOS callbacks on the main isolate.

Inspect the application's current Flutter macOS lifecycle, signing, and packaging before copying an iOS setup verbatim.

---

# 29. Linux

Linux notifications are implemented through the Freedesktop desktop-notification ecosystem, and actual feature capability depends on the desktop notification server.

Use `LinuxFlutterLocalNotificationsPlugin.getCapabilities()` where feature detection matters.

Current important limitations:

- scheduled notifications are unsupported
- pending notifications are unsupported
- the normal response callback runs on the running application's main isolate
- the plugin cannot simply launch a Dart background isolate after the application has terminated
- terminated activation requires application-level DBus activation integration outside the portable plugin abstraction.

Do not emulate scheduling by keeping a Flutter process artificially alive.

If reliable Linux scheduling is a real requirement, design an explicit platform mechanism rather than pretending `zonedSchedule` is portable.

---

# 30. Windows

Windows uses C++/WinRT toast/app-notification infrastructure.

Current plugin capabilities include rich toast configuration, images, controls, launch behavior, raw XML, and dynamic notification updates.

Important limitations:

- one-time scheduling is available
- **repeating notifications are not supported**
- calling periodic APIs throws `UnsupportedError`
- cancellation and active-notification retrieval depend on application package identity; for an unpackaged/non-MSIX application, the plugin documents reduced behavior.

Windows initialization requires stable application identity data such as the application name, AUMID, and GUID. Do not generate these on every run.

Windows scheduled-toast infrastructure also has platform-specific delivery and quota behavior; do not schedule an unbounded future event history. Microsoft documentation describes finite scheduled-toast capacity and delivery windows, so validate real Windows lifecycle requirements rather than treating Windows scheduling like Android AlarmManager.

---

# 31. Web

**Web is currently supported.** It was added in 22.0.0.

Current Web characteristics:

- basic browser notifications are supported
- permission must be requested from direct user interaction
- Chrome/Edge support notification actions more fully than Firefox/Safari
- scheduled notifications are unsupported
- repeating notifications are unsupported
- browser behavior varies
- browser lifecycle uses Web/service-worker semantics rather than Android/iOS background-isolate semantics.

Do not create a fake Web implementation that starts timers and assumes a suspended/closed page will remain alive.

If server-originated or future delivery is required on Web, use an appropriate Web Push/service-worker/backend design.

---

