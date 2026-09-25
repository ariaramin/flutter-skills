# Source reference: Memory/startup/page performance, offline, security/privacy, accessibility, state architecture, secure screen pattern

## Table of contents

- [73. Memory Engineering](#73-memory-engineering)
- [74. Native Memory Profiling](#74-native-memory-profiling)
- [75. Startup Performance](#75-startup-performance)
- [76. WebView Warmup](#76-webview-warmup)
- [77. Page Load Performance](#77-page-load-performance)
- [78. Web Content Optimization](#78-web-content-optimization)
- [79. Battery Efficiency](#79-battery-efficiency)
- [80. Network Efficiency](#80-network-efficiency)
- [81. Offline Behavior](#81-offline-behavior)
- [82. Service Workers](#82-service-workers)
- [83. Security Model](#83-security-model)
    - [Controlled first-party](#controlled-first-party)
    - [Trusted third-party](#trusted-third-party)
    - [Arbitrary web browsing](#arbitrary-web-browsing)
- [84. XSS and Bridge Capability](#84-xss-and-bridge-capability)
- [85. Secrets](#85-secrets)
- [86. Sensitive Data in URLs](#86-sensitive-data-in-urls)
- [87. External Schemes](#87-external-schemes)
- [88. Content Security Policy](#88-content-security-policy)
- [89. Privacy](#89-privacy)
- [90. Ephemeral / Incognito Sessions](#90-ephemeral-incognito-sessions)
- [91. Data Clearing](#91-data-clearing)
- [92. Accessibility](#92-accessibility)
- [93. Keyboard and Forms](#93-keyboard-and-forms)
- [94. Orientation and Resize](#94-orientation-and-resize)
- [95. State Management](#95-state-management)
- [96. Avoid Over-Architecture](#96-avoid-over-architecture)
- [97. Complete Secure WebView Screen Pattern](#97-complete-secure-webview-screen-pattern)
# 73. Memory Engineering

Measure:

```
Dart heap
+
Flutter GPU/raster memory
+
native platform-view memory
+
browser/WebView memory
+
JavaScript heap
+
decoded web assets

```

Common memory problems:

- controllers retained in global singletons;
- tab WebViews never released;
- large hidden WebViews;
- page leaks in JavaScript;
- enormous DOM;
- decoded high-resolution images;
- video;
- multiple SPA runtimes;
- bridge closures retaining large Flutter objects.

Do not infer a WebView leak solely from temporary browser process caching.

Measure memory across repeated:

```
open
navigate
close route
GC/memory pressure
repeat

```

and compare steady-state trends.

---

# 74. Native Memory Profiling

Use native/platform tools when:

- RSS rises while Dart heap is stable;
- WebView-heavy routes increase memory permanently;
- low-memory devices terminate the app;
- video/image pages cause spikes.

Flutter DevTools is useful for Dart/Flutter state, but the browser engine itself requires platform diagnostics as well. Flutter's DevTools documentation provides CPU, memory, timeline, and rendering analysis, but it does not transform native WebView allocations into Dart heap objects.

---

# 75. Startup Performance

Do not initialize browser infrastructure at application startup unless the product actually needs it immediately.

Avoid before first frame:

- creating hidden WebView controllers;
- navigating hidden pages;
- clearing cookies/cache;
- querying browser state;
- preloading several tabs.

Default:

```
app starts
   ↓
normal Flutter first frame
   ↓
user opens web feature
   ↓
create WebView

```

Measure before prewarming.

---

# 76. WebView Warmup

Prewarming can trade:

```
lower future first-WebView latency

```

for:

```
higher startup CPU
higher startup memory
browser initialization for users who never open feature
possible network/battery work

```

Do not preload because "WebViews are slow."

Measure:

- first-screen startup;
- first-WebView latency;
- memory;
- user probability of opening the feature.

Prefer lazy creation by default.

---

# 77. Page Load Performance

Break page-load time into:

```
WebView initialization
DNS
TCP/QUIC
TLS
server TTFB
HTML download
HTML parse
CSS
JavaScript
images
fonts
third-party scripts
DOM/layout
client-side API requests
rendering

```

Do not blame Dart because `onPageFinished` took four seconds.

If the application owns the page, use browser performance tooling.

---

# 78. Web Content Optimization

For first-party web content optimize the web application itself:

- reduce JS bundle size;
- split code;
- defer non-critical scripts;
- size images correctly;
- use modern image formats where appropriate;
- lazy-load below-fold media;
- use HTTP caching;
- minimize blocking fonts;
- reduce layout shifts;
- remove unnecessary trackers;
- avoid continuous timers;
- avoid expensive browser animation;
- reduce DOM complexity.

A perfectly stable `WebViewController` cannot compensate for a badly engineered website.

---

# 79. Battery Efficiency

Web pages can consume battery via:

- timers;
- animation loops;
- video;
- audio;
- WebSockets;
- polling;
- ad/analytics scripts;
- continuously changing DOM.

For first-party pages consider explicit visibility events so expensive web work stops when the WebView is not user-visible.

Do not leave a hidden real-time dashboard running indefinitely simply because its Flutter route is offstage.

---

# 80. Network Efficiency

Do not download the same data separately in Flutter and WebView unless both consumers actually require their own copy.

Example anti-pattern:

```
Dart API downloads 10 MB JSON
Web page independently downloads same 10 MB JSON

```

Better architecture might use:

- one native UI;
- one web UI;
- a small bridge with IDs;
- server-side session/state.

Do not shuttle massive application datasets into JavaScript merely to avoid one network request unless profiling and security justify it.

---

# 81. Offline Behavior

Browser cache is not a deterministic application offline contract.

Define one of:

- web application's deliberate offline support;
- service-worker-based web strategy verified on target WebViews;
- local packaged HTML;
- Flutter-native offline screen;
- explicit no-offline behavior.

Do not tell product teams:

> It worked offline once, so WebView caching handles offline mode.

---

# 82. Service Workers

Current generic `WebViewController` does not expose a cross-platform service-worker management API in its public controller surface.

Treat service-worker capabilities as browser/platform behavior.

If offline correctness depends on service workers:

- test each supported OS;
- test actual Android WebView versions;
- test upgrade behavior;
- test cache invalidation;
- test first install/offline launch.

Do not assume desktop Safari/Chrome service-worker behavior maps exactly to embedded WebViews.

---

# 83. Security Model

Classify content:

### Controlled first-party

App organization controls server and web source.

Still assume XSS is possible.

### Trusted third-party

Known provider, but app cannot fix its scripts/security immediately.

Expose little or no native bridge capability.

### Arbitrary web browsing

Treat as hostile.

Do not expose privileged JavaScript channels.

The security policy should become stricter as page ownership decreases.

---

# 84. XSS and Bridge Capability

A bridge turns web compromise into potential application compromise.

Without a bridge:

```
XSS
 -> web-session damage

```

With a privileged bridge:

```
XSS
 -> web-session damage
 -> native app capability

```

Therefore every channel action must answer:

- What happens if an attacker invokes this?
- What parameters can they choose?
- Can it access private native data?
- Can it navigate native screens?
- Can it trigger payments?
- Can it open arbitrary files?
- Can it invoke OS intents?
- Can it bypass authentication?

If the consequence is severe, do not expose that operation directly.

---

# 85. Secrets

Never inject into page-global JS:

- private keys;
- API secrets;
- refresh tokens;
- long-lived bearer tokens;
- database credentials.

Never send those over a generic JavaScript channel.

A page script, injected script, browser extension-like environment, remote debugger, or XSS could expose them.

Use web-native secure session mechanisms.

---

# 86. Sensitive Data in URLs

Avoid:

```
https://example.com/?token=LONG_LIVED_TOKEN

```

URLs may appear in:

- logs;
- navigation history;
- analytics;
- crash reports;
- screenshots;
- redirects/referrers.

If a bootstrap token is unavoidable, make it:

- short-lived;
- single-use;
- scoped;
- exchanged immediately for a proper session.

---

# 87. External Schemes

Treat:

```
mailto:
tel:
myapp:
intent:

```

as application actions, not normal browser navigation.

Before handing a URI to the OS:

- check scheme;
- validate expected structure;
- restrict deep-link hosts/actions;
- reject unknown intent payloads.

Never turn:

```
page supplies arbitrary URI
        ↓
launch externally

```

into an unrestricted native command bridge.

---

# 88. Content Security Policy

If the application owns the web content, deploy CSP as defense-in-depth.

CSP can reduce classes of XSS/script injection.

It does not replace:

- bridge message validation;
- navigation allowlisting;
- secure session design;
- TLS;
- native permission mediation.

Treat both browser security and app-bridge security as independent layers.

---

# 89. Privacy

A WebView may introduce privacy behavior separate from native Flutter analytics:

- cookies;
- third-party resources;
- tracking pixels;
- JavaScript analytics;
- persistent storage;
- media permissions;
- location;
- custom user agent.

Review web content under the application's privacy obligations.

Do not assume "it's just a webpage" removes application responsibility.

---

# 90. Ephemeral / Incognito Sessions

The current generic `webview_flutter` controller and WebKit creation parameters do not expose a normal cross-platform private/incognito browser session option. WebKit creation parameters currently cover media, App-Bound Domains, and popup behavior, not selection of an ephemeral `WKWebsiteDataStore`.

Therefore do not promise:

```
private mode
incognito mode
zero persisted browser data

```

using ordinary `WebViewWidget`.

For web authentication where an ephemeral browser session is important, platform authentication sessions such as Apple's `ASWebAuthenticationSession` explicitly support an ephemeral-session preference.

---

# 91. Data Clearing

Privacy-sensitive logout/destruction should specify which data classes matter:

| DataGeneric operation |                                                           |
| --------------------- | --------------------------------------------------------- |
| cookies               | `WebViewCookieManager.clearCookies()`                     |
| cache                 | `WebViewController.clearCache()`                          |
| local storage         | `WebViewController.clearLocalStorage()`                   |
| all website data      | no single generic "erase absolutely everything" guarantee |

Do not document a stronger wipe guarantee than the API provides.

---

# 92. Accessibility

A WebView exposes web content accessibility through the native browser/platform-view stack.

Flutter cannot make inaccessible HTML accessible automatically.

Test:

- TalkBack;
- VoiceOver;
- keyboard/focus where relevant;
- zoom;
- dynamic text behavior;
- web form labels;
- headings;
- contrast;
- focus order.

Do not disable zoom/text scaling merely because responsive web content is broken.

Fix the webpage.

---

# 93. Keyboard and Forms

Test:

- text fields near viewport bottom;
- keyboard opening;
- rotation while keyboard is visible;
- Flutter overlays;
- focus transfer;
- back gesture;
- password manager/autofill.

The Android implementation has historically included WebView/autofill integration fixes, another reason not to rely exclusively on simulator/widget tests.

---

# 94. Orientation and Resize

Test WebViews through:

- portrait/landscape;
- split screen;
- foldable resizing;
- iPad resizing;
- macOS window resizing.

Do not hard-code web viewport assumptions based on one phone.

The webpage itself should be responsive.

---

# 95. State Management

Store product state, not platform objects, in domain state.

Good state:

```
enum BrowserLoadState {
  loading,
  ready,
  failed,
}

final class BrowserUiState {
  const BrowserUiState({
    required this.loadState,
    required this.url,
    required this.canGoBack,
  });

  final BrowserLoadState loadState;
  final Uri? url;
  final bool canGoBack;
}

```

Usually keep `WebViewController` near the presentation/integration layer.

Avoid placing it inside:

- immutable business entities;
- serializable Bloc state;
- domain repositories;
- persistence models.

---

# 96. Avoid Over-Architecture

Do not create:

```
WebViewRepository
 -> BrowserUseCase
 -> BrowserInteractor
 -> WebViewService
 -> ControllerFacade
 -> BrowserControllerAdapter

```

for one embedded page.

Useful separations are usually:

```
WebView screen
  |
  +-- NavigationPolicy
  +-- BridgeProtocol
  +-- SessionCoordinator (if auth is complex)

```

These pieces are testable without hiding the official controller behind meaningless layers.

---

# 97. Complete Secure WebView Screen Pattern

```
import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

final class SecureWebViewPage extends StatefulWidget {
  const SecureWebViewPage({
    super.key,
    required this.initialUri,
    required this.rootDomain,
    required this.onExternalUri,
  });

  final Uri initialUri;
  final String rootDomain;
  final Future<void> Function(Uri uri) onExternalUri;

  @override
  State<SecureWebViewPage> createState() =>
      _SecureWebViewPageState();
}

final class _SecureWebViewPageState
    extends State<SecureWebViewPage> {
  late final WebViewController _controller;
  late final TrustedOriginPolicy _originPolicy;
  late final WebNavigationPolicy _navigationPolicy;

  bool _loading = true;
  bool _failed = false;
  bool _webCanGoBack = false;
  int _progress = 0;

  @override
  void initState() {
    super.initState();

    _originPolicy = TrustedOriginPolicy(
      rootDomain: widget.rootDomain,
      allowSubdomains: true,
    );

    _navigationPolicy = WebNavigationPolicy(
      trustedOrigin: _originPolicy,
    );

    if (!_originPolicy.allows(widget.initialUri)) {
      throw ArgumentError.value(
        widget.initialUri,
        'initialUri',
        'Initial WebView URL is not trusted',
      );
    }

    _controller = WebViewController(
      onPermissionRequest: (
        WebViewPermissionRequest request,
      ) {
        unawaited(request.deny());
      },
    );

    _controller
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            if (!mounted) {
              return;
            }

            setState(() {
              _progress = progress;
            });
          },
          onPageStarted: (_) {
            if (!mounted) {
              return;
            }

            setState(() {
              _loading = true;
              _failed = false;
            });
          },
          onPageFinished: (_) {
            if (!mounted) {
              return;
            }

            setState(() {
              _loading = false;
            });

            unawaited(_refreshHistoryState());
          },
          onUrlChange: (_) {
            unawaited(_refreshHistoryState());
          },
          onNavigationRequest: _onNavigationRequest,
          onWebResourceError: (
            WebResourceError error,
          ) {
            if (!(error.isForMainFrame ?? true)) {
              return;
            }

            if (!mounted) {
              return;
            }

            setState(() {
              _loading = false;
              _failed = true;
            });
          },
          onSSlAuthError: (SslAuthError error) {
            unawaited(error.cancel());
          },
        ),
      )
      ..addJavaScriptChannel(
        'AppBridge',
        onMessageReceived: _onBridgeMessage,
      )
      ..loadRequest(widget.initialUri);
  }

  NavigationDecision _onNavigationRequest(
    NavigationRequest request,
  ) {
    final uri = Uri.tryParse(request.url);

    if (uri == null) {
      return NavigationDecision.prevent;
    }

    final target = _navigationPolicy.classify(uri);

    switch (target) {
      case WebNavigationTarget.embedded:
        return NavigationDecision.navigate;

      case WebNavigationTarget.externalBrowser:
      case WebNavigationTarget.deepLink:
      case WebNavigationTarget.mail:
      case WebNavigationTarget.phone:
      case WebNavigationTarget.download:
        unawaited(widget.onExternalUri(uri));
        return NavigationDecision.prevent;

      case WebNavigationTarget.blocked:
        return NavigationDecision.prevent;
    }
  }

  void _onBridgeMessage(JavaScriptMessage message) {
    unawaited(_handleBridgeMessage(message.message));
  }

  Future<void> _handleBridgeMessage(String raw) async {
    final currentUrl = await _controller.currentUrl();
    final currentUri = currentUrl == null
        ? null
        : Uri.tryParse(currentUrl);

    if (currentUri == null ||
        !_originPolicy.allows(currentUri)) {
      return;
    }

    final message = BridgeMessage.parse(raw);

    switch (message.action) {
      case 'pageReady':
        return;

      default:
        throw FormatException(
          'Unsupported bridge action: '
          '${message.action}',
        );
    }
  }

  Future<void> _refreshHistoryState() async {
    final canGoBack = await _controller.canGoBack();

    if (!mounted || canGoBack == _webCanGoBack) {
      return;
    }

    setState(() {
      _webCanGoBack = canGoBack;
    });
  }

  Future<void> _goBackInWebView() async {
    if (!await _controller.canGoBack()) {
      return;
    }

    await _controller.goBack();
    await _refreshHistoryState();
  }

  Future<void> _retry() async {
    setState(() {
      _loading = true;
      _failed = false;
    });

    await _controller.reload();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope<void>(
      canPop: !_webCanGoBack,
      onPopInvokedWithResult: (
        bool didPop,
        void result,
      ) {
        if (!didPop && _webCanGoBack) {
          unawaited(_goBackInWebView());
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Web content'),
        ),
        body: Stack(
          children: <Widget>[
            Positioned.fill(
              child: WebViewWidget(
                controller: _controller,
              ),
            ),
            if (_loading)
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                child: LinearProgressIndicator(
                  value: _progress <= 0
                      ? null
                      : _progress / 100,
                ),
              ),
            if (_failed)
              Positioned.fill(
                child: ColoredBox(
                  color: Theme.of(context)
                      .colorScheme
                      .surface,
                  child: Center(
                    child: FilledButton(
                      onPressed: _retry,
                      child: const Text('Retry'),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

```

Use unrestricted JavaScript only if the actual page requires it.

If the page does not need the bridge, remove the channel entirely.

---

