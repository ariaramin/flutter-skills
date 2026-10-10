# Multi-Page Native CamScanner Workflow

Using `DocumentCameraUIMode.camScanner` in `document_camera_frame` to delegate capture directly to Google ML Kit on Android and Apple VisionKit on iOS.

---

## 1. Native Document Scanning & PDF Assembly

In `camScanner` mode, the package bypasses custom framed Flutter views and delegates capture to the platform's native scanning engine, producing multi-page PDF documents.

```dart
import 'dart:io';
import 'package:document_camera_frame/document_camera_frame.dart';
import 'package:flutter/material.dart';

class ContractScannerScreen extends StatelessWidget {
  const ContractScannerScreen({super.key});

  Future<void> _scanContractPdf(BuildContext context) async {
    final DocumentCaptureData? captureData = await Navigator.push<DocumentCaptureData>(
      context,
      MaterialPageRoute(
        builder: (context) => DocumentCameraFrame(
          config: DocumentCameraConfig(
            uiMode: DocumentCameraUIMode.camScanner,
            exportConfig: const DocumentExportConfig(
              exportFormat: DocumentExportFormat.pdf,
              pdfPageSize: DocumentPdfPageSize.a4,
            ),
          ),
          onCameraError: (Object error) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Scanner error: $error')),
            );
          },
        ),
      ),
    );

    if (captureData == null || !context.mounted) return;

    // Check generated files
    for (final File file in captureData.scannedFiles) {
      debugPrint('Exported file: ${file.path}');
    }

    if (captureData.pdfFile != null) {
      debugPrint('Compiled Multi-Page PDF: ${captureData.pdfFile!.path}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contract Scanner')),
      body: Center(
        child: ElevatedButton.icon(
          onPressed: () => _scanContractPdf(context),
          icon: const Icon(Icons.picture_as_pdf_outlined),
          label: const Text('Scan Multi-Page Contract'),
        ),
      ),
    );
  }
}
```

---

## 2. TIFF Export with Preview Generation

For legal, healthcare, or archival workflows requiring multi-page TIFF images:

```dart
Future<void> scanMedicalChartToTiff(BuildContext context) async {
  final DocumentCaptureData? data = await Navigator.push<DocumentCaptureData>(
    context,
    MaterialPageRoute(
      builder: (context) => DocumentCameraFrame(
        config: const DocumentCameraConfig(
          uiMode: DocumentCameraUIMode.camScanner,
          exportConfig: DocumentExportConfig(
            exportFormat: DocumentExportFormat.tiff,
            generateJpgPreviewForTiff: true,
          ),
        ),
      ),
    ),
  );

  if (data == null) return;

  debugPrint('TIFF File: ${data.tiffFile?.path}');
  debugPrint('TIFF Preview: ${data.previewImageFile?.path}');
}
```
