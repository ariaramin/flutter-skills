# Source reference: Loading/error UX, SPA/back, gestures, Android/WebKit features, media, permissions, uploads/downloads

## Table of contents

- [47. Loading and Error UX](#47-loading-and-error-ux)
- [48. Progress Callback Performance](#48-progress-callback-performance)
- [49. Page Lifecycle](#49-page-lifecycle)
- [50. SPA Navigation](#50-spa-navigation)
- [51. Back Navigation](#51-back-navigation)
- [52. Predictive Back](#52-predictive-back)
- [53. Scrolling](#53-scrolling)
- [54. Nested Scrolling](#54-nested-scrolling)
- [55. Gestures](#55-gestures)
- [56. Flutter Overlays](#56-flutter-overlays)
- [57. WebView Animations](#57-webview-animations)
- [58. Android-Specific Features](#58-android-specific-features)
- [59. WebKit-Specific Features](#59-webkit-specific-features)
- [60. Media](#60-media)
- [61. Fullscreen Video](#61-fullscreen-video)
- [62. Background Media](#62-background-media)
- [63. Web Permissions](#63-web-permissions)
- [64. Camera and Microphone](#64-camera-and-microphone)
- [65. Geolocation](#65-geolocation)
- [66. File Uploads](#66-file-uploads)
    - [Apple difference](#apple-difference)
- [67. Downloads](#67-downloads)
- [68. `window.open` and Popups](#68-windowopen-and-popups)
- [69. JavaScript Dialogs](#69-javascript-dialogs)
- [70. Console Messages](#70-console-messages)
- [71. Debugging](#71-debugging)
- [72. App Lifecycle](#72-app-lifecycle)
# 47. Loading and Error UX

Production WebView screens should define:

- first-load state;
- progress state;
- main-frame transport failure;
- HTTP failure handling where product-relevant;
- blocked-navigation state;
- retry;
- offline experience;
- SSL rejection behavior.

Use a Flutter overlay without recreating the WebView.

```
Stack(
  children: <Widget>[
    Positioned.fill(
      child: WebViewWidget(controller: controller),
    ),
    if (isLoading)
      const Positioned(
        left: 0,
        right: 0,
        top: 0,
        child: LinearProgressIndicator(),
      ),
  ],
);

```

Do not swap the entire WebView out for every 1% progress update.

---

# 48. Progress Callback Performance

`onProgress` may update often.

Bad:

```
progress
 -> rebuild entire page
 -> rebuild toolbar
 -> rebuild complex layout
 -> disturb platform-view subtree

```

Better:

```
progress
 -> ValueNotifier / narrow state selector
 -> only loading indicator updates

```

Keep callback work cheap.

Do not perform:

- database writes;
- network requests;
- analytics synchronization;
- expensive JSON;
- full-screen state reconstruction

for every progress event.

---

# 49. Page Lifecycle

Useful callbacks include:

```
onPageStarted
onProgress
onPageFinished
onUrlChange

```

Do not interpret `onPageFinished` as:

> Every script, network request, SPA data query, animation, image, and asynchronous operation has completed.

If the application needs a precise "web app ready" signal, define an explicit first-party bridge event:

```
{
  "version": 1,
  "action": "appReady",
  "requestId": "startup",
  "payload": {}
}

```

That is more reliable than guessing readiness from browser loading percentage.

---

# 50. SPA Navigation

Single-page applications can change browser state without full document navigation.

Use current `onUrlChange` and explicit page integration when route synchronization is required.

Do not assume:

```
SPA route changed
=> onPageFinished fires

```

Avoid monkey-patching `history.pushState` unless the product requires it and ordinary URL-change reporting does not satisfy the web application's behavior.

If both sides are controlled, an explicit web-app navigation bridge is easier to maintain.

---

# 51. Back Navigation

There are two stacks:

```
Flutter Navigator stack
WebView browser history

```

Define which one receives Back first.

Common policy:

```
if WebView has previous browser page:
    WebView.goBack()
else:
    Flutter route pops

```

This is a product rule, not a universal requirement.

---

# 52. Predictive Back

Modern Flutter uses `PopScope` for predictive-back-aware route behavior. `PopScope.canPop` must represent whether route popping is allowed before the gesture completes; `onPopInvokedWithResult` reports the attempted result afterward.

Do not copy old `WillPopScope` WebView tutorials blindly.

Because `WebViewController.canGoBack()` is asynchronous, maintain browser-history capability as state rather than starting a new asynchronous query during the final stage of every predictive-back gesture.

Example pattern:

```
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

final class BrowserPage extends StatefulWidget {
  const BrowserPage({
    super.key,
    required this.initialUri,
  });

  final Uri initialUri;

  @override
  State<BrowserPage> createState() => _BrowserPageState();
}

final class _BrowserPageState extends State<BrowserPage> {
  late final WebViewController _controller;

  bool _webCanGoBack = false;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController();

    _controller
      ..setJavaScriptMode(JavaScriptMode.disabled)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            unawaited(_refreshBackState());
          },
          onUrlChange: (_) {
            unawaited(_refreshBackState());
          },
        ),
      )
      ..loadRequest(widget.initialUri);
  }

  Future<void> _refreshBackState() async {
    final canGoBack = await _controller.canGoBack();

    if (!mounted || canGoBack == _webCanGoBack) {
      return;
    }

    setState(() {
      _webCanGoBack = canGoBack;
    });
  }

  Future<void> _navigateWebBack() async {
    if (!await _controller.canGoBack()) {
      return;
    }

    await _controller.goBack();
    await _refreshBackState();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope<void>(
      canPop: !_webCanGoBack,
      onPopInvokedWithResult: (bool didPop, void result) {
        if (!didPop && _webCanGoBack) {
          unawaited(_navigateWebBack());
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: WebViewWidget(
            controller: _controller,
          ),
        ),
      ),
    );
  }
}

```

Test this behavior independently on Android predictive back and iOS route gestures. `PopScope` itself documents platform differences in gesture handling.

The WebKit platform also exposes `setAllowsBackForwardNavigationGestures` when native web-history swipe navigation is desired.

---

# 53. Scrolling

Current APIs can:

- query scroll position;
- scroll programmatically;
- listen to scroll-position changes.

Do not send every scroll position into global application state.

Prefer browser-local scrolling.

If the Flutter toolbar needs "scrolled past threshold" state, send threshold transitions rather than every pixel where possible.

---

# 54. Nested Scrolling

Avoid a vertically scrolling WebView inside another vertically scrolling Flutter list unless the UX genuinely requires it.

Problematic:

```
ListView
  ├─ Flutter content
  ├─ WebView with its own vertical scroll
  └─ Flutter content

```

This creates gesture ownership and viewport-height complexity.

Prefer:

```
full-screen bounded WebView

```

or convert web content to native Flutter content when it must participate naturally in one parent scroll.

---

# 55. Gestures

`WebViewWidget` supports platform-view gesture recognizers through creation/widget parameters.

Use custom gesture recognition only when necessary.

Complex Flutter-vs-browser gesture arbitration increases the risk of:

- lost taps;
- nested drag conflicts;
- inconsistent platform behavior;
- accessibility issues.

Keep gesture ownership obvious.

---

# 56. Flutter Overlays

Current platform views can participate in Flutter composition, including overlays, within documented platform limitations.

Reasonable overlays:

- loading progress;
- retry button;
- application toolbar;
- trusted-domain indicator.

Avoid:

- large animated translucent layers;
- continuous blur;
- complex clipping stacks;
- many overlapping platform views.

Profile rather than assuming.

---

# 57. WebView Animations

A route animation containing a live WebView can simultaneously involve:

```
Flutter animation
+
platform-view composition
+
WebView page painting
+
page JavaScript animation

```

Potential optimization:

- reduce heavy transform/opacity effects;
- temporarily simplify Flutter overlays;
- avoid several WebViews during a transition;
- profile frame timing.

Flutter's platform-view documentation even suggests that in unusually complex animations a snapshot/placeholder texture can be considered instead of continuously composing a live native view.

Do not add screenshot substitution without measuring the actual problem.

---

# 58. Android-Specific Features

Current `AndroidWebViewController` exposes platform-specific features including:

- WebView debugging;
- media user-gesture requirements;
- file/content access;
- geolocation configuration;
- geolocation prompt callbacks;
- mixed-content mode;
- file selector;
- fullscreen custom-widget callbacks;
- Payment Request;
- text zoom;
- wide viewport.

Access them safely:

```
import 'package:flutter/foundation.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

Future<void> configureAndroidWebView(
  WebViewController controller,
) async {
  final platform = controller.platform;

  if (platform is! AndroidWebViewController) {
    return;
  }

  if (kDebugMode) {
    await AndroidWebViewController.enableDebugging(true);
  }

  await platform.setAllowFileAccess(false);
  await platform.setAllowContentAccess(false);
  await platform.setGeolocationEnabled(false);
  await platform.setMediaPlaybackRequiresUserGesture(true);
}

```

Only enable a feature after documenting why it is required.

---

# 59. WebKit-Specific Features

Current `WebKitWebViewControllerCreationParams` supports:

- inline-media configuration;
- media types requiring a user gesture;
- App-Bound Domain navigation restrictions;
- whether JavaScript may automatically open windows.

Current `WebKitWebViewController` exposes platform-specific controls such as:

- back/forward gestures;
- link preview;
- inspectability;
- browser-history-state callback;
- permission requests;
- console messages;
- JS dialogs.

Example:

```
import 'package:flutter/foundation.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

WebViewController createAppleAwareController() {
  late final PlatformWebViewControllerCreationParams params;

  if (WebViewPlatform.instance is WebKitWebViewPlatform) {
    params = WebKitWebViewControllerCreationParams(
      allowsInlineMediaPlayback: true,
      mediaTypesRequiringUserAction:
          const <PlaybackMediaTypes>{
        PlaybackMediaTypes.audio,
        PlaybackMediaTypes.video,
      },
      javaScriptCanOpenWindowsAutomatically: false,
    );
  } else {
    params = const PlatformWebViewControllerCreationParams();
  }

  final controller =
      WebViewController.fromPlatformCreationParams(params);

  final platform = controller.platform;

  if (platform is WebKitWebViewController) {
    platform.setInspectable(kDebugMode);
    platform.setAllowsBackForwardNavigationGestures(true);
  }

  return controller;
}

```

---

# 60. Media

Media configuration is platform-specific.

Android exposes `setMediaPlaybackRequiresUserGesture`, while Apple creation parameters expose `mediaTypesRequiringUserAction`and `allowsInlineMediaPlayback`.

Default production preference:

- require user interaction for unexpected media;
- enable autoplay only when product requirements justify it;
- account for bandwidth/battery;
- respect accessibility/user expectations.

Do not turn off all autoplay restrictions merely to make one test page play automatically.

---

# 61. Fullscreen Video

Android exposes custom-widget callbacks for content such as fullscreen media.

This requires explicit application UI behavior.

Do not promise identical fullscreen video transitions on Android, iOS, and macOS.

Test:

- enter fullscreen;
- rotate;
- exit;
- system back;
- route pop;
- app background/foreground;
- audio behavior.

If media is a core product capability, a dedicated Flutter/native media player is often more controllable than browser media.

---

# 62. Background Media

Do not treat WebView as a production background-audio engine.

A browser surface can be:

- paused;
- suspended;
- process-terminated;
- lifecycle-throttled

according to platform/browser behavior.

If continuous background playback is a core requirement, use dedicated media APIs with the appropriate OS audio-session/background configuration.

---

# 63. Web Permissions

The generic API supports browser permission requests and current generic resource types include camera and microphone. A request must be answered by grant or deny.

Default deny:

```
final controller = WebViewController(
  onPermissionRequest: (
    WebViewPermissionRequest request,
  ) {
    unawaited(request.deny());
  },
);

```

For actual permission support:

1. validate the current trusted page policy;
2. identify requested web resource types;
3. ensure corresponding OS application permission exists;
4. ask the user contextually;
5. grant only requested capabilities;
6. deny anything unexpected.

A web permission callback does not replace Android/iOS application permissions.

---

# 64. Camera and Microphone

There are two permission layers:

```
OS application permission
        +
browser/page permission

```

Both must be considered.

Do not:

```
webpage asks for camera
        ↓
request.grant()

```

without verifying:

- trusted content;
- product action;
- OS permission;
- user expectation.

A compromised first-party page can otherwise escalate an XSS issue into access to native device capabilities.

---

# 65. Geolocation

Android exposes explicit geolocation enablement and geolocation prompt callbacks.

Keep geolocation disabled when unused.

If enabled:

- allow only known origins;
- request Android location permission appropriately;
- explain the purpose to the user;
- do not automatically grant every prompt.

---

# 66. File Uploads

Android exposes:

```
AndroidWebViewController.setOnShowFileSelector(...)

```

with `FileSelectorParams` describing:

- accepted MIME types;
- capture preference;
- filename hint;
- selection mode.

Do not expose arbitrary filesystem paths.

Use a user-mediated platform picker and return only explicitly selected content.

### Apple difference

There is no equivalent generic Dart file-selector callback in the current WebKit implementation API. A first-party Flutter issue documents that iOS WebKit has native default file-input behavior whereas macOS's default `WKUIDelegate` behavior is effectively no-op for the relevant open-panel callback, leaving macOS file-input support incomplete without additional public plumbing.

Therefore test `<input type="file">` independently on:

- Android;
- iOS;
- macOS.

Never infer one platform's behavior from another.

---

# 67. Downloads

`webview_flutter` is not a cross-platform download manager.

The Android navigation implementation exposes a native `DownloadListener` bridge object, but the generic package does not provide a uniform high-level download workflow.

If product downloads are required, build an explicit download feature:

```
detected download
   ↓
validate URL/origin
   ↓
hand off to application download layer
   ↓
stream to appropriate storage
   ↓
show progress/error
   ↓
open/share only after validation

```

Do not expect clicking `<a download>` to produce a reliable cross-platform application download UX automatically.

Do not use a hidden WebView as a large binary downloader.

---

# 68. `window.open` and Popups

Current WebKit creation parameters expose `javaScriptCanOpenWindowsAutomatically`. Support was added so JavaScript `window.open()` may work without user interaction when explicitly enabled.

That is not equivalent to a full browser tab model.

Define policy for:

- `_blank`;
- external links;
- login popups;
- payment popups;
- unknown new windows.

Do not enable automatic popups globally unless required.

A malicious page should not be able to spawn uncontrolled windows.

---

# 69. JavaScript Dialogs

Current controller APIs support handling:

- `alert`;
- `confirm`;
- `prompt`.

Both endorsed platform implementations have corresponding support.

If custom dialogs are used:

- escape displayed text;
- do not treat page text as trusted;
- prevent abusive modal loops when loading untrusted content.

---

# 70. Console Messages

The controller supports JavaScript console callbacks.

Useful in development:

```
if (kDebugMode) {
  await controller.setOnConsoleMessage(
    (JavaScriptConsoleMessage message) {
      debugPrint(
        '[WebView ${message.level.name}] '
        '${message.message}',
      );
    },
  );
}

```

Do not automatically forward production page logs to analytics.

Console output may contain:

- URLs;
- account data;
- tokens accidentally logged by page code;
- internal API payloads.

Apply privacy/security review first.

---

# 71. Debugging

Android exposes:

```
AndroidWebViewController.enableDebugging(true)

```

and WebKit exposes:

```
WebKitWebViewController.setInspectable(true)

```

for relevant development tooling.

Enable only in controlled development/debug builds unless there is a documented production diagnostic requirement.

Use:

- Chrome/Android WebView inspection;
- Safari Web Inspector/WebKit tools;
- Flutter DevTools;
- Android Studio profiler;
- Perfetto where needed;
- Xcode Instruments.

Separate:

```
Flutter problem
browser/page problem
network problem
platform-view problem

```

before optimizing.

---

# 72. App Lifecycle

Current generic `WebViewController` does not expose a universal Dart `pause()` / `resume()` browser lifecycle protocol in its public method set.

Do not invent:

```
controller.pause();
controller.dispose();

```

if those methods are not part of the resolved API.

Instead handle lifecycle at the product level:

- stop application-driven polling when hidden;
- pause first-party webpage animations via bridge when useful;
- stop/leave media intentionally;
- restore app-specific UI state on resume;
- allow platform browser lifecycle rules to operate.

If native lifecycle control is essential, inspect the platform implementation/version before extending it.

---

