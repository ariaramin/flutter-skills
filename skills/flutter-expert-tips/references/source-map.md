# Source Traceability Map

The repository READMEs were used as corpus indexes, and representative/high-impact source files were inspected for semantics. This map records the strongest normalized production rules. Many source tips are visual micro-recipes; those are represented by domain rather than duplicated one-row-per-screenshot.

Statuses reflect the normalized rule, not necessarily the source author's original label.

| Normalized rule / topic | Repository | Source path | Skill area | Status |
|---|---|---|---|---|
| Build must avoid side effects/heavy work | bizz84 | `tips/0170-build-method-do-dont/index.md` | Widgets / Performance | Preferred |
| Dispose owned controllers | bizz84 | `tips/0168-dispose-to-avoid-memory-leaks/index.md` | Lifecycle | Preferred |
| Async BuildContext safety | bizz84 | `tips/0060-build-context-async-gaps/index.md` | Widgets / Correctness | Preferred |
| `context.mounted` | bizz84 | `tips/0090-context-mounted/index.md` | Widgets / Correctness | Preferred |
| Lazy large lists | vandadnp | `tipsandtricks/infinite-listview-in-flutter/infinite-listview-in-flutter.md` | Lists / Performance | Preferred |
| Paginated ListView | vandadnp | `tipsandtricks/paginated-listview-in-flutter/paginated-listview-in-flutter.md` | Lists | Situational |
| Infinite scrolling | vandadnp | `tipsandtricks/infinite-scrolling-in-flutter/infinite-scrolling-in-flutter.md` | Lists | Situational |
| Scroll-to-index | bizz84 | `tips/0151-scroll-to-index/index.md` | Lists | Situational |
| Reorder list items | vandadnp | `tipsandtricks/reordering-items-inside-list-views-in-flutter/reordering-items-inside-list-views-in-flutter.md` | Lists | Situational |
| `CustomScrollView` / sliver composition | vandadnp | `tipsandtricks/custom-scroll-views-in-flutter/custom-scroll-views-in-flutter.md` | Lists / Layout | Preferred when complex scrolling |
| Constraint-based layout | vandadnp | `tipsandtricks/placing-constraints-on-widgets-in-flutter/placing-constraints-on-widgets-in-flutter.md` | Layout | Preferred |
| Proportional constraints | vandadnp | `tipsandtricks/proportional-constraints-in-flutter/proportional-constraints-in-flutter.md` | Layout | Situational |
| Aspect ratio | vandadnp | `tipsandtricks/aspect-ratio-in-flutter/aspect-ratio-in-flutter.md` | Layout | Preferred when ratio is semantic |
| FractionallySizedBox with Stack | bizz84 | `tips/0221-stack-fractionally-sized-box/index.md` | Layout | Situational |
| Intrinsic width vs fixed text width | bizz84 | `tips/0136-intrinsic-width/index.md` | Layout | Situational; expensive |
| Native Row/Column spacing | bizz84 | `tips/0216-spacing-row-column/index.md` | Layout | Preferred on supported SDK |
| `OverflowBar` | bizz84 | `tips/0179-overflowbar-widget/index.md` | Layout | Situational |
| Reusable widgets | bizz84 | `tips/0145-build-reusable-widgets/index.md` | Composition | Preferred with judgment |
| Composition aggressively | bizz84 | `tips/0032-flutter-tip-use-composition-aggressively/index.md` | Composition | Preferred with overengineering guard |
| Replace Container with primitives | bizz84 | `tips/0135-replace-container-nested-widgets/index.md` | Composition / Perf | Situational |
| Specific MediaQuery dependencies | bizz84 | `tips/0108-media-query-inherited-model/index.md` | Widgets / Perf | Preferred modernized |
| Responsive split view | bizz84 | `tips/0001-flutter-reusable-split-view-on-mobile-desktop-and-web/index.md` | Responsive UI | Situational |
| Responsive layout with SizedBox/Center | bizz84 | `tips/0013-responsive-flutter-card-layout-with-sizedbox-center/index.md` | Responsive UI | Situational |
| AnimatedContainer | bizz84 | `tips/0077-animatedcontainer/index.md` | Animation | Preferred for simple implicit animation |
| Animated containers | vandadnp | `tipsandtricks/animated-containers-in-flutter/animated-containers-in-flutter.md` | Animation | Preferred for simple transitions |
| Fade between widgets | vandadnp | `tipsandtricks/fade-between-widgets-in-flutter/fade-between-widgets-in-flutter.md` | Animation | Situational |
| SlideTransition | vandadnp | `tipsandtricks/slidetransition-in-flutter/slidetransition-in-flutter.md` | Animation | Situational |
| Animated lists | vandadnp | `tipsandtricks/animated-lists-in-flutter/animated-lists-in-flutter.md` | Animation / Lists | Situational |
| Image aspect ratio | vandadnp | `tipsandtricks/image-aspect-ratio-in-flutter/image-aspect-ratio-in-flutter.md` | Images | Preferred |
| Image opacity | vandadnp | `tipsandtricks/image-opacity-in-flutter/image-opacity-in-flutter.md` | Rendering | Modernize to direct alpha when possible |
| Transparent image opacity | bizz84 | `tips/0169-transparent-images-with-opacity/index.md` | Rendering | Preferred concept |
| Preload SVG | bizz84 | `tips/0150-preload-svgs/index.md` | Images / Perf | Situational; measure |
| Vector graphics compiler | bizz84 | `tips/0161-vector-graphics-compiler/index.md` | Assets / Perf | Needs package verification |
| Highlight oversized images | bizz84 | `tips/0132-highlight-oversized-images/index.md` | Debugging / Perf | Preferred diagnostic |
| Repaint rainbow | bizz84 | `tips/0245-debug-repaint-rainbow-enabled/index.md` | Debugging | Preferred diagnostic |
| DevTools rebuild stats | bizz84 | `tips/0182-devtools-performance-rebuild-stats/index.md` | Performance | Preferred diagnostic |
| DevTools performance/jank | bizz84 | `tips/0005-use-the-devtools-to-identify-jank-and-shader-compilation-issues/index.md` | Performance | Preferred |
| Debug paint | bizz84 | `tips/0134-debug-paint-size/index.md` | Debugging | Preferred diagnostic |
| Widget Inspector | bizz84 | `tips/0031-how-to-use-the-flutter-widget-inspector/index.md` | Debugging | Preferred |
| DevTools Network | bizz84 | `tips/0118-network-view-devtools/index.md` | Debugging | Preferred |
| DevTools Logging | bizz84 | `tips/0188-flutter-devtools-logging-page/index.md` | Debugging | Preferred |
| `debugFillProperties` | bizz84 | `tips/0225-debug-fill-properties/index.md` | Debugging | Situational |
| `debugPrint` prints in release | bizz84 | `tips/0141-dont-use-debug-print/index.md` | Logging / Security | Preferred warning |
| `dart:developer.log` arguments | bizz84 | `tips/0177-log-function-args/index.md` | Logging | Preferred diagnostic |
| Unawaited analytics | bizz84 | `tips/0176-use-unawaited-analytics-calls/index.md` | Async | Situational |
| await vs unawaited vs ignore | bizz84 | `tips/0178-await-vs-unawaited-vs-ignore/index.md` | Async | Preferred mental model |
| Unawaited and ignore | vandadnp | `tipsandtricks/unawaited-and-ignore-in-dart/unawaited-and-ignore-in-dart.md` | Async | Preferred mental model |
| Future.wait | bizz84 | `tips/0080-future.wait/index.md` | Async | Preferred when independent |
| Wait multiple futures | vandadnp | `tipsandtricks/waiting-for-multiple-futures-in-dart/waiting-for-multiple-futures-in-dart.md` | Async | Preferred when independent |
| Return Future without needless async/await | bizz84 | `tips/0106-return-no-await/index.md` | Async / Dart | Preferred when transparent |
| API cleanup | vandadnp | `tipsandtricks/async-api-cleanup-in-flutter/async-api-cleanup-in-flutter.dart` | Async / Resources | Intent preferred; modernize implementation |
| Cancelable API | vandadnp | `tipsandtricks/cancelable-apis-in-flutter/cancelable-apis-in-flutter.dart` | Async / Cancellation | Situational; underlying work matters |
| Dio CancelToken + Riverpod | bizz84 | `tips/0172-dio-cancel-token-riverpod/index.md` | Cancellation | Package-specific |
| Debouncing with Timer | bizz84 | `tips/0156-debouncing-timer/index.md` | Async / Input | Preferred simple case |
| Debouncing streams | vandadnp | `tipsandtricks/debouncing-streams-in-flutter/debouncing-streams-in-flutter.md` | Streams | Situational |
| Throttling user input | vandadnp | `tipsandtricks/throttling-user-input-in-flutter/throttling-user-input-in-flutter.md` | Async / Input | Situational |
| Stream timeout between events | vandadnp | `tipsandtricks/stream-timeout-between-events-in-flutter/stream-timeout-between-events-in-flutter.md` | Streams | Situational |
| StreamQueue | vandadnp | `tipsandtricks/streamqueue-in-flutter/streamqueue-in-flutter.md` | Streams | Situational |
| Stream controller sink | vandadnp | `tipsandtricks/streamcontroller-sink-in-flutter/streamcontroller-sink-in-flutter.md` | Streams | Situational |
| Stream error recovery | vandadnp | `tipsandtricks/recovering-stream-errors-in-flutter/recovering-stream-errors-in-flutter.md` | Streams / Reliability | Situational |
| Absorb stream errors | vandadnp | `tipsandtricks/absorb-stream-errors-in-flutter/absorb-stream-errors-in-flutter.md` | Streams | Avoid as blanket behavior |
| `compute` | vandadnp | `tipsandtricks/compute-in-flutter/compute-in-flutter.dart` | Performance / Isolates | Situational; CPU-heavy only |
| Result type | vandadnp | `tipsandtricks/result-type-in-dart/result-type-in-dart.md` | Error handling | Situational / preferred boundary pattern |
| try/catch vs Result | bizz84 | `tips/0062-try-catch-result-type/index.md` | Error handling | Preferred mental model |
| Errors vs Exceptions | bizz84 | `tips/0061-flutter-errors-vs-exceptions/index.md` | Error handling | Preferred mental model |
| Error.throwWithStackTrace | bizz84 | `tips/0205-throw-error-with-stack-trace/index.md` | Error handling | Situational / preferred when translating |
| Capture stack trace | vandadnp | `tipsandtricks/capturing-stack-traces-in-dart-exceptions/capturing-stack-traces-in-dart-exceptions.md` | Error handling | Preferred |
| `rethrow` | vandadnp | `tipsandtricks/rethrowing-exceptions-in-dart/rethrowing-exceptions-in-dart.md` | Error handling | Preferred |
| Error handling at startup | bizz84 | `tips/0128-error-handling-app-startup/index.md` | Reliability | Preferred |
| Async dependency initialization | bizz84 | `tips/0131-future-provider-require-value/index.md` | Initialization | Package-specific; concept preferred |
| Architecture rules | bizz84 | `tips/0037-rules-to-follow-for-good-app-architecture/index.md` | Architecture | Preferred with judgment |
| Architecture comparison | bizz84 | `tips/0038-popular-architectures-for-flutter-development/index.md` | Architecture | Situational |
| Feature-first vs layer-first | bizz84 | `tips/0039-flutter-project-structure-feature-first-or-layer-first/index.md` | Architecture | Situational |
| Repository interfaces | bizz84 | `tips/0021-repositories-as-abstract-classes/index.md` | Architecture / Testing | Preferred when seam justified |
| Backend-agnostic apps | bizz84 | `tips/0101-backend-agnostic/index.md` | Architecture | Preferred at deliberate boundaries |
| Singleton drawbacks | bizz84 | `tips/0057-singletons-flutter/index.md` | Architecture | Preferred warning |
| Global variables | bizz84 | `tips/0117-are-global-variables-bad/index.md` | Architecture | Situational; mutable hidden state is risk |
| Immutable classes | vandadnp | `tipsandtricks/immutable-classes-in-dart/immutable-classes-in-dart.md` | Dart / State | Preferred |
| Copying Bloc state | vandadnp | `tipsandtricks/copying-bloc-state-in-flutter/copying-bloc-state-in-flutter.md` | State | Package-specific |
| Async Bloc init | vandadnp | `tipsandtricks/async-bloc-init-in-flutter/async-bloc-init-in-flutter.md` | State / Init | Package-specific |
| Riverpod watch/read/listen | bizz84 | `tips/0046-riverpod-difference-between-ref-watch-ref-read-ref-listen/index.md` | State | Needs installed-version verification |
| Riverpod fetch vs mutate | bizz84 | `tips/0121-riverpod-fetch-vs-mutate-data/index.md` | State | Package-specific concept |
| Riverpod stream disposal | vandadnp | `tipsandtricks/riverpod-streamprovider-disposal/riverpod-streamprovider-disposal.md` | Lifecycle / State | Needs installed-version verification |
| ValueNotifier | vandadnp | `tipsandtricks/valuenotifier-in-flutter/valuenotifier-in-flutter.md` | State | Preferred small-state tool |
| Side effects with ValueNotifier | bizz84 | `tips/0230-side-effects-value-notifier/index.md` | State / Effects | Situational |
| WidgetsBindingObserver | bizz84 | `tips/0034-how-to-use-widgetsbindingobserver/index.md` | Lifecycle | Situational |
| GoRouter go vs push | bizz84 | `tips/0036-gorouter-go-vs-push/index.md` | Navigation | Preferred mental model; verify version |
| Navigator observer | bizz84 | `tips/0189-navigator-observer/index.md` | Navigation | Situational |
| GoRouter delegate listener | bizz84 | `tips/0251-go-router-delegate-listener/index.md` | Navigation / Analytics | Needs go_router version verification |
| Universal app links | vandadnp | `tipsandtricks/universal-app-links-in-flutter/universal-app-links-in-flutter.md` | Navigation / Platform | Needs platform verification |
| Route launch argument | bizz84 | `tips/0232-flutter-run-route/index.md` | Tooling / Navigation | Preferred debug tool when supported |
| TextFormField numeric setup | bizz84 | `tips/0244-text-form-field-numeric/index.md` | Forms | Preferred with locale validation |
| TextField validation | bizz84 | `tips/0012-how-to-validate-a-textfield-in-flutter/index.md` | Forms | Preferred |
| Filter TextField input | vandadnp | `tipsandtricks/filtering-textfield-input-in-flutter/filtering-textfield-input-in-flutter.md` | Forms | Situational |
| Focus TextFields | vandadnp | `tipsandtricks/focusing-manually-on-textfields-in-flutter/focusing-manually-on-textfields-in-flutter.md` | Forms / Lifecycle | Situational |
| SelectionArea | bizz84 | `tips/0133-selection-area/index.md` | Accessibility / UX | Preferred when multi-widget selection needed |
| Semantics identifiers | bizz84 | `tips/0237-semantics-identifiers/index.md` | Accessibility / Testing | Preferred for stable UI automation |
| Accessibility tools | bizz84 | `tips/0087-accessibility-tools/index.md` | Accessibility | Package-specific diagnostic |
| Localization | bizz84 | `tips/0070-localizations/index.md` | Localization | Preferred; verify generator APIs |
| Localization delegates | vandadnp | `tipsandtricks/localization-delegates-in-flutter/localization-delegates-in-flutter.md` | Localization | Concept preferred; APIs may be old |
| Adaptive alert dialog | bizz84 | `tips/0248-adaptive-alert-dialog/index.md` | Adaptivity | Situational |
| ThemeData.platform testing | bizz84 | `tips/0249-themedata-platform/index.md` | Testing / Adaptivity | Preferred test lever |
| Conditional imports | bizz84 | `tips/0166-conditional-imports/index.md` | Platform | Preferred; modernize web condition |
| defaultTargetPlatform + kIsWeb | bizz84 | `tips/0165-default-target-platform/index.md` | Platform | Preferred when platform check is required |
| kIsWeb | bizz84 | `tips/0065-kIsWeb/index.md` | Platform | Preferred |
| dart:html external URL redirect | bizz84 | `tips/0120-set-html-window-url/index.md` | Web | Legacy; migrate package:web |
| API keys client/server | bizz84 | `tips/0208-api-keys-client-server/index.md` | Security | Preferred |
| dart-define from files | bizz84 | `tips/0175-dart-define-from-file-env-json/index.md` | Config | Preferred config, not secrets |
| API key JSON/dart-define | bizz84 | `tips/0102-dart-define-from-file/index.md` | Config / Security | Config only; not secret storage |
| Release toggles | bizz84 | `tips/0241-release-toggles-dart-define/index.md` | Build config | Preferred where compile-time toggle fits |
| int/bool fromEnvironment | bizz84 | `tips/0240-int-bool-from-environment/index.md` | Build config | Preferred |
| Flavors | bizz84 | `tips/0142-flutter-run-flavor/index.md` | Build | Preferred concept |
| Flavor-specific assets | bizz84 | `tips/0147-bundle-assets-based-on-flavor/index.md` | Build | Needs SDK verification |
| Firebase multiple flavors | bizz84 | `tips/0201-firebase-init-multiple-flavors/index.md` | Firebase / Build | Needs FlutterFire verification |
| Remote Config initialization | bizz84 | `tips/0247-firebase-remote-config-init/index.md` | Reliability | Needs Firebase verification |
| Force update with Remote Config | bizz84 | `tips/0199-force-update-helper/index.md` | Reliability | Situational / risky |
| Force upgrade failure lesson | bizz84 | `tips/0157-force-upgrade-gone-wrong/index.md` | Reliability | Preferred caution |
| Firestore transactions | vandadnp | `tipsandtricks/firestore-transactions-in-flutter/firestore-transactions-in-flutter.md` | Persistence | Needs Firebase verification |
| Firebase batch operations | vandadnp | `tipsandtricks/firebase-batch-operations-in-flutter/firebase-batch-operations-in-flutter.md` | Persistence | Needs Firebase verification |
| Server timestamp | bizz84 | `tips/0089-server-timestamp/index.md` | Persistence | Needs Firebase verification |
| Security Rules Playground | bizz84 | `tips/0100-security-rules-playground/index.md` | Security / Firebase | Preferred tool, vendor-specific |
| Fake repositories for tests | bizz84 | `tips/0041-using-fake-repositories-for-testing/index.md` | Testing | Preferred |
| Testing functions that throw | bizz84 | `tips/0048-testing-functions-that-throw/index.md` | Testing | Preferred |
| Test tags | bizz84 | `tips/0058-using-test-tags/index.md` | Testing | Situational |
| Test variants | bizz84 | `tips/0055-run-multiple-test-variants/index.md` | Testing | Situational |
| Custom test timeout | bizz84 | `tips/0052-custom-test-timeout/index.md` | Testing | Situational; don't mask hangs |
| Golden/robot testing | bizz84 | `tips/0051-golden-image-testing-with-robot-testing/index.md` | Testing | Situational |
| CI tests | bizz84 | `tips/0026-running-tests-with-github-actions/index.md` | CI | Preferred concept |
| `dart fix --apply` | bizz84 | `tips/0091-dart-fix-apply/index.md` | Tooling | Preferred after review |
| Flutter lints | bizz84 | `tips/0004-flutter-lints-package/index.md` | Tooling | Preferred |
| `build_runner` watch | bizz84 | `tips/0075-build-runner-watch/index.md` | Tooling | Situational |
| Dart 3.8 null-aware elements | bizz84 | `tips/0252-null-aware-elements-dart-3.8/index.md` | Dart | Preferred on supported language version |
| Dart 3.7 wildcard variables | bizz84 | `tips/0228-wildcard-variables-dart-3.7/index.md` | Dart | Preferred on supported version |
| Dart records equality | bizz84 | `tips/0109-records-equality/index.md` | Dart | Preferred |
| Dart list destructuring | bizz84 | `tips/0111-destructure-lists-dart/index.md` | Dart | Preferred when clearer |
| Dart conditional JSON parsing | bizz84 | `tips/0113-conditional-json-parsing/index.md` | Dart / Parsing | Preferred when clearer |
| Enhanced enums | bizz84 | `tips/0050-dart-2-17-enhanced-enums-with-members/index.md` | Dart | Preferred modern feature |
| Type aliases | bizz84 | `tips/0073-enhance-readability-with-typdef/index.md` | Dart | Situational |
| Object.hash | vandadnp | `tipsandtricks/object-hash-in-dart/object-hash-in-dart.md` | Dart / Equality | Preferred |
| Factory constructors | vandadnp | `tipsandtricks/factory-constructors-in-dart/factory-constructors-in-dart.md` | Dart | Preferred when semantics fit |
| Custom collection operators | vandadnp | `tipsandtricks/iterable-plus-minus-in-dart/iterable-plus-minus-in-dart.md` | Dart | Situational |
| CompactMap custom helpers | vandadnp | `tipsandtricks/iterable-compactmap-in-dart/iterable-compactmap-in-dart.md` | Dart | Situational |
| Reflection object description | vandadnp | `tipsandtricks/dart-object-description-using-reflection/dart-object-description-using-reflection.md` | Dart | Legacy/VM-specific |
| Experimental JsonCodable macros | bizz84 | `tips/0160-dart-macros-json-codable/index.md` | Dart | Legacy/abandoned experiment |
| Matrix4 deprecated APIs | bizz84 | `tips/0255-matrix4-vector3/index.md` | Rendering / Dart | Deprecated old methods; use typed replacements |
| Color API deprecations | bizz84 | `tips/0219-color-deprecations-flutter-3.27/index.md` | Rendering | Modern replacement required |
