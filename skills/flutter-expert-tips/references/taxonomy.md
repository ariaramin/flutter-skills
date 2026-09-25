# Knowledge Taxonomy

This taxonomy normalizes the two source repositories into production-oriented domains. The repositories include far more UI micro-recipes than belong in `SKILL.md`; those are grouped here by the engineering decision they support.

## 1. Dart Language and Type System

- `const`, `final`, inference, explicit annotations, type aliases.
- Null safety, promotion, optional chaining, null-aware spread/elements.
- Functions as first-class values, tear-offs, optional callbacks, callable classes.
- Constructors, factory constructors, initializer lists, abstract-class constructors.
- Enums/enhanced enums, records, patterns, destructuring, switch expressions.
- Generics, covariance, `Comparable`, equality/hash, `Object.hash`.
- Mixins, implicit interfaces, extension methods/types.
- Annotations such as `@mustCallSuper` / `@useResult`.
- Reflection/dynamic invocation: generally niche and platform-constrained.

## 2. Collections and Data Transformation

- `map`, `where`, `expand`, `fold`, `reduce`, `single`, indexing/enumeration.
- Map updates/merges/filtering/key-value transforms.
- Set-based deduplication and equality semantics.
- Flattening/nesting/grouping/pagination/rotation/range/zip-like operations.
- JSON parsing and typed conversion.
- Custom iterable/list/map implementations.
- Custom operators (`+`, `-`, subscripts): convenience-only, situational.

## 3. Futures, Async, Streams, Isolates

- `Future.wait`, error propagation, cleanup, retries, timeout.
- `unawaited`, ignored futures, fire-and-forget semantics.
- Stream creation, controllers, sinks, transforms, merging, expansion.
- Debounce/throttle, initial values, stream queues, lazy/periodic streams.
- Cancellation and scope disposal.
- `compute`/isolates for CPU work.
- Async initialization and dependency readiness.

## 4. Widgets, Context, Composition

- Pure/restartable `build()` mental model.
- Reusable widgets vs helper functions.
- `BuildContext` lifecycle and async gaps.
- Inherited data (`MediaQuery`, theme, localization).
- dialogs/snackbars/sheets/tooltips/menus/chips/tiles/buttons.
- adaptive Material/Cupertino behavior.
- `ValueNotifier`, `ChangeNotifier`, Hooks, Bloc, Riverpod examples.

## 5. Layout, Constraints, Scrolling

- parent constraints → child size → parent position mental model.
- `Expanded`, `Flexible`, `SizedBox`, `ConstrainedBox`, `LimitedBox`.
- `AspectRatio`, `FractionallySizedBox`, `LayoutBuilder`, orientation/responsiveness.
- `Row`/`Column` spacing, `Wrap`, `OverflowBar`.
- `ListView`, `GridView`, slivers, pagination, infinite scrolling.
- scroll controllers, scroll-to-index, reordering, dismissing.
- `IntrinsicWidth`: useful but expensive; situational.

## 6. Rendering, Images, Painting, Animation

- image sizing, aspect ratio, tint, opacity, retry/loading frames, preloading.
- oversized image diagnostics and asset compilation.
- gradients, shadows, clipping, custom painters/paths, blur/frost/vignette.
- `Opacity` and offscreen compositing costs.
- implicit animations, transition widgets, animation controllers.
- animated lists/icons/position/opacity/shadows.
- repaint debugging and GPU/jank inspection.

## 7. Forms and Input

- `TextField`/`TextFormField` validation and keyboard configuration.
- numeric input formatters and keyboard type.
- focus ownership/disposal.
- multiline, censoring/password masking, selection behavior.
- autocomplete, toggles, radio/checklist controls.
- debounce/throttle for search/input.

## 8. Accessibility, Localization, Adaptivity

- semantics/identifiers and automated UI tests.
- text selection and text scaling implications.
- localization delegates and generated localization workflow.
- platform-aware/adaptive dialogs and controls.
- `ThemeData.platform` as a test lever, not a production platform detector.

## 9. Navigation and Lifecycle

- Navigator/go_router stack semantics.
- return values from routes/dialogs.
- observers/screen tracking.
- app lifecycle with `WidgetsBindingObserver` or modern lifecycle listeners when appropriate.
- deep/universal links and route-start tooling.
- `BuildContext` safety around navigation.

## 10. Networking, Persistence, Backend

- HTTP requests, status/errors/timeouts, redirects, certificates.
- caching and retry policy.
- local file/assets/temp caching and SQLite examples.
- Firebase/Firestore transactions, batching, server timestamps, queries, security rules.
- repository boundaries and backend-agnostic interfaces.
- webhooks and server responsibilities.

## 11. Error Handling and Reliability

- error vs exception distinctions.
- domain-specific exceptions/result types.
- preserving stack traces (`rethrow`, `Error.throwWithStackTrace`).
- app startup failure handling.
- bounded retry and cleanup.
- force-update/remote-config failure modes.

## 12. Performance and Memory

- lazy list construction.
- minimizing rebuild scope and using stable/const children.
- no side effects/heavy work in build.
- controller/subscription disposal.
- oversized image detection.
- intrinsic layout caution.
- opacity/saveLayer caution.
- CPU profiling and isolate decisions.
- DevTools rebuild/repaint/performance diagnostics.

## 13. Testing, Debugging, Observability

- unit/widget/integration/golden tests.
- fakes and repository interfaces.
- testing throws and async failures.
- tags, variants, timeouts, coverage.
- Semantics identifiers for black-box UI automation.
- DevTools Network, Logging, Performance, Inspector.
- `debugFillProperties`, `dart:developer.log`, repaint rainbow, debug paint.

## 14. Architecture and Maintainability

- feature-first vs layer-first tradeoffs.
- program to interfaces where volatility/testing justify it.
- state ownership and side effects.
- reusable widgets and aggressive composition without fragmentation.
- initialization boundaries.
- avoid global mutable state and singleton coupling.
- preserve project conventions and avoid package-driven architecture churn.

## 15. Platform, Build, Release, Tooling

- flavors and Firebase configuration.
- `--dart-define` / `--dart-define-from-file` as configuration, not secret storage.
- conditional imports and platform detection.
- Web: migrate legacy `dart:html` to `package:web`/JS interop.
- Android Gradle/Kotlin DSL and Xcode tooling (version-sensitive).
- screenshots, Fastlane, CI, source maps, release scripts.
- analyzer/lints, `dart fix`, formatter, build_runner, IDE assists.
