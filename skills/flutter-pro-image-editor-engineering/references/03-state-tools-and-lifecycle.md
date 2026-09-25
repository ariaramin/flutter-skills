# State, Tools, and Lifecycle

## Contents

- State persistence, history schema, limits, and gesture checkpoints
- Paint, crop, filters, tune, blur, text, emoji, and stickers
- Widget layers, layer capture/rasterization, and transformations
- Gesture ownership, parent rebuilds, and editor identity
- Navigation, cancellation, completion, original safety, and file I/O
- Upload, retry, and compression workflows

## State Persistence

Current editor exposes history import/export APIs.

Use them for:

- drafts;
- re-editable sessions;
- undo state persistence;

only after defining a versioning strategy.

---

## History State Is Version-Sensitive

Version 13.0 introduced tune-field changes that made histories using removed tune IDs no longer recognized.

Therefore persisted editor state MUST include application-level version context such as:

```text
editor package version
app schema version
source asset identifier/version
```

Do not treat history JSON as a permanent stable interchange specification.

---

## Widget Layer Persistence

Arbitrary Flutter widgets cannot be reconstructed from JSON automatically.

For persisted `WidgetLayer`s, current APIs require:

```text
stable export configuration / identifier
+
WidgetLoader
```

capable of reconstructing the widget.

Store semantic identifiers:

```text
"sticker:premium-star:v2"
```

rather than trying to serialize a widget tree.

---

## History Architecture

History entries store logical edit state such as:

```text
layers
blur
filters
tune adjustments
crop/transform state
metadata
```

rather than naively storing a complete original source image for every operation.

However, the state manager/generation pipeline may also keep screenshot/capture information.

History still consumes real memory.

---

## State History Limit — HIGH PRIORITY

Current default:

```text
stateHistoryLimit = 1000
```

This can be far too generous for memory-constrained products.

The package itself warns that high history limits can overload RAM/OOM.

---

## History Performance

#### Problem

Memory grows throughout a long editing session.

#### Mechanism

Each history entry retains logical layer/filter/transform data and can be associated with generation screenshots/resources.

Layer-heavy sessions amplify history size.

#### Detection

Profile:

```text
10 edits
50 edits
100 edits
200 edits
```

and compare:

```text
heap
RSS
undo latency
active layer count
history length
```

#### Fix

Set a product-appropriate history limit.

Example only:

```dart
const StateHistoryConfigs(
  stateHistoryLimit: 100,
)
```

is explicitly used by package documentation as a more conservative illustration, but **100 is not a universal recommendation**.

Choose based on:

```text
undo UX requirement
layer complexity
target memory tier
```

#### Tradeoff

Lower history limits reduce how far the user can undo.

#### Verification

Long-session memory test plus UX acceptance.

---

## History During Continuous Gestures

Do not create app-level history/autosave records for every pointer position.

Package tools already group/manage their own editing interaction state.

If application draft persistence is required, save at semantic checkpoints such as:

```text
stroke completed
text edit completed
layer transform ended
filter selection completed
periodic debounced checkpoint
```

not every touch move.

---

## Paint Editor

Current paint tooling supports drawing operations through `PaintLayer`/paint items.

The package currently uses low-level pointer handling in its paint canvas to reduce input latency for stylus/touch interaction.

---

## Drawing Performance

#### Problem

Freehand drawing becomes delayed after many strokes.

#### Mechanism

Cost can grow from:

```text
stored point count
paint item count
paint layer count
path building
hit testing
eraser searches
history copying
raster complexity
```

#### Detection

Profile:

```text
fresh canvas
100 strokes
500 strokes
eraser across many layers
```

Inspect UI/raster frame times.

#### Fix

- avoid app-side work in paint callbacks;
- periodically merge paint layers where product semantics permit and current API supports it;
- avoid huge custom paint overlays around the editor;
- bound history;
- avoid recording external analytics for every move event.

#### Tradeoff

Merging layers can reduce later independent editability.

#### Verification

Repeat identical stylus/eraser scenario.

---

## Paint Layer Merging

Current package versions support:

```text
mergeSelectedLayers()
```

for selected paint layers.

Use this when:

- users have finished manipulating individual paint layers;
- layer-count performance becomes meaningful;
- preserving individual source-layer editability is no longer required.

Do not merge automatically after every stroke.

---

## Eraser Performance

Current partial-erasing logic can inspect paint layers/items during pointer movement.

Therefore many paint layers/items can make eraser-heavy sessions disproportionately expensive.

If eraser interaction degrades:

```text
profile layer count first
```

before changing unrelated UI architecture.

---

## Crop and Rotate

Current crop editor includes:

```text
crop
rotate
flip
aspect-ratio handling
perspective tilt/skew
```

Recent 13.3.1 fixes specifically address:

```text
handle drag slop
fixed-aspect diagonal drag
pinch-to-zoom
tilted-image resize
Android/custom-app-bar hit areas
```

Do not reimplement crop gestures around the package unless product requirements require an entirely custom tool.

---

## Crop Coordinate Safety

Do not manually derive source crop coordinates from:

```text
global pointer coordinates
editor viewport pixels
```

unless using the package's documented transform data.

The editor manages:

```text
preview scaling
translation
rotation
flip
tilt
crop transforms
```

and final generation maps them to output.

Screen coordinates and image pixels are not interchangeable.

---

## Rotation Quality

Within an editor session, crop/rotate/flip are represented in editing state and composited at generation.

That is fundamentally preferable to application code that repeatedly:

```text
decode JPEG
rotate
encode JPEG
decode
rotate again
encode again
```

because repeated lossy encoding can degrade quality.

---

## Filters

Current filtering uses structured filter/color-matrix state.

Do not implement:

```dart
for (final pixel in 48MillionPixels) {
  // Dart pixel loop during slider drag
}
```

to create a "custom filter" unless a separate optimized image-processing architecture specifically requires it.

---

## Filter Performance

Filter/tune preview is generally shader/color-filter/raster-oriented rather than a fresh Dart per-pixel source mutation after every slider tick.

Still profile:

```text
large editor viewport
many combined filters
high refresh slider interaction
```

---

## Merge Filters

Current versions expose:

```text
mergeFilters()
```

to flatten an active filter stack into one equivalent `FilterState` where supported.

Use when:

- filter stack becomes large;
- later independent filter manipulation is unnecessary;
- profiling shows stack complexity matters.

Do not flatten purely as cargo-cult optimization.

---

## Tune Editor

Current tuning includes matrix-compatible adjustments.

Version 13.0:

```text
removed "sharpness"
renamed luminance -> tint
```

because a per-pixel color matrix cannot implement actual sharpening.

Do not generate old:

```text
sharpness
luminance
```

configuration/history assumptions from older tutorials.

---

## Blur — HIGH RASTER RISK

Current preview uses Flutter blur filtering (`BackdropFilter`/`ImageFilter.blur`) over the editor image.

---

## Blur Performance

#### Problem

Blur slider feels janky.

#### Mechanism

Blur is a raster/filter operation over a changing image region.

Cost grows with:

```text
visible filtered area
blur radius
device pixel density
other scene complexity
```

#### Detection

Use DevTools Performance:

```text
UI frame time
Raster frame time
```

during blur slider drag.

#### Fix

- keep editor viewport reasonably bounded;
- avoid surrounding the editor with additional full-screen blur;
- avoid application overlays/effects competing with blur;
- reduce maximum blur only if product design allows it.

#### Tradeoff

Lower blur intensity changes visual design.

#### Verification

Compare raster p95/p99 during slider interaction.

---

## Text Layers

Text remains structured editor state during the session.

Advantages:

```text
editable content
transformable layer
history-friendly
single final rasterization
```

Avoid converting every text operation into a raster sticker yourself.

---

## Fonts

Do not ship/load enormous custom font catalogs just because text editing supports custom fonts.

Large font sets primarily affect:

```text
bundle/Web payload
font loading
fallback consistency
testing matrix
```

Profile only if font loading/text layout is actually a problem.

---

## Emoji

Emoji rendering depends partly on platform/font behavior.

Exact glyph shape/color can differ between:

```text
Android
Apple
Linux
Windows
Web/browser
```

Do not promise pixel-identical native emoji across every platform.

---

## Web Colored Emoji

The package currently documents optional Web colored-emoji setup.

Treat that setup as a package-specific rendering requirement.

Do not copy old Flutter Web renderer flags from examples without validating current Flutter Web tooling.

---

## Stickers and Widget Layers

Custom sticker/widget layers can be arbitrary Flutter content.

This is powerful but potentially expensive.

---

## Heavy Widget Layer Anti-Pattern

Bad:

```text
WidgetLayer
  -> nested animated dashboard
  -> network image stream
  -> blur
  -> several timers
```

#### Why

Layer interactions now also carry:

```text
build
layout
hit testing
gesture transforms
history
capture/export
```

cost.

#### Preferred

Use lightweight visual layers:

```text
image
simple text
simple icon/badge
bounded static widget
```

#### Verify

Profile interaction and export with increasing layer counts.

---

## Layer Count

No universal maximum is documented.

Cost depends strongly on layer type.

Ten simple text layers are not equivalent to ten large dynamic widget layers.

Profile:

```text
10
50
100
```

representative layers rather than inventing a hard limit.

---

## Layer Capture

Current APIs can capture:

```text
single layer -> PNG
all layers -> PNG outputs
```

Batch capture can share processor resources.

Use only when needed.

Every captured layer can add:

```text
ui.Image
raw pixel buffer
PNG encoding
Uint8List output
```

work.

---

## LayerRasterizer

Version 13.3.0 adds:

```text
LayerRasterizer
LayerRasterizerHost
```

for rasterizing layers outside a live editor session.

Use this API rather than constructing hidden full editors solely to rasterize supported layers.

Always check current API docs/source because it is newly introduced.

---

## Layer Reordering / Multiselect

Layer ordering and multiselect are current package features.

External state managers should not mirror every layer transformation into a second application state graph unless persistence/business requirements demand it.

Let the editor own transient editing state.

---

## Gesture Architecture

Main/editor tooling handles:

```text
pan
scale
rotate
selection
multitouch
desktop pointer/scroll
```

internally.

Avoid putting the whole editor inside a competing:

```dart
GestureDetector(
  onScaleUpdate: ...,
)
```

unless you intentionally coordinate gesture ownership.

Parent gestures can participate in Flutter's gesture arena and interfere with layer/crop interactions.

---

## High-Frequency Gesture Rule

Never attach to every pointer update:

```text
network call
database write
file write
JSON serialization
large history export
analytics event
large state copy
```

Do these after a semantic interaction completes.

---

## Parent Rebuilds

Ordinary parent rebuilding is not automatically destructive if:

```text
same widget type
same logical source
stable key
```

are retained.

But unnecessarily reconstructing external config/source objects and changing identity can add work.

---

## Editor Identity

Never do:

```dart
ProImageEditor.memory(
  bytes,
  key: UniqueKey(),
  ...
)
```

from a parent that rebuilds.

That intentionally discards editor State and can reset:

```text
history
selection
tool state
layer state
```

Stable editor identity is a correctness requirement.

---

## Changing Source

If the source image intentionally changes, start a new editor session.

Do not mutate a live session's external source reference and assume history/transforms automatically map to a different image.

---

## Navigation Lifecycle

A fullscreen route is generally the simplest integration:

```text
caller
  ↓
Navigator.push
  ↓
ProImageEditor
  ↓
Done -> return result
Cancel -> return null
```

This keeps transient editor state inside one route lifetime.

---

## Cancel vs Done

### Cancel

Expected application semantics:

```text
discard session result
do not overwrite source
pop null/cancel result
```

### Done

Expected:

```text
generate once
validate result
return it
```

Do not mutate the original persistent media before final completion unless that is explicitly the product's destructive-editing model.

---

## Original Safety

Production default:

```text
original.ext
edited-new.ext
```

rather than:

```text
overwrite original immediately
```

Benefits:

- rollback;
- re-editing;
- failure recovery;
- quality preservation;
- easier upload retry.

Allow explicit overwrite only when UX clearly communicates it and atomic persistence is implemented.

---

## File I/O

The editor completion API returns bytes.

Persistence is an application responsibility.

Native example flow:

```text
Uint8List
   ↓
write once to final/temp application file
   ↓
rename/commit atomically if required
```

Avoid:

```text
write temp A
read temp A
write temp B
read temp B
upload
```

when direct byte handling suffices.

---

## Temporary Files

No current requirement was established that normal image-editor operation writes source/output through app-visible temporary files.

Do not add a temp-file cleanup system merely because this is an image editor.

State-history `toFile` or app-specific persistence can create files; the application owns their retention/cleanup policy.

---

## Web File I/O

Web does not expose native `dart:io File` semantics.

Model:

```text
input
 -> Uint8List / asset / network

output
 -> Uint8List
 -> browser Blob/download/upload
```

The host application should own download naming and Blob/Object-URL lifecycle if it creates them.

---

## Upload After Export

Recommended architecture:

```text
Editor
   ↓
Uint8List result
   ↓
Persistence / Upload service
   ↓
remote storage
   ↓
database metadata
```

Do not make the image editor responsible for cloud state.

---

## Upload Performance

#### Problem

Editor appears to take 15 seconds to "finish."

#### Mechanism

Application awaits:

```text
export
+
cloud upload
+
database
+
AI moderation
```

inside `onImageEditingComplete`.

#### Detection

Time each stage separately.

#### Fix

If product semantics allow:

```text
await export
pop editor
show upload progress in destination screen
upload asynchronously through application layer
```

#### Tradeoff

The destination UI now needs upload retry/progress state.

#### Verification

Measure editor Done latency independently from upload latency.

---

## Upload Retry

Upload retry should be idempotent.

Do not re-run the editor export merely because the network upload failed.

Keep:

```text
final encoded output
```

or persisted local file until upload succeeds/aborts according to product policy.

---

## Image Compression

Avoid:

```text
editor JPEG encode
   ↓
app JPEG re-compress
   ↓
server JPEG re-compress
```

unless each stage has a defined purpose.

Choose the desired editor output or perform exactly one deliberate downstream compression step.

Repeated lossy compression compounds artifacts.

---
