---
name: flutter-video-player-production-engineering
description: >-
  Design, implement, review, debug, test, and optimize production Flutter video playback with the official video_player plugin. Use for VideoPlayerController lifecycle, networkUrl/asset/file/contentUri sources, VideoPlayer widgets, buffering and seeking, playback speed/volume/looping, captions, audio tracks, VideoPlayerOptions, texture versus platform views, autoplay feeds, controller pooling, fullscreen transitions, app/route lifecycle, HTTP headers, HLS/DASH/progressive MP4, codecs, range requests, Web autoplay/CORS, Android Media3 ExoPlayer, Apple AVPlayer, decoder or texture exhaustion, playback errors, and cross-platform media diagnostics. Trigger when videos initialize slowly, stay black, restart on seek, leak resources, play off-screen, fail only on a browser/device, or jank scrolling. Do not use for recording/camera capture, video transcoding/editing, YouTube iframe playback, or platform background media/Picture-in-Picture systems that do not use video_player.
---

# Flutter video_player Production Engineering

Treat `video_player` as a thin Flutter controller/widget layer over platform media engines. Codec support, buffering, decoder limits, streaming behavior, autoplay, and many errors belong to Media3/ExoPlayer, AVPlayer, or the browser—not to Dart alone.

## Reference routing

Read only what the task needs:

| Need | Reference |
|---|---|
| Current APIs, source constructors, widget/controller lifecycle, source replacement | `references/01-api-and-lifecycle.md` |
| Support matrix, Android/iOS/macOS backends, codecs, view types, desktop boundaries | `references/02-platforms-and-formats.md` |
| Network delivery, headers, HLS/DASH, Web autoplay/CORS/range requests | `references/03-network-and-web.md` |
| Decoder/memory/rendering cost, feeds, preloading, pooling, fullscreen transitions | `references/04-performance-and-feeds.md` |
| Audio, captions, background playback, PiP, errors, accessibility | `references/05-playback-features-and-ux.md` |
| Testing, profiling, diagnostics, review checklists, authoritative URLs | `references/06-testing-diagnostics-and-sources.md` |

The bundled research was checked on 2026-08-11 against `video_player 2.13.0`, `video_player_android 2.12.0`, `video_player_avfoundation 2.11.0`, and `video_player_web 2.4.0`. Always inspect the project’s `pubspec.lock`, Flutter/Dart versions, resolved federated implementations, and installed source before relying on a signature or platform behavior.

## Inspect before changing code

Inspect:

- `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints, minimum OS versions, and shipped platforms.
- Every controller constructor, initializer, listener, owner, replacement path, and `dispose()` call.
- App lifecycle, route/tab visibility, scrolling visibility, fullscreen flow, and state-management ownership.
- URL delivery: redirects, authentication, expiry, MIME type, range support, CORS, ATS/cleartext policy, HLS/DASH manifests, and CDN logs.
- Media metadata: container, codecs, profile/level, resolution, frame rate, bitrate, rotation, duration, audio tracks, captions, and DRM.
- Simultaneous initialized/playing controllers, texture/platform-view choice, thumbnails, and preload policy.

Search for at least:

```text
VideoPlayerController VideoPlayer VideoPlayerValue VideoPlayerOptions
networkUrl network asset file contentUri initialize dispose addListener
isInitialized isPlaying isBuffering hasError buffered seekTo
VideoViewType allowBackgroundPlayback mixWithOthers httpHeaders formatHint
WidgetsBindingObserver RouteAware VisibilityDetector
```

Trace all controller owners and source changes before fixing a symptom. Lifecycle bugs often originate above the widget that displays the failure.

## Establish the playback contract

Define:

1. Which platforms and OS/browser versions ship?
2. Which sources, protocols, containers, codecs, resolutions, frame rates, and DRM modes must work?
3. Is playback inline, feed-based, fullscreen, background, PiP, or external-route based?
4. How many controllers may be initialized and playing concurrently?
5. What are autoplay, mute, audio-focus, captions, accessibility, and display-sleep requirements?
6. What startup, seek, rebuffer, recovery, and memory targets matter?
7. Does the application require persistent caching/offline playback or only platform buffering?
8. How do signed URLs and authorization refresh?

Do not promise a format because its extension is familiar. Validate the container, every media track, the target OS/browser, and actual device decoders.

## Use the smallest correct architecture

Default to:

```text
media descriptor + playback policy
→ one explicit controller owner
→ initialize and configure once
→ VideoPlayer + lightweight controls
→ pause when not active
→ dispose when ownership ends
```

- Let a stateful playback component own one controller unless a route/feed coordinator has a real reuse policy.
- Create controllers outside `build()`.
- Await `initialize()` and render the player only after `value.isInitialized`.
- Use `VideoPlayerController.networkUrl(Uri)` for network sources; the String-based `network` constructor is deprecated.
- Use `file` only on supported native targets; it throws on Web.
- Replace a controller when the source identity changes; guard async completion so an old initialization cannot update the new source.
- Pause before route/tab/background transitions unless background playback is an explicit product feature.
- Dispose every controller exactly once from its owner.

## Keep rendering scoped

- Size with `AspectRatio` after initialization, using `controller.value.aspectRatio` only when valid.
- Show a deliberate poster/loading/error state before the first frame.
- Use a `ValueListenableBuilder<VideoPlayerValue>` or narrowly scoped listener for controls; do not rebuild the whole page on position ticks.
- Default to `VideoViewType.textureView`. Use platform views only for a measured/required capability and revalidate platform issues; Android currently warns against its platform-view mode.
- Keep overlays and controls outside expensive full-player rebuilds.

## Make network playback an end-to-end system

- Require HTTPS by default. Add narrow Android cleartext or Apple ATS exceptions only when the product truly needs HTTP.
- Send supported authentication headers through `httpHeaders`, but design token expiry and redirects explicitly.
- Require correct MIME types and byte-range support for progressive seeking.
- Use adaptive streaming for variable networks when the target engines/browsers support the chosen HLS/DASH rendition set.
- Treat platform buffers as transient implementation details. `video_player` has no application-level persistent cache/offline-download contract.
- On Web, handle browser autoplay rejection as expected behavior: autoplay muted or wait for user activation.
- Test CORS, range requests, redirects, cookies/headers, and signed-URL expiry from the deployed origin—not only `flutter run`.

## Bound resources in feeds

- Never initialize a controller for every row in a long list.
- Allow one audible active player unless product requirements justify more.
- Initialize the visible item and, only when measurements justify it, a small adjacent window.
- Pause controllers immediately when they lose active visibility; dispose controllers leaving the bounded window.
- Use thumbnails/posters for inactive cells.
- Treat `initialize()` as practical preparation, not a guarantee that all bytes/segments or the first frame are fully preloaded.
- Pool only after profiling shows repeated initialization is the bottleneck; bound the pool, key it by complete source identity, and make eviction dispose resources.

## Diagnose from evidence

Classify before changing code:

```text
initialize failure → URL/auth/manifest/MIME/codec/platform policy
black frame → not initialized, unsupported decode, rendering/view lifecycle, zero size
seek restarts → missing range support, non-seekable live media, browser/CDN behavior
buffering → network throughput, bitrate ladder, CDN/range delivery, decoder starvation
scroll jank → controller churn, too many decoders/textures, broad rebuilds
OOM/decoder error → too many initialized players, high resolution, leaked controllers
audio conflict → focus/session/mix policy, multiple active players
works on one device only → hardware decoder, OS/browser codec/profile difference
```

Profile on physical low-end devices and supported browsers with production media/CDN behavior. Emulator success is not codec coverage; emulator failure is not definitive device failure.

## Preserve platform boundaries

- Official package support is Android, iOS, macOS, and Web. Do not claim Windows or Linux support from the endorsed package.
- Android delegates to Media3/ExoPlayer and device decoders.
- iOS/macOS delegate to AVPlayer/AVFoundation.
- Web delegates to browser media elements and browser codec/autoplay/network policy.
- `video_player` does not provide complete custom controls, DRM provisioning, offline downloads, PiP orchestration, or a background media service. Use platform-specific/product-specific architecture when those are requirements.

## Validate before finishing

- Format/analyze changed Dart code and run focused widget/unit tests.
- Run integration tests on every shipped platform class and representative physical devices.
- Verify initialize, play/pause, seek, completion, looping, speed, volume, captions, audio selection, errors, retry, source replacement, and disposal.
- Exercise background/foreground, route pop/push, tab changes, rapid scrolling, fullscreen enter/exit, network loss, token expiry, and app memory pressure.
- Test representative containers/codecs/renditions and unsupported-media behavior.
- Measure startup-to-first-frame, rebuffer ratio, seek latency, dropped/janky frames, memory, decoder count, and repeated open/close stability.
- Review the final diff for controllers created in `build`, stale async callbacks, leaked listeners/controllers, unbounded feed initialization, unsupported platform claims, sensitive header logging, and invented caching/PiP/background behavior.
