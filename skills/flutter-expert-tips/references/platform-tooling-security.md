# Platform, Tooling, Build, Release, Security

## Platform detection

Prefer capability/design checks over platform checks when possible.

When platform branching is required:

- `kIsWeb` distinguishes web compilation;
- `defaultTargetPlatform` describes Flutter target platform semantics and can be overridden in tests/themes;
- `Platform` from `dart:io` is unavailable on web;
- conditional imports isolate platform-specific APIs cleanly.

Do not import `dart:io` into code that must compile for web unless guarded by separate conditional libraries.

## Web interop modernization

Legacy `dart:html`-based tips are **Deprecated/Legacy** for new code.

Use `package:web` and `dart:js_interop` for current browser/JS APIs. For conditional imports, current Dart guidance uses `dart.library.js_interop` rather than `dart.library.html` when targeting modern web interop/Wasm compatibility.

## Configuration vs secrets

`--dart-define`, `--dart-define-from-file`, environment files, assets, and compile-time environment getters are excellent configuration mechanisms.

They are **not** secure storage for privileged secrets in a mobile/web client.

Safe examples may include:

- API base URL;
- flavor name;
- client/public project identifier;
- feature/build toggle whose disclosure is acceptable.

Server-only examples:

- OpenAI/server API secret;
- Stripe secret key;
- Firebase Admin/service credentials;
- Supabase service-role key;
- private signing/admin secrets.

## Feature/release toggles

Compile-time toggles are useful when a feature must be removed/selected per build. Remote config is useful when product behavior must change after release.

Remote config needs defaults, fetch/activate failure handling, and safe rollout semantics. Never make startup depend indefinitely on a remote config fetch.

## Flavors

Use flavors when builds differ in bundle IDs, Firebase projects, endpoints, assets, names/icons, signing, or build-time behavior.

Keep flavor selection explicit and test each supported build. Avoid scattering flavor `if` statements throughout features; centralize configuration.

## Firebase configuration

Repository tips cover FlutterFire CLI/multiple flavors. These are highly version-sensitive. Always verify current FlutterFire docs/CLI output before copying scripts.

## API clients

For portable HTTP client code, prefer a package/client abstraction that supports the target platforms and test injection. Raw `dart:io HttpClient` is native-only and lower-level.

Set intentional timeout/retry/cancellation policies. Validate TLS using platform/client-supported trust mechanisms; do not disable certificate validation in production.

## Connectivity

A connectivity signal does not prove internet reachability or backend availability. Treat network-status packages as hints for UX, not as authorization to skip real request error handling.

## Deep/universal links

Test:

- cold start;
- warm/background app;
- authenticated/unauthenticated redirects;
- malformed/unknown links;
- web history/back behavior;
- platform association files/config.

Do not put sensitive tokens in URLs without understanding logs/history/referrers.

## Release/build tooling

Source tips include Xcode, Android Gradle, Fastlane, Codemagic, screenshot automation, App Store compliance, privacy manifests, source-map upload, self-hosted runners.

Classify all such tips **Needs verification** unless current tool/vendor documentation is checked, because build systems and store requirements change frequently.

## Generated code

- use build_runner/watch mode when appropriate;
- generated files can be marked `linguist-generated` for GitHub review readability;
- control generator ordering only using supported builder configuration;
- never manually edit generated output unless the generator explicitly expects it.

## Logging and privacy

Release logs must avoid:

- auth tokens;
- passwords;
- medical/financial/private user data;
- full request/response bodies containing sensitive fields;
- server secrets.

Debug logging should still be treated cautiously because debug artifacts can be shared.

## Force update

Remote force-update mechanisms are risky:

- cache last-known-good config;
- tolerate config outage;
- support minimum vs recommended version semantics;
- avoid accidentally locking every user out;
- test rollback before release.
