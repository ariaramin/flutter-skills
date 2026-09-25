# API and Lifecycle

## Contents

- Current controller sources and values
- Basic lifecycle pattern
- Safe source replacement
- Listener and ownership rules
- App, route, and widget lifecycle

## Current public surface

Use the resolved `video_player` API. At the 2.13.0 baseline, `VideoPlayerController` provides:

```text
asset
networkUrl
file
contentUri
deprecated network(String)
initialize, play, pause, seekTo, setLooping
setVolume, setPlaybackSpeed, setClosedCaptionFile
getAudioTracks, selectAudioTrack
setPreventsDisplaySleepDuringVideoPlayback
dispose
```

`VideoPlayerController` is a `ValueNotifier<VideoPlayerValue>`. Important state includes initialization, duration, position, size/aspect ratio, playing, looping, buffering ranges/state, completion, captions, volume, speed, errors, and display-sleep policy. Verify exact fields against the installed version.

## Choose the source constructor

| Source | Constructor | Boundary |
|---|---|---|
| Flutter asset | `VideoPlayerController.asset` | Declare asset; package assets need `package` |
| HTTP(S), HLS, DASH when backend supports it | `VideoPlayerController.networkUrl` | Prefer typed `Uri`; headers and Android format hint optional |
| Native file | `VideoPlayerController.file` | Not supported on Web |
| Android content URI / platform URI | `VideoPlayerController.contentUri` | Platform support differs; verify target |

Do not convert files to network URLs or bytes without a real requirement. Do not use the deprecated String-based `network` constructor in new code.

`formatHint` is Android-only and overrides generic format detection. Use it when a URL/path lacks useful format information and the actual format is known; it does not transcode unsupported media.

## Own and initialize one controller

```dart
class InlineVideo extends StatefulWidget {
  const InlineVideo({required this.uri, super.key});

  final Uri uri;

  @override
  State<InlineVideo> createState() => _InlineVideoState();
}

class _InlineVideoState extends State<InlineVideo> {
  VideoPlayerController? _controller;
  Object? _initializationError;

  @override
  void initState() {
    super.initState();
    _replaceController(widget.uri);
  }

  @override
  void didUpdateWidget(covariant InlineVideo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.uri != widget.uri) {
      _replaceController(widget.uri);
    }
  }

  Future<void> _replaceController(Uri uri) async {
    final previous = _controller;
    final next = VideoPlayerController.networkUrl(uri);
    _controller = next;
    _initializationError = null;
    await previous?.pause();
    await previous?.dispose();

    try {
      await next.initialize();
    } catch (error) {
      if (mounted && identical(_controller, next)) {
        setState(() => _initializationError = error);
      }
      return;
    }

    if (mounted && identical(_controller, next)) setState(() {});
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (_initializationError != null) return const VideoErrorPlaceholder();
    if (controller == null || !controller.value.isInitialized) {
      return const VideoPoster();
    }
    return AspectRatio(
      aspectRatio: controller.value.aspectRatio,
      child: VideoPlayer(controller),
    );
  }
}
```

Do not let an old controller’s `initialize()` completion call `setState` or autoplay after a new source replaced it. Compare controller identity or use a generation token.

## Listener discipline

Controllers emit frequent value updates, including position updates. Use listeners for semantic state transitions or narrowly scoped controls.

Avoid:

```dart
controller.addListener(() => setState(() {}));
```

on a large page. Prefer:

```dart
ValueListenableBuilder<VideoPlayerValue>(
  valueListenable: controller,
  builder: (context, value, child) => PlaybackControls(value: value),
)
```

Keep `VideoPlayer` itself as the stable child when possible. If registering a manual listener, store its exact callback and remove it before ownership ends; disposal also tears down controller resources but explicit listener ownership avoids accidental cross-owner callbacks.

## Lifecycle policy

`video_player` owns the player resource; application code owns policy.

- `initState`: create and initialize.
- `didUpdateWidget`: replace only when complete source identity/options change.
- `dispose`: pause/dispose without awaiting from the synchronous override.
- App inactive/paused: pause unless `allowBackgroundPlayback` is intentional and fully configured.
- Route covered/tab hidden: pause unless continuing audio is expected.
- Visible again: resume only if playback was active before interruption and product policy permits.

Use `WidgetsBindingObserver`, `AppLifecycleListener`, `RouteAware`, or the app’s navigation/state layer at the actual ownership boundary. Do not sprinkle competing pause/resume handlers through child widgets.

## Controller identity

Source identity includes more than the URL:

```text
URI/file/asset
headers/auth scope
format hint
caption source
player options
view type
```

Do not reuse a pooled controller when any behaviorally relevant identity component differs. Signed URLs may change while referring to the same media; define whether pool identity follows asset ID or actual authorization URL, and ensure expired credentials cannot survive reuse.
