# Modernization, Legacy, Deprecated, and Suspicious Advice

Validation baseline: current Flutter/Dart official API/documentation available in August 2026. Package-specific advice still requires the consuming project's actual dependency versions.

| Source idea | Status | Modern treatment |
|---|---|---|
| `dart:html` / old web DOM APIs | **Deprecated** | Use `package:web` + `dart:js_interop`; prefer `dart.library.js_interop` for modern conditional web imports. |
| Dart `JsonCodable` macros experiment | **Legacy / abandoned experiment** | Do not use old macro experiment; use supported serializers/codegen/manual parsing/current language features. |
| `Matrix4.translate`, `scale`, `scaled` dynamic overloads | **Deprecated** | Use typed `translateByDouble/Vector*`, `scaleByDouble/Vector*`, `scaledBy*` APIs as appropriate. |
| `Color.withOpacity` | **Deprecated** | Use `color.withValues(alpha: value)` to avoid precision-loss deprecation. |
| `WillPopScope` | **Deprecated** | Use `PopScope` / current predictive-back-compatible APIs. |
| `IntrinsicWidth` as general replacement for fixed width | **Situational** | Preserve responsive intent, but prefer constraints/flex first; intrinsic layout is relatively expensive. |
| `MediaQuery.of(context)` for one property | **Situational** | Prefer aspect methods such as `MediaQuery.sizeOf`, `paddingOf`, etc. |
| `debugPrint` assumed debug-only | **Avoid assumption** | It can log in release; gate debug logs and use production logging/privacy policy. |
| Raw `dart:io HttpClient` snippets as generic Flutter networking | **Situational / platform-specific** | Native-only; define ownership/close behavior. Prefer a portable injectable client abstraction when cross-platform/testability matters. |
| `compute` as generic async/background solution | **Situational** | Use for measured CPU-heavy work; on web it runs on current event loop. Ordinary async I/O does not need an isolate. |
| “Replace `Container` with nested widgets” as blanket optimization | **Situational** | Do it for semantic clarity or measured hot-path reasons, not style dogma. |
| Hand-rolled `compactMap`, ranges, tuples, enum classes | **Situational / often legacy** | Re-check modern Dart records, patterns, enhanced enums, null-aware collections, standard methods/packages. |
| Custom `+`/`-` collection operators | **Situational** | Use only when semantics are obvious and repeated; prefer standard operations for public/team code. |
| Reflection (`dart:mirrors`) for object descriptions | **Legacy/VM-specific** | Not a normal Flutter cross-platform technique; use explicit/generated diagnostics/serialization. |
| Riverpod pre-generator/provider APIs from 2022 | **Needs verification** | Preserve state/ownership idea, then check installed Riverpod version/current docs. |
| Flutter Hooks examples | **Needs verification** | Package-specific; only apply in projects using Hooks and current APIs. |
| Firebase snippets from 2022 | **Needs verification** | Verify current FlutterFire/Firebase SDK, security rules, platform config. |
| Store/build scripts, Gradle/Xcode/Fastlane/Codemagic tips | **Needs verification** | Toolchain/store rules are volatile; use current vendor docs. |
| `ThemeData.platform` as platform-detection mechanism | **Avoid for capability logic** | Useful for theming/tests. Use correct platform/capability APIs for behavior. |
| Connectivity status == internet available | **Avoid** | Connectivity is a hint; real requests still need timeout/error handling. |
| Catch error and return empty stream/list universally | **Avoid** | Only if domain semantics define that recovery; otherwise surface/translate the failure. |
| Infinite retry helpers | **Avoid** | Bound retries, classify errors, honor cancellation/idempotency. |
| `shrinkWrap: true` to fix any nested scroll issue | **Situational** | Fine for small bounded content; for large content prefer unified slivers/constraints. |

## Modern APIs worth preferring

### MediaQuery aspect access

```dart
final size = MediaQuery.sizeOf(context);
final padding = MediaQuery.paddingOf(context);
```

### Color alpha

```dart
final translucent = color.withValues(alpha: 0.5);
```

### Predictive back

```dart
PopScope(
  canPop: canLeave,
  child: child,
)
```

Use the current callback variant required by the project's Flutter SDK if handling pop results; verify signature before copying version-specific code.

### Modern web import direction

```dart
import 'package:web/web.dart' as web;
```

Interop details differ from `dart:html`; follow Dart's migration guide rather than search/replace alone.

## Suspicious convenience tips requiring judgment

The corpus intentionally explores Dart expressiveness. Treat these as educational, not default architecture:

- throwing enums;
- generic “anything to int” conversions;
- XOR swaps;
- custom integer subclasses/types for arithmetic tricks;
- dynamic function invocation/noSuchMethod-style patterns;
- recursive deep map dot notation;
- URL shorteners/network status probes embedded directly in app code;
- bespoke stream operators that duplicate established package/core behavior.

Use only when the project has a concrete need and the behavior is obvious/tested.
