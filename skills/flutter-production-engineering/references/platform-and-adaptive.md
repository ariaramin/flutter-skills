# Platform, Adaptive, and Accessibility Playbook

Production Flutter engineering requires respecting platform conventions, adapting gracefully to arbitrary screen dimensions, and treating accessibility as a core correctness requirement.

---

## 1. Responsive and Adaptive Design

### Responsive vs. Adaptive
- **Responsive UI**: Automatically adjusts layout, wrapping, flex ratios, and spacing based on available viewport or parent constraints.
- **Adaptive UI**: Changes interaction mechanisms, navigation paradigms, controls, and platform semantics to match the conventions and capabilities of the host operating system.

### Base Decisions on Constraints, Not Device Identity
Never branch layout logic on device model or generic form-factor strings (`isTablet`, `isPhone`):
- A tablet in split-screen multitasking can have less horizontal width than a phone held in landscape mode.
- A desktop window can be resized to a tall, narrow smartphone-like column.
- Flutter's official guidance emphasizes branching on `BoxConstraints` (via `LayoutBuilder`) or window dimensions (via `MediaQuery.sizeOf(context)`), not device names or `Platform.isIOS`.

### Breakpoints as Product Decisions
Breakpoints are design decisions tailored to specific content hierarchy, not universal constants. Common starting ranges:
- **Compact (< 600 dp)**: Single column, bottom navigation bar, modal dialogs, full-width cards.
- **Medium (600–840 dp)**: Flexible multi-column or persistent navigation rail, modal side-sheets.
- **Expanded (> 840 dp)**: Persistent drawer or navigation rail, master-detail dual panes, max-width content constraints.

### Large Display Considerations
- **Content width bounding**: Do not allow text reading lines or form inputs to stretch across an 1800 px widescreen monitor. Constrain content to readable max widths (e.g., `ConstrainedBox(constraints: BoxConstraints(maxWidth: 720))`).
- **Multi-pane layouts**: Use two-pane or three-pane layouts (e.g., mail list + mail body + metadata pane) when space permits.
- **Persistent navigation**: Switch from bottom navigation bars to persistent side navigation rails or sidebars on wider displays.

### Foldables and Display Features
- Query display features via `MediaQuery.displayFeaturesOf(context)` to detect physical hinges, folds, or cutouts.
- Position modal dialogs and split panes outside physical hinge seams to prevent content truncation.

### Modern Text Scaling with `TextScaler`
- Always use `MediaQuery.textScalerOf(context)` (introduced to replace deprecated `textScaleFactor`).
- Never assume a fixed logical height for text containers (e.g., `Container(height: 48, child: Text('...'))`). When users enable accessibility text scaling (e.g., 200% or 300%), fixed-height containers will clip text.
- Use flexible padding and `minHeight` constraints instead of rigid fixed heights.

---

## 2. Android Guidance

### Lifecycle and Process Death
- Android can destroy the host Activity or terminate background application processes under memory pressure without warning.
- Persist durable domain and user data to disk or local databases (e.g., Drift, Hive, SecureStorage) upon modification.
- Use Flutter's **State Restoration** APIs (`RestorationManager`, `RestorableProperty`) for restoring transient UI state (e.g., current tab, unsaved draft form, scroll offset) across process restarts.

### Modern Predictive Back Navigation
- `WillPopScope` is deprecated and incompatible with Android predictive back gestures.
- Use `PopScope` or router-level navigation observers:
```dart
PopScope(
  canPop: !_hasUnsavedChanges,
  onPopInvokedWithResult: (didPop, result) async {
    if (didPop) return;
    final shouldDiscard = await showConfirmationDialog(context);
    if (shouldDiscard && context.mounted) {
      Navigator.of(context).pop(result);
    }
  },
  child: const FormContent(),
)
```
- Test edge cases: nested `Navigator` stacks, open dialogs, bottom sheets, and deep links.

### Device Variation and Low-Tier Hardware
- Do not profile only on flagship devices. Test on representative low-end Android hardware (e.g., 2–3 GB RAM devices).
- Watch for:
  - Large decoded image memory causing OOM (Out-of-Memory) crashes.
  - Synchronous JSON parsing freezing the UI thread.
  - Initial shader compilation stutters (mitigated by modern Impeller backend, but verify on target Vulkan/OpenGLES hardware).

### System UI and Insets
- Modern Android applications must target edge-to-edge presentation.
- Use `SafeArea` or query `MediaQuery.paddingOf(context)` and `MediaQuery.viewInsetsOf(context)` to handle status bars, system gesture navigation bars, and IME software keyboards smoothly.

---

## 3. iOS Guidance

### Modern iOS Scene Lifecycle
- Modern Flutter releases (Flutter 3.41+) enable `UIScene`-based lifecycle integration by default.
- Verify that third-party native plugins or custom AppDelegate integrations properly hook into `UIWindowSceneDelegate` and do not assume a single legacy `UIWindow` on `UIApplicationDelegate`.

### Native Gesture and Navigation Expectations
- Preserve native interactive swipe-to-back gestures on `CupertinoPageRoute` or custom navigation stacks.
- Maintain iOS modal sheet presentation semantics and interactive pull-to-dismiss behavior where expected.
- Respect Apple Human Interface Guidelines for navigation bars, segmented controls, and destructive action sheets.

### Safe Areas and Dynamic Island
- Never hard-code status bar heights, home indicator padding, or Dynamic Island margins (e.g., no `padding: EdgeInsets.only(top: 44)`).
- Always use `SafeArea` or dynamic `MediaQuery.paddingOf(context)`.

### iPad and External Keyboards
- Never assume iOS devices are touch-only. iPadOS users frequently use Apple Magic Keyboards, trackpads, and mice.
- Verify hover states on buttons, mouse scroll wheel responsiveness, and keyboard shortcuts (e.g., Cmd+W, Cmd+Enter, Tab navigation).

---

## 4. Web Guidance

### Browser Environment Realities
Flutter Web runs inside the browser sandbox and is fundamentally distinct from native mobile execution:
- **Browser URLs & History**: Deep linking and browser back/forward buttons must stay synchronized with application state.
- **Text Selection**: By default, Flutter web widgets do not allow browser text selection unless wrapped in `SelectionArea`.
- **Right-Click Context Menus**: Browser right-click should open application context menus or allow default browser menus where appropriate.
- **Scroll Wheel & Trackpads**: High-precision trackpad scrolling and wheel physics must feel fluid.

### Web Runtime & Compilation: JavaScript vs. WebAssembly (Wasm)
- Flutter Web can compile to traditional JavaScript (CanvasKit / HTML) or modern **WebAssembly (Wasm)**.
- **Do not adopt Wasm blindly without verification**:
  - Verify browser support and fallback headers.
  - Ensure all project dependencies and native JS interop packages (`dart:js_interop`) are Wasm-compatible.
  - Multithreaded web rendering requires cross-origin isolation HTTP headers:
    ```http
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
    ```
  - Hosting configuration is an architectural dependency for Flutter Web Wasm deployment.

### Offline and Service Workers
- Modern Flutter tooling does not automatically generate legacy service-worker caching behaviors by default.
- If offline capabilities or aggressive PWA asset caching are required, configure a deliberate service worker caching strategy.

### Web Profiling
- Native Flutter DevTools network tools have limited capabilities on web; use Chrome DevTools **Network**, **Performance**, and **Memory** panels for deep web profiling.
- Inspect HTTP request sizes, CORS preflight (`OPTIONS`) delays, and script chunk loading times.

---

## 5. Desktop Guidance (macOS, Windows, Linux)

### Resizable Windows
- Every production screen must tolerate continuous runtime window resizing.
- Test:
  - Narrow column (360 px width)
  - Wide screen (2560 px width)
  - Short height (400 px height with open dialogs)
  - High-DPI / fractional monitor scaling transitions (e.g., moving a window between a 100% monitor and a 200% 4K monitor).

### Mouse and Pointer Interactions
- Add `MouseRegion` with appropriate `SystemMouseCursors.click` or `basic` to interactive elements.
- Implement hover states on buttons, list rows, and cards to provide visual affordance.
- Support right-click context menus via `ContextMenuRegion` or secondary tap gestures.

### Keyboard Navigation, Shortcuts, and Actions
Desktop users expect complete keyboard navigability without reaching for the mouse:
- Use Flutter's `Shortcuts` and `Actions` framework for common key bindings (e.g., Ctrl+S / Cmd+S to save, Escape to cancel, Enter to submit).
- Ensure `FocusScope` and `FocusNode` provide a logical, predictable Tab traversal order.
- Provide clear visual focus rings (e.g., `Focus(child: ...)` with an outline highlight) on whichever control currently owns input focus. Never create focusable controls with invisible focus state.

---

## 6. Accessibility (a11y) as Production Correctness

Accessibility is a non-negotiable Definition-of-Done criterion.

### Semantic Annotations
- Use built-in semantic widgets (`Semantics`, `MergeSemantics`, `ExcludeSemantics`).
- Never build custom interactive controls with bare `GestureDetector` widgets without providing:
  1. Accessible role (`button: true`)
  2. Clear semantic label (`label: 'Submit invoice'`)
  3. Action handler (`onTap: ...`)
  4. Visual and keyboard focus integration (`FocusableActionDetector`)

### Hit Target Dimensions
- All interactive controls must satisfy minimum hit target recommendations: at least **48×48 logical pixels** (consistent with Flutter/Material guidance) or 44×44 pt (Apple HIG).
- If the visual icon is small (e.g., 20×20 px), expand the interactive hit area using `IconButton` or padding:
```dart
SizedBox(
  width: 48,
  height: 48,
  child: Center(
    child: Icon(Icons.close, size: 20),
  ),
)
```

### Color and Contrast
- Maintain a minimum contrast ratio of **4.5:1** for standard text and **3:1** for large text against background colors.
- Never communicate critical status (e.g., error, active state, success) via color alone; always pair color with text labels, distinct icons, or shapes.

### Automated Accessibility Guideline Testing
Include automated accessibility checks in widget test suites:
```dart
testWidgets('Screen meets accessibility guidelines', (tester) async {
  await tester.pumpWidget(const MyApp());

  final handle = tester.ensureSemantics();
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
  await expectLater(tester, meetsGuideline(textContrastGuideline));
  await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
  handle.dispose();
});
```

### Screen Reader Verification
Automated checks are necessary but not sufficient. Manually verify key user flows using platform screen readers:
- **iOS / macOS**: VoiceOver
- **Android**: TalkBack
- **Windows**: Narrator / NVDA
