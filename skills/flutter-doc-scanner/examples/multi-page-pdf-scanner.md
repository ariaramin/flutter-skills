# Multi-Page PDF Document Scanning Example

Complete production implementation of a multi-page PDF document scanner using `flutter_doc_scanner`.

---

## 1. Production PDF Scanner Widget with Concurrency Guard

```dart
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_doc_scanner/flutter_doc_scanner.dart';
import 'package:path_provider/path_provider.dart';

class PdfDocumentScannerScreen extends StatefulWidget {
  const PdfDocumentScannerScreen({super.key});

  @override
  State<PdfDocumentScannerScreen> createState() => _PdfDocumentScannerScreenState();
}

class _PdfDocumentScannerScreenState extends State<PdfDocumentScannerScreen> {
  final FlutterDocScanner _scanner = const FlutterDocScanner();
  bool _isScanning = false;
  File? _scannedPdfFile;
  int _pageCount = 0;

  Future<void> _startPdfScan() async {
    if (_isScanning) return;

    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Document scanning requires Android or iOS.')),
      );
      return;
    }

    setState(() => _isScanning = true);

    try {
      final PdfScanResult? result = await _scanner.getScannedDocumentAsPdf(page: 10);
      if (result == null) {
        // User cancelled the native scanning UI
        return;
      }

      final File resolvedFile = await _resolvePdfFile(result.pdfUri);

      setState(() {
        _scannedPdfFile = resolvedFile;
        _pageCount = result.pageCount;
      });
    } on DocScanException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Scan failed [${e.code}]: ${e.message}')),
      );
    } finally {
      if (mounted) {
        setState(() => _isScanning = false);
      }
    }
  }

  Future<File> _resolvePdfFile(String uriOrPath) async {
    final uri = Uri.parse(uriOrPath);
    if (uri.scheme == 'content') {
      // Android Content URI resolution
      final contentFile = File.fromUri(uri);
      final bytes = await contentFile.readAsBytes();
      final tempDir = await getTemporaryDirectory();
      final target = File('${tempDir.path}/scanned_doc_${DateTime.now().millisecondsSinceEpoch}.pdf');
      return await target.writeAsBytes(bytes);
    }
    return File(uriOrPath);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('PDF Document Scanner')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_scannedPdfFile != null) ...[
                const Icon(Icons.picture_as_pdf, size: 64, color: Colors.redAccent),
                const SizedBox(height: 12),
                Text(
                  'Scanned PDF (${_pageCount > 0 ? "$_pageCount pages" : "Ready"}):',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Text(
                  _scannedPdfFile!.path,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 24),
              ],
              ElevatedButton.icon(
                onPressed: _isScanning ? null : _startPdfScan,
                icon: _isScanning
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.document_scanner),
                label: Text(_isScanning ? 'Scanner Active...' : 'Scan Multi-Page PDF'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```
