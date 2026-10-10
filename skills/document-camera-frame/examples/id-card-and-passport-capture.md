# Production ID Card & Passport Capture Examples

Production-ready implementation recipes for capturing ID cards, driver's licenses, and passports using `document_camera_frame`.

---

## 1. ID Card / Driver's License Capture (CR80 Standard Aspect Ratio)

The standard ISO/IEC 7810 ID-1 (CR80) card format has dimensions 85.60 mm × 53.98 mm, giving an aspect ratio of approximately `1.586`.

```dart
import 'dart:io';
import 'package:document_camera_frame/document_camera_frame.dart';
import 'package:flutter/material.dart';

class IdCardCaptureScreen extends StatelessWidget {
  const IdCardCaptureScreen({super.key});

  static const double cr80AspectRatio = 85.60 / 53.98; // ~1.586

  Future<void> _startIdScan(BuildContext context) async {
    final DocumentCaptureData? result = await Navigator.push<DocumentCaptureData>(
      context,
      MaterialPageRoute(
        builder: (context) => DocumentCameraFrame(
          config: DocumentCameraConfig(
            aspectRatio: cr80AspectRatio,
            uiMode: DocumentCameraUIMode.overlay,
            enableFlash: true,
            enableFlipCamera: false,
            detectionConfig: const DocumentDetectionConfig(
              enableAutoCapture: true,
              confidenceThreshold: 0.85,
              stabilityDuration: Duration(milliseconds: 700),
            ),
            style: const DocumentCameraFrameStyle(
              frameColor: Colors.blueAccent,
              innerCornerBorderRadius: 16.0,
              strokeWidth: 3.5,
              cornerLength: 36.0,
            ),
            exportConfig: const DocumentExportConfig(
              exportFormat: DocumentExportFormat.jpg,
              imageQuality: 92,
            ),
            instructionText: 'Align ID card within the frame',
          ),
          onCameraError: (Object error) {
            debugPrint('Camera capture error: $error');
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Camera error: $error')),
            );
          },
        ),
      ),
    );

    if (result == null || !context.mounted) return;

    // Process captured document data
    final File imageFile = result.scannedFiles.first;
    debugPrint('Captured ID card image: ${imageFile.path}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Identity Verification')),
      body: Center(
        child: ElevatedButton.icon(
          onPressed: () => _startIdScan(context),
          icon: const Icon(Icons.badge_outlined),
          label: const Text('Scan Government ID'),
        ),
      ),
    );
  }
}
```

---

## 2. Passport Capture with On-Device MRZ OCR

Capturing passport bio-data pages with Latin OCR extraction enabled:

```dart
import 'package:document_camera_frame/document_camera_frame.dart';
import 'package:flutter/material.dart';

Future<void> openPassportScanner(BuildContext context) async {
  final DocumentCaptureData? result = await Navigator.push<DocumentCaptureData>(
    context,
    MaterialPageRoute(
      builder: (context) => DocumentCameraFrame(
        config: DocumentCameraConfig(
          aspectRatio: 125.0 / 88.0, // Standard B7 passport bio-page (~1.42)
          uiMode: DocumentCameraUIMode.textExtract,
          enableFlash: false,
          enableFlipCamera: false,
          instructionText: 'Position passport bio-page flat and in good light',
          style: const DocumentCameraFrameStyle(
            frameColor: Colors.tealAccent,
            innerCornerBorderRadius: 8.0,
            cornerLength: 42.0,
          ),
          ocrConfig: const DocumentOcrConfig(
            enableOcr: true,
            script: DocumentOcrScript.latin,
          ),
        ),
        onDocumentSaved: (DocumentCaptureData data) {
          debugPrint('Document saved to disk: ${data.scannedFiles.first.path}');
        },
      ),
    ),
  );

  if (result == null) {
    debugPrint('Passport capture cancelled by user');
    return;
  }

  // Extract OCR raw text
  final String? extractedOcr = result.extractedText;
  debugPrint('Passport OCR Text:\n$extractedOcr');
}
```
