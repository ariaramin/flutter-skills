# Checklists and gates

Quality gates for package work. For each gate: what to inspect, what fails, the verifying tool/command, whether it is **mandatory** (must hold before the task is done) or **conditional** (applies only to the listed package types/situations), and the corrective action. Mark N/A gates explicitly rather than skipping silently.

## G1. Package design gate (new package / architecture change)

- Inspect: chosen type vs requirement (no native code → Dart package; bundling C → FFI package; platform channels → plugin; multi-vendor/per-platform cadence → federated).
- Fail: federated structure for a single-implementation API; plugin wrapper around a pure Dart capability; FFI package needing the Flutter Plugin API.
- Verify: decision traced against the type table (SKILL.md §3). Mandatory before scaffolding.

## G2. Pubspec and layout gate (every release, new package)

- Inspect: name; description present, plain text, no emoji, no token over 64 characters, at most 512 characters, and not template boilerplate (aim for the 60–180 character pubspec target); version format; SDK + Flutter constraints; dependency ranges as wide as tested; `LICENSE`, `README.md`, `CHANGELOG.md` present; no git/path deps; `lib/src` privacy; example recognized.
- Fail: any publish-reject field rule broken (see [Package structure and types](package-structure-and-types.md)). A description outside 60–180 is a scoring/readability miss, not by itself a publish failure.
- Verify: `dart pub publish --dry-run` (never publishes); `dart pub deps` for the transitive graph. Mandatory.

## G3. Public API gate (any `lib/` change)

- Inspect: new exports intentional; Effective Dart design rules applied (positive booleans, named params, `Future<void>`, non-nullable returns); class modifiers chosen; doc comments with first-sentence summaries; breaking changes identified.
- Fail: untyped `dynamic` in signatures without justification; accidental export of internals/Pigeon-generated types; missing docs on new public members.
- Verify: `dart analyze`; review of `lib/` file list; diff against exported surface. Mandatory for `lib/` changes.

## G4. Static analysis and format gate

- Inspect: `analysis_options.yaml` includes `lints/recommended.yaml` (or `flutter_lints/flutter.yaml`); no analyzer errors/warnings/lints on core set.
- Fail: analyzer diagnostics; formatting drift mixed into functional diffs.
- Verify: `dart analyze` / `flutter analyze`; `dart format --output=none --set-exit-if-changed .`. Mandatory.

## G5. Test gate

- Inspect: tests exist for new behavior; plugin channel calls covered by integration tests; async disposal covered (`tearDown`); regression test present for bug fixes.
- Fail: new public behavior untested; plugin API with zero integration coverage; broken tests ignored.
- Verify: `dart test` / `flutter test`; plugin integration: `cd example && flutter test integration_test`. Mandatory (native/device checks: conditional — run when plugin/platform code changed; report honestly when they cannot run).

## G6. Platform compatibility gate (plugins, conditional)

- Inspect: `flutter.plugin.platforms` matches shipped native directories; iOS/macOS plugins ship both SwiftPM and CocoaPods until Flutter withdraws dual support; permissions documented; example builds on each declared platform; example `AppDelegate` uses `didInitializeImplicitFlutterEngine` when it registers channels (Flutter ≥3.41).
- Fail: platform declared without implementation; new iOS/macOS plugin missing SwiftPM or, while dual support is required, missing CocoaPods; undocumented permission triggers.
- Verify: example-app build per platform; pana platform section. Conditional (plugins only).

## G7. Performance gate (hot paths, widgets, channels — conditional)

- Inspect: `build()` cost; `child` pattern where wrappers animate; no widget `operator ==`; `saveLayer` triggers documented; chatty channel calls batched; isolates only for CPU-bound native work with a web story; benchmarks added for claimed numbers.
- Fail: unmeasured performance claims in docs; O(n) work per frame that lazy building would remove; forced `saveLayer` without documentation.
- Verify: example-app profile run (DevTools performance/CPU), `benchmark/` results before/after. Conditional on performance-relevant changes; claims without measurements must be removed or labeled unverified.

## G8. Documentation gate

- Inspect: README (what/why/install/platform table), CHANGELOG entry, doc comments ≥20% of public members, runnable example, permission/migration notes.
- Fail: example absent; version in changelog missing at release; public API undocumented.
- Verify: `dart doc` builds cleanly; pana documentation section. Mandatory before release.

## G9. Versioning gate (release)

- Inspect: bump matches change type — breaking: major (pre-1.0: minor); feature: minor (pre-1.0: patch-position); fix: patch; deprecations bridged with `@Deprecated` + fix data.
- Fail: breaking change shipped without the correct bump; `+build` suffix ≥1.0.0.
- Verify: diff vs last release; CHANGELOG consistency. Mandatory at release.

## G10. Security gate

- Inspect: dependency advisories addressed; no secrets; `false_secrets` justified; lockfile-free library package; overrides absent.
- Fail: known-affected dependency shipped; credential in repo shipped in package.
- Verify: `dart pub outdated`; advisory output during `dart pub get`. Mandatory at release.

## G11. Publishing gate (only on explicit user request)

- Inspect: dry-run clean and file list expected; tag matches version; automated workflow configured; user authorization recorded in the conversation.
- Fail: any dry-run warning unexplained; version mismatch with tag; dry-run treated as proof the server will accept the package.
- Verify: `dart pub publish --dry-run` output reviewed with the user; then the user-authorized publish. A clean dry-run is necessary and not sufficient. Mandatory sequence — the agent never invokes real publish/retract/discontinue on its own initiative.

## Common failure patterns → corrections

| Symptom | Likely cause | Correction |
| --- | --- | --- |
| `dart pub publish` rejected: description/name/version | MANDATORY pubspec rule broken | Fix the field per [Package structure and types](package-structure-and-types.md); re-run dry-run |
| Consumers report `MissingPluginException` in their tests | Native code absent under `flutter test` | Document the mocking ladder; provide a test-friendly seam (platform interface) |
| Interface update broke third-party implementations | Outside `implements` of a plain abstract class | `plugin_platform_interface`/`base` + default implementations; release interface major |
| Pub points drop after release | Scoring category regressed | Run pana locally; fix the root category (docs %, lints, SwiftPM/Wasm, outdated deps) |
| Resolver conflicts for consumers | Over-tight or exact dependency pins | Widen to tested range; downgrade-test the lower bound |
| Consumer switches non-exhaustive after update | New sealed subtype in minor release | Move to a major; or use `final` + documented default arm |
| Version collision on publish | Tag ≠ pubspec version | Align tag pattern `v{{version}}` with the bumped version |
| Web consumers crash on isolate API | `Isolate.run` unsupported on Flutter web | Platform-conditional implementation + documented web path |
