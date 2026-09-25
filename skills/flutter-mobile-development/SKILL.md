---
name: flutter-mobile-development
description: >
  Develop, modify, review, debug, test, and maintain production Flutter applications across Dart, Android, and iOS. Use for Flutter features, bug fixes, refactors, UI/state/data work, lifecycle or platform behavior, and mobile quality reviews. Preserve the repository's architecture and packages; use a narrower package-specific skill when the task is exclusively about one dependency or platform capability.
---

# Flutter Mobile Development

## Purpose

Build the smallest robust change that delivers the requested mobile behavior.
Inspect the repository before editing, preserve its conventions, and account for
Flutter, Android, and iOS implications when they are relevant. Do not impose a
state-management library, architecture template, DI container, router, storage
solution, or folder layout on an existing app.

## Discovery

Before a non-trivial change:

1. Read `pubspec.yaml`, `analysis_options.yaml`, and the relevant `lib/` and
   test files. Identify the Flutter/Dart constraints, code generation, lints,
   state management, routing, DI, networking, persistence, localization, and
   design-system conventions already in use.
2. Trace the affected behavior end to end: UI event or lifecycle trigger,
   presentation state, domain or repository operation, data/platform boundary,
   and visible result. Read callers before changing shared APIs.
3. Inspect `android/`, `ios/`, flavors, and CI only when the behavior, package,
   permission, build, deep link, notification, or native integration touches
   them. Do not edit platform files by habit.
4. Reuse existing widgets, models, services, error types, and test helpers.
   Check the SDK and installed dependencies before adding a package.

For a new app, select a simple structure that separates presentation from data
access. Add a domain/use-case layer only for reusable or complex orchestration;
do not create pass-through classes merely to satisfy a pattern.

## Architecture and state

- Keep widgets responsible for presentation, simple layout/animation decisions,
  and dispatching user intent. Keep business rules, I/O, caching, and durable
  feature state outside `build()`.
- Preserve the project’s state-management approach. Keep ephemeral interaction
  state local; give feature, session, and persisted data one explicit owner.
  Do not create duplicate mutable sources of truth.
- Keep platform APIs, HTTP, databases, files, and secure storage behind a
  typed Dart-facing service or repository boundary where the app already has
  one. Map transport/storage failures into project-consistent application
  failures instead of leaking implementation exceptions into widgets.
- Prefer constructor injection and composition at app or feature boundaries.
  Do not scatter service-locator lookups through UI and business logic.
- Use immutable values and explicit state transitions where practical. Prefer
  `final`, sound null safety, focused public APIs, composition, and exhaustive
  sealed/pattern matching when it makes invalid states harder to represent.
- Do not routinely use `dynamic`, unchecked `!`, mutable globals, broad
  catches, arbitrary delays, or unrelated architecture migrations.

## Dart and asynchronous safety

- Follow the repository’s analyzer configuration and Effective Dart naming,
  typing, formatting, and documentation conventions. Prefer clear code over
  clever extensions or abstractions.
- Await futures unless fire-and-forget is deliberately safe, observable, and
  owned. Handle expected errors at meaningful boundaries; preserve unexpected
  errors and stack traces for diagnostics.
- After an async gap, avoid stale UI work. Obtain durable collaborators before
  `await` when valid; otherwise check `context.mounted` or the relevant owner’s
  lifecycle immediately before using UI state or `BuildContext`.
- Give every `StreamSubscription`, controller, listener, timer, focus node,
  animation, isolate port, and cancellation handle a clear owner. Dispose,
  cancel, or close it exactly once at the matching lifecycle boundary; never
  dispose a borrowed resource.
- Prevent stale requests from winning races such as search, refresh, or rapid
  navigation. Use real cancellation when the underlying API supports it, or
  discard results only when that is sufficient and documented by the state
  owner.
- Use async I/O for waiting work. Move CPU-heavy work off the UI isolate only
  after profiling shows it threatens responsiveness; account for isolate
  transfer and serialization cost.

## UI and UX

- Keep `build()` declarative, fast, and free of I/O, navigation, mutation,
  subscription creation, or restartable async work. Store futures/streams in an
  appropriate lifecycle or state owner rather than constructing them on every
  rebuild.
- Extract widgets around reuse, ownership, readable composition, or rebuild
  isolation—not a fixed line limit. Localize rebuilds; use `const` naturally;
  avoid expensive computation in build/layout/paint.
- Solve layout through constraints. Test narrow and wide widths, text scaling,
  orientation, keyboard insets, safe areas, and nested scrolling before adding
  device-specific dimensions. Use responsive layouts to fit available space and
  adaptive behavior when input or platform conventions differ.
- Use stable identity for keys. Use lazy list/grid delegates for large or
  unbounded collections. Size and cache images deliberately.
- Preserve the app’s theme, typography, spacing, components, localization, and
  navigation conventions. Do not hard-code colors, text, spacing, or routes
  where the project provides a token, localization, component, or router API.
- Model the states the user can actually encounter: loading, content, empty,
  retryable error, pending action, and offline/stale data where applicable.
  Make destructive actions recoverable or confirmable when the product calls
  for it.

## Accessibility

- Use semantic, labelled controls and meaningful form errors; do not convey
  status only by color, animation, or position.
- Keep controls usable with TalkBack, VoiceOver, keyboard/focus navigation
  where supported, large text/display scaling, and color-vision differences.
- Preserve or provide adequate contrast and at least 48×48 logical-pixel touch
  targets unless an established component has a documented exception.
- Test important changed flows with the platform screen reader when practical.
  Do not suppress semantics merely to remove a test failure.

## Data, networking, and offline behavior

- Keep API/client details out of widgets. Define timeout, retry, pagination,
  cancellation, cache freshness, error mapping, and offline write behavior at
  the appropriate data boundary.
- Retry only transient failures with a bounded policy; do not retry
  authorization, validation, or permanent server failures blindly.
- Treat remote, cached, pending, and optimistic data as distinct states when
  users can observe the difference. Define rollback or reconciliation before
  adding an optimistic mutation.
- Validate untrusted data at boundaries. Never log tokens, credentials,
  session identifiers, personally identifiable data, or raw sensitive payloads.

## Security and privacy

- Assume a shipped app can be inspected. Never embed privileged credentials,
  private keys, or server-side secrets in Dart, assets, `.env`, or
  `--dart-define`; client configuration is not secret storage. Use a trusted
  backend for privileged operations.
- Store user secrets only through the project’s platform-backed secure-storage
  mechanism. Do not put tokens or private data in plain preferences, caches,
  logs, screenshots, or analytics.
- Use HTTPS and retain Android/iOS transport-security defaults. Add a network
  security or App Transport Security exception only for a verified requirement,
  scoped as narrowly as possible.
- Request only necessary permissions, include accurate Android/iOS purpose
  declarations, and handle denial or revocation. Treat deep links, external
  intents, WebViews, clipboard, files, and platform-channel values as untrusted
  input; validate and authorize before acting.
- Check package maintenance, platform support, licenses where relevant, and
  known security implications before introducing a dependency or native bridge.

## Android and iOS boundaries

When a task crosses a platform boundary, identify the required behavior on each
supported platform and verify it on both when possible.

- **Android:** review manifest declarations, runtime permissions, SDK/Gradle
  compatibility, App Links, notification permission, background limits,
  signing, and R8/ProGuard implications as applicable.
- **iOS:** review `Info.plist` purpose strings, entitlements/capabilities,
  deployment target, Universal Links, App Transport Security, background modes,
  signing, and privacy requirements as applicable.
- Keep native code and platform channels behind a Dart interface. Handle an
  unsupported platform explicitly; do not silently emulate success. Prefer an
  existing supported plugin or project abstraction before adding native code.

## Performance and observability

- Treat performance work as measurement-led. Diagnose in profile mode on
  representative hardware with DevTools before substantial rebuild, raster,
  memory, startup, or isolate refactors.
- Avoid eager scrollable construction, repeated image decoding, unnecessary
  opacity/clipping/layers, synchronous disk I/O, and needless serialization on
  the UI path. Do not trade clarity for speculative micro-optimizations.
- Preserve the repository’s error reporting and privacy policy. Add focused,
  redacted diagnostics at meaningful failures; avoid noisy logs and duplicate
  reports from multiple layers.

## Dependencies and generated code

Before adding or changing a package:

1. Prefer an existing project abstraction, the Flutter/Dart SDK, or a few clear
   lines of code when they meet the need.
2. Verify the package API, maintenance, license, platform support, transitive
   cost, and compatibility with the project SDK constraints.
3. Add only the smallest justified dependency change. Do not upgrade unrelated
   packages or lockfiles as incidental cleanup.

Treat generated files as outputs. Edit their source definitions, then run the
project’s established generator after changes to serialization, Freezed,
localization, database, API-client, asset, or platform-binding inputs. Do not
hand-edit generated files unless the repository explicitly treats them as
source.

## Debugging and implementation workflow

For a feature or refactor:

1. Define the user-visible outcome, supported platforms, state ownership,
   failure/recovery paths, and out-of-scope behavior.
2. Inspect the relevant existing flow and choose the smallest complete change.
3. Implement one vertical path through UI, state, data, and platform boundaries.
4. Add focused tests for changed behavior and important edge states.
5. Review the diff for accidental generated files, secrets, churn, and broken
   ownership/lifecycle boundaries.

For a bug:

1. Reproduce or precisely understand the symptom and inspect the first relevant
   error, stack trace, logs, and state transition.
2. Trace all callers and identify the root cause rather than hiding it with a
   UI-only workaround, delay, or broad catch.
3. Make the narrowest durable correction, then add a regression test when
   feasible and validate related flows.

## Testing and validation

- Unit-test business rules, mapping, repository policy, and state transitions.
- Widget-test meaningful rendering, interactions, validation, and loading,
  empty, and error states. Test behavior rather than implementation details.
- Use integration tests for critical end-to-end journeys and native boundaries;
  do not rely on arbitrary delays. Recognize that Flutter integration tests do
  not automate all native system UI, such as permission prompts.
- During iteration, run the narrowest relevant formatter, analyzer, and tests.
  Before completion, run the strongest practical repository checks, typically:

  ```sh
  dart format <changed Dart files>
  flutter analyze
  flutter test
  ```

  Also run required generation, integration tests, and Android/iOS or
  flavor-specific builds when the change affects them. Do not claim a check
  passed unless it ran successfully; report checks not run and the remaining
  risk.

## Completion report

Report the changed files and user-visible behavior, the validation actually
performed, and only material limitations or follow-up work. Keep unrelated
cleanup out of the change.
