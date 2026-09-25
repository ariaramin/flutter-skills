# Processing, Memory, and Export

## Contents

- Large-image memory estimation and resolution decisions
- Editor-open performance and processor architecture
- Isolate, Web Worker, and background generation settings
- Output formats, transparency, dimensions, and encoding
- Export performance, duplicate prevention, and error handling
- Image quality and re-editing strategy

## Large Images and Memory — HIGH PRIORITY

Compressed file size is not decoded-memory size.

Planning approximation:

```text
decoded bytes
≈
pixel width
×
pixel height
×
4
```

for a typical 32-bit RGBA representation.

Examples:

```text
12 MP ≈ 48 MB raw pixels
24 MP ≈ 96 MB raw pixels
48 MP ≈ 192 MB raw pixels
```

These numbers are approximate.

Actual process memory also includes:

```text
encoded source
ui.Image resources
Flutter texture/image resources
layer widgets
history objects
history/background screenshots
raw export buffer
encoded output
temporary worker messages
application state
```

---

## Large Image Problem

#### Problem

The editor crashes, pauses, or creates severe memory pressure when opening a 24/48 MP image.

#### Mechanism

Current image decoding determines the intrinsic source image from its full image bytes before fitting the logical preview to the screen.

A small on-screen preview does not imply the original image was decoded as a 1000 px thumbnail.

#### Detection

Record:

```text
source width/height
encoded byte length
editor-open duration
DevTools memory
process RSS
image allocations
```

Test one source at increasing resolutions.

#### Fix

First ask:

```text
What output resolution does the product actually require?
```

If the product only exports a 1600-2000 px social image, pre-resizing a 48 MP source before editing can save enormous memory.

If original/high-resolution output is required, preserve the original and test whether the target devices can tolerate the current editing path.

#### Tradeoff

Pre-resizing permanently removes source detail for that editing session.

Do not reduce resolution when the product needs:

- print output;
- close crop flexibility;
- archival-quality output;
- large re-editable originals.

#### Verification

Compare:

```text
open latency
peak RSS
UI smoothness
export duration
visible quality
final dimensions
```

before and after.

---

## Preview vs Source Resolution

The editor computes a logical fitted size for the viewport.

This means:

```text
preview geometry
!=
source pixel dimensions
```

Do not write custom crop/layer code that assumes:

```text
screen coordinate == source pixel coordinate
```

Use package APIs/history/transforms.

---

## Preview vs Export

Current final generation uses:

```text
rendered editor state
+
pixel ratio
+
maxOutputSize
```

rather than simply saving the visible logical-size widget as-is.

The current default output bound is:

```text
Size(2000, 2000)
```

with aspect-ratio containment.

Always choose output requirements explicitly for products where dimensions matter.

---

## Large Source Decision Framework

### Keep full-resolution source

Use when:

- high-resolution final output matters;
- crop flexibility matters;
- memory profiling passes on supported devices.

### Pre-resize before editor

Use when:

- final product resolution is bounded well below source;
- original source is preserved elsewhere;
- editor responsiveness/memory matters more than unused pixels.

### Preserve original + edit smaller derivative

Use when:

- product allows lower-resolution final edits;
- original must remain available independently.

Do **not** claim that current package automatically provides a low-resolution-edit/high-resolution-reconstruction pipeline from the untouched original unless the exact workflow is verified for the required edits.

---

## Editor Open Performance

Likely high-value phases:

```text
load source bytes
decode image
obtain source dimensions
create preview/image resources
initialize state/history
initialize background processor infrastructure
first editor layout
```

---

## Editor Open Problem

#### Problem

Navigation animation hitches when opening the editor.

#### Mechanism

Source decode, editor construction, and worker/isolate startup can coincide with the route transition.

#### Detection

Profile:

```text
route push
first editor frame
CPU timeline
memory
```

#### Fix

- do not duplicate source bytes immediately before route push;
- keep source preparation outside route animation where practical;
- use current `ProcessorConfigs.initializationDelay` when profiling proves processor startup is colliding with transition animation;
- avoid application-side synchronous decoding/metadata parsing at the same moment.

#### Tradeoff

Delaying processors can postpone when background generation becomes available.

#### Verification

Compare route-transition p99 and first-edit readiness.

---

## Processor Architecture

Current generation supports:

```text
native Flutter targets
 -> Dart isolates

Web
 -> Web Workers where supported
```

Configuration is exposed through:

```text
ImageGenerationConfigs.processorConfigs
```

with current concepts including:

```text
processorMode
numberOfBackgroundProcessors
maxConcurrency
initializationDelay
```

---

## Processor Defaults

Current defaults are conservative:

```text
numberOfBackgroundProcessors = 2
maxConcurrency = 1
processorMode = auto
```

Do not change:

```text
processorMode = maximum
```

merely because the device has many cores.

Maximum concurrency can increase:

```text
CPU contention
memory
raw pixel buffers
thermal load
battery
```

and can make interaction worse.

---

## Background Processing

### `enableIsolateGeneration`

Current default:

```text
true
```

It allows image-processing/encoding work to be delegated away from the UI isolate.

Keep it enabled unless:

- platform compatibility requires otherwise;
- an isolate/worker bug is being diagnosed;
- measurements establish the overhead exceeds the benefit for the workload.

---

## `enableBackgroundGeneration`

The package can generate/update an export candidate in the background after edits.

This trades:

```text
more work during editing
```

for:

```text
faster final Done latency
```

---

## Background Generation Recommendation

#### Problem

Pressing Done causes a long freeze/wait.

#### Mechanism

Final composition + encoding has not yet been prepared.

#### Detection

Measure:

```text
time from Done tap to completion callback
```

with background generation enabled/disabled.

#### Fix

Use the package's background generation on platforms/build modes where supported.

#### Tradeoff

Background generation consumes CPU/memory during the editing session and can compete with UI if image/layer complexity is high.

#### Verification

Measure both:

```text
interaction frame p99
Done latency
peak memory
```

Do not optimize Done latency by silently degrading gesture smoothness.

---

## Background Processing Is Not Free Memory

Even when encoding runs on a worker:

```text
Flutter render capture
 -> ui.Image
 -> raw pixels
 -> worker/isolate
 -> encoded bytes
```

still requires buffers.

Moving encoding off the UI isolate improves CPU scheduling.

It does **not** make a 30 MB raw image become zero bytes.

---

## ImageGenerationConfigs

Important current options include:

```text
cropToImageBounds
cropToDrawingBounds
allowEmptyEditingCompletion
enableIsolateGeneration
enableBackgroundGeneration
enableUseOriginalBytes
singleFrame
captureImageByteFormat
customPixelRatio
jpegQuality
pngLevel
pngFilter
jpegChroma
jpegBackgroundColor
outputFormat
processorConfigs
maxOutputSize
maxThumbnailSize
```

Always re-check the installed source before copying exact defaults.

---

## Current Output Defaults

Current source defaults include:

```text
outputFormat = OutputFormat.jpg
jpegQuality = 100
pngLevel = 6
maxOutputSize = Size(2000, 2000)
maxThumbnailSize = Size(100, 100)
enableIsolateGeneration = true
enableUseOriginalBytes = true
```

Do not assume those defaults are ideal for every product.

---

## Output Formats

Current `OutputFormat` includes:

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

Do not invent:

```text
OutputFormat.webp
```

for the current API.

---

## JPG

Use when:

- photographic output;
- transparency not needed;
- smaller encoded output is useful.

JPEG is lossy.

Repeated JPEG export → re-import → export can accumulate quality loss.

---

## PNG

Use when:

- alpha matters;
- graphics/text require lossless output;
- exact pixel preservation is important.

PNG often produces larger outputs and can cost more encode CPU for photographic content.

---

## Transparency Configuration

For transparency-sensitive PNG output, current source should be checked for `captureImageByteFormat`.

Current 13.3.1 source has a documentation/default inconsistency.

A deliberate current configuration is:

```dart
import 'dart:ui' as ui;

import 'package:pro_image_editor/pro_image_editor.dart';

const ProImageEditorConfigs transparentPngEditorConfigs =
    ProImageEditorConfigs(
  imageGeneration: ImageGenerationConfigs(
    outputFormat: OutputFormat.png,
    captureImageByteFormat:
        ui.ImageByteFormat.rawStraightRgba,
  ),
);
```

Reason:

```text
rawStraightRgba
```

avoids treating premultiplied RGBA as straight alpha data in later encoding.

Revalidate this field against the installed version because the package's inline prose and constructor default currently disagree.

---

## Do Not Use `ImageByteFormat.png` for Capture

Current 13.3.1 `ImageGenerationConfigs` constructor rejects:

```dart
ui.ImageByteFormat.png
```

for the internal capture-byte-format option.

That option concerns the intermediate raw capture representation, not the final `OutputFormat`.

Final PNG output is selected with:

```dart
outputFormat: OutputFormat.png
```

---

## JPG Transparency

JPEG cannot preserve alpha.

Current image-generation configuration provides:

```text
jpegBackgroundColor
```

for flattening transparent pixels.

Choose this deliberately for transparent artwork.

---

## Output Resolution

`maxOutputSize` is a quality/performance control.

Higher output bounds can increase:

```text
render capture resolution
raw pixel memory
encoding CPU
output size
worker transfer size
```

Do not set:

```text
Size.infinite
```

because "maximum quality" sounds desirable without measuring the memory implications.

---

## Output Resolution Decision

Use the minimum resolution that satisfies product requirements.

Examples of requirement categories:

```text
small avatar
social share
screen screenshot
document scan
print-quality export
archival original
```

They should not all use the same output size.

---

## Export Pipeline — HIGH PRIORITY

Conceptually:

```text
Done
 ↓
validate final state
 ↓
reuse original bytes?
 ├── yes, if unchanged/compatible
 │      ↓
 │    return
 │
 └── no
        ↓
   reuse pre-generated background result?
        │
        ├── yes -> return/convert
        │
        └── no
             ↓
       capture editor render
             ↓
          ui.Image
             ↓
        raw pixel bytes
             ↓
      isolate / Web Worker
             ↓
         encode image
             ↓
         Uint8List
             ↓
         callback
```

---

## Original-Bytes Optimization

Current:

```text
enableUseOriginalBytes = true
```

allows an unmodified image to return existing source bytes when:

- format is already compatible;
- dimensions fit output constraints;
- no re-render is required.

This can be a major optimization.

---

## Original-Bytes Tradeoff

Returning source bytes preserves:

```text
encoded source exactly
```

including metadata inside those bytes.

If privacy policy requires:

```text
strip GPS/EXIF every time
```

then returning original bytes may violate that policy.

In that case force a deterministic re-encode/post-processing path designed around that requirement.

---

## Export Performance

#### Problem

Done causes a freeze or memory spike.

#### Mechanism

Export can allocate:

```text
rendered ui.Image
raw RGBA buffer
worker message
encoded output
possibly source bytes at same time
```

while also spending CPU on encoding.

#### Detection

Measure:

```text
Done-to-callback duration
UI frame times
CPU
peak memory/RSS
output dimensions
output byte length
```

#### Fix

- keep isolate/Web Worker generation enabled;
- use an appropriate `maxOutputSize`;
- avoid unnecessary captured layers;
- avoid app-side output copying;
- avoid immediate base64;
- do not immediately re-decode the exported image unless UI genuinely needs it;
- process one huge export at a time.

#### Tradeoff

Reducing resolution or JPEG quality affects image fidelity.

Background generation increases work during editing.

#### Verification

Compare:

```text
peak RSS
Done latency
interaction p99
final quality
output size
```

---

## Do Not Immediately Re-decode Export

Anti-pattern:

```text
editor exports Uint8List
   ↓
Image.memory bytes for invisible preview
   ↓
decode again
   ↓
write bytes to disk
   ↓
upload same bytes
```

If the UI does not display the generated image before leaving:

```text
persist/upload bytes directly
```

and let later UI load them only when needed.

---

## Avoid Base64

Bad:

```dart
final String encoded =
    base64Encode(editedBytes);
```

unless an API explicitly requires base64.

#### Why

Base64:

```text
increases payload size
allocates a large String
creates another representation
requires encode CPU
```

#### Preferred

Send/write binary bytes.

#### Verification

Compare peak heap/RSS and upload payload.

---

## Avoid Duplicate Output Copies

Prefer passing the returned `Uint8List` by reference between immediate layers of the app.

Do not create:

```dart
Uint8List.fromList(output);
```

unless mutation/isolation requires an independent buffer.

---

## Export Callback Design

The official completion callback can be awaited.

Use this intentionally.

### Good to await

Examples:

```text
small atomic file write needed before result is valid
tiny database operation linking local file
critical validation
```

### Usually move outside editor

Examples:

```text
large cloud upload
AI processing
remote moderation
large thumbnail pipeline
long database workflow
analytics pipeline
```

These are not necessary for the image editor's render lifecycle.

---

## Duplicate Export Prevention

The package currently guards its final generation internally.

Your app should still protect external side effects.

Common duplicate sources:

```text
double navigation listener
two completion consumers
route restoration
state event replay
upload retry without idempotency
```

Use:

```text
one editor result
+
one route completion
+
idempotent persistence/upload
```

---

## Export Error Handling

Never silently discard generation errors.

If image output is required:

```text
generation fails
   ↓
keep/recover editor state if possible
   ↓
show retryable error
```

Do not:

```text
pop editor
then discover no valid result exists
```

unless cancellation/degraded behavior is an intentional product decision.

---

## Image Quality

Quality is controlled by several independent factors:

```text
source resolution
output max dimensions
crop amount
filter/render quality
lossless vs lossy encoding
JPEG quality
repeated compression generations
```

---

## Re-editing

Best quality architecture:

```text
original source
+
persisted logical editor state where supported
```

instead of:

```text
JPEG export
 -> reopen JPEG
 -> JPEG export
 -> reopen
 -> JPEG export
```

Every lossy generation can reduce quality.

---
