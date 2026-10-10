# Troubleshooting, Edge Cases & Production Pitfalls

Critical edge cases, platform bugs, and mitigation strategies for `flutter_doc_scanner`.

---

## 1. Android Content URI vs POSIX File Path Trap

### Symptom
Attempting to read or upload an Android scan result fails with:
`PathNotFoundException: Cannot open file, path = 'content://com.google.android.gms.provider...'`

### Root Cause
On Android, Google Play Services ML Kit returns content URIs (e.g. `content://com.google.android.gms.provider/...`) instead of filesystem paths (`/data/user/0/...`). Standard `dart:io` `File(path)` constructors expect POSIX file system paths, not Android content URIs.

### Solution
Use `Uri.parse(path).scheme == 'content'` detection. Read bytes via platform-safe mechanisms or copy the stream to app cache before passing to libraries requiring direct filesystem paths.

```dart
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

Future<File> resolveScanResultToFile(String uriOrPath) async {
  final uri = Uri.parse(uriOrPath);

  if (uri.scheme == 'content') {
    // Read Android Content URI via HttpClient or custom channel,
    // or use File.fromUri if supported by the runtime
    final file = File.fromUri(uri);
    try {
      final bytes = await file.readAsBytes();
      final tempDir = await getTemporaryDirectory();
      final targetFile = File('${tempDir.path}/scan_${DateTime.now().millisecondsSinceEpoch}.jpg');
      return await targetFile.writeAsBytes(bytes);
    } catch (_) {
      // Fallback for strict content URIs
      throw UnsupportedError('Cannot read content URI directly via File without resolver');
    }
  }

  // iOS or standard filesystem path
  return File(uriOrPath);
}
```

---

## 2. iOS Documents Directory Storage Leak

### Symptom
App sandbox size steadily increases; user's iCloud backup size expands unnecessarily; old scans remain on disk indefinitely.

### Root Cause
On iOS, the plugin writes every scanned image and PDF directly into the user's `Documents` directory:
`FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)`
The plugin **does not** clean up these files. iOS automatically backs up the `Documents` directory to iCloud by default.

### Solution
Implement an explicit cleanup lifecycle after processing, uploading, or storing the scanned documents.

```dart
import 'dart:io';

Future<void> cleanupScannedFiles(List<String> filePaths) async {
  for (final path in filePaths) {
    try {
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      debugPrint('Failed to delete temp scan file: $path ($e)');
    }
  }
}
```

---

## 3. The `PlatformException` Catching Trap

### Symptom
App crashes with an uncaught `DocScanException` even though the developer wrapped the call in `try / catch (e) on PlatformException`.

### Root Cause
In `flutter_doc_scanner_method_channel.dart`, the plugin intercepts native `PlatformException`s and wraps them in custom `DocScanException`s:
```dart
} on PlatformException catch (e) {
  throw DocScanException(code: e.code, message: e.message, details: e.details);
}
```
The official package example in `example/lib/main.dart` erroneously catches `PlatformException`, which will **never** catch exceptions rethrown by the method channel.

### Solution
Always catch `DocScanException` specifically, alongside a generic `Exception` fallback:
```dart
try {
  final result = await scanner.getScannedDocumentAsImages(page: 4);
} on DocScanException catch (e) {
  debugPrint('Scanner error [${e.code}]: ${e.message}');
} catch (e) {
  debugPrint('Unexpected error: $e');
}
```

---

## 4. iOS Simulator Hardware Incompatibility

### Symptom
Presenting the document scanner crashes or does nothing on iOS Simulator.

### Root Cause
Apple's VisionKit `VNDocumentCameraViewController` requires physical camera hardware and document edge-detection sensors. It is strictly unsupported on iOS Simulators.

### Solution
Always test scanning on a physical iPhone/iPad. In developer debug builds, mock the scanner or guard execution:
```dart
import 'package:flutter/foundation.dart';

bool isSimulator() {
  // Guard or mock when running in simulator environments
  return !kReleaseMode && defaultTargetPlatform == TargetPlatform.iOS;
}
```

---

## 5. `SCAN_IN_PROGRESS` Concurrency Lock

### Symptom
Rapidly tapping a "Scan" button throws:
`DocScanException(SCAN_IN_PROGRESS, Another scan is already running.)`

### Root Cause
Android's `FlutterDocScannerPlugin.kt` enforces single active scan execution:
```kotlin
if (pendingResult != null) {
    result.error("SCAN_IN_PROGRESS", "Another scan is already running.", null)
    return
}
```

### Solution
Disable scanning UI buttons and maintain an internal scanning state flag:
```dart
bool _isScanning = false;

Future<void> handleScanTap() async {
  if (_isScanning) return;
  setState(() => _isScanning = true);
  try {
    final result = await _scanner.getScannedDocumentAsImages(page: 4);
    if (result != null) {
      _processScannedImages(result.images);
    }
  } on DocScanException catch (e) {
    if (e.code == DocScanException.codeScanInProgress) {
      // Handled silently
      return;
    }
    _showErrorSnackBar(e.message);
  } finally {
    if (mounted) {
      setState(() => _isScanning = false);
    }
  }
}
```

---

## 6. iOS `NSCameraUsageDescription` Crash

### Symptom
App crashes with `SIGABRT` as soon as the camera is initialized with iOS crash log:
`This app has crashed because it attempted to access privacy-sensitive data without a usage description. The app's Info.plist must contain an NSCameraUsageDescription key with a string value explaining to the user how the app uses this data.`

### Solution
Add the privacy description key to `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Scan documents, receipts, and photos for document capture.</string>
```

---

## 7. `getScanDocuments()` Cross-Platform Return Discrepancy

### Symptom
Code that works on iOS crashes on Android with:
`type '_Map<Object?, Object?>' is not a subtype of type 'List<dynamic>' in type cast`

### Root Cause
`getScanDocuments()` returns fundamentally different structures across platforms:
- **Android**: Returns a `Map` with PDF information (`pdfUri` and `pageCount`).
- **iOS**: Returns a `List<String>` containing paths to scanned image PNG files.

### Solution
**Do not use `getScanDocuments()` in production.**
Instead, use the explicitly typed methods:
- `getScannedDocumentAsImages(...)` -> returns `ImageScanResult` uniformly.
- `getScannedDocumentAsPdf(...)` -> returns `PdfScanResult` uniformly.
