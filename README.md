# Flutter Skills 🐦

![Flutter AI Skills social preview](assets/social-preview.png)

A curated collection of production-focused AI skills for Flutter and Dart development. These skills help an AI coding assistant make sound implementation, debugging, security, performance, and release decisions across real-world Flutter applications.

## What’s included ✨

This repository contains **29 portable `.skill` packages**. Each package is a ZIP archive containing:

- `SKILL.md` — the skill’s scope, trigger conditions, and operating guidance.
- `references/` — focused material for version-sensitive, platform-specific, or advanced work where applicable.

The skills are designed for use with AI coding tools that support the `.skill` package format. They are not Flutter packages and do not need to be added to `pubspec.yaml`.

> **Important:** Keep each `.skill` archive intact. Do not unzip or modify it before importing it into a compatible tool.

## Getting started 🚀

1. Choose a skill from the catalog below that matches your Flutter or Dart task.
2. Download its `.skill` file directly from this repository, or from a GitHub Release when releases are available.
3. Import the archive using your AI coding tool’s skill-installation workflow.
4. Work normally—the skill’s trigger description determines when it should guide the assistant.

Installation screens and terminology vary between tools. Refer to your tool’s documentation if it does not offer an import or install action for skill archives.

## Skill catalog

### Foundations and architecture

- [Dart & Flutter Equatable](skills/dart-flutter-equatable-engineering.skill) — value equality, immutable state, and reliable rebuild behavior.
- [Freezed](skills/freezed-production-engineering.skill) — immutable models, sealed unions, JSON serialization, and code generation.
- [Dart & Flutter FFI](skills/dart-flutter-ffi-systems-engineering.skill) — native integration, memory ownership, ABI safety, and platform packaging.
- [Flutter package selection](skills/flutter-package-plugin-selection.skill) — evidence-based dependency evaluation and migration decisions.
- [Flutter lints & static analysis](skills/flutter-lints-static-analysis-engineering.skill) — analyzer configuration, lint governance, and CI quality gates.
- [Flutter production build & release](skills/flutter-production-build-release.skill) — production builds, signing, packaging, stores, and release recovery.

### UI and user experience

- [Flutter animations](skills/flutter-animations-production-engineering.skill) — Material motion, transitions, accessibility, and animation performance.
- [Flutter image performance](skills/flutter-image-performance.skill) — image loading, decoding, caching, rendering, and memory use.
- [Flutter image_picker](skills/flutter-image-picker-production-engineering.skill) — photo/video acquisition, lost-data recovery, platform behavior, and media safety.
- [Flutter Skeletonizer](skills/flutter-skeletonizer-engineering.skill) — accessible, performant loading states.
- [Flutter SVG](skills/flutter-svg-engineering.skill) — rendering, theming, caching, performance, and SVG security.

### Performance and reliability

- [Flutter concurrency, memory & performance](skills/flutter-concurrency-memory-performance.skill) — isolates, async workflows, lifecycle management, and resource efficiency.
- [Flutter jank optimization](skills/flutter-performance-jank-optimization.skill) — profiling and fixing dropped frames, slow scrolling, and latency.
- [Flutter memory leaks](skills/flutter-memory-leak-engineering.skill) — lifecycle defects, leak tracking, and regression prevention.
- [Flutter production logging](skills/flutter-production-logging.skill) — structured, privacy-conscious diagnostics and error reporting.
- [Flutter Squadron concurrency](skills/flutter-squadron-concurrency-engineering.skill) — workers, worker pools, cancellation, and web workers.

### Networking, navigation, and platform capabilities

- [Flutter Dio](skills/flutter-dio-engineering.skill) — production HTTP clients, auth, retries, transfers, and observability.
- [Flutter go_router](skills/flutter-go-router-engineering.skill) — routing, deep links, redirects, nested navigation, and web URLs.
- [Flutter app links](skills/flutter-app-links-deep-link-engineering.skill) — Universal Links, Android App Links, and secure link delivery.
- [Flutter url_launcher](skills/flutter-url-launcher-engineering.skill) — safe external URI handling across platforms.
- [Flutter WebView](skills/flutter-webview-production-engineering.skill) — embedded web content, navigation policy, security, and lifecycle.
- [Flutter local notifications](skills/flutter-local-notifications-production-engineering.skill) — permissions, scheduling, time zones, interactions, and recovery.
- [Flutter permission_handler](skills/flutter-permission-handler-engineering.skill) — runtime permissions, platform configuration, and privacy-aware flows.

### Storage, dependency injection, and security 🔒

- [Flutter Hive](skills/flutter-hive-persistence-engineering.skill) — local persistence, schema changes, encryption, and recovery.
- [Flutter path_provider](skills/flutter-path-provider-production-storage.skill) — secure, durable filesystem storage and cleanup.
- [Flutter get_it & injectable](skills/flutter-get-it-injectable-dependency-injection.skill) — dependency lifetimes, scopes, startup, and testing.
- [Flutter secure storage](skills/flutter-secure-storage-security-engineering.skill) — protected credentials and platform key stores.
- [Flutter application security](skills/flutter-application-security-engineering.skill) — end-to-end application security reviews and remediation.
- [Flutter app hardening](skills/flutter-app-hardening-reverse-engineering.skill) — reverse-engineering resistance, tamper protection, and secure releases.

## Repository structure

```text
skills/*.skill                  Distributable skill archives
.github/workflows/validate.yml  Archive validation on pushes and pull requests
PUBLISHING.md                   GitHub and release checklist
```

## Quality checks ✅

The GitHub Actions workflow validates every archive on pushes to `main` and on pull requests. It verifies that each package is a readable ZIP archive and contains exactly one top-level `SKILL.md` manifest.

Before submitting changes, run the same essential check locally:

```sh
for skill in skills/*.skill; do
  unzip -t "$skill"
  unzip -Z1 "$skill" | rg '^[^/]+/SKILL\.md$'
done
```

## Contributing

Contributions are welcome once a repository license is selected. When updating a skill, preserve its package structure and keep guidance accurate, actionable, and free of credentials, private project information, or customer data.

For the publishing and release process, see [PUBLISHING.md](PUBLISHING.md).

## License

Distributed under the [MIT License](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md) for participation and reporting guidelines.
