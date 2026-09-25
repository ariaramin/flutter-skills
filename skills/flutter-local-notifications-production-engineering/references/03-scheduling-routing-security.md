# Source reference: Scheduling semantics, timezone/DST, IDs, payloads, routing, lifecycle, reconciliation, architecture, performance, permissions, security, privacy, UX

## Table of contents

- [32. Scheduling fundamentals](#32-scheduling-fundamentals)
    - [One-time absolute instant](#one-time-absolute-instant)
    - [One-time local calendar time](#one-time-local-calendar-time)
    - [Daily wall-clock recurrence](#daily-wall-clock-recurrence)
    - [Fixed elapsed interval](#fixed-elapsed-interval)
- [33. Schedule-type/DST matrix](#33-schedule-typedst-matrix)
- [34. Time zones](#34-time-zones)
- [35. DST correctness](#35-dst-correctness)
- [36. Repeating notifications](#36-repeating-notifications)
- [37. Notification IDs](#37-notification-ids)
- [38. Payloads](#38-payloads)
- [39. Payload security](#39-payload-security)
- [40. Routing architecture](#40-routing-architecture)
- [41. Lifecycle model](#41-lifecycle-model)
- [42. Cancellation and updates](#42-cancellation-and-updates)
- [43. Grouping, progress, and rich notifications](#43-grouping-progress-and-rich-notifications)
- [44. Persistent reminder model](#44-persistent-reminder-model)
- [45. Reconciliation](#45-reconciliation)
- [46. Architecture guidance](#46-architecture-guidance)
- [47. State-management integration](#47-state-management-integration)
- [48. Dependency injection](#48-dependency-injection)
- [49. Performance engineering](#49-performance-engineering)
    - [Important costs](#important-costs)
    - [Usually insignificant](#usually-insignificant)
- [50. Startup performance](#50-startup-performance)
- [51. Battery efficiency](#51-battery-efficiency)
- [52. Permission strategy](#52-permission-strategy)
- [53. Security](#53-security)
- [54. Privacy](#54-privacy)
- [55. Accessibility and notification UX](#55-accessibility-and-notification-ux)
# 32. Scheduling fundamentals

Choose scheduling based on semantic intent.

### One-time absolute instant

Example:

```
“Notify me when the auction closes at 2026-09-01T15:00:00Z.”

```

Persist the instant as UTC.

### One-time local calendar time

Example:

```
“Remind me at 08:30 Europe/Tallinn on September 1.”

```

Persist both calendar intent and named zone when future timezone semantics matter.

### Daily wall-clock recurrence

Example:

```
“Every day at 08:00 local time.”

```

Use calendar recurrence/timezone-aware calculations.

### Fixed elapsed interval

Example:

```
“Every 24 elapsed hours.”

```

Use an interval only when elapsed-time semantics are actually intended.

---

# 33. Schedule-type/DST matrix

| IntentRepresentationDST result |                                  |                                  |
| ------------------------------ | -------------------------------- | -------------------------------- |
| One absolute event             | UTC instant                      | Same physical instant            |
| One local calendar event       | local components + named zone    | Zone rules determine instant     |
| Daily 08:00                    | named zone + calendar recurrence | Remains 08:00 wall clock         |
| Every 24 hours                 | elapsed duration                 | Wall-clock hour may shift at DST |

Never silently convert between these meanings.

---

# 34. Time zones

Modern scheduling should use `zonedSchedule` with `TZDateTime`.

The package recommends adding `timezone` as a direct application dependency rather than relying on its transitive dependency. Initialize the timezone database before using zoned schedules.

Important: the `timezone` package itself does **not** discover the device's current zone identifier. The plugin's example uses a separate mechanism/package to retrieve the device zone and then calls `tz.setLocalLocation(...)`.

Model time deliberately:

```
Instant:
  UTC

Wall-clock schedule:
  hour/minute/calendar components
  +
  IANA zone such as Europe/Tallinn

Device-following reminder:
  current device IANA zone
  +
  reconciliation if the device zone changes

```

Avoid storing an ambiguous local `DateTime` when the named zone changes the meaning.

---

# 35. DST correctness

This is wrong for a wall-clock recurrence:

```
next = previous.add(const Duration(hours: 24));

```

Across DST, the physical elapsed interval and the local wall-clock interval are different concepts.

For “daily at 08:00,” construct the next calendar occurrence in the chosen `tz.Location` and use calendar matching such as `DateTimeComponents.time`.

Also test:

- nonexistent local times during spring-forward
- repeated local times during fall-back
- zone changes
- month/year transitions.

When a requested wall-clock time lands in a DST gap or fold, define a product policy rather than relying on accidental normalization.

---

# 36. Repeating notifications

Use simple periodic scheduling only for true interval semantics.

Use calendar/zoned recurrence for:

- daily local clock time
- weekly weekday/time
- monthly calendar schedule
- yearly calendar schedule.

Current periodic support is platform-dependent; Windows, Linux, and Web cannot use the plugin's periodic APIs.

Specify Android schedule mode explicitly instead of inheriting an unnecessarily powerful default.

---

# 37. Notification IDs

The plugin's portable notification ID maps into platform constraints; current Android-facing documentation requires IDs to fit a signed 32-bit integer.

Use deterministic IDs.

Patterns:

```
singleton status:
  fixed reserved ID

one reminder:
  persistent application mapping reminder UUID -> int ID

recurring reminder:
  one stable ID for the reminder

download progress:
  one stable ID per active download

group summary:
  reserved namespace distinct from children

```

Do not use:

```
DateTime.now().millisecondsSinceEpoch
Random().nextInt(...)
entity.hashCode

```

when the notification must later be replaced or canceled.

Do not blindly cast database IDs without confirming integer range/collision behavior.

For UUID-backed objects, storing a generated notification integer alongside the durable record is usually safer than using a runtime hash algorithm.

---

# 38. Payloads

The plugin payload is a small string-oriented handoff. The package normalizes a null payload to an empty string across platforms.

Use payloads for routing references:

```
{"v":1,"type":"reminder","id":"8f0e..."}

```

Do not serialize an entire customer, message history, account, or reminder object.

Payloads may become:

- stale
- malformed
- incompatible after an upgrade
- visible to diagnostic tooling
- activated after authentication state changes.

Treat them as untrusted routing hints.

---

# 39. Payload security

On activation:

1. parse defensively
2. allowlist payload versions/types
3. validate identifier format
4. re-read authoritative data
5. verify the entity still exists
6. verify current authentication
7. verify current authorization
8. route only after those checks.

Never put:

- tokens
- passwords
- private API keys
- session state
- authorization claims
- unnecessary PII

inside notification payloads.

A notification payload must never grant access merely because it says the user may open a resource.

---

# 40. Routing architecture

Prefer one parser and one route coordinator:

```
NotificationResponse
        ↓
NotificationPayloadParser
        ↓
NotificationIntent
        ↓
NotificationRouteCoordinator
        ↓
application router

```

The coordinator should support:

- warm foreground response
- background → foreground response
- cold-start response
- deferred routing until authentication/router startup completes.

Avoid global `BuildContext` hacks.

Avoid repeating JSON parsing in `main.dart`, individual pages, background callbacks, and router delegates.

---

# 41. Lifecycle model

| StateOS notificationDart interaction |                                              |                                                                |
| ------------------------------------ | -------------------------------------------- | -------------------------------------------------------------- |
| Foreground                           | Platform-dependent presentation              | Main callback when applicable                                  |
| Background                           | OS presents according to permission/settings | Action/tap may resume app or use supported background callback |
| Terminated                           | OS may present scheduled notification        | Launch details or platform activation path                     |
| Device reboot                        | Platform-specific                            | Android requires configured rescheduling receiver              |
| Force-stopped Android                | Do not rely on normal delivery/rescheduling  | Reconcile when user explicitly starts application again        |

Always distinguish **OS notification delivery** from **Flutter callback execution**.

---

# 42. Cancellation and updates

Use deterministic cancellation.

When a reminder is:

- deleted → cancel it
- disabled → cancel it
- moved → cancel old schedule and create new schedule
- materially changed → update the same logical notification
- no longer authorized → cancel relevant stale notification.

`cancel(id: ...)` and `cancelAllPendingNotifications()` are different operations. Do not call `cancelAll()` unless the business requirement truly means “remove every delivered and pending notification owned by this integration.”

For pending scheduled updates, the safest cross-platform business-level pattern is:

```
stable logical ID
cancel old schedule
schedule desired state

```

rather than assuming every OS replaces pending requests identically.

---

# 43. Grouping, progress, and rich notifications

Use grouping when it reduces noise.

Android has explicit group keys and summary notifications. Darwin exposes thread/grouping concepts. Windows has its own grouping/header model. Do not force one platform's grouping model into unsupported platforms.

For progress notifications:

- update the same stable notification ID
- throttle updates by meaningful percentage/time thresholds
- do not issue a platform-channel update for every byte transferred.

Rich content can involve:

- image download
- disk access
- image decode
- attachment creation
- temporary-file management.

These operations usually cost more than the notification plugin's basic Dart object allocation.

The plugin does not become an image networking layer. Download/cache remote assets in application code with:

- timeout
- bounded response size
- cache policy
- fallback notification
- cleanup.

Do not synchronously download a large image on a latency-critical notification path.

---

# 44. Persistent reminder model

For reminder-heavy products, OS notification storage must not be the only source of truth.

A useful durable model may contain:

```
logical reminder ID
enabled
schedule type
absolute UTC instant, when applicable
local hour/minute, when applicable
IANA timezone ID
recurrence
notification integer ID
payload entity reference
schedule schema/version
last scheduling state/error

```

Do not persist plugin-native notification-detail objects unless there is a genuine need.

Persist application-level intent and regenerate platform configuration.

---

# 45. Reconciliation

Reconciliation means comparing desired application reminder state with what should exist at the platform boundary.

Reasonable triggers include:

- reminder creation/edit/delete
- reminder enabled/disabled
- app upgrade that changes scheduling algorithm
- notification permission restored
- exact-alarm access restored
- timezone change
- authentication/account change
- explicit data restoration
- integrity recovery after known platform lifecycle loss.

Do **not** perform an expensive full reconciliation in every widget build.

Do not reschedule unchanged reminders.

For a product with thousands of future occurrences, schedule a bounded rolling window if the platform and product semantics allow it.

The package itself warns of finite practical platform limits, including OEM Android alarm limits and bounded iOS pending queues. Windows scheduling also has finite platform capacity.

---

# 46. Architecture guidance

Prefer the minimum architecture that expresses actual responsibilities.

A medium/large reminder application may legitimately have:

```
NotificationService
  native/plugin integration

ReminderScheduler
  translates business scheduling intent

NotificationPayloadParser
  validates routing envelope

NotificationRouteCoordinator
  hands validated intent to router

```

A tiny application might need only:

```
NotificationService

```

Do not create:

```
NotificationRepository
 -> NotificationUseCase
 -> NotificationManager
 -> NotificationHelper
 -> NotificationFacade

```

merely to call `show()`.

---

# 47. State-management integration

Bloc/Cubit, Riverpod, ChangeNotifier, and plain-state architectures should model **product state**, for example:

```
reminderEnabled
reminderSchedule
notificationPermission
deliveryCapability
lastSchedulingFailure

```

Do not spread:

```
AndroidNotificationDetails
DarwinNotificationDetails
FlutterLocalNotificationsPlugin

```

through presentation state.

Keep platform notification implementation at the integration boundary.

---

# 48. Dependency injection

The plugin is intentionally mockable and its APIs are instance based.

Injecting either:

```
FlutterLocalNotificationsPlugin

```

or a small application-specific interface is useful when scheduling/reconciliation logic needs isolated tests.

Do not introduce a DI container merely for one notification call in a tiny app.

---

# 49. Performance engineering

Optimize mechanisms that actually cost resources.

### Important costs

- unnecessary exact alarms and idle wakeups
- scheduling very large future sets
- repeated reconciliation
- platform calls for frequent pending/active queries
- repeated timezone database setup
- background Flutter-engine/isolate startup
- image downloads and decoding
- attachment preparation
- excessive progress updates
- unnecessary payload serialization.

### Usually insignificant

- constructing a small `NotificationDetails` object
- using a well-scoped service object
- a small payload parser
- a few notification constants.

Do not perform micro-optimizations while waking devices unnecessarily with exact alarms.

---

# 50. Startup performance

At startup, do only what lifecycle correctness requires.

Potentially appropriate:

- initialize plugin once
- register categories/callbacks
- initialize timezone support if scheduling is immediately needed
- read notification launch details
- enqueue a route intent
- run a lightweight reconciliation only when an explicit invariant requires it.

Avoid:

- querying every pending notification on every app launch without a reason
- rebuilding every future schedule
- loading rich notification media
- initializing unrelated networking/database subsystems solely because a tap callback exists
- requesting permission automatically.

---

# 51. Battery efficiency

Order of preference on Android:

```
inexact
  ↓ only if idle delivery needed
inexactAllowWhileIdle
  ↓ only if precise product timing required
exact
  ↓ only if precise idle timing required
exactAllowWhileIdle
  ↓ only for genuine alarm-clock semantics
alarmClock

```

This ordering is an engineering policy, not a requirement that every application must traverse sequentially.

The mechanism matters: inexact alarms permit OS batching; exact/idle alarms constrain batching and may wake the device. Android's platform guidance explicitly recommends inexact scheduling for most use cases.

---

# 52. Permission strategy

| StrategyAppropriate whenProblems |                                                                           |                                                            |
| -------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Startup prompt                   | Notifications are immediately essential and user value is already obvious | Usually poor context; impossible for Web permission prompt |
| Contextual prompt                | User enables a notification feature                                       | **Preferred default**                                      |
| Delayed prompt                   | Product first demonstrates value                                          | Good for optional engagement features                      |
| No prompt until feature enabled  | Notifications fully optional                                              | Excellent low-pressure default                             |

For Apple provisional authorization, consider whether quiet delivery matches the product rather than treating it as a trick to bypass a proper consent flow.

For Web, notification permission requests must be tied to user interaction.

---

# 53. Security

Review notification flows as external entry points.

Threats include:

- stale payload references
- malformed payloads
- deep-link abuse
- actions performed after logout
- authorization changes
- sensitive lock-screen disclosure
- logs containing private payloads
- spoofed internal notification type identifiers
- obsolete notifications targeting deleted resources.

Notification activation must go through current authorization/business rules.

Never make:

```
if (payload.type == 'admin') {
  openAdminScreen();
}

```

an authorization check.

---

# 54. Privacy

Review notification content for lock-screen exposure.

High-risk examples:

- medical diagnosis
- financial balance
- private message body
- verification codes
- customer names
- location information
- confidential workplace information.

When appropriate, prefer:

```
“You have a new secure message”

```

over:

```
“Dr. X: Your biopsy result is …”

```

Users may control system preview behavior, but the application still owns the decision to include sensitive text.

Do not log complete notification bodies or sensitive payloads.

---

# 55. Accessibility and notification UX

Use:

- concise titles
- clear body text
- localized content
- meaningful action verbs
- appropriate grouping
- appropriate importance
- consistent channel meaning
- user-configurable preferences.

Avoid:

- notification spam
- duplicate alerts for one event
- action labels such as “Yes” where the action is ambiguous
- high importance for marketing/informational events
- proliferating channels
- content that depends only on color/icon interpretation.

---

