# Testing, Audits, and Versioning

## Contents

- Performance test matrix and unit/widget/golden/integration testing
- State-history, re-editing, and metadata tests
- Symptom-driven debugging guide
- Production anti-patterns and preferred replacements
- Implementation, performance, code-review, and readiness checklists
- Version-sensitive APIs, decision framework, and official references

## Testing

Use layers of testing.

---

## Unit Tests

Test application-level:

```text
configuration selection
source decision
output-format policy
metadata policy
max-resolution policy
editor result handling
duplicate-completion guard
upload retry
draft version compatibility
```

Do not unit-test Flutter's image rasterizer.

---

## Widget Tests

Good candidates:

```text
editor route mounts
custom toolbar appears
disabled tools absent
cancel callback/state
custom localized strings
completion routing
stable key/identity
custom widget loader integration
```

Avoid brittle, pixel-exact simulations of long multitouch gesture sequences unless the package exposes deterministic hooks.

---

## Golden Tests

Useful for:

```text
custom toolbar
theme
dialogs
custom stickers
static editor chrome
```

Less appropriate for:

```text
entire interactive session
platform emoji
font-sensitive dynamic state
gesture-in-progress UI
```

unless environment is controlled.

---

## Integration Tests

Use real devices/browsers for:

```text
crop pinch
stylus/paint
keyboard shortcuts
mouse interaction
large image
export
Web Worker
browser download integration
native file flow
orientation/resize
memory
```

---

## Testing State History

Test:

```text
add layer
undo
redo

paint
undo
redo

crop
undo
redo

filter
undo
redo
```

and:

```text
export history
destroy editor
restore history
verify equivalent editable state
```

for versions you support.

---

## Testing Re-editing

For lossy output:

```text
original
 -> edit/export JPG
 -> re-import/export JPG
```

compare visual/size behavior to verify whether your product should instead persist original + state.

---

## Testing Metadata

Create fixtures containing:

```text
GPS EXIF
timestamp
camera EXIF
ICC profile
```

Test:

1. Done with no changes and original-byte reuse enabled.
2. Make an edit forcing re-encode.
3. Inspect metadata.
4. Verify against product privacy requirement.

Do not infer privacy from visual output.

---

## Debugging Guide

| Symptom | Likely cause | How to verify | Preferred fix |
|---|---|---|---|
| Editor opens slowly | source load/full decode, processor startup, custom UI | timeline + source dimensions | remove duplicate prep, defer worker init if measured, bound source |
| Memory spikes immediately | huge decoded image | width×height estimate + Memory view | pre-resize if product allows |
| App crashes on 48 MP image | total native/GPU/raw memory exceeds budget | reproduce on low-memory device | lower ingest/output resolution, avoid concurrent sessions |
| Done takes long | final capture/encode not ready | time generation separately | keep background generation/isolate, bound output |
| UI freezes during export | main-thread fallback/app post-processing | CPU timeline | enable worker path, move app CPU work out |
| Export memory doubles | raw buffer + output + app copies | allocation trace | eliminate output/source copies |
| Filter panel lags | large scene/filter stack/external rebuild | UI/raster trace | merge supported filters, reduce outside rebuilds |
| Blur slider janks | large `BackdropFilter` workload | raster timing | reduce area/sigma/competing effects |
| Drawing becomes delayed | path/layer/history growth | test increasing stroke count | merge appropriate layers, bound history |
| Eraser becomes slow | many paint items/layers | compare before/after layer merge | reduce/merge completed paint layers |
| Undo becomes slow | large history/layer snapshots | history count + memory | lower history limit |
| History consumes RAM | large state + screenshots | long-session memory | product-appropriate history limit |
| Transparent PNG has artifacts | wrong intermediate RGBA interpretation / JPEG selected | inspect config/result alpha | PNG + verify `rawStraightRgba` config |
| Transparency turns white | JPEG flattening | inspect output format | use PNG or deliberate JPEG background |
| Output dimensions too small | `maxOutputSize` | inspect generated dimensions | set product requirement explicitly |
| Output unexpectedly huge | high max size/lossless PNG | inspect dimensions/format | choose appropriate bound/format |
| Output quality degrades each edit | JPEG re-import cycle | compare generations | preserve original + state |
| GPS unexpectedly remains | unchanged original bytes reused | inspect metadata | deterministic re-encode/sanitization |
| EXIF unexpectedly gone | edited re-encode rebuilds pixels | inspect metadata | preserve separately if required |
| Wide-gamut colors shift | ICC not retained by re-encode path | color-profile test fixture | use validated color-management pipeline |
| Web local `File` fails | native File semantics unavailable | browser console | pass picker bytes via `.memory` |
| Web export freezes | worker unavailable/fallback or huge buffers | browser Performance | validate Worker/Wasm config, reduce size |
| Editor resets unexpectedly | changing key/type/source identity | inspect parent rebuild | stable key/session |
| Completion runs business work twice | external event duplication | log result IDs | one result owner/idempotent side effects |
| Editor remains loading after Done | long awaited callback | time callback stages | move upload/business work outside |
| Desktop blur worse than mobile | much larger painted area | raster trace/window resize | bound editor/effects |
| Custom sticker slows editor | heavyweight WidgetLayer | remove/replace and compare | simplify sticker widget |
| Restored history breaks after upgrade | package schema/API change | stored package/schema version | migrate or flatten fallback |

---

## Anti-Patterns

### Decode the same large image several times

#### Bad

```text
picker bytes
 -> app decode
 -> app re-encode
 -> editor decode
 -> result immediately decode again
```

#### Why

Repeated:

```text
CPU
raw pixels
memory
GC/native resources
```

#### Preferred

Decode/process only when a real stage requires it.

#### Verify

CPU + memory trace.

---

### File → bytes → base64 → bytes → editor

#### Bad

```text
File
 -> readAsBytes
 -> base64
 -> decode base64
 -> ProImageEditor.memory
```

#### Why

Creates large redundant representations.

#### Preferred

Use `ProImageEditor.file` on supported native targets or existing bytes directly.

#### Verify

Peak heap/RSS.

---

### Full 48 MP editing for a 1080 px product output

#### Why

Decoded-memory cost is enormous while most pixels will never reach final output.

#### Preferred

Preserve original externally and create a bounded editing derivative if product fidelity permits.

#### Verify

quality review + memory/open latency.

---

### New `UniqueKey()` every build

#### Why

Destroys editor State/history.

#### Preferred

stable identity.

#### Verify

parent rebuild while editor active.

---

### Global app state mirrors every gesture

#### Why

Broad rebuilds/state copying can compete with editor interaction.

#### Preferred

editor owns transient state; sync semantic checkpoints only.

#### Verify

Track Widget Builds/CPU.

---

### Upload on every edit

#### Why

Network/business work has no place in paint/filter/crop gesture hot paths.

#### Preferred

upload final output or explicit draft checkpoints.

#### Verify

network requests during interaction should approach zero.

---

### Persist full history every pointer move

#### Why

Serialization and I/O can dominate gesture latency.

#### Preferred

debounced semantic checkpoints.

#### Verify

drawing UI frame times.

---

### Unlimited history

#### Why

Memory grows with long sessions.

#### Preferred

bounded history based on UX/device testing.

#### Verify

long-session RSS.

---

### Enable captured layers without using them

#### Why

Extra PNG rendering/encoding/memory.

#### Preferred

leave `captureLayersOnDone` false.

#### Verify

Done latency/memory.

---

### Maximum worker count because "more cores = faster"

#### Why

More concurrent raw image processing can increase memory/CPU contention and thermals.

#### Preferred

start with package `auto`; change from evidence.

#### Verify

interaction + export + peak RSS together.

---

### Base64 output by default

#### Why

Larger representation and extra String/copy.

#### Preferred

binary `Uint8List`.

#### Verify

memory/payload.

---

### Wait for cloud upload inside Done callback

#### Why

Editor loading UX becomes cloud latency.

#### Preferred

return result and upload at application layer when product permits.

#### Verify

Done-to-close vs upload duration.

---

### Immediate re-decode of result

#### Why

Creates another decoded image while editor/export buffers may still be live.

#### Preferred

defer display decode until after editor session is gone, if needed.

#### Verify

peak memory.

---

### Repeated JPEG re-editing

#### Why

Lossy compression compounds.

#### Preferred

original + logical edit state.

#### Verify

multi-generation visual comparison.

---

### Assume preview resolution is output resolution

#### Why

Viewport geometry and final pixel generation are different.

#### Preferred

inspect `maxOutputSize` and actual output dimensions.

#### Verify

decode generated image dimensions.

---

### Assume 4 MB JPEG = 4 MB memory

#### Why

Decoded memory is based on pixels.

#### Preferred

dimension-based estimate.

#### Verify

DevTools/native memory.

---

### Several high-res editors simultaneously

#### Why

Each can retain full image/session resources.

#### Preferred

serialize sessions.

#### Verify

RSS with 1 vs N editors.

---

### Heavy blur over the editor plus app-level blur

#### Why

Raster filters stack.

#### Preferred

remove redundant surrounding effects.

#### Verify

raster p99.

---

### Huge dynamic WidgetLayer

#### Why

Adds Flutter widget/layout/paint complexity to layer manipulation/export.

#### Preferred

bounded lightweight layer.

#### Verify

interaction/raster profile.

---

### Log image bytes/base64

#### Why

privacy leak plus huge logs/allocations.

#### Preferred

dimensions/length/timing only.

#### Verify

log audit.

---

### Assume editor always strips EXIF

#### Why

unchanged original bytes may be returned.

#### Preferred

deterministic metadata policy.

#### Verify

fixture metadata.

---

### Assume metadata always survives

#### Why

normal re-encode path does not propagate EXIF/ICC.

#### Preferred

store required metadata separately or use validated processor.

#### Verify

fixture metadata.

---

### Debug performance used as production evidence

#### Why

debug instrumentation and Web background-generation behavior can differ.

#### Preferred

profile/release validation.

#### Verify

profile target hardware.

---

## Implementation Checklist

1. [ ] Inspect installed `pro_image_editor` version.
2. [ ] Verify Flutter/Dart minimum compatibility.
3. [ ] Identify target platforms.
4. [ ] Define source types.
5. [ ] Define maximum expected source dimensions.
6. [ ] Define required final output dimensions.
7. [ ] Decide JPG vs PNG/other format.
8. [ ] Decide alpha requirements.
9. [ ] Define metadata/privacy policy.
10. [ ] Decide whether original source must be preserved.
11. [ ] Choose the simplest editor constructor.
12. [ ] Avoid source byte duplication.
13. [ ] Configure only required tools.
14. [ ] Set a deliberate history policy.
15. [ ] Keep isolate/Worker generation enabled initially.
16. [ ] Keep processor mode conservative.
17. [ ] Decide whether background generation helps UX.
18. [ ] Keep editor key/session identity stable.
19. [ ] Implement one completion owner.
20. [ ] Implement cancellation independently.
21. [ ] Keep cloud upload outside gesture/editor render lifecycle.
22. [ ] Avoid captured layers unless consumed.
23. [ ] Add app-level result persistence.
24. [ ] Add draft state versioning if histories are persisted.
25. [ ] Provide `WidgetLoader` for persisted custom widget layers.
26. [ ] Test transparency.
27. [ ] Test metadata policy.
28. [ ] Test large images.
29. [ ] Test repeated open/export/close.
30. [ ] Profile memory/export.
31. [ ] Test target platform matrix.

---

## Performance Audit Checklist

### Source

- [ ] source width?
- [ ] source height?
- [ ] megapixels?
- [ ] encoded byte size?
- [ ] estimated decoded memory?
- [ ] source already exists as file or bytes?
- [ ] any duplicate `Uint8List`?

### Session

- [ ] layer count?
- [ ] paint item count?
- [ ] heavy WidgetLayers?
- [ ] active blur?
- [ ] filter stack?
- [ ] history count?
- [ ] history limit?
- [ ] external parent rebuilds?

### Processors

- [ ] isolate generation enabled?
- [ ] background generation enabled?
- [ ] processor mode?
- [ ] processor count?
- [ ] max concurrency?
- [ ] initialization delay needed/measured?

### Export

- [ ] output format?
- [ ] `maxOutputSize`?
- [ ] JPEG quality?
- [ ] PNG settings?
- [ ] alpha handling?
- [ ] layer capture enabled?
- [ ] Done latency?
- [ ] peak memory?
- [ ] output byte size?

### Post-export

- [ ] immediate copy?
- [ ] immediate decode?
- [ ] base64?
- [ ] file writes count?
- [ ] upload?
- [ ] database?
- [ ] can editor close before remote work?

### Privacy

- [ ] EXIF requirement?
- [ ] GPS stripping?
- [ ] original-byte reuse?
- [ ] ICC/color requirement?
- [ ] history contains private data?
- [ ] logs safe?

### Platform

- [ ] Web local file uses bytes?
- [ ] Web Worker tested?
- [ ] browser memory tested?
- [ ] low-memory Android?
- [ ] iPhone/iPad?
- [ ] large desktop window?
- [ ] keyboard/mouse?

---

## Code Review Checklist

- [ ] Current package API?
- [ ] No outdated constructor/callback?
- [ ] Correct `ProImageEditorCallbacks`?
- [ ] Stable editor identity?
- [ ] No `UniqueKey` reset?
- [ ] Correct source constructor?
- [ ] No needless source byte copy?
- [ ] No base64 roundtrip?
- [ ] Large-image resolution policy?
- [ ] History limit deliberately reviewed?
- [ ] Isolate/Worker configuration justified?
- [ ] No processor maximum without profiling?
- [ ] Output format explicit where requirements matter?
- [ ] Output dimensions deliberate?
- [ ] Transparency configuration tested?
- [ ] No invented WebP output?
- [ ] No `ImageByteFormat.png` internal capture configuration?
- [ ] Duplicate completion side effects guarded?
- [ ] Upload/business work separated?
- [ ] No per-pointer external I/O?
- [ ] Captured layers only if needed?
- [ ] State persistence versioned?
- [ ] WidgetLayer persistence has loader?
- [ ] Metadata policy explicit?
- [ ] No raw image logging?
- [ ] Platform assumptions verified?
- [ ] Performance measured outside debug?

---

## Production Readiness Checklist

- [ ] Small JPG tested.
- [ ] 12 MP image tested.
- [ ] 24 MP image tested if accepted.
- [ ] 48 MP/very-large input failure behavior tested if accepted.
- [ ] Large PNG tested.
- [ ] Transparent PNG tested.
- [ ] Panorama tested if accepted.
- [ ] Android tested.
- [ ] iPhone tested.
- [ ] iPad/tablet tested.
- [ ] Web tested if shipped.
- [ ] macOS/Windows/Linux tested if shipped.
- [ ] Mobile browser tested if Web supports mobile.
- [ ] Crop pinch tested.
- [ ] rotate/flip tested.
- [ ] perspective tilt tested if enabled.
- [ ] drawing/eraser stress tested.
- [ ] filter/tune tested.
- [ ] blur profiled.
- [ ] text/emoji tested.
- [ ] custom sticker layers tested.
- [ ] many layers tested.
- [ ] undo/redo long session tested.
- [ ] history restore tested if persisted.
- [ ] cancel flow tested.
- [ ] duplicate Done tested.
- [ ] generation failure behavior reviewed.
- [ ] Web Worker/fallback reviewed.
- [ ] memory profiled.
- [ ] export duration profiled.
- [ ] output dimensions verified.
- [ ] output quality reviewed.
- [ ] metadata/privacy tested with fixtures.
- [ ] repeated editor route cycles show no unacceptable memory growth.

---

## Version-Sensitive Areas

Always revalidate these against the installed package.

### Current package

Validated:

```text
pro_image_editor 13.3.1
```

---

### Flutter/Dart requirement

Current tag:

```text
Dart >= 3.12.0 < 4.0.0
Flutter >= 3.44.0
```

---

### Generated API Docs

pub.dev generated pages can lag the live release.

When exact source and generated docs conflict:

```text
installed source
matching official Git tag
changelog
```

should drive compile-time behavior.

---

### `captureImageByteFormat`

Current 13.3.1 has a documentation/source mismatch around:

```text
rawRgba
rawStraightRgba
```

and rejects:

```text
ui.ImageByteFormat.png
```

for the intermediate capture option.

Revalidate on every upgrade.

---

### Output Formats

Current:

```text
jpg
png
tiff
bmp
cur
pvr
tga
ico
```

Do not assume WebP until the enum actually exposes it.

---

### History Schema

Persisted history is not guaranteed to remain semantically identical forever.

Version 13.0 demonstrates a breaking tune-ID migration.

Persist schema/package version.

---

### WidgetLayer Import

Current state restoration needs a `WidgetLoader` for application-defined widget/sticker layers.

Revalidate serialization APIs after upgrades.

---

### Layer Rasterization

`LayerRasterizer` / `LayerRasterizerHost` were added in 13.3.0 and are new APIs.

Verify signatures before generating code.

---

### Crop / Gesture Behavior

13.3.1 contains several crop/pinch/tilt gesture fixes.

Do not diagnose behavior from pre-13.3.1 examples without checking the installed version.

---

### Processor Architecture

Revalidate:

```text
Web Worker support
Wasm fallback
processor modes
initializationDelay
default background behavior
```

after package/Flutter Web upgrades.

---

### Metadata

Current re-encoding does not forward original EXIF/ICC through its raw-pixel conversion path.

Original-byte reuse can preserve metadata.

This is implementation-sensitive and MUST be retested after upgrades if privacy depends on it.

---

### Color Management

No current guarantee should be assumed for:

```text
ICC retention
Display-P3
HDR
wide-gamut preservation
```

Treat color-critical output as a separately validated workflow.

---

## Decision Framework

### Small/medium local image

Use direct:

```text
file or memory constructor
+
default/conservative generation
```

if profiling is healthy.

---

### Existing file

Prefer:

```text
ProImageEditor.file
```

instead of manually reading it solely for editor construction.

---

### Bytes already exist

Prefer:

```text
ProImageEditor.memory
```

instead of writing/reading a temporary file unnecessarily.

---

### Browser-selected file

Prefer:

```text
browser picker bytes
+
ProImageEditor.memory
```

---

### Very large image

First ask:

```text
Does the final product need this resolution?
```

If no:

```text
preserve original
+
resize editing derivative
```

If yes:

```text
retain source
+
profile memory on lowest supported device
+
bound history/concurrency
```

---

### Transparent artwork

Use:

```text
PNG final format
+
validated straight-alpha intermediate configuration
```

and test actual alpha pixels.

---

### Photo/social output

JPG is usually the natural package-default path, but choose:

```text
resolution
quality
```

from actual product requirements.

---

### Re-editable project

Prefer:

```text
original source
+
versioned editor state
```

when supported.

---

### Final flattened result only

Use:

```text
onImageEditingComplete
```

and store the encoded output.

---

### Cloud upload

```text
edit
→ export once
→ return result
→ upload/persist
```

Do not upload throughout the gesture session.

---

## Official References

### Package

https://pub.dev/packages/pro_image_editor

https://pub.dev/packages/pro_image_editor/changelog

https://pub.dev/documentation/pro_image_editor/latest/

### Official repository

https://github.com/hm21/pro_image_editor

### Current 13.3.1 source

https://github.com/hm21/pro_image_editor/tree/v13.3.1

https://raw.githubusercontent.com/hm21/pro_image_editor/v13.3.1/pubspec.yaml

https://raw.githubusercontent.com/hm21/pro_image_editor/v13.3.1/lib/features/main_editor/main_editor.dart

### Main API

https://pub.dev/documentation/pro_image_editor/latest/features_main_editor_main_editor/ProImageEditor-class.html

### Current package library index

https://pub.dev/documentation/pro_image_editor/latest/pro_image_editor/

### Flutter image memory / rendering

https://api.flutter.dev/flutter/widgets/Image-class.html

https://api.flutter.dev/flutter/dart-ui/Image-class.html

https://docs.flutter.dev/tools/devtools/memory

https://docs.flutter.dev/tools/devtools/performance

### Flutter image byte formats

https://api.flutter.dev/flutter/dart-ui/ImageByteFormat.html

### Flutter rendering

https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html

https://api.flutter.dev/flutter/widgets/BackdropFilter-class.html

https://api.flutter.dev/flutter/dart-ui/ImageFilter/ImageFilter.blur.html

### Dart concurrency

https://dart.dev/language/isolates

https://api.dart.dev/dart-isolate/Isolate/run.html

---

## Final Rules for AI Coding Agents

Before changing an image-editor implementation:

```text
1. Inspect installed pro_image_editor version.
2. Identify target platforms.
3. Inspect source image dimensions.
4. Estimate decoded memory.
5. Identify the actual required final output size.
6. Determine whether original must remain available.
7. Choose the simplest source constructor.
8. Eliminate redundant byte copies.
9. Inspect history limit.
10. Inspect layer/paint complexity.
11. Inspect blur/filter usage.
12. Inspect processor configuration.
13. Keep worker/isolate generation enabled initially.
14. Inspect output format and transparency requirements.
15. Inspect app-side completion callback work.
16. Remove duplicate export/upload paths.
17. Define metadata policy.
18. Profile editor open.
19. Profile interaction.
20. Profile export.
21. Profile memory over repeated sessions.
22. Verify actual low-end hardware/browser.
```

For most applications, the preferred architecture is:

```text
original/source media
        ↓
source preparation
        ↓
stable ProImageEditor route
        ↓
transient non-destructive editing state
        ↓
one final export
        ↓
editor closes
        ↓
persistence/upload/business workflow
```

not:

```text
parent rebuild
   ↓
decode image again
   ↓
new UniqueKey
   ↓
edit
   ↓
serialize every touch
   ↓
export
   ↓
base64
   ↓
decode again
   ↓
upload while editor blocks
   ↓
overwrite original
```

The highest-impact production questions are:

```text
How many pixels are decoded?
How many full-image buffers exist?
How long is history?
How many layers are active?
What happens on Done?
What work is really off-thread?
What output quality is actually required?
What metadata policy is required?
```

Optimize those before micro-optimizing widget syntax.
