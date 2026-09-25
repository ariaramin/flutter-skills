# Performance and Feeds

## Contents

- Resource model and performance budgets
- Scrolling-feed architecture
- Preloading, reuse, and pooling
- Rebuild/rendering control
- Fullscreen transitions
- Profiling workflow

## Model the expensive resources

An initialized player may own:

```text
network connections and buffers
demuxer and decoder
decoded audio/video buffers
GPU texture or native view/surface
platform channel/event stream
Dart controller/listeners
```

Pausing does not necessarily release decoder, texture, or buffers. Disposal is the resource-release boundary.

There is no universal safe number of players. Decoder concurrency depends on device, codec/profile, resolution, frame rate, view type, and other apps. Establish a product budget on the slowest supported hardware.

## Build a bounded feed window

For an autoplay feed:

```text
far cells → thumbnail only
near cells → optional bounded initialization
active cell → initialized + playing
recent previous/next → paused or retained only if budget permits
leaving window → dispose
```

Keep one active audible player. Resolve ties deterministically when two cells meet the visibility threshold.

Do not create controllers in `itemBuilder` without a coordinator/owner. List cells are recycled and rebuilt frequently.

Use stable media IDs and a coordinator that owns:

- active item selection;
- initialization cancellation/generation;
- play/pause policy;
- bounded retained controllers;
- eviction/disposal;
- app/route lifecycle.

## Visibility is a policy input

Debounce noisy visibility changes. Use thresholds and scroll direction to avoid start/pause thrashing near boundaries.

Pause as soon as a player is no longer the active media experience. Dispose based on the bounded window, not every minor visibility fluctuation.

Do not let every cell independently autoplay; coordination prevents two videos racing for audio focus.

## Preloading is limited

Calling `initialize()` loads the source and metadata and often prepares platform playback, so it can reduce later startup latency. It is not a portable promise that:

- the first frame is rendered;
- a fixed duration is buffered;
- all adaptive segments are cached;
- decoding resources are cheap;
- playback will start without new network requests.

Measure initialize-to-first-frame separately. Preload only a small likely-next set and cancel/dispose when prediction changes.

`backBufferDurationMs` controls retained media behind the current position where supported. Larger values can improve backward seeking but consume memory. Do not increase it without measurement and resolved-backend verification.

## Pool only when it earns its complexity

A controller pool must be:

- bounded by count/resource policy;
- keyed by complete source/options identity;
- single-owner or lease-based;
- race-safe during initialization;
- aware of URL/token expiry;
- guaranteed to pause and dispose on eviction;
- cleared on memory pressure/logout when media is sensitive.

Prefer a small active/adjacent coordinator to a general-purpose pool. Add pooling only when profiling proves repeated initialization dominates and simpler pre-initialization is insufficient.

## Minimize rebuild cost

The controller emits position updates frequently. Do not propagate the entire `VideoPlayerValue` through global application state at every tick.

Split UI:

```text
stable video surface
controls listening to small state
progress indicator/scrubber listening to position
semantic app state receiving play/pause/completion/error only
```

Avoid timers that poll `controller.position` when the value/listener already provides suitable updates. If analytics need progress, sample at coarse intervals outside the render path.

Keep blur, shader, opacity, and clipping effects over video modest and profile raster/GPU cost. Video decode may be healthy while Flutter composition is janky.

## Source switching

Rapid swipes can start multiple initializations. Use a generation token/controller identity check. Pause/dispose obsolete controllers promptly. Do not autoplay from a stale completion.

If source identity is unchanged, update only playback policy; avoid recreating the controller because an unrelated parent rebuilt.

## Fullscreen

`video_player` does not provide a full fullscreen experience. Prefer one controller owner shared across inline and fullscreen presentation so playback position, buffering, and decoder resources continue.

Possible architecture:

```text
route-level controller owner
→ inline VideoPlayer
→ push fullscreen route using same controller
→ pop to inline surface
```

Reparenting/render-surface changes have had platform-specific bugs historically. Test the resolved version. If sharing causes correctness issues, use an explicit handoff: pause, record position/state, create fullscreen controller, initialize/seek/play, then dispose the prior owner.

Do not run two playing controllers for the same media during transition.

Fullscreen also owns orientation, system UI, safe areas, gesture navigation, accessibility, and restoration. Restore previous orientation/system UI on every exit/error path.

## Memory pressure

On memory pressure:

- dispose non-visible preloaded controllers first;
- drop posters/thumbnails from application caches as appropriate;
- keep only the active controller when necessary;
- preserve lightweight playback intent/position, not native player objects.

Never “fix” decoder exhaustion by catching and ignoring initialization errors while retaining old players.

## Profile the right stages

Record:

```text
controller create → initialize complete
initialize complete → first frame
play request → playing
seek request → stable post-seek frame
buffering start/end and rebuffer ratio
active controller count
memory/GPU/decoder usage
UI/raster frame timing during scroll and overlays
network throughput, range/segment latency, CDN status
```

Use Flutter DevTools for Dart/UI/raster behavior, Android Studio/Perfetto/logcat/Media3 logs for Android, Instruments/AVFoundation logs for Apple, and browser DevTools media/network/performance tools for Web.

Profile release/profile builds with production URLs and representative media. Debug builds and local Web asset serving distort timing and range behavior.
