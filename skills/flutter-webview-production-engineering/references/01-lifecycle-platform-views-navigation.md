# Source reference: Package fit, controller lifecycle, platform views, URL and navigation policy

## Table of contents

- [Production Flutter WebView Engineering](#production-flutter-webview-engineering)
  - [Purpose](#purpose)
- [1. Current Toolchain Snapshot](#1-current-toolchain-snapshot)
    - [Version rule](#version-rule)
- [2. Package Architecture](#2-package-architecture)
    - [Responsibility boundaries](#responsibility-boundaries)
- [3. When WebView Is Appropriate](#3-when-webview-is-appropriate)
- [4. When to Prefer Flutter UI or a System Browser](#4-when-to-prefer-flutter-ui-or-a-system-browser)
- [5. Repository Reconnaissance](#5-repository-reconnaissance)
- [6. Modern Controller Architecture](#6-modern-controller-architecture)
- [7. Controller Lifecycle](#7-controller-lifecycle)
- [8. Avoid Unnecessary WebView Recreation](#8-avoid-unnecessary-webview-recreation)
- [9. WebViews Are Heavyweight Resources](#9-webviews-are-heavyweight-resources)
- [10. Multiple WebViews and Tabs](#10-multiple-webviews-and-tabs)
- [11. Current Public Controller API](#11-current-public-controller-api)
- [12. Deprecated Historical Patterns](#12-deprecated-historical-patterns)
- [13. Platform Views](#13-platform-views)
- [14. Android Rendering Modes](#14-android-rendering-modes)
    - [Texture Layer Hybrid Composition](#texture-layer-hybrid-composition)
    - [Hybrid Composition](#hybrid-composition)
    - [Explicit mode example](#explicit-mode-example)
    - [HCPP](#hcpp)
- [15. iOS and macOS Composition](#15-ios-and-macos-composition)
- [16. URL Loading](#16-url-loading)
    - [Header rule](#header-rule)
- [17. URL Validation](#17-url-validation)
- [18. Domain Allowlisting](#18-domain-allowlisting)
- [19. Navigation Policy](#19-navigation-policy)
- [20. Secure Navigation Delegate](#20-secure-navigation-delegate)
# Production Flutter WebView Engineering

## Purpose

This skill teaches an AI coding agent how to design, implement, secure, optimize, test, debug, review, migrate, and maintain production Flutter applications using the official `webview_flutter` ecosystem.

The core rule is:

> **Treat WebView as a heavyweight platform-owned browser surface. Create it only when the product requires embedded web content, keep its lifecycle deliberate, minimize Flutter/native/web boundary traffic, tightly control navigation and JavaScript exposure, and optimize the complete Flutter + WebView + web-content pipeline rather than only the Dart wrapper.**

A WebView is not ordinary Flutter UI. It brings another runtime into the application:

- a browser rendering pipeline;
- HTML/CSS layout and painting;
- a JavaScript runtime;
- a browser navigation stack;
- browser-owned networking;
- cookies;
- web storage;
- browser caches;
- media playback;
- native permissions;
- browser security policy;
- platform-view composition;
- significant native memory.

Treat the Flutter/WebView boundary as an integration and security boundary.

---

# 1. Current Toolchain Snapshot

Research snapshot: **2026-08-10**.

The current stable umbrella package is `webview_flutter` **4.14.1**. Its current support matrix is Android **SDK 24+**, iOS **13.0+**, and macOS **10.15+**. The package does not list Flutter web as an endorsed target.

Current package versions relevant to the federated implementation are:

| PackageCurrent versionRole           |        |                                   |
| ------------------------------------ | ------ | --------------------------------- |
| `webview_flutter`                    | 4.14.1 | Application-facing API            |
| `webview_flutter_android`            | 4.13.0 | Endorsed Android implementation   |
| `webview_flutter_wkwebview`          | 3.26.0 | Endorsed iOS/macOS implementation |
| `webview_flutter_platform_interface` | 2.15.1 | Federated platform contract       |

The latest Android and WebKit implementation packages require Dart 3.12 and Flutter 3.44, while `webview_flutter` 4.14.0 raised its own minimum to Flutter 3.38/Dart 3.10. Applications on older supported Flutter releases can resolve older compatible endorsed implementation versions; therefore the versions actually present in `pubspec.lock` matter more than copying examples written against today's latest platform packages.

### Version rule

Before modifying WebView code:

1. Read `pubspec.yaml`.
2. Read `pubspec.lock`.
3. Determine the Flutter and Dart versions used by CI.
4. Determine the resolved `webview_flutter` version.
5. Determine the resolved Android/WebKit implementation versions.
6. Inspect any direct imports of platform implementation packages.
7. Verify every platform-specific API against those resolved versions.
8. Do not upgrade the entire WebView stack merely to copy a modern snippet.

---

# 2. Package Architecture

`webview_flutter` is federated.

The application-facing package delegates to platform implementations through `webview_flutter_platform_interface`. `WebViewPlatform` is the platform abstraction responsible for creating platform controllers, widgets, navigation delegates, and cookie managers.

The endorsed implementations are:

```
webview_flutter
        |
        +-- webview_flutter_platform_interface
        |
        +-- webview_flutter_android
        |       |
        |       +-- Android android.webkit.WebView
        |
        +-- webview_flutter_wkwebview
                |
                +-- Apple WKWebView

```

The Android and WebKit packages are included automatically when normal `webview_flutter` APIs are used. If application code directly imports classes such as `AndroidWebViewController` or `WebKitWebViewController`, declare that implementation package as a direct dependency.

### Responsibility boundaries

**Flutter/application code controls:**

- when an embedded browser is needed;
- where the platform view appears;
- navigation policy;
- JavaScript exposure;
- app-level auth/session coordination;
- app permission decisions;
- Flutter loading/error UI;
- controller ownership;
- external-link handoff.

**The native browser engine controls:**

- HTML/CSS layout;
- JavaScript execution;
- most network traffic;
- HTTP caching;
- page navigation;
- browser cookies/storage;
- media engines;
- DOM memory;
- browser process/runtime behavior.

**The webpage controls:**

- its DOM;
- scripts;
- resource requests;
- layout;
- SPA state;
- third-party scripts;
- web authentication flow.

Do not assume Dart `http`, Dio interceptors, Flutter image caching, or Flutter widget lifecycle automatically governs WebView internals.

---

# 3. When WebView Is Appropriate

Use a WebView when embedded web content is an actual product requirement, for example:

- a first-party web application that must remain inside the app;
- legally required hosted documents;
- a checkout flow specifically designed for embedded browser use;
- complex HTML content whose native reimplementation is unjustified;
- an existing cross-platform web experience tightly integrated with the app;
- browser functionality that depends on a real DOM/JS engine.

Before introducing a WebView, answer:

1. Why must this content be embedded?
2. Could Flutter render it natively?
3. Could the system browser provide a safer experience?
4. Is authentication involved?
5. Does the provider permit embedded user agents?
6. What domains may load?
7. Is JavaScript necessary?
8. Does JavaScript need access to app capabilities?
9. Which browser permissions are required?
10. Is web support required?
11. How many simultaneous WebViews can exist?
12. What is the expected lifecycle?

---

# 4. When to Prefer Flutter UI or a System Browser

Prefer native Flutter UI when:

- the content is structured application data;
- accessibility must be tightly controlled;
- offline operation is important;
- the UI needs deep Flutter gesture/animation integration;
- only a small portion of HTML would otherwise be embedded;
- browser state/security adds more complexity than value.

Prefer a system browser or platform authentication session when:

- the user is browsing arbitrary third-party pages;
- provider identity must be visible and trustworthy;
- OAuth/OIDC policy requires an external user agent;
- password-manager/browser-session sharing is desirable;
- browser privacy controls are important;
- no app bridge is required.

Apple explicitly provides `ASWebAuthenticationSession` for authenticating users with web services; it provides a controlled browser authentication flow and callback routing rather than requiring an arbitrary embedded `WKWebView`.

Do not use `WebViewWidget` for OAuth solely because keeping the UI inside the app appears visually convenient.

---

# 5. Repository Reconnaissance

Before changing WebView code inspect:

```
pubspec.yaml
pubspec.lock
analysis_options.yaml

lib/
  presentation/
  navigation/
  auth/
  web/
  browser/

android/
  app/src/main/AndroidManifest.xml
  network_security_config.xml
  build.gradle / build.gradle.kts

ios/
  Runner/Info.plist
  Runner.xcodeproj

macos/
  Runner/Info.plist
  Runner.xcodeproj

integration_test/
test/

```

Search for:

```
webview_flutter
WebViewController
WebViewWidget
NavigationDelegate
WebViewCookieManager
JavaScriptMode
addJavaScriptChannel
removeJavaScriptChannel
runJavaScript
runJavaScriptReturningResult
loadRequest
loadHtmlString
loadFlutterAsset
loadFile
clearCache
clearLocalStorage
clearCookies
setCookie
getCookies
setUserAgent
getUserAgent
onPermissionRequest
onSSlAuthError
onHttpAuthRequest
onHttpError
onWebResourceError
AndroidWebViewController
AndroidWebViewCookieManager
AndroidWebViewWidgetCreationParams
WebKitWebViewController
WebKitWebViewControllerCreationParams
WillPopScope
PopScope

```

Also identify:

- external-link handling;
- OAuth code;
- session-cookie creation;
- bearer-token injection;
- deep links;
- Android cleartext exceptions;
- Apple ATS exceptions;
- camera/microphone permissions;
- file-picking code;
- WebView tabs;
- hidden/offstage WebViews.

Do not introduce a second navigation/session architecture before understanding the existing one.

---

# 6. Modern Controller Architecture

Modern `webview_flutter` separates the controller from the widget.

A `WebViewController` controls the underlying native WebView, while `WebViewWidget` embeds it in Flutter's widget tree. A controller can be attached to only one `WebViewWidget` at a time.

Correct:

```
late final WebViewController _controller;

@override
void initState() {
  super.initState();

  _controller = WebViewController()
    ..setJavaScriptMode(JavaScriptMode.disabled)
    ..loadRequest(Uri.parse('https://example.com'));
}

@override
Widget build(BuildContext context) {
  return WebViewWidget(controller: _controller);
}

```

Wrong:

```
@override
Widget build(BuildContext context) {
  final controller = WebViewController()
    ..loadRequest(Uri.parse('https://example.com'));

  return WebViewWidget(controller: controller);
}

```

A widget rebuild is a normal Flutter operation.

A browser recreation is not.

---

# 7. Controller Lifecycle

`WebViewController` does **not** expose a public `dispose()` method in the current API. Do not invent one.

The Android and WebKit implementations have historically fixed garbage-collection and native-reference lifetime bugs, demonstrating that underlying platform object lifetime is implementation-managed rather than a manually callable controller-dispose protocol.

Production rules:

- create one controller for one logical embedded-browser lifecycle;
- keep it stable across ordinary rebuilds;
- do not retain it globally after the screen/session no longer needs it;
- remove or stop using bridge capabilities when the session ends;
- stop media/navigation intentionally where product semantics require it;
- let application references disappear when the WebView is no longer required.

Do not build a permanent singleton `WebViewController` unless a deliberately process-wide browser session is truly required.

---

# 8. Avoid Unnecessary WebView Recreation

Recreating an embedded browser may discard or disturb:

- browser navigation history;
- current page;
- DOM state;
- JavaScript state;
- scroll position;
- form state;
- in-page SPA state;
- media state;
- temporary browser resources.

It also creates additional native platform-view/browser initialization work.

Therefore:

> **Unrelated Flutter state changes must not cause a new WebView controller or browser session.**

Keep the WebView subtree stable.

Prefer:

```
Stateful route
 ├─ stable WebViewController
 ├─ WebViewWidget
 └─ lightweight loading/error overlay

```

rather than rebuilding the browser because loading percentage, toolbar state, or another screen widget changed.

---

# 9. WebViews Are Heavyweight Resources

A live WebView can involve:

- a platform view;
- Chromium WebView or WebKit machinery;
- browser heap;
- JavaScript heap;
- DOM;
- decoded images;
- fonts;
- GPU surfaces;
- video buffers;
- browser caches;
- network connections.

Flutter's Dart heap metrics therefore show only part of the process's memory story.

Do not casually create:

- one WebView per `ListView` item;
- one WebView per carousel preview;
- many preloaded tabs;
- large numbers of hidden/offstage WebViews.

For an article feed, render previews with Flutter and open a WebView only for the selected article.

---

# 10. Multiple WebViews and Tabs

Choose among three tab strategies:

| StrategyBenefitCostUse when |                        |                   |                                            |
| --------------------------- | ---------------------- | ----------------- | ------------------------------------------ |
| Recreate tab WebView        | Lowest retained memory | Reload/state loss | state is cheap to restore                  |
| Keep selected few alive     | Balanced               | Moderate memory   | common tab UX                              |
| Keep all alive              | Instant switching      | Highest memory    | small bounded tab count with measured need |

Prefer lazy creation:

```
user opens tab
   ↓
create WebView for that tab

```

not:

```
app launches
   ↓
create 8 hidden WebViews

```

An offstage platform view is still a native/browser resource.

Do not use invisibility as a disposal strategy.

---

# 11. Current Public Controller API

The current controller includes functionality for:

- navigation history;
- GET/POST request loading;
- local files;
- Flutter assets;
- HTML strings;
- JavaScript execution;
- JavaScript channels;
- cache clearing;
- local-storage clearing;
- title/current URL;
- user agent;
- background color;
- scrolling;
- zoom;
- scrollbars;
- JavaScript dialogs;
- console messages;
- permission requests.

Important modern methods include:

```
controller.loadRequest(uri);
controller.loadHtmlString(html, baseUrl: baseUrl);
controller.loadFlutterAsset(assetKey);
controller.loadFile(absolutePath);

controller.reload();
controller.stopLoading();

controller.canGoBack();
controller.canGoForward();
controller.goBack();
controller.goForward();

controller.currentUrl();
controller.getTitle();

controller.runJavaScript(source);
controller.runJavaScriptReturningResult(source);

controller.addJavaScriptChannel(...);
controller.removeJavaScriptChannel(...);

controller.clearCache();
controller.clearLocalStorage();

controller.getUserAgent();
controller.setUserAgent(...);

controller.getScrollPosition();
controller.scrollTo(...);
controller.scrollBy(...);

```

Do not copy examples based on the pre-4.x `WebView(initialUrl: ...)` controller model.

---

# 12. Deprecated Historical Patterns

The 4.x redesign removed or replaced several old APIs.

Important migrations include:

| Old APICurrent approach                    |                                                         |
| ------------------------------------------ | ------------------------------------------------------- |
| `WebView(...)`                             | `WebViewController` + `WebViewWidget`                   |
| `loadUrl`                                  | `loadRequest`                                           |
| `evaluateJavascript`                       | `runJavaScript` / `runJavaScriptReturningResult`        |
| `getScrollX/getScrollY`                    | `getScrollPosition`                                     |
| `initialCookies`                           | call `WebViewCookieManager.setCookie` before navigation |
| `CookieManager`                            | `WebViewCookieManager`                                  |
| widget JavaScript mode                     | controller `setJavaScriptMode`                          |
| widget JavaScript channels                 | controller add/remove channel                           |
| widget user-agent config                   | controller `setUserAgent`                               |
| old Android global platform mode selection | current implementation creation/widget params           |

`clearCache()` also no longer clears local storage and no longer reloads the page.

Reject old tutorial code before attempting to patch it.

---

# 13. Platform Views

`WebViewWidget` embeds a native platform-owned view.

Flutter's platform-view documentation explicitly notes that platform views have composition and performance tradeoffs.

This matters for:

- clipping;
- opacity;
- transforms;
- gestures;
- accessibility;
- route transitions;
- overlays;
- scrolling;
- frame synchronization.

Do not reason about a WebView as though it were a normal Flutter `CustomPaint`.

---

# 14. Android Rendering Modes

The official Android WebView implementation currently defaults to **Texture Layer Hybrid Composition**. The package allows explicit opt-in to **Hybrid Composition** through Android-specific widget creation parameters, and warns that the default may change in the future.

### Texture Layer Hybrid Composition

Advantages:

- generally better Flutter rendering performance;
- Flutter can compose the native view as a texture;
- transforms work well.

Potential issues include fast-scroll jank and limitations associated with some Android surface-backed views. Flutter's current platform-view documentation specifically calls out WebView quick scrolling as a possible texture-layer jank case.

### Hybrid Composition

Advantages:

- higher native-view fidelity for some platform interactions;
- useful when texture composition causes native behavior problems.

Tradeoff:

Hybrid composition merges/synchronizes work involving the Flutter raster and platform threads and can reduce Flutter frame performance in complex scenes.

### Explicit mode example

```
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

Widget buildAndroidWebView(
  WebViewController controller, {
  bool useHybridComposition = false,
}) {
  final params = PlatformWebViewWidgetCreationParams(
    controller: controller.platform,
    layoutDirection: TextDirection.ltr,
    gestureRecognizers:
        const <Factory<OneSequenceGestureRecognizer>>{},
  );

  final androidParams =
      AndroidWebViewWidgetCreationParams
          .fromPlatformWebViewWidgetCreationParams(
    params,
    displayWithHybridComposition: useHybridComposition,
  );

  return WebViewWidget.fromPlatformCreationParams(androidParams);
}

```

Use an explicit composition mode only when there is a product/performance reason.

Do not cargo-cult `displayWithHybridComposition: true`.

### HCPP

Current Flutter also documents experimental Hybrid Composition++ on supported modern Android configurations. This is a Flutter platform-view engine feature rather than a new `webview_flutter` controller API. Treat it as a separately version-gated engine optimization and test the application's actual platform-view stack before relying on it.

---

# 15. iOS and macOS Composition

The Apple implementation uses `WKWebView`.

Flutter iOS platform views support transforms, clipping, and opacity, but current documentation lists composition limitations such as unsupported `ShaderMask` and `ColorFiltered`, and constraints around `BackdropFilter`.

macOS platform views require synchronization between Flutter raster work and native platform-thread rendering, so slow native/platform work can affect composed-frame performance.

Rules:

- avoid large animated opacity layers over WebView without profiling;
- avoid unnecessary decorative clipping;
- test rounded corners on real devices;
- profile route transitions containing WebViews;
- avoid complex overlapping platform views;
- do not assume Android composition behavior applies to Apple platforms.

---

# 16. URL Loading

Current `loadRequest` supports GET and POST requests, custom headers, and an optional body.

Example:

```
await controller.loadRequest(
  Uri.https(
    'app.example.com',
    '/account',
    <String, String>{
      'source': 'flutter',
    },
  ),
  headers: const <String, String>{
    'X-App-Client': 'flutter',
  },
);

```

Android currently does not support custom headers on POST through the package's normal `loadRequest` path; the package documentation describes manually performing such a request and then loading the response HTML as a workaround.

### Header rule

Treat `loadRequest(... headers:)` as headers for that navigation request.

Do **not** design authentication around an assumption that those headers automatically become permanent headers for:

- redirects;
- images;
- stylesheets;
- JavaScript `fetch`;
- XHR;
- future links.

The API documents headers on a specific request, not a browser-wide interceptor.

Use normal web-session mechanisms for persistent authentication.

---

# 17. URL Validation

Never write:

```
controller.loadRequest(Uri.parse(userInput));

```

without a URL policy.

Parse first:

```
Uri requireHttpsUri(String input) {
  final uri = Uri.tryParse(input);

  if (uri == null ||
      uri.scheme != 'https' ||
      uri.host.isEmpty) {
    throw FormatException('Unsupported URL');
  }

  return uri;
}

```

For controlled embedded content validate:

- scheme;
- host;
- subdomain policy;
- port;
- optionally path.

Do not validate with substring matching.

Bad:

```
if (url.contains('example.com')) {
  // trusted
}

```

This accepts URLs such as:

```
https://example.com.attacker.invalid/

```

---

# 18. Domain Allowlisting

Use parsed hostname semantics.

```
final class TrustedOriginPolicy {
  const TrustedOriginPolicy({
    required this.rootDomain,
    this.allowSubdomains = false,
  });

  final String rootDomain;
  final bool allowSubdomains;

  bool allows(Uri uri) {
    if (uri.scheme != 'https') {
      return false;
    }

    final host = uri.host.toLowerCase();
    final root = rootDomain.toLowerCase();

    if (host == root) {
      return true;
    }

    return allowSubdomains && host.endsWith('.$root');
  }
}

```

If ports matter:

```
bool usesAllowedHttpsPort(Uri uri) {
  return !uri.hasPort || uri.port == 443;
}

```

Do not treat every subdomain as trusted merely because the parent organization owns the DNS zone.

A marketing CMS and a privileged JavaScript bridge should often have different trust policies.

---

# 19. Navigation Policy

Classify navigation explicitly:

```
enum WebNavigationTarget {
  embedded,
  externalBrowser,
  deepLink,
  mail,
  phone,
  download,
  blocked,
}

```

Example policy:

```
final class WebNavigationPolicy {
  const WebNavigationPolicy({
    required this.trustedOrigin,
  });

  final TrustedOriginPolicy trustedOrigin;

  WebNavigationTarget classify(Uri uri) {
    switch (uri.scheme) {
      case 'https':
        return trustedOrigin.allows(uri)
            ? WebNavigationTarget.embedded
            : WebNavigationTarget.externalBrowser;

      case 'mailto':
        return WebNavigationTarget.mail;

      case 'tel':
        return WebNavigationTarget.phone;

      case 'myapp':
        return WebNavigationTarget.deepLink;

      default:
        return WebNavigationTarget.blocked;
    }
  }
}

```

Default-deny unknown schemes.

Be especially careful with:

```
javascript:
file:
data:
content:
intent:
custom-app-scheme:

```

Do not blindly forward arbitrary `intent://` or custom scheme URLs to Android.

---

# 20. Secure Navigation Delegate

The current `NavigationDelegate` supports navigation decisions, progress, page start/finish, URL changes, HTTP errors, resource errors, HTTP authentication, and SSL-authentication errors.

A `NavigationRequest` contains the URL and `isMainFrame`; it does not provide a trusted origin object or arbitrary request-header context.

Production example:

```
import 'dart:async';

import 'package:webview_flutter/webview_flutter.dart';

typedef ExternalUrlHandler = Future<void> Function(Uri uri);

NavigationDelegate createNavigationDelegate({
  required WebNavigationPolicy policy,
  required ExternalUrlHandler openExternal,
  required void Function(int progress) onProgress,
  required void Function(String url) onPageStarted,
  required void Function(String url) onPageFinished,
  required void Function(WebResourceError error) onMainFrameError,
}) {
  return NavigationDelegate(
    onProgress: onProgress,
    onPageStarted: onPageStarted,
    onPageFinished: onPageFinished,
    onNavigationRequest: (NavigationRequest request) {
      final uri = Uri.tryParse(request.url);

      if (uri == null) {
        return NavigationDecision.prevent;
      }

      switch (policy.classify(uri)) {
        case WebNavigationTarget.embedded:
          return NavigationDecision.navigate;

        case WebNavigationTarget.externalBrowser:
        case WebNavigationTarget.deepLink:
        case WebNavigationTarget.mail:
        case WebNavigationTarget.phone:
        case WebNavigationTarget.download:
          unawaited(openExternal(uri));
          return NavigationDecision.prevent;

        case WebNavigationTarget.blocked:
          return NavigationDecision.prevent;
      }
    },
    onWebResourceError: (WebResourceError error) {
      if (error.isForMainFrame ?? true) {
        onMainFrameError(error);
      }
    },
    onSSlAuthError: (SslAuthError error) {
      unawaited(error.cancel());
    },
  );
}

```

The package specifically warns that `onWebResourceError` can represent non-main-frame errors, so do not replace the entire page with an error screen because one image failed.

---

