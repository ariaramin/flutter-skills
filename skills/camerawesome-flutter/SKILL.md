---
name: camerawesome-flutter
description: Use when integrating, configuring, optimizing, debugging, or migrating camera and video recording experiences in Flutter using the camerawesome package. Covers CameraAwesomeBuilder modes (.awesome, .custom, .previewOnly, .analysisOnly), CameraState lifecycle transitions, Android CameraX and iOS AVFoundation native setup, runtime permissions, concurrent sensor configurations, image analysis with ML Kit, orientation-aware controls, and thermal/memory performance tuning. Do not use for camera plugin from Flutter team (flutter/packages), simple photo picking without live preview (use image_picker), or desktop/web camera support.
compatibility: Research baseline verified for CamerAwesome 2.5.0 on Flutter 3.22+/3.24+ (Dart >=3.2.6 <4.0.0). Officially supports Android (minSdkVersion 21+, CameraX 1.4.2) and iOS (iOS 12.0+, AVFoundation) only. Web, macOS, Windows, and Linux are officially unsupported.
---

# CamerAwesome for Flutter

## Purpose and evidence policy

Engineer reliable, battery-efficient, high-framerate camera interfaces and real-time computer vision pipelines using `camerawesome`. CamerAwesome wraps Google's Android Jetpack CameraX and Apple's AVFoundation behind a declarative Flutter API with reactive state streams.

Evidence labels used throughout this skill:
- **D** — Documented package or platform behavior verified in official documentation or source code.
- **P** — Platform-specific limitation or native requirement (Android CameraX / iOS AVFoundation).
- **E** — Engineering recommendation, architectural inference, or operational best practice.

---

## Research baseline

- **Researched package**: `camerawesome`
- **Verified version**: `2.5.0` (Latest pub.dev release)
- **Dart SDK constraint**: `>=3.2.6 <4.0.0`
- **Flutter constraint**: `>=1.10.0` (Modern production apps target Flutter 3.22+)
- **Supported platforms**: **Android** (minSdkVersion 21+, CameraX 1.4.2) and **iOS** (iOS 12.0+, AVFoundation) exclusively (**D**).
- **Unsupported platforms**: Web, macOS, Windows, Linux (**D**). Never configure or promise CamerAwesome on desktop or web targets.
- **Primary sources**:
  - Official documentation: `https://docs.page/Apparence-io/camera_awesome`
  - GitHub repository & source code: `https://github.com/Apparence-io/camera_awesome`
  - Package pub.dev: `https://pub.dev/packages/camerawesome`

---

## When to use CamerAwesome

### Optimal use cases
- In-app camera preview with custom UI overlays (shutter controls, filter carousels, custom reticles).
- QR code, barcode scanning, document boundary detection, or face tracking with simultaneous live preview using Google ML Kit.
- Turn-key camera experiences requiring built-in Material/Cupertino controls, filters, zoom indicators, and orientation handling with minimal boilerplate (`CameraAwesomeBuilder.awesome`).
- High-efficiency video recording with configurable bitrates, fallback quality strategies, and audio toggling.
- Dual/multi-camera capture (Beta) on supported multi-lens devices.

### When NOT to use CamerAwesome
- Simple image or video selection from the system gallery or native system camera app — use `image_picker` instead (**E**).
- Web, macOS, Windows, or Linux desktop camera requirements — CamerAwesome does not support desktop or browser engines (**D**).
- Ultra-low-latency raw frame rendering pipelines requiring customized native C++/Vulkan/Metal shaders — implement custom Flutter Platform Views or FFI bindings (**E**).

---

## Before editing a project

Inspect the target Flutter project thoroughly before introducing or refactoring CamerAwesome code:

1. **Check `pubspec.yaml`**:
   - Verify `camerawesome` version. If migrating from `1.x`, note that `CameraLayoutBuilder` signature and `AnalysisConfig` changed fundamentally in `2.x`.
   - Inspect existing camera dependencies (`camera`, `image_picker`, `google_mlkit_*`) to avoid duplicate native camera sessions or conflicting Gradle dependencies.
2. **Check target platforms**:
   - Confirm the project targets only Android and/or iOS. If multi-platform (web/desktop), isolate CamerAwesome behind a platform-agnostic service interface with runtime conditional loading.
3. **Inspect Android configuration**:
   - Check `android/app/build.gradle`: ensure `minSdkVersion` is at least 21 (recommended: 24+ for modern CameraX features) and `compileSdkVersion` is 33+.
   - Check `android/app/src/main/AndroidManifest.xml`: inspect declared permissions (`RECORD_AUDIO`, `ACCESS_FINE_LOCATION`).
4. **Inspect iOS configuration**:
   - Check `ios/Runner/Info.plist`: confirm `NSCameraUsageDescription` is declared. Confirm whether `NSMicrophoneUsageDescription` is needed or should be stripped.
   - Check `ios/Podfile`: check deployment target (must be `12.0` or higher).
5. **Inspect route & state architecture**:
   - Identify where the camera screen sits in the navigation hierarchy. Determine whether pushing/popping routes could cause overlapping camera widget lifecycles.

---

## Installation

Add the dependency to `pubspec.yaml`:

```yaml
dependencies:
  camerawesome: ^2.5.0
```

Import the unified library in your Dart code:

```dart
import 'package:camerawesome/camerawesome_plugin.dart';
import 'package:camerawesome/pigeon.dart';
```

---

## Platform configuration

### Android setup

#### 1. SDK version (`android/app/build.gradle`)
Ensure `minSdkVersion` is at least `21`:

```groovy
android {
    compileSdkVersion 34

    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 34
    }
}
```

#### 2. Permissions (`android/app/src/main/AndroidManifest.xml`)
Camera permission (`android.permission.CAMERA`) is automatically injected by the library's `AndroidManifest.xml`.

**Optional permissions** must be declared manually if utilized:
- **Audio recording** (required for video recording with sound):
  ```xml
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  ```
- **GPS location in Exif metadata**:
  ```xml
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  ```
- **Storage**: Starting from version `1.4.0`, `WRITE_EXTERNAL_STORAGE` is **not** included. CamerAwesome saves files to app-specific directories (`path_provider`). Do **not** declare legacy storage permissions unless supporting Android 9 (API 28) or lower with shared external storage (**D**).

#### 3. Resolving Gradle dependency conflicts
If other plugins (such as Google Play Services or Firebase) create classpath or interface conflicts, override dependencies in root `android/build.gradle`:

```groovy
buildscript {
    ext {
        compileSdkVersion = 34
        minSdkVersion = 21
        playServicesLocationVersion = "21.3.0"
        exifInterfaceVersion = "1.4.0"
    }
}
```

---

### iOS setup

#### 1. Minimum deployment target (`ios/Podfile`)
AVFoundation modern pipelines require iOS 12.0+:

```ruby
platform :ios, '12.0'
```

#### 2. Privacy usage descriptions (`ios/Runner/Info.plist`)
Declare mandatory usage descriptions:

```xml
<key>NSCameraUsageDescription</key>
<string>This app requires camera access to capture photos and scan barcodes.</string>

<!-- Include ONLY if recording video with audio -->
<key>NSMicrophoneUsageDescription</key>
<string>This app requires microphone access to record audio in videos.</string>

<!-- Include ONLY if saving GPS coordinates to image Exif -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app requires location access to geotag captured photos.</string>
```

#### 3. Preview-only / Barcode-only App Store rejection fix
**P:** Apple's automated App Store review checks for `AVAudioSession` microphone symbols. If your app only uses the camera preview (e.g. for barcode scanning or face detection) and does not declare `NSMicrophoneUsageDescription`, Apple will reject the binary.

Strip microphone API references in `ios/Podfile` (**D**):

```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    
    target.build_configurations.each do |config|
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
        '$(inherited)',
        'AUDIO_SESSION_MICROPHONE=0'
      ]
    end
  end
end
```

---

## Core mental model

CamerAwesome is built around an asynchronous **State Pattern** and reactive **RxDart streams**:

```
[ PreparingCameraState ] (Camera initialization & permission checks)
           │
           ├───> [ PhotoCameraState ] ──(takePhoto)──> CaptureRequest & MediaCapture
           │
           ├───> [ VideoCameraState ] ──(startRecording)──> [ VideoRecordingCameraState ]
           │                                                        │
           │                                 (pause/resume/stop) ◄──┘
           │
           ├───> [ PreviewCameraState ] (Barcode, QR, or preview-only)
           │
           └───> [ AnalysisCameraState ] (AI/headless analysis without preview)
```

### Key classes and their responsibilities
1. **`CameraAwesomeBuilder`**: The top-level `StatefulWidget` coordinating native camera lifecycle, texture attachment, orientation listeners, and widget layout.
2. **`CameraState`**: The base abstract state object passed to builders. Exposes sensor controls, filter selectors, media capture streams, and the polymorphic `state.when(...)` dispatcher.
3. **`SensorConfig`**: Reactive configuration for a physical lens or multi-camera group. Exposes streams and setters for `zoom$`, `flashMode$`, `aspectRatio$`, and `brightness$`.
4. **`AnalysisPreview`**: Provided to layout builders in 2.x. Encapsulates preview dimensions, native scaling factor, and coordinate translation functions (`convertFromImage`, `convertPoint`).
5. **`SaveConfig`**: Defines persistence destinations (`photoPathBuilder`, `videoPathBuilder`), recording parameters (`videoOptions`), Exif preferences, and front camera mirroring.
6. **`MediaCapture`**: Emitted by `captureState$` stream with status (`capturing`, `success`, `failure`), media type (`isPicture`, `isVideo`), and reference to output `XFile`.

---

## Choosing the correct camera API

CamerAwesome provides four dedicated factory constructors on `CameraAwesomeBuilder`. Select strictly based on the application requirement:

| Constructor | Preview displayed | Photo/Video capture | Image analysis stream | Ideal use case |
|---|---|---|---|---|
| `CameraAwesomeBuilder.awesome(...)` | Yes | Yes | Optional | Full-featured turn-key camera with default buttons, filters, and timer. |
| `CameraAwesomeBuilder.custom(...)` | Yes | Yes | Optional | Production custom camera app with bespoke layout, overlays, and design system. |
| `CameraAwesomeBuilder.previewOnly(...)` | Yes | No | Yes | QR/barcode scanners, face detection with live preview, AR reticles. |
| `CameraAwesomeBuilder.analysisOnly(...)` | No | No | Yes | Image filtering, custom canvas drawing, background CV pipelines without native preview texture. |

---

## Minimal production-ready setup

A clean, self-contained implementation with standard capture, thumbnail tap handling, and file persistence:

```dart
import 'package:camerawesome/camerawesome_plugin.dart';
import 'package:camerawesome/pigeon.dart';
import 'package:flutter/material.dart';

class SimpleCameraScreen extends StatelessWidget {
  const SimpleCameraScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CameraAwesomeBuilder.awesome(
        saveConfig: SaveConfig.photoAndVideo(
          initialCaptureMode: CaptureMode.photo,
          mirrorFrontCamera: true,
        ),
        sensorConfig: SensorConfig.single(
          sensor: Sensor.position(SensorPosition.back),
          flashMode: FlashMode.auto,
          aspectRatio: CameraAspectRatios.ratio_4_3,
        ),
        previewFit: CameraPreviewFit.contain,
        enablePhysicalButton: true,
        onMediaTap: (MediaCapture mediaCapture) {
          mediaCapture.captureRequest.when(
            single: (single) {
              debugPrint('Captured file: ${single.file?.path}');
            },
            multiple: (multiple) {
              for (final entry in multiple.fileBySensor.entries) {
                debugPrint('Captured sensor ${entry.key.position}: ${entry.value?.path}');
              }
            },
          );
        },
      ),
    );
  }
}
```

---

## Camera state and lifecycle

### State lifecycle transitions
When `CameraAwesomeBuilder` mounts:
1. It seeds `PreparingCameraState`.
2. Native camera permissions are verified and requested.
3. Once permissions are granted, native CameraX / AVFoundation initializes the lens and streaming pipeline.
4. `PreparingCameraState` transitions to the target `CameraState` (`PhotoCameraState`, `VideoCameraState`, `PreviewCameraState`, or `AnalysisCameraState`).
5. When switching between photo and video, `state.setState(CaptureMode.video)` transitions `PhotoCameraState` -> `VideoCameraState`.
6. When starting video recording, `videoState.startRecording()` transitions `VideoCameraState` -> `VideoRecordingCameraState`. Stopping returns to `VideoCameraState`.

### App backgrounding and foregrounding
`CameraAwesomeBuilder` registers a `WidgetsBindingObserver` internally (**D**):
- **`AppLifecycleState.inactive` / `paused` / `detached`**: If video is actively recording, CamerAwesome automatically calls `stopRecording()`. Native streaming stops.
- **`AppLifecycleState.resumed`**: On Android, CamerAwesome automatically resets zoom to 1.0x optical (`setZoomToOneX()`).

### Navigation and route change rules
**Critical Rule**: Only **one** native camera session can be active at a time (**P**).
- When navigating to another screen, if the camera screen remains in the navigation stack without unmounting (e.g. `Navigator.push`), native CameraX/AVFoundation continues streaming unless explicitly paused or stopped (**E**).
- If pushing a subroute from a camera screen:
  ```dart
  // Stop analysis before navigating to conserve CPU/battery
  cameraState.analysisController?.stop();
  
  await Navigator.of(context).push(
    MaterialPageRoute(builder: (_) => const MediaPreviewScreen()),
  );
  
  // Restart analysis upon return
  cameraState.analysisController?.start();
  ```
- If popping or replacing routes, ensure `CameraAwesomeBuilder` is completely unmounted before instantiating a new camera screen. Do not run parallel route transitions that mount two camera screens simultaneously.

---

## Permissions

### Permission architecture
CamerAwesome checks and requests permissions in `PreparingCameraState` via `CamerawesomePlugin.checkAndRequestPermissions(...)` (**D**).

```dart
// To receive permission outcomes directly in your layout:
CameraAwesomeBuilder.awesome(
  saveConfig: SaveConfig.photo(),
  onMediaCaptureEvent: (event) {
    if (event.status == MediaCaptureStatus.failure) {
      debugPrint('Capture error: ${event.exception}');
    }
  },
  progressIndicator: const Center(
    child: CircularProgressIndicator.adaptive(),
  ),
);
```

### Handling permanent denial
When a user permanently denies camera or microphone permissions:
1. Native permission dialogs will not reappear.
2. The camera will remain in `PreparingCameraState` and display the `progressIndicator`.
3. To provide a production-grade UX, perform a pre-check with `permission_handler` before navigating to the camera screen, displaying a clear "Permission Denied" view with a button directing to system app settings:

```dart
import 'package:permission_handler/permission_handler.dart';

Future<bool> ensureCameraPermissions(BuildContext context) async {
  final status = await Permission.camera.request();
  if (status.isPermanentlyDenied) {
    if (context.mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Camera Access Required'),
          content: const Text('Please enable camera permissions in settings to take photos.'),
          actions: [
            TextButton(
              onPressed: () => openAppSettings(),
              child: const Text('Open Settings'),
            ),
          ],
        ),
      );
    }
    return false;
  }
  return status.isGranted;
}
```

---

## Photo capture

### Recommended implementation pattern
In custom layouts, trigger photos through `PhotoCameraState`:

```dart
Future<void> capturePhoto(PhotoCameraState photoState) async {
  try {
    final CaptureRequest request = await photoState.takePhoto(
      onPhoto: (CaptureRequest req) {
        debugPrint('Photo saved successfully to: ${req.path}');
      },
      onPhotoFailed: (Exception exception) {
        debugPrint('Failed to save photo: $exception');
      },
    );
    debugPrint('Capture initiated for path: ${request.path}');
  } on CameraNotReadyException catch (e) {
    debugPrint('Camera is still preparing: $e');
  } catch (e) {
    debugPrint('Unexpected error during capture: $e');
  }
}
```

### Output path customization
Use `CaptureRequestBuilder` to generate structured paths:

```dart
SaveConfig.photo(
  pathBuilder: (List<Sensor> sensors) async {
    final Directory extDir = await getApplicationDocumentsDirectory();
    final String dirPath = '${extDir.path}/app_photos';
    await Directory(dirPath).create(recursive: true);
    
    final String filePath = '$dirPath/${DateTime.now().millisecondsSinceEpoch}.jpg';
    return SingleCaptureRequest(filePath, sensors.first);
  },
  exifPreferences: ExifPreferences(saveGPSLocation: false),
  mirrorFrontCamera: true,
)
```

---

## Video capture

### Recommended implementation pattern
Video recording requires transitioning between `VideoCameraState` and `VideoRecordingCameraState`:

```dart
Widget buildVideoShutterButton(CameraState state) {
  return state.when(
    onVideoMode: (VideoCameraState videoState) {
      return IconButton(
        icon: const Icon(Icons.fiber_manual_record, color: Colors.red, size: 64),
        onPressed: () async {
          // Starts recording; triggers transition to VideoRecordingCameraState
          await videoState.startRecording();
        },
      );
    },
    onVideoRecordingMode: (VideoRecordingCameraState recordingState) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Pause / Resume toggle
          StreamBuilder<MediaCapture?>(
            stream: recordingState.captureState$,
            builder: (context, snapshot) {
              final capture = snapshot.data;
              final isPaused = capture?.videoState == VideoState.paused;
              return IconButton(
                icon: Icon(isPaused ? Icons.play_arrow : Icons.pause, color: Colors.white),
                onPressed: () {
                  if (capture != null) {
                    if (isPaused) {
                      recordingState.resumeRecording(capture);
                    } else {
                      recordingState.pauseRecording(capture);
                    }
                  }
                },
              );
            },
          ),
          // Stop button
          IconButton(
            icon: const Icon(Icons.stop, color: Colors.red, size: 64),
            onPressed: () async {
              await recordingState.stopRecording(
                onVideo: (CaptureRequest req) {
                  debugPrint('Video recorded to: ${req.path}');
                },
                onVideoFailed: (Exception err) {
                  debugPrint('Video recording failed: $err');
                },
              );
            },
          ),
        ],
      );
    },
  ) ?? const SizedBox.shrink();
}
```

### Video configuration parameters
Configure bitrate, resolution quality, and fallback rules via `VideoOptions`:

```dart
SaveConfig.video(
  videoOptions: VideoOptions(
    enableAudio: true,
    quality: VideoRecordingQuality.fhd, // 1080p
    android: AndroidVideoOptions(
      bitrate: 6000000, // 6 Mbps
      fallbackStrategy: QualityFallbackStrategy.lower,
    ),
    ios: CupertinoVideoOptions(
      fps: 30,
      codec: CupertinoVideoCodec.h264,
      fileType: CupertinoFileType.quickTimeMovie,
    ),
  ),
  mirrorFrontCamera: true,
)
```

---

## Camera switching and sensors

### Switching front and back lenses
Switching lenses is supported across all camera states:

```dart
// Switch between front and back
await cameraState.switchCameraSensor(
  aspectRatio: CameraAspectRatios.ratio_4_3,
  zoom: 0.0,
  flash: FlashMode.none,
);
```

### Physical sensor types (iOS)
On iOS devices equipped with multiple lenses (e.g. Ultra-Wide, Wide, Telephoto), CamerAwesome exposes lens selection:
- `SensorType.wideAngle` (Standard lens)
- `SensorType.ultraWideAngle` (0.5x wide lens)
- `SensorType.telephoto` (2x/3x optical zoom)
- `SensorType.trueDepth` (Front-facing depth camera)

**P:** Android does not currently expose physical sensor switching through CamerAwesome's `SensorType` selector. Android CameraX automatically selects the logical multicam unit.

### Dual / Multi-camera (BETA)
`camerawesome` supports simultaneous front/back streaming in Beta:
```dart
SensorConfig.multiple(
  sensors: [
    Sensor.position(SensorPosition.back),
    Sensor.position(SensorPosition.front),
  ],
)
```
**CAUTION**: Simultaneous multi-camera streaming requires hardware level `Camera2` LEVEL_3 or multi-camera support on Android, and iPhone XR/XS or newer on iOS (**P**). Do not enable multi-camera without runtime hardware capability checks.

---

## Focus, zoom, exposure, and flash

### Zoom control
Zoom ranges between `0.0` (minimum/1.0x optical) and `1.0` (maximum digital zoom):

```dart
// Programmatic zoom
await cameraState.sensorConfig.setZoom(0.5);

// Reactive zoom stream
StreamBuilder<double>(
  stream: cameraState.sensorConfig.zoom$,
  builder: (context, snapshot) {
    final double zoom = snapshot.data ?? 0.0;
    return Text('${(zoom * 10).toStringAsFixed(1)}x');
  },
);
```

### Flash modes
Cycle or set flash modes (`FlashMode.none`, `FlashMode.auto`, `FlashMode.on`, `FlashMode.always`):

```dart
// Cycle to next mode
cameraState.sensorConfig.switchCameraFlash();

// Explicit set
await cameraState.sensorConfig.setFlashMode(FlashMode.auto);
```

### Tap to focus & exposure
In custom builders, implement tap-to-focus using `onPreviewTapBuilder`:

```dart
CameraAwesomeBuilder.custom(
  onPreviewTapBuilder: (state) => OnPreviewTap(
    onTap: (Offset position, PreviewSize flutterPreviewSize, PreviewSize pixelPreviewSize) {
      state.when(
        onPhotoMode: (s) => s.focusOnPoint(
          flutterPosition: position,
          flutterPreviewSize: flutterPreviewSize,
          pixelPreviewSize: pixelPreviewSize,
        ),
        onVideoMode: (s) => s.focusOnPoint(
          flutterPosition: position,
          flutterPreviewSize: flutterPreviewSize,
          pixelPreviewSize: pixelPreviewSize,
        ),
      );
    },
  ),
  builder: (state, preview) => /* ... */,
  saveConfig: SaveConfig.photo(),
)
```

---

## Orientation and aspect ratio

### Native orientation behavior
**D:** `CameraAwesomeBuilder` enforces portrait lock on widget dependencies (`SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp])`).
The camera preview texture itself **does not rotate**. Instead, device orientation changes are broadcast natively via `CamerawesomePlugin.getNativeOrientation()`.

### Orientation-aware UI with `AwesomeOrientedWidget`
Wrap controls and action overlays in `AwesomeOrientedWidget` to smoothly counter-rotate icons when the user holds the phone in landscape:

```dart
AwesomeOrientedWidget(
  rotateWithDevice: true,
  child: IconButton(
    icon: const Icon(Icons.flash_on),
    onPressed: () => cameraState.sensorConfig.switchCameraFlash(),
  ),
)
```

### Aspect ratio configuration
Choose between:
- `CameraAspectRatios.ratio_16_9`
- `CameraAspectRatios.ratio_4_3` (Default standard for photographic sensors)
- `CameraAspectRatios.ratio_1_1` (Clipped square preview)

```dart
// Switch ratio programmatically
await cameraState.sensorConfig.setAspectRatio(CameraAspectRatios.ratio_16_9);
```

---

## Save configuration and media output

### `SaveConfig` parameters and builders
`SaveConfig` controls how images and videos are written:

```dart
final saveConfig = SaveConfig.photoAndVideo(
  initialCaptureMode: CaptureMode.photo,
  mirrorFrontCamera: true,
  photoPathBuilder: (List<Sensor> sensors) async {
    final dir = await getApplicationDocumentsDirectory();
    final path = '${dir.path}/photos/photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
    return SingleCaptureRequest(path, sensors.first);
  },
  videoPathBuilder: (List<Sensor> sensors) async {
    final dir = await getApplicationDocumentsDirectory();
    final path = '${dir.path}/videos/video_${DateTime.now().millisecondsSinceEpoch}.mp4';
    return SingleCaptureRequest(path, sensors.first);
  },
  exifPreferences: ExifPreferences(saveGPSLocation: false),
);
```

---

## Image analysis

CamerAwesome provides a high-performance native image analysis pipeline designed for real-time computer vision (QR/barcodes, face detection, OCR).

### Native streaming differences
- **Android**: Powered by CameraX `ImageAnalysis` use case. Analysis runs independently of the preview stream and can run at a different resolution (e.g. 500px wide) (**P**).
- **iOS**: Analysis frames and preview frames originate from the same `AVCaptureVideoDataOutput`. Setting analysis reduces the preview capture resolution to prevent frame drops (**P**).

### Analysis configuration
Configure analysis parameters via `AnalysisConfig`:

```dart
AnalysisConfig(
  // Target width for Android CameraX (500 is optimal for barcodes/faces)
  androidOptions: const AndroidAnalysisOptions.nv21(width: 500),
  // iOS only supports bgra8888
  cupertinoOptions: const CupertinoAnalysisOptions.bgra8888(),
  // Throttle frame delivery (crucial for CPU/battery savings!)
  maxFramesPerSecond: 10,
  autoStart: true,
)
```

### Backpressure and the native handshake
**D:** CamerAwesome implements an explicit acknowledgement handshake in `AnalysisController`:
```dart
imageSubscription = _images$?.listen((event) async {
  await onImageListener!(AnalysisImage.from(event));
  await CamerawesomePlugin.receivedImageFromStream();
});
```
- `CamerawesomePlugin.receivedImageFromStream()` notifies native CameraX/AVFoundation that the Dart layer has finished processing the frame.
- **Critical Rule**: Always `await` your image processing logic in `onImageForAnalysis`. If you launch un-awaited asynchronous futures, frames will continue to arrive faster than your model can infer, resulting in memory growth and UI isolate stutter (**E**).

### Integrating with Google ML Kit
Create a dedicated adapter extension to convert `AnalysisImage` into ML Kit's `InputImage`:

```dart
import 'dart:io';
import 'package:camerawesome/camerawesome_plugin.dart';
import 'package:google_mlkit_commons/google_mlkit_commons.dart';

extension MLKitImageAnalysisAdapter on AnalysisImage {
  InputImage toInputImage() {
    return when(
      nv21: (Nv21Image image) {
        return InputImage.fromBytes(
          bytes: image.bytes,
          metadata: InputImageMetadata(
            size: image.size,
            rotation: _mlKitRotation(rotation),
            format: InputImageFormat.nv21,
            bytesPerRow: image.planes.first.bytesPerRow,
          ),
        );
      },
      bgra8888: (Bgra8888Image image) {
        return InputImage.fromBytes(
          bytes: image.bytes,
          metadata: InputImageMetadata(
            size: image.size,
            rotation: _mlKitRotation(rotation),
            format: InputImageFormat.bgra8888,
            bytesPerRow: image.planes.first.bytesPerRow,
          ),
        );
      },
    )!;
  }

  InputImageRotation _mlKitRotation(InputAnalysisImageRotation rot) {
    switch (rot) {
      case InputAnalysisImageRotation.rotation0deg:
        return InputImageRotation.rotation0deg;
      case InputAnalysisImageRotation.rotation90deg:
        return InputImageRotation.rotation90deg;
      case InputAnalysisImageRotation.rotation180deg:
        return InputImageRotation.rotation180deg;
      case InputAnalysisImageRotation.rotation270deg:
        return InputImageRotation.rotation270deg;
    }
  }
}
```

### Coordinate mapping: Analysis coordinates to preview coordinates
When ML Kit detects bounding boxes or facial contours, the coordinates are in **analysis image space**, which differs from Flutter screen coordinates due to aspect ratio cropping and orientation.

Use `AnalysisPreview.convertFromImage(...)` to map detected points accurately (**D**):

```dart
// Map corner points from barcode detection to Flutter preview pixels:
final Offset topLeftFlutter = preview.convertFromImage(
  Offset(barcode.cornerPoints[0].x.toDouble(), barcode.cornerPoints[0].y.toDouble()),
  analysisImage,
);

final Offset bottomRightFlutter = preview.convertFromImage(
  Offset(barcode.cornerPoints[2].x.toDouble(), barcode.cornerPoints[2].y.toDouble()),
  analysisImage,
);

final Rect boundingBoxOnScreen = Rect.fromPoints(topLeftFlutter, bottomRightFlutter);
```

### Android simultaneous recording and analysis check
**P:** On Android, recording video and streaming image analysis simultaneously is only supported on hardware level `LEVEL_3` devices.
Check compatibility dynamically before configuring simultaneous capture (**D**):

```dart
final bool isSupported = await CameraCharacteristics
    .isVideoRecordingAndImageAnalysisSupported(SensorPosition.back);

if (!isSupported) {
  // Disable image analysis while recording, or run preview-only mode
}
```

---

## Custom camera UI

When building a custom camera UI with `CameraAwesomeBuilder.custom(...)`, avoid unnecessary widget rebuilds:

1. **Do NOT rebuild the entire screen on property updates**: Keep `CameraAwesomeBuilder` at the top of the subtree and isolate dynamic buttons with targeted `StreamBuilder` widgets listening to `sensorConfig.flashMode$`, `sensorConfig.zoom$`, etc.
2. **Access state via `builder: (CameraState state, AnalysisPreview preview)`**: The builder gives direct access to the state machine.

```dart
CameraAwesomeBuilder.custom(
  saveConfig: SaveConfig.photo(),
  builder: (CameraState state, AnalysisPreview preview) {
    return Stack(
      children: [
        // Reticle / Bounding box overlay
        Positioned.fill(
          child: CustomPaint(
            painter: ReticlePainter(previewRect: preview.rect),
          ),
        ),
        // Bottom Shutter Controls
        Positioned(
          bottom: 40,
          left: 0,
          right: 0,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Flash Toggle Button (rebuilds only itself)
              StreamBuilder<FlashMode>(
                stream: state.sensorConfig.flashMode$,
                builder: (context, snapshot) {
                  final flash = snapshot.data ?? FlashMode.none;
                  return IconButton(
                    icon: Icon(
                      flash == FlashMode.none ? Icons.flash_off : Icons.flash_on,
                      color: Colors.white,
                    ),
                    onPressed: () => state.sensorConfig.switchCameraFlash(),
                  );
                },
              ),
              // Shutter Button
              GestureDetector(
                onTap: () {
                  state.when(
                    onPhotoMode: (photoState) => photoState.takePhoto(),
                  );
                },
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                ),
              ),
              // Lens Switcher
              IconButton(
                icon: const Icon(Icons.flip_camera_ios, color: Colors.white),
                onPressed: () => state.switchCameraSensor(),
              ),
            ],
          ),
        ),
      ],
    );
  },
)
```

---

## Performance engineering

### Concrete DO and DON'T rules

- **DO bound the image analysis frame rate**: Always provide `maxFramesPerSecond` (e.g. 5 to 15 FPS) in `AnalysisConfig`. An unconstrained stream sends 30 to 60 high-resolution byte buffers per second across the platform channel, saturating the Flutter isolate and generating excessive GC pressure (**E**).
- **DO use small resolutions for computer vision**: Set `width: 250` or `500` in `AndroidAnalysisOptions.nv21`. Barcode and face detection models perform identically on 500px images while reducing native-to-Dart memory transfer by up to 80% (**E**).
- **DO stop analysis when results are obtained**: Once a valid QR code or barcode is scanned, call `cameraState.analysisController?.stop()` immediately to prevent wasteful background compute (**E**).
- **DO keep `CameraAwesomeBuilder` high in the tree**: Never trigger a rebuild of the widget owning `CameraAwesomeBuilder` merely because zoom level or flash mode changed (**E**).
- **DON'T perform heavy synchronous ML or image processing on the UI isolate**: If converting large raw YUV/NV21 byte arrays to JPEG using package `image`, offload the computation using `compute()` or a background Dart isolate (**E**).
- **DON'T unmount and remount `CameraAwesomeBuilder` to change settings**: Use `state.switchCameraSensor()`, `state.sensorConfig.setAspectRatio()`, or `state.setState()` instead of recreating the widget tree (**E**).
- **DON'T keep multiple `CameraAwesomeBuilder` instances in memory**: Verify that previous routes with camera previews are popped or disposed before launching another (**E**).

---

## Concurrency and async safety

### Race condition prevention
1. **Double Shutter Taps**: Users frequently tap capture buttons repeatedly. Protect capture calls with a debounce boolean or check `state.captureState?.status == MediaCaptureStatus.capturing`.
2. **State Transition Collisions**: Never call `state.setState()` while `state` is `PreparingCameraState` (throws `CameraNotReadyException`).
3. **Video Recording State Invariant**: When video recording is started, you **must** call `recordingState.stopRecording()` before changing capture mode or switching lenses (**D**).
4. **Disposed Subscriptions**: When listening to `sensorConfig.zoom$` or `sensorConfig.flashMode$` in `StatefulWidget` classes, always cancel the `StreamSubscription` in `dispose()` to prevent memory leaks (**E**).

---

## Application architecture

Scale camera integration architecture according to application complexity:

### 1. Small / Single-purpose camera screen (e.g. Profile Photo Picker)
- Use `CameraAwesomeBuilder.awesome` directly within a standard `StatefulWidget`.
- Handle the captured path in `onMediaTap` or `onMediaCaptureEvent`.
- No separate service or state management layer required.

### 2. Medium feature (e.g. Document scanner with review step)
- Use `CameraAwesomeBuilder.custom` with a dedicated presentation widget.
- Extract UI controls into isolated, rebuild-scoped widgets (`ShutterButton`, `FlashToggle`, `LensSelector`).
- Handle business logic (saving metadata, analytics, upload queue) in a dedicated domain controller or BLoC/Notifier that receives the output `CaptureRequest`.

### 3. Camera-heavy / Real-time computer vision app (e.g. Continuous inventory barcode scanner)
- Use `CameraAwesomeBuilder.previewOnly`.
- **Presentation Layer**: Renders camera preview and bounding box overlays via `CustomPainter`.
- **Vision Pipeline Layer**: Manages `AnalysisConfig`, frame throttling, and ML Kit detector lifecycle.
- **Domain Layer**: Processes detected barcodes, handles debouncing/deduplication, triggers haptic feedback, and interacts with backend APIs.

---

## Error handling and recovery

| Failure scenario | Detection mechanism | Recommended recovery | User experience |
|---|---|---|---|
| Camera permission denied | `onPermissionsResult(false)` or `permission_handler` status check | Do not initialize camera; display an in-place placeholder with a button to request permissions or open system settings. | Clear explanatory text explaining why the camera is required with an actionable button. |
| Microphone permission denied during video | `MediaCaptureStatus.failure` on `startRecording()` | Re-check `Permission.microphone`; offer user the choice to record video without audio. | Dialog: "Record without audio or grant microphone permission in Settings." |
| Android LEVEL_3 hardware limitation | `CameraCharacteristics.isVideoRecordingAndImageAnalysisSupported()` returns `false` | Disable real-time image analysis before switching to video recording mode. | Smooth degradation: preview and video work without crashing. |
| Disk space exhausted / File write failure | `MediaCaptureStatus.failure` with `IOException` in `onMediaCaptureEvent` | Catch filesystem error, inspect free disk space with `path_provider`, clean temporary files. | Snackbar: "Insufficient storage space to save photo." |
| Camera hardware session collision | Crash on `CameraInterface().start()` when navigating between camera pages | Ensure previous camera route is fully disposed before pushing new camera screen; avoid simultaneous hero transitions. | Prevent app freeze by sequencing navigation cleanly. |
| Rapid camera switching crash | Unhandled native exception during `switchCameraSensor()` | Guard lens switching with a debounce flag (`_isSwitchingLens`) until the future resolves. | Shutter/flip button temporarily disabled until lens settles. |

---

## Platform-specific caveats

### Android
- **Front Camera Mirroring**: Front camera frames delivered to `onImageForAnalysis` are **not** mirrored natively, even though the preview texture is mirrored. When computing bounding boxes for the front camera, apply an X-axis flip transformation (**D**).
- **Orientation Inversion**: On Android, image width and height reported by `AnalysisImage` are swapped relative to Flutter screen dimensions in portrait mode (**D**).
- **CameraX Minimum API**: While `minSdkVersion` is 21, CameraX features (such as 60 FPS or HDR capture) depend on vendor HAL3 implementations. Test on lower-end devices (Android Go, MediaTek chipsets) (**P**).

### iOS
- **Analysis Resolution Fixed**: iOS does not support custom analysis target widths via `CupertinoAnalysisOptions`. The native engine chooses an optimized resolution based on preview constraints (**D**).
- **Format Limitation**: iOS image analysis exclusively supports `InputAnalysisImageFormat.bgra8888` (**D**).
- **App Store Submission Requirement**: If microphone is not utilized, strip the `AVAudioSession` microphone reference via Podfile `AUDIO_SESSION_MICROPHONE=0` to prevent review rejection (**D**).

---

## Testing strategy

1. **Unit tests**:
   - Unit test path generation logic (`CaptureRequestBuilder`).
   - Unit test ML Kit coordinate transformation mathematics (`convertFromImage`, rect intersection logic).
   - Mock camera domain controllers using simulated `MediaCapture` events.
2. **Widget tests**:
   - Widget tests running in headless environments cannot access native CameraX / AVFoundation camera textures.
   - When widget testing screens containing `CameraAwesomeBuilder`, mock or wrap the camera builder behind a testable abstraction, or test subcomponents (`AwesomeOrientedWidget`, `AwesomeFlashButton`) in isolation.
3. **Physical device testing (Mandatory for hardware validation)**:
   - **Hardware lens verification**: Validate switching across all available physical lenses (ultra-wide, telephoto).
   - **Rotation testing**: Rotate device 90, 180, and 270 degrees in both portrait and landscape orientations. Verify captured JPEG Exif orientation tags match visual expectation.
   - **App backgrounding**: Press Home / switch apps while video is recording; verify recording terminates cleanly without corrupted files.
   - **Thermal & battery profile**: Profile with Android Studio Profiler or Xcode Instruments during continuous 5-minute image analysis to verify FPS stability and absence of memory leaks.

---

## Common anti-patterns

### Anti-pattern 1: Launching un-awaited analysis workloads
```dart
// ❌ BAD: Launches un-awaited future; frames backlog, memory balloons, app OOMs
onImageForAnalysis: (img) async {
  heavyMlModel.processImage(img.toInputImage()); // Un-awaited!
}

// ✅ GOOD: Await processing to enforce backpressure handshake with native side
onImageForAnalysis: (img) async {
  await heavyMlModel.processImage(img.toInputImage());
}
```

### Anti-pattern 2: Rebuilding `CameraAwesomeBuilder` on configuration changes
```dart
// ❌ BAD: Changing zoom rebuilds the whole camera widget, restarting native session
Widget build(BuildContext context) {
  return CameraAwesomeBuilder.custom(
    sensorConfig: SensorConfig.single(zoom: _currentZoom), // State rebuild restarts camera!
    // ...
  );
}

// ✅ GOOD: Update properties imperatively through the existing SensorConfig
void onZoomChanged(double newZoom) {
  _cameraState.sensorConfig.setZoom(newZoom);
}
```

### Anti-pattern 3: Using 1.x builder signatures in 2.x projects
```dart
// ❌ BAD: 1.x legacy signature (causes compile error in 2.x)
builder: (CameraState state, PreviewSize previewSize, Rect previewRect) { ... }

// ✅ GOOD: 2.x modern signature
builder: (CameraState state, AnalysisPreview preview) { ... }
```

### Anti-pattern 4: Processing full-resolution analysis frames
```dart
// ❌ BAD: 1080p or unconstrained width transfer saturates platform channel
AnalysisConfig(
  androidOptions: const AndroidAnalysisOptions.nv21(width: 1920),
)

// ✅ GOOD: 250 - 500px width is optimal for barcode/face ML inference
AnalysisConfig(
  androidOptions: const AndroidAnalysisOptions.nv21(width: 500),
  maxFramesPerSecond: 10,
)
```

---

## Debugging playbook

| Symptom | Probable cause | Diagnostic & Fix sequence |
|---|---|---|
| **Black preview screen** | Camera hardware not started or permission denied | 1. Check logs for `CameraNotReadyException`.<br>2. Confirm `NSCameraUsageDescription` (iOS) or camera permissions (Android).<br>3. Verify another camera app or background process is not locking the hardware sensor. |
| **Preview stretched or distorted** | Mismatched preview fit or aspect ratio | 1. Set `previewFit: CameraPreviewFit.contain` (default in 2.4.0+).<br>2. Align `sensorConfig.aspectRatio` with container aspect ratio. |
| **Captured image orientation rotated 90°** | Native sensor orientation mismatch | 1. Ensure `exifPreferences` is preserved.<br>2. Verify viewing widget respects image Exif metadata. |
| **Analysis callback not firing** | `AnalysisConfig.autoStart` is false, or previous frame future never completed | 1. Verify `autoStart: true` or explicitly call `state.analysisController?.start()`.<br>2. Verify `onImageForAnalysis` callback is not hanging on an uncompleted future. |
| **App Store review rejected (Microphone)** | Unused `AVAudioSession` symbol detected on iOS | Add `AUDIO_SESSION_MICROPHONE=0` preprocessor definition to `ios/Podfile` post_install block. |
| **High CPU / Device overheating** | Unthrottled image analysis stream | 1. Set `maxFramesPerSecond: 10` or lower.<br>2. Reduce `androidOptions.width` to `250` or `500`.<br>3. Call `analysisController?.stop()` when scanning is paused. |

---

## Decision tables

### Builder constructor selection
```
Need in-app camera?
 ├── Simple profile photo / video from gallery? ──> Use image_picker (do not use CamerAwesome)
 └── Need real-time camera viewfinder?
      ├── Turn-key camera UI with standard buttons? ──> CameraAwesomeBuilder.awesome
      ├── Custom branded UI, custom shutter, overlays? ──> CameraAwesomeBuilder.custom
      ├── Barcode / Face / ML scanner with preview? ──> CameraAwesomeBuilder.previewOnly
      └── Background / Canvas filtering without preview? ──> CameraAwesomeBuilder.analysisOnly
```

### Analysis format and resolution selection
| Platform | Target ML Model | Recommended format | Recommended width | Target FPS |
|---|---|---|---|---|
| Android | Barcode / QR scanning | `AndroidAnalysisOptions.nv21` | `500` | `10 - 15` |
| Android | Face detection | `AndroidAnalysisOptions.nv21` | `250 - 500` | `15` |
| Android | Image filtering / Preview | `AndroidAnalysisOptions.yuv420` | `500 - 1000` | `30` |
| iOS | Barcode / Face / Vision | `CupertinoAnalysisOptions.bgra8888` | Native auto | `10 - 15` |

---

## AI coding-agent workflow

When tasked with implementing or modifying CamerAwesome code in a Flutter project, follow this exact operational sequence:

```
[1. Inspect Repository] ──> Read pubspec.yaml, check camerawesome version (must be 2.x).
           │
[2. Verify Platforms]   ──> Ensure Android & iOS only. Abort if desktop or web requested.
           │
[3. Check Native Setup] ──> Verify Info.plist descriptions, AndroidManifest, minSdkVersion 21+.
           │
[4. Select Builder]     ──> Choose .awesome, .custom, .previewOnly, or .analysisOnly.
           │
[5. Design Lifecycle]   ──> Ensure single camera session; isolate stream rebuilds.
           │
[6. Configure Capture]  ──> Set SaveConfig, paths, Exif, and VideoOptions.
           │
[7. Throttle Analysis]  ──> Set maxFramesPerSecond <= 15 and width <= 500 if using ML.
           │
[8. Implement UI]       ──> Use AwesomeOrientedWidget for rotating controls.
           │
[9. Verify & Test]      ──> Run flutter analyze; check hardware camera on real device.
```

---

## Code-review checklist

Apply this checklist before approving any CamerAwesome PR or task:

- [ ] **Package version**: Does code match `2.x` APIs (`CameraLayoutBuilder = Widget Function(CameraState, AnalysisPreview)`)?
- [ ] **Platform isolation**: Are unsupported platforms (Web, macOS, Windows, Linux) guarded against importing or executing CamerAwesome?
- [ ] **Permissions declared**: Are `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` (if recording video) declared in `Info.plist`?
- [ ] **Microphone stripped if unused**: Is `AUDIO_SESSION_MICROPHONE=0` set in `ios/Podfile` for preview-only / barcode-only apps?
- [ ] **Android SDK level**: Is `minSdkVersion >= 21` configured in `android/app/build.gradle`?
- [ ] **No duplicate sessions**: Are routes structured so that two `CameraAwesomeBuilder` instances never exist simultaneously?
- [ ] **Rebuild boundaries**: Are shutter, zoom, and flash buttons isolated with `StreamBuilder` rather than rebuilding `CameraAwesomeBuilder`?
- [ ] **Analysis backpressure**: Is `onImageForAnalysis` properly `await`ed to prevent unbounded frame queueing?
- [ ] **Analysis rate bounded**: Is `maxFramesPerSecond` explicitly configured in `AnalysisConfig`?
- [ ] **Coordinate mapping**: Are bounding box coordinates mapped using `preview.convertFromImage(...)` rather than raw screen offsets?
- [ ] **Subscription cleanup**: Are all application-created `StreamSubscription` instances cancelled in `dispose()`?
- [ ] **Video stop invariant**: Does the UI prevent state changes while video is actively recording without calling `stopRecording()` first?

---

## Reference implementations

### 1. Production-ready photo and video camera with custom controls

```dart
import 'dart:io';
import 'package:camerawesome/camerawesome_plugin.dart';
import 'package:camerawesome/pigeon.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';

class ProductionCameraScreen extends StatefulWidget {
  const ProductionCameraScreen({super.key});

  @override
  State<ProductionCameraScreen> createState() => _ProductionCameraScreenState();
}

class _ProductionCameraScreenState extends State<ProductionCameraScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: CameraAwesomeBuilder.custom(
        saveConfig: SaveConfig.photoAndVideo(
          initialCaptureMode: CaptureMode.photo,
          mirrorFrontCamera: true,
          photoPathBuilder: (sensors) async {
            final dir = await getApplicationDocumentsDirectory();
            final filePath = '${dir.path}/photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
            return SingleCaptureRequest(filePath, sensors.first);
          },
          videoPathBuilder: (sensors) async {
            final dir = await getApplicationDocumentsDirectory();
            final filePath = '${dir.path}/video_${DateTime.now().millisecondsSinceEpoch}.mp4';
            return SingleCaptureRequest(filePath, sensors.first);
          },
          videoOptions: VideoOptions(
            enableAudio: true,
            quality: VideoRecordingQuality.fhd,
            android: AndroidVideoOptions(
              bitrate: 6000000,
              fallbackStrategy: QualityFallbackStrategy.lower,
            ),
          ),
        ),
        sensorConfig: SensorConfig.single(
          sensor: Sensor.position(SensorPosition.back),
          aspectRatio: CameraAspectRatios.ratio_4_3,
          flashMode: FlashMode.none,
        ),
        previewFit: CameraPreviewFit.cover,
        builder: (CameraState state, AnalysisPreview preview) {
          return SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top controls bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      AwesomeOrientedWidget(
                        child: StreamBuilder<FlashMode>(
                          stream: state.sensorConfig.flashMode$,
                          builder: (context, snapshot) {
                            final flash = snapshot.data ?? FlashMode.none;
                            return IconButton(
                              icon: Icon(
                                flash == FlashMode.none ? Icons.flash_off : Icons.flash_on,
                                color: Colors.white,
                              ),
                              onPressed: () => state.sensorConfig.switchCameraFlash(),
                            );
                          },
                        ),
                      ),
                      AwesomeOrientedWidget(
                        child: StreamBuilder<CameraAspectRatios>(
                          stream: state.sensorConfig.aspectRatio$,
                          builder: (context, snapshot) {
                            final ratio = snapshot.data ?? CameraAspectRatios.ratio_4_3;
                            return TextButton(
                              onPressed: () => state.sensorConfig.switchCameraRatio(),
                              child: Text(
                                ratio.name.replaceAll('ratio_', '').replaceAll('_', ':'),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                // Bottom control panel
                Padding(
                  padding: const EdgeInsets.only(bottom: 24),
                  child: Column(
                    children: [
                      // Mode Selector (Photo / Video)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ChoiceChip(
                            label: const Text('PHOTO'),
                            selected: state.captureMode == CaptureMode.photo,
                            onSelected: (_) => state.setState(CaptureMode.photo),
                          ),
                          const SizedBox(width: 12),
                          ChoiceChip(
                            label: const Text('VIDEO'),
                            selected: state.captureMode == CaptureMode.video,
                            onSelected: (_) => state.setState(CaptureMode.video),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Shutter Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          const SizedBox(width: 48), // Spacer
                          _ShutterButton(state: state),
                          AwesomeOrientedWidget(
                            child: IconButton(
                              icon: const Icon(Icons.flip_camera_ios, color: Colors.white, size: 32),
                              onPressed: () => state.switchCameraSensor(),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ShutterButton extends StatelessWidget {
  final CameraState state;

  const _ShutterButton({required this.state});

  @override
  Widget build(BuildContext context) {
    return state.when(
      onPhotoMode: (photoState) => GestureDetector(
        onTap: () async {
          await photoState.takePhoto(
            onPhoto: (req) => debugPrint('Saved: ${req.path}'),
            onPhotoFailed: (err) => debugPrint('Error: $err'),
          );
        },
        child: Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 4),
            color: Colors.white24,
          ),
          child: Center(
            child: Container(
              width: 58,
              height: 58,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ),
      onVideoMode: (videoState) => GestureDetector(
        onTap: () => videoState.startRecording(),
        child: Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.red, width: 4),
          ),
          child: Center(
            child: Container(
              width: 58,
              height: 58,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.red,
              ),
            ),
          ),
        ),
      ),
      onVideoRecordingMode: (recordingState) => GestureDetector(
        onTap: () => recordingState.stopRecording(),
        child: Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.red, width: 4),
          ),
          child: Center(
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ),
    ) ?? const SizedBox.shrink();
  }
}
```

---

### 2. High-performance ML Kit barcode scanner with coordinate reticle

```dart
import 'package:camerawesome/camerawesome_plugin.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';

class BarcodeScannerScreen extends StatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  final BarcodeScanner _scanner = BarcodeScanner(formats: [BarcodeFormat.all]);
  String? _scannedValue;
  Rect? _barcodeBoundingBox;
  bool _isProcessing = false;

  @override
  void dispose() {
    _scanner.close();
    super.dispose();
  }

  Future<void> _handleImageAnalysis(AnalysisImage image, AnalysisPreview preview) async {
    if (_isProcessing || _scannedValue != null) return;
    _isProcessing = true;

    try {
      final inputImage = _convertToInputImage(image);
      final List<Barcode> barcodes = await _scanner.processImage(inputImage);

      if (barcodes.isNotEmpty) {
        final barcode = barcodes.first;
        if (barcode.cornerPoints.length >= 4) {
          final topLeft = preview.convertFromImage(
            Offset(barcode.cornerPoints[0].x.toDouble(), barcode.cornerPoints[0].y.toDouble()),
            image,
          );
          final bottomRight = preview.convertFromImage(
            Offset(barcode.cornerPoints[2].x.toDouble(), barcode.cornerPoints[2].y.toDouble()),
            image,
          );

          if (mounted) {
            setState(() {
              _scannedValue = barcode.rawValue;
              _barcodeBoundingBox = Rect.fromPoints(topLeft, bottomRight);
            });
          }
        }
      }
    } catch (e) {
      debugPrint('ML Kit analysis error: $e');
    } finally {
      _isProcessing = false;
    }
  }

  InputImage _convertToInputImage(AnalysisImage image) {
    return image.when(
      nv21: (nv21) => InputImage.fromBytes(
        bytes: nv21.bytes,
        metadata: InputImageMetadata(
          size: nv21.size,
          rotation: InputImageRotation.values.byName(image.rotation.name),
          format: InputImageFormat.nv21,
          bytesPerRow: nv21.planes.first.bytesPerRow,
        ),
      ),
      bgra8888: (bgra) => InputImage.fromBytes(
        bytes: bgra.bytes,
        metadata: InputImageMetadata(
          size: bgra.size,
          rotation: InputImageRotation.values.byName(image.rotation.name),
          format: InputImageFormat.bgra8888,
          bytesPerRow: bgra.planes.first.bytesPerRow,
        ),
      ),
    )!;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan QR / Barcode')),
      body: CameraAwesomeBuilder.previewOnly(
        sensorConfig: SensorConfig.single(
          sensor: Sensor.position(SensorPosition.back),
          aspectRatio: CameraAspectRatios.ratio_16_9,
        ),
        imageAnalysisConfig: AnalysisConfig(
          androidOptions: const AndroidAnalysisOptions.nv21(width: 500),
          cupertinoOptions: const CupertinoAnalysisOptions.bgra8888(),
          maxFramesPerSecond: 10,
          autoStart: true,
        ),
        builder: (CameraState state, AnalysisPreview preview) {
          return Stack(
            children: [
              if (_barcodeBoundingBox != null)
                Positioned.fromRect(
                  rect: _barcodeBoundingBox!,
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.greenAccent, width: 3),
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              if (_scannedValue != null)
                Positioned(
                  bottom: 40,
                  left: 20,
                  right: 20,
                  child: Card(
                    color: Colors.black87,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _scannedValue!,
                            style: const TextStyle(color: Colors.white, fontSize: 16),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () {
                              setState(() {
                                _scannedValue = null;
                                _barcodeBoundingBox = null;
                              });
                            },
                            child: const Text('Scan Again'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
        onImageForAnalysis: (img) async {
          // Note: In custom pipelines, pass current preview to handler
        },
      ),
    );
  }
}
```

---

## Quick-reference rules

- **DO** verify the installed `camerawesome` version before writing code; never mix `1.x` with `2.x` APIs.
- **DO** configure `maxFramesPerSecond` (5–15 FPS) in `AnalysisConfig` to avoid CPU thermal throttling and memory growth.
- **DO** set `width: 500` on Android `AnalysisConfig` for computer vision workloads.
- **DO** `await` inference calls inside `onImageForAnalysis` to maintain the native backpressure handshake.
- **DO** wrap control buttons in `AwesomeOrientedWidget` so they rotate cleanly when the user turns the phone.
- **DO** use `preview.convertFromImage(...)` to map detected ML points into Flutter screen coordinates.
- **DO** strip microphone symbols in `ios/Podfile` via `AUDIO_SESSION_MICROPHONE=0` for preview-only apps.
- **DON'T** configure CamerAwesome for Web, Windows, macOS, or Linux targets; it supports Android and iOS only.
- **DON'T** rebuild the parent widget of `CameraAwesomeBuilder` to modify zoom, flash, or aspect ratio.
- **DON'T** instantiate multiple active `CameraAwesomeBuilder` widgets concurrently across navigation routes.
- **DON'T** call `state.setState()` while the camera is in `PreparingCameraState`.
- **DON'T** rely on unit tests to prove camera functionality; validate on real iOS and Android hardware.

---

## Official references

- [CamerAwesome on Pub.dev](https://pub.dev/packages/camerawesome): Verified latest release (`2.5.0`), SDK constraints, and supported platforms.
- [Official CamerAwesome Documentation](https://docs.page/Apparence-io/camera_awesome): Verified architecture, builders, theming, ML Kit integration, and coordinate mapping.
- [Official CamerAwesome GitHub Repository](https://github.com/Apparence-io/camera_awesome): Verified state classes, Pigeon bridge definitions, CameraX 1.4.2 setup, and sample implementations.
- [Android CameraX Documentation](https://developer.android.com/training/camerax): Verified hardware LEVEL_3 use-case combination constraints for simultaneous video and image analysis.
- [Apple AVFoundation Documentation](https://developer.apple.com/documentation/avfoundation): Verified iOS 12.0+ deployment target and `AVAudioSession` App Store review guidelines.