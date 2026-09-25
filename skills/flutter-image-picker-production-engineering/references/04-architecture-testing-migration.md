# Source reference: State ownership, abstractions, performance analysis, package choice, testing, and migration

## Table of contents

- [66. State management](#66-state-management)
- [67. State ownership](#67-state-ownership)
- [68. Simple state versus complex union](#68-simple-state-versus-complex-union)
- [69. Minimal picker abstraction](#69-minimal-picker-abstraction)
- [70. Dependency injection](#70-dependency-injection)
- [71. Bad versus improved implementation](#71-bad-versus-improved-implementation)
  - [Bad](#bad)
  - [Improved](#improved)
- [72. Selection performance](#72-selection-performance)
- [73. Memory performance](#73-memory-performance)
- [74. I/O performance](#74-io-performance)
- [75. Multi-select performance](#75-multi-select-performance)
- [76. Web large-file behavior](#76-web-large-file-behavior)
- [77. Background uploads](#77-background-uploads)
- [78. Camera versus `image_picker`](#78-camera-versus-imagepicker)
- [79. Generic file selection versus `image_picker`](#79-generic-file-selection-versus-imagepicker)
- [80. Asset-library management](#80-asset-library-management)
- [81. Decision table — package choice](#81-decision-table-package-choice)
- [82. Testing strategy](#82-testing-strategy)
- [83. Fake picker](#83-fake-picker)
- [84. Integration and device testing](#84-integration-and-device-testing)
- [85. Android lifecycle testing](#85-android-lifecycle-testing)
- [86. Web testing](#86-web-testing)
- [87. Migration history](#87-migration-history)
    - [0.8.2](#082)
    - [0.8.5](#085)
    - [0.8.8](#088)
    - [0.8.9](#089)
    - [1.0.0](#100)
    - [1.1.0](#110)
    - [1.1.1](#111)
    - [1.2.0](#120)
    - [1.2.2](#122)
    - [1.2.3](#123)
# 66. State management

`image_picker` does not require a particular state-management package.

The same design applies to:

- StatefulWidget
- ValueNotifier
- ChangeNotifier
- Bloc/Cubit
- Riverpod
- reducer architectures

Represent only state the UI needs.

Possible fields:

```
isPicking
selected session XFile
persistent media identifier/path
processing status
upload progress
validation error
upload error

```

Do not store full video/image `Uint8List`s in frequently compared immutable state without a demonstrated need.

---

# 67. State ownership

An `XFile` is useful for current-session state.

If state must survive process restart, do not persist the `XFile` object/path and hope the underlying temporary media survives.

Persist first:

```
temporary XFile
→ durable app media
→ store durable identifier/path

```

Then state can retain:

```
mediaId
localPersistentPath
remoteUrl
uploadJobId

```

according to architecture.

---

# 68. Simple state versus complex union

Do not build an elaborate state machine solely because a picker is asynchronous.

This may be sufficient:

```
final class MediaSelectionState {
  const MediaSelectionState({
    this.selectedFile,
    this.isPicking = false,
    this.isUploading = false,
    this.uploadProgress,
    this.errorMessage,
  });

  final XFile? selectedFile;
  final bool isPicking;
  final bool isUploading;
  final double? uploadProgress;
  final String? errorMessage;
}

```

Use mutually exclusive variants only when the product workflow genuinely has exclusive semantic modes.

Avoid architecture ceremony.

---

# 69. Minimal picker abstraction

Do not create an interface unless it earns its cost.

A small abstraction is justified when:

- several features share source/quality policy
- tests should avoid plugin/platform infrastructure
- platform adaptation is necessary
- permissions/persistence are coordinated
- media validation is shared

Example:

```
import 'package:image_picker/image_picker.dart';

abstract interface class MediaPickerGateway {
  Future<XFile?> pickImage({
    required ImageSource source,
  });

  Future<List<XFile>> pickImages({
    int? limit,
  });
}

final class ImagePickerGateway implements MediaPickerGateway {
  ImagePickerGateway({
    ImagePicker? picker,
  }) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  @override
  Future<XFile?> pickImage({
    required ImageSource source,
  }) {
    return _picker.pickImage(
      source: source,
      requestFullMetadata: false,
    );
  }

  @override
  Future<List<XFile>> pickImages({
    int? limit,
  }) {
    return _picker.pickMultiImage(
      limit: limit,
      requestFullMetadata: false,
    );
  }
}

```

Tests can inject a fake.

Do not introduce:

```
PickerRepository
PickerUseCase
PickerInteractor
PickerManager
PickerCoordinator
PickerDataSource

```

for one trivial call unless those layers are already meaningful repository conventions.

---

# 70. Dependency injection

`ImagePicker` itself is a small façade.

Keeping one reusable instance is reasonable:

```
final ImagePicker _picker = ImagePicker();

```

Constructing it where needed is also usually acceptable.

Do not install a DI framework because `ImagePicker()` exists.

DI becomes valuable when the repository already uses it or when testing/shared policy makes substitution useful.

---

# 71. Bad versus improved implementation

## Bad

```
final XFile? selected = await ImagePicker().pickImage(
  source: ImageSource.gallery,
);

if (selected == null) {
  return;
}

final bytes = await selected.readAsBytes();

setState(() {
  _fullImageBytes = bytes;
});

final tempFile = File('/tmp/upload.jpg');
await tempFile.writeAsBytes(bytes);

final uploadBytes = await tempFile.readAsBytes();

await api.upload(uploadBytes);

```

Problems:

```
full encoded file loaded
bytes stored in widget state
bytes copied into filesystem
same media read back into bytes
no persistent/temp ownership policy
web incompatible

```

## Improved

```
final XFile? selected = await _picker.pickImage(
  source: ImageSource.gallery,
);

if (selected == null) {
  return;
}

final int length = await selected.length();

if (length > maximumUploadBytes) {
  showFileTooLarge();
  return;
}

await uploadClient.upload(
  filename: selected.name,
  contentLength: length,
  body: selected.openRead(),
);

```

Preview from its native file/blob representation rather than eagerly reading the entire object.

---

# 72. Selection performance

Break the workflow into components:

```
1. launch picker UI
2. user browses/selects
3. platform materializes result
4. optional picker resize/recompression
5. Flutter receives XFile
6. app validates
7. app decodes preview
8. app transforms
9. app copies/persists
10. app uploads

```

The application has the most influence over stages 4 and 6–10.

Do not blame the package for:

- slow cloud-photo download
- slow platform gallery
- slow external camera app
- poor upload bandwidth
- server transcoding

Measure the stage that is actually slow.

---

# 73. Memory performance

Audit for:

- `readAsBytes()` on high-resolution images
- `readAsBytes()` on videos
- simultaneous multi-image decoding
- image byte arrays retained in state
- old previews retained after replacement
- duplicate compressed/uncompressed buffers
- full-resolution thumbnails
- excessive ImageCache residency

Flutter explicitly warns that high-resolution decoded images consume large amounts of memory.

A 48 MP photograph should not be treated as "only a 10 MB file" once decoded.

---

# 74. I/O performance

Minimize:

```
provider/cache copy
+ application temp copy
+ compression copy
+ persistent copy
+ upload temp copy

```

Some platform implementations already need to materialize selected provider content into temporary/cache storage.

Do not add another copy unless it serves a clear purpose:

- persistent ownership
- transformation
- sandbox boundary
- background-upload durability
- user-requested export

---

# 75. Multi-select performance

For 10–20+ media items:

- do not decode every original immediately
- do not `Future.wait` unbounded CPU-heavy processing
- inspect cheap metadata first
- generate thumbnails lazily
- upload with controlled concurrency
- discard references no longer needed
- show incremental progress
- allow cancellation where product architecture supports it

Do not hardcode a universal parallelism number.

A low-end Android device and desktop workstation have different resource envelopes.

Profile representative hardware.

---

# 76. Web large-file behavior

`cross_file` documents a Safari-specific limitation involving Blob reads above 4 GB and attempts to detect the case when size is known.

This is another reason not to design web media handling around:

```
readAsBytes()

```

for huge media.

Use product file-size limits and stream-oriented upload paths where possible.

---

# 77. Background uploads

If upload can outlive:

- current page
- process
- app session

do not queue a temporary picker path and assume it remains valid later.

Correct architecture:

```
picker result
→ validate
→ durable application storage
→ durable upload job record
→ background uploader

```

The temporary/session picker object can then be released.

This is especially important for:

- large videos
- offline drafts
- retry queues
- background tasks

---

# 78. Camera versus `image_picker`

Use `image_picker` camera when requirements are:

```
open system/simple camera
take one photo/video
receive resulting media

```

Choose camera-oriented tooling when requirements include:

```
embedded preview
continuous frames
barcode scanner
OCR frames
computer vision
focus
zoom
flash controls
exposure
lens switching
custom recording controls
camera overlays

```

Do not abuse `image_picker` as an advanced camera stack.

---

# 79. Generic file selection versus `image_picker`

If users need arbitrary files:

```
PDF
ZIP
DOCX
CSV
custom business document

```

a generic document/file selection API is semantically clearer.

Desktop `image_picker` itself is already implemented as a filtered `file_selector` wrapper.

Use the smallest abstraction matching the product's actual file requirements.

---

# 80. Asset-library management

If the application needs:

- enumerate thousands of photo assets
- query albums
- browse asset metadata directly
- react to library changes
- maintain asset identifiers
- manage limited-library selections directly

`image_picker` is usually too high-level.

It is designed around the user choosing media through a mediated picker.

Use a library-management abstraction when the product genuinely needs asset-library semantics.

---

# 81. Decision table — package choice

| ApproachSystem pickerSimple captureCustom camera UIArbitrary filesDirect gallery managementComplexityBest use |                        |                               |     |                     |     |             |                                         |
| ------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------- | --- | ------------------- | --- | ----------- | --------------------------------------- |
| `image_picker`                                                                                                | Yes                    | Mobile yes; desktop delegated | No  | Media-oriented only | No  | Low         | Simple image/video acquisition          |
| Camera-oriented implementation                                                                                | No/optional            | Yes                           | Yes | No                  | No  | Medium–high | Preview, recording controls, frames     |
| Generic file picker                                                                                           | Yes/file dialog        | Usually no                    | No  | Yes                 | No  | Low–medium  | Documents and arbitrary files           |
| Gallery/asset-manager implementation                                                                          | Custom/direct asset UX | Not primary                   | No  | Media assets        | Yes | Medium–high | Albums, assets, bulk library management |

Choose based on semantics, not package popularity.

---

# 82. Testing strategy

Do not unit-test Flutter's plugin implementation itself.

Test application behavior around the boundary.

Unit/widget tests should cover:

- successful pick handling
- cancellation
- platform failure mapping
- maximum file size
- invalid media type
- excessive count
- upload failure
- persistence decision
- previous-selection preservation
- processing state
- re-entry guard
- Android lost-data result handling

Use a fake application-level gateway where useful.

---

# 83. Fake picker

```
import 'package:image_picker/image_picker.dart';

final class FakeMediaPickerGateway implements MediaPickerGateway {
  FakeMediaPickerGateway({
    this.nextImage,
    List<XFile>? nextImages,
  }) : nextImages = nextImages ?? const <XFile>[];

  XFile? nextImage;
  List<XFile> nextImages;

  @override
  Future<XFile?> pickImage({
    required ImageSource source,
  }) async {
    return nextImage;
  }

  @override
  Future<List<XFile>> pickImages({
    int? limit,
  }) async {
    final files = nextImages;

    if (limit == null || files.length <= limit) {
      return files;
    }

    return files.take(limit).toList(growable: false);
  }
}

```

Test your UI/controller with:

```
nextImage = fake file
nextImage = null
fake throws expected app error

```

Do not require a native gallery to open in an ordinary widget test.

---

# 84. Integration and device testing

System UI cannot be fully represented by unit tests.

Production-critical media flows require platform testing.

Adapt this matrix to platforms actually shipped:

| EnvironmentImportant checks       |                                                                       |
| --------------------------------- | --------------------------------------------------------------------- |
| Android 13+ real device           | Photo Picker, cancellation, multi-select, camera, process destruction |
| Android 24–32 if supported        | Older picker/fallback path, camera, lifecycle                         |
| iOS 13 if still product-supported | older single-selection behavior                                       |
| iOS 14+ real device               | PHPicker, HEIC, multi-selection, camera                               |
| Chrome                            | image/video, multi, cancellation, browser upload                      |
| Safari                            | Blob behavior, cancellation, large-file policy                        |
| macOS                             | file entitlement, selection, camera delegate if used                  |
| Windows                           | file selection, delegate if used                                      |
| Linux                             | file selection, delegate if used                                      |

Media fixtures should include:

```
portrait photo
landscape photo
large megapixel photo
HEIC where relevant
PNG/JPEG
GIF/WebP if product accepts them
large video
short video
cancel
permission denial
camera unavailable
multi-select
mixed media
orientation variants

```

---

# 85. Android lifecycle testing

Where feasible, validate recovery under activity/process interruption.

The important behavior to prove is:

```
user launches picker/camera
Android destroys calling activity
application restarts
retrieveLostData discovers result/error
application routes result into normal workflow

```

The package documentation explicitly identifies this scenario and tells applications to perform startup recovery.

Do not consider Android production integration complete merely because the happy path works on a high-memory test device.

---

# 86. Web testing

Test browsers actually supported by the product.

Because the web implementation depends on browser behavior for:

- file selection
- `capture`
- cancellation events

do not infer Safari behavior from Chrome or mobile browser capture behavior from desktop Chrome.

The web implementation explicitly documents differences and recent-browser requirements for cancellation handling.

---

# 87. Migration history

Important milestones:

### 0.8.2

Introduced `XFile` APIs and deprecated the old `PickedFile` methods.

### 0.8.5

Android and iOS moved into federated implementations.

### 0.8.8

Initial Windows/macOS/Linux support and `supportsImageSource`.

### 0.8.9

Added `pickMedia` and `pickMultipleMedia`.

### 1.0.0

Removed deprecated `get*` APIs.

### 1.1.0

Added multi-selection limits; documented as iOS/Android support.

### 1.1.1

Clarified mandatory Android Photo Picker behavior on Android 13+.

### 1.2.0

Added `pickMultiVideo`.

### 1.2.2

Clarified `maxDuration` is for recording, not gallery selection.

### 1.2.3

Fixed `limit: 1` multi-selection delegation and raised minimum toolchain to Flutter 3.38 / Dart 3.10.

Before package upgrades:

1. read the top-level changelog
2. inspect resolved platform-package upgrades
3. review platform changelogs for behavior/performance changes
4. test media workflows on affected platforms

Do not treat a plugin upgrade as purely a Dart-source change.

---

