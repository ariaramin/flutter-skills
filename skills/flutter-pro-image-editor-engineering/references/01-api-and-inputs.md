# API, Architecture, and Inputs

## Contents

- Package architecture and pixel/state model
- Current main API, configuration, and completion callbacks
- Basic production and persistence patterns
- File, memory, network, Web, and safe-byte-array sources
- Source-selection and byte-copy rules

## Package Architecture

At a practical level:

```text
Source image
   |
   v
EditorImage
   |
   +--> memory bytes
   +--> file
   +--> asset
   +--> network
   |
   v
ProImageEditor
   |
   +--> source image preview
   |
   +--> layer model
   |     +-- TextLayer
   |     +-- EmojiLayer
   |     +-- PaintLayer
   |     +-- WidgetLayer
   |
   +--> transform state
   +--> filter/tune state
   +--> blur state
   +--> history
   |
   +--> paint editor
   +--> text editor
   +--> crop/rotate editor
   +--> tune editor
   +--> filter editor
   +--> blur editor
   +--> emoji editor
   +--> sticker editor
   |
   v
Content recorder / render capture
   |
   v
raw pixels / ui.Image
   |
   +--> Dart isolate on native
   |
   +--> Web Worker on Web
   |
   v
encoded output Uint8List
```

The editor session is predominantly non-destructive:

```text
source pixels
+
logical edit/layer state
+
history
```

are kept separately until output is generated.

Do not treat every gesture as rewriting the original encoded JPEG.

---

## Editing State vs Pixel State

Keep these concepts distinct.

### Source image

The encoded input:

```text
JPEG
PNG
other supported encoded image
```

### Decoded image

The in-memory pixel representation Flutter uses to render.

This can be dramatically larger than the encoded file.

### Editor state

Examples:

```text
crop transform
rotation
flip
blur amount
filters
tune values
layers
layer transforms
metadata
```

### Rendered preview

The image fitted into the current editor viewport.

A visually small preview does **not** necessarily imply a small source decode.

### Export

The final compositing/capture/encoding phase.

---

## Current Main API

Current image constructors:

```dart
ProImageEditor.memory(
  Uint8List byteArray, {
  Key? key,
  required ProImageEditorCallbacks callbacks,
  ProImageEditorConfigs configs = const ProImageEditorConfigs(),
})
```

```dart
ProImageEditor.file(
  dynamic file, {
  Key? key,
  ProImageEditorConfigs configs = const ProImageEditorConfigs(),
  required ProImageEditorCallbacks callbacks,
})
```

The `file` argument accepts the package/platform file abstraction or a path string where supported.

```dart
ProImageEditor.asset(
  String assetPath, {
  Key? key,
  ProImageEditorConfigs configs = const ProImageEditorConfigs(),
  required ProImageEditorCallbacks callbacks,
})
```

```dart
ProImageEditor.network(
  String networkUrl, {
  Key? key,
  Map<String, String>? networkHeaders,
  ProImageEditorConfigs configs = const ProImageEditorConfigs(),
  required ProImageEditorCallbacks callbacks,
})
```

Also current:

```text
ProImageEditor.autoSource(...)
ProImageEditor.blank(...)
```

There is a video constructor too, but video editing has additional lifecycle/native/export concerns and should use the package's current video-specific documentation.

---

## Core Configuration

Current `ProImageEditorConfigs` organizes configuration for areas including:

```text
theme
heroTag
i18n
mainEditor
paintEditor
textEditor
cropRotateEditor
filterEditor
tuneEditor
blurEditor
emojiEditor
stickerEditor
stateHistory
imageGeneration
helperLines
layerInteraction
dialogs
progress indicators
design mode
```

Do not flatten these into obsolete constructor arguments from old examples.

---

## Core Features

Current image-editor feature set includes:

```text
Paint
Text
Crop / Rotate / Flip
Perspective tilt/skew
Tune
Filters
Blur
Emoji
Stickers
Custom widget layers
Undo / Redo
Layer reordering
Layer selection
Multiselect
Zoom
Desktop interactions
Helper lines/snapping
```

Individual modules can be enabled/disabled/configured.

Disable tools that product UX does not need, primarily for:

```text
simpler UX
smaller testing surface
less accidental state complexity
```

Do not claim that disabling one toolbar button by itself creates a major runtime speedup.

---

## Current Completion APIs

Primary image callback:

```dart
onImageEditingComplete: (
  Uint8List bytes,
) async {
  // Handle generated output.
}
```

The callback is async-compatible.

The editor can keep its loading UI visible while awaited completion work runs.

The package also exposes:

```text
onCompleteWithParameters
```

for consumers needing richer completion information.

Use the simplest callback that provides the information the application actually needs.

---

## Main Editor Completion Configuration

Current `MainEditorConfigs` includes:

```text
captureImageOnDone
captureLayersOnDone
```

Current defaults:

```text
captureImageOnDone = true
captureLayersOnDone = false
```

Do not enable:

```text
captureLayersOnDone
```

merely because it exists.

Capturing individual layers creates extra raster/encoding output and is only useful when the caller consumes those images.

---

## Basic Production Pattern

For a normal route that returns edited bytes:

```dart
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:pro_image_editor/pro_image_editor.dart';

Future<Uint8List?> openImageEditor(
  BuildContext context, {
  required Uint8List sourceBytes,
}) {
  return Navigator.of(context).push<Uint8List>(
    MaterialPageRoute<Uint8List>(
      builder: (BuildContext context) {
        return _ImageEditorPage(
          sourceBytes: sourceBytes,
        );
      },
    ),
  );
}

class _ImageEditorPage extends StatefulWidget {
  const _ImageEditorPage({
    required this.sourceBytes,
  });

  final Uint8List sourceBytes;

  @override
  State<_ImageEditorPage> createState() =>
      _ImageEditorPageState();
}

class _ImageEditorPageState extends State<_ImageEditorPage> {
  bool _didComplete = false;

  @override
  Widget build(BuildContext context) {
    return ProImageEditor.memory(
      widget.sourceBytes,
      callbacks: ProImageEditorCallbacks(
        onImageEditingComplete: (
          Uint8List bytes,
        ) async {
          if (_didComplete || !mounted) {
            return;
          }

          _didComplete = true;
          Navigator.of(context).pop(bytes);
        },
      ),
    );
  }
}
```

The package has its own final-image processing guard.

The page-level `_didComplete` protects:

```text
navigation
upload scheduling
database mutation
analytics
```

from being duplicated by application-level orchestration.

---

## Post-Editor Persistence Pattern

Preferred:

```dart
final Uint8List? editedBytes =
    await openImageEditor(
  context,
  sourceBytes: sourceBytes,
);

if (editedBytes == null) {
  return;
}

await mediaRepository.save(
  editedBytes,
);
```

This separates:

```text
editor lifecycle
```

from:

```text
storage/upload/business lifecycle
```

If upload can take seconds, the user should not normally remain stuck behind the editor's Done loading overlay unless the product explicitly requires upload-before-close semantics.

---

## Input Sources

| Input | Use when | Memory / I/O characteristics | Platform notes |
|---|---|---|---|
| `memory` | Bytes already exist | Reuses caller's encoded `Uint8List` as source input | Excellent for Web browser file pickers |
| `file` | Native/desktop file already exists | Avoids caller manually reading bytes first; editor later obtains bytes internally | Not equivalent to zero-copy; Web native-file semantics differ |
| `asset` | Bundled editor source | Package loads asset bytes | Cross-platform |
| `network` | Hosted source is intended | Package fetches image bytes and retains them | Network latency precedes editing; auth headers supported |
| `autoSource` | App already has optional source abstraction | Chooses first available source according to current source priority | Prefer explicit constructor where clarity matters |
| `blank` | Creating artwork without source pixels | No external source image | Size determines working area |

---

## Source Selection Decision

### Existing native file

Prefer:

```dart
ProImageEditor.file(path, ...)
```

instead of:

```dart
final Uint8List bytes =
    await File(path).readAsBytes();

ProImageEditor.memory(bytes, ...);
```

when you do not otherwise need those bytes.

#### Why

The second pattern guarantees an application-owned encoded buffer before the editor performs its own loading/caching.

#### Limitation

The file source still becomes in-memory image data inside the editor.

It is not streaming/zero-copy editing.

---

## Existing `Uint8List`

Use:

```dart
ProImageEditor.memory(bytes, ...)
```

Do not write it to a temporary file only to reopen the same bytes unless:

- another API needs a file;
- memory lifetime must be reduced;
- platform integration specifically requires a path.

---

## Network Source

Use `.network` when online content itself is the natural source.

If the app already downloaded and retained the bytes for another reason, passing those existing bytes avoids a second network fetch.

Do not pre-download just because `.memory` looks "faster."

That shifts network work rather than removing it.

---

## Web Source

For browser-selected image files:

```text
browser picker
   ↓
Uint8List
   ↓
ProImageEditor.memory
```

is the robust model.

Do not assume native `dart:io File` semantics on Web.

---

## `EditorImage.safeByteArray`

The current source abstraction ultimately retrieves a `Uint8List` from:

```text
memory
asset
file
network
```

and can retain it for reuse.

Therefore performance reviews should inspect:

```text
how many encoded copies exist?
```

not just which constructor name appears.

---

## Avoid Large Source Copies

Be cautious with application code like:

```dart
final Uint8List copy1 =
    Uint8List.fromList(original);

final Uint8List copy2 =
    Uint8List.fromList(copy1);
```

for a 30 MB source.

Encoded bytes are smaller than decoded pixels, but multiple copies can still materially increase heap/RSS.

---
