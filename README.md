# Flutter Skills 🐦

![Flutter AI Skills social preview](assets/social-preview.png)

A curated collection of production-focused AI skills for Flutter and Dart development. These skills help an AI coding assistant make sound implementation, debugging, security, performance, and release decisions across real-world Flutter applications.

## What’s included ✨

This repository contains **67 skills**. Each skill is a folder:

- `SKILL.md` — the skill’s scope, trigger conditions, and operating guidance.
- `references/` — focused material for version-sensitive, platform-specific, or advanced work where applicable.

Copy a skill folder into your AI coding tool’s skills directory. These are not Flutter packages and do not belong in `pubspec.yaml`.

## Getting started 🚀

1. Choose a skill from the catalog below that matches your Flutter or Dart task.
2. Copy its folder — the directory that contains `SKILL.md` — into your tool’s skills location.
3. Work normally. The skill’s trigger description determines when it should guide the assistant.

Installation screens and terminology vary between tools. Refer to your tool’s documentation for where project or personal skills live.

### Flutter motion engineering

Download [Flutter motion engineering](skills/flutter-motion-engineering/SKILL.md) for source-backed guidance on Apple-quality motion, interruptible springs, gesture velocity, platform navigation, reduced motion, and rendering performance.

The package includes a core `SKILL.md`, three detailed reference guides, four Dart example files, and six regression tests under `references/examples/`. The examples passed formatting, analysis, and tests on Flutter 3.47.0 / Dart 3.13.0; application performance still requires profiling on target devices.

Use this skill for framework-level motion engineering. The separate [Flutter animations](skills/flutter-animations-production-engineering/SKILL.md) skill focuses on the Material `animations` package.

## Skill catalog

### Foundations and architecture

- [Dart args](skills/dart-args-production-cli/SKILL.md) — production command-line interfaces, subcommands, flags, and executable tooling.
- [Dart & Flutter Equatable](skills/dart-flutter-equatable-engineering/SKILL.md) — value equality, immutable state, and reliable rebuild behavior.
- [Freezed](skills/freezed-production-engineering/SKILL.md) — immutable models, sealed unions, JSON serialization, and code generation.
- [Dart & Flutter FFI](skills/dart-flutter-ffi-systems-engineering/SKILL.md) — native integration, memory ownership, ABI safety, and platform packaging.
- [Dart meta](skills/dart-meta/SKILL.md) — effective annotations, API contracts, immutability, and analyzer-guided modernization.
- [Senior Flutter architecture](skills/senior-flutter-architecture/SKILL.md) — production Flutter/Dart architecture with explicit trade-offs.
- [Design patterns](skills/shvets-design-patterns/SKILL.md) — apply 22 classic object-oriented patterns using source-backed decisions, examples, and trade-offs.
- [Senior mobile architecture](skills/senior-mobile-architecture/SKILL.md) — architecture reviews and refactoring across iOS, Android, and cross-platform apps.
- [Flutter production engineering](skills/flutter-production-engineering/SKILL.md) — production-grade Flutter and Dart engineering guidance for architecture, performance, scalability, cross-platform behavior, testing, profiling, and maintainability.
- [Flutter multi-environment](skills/flutter-multi-environment/SKILL.md) — development/staging/production flavors, configuration, and delivery pipelines.
- [Flutter package selection](skills/flutter-package-plugin-selection/SKILL.md) — evidence-based dependency evaluation and migration decisions.
- [Flutter lints & static analysis](skills/flutter-lints-static-analysis-engineering/SKILL.md) — analyzer configuration, lint governance, and CI quality gates.
- [Flutter production build & release](skills/flutter-production-build-release/SKILL.md) — production builds, signing, packaging, stores, and release recovery.
- [Flutter Firebase Core](skills/flutter-firebase-core-engineering/SKILL.md) — Firebase bootstrap, generated configuration, environments, and app-instance lifecycle.
- [Flutter mobile development](skills/flutter-mobile-development/SKILL.md) — practical Flutter delivery across app structure, UI, state, platform, testing, and release work.

### UI and user experience

- [Figma to Flutter](skills/figma-to-flutter-expert/SKILL.md) — pixel-accurate, high-performance Flutter conversion of Figma designs, Auto Layout, tokens, and responsive multi-platform UI.
- [HTML to Flutter](skills/html-to-flutter/SKILL.md) — production Flutter ports of HTML/CSS/JavaScript interfaces.
- [React to Flutter](skills/react-to-flutter/SKILL.md) — idiomatic, behavior-preserving React web migrations to Flutter.
- [Flutter animations](skills/flutter-animations-production-engineering/SKILL.md) — Material motion, transitions, accessibility, and animation performance.
- [Flutter motion engineering](skills/flutter-motion-engineering/SKILL.md) — Apple-quality interaction principles, interruptible springs, platform transitions, rendering diagnostics, accessibility, and tested Dart examples.
- [Rive Flutter](skills/rive-flutter/SKILL.md) — modern C++ runtime integration, state machines, inputs, layout, lifecycle management, and multi-platform rendering performance with `rive`.
- [Lottie for Flutter](skills/lottie-flutter/SKILL.md) — pure Dart vector animations, composition caching, frame rate throttling, dynamic delegates, marker playback, and list performance with `lottie`.
- [Flutter Confetti](skills/flutter-confetti-engineering/SKILL.md) — lifecycle-safe, accessible celebration effects and particle performance tuning.
- [Flutter native splash](skills/flutter-native-splash-engineering/SKILL.md) — Android, iOS, and Web launch resources, transitions, flavors, and startup behavior.
- [Flutter image performance](skills/flutter-image-performance/SKILL.md) — image loading, decoding, caching, rendering, and memory use.
- [Flutter image_picker](skills/flutter-image-picker-production-engineering/SKILL.md) — photo/video acquisition, lost-data recovery, platform behavior, and media safety.
- [document_scan for Flutter](skills/document-scan-flutter/SKILL.md) — headless document detection, perspective correction, live camera frames, and scan testing on Android and iOS.
- [Flutter pro_image_editor](skills/flutter-pro-image-editor-engineering/SKILL.md) — production image editing, state persistence, export, privacy, and large-image performance.
- [Flutter video_player](skills/flutter-video-player-production-engineering/SKILL.md) — cross-platform playback, controller lifecycle, streaming delivery, codecs, and decoder performance.
- [Flutter CamerAwesome](skills/camerawesome-flutter/SKILL.md) — production camera preview, capture modes, ML Kit image analysis, orientation controls, and CameraX/AVFoundation performance.
- [Flutter Skeletonizer](skills/flutter-skeletonizer-engineering/SKILL.md) — accessible, performant loading states.
- [Flutter SVG](skills/flutter-svg-engineering/SKILL.md) — rendering, theming, caching, performance, and SVG security.
- [Flutter Pinput](skills/flutter-pinput/SKILL.md) — production-grade PIN, OTP, and SMS verification fields with iOS/Android autofill, custom cursors, animations, and accessible theming.
- [Persian number utility](skills/persian-number-utility/SKILL.md) — Persian/Arabic digit normalization, number-to-words, Jalali dates, currency, and Iranian identifier validation.
- [Flutter design system from design.md](skills/flutter-design-system-from-design-md/SKILL.md) — converting a `design.md` spec into Flutter theme tokens, components, states, and validation checks.

### Performance and reliability

- [Flutter expert tips](skills/flutter-expert-tips/SKILL.md) — practical Flutter/Dart implementation, debugging, refactoring, and modernization guidance.
- [Flutter Firebase Analytics](skills/flutter-firebase-analytics/SKILL.md) — product-event schemas, consent, identity, screen and ecommerce measurement, DebugView, and reporting quality.
- [Flutter Sentry](skills/flutter-sentry-engineering/SKILL.md) — crash reporting, tracing, symbolication, privacy, and production observability.
- [Flutter concurrency, memory & performance](skills/flutter-concurrency-memory-performance/SKILL.md) — isolates, async workflows, lifecycle management, and resource efficiency.
- [Flutter caching](skills/flutter-caching-engineering/SKILL.md) — cache policy, invalidation, offline data, HTTP freshness, and resource bounds.
- [Mobile API caching](skills/mobile-api-caching/SKILL.md) — cross-platform cache strategy, HTTP semantics, offline synchronization, account isolation, and production validation for iOS, Android, Flutter, React Native, and Kotlin Multiplatform.
- [Mobile app shrinking & release optimization](skills/mobile-app-shrinking-and-release-optimization/SKILL.md) — R8 keep rules, resource and dependency reduction, native symbol handling, app thinning, tree shaking, and release validation across Android, iOS, Flutter, React Native, and Kotlin Multiplatform.
- [Flutter jank optimization](skills/flutter-performance-jank-optimization/SKILL.md) — profiling and fixing dropped frames, slow scrolling, and latency.
- [Flutter UI performance](skills/flutter-ui-performance-engineering/SKILL.md) — frame-budget analysis, rebuild/layout/paint/raster optimization, and production profiling.
- [Flutter memory leaks](skills/flutter-memory-leak-engineering/SKILL.md) — lifecycle defects, leak tracking, and regression prevention.
- [Flutter production logging](skills/flutter-production-logging/SKILL.md) — structured, privacy-conscious diagnostics and error reporting.
- [Flutter Squadron concurrency](skills/flutter-squadron-concurrency-engineering/SKILL.md) — workers, worker pools, cancellation, and web workers.

### Networking, navigation, and platform capabilities

- [Flutter Firebase Messaging](skills/flutter-firebase-messaging/SKILL.md) — reliable, secure FCM delivery across Android, iOS, macOS, and Web.
- [Flutter Dio](skills/flutter-dio-engineering/SKILL.md) — production HTTP clients, auth, retries, transfers, and observability.
- [Flutter Dio cache interceptor](skills/flutter-dio-cache-interceptor-engineering/SKILL.md) — source-grounded HTTP caching, revalidation, store selection, offline fallback, key isolation, and invalidation with `dio_cache_interceptor`.
- [Flutter go_router](skills/flutter-go-router-engineering/SKILL.md) — routing, deep links, redirects, nested navigation, and web URLs.
- [Flutter app links](skills/flutter-app-links-deep-link-engineering/SKILL.md) — Universal Links, Android App Links, and secure link delivery.
- [Flutter url_launcher](skills/flutter-url-launcher-engineering/SKILL.md) — safe external URI handling across platforms.
- [Flutter share_plus](skills/flutter-share-plus-engineering/SKILL.md) — cross-platform text, URI, file, and generated-content sharing.
- [Flutter WebView](skills/flutter-webview-production-engineering/SKILL.md) — embedded web content, navigation policy, security, and lifecycle.
- [Flutter local notifications](skills/flutter-local-notifications-production-engineering/SKILL.md) — permissions, scheduling, time zones, interactions, and recovery.
- [Flutter permission_handler](skills/flutter-permission-handler-engineering/SKILL.md) — runtime permissions, platform configuration, and privacy-aware flows.

### Storage, dependency injection, and security 🔒

- [Flutter Supabase](skills/flutter-supabase-engineering/SKILL.md) — Auth, RLS, database access, Realtime, Storage, Edge Functions, and production security.
- [Flutter Drift](skills/flutter-drift-persistence-engineering/SKILL.md) — relational persistence, reactive queries, migrations, concurrency, and cross-platform SQLite performance.
- [Flutter Hive](skills/flutter-hive-persistence-engineering/SKILL.md) — local persistence, schema changes, encryption, and recovery.
- [hydrated_bloc](skills/hydrated-bloc/SKILL.md) — production Bloc/Cubit state persistence, keys, schema evolution, security, and testing.
- [Flutter path_provider](skills/flutter-path-provider-production-storage/SKILL.md) — secure, durable filesystem storage and cleanup.
- [Flutter get_it & injectable](skills/flutter-get-it-injectable-dependency-injection/SKILL.md) — dependency lifetimes, scopes, startup, and testing.
- [Flutter secure storage](skills/flutter-secure-storage-security-engineering/SKILL.md) — protected credentials and platform key stores.
- [Flutter application security](skills/flutter-application-security-engineering/SKILL.md) — end-to-end application security reviews and remediation.
- [Flutter app hardening](skills/flutter-app-hardening-reverse-engineering/SKILL.md) — reverse-engineering resistance, tamper protection, and secure releases.

### Testing and delivery

- [Test before deploy](skills/test-before-deploy/SKILL.md) — select and review release-ready test coverage using the “34 Test Before Deploy” taxonomy.

## Repository structure

```text
skills/<name>/SKILL.md          Skill manifest
skills/<name>/references/       Optional supporting material
.github/workflows/validate.yml  Manifest validation on pushes and pull requests
PUBLISHING.md                   GitHub and release checklist
```

## Quality checks ✅

The GitHub Actions workflow validates every skill folder on pushes to `main` and on pull requests. It verifies that each directory contains a `SKILL.md` manifest.

Before submitting changes, run the same essential check locally:

```sh
for manifest in skills/*/SKILL.md; do
  test -f "$manifest"
done
```

## Contributing

Contributions are welcome once a repository license is selected. When updating a skill, preserve its package structure and keep guidance accurate, actionable, and free of credentials, private project information, or customer data.

For the publishing and release process, see [PUBLISHING.md](PUBLISHING.md).

## License

Distributed under the [MIT License](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md) for participation and reporting guidelines.

## Personal skills landing page

This repository also includes a dependency-free portfolio page in `index.html`, `styles.css`, and `script.js`.

### Run locally

Open `index.html` directly, or serve the repository root with any static server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

### Customize it

- Replace the placeholder name, copy, links, and email in `index.html`.
- Edit the centralized `skills` array at the top of `script.js` to add, remove, or rename skills.
- Update the `categories` array in the same file when you need different overview groups.
- Change the color tokens at the top of `styles.css` to retheme the page.
- Replace the placeholder GitHub, LinkedIn, and email URLs in `index.html`, including the contribution CTA.
- Select catalog cards to generate copyable download commands for the chosen skill folders; update `repository` in `script.js` if the repository moves.
- The command drawer also provides `wget`, `npx degit`, and Git sparse-checkout variants. `npx degit` downloads the complete `skills/` folder; the other variants download the selected skill folders.

### Deploy to GitHub Pages

Push the repository to GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save. GitHub Pages will serve `index.html` as the site entry point.
