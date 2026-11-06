# Authoritative Sources and Research Baseline

## Version Baseline and Evidence Limits

Research date: **2026-11-05**.
All documentation retrieved during research reflects **Flutter 3.47** (banners reference security release 3.47.8) and **Dart 3.13** (banners reference 3.13.7). The local validation environment runs **Flutter 3.47.6 stable / Dart 3.13.5**.
Every load-bearing architectural claim in this skill traces directly to authoritative documentation, Dart language specifications, and verified primary engineering sources.

Version-sensitive topics to re-check when updating dependencies or Flutter versions:
- `flutter.plugin.platforms` schema and registration mechanics.
- Dart class modifiers (`interface`, `base`, `final`, `sealed`) introduced in Dart 3.0.
- Pub workspaces (monorepo support) introduced in Dart 3.6.0 (globs in Dart 3.11+).
- Deferred components / code splitting behavior across Android, Web, and desktop targets.
- Official Flutter Architecture Guide and case study evolution.

---

## Architectural Evidence and Documented Findings

1. **Application Feature Plugins vs. Flutter Platform Plugins**:
   A Flutter platform plugin (`flutter.plugin` entry in `pubspec.yaml`, platform channels, Pigeon, FFI) integrates native OS services. An **Application Feature Plugin** is an application-level architectural pattern where feature modules contribute cohesive capabilities, UI views, and domain contracts through explicit dependency injection and an application composition root.
   *Sources:* [Developing packages & plugins](https://docs.flutter.dev/packages-and-plugins/developing-packages), [Architectural overview](https://docs.flutter.dev/resources/architectural-overview).

2. **Official Flutter Architecture Guidance**:
   The Flutter team strongly recommends separation of UI and Data layers, explicit dependency injection, abstract repositories for testability, unidirectional data flow (UDF), and keeping business and persistence logic out of widgets. ViewModels mediate between presentation and repositories. A domain/use-case layer is **conditional** (only add when complexity, reuse, or multi-repository coordination justifies it).
   *Sources:* [Architecture recommendations](https://docs.flutter.dev/app-architecture/recommendations), [Guide to app architecture](https://docs.flutter.dev/app-architecture/guide), [Common architecture concepts](https://docs.flutter.dev/app-architecture/concepts), [Compass app case study](https://docs.flutter.dev/app-architecture/case-study).

3. **Dart Language Modularity & Class Modifiers (Dart 3.0+)**:
   - `abstract interface class`: Ideal for pure capability contracts. Defines an interface that outside libraries can only implement (`implements`), never extend (`extends`), preventing fragile inheritance.
   - `sealed class`: Ideal for modeling closed state and result hierarchies (e.g. `Result<T>`, `CapabilityStatus`), enabling exhaustive compiler pattern-matching.
   - `final class`: Prevents external subtyping, protecting class invariants.
   - `lib/src/` convention and library-private identifiers (`_`) enforce internal encapsulation, supported by the `implementation_imports` lint rule.
   *Sources:* [Libraries & imports](https://dart.dev/language/libraries), [Class modifiers](https://dart.dev/language/class-modifiers), [Class modifiers for API maintainers](https://dart.dev/language/class-modifiers-for-apis), [Effective Dart: Design](https://dart.dev/effective-dart/design).

4. **Configuration vs. Use & Dependency Injection**:
   Separate component configuration from use (Fowler). Feature modules declare their dependencies explicitly via constructors. The application Composition Root resolves dependencies and assembles instances. Ordinary feature consumers do not depend on global locators or DI container types.
   *Sources:* [Communicating between layers](https://docs.flutter.dev/app-architecture/case-study/dependency-injection), [Compass Sample App](https://github.com/flutter/samples/tree/main/compass_app).

5. **Asynchronous Lifecycle and Cleanup**:
   - `Future.timeout` only stops waiting; it does **not** cancel the underlying async operation. Unbounded timeout does not guarantee resource reclamation.
   - `StreamSubscription.cancel()` returns a `Future` that completes when source cleanup finishes; callers must await it.
   - Closing a `StreamController` prevents new events, but single-subscription controllers with no listeners never complete their close future.
   - `State.dispose()` is synchronous and cannot await asynchronous cleanup. Orderly shutdown belongs in an application-level lifecycle manager.
   *Sources:* [Future.timeout](https://api.dart.dev/dart-async/Future/timeout.html), [StreamSubscription.cancel](https://api.dart.dev/dart-async/StreamSubscription/cancel.html), [StreamController.close](https://api.dart.dev/dart-async/StreamController/close.html).

6. **Cross-Platform Adaptability and Capability Degradation**:
   Not all capabilities are available on all 6 target platforms (Android, iOS, Web, Windows, macOS, Linux). Capability queries (`checkAvailability()`) and graceful degradation avoid hard crashes (`MissingPluginException` or unhandled `PlatformException`).
   *Sources:* [Capabilities and policies](https://docs.flutter.dev/ui/adaptive-responsive/capabilities), [Supported platforms](https://docs.flutter.dev/reference/supported-platforms).

7. **Compilation, Reflection, and Tree Shaking**:
   Flutter AOT compilation disables runtime reflection (`dart:mirrors`) to enable aggressive tree shaking and compact machine code. Plugin discovery must be static (explicit registration or build-time lists) rather than runtime class scanning.
   *Sources:* [JSON and serialization](https://docs.flutter.dev/data-and-backend/serialization/json), [dart:mirrors library](https://api.dart.dev/dart-mirrors/), [dart compile](https://dart.dev/tools/dart-compile).

---

## Authoritative Documentation URLs

### Flutter Framework & Architecture Documentation
- https://docs.flutter.dev/app-architecture/recommendations
- https://docs.flutter.dev/app-architecture/guide
- https://docs.flutter.dev/app-architecture/concepts
- https://docs.flutter.dev/app-architecture/case-study
- https://docs.flutter.dev/app-architecture/case-study/dependency-injection
- https://docs.flutter.dev/app-architecture/case-study/data-layer
- https://docs.flutter.dev/app-architecture/case-study/ui-layer
- https://docs.flutter.dev/app-architecture/case-study/testing
- https://docs.flutter.dev/resources/architectural-overview
- https://docs.flutter.dev/packages-and-plugins/developing-packages
- https://docs.flutter.dev/data-and-backend/serialization/json
- https://docs.flutter.dev/perf/deferred-components
- https://docs.flutter.dev/testing/build-modes
- https://docs.flutter.dev/release/compatibility-policy
- https://docs.flutter.dev/platform-integration/platform-channels
- https://docs.flutter.dev/perf/isolates
- https://docs.flutter.dev/ui/adaptive-responsive/capabilities
- https://docs.flutter.dev/reference/supported-platforms
- https://docs.flutter.dev/testing/overview
- https://docs.flutter.dev/perf/best-practices

### Dart Language, Packaging, & Tooling Documentation
- https://dart.dev/tools/pub/create-packages
- https://dart.dev/language/libraries
- https://dart.dev/tools/pub/package-layout
- https://dart.dev/tools/linter-rules/implementation_imports
- https://dart.dev/tools/pub/workspaces
- https://dart.dev/language/class-modifiers
- https://dart.dev/language/class-modifiers-for-apis
- https://dart.dev/effective-dart/design
- https://dart.dev/effective-dart/documentation
- https://dart.dev/language/versioning
- https://dart.dev/tools/pub/versioning
- https://dart.dev/tools/pub/dependencies
- https://dart.dev/tools/dart-compile
- https://api.dart.dev/dart-mirrors/
- https://api.dart.dev/dart-async/Future/timeout.html
- https://api.dart.dev/dart-async/StreamSubscription/cancel.html
- https://api.dart.dev/dart-async/StreamController/close.html
- https://pub.dev/packages/flutter_lints
- https://github.com/flutter/samples/tree/main/compass_app

---

## Validation Checklist for Plugin-Style Architecture

Before certifying any Flutter codebase or module as compliant with Plugin-Style Architecture:

1. **Boundary Integrity**: Are capability contracts exposed as `abstract interface class` without leaking infrastructure or platform-specific types?
2. **Explicit Dependency Injection**: Are dependencies passed via constructors rather than accessed through hidden global locators or static singletons?
3. **Encapsulation**: Are implementation details confined within `lib/src/` with a curated public export file?
4. **Lifecycle Safety**: Does the plugin lifecycle support orderly asynchronous startup, synchronous state guards, and deterministic teardown?
5. **AOT Compatibility**: Is plugin registration static and inspectable, avoiding runtime reflection or class scanning?
6. **Cross-Platform Graceful Degradation**: Does the architecture verify platform capabilities before invoking platform-specific operations?
7. **Testability**: Can every plugin implementation be substituted with a fake or in-memory adapter without modifying feature or UI code?
8. **Rebuild Optimization**: Are widgets scoped to rebuild only when their relevant data slices change, using `const` constructors where possible?
