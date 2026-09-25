# Source reference: Android, iOS, macOS, Windows/Linux, desktop delegates, and web behavior

## Table of contents

- [17. Android implementation](#17-android-implementation)
- [18. Android Photo Picker](#18-android-photo-picker)
- [19. Android URI lifetime versus `image_picker`](#19-android-uri-lifetime-versus-imagepicker)
- [20. Android lost-data recovery](#20-android-lost-data-recovery)
- [21. Production Android lost-data helper](#21-production-android-lost-data-helper)
- [22. Android `launchMode`](#22-android-launchmode)
- [23. Android permissions](#23-android-permissions)
    - [Camera nuance](#camera-nuance)
    - [Rule](#rule)
- [24. Android camera output](#24-android-camera-output)
- [25. iOS configuration](#25-ios-configuration)
- [26. iOS PHPicker behavior](#26-ios-phpicker-behavior)
- [27. iOS HEIC simulator limitation](#27-ios-heic-simulator-limitation)
- [28. iOS video performance](#28-ios-video-performance)
- [29. macOS](#29-macos)
- [30. Windows and Linux](#30-windows-and-linux)
- [31. Desktop camera delegates](#31-desktop-camera-delegates)
    - [Architecture rule](#architecture-rule)
- [32. Web implementation](#32-web-implementation)
- [33. Web cancellation](#33-web-cancellation)
- [34. Web-safe handling](#34-web-safe-handling)
- [35. Shared native/web preview architecture](#35-shared-nativeweb-preview-architecture)
# 17. Android implementation

Android requires special attention because the picker often launches another activity.

Current first-party guidance states:

- no normal Android setup is required
- obsolete `requestLegacyExternalStorage` is unnecessary
- Android 13+ uses Android Photo Picker
- applications must account for MainActivity destruction
- camera output is temporary cache data

Do not add legacy storage configuration copied from pre-scoped-storage tutorials.

---

# 18. Android Photo Picker

On Android 13+, `image_picker` uses Android Photo Picker. On Android 12 and below, use of the Photo Picker is optional depending on setup/available implementation.

Android's official documentation recommends the Photo Picker for user-selected photos/videos because it grants scoped access to specifically selected media rather than requiring broad library access. It does not require normal runtime media-library permissions simply to let the user select media.

Therefore do not add:

```
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

```

or broad modern media permissions solely because an `image_picker` gallery button exists.

If the application independently needs to enumerate or manage the entire media library, that is a separate requirement and possibly a sign that `image_picker` is not the appropriate abstraction.

---

# 19. Android URI lifetime versus `image_picker`

Android Photo Picker itself grants scoped URI access with platform-defined lifetime. Android documents mechanisms for persisting provider URI access for long-running work.

However, the `image_picker` abstraction does not expose its normal result as a raw provider URI management API.

Do not write:

```
image_picker XFile
→ assume original Photo Picker URI
→ call takePersistableUriPermission()

```

without actually owning the underlying URI.

When an operation needs to survive process/session boundaries:

- persist/copy the selected `XFile` into application-owned storage, or
- use a lower-level media/document API specifically designed for persistent provider URI access

Choose the abstraction according to ownership requirements.

---

# 20. Android lost-data recovery

This is a production reliability requirement.

The Android picker can launch another activity using platform intents. While the app is in the background, Android can destroy the original activity under memory pressure. The original `Future` can no longer deliver its result when Android later recreates the application.

The `image_picker` README therefore explicitly instructs applications to call:

```
retrieveLostData()

```

at startup.

Ignoring this can cause users to take or select media successfully and then lose the result.

---

# 21. Production Android lost-data helper

```
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

Future<List<XFile>> recoverAndroidLostPickerData(
  ImagePicker picker,
) async {
  if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
    return const <XFile>[];
  }

  final LostDataResponse response = await picker.retrieveLostData();

  if (response.isEmpty) {
    return const <XFile>[];
  }

  final Object? failure = response.exception;
  if (failure != null) {
    throw failure;
  }

  final List<XFile>? files = response.files;
  if (files != null) {
    return files;
  }

  final XFile? file = response.file;
  if (file != null) {
    return <XFile>[file];
  }

  return const <XFile>[];
}

```

Use it during application startup before the user launches another picker request:

```
Future<void> initializeMediaRecovery() async {
  final recovered = await recoverAndroidLostPickerData(_picker);

  for (final file in recovered) {
    await processRecoveredMedia(file);
  }
}

```

Do not call this repeatedly from every widget `build()`.

Route recovered media through the same:

```
validation
persistence
state
upload

```

pipeline used for normal picker results.

The underlying Android recovery state should be treated as consumable recovery information, not a durable application data store.

---

# 22. Android `launchMode`

The package documentation warns that Android activities configured with:

```
android:launchMode="singleInstance"

```

cannot correctly receive picker activity results; image picking returns cancellation because the launched activity runs in a different task.

If the repository uses `singleInstance`, investigate the architectural reason. `singleTask` is suggested by the package documentation when appropriate.

Do not paper over this with retries.

---

# 23. Android permissions

For the normal `image_picker` integration, current package guidance says:

> Android requires no special setup.

Do not add broad storage/media access permissions merely for selection.

### Camera nuance

`image_picker` uses system/external camera behavior on Android rather than providing its own embedded camera preview.

Do not add Android `CAMERA` permission "just in case."

If the repository already declares camera permission for another camera feature, inspect the merged manifest and existing permission flow. The application's permission policy must remain coherent.

### Rule

Separate:

```
permissions needed by image_picker

```

from:

```
permissions needed by some other camera/gallery feature in this application

```

Do not let unrelated permissions leak into a simple picker integration.

---

# 24. Android camera output

Current package documentation states that images/videos captured with the camera are stored in application-local cache and should be expected to be temporary.

If the feature requires permanent ownership:

```
capture
→ validate
→ save/copy into application-owned persistent storage

```

If the feature only needs:

```
capture
→ upload
→ discard

```

an additional permanent local copy may be unnecessary.

Do not copy media simply because copying feels safer.

---

# 25. iOS configuration

Current package documentation requires appropriate `Info.plist` descriptions:

```
<key>NSPhotoLibraryUsageDescription</key>
<string>Explain why the app lets the user choose media.</string>

<key>NSCameraUsageDescription</key>
<string>Explain why the app can capture photos or video.</string>

<key>NSMicrophoneUsageDescription</key>
<string>Explain why video recording requires audio.</string>

```

Only include/use microphone access when video recording actually requires it.

The package README notes that photo-library permission itself is not requested by certain picker flows when full metadata is not requested, while App Store policy still requires the photo-library usage-description entry.

---

# 26. iOS PHPicker behavior

The iOS implementation uses PHPicker for image selection on iOS 14+. The current iOS implementation removed the need for direct user photo-library permission when picking images on iOS 14+, reflecting PHPicker's privacy model.

This means:

```
system-mediated photo selection

```

must not be confused with:

```
application receives unrestricted direct PhotoKit library access

```

If the application separately browses assets using PhotoKit-style APIs, those permissions and limited-library behavior remain separate concerns.

Do not request broad library access solely because PHPicker can display the user's library.

---

# 27. iOS HEIC simulator limitation

The current package README documents a known issue:

- on iOS 14+ simulator
- HEIC selection through PHPicker can fail/be unavailable
- real-device validation is recommended

Do not conclude that production iPhones cannot return HEIC merely because the simulator fails.

Test actual backend compatibility with HEIC/HEIF on real hardware.

---

# 28. iOS video performance

The current `image_picker_ios` changelog documents a recent performance regression where video picking could incur a long delay due to transcoding; the implementation was changed to request the original asset to avoid that conversion.

This illustrates an important rule:

> Platform implementation versions can materially affect picker behavior and latency even when your Dart call site does not change.

When a picker becomes unexpectedly slow after dependency upgrades:

1. inspect `pubspec.lock`
2. identify the resolved platform plugin
3. inspect that package's changelog
4. reproduce on the affected OS/version
5. do not first rewrite application architecture

---

# 29. macOS

Current macOS support uses `file_selector`.

Required entitlement:

```
<key>com.apple.security.files.user-selected.read-only</key>
<true/>

```

The macOS implementation documents:

- camera unavailable without a custom delegate
- `maxWidth` unsupported
- `maxHeight` unsupported
- `imageQuality` unsupported
- video `maxDuration` unsupported

Do not configure mobile-style photo-library permissions and assume they govern this file-selection implementation.

If a custom macOS camera delegate is added, that delegate's camera/microphone permissions and lifecycle become the application's responsibility.

---

# 30. Windows and Linux

Current Windows and Linux implementations also use file-selection mechanisms.

Both document:

- camera unavailable without `cameraDelegate`
- no picker-level `maxWidth`
- no picker-level `maxHeight`
- no picker-level `imageQuality`
- no file-picker `maxDuration` enforcement

Do not hide a "Take photo" action on these platforms unless:

```
picker.supportsImageSource(ImageSource.camera)

```

is true or the application has explicitly installed/configured a camera delegate.

---

# 31. Desktop camera delegates

Desktop implementations expose a camera delegation architecture through `image_picker_platform_interface`.

Conceptually:

```
class DesktopCameraDelegate extends ImagePickerCameraDelegate {
  @override
  Future<XFile?> takePhoto({
    ImagePickerCameraDelegateOptions options =
        const ImagePickerCameraDelegateOptions(),
  }) async {
    return captureUsingApplicationCamera(options);
  }

  @override
  Future<XFile?> takeVideo({
    ImagePickerCameraDelegateOptions options =
        const ImagePickerCameraDelegateOptions(),
  }) async {
    return recordUsingApplicationCamera(options);
  }
}

```

Registration:

```
final ImagePickerPlatform platform = ImagePickerPlatform.instance;

if (platform is CameraDelegatingImagePickerPlatform) {
  platform.cameraDelegate = DesktopCameraDelegate();
}

```

The current README documents this extension point.

### Architecture rule

A camera delegate is appropriate when:

- the project already has a desktop capture implementation
- the application wants one common acquisition API
- camera UX is relatively simple

Prefer a dedicated camera architecture when the application requires:

- live preview controls
- frame analysis
- recording state
- manual device selection
- focus
- exposure
- zoom
- flash
- real-time ML

Do not build a complicated camera subsystem merely to preserve the appearance of one `ImagePicker` abstraction.

---

# 32. Web implementation

The endorsed web package uses browser file-input behavior.

Important limitations are explicitly documented:

- browser `accept` filtering is convenience, not security validation
- camera `capture` is a browser hint
- browsers may ignore or interpret capture differently
- cancellation detection depends on a relatively new browser event
- GIF resizing/quality options are unsupported
- `imageQuality` affects JPG/WebP
- `maxDuration` is unsupported

Never tell product code:

> `ImageSource.camera` guarantees a browser camera.

It does not.

---

# 33. Web cancellation

The web implementation documents that its `cancel` event support depends on newer browser behavior.

Therefore:

- test cancellation in browsers the product officially supports
- avoid architecture that becomes permanently "loading" if older browser cancellation cannot be detected as expected
- provide reasonable focus/UI recovery where necessary

Do not infer universal browser behavior from Chrome alone.

---

# 34. Web-safe handling

This is valid:

```
import 'package:flutter/widgets.dart';
import 'package:image_picker/image_picker.dart';

Widget buildWebPickedImagePreview({
  required XFile file,
  required double width,
  required double height,
}) {
  return Image.network(
    file.path,
    width: width,
    height: height,
    fit: BoxFit.cover,
  );
}

```

The web plugin documents that selected `XFile`s are Blob-backed through the cross-file abstraction.

Do not write:

```
File(file.path)

```

in a web source file.

---

# 35. Shared native/web preview architecture

When one application supports both native and web, isolate the implementation-specific preview code rather than scattering:

```
if (kIsWeb)

```

and `dart:io` imports everywhere.

Example public export:

```
export 'src/picked_image_preview_io.dart'
    if (dart.library.js_interop) 'src/picked_image_preview_web.dart';

```

Native implementation:

```
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:image_picker/image_picker.dart';

final class PickedImagePreview extends StatelessWidget {
  const PickedImagePreview({
    required this.file,
    required this.cacheWidth,
    super.key,
  });

  final XFile file;
  final int cacheWidth;

  @override
  Widget build(BuildContext context) {
    return Image.file(
      File(file.path),
      cacheWidth: cacheWidth,
      fit: BoxFit.cover,
    );
  }
}

```

Web implementation:

```
import 'package:flutter/widgets.dart';
import 'package:image_picker/image_picker.dart';

final class PickedImagePreview extends StatelessWidget {
  const PickedImagePreview({
    required this.file,
    required this.cacheWidth,
    super.key,
  });

  final XFile file;
  final int cacheWidth;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      file.path,
      fit: BoxFit.cover,
    );
  }
}

```

Flutter documents that `Image.file` is not supported on web. It also documents that `cacheWidth`/`cacheHeight` reduce decode memory on native image providers, although web `Image.network` decode sizing is handled differently by the web engine.

---

