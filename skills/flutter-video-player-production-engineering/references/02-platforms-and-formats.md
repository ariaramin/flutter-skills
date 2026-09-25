# Platforms and Formats

## Contents

- Official support matrix
- Android Media3/ExoPlayer behavior
- iOS/macOS AVPlayer behavior
- Web/browser delegation
- Codec and container decisions
- Texture and platform views

## Official support baseline

At `video_player 2.13.0`:

| Platform | Official package support | Baseline |
|---|---|---|
| Android | Yes | SDK 24+ |
| iOS | Yes | 13.0+ |
| macOS | Yes | 10.15+ |
| Web | Yes | Browser-dependent |
| Windows | No endorsed implementation | Select another package/backend |
| Linux | No endorsed implementation | Select another package/backend |

Do not infer Windows/Linux support from Flutter itself or from community implementations. If those platforms are mandatory, run a package-selection task using explicit codec, subtitle, DRM, hardware-decode, maintenance, and licensing requirements.

## Federated architecture

```text
video_player
→ video_player_platform_interface
→ video_player_android
→ video_player_avfoundation
→ video_player_web
```

The endorsed implementations are pulled transitively; do not add them directly unless importing their APIs. Inspect resolved implementation versions because the umbrella package and backends release independently.

Flutter owns the controller/value/widget contract. Platform backends own media loading, decoding, buffering, timing, audio integration, and rendering surfaces.

## Android

The Android backend uses AndroidX Media3 ExoPlayer. Media3 supports progressive media plus adaptive protocols including HLS and DASH, but the contained audio/video codecs must be supported by available device decoders.

Expect device variation in:

- hardware codec/profile/level and resolution limits;
- HDR and high-frame-rate support;
- decoder concurrency;
- vendor media stack behavior;
- emulator support.

Test physical low-end and representative vendor devices. Android’s official emulator is useful, but it is not a device codec matrix.

Add network permission:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

Use HTTPS. Android cleartext HTTP may be blocked by platform network-security policy; configure the narrowest domain exception rather than globally allowing cleartext.

`formatHint` can identify HLS/DASH/other formats when URL detection is ambiguous. It cannot fix wrong MIME, malformed manifests, unsupported codecs, or authentication failures.

## iOS and macOS

The Apple backend uses AVPlayer/AVFoundation for local/remote file media and HLS. Supported containers and codecs depend on OS version and available AVFoundation capabilities.

Use HTTPS. Non-HTTPS network playback requires an intentional App Transport Security exception in `Info.plist`.

On macOS, enable outgoing network access for network video:

```xml
<key>com.apple.security.network.client</key>
<true/>
```

in the appropriate entitlements file.

Apple HLS is the natural adaptive delivery path. Validate the entire multivariant playlist: codecs, audio, captions, encryption/authentication, segment URLs, and bitrate ladder.

Audio session, background playback, AirPlay, and PiP requirements may need additional native entitlements/configuration or a higher-level player architecture. Do not assume controller flags complete platform integration.

## Web

The Web backend uses browser video elements. The browser decides supported containers/codecs, autoplay, seeking, buffering, fullscreen, remote playback, and many errors.

Never use `VideoPlayerController.file` in Web code; `dart:io` is unavailable and the constructor throws `UnimplementedError`.

Browser support must be tested against the product browser matrix. Safari, Chromium, Firefox, mobile browsers, private modes, and embedded webviews can differ.

## Containers are not codecs

An `.mp4` file can contain different video/audio codecs. A platform may support the MP4 container but reject an unsupported HEVC profile or audio track.

Track compatibility as:

```text
delivery protocol
container
video codec + profile/level/bit depth
audio codec + channels
resolution + frame rate + bitrate
DRM/encryption
target OS/browser/device
```

Do not claim universal support for H.264, HEVC, VP9, AV1, AAC, or WebM. Hardware decode and licensing/browser policies matter.

For broad baseline compatibility, test a conservative H.264/AAC MP4 rendition plus adaptive HLS/DASH variants appropriate to each target. This is an architectural compatibility strategy, not a guarantee.

## Adaptive formats

- Android Media3 supports HLS and DASH when manifests, containers, and codecs are supported.
- Apple AVPlayer has first-class HLS support; do not assume DASH support through AVPlayer.
- Browsers vary: Safari commonly handles HLS natively, while DASH/HLS support elsewhere may require JavaScript/MSE players not supplied by `video_player`.

If identical adaptive behavior across browsers is mandatory, `video_player` alone may not be the right Web abstraction.

## Rendering view types

`VideoViewType.textureView` is the default. It integrates as a Flutter texture and is the conservative choice.

`VideoViewType.platformView` is supported only where implemented and interacts with platform-view composition. Current `video_player_android` documentation explicitly does not recommend Android platform views because of a known issue.

Choose platform views only for a demonstrated correctness/capability reason. Validate overlays, clipping, transforms, opacity, scrolling, screenshots, accessibility, and lifecycle on every target.

View type changes controller identity. Recreate the controller rather than changing it in place.
