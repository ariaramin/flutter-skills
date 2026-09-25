# Foundations, URI Construction, Launch APIs & Common Schemes

> Preserved from source lines 1–768 of `url_launcher Engineering Skill for Flutter.md`.
> Use this reference for detailed APIs, examples, caveats, platform notes, and source-grounded edge cases.

## Contents
- [Purpose](#purpose)
  - [Version baseline](#version-baseline)
- [When to Use This Skill](#when-to-use-this-skill)
- [When NOT to Use url_launcher](#when-not-to-use-urllauncher)
  - [Internal Flutter navigation](#internal-flutter-navigation)
  - [A full embedded web application](#a-full-embedded-web-application)
  - [Complete OAuth/OIDC handling](#complete-oauthoidc-handling)
  - [Verified App Link / Universal Link configuration](#verified-app-link-universal-link-configuration)
  - [Direct phone calls](#direct-phone-calls)
  - [Cross-platform SMS-body composition when exact body prefill is required](#cross-platform-sms-body-composition-when-exact-body-prefill-is-required)
  - [General file-opening workflows](#general-file-opening-workflows)
- [Core Principles](#core-principles)
- [Mental Model](#mental-model)
  - [`url_launcher` owns](#urllauncher-owns)
  - [The platform owns](#the-platform-owns)
  - [The application owns](#the-application-owns)
- [URI Construction](#uri-construction)
  - [Static trusted URI](#static-trusted-uri)
  - [Dynamic HTTP(S) URI](#dynamic-https-uri)
  - [Prefer path segments for dynamic path data](#prefer-path-segments-for-dynamic-path-data)
  - [URI components](#uri-components)
- [Query Parameters](#query-parameters)
  - [HTTP(S)](#https)
  - [Do not concatenate dynamic query values](#do-not-concatenate-dynamic-query-values)
  - [Non-HTTP(S) query encoding](#non-https-query-encoding)
- [Launch APIs](#launch-apis)
  - [`launchUrl`](#launchurl)
  - [Safe launch pattern](#safe-launch-pattern)
  - [`canLaunchUrl`](#canlaunchurl)
  - [`supportsLaunchMode`](#supportslaunchmode)
  - [`supportsCloseForLaunchMode` / `closeInAppWebView`](#supportscloseforlaunchmode-closeinappwebview)
  - [Configuration types](#configuration-types)
- [LaunchMode Decision Guide](#launchmode-decision-guide)
  - [`platformDefault`](#platformdefault)
  - [`externalApplication`](#externalapplication)
  - [`inAppBrowserView`](#inappbrowserview)
  - [`inAppWebView`](#inappwebview)
  - [`externalNonBrowserApplication`](#externalnonbrowserapplication)
- [canLaunchUrl](#canlaunchurl)
  - [Default rule](#default-rule)
  - [Use `canLaunchUrl` when](#use-canlaunchurl-when)
  - [Do not use it simply because launching feels safer](#do-not-use-it-simply-because-launching-feels-safer)
  - [False does not mean impossible](#false-does-not-mean-impossible)
- [HTTP / HTTPS](#http-https)
- [mailto](#mailto)
- [tel](#tel)
- [sms](#sms)

---

# url_launcher Engineering Skill for Flutter

## Purpose

Use this skill when implementing, reviewing, debugging, testing, securing, or migrating external URI launching in a production Flutter application using `url_launcher`.

Make senior-level decisions about:

- whether `url_launcher` is the correct integration mechanism;
- safe `Uri` construction and encoding;
- launch-mode selection;
- external applications versus in-app browser surfaces;
- websites, email, phone, SMS, maps, stores, custom schemes, and app-to-app links;
- Android package visibility and intent resolution;
- iOS URL-query restrictions and universal links;
- browser restrictions on Flutter web;
- desktop behavior;
- security boundaries around untrusted destinations;
- deterministic testing;
- failure UX and observability;
- deprecated API migration;
- version-sensitive behavior in the federated platform implementations.

Treat `url_launcher` as a **platform handoff API**. It asks the current platform to handle a URI. It is not a browser framework, Flutter router, verified deep-link configuration framework, OAuth implementation, payment-verification mechanism, file-management framework, or proof that an external task completed.

### Version baseline

At the time this skill was researched, the current published top-level package is `url_launcher 6.3.2`. Its published support matrix lists Android SDK 21+, iOS 12.0+, macOS 10.14+, Windows 10+, Linux, and web. The package uses federated platform implementations, so a production review must also inspect the repository's `pubspec.lock` and resolved `url_launcher_android`, `url_launcher_ios`, `url_launcher_web`, and desktop implementation versions before making implementation-specific assumptions.

Do not copy behavior from old tutorials. The current primary API is `launchUrl(Uri, ...)`; `launch` and `canLaunch` were deprecated when the package moved to URI-first APIs and `LaunchMode`.

---

## When to Use This Skill

Use `url_launcher` when the requested action is fundamentally:

- open a normal website;
- hand an HTTP(S) URL to an external browser;
- open supported HTTP(S) content in a package-provided in-app web/browser surface;
- compose an email with `mailto:`;
- hand a telephone number to the system using `tel:`;
- compose an SMS recipient using `sms:`;
- open a maps URL or platform-recognized map URI;
- open an App Store or Play Store listing;
- open another installed application through its documented URI scheme;
- open an HTTP(S) App Link or Universal Link;
- launch an external OAuth authorization page as one component of a larger authentication implementation;
- launch a payment page as one component of a payment flow;
- open a local file or directory on a desktop platform when `url_launcher`'s documented `file:` support is sufficient;
- investigate why an external URI works on one platform and not another;
- investigate `canLaunchUrl`, Android `<queries>`, iOS `LSApplicationQueriesSchemes`, or browser popup failures.

Use `url_launcher` only when the application's desired operation can reasonably be expressed as "give this URI to a platform handler."

---

## When NOT to Use url_launcher

Do not use `url_launcher` for:

### Internal Flutter navigation

Use the application's router or `Navigator`.

```dart
context.go('/settings');
// or
Navigator.of(context).push(...);
```

Do not convert internal application destinations into artificial external URLs just to invoke `url_launcher`.

### A full embedded web application

If the application needs:

- navigation interception;
- JavaScript channels;
- detailed page lifecycle;
- cookie management;
- downloads;
- custom navigation controls;
- authentication-state coordination;
- rich WebView configuration;

use a dedicated WebView/browser package rather than treating `LaunchMode.inAppWebView` as a complete embedded-browser framework.

### Complete OAuth/OIDC handling

`url_launcher` can open an authorization URL. It does not implement:

- PKCE;
- `state` validation;
- callback handling;
- redirect URI registration;
- token exchange;
- nonce validation;
- browser-session policy;
- token storage.

Prefer an established OAuth/OIDC SDK or authentication package where appropriate.

### Verified App Link / Universal Link configuration

`url_launcher` can open HTTP(S) links. It does not establish ownership of a domain or configure Android App Links or Apple Universal Links.

Those are target-application and platform association responsibilities.

### Direct phone calls

`tel:` hands a URI to the platform's registered handler. Do not use `url_launcher` as a substitute for an API explicitly intended to place calls directly.

On Android, direct `ACTION_CALL` is distinct from opening the dialer and requires `CALL_PHONE`; this is not a capability that should be inferred from launching a `tel:` URI.

### Cross-platform SMS-body composition when exact body prefill is required

Apple's documented `sms:` URL format permits the recipient but explicitly says the URL must not contain message text. The `url_launcher` changelog also records removal of incorrect SMS instructions in 6.3.1. Do not invent a supposedly universal `sms:?body=` format.

Use a platform-specific messaging integration if a prefilled message body is a product requirement.

### General file-opening workflows

`url_launcher` documents `file:` handling specifically for desktop. If the feature requires mobile document providers, MIME-specific handling, share sheets, content URIs, security-scoped resources, or consistent cross-platform file semantics, use a specialized package or platform API.

---

## Core Principles

1. **Construct URIs with `Uri`.**
2. **Use `Uri.parse` for known, already-complete static URIs.**
3. **Use structured `Uri` construction for dynamic components.**
4. **Use `queryParameters` for normal HTTP(S) dynamic query values.**
5. **For non-HTTP(S) schemes, follow `url_launcher`'s documented encoding workaround: construct `query` with `Uri.encodeComponent`, rather than relying on `queryParameters`.**
6. **Treat API/CMS/chat/QR/user-provided destinations as untrusted input.**
7. **Allow only intentional schemes.**
8. **Validate hosts exactly when a destination is product-controlled.**
9. **Prefer HTTPS for ordinary web navigation.**
10. **Choose `LaunchMode` intentionally when the resulting surface matters.**
11. **Do not rely on the observed behavior of `LaunchMode.platformDefault` when UX requires a specific surface.**
12. **Prefer attempting `launchUrl` and handling failure when capability detection is not needed for UI decisions.**
13. **Treat `canLaunchUrl` as platform-sensitive capability querying, not an infallible test.**
14. **Do not call `canLaunchUrl` from `build`.**
15. **Add Android `<queries>` or iOS `LSApplicationQueriesSchemes` only when capability querying requires them.**
16. **Do not confuse launch support with destination authenticity.**
17. **Do not put credentials, session secrets, or private tokens in externally launched URLs unless a protocol explicitly requires it and the threat model permits it.**
18. **Do not log complete sensitive URIs.**
19. **Treat launch success as successful handoff/launch initiation only.**
20. **Never infer email delivery, call completion, message sending, authentication success, payment success, purchase success, or application installation from `launchUrl == true`.**
21. **On web, preserve user-gesture context when opening a new tab/window.**
22. **Prevent accidental duplicate launches when repeated taps would be harmful or annoying.**
23. **Use a thin abstraction only when it adds policy, fallback, observability, or testability.**
24. **Keep external navigation as a presentation/platform side effect unless the application's architecture deliberately defines otherwise.**

The package documentation explicitly warns that `platformDefault` belongs to the platform implementation and may change over time. Unsupported requested modes can also fall back to another supported mode.

---

## Mental Model

Use this model:

```text
User action
    ↓
Determine intended external action
    ↓
Construct valid Uri
    ↓
Validate untrusted destination
    ↓
Choose LaunchMode intentionally
    ↓
Optional capability/mode check only if needed
    ↓
url_launcher
    ↓
Platform/browser resolves handler
    ↓
External app / browser / in-app surface
    ↓
Handle launch result or exception
    ↓
Application fallback UX
```

Separate ownership carefully.

### `url_launcher` owns

- accepting a URI;
- requesting that the current platform handle it;
- requesting a launch mode;
- exposing capability-query APIs;
- returning platform/plugin launch status;
- passing supported configuration to platform implementations.

### The platform owns

- installed handlers;
- default applications;
- chooser behavior;
- intent resolution;
- browser selection;
- custom-scheme ownership;
- package visibility;
- Universal/App Link association;
- phone/email/messaging application behavior;
- browser popup policies;
- whether an unsupported requested mode falls back;
- many details of in-app browser implementation.

### The application owns

- determining whether external navigation is appropriate;
- constructing valid URIs;
- validating externally supplied destinations;
- selecting acceptable schemes and hosts;
- selecting launch mode;
- confirmation UX;
- fallback behavior;
- avoiding secrets;
- privacy-safe logging;
- preventing repeated launch actions;
- interpreting business-process completion independently;
- testing platform configuration.

---

## URI Construction

### Static trusted URI

Use `Uri.parse` when the entire URI is a constant under application control.

```dart
final Uri privacyPolicyUri =
    Uri.parse('https://example.com/legal/privacy');
```

Do not parse arbitrary external text and immediately launch it.

### Dynamic HTTP(S) URI

Use structured construction when any component is dynamic.

```dart
Uri buildSearchUri(String query) {
  return Uri(
    scheme: 'https',
    host: 'example.com',
    path: '/search',
    queryParameters: <String, String>{
      'q': query,
    },
  );
}
```

For a query such as:

```text
flutter & dart? 🔐
```

the `Uri` API handles query encoding rather than allowing `&`, `?`, spaces, Unicode, or other values to alter URI structure.

### Prefer path segments for dynamic path data

```dart
Uri buildArticleUri(String articleId) {
  return Uri(
    scheme: 'https',
    host: 'example.com',
    pathSegments: <String>[
      'articles',
      articleId,
    ],
  );
}
```

Do not write:

```dart
Uri.parse('https://example.com/articles/$articleId');
```

when `articleId` can contain user-controlled characters.

### URI components

Understand these separately:

```text
scheme://userinfo@host:port/path?query#fragment
```

Review:

- `scheme`: determines the handling protocol;
- `host`: security-sensitive authority for network URLs;
- `port`: validate if the product permits only expected services;
- `path` / `pathSegments`: resource location;
- `query`: parameters sent to the destination;
- `fragment`: client-side target/state;
- `userInfo`: potentially sensitive; normally reject for product-controlled external HTTP(S) links.

Do not use URI parsing as the only security check. A syntactically valid URI can still be an unacceptable destination.

---

## Query Parameters

### HTTP(S)

For HTTP(S), prefer structured query parameters.

```dart
Uri buildHelpSearchUri({
  required String query,
  required String locale,
}) {
  return Uri(
    scheme: 'https',
    host: 'support.example.com',
    path: '/search',
    queryParameters: <String, String>{
      'q': query,
      'locale': locale,
    },
  );
}
```

### Do not concatenate dynamic query values

Bad:

```dart
final uri =
    Uri.parse('https://example.com/search?q=$query&source=$source');
```

A value containing `&`, `#`, `?`, spaces, Unicode, or percent characters can change the resulting meaning.

Better:

```dart
final uri = Uri(
  scheme: 'https',
  host: 'example.com',
  path: '/search',
  queryParameters: <String, String>{
    'q': query,
    'source': source,
  },
);
```

### Non-HTTP(S) query encoding

The current `url_launcher` README explicitly documents a Dart URI encoding issue for non-HTTP(S) schemes: `Uri.queryParameters` may encode spaces as `+`. The package recommends supplying `query` manually from individually `Uri.encodeComponent`-encoded keys and values.

Use:

```dart
String encodeQueryParameters(Map<String, String> parameters) {
  return parameters.entries
      .map(
        (MapEntry<String, String> entry) =>
            '${Uri.encodeComponent(entry.key)}='
            '${Uri.encodeComponent(entry.value)}',
      )
      .join('&');
}
```

Then:

```dart
Uri buildMailUri({
  required String recipient,
  String? subject,
  String? body,
}) {
  final params = <String, String>{
    if (subject != null && subject.isNotEmpty) 'subject': subject,
    if (body != null && body.isNotEmpty) 'body': body,
  };

  return Uri(
    scheme: 'mailto',
    path: recipient,
    query: params.isEmpty ? null : encodeQueryParameters(params),
  );
}
```

Do not replace this with `queryParameters` for `mailto:` merely because the HTTP example uses it.

---

## Launch APIs

Import:

```dart
import 'package:url_launcher/url_launcher.dart';
```

### `launchUrl`

Current signature conceptually supports:

```dart
Future<bool> launchUrl(
  Uri url, {
  LaunchMode mode = LaunchMode.platformDefault,
  WebViewConfiguration webViewConfiguration =
      const WebViewConfiguration(),
  BrowserConfiguration browserConfiguration =
      const BrowserConfiguration(),
  String? webOnlyWindowName,
});
```

`launchUrl`:

- passes the URI to the underlying platform;
- allows launch-mode selection;
- accepts WebView/browser configuration where relevant;
- accepts web window targeting;
- returns `true`, `false`, or can throw a `PlatformException` depending on the failure and platform.

Both `inAppWebView` and `inAppBrowserView` require HTTP(S) at the top-level API. Passing another scheme with either mode produces an `ArgumentError`.

### Safe launch pattern

```dart
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

Future<bool> tryLaunchExternal(Uri uri) async {
  try {
    return await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );
  } on ArgumentError {
    return false;
  } on PlatformException {
    return false;
  }
}
```

In real production code, do not silently discard errors. Map them to privacy-safe diagnostic categories and user-facing fallback behavior.

### `canLaunchUrl`

```dart
final bool canLaunch = await canLaunchUrl(uri);
```

Use only when knowing capability before launch changes the UI or flow.

### `supportsLaunchMode`

```dart
final bool supported =
    await supportsLaunchMode(LaunchMode.inAppBrowserView);
```

Use only when the exact surface is important enough that automatic fallback would be unacceptable. The API documentation explicitly says an unsupported mode can fall back, making the check unnecessary when fallback is acceptable.

### `supportsCloseForLaunchMode` / `closeInAppWebView`

If application logic requires programmatic closure of a package-owned in-app surface, first verify that the current resolved package/platform implementation supports closing the mode used.

Do not assume every in-app browser surface is programmatically dismissible through the plugin.

### Configuration types

`WebViewConfiguration` currently exposes:

```dart
const WebViewConfiguration(
  enableJavaScript: true,
  enableDomStorage: true,
  headers: <String, String>{},
)
```

for `LaunchMode.inAppWebView`.

`BrowserConfiguration` currently exposes:

```dart
const BrowserConfiguration(
  showTitle: false,
)
```

for `LaunchMode.inAppBrowserView`.

Do not assume every platform honors every configuration field identically.

---

## LaunchMode Decision Guide

Current `LaunchMode` values are:

- `platformDefault`
- `inAppWebView`
- `inAppBrowserView`
- `externalApplication`
- `externalNonBrowserApplication`

| Mode | Intent | Appropriate for | Avoid when | Important caveat |
|---|---|---|---|---|
| `platformDefault` | Delegate choice to platform implementation | Routine launch where exact surface does not matter | Product specifically requires external browser or specific in-app UX | Current behavior may change without being treated as a breaking API change |
| `inAppWebView` | Use an in-app web-view style surface | HTTP(S) when package's lightweight surface is sufficient | Non-HTTP(S), full embedded-browser requirements | Not a full WebView framework; exact implementation/config support varies |
| `inAppBrowserView` | Use platform in-app browser-style surface | HTTP(S), e.g. browser UI such as Custom Tabs/Safari view controller where available | Non-HTTP(S), flows requiring custom WebView control | Unsupported mode may fall back; exact native surface is platform/version dependent |
| `externalApplication` | Ask OS to handle URI outside app | Browser, maps, stores, third-party apps, mail/phone/SMS | Product requires an in-app HTTP(S) experience | Handler selection remains platform-owned |
| `externalNonBrowserApplication` | Request handling by a non-browser app | Specific scenarios where browser fallback must be avoided | Generic cross-platform assumptions | Support and exact semantics are highly platform/version sensitive; verify resolved implementations |

### `platformDefault`

Use when:

- the platform's choice is acceptable;
- the feature does not care whether HTTP(S) stays in-app or leaves the app;
- you want the package to select the normal behavior.

Do not use when requirements say:

- "must open the user's external browser";
- "must remain inside the app";
- "must open a native Universal/App Link target but not browser fallback."

The package's changelog explicitly says applications must not depend on today's observed `platformDefault`; Android has previously changed its default handling as new modes were introduced.

### `externalApplication`

Use deliberately for actions that should leave the Flutter app, including:

- external browser navigation;
- maps;
- store pages;
- other installed apps;
- mail/phone/messaging applications.

The OS chooses an eligible handler.

### `inAppBrowserView`

Prefer over a raw WebView-style surface when the desired UX is a lightweight system/browser-provided web experience and the platform supports it.

Typical implementations include Android Custom Tabs and `SFSafariViewController`, but treat those as examples, not a universal guarantee. The enum documentation itself describes those examples.

Check `supportsLaunchMode` only if receiving some fallback surface would violate requirements.

### `inAppWebView`

Use only for HTTP(S).

Do not assume it offers:

- arbitrary JavaScript integration;
- navigation delegates;
- browser-history APIs;
- cookie/session controls;
- download handling;
- full lifecycle management.

If the application needs those features, choose a proper embedded WebView package.

### `externalNonBrowserApplication`

Use cautiously.

Its purpose is to request handling outside a browser. This can be useful for app-to-app HTTP(S) links when browser fallback is not acceptable, but platform implementation support has changed over time.

Before depending on it:

1. inspect `pubspec.lock`;
2. inspect the resolved platform implementation changelog;
3. check `supportsLaunchMode` when exact mode behavior is required;
4. implement an explicit fallback.

Do not treat it as "open this exact installed app."

---

## canLaunchUrl

### Default rule

**Prefer attempting `launchUrl` and handling failure unless capability checking is specifically needed for UI decisions or platform behavior.**

This is aligned with the package README: `canLaunchUrl` can return `false` even when `launchUrl` may work, including web and mobile configurations with restricted query visibility. The README explicitly recommends directly launching with fallback when possible.

### Use `canLaunchUrl` when

- a UI must display an installed-app-only option conditionally;
- product behavior genuinely differs based on handler availability;
- you need advance capability information and have configured platform visibility correctly;
- an explicit product requirement says not to attempt the URI unless support is known.

### Do not use it simply because launching feels safer

Bad:

```dart
if (await canLaunchUrl(uri)) {
  await launchUrl(uri);
}
```

This adds:

- another platform call;
- a query/launch race;
- Android/iOS visibility configuration requirements;
- possible false negatives;
- more failure states.

Better:

```dart
final launched = await launchUrl(uri);
if (!launched) {
  await showFallback();
}
```

with exception handling as needed.

### False does not mean impossible

The API documentation defines `false` as either:

- no verifiable handler; or
- the application lacks permission/visibility to query the handler.

Never interpret it as a security guarantee or authoritative installation state without understanding the platform.

---

## HTTP / HTTPS

For normal websites:

- prefer `https`;
- construct dynamic values with `Uri`;
- validate untrusted schemes;
- validate hosts when the application accepts only controlled destinations;
- choose `externalApplication` when the product explicitly wants the system's external handling;
- choose `inAppBrowserView` only when staying visually associated with the application is intentional;
- use `platformDefault` only when either result is acceptable.

Example:

```dart
Future<bool> openDocumentation() {
  final uri = Uri(
    scheme: 'https',
    host: 'docs.example.com',
    path: '/getting-started',
  );

  return launchUrl(
    uri,
    mode: LaunchMode.externalApplication,
  );
}
```

Do not automatically rewrite arbitrary `http` links to `https`; the destination may not support HTTPS or the transformation may change semantics. Instead, enforce HTTPS when application policy requires it and reject disallowed HTTP targets.

---

## mailto

Construct the destination with `Uri`.

```dart
String encodeQueryParameters(Map<String, String> parameters) {
  return parameters.entries
      .map(
        (entry) =>
            '${Uri.encodeComponent(entry.key)}='
            '${Uri.encodeComponent(entry.value)}',
      )
      .join('&');
}

Uri buildEmailUri({
  required String recipient,
  String? subject,
  String? body,
  String? cc,
  String? bcc,
}) {
  final query = <String, String>{
    if (subject != null && subject.isNotEmpty) 'subject': subject,
    if (body != null && body.isNotEmpty) 'body': body,
    if (cc != null && cc.isNotEmpty) 'cc': cc,
    if (bcc != null && bcc.isNotEmpty) 'bcc': bcc,
  };

  return Uri(
    scheme: 'mailto',
    path: recipient,
    query: query.isEmpty ? null : encodeQueryParameters(query),
  );
}
```

Apple documents `mailto:` recipient, subject, body, Cc/Bcc, and multiple recipient support, while client behavior can still differ.

Rules:

- validate recipient syntax according to application requirements;
- encode subject/body;
- do not concatenate raw query text;
- do not assume all clients interpret every optional field identically;
- provide an HTTPS or copy-to-clipboard fallback if email is essential;
- test on a real device because simulators may lack a configured mail application;
- do not interpret launch success as "email sent."

---

## tel

Build a `tel:` URI.

```dart
Uri buildTelephoneUri(String phoneNumber) {
  return Uri(
    scheme: 'tel',
    path: phoneNumber,
  );
}
```

Example input:

```text
+37255501234
```

Rules:

- preserve a leading `+`;
- validate the number using product requirements rather than arbitrary string interpolation;
- use a normalized international format where the product has reliable phone-number data;
- consider confirmation before surprising or high-impact call actions;
- do not claim the call was completed;
- do not infer that `url_launcher` directly calls without user interaction.

Apple documents that native `tel:` handling requires user confirmation on modern iOS before dialing. Android distinguishes dialer-opening (`ACTION_DIAL`) from direct calling (`ACTION_CALL`), with the latter requiring permission.

---

## sms
