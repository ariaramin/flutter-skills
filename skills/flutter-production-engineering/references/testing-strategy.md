# Testing and validation decisions

## Choose a test that can fail for the defect

| Boundary | Suitable evidence | Limits |
| --- | --- | --- |
| Parsing, algorithms, state transitions, retry/pagination policy | Focused unit test with malformed/boundary input and controlled dependencies. | Mock call counts alone do not establish user behavior or server correctness. |
| Flutter state/render binding, local navigation, layout, focus, semantics | Widget test with real widgets and inherited dependencies. | Does not establish OS/plugin integration or real-device performance. |
| Storage migrations, platform plugins, deep links, lifecycle, complete journeys | Integration test on affected runtime; controlled real storage when appropriate. | Flutter integration tests cannot directly drive every native system UI; use permitted native tools when necessary. |
| Visual contract | Golden with controlled fonts, locale, viewport/DPR, time and deterministic data. | Not a substitute for semantics, behavior, platform layout or screen readers. |
| Frame time, startup, retention, app size | Comparable profile/release-like traces or native size reports. | Debug timing and widget presence cannot prove runtime improvement. |

Prefer simple fakes and controllable futures for behavior boundaries. Test out-of-order completion, obsolete errors, post-disposal completion, duplicate requests and partial failure where reachable. A widget test using controlled timers should pump explicit intervals; `pumpAndSettle` can hang with endless animation. Avoid arbitrary real sleeps and mocking BuildContext/render internals.

For uncertain legacy behavior, capture observed outputs, persistence, navigation and failure semantics before changing structure. A bug regression should fail on old behavior; a characterization test should pass before and after a behavior-preserving refactor.

## Local commands and CI

Inspect existing scripts and pinned SDK. Run formatting/checks for affected files and one relevant test first. Use `flutter analyze <existing paths>` / `flutter test <test file>` or the Dart equivalents. Expand when shared consumers, migrations, integration boundaries or required CI demand it. Full analysis/suite/build results are separate evidence from focused checks.

Keep the existing lints; strict casts/inference/raw types can be useful deliberate policy changes, not automatic prerequisites. Preview `dart fix --dry-run` for a scoped migration and review changes; do not suppress errors or rewrite unrelated files to make checks green.

Build the affected platform when native assets/configuration, versioned APIs or compilation modes changed enough that analysis/tests cannot catch failures. Inspect CLI help for target flags. Label tooling, OS/signing/hardware and network limitations; do not claim unavailable checks passed.

## UI and test isolation

Test narrow/wide constraints, large text, keyboard/focus and applicable semantics. `androidTapTargetGuideline`, `iOSTapTargetGuideline`, `labeledTapTargetGuideline` and `textContrastGuideline` are useful automated checks; they do not prove complete accessibility.

Register teardown for semantics handles and any changed test views, surface sizes, DPR, platform overrides, fake clocks, storage and DI scopes. Restore view properties with supported reset APIs; keep goldens deterministic across the intended environment. Preserve production disposal behavior while testing.

Use CI to enforce the project's checks and target matrix. Distinguish pre-existing failures from introduced ones; never claim whole-project cleanliness from a focused pass. Report the actual command, scope, result and pending checks without dumping successful logs.

Sources: testing overview, build modes, static analysis, DevTools performance/memory and accessibility testing in [sources](sources.md).
