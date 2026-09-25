# Source reference: Existing-code audit, anti-patterns, checklists, implementation workflow, completion criteria, sources

## Table of contents

- [88. Existing-code audit](#88-existing-code-audit)
    - [Obsolete API](#obsolete-api)
    - [Android reliability defect](#android-reliability-defect)
    - [Storage defect](#storage-defect)
    - [Web defect](#web-defect)
    - [Memory defect](#memory-defect)
    - [Permission defect](#permission-defect)
    - [UX defect](#ux-defect)
    - [Error defect](#error-defect)
    - [Preview defect](#preview-defect)
    - [Upload defect](#upload-defect)
    - [Desktop defect](#desktop-defect)
    - [Security defect](#security-defect)
- [89. Anti-patterns](#89-anti-patterns)
- [90. Performance checklist](#90-performance-checklist)
- [91. Reliability checklist](#91-reliability-checklist)
- [92. Security checklist](#92-security-checklist)
- [93. Build/configuration checklist](#93-buildconfiguration-checklist)
  - [Android](#android)
  - [iOS](#ios)
  - [macOS](#macos)
  - [Windows/Linux](#windowslinux)
  - [Web](#web)
- [94. Repository implementation workflow](#94-repository-implementation-workflow)
  - [Step 1 — Inspect](#step-1-inspect)
  - [Step 2 — Define requirements](#step-2-define-requirements)
  - [Step 3 — Validate package fit](#step-3-validate-package-fit)
  - [Step 4 — Design data flow](#step-4-design-data-flow)
  - [Step 5 — Configure platforms](#step-5-configure-platforms)
  - [Step 6 — Implement](#step-6-implement)
  - [Step 7 — Reliability](#step-7-reliability)
  - [Step 8 — Optimize](#step-8-optimize)
  - [Step 9 — Validate code](#step-9-validate-code)
  - [Step 10 — Validate real platforms](#step-10-validate-real-platforms)
- [95. Completion criteria](#95-completion-criteria)
- [96. Fast decision algorithm](#96-fast-decision-algorithm)
- [97. Source-grounded conclusions](#97-source-grounded-conclusions)
- [98. Primary source references](#98-primary-source-references)
    - [Flutter `image_picker`](#flutter-imagepicker)
    - [Federated implementations](#federated-implementations)
    - [`XFile`](#xfile)
    - [Android](#android)
    - [Flutter lifecycle and image memory](#flutter-lifecycle-and-image-memory)
- [99. Final operating rule](#99-final-operating-rule)
# 88. Existing-code audit

When auditing a repository, actively flag:

### Obsolete API

```
PickedFile
getImage()
getVideo()

```

### Android reliability defect

No `retrieveLostData()` startup handling.

### Storage defect

Database stores:

```
picked.path

```

as permanent user-media identity.

### Web defect

```
File(xFile.path)

```

in shared source.

### Memory defect

```
state = state.copyWith(
  videoBytes: await file.readAsBytes(),
);

```

### Permission defect

Broad Android storage permission added solely for Photo Picker.

### UX defect

Previous photo erased before replacement picker completes.

### Error defect

```
catch (_) {}

```

### Preview defect

48 MP originals decoded for 96×96 avatars.

### Upload defect

```
XFile -> bytes -> temp file -> bytes

```

### Desktop defect

Camera button shown even though no delegate exists.

### Security defect

File accepted solely because filename ends in `.jpg`.

---

# 89. Anti-patterns

Never default to these patterns:

- using obsolete `PickedFile`
- persisting picker paths as permanent storage
- assuming all `XFile.path` values are native filesystem paths
- calling `readAsBytes()` immediately after every selection
- storing full media bytes in Bloc/Riverpod/ChangeNotifier state
- loading whole videos into memory
- ignoring Android `retrieveLostData`
- requesting obsolete Android storage permissions
- requesting camera/microphone access when the feature does not use it
- assuming Photo Picker needs whole-library permission
- treating cancellation as an error
- clearing previous media after canceled replacement
- launching multiple picker sessions from rapid taps
- calling UI APIs after an async picker without lifecycle safety
- decoding full-resolution images for thumbnails
- compressing JPEG repeatedly
- copying media without an ownership reason
- assuming every image is JPEG
- assuming `imageQuality` maps linearly to byte size
- assuming gallery `maxDuration` filters video
- assuming desktop camera works automatically
- assuming web capture guarantees camera UI
- trusting filename extension as content validation
- trusting client validation as server security
- logging user media paths/metadata
- adding architecture layers that provide no testing or policy value
- blaming picker invocation for downstream upload/decode latency without measurement

---

# 90. Performance checklist

Before approving a media workflow:

-  Is the complete file being read into memory unnecessarily?
-  Is any large video represented as `Uint8List`?
-  Is a full-resolution image decoded for a small preview?
-  Are `cacheWidth`/`cacheHeight` useful on the native preview?
-  Is the same image recompressed more than once?
-  Is the media copied more than ownership requires?
-  Is original resolution actually needed?
-  Are large selections processed incrementally?
-  Is expensive processing launched with unbounded concurrency?
-  Can upload use a stream?
-  Is a background-upload file persisted first?
-  Is CPU-heavy processing delaying the user's immediate interaction?
-  Is a performance complaint actually OS-picker latency?
-  Has the affected platform implementation version been checked?
-  Has representative hardware been profiled?

---

# 91. Reliability checklist

-  Android lost-data recovery runs at startup.
-  Recovered files are routed through normal validation.
-  Cancellation is handled normally.
-  Previous selection survives canceled replacement where appropriate.
-  Platform exceptions are handled.
-  Camera unavailability is handled.
-  Repeated taps cannot corrupt picker state.
-  Async widget/context access is lifecycle-safe.
-  Session/temp file lifetime is understood.
-  Durable media is explicitly persisted.
-  Background jobs do not depend on temporary paths.
-  Web code does not depend on native files.
-  Desktop camera source is capability-checked.
-  Product limits are revalidated after selection.
-  Large media paths are memory-safe.

---

# 92. Security checklist

-  Selected media is treated as untrusted.
-  Maximum file size is enforced.
-  Media count is enforced.
-  Supported type is validated.
-  Filename is not trusted.
-  Extension is not trusted as authoritative.
-  MIME is not treated as cryptographic proof.
-  Image/video decode limits are considered.
-  Server independently validates uploaded content.
-  Upload endpoint independently authorizes the user.
-  Sensitive metadata requirements are documented.
-  Private media is persisted in appropriate storage.
-  Media bytes are not logged.
-  Sensitive local paths are not logged.
-  Broad permissions are avoided.
-  Application-created temporary files have an ownership/cleanup policy.

---

# 93. Build/configuration checklist

## Android

-  No obsolete `requestLegacyExternalStorage`.
-  No broad storage/media permission added solely for Photo Picker.
-  `launchMode: singleInstance` is not breaking activity result delivery.
-  Existing CAMERA permission declarations are understood.
-  `retrieveLostData` handling exists.

## iOS

-  `NSPhotoLibraryUsageDescription` present where package setup requires it.
-  `NSCameraUsageDescription` present when capture is offered.
-  `NSMicrophoneUsageDescription` present only when video recording/audio requires it.
-  Real-device HEIC behavior tested where relevant.

## macOS

-  `com.apple.security.files.user-selected.read-only` entitlement present.
-  Camera delegate configured only if camera is actually offered.

## Windows/Linux

-  Camera UI hidden or delegate configured.
-  Desktop-unsupported transformation options are not assumed to work.

## Web

-  No `dart:io File` dependency in web code.
-  Browser capture is treated as a hint.
-  Browser cancellation behavior tested.
-  Client type filtering is not treated as security validation.

---

# 94. Repository implementation workflow

## Step 1 — Inspect

Determine:

```
Flutter version
Dart version
image_picker version
resolved platform plugins
supported platforms
existing media packages
current permissions
upload implementation
storage implementation
image processing
state management
tests

```

## Step 2 — Define requirements

Answer:

1. Image, video, or mixed?
2. Camera, gallery, or both?
3. Single or multi-selection?
4. Which platforms?
5. Custom camera UI required?
6. Must original media be preserved?
7. Does selected media need durable local ownership?
8. Maximum encoded file size?
9. Maximum image dimensions?
10. Maximum video duration?
11. Backend-supported formats?
12. Is HEIC accepted?
13. Is media uploaded immediately or later?
14. Does UI need thumbnail or full-resolution preview?
15. Does Android lost-data recovery apply?
16. Does desktop camera require a delegate?

## Step 3 — Validate package fit

Choose:

```
image_picker
camera-oriented implementation
generic file picker
gallery/asset manager

```

according to actual semantics.

## Step 4 — Design data flow

Default:

```
picker
→ validation
→ optional transformation
→ preview
→ upload/persistence

```

Minimize copies.

## Step 5 — Configure platforms

Add only required:

```
Info.plist keys
macOS entitlement
desktop delegate
Android lifecycle handling

```

Do not add legacy permissions.

## Step 6 — Implement

Use:

```
XFile
pick*
null/empty cancellation handling
PlatformException handling

```

Avoid obsolete APIs.

## Step 7 — Reliability

Implement:

```
Android lost-data recovery
picker re-entry guard if needed
widget lifecycle safety
camera-unavailable behavior

```

## Step 8 — Optimize

Inspect:

```
readAsBytes
copies
decode dimensions
compression count
multi-select concurrency
streaming
background ownership

```

## Step 9 — Validate code

Run repository-standard:

```
dart format .
flutter analyze
flutter test

```

plus relevant integration tests.

## Step 10 — Validate real platforms

Exercise actual:

```
camera
gallery
multi
video
cancel
permissions
large media
orientation
HEIC
lifecycle recovery
browser behavior

```

on platforms the product ships.

---

# 95. Completion criteria

An `image_picker` implementation is not complete merely because a picture can be selected.

Confirm:

-  `image_picker` is the right abstraction.
-  Installed version/toolchain compatibility was verified.
-  Current `pick*` APIs are used.
-  No obsolete `PickedFile` API was introduced.
-  Platform-specific setup is correct.
-  Only required permissions/configuration are present.
-  Android startup lost-data recovery exists.
-  Cancellation is treated normally.
-  Previous media survives canceled replacement where appropriate.
-  Picker re-entry cannot create invalid UI state.
-  Async widget lifecycle is safe.
-  `XFile` lifetime semantics are understood.
-  Durable media is deliberately persisted.
-  Web code never assumes native filesystem paths.
-  Desktop camera assumptions are correct.
-  Images are not assumed to be JPEG.
-  Gallery `maxDuration` is not incorrectly relied upon.
-  Important selection limits are application-validated.
-  Large images are previewed memory-consciously.
-  Videos are kept stream/file-backed where practical.
-  Full byte arrays are not stored in UI state unnecessarily.
-  Unnecessary copies were removed.
-  Compression is intentional.
-  Media is treated as untrusted input.
-  Server validation remains authoritative.
-  Logs avoid sensitive media data.
-  Relevant tests pass.
-  Production-critical behavior was validated on representative real platforms.

---

# 96. Fast decision algorithm

```
Need user-selected image/video?
├─ No
│  └─ Do not use image_picker.
│
└─ Yes
   ├─ Need custom camera preview / frame processing / camera controls?
   │  ├─ Yes → Use camera-oriented architecture.
   │  └─ No
   │
   ├─ Need arbitrary non-media files?
   │  ├─ Yes → Use generic file/document picker.
   │  └─ No
   │
   ├─ Need direct gallery asset management/albums?
   │  ├─ Yes → Use gallery/asset-management architecture.
   │  └─ No
   │
   └─ image_picker is a strong fit.

```

Then:

```
Does media need to outlive the app/session?
├─ Yes → Persist into app-owned storage.
└─ No  → Keep XFile/session representation.

Is media large?
├─ Yes → Prefer length/path/stream APIs.
└─ No  → Bytes only if downstream API genuinely needs bytes.

Is UI showing a thumbnail?
├─ Yes → Decode near display size.
└─ No  → Choose decode based on actual display requirement.

Is upload security-sensitive?
└─ Always → Server validates independently.

```

---

# 97. Source-grounded conclusions

The following version-sensitive conclusions are established by current first-party documentation:

1. `image_picker` stable is currently 1.2.3 and supports Android, iOS, Linux, macOS, web, and Windows.
2. Version 1.2.3 requires Flutter 3.38 / Dart 3.10.
3. Current platform support includes Android API 24+, iOS 13+, macOS 10.15+, and Windows 10+.
4. `pickMultiVideo` is a current public API and was added in 1.2.0.
5. `maxDuration` applies to video recording, not gallery selection.
6. Android production applications must account for MainActivity destruction and should check `retrieveLostData()` at startup.
7. Android 13+ uses Android Photo Picker.
8. Android Photo Picker avoids broad runtime photo/video-library permissions for ordinary user-mediated selection.
9. Android camera-picked media is stored in application cache and should be treated as temporary unless the application persists it.
10. The iOS implementation uses PHPicker on iOS 14+ and current implementation history removes direct image-picking permission requirements there.
11. iOS `Info.plist` configuration still requires the relevant photo/camera/microphone usage-description entries according to the package setup instructions.
12. macOS, Windows, and Linux camera source requires a `cameraDelegate` by default.
13. Desktop picker-level resize/quality options are currently unsupported.
14. macOS requires the user-selected read-only file entitlement.
15. Web camera capture is browser-defined and not guaranteed; file `accept` filtering is not validation.
16. Web `XFile` is Blob/Blob-URL backed rather than a native filesystem path.
17. Native `XFile.mimeType` is not automatically inferred from the file's content/path.
18. Flutter holds decoded images uncompressed in memory, and decode-size hints can substantially reduce memory consumption.
19. `Image.file` is not supported on Flutter web.
20. The obsolete `PickedFile/get*` application APIs were replaced by `XFile/pick*` and removed in image\_picker 1.0.0.

---

# 98. Primary source references

Consult these sources before changing version-sensitive behavior:

### Flutter `image_picker`

Official package documentation and README.

Official package changelog.

Current `ImagePicker` API documentation.

### Federated implementations

Official web implementation documentation.

Official macOS implementation documentation.

Official Windows implementation documentation.

Official Linux implementation documentation.

Official iOS implementation changelog.

### `XFile`

Official `cross_file` package documentation.

### Android

Official Android Photo Picker documentation.

Official Android permission-minimization guidance.

Official Android 13 Photo Picker guidance.

### Flutter lifecycle and image memory

Official `BuildContext.mounted` documentation.

Official Flutter `Image` memory documentation.

Official Flutter `Image.file` documentation.

---

# 99. Final operating rule

Before writing:

```
final image = await ImagePicker().pickImage(...);

```

ask:

```
What media does the user need?
Which platforms actually ship?
Who owns the returned file?
How long must it survive?
How large can it be?
How will it be previewed?
How will it be uploaded?
What lifecycle can interrupt the operation?
What permissions are truly required?
What security validation happens after selection?

```

Then design the smallest correct media pipeline.

The best `image_picker` integration is not the one with the most wrappers, permissions, transforms, or defensive copies.

It is the one that lets the platform mediate acquisition, preserves the user's result reliably, keeps large media out of unnecessary memory buffers, establishes explicit ownership when persistence is needed, and leaves every platform-specific behavior visible enough for future maintainers to reason about.