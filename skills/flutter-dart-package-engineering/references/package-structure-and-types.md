# Package structure and types

Evidence-based rules for choosing a package type, structuring it, and writing a valid pubspec. Strength labels per SKILL.md §1. Sources at the end of each section.

## Package type decision detail

Extends the SKILL.md §3 table with the decision rationale:

- **Pure Dart package** — the default. Reachable from every platform including web and Dart standalone; no native build complexity; widest audience, simplest CI. RECOMMENDED as first choice.
- **Flutter (Dart) package** — depends on the Flutter framework (widgets, schedulers) but contains no native code. Runs everywhere Flutter runs; still one codebase. Requires `flutter` in `environment` (only the lower bound is enforced).
- **Plugin** — needed only when calling platform APIs through platform channels that a pure Dart API cannot express. Each platform's implementation lives in its native directory; the Dart API is the contract.
- **FFI package** (`--template=package_ffi`) — bundles and compiles native C code through a build hook with bindings generated via ffigen; works in Dart standalone. RECOMMENDED over plugins for bundling native code since Flutter 3.38 — unless the Flutter Plugin API or Google Play services on Android is required, then use `--template=plugin`.
- **Federated plugin** — split into app-facing package + platform-interface package + per-platform implementation packages when: multiple vendors should provide implementations, platforms need independent release cadences, or third parties must extend platform coverage without forking. Otherwise a direct plugin is simpler. Endorsement mechanics: [Plugins and platforms](plugins-and-platforms.md).

Source: https://docs.flutter.dev/packages-and-plugins/developing-packages

## Directory layout conventions

| Path | Role | Strength |
| --- | --- | --- |
| `pubspec.yaml` | Defines the package | MANDATORY |
| `LICENSE` | Publish requirement; BSD-3-Clause recommended | MANDATORY for publish |
| `README.md` | Shown on pub.dev landing page | RECOMMENDED + SCORING |
| `CHANGELOG.md` | One section per version; all level-1 or all level-2 headings; version optionally prefixed `v`; shown in pub.dev Changelog tab | RECOMMENDED + SCORING |
| `lib/<package>.dart` | Main public library, named after the package | RECOMMENDED (default import path) |
| `lib/**` outside `src/` | Public API surface — every file here is published API | CONVENTION (structural rule) |
| `lib/src/**` | Private implementation; consumers must never import it | RECOMMENDED ("never import from another package's lib/src") |
| `lib/fix_data.yaml` | Data-driven fixes for `dart fix` | OPTIONAL (deprecation tooling) |
| `bin/` | Public CLI executables (`dart run`, `dart pub global activate`) | CONDITIONAL (CLI packages) |
| `tool/` | Internal scripts not shipped conceptually to users | OPTIONAL |
| `test/` | Tests, conventionally `*_test.dart` | RECOMMENDED |
| `integration_test/` | Integration tests; `dart test` skips them by default — run explicitly | CONDITIONAL (Flutter) |
| `test_fixes/` | `.expect` golden files verified via `dart fix --compare-to-golden` | OPTIONAL |
| `benchmark/` | Speed/memory benchmarks — the official home for benchmarks | OPTIONAL |
| `example/` | Standalone example app/package; recognized entry names for the pub.dev Example tab: `example[.md]`, `example[/lib]/main.dart`, `example[/lib]/<package_name>.dart`, `example[/lib]/<package_name>_example.dart`, `example[/lib]/example.dart`, `example/README[.md]` (first found wins) | RECOMMENDED + SCORING |
| `doc/` | Authored docs; generated `doc/api/` must not be committed | OPTIONAL |
| `.dart_tool/` | Generated cache; never commit | MANDATORY hygiene |
| `pubspec.lock` | Commit only for application packages, not libraries | RECOMMENDED |

Import rules: use `package:` imports when reaching into or out of `lib/` (lint `avoid_relative_lib_imports`); prefer relative imports elsewhere. Entrypoints with `main()` do not belong in `lib/`. Web tree-shaking rationale: keep implementation in `lib/src` so `dart:mirrors`-style dynamic access patterns cannot defeat dead-code elimination.

Source: https://dart.dev/tools/pub/package-layout

## Pubspec field rules

Publish-blocking (MANDATORY for hosted packages):

- `name`: lowercase, `[a-z0-9_]`, underscores between words, valid Dart identifier (no leading digit, no reserved word).
- `version`: three dot-separated integers; prerelease suffixes (`-alpha.12`, `-beta.7`, `-rc.5`, `-dev.4`) and build suffixes (`+1`, `+hotfix.x`) allowed; omission means implicit `0.0.0`.
- `description`: plain text, English. **Publish rejects** a missing or empty description, emoji, a whitespace-separated token longer than 64 characters, length over 512 characters, and known template boilerplate (for example the `dart create` default sentence). Those checks live in pub.dev's archive reader; `dart pub publish --dry-run` does not warn about a merely short description. **60–180 characters** is the pubspec guide's quality target, not the upload reject band.
- `environment`: required since Dart 2; `sdk:` constraint (e.g. `^3.0.0`); `flutter:` constraint (e.g. `">=3.22.0"`) enforces only its lower bound.
- Publishing rejects git and path dependencies; only hosted deps and SDK deps (`sdk: flutter`) are publishable.

Scoring/quality (RECOMMENDED/SCORING):

- `repository` (and/or `homepage`): pub.dev links them; `issue_tracker` defaults to GitHub `/issues` when absent.
- `topics`: up to 5, 2–32 chars, lowercase alphanumeric/hyphen, no consecutive hyphens — improves discoverability.
- `platforms`: overrides pub.dev's platform detection computed from the transitive import graph (Dart 2.16+).
- `screenshots`: up to 10 images, ≤4 MB each, description ≤160 chars; first becomes the thumbnail.
- `publish_to: none` for packages never intended for pub.dev (monorepo internals).
- `false_secrets`: allowlist patterns for the secret-leak check; `ignored_advisories`: advisory IDs to suppress (root-package effect only — [Publishing and maintenance](publishing-and-maintenance.md)).
- Unknown fields are ignored; keep custom fields uniquely named.

Source: https://dart.dev/tools/pub/pubspec

## Dependency constraints

- Goal (RECOMMENDED, from the official docs): "You want to allow the widest range of versions possible" — exclusions limited to versions that don't work or weren't tested. Wide ranges reduce version-solver conflicts for every consumer.
- Caret is the recommended form: `^1.3.0` = `>=1.3.0 <2.0.0`; `^0.1.2` = `>=0.1.2 <0.2.0` (pre-1.0 carets stop at the next minor because minors carry breaking changes below 1.0.0).
- Exact pins (`1.2.3`) "limit adoption" of your package — avoid in published packages. Quote YAML constraints containing `>` (e.g. `">=1.2.3 <2.0.0"`).
- A dependency imported from `lib/` or `bin/` must be a regular dependency; only `test/`/`example/` imports belong in `dev_dependencies` (dev deps of dependencies are ignored downstream).
- Packages that **re-export types from a dependency** should hold tighter bounds on it (e.g. `>=2.4.0 <2.5.0`) so consumers' transitive resolution matches the types they see.
- `dependency_overrides`: temporary, root-package-only, single override per package in a workspace; risk documented — never ship overrides in a published package.
- Before publishing after constraint changes, verify the lower bound: `dart pub downgrade && dart analyze && dart test`.

Sources: https://dart.dev/tools/pub/dependencies , https://dart.dev/tools/pub/versioning

## Monorepos and workspaces

- **Pub workspaces** (SDK ≥3.6.0): root pubspec lists `workspace: [pkg_a, pkg_b]` (globs allowed); member pubspecs set `resolution: workspace` and an SDK constraint of at least `^3.6.0`. Members resolve each other locally as path deps while keeping normal version constraints, share one `pubspec.lock` and `.dart_tool`. No nested workspaces. `dart pub get` from anywhere in the repo resolves the workspace. Run per-member pub commands with `dart pub -C <dir>` (including `publish`).
- Flutter: run `flutter` commands from the member directory. Do not treat workspaces as unsupported. flutter_tools has had workspace regressions (wasm tests, mixed Dart/Flutter coverage on 3.41 before the 3.41.1 hotfix, package_config lookup). If resolution fails, recheck the current Flutter release rather than splitting the repo.
- `melos` (third-party) predates workspaces and adds scripting/test-broker features — CONVENTION, not required; prefer pub workspaces for new monorepos unless tooling needs dictate otherwise.
- Federated plugin families in one repo are the canonical workspace use case (see flutter/packages `url_launcher` tree: `url_launcher`, `url_launcher_platform_interface`, `url_launcher_android/ios/linux/macos/web/windows`).

Source: https://dart.dev/tools/pub/workspaces
