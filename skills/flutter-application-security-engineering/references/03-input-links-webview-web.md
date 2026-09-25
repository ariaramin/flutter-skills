# Input Validation, Links, WebViews, and Flutter Web Security

> Source-derived reference split from the user-supplied Flutter Application Security Engineering Skill. Preserve its caveats and terminology when applying detailed guidance.

## Contents

- Input Validation
- Injection Prevention
  - SQL
  - Command execution
  - HTML / JavaScript
  - URL injection
  - Path injection
- Deep-Link Security
  - Validate
  - Exact-host validation
  - Sensitive actions
  - One-time actions
  - Open redirects
- External URL Security
  - Recommended validator
- WebView Security
  - Default posture
  - Restrict navigation
  - JavaScript bridges
  - Untrusted HTML
  - Mixed content
  - TLS errors
  - OAuth
- Flutter Web Security
  - XSS
  - Content Security Policy
  - Trusted Types
  - CORS
  - Cookies
  - Local storage
  - CSRF
  - Service workers
  - Web Crypto
  - Browser extensions

---

## Input Validation

Treat all data originating outside the current trusted component as untrusted, including data that "came from your backend."

Validate API responses because:

- backend versions drift
- proxies can fail
- caches can contain old shapes
- third-party APIs can change
- server bugs happen
- resource-exhaustion attacks may target parsers

Validate:

- type
- required presence
- range
- string length
- collection length
- enum membership
- identifier syntax
- timestamp bounds
- URI scheme
- hostname
- port
- path
- file name
- MIME/content
- total response size where enforceable
- nesting depth where relevant

Reject unexpected privilege-bearing values rather than silently coercing them.

---

## Injection Prevention

### SQL

Use bound parameters.

Bad:

```dart
final sql = "SELECT * FROM users WHERE name = '$userInput'";
```

Better, using a database API that supports placeholders:

```dart
await database.rawQuery(
  'SELECT * FROM users WHERE name = ?',
  <Object?>[userInput],
);
```

Do not interpolate user input into:

- SQL
- FTS expressions unless the API's query language is safely constructed
- shell commands
- URLs
- HTML
- JavaScript
- filesystem paths

### Command execution

Avoid invoking OS shells from Flutter desktop applications for user-derived content.

If native code genuinely needs subprocess execution:

- avoid the shell
- pass arguments separately
- enforce an operation allowlist
- reject arbitrary executable names or flags

### HTML / JavaScript

Never concatenate untrusted values into executable HTML or JavaScript.

Prefer structured APIs and text APIs.

### URL injection

Parse with `Uri`, then validate exact components.

### Path injection

Do not turn a user-provided filename directly into a privileged filesystem path.

---

## Deep-Link Security

Treat every incoming URI as attacker-controlled even when the OS reports it as an App Link or Universal Link.

Verified delivery helps establish app/domain association. It does **not** validate application parameters or authorize the requested action.

Android recommends App Links for owned web domains because Digital Asset Links verifies the app-domain association.

Apple likewise warns that Universal Links remain an attack vector and applications must validate link parameters rather than directly perform sensitive actions from link content.

### Validate

- scheme
- exact host
- expected port
- path
- path variables
- parameter set
- length
- state/correlation for authentication flows
- authentication state
- authorization
- one-time token freshness
- replay state

### Exact-host validation

Bad:

```dart
bool isTrusted(Uri uri) {
  return uri.host.contains('example.com');
}
```

This accepts hosts such as:

```text
example.com.attacker.invalid
```

Better:

```dart
bool isTrustedHttpsUri(Uri uri) {
  return uri.scheme == 'https' &&
      uri.host.toLowerCase() == 'example.com' &&
      (!uri.hasPort || uri.port == 443) &&
      uri.userInfo.isEmpty;
}
```

For subdomains, explicitly enumerate them or validate DNS-label boundaries according to the intended policy.

### Sensitive actions

A link should generally navigate the user to a confirmation/authentication flow rather than directly perform:

- account deletion
- payout
- password change
- email change
- MFA reset
- data export
- purchase

### One-time actions

For password reset, invitation acceptance, or similar actions:

- use high-entropy server-issued token
- expire it
- scope it to the intended operation/account
- make it single-use where appropriate
- perform authorization server-side
- avoid logging the complete URI

### Open redirects

If a link contains:

```text
?next=https://...
```

do not blindly launch or navigate.

Map to an internal route identifier or validate against a strict allowlist.

---

## External URL Security

`url_launcher` can pass URIs to platform handlers, and supported schemes vary by platform—including schemes with filesystem implications on desktop. Validate before launch.

### Recommended validator

```dart
final class AllowedOrigin {
  const AllowedOrigin({
    required this.scheme,
    required this.host,
    this.port,
  });

  final String scheme;
  final String host;
  final int? port;

  bool matches(Uri uri) {
    if (uri.scheme.toLowerCase() != scheme.toLowerCase()) {
      return false;
    }

    if (uri.host.toLowerCase() != host.toLowerCase()) {
      return false;
    }

    if (uri.userInfo.isNotEmpty) {
      return false;
    }

    if (port == null) {
      return !uri.hasPort;
    }

    return uri.hasPort && uri.port == port;
  }
}

bool isAllowedExternalUri(
  Uri uri,
  Set<AllowedOrigin> allowedOrigins,
) {
  return allowedOrigins.any((origin) => origin.matches(uri));
}
```

For public web links, usually allow only `https`.

Reject unexpected:

- `javascript:`
- `data:`
- `file:`
- custom schemes
- embedded credentials
- attacker-controlled hosts

unless a specific threat-modeled workflow explicitly requires them.

---

## WebView Security

A WebView is a browser execution environment embedded inside an application. Treat it as a major trust boundary.

Android warns that enabling JavaScript and exposing JavaScript interfaces can introduce serious security problems, especially when content is not fully trusted.

### Default posture

- Prefer native Flutter UI for sensitive functionality.
- Disable JavaScript when not required.
- Load HTTPS only.
- Restrict navigation.
- Do not ignore TLS/SSL errors.
- Do not expose privileged JavaScript bridges to arbitrary pages.
- Avoid mixed content.
- Minimize persistent WebView cookies/storage.
- Clear sensitive WebView state when the product requires session isolation.
- Do not load attacker-controlled HTML with privileged JS/native capabilities.

### Restrict navigation

With the official Flutter `webview_flutter` plugin, construct a strict navigation policy rather than relying on `startsWith` string checks. The plugin exposes `NavigationDelegate`, JavaScript-mode configuration, and JavaScript channels; those APIs do not automatically make remote content trusted.

Example:

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

final class TrustedWebView extends StatefulWidget {
  const TrustedWebView({
    required this.initialUri,
    super.key,
  });

  final Uri initialUri;

  @override
  State<TrustedWebView> createState() => _TrustedWebViewState();
}

final class _TrustedWebViewState extends State<TrustedWebView> {
  static const _allowedHost = 'docs.example.com';

  late final WebViewController _controller;

  bool _isAllowed(Uri uri) {
    return uri.scheme == 'https' &&
        uri.host.toLowerCase() == _allowedHost &&
        (!uri.hasPort || uri.port == 443) &&
        uri.userInfo.isEmpty;
  }

  @override
  void initState() {
    super.initState();

    if (!_isAllowed(widget.initialUri)) {
      throw ArgumentError.value(
        widget.initialUri,
        'initialUri',
        'Untrusted WebView origin',
      );
    }

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.disabled)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null || !_isAllowed(uri)) {
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(widget.initialUri);
  }

  @override
  Widget build(BuildContext context) {
    return WebViewWidget(controller: _controller);
  }
}
```

### JavaScript bridges

Treat every JS channel as a native API exposed to page code.

For every message:

- know which trusted origin is currently loaded
- prevent navigation to other origins while the bridge exists
- validate message schema
- validate type and size
- allowlist action names
- validate parameters
- perform authorization independently
- return minimum data
- never expose arbitrary filesystem, shell, credential, or platform-channel access

Do not assume a JS message carries trustworthy origin metadata unless the API explicitly provides and verifies it.

### Untrusted HTML

Do not combine:

```text
attacker-controlled HTML
+
JavaScript enabled
+
privileged native bridge
```

If displaying untrusted rich content is unavoidable:

- sanitize using a maintained sanitizer appropriate to the actual markup model
- disable JavaScript
- isolate origin/content
- block navigation
- remove native bridges
- block local-file access
- enforce resource limits

### Mixed content

Do not allow insecure HTTP resources inside a sensitive HTTPS WebView.

### TLS errors

Never "continue" through WebView certificate errors in production.

OWASP MASTG includes WebView SSL-error behavior among mobile security verification areas.

### OAuth

Do not create an arbitrary embedded-WebView OAuth login merely to keep users "inside the app." Follow provider and native-app OAuth guidance.

---

## Flutter Web Security

Flutter Web inherits browser security properties.

Do not apply mobile assumptions blindly.

### XSS

Flutter's rendering model does not eliminate XSS risk.

XSS remains relevant through:

- JavaScript interop
- DOM manipulation
- embedded HTML
- third-party scripts
- analytics scripts
- browser plugins/extensions
- dynamically loaded script
- unsafe URL handling

An attacker executing script in the same origin can access JavaScript-readable storage and act as the application.

### Content Security Policy

Use a restrictive CSP when the deployment architecture supports it.

Prefer:

- narrow `script-src`
- no broad `*` origins
- nonces/hashes for unavoidable inline scripts
- narrow `connect-src`
- narrow `frame-src`
- `object-src 'none'` where compatible
- tested policies in report-only mode before enforcement where operationally appropriate

CSP is defense in depth; the CSP specification does not make it a replacement for correct validation and safe DOM handling.

Do not paste a generic CSP into production without testing it against:

- Flutter bootstrap requirements
- selected web renderer
- authentication provider
- API hosts
- analytics
- fonts/images
- workers
- deployment CDN

### Trusted Types

Where browser support and JavaScript architecture make it appropriate, consider Trusted Types as additional defense around dangerous DOM injection sinks.

### CORS

CORS is a browser access-control mechanism, not API authentication.

Backend CORS policy should:

- explicitly enumerate trusted origins
- avoid reflecting arbitrary `Origin`
- avoid `Access-Control-Allow-Origin: *` with credentials
- minimize allowed headers and methods

Credentialed CORS requests cannot use a wildcard origin.

### Cookies

For browser session identifiers, a server-managed cookie design is often preferable when the architecture allows it.

Use, as applicable:

- `Secure`
- `HttpOnly`
- restrictive `SameSite`
- narrow Path/Domain
- appropriate expiration
- server invalidation
- CSRF protection

`HttpOnly` prevents direct JavaScript reads, while `SameSite` can reduce some cross-site request risks. Neither property by itself solves all CSRF/XSS threats.

### Local storage

Avoid putting long-lived bearer credentials into `localStorage` merely because mobile secure-storage guidance used persistent storage.

If an architecture requires JavaScript-accessible tokens:

- make the XSS risk explicit
- minimize lifetime
- minimize scope
- avoid persistent storage where practical
- use server-side revocation/risk controls
- harden CSP and third-party-script governance

### CSRF

When authentication uses cookies, implement an appropriate CSRF defense.

Do not rely solely on `SameSite`.

### Service workers

Review service-worker behavior for:

- cache lifetime
- old application versions
- sensitive response caching
- logout behavior
- offline authorization assumptions
- update/recovery

Current Flutter no longer generates/manages a service worker automatically for ordinary web builds; if an application adds one, treat it as application-controlled security-sensitive code.

### Web Crypto

Use it only through a designed, reviewed protocol.

### Browser extensions

For highly sensitive web applications, recognize that a hostile extension with sufficient privileges may undermine assumptions about DOM or network secrecy. Do not promise a web client can protect server-only secrets against the browser owner.

---

