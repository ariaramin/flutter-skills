# Current Flutter/Dart Validation Sources

Validation date: **2026-08-15**.

These official sources are the modernization authority for rules in this skill. Repository tips remain valuable source material, but current Flutter/Dart documentation wins when they conflict.

## Flutter framework and API

| Topic | Official source | Why it matters |
|---|---|---|
| `BuildContext` after async gaps | https://api.flutter.dev/flutter/widgets/BuildContext/mounted.html | Requires a mounted check before interacting with a context after an asynchronous gap. |
| `BuildContext` lifetime | https://api.flutter.dev/flutter/widgets/BuildContext-class.html | Reinforces that context-derived values are tied to the element tree and should not be retained casually. |
| `FutureBuilder` lifecycle | https://api.flutter.dev/flutter/widgets/FutureBuilder-class.html | Futures should be obtained before `build`, not created as a side effect of rebuilding. |
| Lazy lists | https://api.flutter.dev/flutter/widgets/ListView-class.html | Distinguishes eager child lists from builder-based lazy construction. |
| Intrinsic measurement | https://api.flutter.dev/flutter/widgets/IntrinsicWidth-class.html | Documents the extra speculative layout pass and potential O(N²) behavior. |
| Aspect-specific media queries | https://api.flutter.dev/flutter/widgets/MediaQuery/sizeOf.html | Supports narrower rebuild dependencies when only size is needed. |
| Predictive-back migration | https://api.flutter.dev/flutter/widgets/WillPopScope-class.html | `WillPopScope` is deprecated; use `PopScope` for modern back-navigation behavior. |
| Color alpha API | https://api.flutter.dev/flutter/dart-ui/Color/withOpacity.html | `withOpacity` is deprecated in favor of `withValues` to avoid precision loss. |
| Modern color mutation | https://api.flutter.dev/flutter/dart-ui/Color/withValues.html | Current replacement for changing alpha/components. |
| Matrix4 translation | https://api.flutter.dev/flutter/package-vector_math_vector_math/Matrix4/translate.html | Dynamic translation API is deprecated; typed variants are preferred. |
| Matrix4 scaling | https://api.flutter.dev/flutter/package-vector_math_vector_math/Matrix4/scale.html | Dynamic scale API is deprecated; typed variants are preferred. |
| Isolate helper | https://api.flutter.dev/flutter/foundation/compute.html | Defines when `compute` is useful and its web/native execution semantics. |
| Opacity cost | https://api.flutter.dev/flutter/widgets/Opacity-class.html | Documents intermediate-buffer cost and alternatives for images/colors/animation. |
| Debug logging | https://api.flutter.dev/flutter/foundation/debugPrint.html | `debugPrint` can execute in release builds; production logging needs an explicit policy. |
| Performance guidance | https://docs.flutter.dev/perf/best-practices | Source for rebuild localization, `const`, widgets over helper methods, `saveLayer`, and rendering-cost guidance. |

## Dart language and interop

| Topic | Official source | Why it matters |
|---|---|---|
| Modern web interop | https://dart.dev/interop/js-interop/package-web | `package:web` + `dart:js_interop` replace direct `dart:html` usage for modern Dart web code. |
| `dart:html` migration | https://dart.dev/interop/js-interop/package-web | Prevents new code from depending on legacy web libraries that are being removed from the supported direction. |
| Dart macros status | https://dart.dev/resources/dart-3-7 | Dart 3.7 release material records that the earlier experimental macros direction was discontinued. |
| Dart language evolution | https://dart.dev/language | Use current language documentation before preserving custom helpers that newer Dart syntax or standard APIs can replace. |

## Validation policy for agents

1. Prefer the repository rule when it is conceptual and still valid.
2. Prefer official Flutter/Dart documentation for API lifecycle, deprecation, performance characteristics, and platform behavior.
3. For package-specific advice (Riverpod, Dio, Firebase, Hooks, go_router, etc.), verify against that package's current official documentation before editing production code.
4. If a repository tip depends on a version-specific API and current validity is not established, label it **Needs verification against current Flutter/Dart documentation** rather than guessing.
5. Do not modernize syntax mechanically when semantics, platform behavior, or package ownership may have changed.
