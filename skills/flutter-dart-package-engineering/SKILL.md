---
name: flutter-dart-package-engineering
description: >-
  Use when creating, structuring, implementing, testing, documenting, versioning,
  publishing, or maintaining a Dart package, Flutter package, plugin, FFI package,
  platform interface, or federated plugin; designing or reviewing a public API and
  pubspec; declaring plugin platform support or platform channels; fixing pub.dev
  scoring or static-analysis issues; handling deprecations, breaking changes,
  retraction, or security advisories; setting up package CI or automated publishing;
  or deciding between pure Dart, plugin, FFI, and federated architectures — even
  when the user only says "make this reusable" or "publish my plugin".
metadata:
  category: mobile-development
  framework: flutter
  language: dart
  version: 1.0.0
  researched_on: "2026-10-25"
  validated_local_sdk: "Flutter 3.47.6 stable / Dart 3.13.5"
---

# Flutter/Dart Package Engineering

## 1. Purpose and operating principles

Design, implement, test, document, version, and publish Dart packages and Flutter packages/plugins that consumers can adopt safely. This skill owns the **author side** of the ecosystem: what ships in a package is a public contract enforced forever — published versions cannot be unpublished, and every pubspec constraint shapes downstream version resolution.

Use **Reconnaissance → Package-type decision → Plan → Implement → Verify → Report** for every task, sizing each stage to the request.

Classify every guidance item by evidence strength and say which class you applied:

- **MANDATORY** — pub rejects the package, the analyzer fails, or the build breaks (e.g. missing LICENSE on publish, invalid pubspec).
- **RECOMMENDED** — official documentation states the practice (dart.dev, docs.flutter.dev, pub.dev).
- **SCORING** — affects pub.dev pub points but not publishability (e.g. CHANGELOG quality, SwiftPM support).
- **CONVENTION** — strong ecosystem practice without an official mandate (e.g. mocktail, melos).
- **CONTEXT-DEPENDENT** — correct only under stated conditions (e.g. isolates for CPU-bound work).

Behavioral rules:

- **MUST** preserve public API compatibility unless the task is an authorized breaking change with a major (or pre-1.0 minor) version bump.
- **SHOULD** follow Effective Dart, keep `lib/src` private, keep dependency ranges as wide as tested, and verify with `dart format` / `analyze` / `test` / `dart pub publish --dry-run` before declaring readiness.
- **MAY** add abstractions (platform interfaces, Result types, isolates, caches) when a concrete requirement justifies their cost.
- **MUST NOT** publish, retract, or mark packages discontinued without an explicit user instruction; represent conventions as official requirements; or report unexecuted checks as passes.

When remembered guidance conflicts with current official docs (version-sensitive topics: plugin schemas, SwiftPM/podspec, Pigeon, scoring rules), recheck the documentation listed in [sources](references/sources.md) before acting. This skill complements `flutter-package-plugin-selection` (choosing dependencies as a consumer) and `flutter-production-engineering` (application engineering); when those are absent, apply their domains' judgment inline.

## 2. Repository reconnaissance

Before editing an existing package:

1. Read the pubspec: package type (`flutter.plugin.platforms`, `implements`, dart/FFI structure), SDK constraints, dependency ranges, `publish_to`, workspace membership (`resolution: workspace`).
2. Read `analysis_options.yaml` (which lint set) and the existing test layout (`test/`, `example/integration_test/`, native test dirs).
3. Map the public surface: exported files under `lib/` (files outside `src/` are the API), CHANGELOG version history, deprecation annotations, fix data.
4. Identify supported platforms and native code: `android/`, `ios/`/`darwin/`, `linux/`, `macos/`, `windows/`, `web/` directories; SwiftPM `Package.swift` vs podspec.
5. Check the CI workflows (`.github/workflows`) for the project's own validation gates and publishing setup.
6. State the goal, affected consumers, compatibility requirements, and acceptance criteria before changing anything.

## 3. Package-type decision

Choose the smallest architecture that meets the requirement. Federated multi-package structure is for plugins that benefit from independent per-platform implementations — applying it to a pure Dart library is overengineering.

| Requirement | Type | Create with |
| --- | --- | --- |
| Logic only, no Flutter dependency | Pure Dart package | `dart create -t package` |
| Flutter widgets/framework dependency, no native code | Flutter (Dart) package | `flutter create --template=package` |
| Call platform APIs via platform channels | Plugin (direct) | `flutter create --template=plugin --platforms=...` |
| Bundle/compile native C code, no Flutter Plugin API needed | FFI package (recommended for native code since Flutter 3.38) | `flutter create --template=package_ffi` |
| Plugin where multiple vendors should implement platforms, or you want per-platform release cadence | Federated plugin (app-facing + platform interface + endorsed impls) | per [Plugins and platforms](references/plugins-and-platforms.md) |

Structure, pubspec validation rules, dependency constraints, and monorepo/workspace setup: [Package structure and types](references/package-structure-and-types.md).

## 4. Public API standards

The public API is every file directly under `lib/` — treat additions as permanent:

- Keep implementation in `lib/src/`; consumers must never need to import it. One main library named after the package is the default entry point.
- Apply Effective Dart design rules to exported members: positive boolean names, named over positional-boolean parameters, getters for conceptual properties, `Future<void>` return type, no nullable collections/Futures returned, `==`/`hashCode` overrides consistent (never on mutable classes).
- Use class modifiers deliberately: `base`/`interface`/`final`/`sealed` control outside implementation and evolution; adding a modifier to an existing public class is a breaking change requiring a major bump. Sealed families enable exhaustive `switch` but adding a subtype breaks consumers' switches.
- Document public members with `///` doc comments: single-sentence summary first (dart doc uses it as the short description), third-person verbs for methods, "Whether..." for booleans, `[bracket references]`, prose over tags. SCORING: pub.dev documentation points require docs on ≥20% of public members plus a code example.
- Keep `dynamic` out of public signatures where `Object`/`Object?` + type checks express the contract; type the errors your API throws in doc comments.

Full distilled rules with strengths: [API design and code quality](references/api-design-and-code-quality.md).

## 5. Plugin engineering rules

- A plugin's Dart API talks to native code over a platform channel; channel handlers run on the platform main thread (use a background `TaskQueue` only when handlers block). Catch `PlatformException` on every call and map it into the API's error contract.
- Prefer Pigeon for new non-trivial channels (type-safe, generated). Never expose generated types in the public API, and never split generated Dart and host code across federated packages — mismatched Pigeon versions are undefined behavior, including crashes. Keep hand-written `MethodChannel` for simple cases; domain-prefix channel names. Recheck the current Pigeon major on pub.dev before pinning a generator.
- Federated plugins: the app-facing package endorses platform implementations by depending on them and listing them as `default_package`; platform-interface packages enforce the contract (`extends` not `implements` — via `plugin_platform_interface` or a `base` class) so adding interface methods is not a breaking change.
- Assume multiple Flutter engines: keep engine-specific state on the plugin instance; reference-count shared native resources.
- iOS/macOS native dependencies, since Flutter 3.44: Swift Package Manager is the primary manager and on by default; CocoaPods stays in maintenance mode (registry read-only on 2026-12-02). Support **both** until Flutter says otherwise — SwiftPM-only plugins fail on unmigrated apps, CocoaPods-only plugins lose full platform pub points and break migrated apps. Declare triggered permissions in the README and privacy data in `PrivacyInfo.xcprivacy`.

Schemas, threading, codecs, Pigeon configuration, and per-platform validation commands: [Plugins and platforms](references/plugins-and-platforms.md).

## 6. Performance discipline

Classify each optimization as **documented behavior** (framework docs state the cost/benefit), **measure-first** (benefit depends on consumer workload — the example app is your harness), or **speculative** (drop it). Package performance rules with documented basis:

- `build()` must stay cheap — a package widget rebuilds whenever any ancestor in a consumer app rebuilds; localize state; use the `child`-pass-down pattern for animated wrappers; never override `operator ==` on widgets (documented O(N²) risk).
- Prefer lazy builders over eager children for large collections; semitransparent colors over `Opacity` widgets; document when your package triggers `saveLayer`.
- `Isolate.run` for CPU-heavy work on native only (Flutter web does not support isolates). The result is transferred after a transferability check, but spawn and cross-isolate messages still cost; long-lived isolates win for repeated work. Isolates do not remove platform-channel serialization.
- Package code size and startup cost land in every consuming app: keep dependencies minimal, avoid `dart:mirrors`, keep implementation under `lib/src` for tree-shaking.
- Benchmarks belong in `benchmark/`; no numeric claim goes in docs without a reproducible measurement.

Details: [Performance and resources](references/performance-and-resources.md).

## 7. Testing and verification protocol

Choose the smallest check that can fail. By package type:

```sh
# Pure Dart
dart format --output=none --set-exit-if-changed .
dart analyze
dart test
# Flutter package / plugin (Dart side)
flutter analyze
flutter test
# Plugin integration (native round-trip) — run inside example/
cd example && flutter test integration_test
# Publish readiness (never publishes)
dart pub publish --dry-run
```

- Every platform-channel call gets at least one integration test; Dart unit tests mock channels (mock ladder: own wrapper → public API → platform interface → `TestDefaultBinaryMessenger` as last resort).
- Widget libraries: widget tests for layout/interaction; goldens only with awareness of cross-platform font flakiness.
- Before publishing after a dependency change, run the downgrade test: `dart pub downgrade && dart analyze && dart test`.
- Report executed commands with real results separately from proposed and skipped checks; label anything not run as not run. Never weaken lints or tests to obtain a pass.

Full strategy, native test commands, and CI/publishing workflows: [Testing and CI](references/testing-and-ci.md).

## 8. Publishing and release management

- Versions follow SemVer with the Dart 0.x convention: before 1.0.0 the **minor** position plays the major role (0.1.2 → 0.2.0 is breaking; caret `^0.1.2` means `>=0.1.2 <0.2.0`).
- A release = version bump in pubspec + CHANGELOG entry (heading per version) + tagged push; automated publishing runs only on tag push with `id-token: write` via `dart-lang/setup-dart/.github/workflows/publish.yml@v1`; the first version of a package is published manually.
- `dart pub publish --dry-run` is a client subset. A clean dry-run is required before a release and is not proof the server will accept the upload (template descriptions and some plugin-folder rules are server-side). Report "dry-run clean", not "publishable", unless an authorized upload succeeded.
- Deprecate with `@Deprecated('... use X instead')` plus `lib/fix_data.yaml` so `dart fix` migrates consumers; end-of-life via pub.dev Admin tab ("discontinued"); retraction only within 7 days of publishing and only for serious flaws — prefer a fixed release.
- Scoring: run pana locally to preview pub points; the six scored categories (conventions, documentation ≥20%, platform detection, modern toolchains incl. SwiftPM/Wasm, core lint pass, up-to-date dependencies) are publishability-independent quality signals.
- Publishing is **explicit-user-request only**: never run `dart pub publish` (without `--dry-run`), retraction, or discontinued marking on your own initiative.

Processes, exact workflows, and security handling: [Publishing and maintenance](references/publishing-and-maintenance.md).

## 9. Task workflows

| Task | Procedure | Stop condition |
| --- | --- | --- |
| New package | Decide type (§3); scaffold; configure lints; minimal public API + tests + example; dry-run validation. | Analyze/test/dry-run clean; scope documented. |
| New feature | Extend API following existing conventions; add tests; CHANGELOG unreleased entry; widen dependency bounds only if the feature needs newer APIs (then test lower bound). | New behavior tested; no unintended API surface. |
| Breaking change | Inventory consumers of changed symbols; prefer additive redesign; if unavoidable: bump major (or pre-1.0 minor), write migration section in CHANGELOG, add `@Deprecated` bridge when feasible. | Migration path documented; version policy followed. |
| Bug fix + release | Regression test failing before fix; changelog entry; patch bump; tag push when CI configured (with user approval to release). | Regression passes; released or ready-to-release stated. |
| Deprecate API | `@Deprecated` with replacement guidance + fix data; keep old path working until the next major; document timeline. | Analyzer surfaces deprecation; migration toolable. |
| Review existing package | Audit against the [quality gates](references/checklists-and-gates.md); report findings with severity, evidence, and smallest correction. | All gates checked or explicitly marked N/A. |
| Fix pub score | Run pana; map deductions to scored categories; fix root causes (docs, lints, constraints, SwiftPM/Wasm). | Deductions resolved or explained. |

## 10. Final quality gates

Before declaring any package task complete, check the applicable gates in [Checklists and gates](references/checklists-and-gates.md) and mark skipped ones: public API intentional and documented; pubspec valid and constraints as wide as tested; analysis/format/tests actually executed with reported results; platform support declared matches reality; performance claims measured or withdrawn; CHANGELOG/version correct; publishing steps not overstepped. The final report states outcome, verification evidence, and remaining risks.
