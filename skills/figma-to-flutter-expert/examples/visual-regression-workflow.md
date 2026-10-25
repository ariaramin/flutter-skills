# Executable Visual Regression & Golden Testing Workflow

This example demonstrates how to set up, execute, and troubleshoot an automated visual regression test suite verifying Flutter widgets against Figma artboard references.

---

## 1. Complete Test Suite Implementation

Save this file in your project at `test/goldens/figma_fidelity_test.dart`:

```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

// Import your production component
// import 'package:my_app/presentation/components/product_feature_card.dart';

Future<void> loadTrueFonts() async {
  // Load Roboto/Inter font files from assets or test directory
  final fontFile = File('assets/fonts/Inter-Regular.ttf');
  if (await fontFile.exists()) {
    final fontBytes = await fontFile.readAsBytes();
    final fontLoader = FontLoader('Inter');
    fontLoader.addFont(Future.value(ByteData.view(fontBytes.buffer)));
    await fontLoader.load();
  }
}

Widget buildTestScaffold({required Widget child, required Size viewportSize}) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1E73F2)),
    ),
    home: Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: Center(
        child: SizedBox(
          width: viewportSize.width,
          height: viewportSize.height,
          child: child,
        ),
      ),
    ),
  );
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await loadTrueFonts();
  });

  group('Figma Fidelity Golden Verification', () {
    testWidgets('Mobile Viewport (393 x 852 @ 3x) matches Figma Frame', (WidgetTester tester) async {
      // 1. Configure exact physical dimensions matching iPhone 15 Pro
      const logicalSize = Size(393, 852);
      const pixelRatio = 3.0;

      tester.view.physicalSize = Size(
        logicalSize.width * pixelRatio,
        logicalSize.height * pixelRatio,
      );
      tester.view.devicePixelRatio = pixelRatio;

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      // 2. Render target widget under test
      await tester.pumpWidget(
        buildTestScaffold(
          viewportSize: logicalSize,
          child: const Placeholder(), // Replace with your Figma-mapped widget
        ),
      );

      // Settle animations and text layouts
      await tester.pumpAndSettle();

      // 3. Assert against golden reference image
      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('goldens/mobile_screen_reference.png'),
      );
    });

    testWidgets('Desktop Viewport (1200 x 800 @ 2x) matches Figma Frame', (WidgetTester tester) async {
      const logicalSize = Size(1200, 800);
      const pixelRatio = 2.0;

      tester.view.physicalSize = Size(
        logicalSize.width * pixelRatio,
        logicalSize.height * pixelRatio,
      );
      tester.view.devicePixelRatio = pixelRatio;

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        buildTestScaffold(
          viewportSize: logicalSize,
          child: const Placeholder(), // Replace with your Figma-mapped widget
        ),
      );

      await tester.pumpAndSettle();

      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('goldens/desktop_screen_reference.png'),
      );
    });
  });
}
```

---

## 2. Step-by-Step Execution Workflow

### Step 1: Generate Initial Golden Baselines
Run the update command to capture and write the initial golden reference files from the Flutter render tree:
```bash
flutter test test/goldens/figma_fidelity_test.dart --update-goldens
```

### Step 2: Compare Against Reference Figma Exports
To test directly against a Figma design export:
1. Export the Figma frame as PNG at the matching logical scale (or DPR scale).
2. Save the Figma export to `test/goldens/goldens/mobile_screen_reference.png`.
3. Run the verification test:
```bash
flutter test test/goldens/figma_fidelity_test.dart
```

### Step 3: Analyzing Failure Diffs
If the test fails, Flutter generates three comparison images in the `failures/` directory:
* `..._expected.png`: The reference Figma export or previous golden.
* `..._actual.png`: The current rendered Flutter output.
* `..._diff.png`: An image isolating the differing pixels (highlighted in red).

Inspect the `_diff.png`:
* **Solid red borders**: Geometry / padding discrepancy. Check Figma frame padding vs Flutter `EdgeInsets`.
* **Slight red halos around text**: Font smoothing or line height leading difference. Ensure `leadingDistribution: TextLeadingDistribution.even` is set.
* **Red edge fringe on corners**: Check the numeric radius first. `ContinuousRectangleBorder` is only a candidate when Figma `cornerSmoothing` is near 0.6, and it is not a documented match.
