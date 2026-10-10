# document_camera_frame API Reference

Detailed API specification for `document_camera_frame` (v2.6.12).

---

## 1. Top-Level Widgets & Classes

### `DocumentCameraFrame`
Main entrypoint widget presenting the camera viewfinder and overlay:
```dart
class DocumentCameraFrame extends StatefulWidget {
  final DocumentCameraConfig config;
  final void Function(DocumentCaptureData data)? onDocumentSaved;
  final void Function(Object error)? onCameraError;
  final Widget? customOverlay;

  const DocumentCameraFrame({
    super.key,
    required this.config,
    this.onDocumentSaved,
    this.onCameraError,
    this.customOverlay,
  });
}
```

### `DocumentCameraConfig`
```dart
class DocumentCameraConfig {
  final double aspectRatio;
  final DocumentCameraUIMode uiMode;
  final bool enableFlash;
  final bool enableFlipCamera;
  final String instructionText;
  final DocumentCameraFrameStyle style;
  final DocumentDetectionConfig detectionConfig;
  final DocumentExportConfig exportConfig;
  final DocumentOcrConfig ocrConfig;

  const DocumentCameraConfig({
    this.aspectRatio = 1.586,
    this.uiMode = DocumentCameraUIMode.defaultMode,
    this.enableFlash = true,
    this.enableFlipCamera = false,
    this.instructionText = 'Align document within the frame',
    this.style = const DocumentCameraFrameStyle(),
    this.detectionConfig = const DocumentDetectionConfig(),
    this.exportConfig = const DocumentExportConfig(),
    this.ocrConfig = const DocumentOcrConfig(),
  });
}
```

### `DocumentCameraUIMode`
```dart
enum DocumentCameraUIMode {
  defaultMode,  // Standard viewfinder with framing corners and capture button
  minimal,      // Streamlined UI without extra controls
  overlay,      // Translucent tinted background mask around the frame cut-out
  kiosk,        // Lockdown mode without user-accessible settings or flip toggles
  textExtract,  // Viewfinder tuned for live text detection and immediate OCR
  camScanner,   // Native OS document scanning engine (Google ML Kit / Apple VisionKit)
}
```

### `DocumentCaptureData`
Data object returned when popping the navigator:
```dart
class DocumentCaptureData {
  final List<File> scannedFiles;
  final File? pdfFile;
  final File? tiffFile;
  final File? previewImageFile;
  final String? extractedText;
  final Map<String, dynamic>? metadata;

  const DocumentCaptureData({
    required this.scannedFiles,
    this.pdfFile,
    this.tiffFile,
    this.previewImageFile,
    this.extractedText,
    this.metadata,
  });
}
```

### `DocumentCameraFrameStyle`
```dart
class DocumentCameraFrameStyle {
  final Color frameColor;
  final double strokeWidth;
  final double cornerLength;
  final double innerCornerBorderRadius; // Note: 'innerCornerBroderRadius' typo was fixed
  final Color overlayMaskColor;

  const DocumentCameraFrameStyle({
    this.frameColor = Colors.white,
    this.strokeWidth = 3.0,
    this.cornerLength = 32.0,
    this.innerCornerBorderRadius = 12.0,
    this.overlayMaskColor = const Color(0x88000000),
  });
}
```
