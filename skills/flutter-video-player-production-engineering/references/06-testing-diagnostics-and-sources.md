# Testing, Diagnostics, and Sources

## Contents

- Unit/widget/integration strategy
- Performance and compatibility matrix
- Symptom-driven diagnostics
- Anti-patterns and reviews
- Version baseline and authoritative sources

## Test at the right layer

Unit/widget tests can verify application policy with a fake platform interface or controller abstraction:

- create/initialize/play/pause ordering;
- loading/error/ready UI;
- stale initialization suppression;
- source replacement and disposal;
- visibility and route policy;
- retry bounds;
- semantic controls and captions.

Mocking a controller cannot prove decoding, texture rendering, audio focus, network behavior, or codecs. Use integration tests on real backends for those.

Avoid asserting frequent intermediate position values exactly; timing is platform-dependent. Assert semantic transitions and bounded tolerances.

## Integration matrix

Test representative media:

```text
small progressive H.264/AAC MP4
large progressive MP4 with range seeking
HLS VOD and live where shipped
DASH on Android/Web stack where shipped
portrait/rotation metadata
high resolution/frame rate near product limits
multiple audio tracks
SRT and WebVTT captions
unsupported codec/container
zero/indefinite duration
expired/invalid URL and auth
network interruption and recovery
```

Platforms:

- low/mid/high Android physical devices from relevant vendors;
- supported iPhone/iPad and macOS versions;
- Safari/Chromium/Firefox and mobile browsers in the product matrix;
- emulator/simulator only as supplementary coverage.

## Lifecycle tests

- push/pop repeatedly;
- cover/uncover route;
- switch tabs;
- background/foreground;
- lock/unlock and interruptions;
- rapid source changes;
- fast feed scrolling;
- rotate/rescale/fullscreen transitions;
- dispose during initialization/seek/play;
- hot reload for developer ergonomics without treating it as production lifecycle.

Verify player/controller/decoder counts return to the expected baseline after cycles.

## Performance checks

Measure:

- initialization and first-frame latency;
- play and seek latency;
- buffer events/rebuffer ratio;
- network bytes and segment/range latency;
- UI/raster frame timing;
- memory and GPU usage;
- active decoder/texture/player counts;
- repeated open/close growth;
- feed scroll p95/p99 with active playback.

Test release/profile builds. Flutter Web’s debug server lacks range support for assets and is not valid for seek-performance conclusions.

## Diagnostic guide

| Symptom | Inspect | Likely direction |
|---|---|---|
| `initialize()` fails | platform error, response, manifest, codec | fix delivery/media/platform policy |
| Infinite spinner | Future handling, `hasError`, zero-duration media | surface error and terminal state |
| Black video with audio | decoder/profile, view lifecycle, size, surface | test known-good media/view type/device |
| No audio | volume, track, focus/session, codec | inspect platform audio and active players |
| Seek restarts on Web | Range/206 responses, local debug server | fix CDN/server; test deployed origin |
| Frequent buffering | bitrate ladder, throughput, CDN latency | tune delivery/renditions, not rebuilds |
| Scroll jank | controllers, textures, listeners, effects | bound window and rebuild scope |
| Decoder initialization error | simultaneous/high-spec players | dispose inactive, reduce concurrency/spec |
| Playback continues off-screen | route/visibility ownership | centralize active-player policy |
| Works Android, fails iOS/Web | DASH/codec/ATS/CORS/autoplay | respect backend capability matrix |
| Auth fails midstream | segment/key token expiry | redesign auth/signing and bounded refresh |

## Common anti-patterns

### Controller created in `build()`

Rebuilds allocate new native players and leak/race old initialization. Create in an owner lifecycle.

### Initialize every feed cell

Consumes decoders/textures/network and collapses on device-specific limits. Use thumbnails and a bounded active window.

### Global `setState` listener

Position updates rebuild unrelated UI. Scope listening to controls/progress.

### Pause instead of dispose forever

Paused players can retain expensive resources. Dispose when outside the retention window.

### Assume MP4 means supported

Container extensions hide codec/profile/audio differences. Inspect media tracks and test the target matrix.

### Add retries around CORS or unsupported codec

These are configuration/capability failures, not transient errors. Fail clearly.

### Claim caching/preload from `initialize()`

Initialization is preparation, not a persistent cache or fixed buffered duration. Measure and add a real offline layer only when required.

### Two controllers during fullscreen

Doubles resources and risks competing audio/position. Share ownership or perform explicit handoff.

### Background playback flag equals media service

The option does not implement notification, remote controls, entitlements, or interruption policy.

### Log signed URLs/headers

Leaks credentials and user media access. Log sanitized media IDs and error classes.

## Production checklist

- [ ] Resolved package/backend versions and OS minimums checked.
- [ ] Only officially supported platforms claimed.
- [ ] One explicit controller owner per player.
- [ ] Source replacement is race-safe.
- [ ] Every controller is disposed.
- [ ] Route/tab/app/visibility playback policy tested.
- [ ] Feed controller window bounded.
- [ ] Network permission/ATS/macOS entitlement correct.
- [ ] CDN MIME, ranges, redirects, CORS, and auth tested.
- [ ] Browser autoplay has muted/user-gesture fallback.
- [ ] Media codec/profile matrix validated on real devices.
- [ ] Loading, buffering, completion, and errors are distinct.
- [ ] Captions and controls accessible.
- [ ] Fullscreen restores orientation/system UI.
- [ ] Background/PiP architecture not overstated.
- [ ] Startup, seek, rebuffer, memory, decoder count, and jank profiled.
- [ ] Logs exclude URLs/tokens/private media details.

## Code review checklist

- [ ] `networkUrl(Uri)` rather than deprecated `network(String)`?
- [ ] No controller creation/initialization in `build()`?
- [ ] `initialize()` errors handled?
- [ ] `mounted` and controller identity checked after awaits?
- [ ] Old controller paused/disposed on source change?
- [ ] No whole-page rebuild on position ticks?
- [ ] Aspect ratio read only after initialization?
- [ ] Web avoids `file` and handles autoplay/ranges/CORS?
- [ ] Android platform-view warning respected?
- [ ] Multiple players coordinated and bounded?
- [ ] Retry/auth refresh bounded and cancelable?
- [ ] No invented persistent caching, DRM, PiP, or desktop support?

## Validation baseline

Research date: `2026-08-11`.

```text
video_player 2.13.0
video_player_android 2.12.0
video_player_avfoundation 2.11.0
video_player_web 2.4.0
Flutter >= 3.44.0
Dart ^3.12.0
Android SDK 24+
iOS 13.0+
macOS 10.15+
```

The current 2.13.0 pubspec requires Dart `^3.12.0` and Flutter `>=3.44.0`. The 2.12.0 changelog’s Flutter 3.38/Dart 3.10 entry is historical; use the resolved package pubspec and SDK solver output for the project.

## Official Flutter package sources

- Package: https://pub.dev/packages/video_player
- Current package pubspec: https://raw.githubusercontent.com/flutter/packages/main/packages/video_player/video_player/pubspec.yaml
- Changelog: https://pub.dev/packages/video_player/changelog
- API: https://pub.dev/documentation/video_player/latest/video_player/
- Controller API: https://pub.dev/documentation/video_player/latest/video_player/VideoPlayerController-class.html
- Android backend: https://pub.dev/packages/video_player_android
- Android changelog: https://pub.dev/packages/video_player_android/changelog
- Apple backend: https://pub.dev/packages/video_player_avfoundation
- Apple changelog: https://pub.dev/packages/video_player_avfoundation/changelog
- Web backend: https://pub.dev/documentation/video_player_web/latest/
- Platform interface: https://pub.dev/packages/video_player_platform_interface
- Official repository: https://github.com/flutter/packages/tree/main/packages/video_player
- Example: https://github.com/flutter/packages/tree/main/packages/video_player/video_player/example

## Official platform sources

- Media3 ExoPlayer formats: https://developer.android.com/media/media3/exoplayer/supported-formats
- Media3 supported devices: https://developer.android.com/media/media3/exoplayer/supported-devices
- Android network security: https://developer.android.com/privacy-and-security/security-config
- AVPlayer: https://developer.apple.com/documentation/avfoundation/avplayer
- Apple HLS: https://developer.apple.com/documentation/http-live-streaming
- Apple HLS authoring: https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices
- App Transport Security: https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity
- HTML video: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video
- Web autoplay: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- Web codecs: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs
- HTTP range requests: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests
- CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

## Source interpretation

Prefer, in order:

1. Project’s resolved implementation and installed source.
2. Matching current generated API docs/changelog.
3. Official package README/repository.
4. Official platform engine/browser docs.

Distinguish Flutter API guarantees from platform behavior and architectural recommendations. Revalidate on upgrades:

- supported OS versions and Flutter/Dart constraints;
- Media3/AVFoundation backend versions;
- view-type support/issues;
- audio-track APIs;
- display-sleep and back-buffer options;
- Web options/autoplay behavior;
- position/buffering event semantics;
- platform codec and browser support.
