# Playback Features and UX

## Contents

- Buffering, completion, seeking, speed, and audio
- Captions and accessibility
- Background playback and display sleep
- Picture-in-Picture and fullscreen boundaries
- Error states and recovery UX

## Interpret controller state carefully

Render distinct states:

```text
poster/not started
initializing
ready paused
playing
buffering while ready
completed
recoverable error
terminal/unsupported error
```

`isBuffering` is not the same as uninitialized. Keep the last frame visible during ordinary rebuffering and show a scoped progress affordance.

Use `value.hasError` and `value.errorDescription` for platform-reported failures, while also catching `initialize()`, `play()`, `seekTo()`, and configuration Future errors.

## Completion and looping

Use `value.isCompleted` or resolved completion behavior rather than comparing position/duration with exact equality. Live and indefinite media can lack a meaningful final duration.

When looping is enabled, do not fire “completed” business events on every loop unless explicitly required.

## Seeking

Await `seekTo`. Clamp UI requests to valid seekable bounds when duration is known. Throttle/debounce scrubbing so a drag does not issue a seek for every pixel; preview locally and commit at controlled intervals or drag end.

Seek accuracy and latency depend on keyframes, container/indexing, range support, live window, and backend. Do not promise frame-accurate UX across all media from the high-level API alone.

For Web videos that restart on seek, verify byte ranges and deployed server behavior before changing Flutter controls.

## Playback speed

Use `setPlaybackSpeed(double)` and handle failure. Supported ranges and audio quality depend on backend/media. Offer only speeds validated across the target matrix.

Persist a user’s speed preference separately, then apply it after each new controller initializes. Do not assume replacement controllers inherit it.

## Volume and audio policy

`setVolume` uses a normalized range. Muting for autoplay is application policy; remember the user’s prior volume separately if offering unmute.

`mixWithOthers` requests platform audio mixing but is silently ignored on Web. Audio focus/session behavior is platform-specific. Validate interaction with music, calls, navigation prompts, accessibility audio, and other players.

For feeds, guarantee one active audible controller. Paused off-screen players should not retain unwanted audio focus.

## Audio tracks

Current controller APIs include `isAudioTrackSupportAvailable`, `getAudioTracks`, and `selectAudioTrack`. Feature-probe before showing UI and test the actual container/manifest/backend.

Track IDs and availability can change when the source/controller changes. Do not persist a raw track ID globally; persist language/role preference and resolve it against the current track list.

## Captions

`video_player` supports external caption files through `ClosedCaptionFile`, with `SubRipCaptionFile`, `WebVTTCaptionFile`, `setClosedCaptionFile`, caption offset, and the `ClosedCaption` widget.

```dart
final controller = VideoPlayerController.networkUrl(
  videoUri,
  closedCaptionFile: loadCaptions(),
);

Stack(
  fit: StackFit.expand,
  children: [
    VideoPlayer(controller),
    ClosedCaption(text: controller.value.caption.text),
  ],
)
```

Verify exact widget constructor against the installed version.

Do not equate external-caption support with selecting arbitrary embedded subtitle tracks. If embedded track selection, styling, TTML, live captions, or DRM subtitle handling is required, confirm backend APIs or select a specialized player.

Caption UX must support:

- user enable/disable;
- readable contrast/background;
- text scaling and safe-area placement;
- localization and RTL;
- timing offset only as a correction tool;
- transcript/accessibility needs where required.

## Display sleep

`preventsDisplaySleepDuringVideoPlayback` is available in current options/value/controller APIs, with the 2.13.0 release specifically adding control on iOS/macOS. Verify backend support before presenting it as universal.

Prevent display sleep only during intentional visible playback. Restore normal policy when paused, completed, hidden, or disposed.

## Background playback

`VideoPlayerOptions(allowBackgroundPlayback: true)` requests continuation rather than automatic pause. It is not a complete background media architecture.

Production background playback may require:

- Android foreground media service/notification and audio focus;
- iOS background audio mode and audio session;
- remote controls/lock screen metadata;
- interruption handling;
- platform review/policy compliance.

If these are required, use native platform capabilities or a higher-level audio/video playback stack designed for background media. Do not bolt them onto a widget-owned controller.

## Picture-in-Picture

The core `video_player` API does not provide a cross-platform PiP orchestration API. PiP requires platform lifecycle, activity/controller configuration, availability checks, and remote controls.

Treat PiP as a separate capability-selection task. Do not claim that platform-view mode or background playback automatically enables PiP.

## Controls and accessibility

The package supplies the video surface, progress indicator/scrubber, caption utilities, and optional browser controls. A complete custom player must implement:

- keyboard and switch access;
- semantic labels/states/actions;
- visible focus;
- adequate touch targets;
- captions;
- screen-reader-friendly elapsed/remaining time updates without excessive announcements;
- reduced motion for auto-hiding/animated controls;
- error and retry messaging.

Do not announce position every controller tick. Announce user-initiated seek results or coarse meaningful changes.

## Recovery UX

Retry only recoverable failures. Dispose the failed controller and create a fresh one after auth/network recovery.

Preserve position when:

- the content identity is unchanged;
- the source is seekable;
- the position remains valid;
- product policy permits resuming.

For unsupported codecs, DRM, malformed media, or policy blocks, show an actionable terminal message rather than an infinite spinner.
