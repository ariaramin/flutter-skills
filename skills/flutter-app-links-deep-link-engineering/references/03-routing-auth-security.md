# go_router/Navigator integration, readiness, auth, authorization, security, idempotency and observability

## Contents

- [go_router Integration](#gorouter-integration)
  - [First decision: do you need app_links at all?](#first-decision-do-you-need-applinks-at-all)
- [go_router Forwarding Pattern](#gorouter-forwarding-pattern)
- [go_router Authentication](#gorouter-authentication)
- [go_router Checklist](#gorouter-checklist)
- [Navigator Integration](#navigator-integration)
- [Navigation Readiness](#navigation-readiness)
- [Authentication-Gated Links](#authentication-gated-links)
- [Authorization](#authorization)
- [Pending Deep Links](#pending-deep-links)
- [Security](#security)
  - [Treat all links as attacker-controlled](#treat-all-links-as-attacker-controlled)
  - [Allowlist schemes](#allowlist-schemes)
  - [Allowlist hosts](#allowlist-hosts)
  - [Allowlist routes](#allowlist-routes)
- [Redirect Parameters](#redirect-parameters)
- [Sensitive Information in URLs](#sensitive-information-in-urls)
- [Replay-Sensitive Links](#replay-sensitive-links)
- [Custom Scheme Hijacking](#custom-scheme-hijacking)
- [Deep-Link Coordinator](#deep-link-coordinator)
- [Idempotency](#idempotency)
- [Lifecycle and Subscription Ownership](#lifecycle-and-subscription-ownership)
  - [App-scoped ownership](#app-scoped-ownership)
  - [Widget-owned subscription](#widget-owned-subscription)
- [Performance](#performance)
- [Error Handling](#error-handling)
- [User Experience](#user-experience)
- [Analytics and Observability](#analytics-and-observability)

---

# go_router Integration

## First decision: do you need app_links at all?

Current `go_router` handles platform deep links through Flutter's Router integration.

Use this decision process:

```text
Does go_router already receive all required external links?
├─ yes
│  ↓
│  Do not add app_links just to call router.go()
│
└─ no
   ↓
   Is app_links required for supplemental/custom native delivery?
   ├─ yes → configure one app_links intake
   └─ no  → keep router-native pipeline
```

The current `app_links` Android/iOS setup specifically tells applications to disable Flutter's default deep-link handling when `app_links` is the selected third-party handler.

That is the critical duplication boundary.

Do not configure both paths casually.

---

# go_router Forwarding Pattern

If `app_links` is the deliberate platform intake mechanism:

```text
app_links
↓
DeepLinkParser
↓
DeepLinkIntent
↓
DeepLinkCoordinator
↓
GoRouter
```

Do not send arbitrary external URLs directly to:

```dart
router.go(uri.toString());
```

unless the application's routing contract explicitly uses and validates the full URI.

Prefer typed mapping:

```dart
String locationForIntent(DeepLinkIntent intent) {
  return switch (intent) {
    OpenProduct(:final productId) =>
      '/products/${Uri.encodeComponent(productId)}',
    OpenBilling() => '/account/billing',
    AcceptInvite(:final token) =>
      '/invite/${Uri.encodeComponent(token)}',
    ResetPassword(:final token) =>
      '/reset-password/${Uri.encodeComponent(token)}',
  };
}
```

Then:

```dart
router.go(locationForIntent(intent));
```

---

# go_router Authentication

`go_router` supports redirects based on application state.

Do not encode external untrusted targets directly into unrestricted `redirect` values.

Prefer:

```text
validated DeepLinkIntent
↓
pending intent
↓
login
↓
revalidate current account/session
↓
resolve internal location
↓
go()
```

Do not store:

```dart
?redirect=https://whatever-the-user-sent.example
```

and blindly forward it later.

---

# go_router Checklist

Before integrating `app_links` with `go_router`:

- [ ] Determine whether Flutter Router deep linking is enabled.
- [ ] Determine whether `go_router` already receives platform routes.
- [ ] Determine whether `flutter_deeplinking_enabled` is disabled on Android.
- [ ] Determine whether `FlutterDeepLinkingEnabled` is disabled on iOS.
- [ ] Ensure only one mechanism owns OS-delivered initial URLs.
- [ ] Parse and validate before calling `go`.
- [ ] Use internal route locations, not arbitrary external strings.
- [ ] Handle auth redirects without losing validated intent.
- [ ] Revalidate pending intent after login.
- [ ] Test nested routes and shell routes.
- [ ] Test Android cold start.
- [ ] Test iOS cold start.
- [ ] Verify a single navigation occurs.

---

# Navigator Integration

For Navigator-based applications, do not place a long-lived `BuildContext` in the deep-link service.

Prefer a root navigator key:

```dart
final rootNavigatorKey = GlobalKey<NavigatorState>();

MaterialApp(
  navigatorKey: rootNavigatorKey,
  // ...
);
```

Expose an application navigation abstraction:

```dart
abstract interface class AppNavigator {
  Future<void> openProduct(String id);
  Future<void> openBilling();
}

final class NavigatorAppNavigator implements AppNavigator {
  NavigatorAppNavigator(this.navigatorKey);

  final GlobalKey<NavigatorState> navigatorKey;

  @override
  Future<void> openProduct(String id) async {
    await navigatorKey.currentState?.pushNamed(
      '/product',
      arguments: id,
    );
  }

  @override
  Future<void> openBilling() async {
    await navigatorKey.currentState?.pushNamed('/billing');
  }
}
```

The deep-link coordinator depends on `AppNavigator`, not a widget context.

---

# Navigation Readiness

A valid link may arrive before:

- dependency injection completes;
- secure storage is loaded;
- auth restoration completes;
- tenant state is loaded;
- router/navigation key exists;
- migration/mandatory update gates finish.

Do not navigate immediately solely because a URI arrived.

Use:

```text
link
↓
validate
↓
typed intent
↓
pending slot/queue
↓
wait for readiness
↓
resolve current auth/authorization
↓
consume once
```

Model readiness explicitly:

```dart
enum AppReadiness {
  starting,
  ready,
  blocked,
}
```

Do not retain pending links forever.

Use one or more:

- expiry;
- session binding;
- maximum queue size;
- replacement policy;
- explicit consume semantics.

For most applications, one latest pending navigation intent is safer than an unbounded queue.

---

# Authentication-Gated Links

Use this flow:

```text
validated intent
↓
does destination require authentication?
├─ no → resolve + navigate
└─ yes
   ↓
authenticated?
├─ yes → authorization → navigate
└─ no
   ↓
store typed safe pending intent
↓
navigate to login
↓
login succeeds
↓
reload account/tenant state
↓
revalidate pending intent
↓
authorization
↓
consume pending intent exactly once
↓
navigate
```

Example:

```dart
final class PendingDeepLinkStore {
  DeepLinkIntent? _pending;

  void set(DeepLinkIntent intent) {
    _pending = intent;
  }

  DeepLinkIntent? take() {
    final value = _pending;
    _pending = null;
    return value;
  }

  void clear() {
    _pending = null;
  }
}
```

For sensitive links, also store:

- received time;
- intended user/account where known;
- safe non-secret metadata.

Do not persist reset tokens indefinitely unless the protocol requires persistence and storage is appropriately protected.

---

# Authorization

Authentication answers:

```text
Who is the user?
```

Authorization answers:

```text
May this user access this destination/resource?
```

For:

```text
https://example.com/organizations/acme/invoices/42
```

do not navigate just because:

```dart
session.isAuthenticated == true
```

Validate:

- organization membership;
- resource ownership;
- role;
- backend permission;
- resource existence.

Possession of a deep link is never authorization.

Apple's own Universal Link guidance warns that URLs are an attack vector and recommends validating parameters and not allowing links to directly perform risky data actions.

---

# Pending Deep Links

Store the **typed intent**, not an arbitrary raw external URL, when possible.

Better:

```dart
OpenProduct('42')
```

rather than:

```dart
'https://example.com/products/42?whatever=...'
```

Before consuming pending links:

1. check expiry;
2. check current authenticated identity;
3. revalidate resource access;
4. ensure mandatory application gates are cleared;
5. deduplicate;
6. clear before/atomically with navigation.

Clear pending destinations when:

- logout occurs;
- account changes;
- destination expires;
- app enters a state where intent is no longer valid.

---

# Security

## Treat all links as attacker-controlled

Incoming URLs can originate from:

- email;
- web;
- QR codes;
- another app;
- social platforms;
- manually entered data;
- malicious applications;
- copied messages.

OS delivery does not make URI contents trustworthy.

## Allowlist schemes

Example:

```dart
const allowedSchemes = {
  'https',
  'myapp',
};
```

Reject everything else.

## Allowlist hosts

Example:

```dart
const allowedHosts = {
  'example.com',
  'links.example.com',
};
```

Do not use:

```dart
host.contains('example.com')
```

## Allowlist routes

Do not build arbitrary route names from path values.

Bad:

```dart
router.go(uri.path);
```

Better:

```dart
switch (parser.parse(uri)) {
  case ValidDeepLink(:final intent):
    await coordinator.handle(intent);
  case RejectedDeepLink():
    // reject safely
}
```

---

# Redirect Parameters

Treat:

```text
/login?next=...
```

as a high-risk input.

Bad:

```dart
final next = uri.queryParameters['next'];
if (next != null) {
  router.go(next);
}
```

Better: support internal route identifiers:

```text
/login?next=billing
```

then:

```dart
String? allowedLocationForNext(String? value) {
  return switch (value) {
    'billing' => '/account/billing',
    'profile' => '/account/profile',
    _ => null,
  };
}
```

If URL-form redirects are unavoidable, parse them as `Uri` and require an explicit allowlist.

Never create an open redirect.

---

# Sensitive Information in URLs

URLs can leak into:

- browser history;
- email scanners;
- system logs;
- application logs;
- analytics;
- proxy logs;
- screenshots;
- clipboard history;
- crash reports.

Avoid secrets in URLs where protocol design allows.

When one-time tokens are required:

```text
/reset-password/<token>
/magic-login?code=<code>
```

treat them as credentials.

Never log:

```dart
debugPrint('Received link: $uri');
```

for sensitive routes.

Redact:

```dart
String safeLinkDescription(Uri uri) {
  return '${uri.scheme}://${uri.host}${uri.pathSegments.isEmpty ? '' : '/${uri.pathSegments.first}'}';
}
```

or log only a typed category:

```text
deep_link_received type=reset_password
```

---

# Replay-Sensitive Links

For:

- password reset;
- magic login;
- email verification;
- invite acceptance;
- payment confirmation;

the backend must enforce:

- expiry;
- single-use behavior when required;
- intended account;
- transaction state;
- authorization.

`app_links` cannot enforce backend token validity.

---

# Custom Scheme Hijacking

Custom schemes do not provide the website-ownership verification offered by Android App Links or Apple Universal Links.

For sensitive flows, prefer verified HTTPS links when supported by the product/platform.

If custom schemes are unavoidable for an OAuth/native protocol, use the security mechanisms required by that protocol, such as state verification and PKCE where appropriate.

Do not infer security from the uniqueness of a scheme name.

---

# Deep-Link Coordinator

For larger applications, centralize lifecycle orchestration without turning the class into business logic.

```dart
import 'dart:async';

import 'package:app_links/app_links.dart';

final class DeepLinkCoordinator {
  DeepLinkCoordinator({
    AppLinks? appLinks,
    required DeepLinkParser parser,
    required DeepLinkDeduplicator deduplicator,
    required DeepLinkIntentHandler handler,
  })  : _appLinks = appLinks ?? AppLinks(),
        _parser = parser,
        _deduplicator = deduplicator,
        _handler = handler;

  final AppLinks _appLinks;
  final DeepLinkParser _parser;
  final DeepLinkDeduplicator _deduplicator;
  final DeepLinkIntentHandler _handler;

  StreamSubscription<Uri>? _subscription;

  Future<void> start() async {
    if (_subscription != null) {
      return;
    }

    _subscription = _appLinks.uriLinkStream.listen(
      (uri) {
        unawaited(_handleUri(uri));
      },
      onError: (Object error, StackTrace stackTrace) {
        _handler.reportDeliveryError(error, stackTrace);
      },
    );
  }

  Future<void> _handleUri(Uri uri) async {
    if (!_deduplicator.shouldHandle(uri, DateTime.now())) {
      return;
    }

    final result = _parser.parse(uri);

    switch (result) {
      case ValidDeepLink(:final intent):
        await _handler.handle(intent);

      case RejectedDeepLink(:final reason):
        _handler.reportRejected(reason);
    }
  }

  Future<void> dispose() async {
    await _subscription?.cancel();
    _subscription = null;
  }
}

abstract interface class DeepLinkIntentHandler {
  Future<void> handle(DeepLinkIntent intent);

  void reportRejected(String reason);

  void reportDeliveryError(
    Object error,
    StackTrace stackTrace,
  );
}
```

If startup orchestration requires explicit `getInitialLink()` handling, feed it through the same `_handleUri` pipeline and keep deduplication enabled.

---

# Idempotency

Design link handling so the same intent twice does not cause unsafe duplicate effects.

Safe:

```text
link
↓
navigate to Invite screen
↓
screen/service asks backend for current invite state
↓
backend accepts once
```

Dangerous:

```text
link callback
↓
POST /accept-invite
```

with no replay protection.

Navigation deduplication and business idempotency solve different problems.

Use both where required.

---

# Lifecycle and Subscription Ownership

## App-scoped ownership

Preferred:

```text
App bootstrap
↓
DeepLinkCoordinator.start()
↓
subscription exists for app lifetime
```

If the coordinator is application-lifetime, cancellation may happen only during explicit teardown/testing.

## Widget-owned subscription

If a widget intentionally owns a feature-specific listener:

```dart
class LinkAwareViewState extends State<LinkAwareView> {
  StreamSubscription<Uri>? _subscription;

  @override
  void initState() {
    super.initState();

    _subscription = AppLinks().uriLinkStream.listen(_onLink);
  }

  void _onLink(Uri uri) {
    // Feature-scoped handling only.
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
```

Never subscribe in `build()`.

---

# Performance

Deep-link parsing is rarely a meaningful application performance bottleneck.

Optimize architecture, not nanoseconds.

Prefer:

```text
receive Uri
↓
cheap syntactic validation
↓
typed intent
↓
dispatch async work
```

Do not perform expensive synchronous operations directly in the stream callback.

Avoid:

- parsing the same URI in five layers;
- multiple global listeners;
- repeated router reconstruction;
- synchronous database scans;
- giant reflective route maps;
- indefinite duplicate caches.

Network validation belongs in domain/application services.

Show a loading state while:

- checking invitation validity;
- resolving a product;
- loading account authorization.

Profile only if deep-link processing demonstrably affects startup.

---

# Error Handling

Use structured categories rather than one `"invalid link"` bucket.

```dart
enum DeepLinkFailure {
  malformedUri,
  unsupportedScheme,
  unsupportedHost,
  unsupportedRoute,
  invalidParameter,
  appNotReady,
  authenticationRequired,
  unauthorized,
  expiredToken,
  unavailableResource,
  duplicate,
  platformDeliveryFailure,
}
```

Keep:

```text
platform delivery failure
```

separate from:

```text
application route failure
```

because remediation is different.

---

# User Experience

Choose the response based on intent.

### Silently ignore

Appropriate for:

- clearly irrelevant unsupported platform URL delivered accidentally;
- internal duplicate already handled.

### Show "Link not supported"

Appropriate when:

- user intentionally opened a link;
- host is owned but route no longer exists.

### Show login

Appropriate for:

- valid protected route;
- session absent.

### Show "Link expired"

Appropriate for:

- reset/invite token rejected by backend as expired.

### Show "Access denied"

Appropriate for:

- authenticated user lacks authorization.

### Open website fallback

Only if:

- product architecture defines a safe web fallback;
- destination is allowlisted;
- fallback does not cause redirect loops.

Do not silently send an untrusted external redirect to a browser.

---

# Analytics and Observability

Track semantic, privacy-safe events.

Examples:

```text
deep_link_received
  type=product
  source=external

deep_link_rejected
  reason=unsupported_host

deep_link_deferred
  reason=auth_required

deep_link_navigation_completed
  destination=product
```

Do not log:

```text
reset token
magic code
access token
authorization code
full invite secret
```

Useful diagnostics include:

- initial link present/absent;
- stream listener started;
- link category;
- parser result;
- rejection reason;
- pending-intent state;
- auth deferral;
- authorization failure;
- navigation completion;
- duplicate suppressed.

Never use logs as a replacement for platform verification tooling.

---

