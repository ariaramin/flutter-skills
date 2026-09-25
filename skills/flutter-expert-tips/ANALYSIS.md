# Repository Analysis Summary

## Corpus character

### `vandadnp/flutter-tips-and-tricks`

- Last observed repository commit in the inspected history: December 30, 2022.
- Organized as a large `tipsandtricks/` corpus; most topics have a Markdown entry plus a Dart snippet and often an infographic.
- Strongest value: Dart expressiveness, collections/extensions, streams/futures, compact Flutter widget recipes, animations, network snippets, resource/cancellation ideas.
- Main risk: the corpus predates several modern Dart/Flutter changes, so exact snippets must be treated as historical until analyzer/current docs confirm them.
- Some tips intentionally demonstrate clever/custom operators and generic conversions. These are useful teaching devices but not universal production guidance.

### `bizz84/flutter-tips-and-tricks`

- README indexes 256 numbered tips; latest observed commit is September 23, 2025 (`Tip 256`).
- Strongest value: production workflow, architecture/testing, BuildContext, side effects, DevTools/performance, Riverpod patterns, Firebase, platform/build tooling, and newer Dart/Flutter changes.
- Main risk: many entries are package/tool/version specific. Some “tips” are intentionally concise and need conditions (for example intrinsic sizing, Container replacement, remote-config force upgrades).

## Synthesis method

1. Used both README indexes as the complete topic inventory/taxonomy source.
2. Inspected representative/high-impact source files and source snippets for semantics.
3. Deduplicated recurring themes: async context safety, lazy lists, stream/future handling, disposal, reusable widgets, error models, architecture boundaries, platform configuration, performance diagnostics.
4. Separated framework-agnostic rules from Riverpod/Bloc/Hooks/Firebase/Dio/tooling recipes.
5. Cross-checked version-sensitive high-impact items against current official Flutter/Dart API/documentation.
6. Converted durable rules to **Trigger → Diagnosis → Action → Verification** behavior in `SKILL.md` and references.
7. Kept old ideas when useful, but labeled exact old APIs as legacy/deprecated/needs verification.

## Key deduplicated rules

1. Build methods must tolerate frequent reruns and should not orchestrate effects.
2. Do not create restartable futures/streams/controllers in build unintentionally.
3. Never assume a `BuildContext` survives an async gap; use `context.mounted` or redesign effect ownership.
4. Dispose/cancel/close resources according to explicit ownership.
5. Build large scrollable collections lazily.
6. Solve layout via constraints before fixed pixels or intrinsic sizing.
7. Localize rebuilds and use `const` naturally.
8. Prefer dedicated reusable widgets for meaningful UI subtrees; avoid fragmentation.
9. Profile before performance optimization; debug mode is not a benchmark.
10. Offload measured CPU-heavy work only; `compute` is not a generic async solution.
11. Treat fractional opacity/compositing and oversized images as potential raster/memory costs.
12. Model expected recoverable failures explicitly at service/repository boundaries where useful.
13. Preserve stack traces and do not silently swallow unexpected errors.
14. Cancellation must propagate to the real underlying work to save resources.
15. Define stream ownership, errors, done, cancellation, and listener semantics.
16. Prefer standard modern Dart features before custom collection operators/helpers.
17. Architecture should reduce change/test cost, not maximize layers.
18. Preserve the project's existing state-management solution unless migration solves a concrete issue.
19. Client build configuration is not secret storage.
20. Platform/build/vendor recipes must be verified against the consuming project's versions.

## Notable modernization findings

- `dart:html` is deprecated; current Dart uses `package:web` / `dart:js_interop`.
- Old Dart macros/`JsonCodable` experiment should not be taught; work on the macro experiment was stopped.
- `Matrix4.translate/scale/scaled` dynamic methods are deprecated in favor of typed `*ByDouble` / `*ByVector*` variants.
- `Color.withOpacity` is deprecated; use `withValues(alpha: ...)`.
- `WillPopScope` is deprecated; use `PopScope`.
- `IntrinsicWidth` is explicitly documented as relatively expensive and potentially O(N²) with tree depth.
- `MediaQuery.of` should be replaced by aspect-specific getters when only one field is needed.
- `debugPrint` logs in release mode, so it must not be assumed safe/debug-only.
- `compute` runs on the current event loop on web, separate isolate on native.

## Scope note

The two repositories contain hundreds of visual examples and companion images. The generated skill does not duplicate every UI screenshot recipe. Instead it indexes those topics into the taxonomy and extracts the engineering decision that an AI agent can apply. Source traceability focuses on normalized rules and representative paths, which keeps the skill maintainable rather than turning it into a copied archive.
