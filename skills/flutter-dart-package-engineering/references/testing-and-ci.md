# Testing and CI

Test strategy for packages and plugins, verification commands, and CI/publishing workflows. Strength labels per SKILL.md §1.

## Test taxonomy and where each applies

Official trade-offs (confidence / maintenance cost / dependencies / speed): unit (low/low/few/quick) → widget (higher/higher/more/quick) → integration (highest/highest/most/slow). A well-tested package has many unit/widget tests "tracked by code coverage, plus enough integration tests to cover all the important use cases."

| Package type | Required layers |
| --- | --- |
| Pure Dart | Unit tests (`dart test`) for logic and API behavior |
| Flutter package | Unit + widget tests (`flutter test`); example app for interactive validation |
| Plugin | Dart unit tests with mocked channels + integration tests through `example/` (Dart↔native round-trip) + native unit tests for native logic |
| Federated platform-interface pkg | Unit tests against the interface with mock/default implementations |

Source: https://docs.flutter.dev/testing/overview

## Plugin testing specifics

- Native code does not load under `flutter test`: channel calls throw `MissingPluginException` — mock them.
- "Have **at least one integration test per platform channel call**" — only integration tests exercise the Dart↔native path. Run them inside `example/` (`flutter test integration_test`). `integration_test` cannot drive native UI (permission dialogs, notifications, platform views) — use patrol for that, or split the check into halves: native unit test invoking the channel entry point with mocks, and Dart unit test mocking the channel behind the public API.
- Native unit tests ship with the plugin template: JUnit (`android/src/test/`), XCTest (`example/ios/RunnerTests/`, `example/macos/RunnerTests/`), GoogleTest (`linux/test/`, `windows/test/`).

```sh
# Android (build the example once first)
cd example/android && ./gradlew testDebugUnitTest
# iOS / macOS
xcodebuild test -workspace Runner.xcworkspace -scheme Runner -configuration Debug
# Linux / Windows — run the built test binaries
build/linux/plugins/x64/debug/<plugin>/<plugin>_test
build/windows/plugins/<plugin>/Debug/<plugin>_test.exe
```

### Channel-mocking ladder (for code that *consumes* plugins; also informs API design)

RECOMMENDED order from the official docs:

1. Wrap the plugin behind your own interface; mock your interface (most robust).
2. Mock the plugin's public API (only possible for instance-based APIs).
3. Mock the platform interface (federated plugins; plugin code still runs — beware side effects).
4. Mock the raw channel with `TestDefaultBinaryMessenger` — last resort: channels are internal, untyped, and differ per platform implementation; "mainly useful in the internal tests of plugin implementations."

Dart-only implementations (`dartPluginClass`) happen to work in unit tests — treat that as an implementation detail, not a contract.

Source: https://docs.flutter.dev/testing/plugins-in-tests

## Test hygiene

- `test/` with `*_test.dart` names; `group`/`setUp`/`tearDown` mirror suites; `tearDown` releases async resources (canceled subscriptions, closed servers) so leaks don't masquerade as flakes.
- Async: `await` assertions or `expectLater` with stream matchers (`emitsInOrder`); `fake_async` (package `fake_async`/`flutter_test`) for timer-driven logic.
- Mocks: mocktail (no codegen) and mockito (codegen) are CONVENTION, not requirements — a hand-written fake of your own interface is often clearer. Mock the *boundary you own*.
- Widget tests: `pumpWidget` + finders; `pumpAndSettle` only where animation terminates. Golden tests (`matchesGoldenFile`, update with `--update-goldens`) render with host fonts — cross-platform CI needs matching fonts or they flake; treat goldens as per-platform snapshots.
- Coverage: `dart test --coverage=coverage` / `flutter test --coverage`; format with `package:coverage` (`format_coverage`) into lcov for tooling. Report coverage as a number you ran, not a quota to satisfy.

## CI and automated publishing

Minimal package CI matrix (RECOMMENDED): analyze + format check + tests on the **oldest supported SDK** (the pubspec's `environment.sdk` lower bound — test it with `dart pub downgrade`) and the current stable. Plugin CI adds an integration-test job per supported platform and a native build job (first-party practice: flutter/packages CI matrix).

Automated publishing to pub.dev via GitHub Actions OIDC (exact requirements from the official docs):

```yaml
# .github/workflows/publish.yml — triggers ONLY on tag push
on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'   # must match the tag pattern configured on pub.dev

jobs:
  publish:
    permissions:
      id-token: write              # OIDC requirement
    uses: dart-lang/setup-dart/.github/workflows/publish.yml@v1
    # with:
    #   environment: pub.dev      # if "Require GitHub Actions environment" is enabled
    #   working-directory: path/to/package
```

- Enable in pub.dev Admin tab (repo `org/name` + tag pattern like `v{{version}}`); the tag must equal the pubspec version. Pin the environment (`pub.dev`) so repository push access alone cannot publish. First versions publish manually — automation covers later releases only. Multi-package repos use per-package tag patterns (`pkg-v{{version}}`) and separate workflows.
- CI dependency hygiene: `dart pub outdated` in CI or scheduled jobs to catch ecosystem drift; treat advisories per [Publishing and maintenance](publishing-and-maintenance.md).
- `dart-lang/setup-dart@v1` is the official action; `subosito/flutter-action` is community convention.

Sources: https://dart.dev/tools/pub/automated-publishing , https://docs.flutter.dev/testing/testing-plugins
