# Network and Web Playback

## Contents

- Delivery contract and HTTP headers
- Progressive MP4 and byte ranges
- HLS/DASH and CDN behavior
- Authentication and signed URLs
- Web autoplay, CORS, and browser controls
- Caching and retry boundaries

## Treat playback as a delivery pipeline

```text
application media identity
→ authorization/signing
→ CDN/origin redirect
→ manifest or media response
→ segment/range requests
→ platform demuxer/decoder
→ Flutter rendering
```

Inspect every stage. A controller error at the end may originate in expired segment URLs or a CDN stripping range headers.

## Use typed network sources

```dart
final controller = VideoPlayerController.networkUrl(
  Uri.parse(videoUrl),
  httpHeaders: {'Authorization': 'Bearer $token'},
  videoPlayerOptions: const VideoPlayerOptions(
    preventsDisplaySleepDuringVideoPlayback: true,
  ),
);

await controller.initialize();
```

Never log the URL when it contains a signature/token. Never log authorization headers.

Verify whether headers propagate to manifest, segments, redirects, encryption keys, and browser requests on each backend. A public API accepting headers does not guarantee identical cookie/CORS/redirect semantics on every platform.

## Progressive media needs range support

For seekable progressive MP4, the server/CDN should support byte ranges and return correct response headers. Without ranges, a seek may restart or wait until the full file is cached.

Check:

```text
Accept-Ranges: bytes
206 Partial Content for valid Range requests
correct Content-Range and Content-Length
correct Content-Type
MP4 metadata positioned for progressive start (fast start)
```

Flutter Web’s development server does not support range requests for assets, so debug asset-seeking behavior is not production evidence. Test behind the deployed server/CDN.

## Adaptive streaming

Use an appropriate bitrate ladder rather than one oversized rendition. Validate:

- master and media playlist syntax;
- segment/key URLs after redirects;
- codec declarations;
- audio/subtitle groups;
- segment duration and keyframe alignment;
- CDN caching and origin range behavior;
- live window and expiry;
- target engine support.

`video_player` does not expose a cross-platform adaptive track-selection policy API. Platform engines choose renditions. If product requirements demand manual quality selection, DRM, detailed analytics, or offline adaptive downloads, evaluate a specialized playback stack.

## Authentication and expiring URLs

Initialization success does not mean a long HLS session will survive token expiry. Segments and keys may be fetched much later.

Choose a server/app contract:

- sufficiently long-lived signed manifest and segment URLs;
- cookie/header authentication supported by the target backend;
- refresh by replacing the controller/source at a recoverable boundary;
- a CDN token scheme that covers descendant requests.

Make retries bounded. On authentication failure, refresh once through the application auth owner, create a fresh controller, restore a safe position if seekable, and avoid retry loops.

## Web autoplay

Browsers commonly reject `play()` with audible media before user activation. Treat this as expected:

```text
autoplay required
→ initialize
→ setVolume(0)
→ attempt play
→ show tap-to-unmute/play affordance
```

Do not swallow the failed Future or assume a delay will bypass policy. The policy can differ per browser/user/session.

## Web CORS and origin rules

Configure the media origin/CDN for the application origin, request headers, methods, and credentials actually used. Preflight may occur for authorization headers.

Test:

- manifest and every nested segment/key/poster URL;
- redirects to another origin;
- `Access-Control-Allow-Origin` and credentials compatibility;
- allowed request headers;
- range requests and exposed headers;
- CSP/media source policies.

Browser media can sometimes render cross-origin resources while other operations remain restricted. Do not infer a complete CORS contract from one successful play.

## Web-specific options

`VideoPlayerOptions.webOptions` can configure current Web behavior such as native controls, context menu, remote playback, and poster:

```dart
const VideoPlayerOptions(
  webOptions: VideoPlayerWebOptions(
    controls: VideoPlayerWebOptionsControls.disabled(),
    allowContextMenu: false,
    allowRemotePlayback: false,
    poster: Uri.parse('/images/poster.jpg'),
  ),
)
```

Verify constructors against the resolved version. Native browser controls are Web-only; custom Flutter controls need keyboard, focus, screen-reader, and touch accessibility.

`mixWithOthers` is silently ignored on Web. Do not use it as cross-platform proof of audio mixing.

## File/blob sources on Web

`VideoPlayerController.file` is unavailable. If users select local Web files, a browser object URL or supported network-style URI may be needed, along with explicit URL revocation when ownership ends. Verify current plugin/browser support and do not retain entire videos as Dart byte lists by default.

## Caching boundary

`video_player` exposes playback, not a persistent application cache or offline-download manager. Platform players and browsers buffer/cache internally, but that behavior is not a portable cache contract.

For persistent offline video:

- define storage ownership, quota, encryption, expiry, and cleanup;
- use platform-supported download APIs or a vetted cross-platform layer;
- validate HLS/DASH offline semantics and DRM;
- play the resulting supported local source on native platforms.

Do not add a third-party cache merely to hide a CDN/range/configuration bug.

## Error recovery

Classify HTTP errors:

```text
401/403 → auth/token/entitlement
404/410 → stale media identity or expired URL
429/5xx → bounded retry with backoff and cancellation
CORS → server/origin policy; client retry will not fix it
range/seek failure → CDN response contract
manifest parse → packaging/content issue
```

Preserve the user’s intent and last known position only when the replacement source is semantically the same and seekable. Live streams and changed manifests may not accept the old position.
