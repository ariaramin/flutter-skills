# Research findings and source audit

## Version baseline and evidence limits

Research date: **2026-10-25**. All dart.dev pages retrieved during research reported a **Dart 3.13.3** documentation baseline (banners referenced a newer Dart 3.13.7 security patch); docs.flutter.dev pages reported **Flutter 3.47** (banners referenced 3.47.8). This machine's SDK, confirmed with `flutter --version` the same day: **Flutter 3.47.6 stable / Dart 3.13.5**. That is behind the patch versions named in those banners. Official pages fetched live during research; every load-bearing claim in this skill traces to a URL below. Point breakdowns for pub points are intentionally not stated numerically — pub.dev publishes categories, not fixed weights.

Version-sensitive topics (recheck before relying on memory): `flutter.plugin.platforms` schema, SwiftPM vs CocoaPods status, Pigeon majors, pub scoring categories, workspace Flutter support, lints major versions.

## Findings that changed decisions

1. **0.x versions are semantic in Dart.** The community treats pre-1.0.0 semver "shifted down one slot": 0.1.2 → 0.2.0 is breaking, so `^0.1.2` pins `<0.2.0`. Skills that recommend "semver for 1.0+ only" are wrong for Dart. [Versioning](https://dart.dev/tools/pub/versioning)
2. **Retraction is narrow.** Within 7 days of publishing, restorable 7 more; prefer a fixed release. The package itself "lasts forever" — design accordingly. [Publishing](https://dart.dev/tools/pub/publishing)
3. **FFI packages are the recommended native-bundling path since Flutter 3.38** — plugins remain for platform-channel/API cases. [Developing packages](https://docs.flutter.dev/packages-and-plugins/developing-packages)
4. **Swift Package Manager is primary for iOS/macOS as of Flutter 3.44, and plugins must still ship CocoaPods until Flutter says otherwise.** SwiftPM-only plugins fail on unmigrated apps; CocoaPods-only plugins miss full platform points and break migrated apps. The CocoaPods registry becomes read-only on 2026-12-02. Wasm-readiness scores for web. [SwiftPM for plugin authors](https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-plugin-authors), [Scoring](https://pub.dev/help/scoring)
5. **`plugin_platform_interface` vs `base`:** the package's own README recommends considering Dart 3 `base` for new plugins; both patterns enforce extends-not-implements, which is what keeps interface method additions non-breaking. [plugin_platform_interface](https://pub.dev/packages/plugin_platform_interface), [Class modifiers for API](https://dart.dev/language/class-modifiers-for-apis)
6. **Pigeon types must not leak into public APIs, and generated Dart and host code must not be split across packages.** Same-version generation on both sides is required; a mismatch is undefined behavior, including crashes. 29.x was current on 2026-10-25 — recheck before pinning. [Pigeon](https://pub.dev/packages/pigeon)
7. **Adding a class modifier to an existing public class is a breaking change** — major bump required; adding a `sealed` subtype breaks exhaustive switches like an enum value. [Class modifiers for API](https://dart.dev/language/class-modifiers-for-apis)
8. **Documentation scoring** requires a code example plus docs on ≥20% of public API members. The pubspec guide asks for a 60–180 character description. That band is not the upload reject threshold: pub.dev's archive reader rejects a missing description, emoji, a token longer than 64 characters, length over 512, and known template boilerplate. `dart pub publish --dry-run` does not warn about a merely short description. [Scoring](https://pub.dev/help/scoring), [Pubspec](https://dart.dev/tools/pub/pubspec), [archive reader](https://github.com/dart-lang/pub-dev/blob/master/pkg/pub_package_reader/lib/pub_package_reader.dart)
9. **Automated publishing is tag-triggered only**, requires job `id-token: write`, the pub.dev Admin configuration, tag = pubspec version; first versions publish manually. [Automated publishing](https://dart.dev/tools/pub/automated-publishing)
10. **Advisory suppression is root-package-only** — a library's `ignored_advisories` never hides advisories from consuming apps; author duty is upgrading affected dependencies. [Security advisories](https://dart.dev/tools/pub/security-advisories)
11. **Pub points are computed against the core lint set.** `lints` has two official sets, and the Dart team will likely not add a stricter one. [lints](https://pub.dev/packages/lints)
12. **Plugin instances multiply with engines** — static native state corrupts multi-engine apps. [Developing packages](https://docs.flutter.dev/packages-and-plugins/developing-packages)
13. **Widget `operator ==` is a documented anti-pattern** (O(N²)); the same-instance `child` short-circuit is the sanctioned optimization. [Best practices](https://docs.flutter.dev/perf/best-practices)

## Sources examined

| Domain | Pages |
| --- | --- |
| Package layout/pubspec/deps | [Package layout](https://dart.dev/tools/pub/package-layout), [Pubspec](https://dart.dev/tools/pub/pubspec), [Dependencies](https://dart.dev/tools/pub/dependencies) |
| Publishing/scoring | [Publishing](https://dart.dev/tools/pub/publishing), [Automated publishing](https://dart.dev/tools/pub/automated-publishing), [Scoring](https://pub.dev/help/scoring), [Verified publishers](https://dart.dev/tools/pub/verified-publishers) |
| Versioning/security | [Versioning](https://dart.dev/tools/pub/versioning), [Security advisories](https://dart.dev/tools/pub/security-advisories), [Workspaces](https://dart.dev/tools/pub/workspaces) |
| Plugins/platform | [Developing packages](https://docs.flutter.dev/packages-and-plugins/developing-packages), [Platform channels](https://docs.flutter.dev/platform-integration/platform-channels), [Pigeon](https://pub.dev/packages/pigeon), [plugin_platform_interface](https://pub.dev/packages/plugin_platform_interface), [url_launcher tree](https://github.com/flutter/packages/tree/main/packages/url_launcher) |
| Testing | [Testing overview](https://docs.flutter.dev/testing/overview), [Testing plugins](https://docs.flutter.dev/testing/testing-plugins), [Plugins in tests](https://docs.flutter.dev/testing/plugins-in-tests) |
| Language/API design | [Effective Dart: Design](https://dart.dev/effective-dart/design), [Effective Dart: Documentation](https://dart.dev/effective-dart/documentation), [Class modifiers](https://dart.dev/language/class-modifiers), [Class modifiers for API](https://dart.dev/language/class-modifiers-for-apis), [Isolates](https://dart.dev/language/isolates), [lints](https://pub.dev/packages/lints) |
| Performance | [Best practices](https://docs.flutter.dev/perf/best-practices) |
| Tooling/versions | [Release notes](https://docs.flutter.dev/release/release-notes), [dart fix](https://dart.dev/tools/dart-fix), [dart create](https://dart.dev/tools/dart-create), [UIScene adoption](https://docs.flutter.dev/release/breaking-changes/uiscenedelegate), [SwiftPM for plugin authors](https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-plugin-authors) |

## Corrections from the 2026-10-25 live pass

These claims in an earlier draft of this skill did not survive a second read of the current pages:

- `flutter create --template=package` creates a **Flutter** package, not a pure Dart package. Pure Dart is `dart create -t package`.
- A description outside 60–180 characters does not, by itself, block publishing.
- "Flutter tooling does not support pub workspaces" is not current documentation. Workspace Flutter commands have had specific bugs; do not treat that as a standing unsupported state.
- "CocoaPods is merely legacy, ship SwiftPM only" contradicts the 3.44 plugin-author guide, which still requires both.
- "`lints` will never add a stricter set" overstates the package text, which says "likely not".
- `base` is an option for new platform interfaces, not a decided replacement for `plugin_platform_interface`, because it blocks test fakes.

## Maintenance guidance

Re-verify this skill against current documentation when: a new Flutter stable ships (plugin schema, SwiftPM, scoring rules move with majors), pub.dev changes scoring help pages, `lints`/`flutter_lints`/Pigeon publish breaking majors, or pub workspaces gain full Flutter tooling support. Replace claims, never accumulate; record the new research date in the frontmatter.
