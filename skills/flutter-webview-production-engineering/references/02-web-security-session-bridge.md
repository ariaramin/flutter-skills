# Source reference: HTTPS/TLS, JavaScript, bridge security, cookies, authentication, storage and networking

## Table of contents

- [21. HTTPS-First Policy](#21-https-first-policy)
- [22. TLS / SSL Errors](#22-tls-ssl-errors)
- [23. Certificate Pinning](#23-certificate-pinning)
- [24. Mixed Content](#24-mixed-content)
- [25. JavaScript Configuration](#25-javascript-configuration)
- [26. JavaScript Execution](#26-javascript-execution)
- [27. Safe JavaScript Injection](#27-safe-javascript-injection)
- [28. JavaScript Channels](#28-javascript-channels)
- [29. JavaScript Bridge Security](#29-javascript-bridge-security)
- [30. Typed Bridge Protocol](#30-typed-bridge-protocol)
- [31. Bridge Origin Limitation](#31-bridge-origin-limitation)
- [32. Bridge Performance](#32-bridge-performance)
- [33. `loadHtmlString`](#33-loadhtmlstring)
- [34. Local HTML Security](#34-local-html-security)
- [35. Flutter Assets and Local Files](#35-flutter-assets-and-local-files)
- [36. Cookies](#36-cookies)
- [37. Setting Cookies Before Navigation](#37-setting-cookies-before-navigation)
- [38. Third-Party Cookies](#38-third-party-cookies)
- [39. Authentication Strategies](#39-authentication-strategies)
    - [Server session cookie](#server-session-cookie)
    - [One-time bootstrap exchange](#one-time-bootstrap-exchange)
    - [HTTP authentication](#http-authentication)
    - [Initial custom header](#initial-custom-header)
    - [OAuth/OIDC](#oauthoidc)
- [40. Logout](#40-logout)
- [41. Cache vs Local Storage vs Cookies](#41-cache-vs-local-storage-vs-cookies)
- [42. Cache Performance](#42-cache-performance)
- [43. User Agent](#43-user-agent)
- [44. WebView Networking Is Not Dio](#44-webview-networking-is-not-dio)
- [45. Request Interception](#45-request-interception)
- [46. Errors](#46-errors)
    - [Transport/resource failure](#transportresource-failure)
    - [HTTP error](#http-error)
    - [Application error page](#application-error-page)
# 21. HTTPS-First Policy

Default remote content to HTTPS.

On Apple platforms, App Transport Security applies to WebView traffic unless the application adds exceptions. `NSAllowsArbitraryLoadsInWebContent` disables ATS restrictions for WebView traffic and requires justification for App Store review. Do not enable it globally as a convenience.

On Android, use narrow Network Security Config exceptions only when a legitimate domain requires cleartext transport.

Do not globally weaken security simply because a development server uses HTTP.

Preferred order:

1. make the server HTTPS;
2. use a local-development configuration;
3. if unavoidable, permit a narrow explicit development/domain exception;
4. never ship broad cleartext allowances accidentally.

---

# 22. TLS / SSL Errors

Current `webview_flutter` exposes recoverable SSL certificate errors through the navigation delegate. The platform contract requires the host application to either cancel or proceed, and explicitly warns that proceeding can expose users to security/privacy risk.

Production default:

```
NavigationDelegate(
  onSSlAuthError: (SslAuthError error) {
    unawaited(error.cancel());
  },
);

```

Never:

```
onSSlAuthError: (error) {
  error.proceed();
}

```

as a release workaround.

Dart exception handling, URL allowlisting, or visible-host checking does not replace TLS certificate validation.

---

# 23. Certificate Pinning

Current `webview_flutter` exposes SSL-error information and certificate data but does not provide a high-level cross-platform "enable certificate pinning" policy API.

Therefore:

- do not claim URL allowlisting is pinning;
- do not implement pseudo-pinning using the visible URL;
- use server/platform transport security mechanisms when pinning is truly required;
- carefully evaluate operational risks such as certificate rotation.

Never convert every unknown certificate into `proceed()`.

---

# 24. Mixed Content

Android exposes `setMixedContentMode`.

The Android implementation identifies `neverAllow` as the secure/default direction and exposes broader modes only for compatibility requirements.

For an HTTPS page, do not permit insecure HTTP scripts, frames, or other active resources without a documented business requirement.

Mixed-content support is a security downgrade.

---

# 25. JavaScript Configuration

Current modes are:

```
JavaScriptMode.disabled
JavaScriptMode.unrestricted

```

Do not rely on assumed defaults.

Set the desired mode explicitly.

For static/legal content:

```
await controller.setJavaScriptMode(JavaScriptMode.disabled);

```

For a first-party application that requires JavaScript:

```
await controller.setJavaScriptMode(JavaScriptMode.unrestricted);

```

Rule:

> **Enable unrestricted JavaScript because the page requires JavaScript, not because every WebView example does it.**

---

# 26. JavaScript Execution

Use:

```
await controller.runJavaScript('window.refreshProfile();');

```

when no result is needed.

Use:

```
final result = await controller.runJavaScriptReturningResult(
  'document.title',
);

```

when a result is required.

The current result API returns `Object`, not the old always-string result shape.

Do not use continuous JS evaluation as a state synchronization mechanism.

Bad:

```
every animation frame
  -> Dart runJavaScript
  -> browser evaluate
  -> return value

```

Better:

```
meaningful page event
  -> one bridge message

```

---

# 27. Safe JavaScript Injection

Never concatenate raw untrusted text into source code.

Bad:

```
await controller.runJavaScript(
  "window.setUserName('$userInput');",
);

```

Safer:

```
import 'dart:convert';

Future<void> setWebUserName(
  WebViewController controller,
  String userName,
) async {
  final encoded = jsonEncode(userName);

  await controller.runJavaScript(
    'window.setUserName($encoded);',
  );
}

```

For structured data:

```
Future<void> sendConfig(
  WebViewController controller,
  Map<String, Object?> config,
) async {
  final encoded = jsonEncode(config);

  await controller.runJavaScript(
    'window.configureApp($encoded);',
  );
}

```

JSON encoding protects string structure.

It does **not** turn attacker-controlled page JavaScript into trusted code.

---

# 28. JavaScript Channels

A JavaScript channel exposes a callable object to page JavaScript.

Current generic channel messages provide only a message string. The generic `JavaScriptMessage` does not include a trustworthy source origin.

That limitation is critical.

Do **not** write:

```
controller.addJavaScriptChannel(
  'Native',
  onMessageReceived: (message) {
    runWhateverCommand(jsonDecode(message.message));
  },
);

```

The page must be treated as potentially hostile.

---

# 29. JavaScript Bridge Security

Android's own WebView security guidance warns that native JavaScript bridges can expose application capability to page frames and that origin validation can be difficult or unavailable depending on bridge mechanism.

Security model:

> **Assume an XSS vulnerability in the loaded page could gain access to every JavaScript channel exposed to that page.**

Therefore:

- expose narrow capabilities;
- validate every message;
- limit message size;
- version the protocol;
- allowlist actions;
- never expose arbitrary method names;
- never expose shell/file/native command execution;
- never expose long-lived secrets;
- never expose privileged app operations to arbitrary domains;
- remove bridge capability before intentionally navigating to untrusted content.

A channel name such as:

```
AppBridge

```

does not make the caller trusted.

---

# 30. Typed Bridge Protocol

For non-trivial integration use an explicit schema.

Example envelope:

```
{
  "version": 1,
  "action": "openOrder",
  "requestId": "a8c19",
  "payload": {
    "orderId": "123"
  }
}

```

Complete Dart decoder:

```
import 'dart:convert';

final class BridgeMessage {
  const BridgeMessage({
    required this.version,
    required this.action,
    required this.requestId,
    required this.payload,
  });

  final int version;
  final String action;
  final String requestId;
  final Map<String, Object?> payload;

  static BridgeMessage parse(String raw) {
    if (raw.length > 16 * 1024) {
      throw const FormatException('Bridge message too large');
    }

    final decoded = jsonDecode(raw);

    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Bridge message must be an object');
    }

    final version = decoded['version'];
    final action = decoded['action'];
    final requestId = decoded['requestId'];
    final payload = decoded['payload'];

    if (version is! int ||
        action is! String ||
        requestId is! String ||
        payload is! Map<String, dynamic>) {
      throw const FormatException('Invalid bridge schema');
    }

    if (version != 1) {
      throw FormatException(
        'Unsupported bridge version: $version',
      );
    }

    return BridgeMessage(
      version: version,
      action: action,
      requestId: requestId,
      payload: Map<String, Object?>.from(payload),
    );
  }
}

```

Dispatcher:

```
Future<void> dispatchBridgeMessage(
  BridgeMessage message,
) async {
  switch (message.action) {
    case 'openOrder':
      final orderId = message.payload['orderId'];

      if (orderId is! String ||
          orderId.isEmpty ||
          orderId.length > 128) {
        throw const FormatException('Invalid orderId');
      }

      await openOrder(orderId);
      return;

    default:
      throw FormatException(
        'Unsupported bridge action: ${message.action}',
      );
  }
}

Future<void> openOrder(String orderId) async {
  // Invoke the application's typed navigation layer here.
  // This function intentionally accepts only the validated order ID,
  // not arbitrary page commands.
}

```

Keep application capability smaller than browser capability.

---

# 31. Bridge Origin Limitation

Because the generic channel message carries no origin, do not write security logic that assumes:

```
message.origin

```

exists.

It does not in the current generic API.

Defense-in-depth should combine:

1. strict navigation allowlisting;
2. controlled first-party content;
3. minimal JavaScript channels;
4. typed message validation;
5. current-page checks when useful;
6. server-side web security such as CSP;
7. no sensitive native capability in the bridge.

Calling `currentUrl()` during message handling may be useful context, but it is not a cryptographically bound sender-origin field.

Do not describe it as one.

---

# 32. Bridge Performance

Bridge traffic crosses multiple systems:

```
JavaScript
   ↓
browser engine
   ↓
native plugin
   ↓
Flutter platform messaging
   ↓
Dart

```

or in the other direction:

```
Dart
   ↓
plugin
   ↓
native WebView
   ↓
JavaScript runtime

```

Avoid:

- scroll updates on every pixel;
- per-frame bridge messages;
- huge DOM snapshots;
- large JSON blobs every state change;
- polling the browser continuously.

Prefer:

- event-driven messages;
- coalescing;
- batching;
- small payloads;
- IDs instead of repeated full objects.

Do not quote universal microsecond costs.

Measure the actual product workload.

---

# 33. `loadHtmlString`

Current API:

```
await controller.loadHtmlString(
  html,
  baseUrl: 'https://app.example.com/',
);

```

supports an optional base URL.

Use the base URL deliberately when HTML includes relative:

- CSS;
- images;
- links;
- scripts.

Do not choose a trusted HTTPS base URL merely to make untrusted generated HTML appear first-party.

---

# 34. Local HTML Security

Local HTML is not inherently trusted.

Dangerous:

```
final html = '''
<html>
<body>
$userSuppliedContent
</body>
</html>
''';

```

If `userSuppliedContent` contains active HTML or script, the app created an injection vulnerability.

Use:

- text escaping for plain content;
- a vetted HTML sanitizer for rich untrusted markup;
- restrictive CSP when the app controls HTML;
- no privileged JavaScript bridge unless necessary.

Do not build giant generated HTML strings during `build()`.

---

# 35. Flutter Assets and Local Files

Current controller APIs include:

```
loadFlutterAsset(...)
loadFile(...)
loadHtmlString(...)

```

Prefer those supported APIs over manually constructing fragile `file://` URLs.

For Android-specific local-file behavior, additional load parameters exist at the platform layer.

Android also exposes controls for file/content access:

```
AndroidWebViewController.setAllowFileAccess(...)
AndroidWebViewController.setAllowContentAccess(...)

```

These exist because local-resource access has real security consequences.

Disable access you do not need.

---

# 36. Cookies

`WebViewCookieManager` currently supports:

```
setCookie(...)
getCookies(domain: ...)
clearCookies()

```

`clearCookies` acts across the application's WebViews.

Current generic `WebViewCookie` contains:

- name;
- value;
- domain;
- path.

It does **not** expose general setters for:

- `Secure`;
- `HttpOnly`;
- `SameSite`;
- expiry.

That limitation strongly favors server-issued security-sensitive cookies.

---

# 37. Setting Cookies Before Navigation

The official migration guidance explicitly instructs setting cookies before `loadRequest` when initial cookies are needed.

Correct sequencing:

```
final cookieManager = WebViewCookieManager();

await cookieManager.setCookie(
  const WebViewCookie(
    name: 'ui_preference',
    value: 'compact',
    domain: 'app.example.com',
    path: '/',
  ),
);

await controller.loadRequest(
  Uri.parse('https://app.example.com/'),
);

```

For authentication, prefer secure server-established session cookies whenever practical.

Do not inject long-lived bearer credentials into page JavaScript just to avoid designing the web session correctly.

---

# 38. Third-Party Cookies

Android exposes:

```
AndroidWebViewCookieManager.setAcceptThirdPartyCookies(...)

```

as a platform-specific feature.

Do not enable third-party cookies automatically.

Enable them only when:

- the product requires a known third-party embedded flow;
- privacy implications have been reviewed;
- the behavior is tested on actual WebView versions.

There is no equivalent cross-platform generic "enable all third-party cookies everywhere" switch in the umbrella API.

---

# 39. Authentication Strategies

Prefer, in descending order when applicable:

### Server session cookie

Best fit for a normal authenticated website.

Advantages:

- normal browser behavior;
- redirects/subresources automatically participate;
- no custom Dart header interceptor needed.

### One-time bootstrap exchange

Flutter obtains a short-lived, one-time value that the server exchanges for a secure browser session.

Useful when native and web authentication need deliberate synchronization.

### HTTP authentication

The package exposes HTTP-auth requests with host/realm and proceed/cancel callbacks.

Use only when the server actually uses HTTP authentication.

### Initial custom header

Useful for a narrowly defined first request.

Poor choice for persistent browser auth because the package does not establish a permanent header interception policy.

### OAuth/OIDC

Prefer the provider-approved system browser/authentication-session flow.

Do not use long-lived bearer tokens in:

- URL query strings;
- fragments unless explicitly part of a safe standard flow;
- page-global JavaScript;
- arbitrary bridge messages.

---

# 40. Logout

Logout is not:

```
await controller.clearCache();

```

A correct logout may involve:

```
server session invalidation
        +
cookie cleanup
        +
native application auth cleanup
        +
WebView navigation away from authenticated content
        +
optional relevant web-storage cleanup

```

Sequence asynchronous cleanup deterministically.

Example:

```
Future<void> logoutWebSession({
  required WebViewController controller,
  required WebViewCookieManager cookieManager,
  required Uri loggedOutPage,
}) async {
  await cookieManager.clearCookies();
  await controller.clearLocalStorage();
  await controller.loadRequest(loggedOutPage);
}

```

Whether local storage should be removed depends on the product.

Do not clear unrelated browser state casually.

---

# 41. Cache vs Local Storage vs Cookies

These are different storage classes.

Current APIs distinguish:

```
controller.clearCache();
controller.clearLocalStorage();
cookieManager.clearCookies();

```

The 4.x migration explicitly changed `clearCache()` so it no longer clears local storage and no longer automatically reloads the page.

Do not claim:

```
clearCache == clear all web data

```

The generic API does not promise that one method wipes:

- cookies;
- localStorage;
- IndexedDB;
- service-worker caches;
- session storage;
- every browser website-data store.

For privacy-sensitive destruction requirements, verify the actual platform/browser APIs required by the product.

---

# 42. Cache Performance

Do not clear cache before normal reloads.

Frequent cache clearing can increase:

- network requests;
- DNS/TLS activity;
- transferred bytes;
- image decoding;
- page-load latency;
- battery use;
- server load.

Use proper web HTTP cache semantics.

If stale content is a server problem, fix the caching policy rather than treating browser cache deletion as application synchronization.

---

# 43. User Agent

Current generic APIs include:

```
await controller.getUserAgent();
await controller.setUserAgent(...);

```

Do not replace the complete user agent without a reason.

A custom UA can alter:

- responsive server rendering;
- compatibility detection;
- authentication policies;
- analytics;
- bot detection.

If the server needs app identification, prefer a minimal, documented strategy.

Test user-agent changes against every supported platform.

---

# 44. WebView Networking Is Not Dio

Browser networking is owned by Android WebView/WKWebView.

Therefore this architecture is wrong:

```
Dio interceptor
   ↓
assume WebView image requests also pass through it

```

They do not automatically.

Similarly:

```
Flutter CertificatePinningHttpClient

```

does not automatically govern WKWebView/Android WebView transport.

Design browser networking as browser networking.

---

# 45. Request Interception

The generic API is deliberately not a full HTTP proxy layer.

Android exposes lower-level native clients through platform-specific implementation objects; for example `AndroidNavigationDelegate` exposes native `WebViewClient`, `WebChromeClient`, and `DownloadListener` bridge objects.

Do not intercept every resource merely to:

- add one auth header;
- collect analytics;
- mimic Dio;
- implement caching yourself.

A full resource proxy can add:

- latency;
- memory copies;
- complex HTTP semantics;
- streaming bugs;
- CORS/session inconsistencies.

Prefer server/browser-native mechanisms.

---

# 46. Errors

Distinguish:

### Transport/resource failure

Examples:

- DNS failure;
- timeout;
- connection failure;
- failed SSL handshake.

Use `onWebResourceError`.

Current error types include host lookup, timeout, connect, SSL handshake, unsafe resource, terminated web process, and others.

### HTTP error

An HTTP response such as 404/500 is represented through HTTP-error handling, not necessarily as a transport failure.

### Application error page

A successful HTTP response can still render an application-level error.

Do not collapse all three into:

```
"Internet connection failed"

```

---

