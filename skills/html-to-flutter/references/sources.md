# Research baseline and source catalog

This reference preserves detailed guidance from the supplied HTML/CSS/JavaScript → Flutter research. Read the relevant section when the main skill directs you here.

## Contents

  - Research baseline
- Flutter Documentation
- Flutter API Documentation
- Dart Documentation
- Dart API Documentation
- Flutter Performance Documentation
- Flutter Accessibility Documentation
- Flutter Web Documentation
- Flutter Platform Integration Documentation
- Relevant Web Standards / HTML / CSS / JavaScript Documentation

### Research baseline

This skill was researched against current official Flutter and Dart documentation available in August 2026. Flutter documentation at that time reports the 3.44.x documentation line, while Dart 3.12 is the corresponding current release line. APIs should still be re-verified against the project's installed SDK before implementation because Flutter's stable channel continues to evolve.

When recommendations below are described as:

- **Official guidance**: Flutter, Dart, or platform documentation states or directly demonstrates the practice.
- **Framework implication**: the recommendation follows from documented Flutter framework behavior.
- **Engineering guidance**: a production software-design recommendation rather than a claimed Flutter mandate.
- **Platform constraint**: behavior depends on a particular target platform.

---


# Sources

## Flutter Documentation

- Flutter architectural overview
  [https://docs.flutter.dev/resources/architectural-overview](https://docs.flutter.dev/resources/architectural-overview)
- Understanding constraints
  [https://docs.flutter.dev/ui/layout/constraints](https://docs.flutter.dev/ui/layout/constraints)
- Adaptive and responsive design: General approach
  [https://docs.flutter.dev/ui/adaptive-responsive/general](https://docs.flutter.dev/ui/adaptive-responsive/general)
- Adaptive and responsive design: Best practices
  [https://docs.flutter.dev/ui/adaptive-responsive/best-practices](https://docs.flutter.dev/ui/adaptive-responsive/best-practices)
- SafeArea and MediaQuery
  [https://docs.flutter.dev/ui/adaptive-responsive/safearea-mediaquery](https://docs.flutter.dev/ui/adaptive-responsive/safearea-mediaquery)
- Large screens and foldables
  [https://docs.flutter.dev/ui/adaptive-responsive/large-screens](https://docs.flutter.dev/ui/adaptive-responsive/large-screens)
- User input and accessibility on adaptive applications
  [https://docs.flutter.dev/ui/adaptive-responsive/input](https://docs.flutter.dev/ui/adaptive-responsive/input)
- Platform adaptations
  [https://docs.flutter.dev/ui/adaptive-responsive/platform-adaptations](https://docs.flutter.dev/ui/adaptive-responsive/platform-adaptations)
- Platform idioms
  [https://docs.flutter.dev/ui/adaptive-responsive/platform-idioms](https://docs.flutter.dev/ui/adaptive-responsive/platform-idioms)
- Flutter navigation and routing
  [https://docs.flutter.dev/ui/navigation](https://docs.flutter.dev/ui/navigation)
- Flutter Web URL strategies
  [https://docs.flutter.dev/ui/navigation/url-strategies](https://docs.flutter.dev/ui/navigation/url-strategies)
- Flutter application architecture guide
  [https://docs.flutter.dev/app-architecture/guide](https://docs.flutter.dev/app-architecture/guide)
- Flutter architecture recommendations
  [https://docs.flutter.dev/app-architecture/recommendations](https://docs.flutter.dev/app-architecture/recommendations)
- Flutter architecture concepts
  [https://docs.flutter.dev/app-architecture/concepts](https://docs.flutter.dev/app-architecture/concepts)
- Flutter state-management fundamentals
  [https://docs.flutter.dev/data-and-backend/state-mgmt](https://docs.flutter.dev/data-and-backend/state-mgmt)
- Flutter networking
  [https://docs.flutter.dev/data-and-backend/networking](https://docs.flutter.dev/data-and-backend/networking)
- Fetch data from the internet
  [https://docs.flutter.dev/cookbook/networking/fetch-data](https://docs.flutter.dev/cookbook/networking/fetch-data)
- Send authenticated requests
  [https://docs.flutter.dev/cookbook/networking/authenticated-requests](https://docs.flutter.dev/cookbook/networking/authenticated-requests)
- JSON serialization
  [https://docs.flutter.dev/data-and-backend/serialization/json](https://docs.flutter.dev/data-and-backend/serialization/json)
- Flutter assets and images
  [https://docs.flutter.dev/ui/assets/assets-and-images](https://docs.flutter.dev/ui/assets/assets-and-images)
- Use custom fonts
  [https://docs.flutter.dev/cookbook/design/fonts](https://docs.flutter.dev/cookbook/design/fonts)
- Flutter themes
  [https://docs.flutter.dev/cookbook/design/themes](https://docs.flutter.dev/cookbook/design/themes)
- Flutter Web support
  [https://docs.flutter.dev/platform-integration/web](https://docs.flutter.dev/platform-integration/web)
- Flutter Web FAQ
  [https://docs.flutter.dev/platform-integration/web/faq](https://docs.flutter.dev/platform-integration/web/faq)
- Flutter Web renderers / Wasm
  [https://docs.flutter.dev/platform-integration/web/renderers](https://docs.flutter.dev/platform-integration/web/renderers)
- Embedding Flutter Web
  [https://docs.flutter.dev/platform-integration/web/embedding-flutter-web](https://docs.flutter.dev/platform-integration/web/embedding-flutter-web)
- Embedding web content in Flutter Web
  [https://docs.flutter.dev/platform-integration/web/web-content-in-flutter](https://docs.flutter.dev/platform-integration/web/web-content-in-flutter)
- Flutter SDK archive / release schedule
  [https://docs.flutter.dev/install/archive](https://docs.flutter.dev/install/archive)
- What's new in Flutter 3.44
  [https://flutter.dev/blog/whats-new-in-flutter-3-44](https://flutter.dev/blog/whats-new-in-flutter-3-44)

## Flutter API Documentation

- `BoxConstraints`
  [https://api.flutter.dev/flutter/rendering/BoxConstraints-class.html](https://api.flutter.dev/flutter/rendering/BoxConstraints-class.html)
- `Container`
  [https://api.flutter.dev/flutter/widgets/Container-class.html](https://api.flutter.dev/flutter/widgets/Container-class.html)
- `Flex`
  [https://api.flutter.dev/flutter/widgets/Flex-class.html](https://api.flutter.dev/flutter/widgets/Flex-class.html)
- `Flex.spacing`
  [https://api.flutter.dev/flutter/widgets/Flex/spacing.html](https://api.flutter.dev/flutter/widgets/Flex/spacing.html)
- `Expanded`
  [https://api.flutter.dev/flutter/widgets/Expanded-class.html](https://api.flutter.dev/flutter/widgets/Expanded-class.html)
- `Flexible`
  [https://api.flutter.dev/flutter/widgets/Flexible-class.html](https://api.flutter.dev/flutter/widgets/Flexible-class.html)
- `Wrap`
  [https://api.flutter.dev/flutter/widgets/Wrap-class.html](https://api.flutter.dev/flutter/widgets/Wrap-class.html)
- `Stack`
  [https://api.flutter.dev/flutter/widgets/Stack-class.html](https://api.flutter.dev/flutter/widgets/Stack-class.html)
- `Positioned`
  [https://api.flutter.dev/flutter/widgets/Positioned-class.html](https://api.flutter.dev/flutter/widgets/Positioned-class.html)
- `LayoutBuilder`
  [https://api.flutter.dev/flutter/widgets/LayoutBuilder-class.html](https://api.flutter.dev/flutter/widgets/LayoutBuilder-class.html)
- `MediaQuery`
  [https://api.flutter.dev/flutter/widgets/MediaQuery-class.html](https://api.flutter.dev/flutter/widgets/MediaQuery-class.html)
- `GridView`
  [https://api.flutter.dev/flutter/widgets/GridView-class.html](https://api.flutter.dev/flutter/widgets/GridView-class.html)
- `SliverGridDelegate`
  [https://api.flutter.dev/flutter/rendering/SliverGridDelegate-class.html](https://api.flutter.dev/flutter/rendering/SliverGridDelegate-class.html)
- `SliverGridDelegateWithFixedCrossAxisCount`
  [https://api.flutter.dev/flutter/rendering/SliverGridDelegateWithFixedCrossAxisCount-class.html](https://api.flutter.dev/flutter/rendering/SliverGridDelegateWithFixedCrossAxisCount-class.html)
- `SliverGridDelegateWithMaxCrossAxisExtent`
  [https://api.flutter.dev/flutter/rendering/SliverGridDelegateWithMaxCrossAxisExtent-class.html](https://api.flutter.dev/flutter/rendering/SliverGridDelegateWithMaxCrossAxisExtent-class.html)
- `ListView.builder`
  [https://api.flutter.dev/flutter/widgets/ListView/ListView.builder.html](https://api.flutter.dev/flutter/widgets/ListView/ListView.builder.html)
- `CustomScrollView`
  [https://api.flutter.dev/flutter/widgets/CustomScrollView-class.html](https://api.flutter.dev/flutter/widgets/CustomScrollView-class.html)
- `RepaintBoundary`
  [https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html](https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html)
- `IntrinsicHeight`
  [https://api.flutter.dev/flutter/widgets/IntrinsicHeight-class.html](https://api.flutter.dev/flutter/widgets/IntrinsicHeight-class.html)
- `IntrinsicWidth`
  [https://api.flutter.dev/flutter/widgets/IntrinsicWidth-class.html](https://api.flutter.dev/flutter/widgets/IntrinsicWidth-class.html)
- `CustomPainter`
  [https://api.flutter.dev/flutter/rendering/CustomPainter-class.html](https://api.flutter.dev/flutter/rendering/CustomPainter-class.html)
- `BoxDecoration`
  [https://api.flutter.dev/flutter/painting/BoxDecoration-class.html](https://api.flutter.dev/flutter/painting/BoxDecoration-class.html)
- `DecoratedBox`
  [https://api.flutter.dev/flutter/widgets/DecoratedBox-class.html](https://api.flutter.dev/flutter/widgets/DecoratedBox-class.html)
- `TextStyle`
  [https://api.flutter.dev/flutter/painting/TextStyle-class.html](https://api.flutter.dev/flutter/painting/TextStyle-class.html)
- `TextScaler`
  [https://api.flutter.dev/flutter/painting/TextScaler-class.html](https://api.flutter.dev/flutter/painting/TextScaler-class.html)
- `SelectionArea`
  [https://api.flutter.dev/flutter/material/SelectionArea-class.html](https://api.flutter.dev/flutter/material/SelectionArea-class.html)
- `TextFormField`
  [https://api.flutter.dev/flutter/material/TextFormField-class.html](https://api.flutter.dev/flutter/material/TextFormField-class.html)
- `TextEditingController`
  [https://api.flutter.dev/flutter/widgets/TextEditingController-class.html](https://api.flutter.dev/flutter/widgets/TextEditingController-class.html)
- `FocusNode`
  [https://api.flutter.dev/flutter/widgets/FocusNode-class.html](https://api.flutter.dev/flutter/widgets/FocusNode-class.html)
- `AutofillGroup`
  [https://api.flutter.dev/flutter/widgets/AutofillGroup-class.html](https://api.flutter.dev/flutter/widgets/AutofillGroup-class.html)
- `DropdownMenu`
  [https://api.flutter.dev/flutter/material/DropdownMenu-class.html](https://api.flutter.dev/flutter/material/DropdownMenu-class.html)
- `Semantics`
  [https://api.flutter.dev/flutter/widgets/Semantics-class.html](https://api.flutter.dev/flutter/widgets/Semantics-class.html)
- `SemanticsProperties.headingLevel`
  [https://api.flutter.dev/flutter/semantics/SemanticsProperties/headingLevel.html](https://api.flutter.dev/flutter/semantics/SemanticsProperties/headingLevel.html)
- `ThemeData`
  [https://api.flutter.dev/flutter/material/ThemeData-class.html](https://api.flutter.dev/flutter/material/ThemeData-class.html)
- `ThemeExtension`
  [https://api.flutter.dev/flutter/material/ThemeExtension-class.html](https://api.flutter.dev/flutter/material/ThemeExtension-class.html)
- `WidgetState`
  [https://api.flutter.dev/flutter/widgets/WidgetState.html](https://api.flutter.dev/flutter/widgets/WidgetState.html)
- `WidgetStateProperty`
  [https://api.flutter.dev/flutter/widgets/WidgetStateProperty-class.html](https://api.flutter.dev/flutter/widgets/WidgetStateProperty-class.html)
- `State` lifecycle
  [https://api.flutter.dev/flutter/widgets/State-class.html](https://api.flutter.dev/flutter/widgets/State-class.html)
- `GlobalKey`
  [https://api.flutter.dev/flutter/widgets/GlobalKey-class.html](https://api.flutter.dev/flutter/widgets/GlobalKey-class.html)
- `ValueListenableBuilder`
  [https://api.flutter.dev/flutter/widgets/ValueListenableBuilder-class.html](https://api.flutter.dev/flutter/widgets/ValueListenableBuilder-class.html)
- `ListenableBuilder`
  [https://api.flutter.dev/flutter/widgets/ListenableBuilder-class.html](https://api.flutter.dev/flutter/widgets/ListenableBuilder-class.html)
- `DataTable`
  [https://api.flutter.dev/flutter/material/DataTable-class.html](https://api.flutter.dev/flutter/material/DataTable-class.html)
- `PaginatedDataTable`
  [https://api.flutter.dev/flutter/material/PaginatedDataTable-class.html](https://api.flutter.dev/flutter/material/PaginatedDataTable-class.html)
- `DataTableSource`
  [https://api.flutter.dev/flutter/material/DataTableSource-class.html](https://api.flutter.dev/flutter/material/DataTableSource-class.html)
- `HtmlElementView`
  [https://api.flutter.dev/flutter/widgets/HtmlElementView-class.html](https://api.flutter.dev/flutter/widgets/HtmlElementView-class.html)
- `GoldenFileComparator`
  [https://api.flutter.dev/flutter/flutter\_test/GoldenFileComparator-class.html](https://api.flutter.dev/flutter/flutter_test/GoldenFileComparator-class.html)

## Dart Documentation

- Dart asynchronous programming
  [https://dart.dev/libraries/async/async-await](https://dart.dev/libraries/async/async-await)
- Dart Futures and error handling
  [https://dart.dev/libraries/async/futures-error-handling](https://dart.dev/libraries/async/futures-error-handling)
- Dart Streams
  [https://dart.dev/libraries/async/using-streams](https://dart.dev/libraries/async/using-streams)
- Dart null safety
  [https://dart.dev/null-safety](https://dart.dev/null-safety)
- JavaScript interoperability
  [https://dart.dev/interop/js-interop](https://dart.dev/interop/js-interop)
- JavaScript interop usage
  [https://dart.dev/interop/js-interop/usage](https://dart.dev/interop/js-interop/usage)
- JavaScript interop types
  [https://dart.dev/interop/js-interop/js-types](https://dart.dev/interop/js-interop/js-types)
- Browser APIs with `package:web`
  [https://dart.dev/interop/js-interop/package-web](https://dart.dev/interop/js-interop/package-web)
- Dart 3.12 announcement
  [https://dart.dev/blog/announcing-dart-3-12](https://dart.dev/blog/announcing-dart-3-12)
- Dart changelog
  [https://dart.dev/changelog](https://dart.dev/changelog)

## Dart API Documentation

- `Future`
  [https://api.dart.dev/dart-async/Future-class.html](https://api.dart.dev/dart-async/Future-class.html)
- `Stream`
  [https://api.dart.dev/dart-async/Stream-class.html](https://api.dart.dev/dart-async/Stream-class.html)
- `Timer`
  [https://api.dart.dev/dart-async/Timer-class.html](https://api.dart.dev/dart-async/Timer-class.html)
- `dart:js_interop`
  [https://api.dart.dev/dart-js\_interop/](https://api.dart.dev/dart-js_interop/)
- `JSPromise`
  [https://api.dart.dev/dart-js\_interop/JSPromise-extension-type.html](https://api.dart.dev/dart-js_interop/JSPromise-extension-type.html)

## Flutter Performance Documentation

- Flutter performance best practices
  [https://docs.flutter.dev/perf/best-practices](https://docs.flutter.dev/perf/best-practices)
- Performance profiling
  [https://docs.flutter.dev/perf/ui-performance](https://docs.flutter.dev/perf/ui-performance)
- Flutter DevTools Performance view
  [https://docs.flutter.dev/tools/devtools/performance](https://docs.flutter.dev/tools/devtools/performance)
- Flutter DevTools CPU profiler
  [https://docs.flutter.dev/tools/devtools/cpu-profiler](https://docs.flutter.dev/tools/devtools/cpu-profiler)
- Flutter DevTools Memory view
  [https://docs.flutter.dev/tools/devtools/memory](https://docs.flutter.dev/tools/devtools/memory)
- Flutter rendering performance
  [https://docs.flutter.dev/perf/rendering-performance](https://docs.flutter.dev/perf/rendering-performance)
- Impeller
  [https://docs.flutter.dev/perf/impeller](https://docs.flutter.dev/perf/impeller)

## Flutter Accessibility Documentation

- Flutter accessibility overview
  [https://docs.flutter.dev/ui/accessibility](https://docs.flutter.dev/ui/accessibility)
- Accessibility testing
  [https://docs.flutter.dev/ui/accessibility/accessibility-testing](https://docs.flutter.dev/ui/accessibility/accessibility-testing)
- Accessibility and internationalization guidance
  [https://docs.flutter.dev/ui/accessibility-and-internationalization/accessibility](https://docs.flutter.dev/ui/accessibility-and-internationalization/accessibility)
- Flutter semantics API
  [https://api.flutter.dev/flutter/semantics/semantics-library.html](https://api.flutter.dev/flutter/semantics/semantics-library.html)

## Flutter Web Documentation

- Flutter on the Web
  [https://docs.flutter.dev/platform-integration/web](https://docs.flutter.dev/platform-integration/web)
- Web FAQ
  [https://docs.flutter.dev/platform-integration/web/faq](https://docs.flutter.dev/platform-integration/web/faq)
- Web renderers
  [https://docs.flutter.dev/platform-integration/web/renderers](https://docs.flutter.dev/platform-integration/web/renderers)
- URL strategies
  [https://docs.flutter.dev/ui/navigation/url-strategies](https://docs.flutter.dev/ui/navigation/url-strategies)
- Embedding Flutter into a webpage
  [https://docs.flutter.dev/platform-integration/web/embedding-flutter-web](https://docs.flutter.dev/platform-integration/web/embedding-flutter-web)
- Embedding web content in Flutter
  [https://docs.flutter.dev/platform-integration/web/web-content-in-flutter](https://docs.flutter.dev/platform-integration/web/web-content-in-flutter)

## Flutter Platform Integration Documentation

- Supported platforms
  [https://docs.flutter.dev/reference/supported-platforms](https://docs.flutter.dev/reference/supported-platforms)
- Android platform views
  [https://docs.flutter.dev/platform-integration/android/platform-views](https://docs.flutter.dev/platform-integration/android/platform-views)
- iOS platform views
  [https://docs.flutter.dev/platform-integration/ios/platform-views](https://docs.flutter.dev/platform-integration/ios/platform-views)
- macOS platform views
  [https://docs.flutter.dev/platform-integration/macos/platform-views](https://docs.flutter.dev/platform-integration/macos/platform-views)
- Platform-specific code
  [https://docs.flutter.dev/platform-integration/platform-channels](https://docs.flutter.dev/platform-integration/platform-channels)
- Desktop support
  [https://docs.flutter.dev/platform-integration/desktop](https://docs.flutter.dev/platform-integration/desktop)
- Deep linking
  [https://docs.flutter.dev/ui/navigation/deep-linking](https://docs.flutter.dev/ui/navigation/deep-linking)

## Relevant Web Standards / HTML / CSS / JavaScript Documentation

These sources are used to interpret the semantics and behavior of the source web application. Flutter implementation guidance should still prefer Flutter/Dart sources above.

- MDN HTML element reference
  [https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements)
- MDN HTML semantics guidance
  [https://developer.mozilla.org/en-US/docs/Glossary/Semantics](https://developer.mozilla.org/en-US/docs/Glossary/Semantics)
- MDN CSS flexible box layout
  [https://developer.mozilla.org/en-US/docs/Web/CSS/CSS\_flexible\_box\_layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout)
- MDN CSS Grid layout
  [https://developer.mozilla.org/en-US/docs/Web/CSS/CSS\_grid\_layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)
- MDN CSS box model
  [https://developer.mozilla.org/en-US/docs/Learn\_web\_development/Core/Styling\_basics/Box\_model](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model)
- MDN CSS positioning
  [https://developer.mozilla.org/en-US/docs/Web/CSS/position](https://developer.mozilla.org/en-US/docs/Web/CSS/position)
- MDN responsive design
  [https://developer.mozilla.org/en-US/docs/Learn\_web\_development/Core/CSS\_layout/Responsive\_Design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- MDN HTML button element
  [https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button)
- MDN form controls
  [https://developer.mozilla.org/en-US/docs/Learn\_web\_development/Extensions/Forms](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms)
- MDN keyboard accessibility
  [https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding\_WCAG/Keyboard](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Keyboard)
- MDN ARIA roles
  [https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles)
- MDN Fetch API
  [https://developer.mozilla.org/en-US/docs/Web/API/Fetch\_API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- MDN Web Storage API
  [https://developer.mozilla.org/en-US/docs/Web/API/Web\_Storage\_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- MDN IndexedDB API
  [https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB\_API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---
