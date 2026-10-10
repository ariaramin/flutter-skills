# Fast Single-Picture Auto-Scan (Zero-Review) Example

Using `useAutomaticSinglePictureProcessing: true` in `flutter_doc_scanner` for rapid, single-shot document capture (Android Base Scanner Mode & iOS AutoScan).

---

## 1. Single-Shot Receipt or Document Capture Service

```dart
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_doc_scanner/flutter_doc_scanner.dart';

class QuickScanService {
  final FlutterDocScanner _scanner = const FlutterDocScanner();

  /// Captures a single document image without post-capture review screens.
  /// On Android, uses Base Scanner Mode.
  /// On iOS, uses AutoScanViewController with Vision rectangle detection.
  Future<File?> captureSingleDocumentFast() async {
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
      throw UnsupportedError('Fast scanning is only supported on mobile platforms.');
    }

    try {
      final ImageScanResult? result = await _scanner.getScannedDocumentAsImages(
        page: 1, // Automatically enforced as 1 by native code
        useAutomaticSinglePictureProcessing: true,
      );

      if (result == null || result.images.isEmpty) {
        return null; // User cancelled
      }

      final String rawPath = result.images.first;
      final Uri uri = Uri.parse(rawPath);

      if (uri.scheme == 'content') {
        return File.fromUri(uri);
      }

      return File(rawPath);
    } on DocScanException catch (e) {
      debugPrint('Fast scan failed [${e.code}]: ${e.message}');
      rethrow;
    }
  }

  /// Cleans up temporary scanned image files on iOS sandbox.
  Future<void> cleanupFile(File file) async {
    if (!Platform.isIOS) return;
    try {
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      debugPrint('Failed to delete temporary scan file: $e');
    }
  }
}
```
