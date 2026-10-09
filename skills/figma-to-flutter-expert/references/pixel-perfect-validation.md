# Pixel-Accurate Visual Fidelity & Golden Regression Testing

This reference details the verification methodology for auditing and proving visual fidelity between Figma designs and rendered Flutter applications using deterministic golden tests, viewport controls, and visual discrepancy diagnostics.

---

## 1. Visual Verification Preconditions

True pixel identity across all platforms is physically impossible due to operating system font rasterizers, GPU antialiasing filters, subpixel rendering, and display scaling.

**The Production Standard**: Achieve pixel-accurate reproduction under **controlled comparison conditions**:
1. Exact logical viewport dimensions matching the Figma artboard.
2. Fixed device pixel ratio (DPR = 1.0, 2.0, or 3.0).
3. Identical bundled font files (OTF/TTF) loaded into the test engine.
4. Frozen animation ticks, cursors, and system time.
5. Consistent text scaling (`TextScaler.noScaling`).

---

## 2. Deterministic Golden Test Environment Setup

By default, Flutter widget tests replace all fonts with the `Ahem` test font (rendering black rectangles). To perform high-fidelity visual regression testing against Figma designs, you must explicitly load genuine fonts into the test runtime.

### Golden Test Harness Pattern

```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> loadAppFonts() async {
  // Load primary font family (e.g. Inter or Roboto)
  final fontFile = File('test/assets/fonts/Inter-Regular.ttf');
  if (await fontFile.exists()) {
    final fontData = await fontFile.readAsBytes();
    final fontLoader = FontLoader('Inter');
    fontLoader.addFont(Future.value(ByteData.view(fontData.buffer)));
    await fontLoader.load();
  }
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await loadAppFonts();
  });

  testWidgets('Matches Figma reference artboard', (WidgetTester tester) async {
    // 1. Lock physical dimensions and pixel ratio matching Figma Frame (e.g. iPhone 15: 393 x 852 @ 3x)
    tester.view.physicalSize = const Size(1179, 2556);
    tester.view.devicePixelRatio = 3.0;

    // Reset on completion
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    // 2. Pump widget under controlled MediaQuery
    await tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: ThemeData(fontFamily: 'Inter'),
        home: const Scaffold(
          body: FigmaSampleScreen(),
        ),
      ),
    );

    // 3. Settle all async timers and animations
    await tester.pumpAndSettle();

    // 4. Assert against reference golden
    await expectLater(
      find.byType(FigmaSampleScreen),
      matchesGoldenFile('goldens/figma_sample_screen.png'),
    );
  });
}
```

---

## 3. The 5-Step Visual Regression Loop

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. Export Figma │ ──> │ 2. Render in    │ ──> │ 3. Compare with │
│ Reference PNG   │     │ Flutter Test    │     │ Golden Diff     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 5. Re-verify    │ <── │ 4. Fix Root     │ <── │ Analyze Pixel   │
│ Golden Pass     │     │ Cause in Code   │     │ Discrepancies   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **Export Figma Frame**: Export the Figma frame at exact target scale (1x = 393×852, or matching DPR). Save to test asset directory.
2. **Render Flutter Surface**: Run the golden test harness with matching dimensions.
3. **Compare**: Run `flutter test --update-goldens` for baseline generation, or `flutter test` for comparison.
4. **Inspect Pixel Delta**: When tests fail, Flutter outputs a failure diff image showing:
   * Left: Expected (Golden).
   * Middle: Actual (Rendered).
   * Right: Isolated delta mask (highlighted red pixels).
5. **Resolve Root Cause**: Identify the engineering cause of the mismatch (see Diagnostic Table below). **Never apply arbitrary offset hacks** (e.g., adding `Transform.translate(offset: Offset(0, 1.5))` to fudge alignment).

---

## 4. Root-Cause Discrepancy Diagnostics

| Visual Symptom in Diff | Root Cause | Engineering Solution |
|---|---|---|
| **Text shifted 1–3px vertically** | Flutter default proportional leading vs. Figma centered leading. | Add `leadingDistribution: TextLeadingDistribution.even` to `TextStyle`. Verify `height = lineHeightPx / fontSize`. |
| **Borders 1px thicker/misaligned** | Figma stroke set to `OUTSIDE` or `CENTER`, while Flutter `Border.all` paints `INSIDE`. | Wrap in padding or adjust container outer bounds to accommodate stroke placement. |
| **Shadow appears clipped or faint** | Parent widget has `clipBehavior: Clip.hardEdge` cutting off the shadow blur radius. | Remove clipping on parent or add padding equal to `blurRadius + spreadRadius`. Verify negative `spreadRadius`. |
| **Icon misaligned with adjacent text** | Icon SVG has asymmetric viewBox padding (e.g. 24×24 box with 20×18 glyph). | Use `CrossAxisAlignment.center` or align via typographic baseline using `CrossAxisAlignment.baseline`. |
| **Corner radius looks squarish** | Figma uses iOS Squircle corner smoothing; Flutter code used standard `BorderRadius.circular`. | Switch to `ShapeDecoration(shape: ContinuousRectangleBorder(...))`. |
| **Text wrapping prematurely** | Figma text frame width differed by fractional pixels, or kerning/letter spacing was omitted. | Check Figma `letterSpacing`. Ensure text container uses flexible constraints (`Expanded`) rather than fixed width. |
| **Colors differ slightly (washed out)** | Opacity applied via deprecated `withOpacity` or color space conversion difference (Display P3 vs sRGB). | Use `color.withValues(alpha: ...)` and verify hex color values match Figma sRGB hex codes. |

---

## 5. Verification Commands

* **Run all visual regression tests**:
  ```bash
  flutter test test/goldens/
  ```
* **Update golden baselines after verified design updates**:
  ```bash
  flutter test test/goldens/ --update-goldens
  ```
