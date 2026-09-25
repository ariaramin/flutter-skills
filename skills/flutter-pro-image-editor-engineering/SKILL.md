---
name: flutter-pro-image-editor-engineering
description: >-
  Design, implement, review, debug, test, optimize, and migrate production Flutter image-editing flows built with pro_image_editor. Use for ProImageEditor constructors and callbacks, paint/crop/filter/tune/blur/text/emoji/sticker tools, custom widget layers, undo/redo and persisted editor state, JPG/PNG export, transparency, large-image memory or OOM issues, isolate and Web Worker generation, editor lifecycle, upload pipelines, EXIF/GPS privacy, or version-sensitive pro_image_editor APIs. Trigger even when the request only says the Flutter image editor is slow, resets, freezes during export, loses quality, or behaves differently on Web/mobile/desktop. Do not use for image selection without editing (use an image_picker skill) or generic Flutter image rendering and caching without pro_image_editor (use an image-performance skill).
---

# Flutter pro_image_editor Engineering

Treat `pro_image_editor` as an image-processing pipeline with UI, memory, lifecycle, persistence, and privacy consequences—not as an ordinary widget.

## Route the task

Read only the references needed:

| Task | Reference |
|---|---|
| Architecture, current API, configuration, constructors, source selection | `references/01-api-and-inputs.md` |
| Large-image memory, processors, formats, transparency, export, quality | `references/02-processing-memory-and-export.md` |
| History, editing tools, layers, gestures, lifecycle, files, upload | `references/03-state-tools-and-lifecycle.md` |
| Metadata/privacy, platforms, accessibility, state integration, failures, profiling | `references/04-platform-privacy-and-performance.md` |
| Tests, debugging, anti-patterns, review/readiness checklists, version-sensitive facts | `references/05-testing-audits-and-versioning.md` |

For exact APIs, first inspect the project's resolved package version and installed source. The bundled facts are validated against `pro_image_editor 13.3.1`, Flutter 3.44+, and Dart 3.12+; treat them as a baseline, not proof for another version.

## Inspect before changing code

Inspect:

- `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints, and supported platforms.
- Every `ProImageEditor` constructor, callback, configuration, controller, and persisted-state caller affected by the change.
- Source type and dimensions, required output dimensions/format/alpha, and metadata policy.
- Existing image-picker, storage, upload, navigation, state-management, and error-handling paths.
- Installed `pro_image_editor` source when a signature, default, enum value, or behavior is version-sensitive.

Search for at least:

```text
ProImageEditor ProImageEditorCallbacks ProImageEditorConfigs
ImageGenerationConfigs MainEditorConfigs StateHistoryConfigs
onImageEditingComplete onCompleteWithParameters onCloseEditor
importStateHistory exportStateHistory captureLayersOnDone
UniqueKey readAsBytes base64 maxOutputSize outputFormat
```

Trace all completion and cancellation paths before editing. Fix shared causes once instead of patching one caller.

## Define the contract

Establish only requirements that affect the implementation:

1. Which platforms ship?
2. Which source types and maximum dimensions are accepted?
3. Must the original remain available for re-editing or recovery?
4. What output dimensions, format, quality, and transparency are required?
5. Must editor history or individual layers persist?
6. Must EXIF/GPS be removed, preserved, or ignored?
7. What work must happen after export, and who owns it?

If the repository answers these questions, do not ask the user again. Otherwise choose the conservative behavior that preserves the original and avoids privacy claims.

## Implement the smallest complete flow

Use this default architecture:

```text
source media
→ minimal source preparation
→ stable ProImageEditor route
→ transient editor-owned state
→ one final export
→ close editor
→ persistence/upload/business work
```

Apply these rules:

- Prefer `ProImageEditor.file` for an existing supported native file and `ProImageEditor.memory` when bytes already exist or a browser picker supplies bytes.
- Do not add file-to-bytes-to-base64 round trips or claim file input is zero-copy.
- Preserve stable widget/session identity; never introduce `UniqueKey()` to force routine rebuilds.
- Keep gesture-time state local to the editor. Do not mirror every pointer update into global state, storage, analytics, or the network.
- Keep isolate/Web Worker generation enabled initially. Change processor mode or concurrency only from profile evidence.
- Bound final dimensions when the product does not need full source resolution. Preserve the original separately when re-editability or fidelity matters.
- Choose JPG for opaque photographic output and PNG when alpha or lossless output is required. Verify actual output dimensions and alpha pixels.
- Bound history deliberately for long sessions or large sources.
- Leave layer capture disabled unless the caller consumes captured layers.
- Give completion one owner and make downstream side effects idempotent when duplicate delivery is possible.
- Move uploads, database writes, and other business work outside the editor's interaction and export lifecycle when the product permits.
- Do not log image bytes, base64, sensitive paths, filenames, EXIF, coordinates, or persisted private editor state.
- Never assert that metadata is stripped or retained without testing the actual unchanged and re-encoded paths.

## Diagnose from evidence

Classify the bottleneck before optimizing:

```text
open latency → source decode, dimensions, copies, editor initialization
gesture jank → rebuilds, layer/path/history growth, blur/filter raster cost
export freeze → capture, raw buffers, encoding, app callback work
memory spike/OOM → decoded pixels, concurrent full-image buffers, history, layers
web-only failure → byte/file semantics, Worker availability, Wasm fallback
reset/lost edits → changing key/type/source identity or incorrect state ownership
```

Measure profile/release builds on the slowest supported device or browser. Keep debug measurements out of performance conclusions.

## Validate the result

Run the narrowest applicable checks, then expand when the risk requires it:

- Format and analyze changed Dart code.
- Run focused unit/widget/integration tests.
- Exercise cancel, successful Done, export failure, and duplicate completion.
- Verify small and maximum-size sources, repeated open/export/close, output dimensions, format, quality, and alpha.
- Test metadata with fixtures when privacy depends on it.
- Test every shipped platform whose source, worker, filesystem, gesture, or layout behavior differs.
- Profile UI/raster timing, export duration, and peak memory for performance work.

Before finishing, review the diff for redundant byte copies, stale APIs, new unbounded work, original-media overwrite, and accidental sensitive logging.
