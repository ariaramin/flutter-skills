# Source reference: Resizing, quality, formats, memory, streaming, persistence, lifecycle, permissions, security

## Table of contents

- [36. Image resizing](#36-image-resizing)
- [37. `imageQuality`](#37-imagequality)
- [38. Choosing optimization strategy](#38-choosing-optimization-strategy)
- [39. Image formats](#39-image-formats)
- [40. Orientation and EXIF](#40-orientation-and-exif)
- [41. Large image memory model](#41-large-image-memory-model)
- [42. Preview performance](#42-preview-performance)
- [43. `File` vs bytes vs streams](#43-file-vs-bytes-vs-streams)
- [44. Avoid byte round trips](#44-avoid-byte-round-trips)
- [45. Efficient stream upload boundary](#45-efficient-stream-upload-boundary)
- [46. Large videos](#46-large-videos)
- [47. Pick multiple images efficiently](#47-pick-multiple-images-efficiently)
- [48. Mixed media selection](#48-mixed-media-selection)
- [49. Video duration](#49-video-duration)
- [50. Persistent storage](#50-persistent-storage)
- [51. Filename handling](#51-filename-handling)
- [52. Temporary-file cleanup](#52-temporary-file-cleanup)
    - [Plugin/platform-owned picker result](#pluginplatform-owned-picker-result)
    - [Application-created temporary transform](#application-created-temporary-transform)
    - [Application-owned persisted file](#application-owned-persisted-file)
- [53. Upload pipeline](#53-upload-pipeline)
- [54. Compression strategy](#54-compression-strategy)
- [55. CPU-heavy post-processing](#55-cpu-heavy-post-processing)
- [56. Lifecycle-safe widget use](#56-lifecycle-safe-widget-use)
- [57. Re-entrancy](#57-re-entrancy)
- [58. Cancellation](#58-cancellation)
- [59. Error classification](#59-error-classification)
- [60. Permission matrix](#60-permission-matrix)
- [61. Permission strategy](#61-permission-strategy)
- [62. Security model](#62-security-model)
- [63. Client validation](#63-client-validation)
- [64. Server validation](#64-server-validation)
- [65. Privacy](#65-privacy)
# 36. Image resizing

`pickImage`, `pickMultiImage`, `pickMedia`, and `pickMultipleMedia` expose:

```
maxWidth
maxHeight

```

When supported by the platform implementation, these constrain output dimensions before the selected image is returned.

Use picker-level resizing when:

- the product never needs the original dimensions
- upload requirements are known
- output only needs a moderate display size
- supported platforms match the feature requirements

Do not use picker-level resize as the only enforcement mechanism for a strict cross-platform media contract because desktop implementations currently ignore these parameters.

If exact dimensions are a business/API requirement, validate or post-process the returned media.

---

# 37. `imageQuality`

Quality is generally expressed in the range:

```
0 .. 100

```

where higher values mean higher encoder quality.

Do not infer:

```
imageQuality: 50

```

means:

```
50% of original file size

```

Compression is nonlinear and depends on:

- content complexity
- source format
- encoder
- dimensions
- metadata
- implementation

`imageQuality` does not inherently reduce pixel dimensions.

The web implementation explicitly notes that quality handling only affects JPG/WebP and does not apply to GIF.

Repeated lossy JPEG recompression can degrade quality. Avoid:

```
picker compression
→ another client compression
→ server recompression

```

unless every transformation is intentional.

---

# 38. Choosing optimization strategy

| StrategyQualityCPUOutput sizeControlBest use |                             |                         |                    |          |                                                         |
| -------------------------------------------- | --------------------------- | ----------------------- | ------------------ | -------- | ------------------------------------------------------- |
| Keep original                                | Highest preservation        | Lowest client transform | Largest            | Low      | Archival, editing, unknown future needs                 |
| `maxWidth` / `maxHeight`                     | Reduced resolution          | Resize/encode cost      | Often much smaller | Moderate | Product never needs full-resolution original            |
| `imageQuality`                               | Potential lossy degradation | Encode cost             | Often smaller      | Moderate | JPEG/WebP bandwidth optimization where supported        |
| Explicit post-processing                     | Configurable                | Potentially highest     | Configurable       | Highest  | Exact dimensions, metadata policy, format normalization |

Do not optimize by habit.

Choose based on:

- backend constraints
- visual quality requirements
- network conditions
- battery/thermal cost
- original-retention requirements
- supported platform consistency

---

# 39. Image formats

Never assume selected images are JPEG.

Depending on source/platform, users may select media such as:

```
JPEG
PNG
HEIC / HEIF
GIF
WebP

```

The iOS README specifically documents HEIC behavior. Historical platform support also includes WebP/GIF paths.

If the backend cannot ingest HEIC:

```
picker selection
→ detect/validate
→ explicitly normalize format
→ upload

```

Do not simply rename:

```
photo.heic

```

to:

```
photo.jpg

```

Changing an extension does not transcode media.

---

# 40. Orientation and EXIF

Do not assume the same metadata/orientation behavior across:

- camera photos
- gallery photos
- resized images
- recompressed images
- HEIC
- JPEG
- Android OEM camera apps
- iOS picker flows

If orientation correctness is product-critical, test:

- portrait rear-camera image
- portrait front-camera image
- landscape left/right
- gallery rotation
- resize/compression path
- upload/server re-encoding

on real devices.

Similarly, do not assume:

```
requestFullMetadata: false

```

means:

> all metadata and location information has been physically stripped from the media file.

It changes metadata-request behavior; it is not a universal privacy-sanitization API.

If the product requires EXIF/location stripping, explicitly transform the media and verify the resulting file.

---

# 41. Large image memory model

Encoded file size and decoded image memory are very different.

A compressed 8 MB image can decode to tens or hundreds of megabytes.

A useful engineering approximation for common 32-bit decoded pixels is:

```
decoded bytes ≈ width × height × 4

```

Example:

```
6000 × 4000 × 4
≈ 96 MB

```

before additional caches/overheads.

Flutter's official `Image` documentation states that rendered images are held uncompressed in memory and that a 3840×2160 32-bit image consumes over 30 MB. Flutter recommends `cacheWidth`/`cacheHeight` to decode images nearer the required display size.

---

# 42. Preview performance

Bad:

```
final bytes = await picked.readAsBytes();

setState(() {
  imageBytes = bytes;
});

return Image.memory(imageBytes!);

```

for every full-resolution camera image.

That creates:

1. an encoded `Uint8List`
2. a decoded image allocation
3. ImageCache residency
4. possibly additional state copies/rebuild effects

Prefer a file/blob-backed image provider and an appropriate decode size when possible.

Native:

```
Image.file(
  File(file.path),
  width: 240,
  height: 240,
  cacheWidth: 720,
  fit: BoxFit.cover,
)

```

The exact cache size should reflect:

```
display size × device pixel ratio

```

and product requirements rather than an arbitrary universal number.

Flutter documents that `cacheWidth` and `cacheHeight` can substantially reduce image-memory usage.

---

# 43. `File` vs bytes vs streams

Use this decision table.

| RepresentationMemoryWeb-safeUpload usePersistenceBest use |                       |                     |                                                     |                                                |                                            |
| --------------------------------------------------------- | --------------------- | ------------------- | --------------------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| `XFile`                                                   | Low until read/decode | Yes                 | Excellent boundary                                  | Needs explicit save/copy for durable ownership | Default picker result                      |
| `dart:io File`                                            | Low until read        | No                  | Good native upload source                           | Can represent durable native path              | Native-only APIs needing `File`            |
| `readAsBytes()`                                           | O(encoded file size)  | Yes                 | Poor for very large media unless API requires bytes | Bytes can be persisted manually                | Small files / APIs requiring full buffer   |
| `openRead()`                                              | Streamed              | Yes through `XFile` | Excellent for large uploads                         | Not durable by itself                          | Large images/video and streaming pipelines |

`XFile.openRead()` creates a stream for file contents. `readAsBytes()` reads the complete file into memory.

Default to `XFile`.

Convert only when another API actually requires another representation.

---

# 44. Avoid byte round trips

Reject flows like:

```
XFile
→ readAsBytes()
→ write temporary File
→ readAsBytes()
→ multipart upload

```

when the upload library can accept:

- a path
- `File`
- stream
- byte stream plus known length

Every unnecessary full read can create another allocation proportional to encoded media size.

The better conceptual flow is:

```
XFile
→ validate cheap metadata
→ optional required transform
→ stream upload

```

---

# 45. Efficient stream upload boundary

Use a transport-neutral upload object when the application's networking library supports streamed request bodies:

```
import 'dart:async';

import 'package:image_picker/image_picker.dart';

final class MediaUploadBody {
  const MediaUploadBody({
    required this.filename,
    required this.length,
    required this.stream,
    this.mimeType,
  });

  final String filename;
  final int length;
  final Stream<List<int>> stream;
  final String? mimeType;

  static Future<MediaUploadBody> fromXFile(XFile file) async {
    return MediaUploadBody(
      filename: file.name,
      length: await file.length(),
      stream: file.openRead(),
      mimeType: file.mimeType,
    );
  }
}

```

Usage:

```
final body = await MediaUploadBody.fromXFile(file);

await uploadClient.uploadMedia(
  filename: body.filename,
  contentLength: body.length,
  contentType: body.mimeType,
  body: body.stream,
);

```

Adapt this to the repository's existing HTTP client rather than introducing a new networking library solely for this pattern.

---

# 46. Large videos

Never do this for a large video unless required:

```
final Uint8List videoBytes = await video.readAsBytes();

```

A 500 MB encoded video requires roughly that order of encoded-data memory just for the byte buffer, before:

- player buffers
- thumbnail decoding
- request buffers
- other application memory

Prefer:

```
final size = await video.length();
final stream = video.openRead();

```

for upload systems that support streaming.

If a background upload must continue after process restart, first persist the media into application-owned durable storage because picker output may be temporary/session-scoped.

---

# 47. Pick multiple images efficiently

```
import 'package:image_picker/image_picker.dart';

Future<List<XFile>> pickProductImages(
  ImagePicker picker, {
  int maximum = 8,
}) async {
  final files = await picker.pickMultiImage(
    limit: maximum,
    requestFullMetadata: false,
  );

  if (files.length > maximum) {
    throw StateError(
      'Picker returned ${files.length} files; maximum is $maximum.',
    );
  }

  return files;
}

```

Do not immediately do:

```
final allBytes = await Future.wait(
  files.map((file) => file.readAsBytes()),
);

```

for a large batch.

Process incrementally.

For example:

```
for (final file in files) {
  final length = await file.length();

  if (length > maximumBytes) {
    continue;
  }

  await queueForUpload(file);
}

```

When transformations are expensive, use controlled concurrency based on profiling/device targets rather than firing an unbounded transformation for every selected asset.

---

# 48. Mixed media selection

```
final files = await picker.pickMultipleMedia(
  limit: 10,
);

```

For every result validate:

- allowed type
- encoded size
- image dimensions where relevant
- video duration where relevant
- backend compatibility

Do not assume:

```
file.name.endsWith('.jpg')

```

proves an image is valid JPEG.

Do not assume:

```
file.mimeType

```

is authoritative security validation either.

Use application/client validation for UX and early rejection, and server-side validation as the security boundary.

---

# 49. Video duration

For camera video:

```
await picker.pickVideo(
  source: ImageSource.camera,
  maxDuration: const Duration(minutes: 2),
);

```

is appropriate where supported.

For gallery selection:

```
maxDuration

```

must not be treated as a gallery-duration filter. Current `image_picker` documentation explicitly clarified this in 1.2.2.

If the backend permits videos up to two minutes:

```
pick gallery video
→ inspect duration with the repository's media metadata/player tooling
→ reject or offer trim flow when too long

```

---

# 50. Persistent storage

If media must survive:

- process restart
- application restart
- cache eviction
- delayed upload
- long-lived draft
- offline queue

create an application-owned copy.

Conceptual native helper:

```
import 'package:image_picker/image_picker.dart';

Future<XFile> persistPickedMedia({
  required XFile source,
  required String destinationPath,
}) async {
  await source.saveTo(destinationPath);

  return XFile(
    destinationPath,
    name: source.name,
    mimeType: source.mimeType,
  );
}

```

`destinationPath` must come from the application's deliberate storage policy.

Examples of separate concerns:

```
temporary work file
application support data
private user media
public/exported media

```

`image_picker` does not choose your persistence architecture.

On web, do not pretend a durable native destination path exists. Use browser/application storage or upload architecture appropriate to web.

---

# 51. Filename handling

Treat:

```
file.name

```

as untrusted external metadata.

Do not use a user/provider filename directly for:

- authorization
- filesystem traversal
- object-store ACL decisions
- unique database identity

For app-owned storage, generate an application identifier and use only a validated extension/type mapping when useful.

Example conceptual name:

```
6c01c5fe-92a1-4db2-b1bb-8cd2f9692578.jpg

```

rather than trusting:

```
../../../important_file

```

Platform implementations already take precautions around provider filenames, but application-owned persistence must maintain its own security policy.

---

# 52. Temporary-file cleanup

Do not invent a universal rule such as:

> Every `XFile` returned by image\_picker must be manually deleted.

The package/platform may own cache/temp lifecycle.

Instead distinguish ownership.

### Plugin/platform-owned picker result

Use it only as long as necessary.

Do not rely on it for durable storage.

### Application-created temporary transform

The application owns cleanup.

### Application-owned persisted file

Delete according to product lifecycle:

- draft canceled
- user removes media
- upload completed and local copy no longer required
- account/data deletion

Correct storage ownership matters more than generic "cleanup all temp files" logic.

---

# 53. Upload pipeline

Use this default design:

```
pick
→ validate cheap metadata
→ optional media inspection
→ optional required transformation
→ preview
→ upload
→ persist only when required

```

Depending on product flow, persistence may occur before upload.

Example for offline/background work:

```
pick
→ validate
→ copy into durable app storage
→ enqueue upload job
→ upload later
→ clean durable draft when policy allows

```

Example foreground profile-image flow:

```
pick
→ validate
→ optional resize
→ preview
→ stream upload
→ discard local temporary reference

```

Do not copy the file merely because an upload exists.

---

# 54. Compression strategy

Do not automatically compress every image.

Client compression is justified when:

- bandwidth savings materially matter
- server request limits require it
- product never needs original quality
- dimensions are far larger than any downstream use
- client CPU/battery cost is acceptable

Avoid unnecessary compression when:

- original is required for editing/archival
- server already has an optimized media pipeline
- media is already near target size
- client devices are resource constrained
- immediate interaction latency matters more than network reduction

Remember:

```
less network

```

can cost:

```
more CPU
more battery
more thermal load
more interaction latency

```

Measure the full workflow.

---

# 55. CPU-heavy post-processing

Operations such as:

- resizing
- JPEG encoding
- hashing large files
- metadata parsing
- thumbnail generation
- image normalization

can consume meaningful CPU.

Do not synchronously perform expensive pure-Dart work on a latency-sensitive Flutter UI path if an isolate-capable library or native implementation can safely perform it elsewhere.

However:

> Do not move `image_picker` plugin calls themselves into arbitrary isolates unless the plugin/platform APIs explicitly support that execution model.

The picker interaction belongs on the normal Flutter/platform integration path.

Separate:

```
platform acquisition

```

from:

```
CPU-bound application transformation

```

---

# 56. Lifecycle-safe widget use

Picker calls cross an asynchronous gap.

If the code uses `BuildContext` after awaiting the picker, verify it is still mounted.

```
Future<void> chooseAvatar(BuildContext context) async {
  final file = await _picker.pickImage(
    source: ImageSource.gallery,
  );

  if (file == null) {
    return;
  }

  if (!context.mounted) {
    return;
  }

  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => AvatarReviewPage(file: file),
    ),
  );
}

```

Flutter's API documentation explicitly recommends checking `mounted` before using a context across asynchronous gaps.

Do not add meaningless `mounted` checks inside a pure service that does not own widget state or use `BuildContext`.

---

# 57. Re-entrancy

Users can double-tap.

Do not rely on unspecified concurrency behavior.

Guard a UI when overlapping picker sessions would be invalid:

```
bool _isPicking = false;

Future<void> onPickPressed() async {
  if (_isPicking) {
    return;
  }

  setState(() {
    _isPicking = true;
  });

  try {
    final file = await _picker.pickImage(
      source: ImageSource.gallery,
    );

    if (!mounted || file == null) {
      return;
    }

    setState(() {
      _selected = file;
    });
  } finally {
    if (mounted) {
      setState(() {
        _isPicking = false;
      });
    }
  }
}

```

A single in-flight UI operation is usually clearer than interpreting whichever of two system picker sessions resolves first.

Do not invent a global mutex layer unless the application's architecture genuinely needs one.

---

# 58. Cancellation

Cancellation is normal control flow.

Examples:

```
user presses Back
user dismisses picker
user cancels camera confirmation
user opens gallery then changes their mind

```

For single selection:

```
final file = await picker.pickImage(...);

if (file == null) {
  return;
}

```

For multi-selection:

```
final files = await picker.pickMultiImage();

if (files.isEmpty) {
  return;
}

```

Do not send routine cancellation to crash reporting as an application error.

Do not show:

```
"Something went wrong"

```

when the user merely canceled.

---

# 59. Error classification

Classify results into:

```
success
cancellation
expected recoverable platform failure
configuration/programming failure
unexpected system/application failure

```

Example:

```
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

sealed class PickOutcome<T> {
  const PickOutcome();
}

final class PickSucceeded<T> extends PickOutcome<T> {
  const PickSucceeded(this.value);

  final T value;
}

final class PickCanceled<T> extends PickOutcome<T> {
  const PickCanceled();
}

final class PickFailed<T> extends PickOutcome<T> {
  const PickFailed(this.error);

  final PlatformException error;
}

Future<PickOutcome<XFile>> pickOneImage(
  ImagePicker picker,
) async {
  try {
    final file = await picker.pickImage(
      source: ImageSource.gallery,
    );

    if (file == null) {
      return const PickCanceled<XFile>();
    }

    return PickSucceeded<XFile>(file);
  } on PlatformException catch (error) {
    return PickFailed<XFile>(error);
  }
}

```

Do not write:

```
try {
  ...
} catch (_) {}

```

That hides:

- permission/configuration failures
- unsupported hardware
- temporary-file errors
- plugin misuse
- platform regressions

Log sanitized diagnostic information while protecting user media metadata.

---

# 60. Permission matrix

| FeatureAndroidiOSmacOSWebWindows/Linux |                                                                                          |                                                                                                                         |                                   |                                     |                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------- | --------------------------------- |
| Gallery image                          | No broad storage/media permission needed for normal picker flow                          | `NSPhotoLibraryUsageDescription` per package setup; PHPicker iOS14+ does not require broad direct library authorization | User-selected file entitlement    | Browser-mediated                    | File dialog                       |
| Camera image                           | No extra image\_picker setup documented; inspect existing CAMERA declarations separately | `NSCameraUsageDescription`                                                                                              | Custom delegate owns requirements | Browser capture behavior/permission | Custom delegate owns requirements |
| Gallery video                          | No broad storage/media permission for normal picker flow                                 | Photo-library usage description                                                                                         | User-selected file entitlement    | Browser-mediated                    | File dialog                       |
| Camera video                           | External/system camera flow; inspect app camera permission context                       | Camera + microphone descriptions when recording audio                                                                   | Custom delegate owns requirements | Browser capture behavior            | Custom delegate owns requirements |

Android's official privacy guidance explicitly recommends Photo Picker for user-selected photos/videos because it does not require broad runtime library permissions.

The iOS keys and macOS entitlement are documented by the package.

---

# 61. Permission strategy

Follow these rules:

1. Request only permissions the feature genuinely uses.
2. Prefer platform system picker privacy boundaries.
3. Explain sensitive permission requests at the point of use when UX calls for it.
4. Handle denial.
5. Handle restricted/unavailable hardware.
6. Do not crash when permission is denied.
7. Do not request permissions at startup without a product reason.
8. Do not add broad storage access because an old tutorial did.
9. Separate media selection permissions from direct media-library-management permissions.
10. Treat custom desktop camera delegates as separate camera implementations with their own privacy configuration.

---

# 62. Security model

All user-selected media is untrusted input.

Potential risks include:

- misleading file extensions
- inaccurate MIME metadata
- malformed images
- malformed containers
- oversized files
- extremely large dimensions
- hostile decoder inputs
- metadata containing location/private data
- malicious filenames
- server-side media processing attacks

`image_picker` is an acquisition tool, not a security validator.

---

# 63. Client validation

Client validation improves UX.

Possible checks:

```
maximum encoded bytes
maximum media count
allowed apparent types
image dimensions
video duration
supported formats
ability to decode

```

Example cheap size check:

```
Future<bool> isWithinFileSize(
  XFile file, {
  required int maximumBytes,
}) async {
  return await file.length() <= maximumBytes;
}

```

Prefer:

```
await file.length()

```

over:

```
(await file.readAsBytes()).length

```

when only size is needed.

The latter reads the entire file for no benefit.

---

# 64. Server validation

Client validation is not a security boundary.

For uploaded media, the server should independently enforce relevant policy:

- authorization
- maximum body size
- actual media/container validation
- decoder limits
- image dimensions
- video duration where relevant
- permitted formats
- filename/path policy
- malware/content pipeline where product requires it

Never trust:

```
client MIME
client extension
client validation flag

```

as authoritative.

The web plugin itself explicitly warns that browser `accept` filtering is convenience rather than validation.

---

# 65. Privacy

Minimize collection of unnecessary information.

Avoid logging:

```
raw media bytes
full local path
user filenames
EXIF blocks
geolocation metadata
full Blob URLs

```

unless a specific diagnostic requirement exists and data handling has been reviewed.

Prefer diagnostic events like:

```
media_pick_failed
platform=ios
source=camera
exception_code=...

```

rather than:

```
/path/to/user/private/photo_of_passport.jpg

```

If metadata must be removed for privacy, use an explicit media-processing step and test the resulting file.

---

