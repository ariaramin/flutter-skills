# Platform, Privacy, and Performance

## Contents

- Metadata, EXIF/GPS privacy, color profiles, and sensitive media
- Web Worker behavior, browser memory, and Web file semantics
- Mobile and desktop constraints, responsive layout, localization, RTL, and accessibility
- State-management integration, coordination, autosave, and persisted-state security
- Error classification, OOM behavior, multiple editors, and batch editing
- Performance rules and profiling workflow

## Metadata and Privacy — HIGH PRIORITY

Treat user media as sensitive data.

Potentially sensitive information includes:

```text
image pixels
EXIF GPS
capture timestamp
device/camera data
file names
file paths
user-added text
editor history
custom metadata
```

---

## Current Metadata Behavior

There are two materially different current paths.

### Edited / re-encoded result

Current conversion reconstructs encoder image data from raw pixels and does not pass source:

```text
EXIF
ICC profile
```

into the new encoded image.

Therefore original EXIF/GPS is not propagated by this normal conversion path.

### Unchanged original-byte result

With:

```text
enableUseOriginalBytes = true
```

the package may return the original encoded bytes when no edit/reformat/resize is required.

Those bytes retain whatever metadata they already contained.

---

## Privacy Rule

Never write:

```text
pro_image_editor strips metadata
```

as a universal guarantee.

Also never write:

```text
pro_image_editor preserves EXIF
```

as a universal guarantee.

Instead:

```text
edited re-encode path
 -> metadata not propagated by current converter

unchanged original-byte optimization
 -> original metadata can survive
```

---

## Strict Metadata-Removal Workflow

If product requirements say:

```text
GPS/EXIF MUST be removed
```

do not rely on whether the user happened to edit the image.

Use a deterministic final metadata-sanitization/re-encode process and test the output with representative source files.

Also consider disabling/bypassing the original-byte optimization for that workflow.

---

## Color Profiles / HDR

Current image re-encoding path does not establish a documented guarantee for retaining:

```text
ICC profile
wide color
HDR metadata
```

Do not use this package alone for a color-managed professional-photo workflow without validation.

Test:

```text
Display-P3
ICC-tagged images
HDR sources
```

if these are product requirements.

---

## Privacy Logging

Safe diagnostics:

```text
source dimensions
source encoded byte length
editor duration
history count
layer count
output dimensions
output byte length
export duration
error type
platform
```

Avoid:

```text
raw image bytes
base64 output
full private file path
EXIF dump
user-entered sensitive text
network authorization headers
```

---

## Sensitive Media

For:

```text
identity documents
medical images
financial documents
private screenshots
```

review:

```text
temporary retention
history persistence
crash-report attachments
upload policy
analytics
metadata
local cache
```

independently.

The editor should not silently turn sensitive content into diagnostic data.

---

## Web

Current package supports Web and bundles Web Worker assets.

Important differences:

```text
no normal native File I/O semantics
browser memory limits
browser Worker availability/security
browser download/upload controlled by app
emoji/font rendering differences
large Uint8List/Canvas allocations
```

---

## Web Worker Behavior

Use the package's built-in worker architecture.

Do not wrap editor internals in generic:

```dart
compute(...)
```

and assume Web gains another isolate.

The package explicitly implements Web Workers itself.

---

## Web Worker Fallback

Worker availability/build configuration can affect whether processing happens off the UI thread.

Therefore test:

```text
Chrome
Safari
Firefox/Edge if product supports them
Wasm build if product uses it
mobile browsers
```

with:

```text
large image
filter
export
```

rather than assuming desktop Chrome represents all Web users.

---

## Web Memory

#### Problem

Tab crashes/reloads when editing large photos.

#### Mechanism

Browser process can simultaneously hold:

```text
encoded Uint8Array
decoded image/canvas
Flutter render resources
raw worker transfer data
encoded result
history
```

#### Detection

Use browser memory/performance tools and test real mobile browsers.

#### Fix

- bound source resolution where product allows;
- bound output size;
- avoid multiple simultaneous editor sessions;
- avoid duplicate JS/Dart byte representations;
- dispose Blob URLs created by the application;
- serialize huge exports rather than running several concurrently.

#### Tradeoff

Lower resolution reduces output detail.

#### Verification

Repeat 5-10 open/export/close cycles and watch tab memory.

---

## Android / iOS

The editor itself does not require additional normal setup beyond package integration for standard image workflows.

Platform-specific media acquisition remains outside this package.

Examples:

```text
camera
photo picker
storage permission
```

belong to whichever app/package obtains the image.

Do not request obsolete Android storage permissions merely because an image editor exists.

---

## Mobile Memory

Camera photos can be:

```text
12 MP
24 MP
48 MP+
```

while compressed JPEG size appears deceptively small.

Always inspect dimensions before editor creation if the product accepts arbitrary external images.

---

## macOS / Windows / Linux

The editor is package-declared for desktop.

Desktop considerations:

```text
large resizable editor viewport
high-DPI monitor
mouse
keyboard shortcuts
layer interaction
large available memory but potentially much larger paint area
```

Do not assume desktop always performs better merely because the machine has more RAM.

4K/5K editor surfaces can increase raster/blur work materially.

---

## Keyboard Shortcuts

Current package provides keyboard handling/shortcut support in the main editor and relevant standalone sub-editors.

Recent versions expose:

```text
onKeyboardEvent
enableKeyboardShortcuts
```

for supported standalone tools.

If embedding the editor in a desktop application with global shortcuts:

- avoid conflicting key bindings;
- respect consumed events;
- test undo/redo/delete/rotate/flip flows.

---

## Responsive Layout

Test:

```text
small phone portrait
phone landscape
tablet
split-screen
desktop window
narrow browser
large 4K window
```

The package is responsive, but custom toolbars/widgets can break its layout assumptions.

Do not replace adaptive package UI with fixed pixel widths without testing.

---

## Orientation / Resize

Editor state should be considered independent from the current physical viewport.

Avoid app code that persists screen-coordinate positions as though they were image coordinates.

After:

```text
orientation
window resize
split screen
```

verify:

```text
selection
crop
layer positions
zoom
toolbars
```

with integration tests.

---

## Localization

Current configuration exposes i18n strings for editor modules.

Prefer supplying localized text through:

```text
ProImageEditorConfigs.i18n
```

rather than editing package widgets.

Do not assume that package strings automatically select every locale your app supports.

---

## RTL

Localization support does not by itself prove every custom editor layout is perfect under RTL.

If shipping RTL languages, explicitly test:

```text
toolbar order
text alignment
dialogs
crop controls
custom widgets
desktop shortcuts
```

Do not make an unverified universal RTL guarantee.

---

## Theming

Use package configuration for:

```text
theme
design mode
styles
icons
custom widgets
```

rather than wrapping/rebuilding the entire editor in high-frequency external theme state.

Global app theme changes legitimately rebuild dependent UI; do not optimize them away incorrectly.

---

## Accessibility

When replacing built-in UI:

MUST preserve:

```text
button semantics
labels/tooltips
focusability
reasonable hit targets
keyboard traversal
text readability
```

Do not remove semantics or text scaling solely for performance.

Test:

```text
screen reader
large text
keyboard-only desktop
high contrast/theme requirements
```

where relevant.

---

## Current Accessibility Caveat

The package has changed some text-editor scaling behavior historically for visual consistency.

Do not assume custom editor text fields automatically match every app accessibility policy.

Run product-specific accessibility tests.

---

## State Management Integration

Framework-neutral architecture:

```text
App state
   |
   | open editor command
   v
Editor route
   |
   | internal transient editing state
   v
Result / Cancel
   |
   v
App state
```

Do not mirror every editor gesture into:

```text
Bloc
Riverpod
Redux
Provider
database
```

unless a real requirement demands live external persistence.

---

## Editor Coordinator

A coordinator is useful when several screens share:

- source preparation;
- standard config;
- output policy;
- metadata sanitation;
- local persistence;
- upload orchestration.

Conceptual:

```text
UI
 ↓
ImageEditorCoordinator
 ↓
ProImageEditor route
 ↓
Uint8List / state result
 ↓
MediaRepository
```

Do not build this abstraction for one simple screen that opens the editor once.

---

## Autosave

Current history import/export can support application-level drafts.

Do not autosave the entire editor history:

```text
on every pointer move
```

That can cause:

```text
serialization
large allocations
disk I/O
jank
```

Use:

```text
debounced checkpoints
interaction-end callbacks
explicit Save Draft
app lifecycle checkpoint
```

depending on product needs.

---

## Persisted State Security

Editor history can contain:

```text
user text
layers
custom metadata
sticker identifiers
source references
```

Treat the persisted state as potentially sensitive.

Do not log it wholesale.

---

## State Source Dependency

A serialized editing history is meaningful relative to:

```text
the source image
the editor version
custom widget/sticker loaders
app schema
```

Persist enough identifiers to validate those dependencies before restoring.

---

## Import Failure

If a saved state was created by a materially incompatible package version:

```text
detect schema/version mismatch
```

and provide an application policy:

```text
migrate
open flattened final image
start new edit
show draft incompatibility
```

Do not deserialize blindly and crash.

---

## Error Handling

Realistic error categories:

```text
source load/fetch failure
corrupt/unsupported encoded image
decode failure
memory pressure/OOM
generation/encoding failure
file persistence failure
Web worker/browser failure
callback/application failure
incompatible persisted state
custom WidgetLayer restore failure
```

---

## Error Classification

### Configuration/programmer error

Examples:

```text
invalid output config
wrong history/widget loader
bad custom widget assumptions
```

Fix code.

Do not retry forever.

### Source/data error

Examples:

```text
corrupted image
unsupported content
failed network fetch
```

Allow user to choose another source/retry fetch.

### Resource error

Examples:

```text
image too large
browser memory failure
native OOM
```

Offer lower-resolution workflow where appropriate.

### Persistence/network error

The image may already have exported successfully.

Retry persistence/upload, not the entire edit/export pipeline unnecessarily.

---

## OOM Reality

Do not promise:

```text
catch OutOfMemoryError and continue safely
```

for all native/browser memory failures.

Process/browser OOM can terminate the app/tab before Dart recovers.

Prevention is more reliable:

```text
bound resolution
bound history
bound concurrency
avoid duplicate buffers
```

---

## Multiple Editors

Avoid keeping several live high-resolution editor routes/widgets simultaneously.

Each may retain:

```text
source bytes
decoded image
layers
history
background processors
render resources
```

Serialize sessions on memory-constrained devices unless simultaneous editors are a deliberate tested product requirement.

---

## Batch Editing

`ProImageEditor` is fundamentally a single-editor/session workflow.

For app-level multiple-image editing:

```text
image 1
 -> edit/export
 -> release session
image 2
 -> edit/export
```

is the conservative memory architecture.

Do not open ten 48 MP editors concurrently.

---

## Performance Rules — HIGH PRIORITY

### Editor Open

- inspect source dimensions before opening when arbitrary external media is accepted;
- do not create redundant source byte copies;
- avoid app-side decode before package decode unless preprocessing is intentional;
- profile worker initialization against route transition;
- keep initial custom UI lightweight.

### Interaction

- no network/file/database work in gesture callbacks;
- no full history serialization per pointer event;
- keep parent state observers away from whole-editor rebuilds;
- avoid heavyweight custom widget layers;
- profile blur and very large layer counts;
- use package layer/filter merging only where semantics permit.

### Memory

- estimate decoded source memory;
- limit history according to product need;
- avoid multiple full-resolution sessions;
- avoid retaining source + several cloned source buffers + several output copies;
- release route/result references when no longer needed.

### Export

- keep worker/isolate generation enabled by default;
- bound output dimensions;
- choose output format deliberately;
- avoid layer capture unless consumed;
- prevent duplicate app-side side effects;
- avoid immediate re-decode/base64.

### File I/O

- use direct file source on native when you already have a file;
- use existing bytes when already in memory;
- write output only as many times as necessary;
- separate browser Blob/download code from editor logic.

### Large Images

- preserve original externally if quality matters;
- pre-resize only when product output does not need source resolution;
- test actual 12/24/48 MP photos;
- use conservative worker concurrency.

### Web

- use bytes for browser-picked local files;
- test Worker fallback;
- profile mobile browser memory;
- avoid simultaneous large exports.

---

## Profiling Workflow

Use:

```text
Reproduce issue
        ↓
profile editor open / interaction / export separately
        ↓
identify UI vs raster vs CPU vs memory
        ↓
inspect source dimensions
layer count
history count
output size
worker config
        ↓
change one dominant factor
        ↓
retest same scenario
        ↓
validate target device/browser
```

---

## Profile Editor Open

Record:

```text
source dimensions
encoded bytes
route push time
first usable editor frame
UI frame p95/p99
memory before
peak memory
```

Compare:

```text
2 MP
12 MP
24 MP
48 MP
```

where product accepts those sizes.

---

## Profile Interaction

Test independently:

```text
freehand drawing
eraser
layer scaling
layer rotation
crop pinch
blur slider
filter scrolling/selection
text editing
undo/redo
```

A fast crop editor does not prove a 100-layer paint session is fast.

---

## Profile Export

Record:

```text
source dimensions
configured output size
output format
layer count
history count
background generation on/off
Done-to-result duration
peak memory
UI long frames
encoded output bytes
```

---

## UI vs Raster Diagnosis

### UI thread slow

Investigate:

```text
external state callbacks
custom layer widgets
large layer/history operations
custom persistence
serialization
paint-path processing
application logging
```

### Raster slow

Investigate:

```text
blur
large editor surface
many visible layers
complex transformed paint paths
large transparent layers
heavy custom widget layers
```

### Memory spikes

Investigate:

```text
source resolution
raw export buffer
history
layer captures
duplicate Uint8Lists
several simultaneous editors
```

---

## Debug vs Profile

Do not optimize based solely on:

```text
debug FPS
debug hot reload behavior
debug Web Worker policy
```

Current image generation configuration itself can differ around Web debug background generation.

Use:

```text
profile/release-like build
```

for performance conclusions.

---

## Performance Test Matrix

| Scenario | What to measure |
|---|---|
| Small 1-2 MP JPG | baseline open/export |
| 12 MP phone photo | normal production memory |
| 24 MP photo | high-resolution stress |
| 48 MP photo | extreme source/OOM behavior |
| Transparent PNG | alpha/export correctness |
| Panorama | unusual dimensions/memory |
| 50+ simple layers | layer interaction |
| Many paint strokes | path/history/eraser |
| Full-image blur | raster performance |
| Long undo session | history memory |
| Web large image | Worker/browser memory |
| Low-end mobile | smoothness/OOM |
| 4K desktop window | raster/blur/layout |
| Repeated open/export/close | leak/retention behavior |

No universal millisecond/memory thresholds apply.

Establish product budgets for supported hardware.

---
