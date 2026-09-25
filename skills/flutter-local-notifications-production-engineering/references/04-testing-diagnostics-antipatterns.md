# Source reference: Testing, real-device validation, time manipulation, error classification, diagnostics, common bugs, anti-patterns, Android permission matrix

## Table of contents

- [56. Testing strategy](#56-testing-strategy)
    - [Unit tests](#unit-tests)
    - [Integration tests](#integration-tests)
    - [Real-device tests](#real-device-tests)
- [57. Real-device validation matrix](#57-real-device-validation-matrix)
  - [Android](#android)
  - [iOS](#ios)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
  - [Web](#web)
- [58. Time-manipulation tests](#58-time-manipulation-tests)
- [59. Error classification](#59-error-classification)
    - [Expected user state](#expected-user-state)
    - [Recoverable platform limitation](#recoverable-platform-limitation)
    - [Configuration defect](#configuration-defect)
    - [Programming defect](#programming-defect)
    - [Unexpected runtime failure](#unexpected-runtime-failure)
- [60. Diagnostics](#60-diagnostics)
- [61. Common production bugs](#61-common-production-bugs)
- [62. Performance anti-patterns](#62-performance-anti-patterns)
- [63. Android permission matrix](#63-android-permission-matrix)
# 56. Testing strategy

Test application behavior around the plugin rather than proving the plugin's own internals.

### Unit tests

Test:

- next-occurrence calculation
- UTC/local conversion
- DST cases
- ID allocation
- payload parsing
- malformed payload rejection
- scheduling-policy selection
- reconciliation diff
- permission-state transitions
- action routing.

### Integration tests

Verify:

- expected plugin calls
- schedule/cancel transitions
- startup launch response
- application routing handoff.

### Real-device tests

Notification lifecycle depends too heavily on the operating system for emulator-only testing to be sufficient for important flows.

---

# 57. Real-device validation matrix

## Android

Test:

- Android 13+ permission grant
- denial
- dismissal of permission prompt
- notifications disabled in settings
- exact access granted/revoked
- inexact schedule
- exact schedule if justified
- Doze/idle
- reboot
- application update
- force-stop then explicit relaunch
- terminated tap
- foreground tap
- background action
- channel migration on an **existing install**
- custom icon/sound in release build
- representative OEM devices where the product has significant usage.

## iOS

Test:

- first permission request
- denial
- provisional behavior if used
- foreground presentation
- background presentation
- terminated launch
- action buttons
- text-input action if used
- timezone change
- DST transition
- many pending reminders/rolling scheduling.

## macOS

Test permissions, foreground presentation, action lifecycle, packaging/signing, scheduling, and main-isolate callback assumptions.

## Windows

Test packaged/MSIX and any supported unpackaged configuration actually shipped, one-time scheduling, activation, dynamic update, cancellation, and machine-off/restart behavior.

## Linux

Test each supported desktop environment/notification server capability relevant to the product.

## Web

Test each supported browser, permission from a user gesture, notification activation, closed/open page behavior, and service-worker configuration.

---

# 58. Time-manipulation tests

For scheduling-heavy applications cover:

```
now → future
future date already passed
DST spring-forward gap
DST fall-back duplicate hour
timezone change
device clock change
daily recurrence
weekly recurrence
month boundary
leap year
year boundary
user edits schedule just before firing

```

Keep schedule calculation independent enough to inject a clock/current time in tests.

---

# 59. Error classification

Classify failures instead of swallowing them.

### Expected user state

- notification permission denied
- notifications disabled
- exact access unavailable
- channel disabled by user.

### Recoverable platform limitation

- Web/Linux scheduling unsupported
- Windows periodic schedule unsupported
- OEM Android background restrictions
- browser action unsupported.

### Configuration defect

- missing Android receiver
- invalid icon
- missing sound
- incorrect AppDelegate setup
- incorrect Windows identity
- missing resource after shrinking.

### Programming defect

- ID collision
- malformed internal payload generation
- invalid timezone identifier
- scheduling an invalid/past date without policy.

### Unexpected runtime failure

- `PlatformException`
- native integration error
- FFI/DBus/browser runtime failure.

Do not use an empty broad catch.

---

# 60. Diagnostics

Useful safe metadata:

```
notificationType
logicalNotificationId
platformNotificationId
scheduleKind
AndroidScheduleMode
target UTC instant
timezone ID
recurrence type
platform
permission/capability state
error code/class

```

Avoid:

```
notification body
private message
access token
full customer object
full sensitive payload

```

---

# 61. Common production bugs

Actively search for:

- deprecated `schedule()` usage
- old positional API syntax in 20+ repositories
- timezone database never initialized
- device timezone never resolved
- UTC treated as local time
- `DateTime.now().add(Duration(days: 1))` used for daily wall-clock recurrence
- Android exact alarms used by default
- missing exact-alarm capability check
- missing Android 13 permission UX
- same Android channel ID reused after changing sound/importance
- dynamic per-entity channels
- invalid Android status icon
- scheduled-notification receiver missing
- boot receiver missing when reboot durability is required
- background callback missing `@pragma('vm:entry-point')`
- UI-only plugins/`BuildContext` used in background callback
- huge JSON payload
- payload authorization trusted
- random notification IDs
- ID collisions
- reminder deletion without cancellation
- reminder edits producing duplicate schedules
- thousands of occurrences eagerly scheduled
- pending requests queried every widget build
- plugin initialized repeatedly
- permission requested every startup
- router invoked before it exists
- foreground iOS presentation assumed automatic
- every platform assumed to support periodic scheduling
- notifications used as business-job execution.

---

# 62. Performance anti-patterns

Reject:

```
initialize plugin for every show()
create channels dynamically for every entity
pendingNotificationRequests() from build()
full reconciliation every resume with no invariant requiring it
schedule years of daily events individually
exactAllowWhileIdle for normal reminders
progress update per downloaded byte
download/decode large image immediately before every notification
initialize complete application service graph in background callback
serialize large domain object into payload
reschedule unchanged reminder

```

---

# 63. Android permission matrix

| FeatureManifest/platform requirementRuntime/special accessNotes |                                                                            |                                                        |                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Basic notification                                              | `POST_NOTIFICATIONS` baseline                                              | API 33+ runtime permission                             | Request contextually                               |
| Inexact scheduled notification                                  | scheduling receiver; boot permission/receiver if reboot persistence needed | No exact access                                        | Prefer this                                        |
| Exact schedule                                                  | scheduling setup + exact permission declaration                            | Exact-alarm capability required on restricted versions | Graceful fallback                                  |
| Reboot reschedule                                               | `RECEIVE_BOOT_COMPLETED`, boot receiver                                    | No user prompt                                         | Only needed for durable schedule                   |
| Action callback                                                 | `ActionBroadcastReceiver`                                                  | None beyond notification access                        | Required for Android actions                       |
| Full-screen intent                                              | `USE_FULL_SCREEN_INTENT` + activity/policy configuration                   | Platform restrictions/access may apply                 | Calls/alarms only when justified                   |
| Foreground service                                              | service + correct `FOREGROUND_SERVICE*`permissions/type                    | Depends on service feature                             | Separate execution mechanism                       |
| DND bypass                                                      | `ACCESS_NOTIFICATION_POLICY`                                               | Explicit user policy access                            | Must be granted before suitable channel is created |

Android exact-alarm and full-screen behavior continues to evolve; re-check current Android documentation during a future implementation rather than freezing policy assumptions from this file.

---

