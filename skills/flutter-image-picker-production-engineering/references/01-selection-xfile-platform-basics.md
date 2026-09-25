# Source reference: Selection, package fit, public APIs, XFile semantics, platform capability matrix

## Table of contents

  - [name: image-picker-production-engineering description: Production-grade guidance for deciding when and how to use Flutter image\_picker across Android, iOS, macOS, web, Windows, and Linux, with emphasis on lifecycle correctness, XFile semantics, permissions, persistence, memory, performance, security, testing, and migration safety.](#name-image-picker-production-engineering-description-production-grade-guidance-for-deciding-when-and)
- [Image Picker Production Engineering](#image-picker-production-engineering)
  - [1. Purpose](#1-purpose)
- [2. Evidence levels](#2-evidence-levels)
    - [Required by package/platform](#required-by-packageplatform)
    - [Recommended by first-party documentation](#recommended-by-first-party-documentation)
    - [Engineering best practice](#engineering-best-practice)
    - [Context-dependent judgment](#context-dependent-judgment)
- [3. Current version baseline](#3-current-version-baseline)
    - [Version rule](#version-rule)
- [4. Core operating rules](#4-core-operating-rules)
- [5. Repository reconnaissance](#5-repository-reconnaissance)
- [6. Package architecture](#6-package-architecture)
    - [Performance consequence](#performance-consequence)
- [7. Public API](#7-public-api)
  - [Pick one image](#pick-one-image)
  - [Pick multiple images](#pick-multiple-images)
  - [Pick one video](#pick-one-video)
  - [Pick multiple videos](#pick-multiple-videos)
  - [Pick one image or video](#pick-one-image-or-video)
  - [Pick multiple images/videos](#pick-multiple-imagesvideos)
  - [Lost-result recovery](#lost-result-recovery)
  - [Runtime source support](#runtime-source-support)
- [8. Legacy APIs](#8-legacy-apis)
- [9. `XFile` semantics](#9-xfile-semantics)
  - [Critical rule](#critical-rule)
- [10. What `XFile.path` means](#10-what-xfilepath-means)
  - [Native platforms](#native-platforms)
  - [Web](#web)
- [11. `XFile.mimeType`](#11-xfilemimetype)
- [12. File lifetime](#12-file-lifetime)
- [13. Correct simple image pick](#13-correct-simple-image-pick)
- [14. Camera picking](#14-camera-picking)
- [15. `ImageSource`](#15-imagesource)
    - [Android camera](#android-camera)
    - [Android gallery](#android-gallery)
    - [iOS camera](#ios-camera)
    - [iOS gallery](#ios-gallery)
    - [Web camera](#web-camera)
    - [Desktop gallery](#desktop-gallery)
    - [Desktop camera](#desktop-camera)
- [16. Platform capability matrix](#16-platform-capability-matrix)
---

## name: image-picker-production-engineering description: Production-grade guidance for deciding when and how to use Flutter image\_picker across Android, iOS, macOS, web, Windows, and Linux, with emphasis on lifecycle correctness, XFile semantics, permissions, persistence, memory, performance, security, testing, and migration safety.

# Image Picker Production Engineering

## 1. Purpose

Use this skill when adding, reviewing, debugging, optimizing, testing, or migrating Flutter media-acquisition code that uses or may use `image_picker`.

The governing principle is:

> **Use ****`image_picker`**** as a thin, platform-mediated media acquisition boundary. Keep media file-backed or stream-backed for as long as practical, explicitly manage lifecycle and persistence, minimize permissions and memory copies, and optimize the entire media pipeline rather than micro-optimizing the picker call itself.**

Do not assume `image_picker` is always the right abstraction.

Use it when a product needs simple system-mediated:

- image selection
- image capture
- video selection
- video capture
- multi-image selection
- mixed image/video selection
- multi-video selection

Choose another abstraction when the application needs:

- continuous camera preview
- frame-by-frame processing
- barcode or OCR frame analysis
- manual focus/zoom/flash controls
- custom recording UI
- arbitrary document/file selection
- direct photo-library asset management
- a custom gallery browser
- media editing/cropping as the primary workflow

`image_picker` currently supports Android, iOS, Linux, macOS, web, and Windows. The current stable app-facing version is **1.2.3**, requiring at least Flutter **3.38** and Dart **3.10**. Current package support is Android API 24+, iOS 13+, macOS 10.15+, Windows 10+, Linux, and web.

---

# 2. Evidence levels

When applying this skill, distinguish four kinds of guidance:

### Required by package/platform

Behavior explicitly required for correctness.

Examples:

- Android lost-data recovery
- required iOS usage-description keys
- macOS file entitlement
- not using obsolete `PickedFile` APIs

### Recommended by first-party documentation

Strong first-party guidance where alternatives technically exist.

Examples:

- handling Android lost data at startup
- treating camera output as temporary
- using Android Photo Picker behavior rather than obsolete storage assumptions

### Engineering best practice

Derived from verified Dart/Flutter/platform behavior.

Examples:

- stream large videos instead of `readAsBytes()`
- decode thumbnails near display size
- preserve a previous selection when replacement is canceled
- persist media before scheduling long-lived background work

### Context-dependent judgment

Depends on product architecture.

Examples:

- whether picker logic deserves a service abstraction
- whether to resize before upload
- whether selected media should be copied to permanent storage
- whether state should use several variants or simple fields

Never present a context-dependent preference as an `image_picker` requirement.

---

# 3. Current version baseline

Before writing code, inspect the repository rather than copying the newest syntax blindly.

Current stable baseline:

```
image_picker: 1.2.3
Minimum Flutter: 3.38
Minimum Dart: 3.10

```

Version 1.2.3 also changed the handling of:

```
pickMultiImage(limit: 1)
pickMultipleMedia(limit: 1)

```

so that a limit of exactly one delegates to the appropriate single-item picker instead of violating the platform-interface requirement that multi-selection limits be at least two.

Version 1.2.2 clarified that `maxDuration` applies to **recorded video**, not gallery video selection. Version 1.2.0 added `pickMultiVideo`. Selection limits were introduced in 1.1.0 and are officially supported on iOS and Android; other implementations may ignore them.

### Version rule

Always inspect:

```
pubspec.yaml
pubspec.lock
Flutter SDK
Dart SDK
image_picker
image_picker_android
image_picker_ios
image_picker_for_web
image_picker_macos
image_picker_windows
image_picker_linux
image_picker_platform_interface
cross_file

```

The endorsed platform packages evolve independently. An older Flutter SDK can resolve older compatible implementations even when the app-facing `image_picker` constraint appears similar. The `image_picker` changelog explicitly calls out this resolution behavior.

Do not diagnose platform behavior solely from the top-level `image_picker` version.

---

# 4. Core operating rules

An AI coding agent MUST follow these rules:

1. Inspect the repository before adding `image_picker`.
2. Verify the installed version before choosing API syntax.
3. Determine which platforms the repository actually supports.
4. Treat cancellation as a normal result.
5. Treat every selected file as untrusted input.
6. Never assume picker output is permanent application storage.
7. Prefer `XFile`, files, or streams over eager byte loading.
8. Never read a large video fully into memory without a demonstrated requirement.
9. Never assume `XFile.path` is a native filesystem path on every platform.
10. Never use `dart:io File` in code compiled for web.
11. Do not request permissions the feature does not need.
12. Do not add obsolete Android storage permissions.
13. Implement Android lost-data recovery for production Android applications.
14. Do not assume every selected image is JPEG.
15. Do not assume `imageQuality: 50` means a 50% smaller file.
16. Preserve existing media when a replacement picker is canceled unless product requirements say otherwise.
17. Guard repeated picker launches when concurrent sessions would produce ambiguous state.
18. Use lifecycle-safe async Flutter code.
19. Explicitly persist media that must outlive the picker/application session.
20. Do not use client-side validation as the upload security boundary.
21. Minimize media copies.
22. Avoid full-resolution image decoding for thumbnails.
23. Do not put huge binary buffers into frequently rebuilt UI state.
24. Use `image_picker` for simple acquisition, not as a substitute for a full camera stack.
25. Validate important media workflows on real devices and browsers.
26. Do not copy old `PickedFile` tutorials.
27. Keep platform-specific differences visible rather than pretending behavior is uniform.
28. Do not wrap one picker call in five architecture layers without a real benefit.
29. Optimize acquisition, processing, preview, storage, and upload as one pipeline.
30. Never infer undocumented platform guarantees.

---

# 5. Repository reconnaissance

Before modifying picker code, inspect:

```
pubspec.yaml
pubspec.lock
android/app/src/main/AndroidManifest.xml
android/app/build.gradle / build.gradle.kts
Android minSdk / targetSdk
ios/Runner/Info.plist
ios/Podfile or SwiftPM configuration
macos/Runner/*.entitlements
supported Flutter platforms
existing permission packages
existing camera packages
existing file-selection packages
upload clients
storage utilities
image-processing utilities
state-management architecture
test infrastructure
CI workflows

```

Search for:

```
ImagePicker
pickImage
pickVideo
pickMultiImage
pickMultiVideo
pickMedia
pickMultipleMedia
retrieveLostData
PickedFile
getImage
getVideo
getMultiImage
getLostData
XFile
readAsBytes
openRead
File(
image compression
thumbnail
media upload
CAMERA
READ_EXTERNAL_STORAGE
READ_MEDIA_IMAGES
READ_MEDIA_VIDEO
NSPhotoLibraryUsageDescription
NSCameraUsageDescription
NSMicrophoneUsageDescription

```

Audit existing code for:

- obsolete APIs
- duplicated media abstractions
- unnecessary permissions
- missing Android recovery
- eager byte loading
- web-incompatible `dart:io`
- full-resolution previews
- repeated compression
- temporary-path persistence
- swallowed errors
- incorrect cancellation handling
- concurrent picker launches

Do not introduce a second media architecture merely because new code is being added.

---

# 6. Package architecture

`image_picker` is a federated Flutter plugin.

The app-facing `image_picker` package depends on endorsed implementations for:

- Android
- iOS
- web
- macOS
- Windows
- Linux

and on `image_picker_platform_interface`.

Conceptually:

```
Application
    ↓
image_picker
    ↓
ImagePickerPlatform
    ↓
platform implementation
    ↓
Android / iOS / browser / desktop platform APIs

```

The app-facing Dart code does not implement a custom image library or custom camera UI.

Depending on platform, invocation crosses into:

- Android intents and Android Photo Picker
- iOS PHPicker / camera system UI
- browser `<input type="file">`
- desktop `file_selector`
- application-provided desktop camera delegate

The visible picker UI may run partly or entirely outside Flutter's rendering system.

### Performance consequence

The application can influence:

- media resizing
- compression
- copies
- file reads
- preview decode
- post-processing
- upload strategy

It generally cannot directly optimize:

- how fast Android Photo Picker UI appears
- how fast PHPicker animates
- browser file-dialog startup
- platform gallery indexing
- third-party Android camera application startup

Do not promise "faster picking" when the expensive work belongs to system UI.

---

# 7. Public API

The current `ImagePicker` API includes the following primary operations.

## Pick one image

```
Future<XFile?> pickImage({
  required ImageSource source,
  double? maxWidth,
  double? maxHeight,
  int? imageQuality,
  CameraDevice preferredCameraDevice = CameraDevice.rear,
  bool requestFullMetadata = true,
})

```

Returns:

```
XFile  -> selection/capture succeeded
null   -> user canceled / did not select

```

Possible failures are surfaced through platform exceptions rather than encoded into `null`.

---

## Pick multiple images

```
Future<List<XFile>> pickMultiImage({
  double? maxWidth,
  double? maxHeight,
  int? imageQuality,
  int? limit,
  bool requestFullMetadata = true,
})

```

Treat an empty result as normal cancellation/no committed selection.

The `limit` option is officially supported by iOS and Android. Other platforms may ignore it. Always enforce important product limits in application validation as well.

No cross-platform contractual ordering guarantee is documented. If product semantics require a specific user-defined order, add an explicit ordering/reordering step after selection.

---

## Pick one video

```
Future<XFile?> pickVideo({
  required ImageSource source,
  CameraDevice preferredCameraDevice = CameraDevice.rear,
  Duration? maxDuration,
})

```

`maxDuration` applies to camera recording. It is not a gallery-video filter.

If gallery videos must be under 30 seconds, validate duration after selection rather than assuming:

```
maxDuration: const Duration(seconds: 30)

```

will enforce gallery duration.

---

## Pick multiple videos

Current versions expose:

```
Future<List<XFile>> pickMultiVideo({
  Duration? maxDuration,
  int? limit,
})

```

`pickMultiVideo` was added in `image_picker` 1.2.0.

Do not assume `maxDuration` filters selected gallery videos. Apply application-level duration validation.

---

## Pick one image or video

```
Future<XFile?> pickMedia({
  double? maxWidth,
  double? maxHeight,
  int? imageQuality,
  bool requestFullMetadata = true,
})

```

This is useful when a single interaction should accept either image or video.

Validate the resulting media type according to application requirements.

---

## Pick multiple images/videos

```
Future<List<XFile>> pickMultipleMedia({
  double? maxWidth,
  double? maxHeight,
  int? imageQuality,
  int? limit,
  bool requestFullMetadata = true,
})

```

Validate each selected item independently.

Do not identify media solely from filename extensions.

---

## Lost-result recovery

```
Future<LostDataResponse> retrieveLostData()

```

This is an Android lifecycle-recovery mechanism. The API exists because Android can destroy the calling activity while external picker/camera UI is running. The package documentation requires checking for lost data at startup.

Do not invoke it unconditionally on non-Android platforms.

---

## Runtime source support

```
bool supportsImageSource(ImageSource source)

```

Use this particularly on desktop before exposing a camera option.

Desktop camera source is unsupported by default unless a camera delegate has been configured.

---

# 8. Legacy APIs

Do not write new code using:

```
PickedFile
getImage
getVideo
getMultiImage
getLostData

```

`XFile`-returning APIs were introduced in 0.8.2. The old `get*` APIs were retained through 0.8.9 and removed from the app-facing API in 1.0.0.

Migration:

```
getImage       -> pickImage
getMultiImage  -> pickMultiImage
getVideo       -> pickVideo
getLostData    -> retrieveLostData
PickedFile     -> XFile

```

Do not preserve old syntax merely because the repository contains an outdated tutorial snippet.

---

# 9. `XFile` semantics

`XFile` comes from the `cross_file` abstraction.

Important APIs include:

```
file.path
file.name
file.mimeType

await file.length()
await file.readAsBytes()
file.openRead()
await file.saveTo(destinationPath)

```

`XFile` is specifically intended to provide one file abstraction across native and web platforms.

## Critical rule

Do not equate:

```
XFile

```

with:

```
permanent dart:io File

```

They are not equivalent concepts.

---

# 10. What `XFile.path` means

## Native platforms

A picker implementation commonly returns a filesystem-accessible path.

However, that path can point to:

- application cache
- a temporary copy
- a provider materialization
- a user-selected desktop file
- another session-scoped location

The app-facing picker documentation describes returned media as suitable for the application's current session rather than as durable application storage.

Therefore:

> **Do not persist ****`XFile.path`**** in a database and assume the same media will remain available indefinitely.**

If long-term ownership is required, explicitly persist the content.

---

## Web

On web, `XFile` is Blob-backed, and its path represents a Blob URL rather than a normal operating-system filesystem path. `cross_file` explicitly documents this distinction.

This is invalid shared code:

```
final file = File(picked.path);

```

when compiled for web.

Flutter also explicitly documents that `Image.file` is unsupported on web.

---

# 11. `XFile.mimeType`

Do not assume:

```
file.mimeType

```

is always non-null.

`cross_file` documents that:

- on web, MIME type reflects browser-provided metadata when available
- native implementations do not infer MIME type merely from path or file contents
- native MIME type may be absent unless explicitly supplied

Therefore:

```
extension != trusted media type
mimeType != guaranteed trusted media type

```

Use available metadata as a hint for UX/routing, then perform appropriate validation.

---

# 12. File lifetime

Picker output is not an application persistence API.

Current Android documentation explicitly states that media captured using the camera is stored in the application's local cache and should be expected to be temporary. The application is responsible for moving it if permanent storage is required.

Use this mental model:

```
picker output
    ↓
temporary/session media handle
    ↓
validate
    ↓
choose:
    ├─ display/upload during session
    └─ copy/save when durable application ownership is required

```

Do not perform the permanent copy automatically if the product only uploads the image immediately and never needs a local retained version.

---

# 13. Correct simple image pick

```
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

Future<XFile?> pickProfileImage(ImagePicker picker) async {
  try {
    return await picker.pickImage(
      source: ImageSource.gallery,
      requestFullMetadata: false,
    );
  } on PlatformException {
    rethrow;
  }
}

```

Caller:

```
final XFile? replacement = await pickProfileImage(picker);

if (replacement == null) {
  // User canceled. Keep the previous profile image.
  return;
}

await useSelectedImage(replacement);

```

Do not do:

```
currentImage = null;
final replacement = await picker.pickImage(...);

```

unless clearing the existing image before selection is an explicit product requirement.

---

# 14. Camera picking

```
import 'package:image_picker/image_picker.dart';

Future<XFile?> capturePhoto(ImagePicker picker) async {
  if (!picker.supportsImageSource(ImageSource.camera)) {
    return null;
  }

  return picker.pickImage(
    source: ImageSource.camera,
    preferredCameraDevice: CameraDevice.rear,
  );
}

```

`preferredCameraDevice` expresses a preference, not a universal hardware guarantee.

The platform camera may:

- ignore camera preference
- lack the requested camera
- expose its own confirmation UI
- return cancellation
- fail because no camera is available

Handle failure rather than assuming every supported device has usable camera hardware.

---

# 15. `ImageSource`

Current sources are:

```
ImageSource.camera
ImageSource.gallery

```

The package describes them as opening camera or photo-gallery behavior, but the exact mechanism varies by platform.

Conceptually:

### Android camera

External/system camera intent.

### Android gallery

Android Photo Picker on modern Android, with platform-dependent fallback/optional behavior on older versions.

### iOS camera

Apple camera system UI.

### iOS gallery

PHPicker on iOS 14+.

### Web camera

HTML capture hint, not guaranteed camera UI.

### Desktop gallery

File-selection UI.

### Desktop camera

Unsupported unless the application configures a delegate.

Do not write application logic assuming the UI or lifecycle is identical across these cases.

---

# 16. Platform capability matrix

| CapabilityAndroidiOSmacOSWebWindowsLinux                |                                          |                               |                                                            |                      |                                                 |                                                 |
| ------------------------------------------------------- | ---------------------------------------- | ----------------------------- | ---------------------------------------------------------- | -------------------- | ----------------------------------------------- | ----------------------------------------------- |
| Pick one image                                          | Yes                                      | Yes                           | Yes                                                        | Yes                  | Yes                                             | Yes                                             |
| Camera image                                            | Yes                                      | Yes                           | Delegate required                                          | Browser capture hint | Delegate required                               | Delegate required                               |
| Pick video                                              | Yes                                      | Yes                           | Yes                                                        | Yes                  | Yes                                             | Yes                                             |
| Camera video                                            | Yes                                      | Yes                           | Delegate required                                          | Browser capture hint | Delegate required                               | Delegate required                               |
| Multi-image                                             | Yes                                      | Yes; modern multi picker      | Yes                                                        | Yes                  | Yes                                             | Yes                                             |
| Mixed media                                             | Yes                                      | Yes; modern picker            | Yes                                                        | Yes                  | Yes                                             | Yes                                             |
| Multi-video                                             | Yes                                      | Yes in current implementation | Yes                                                        | Yes                  | Yes                                             | Yes                                             |
| `limit`                                                 | Supported                                | Supported                     | May be ignored                                             | May be ignored       | May be ignored                                  | May be ignored                                  |
| Picker resize/quality                                   | Supported                                | Supported                     | Unsupported                                                | Partial              | Unsupported                                     | Unsupported                                     |
| `maxDuration` camera recording                          | Supported                                | Supported                     | Delegate-defined/desktop option unsupported by file picker | Unsupported          | Delegate-defined/file-picker option unsupported | Delegate-defined/file-picker option unsupported |
| Normal native filesystem path assumption                | Materialized/local, but session-oriented | Materialized/temp-oriented    | Native selected file                                       | **No: Blob URL**     | Native selected file                            | Native selected file                            |
| Android lost-data recovery                              | **Required consideration**               | No                            | No                                                         | No                   | No                                              | No                                              |
| Camera provided by image\_picker desktop implementation | —                                        | —                             | No                                                         | Browser-defined      | No                                              | No                                              |

The desktop packages are wrappers around `file_selector`. Their current documentation explicitly says camera is unavailable without a `cameraDelegate`, and desktop file picking does not support `maxWidth`, `maxHeight`, or `imageQuality`; `maxDuration` is likewise unsupported by the desktop video picker.

Web's `capture` behavior is browser-defined rather than a guaranteed camera implementation.

---

