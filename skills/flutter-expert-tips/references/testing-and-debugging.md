# Testing, Debugging, DevTools, Observability

## Test by risk

### Unit tests

Best for:

- parsing/validation;
- state reducers/controllers;
- repositories with fakes;
- retry/error logic;
- collection/business algorithms.

### Widget tests

Best for:

- rendering states;
- interactions/navigation intents;
- form validation;
- semantics/accessibility structure;
- responsive/platform variants.

### Integration/UI tests

Best for:

- end-to-end critical flows;
- platform plugins;
- navigation/deep-link behavior;
- screenshot/store flows where needed.

### Golden tests

Useful for stable visual contracts. Avoid making every pixel of rapidly changing product UI a golden burden.

## Testing thrown exceptions

Pass a tear-off/closure to `expect`, rather than invoking the throwing function before the matcher can observe it.

```dart
expect(() => parse('bad'), throwsFormatException);
```

For async failures, await the matcher according to `flutter_test`/`test` APIs.

## Fakes

Repository interfaces can support deterministic fakes without network/storage. Prefer small hand-written fakes for simple contracts; use mocking frameworks when interaction verification or broad interfaces justify them.

## Test variants/tags/timeouts

The corpus contains useful runner/tooling tips. Use them deliberately:

- variants for theme/platform/config matrices;
- tags for selective suites;
- custom timeouts only when a legitimate operation needs them, not to mask hangs.

## Semantics identifiers

Identifiers can make external UI automation more robust than coordinate/text guessing. Keep identifiers stable, meaningful, and not coupled to localized display text.

Do not add identifiers in ways that damage semantic labels for accessibility.

## DevTools route by symptom

### Layout/visual hierarchy
- Widget Inspector
- debug paint/size visualization

### Network
- Network view
- inspect URL/method/status/headers/timing/body where safe

### Logging
- DevTools Logging page
- `dart:developer.log` with names/errors/stacks

### Jank/performance
- Performance timeline
- CPU profiler
- rebuild statistics
- repaint rainbow/debug diagnostics

### Memory/leaks
- Memory view/allocation snapshots
- repeated mount/unmount reproduction

## `debugFillProperties`

Implement for complex reusable widgets/objects when richer inspector diagnostics materially improve debugging.

```dart
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  super.debugFillProperties(properties);
  properties.add(StringProperty('userId', userId));
  properties.add(FlagProperty('loading', value: loading, ifTrue: 'loading'));
}
```

Do not expose secrets/PII through diagnostics.

## Logging

`debugPrint` can log in release mode. Therefore:

- gate debug-only logs with `kDebugMode`/assert as appropriate;
- use a structured logging/crash reporting policy for production;
- never log tokens, passwords, secrets, full sensitive payloads.

`dart:developer.log` is useful for named structured developer events and stack/error attachment, but still needs release/privacy policy.

## Repaint rainbow

Use `debugRepaintRainbowEnabled` to identify repainting regions in debug diagnostics. It tells you *where* repaint occurs, not whether repaint cost is a real user-visible problem.

## CI

Minimum healthy Flutter CI generally includes:

```text
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test
```

Adjust for monorepos/platform packages. Integration/golden tests can run separately by cost/platform.

## Coverage

Coverage is a diagnostic, not a quality score. Use it to find untested critical logic; do not write trivial tests solely to raise percentage.

## Fix tools

- `dart fix --dry-run` before applying broad automated migrations.
- `dart fix --apply` when changes are understood/reviewed.
- formatter/lints are version-sensitive; follow current SDK behavior.
