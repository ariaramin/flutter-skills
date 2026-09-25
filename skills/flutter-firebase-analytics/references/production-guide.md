# Firebase Analytics for Flutter

Validated: 2026-08-11

Published reference package:

```yaml
firebase_analytics: 12.4.5
```

At validation time, FlutterFire repository `main` had already moved beyond the published package. Always inspect the project's `pubspec.lock`, the current pub.dev release, and its changelog before relying on version-sensitive behavior.

Official package targets:

- Android
- iOS
- macOS
- Web

Windows is not an officially supported target for `firebase_analytics`.

---

## Purpose

This skill governs production implementation, architecture, review, debugging, optimization, migration, privacy analysis, and schema design for Firebase Analytics / Google Analytics for Firebase in Flutter applications.

Use it to reason about:

- Firebase Analytics installation
- Firebase Core integration
- product-event design
- recommended GA4 events
- custom events
- event parameters
- user properties
- authenticated user identity
- consent and collection control
- advertising-related Analytics configuration
- screen/navigation measurement
- ecommerce instrumentation
- purchase/refund integrity
- Analytics performance
- startup impact
- event volume
- reporting cardinality
- DebugView
- BigQuery export
- custom dimensions/metrics
- development/staging/production separation
- testability
- analytics schema evolution
- cross-platform differences

Firebase Analytics is product measurement infrastructure.

It is not:

- an application log sink
- a crash-reporting service
- a performance profiler
- an accounting ledger
- a backend audit log
- an authorization system
- a durable command queue

---

# Rule Language

This skill uses:

- **MUST** — required for correctness, security/privacy policy compliance, or documented platform/package behavior.
- **SHOULD** — strong production engineering recommendation.
- **MAY** — optional and product-dependent.
- **Engineering recommendation** — reasoning derived from documented SDK/GA behavior rather than an explicit Firebase API requirement.

When official FlutterFire behavior differs from the underlying native Firebase SDK, follow the currently installed Flutter package unless deliberately implementing native platform code.

---

# When to Use This Skill

Use this skill when asked to:

- install Firebase Analytics
- add product analytics
- design an event taxonomy
- implement `logEvent`
- use recommended Analytics events
- track login/sign-up/search/share/tutorial flows
- track navigation or screen views
- integrate `FirebaseAnalyticsObserver`
- implement Router 2.0 analytics
- track tabs or nested navigators
- implement ecommerce analytics
- track purchases/refunds
- implement `setUserId`
- implement user properties
- implement consent
- disable or enable analytics collection
- optimize Analytics startup/runtime overhead
- fix duplicate events
- fix duplicate purchases
- debug missing events
- configure DebugView
- review PII/privacy risks
- prepare Analytics data for BigQuery
- design custom dimensions
- separate dev/staging/prod Analytics
- review an existing Analytics architecture
- migrate an older FlutterFire Analytics implementation

---

# Core Principles

1. **Analytics observes product behavior; it SHOULD NOT control product behavior.**

2. **Prefer GA4 recommended events when their documented semantics match the product action.**

3. **Event semantics are an application contract. Keep them stable and centrally governed.**

4. **Never generate event names dynamically from IDs, timestamps, routes, or user data.**

5. **Never emit analytics from `build()` or other rebuild-driven code paths.**

6. **Do not use Firebase Analytics as a general-purpose logging system.**

7. **Do not send PII or sensitive values merely because an API accepts a `String`.**

8. **A user ID is not an email address. Use a stable privacy-appropriate opaque application identifier.**

9. **Treat user properties as persistent segmentation dimensions, not arbitrary key/value storage.**

10. **Do not log high-frequency implementation noise such as frames, scroll positions, rebuilds, keystrokes, or individual network requests.**

11. **Do not make navigation, checkout, authentication, or other business operations depend on an Analytics call succeeding.**

12. **Use a single application-scoped Analytics service rather than scattering Firebase calls throughout widgets.**

13. **Avoid duplicate screen instrumentation. Choose one screen-tracking policy.**

14. **Analytics purchase events are measurement, not financial truth.**

15. **Use stable transaction IDs and make purchase instrumentation idempotent.**

16. **Collection controls, consent state, advertising measurement, and Apple ATT are distinct concepts.**

17. **Do not invent a custom offline Analytics queue unless a documented application requirement proves that Firebase's SDK buffering is insufficient.**

18. **Do not register high-cardinality parameters as custom dimensions unless reporting genuinely requires them.**

19. **Keep development and QA traffic out of production Analytics whenever practical.**

20. **Revalidate platform/API parity on every meaningful `firebase_analytics` upgrade.**

---

# Package Architecture

The conceptual flow is:

```text
Flutter application
      |
      v
firebase_analytics Dart API
      |
      v
FlutterFire platform implementation
      |
      +--> Android Firebase Analytics SDK
      |
      +--> Apple Firebase Analytics SDK
      |
      +--> Firebase JavaScript / Google Analytics SDK
      |
      v
Google Analytics for Firebase / GA4 processing
      |
      +--> Firebase / Analytics reports
      +--> Realtime / DebugView
      +--> audiences
      +--> attribution integrations
      +--> BigQuery export
```

`firebase_analytics` depends on `firebase_core`.

The default Analytics instance assumes the default Firebase application has already been initialized.

Typical access:

```dart
final FirebaseAnalytics analytics = FirebaseAnalytics.instance;
```

The plugin bridges Analytics operations to the platform SDK. It does not synchronously upload each event to Google's servers.

Native Firebase Analytics SDKs buffer/batch Analytics traffic and upload asynchronously.

Therefore:

```text
await analytics.logEvent(...)
```

does **not** mean:

```text
the event is now visible in GA reports
```

and it must not be treated as a delivery acknowledgement.

---

# Platform Capability Matrix

The following describes the current Flutter package behavior around `12.4.5`.

| Capability | Android | iOS | macOS | Web |
|---|---|---|---|---|
| Package target | Yes | Yes | Yes, FlutterFire marks Analytics support as beta | Yes |
| Core event logging | Yes | Yes | Yes | Yes |
| Recommended event helpers | Yes | Yes | Yes where underlying feature exists | Yes where supported by Web SDK |
| `setAnalyticsCollectionEnabled` | Yes | Yes | Yes | Yes |
| `setUserId` | Yes | Yes | Yes | Yes |
| `setUserProperty` | Yes | Yes | Yes | Yes |
| `setConsent` | Analytics/ad consent categories documented for Android | Analytics/ad consent categories documented | Do not assume parity; revalidate | Yes; includes additional Web storage consent categories |
| `appInstanceId` | Yes | Yes | Yes | **Unsupported in current Flutter Web implementation** |
| `getSessionId()` | Yes | Yes | Yes | **Unsupported** |
| `resetAnalyticsData()` | Yes | Yes | Yes | **Unsupported** |
| `setDefaultEventParameters()` | Yes | Yes | Yes | **Unsupported** |
| `setSessionTimeoutDuration()` | Current Flutter implementation forwards on Android | Current Flutter wrapper does not forward | Current Flutter wrapper does not forward | **Unsupported** |
| `FirebaseAnalyticsObserver` | Flutter navigation layer | Flutter navigation layer | Flutter navigation layer | Flutter navigation layer |
| DebugView documented setup | Yes | Apple/Xcode debug workflow | Revalidate current Apple/macOS docs | Yes |
| Multi-Firebase-app Analytics | Do not assume | Do not assume | Do not assume | FlutterFire explicitly supports multiple app instances on Web |
| `AnalyticsCallOptions` | Ignored/not relevant | Ignored/not relevant | Ignored/not relevant | Web only |

**MUST NOT infer API parity from native Firebase SDK documentation.**

For example, the native Apple Analytics SDK has functionality that the current Flutter method-channel implementation does not necessarily expose.

---

# Current Compatibility Baseline

At the validated release line:

```text
firebase_analytics: 12.4.5
Dart:               ^3.6.0
Flutter:            >=3.27.0
```

FlutterFire's compatibility matrix associated this release line with:

```text
Firebase Android SDK: 34.15.x
Firebase Apple SDK:   12.15.x
Firebase Web SDK:     12.15.x
```

These values are version-sensitive.

Current Firebase Apple 12.x SDKs require modern Apple deployment targets. Do not preserve an old application's historic deployment target merely because an old FlutterFire tutorial lists it.

Before changing platform targets:

1. inspect the installed FlutterFire version
2. inspect current Firebase native SDK requirements
3. inspect the application's actual Gradle/Pod/SPM resolution
4. build all release targets

---

# Installation

Add Firebase Core and Analytics:

```shell
flutter pub add firebase_core
flutter pub add firebase_analytics
```

Configure Firebase:

```shell
flutterfire configure
```

Use the generated configuration:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/widgets.dart';

import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(const MyApp());
}
```

Analytics does not require a separate:

```dart
await FirebaseAnalytics.initialize();
```

There is no such current FlutterFire API.

Do not invent one.

---

# Platform Configuration

## Android

Required:

- Firebase Android application registered
- normal Firebase project configuration generated through FlutterFire
- Firebase Core initialized
- Google/Firebase Gradle integration produced by the current Flutter template/FlutterFire configuration
- application compatible with current Firebase Android SDK requirements

Do not manually copy Gradle snippets from old FlutterFire tutorials before comparing them to the current Flutter template.

Firebase Analytics automatically integrates with Android application lifecycle measurement once correctly configured.

### Initial collection configuration

If product/privacy requirements require Analytics to start disabled before Dart executes, current Firebase Android configuration supports manifest metadata such as:

```xml
<meta-data
    android:name="firebase_analytics_collection_enabled"
    android:value="false" />
```

Runtime collection state may later be changed with:

```dart
await FirebaseAnalytics.instance
    .setAnalyticsCollectionEnabled(true);
```

The runtime setting persists.

Firebase also documents a permanent deactivation option:

```xml
<meta-data
    android:name="firebase_analytics_collection_deactivated"
    android:value="true" />
```

Do not use permanent deactivation when the application intends to enable collection after consent.

Advertising-ID collection has a separate Android configuration. Treat that separately from general Analytics collection.

---

## iOS

Required:

- Firebase iOS application registered
- current Firebase Apple configuration
- Firebase Core initialized
- current supported iOS deployment target
- Firebase Analytics native dependency linked through FlutterFire

No special "start Analytics" call is necessary.

### Initial collection configuration

If collection must be disabled before Flutter/Dart code executes, Firebase Apple Analytics supports initial configuration through `Info.plist`.

Example:

```xml
<key>FIREBASE_ANALYTICS_COLLECTION_ENABLED</key>
<false/>
```

Later:

```dart
await FirebaseAnalytics.instance
    .setAnalyticsCollectionEnabled(true);
```

The runtime setting is persistent.

A permanent deactivation key also exists. Do not use it when runtime consent-driven enablement is required.

### IDFA-free Analytics

Current Firebase Apple SDKs can use Analytics without IDFA support.

Recent FlutterFire Analytics releases specifically updated dependency guidance around `FirebaseAnalyticsWithoutAdIdSupport`.

Therefore:

**MUST NOT assume Firebase Analytics automatically requires ATT/IDFA merely because the application uses Analytics.**

Advertising attribution and basic product analytics are separate design decisions.

When an application needs advertising identifiers or cross-company tracking behavior, evaluate:

- current Apple ATT requirements
- current Firebase Analytics advertising documentation
- product consent requirements
- current FlutterFire Apple dependency configuration

---

## macOS

`firebase_analytics` declares macOS support, while FlutterFire's compatibility documentation classifies Analytics support on macOS as beta.

Therefore:

- MUST build/test macOS separately
- MUST NOT assume every Android/iOS API has macOS parity
- SHOULD revalidate current FlutterFire/native Firebase Apple documentation before using consent, advertising, session, or advanced measurement APIs on macOS

Current Firebase Apple SDK deployment requirements can be stricter than historic plugin podspec declarations.

Do not derive the effective supported macOS version solely from an old plugin podspec.

---

## Web

Required:

- Firebase Web app
- Firebase Web options generated/configured correctly
- Google Analytics enabled for the Firebase project/property
- valid `measurementId`
- supported browser/environment

Use:

```dart
await Firebase.initializeApp(
  options: DefaultFirebaseOptions.currentPlatform,
);
```

Do not manually duplicate the Firebase Web config when FlutterFire already generates it.

### Web limitations

Do not call the following without a platform guard in the current package:

```dart
FirebaseAnalytics.instance.appInstanceId;
FirebaseAnalytics.instance.getSessionId();
FirebaseAnalytics.instance.resetAnalyticsData();
FirebaseAnalytics.instance.setDefaultEventParameters(...);
FirebaseAnalytics.instance.setSessionTimeoutDuration(...);
```

The current Flutter Web implementation reports these as unsupported.

Use:

```dart
final bool supported =
    await FirebaseAnalytics.instance.isSupported();
```

where an actual browser support check is useful.

Browser privacy controls, content blockers, cookie restrictions, and network blocking can prevent or alter Analytics collection.

Analytics must therefore never be business-critical client state.

---

# Initialization Strategy

## Before `runApp`

Normally:

```text
WidgetsFlutterBinding.ensureInitialized()
Firebase.initializeApp()
runApp()
```

That is sufficient.

Do not await:

- arbitrary Analytics events
- user-property synchronization
- route observer creation
- DebugView setup
- custom event-schema initialization
- remote Analytics metadata
- BigQuery-related work

before the first frame.

## Exception: pre-consent collection control

If the product must guarantee that Analytics does not collect before consent, configure the correct native/Web initial collection or consent state before automatic collection can begin.

A call such as:

```dart
await analytics.setAnalyticsCollectionEnabled(false);
```

performed after the SDK has already initialized is not equivalent to an initial native configuration that prevents earlier automatic collection.

The correct consent model is product/jurisdiction-specific and requires product/legal review.

---

# Analytics Service Lifecycle

Use one application-scoped Analytics service.

Good:

```text
application DI container
    |
    +--> one AppAnalytics
            |
            +--> FirebaseAnalytics.instance
```

Avoid:

```text
Widget A -> FirebaseAnalytics.instance
Widget B -> FirebaseAnalytics.instance
Bloc C   -> FirebaseAnalytics.instance
Repo D   -> FirebaseAnalytics.instance
```

The problem with direct access everywhere is not primarily that `FirebaseAnalytics.instance` itself is expensive.

The larger problems are:

- inconsistent event names
- duplicate instrumentation
- privacy review difficulty
- impossible schema governance
- poor testability
- provider lock-in
- scattered error handling

---

# Recommended Architecture

For a small application:

```text
lib/
  analytics/
    analytics_service.dart
```

may be enough.

For a medium/large application:

```text
lib/
  analytics/
    analytics_service.dart
    analytics_event.dart
    analytics_route_tracker.dart
    analytics_identity.dart
```

Possible flow:

```text
User/Product Action
        |
        v
Application/Domain boundary
        |
        v
Typed Analytics Event
        |
        v
Analytics service
        |
        v
FirebaseAnalytics
```

Do not create repositories/interfaces/factories purely for ceremony.

Add abstraction when it provides:

- semantic consistency
- testability
- privacy control
- centralized provider mapping
- multi-team schema governance

---

# Typed Analytics Events

Typed events are useful when:

- many developers emit analytics
- the app has dozens of product events
- multiple platforms/apps share a schema
- events evolve over time
- provider migration is plausible
- privacy review is required
- compile-time consistency matters

They may be overengineering for a tiny app with five stable events.

## Production pattern

```dart
import 'dart:async';

import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';

sealed class AppAnalyticsEvent {
  const AppAnalyticsEvent();
}

final class LoginSucceeded extends AppAnalyticsEvent {
  const LoginSucceeded({
    required this.method,
  });

  final String method;
}

final class ProductViewed extends AppAnalyticsEvent {
  const ProductViewed({
    required this.productId,
    required this.productName,
    required this.currency,
    required this.price,
  });

  final String productId;
  final String productName;
  final String currency;
  final double price;
}

final class FilterApplied extends AppAnalyticsEvent {
  const FilterApplied({
    required this.filterType,
    required this.resultCount,
  });

  final String filterType;
  final int resultCount;
}

abstract interface class AppAnalytics {
  void track(AppAnalyticsEvent event);

  Future<void> setAuthenticatedUser(String? opaqueUserId);
}

final class FirebaseAppAnalytics implements AppAnalytics {
  FirebaseAppAnalytics({
    FirebaseAnalytics? analytics,
    void Function(Object error, StackTrace stackTrace)? onError,
  })  : _analytics = analytics ?? FirebaseAnalytics.instance,
        _onError = onError;

  final FirebaseAnalytics _analytics;
  final void Function(Object error, StackTrace stackTrace)? _onError;

  @override
  void track(AppAnalyticsEvent event) {
    unawaited(_trackSafely(event));
  }

  Future<void> _trackSafely(AppAnalyticsEvent event) async {
    try {
      switch (event) {
        case LoginSucceeded(:final method):
          await _analytics.logLogin(
            loginMethod: method,
          );

        case ProductViewed(
            :final productId,
            :final productName,
            :final currency,
            :final price,
          ):
          await _analytics.logViewItem(
            currency: currency,
            value: price,
            items: <AnalyticsEventItem>[
              AnalyticsEventItem(
                itemId: productId,
                itemName: productName,
                price: price,
                quantity: 1,
              ),
            ],
          );

        case FilterApplied(
            :final filterType,
            :final resultCount,
          ):
          await _analytics.logEvent(
            name: 'filter_applied',
            parameters: <String, Object>{
              'filter_type': filterType,
              'result_count': resultCount,
            },
          );
      }
    } catch (error, stackTrace) {
      _onError?.call(error, stackTrace);

      if (kDebugMode) {
        debugPrint(
          'Analytics event failed: $error\n$stackTrace',
        );
      }
    }
  }

  @override
  Future<void> setAuthenticatedUser(
    String? opaqueUserId,
  ) async {
    await _analytics.setUserId(
      id: opaqueUserId,
    );
  }
}
```

The application can track without blocking a user action:

```dart
analytics.track(
  const LoginSucceeded(
    method: 'password',
  ),
);
```

Do not add analytics completion to the success criteria of authentication.

---

# Event Taxonomy

A production Analytics schema SHOULD document for each event:

```text
event name
business meaning
exact trigger condition
owner/team
required parameters
optional parameters
parameter types
privacy classification
expected cardinality
recommended/custom GA status
custom dimension registrations
schema migration notes
```

Example:

```text
Event:
  filter_applied

Trigger:
  User confirms a product-list filter.

Required params:
  filter_type: String
  result_count: int

Do not include:
  user_id
  timestamp
  raw query text
  route URL
```

---

# Event Naming Rules

Current FlutterFire/GA rules include:

- event names are case-sensitive
- use at most 40 characters
- begin with an alphabetic character
- use alphanumeric characters and underscores
- do not use reserved prefixes:
  - `firebase_`
  - `google_`
  - `ga_`

Prefer:

```text
filter_applied
document_shared
workspace_created
checkout_error_shown
```

Avoid:

```text
FilterApplied
filter-applied
filter applied
product_viewed_182736
purchase_2026_08_11
john_example_com_clicked
```

Use one naming convention across the product.

`snake_case` aligns naturally with GA's recommended event names.

---

# Never Use Dynamic Event Names

Bad:

```dart
await analytics.logEvent(
  name: 'product_viewed_$productId',
);
```

If 50,000 products are viewed, this creates thousands of event schemas.

Preferred:

```dart
await analytics.logEvent(
  name: 'product_viewed',
  parameters: <String, Object>{
    'product_id': productId,
  },
);
```

Better still, if the semantics map to GA ecommerce:

```dart
await analytics.logViewItem(
  items: <AnalyticsEventItem>[
    AnalyticsEventItem(
      itemId: productId,
      itemName: productName,
    ),
  ],
);
```

---

# Recommended Events

Prefer Google's documented recommended event names/helpers whenever their meaning matches.

Examples currently exposed by FlutterFire include:

```text
login
sign_up
search
select_content
share
tutorial_begin
tutorial_complete
join_group
earn_virtual_currency
spend_virtual_currency
```

Ecommerce-related helpers include:

```text
view_item_list
select_item
view_item
add_to_cart
remove_from_cart
add_to_wishlist
view_cart
begin_checkout
add_shipping_info
add_payment_info
purchase
refund
view_promotion
select_promotion
```

Other current Flutter helpers include gaming and advertising-related event APIs.

Do not invent:

```text
user_logged_in
registration_completed
product_checkout_started
order_bought
```

if the documented semantics are exactly:

```text
login
sign_up
begin_checkout
purchase
```

A custom event is appropriate when no recommended event accurately represents the behavior.

Never force an unrelated product action into a recommended event merely to obtain a predefined report.

Semantic correctness comes first.

---

# Why Recommended Events Matter

Recommended GA4 events provide standardized semantics understood by Google Analytics.

Depending on the event family, they can improve compatibility with:

- predefined reports
- ecommerce reporting
- audiences
- attribution
- advertising integrations
- downstream GA tooling

A custom event named:

```text
order_success
```

does not automatically become equivalent to GA's documented:

```text
purchase
```

---

# Event Limits

Treat limits as schema constraints, not targets.

Current standard GA/FlutterFire guidance includes approximately:

```text
Event name length:                40 characters
Parameter name length:            40 characters
Parameters per event:             25
String parameter value length:    generally 100 characters
User properties:                  25
User property name length:        24 characters
```

GA app data streams also have a bounded distinct-event-name model; Web collection differs.

Limits and Analytics 360 allowances can change.

**MUST revalidate exact limits before designing near them.**

A well-designed product taxonomy should be nowhere close to exhausting event-name limits.

---

# Parameter Types

For normal custom Flutter `logEvent()` parameters, use primitive Analytics-compatible values:

```dart
await analytics.logEvent(
  name: 'filter_applied',
  parameters: <String, Object>{
    'filter_type': 'category',
    'result_count': 12,
    'load_seconds': 0.42,
  },
);
```

Use:

- `String`
- integer/numeric values
- floating-point/numeric values

Do not pass arbitrary Dart objects.

Bad:

```dart
await analytics.logEvent(
  name: 'product_viewed',
  parameters: <String, Object>{
    'product': product,
    'tags': tags,
    'metadata': metadata,
  },
);
```

Do not treat `bool` as a universally valid generic custom-event parameter just because some specialized Analytics APIs internally expose boolean concepts.

When modeling a boolean custom dimension, choose an intentionally documented representation such as:

```text
"true" / "false"
```

or a numeric convention if the measurement plan requires it.

Keep that representation stable.

---

# Null Values

Do not send `null` as a custom event parameter.

Build the parameter map from meaningful non-null values.

Example:

```dart
final Map<String, Object> parameters = <String, Object>{
  'source': source,
  if (campaign != null) 'campaign': campaign,
};

await analytics.logEvent(
  name: 'content_opened',
  parameters: parameters,
);
```

Do not send placeholder strings such as:

```text
"null"
"undefined"
"N/A"
```

unless those values have explicit analytical meaning.

---

# Parameter Naming

Good:

```text
content_type
result_count
plan_tier
sort_order
payment_type
```

Bad:

```text
param1
metadata
extra
payload
data
info
```

Each parameter should have one stable semantic definition.

Do not reuse:

```text
source
```

to mean:

- marketing campaign source in one event
- widget source in another
- API source in another

unless that shared semantic contract is intentional.

---

# High Cardinality

High-cardinality dimensions can reduce GA report usability and cause aggregated `(other)` rows.

Google currently warns that dimensions exceeding roughly 500 unique values in a day can be considered high-cardinality.

Treat these values carefully:

- UUIDs
- database primary keys
- timestamps
- complete URLs
- filenames with unique IDs
- raw search text
- arbitrary error messages
- stack traces
- generated strings
- user-entered content

## Rule

A parameter can sometimes be useful in BigQuery without being appropriate as a registered custom dimension.

Example:

```text
transaction_id
```

can be necessary for purchase integrity but should not be turned into a normal UI reporting dimension merely because it exists.

---

# UUIDs and Resource IDs

Do not automatically forbid IDs.

Some recommended event schemas legitimately require IDs, for example:

```text
item_id
transaction_id
promotion_id
```

The rule is:

**Use identifiers where they are semantically required, but do not register highly unique identifiers as ordinary custom dimensions unless there is a concrete analytical need.**

Never encode IDs into event names.

---

# Timestamps

Do not add:

```dart
'timestamp': DateTime.now().millisecondsSinceEpoch
```

to every event.

Firebase/GA already timestamps events.

A custom timestamp may be appropriate only when the event describes a separate domain time that differs materially from measurement time.

Even then, avoid registering unique timestamps as custom dimensions.

---

# URLs

Full URLs often contain:

- IDs
- query parameters
- campaign data
- user-entered values
- potentially PII

Prefer normalized route/content semantics:

```text
screen_name = "product_detail"
content_type = "product"
```

rather than:

```text
https://example.com/product/abc-123?email=user@example.com
```

---

# Search Terms

GA defines a recommended `search` event.

Search terms can be valuable product analytics, but raw search text can also contain:

- names
- emails
- phone numbers
- health information
- addresses
- private content

Before logging search text:

1. determine whether the product needs it
2. apply the product's privacy policy
3. prevent known PII/sensitive input from being transmitted
4. consider lower-cardinality alternatives such as category or intent classification

Do not blindly forward every search box value.

---

# Error Messages

Do not use Firebase Analytics as:

```text
log_error(error.toString())
```

Errors frequently contain:

- URLs
- IDs
- PII
- backend details
- arbitrary high-cardinality strings

Use:

- Crashlytics for crashes/exceptions
- application logs for diagnostics
- backend observability for server failures
- Performance Monitoring for latency/performance

Analytics may record a stable product-semantic event such as:

```text
checkout_error_shown
```

with a bounded category:

```text
reason = "payment_declined"
```

rather than the raw exception.

---

# Schema Versioning

Do not version every event automatically.

For stable semantics, preserve the event name.

Example:

```text
purchase
```

must not become:

```text
purchase_v2
purchase_v3
```

because a parameter was added.

Add optional parameters in a backward-compatible way when semantics remain unchanged.

Use a new event name only when the business meaning materially changes.

For complex internal custom contracts, a bounded parameter such as:

```text
schema_version = 2
```

MAY be useful.

Do not create a new version parameter that increments for every app release.

---

# Schema Migration Strategy

When changing an event:

## Safe addition

```text
Before:
  document_shared
    method

After:
  document_shared
    method
    content_type
```

Usually safe if old consumers tolerate the missing field.

## Parameter rename

Avoid immediate destructive rename.

Possible staged migration:

```text
Release A:
  send old_name and new_name

Reporting:
  update warehouse/dashboard consumers

Release B:
  stop old_name
```

Only do dual-write where its reporting cost is justified.

## Semantic change

If the actual action changes meaning, create a new event.

Do not silently redefine an old event.

---

# Event Ownership

For multi-team applications, define ownership:

```text
Event:       purchase
Owner:       Commerce
Consumers:   Growth, Finance analytics, BI
PII review:  Approved
Warehouse:   Critical
```

A schema review should be required before teams create dozens of custom events independently.

---

# Logging a Custom Event

```dart
import 'package:firebase_analytics/firebase_analytics.dart';

Future<void> logFilterApplied(
  FirebaseAnalytics analytics, {
  required String filterType,
  required int resultCount,
}) async {
  await analytics.logEvent(
    name: 'filter_applied',
    parameters: <String, Object>{
      'filter_type': filterType,
      'result_count': resultCount,
    },
  );
}
```

Keep payload mapping lightweight.

Do not serialize an entire domain model just to extract two Analytics fields.

---

# Fire-and-Forget vs Awaiting

Most Analytics methods return `Future`.

That does not mean application business flows should wait for Analytics reporting.

## Normally fire-and-forget

A user taps:

```text
Continue
```

Correct flow:

```text
perform product action
record Analytics observation asynchronously
navigate
```

Do not:

```text
tap
 -> wait for analytics
 -> only navigate if analytics succeeds
```

## Await when ordering matters

Await Analytics state operations where subsequent instrumentation depends on the state being applied.

Example:

```dart
await analytics.setUserId(
  id: user.analyticsId,
);

await analytics.logLogin(
  loginMethod: 'password',
);
```

Likewise, consent/collection state transitions may need ordering.

## Safe asynchronous observation

Use `unawaited` while observing failures:

```dart
import 'dart:async';

import 'package:flutter/foundation.dart';

void emitAnalytics(
  Future<void> operation,
) {
  unawaited(
    _observeAnalytics(operation),
  );
}

Future<void> _observeAnalytics(
  Future<void> operation,
) async {
  try {
    await operation;
  } catch (error, stackTrace) {
    if (kDebugMode) {
      debugPrint(
        'Analytics failure: $error\n$stackTrace',
      );
    }
  }
}
```

Do not recursively report an Analytics failure back into Firebase Analytics.

A production app MAY send sanitized SDK failures to its normal diagnostic system if the volume is controlled.

---

# User Identity

## `setUserId`

Current Flutter API:

```dart
await FirebaseAnalytics.instance.setUserId(
  id: analyticsUserId,
);
```

Clear:

```dart
await FirebaseAnalytics.instance.setUserId(
  id: null,
);
```

## Appropriate ID

Prefer:

```text
internal opaque account identifier
```

such as:

```text
acct_7b95f...
```

provided its use complies with the application's privacy model.

Do not use:

- email
- phone number
- full name
- username when publicly identifiable
- authentication token
- access token
- refresh token

Google Analytics User-ID policies require that the value not itself be personally identifiable to Google.

---

# Login Identity Lifecycle

Recommended:

```text
anonymous app session
    |
    | setUserId(null)
    v
login succeeds
    |
    | setUserId(opaqueAccountId)
    v
authenticated events
```

On logout:

```dart
await analytics.setUserId(
  id: null,
);
```

Also clear account-specific user properties if they should not carry into the next user's session.

---

# Account Switching

For:

```text
User A -> logout -> User B
```

use:

```text
clear User A identity
clear account-scoped properties
set User B identity
then log User B activity
```

Do not leave User A's analytics identity active while B's UI is already visible.

---

# Anonymous Sessions

Do not manufacture an application User-ID merely because GA has an API.

Firebase Analytics already maintains app-instance/session identifiers internally.

Leave:

```dart
setUserId(id: null)
```

for anonymous usage unless there is a deliberate cross-device/account User-ID strategy.

---

# App Instance ID

The Analytics app instance identifier is SDK measurement identity.

It is not:

- application authentication
- a user ID
- authorization
- a database primary key
- a stable forever identifier

Do not build critical product behavior around:

```dart
analytics.appInstanceId
```

It can change through Analytics reset/lifecycle behavior and may be unavailable when consent is denied.

It is currently unsupported by FlutterFire Analytics Web.

Avoid exposing or logging it unnecessarily.

---

# User Properties

Current API:

```dart
await analytics.setUserProperty(
  name: 'plan_tier',
  value: 'pro',
);
```

Clear:

```dart
await analytics.setUserProperty(
  name: 'plan_tier',
  value: null,
);
```

User properties persist and are intended for user segmentation.

Current standard Analytics limits allow a bounded number of them; FlutterFire documents 25.

Use them sparingly.

---

# Good User Properties

Examples:

```text
plan_tier = free | pro | enterprise
account_type = personal | team
onboarding_state = new | complete
preferred_content_category = news | sports | finance
```

Requirements:

- stable
- low-cardinality
- meaningful for segmentation
- privacy-reviewed

---

# Bad User Properties

Avoid:

```text
email
phone
full_name
auth_token
last_error_message
last_viewed_document_id
current_scroll_offset
timestamp
random_uuid
complete_url
```

Do not treat user properties as remotely synchronized user storage.

---

# Avoid Repeated Property Writes

Bad:

```dart
void build() {
  analytics.setUserProperty(
    name: 'plan_tier',
    value: user.plan.name,
  );
}
```

Preferred:

```text
user/account state transition
   |
   v
compare desired analytics identity state
   |
   v
write only when necessary
```

Repeated identical writes add unnecessary bridge work and make ownership unclear.

---

# Custom User-Property Reporting

Sending:

```text
plan_tier = pro
```

does not automatically make that property available everywhere as a custom report dimension.

Where GA reporting requires it, register the appropriate **user-scoped custom dimension** in Google Analytics.

Custom definitions consume property quota and may take time before they appear in standard reporting.

Do not register a custom definition merely because a field exists.

---

# Personally Identifiable Information

Normal Firebase/Google Analytics collection MUST NOT receive PII that Google's policies prohibit.

Examples to exclude from normal event/user/screen/campaign fields include:

- email addresses
- personal phone numbers
- full names
- Social Security or equivalent government identifiers
- passwords
- access tokens
- refresh tokens
- session cookies
- API authorization headers
- payment-card numbers
- private keys

Other sensitive categories, such as:

- health information
- precise private content
- detailed addresses
- private messages

require explicit product/privacy/legal analysis even when they are not exhaustively listed in a particular Firebase API page.

Never reason:

```text
Firebase accepts String
therefore sending this value is allowed
```

API type acceptance is not privacy-policy approval.

---

# Specialized On-Device Conversion APIs

Recent Firebase Analytics Apple SDKs and FlutterFire expose specialized on-device conversion measurement APIs that can accept email/phone-derived values under their documented flow.

These APIs are a **special advertising measurement feature**.

They do not mean raw email or phone values may be placed in:

```text
event parameters
user properties
screen names
User-ID
campaign parameters
```

Never generalize a specialized privacy-preserving conversion API into permission to transmit PII through standard Analytics fields.

Revalidate current Firebase advertising/conversion documentation before using those APIs.

---

# Consent and Privacy

Keep four ideas separate:

```text
1. Analytics collection
2. Analytics/advertising consent state
3. Advertising identifiers/attribution
4. Platform tracking permissions such as ATT
```

They overlap but are not interchangeable.

---

# Analytics Collection Control

Current Flutter API:

```dart
await analytics.setAnalyticsCollectionEnabled(
  enabled,
);
```

The collection setting persists across sessions on supported native platforms.

Do not toggle it repeatedly on each page.

Model consent/collection as app-level state.

---

# Consent API

Current FlutterFire exposes `setConsent`.

Native/Web categories include combinations of:

```text
analytics storage
ad storage
ad user data
ad personalization
```

Web additionally exposes storage categories such as:

```text
functionality storage
personalization storage
security storage
```

Support is platform-specific.

Do not blindly invoke all fields on every target.

A typical privacy layer should accept product-owned consent state and map only supported Analytics categories.

---

# Consent Does Not Replace Product/Legal Review

This skill does not determine whether a particular jurisdiction requires opt-in or opt-out Analytics.

The AI MUST distinguish:

```text
Firebase technically defaults collection on
```

from:

```text
the product is allowed to collect without consent
```

The latter requires the product's privacy/legal requirements.

---

# Pre-Consent Collection

If requirements are:

```text
No Analytics data may be collected before consent.
```

do not merely:

```dart
Future<void> main() async {
  await Firebase.initializeApp();
  await analytics.setAnalyticsCollectionEnabled(false);
}
```

and assume no earlier automatic event could exist.

Instead configure the SDK's initial collection/consent state using the currently documented native/Web mechanism before automatic measurement begins.

Then enable it after the user decision.

---

# Apple ATT and IDFA

Do not conflate ATT with baseline Firebase Analytics.

Firebase Apple Analytics can be used without IDFA support.

ATT becomes relevant where the application's use of data/identifiers falls under Apple's tracking framework.

If advertising attribution or identifier collection is required:

1. inspect current Apple ATT policy/documentation
2. inspect current Firebase Analytics Apple IDFA configuration
3. inspect FlutterFire's current iOS dependency instructions
4. obtain product/privacy/legal approval
5. test behavior with/without authorization

Do not automatically request ATT merely because `firebase_analytics` is installed.

---

# Screen Tracking

Flutter screen measurement requires deliberate ownership.

The native Firebase SDK can automatically observe native `Activity`/`UIViewController` transitions.

Flutter applications frequently render many logical screens inside one native host container.

Therefore native automatic screen measurement alone may not represent Flutter's logical navigation taxonomy.

---

# `FirebaseAnalyticsObserver`

FlutterFire provides:

```dart
FirebaseAnalyticsObserver
```

which extends `NavigatorObserver` and records active `ModalRoute` changes.

Example:

```dart
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/material.dart';

class App extends StatelessWidget {
  App({super.key});

  final FirebaseAnalytics analytics =
      FirebaseAnalytics.instance;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorObservers: <NavigatorObserver>[
        FirebaseAnalyticsObserver(
          analytics: analytics,
        ),
      ],
      routes: <String, WidgetBuilder>{
        '/': (_) => const HomePage(),
        '/settings': (_) => const SettingsPage(),
      },
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Home'),
      ),
    );
  }
}

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Settings'),
      ),
    );
  }
}
```

This works best when:

- navigation uses a single traditional Navigator
- routes have meaningful stable names
- logical screens correspond to route transitions

---

# Manual Screen View

Current API:

```dart
await analytics.logScreenView(
  screenName: 'product_detail',
  screenClass: 'ProductDetailScreen',
);
```

Prefer stable screen names:

```text
home
search_results
product_detail
cart
checkout_payment
profile
```

Avoid:

```text
/product/0c43f084-...
/search?q=user@example.com
ProductPage-17320483
```

---

# Navigator 1.0

For ordinary named route navigation:

```text
MaterialApp
 + FirebaseAnalyticsObserver
```

is often sufficient.

Verify actual screen names in DebugView.

Do not additionally call manual `logScreenView()` for the same transitions unless the observer is intentionally filtered.

---

# Navigator 2.0 / Router APIs

Do not assume a `NavigatorObserver` automatically represents every declarative route state.

For:

- Router 2.0
- `go_router`
- nested routers
- shell routes
- custom routing packages

identify the routing system's authoritative "current logical location" transition and connect Analytics there.

The routing package may expose observers, listeners, route matches, or callbacks.

Use the routing package's current API rather than guessing.

---

# Nested Navigators

Applications commonly have:

```text
root navigator
  |
  +--> tab A navigator
  +--> tab B navigator
```

Attaching an Analytics observer to all navigators without a policy can produce duplicates or meaningless internal route names.

Decide:

```text
What counts as a product screen?
```

Then track that concept once.

---

# Bottom Tabs

A tab switch often does not push a new Navigator route.

Therefore:

```text
Home tab -> Search tab
```

may need explicit logical screen tracking.

Track on selected-tab transitions, not inside each tab widget's `build()`.

---

# Dialogs and Bottom Sheets

Do not automatically treat every modal as a screen.

Choose one schema:

```text
dialog_opened
```

custom event for meaningful overlays

or:

```text
screen_view
```

only if the product considers the modal a first-class navigable screen.

Keep the policy consistent.

---

# Route Replacement and Deep Links

A deep link to a screen should produce the same stable screen name as internal navigation.

Example:

```text
internal:
  product_detail

deep link:
  product_detail
```

not:

```text
internal:
  product_detail

deep link:
  https://example.com/p/123?campaign=...
```

---

# Duplicate Screen Prevention

Common duplication sources:

```text
native automatic screen measurement
+
FirebaseAnalyticsObserver
+
manual logScreenView
+
router listener
```

Use one coherent Flutter logical-screen owner.

When native host-container screen reporting creates noise, Firebase documents platform configuration for disabling automatic native screen reporting.

Only disable it deliberately after verifying the desired Flutter screen strategy.

---

# Navigation Analytics

Screen views answer:

```text
Which logical screen became active?
```

Domain events answer:

```text
What meaningful action did the user perform?
```

Do not replace every interaction with screens.

Example:

```text
screen_view: checkout_payment
add_payment_info: card
purchase: transaction
```

is more useful than:

```text
screen_view: checkout_payment
screen_view: checkout_payment_button_pressed
screen_view: purchase_success
```

---

# Ecommerce Analytics

Use the GA4 ecommerce event model rather than inventing equivalent event names.

Typical flow:

```text
view_item_list
      |
      v
select_item
      |
      v
view_item
      |
      v
add_to_cart
      |
      +--> remove_from_cart
      |
      v
view_cart
      |
      v
begin_checkout
      |
      v
add_shipping_info
      |
      v
add_payment_info
      |
      v
purchase
```

Later:

```text
refund
```

when an actual refund occurs.

Not every application requires every step.

Log only events that correspond to real product actions.

---

# `AnalyticsEventItem`

Current Flutter API models ecommerce item data with `AnalyticsEventItem`.

Example:

```dart
final AnalyticsEventItem item = AnalyticsEventItem(
  itemId: 'sku_123',
  itemName: 'Premium Widget',
  itemCategory: 'widgets',
  price: 49.99,
  quantity: 2,
);
```

Important:

```dart
price: 49.99
```

is numeric.

Do not copy an older example that passes:

```dart
price: '49.99'
```

when the current package API expects `num?`.

---

# `view_item`

```dart
await analytics.logViewItem(
  currency: 'USD',
  value: 49.99,
  items: <AnalyticsEventItem>[
    AnalyticsEventItem(
      itemId: 'sku_123',
      itemName: 'Premium Widget',
      price: 49.99,
      quantity: 1,
    ),
  ],
);
```

Use ISO 4217 currency codes.

Keep currency/value semantics consistent.

---

# `add_to_cart`

```dart
await analytics.logAddToCart(
  currency: 'USD',
  value: 99.98,
  items: <AnalyticsEventItem>[
    AnalyticsEventItem(
      itemId: 'sku_123',
      itemName: 'Premium Widget',
      price: 49.99,
      quantity: 2,
    ),
  ],
);
```

Do not calculate event `value` using a different pricing model from the Analytics item's price/quantity semantics.

---

# Purchase Event

Example:

```dart
await analytics.logPurchase(
  transactionId: 'order_8F7A91',
  currency: 'USD',
  value: 109.98,
  tax: 5.00,
  shipping: 5.00,
  items: <AnalyticsEventItem>[
    AnalyticsEventItem(
      itemId: 'sku_123',
      itemName: 'Premium Widget',
      price: 49.99,
      quantity: 2,
    ),
  ],
);
```

Follow the current GA ecommerce definition of `value`, tax, shipping, discount, and item pricing.

Do not improvise revenue formulas.

---

# Purchase Integrity

## Analytics is not accounting

The database/store/payment provider is authoritative.

Analytics is an observation.

Never:

```text
Analytics purchase logged
therefore order is paid
```

Business truth must flow the other direction:

```text
authoritative payment/order confirmed
       |
       v
emit analytics purchase
```

---

# Purchase Timing

Log `purchase` after the transaction is actually considered successful according to the product's payment model.

Do not log it when:

- checkout opens
- payment button is tapped
- payment request starts
- payment provider is still pending

Those are separate funnel stages.

---

# Transaction ID

Use a stable unique transaction identifier.

Good:

```text
order_8F7A91
```

Bad:

```text
DateTime.now().millisecondsSinceEpoch
```

when retries for the same order generate a new ID.

The same underlying purchase retry should retain the same transaction identity.

GA uses transaction IDs for purchase deduplication semantics, but the application should still make its instrumentation idempotent.

---

# Purchase Idempotency

Possible pattern:

```text
Payment success
    |
    v
stable order ID = order_8F7A91
    |
    v
purchase instrumentation
    |
    v
record local/backend "analytics purchase emitted" state
```

Whether explicit persisted instrumentation state is needed depends on the app's retry model.

At minimum:

**MUST NOT generate a new transaction ID for each retry of the same purchase.**

---

# Refund

Emit refund analytics only after the refund is confirmed by the transactional system.

Use the appropriate transaction identity and item information required by current GA4 semantics.

Partial refunds should represent the actual refunded items/value rather than blindly repeating the full original purchase.

---

# In-App Purchases and Subscriptions

Treat in-app purchase Analytics separately from generic ecommerce.

Firebase native SDKs can automatically collect some Google Play/App Store purchase events depending on platform/store SDK integration.

Recent FlutterFire versions also expose specialized iOS in-app-purchase transaction helpers.

Therefore:

**MUST audit automatic native purchase measurement before manually emitting equivalent IAP events.**

Otherwise:

```text
native automatic IAP
+
manual in_app_purchase event
=
duplicate revenue
```

For subscription/business-state truth use:

- App Store / Play transaction state
- validated server-side subscription state where applicable

Analytics remains measurement.

Revalidate `logInAppPurchase()` and `logTransaction()` against the exact installed FlutterFire release because these APIs are relatively recent and platform-sensitive.

---

# Default Event Parameters

Current Flutter API exposes:

```dart
setDefaultEventParameters(...)
```

on native FlutterFire targets, while current Web implementation does not support it.

Default parameters are persisted by native Analytics SDKs and are automatically attached to subsequent events according to SDK precedence rules.

Use sparingly.

Good candidates:

```text
app_distribution = "enterprise"
experience_variant = "new_navigation"
```

only when they are:

- stable
- low-cardinality
- useful on nearly every event
- not already auto-collected
- privacy-safe

Bad candidates:

```text
current_user_id
current_document_id
timestamp
full_route
last_error
cart_items
```

Do not turn every event into a copy of application state.

Event-specific values should normally remain event-specific.

---

# User Properties vs Default Parameters

Use a user property for:

```text
persistent user segmentation
```

Example:

```text
plan_tier = pro
```

Use a default event parameter for:

```text
stable application/event context that truly belongs on many events
```

Use a normal event parameter for:

```text
context specific to this event
```

Do not duplicate all three unnecessarily.

---

# Sessions

Firebase Analytics tracks sessions automatically.

Do not create a custom:

```text
session_started
session_ended
```

event merely to reproduce Analytics' built-in session model unless the product has a separate domain-session concept.

Native Firebase Analytics generally uses a default inactivity-based session timeout around 30 minutes.

---

# `getSessionId()`

Current Flutter API:

```dart
final int? sessionId =
    await analytics.getSessionId();
```

Use only for specialized measurement/debug/warehouse correlation scenarios.

Do not make business behavior depend on Analytics session identity.

Current Flutter Web implementation does not support this API.

---

# `setSessionTimeoutDuration()`

The current Flutter package exposes:

```dart
await analytics.setSessionTimeoutDuration(
  const Duration(minutes: 30),
);
```

However, current Flutter implementation parity is unusual:

- Android method-channel implementation forwards it
- Web reports unsupported
- current Apple Flutter wrapper does not forward it even though the underlying native Apple SDK has session-timeout functionality

Therefore:

**DO NOT advertise this as a portable cross-platform Flutter API without revalidating the exact installed package source.**

Changing session timeout should be uncommon.

Only change it when product-session semantics justify diverging from GA defaults.

---

# `resetAnalyticsData()`

Current native API:

```dart
await analytics.resetAnalyticsData();
```

It clears/reset local Analytics measurement state including the app instance identity according to native Analytics behavior.

It is not a routine logout API.

Normal logout should usually do:

```dart
await analytics.setUserId(
  id: null,
);
```

plus clearing account-specific properties.

Use a full Analytics reset only for an explicit privacy/reset/test requirement.

Current Flutter Web implementation does not support `resetAnalyticsData()`.

---

# Performance Rules

## HIGH PRIORITY — Never Log in `build()`

Bad:

```dart
@override
Widget build(BuildContext context) {
  FirebaseAnalytics.instance.logEvent(
    name: 'profile_viewed',
  );

  return const ProfileView();
}
```

A `build()` can execute repeatedly for reasons unrelated to user behavior.

Result:

```text
one user view
-> many analytics events
```

Preferred:

- route/screen tracker
- state transition
- controller/application action
- explicit user callback

---

## HIGH PRIORITY — No Per-Frame Analytics

Never:

```dart
Ticker(...)
  -> logEvent(...)
```

Do not log:

- animation frames
- frame times
- pointer moves
- every scroll offset
- every `onChanged` keystroke
- rebuild counts

Use Firebase Performance Monitoring or dedicated technical telemetry for performance measurements.

---

## HIGH PRIORITY — Avoid Event Storms

Bad:

```text
scroll pixel changed
 -> event

scroll pixel changed
 -> event

scroll pixel changed
 -> event
```

Good product-level event:

```text
article_read_75_percent
```

if that milestone genuinely matters.

Even better, use a smaller set of meaningful engagement events rather than arbitrary percentages if product decisions do not need them.

---

## HIGH PRIORITY — Avoid Analytics for Every Network Request

Firebase Analytics is not network tracing.

Do not:

```text
api_request_started
api_request_succeeded
api_request_failed
```

for every HTTP call.

Use:

- Performance Monitoring
- backend telemetry
- logs

Analytics may record a business outcome:

```text
checkout_failed
```

with a bounded product reason.

---

## HIGH PRIORITY — Keep Mapping Cheap

Good:

```dart
parameters: <String, Object>{
  'content_type': content.type.analyticsName,
  'result_count': results.length,
}
```

Bad:

```text
serialize 2 MB application model
parse JSON
hash every field
construct giant metadata map
then select two analytics values
```

Analytics event transformation should be lightweight.

---

## HIGH PRIORITY — One Service Lifetime

Create an app-scoped service once.

Do not repeatedly instantiate wrappers inside widgets.

This reduces:

- duplicate configuration
- inconsistent error behavior
- accidental duplicate state operations

The main benefit is architectural consistency rather than avoiding a large Firebase object-allocation cost.

---

## HIGH PRIORITY — Do Not Await Analytics Before Navigation

Bad:

```dart
onPressed: () async {
  await analytics.logEvent(
    name: 'continue_clicked',
  );

  if (context.mounted) {
    Navigator.of(context).pushNamed('/next');
  }
}
```

Preferred:

```dart
onPressed: () {
  appAnalytics.track(
    const ContinueClicked(),
  );

  Navigator.of(context).pushNamed('/next');
}
```

Telemetry failure must not break navigation.

---

## HIGH PRIORITY — Avoid Repeated User-Property Writes

Cache or react to actual identity/profile state transitions.

Do not set the same 10 properties on every route.

---

## HIGH PRIORITY — Avoid Duplicate Screen Views

Do not simultaneously log the same logical screen from:

- observer
- route listener
- `initState`
- native automatic reporting
- state manager

Define one owner.

---

## HIGH PRIORITY — No Custom Offline Queue by Default

Native Analytics SDKs already buffer/batch events.

Do not create:

```text
SQLite analytics_events
 -> retry worker
 -> resend every event
```

without a concrete requirement.

A custom queue risks:

- duplicate events
- broken timestamps
- event bursts
- privacy retention problems
- more battery/network work
- semantic divergence from SDK behavior

Firebase Analytics is not guaranteed durable event delivery. If an event is business-critical, record the business fact in the authoritative backend, not an Analytics retry queue.

---

# Network and Battery Efficiency

Firebase native SDKs batch event uploads partly to conserve battery/network resources.

Therefore the application does not need to manually batch normal Analytics calls.

Application-side efficiency comes from:

- fewer duplicate events
- avoiding implementation-noise telemetry
- avoiding repeated identity/property calls
- avoiding unnecessarily large string values
- avoiding event storms
- keeping transformations small

Do not claim that one normal Analytics event has a catastrophic battery cost.

The production concern is unnecessary volume and poor semantics at scale.

---

# Offline Behavior

Firebase's native Analytics SDKs persist/buffer measurement data and upload later when connectivity permits.

Developers should normally not queue events manually.

However:

- Analytics is not a guaranteed durable message system
- offline retention/upload details are SDK/platform controlled
- Web behavior differs from native persistence
- browser blockers may prevent collection entirely

Never make a critical business process depend on eventual Analytics delivery.

---

# Reliability Rules

## Analytics failure should not break the product

Analytics errors SHOULD generally:

- be caught at the Analytics abstraction boundary
- be visible in debug/test diagnostics
- optionally be sent to a separate observability system in sanitized form
- not crash authentication/navigation/checkout

Exception:

A specialized regulated/product requirement may consider telemetry mandatory, but that must be explicitly specified rather than assumed.

---

# Duplicate Events

Common duplicate causes:

```text
logEvent in build()
multiple listeners
multiple providers/services
button double taps
network retry callbacks
route observer + manual screen event
purchase retry
state transition emitted twice
lifecycle callbacks firing multiple times
```

Fix the source of duplication rather than adding a global arbitrary time-based deduplicator.

---

# Idempotency

Some analytics actions need domain-level idempotency.

Most important:

```text
purchase
refund
one-time conversion milestone
```

Use stable domain identifiers/state.

Do not globally suppress:

```text
same event name within 5 seconds
```

because two legitimate events can occur within five seconds.

---

# Button Double Taps

Prevent duplicate business action first.

Example:

```text
tap purchase
-> disable submit while request pending
```

Then Analytics naturally follows the single business transition.

Do not use Analytics deduplication to mask a duplicate checkout request.

---

# Async Errors

If using fire-and-forget:

```dart
unawaited(...)
```

make sure the Future is observed by a safe boundary.

Do not create unhandled asynchronous errors merely to avoid awaiting telemetry.

---

# Analytics Disabled

When collection is disabled:

- do not interpret absent Analytics events as an application error
- do not repeatedly try to "force" telemetry through
- respect current collection/consent state

Application behavior should remain functional.

---

# Screen Lifecycle

Do not assume:

```text
widget created == screen viewed
```

Widgets may be:

- prebuilt
- cached
- kept alive
- rebuilt
- offstage

Track logical navigation state instead.

---

# Event Frequency

Good candidates:

- sign-up
- login
- search
- meaningful content selection
- share
- feature activation
- funnel step
- checkout
- purchase
- refund
- tutorial completion
- key retention/engagement milestone

Poor candidates:

- every rebuild
- every scroll delta
- every frame
- every text edit
- every repository function
- every network request
- verbose log lines
- raw exceptions

Analytics event volume should represent **product semantics**, not application execution.

---

# Privacy Rules

## MUST NOT log

Normal Analytics fields must not contain prohibited PII or credentials.

Never log:

```text
email
personal phone number
password
access token
refresh token
session cookie
authorization header
private API key
payment card number
```

Do not log sensitive private content.

---

# Screen Names and Privacy

Screen names are Analytics data.

Bad:

```text
invoice_for_jane_doe@example.com
```

Preferred:

```text
invoice_detail
```

Likewise do not use raw URLs containing private query parameters as screen names.

---

# Campaign Privacy

Campaign/UTM fields also must not contain prohibited PII.

Do not encode:

```text
utm_campaign=user_email@example.com
```

Campaign attribution data is still Analytics data.

---

# Raw Backend Objects

Bad:

```dart
await analytics.logEvent(
  name: 'order_loaded',
  parameters: order.toJson(),
);
```

Why it fails:

- unsupported nested types
- uncontrolled schema
- accidental PII
- high cardinality
- excessive fields
- backend changes silently alter Analytics

Preferred:

```dart
await analytics.logEvent(
  name: 'order_viewed',
  parameters: <String, Object>{
    'order_type': order.type.analyticsName,
    'item_count': order.items.length,
  },
);
```

Only send intentional analytics fields.

---

# Custom Definitions

Sending a custom parameter does not automatically make it available as a named custom dimension/metric throughout the GA interface.

To use a custom parameter in applicable Analytics reporting:

1. send the parameter
2. verify it in DebugView
3. create the appropriate custom definition in GA Admin
4. wait for processing
5. validate reports

Custom definitions can be:

- event-scoped dimensions
- user-scoped dimensions
- item-scoped dimensions where supported
- custom metrics

Use the predefined dimensions/metrics first when they already represent the concept.

---

# Custom Definition Limits

Standard GA properties currently have bounded custom-definition quotas, including on the order of:

```text
event-scoped custom dimensions: 50
user-scoped custom dimensions:  25
custom metrics:                  50
item-scoped dimensions:          bounded separately
```

Analytics 360 differs.

These limits are version/product-tier sensitive.

Do not architect to the quota ceiling.

---

# High-Cardinality Custom Dimensions

Avoid registering:

```text
user_uuid
document_uuid
transaction_uuid
timestamp
full_url
raw_error
```

as normal report dimensions.

High cardinality can produce `(other)` aggregation in GA reports.

If raw analysis is required, BigQuery may be a better consumer for the parameter.

---

# BigQuery Considerations

Firebase/GA can export event-level Analytics data to BigQuery.

Use BigQuery when teams need:

- raw event-level analysis
- joins with warehouse/backend data
- sophisticated funnels
- custom attribution analysis
- longitudinal modeling
- quality audits
- high-cardinality values that are unsuitable as GA UI dimensions

BigQuery should influence schema discipline:

```text
stable event names
stable parameter types
documented nullable fields
consistent IDs
consistent currency semantics
```

Do not treat BigQuery as a reason to send arbitrary data.

Privacy rules still apply.

---

# GA Reports vs BigQuery

GA UI data and BigQuery raw exports are not guaranteed to look identical.

GA reports can apply:

- reporting aggregation
- modeling
- thresholds
- cardinality handling
- predefined semantic processing

BigQuery exposes much more raw event-level data.

Do not debug every discrepancy by modifying client instrumentation first.

Understand the reporting layer.

---

# Reporting Delays

Do not use standard reports as immediate instrumentation tests.

Typical hierarchy:

```text
DebugView:
  instrumentation debugging

Realtime:
  near-current aggregate verification

standard reports/explorations:
  processed reporting; can take many hours

BigQuery:
  export schedule depends on configured daily/streaming mode
```

Firebase/GA documentation warns that many standard reports can require roughly 24–48 hours of processing.

Therefore:

```text
event missing from standard report after 5 minutes
```

does not prove:

```text
Flutter code is broken
```

---

# DebugView

DebugView is the primary development workflow for event validation.

Debug-device events can be inspected with event parameters, properties, and current context without waiting for standard reporting.

---

# Android Debug Mode

Enable for your package:

```shell
adb shell setprop debug.firebase.analytics.app com.example.app
```

Disable:

```shell
adb shell setprop debug.firebase.analytics.app .none.
```

Use the application's real package/application ID.

For detailed Android Analytics logs, current Firebase documentation also uses verbose FA log tags, for example:

```shell
adb shell setprop log.tag.FA VERBOSE
adb shell setprop log.tag.FA-SVC VERBOSE
adb logcat -v time -s FA FA-SVC
```

Revalidate commands against current Firebase Android documentation if SDK logging changes.

---

# Apple Debug Mode

In Xcode, add the documented launch argument:

```text
-FIRDebugEnabled
```

To explicitly disable:

```text
-FIRDebugDisabled
```

Run the intended app target/device and inspect Firebase Analytics DebugView.

Do not ship a permanent debugging configuration accidentally.

---

# Web Debugging

Current Firebase/GA documentation supports using the Google Analytics Debugger browser extension for Web debug measurement.

Verify:

- correct Firebase project
- correct measurement ID
- browser support
- consent state
- network requests
- content/ad blockers
- DebugView events

Do not assume a browser extension/privacy setting is neutral to Analytics.

---

# DebugView Workflow

For each important new event:

## 1. Trigger exactly once

Perform the product action once.

## 2. Inspect DebugView

Find the expected event.

## 3. Verify name

Confirm exact case/spelling:

```text
begin_checkout
```

not:

```text
begin_Checkout
begin-checkout
```

## 4. Verify parameters

Check:

- names
- values
- types
- currency
- item data
- privacy

## 5. Verify user properties

Confirm only expected persistent properties are present.

## 6. Verify identity state

Test:

- anonymous
- logged in
- logged out
- account switched

## 7. Verify screen context

Confirm the event is associated with the intended logical screen.

## 8. Verify duplicates

One action should produce the intended count.

## 9. Verify standard reports later

Do not expect DebugView timing from normal reports.

## 10. Verify downstream consumers

For critical ecommerce/schema changes, also validate:

- GA ecommerce reports
- audiences if relevant
- BigQuery if enabled

---

# Development Traffic

Debug traffic can contaminate production Analytics if developers use the production project.

Prefer environment separation.

GA also supports developer-traffic/data-filter mechanisms, but these should complement—not replace—a sensible Firebase project strategy.

---

# Environment Strategy

Recommended:

```text
development
  -> development Firebase project

staging / QA
  -> staging Firebase project

production
  -> production Firebase project
```

Applications inside one Firebase project share Analytics resources/property relationships.

Do not mix:

```text
QA builds
employee test purchases
automation accounts
local development
```

into production data unless there is a deliberate measurement plan.

---

# When Preproduction Analytics Is Needed

Many development builds do not need full Analytics collection.

For Analytics integration testing:

- use a non-production Firebase project
- use DebugView
- use deterministic test accounts
- explicitly exercise consent states
- exercise release builds before shipping

Do not rely exclusively on unit tests for native Analytics configuration.

---

# Testing Architecture

Test your application's instrumentation contract.

Do not unit-test Google's Analytics ingestion implementation.

---

# Fake Analytics

Example:

```dart
sealed class TestAnalyticsEvent {
  const TestAnalyticsEvent();
}

final class RecordedAnalyticsEvent {
  const RecordedAnalyticsEvent(
    this.name,
    this.parameters,
  );

  final String name;
  final Map<String, Object> parameters;
}

abstract interface class AnalyticsSink {
  void log(
    String name, [
    Map<String, Object> parameters =
        const <String, Object>{},
  ]);
}

final class FakeAnalyticsSink implements AnalyticsSink {
  final List<RecordedAnalyticsEvent> events =
      <RecordedAnalyticsEvent>[];

  @override
  void log(
    String name, [
    Map<String, Object> parameters =
        const <String, Object>{},
  ]) {
    events.add(
      RecordedAnalyticsEvent(
        name,
        Map<String, Object>.unmodifiable(
          parameters,
        ),
      ),
    );
  }
}
```

Use a fake to verify:

```text
user action
 -> intended analytics contract
```

not backend reporting.

---

# Unit Tests Should Verify

- correct event name
- correct recommended/custom event choice
- required params
- no accidental PII fields
- bounded enum mapping
- purchase transaction ID
- user identity transition
- property clearing
- schema migration mapping
- one event for one action

---

# Widget/Integration Tests

Useful cases:

```text
tap once -> event once
rebuild -> no extra event
navigate -> screen once
double submit protection -> purchase once
logout -> identity cleared
account switch -> new identity established
```

Inject a fake Analytics abstraction.

Do not make unit/widget tests connect to real Firebase Analytics servers.

---

# Release Integration Testing

Before release verify on actual supported targets:

```text
Android debug/release
iOS device release-like build
macOS release target if supported by product
deployed Web build
```

Test:

- Analytics initialization
- consent
- core events
- screen tracking
- identity
- ecommerce
- debug/realtime visibility
- no duplicate events

---

# Debugging Guide

| Symptom | Likely cause | Verification | Preferred fix |
|---|---|---|---|
| No events anywhere | Firebase not initialized/wrong project/collection disabled | Firebase config, DebugView, collection state | Fix initialization/config |
| Event absent from DebugView | Debug mode not enabled, invalid event, wrong project, consent/collection disabled | Debug command, project, SDK logs | Correct debug/config/schema |
| Event in DebugView but not reports | Normal processing delay/custom definition missing | Realtime, wait/report config | Do not rewrite client prematurely |
| Custom parameter missing from report | Not registered as custom dimension/metric | DebugView confirms parameter | Create appropriate custom definition |
| User property missing in report | Property not sent or custom dimension not registered | DebugView/user properties | Send once correctly; register definition |
| Duplicate event | `build`, repeated listener, duplicate wrapper/action | Code search + DebugView event sequence | Fix ownership |
| Duplicate screen view | observer + manual/native/router logging | inspect event sequence | choose one screen policy |
| Duplicate purchase | retry/double tap/native auto IAP + manual event | transaction IDs, store integration | make purchase instrumentation idempotent |
| Wrong purchase revenue | inconsistent `value`/currency/item prices | DebugView/BigQuery/transaction data | follow current GA ecommerce semantics |
| Web API throws `UnimplementedError` | unsupported FlutterFire Web API | package source/platform matrix | platform guard or different design |
| Session timeout works Android only | current Flutter wrapper parity | inspect installed source | don't assume cross-platform support |
| iOS advertising behavior unexpected | IDFA/ATT/dependency configuration | linked Firebase Analytics variant | use current IDFA/ATT configuration |
| App reports old user after logout | `setUserId(null)`/properties not cleared | identity lifecycle | clear before next account |
| `(other)` rows appear | high-cardinality dimensions | cardinality/custom defs | stop registering high-card values |
| Analytics slows action flow | awaited telemetry on critical UI path | profiler/code path | decouple telemetry from action |
| Huge event counts | rebuild/scroll/per-frame instrumentation | event counts + code search | log product semantics instead |
| Web has missing traffic | browser privacy/blocker/consent/network | browser DevTools | treat Web measurement as best-effort |

---

# Error Handling

## Firebase not initialized

`FirebaseAnalytics.instance` depends on Firebase Core/default Firebase app state.

Initialize Firebase before using Analytics.

Do not catch initialization failure and silently assume Analytics works.

A startup Firebase initialization failure may affect more than Analytics and should follow the application's Firebase bootstrap error strategy.

---

# Invalid Event Schema

During development:

- surface invalid event names/parameter types
- fail tests for invalid internal contracts
- use DebugView/native SDK logs

In production:

- Analytics instrumentation failures SHOULD NOT crash core functionality
- report sanitized diagnostics through a separate system if useful

Do not "fix" an invalid event by randomly renaming it in one widget.

Correct the central contract.

---

# Analytics vs Other Observability Tools

## Firebase Analytics

Use for:

```text
product behavior
funnels
feature adoption
content engagement
ecommerce
audiences
marketing attribution
```

## Crashlytics

Use for:

```text
exceptions
crashes
stack traces
non-fatal software errors
crash context
```

## Firebase Performance Monitoring

Use for:

```text
startup performance
screen/render traces where supported
network latency
custom performance traces
```

## Application logs

Use for:

```text
diagnostic details
state-machine debugging
developer troubleshooting
```

## Backend telemetry

Use for:

```text
API health
server latency
payments
security audit
authoritative transaction state
operational monitoring
```

Do not force all telemetry through Firebase Analytics.

---

# State Management Integration

Remain framework-neutral.

Whether the app uses:

- Bloc
- Riverpod
- Provider
- Redux
- MVVM
- Clean Architecture

log at meaningful action/state boundaries.

Example:

```text
UI tap
 -> command
 -> purchase succeeds
 -> application emits PurchaseCompleted
 -> Analytics service maps event
```

Avoid:

```text
widget rebuild
 -> direct Firebase Analytics call
```

---

# Bloc

Prefer analytics on meaningful application events/transitions rather than widget builders.

Do not put Analytics calls in every `BlocBuilder`.

---

# Riverpod / Provider

Do not use rebuilding consumers/providers as event triggers.

Use:

- command methods
- application services
- deliberate listeners with one-time semantics

---

# Redux

Analytics middleware can be appropriate for stable domain actions.

Do not log every internal Redux action if those actions are implementation details.

---

# Attribution and Campaign Measurement

Use documented GA campaign parameters and recommended attribution mechanisms.

Do not invent a custom campaign schema when normal GA campaign semantics apply.

Never place PII in:

- UTM parameters
- campaign names
- source/medium fields
- deep-link query parameters collected by Analytics

Advertising/attribution behavior varies by platform and identifier availability.

Revalidate current Google/Firebase/Apple documentation for paid acquisition features.

Do not recommend Firebase Dynamic Links as a new architecture. Firebase Dynamic Links has been deprecated/shut down and is not a current recommended attribution/deep-link foundation.

---

# Web and Enhanced Measurement

A GA4 Web data stream can automatically measure some browser/page interactions depending on property configuration.

When instrumenting Flutter Web:

1. inspect GA Web data-stream Enhanced Measurement settings
2. inspect Flutter screen/page tracking
3. ensure custom events do not duplicate automatically collected concepts
4. test SPA/declarative navigation in DebugView

Do not assume every Flutter route automatically becomes a GA page/screen event.

---

# Automatic Events

Firebase Analytics automatically collects a set of events and user/device/application properties.

Do not manually duplicate automatically collected events merely to "be safe."

Before defining:

```text
app_opened_custom
session_started_custom
first_launch_custom
```

check current Firebase automatically collected event definitions.

Create a custom event only when it represents a distinct product concept.

---

# Reset vs Logout

Logout:

```text
clear authenticated User-ID
clear account-specific user properties
```

Reset Analytics:

```text
clear/reset device-local Analytics measurement identity/state
```

These are different.

Do not call:

```dart
resetAnalyticsData()
```

on every logout unless the product explicitly wants a complete Analytics installation reset and has validated the consequences.

---

# App Instance Identity and Privacy

Do not expose app-instance identifiers through:

- UI
- customer support screenshots
- normal product events
- public URLs

unless a real debugging/measurement requirement exists.

Treat analytics identifiers as telemetry identifiers.

---

# Performance Analysis Summary

The primary Analytics performance mechanisms are:

```text
event generation
    |
    +--> Dart map creation
    +--> Flutter/platform bridge or Web SDK call
    +--> native/browser SDK processing
    +--> local batching/storage
    +--> later network upload
```

Therefore optimize:

1. duplicate generation
2. event volume
3. payload size/cardinality
4. mapping cost
5. startup sequencing

Do not obsess over:

```text
FirebaseAnalytics.instance allocation
```

while emitting 100 events per scroll.

---

# Anti-Patterns

## Anti-pattern: Direct Firebase calls throughout widgets

### Bad

```dart
FirebaseAnalytics.instance.logEvent(
  name: 'something',
);
```

in dozens of unrelated widgets.

### Why it fails

- taxonomy fragmentation
- inconsistent privacy review
- poor testing
- duplicates
- hard migrations

### Preferred approach

Use one app-scoped service and stable event definitions.

---

## Anti-pattern: Analytics in `build()`

### Bad

```dart
Widget build(BuildContext context) {
  analytics.logScreenView(
    screenName: 'home',
  );

  return ...;
}
```

### Why it fails

Build frequency does not equal screen-view frequency.

### Preferred approach

Use navigation state/observer.

---

## Anti-pattern: Dynamic event names

### Bad

```dart
logEvent(
  name: 'opened_$documentId',
);
```

### Why it fails

Creates unbounded event schemas and destroys report consistency.

### Preferred approach

```text
document_opened
  document_type = ...
```

Use high-card IDs only when truly needed and never as event names.

---

## Anti-pattern: Timestamp in event name

### Bad

```text
purchase_20260811153205
```

### Why it fails

Every event becomes a new schema.

### Preferred approach

Use `purchase`. GA records event time automatically.

---

## Anti-pattern: Email as User-ID

### Bad

```dart
await analytics.setUserId(
  id: user.email,
);
```

### Why it fails

Google Analytics policies prohibit sending recognizable PII such as email through normal measurement fields.

### Preferred approach

Use a privacy-appropriate opaque internal identifier.

---

## Anti-pattern: PII event parameters

### Bad

```dart
parameters: <String, Object>{
  'email': user.email,
  'phone': user.phone,
}
```

### Why it fails

Privacy/policy violation risk.

### Preferred approach

Do not transmit the fields.

---

## Anti-pattern: Auth token telemetry

### Bad

```dart
parameters: <String, Object>{
  'access_token': session.accessToken,
}
```

### Why it fails

Credential leakage.

### Preferred approach

Never send credentials to Analytics.

---

## Anti-pattern: Analytics as logging

### Bad

```text
database_connect_started
database_connect_ok
api_request_started
api_request_failed_with_$exception
```

### Why it fails

- high volume
- high cardinality
- wrong observability system
- privacy risk

### Preferred approach

Use logs/Crashlytics/backend observability.

---

## Anti-pattern: Await telemetry before navigation

### Bad

```dart
await analytics.logEvent(...);
await navigate();
```

### Why it fails

Telemetry becomes part of user-perceived latency and product correctness.

### Preferred approach

Record asynchronously with safe error observation.

---

## Anti-pattern: Analytics success controls business logic

### Bad

```dart
if (await sendAnalytics()) {
  markOrderSuccessful();
}
```

### Why it fails

Analytics is not business infrastructure.

### Preferred approach

Business succeeds independently; Analytics observes it.

---

## Anti-pattern: Observer + manual screen logging

### Bad

```text
FirebaseAnalyticsObserver
+
logScreenView in initState
```

### Why it fails

Duplicate `screen_view`.

### Preferred approach

One screen owner.

---

## Anti-pattern: Purchase on button tap

### Bad

```dart
onPressed: () {
  analytics.logPurchase(...);
  startPayment();
}
```

### Why it fails

Revenue is recorded even if payment fails.

### Preferred approach

Log only after authoritative success.

---

## Anti-pattern: Random transaction ID per retry

### Bad

```dart
transactionId:
    DateTime.now().microsecondsSinceEpoch.toString()
```

### Why it fails

One purchase can appear as many purchases.

### Preferred approach

Stable order/store transaction ID.

---

## Anti-pattern: Manual IAP plus native automatic IAP

### Why it fails

Can double-count store revenue.

### Preferred approach

Audit platform automatic collection first.

---

## Anti-pattern: Repeated user-property writes

### Bad

```text
every screen:
  set plan_tier
  set account_type
  set onboarding_state
```

### Why it fails

Unnecessary bridge calls and unclear lifecycle ownership.

### Preferred approach

Update on actual state change.

---

## Anti-pattern: Giant default parameter set

### Bad

```text
20 dynamic fields attached to every event
```

### Why it fails

- payload overhead
- cardinality
- privacy risk
- semantic clutter

### Preferred approach

Use only truly global low-cardinality context.

---

## Anti-pattern: UUID custom dimension

### Bad

```text
custom dimension:
  document_id = random UUID
```

### Why it fails

High-cardinality reporting.

### Preferred approach

Use BigQuery/raw parameter only if needed, or omit it entirely.

---

## Anti-pattern: Hundreds of equivalent custom event names

### Bad

```text
product_opened
item_opened
sku_opened
catalog_product_clicked
```

for one conceptual action.

### Why it fails

Taxonomy fragmentation.

### Preferred approach

One documented semantic event, preferably recommended `view_item`/`select_item` when applicable.

---

## Anti-pattern: Ignore recommended GA event

### Bad

```text
checkout_started_custom
```

when semantics exactly match:

```text
begin_checkout
```

### Why it fails

Loses standardized GA semantics/reporting compatibility.

### Preferred approach

Use the recommended event.

---

## Anti-pattern: Production project for all environments

### Why it fails

QA/test/employee activity corrupts production metrics and revenue funnels.

### Preferred approach

Separate Firebase projects/environments.

---

## Anti-pattern: Raw API object as parameters

### Why it fails

- accidental PII
- invalid data types
- uncontrolled schema
- backend coupling

### Preferred approach

Explicit mapping.

---

## Anti-pattern: Analytics for crash reports

### Why it fails

Wrong schema/volume/detail model.

### Preferred approach

Crashlytics.

---

## Anti-pattern: Analytics for profiling

### Why it fails

Analytics batching/reporting is not designed for precise high-frequency performance measurement.

### Preferred approach

Firebase Performance Monitoring/profiler.

---

## Anti-pattern: Custom offline analytics queue

### Why it fails

- duplicates
- retention/privacy burden
- extra network/battery work
- unreliable timestamp semantics

### Preferred approach

Use Firebase SDK buffering; store critical business truth elsewhere.

---

## Anti-pattern: Assume Web API parity

### Bad

```dart
final id =
    await FirebaseAnalytics.instance.appInstanceId;
```

on every platform.

### Why it fails

Current Flutter Web implementation does not support this API.

### Preferred approach

Explicit capability/platform design.

---

## Anti-pattern: Assume native SDK API exists in Flutter

### Why it fails

FlutterFire's method-channel API may expose only a subset or different platform coverage.

### Preferred approach

Verify the current Dart API and implementation.

---

# Implementation Checklist

## 1. Inspect current project

- [ ] Read `pubspec.yaml`.
- [ ] Read `pubspec.lock`.
- [ ] Identify `firebase_core`.
- [ ] Identify installed `firebase_analytics`.
- [ ] Read current package changelog.
- [ ] Identify Android/iOS/macOS/Web targets.
- [ ] Identify environments.
- [ ] Search existing Analytics calls.

Search:

```text
FirebaseAnalytics
logEvent
logScreenView
setUserId
setUserProperty
FirebaseAnalyticsObserver
```

---

## 2. Configure Firebase

- [ ] Firebase projects exist for intended environments.
- [ ] `flutterfire configure` is current.
- [ ] `firebase_options.dart` matches targets.
- [ ] `Firebase.initializeApp` happens once correctly.
- [ ] No stale manual native Firebase config conflicts with generated config.

---

## 3. Decide consent strategy

- [ ] Determine product/legal collection requirements.
- [ ] Separate Analytics collection from advertising consent.
- [ ] Determine whether collection must begin disabled.
- [ ] Configure pre-initialization native/Web behavior if required.
- [ ] Define runtime collection state.
- [ ] Define identity behavior before/after consent.
- [ ] Verify supported `setConsent` categories by platform.

---

## 4. Define event taxonomy

- [ ] Inventory product funnels.
- [ ] Map to recommended GA4 events first.
- [ ] Add custom events only when necessary.
- [ ] Use stable names.
- [ ] Define exact trigger conditions.
- [ ] Define types.
- [ ] Audit PII.
- [ ] Audit cardinality.
- [ ] Assign schema owner.

---

## 5. Implement Analytics abstraction

- [ ] One application-scoped service.
- [ ] Typed events where project complexity warrants them.
- [ ] Central Firebase mapping.
- [ ] Safe async error handling.
- [ ] No business-flow dependency.
- [ ] Injectable fake for tests.

---

## 6. Implement identity

- [ ] Opaque privacy-appropriate User-ID.
- [ ] No email/phone.
- [ ] Set only after login.
- [ ] Clear on logout.
- [ ] Handle account switch.
- [ ] Clear account-specific properties.
- [ ] Do not use app instance ID as account identity.

---

## 7. Implement user properties

- [ ] Stable segmentation only.
- [ ] Low cardinality.
- [ ] No PII.
- [ ] Only update when changed.
- [ ] Register custom definitions only when reporting requires them.

---

## 8. Implement screen tracking

- [ ] Decide logical screen definition.
- [ ] Choose Observer/manual/router integration.
- [ ] Handle nested navigators.
- [ ] Handle tabs.
- [ ] Decide modal policy.
- [ ] Normalize deep-link names.
- [ ] Prevent duplicate native/manual/observer measurement.

---

## 9. Implement ecommerce

- [ ] Use current recommended event helpers.
- [ ] Use numeric prices.
- [ ] Use consistent currency.
- [ ] Correct `value`.
- [ ] Correct items.
- [ ] Stable transaction IDs.
- [ ] Purchase only after success.
- [ ] Refund only after confirmed refund.
- [ ] Audit automatic IAP measurement before manual IAP logging.

---

## 10. Optimize performance

- [ ] No Analytics in `build`.
- [ ] No per-frame telemetry.
- [ ] No raw scroll/keystroke telemetry.
- [ ] No event storms.
- [ ] No repeated property writes.
- [ ] No giant parameter mapping.
- [ ] No awaited telemetry in critical navigation/business paths.
- [ ] No custom offline queue without demonstrated need.

---

## 11. Configure reporting

- [ ] Determine required custom dimensions.
- [ ] Determine required custom metrics.
- [ ] Avoid high-cardinality custom definitions.
- [ ] Configure BigQuery if raw analytics is required.
- [ ] Document downstream schema expectations.

---

## 12. Validate

- [ ] Android DebugView.
- [ ] Apple DebugView.
- [ ] Web debugging.
- [ ] Event names.
- [ ] Parameters.
- [ ] User properties.
- [ ] Identity.
- [ ] Screens.
- [ ] No duplicates.
- [ ] Ecommerce values.
- [ ] Production reports after processing delay.

---

# Code Review Checklist

## Initialization

- [ ] Is Firebase initialized before Analytics?
- [ ] Is Analytics-specific work unnecessarily delaying `runApp`?
- [ ] Is a non-existent/custom initialization API being used?
- [ ] Is pre-consent collection correctly configured if required?

## Service architecture

- [ ] Is Analytics centralized?
- [ ] Are Firebase calls scattered through widgets?
- [ ] Can mappings be unit-tested?
- [ ] Is abstraction proportional to project size?

## Events

- [ ] Recommended event used when semantics match?
- [ ] Event names stable?
- [ ] No dynamic event names?
- [ ] No timestamps/IDs embedded in names?
- [ ] Correct parameter types?
- [ ] Within current package limits?
- [ ] No reserved names/prefixes?
- [ ] Trigger semantics documented?

## Privacy

- [ ] No email?
- [ ] No phone?
- [ ] No names?
- [ ] No auth/access tokens?
- [ ] No payment credentials?
- [ ] No raw private content?
- [ ] Search terms reviewed?
- [ ] URLs reviewed?
- [ ] Campaign fields reviewed?

## User identity

- [ ] Opaque ID?
- [ ] Set after login?
- [ ] Cleared on logout?
- [ ] Account switch handled?
- [ ] No appInstanceId misuse?

## User properties

- [ ] Stable?
- [ ] Low-cardinality?
- [ ] Not repeatedly written?
- [ ] Cleared appropriately?
- [ ] No arbitrary per-user storage?

## Screen tracking

- [ ] Observer/manual strategy explicit?
- [ ] Navigator 2/router handled?
- [ ] Nested navigator handled?
- [ ] Tabs handled?
- [ ] Modal policy explicit?
- [ ] No duplicate screen sources?
- [ ] Stable non-PII screen names?

## Ecommerce

- [ ] Correct recommended events?
- [ ] Numeric item price?
- [ ] Correct currency?
- [ ] Correct value?
- [ ] Transaction ID stable?
- [ ] Purchase logged only after confirmation?
- [ ] Refund logic correct?
- [ ] Duplicate purchase risk?
- [ ] Automatic IAP collection audited?

## Performance

- [ ] No calls in `build()`?
- [ ] No per-frame events?
- [ ] No scroll storms?
- [ ] No keystroke telemetry?
- [ ] No network-request telemetry?
- [ ] Mapping cheap?
- [ ] UI/business flows don't wait on Analytics?
- [ ] No repeated global property/default writes?
- [ ] No custom offline queue?

## Reporting quality

- [ ] No high-cardinality custom dimensions?
- [ ] Custom definitions actually registered where needed?
- [ ] BigQuery consumers documented?
- [ ] Parameter types stable over versions?

## Environment

- [ ] Dev/staging/prod separated?
- [ ] Test purchases excluded from production?
- [ ] Debug mode not accidentally treated as production validation?

## Platform support

- [ ] Web unsupported APIs guarded?
- [ ] macOS beta/parity revalidated?
- [ ] Session-timeout parity checked?
- [ ] Current Apple IDFA configuration checked?
- [ ] No native-only API invented in Dart?

## Deprecated guidance

- [ ] No deprecated `setCurrentScreen` pattern?
- [ ] No old ecommerce helpers such as deprecated `logEcommercePurchase`?
- [ ] No Firebase Dynamic Links recommendation?
- [ ] Current package helper signatures verified?

---

# Version-Sensitive Areas

Revalidate these on upgrades.

## Published package vs repository main

At validation time:

```text
pub.dev stable:
  12.4.5

FlutterFire repository main:
  already ahead
```

Never implement unreleased `main` behavior assuming it exists in the application's installed package.

---

## Native SDK versions

FlutterFire upgrades can change:

- Android Firebase Analytics SDK
- Apple Firebase Analytics SDK
- Firebase JavaScript SDK
- minimum OS versions
- consent APIs
- advertising behavior

Read the release compatibility matrix.

---

## Web API parity

At the validated release line, Web does not support several Dart APIs:

```text
appInstanceId
getSessionId
resetAnalyticsData
setDefaultEventParameters
setSessionTimeoutDuration
```

Revalidate `firebase_analytics_web` after every major/minor upgrade.

---

## Session timeout

The underlying native Apple SDK and Flutter API surface do not currently imply equal behavior.

Inspect the Flutter method-channel implementation before claiming cross-platform support.

---

## Ecommerce item typing

Current:

```dart
AnalyticsEventItem.price
```

is numeric.

Do not trust copied examples that use a string price.

---

## In-app purchase APIs

Recent FlutterFire releases added/changed:

```text
logInAppPurchase
logTransaction
```

with Apple-specific behavior.

Revalidate:

- platform support
- StoreKit version
- native automatic events
- transaction verification requirements

before using them.

---

## Apple IDFA-free configuration

FlutterFire recently changed/fixed documentation around IDFA-free Apple Analytics dependencies.

Always inspect the current iOS installation notes rather than old Podfile/SPM snippets.

---

## Consent

Consent categories and regional behavior evolve.

Revalidate:

- Flutter method signature
- platform support
- GA consent mode
- advertising requirements
- product/legal policy

---

## Analytics limits

Revalidate:

- events
- parameters
- user properties
- string lengths
- custom dimensions
- custom metrics
- BigQuery export quotas
- Analytics 360 differences

before designing close to a limit.

---

## Platform privacy rules

Revalidate:

- Apple ATT
- IDFA
- Android advertising ID/privacy changes
- browser consent/cookie restrictions
- regional measurement controls

These can change independently of FlutterFire.

---

## Screen reporting

Flutter navigation architecture and Firebase screen-measurement behavior evolve.

Revalidate after:

- routing package migration
- Router architecture changes
- nested navigator changes
- FlutterFire upgrade

---

# Production Decision Rules

## Need to track login?

Use:

```dart
logLogin(...)
```

when its documented semantics match.

Set User-ID separately if the application has a privacy-appropriate authenticated identity strategy.

---

## Need to track sign-up?

Use:

```dart
logSignUp(...)
```

rather than a custom equivalent.

---

## Need to track search?

Use the recommended search helper where semantically correct.

Audit raw search text for privacy before sending.

---

## Need to track a product?

Use GA ecommerce:

```text
view_item
select_item
```

rather than generic:

```text
product_clicked
```

when ecommerce semantics fit.

---

## Need to track one unusual feature action?

A custom event is fine.

Keep:

- stable name
- documented trigger
- bounded parameters
- no PII
- low cardinality where practical

Do not introduce a typed-event hierarchy solely for one custom event in a tiny app.

---

## Need analytics on every screen?

Create one navigation tracking policy.

Do not add `logScreenView` to every widget.

---

## Need technical error detail?

Use Crashlytics/logging.

Analytics receives only a stable product failure category if that metric is useful.

---

## Need precise performance timing?

Use Performance Monitoring/profiling.

Do not send dozens of timing measurements as Analytics events.

---

## Need advanced event-level analysis?

Use BigQuery export.

Do not create hundreds of GA UI dimensions to approximate a warehouse.

---

# Official References

## FlutterFire / package

- https://pub.dev/packages/firebase_analytics
- https://pub.dev/packages/firebase_analytics/versions
- https://pub.dev/packages/firebase_analytics/changelog
- https://pub.dev/documentation/firebase_analytics/latest/
- https://pub.dev/documentation/firebase_analytics/latest/firebase_analytics/FirebaseAnalytics-class.html
- https://pub.dev/documentation/firebase_analytics/latest/firebase_analytics/AnalyticsEventItem-class.html
- https://pub.dev/documentation/firebase_analytics/latest/firebase_analytics/FirebaseAnalyticsObserver-class.html
- https://github.com/firebase/flutterfire/tree/main/packages/firebase_analytics
- https://github.com/firebase/flutterfire/blob/main/VERSIONS.md

## Firebase Analytics for Flutter

- https://firebase.google.com/docs/analytics/get-started?platform=flutter
- https://firebase.google.com/docs/flutter/setup

## Event/reference documentation

- https://firebase.google.com/docs/analytics/events
- https://firebase.google.com/docs/reference/android/com/google/firebase/analytics/FirebaseAnalytics
- https://developers.google.com/analytics/devguides/collection/ga4/reference/events
- https://support.google.com/analytics/answer/9267735

## Recommended events / ecommerce

- https://developers.google.com/analytics/devguides/collection/ga4/reference/events
- https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
- https://firebase.google.com/docs/analytics/measure-ecommerce

## User properties / identity

- https://firebase.google.com/docs/analytics/user-properties
- https://support.google.com/analytics/answer/9213390
- https://support.google.com/analytics/answer/6366371

## Privacy / PII

- https://support.google.com/analytics/answer/6366371
- https://support.google.com/analytics/answer/12002752
- https://firebase.google.com/docs/analytics/configure-data-collection

## Consent

- https://firebase.google.com/docs/analytics/configure-data-collection
- https://developers.google.com/tag-platform/security/guides/consent
- https://firebase.google.com/docs/analytics/configure-data-collection?platform=ios
- https://firebase.google.com/docs/analytics/configure-data-collection?platform=android

## Apple Analytics / advertising

- https://firebase.google.com/docs/analytics/get-started?platform=ios
- https://firebase.google.com/docs/ios/learn-more
- https://developer.apple.com/documentation/apptrackingtransparency

## Screen views

- https://firebase.google.com/docs/analytics/screenviews
- https://pub.dev/documentation/firebase_analytics/latest/firebase_analytics/FirebaseAnalyticsObserver-class.html

## DebugView

- https://firebase.google.com/docs/analytics/debugview
- https://firebase.google.com/docs/analytics/validate-events

## Reporting / cardinality

- https://support.google.com/analytics/answer/12226705
- https://support.google.com/analytics/answer/10096771
- https://support.google.com/analytics/answer/14240153

## Custom dimensions and metrics

- https://support.google.com/analytics/answer/10075209
- https://support.google.com/analytics/answer/14240153

## BigQuery

- https://firebase.google.com/docs/analytics/bigquery-export
- https://support.google.com/analytics/answer/9358801
- https://support.google.com/analytics/answer/7029846

## Environment / Firebase projects

- https://firebase.google.com/docs/projects/dev-workflows/general-best-practices
- https://firebase.google.com/docs/projects/learn-more

---

# Final Instructions for AI Coding Agents

Before modifying Analytics in a real Flutter project:

1. inspect the installed package version
2. identify every target platform
3. inspect Firebase environment configuration
4. determine collection/consent requirements
5. inventory existing event names
6. identify recommended GA events that match
7. identify PII/cardinality risks
8. identify current user identity lifecycle
9. identify current screen tracking ownership
10. identify ecommerce/purchase instrumentation
11. search for duplicate event sources
12. search for Analytics calls in `build()`
13. inspect dev/staging/prod project separation
14. verify current platform API support
15. implement the smallest coherent architecture that fixes the identified problems
16. validate with DebugView before relying on normal reports

The preferred production architecture is deliberately simple:

```text
meaningful product action
      |
      v
stable analytics contract
      |
      v
one application-scoped analytics service
      |
      v
Firebase Analytics
```

Avoid solving Analytics problems by:

- adding more events
- adding more parameters
- adding more wrappers
- logging every technical state
- waiting for every Analytics Future
- turning IDs into event names
- creating more custom dimensions
- copying raw models into parameter maps
- logging from `build()`
- calling `resetAnalyticsData()` on every logout
- creating a custom retry queue
- assuming all platforms expose identical APIs

Optimize for:

```text
stable semantics
correct recommended events
privacy
one-time event ownership
low cardinality
minimal runtime work
clean identity lifecycle
reliable ecommerce semantics
DebugView validation
warehouse compatibility
long-term schema maintainability
```

That produces more useful Analytics data and better Flutter runtime behavior than maximizing event volume.