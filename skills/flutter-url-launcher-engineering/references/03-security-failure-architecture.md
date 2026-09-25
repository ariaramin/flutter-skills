# Security, Failure UX, Architecture & Observability

> Preserved from source lines 1365–2020 of `url_launcher Engineering Skill for Flutter.md`.
> Use this reference for detailed APIs, examples, caveats, platform notes, and source-grounded edge cases.

## Contents
- [Security](#security)
  - [User-controlled URLs](#user-controlled-urls)
  - [Scheme allowlist](#scheme-allowlist)
  - [Host allowlist](#host-allowlist)
  - [Controlled subdomains](#controlled-subdomains)
  - [Strong external-web validator](#strong-external-web-validator)
  - [HTTPS preference](#https-preference)
  - [Sensitive data in URLs](#sensitive-data-in-urls)
  - [Logging](#logging)
  - [Open redirects](#open-redirects)
  - [Custom-scheme hijacking](#custom-scheme-hijacking)
  - [External application trust](#external-application-trust)
- [Failure Handling](#failure-handling)
  - [Robust application pattern](#robust-application-pattern)
  - [Fallback UX](#fallback-ux)
- [User Experience](#user-experience)
  - [Confirmation](#confirmation)
  - [Accessibility](#accessibility)
  - [Loading state](#loading-state)
  - [Repeated taps](#repeated-taps)
- [Architecture](#architecture)
  - [Small applications](#small-applications)
  - [Larger applications](#larger-applications)
  - [Responsibility split](#responsibility-split)
- [State Management Integration](#state-management-integration)
  - [Bloc/Cubit](#bloccubit)
  - [Context after asynchronous launch](#context-after-asynchronous-launch)
- [Dependency Injection](#dependency-injection)
- [Performance](#performance)
  - [Avoid repeated capability checks](#avoid-repeated-capability-checks)
  - [Do not cache trivial URI creation prematurely](#do-not-cache-trivial-uri-creation-prematurely)
  - [Prevent duplicate platform calls](#prevent-duplicate-platform-calls)
  - [Avoid unnecessary `canLaunchUrl → launchUrl`](#avoid-unnecessary-canlaunchurl-launchurl)
- [Observability](#observability)

---

## Security

Treat external launching as crossing the application's trust boundary.

### User-controlled URLs

Any destination originating from:

- an API;
- CMS;
- chat message;
- QR code;
- push notification;
- remote configuration;
- deep link;
- user input;
- server redirect field;

is untrusted unless it has been validated against application policy.

### Scheme allowlist

Use explicit schemes.

```dart
bool hasAllowedScheme(Uri uri) {
  const allowed = <String>{
    'https',
    'mailto',
    'tel',
  };

  return allowed.contains(uri.scheme.toLowerCase());
}
```

Do not use:

```dart
if (uri.hasScheme) {
  await launchUrl(uri);
}
```

`hasScheme` is syntax, not authorization.

### Host allowlist

For product-controlled HTTP(S) destinations, use exact matching.

```dart
bool isAllowedWebHost(
  Uri uri, {
  required Set<String> allowedHosts,
}) {
  if (uri.scheme.toLowerCase() != 'https') {
    return false;
  }

  final host = uri.host.toLowerCase();
  return allowedHosts
      .map((value) => value.toLowerCase())
      .contains(host);
}
```

Bad:

```dart
uri.host.contains('example.com')
```

This accepts:

```text
example.com.evil.test
```

### Controlled subdomains

If all subdomains are genuinely trusted:

```dart
bool isHostOrSubdomainOf(Uri uri, String rootDomain) {
  final host = uri.host.toLowerCase();
  final root = rootDomain.toLowerCase();

  return host == root || host.endsWith('.$root');
}
```

Do not enable subdomains automatically. A compromised or user-controlled subdomain may be outside the intended trust boundary.

### Strong external-web validator

```dart
bool isAllowedExternalWebUri(
  Uri uri, {
  required Set<String> allowedHosts,
}) {
  if (!uri.isAbsolute) {
    return false;
  }

  if (uri.scheme.toLowerCase() != 'https') {
    return false;
  }

  if (uri.host.isEmpty) {
    return false;
  }

  if (uri.userInfo.isNotEmpty) {
    return false;
  }

  final normalizedHost = uri.host.toLowerCase();

  return allowedHosts
      .map((host) => host.toLowerCase())
      .contains(normalizedHost);
}
```

Extend it only according to documented product policy.

### HTTPS preference

Prefer HTTPS for normal web content.

If HTTP is forbidden by product security policy, reject it.

Do not silently transform arbitrary HTTP destinations to HTTPS.

### Sensitive data in URLs

Avoid embedding:

- access tokens;
- refresh tokens;
- passwords;
- private keys;
- session cookies;
- password-reset secrets;
- internal credentials;

in external URLs unless the relevant protocol absolutely requires it.

External URLs may become observable in:

- browser history;
- external apps;
- analytics;
- crash reports;
- logs;
- screenshots;
- support tools;
- operating-system surfaces.

Never treat a URL as a secret container.

### Logging

Bad:

```dart
logger.error('Failed opening $uri');
```

when `uri` contains:

```text
?token=SECRET
```

Better:

```dart
logger.error(
  'external_link_launch_failed '
  'scheme=${uri.scheme} '
  'host=${uri.host} '
  'mode=externalApplication',
);
```

If host names themselves are sensitive, log a destination category instead.

### Open redirects

If the application's own endpoint receives:

```text
redirect=<external target>
```

do not treat the application's trusted host as sufficient.

Validate the eventual target according to the same external-destination policy.

### Custom-scheme hijacking

Do not send authentication secrets to an arbitrary custom scheme simply because a partner claims to own it.

Custom-scheme collision is possible. Prefer verified HTTPS links or platform mechanisms designed for secure association when target identity matters. Apple explicitly recommends Universal Links for this reason.

### External application trust

After launch:

- another process may receive the data;
- your application loses control of the UI;
- the external app may not return;
- its privacy/security properties are outside your application.

Minimize sensitive information included in the URI.

---

## Failure Handling

Model at least these categories:

```text
invalid_uri
disallowed_scheme
disallowed_host
unsupported_mode
no_handler
query_visibility_restricted
platform_configuration_missing
launch_rejected
browser_popup_blocked
external_app_unavailable
platform_exception
unexpected_failure
```

Do not assume the plugin maps every platform failure into one universal exception.

`launchUrl` may return `false` or throw a `PlatformException`.

### Robust application pattern

```dart
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

enum ExternalLaunchFailure {
  invalidTarget,
  unavailable,
  platformFailure,
}

sealed class ExternalLaunchResult {
  const ExternalLaunchResult();
}

final class ExternalLaunchSuccess extends ExternalLaunchResult {
  const ExternalLaunchSuccess();
}

final class ExternalLaunchError extends ExternalLaunchResult {
  const ExternalLaunchError(this.failure);

  final ExternalLaunchFailure failure;
}

Future<ExternalLaunchResult> openTrustedWebUri(Uri uri) async {
  if (uri.scheme != 'https' || uri.host.isEmpty) {
    return const ExternalLaunchError(
      ExternalLaunchFailure.invalidTarget,
    );
  }

  try {
    final launched = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );

    return launched
        ? const ExternalLaunchSuccess()
        : const ExternalLaunchError(
            ExternalLaunchFailure.unavailable,
          );
  } on ArgumentError {
    return const ExternalLaunchError(
      ExternalLaunchFailure.invalidTarget,
    );
  } on PlatformException {
    return const ExternalLaunchError(
      ExternalLaunchFailure.platformFailure,
    );
  }
}
```

### Fallback UX

Choose fallback by action.

| Failure | Potential fallback |
|---|---|
| Email app unavailable | Open HTTPS contact form; copy email address |
| Phone handler unavailable | Display/copy telephone number |
| SMS unavailable | Copy number; use alternate contact method |
| Partner custom scheme unavailable | Open HTTPS equivalent |
| Store app unavailable | Open public HTTPS store listing |
| Browser launch fails | Show trusted copyable URL or retry option |
| Maps app unavailable | Open HTTPS maps destination |
| File unavailable | Explain missing file rather than launch |
| Web popup blocked | Offer same-tab navigation or direct link interaction |

Do not silently swallow a user-requested external action.

---

## User Experience

### Confirmation

Consider confirmation when the action is surprising, sensitive, or irreversible in perception:

- opening an unknown external domain;
- leaving the app for a third-party application;
- starting a phone interaction;
- opening a sensitive partner flow.

Do not add confirmation to every routine trusted documentation link.

### Accessibility

External-link controls should:

- have descriptive labels;
- explain the action rather than showing an opaque URI;
- communicate external navigation when that difference matters;
- remain keyboard/focus accessible on web/desktop;
- provide meaningful semantic button/link text.

Prefer:

```text
Open privacy policy in browser
```

over:

```text
https://...
```

as the only accessible label.

### Loading state

Platform handoff is usually fast.

Do not show an indefinite spinner merely because `launchUrl` returns a Future.

Show progress only when the application performs real preparatory work.

### Repeated taps

Guard high-impact or window-producing launches.

```dart
bool _launching = false;

Future<void> handleLaunch(Uri uri) async {
  if (_launching) {
    return;
  }

  _launching = true;

  try {
    await launchUrl(uri);
  } finally {
    _launching = false;
  }
}
```

Use button disabling/debouncing only where duplicate launches would be undesirable.

---

## Architecture

### Small applications

Calling `launchUrl` directly from a button handler is acceptable.

```dart
Future<void> openTerms() async {
  final uri = Uri.parse('https://example.com/terms');

  if (!await launchUrl(
    uri,
    mode: LaunchMode.externalApplication,
  )) {
    // Present a fallback.
  }
}
```

Do not create architecture solely for ceremony.

### Larger applications

A lightweight boundary can centralize:

- URI policy;
- allowed schemes;
- trusted hosts;
- launch-mode defaults;
- fallbacks;
- logging;
- testing.

Conceptual interface:

```dart
abstract interface class ExternalLinkService {
  Future<bool> openWeb(Uri uri);

  Future<bool> composeEmail({
    required String recipient,
    String? subject,
    String? body,
  });

  Future<bool> openPhone(String phoneNumber);

  Future<bool> openSms(String recipient);
}
```

Do not create a giant wrapper that merely mirrors every `launchUrl` argument and adds no policy.

### Responsibility split

Prefer:

```text
Widget / presentation action
       ↓
optional ExternalLinkService
       ↓
url_launcher
       ↓
OS/browser
```

Keep domain logic independent of plugin details.

---

## State Management Integration

Launching an external URI is usually a presentation/platform side effect.

### Bloc/Cubit

Prefer:

```text
Cubit decides that external action is needed
              ↓
UI listener/effect receives intent
              ↓
UI/service calls url_launcher
```

rather than:

```text
Cubit
  ↓
url_launcher static API
```

by default.

This keeps business state deterministic and platform effects testable.

Do not store `BuildContext` in a long-lived launcher service.

### Context after asynchronous launch

If the UI needs to show a fallback after an `await`:

```dart
Future<void> onPressed(BuildContext context) async {
  final uri = Uri.parse('https://example.com/help');

  final launched = await launchUrl(
    uri,
    mode: LaunchMode.externalApplication,
  );

  if (!context.mounted) {
    return;
  }

  if (!launched) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Unable to open help page.'),
      ),
    );
  }
}
```

---

## Dependency Injection

Introduce a dependency only when it improves something concrete:

- deterministic tests;
- centralized destination security policy;
- reusable fallback behavior;
- privacy-safe logging;
- multiple implementations.

Example:

```dart
abstract interface class UriLauncher {
  Future<bool> launch(
    Uri uri, {
    LaunchMode mode,
  });
}

final class UrlLauncherAdapter implements UriLauncher {
  @override
  Future<bool> launch(
    Uri uri, {
    LaunchMode mode = LaunchMode.platformDefault,
  }) {
    return launchUrl(
      uri,
      mode: mode,
    );
  }
}
```

A test can replace `UriLauncher` without invoking an OS handler.

Do not inject a wrapper merely to replace one line with three layers.

---

## Performance

`url_launcher` is rarely an application performance bottleneck.

Prioritize:

1. correct URI construction;
2. security;
3. platform correctness;
4. UX;
5. reliability;
6. maintainability;
7. testability;
8. performance;
9. developer convenience.

### Avoid repeated capability checks

Do not:

```dart
Widget build(BuildContext context) {
  canLaunchUrl(uri).then(...);
  ...
}
```

Resolve capability once at an appropriate lifecycle boundary if UI truly depends on it.

### Do not cache trivial URI creation prematurely

This is already inexpensive:

```dart
final uri = Uri(
  scheme: 'https',
  host: 'example.com',
  path: '/help',
);
```

Cache static URIs only when it improves clarity or avoids duplicated policy.

### Prevent duplicate platform calls

For buttons capable of opening windows/applications, consider a pending flag.

### Avoid unnecessary `canLaunchUrl → launchUrl`

Two platform interactions are worse than one when the preflight result adds no value.

---

## Observability

Record enough data to diagnose failures without leaking URI contents.

Good telemetry:

```text
external_link_launch
platform=android
destination=help_center
scheme=https
mode=externalApplication
result=failure
failure=no_handler
```

Avoid:

```text
launching=https://example.com/reset?token=...
```

Recommended fields:

- platform;
- destination category;
- scheme;
- safe host category;
- requested mode;
- launch success/failure;
- safe error category;
- fallback used.

Do not log:

- full query strings;
- fragments containing state;
- OAuth authorization parameters if sensitive;
- password reset links;
- tokens;
- user-written email bodies.

---

