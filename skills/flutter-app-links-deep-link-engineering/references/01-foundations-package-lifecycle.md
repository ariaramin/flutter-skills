# Foundations, package responsibilities, lifecycle, initial/runtime links, URI parsing and typed intents

## Contents

- [app_links Deep-Link Engineering Skill for Flutter](#applinks-deep-link-engineering-skill-for-flutter)
  - [Purpose](#purpose)
  - [When to Use This Skill](#when-to-use-this-skill)
  - [When NOT to Use app_links](#when-not-to-use-applinks)
- [Core Principles](#core-principles)
- [Mental Model](#mental-model)
- [Package Responsibilities](#package-responsibilities)
  - [app_links responsibilities](#applinks-responsibilities)
  - [Platform responsibilities](#platform-responsibilities)
  - [Hosting responsibilities](#hosting-responsibilities)
  - [Router responsibilities](#router-responsibilities)
  - [Application responsibilities](#application-responsibilities)
- [Platform Capability Matrix](#platform-capability-matrix)
- [Setup](#setup)
- [AppLinks Lifecycle](#applinks-lifecycle)
- [Initial Links](#initial-links)
- [Runtime Link Stream](#runtime-link-stream)
- [Initial Stream Delivery Semantics](#initial-stream-delivery-semantics)
- [Latest Link](#latest-link)
- [Malformed URI Behavior](#malformed-uri-behavior)
- [Cold Start vs Warm Start](#cold-start-vs-warm-start)
  - [Cold start](#cold-start)
  - [Warm/background/foreground delivery](#warmbackgroundforeground-delivery)
- [Duplicate Handling](#duplicate-handling)
- [URI Parsing](#uri-parsing)
- [URI Normalization](#uri-normalization)
- [URI Validation](#uri-validation)
- [Typed Deep-Link Intents](#typed-deep-link-intents)

---

# app_links Deep-Link Engineering Skill for Flutter

## Purpose

Use this skill to design, implement, review, test, secure, debug, and optimize production deep-link infrastructure in Flutter applications using `app_links`.

Treat `app_links` as a **platform link-delivery adapter**, not as a router, authorization layer, deferred-link service, or security framework.

As of the current published package documentation, `app_links` 7.2.1 supports Android, iOS, Linux, macOS, web, and Windows. Its current Dart API exposes `AppLinks()`, `getInitialLink()`, `getInitialLinkString()`, `getLatestLink()`, `getLatestLinkString()`, `uriLinkStream`, and `stringLinkStream`. `AppLinks()` is implemented as a singleton.

Use this skill to ensure an AI coding agent makes deep-link decisions in this order:

1. Determine who owns link delivery.
2. Determine whether `app_links` is actually necessary.
3. Configure operating-system association correctly.
4. Establish one application-level intake point.
5. Validate every external URI.
6. Convert raw URIs into typed application intentions.
7. Resolve application readiness.
8. Resolve authentication and authorization.
9. Deduplicate and make handling idempotent.
10. Navigate through one routing authority.
11. Test terminated, backgrounded, and foregrounded flows.
12. Verify production association using release signing and production domains.

---

## When to Use This Skill

Use this skill when implementing or reviewing:

- Android App Links;
- Android custom deep links;
- iOS Universal Links;
- iOS custom URL schemes;
- macOS link handling;
- Windows protocol/web-to-app activation;
- Linux custom schemes;
- Flutter web startup URL intake;
- links from email, websites, QR codes, messages, or other apps;
- authentication-gated links;
- password reset, invitation, email verification, or magic-link flows;
- links received before the router is ready;
- pending destinations preserved across login;
- `go_router` integration;
- Navigator-based navigation;
- deep-link security reviews;
- duplicate navigation bugs;
- platform association failures;
- release-signing verification failures;
- link observability and analytics;
- migration from another deep-link plugin;
- migration from raw platform channels;
- conflicts between Flutter's built-in deep-link handling and `app_links`.

---

## When NOT to Use app_links

Do not add `app_links` automatically.

Avoid it when the existing application already has a clean authoritative deep-link pipeline.

### Router already handles platform deep links

`go_router` directly supports deep links delivered through Flutter's Router infrastructure. Its current documentation states that when the platform provides a deep link, `GoRouter` displays the configured screen based on the URL path.

If that already satisfies the application:

```text
OS
↓
Flutter Router
↓
go_router
↓
screen
```

do not add a second pipeline:

```text
OS
├─ Flutter Router → go_router
└─ app_links → router.go(...)
```

without a concrete reason.

That architecture risks duplicate navigation.

### Only internal navigation is needed

For:

```dart
context.go('/settings');
```

or:

```dart
Navigator.of(context).push(...);
```

no deep-link package is required.

### Notification routing is the actual requirement

Push notifications and deep links are different delivery mechanisms.

A notification payload may contain a route or URL, but the notification plugin owns notification delivery. Share the same URI parser/resolver if useful; do not pretend `app_links` receives notification taps.

### Deferred-install/deferred-attribution links are required

`app_links` receives links delivered to an installed application. It is not a deferred-install attribution service.

Do not assume it will:

- remember a click before installation;
- attribute an install;
- recover campaign metadata after store installation;
- replace a deferred deep-link provider.

### Platform-native integration already solves the requirement

If an application has a deliberate native link handler that already forwards validated typed commands into Flutter, adding `app_links` may be redundant.

---

# Core Principles

Apply these rules without exception unless the application's documented architecture explicitly requires otherwise.

1. **Treat every incoming URI as untrusted external input.**
2. **Separate OS link association from Dart routing.**
3. **Create one application-level owner for external link intake.**
4. **Instantiate `AppLinks` early when it is the selected intake mechanism.**
5. **Prefer one URI stream listener rather than listeners throughout the widget tree.**
6. **Cancel every subscription owned by a finite-lifetime object.**
7. **Handle cold-start and runtime delivery explicitly.**
8. **Do not navigate before application readiness is known.**
9. **Validate scheme, host, path, and parameters using `Uri`.**
10. **Never validate domains with string-prefix or substring matching.**
11. **Convert validated external URIs into typed application intents.**
12. **Do not pass arbitrary raw external URLs deep into business logic.**
13. **Use one authoritative navigation pipeline.**
14. **Preserve auth-gated destinations only in validated form.**
15. **Revalidate pending destinations after authentication.**
16. **Authentication is not authorization.**
17. **Possession of a link never proves permission.**
18. **Make link handling idempotent.**
19. **Design duplicate delivery to be harmless.**
20. **Prefer verified HTTPS links for sensitive cross-app/web flows when practical.**
21. **Do not execute destructive business operations directly from a link callback.**
22. **Do not log sensitive complete URLs.**
23. **Test actual platform association, not only Dart URI parsing.**
24. **Test release-signing/domain association before production launch.**
25. **Treat published URI formats as external compatibility contracts.**

---

# Mental Model

Use this model:

```text
External URI
↓
Operating system decides eligible application
↓
Platform association / registered scheme
↓
app_links receives platform event
↓
Dart Uri
↓
Scheme + host + path validation
↓
Typed DeepLinkIntent
↓
Duplicate/idempotency gate
↓
Application readiness
↓
Authentication
↓
Authorization / backend validation
↓
Router
↓
Destination
```

Do not collapse those layers.

A failure in:

```text
assetlinks.json
```

cannot be fixed by changing:

```dart
router.go(...)
```

A malformed URI cannot be made safe because Android verification succeeded.

A logged-in user is not automatically authorized for the linked tenant or resource.

---

# Package Responsibilities

## app_links responsibilities

Use `app_links` to:

- receive URLs the operating system forwards to the application;
- expose the first/initial link;
- expose the latest received link;
- expose runtime URI/string streams;
- bridge platform URL events into Dart.

The package's main API is intentionally small.

## Platform responsibilities

The operating system owns:

- Android intent matching;
- Android App Link verification;
- custom-scheme registration;
- iOS Universal Link association;
- Associated Domains;
- native lifecycle event delivery;
- desktop protocol registration.

## Hosting responsibilities

Your web infrastructure owns:

- `/.well-known/assetlinks.json`;
- `apple-app-site-association`;
- domain control;
- HTTPS;
- correct production association content;
- stable public web fallback behavior.

## Router responsibilities

A router owns:

- matching internal application locations;
- navigation stacks;
- redirects;
- nested routes;
- back behavior.

`app_links` does not replace `go_router` or Navigator.

## Application responsibilities

Your application owns:

- URI allowlists;
- semantic parsing;
- parameter validation;
- authentication;
- authorization;
- resource validation;
- pending links;
- deduplication;
- idempotency;
- navigation decisions;
- analytics;
- redaction;
- user-facing failure states.

---

# Platform Capability Matrix

Current package documentation publishes this support matrix.

| Platform | Custom scheme | HTTPS/web-to-app | Initial link | Runtime stream | Important notes |
| --- | --- | --- | --- | --- | --- |
| Android | Yes | Yes | Yes | Yes | Verified HTTPS requires Android App Links configuration |
| iOS | Yes | Yes | Yes | Yes | Universal Links require Associated Domains/AASA |
| macOS | Yes | Yes | Yes | Yes | Universal Link forwarding requires documented macOS AppDelegate integration |
| Windows | Yes | Yes | Yes | Yes | Packaged activation/registration requires Windows configuration |
| Linux | Yes | Package matrix does not claim verified HTTPS support | Platform dependent | Yes for supported URI activation | Package docs focus on custom-scheme registration |
| Web | No custom scheme support | Browser URL | Yes | Effectively startup/current URL only | Official docs state only the first link is provided |

The web implementation captures `window.location.href`; its URI/string stream is a single-value stream of that URL rather than a mobile-style sequence of runtime external-link activations.

Do not design Flutter web navigation around `app_links` runtime streams. Use normal web routing for browser URL changes.

---

# Setup

Add the current compatible dependency for the repository's Flutter/Dart SDK constraints:

```yaml
dependencies:
  app_links: ^7.2.1
```

Verify the package version already present in `pubspec.lock` before changing APIs.

Current 7.x development raised minimum Flutter/Dart versions over time, and 7.1.x moved the minimum to Flutter 3.44/Dart 3.12. Check the current published release constraints during upgrades.

Do not copy old examples containing obsolete initial-link API names.

---

# AppLinks Lifecycle

`AppLinks()` is a singleton factory in the current implementation:

```dart
final appLinks = AppLinks();
```

Repeated constructor calls return the same Dart-side `AppLinks` instance.

This does **not** mean every widget should create its own subscriptions.

Prefer:

```text
application scope
↓
one DeepLinkService / Coordinator
↓
one AppLinks instance reference
↓
one uriLinkStream subscription
```

The package README explicitly recommends instantiating `AppLinks` early so the application can catch the first link during cold startup.

### Preferred ownership

Use an app-scoped dependency:

```dart
final class DeepLinkSource {
  DeepLinkSource({AppLinks? appLinks})
      : _appLinks = appLinks ?? AppLinks();

  final AppLinks _appLinks;

  Future<Uri?> getInitialLink() => _appLinks.getInitialLink();

  Stream<Uri> get links => _appLinks.uriLinkStream;
}
```

This enables:

- dependency injection;
- test replacement;
- one lifecycle owner;
- separation from UI.

Do not use arbitrary widget contexts inside this service.

---

# Initial Links

Current APIs:

```dart
Future<Uri?> getInitialLink()
Future<String?> getInitialLinkString()
```

The initial link is the first link captured by the native plugin.

Android and iOS source keep an `initialLink` value once set and return it from the method channel. Calling `getInitialLink()` does not consume or clear it.

Therefore do not assume:

```dart
await appLinks.getInitialLink();
await appLinks.getInitialLink();
```

means the second call must return null.

Treat the initial link as a stored first-link value, not a queue.

Example:

```dart
Future<void> processInitialLink(AppLinks appLinks) async {
  final uri = await appLinks.getInitialLink();
  if (uri == null) {
    return;
  }

  await handleIncomingUri(uri);
}
```

If using `getInitialLinkString()` instead, parse safely:

```dart
final raw = await appLinks.getInitialLinkString();

if (raw != null) {
  final uri = Uri.tryParse(raw);
  if (uri != null) {
    await handleIncomingUri(uri);
  }
}
```

Prefer the URI API unless preserving the exact raw string is required.

---

# Runtime Link Stream

Current APIs:

```dart
Stream<Uri> get uriLinkStream
Stream<String> get stringLinkStream
```

The package's public usage example subscribes to `uriLinkStream` and documents it as receiving the initial link and subsequent links.

```dart
late final StreamSubscription<Uri> _subscription;

void start() {
  _subscription = AppLinks().uriLinkStream.listen(
    handleIncomingUri,
    onError: handleLinkStreamError,
  );
}

Future<void> dispose() async {
  await _subscription.cancel();
}
```

The current Dart facade creates broadcast controllers, so more than one Dart listener can receive an event.

That is a capability, not an architectural recommendation.

If two listeners both navigate:

```dart
appLinks.uriLinkStream.listen(routerA.handle);
appLinks.uriLinkStream.listen(routerB.handle);
```

both can respond.

Prefer one link coordinator.

---

# Initial Stream Delivery Semantics

Current Android and iOS native implementations store:

- `initialLink`;
- `latestLink`;
- an `initialLinkSent` flag.

When the platform stream starts listening, the native implementation sends the initial link through the stream if one exists and has not yet been sent through that event channel. Subsequent links are emitted directly.

This means a common current pattern can be:

```dart
final sub = AppLinks().uriLinkStream.listen(handleIncomingUri);
```

because the stream can carry the initial link as well.

However, a production architecture may deliberately call `getInitialLink()` separately for deterministic startup orchestration.

If using **both**:

```dart
final initial = await appLinks.getInitialLink();
final subscription = appLinks.uriLinkStream.listen(...);
```

make the application layer duplicate-safe.

Do not depend on subtle plugin timing as your only double-navigation defense.

---

# Latest Link

Current APIs also expose:

```dart
Future<Uri?> getLatestLink()
Future<String?> getLatestLinkString()
```

The native plugin updates the latest-link value whenever it handles another URL.

Use this for diagnostics or explicit "most recently delivered URL" requirements.

Do not use `getLatestLink()` as a substitute for the event stream:

```dart
Timer.periodic(..., (_) => appLinks.getLatestLink());
```

That introduces polling and duplicate processing.

---

# Malformed URI Behavior

Current method-channel URI conversion uses `Uri.tryParse`.

For:

```dart
getInitialLink()
getLatestLink()
```

a non-null raw link that cannot be parsed becomes `null`.

For `uriLinkStream`, unparseable strings are not emitted as `Uri` events by the Dart transformer.

The 7.1.2 changelog specifically notes a fix preventing crashes on malformed URIs.

If exact malformed-input diagnostics are required, `stringLinkStream` can expose raw strings, but production routing should still reject invalid input.

---

# Cold Start vs Warm Start

Use this mental model.

## Cold start

```text
User taps external link
↓
App not running
↓
OS resolves registered/verified handler
↓
OS launches application
↓
native app_links plugin captures URL
↓
Flutter engine starts
↓
app-scoped listener/getInitialLink becomes available
↓
parse + validate
↓
wait for app readiness
↓
resolve auth/authorization
↓
navigate once
```

Android source explicitly processes the Activity's startup intent when attached to the Activity.

iOS 7.x supports both application and scene lifecycle delivery, including scene connection options for initial custom-scheme/Universal-Link events.

## Warm/background/foreground delivery

```text
App process already exists
↓
user activates matching URL
↓
OS forwards new URL event
↓
app_links emits stream event
↓
validate
↓
resolve current app state
↓
navigate
```

Do not base application semantics on vague labels such as "warm start." Base them on:

- did the process already exist?
- is initialization complete?
- is a valid session available?
- is the router ready?
- is another transition already in progress?

---

# Duplicate Handling

Even when package-native code avoids resending its stored initial event repeatedly on a single native event stream, the application can still produce duplicate behavior through:

- processing both `getInitialLink()` and `uriLinkStream`;
- multiple Dart subscribers;
- router built-in deep-link handling plus `app_links`;
- a notification payload and a deep link representing the same action;
- repeated user taps;
- OS/platform lifecycle behavior;
- application retry logic.

Therefore make handling idempotent.

### Minimal short-window deduplicator

```dart
final class DeepLinkDeduplicator {
  DeepLinkDeduplicator({
    this.window = const Duration(seconds: 2),
  });

  final Duration window;

  String? _lastKey;
  DateTime? _lastHandledAt;

  bool shouldHandle(Uri uri, DateTime now) {
    final key = _canonicalKey(uri);

    final duplicate = _lastKey == key &&
        _lastHandledAt != null &&
        now.difference(_lastHandledAt!) <= window;

    if (duplicate) {
      return false;
    }

    _lastKey = key;
    _lastHandledAt = now;
    return true;
  }

  String _canonicalKey(Uri uri) {
    return Uri(
      scheme: uri.scheme.toLowerCase(),
      host: uri.host.toLowerCase(),
      port: uri.hasPort ? uri.port : null,
      path: uri.path,
      query: uri.hasQuery ? uri.query : null,
      fragment: uri.hasFragment ? uri.fragment : null,
    ).toString();
  }
}
```

Use a short-window URI deduplicator only for navigation duplication.

For business actions, use domain-level idempotency.

Example:

```text
/payment/confirm?id=123
```

must not charge the user merely because it was handled once.

The destination should load authoritative backend state, and the backend should enforce idempotency.

---

# URI Parsing

Always use Dart's `Uri`.

Do not manually split URLs:

```dart
final parts = raw.split('/');
```

Use:

```dart
final uri = Uri.tryParse(raw);

if (uri == null) {
  return;
}

final scheme = uri.scheme;
final host = uri.host;
final segments = uri.pathSegments;
final query = uri.queryParameters;
final fragment = uri.fragment;
```

Important `Uri` concepts:

- `scheme`: `https`, `myapp`;
- `host`: `example.com`;
- `port`: explicit authority port;
- `path`: decoded/represented URL path semantics;
- `pathSegments`: structured path components;
- `queryParameters`: map-like convenience view;
- `queryParametersAll`: preserve repeated query values;
- `fragment`: content after `#`.

Use `queryParametersAll` if duplicated query parameters carry security or protocol significance.

---

# URI Normalization

Normalize only where semantics permit.

Safe candidates commonly include:

- lowercasing scheme;
- lowercasing DNS host;
- removing a default port only when the application's URI contract treats it as equivalent.

Do not blindly:

- lowercase path segments;
- alphabetically reorder semantically significant duplicated query parameters;
- decode and re-encode arbitrary tokens;
- strip trailing slash if `/product` and `/product/` differ;
- remove fragments if the application uses them;
- normalize signed URLs whose signature depends on exact encoding.

Separate:

```text
canonical key used for duplicate detection
```

from:

```text
original validated URI used by the protocol
```

when necessary.

---

# URI Validation

Incoming URLs are attacker-controlled input.

Validate in layers.

```dart
final class DeepLinkPolicy {
  static const allowedHttpsHosts = {
    'example.com',
    'www.example.com',
  };

  static const allowedCustomSchemes = {
    'myapp',
  };

  bool isAllowedOrigin(Uri uri) {
    if (uri.scheme == 'https') {
      return allowedHttpsHosts.contains(uri.host.toLowerCase());
    }

    if (allowedCustomSchemes.contains(uri.scheme.toLowerCase())) {
      return true;
    }

    return false;
  }
}
```

Never do:

```dart
if (uri.toString().startsWith('https://example.com')) {
  // unsafe
}
```

because:

```text
https://example.com.evil.test/
```

also starts with that string.

Never do:

```dart
if (uri.host.contains('example.com')) {
```

Use exact hosts or a deliberately implemented subdomain rule.

For controlled subdomains:

```dart
bool isExampleDomain(String host) {
  final normalized = host.toLowerCase();
  return normalized == 'example.com' ||
      normalized.endsWith('.example.com');
}
```

Use the suffix form only when **all** subdomains are trusted.

---

# Typed Deep-Link Intents

For non-trivial applications, stop passing raw URIs after validation.

Define explicit intentions.

```dart
sealed class DeepLinkIntent {
  const DeepLinkIntent();
}

final class OpenProduct extends DeepLinkIntent {
  const OpenProduct(this.productId);

  final String productId;
}

final class OpenBilling extends DeepLinkIntent {
  const OpenBilling();
}

final class AcceptInvite extends DeepLinkIntent {
  const AcceptInvite(this.token);

  final String token;
}

final class ResetPassword extends DeepLinkIntent {
  const ResetPassword(this.token);

  final String token;
}
```

Then implement a parser:

```dart
sealed class DeepLinkParseResult {
  const DeepLinkParseResult();
}

final class ValidDeepLink extends DeepLinkParseResult {
  const ValidDeepLink(this.intent);

  final DeepLinkIntent intent;
}

final class RejectedDeepLink extends DeepLinkParseResult {
  const RejectedDeepLink(this.reason);

  final String reason;
}

final class DeepLinkParser {
  const DeepLinkParser();

  static const _httpsHosts = {
    'example.com',
    'www.example.com',
  };

  DeepLinkParseResult parse(Uri uri) {
    if (!_isAllowedOrigin(uri)) {
      return const RejectedDeepLink('unsupported_origin');
    }

    final segments = uri.pathSegments;

    if (segments.length == 2 && segments[0] == 'products') {
      final id = segments[1].trim();
      if (id.isEmpty || id.length > 128) {
        return const RejectedDeepLink('invalid_product_id');
      }

      return ValidDeepLink(OpenProduct(id));
    }

    if (segments.length == 2 &&
        segments[0] == 'account' &&
        segments[1] == 'billing') {
      return const ValidDeepLink(OpenBilling());
    }

    if (segments.length == 2 && segments[0] == 'invite') {
      final token = segments[1];
      if (!_isReasonableOpaqueToken(token)) {
        return const RejectedDeepLink('invalid_invite_token');
      }

      return ValidDeepLink(AcceptInvite(token));
    }

    if (segments.length == 2 &&
        segments[0] == 'reset-password') {
      final token = segments[1];
      if (!_isReasonableOpaqueToken(token)) {
        return const RejectedDeepLink('invalid_reset_token');
      }

      return ValidDeepLink(ResetPassword(token));
    }

    return const RejectedDeepLink('unsupported_path');
  }

  bool _isAllowedOrigin(Uri uri) {
    final scheme = uri.scheme.toLowerCase();

    if (scheme == 'https') {
      return _httpsHosts.contains(uri.host.toLowerCase());
    }

    if (scheme == 'myapp') {
      return uri.host == 'open';
    }

    return false;
  }

  bool _isReasonableOpaqueToken(String value) {
    return value.isNotEmpty && value.length <= 2048;
  }
}
```

The token length check is only syntactic defense. Token validity must be enforced by the backend.

---

