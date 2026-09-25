---
name: flutter-image-picker-production-engineering
description: >-
  Design, implement, review, debug, test, optimize, and migrate production Flutter media-acquisition flows using image_picker. Use this skill whenever work involves picking or capturing images/videos, XFile lifetime or persistence, Android lost-data recovery, Photo Picker permissions, iOS PHPicker/HEIC, web Blob URLs, desktop camera delegates, multi-select, upload pipelines, memory-heavy readAsBytes usage, thumbnail decoding, media security validation, or deciding whether image_picker is the right abstraction—even for a seemingly simple “pick an image” request.
compatibility: >-
  Verify the repository's Flutter/Dart SDKs and resolved image_picker federated platform packages before relying on version-sensitive APIs or platform behavior. Source baseline: image_picker 1.2.3, Flutter 3.38+, Dart 3.10+.
---
# Flutter Image Picker Production Engineering
Treat `image_picker` as a thin platform-mediated **media acquisition boundary**. It is not durable storage, a camera framework, a media-library manager, or a security validator.
Use this pipeline:
```text
acquire
→ recover lifecycle result
→ validate
→ optionally transform
→ preview
→ persist only when durable ownership is required
→ upload/consume
→ clean application-owned artifacts
```
Optimize the whole pipeline, not just the picker call.
## Reference routing
Read only what the task needs:
| Need | Reference |
|---|---|
| Package fit, APIs, cancellation, `XFile`, lifetime, capability matrix | `references/01-selection-xfile-platform-basics.md` |
| Android, iOS, macOS, Windows/Linux, desktop delegates, web | `references/02-platform-integrations.md` |
| Resize/quality, formats, memory, streams, persistence, lifecycle, permissions, security | `references/03-media-pipeline-performance-security.md` |
| State architecture, abstractions, testing, device validation, migration | `references/04-architecture-testing-migration.md` |
| Audit, anti-patterns, checklists, implementation workflow, completion gates | `references/05-audit-workflows-checklists.md` |
## 1. Decide whether `image_picker` is the right abstraction
Before coding, answer:
1. Image, video, or mixed?
2. Camera, gallery/system picker, or both?
3. Single or multi-select?
4. Which platforms ship?
5. Must media survive app/process restart?
6. What file-size, dimensions, duration, and formats are allowed?
7. Is upload immediate or delayed/background?
8. What preview size is needed?
9. What client/server validation exists?
10. Does the feature actually need custom camera preview, controls, frame analysis, albums, or arbitrary files?
Choose:
```text
simple image/video selection or simple capture → image_picker
continuous/custom camera/OCR/barcode/frame processing → camera-oriented solution
PDF/ZIP/DOCX/CSV/arbitrary files → file/document picker
albums/assets/library enumeration → gallery/asset-management solution
```
Do not force `image_picker` onto a feature with different semantics.
## 2. Inspect the repository first
Inspect:
- `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints
- resolved `image_picker` and platform packages
- Android manifest, SDK levels, activity launch mode, permissions
- iOS `Info.plist`
- macOS entitlements
- supported platforms
- existing camera, file picker, permissions, upload, storage, processing code
- state management, tests, CI
Search for:
```text
ImagePicker pickImage pickVideo pickMultiImage pickMultiVideo
pickMedia pickMultipleMedia retrieveLostData PickedFile getImage
getVideo getLostData XFile readAsBytes openRead File(
READ_EXTERNAL_STORAGE READ_MEDIA_IMAGES CAMERA
NSPhotoLibraryUsageDescription
```
Flag obsolete APIs, duplicate media layers, broad permissions, missing Android recovery, temp-path persistence, eager bytes, full-resolution previews, swallowed errors, and concurrent picker launches.
## 3. Version-gate behavior
The supplied baseline is `image_picker 1.2.3`, Flutter 3.38+, Dart 3.10+, but federated implementations evolve independently.
Inspect resolved:
```text
image_picker_android
image_picker_ios
image_picker_for_web
image_picker_macos
image_picker_windows
image_picker_linux
image_picker_platform_interface
cross_file
```
Do not diagnose platform behavior from the top-level version alone.
Do not write new `PickedFile` / `getImage` / `getVideo` code. Prefer `XFile` + current `pick*` APIs.
## 4. Treat cancellation as normal
Single selection returns `XFile?`; `null` is cancellation/no committed selection.
Multi-selection returns a list; an empty list is cancellation/no committed selection.
Do not report routine cancellation as an error.
Classify outcomes as:
```text
success
cancellation
recoverable platform failure
configuration/programming failure
unexpected system/application failure
```
Handle `PlatformException` deliberately.
When replacing existing media, keep the previous selection if the replacement picker is canceled unless product UX explicitly says otherwise.

## 5. Keep `XFile` as the default media boundary
Prefer `XFile` until another API truly requires another representation.
Useful operations:
```dart
await file.length();
file.openRead();
await file.saveTo(destinationPath);
```
Use `readAsBytes()` only when a downstream API genuinely requires the whole buffer and size is safe.

Never assume:
```text
XFile == permanent application file
XFile.path == native filesystem path everywhere
```
Native paths may be temporary/cache/provider materializations.
On web, `XFile` is Blob-backed and `path` is a Blob URL. Never compile shared web code that does `File(file.path)`. `Image.file` is unsupported on Flutter web.

## 6. Make file ownership explicit
If media must survive process restart, app restart, cache eviction, delayed upload, offline draft, or long-lived editing:
```text
temporary/session XFile
→ validate
→ copy/save into application-owned durable storage
→ persist durable app identifier/path
→ schedule durable work
```
If the flow is `pick → upload now → discard`, an extra durable copy may be unnecessary.
Do not store picker paths in a database and assume durability.

Separate:
- plugin/platform-owned picker output
- application-created temporary transforms
- application-owned durable media

Only the application-owned artifacts need your cleanup policy.

## 7. Android lost-data recovery is mandatory production reasoning
Android may destroy the Flutter activity while external picker/camera UI is open. The original Future can then be lost.
For production Android support:
- call `retrieveLostData()` at an application startup/recovery boundary;
- gate it to Android;
- handle recovered files and recovered exceptions;
- pass recovered files through the same validation/persistence/upload flow;
- recover before starting another ambiguous picker session.
Do not call recovery from widget `build()`.
Do not declare Android complete without lifecycle-interruption testing.

## 8. Avoid obsolete Android permissions
Normal modern user-mediated media selection does not justify broad legacy storage/media permissions.
Do not add `READ_EXTERNAL_STORAGE` or modern broad media permissions solely because the app has an `image_picker` gallery button.
Separate picker needs from unrelated full-library-management features.
Do not add Android camera permission “just in case”; inspect the app's actual camera features and merged manifest.
Also inspect `android:launchMode`; `singleInstance` can break picker result delivery.

## 9. Configure iOS and desktop targets minimally
### iOS
Add relevant usage descriptions:
- `NSPhotoLibraryUsageDescription`
- `NSCameraUsageDescription`
- `NSMicrophoneUsageDescription` only when video/audio capture needs it
PHPicker-mediated selection is not unrestricted PhotoKit library access.
Test HEIC/HEIF on real devices when backend compatibility matters.

### macOS
Ensure the user-selected read-only file entitlement when required.

### macOS/Windows/Linux camera
Camera is not automatically provided by desktop file-picker implementations. Expose camera only when `supportsImageSource(ImageSource.camera)` is true or an intentional delegate exists.
If the desktop capture UX is complex, use a dedicated camera architecture instead of stretching the delegate abstraction.

## 10. Treat web as browser-mediated
On web:
- camera capture is a browser hint, not a guarantee;
- `accept` is UX filtering, not security validation;
- cancellation behavior is browser-dependent;
- `XFile.path` is Blob-based;
- native filesystem assumptions are invalid.
Test actual supported browsers, especially Safari if shipped.

## 11. Revalidate product constraints after selection
Picker arguments are not a universal cross-platform contract.
Validate important requirements yourself:
- count
- encoded bytes
- media type/format
- image dimensions
- video duration
- backend compatibility

Do not rely on:
- `limit` being enforced by every platform;
- `maxDuration` filtering gallery videos;
- desktop resize/quality options behaving like mobile.
Use `maxDuration` for recorded-video limits where supported, and inspect gallery video duration afterward.

## 12. Do not assume JPEG
Selected images may be JPEG, PNG, HEIC/HEIF, GIF, WebP, or another supported format.
Do not rename an extension to “convert” media.
If normalization is required:
```text
validate/detect
→ explicit transcode
→ verify output
→ upload
```
`mimeType` may be null and is not authoritative security proof.

## 13. Treat metadata/privacy explicitly
`requestFullMetadata: false` is not a universal EXIF/location stripping guarantee.
If metadata removal is a product/privacy requirement:
```text
select
→ explicitly sanitize/transform
→ verify resulting file
```
Test orientation across camera/gallery, portrait/landscape, resizing, and recompression.
Do not log user media bytes, sensitive local paths, filenames, EXIF, coordinates, or Blob URLs without an approved need.

## 14. Avoid eager full-buffer reads
Reject this as a default:
```dart
final bytes = await file.readAsBytes();
```
especially for high-resolution images, videos, and batches.
Prefer:
```dart
final length = await file.length();
final stream = file.openRead();
```
when upload/storage APIs accept streams or paths.
Avoid:
```text
XFile → bytes → temp file → bytes → upload
```
Minimize copies.

## 15. Keep huge buffers out of UI state
Do not put large image/video `Uint8List`s into frequently rebuilt/equality-compared Bloc/Riverpod/ChangeNotifier state without a demonstrated requirement.
Prefer state holding:
```text
session XFile
durable media ID/path
remote URL
upload job ID
processing/progress/error metadata
```
Keep large videos stream/file-backed.

## 16. Decode previews near display size
Encoded size and decoded memory are different.
Use the approximation:
```text
decoded bytes ≈ width × height × 4
```
A high-resolution photo can occupy tens or hundreds of MB decoded.
For native thumbnails, use `cacheWidth`/`cacheHeight` near required physical display size when appropriate.
Do not decode a 48 MP original for a tiny avatar.
Do not assume native image-provider decode behavior maps directly to web.

## 17. Use resize/compression intentionally
Use `maxWidth`/`maxHeight` when:
- originals are never needed;
- target dimensions are known;
- supported platforms match the requirement.
Do not rely on picker resize as the sole cross-platform enforcement.

Treat `imageQuality` as encoder quality, not percentage-of-file-size:
```text
imageQuality: 50 ≠ 50% of original bytes
```
Avoid repeated lossy recompression.
Measure bandwidth savings against CPU, battery, thermal cost, and interaction latency.

## 18. Process multi-select incrementally
For larger selections:
1. enforce count;
2. inspect cheap metadata first;
3. reject incompatible/oversized items early;
4. generate thumbnails lazily;
5. bound transforms/uploads;
6. release references no longer needed;
7. expose incremental progress/cancellation when useful.
Do not `Future.wait` unbounded full-byte reads or CPU-heavy transforms.
Choose concurrency through profiling, not a universal number.

## 19. Separate acquisition from CPU-heavy processing
Picker calls belong on the normal Flutter/platform path.
Potentially heavy post-processing includes:
- resizing
- encoding
- hashing
- metadata parsing
- thumbnails
- format normalization
Offload pure CPU work only when profiling justifies it and the chosen library/isolate path is safe.
Do not move arbitrary plugin calls into workers just because later processing is heavy.

## 20. Make async UI code lifecycle-safe
Picker calls cross an async gap.
Before using `BuildContext` or widget state after `await`, verify the owning UI is still mounted when required.
Do not put `BuildContext` inside long-lived media services.

## 21. Guard picker re-entry
Users can double-tap.
If concurrent picker sessions would produce ambiguous state:
```text
set picking=true
→ launch one session
→ resolve/cancel/fail
→ set picking=false
```
Disable or ignore duplicate requests.
Do not create a global lock framework unless multiple features genuinely need coordinated ownership.

## 22. Keep architecture proportional
`image_picker` does not require a repository/use-case stack.
A thin gateway is justified when it adds:
- shared policy
- platform adaptation
- deterministic tests
- validation/persistence coordination
- substitution
Otherwise direct presentation-layer use may be simpler.
Do not create multiple forwarding layers that add no semantics.

Model the real UI workflow, not “async exists therefore union.”
Typical state may include:
```text
selected media
isPicking
isProcessing
isUploading
progress
validation error
upload error
```

## 23. Treat media as untrusted input
Client validation improves UX; it is not the security boundary.
Client may check size, count, type, dimensions, duration, format, or decodability.
Server must independently enforce relevant:
- authentication/authorization
- body size
- actual media/container validity
- decoder/resource limits
- dimensions/duration
- allowed formats
- filename/path policy
- product malware/content rules
Never trust extension, MIME, or a client “validated” flag as authority.
Generate application-owned filenames/IDs for durable storage rather than trusting provider filenames.

## 24. Failure handling and telemetry
Do not swallow failures with `catch (_) {}`.
Map platform failures to application-level results and user-facing recovery.
Log safe metadata such as:
```text
operation=media_pick
platform=ios
source=camera
result=failure
exception_code=...
```
Treat cancellation separately from error telemetry.

## 25. Testing strategy
Unit/widget test your policy, not the plugin's system UI.
Use a fake gateway to cover:
- success
- cancellation
- previous-selection preservation
- platform failure mapping
- size/type/count validation
- persistence/upload decisions
- re-entry guard
- progress/error state
- Android recovered-result handling

Use real platform integration tests for:
```text
camera
gallery
multi/mixed selection
video
cancel
large media
orientation
HEIC/HEIF
Android lifecycle recovery
browser behavior
desktop camera capability
```
Test the platforms and browsers the product actually ships.

## 26. Migration workflow
Before upgrading:
1. inspect `image_picker` and federated package versions;
2. read changelogs across the upgrade range;
3. confirm Flutter/Dart minimums;
4. remove obsolete `PickedFile`/`get*` usage;
5. review Android Photo Picker/lifecycle behavior;
6. review iOS picker/performance changes;
7. review web cancellation/capture changes;
8. review desktop delegates;
9. run unit/widget tests;
10. run representative real-platform tests;
11. profile any claimed performance regression at the actual slow stage.

Do not treat a federated plugin upgrade as a Dart-only change.

## 27. Debugging order
When media acquisition fails or becomes slow, inspect:
```text
resolved platform package versions
→ platform configuration/capability
→ request arguments
→ cancellation vs exception
→ Android recovery
→ file lifetime/ownership
→ validation
→ preview decode
→ transformation
→ upload
```
Examples:
- Android result disappears after returning → inspect `retrieveLostData()`.
- Web fails on `File(xFile.path)` → fix native-filesystem assumption.
- iOS video selection slows after upgrade → inspect resolved iOS plugin/changelog.
- OOM/jank after selection → inspect `readAsBytes()` and decode dimensions before blaming picker UI.

## 28. Existing-code audit gates
Flag immediately:
- `PickedFile` or removed `get*` APIs
- no Android lost-data recovery
- picker path persisted as durable media identity
- web-shared `File(xFile.path)`
- video `readAsBytes()`
- full media bytes stored in hot UI state
- broad Android storage permission solely for selection
- previous media cleared before replacement completes
- swallowed `PlatformException`
- full-resolution decode for tiny preview
- `XFile → bytes → file → bytes`
- desktop camera button without capability/delegate
- type accepted solely by extension
- gallery duration trusted from `maxDuration`
- unbounded batch transforms/uploads

## 29. Production definition of done
Approve only when:
- `image_picker` is the correct abstraction;
- SDK and resolved plugin versions were verified;
- current `XFile`/`pick*` APIs are used;
- platform setup is minimal and correct;
- Android recovery exists and is tested;
- cancellation is normal;
- prior content survives canceled replacement when appropriate;
- re-entry cannot corrupt state;
- async UI access is lifecycle-safe;
- temporary lifetime is understood;
- durable media is explicitly persisted when needed;
- web has no native path assumptions;
- desktop camera capability is explicit;
- formats are not assumed to be JPEG;
- gallery duration and important limits are independently validated;
- previews are memory-conscious;
- videos remain stream/file-backed where practical;
- huge byte arrays are absent from hot UI state;
- redundant copies are removed;
- compression/resizing is intentional;
- media is treated as untrusted;
- server validation is authoritative;
- logs avoid sensitive media metadata;
- relevant automated and real-platform tests pass.

## Final engineering rule
Before writing:
```dart
final file = await ImagePicker().pickImage(...);
```
answer:
```text
What media does the user need?
Which platforms ship?
Is image_picker the right abstraction?
Who owns the returned media?
How long must it survive?
How large can it be?
How will it be previewed?
How will it be uploaded?
What lifecycle can interrupt the operation?
What permissions/configuration are truly required?
What security validation happens after selection?
```
Then implement the smallest correct media pipeline.
