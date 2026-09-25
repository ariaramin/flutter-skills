# Source reference: Code references, iOS/Android setup references, migration, push integration, reliability/performance/security checklists, workflow, completion criteria, sources

## Table of contents

- [64. Code reference](#64-code-reference)
  - [Example 1 — Notification contracts and payload parser](#example-1-notification-contracts-and-payload-parser)
  - [Example 2 — Initialization](#example-2-initialization)
  - [Example 3 — App startup](#example-3-app-startup)
  - [Example 4 — Safe route handoff](#example-4-safe-route-handoff)
  - [Example 5 — Stable Android channel creation](#example-5-stable-android-channel-creation)
  - [Example 6 — Immediate notification](#example-6-immediate-notification)
  - [Example 7 — Android notification permission](#example-7-android-notification-permission)
  - [Example 8 — Darwin permission request](#example-8-darwin-permission-request)
  - [Example 9 — Web permission](#example-9-web-permission)
  - [Example 10 — Timezone initialization](#example-10-timezone-initialization)
  - [Example 11 — Choose the least-powerful Android mode](#example-11-choose-the-least-powerful-android-mode)
  - [Example 12 — One-time zoned schedule](#example-12-one-time-zoned-schedule)
  - [Example 13 — DST-correct daily wall-clock reminder](#example-13-dst-correct-daily-wall-clock-reminder)
  - [Example 14 — Request exact-alarm access only after product justification](#example-14-request-exact-alarm-access-only-after-product-justification)
  - [Example 15 — Cancel/update with deterministic ID](#example-15-cancelupdate-with-deterministic-id)
  - [Example 16 — Graceful permission denial](#example-16-graceful-permission-denial)
  - [Example 17 — Small reconciliation implementation](#example-17-small-reconciliation-implementation)
  - [Example 18 — Bad vs improved recurrence](#example-18-bad-vs-improved-recurrence)
- [65. iOS AppDelegate rule](#65-ios-appdelegate-rule)
- [66. Android manifest reference patterns](#66-android-manifest-reference-patterns)
- [67. Build-configuration reference for Android 22.x](#67-build-configuration-reference-for-android-22x)
- [68. Migration guidance](#68-migration-guidance)
- [69. Local notifications and push packages](#69-local-notifications-and-push-packages)
- [70. Reliability checklist](#70-reliability-checklist)
- [71. Performance checklist](#71-performance-checklist)
- [72. Security/privacy checklist](#72-securityprivacy-checklist)
- [73. Implementation workflow](#73-implementation-workflow)
  - [Step 1 — Inspect](#step-1-inspect)
  - [Step 2 — Classify requirement](#step-2-classify-requirement)
  - [Step 3 — Verify platform capabilities](#step-3-verify-platform-capabilities)
  - [Step 4 — Design identity](#step-4-design-identity)
  - [Step 5 — Configure only required platform features](#step-5-configure-only-required-platform-features)
  - [Step 6 — Initialize once](#step-6-initialize-once)
  - [Step 7 — Handle permissions contextually](#step-7-handle-permissions-contextually)
  - [Step 8 — Implement scheduling](#step-8-implement-scheduling)
  - [Step 9 — Implement lifecycle interaction](#step-9-implement-lifecycle-interaction)
  - [Step 10 — Persist business intent](#step-10-persist-business-intent)
  - [Step 11 — Reconcile](#step-11-reconcile)
  - [Step 12 — Optimize](#step-12-optimize)
  - [Step 13 — Validate statically](#step-13-validate-statically)
  - [Step 14 — Validate on real devices](#step-14-validate-on-real-devices)
- [74. Completion criteria](#74-completion-criteria)
- [75. Final decision rules](#75-final-decision-rules)
- [76. Authoritative source references](#76-authoritative-source-references)
# 64. Code reference

The following code assumes a **22.x named-parameter API**. If the repository pins another major version, adapt to that release rather than editing dependency constraints just to make these snippets compile.

## Example 1 — Notification contracts and payload parser

```
import 'dart:convert';

abstract final class NotificationContract {
  static const String remindersChannelId = 'reminders.v1';
  static const String remindersChannelName = 'Reminders';
  static const String remindersChannelDescription =
      'Reminders you explicitly enable.';

  static const String reminderCategoryId = 'reminder.v1';
  static const String openActionId = 'reminder.open';
  static const String dismissActionId = 'reminder.dismiss';

  static int notificationIdForPersistedReminder(int reminderNumber) {
    const int namespaceBase = 100000000;
    const int maxReminderNumber = 99999999;

    if (reminderNumber < 0 || reminderNumber > maxReminderNumber) {
      throw RangeError.range(
        reminderNumber,
        0,
        maxReminderNumber,
        'reminderNumber',
      );
    }

    return namespaceBase + reminderNumber;
  }
}

final class NotificationPayload {
  const NotificationPayload({
    required this.version,
    required this.type,
    required this.entityId,
  });

  final int version;
  final String type;
  final String entityId;

  String encode() {
    return jsonEncode(<String, Object>{
      'v': version,
      'type': type,
      'id': entityId,
    });
  }

  static NotificationPayload? tryParse(String? raw) {
    if (raw == null || raw.isEmpty || raw.length > 2048) {
      return null;
    }

    try {
      final Object? decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        return null;
      }

      final Object? version = decoded['v'];
      final Object? type = decoded['type'];
      final Object? entityId = decoded['id'];

      if (version != 1 ||
          type is! String ||
          entityId is! String ||
          entityId.isEmpty ||
          entityId.length > 256) {
        return null;
      }

      const Set<String> supportedTypes = <String>{'reminder'};
      if (!supportedTypes.contains(type)) {
        return null;
      }

      return NotificationPayload(
        version: version,
        type: type,
        entityId: entityId,
      );
    } on FormatException {
      return null;
    }
  }
}

```

For UUID/domain IDs, persist the generated 32-bit notification ID rather than replacing the deterministic mapping above with Dart's runtime `hashCode`.

---

## Example 2 — Initialization

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final FlutterLocalNotificationsPlugin notificationsPlugin =
    FlutterLocalNotificationsPlugin();

@pragma('vm:entry-point')
void notificationBackgroundResponse(NotificationResponse response) {
  final NotificationPayload? payload =
      NotificationPayload.tryParse(response.payload);

  if (payload == null) {
    return;
  }

  // Keep this native-invoked entry point small.
  // Durable business operations must independently re-validate their state.
}

Future<void> initializeNotifications({
  required WindowsInitializationSettings windowsSettings,
  required void Function(NotificationResponse response)
      onForegroundNotificationResponse,
}) async {
  final List<DarwinNotificationCategory> categories =
      <DarwinNotificationCategory>[
    DarwinNotificationCategory(
      NotificationContract.reminderCategoryId,
      actions: <DarwinNotificationAction>[
        DarwinNotificationAction.plain(
          NotificationContract.openActionId,
          'Open',
          options: <DarwinNotificationActionOption>{
            DarwinNotificationActionOption.foreground,
          },
        ),
        DarwinNotificationAction.plain(
          NotificationContract.dismissActionId,
          'Dismiss',
          options: <DarwinNotificationActionOption>{
            DarwinNotificationActionOption.destructive,
          },
        ),
      ],
    ),
  ];

  final DarwinInitializationSettings darwin =
      DarwinInitializationSettings(
    requestAlertPermission: false,
    requestBadgePermission: false,
    requestSoundPermission: false,
    requestProvisionalPermission: false,
    requestCriticalPermission: false,
    notificationCategories: categories,
    defaultPresentAlert: true,
    defaultPresentBanner: true,
    defaultPresentList: true,
    defaultPresentBadge: true,
    defaultPresentSound: true,
  );

  final InitializationSettings settings = InitializationSettings(
    android: const AndroidInitializationSettings('notification_icon'),
    iOS: darwin,
    macOS: darwin,
    linux: const LinuxInitializationSettings(
      defaultActionName: 'Open',
    ),
    windows: windowsSettings,
    web: const WebInitializationSettings(),
  );

  await notificationsPlugin.initialize(
    settings: settings,
    onDidReceiveNotificationResponse: onForegroundNotificationResponse,
    onDidReceiveBackgroundNotificationResponse:
        notificationBackgroundResponse,
  );
}

```

`windowsSettings` must contain the repository's permanent Windows application identity; do not generate a new AUMID/GUID on each startup.

---

## Example 3 — App startup

```
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const WindowsInitializationSettings windowsSettings =
      WindowsInitializationSettings(
    appName: 'Example App',
    appUserModelId: 'Com.Example.ExampleApp',
    guid: '0d726bc4-e25b-4e13-b1db-22d06a904568',
  );

  final NotificationRouteCoordinator routeCoordinator =
      NotificationRouteCoordinator();

  await initializeNotifications(
    windowsSettings: windowsSettings,
    onForegroundNotificationResponse: routeCoordinator.acceptResponse,
  );

  final NotificationAppLaunchDetails? launchDetails =
      await notificationsPlugin.getNotificationAppLaunchDetails();

  if (launchDetails?.didNotificationLaunchApp ?? false) {
    final NotificationResponse? response =
        launchDetails?.notificationResponse;
    if (response != null) {
      routeCoordinator.acceptResponse(response);
    }
  }

  runApp(
    ExampleApp(
      routeCoordinator: routeCoordinator,
    ),
  );
}

final class ExampleApp extends StatelessWidget {
  const ExampleApp({
    required this.routeCoordinator,
    super.key,
  });

  final NotificationRouteCoordinator routeCoordinator;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: NotificationAwareHome(
        routeCoordinator: routeCoordinator,
      ),
    );
  }
}

final class NotificationAwareHome extends StatefulWidget {
  const NotificationAwareHome({
    required this.routeCoordinator,
    super.key,
  });

  final NotificationRouteCoordinator routeCoordinator;

  @override
  State<NotificationAwareHome> createState() =>
      _NotificationAwareHomeState();
}

final class _NotificationAwareHomeState
    extends State<NotificationAwareHome> {
  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.routeCoordinator.markRouterReady(
        onIntent: (NotificationIntent intent) {
          if (!mounted) {
            return;
          }

          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => ReminderScreen(
                reminderId: intent.entityId,
              ),
            ),
          );
        },
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Home')),
    );
  }
}

final class ReminderScreen extends StatelessWidget {
  const ReminderScreen({
    required this.reminderId,
    super.key,
  });

  final String reminderId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reminder')),
      body: Center(child: Text('Reminder $reminderId')),
    );
  }
}

```

---

## Example 4 — Safe route handoff

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final class NotificationIntent {
  const NotificationIntent({
    required this.entityId,
  });

  final String entityId;
}

final class NotificationRouteCoordinator {
  NotificationIntent? _pendingIntent;
  void Function(NotificationIntent intent)? _consumer;

  void acceptResponse(NotificationResponse response) {
    if (response.actionId.isNotEmpty &&
        response.actionId != NotificationContract.openActionId) {
      return;
    }

    final NotificationPayload? payload =
        NotificationPayload.tryParse(response.payload);

    if (payload == null || payload.type != 'reminder') {
      return;
    }

    final NotificationIntent intent =
        NotificationIntent(entityId: payload.entityId);

    final void Function(NotificationIntent)? consumer = _consumer;
    if (consumer == null) {
      _pendingIntent = intent;
      return;
    }

    consumer(intent);
  }

  void markRouterReady({
    required void Function(NotificationIntent intent) onIntent,
  }) {
    _consumer = onIntent;

    final NotificationIntent? pending = _pendingIntent;
    _pendingIntent = null;

    if (pending != null) {
      onIntent(pending);
    }
  }
}

```

In a production application, the router consumer must still re-fetch the reminder and enforce current authentication/authorization before opening private content.

---

## Example 5 — Stable Android channel creation

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

Future<void> ensureReminderChannelExists() async {
  final AndroidFlutterLocalNotificationsPlugin? android =
      notificationsPlugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

  if (android == null) {
    return;
  }

  const AndroidNotificationChannel channel =
      AndroidNotificationChannel(
    NotificationContract.remindersChannelId,
    NotificationContract.remindersChannelName,
    description: NotificationContract.remindersChannelDescription,
    importance: Importance.defaultImportance,
  );

  await android.createNotificationChannel(channel);
}

```

Calling this idempotently is fine. Changing `importance` or channel sound later does not mean an existing user's channel will be rewritten.

---

## Example 6 — Immediate notification

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

Future<void> showReminderNotification({
  required int notificationId,
  required String title,
  required String body,
  required String reminderId,
}) async {
  final NotificationPayload payload = NotificationPayload(
    version: 1,
    type: 'reminder',
    entityId: reminderId,
  );

  const AndroidNotificationDetails android =
      AndroidNotificationDetails(
    NotificationContract.remindersChannelId,
    NotificationContract.remindersChannelName,
    channelDescription:
        NotificationContract.remindersChannelDescription,
    importance: Importance.defaultImportance,
    priority: Priority.defaultPriority,
    actions: <AndroidNotificationAction>[
      AndroidNotificationAction(
        NotificationContract.openActionId,
        'Open',
        showsUserInterface: true,
      ),
      AndroidNotificationAction(
        NotificationContract.dismissActionId,
        'Dismiss',
      ),
    ],
  );

  const DarwinNotificationDetails darwin =
      DarwinNotificationDetails(
    categoryIdentifier: NotificationContract.reminderCategoryId,
  );

  const NotificationDetails details = NotificationDetails(
    android: android,
    iOS: darwin,
    macOS: darwin,
  );

  await notificationsPlugin.show(
    id: notificationId,
    title: title,
    body: body,
    notificationDetails: details,
    payload: payload.encode(),
  );
}

```

---

## Example 7 — Android notification permission

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

enum NotificationPermissionResult {
  granted,
  denied,
  notApplicable,
}

Future<NotificationPermissionResult>
    requestAndroidNotificationPermission() async {
  final AndroidFlutterLocalNotificationsPlugin? android =
      notificationsPlugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

  if (android == null) {
    return NotificationPermissionResult.notApplicable;
  }

  final bool? alreadyEnabled = await android.areNotificationsEnabled();
  if (alreadyEnabled == true) {
    return NotificationPermissionResult.granted;
  }

  final bool granted =
      await android.requestNotificationsPermission() ?? false;

  return granted
      ? NotificationPermissionResult.granted
      : NotificationPermissionResult.denied;
}

```

Call this **only from a product interaction where the user is enabling notifications**, not automatically from `main()`.

---

## Example 8 — Darwin permission request

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

Future<bool?> requestAppleNotificationPermission() async {
  final IOSFlutterLocalNotificationsPlugin? ios =
      notificationsPlugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();

  if (ios != null) {
    return ios.requestPermissions(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      critical: false,
    );
  }

  final MacOSFlutterLocalNotificationsPlugin? macOS =
      notificationsPlugin.resolvePlatformSpecificImplementation<
          MacOSFlutterLocalNotificationsPlugin>();

  if (macOS != null) {
    return macOS.requestPermissions(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      critical: false,
    );
  }

  return null;
}

```

Do not set `critical: true` unless the product has the required Apple entitlement and legitimate critical-alert use case.

---

## Example 9 — Web permission

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

Future<bool?> requestWebNotificationPermissionFromUserGesture() async {
  final WebFlutterLocalNotificationsPlugin? web =
      notificationsPlugin.resolvePlatformSpecificImplementation<
          WebFlutterLocalNotificationsPlugin>();

  if (web == null) {
    return null;
  }

  return web.requestNotificationsPermission();
}

```

Invoke this from a button/gesture handler. Browser permission prompts attempted automatically can be blocked.

---

## Example 10 — Timezone initialization

```
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

final class NotificationTimeZones {
  bool _initialized = false;

  Future<void> ensureInitialized({
    required Future<String> Function() readDeviceTimeZoneId,
  }) async {
    if (_initialized) {
      return;
    }

    tz_data.initializeTimeZones();

    final String zoneId = await readDeviceTimeZoneId();
    final tz.Location location = tz.getLocation(zoneId);
    tz.setLocalLocation(location);

    _initialized = true;
  }
}

```

The device-zone provider belongs outside `timezone`; use the repository's existing platform integration or an appropriate maintained dependency.

---

## Example 11 — Choose the least-powerful Android mode

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

enum ReminderTimingRequirement {
  approximate,
  approximateWhileIdle,
  exact,
  exactWhileIdle,
  alarmClock,
}

AndroidScheduleMode androidScheduleModeFor(
  ReminderTimingRequirement requirement,
) {
  return switch (requirement) {
    ReminderTimingRequirement.approximate =>
      AndroidScheduleMode.inexact,
    ReminderTimingRequirement.approximateWhileIdle =>
      AndroidScheduleMode.inexactAllowWhileIdle,
    ReminderTimingRequirement.exact =>
      AndroidScheduleMode.exact,
    ReminderTimingRequirement.exactWhileIdle =>
      AndroidScheduleMode.exactAllowWhileIdle,
    ReminderTimingRequirement.alarmClock =>
      AndroidScheduleMode.alarmClock,
  };
}

bool requiresExactAlarmAccess(AndroidScheduleMode mode) {
  return switch (mode) {
    AndroidScheduleMode.exact ||
    AndroidScheduleMode.exactAllowWhileIdle ||
    AndroidScheduleMode.alarmClock => true,
    AndroidScheduleMode.inexact ||
    AndroidScheduleMode.inexactAllowWhileIdle => false,
  };
}

Future<bool> canUseScheduleMode(AndroidScheduleMode mode) async {
  if (!requiresExactAlarmAccess(mode)) {
    return true;
  }

  final AndroidFlutterLocalNotificationsPlugin? android =
      notificationsPlugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

  if (android == null) {
    return true;
  }

  return await android.canScheduleExactNotifications() ?? false;
}

```

Do not silently request exact-alarm access from this policy function. The UI should explain the need and request access only when the user selects a genuinely exact feature.

---

## Example 12 — One-time zoned schedule

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;

Future<void> scheduleOneTimeReminder({
  required int notificationId,
  required DateTime instantUtc,
  required String title,
  required String body,
  required String reminderId,
  AndroidScheduleMode androidScheduleMode =
      AndroidScheduleMode.inexact,
}) async {
  if (!instantUtc.isUtc) {
    throw ArgumentError.value(
      instantUtc,
      'instantUtc',
      'One-time absolute schedules must be supplied as UTC.',
    );
  }

  final bool supported =
      await canUseScheduleMode(androidScheduleMode);
  if (!supported) {
    throw StateError(
      'The selected exact Android schedule mode is unavailable.',
    );
  }

  final tz.TZDateTime scheduledDate =
      tz.TZDateTime.from(instantUtc, tz.UTC);

  const NotificationDetails details = NotificationDetails(
    android: AndroidNotificationDetails(
      NotificationContract.remindersChannelId,
      NotificationContract.remindersChannelName,
      channelDescription:
          NotificationContract.remindersChannelDescription,
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
    ),
    iOS: DarwinNotificationDetails(
      categoryIdentifier: NotificationContract.reminderCategoryId,
    ),
    macOS: DarwinNotificationDetails(
      categoryIdentifier: NotificationContract.reminderCategoryId,
    ),
  );

  final NotificationPayload payload = NotificationPayload(
    version: 1,
    type: 'reminder',
    entityId: reminderId,
  );

  await notificationsPlugin.zonedSchedule(
    id: notificationId,
    title: title,
    body: body,
    scheduledDate: scheduledDate,
    notificationDetails: details,
    androidScheduleMode: androidScheduleMode,
    payload: payload.encode(),
  );
}

```

Do not call this on Linux or Web. The application capability layer should reject unsupported scheduling before reaching the plugin.

---

## Example 13 — DST-correct daily wall-clock reminder

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;

tz.TZDateTime nextDailyWallClockOccurrence({
  required tz.Location location,
  required int hour,
  required int minute,
  tz.TZDateTime? now,
}) {
  if (hour < 0 || hour > 23) {
    throw RangeError.range(hour, 0, 23, 'hour');
  }
  if (minute < 0 || minute > 59) {
    throw RangeError.range(minute, 0, 59, 'minute');
  }

  final tz.TZDateTime current =
      now ?? tz.TZDateTime.now(location);

  tz.TZDateTime candidate = tz.TZDateTime(
    location,
    current.year,
    current.month,
    current.day,
    hour,
    minute,
  );

  if (!candidate.isAfter(current)) {
    candidate = tz.TZDateTime(
      location,
      current.year,
      current.month,
      current.day + 1,
      hour,
      minute,
    );
  }

  return candidate;
}

Future<void> scheduleDailyWallClockReminder({
  required int notificationId,
  required String zoneId,
  required int hour,
  required int minute,
  required String reminderId,
  required String title,
  required String body,
}) async {
  final tz.Location location = tz.getLocation(zoneId);

  final tz.TZDateTime firstOccurrence =
      nextDailyWallClockOccurrence(
    location: location,
    hour: hour,
    minute: minute,
  );

  const NotificationDetails details = NotificationDetails(
    android: AndroidNotificationDetails(
      NotificationContract.remindersChannelId,
      NotificationContract.remindersChannelName,
      channelDescription:
          NotificationContract.remindersChannelDescription,
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
    ),
    iOS: DarwinNotificationDetails(
      categoryIdentifier: NotificationContract.reminderCategoryId,
    ),
    macOS: DarwinNotificationDetails(
      categoryIdentifier: NotificationContract.reminderCategoryId,
    ),
  );

  final NotificationPayload payload = NotificationPayload(
    version: 1,
    type: 'reminder',
    entityId: reminderId,
  );

  await notificationsPlugin.zonedSchedule(
    id: notificationId,
    title: title,
    body: body,
    scheduledDate: firstOccurrence,
    notificationDetails: details,
    androidScheduleMode: AndroidScheduleMode.inexact,
    matchDateTimeComponents: DateTimeComponents.time,
    payload: payload.encode(),
  );
}

```

This expresses “daily at local wall-clock time.” It does not model the schedule as an endless chain of 24-hour durations.

---

## Example 14 — Request exact-alarm access only after product justification

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

Future<bool?> requestExactAlarmAccessFromExplicitUserAction() async {
  final AndroidFlutterLocalNotificationsPlugin? android =
      notificationsPlugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

  if (android == null) {
    return null;
  }

  final bool currentlyAllowed =
      await android.canScheduleExactNotifications() ?? false;

  if (currentlyAllowed) {
    return true;
  }

  return android.requestExactAlarmsPermission();
}

```

The caller must offer an inexact fallback when product semantics allow it.

---

## Example 15 — Cancel/update with deterministic ID

```
Future<void> cancelReminder({
  required int persistedReminderNumber,
}) async {
  final int notificationId =
      NotificationContract.notificationIdForPersistedReminder(
    persistedReminderNumber,
  );

  await notificationsPlugin.cancel(id: notificationId);
}

Future<void> replaceOneTimeReminder({
  required int persistedReminderNumber,
  required DateTime instantUtc,
  required String reminderId,
  required String title,
  required String body,
}) async {
  final int notificationId =
      NotificationContract.notificationIdForPersistedReminder(
    persistedReminderNumber,
  );

  await notificationsPlugin.cancel(id: notificationId);

  await scheduleOneTimeReminder(
    notificationId: notificationId,
    instantUtc: instantUtc,
    title: title,
    body: body,
    reminderId: reminderId,
    androidScheduleMode: AndroidScheduleMode.inexact,
  );
}

```

---

## Example 16 — Graceful permission denial

```
enum ReminderDeliveryState {
  ready,
  notificationPermissionDenied,
  exactTimingUnavailable,
}

Future<ReminderDeliveryState> evaluateReminderDelivery({
  required bool exactTimingRequired,
}) async {
  final AndroidFlutterLocalNotificationsPlugin? android =
      notificationsPlugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

  if (android == null) {
    return ReminderDeliveryState.ready;
  }

  final bool notificationsEnabled =
      await android.areNotificationsEnabled() ?? true;

  if (!notificationsEnabled) {
    return ReminderDeliveryState.notificationPermissionDenied;
  }

  if (exactTimingRequired) {
    final bool exactAllowed =
        await android.canScheduleExactNotifications() ?? false;

    if (!exactAllowed) {
      return ReminderDeliveryState.exactTimingUnavailable;
    }
  }

  return ReminderDeliveryState.ready;
}

```

The reminder record can remain enabled in application state while delivery capability is clearly represented separately.

---

## Example 17 — Small reconciliation implementation

```
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final class ReminderRecord {
  const ReminderRecord({
    required this.notificationId,
    required this.reminderId,
    required this.enabled,
    required this.instantUtc,
    required this.title,
    required this.body,
  });

  final int notificationId;
  final String reminderId;
  final bool enabled;
  final DateTime instantUtc;
  final String title;
  final String body;
}

Future<void> reconcileOneTimeReminders({
  required List<ReminderRecord> reminders,
}) async {
  final List<PendingNotificationRequest> pending =
      await notificationsPlugin.pendingNotificationRequests();

  final Set<int> pendingIds =
      pending.map((PendingNotificationRequest item) => item.id).toSet();

  final Map<int, ReminderRecord> desired =
      <int, ReminderRecord>{
    for (final ReminderRecord reminder in reminders)
      if (reminder.enabled &&
          reminder.instantUtc.isAfter(DateTime.now().toUtc()))
        reminder.notificationId: reminder,
  };

  for (final int pendingId in pendingIds) {
    if (!desired.containsKey(pendingId)) {
      await notificationsPlugin.cancel(id: pendingId);
    }
  }

  for (final ReminderRecord reminder in desired.values) {
    if (pendingIds.contains(reminder.notificationId)) {
      continue;
    }

    await scheduleOneTimeReminder(
      notificationId: reminder.notificationId,
      instantUtc: reminder.instantUtc,
      title: reminder.title,
      body: reminder.body,
      reminderId: reminder.reminderId,
      androidScheduleMode: AndroidScheduleMode.inexact,
    );
  }
}

```

Use this style only on platforms where pending scheduling is supported. In a real production database, store schedule revision/fingerprint metadata so edits can be detected without assuming “same ID means unchanged.”

---

## Example 18 — Bad vs improved recurrence

Bad:

```
DateTime nextReminder(DateTime previous) {
  return previous.add(const Duration(hours: 24));
}

```

This means “24 elapsed hours later,” not necessarily “the same local clock time tomorrow.”

Improved:

```
import 'package:timezone/timezone.dart' as tz;

tz.TZDateTime nextReminderAtEightAm(
  tz.Location location,
  tz.TZDateTime now,
) {
  tz.TZDateTime candidate = tz.TZDateTime(
    location,
    now.year,
    now.month,
    now.day,
    8,
  );

  if (!candidate.isAfter(now)) {
    candidate = tz.TZDateTime(
      location,
      now.year,
      now.month,
      now.day + 1,
      8,
    );
  }

  return candidate;
}

```

Then schedule the recurrence with `DateTimeComponents.time`.

---

# 65. iOS AppDelegate rule

On iOS, ensure `UNUserNotificationCenter.current().delegate` is set in the application's current lifecycle configuration so foreground handling and responses reach the intended delegate.

If background notification-action callbacks need other Flutter plugins, register those plugins with the background Flutter engine using the plugin's documented registrant callback.

Do not copy an old AppDelegate snippet without checking whether the repository uses the modern Flutter `UIScene`lifecycle; the current plugin example migrated to `UIScene` in 21.0.0.

A conventional AppDelegate configuration for an application that owns its Flutter lifecycle is:

```
import Flutter
import UIKit
import UserNotifications
import flutter_local_notifications

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions:
      [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FlutterLocalNotificationsPlugin.setPluginRegistrantCallback {
      registry in
      GeneratedPluginRegistrant.register(with: registry)
    }

    UNUserNotificationCenter.current().delegate = self

    GeneratedPluginRegistrant.register(with: self)

    return super.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )
  }
}

```

Merge this responsibility with the repository's actual lifecycle rather than replacing an existing push-notification/AppDelegate integration.

---

# 66. Android manifest reference patterns

For an application that actually schedules and must recover schedules after reboot, the relevant pieces are:

```
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<application>
    <receiver
        android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver"
        android:exported="false" />

    <receiver
        android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver"
        android:exported="false">
        <intent-filter>
            <action android:name="android.intent.action.BOOT_COMPLETED" />
            <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            <action android:name="com.htc.intent.action.QUICKBOOT_POWERON" />
        </intent-filter>
    </receiver>
</application>

```

For Android action callbacks add only:

```
<application>
    <receiver
        android:name="com.dexterous.flutterlocalnotifications.ActionBroadcastReceiver"
        android:exported="false" />
</application>

```

For exact scheduling choose the appropriate policy path; do **not** add both thoughtlessly:

```
<uses-permission
    android:name="android.permission.SCHEDULE_EXACT_ALARM" />

```

or, only for qualifying applications:

```
<uses-permission
    android:name="android.permission.USE_EXACT_ALARM" />

```

These requirements follow the current plugin manifest documentation.

---

# 67. Build-configuration reference for Android 22.x

For a modern Kotlin DSL project, the relevant shape is:

```
android {
    compileSdk = 36

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }
}

dependencies {
    coreLibraryDesugaring(
        "com.android.tools:desugar_jdk_libs:2.1.4"
    )
}

```

Do not overwrite a repository's newer compatible Android toolchain with these exact numbers. These represent the current package baseline/examples; future or already-newer application configuration should remain newer when compatible.

---

# 68. Migration guidance

Before a major plugin upgrade:

1. read the changelog between the installed and target versions
2. inspect the target release/tag README
3. run analyzer before modifying call sites
4. audit Android manifest changes
5. audit Android build requirements
6. audit deployment targets
7. inspect callback signatures
8. inspect scheduling semantics
9. inspect platform implementation changes
10. test already-installed Android channel behavior
11. test already-persisted schedules
12. test cold-start notification routing.

Important historical transitions include:

- migration from naïve/deprecated `schedule` APIs to timezone-based scheduling
- removal of daily/weekly convenience APIs and `Time`
- replacement/removal of `androidAllowWhileIdle`
- Android 13 runtime notification permission
- Android 14 exact-alarm changes
- plugin 16 manifest minimization
- later support for exact-alarm request APIs
- removal of old iOS callback APIs
- named-parameter migration in 20
- minimum Flutter/Dart/OS upgrades in 21
- UIScene example migration
- Web support in 22
- notification-settings API in 22.3.

Never silently upgrade notification code based only on a current blog/tutorial.

---

# 69. Local notifications and push packages

If `firebase_messaging` or another push layer already exists:

- do not create a second routing protocol unnecessarily
- inspect existing channel IDs
- inspect AppDelegate/delegate ownership
- inspect notification tap/deep-link handling
- determine whether push and local notifications share categories/actions
- ensure initialization order does not overwrite handlers.

The package states that historical Firebase Messaging callback compatibility issues were resolved in modern releases, but the repository must still combine both systems intentionally.

---

# 70. Reliability checklist

Before shipping:

-  installed plugin version inspected
-  current API syntax matches installed version
-  plugin initialized once
-  supported target platforms identified
-  platform-specific unsupported features handled
-  notification permission state handled
-  denied permission does not break application business logic
-  Android channel IDs are stable
-  channel importance/sound migration considered
-  deterministic notification IDs used
-  exact alarms used only where justified
-  exact-alarm access checked where needed
-  timezone database initialized before zoned scheduling
-  correct named local zone resolved
-  DST semantics tested
-  Android reboot behavior configured if required
-  Android force-stop behavior not misrepresented
-  cold-start launch handling implemented
-  foreground response handled
-  background action entry point preserved where needed
-  no background callback depends on `BuildContext`
-  deleted reminders cancel notifications
-  edited reminders replace schedules
-  stale schedules can be reconciled
-  payload parser validates input
-  route re-checks current auth/access
-  schedule volume is bounded
-  release builds retain icon/sound resources
-  real-device lifecycle testing passed.

---

# 71. Performance checklist

-  plugin initialized once
-  channels are stable and not generated per entity
-  pending notifications are not polled unnecessarily
-  future schedule count is bounded
-  unchanged reminders are not rescheduled
-  exact scheduling has documented product justification
-  idle-wakeup modes are minimized
-  progress updates are throttled
-  rich media is cached/bounded
-  large assets are not synchronously downloaded on critical path
-  timezone database initializes once
-  background callbacks avoid full application bootstrap
-  payloads stay small
-  reconciliation is event-driven rather than widget-driven.

---

# 72. Security/privacy checklist

-  no secrets in payloads
-  no authorization decisions based solely on payload
-  payload schema is versioned/validated
-  unknown payload types are rejected
-  malformed payloads fail safely
-  stale/deleted entities are handled
-  notification activation re-checks authentication
-  notification activation re-checks authorization
-  lock-screen sensitivity has been reviewed
-  notification logs omit private body/payload content
-  background actions re-check current business rules
-  route targets are allowlisted
-  action IDs are stable internal identifiers.

---

# 73. Implementation workflow

## Step 1 — Inspect

Read dependency versions, platforms, manifests, build configuration, routing, persistence, timezone, push and background infrastructure.

## Step 2 — Classify requirement

Answer:

```
Local or remote trigger?
Notification or actual background work?
Immediate or scheduled?
Exact or approximate?
Why exact?
One-time or recurring?
Wall-clock or elapsed-time recurrence?
Must survive Android reboot?
What happens when permission is denied?
Any action?
Can activation happen while terminated?
Does background work actually need to execute?
Sensitive content?

```

## Step 3 — Verify platform capabilities

Do not design a cross-platform abstraction until unsupported platforms are known.

## Step 4 — Design identity

Choose:

```
stable channel
notification integer ID
payload schema
category ID
action IDs

```

## Step 5 — Configure only required platform features

Do not add speculative permissions/receivers/services.

## Step 6 — Initialize once

Register categories and response callbacks.

## Step 7 — Handle permissions contextually

Separate user intent from current OS delivery capability.

## Step 8 — Implement scheduling

Use `TZDateTime` for wall-clock semantics and the least-powerful Android mode.

## Step 9 — Implement lifecycle interaction

Handle foreground, background, and cold-start paths deliberately.

## Step 10 — Persist business intent

The reminder database, not the OS notification queue, is authoritative.

## Step 11 — Reconcile

Cancel stale schedules and register changed/missing ones.

## Step 12 — Optimize

Review exact alarms, schedule count, startup queries, media, progress updates, and background callback cost.

## Step 13 — Validate statically

Run the repository's formatter, analyzer, and relevant tests.

## Step 14 — Validate on real devices

Exercise permission, lifecycle, timezones, DST, reboot, channel migration, and release-build behavior.

---

# 74. Completion criteria

A notification feature is complete only when:

- current plugin API/version compatibility is verified
- platform setup is correct
- initialization occurs once
- Android channel architecture is intentional
- channel IDs are stable
- notification IDs are deterministic
- runtime permissions are handled
- exact alarms are avoided or justified
- exact access is handled when needed
- timezone database is initialized where needed
- device/named timezone selection is correct
- recurrence survives DST according to product semantics
- Android reboot behavior is configured if required
- reminder edits replace schedules
- reminder deletion cancels schedules
- cold-start notification launch is handled
- foreground interaction is handled
- supported background actions are safe
- payload validation exists
- payloads contain no secrets
- business correctness does not depend on notification execution
- unsupported platform behavior is explicit
- pending schedule volume is bounded
- unnecessary platform queries/rescheduling are absent
- release resources work
- relevant unit/integration tests pass
- real-device lifecycle testing passes
- analyzer passes.

---

# 75. Final decision rules

When uncertain, prefer these choices:

```
locally known event
    → local notification

server-originated event
    → push notification

business/background execution
    → background task/service/server job

ordinary reminder
    → inexact schedule

exact user alarm requirement
    → exact schedule after permission/policy analysis

daily at 08:00
    → named timezone + calendar recurrence

every 24 elapsed hours
    → interval recurrence

durable reminder
    → database record + OS notification derived from it

notification tap
    → validated payload → authoritative fetch → auth check → route

large future reminder set
    → bounded/rolling scheduling where semantics allow

permission denied
    → graceful product state, not application failure

```

---

# 76. Authoritative source references

Primary sources used for this skill:

- Current `flutter_local_notifications` pub.dev documentation, release information, platform support, setup, limitations, Web support, Android build/manifest configuration, channel behavior and API guidance.
- Current package changelog and migration history.
- Official plugin repository/federated package layout.
- Official package API reference for current plugin methods and Android schedule modes.
- Official package Darwin initialization/category/action API.
- Official Android notification-channel guidance.
- Official Android notification runtime-permission guidance.
- Official Android alarm/exact-alarm guidance and current restrictions.
- Official Android stopped-package lifecycle behavior.
- Official Apple User Notifications authorization, delegate, calendar-trigger and critical-alert guidance.
- Official Windows scheduled-notification documentation for platform scheduling limits/behavior.

When future implementation behavior is ambiguous, prefer the installed package tag, its example application, current platform documentation, and actual real-device behavior over historical tutorials.

**Non-negotiable engineering principle:** notification delivery is a user-facing signal; it is never proof that business logic executed.