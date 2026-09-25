# Production Testing Strategy Playbook

A resilient production Flutter test suite applies a pyramid of test levels, using the fastest and most focused test type capable of catching each class of defect.

---

## 1. Test Levels Overview

```
                      ┌──────────────────────┐
                      │  Integration Tests   │  End-to-End flows, boot, real layer integration
                      ├──────────────────────┤
                      │     Golden Tests     │  Pixel-level visual regression contracts
                      ├──────────────────────┤
                      │     Widget Tests     │  UI rendering, interactions, state binding, a11y
                      ├──────────────────────┤
                      │      Unit Tests      │  Domain logic, view models, parsers, state machines
                      └──────────────────────┘
```

---

## 2. Unit Testing

### Best Suited For
- Pure domain business rules and invariants.
- View models and feature controllers (state emissions, loading/error flows).
- DTO serialization and parsing logic.
- Repository coordination policies using in-memory fakes.
- State machines, pagination cursors, and backoff retry algorithms.

### Standards
- Execute with `flutter test test/unit/`. Unit tests run directly in the Dart VM without widget pump overhead and should complete in milliseconds.
- Test edge cases exhaustively: empty inputs, maximum collection sizes, network timeouts, invalid JSON, and cancellation tokens.
- **Prefer Fakes over Mocks**: Use simple in-memory fakes (`FakeUserRepository implements UserRepository`) for data boundaries rather than complex, brittle mock verify setups.

---

## 3. Widget Testing

### Best Suited For
- Validating that a widget renders correct UI states (empty, loading, error, success) given specific state inputs.
- Verifying user gesture interactions (taps, drags, text entry, scroll triggers).
- Testing local layout constraints and responsive branching.
- Verifying focus transitions and keyboard shortcuts.
- Automated accessibility guideline checks.

### Standards
- **Never mock the Flutter framework**: Do not attempt to mock internal Flutter framework classes (`BuildContext`, `Element`, `RenderBox`). Pump real widget trees using `tester.pumpWidget()`.
- Use `tester.pumpAndSettle()` for animations that reach resting state; use step-by-step `tester.pump(duration)` for infinite or repeating animations to avoid test timeouts.
- Provide required inherited wrappers (`MaterialApp`, `Theme`, `Directionality`, `MediaQuery`) at test roots.

---

## 4. Golden File Testing

### Best Suited For
- Protecting against unintended visual regressions in atomic design components, cards, complex custom charts, and theme styling.

### Strict Controls for Deterministic Goldens
Golden tests fail across machines if the rendering environment is not strictly controlled:
1. **Fonts**: Load explicit mock fonts (e.g., using `golden_toolkit` or bundled Ahem font) so OS-level system font rendering differences do not cause false positives.
2. **Pixel Ratio & Dimensions**: Set explicit physical surface size and device pixel ratio in the test harness:
```dart
await tester.binding.setSurfaceSize(const Size(800, 600));
tester.view.devicePixelRatio = 1.0;
```
3. **Deterministic Timestamps & Data**: Never use `DateTime.now()` or random IDs in golden test fixtures.
4. **Caution**: Never use golden tests as a substitute for semantic, behavioral, or responsive unit tests.

---

## 5. Integration Testing

### Best Suited For
- Critical end-to-end user journeys (e.g., Sign up → Add item to cart → Complete purchase).
- Application cold boot, deep link routing, and navigation stack transitions.
- Testing real SQLite database migrations on actual Android/iOS/Desktop storage.
- Automated performance and frame-timing profiling traces.

### Framework Support & Native Limitations
- Use the official `package:integration_test` package.
- Framework integration tests run inside the Flutter engine. They cannot directly interact with native system dialogs outside Flutter (e.g., native OS permission dialogs or system biometric prompts). Identify third-party tools (such as Patrol or native UIAutomator/XCUITest) when native OS dialog automation is required.

---

## 6. Performance Testing and Tracing

Run performance integration tests on physical hardware in **profile mode** to capture reproducible frame rendering metrics:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Scroll performance trace', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    await binding.traceAction(
      () async {
        final list = find.byType(Scrollable);
        await tester.fling(list, const Offset(0, -1000), 2000);
        await tester.pumpAndSettle();
      },
      reportKey: 'feed_scrolling_performance',
    );
  });
}
```

Evaluate generated `TimelineSummary` metrics for:
- Frame build times (90th and 99th percentiles).
- Frame rasterizer times.
- Missed frame counts.

---

## 7. Automated Accessibility Tests

Always run automated accessibility guideline verification on primary screens:
```dart
testWidgets('Screen passes accessibility guidelines', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: UserProfileScreen()));

  final handle = tester.ensureSemantics();
  
  // Verify tap targets, contrast, and labels
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
  await expectLater(tester, meetsGuideline(textContrastGuideline));
  await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
  
  handle.dispose();
});
```
