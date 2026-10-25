# Plugins and platforms

Plugin architecture, platform channels, Pigeon, federated plugins, and platform validation. Strength labels per SKILL.md §1.

## Scaffolding

```sh
# Plugin (defaults: Swift iOS, Kotlin Android; -i objc / -a java for legacy)
flutter create --org com.example --template=plugin --platforms=android,ios,linux,macos,windows hello
# FFI package (native build hook + ffigen)
flutter create --template=package_ffi hello
# Add a platform to an existing plugin (run inside its directory)
flutter create --template=plugin --platforms=web .
```

## `flutter.plugin.platforms` schema (MANDATORY: the schema must validate or the plugin never registers)

```yaml
flutter:
  plugin:
    platforms:
      android:
        package: com.example.hello     # Android only
        pluginClass: HelloPlugin
      ios:
        pluginClass: HelloPlugin
      macos:
        pluginClass: HelloPlugin
      web:
        pluginClass: HelloPlugin       # web impls are always Dart
        fileName: hello_web.dart
```

- Dart-only platform implementation: replace `pluginClass` with `dartPluginClass` (class subclasses the platform interface with a static `registerWith()`); hybrid implementations may declare both.
- Shared iOS/macOS sources: `sharedDarwinSource: true` on both entries uses one `darwin/` directory (requires Flutter ≥3.7; podspec declares both `s.ios.dependency 'Flutter'` and `s.osx.dependency 'FlutterMacOS'` plus both deployment targets).

## Platform channels

Three channel kinds: `MethodChannel` (async request/response RPC), `BasicMessageChannel` (simple message passing), `EventChannel` (platform→Dart event streams). None are type-safe — the docs recommend Pigeon for anything non-trivial.

- Codecs: `StandardMessageCodec` (efficient binary; JSON-like values; used by standard channels and Pigeon), `BinaryCodec`, `StringCodec`, `JSONMessageCodec`. Supported value mapping: null/bool/int/double/String/Uint8List..Float64List/List/Map (int width splits at 32 bits; nested nulls become `NSNull` in Swift/Obj-C).
- Threading (MANDATORY behavior): channel handlers run on the platform main/UI thread; invoke from the main thread; hop explicitly when needed (`Handler(Looper.getMainLooper()).post` on Android, `DispatchQueue.main.async` on iOS). For blocking handlers, create a background queue: `binaryMessenger.makeBackgroundTaskQueue()` and pass it to the channel constructor.
- Dart background isolates must call `BackgroundIsolateBinaryMessenger.ensureInitialized(rootIsolateToken)` before using plugins.
- Channel names are global: domain-prefix them (`dev.example.pkg/methods`).
- Errors: platform returns `result.error(code, message, detail)`; Dart catches `PlatformException` — every public API that can fail maps it into its documented error contract; unknown methods return `result.notImplemented()`.
- Reverse calls (platform→Dart) are supported; web implementations use JS interop, not channels.

Source: https://docs.flutter.dev/platform-integration/platform-channels

## Pigeon (type-safe codegen)

Recheck the current major on pub.dev before pinning. 29.x was current on 2026-10-25.

- Declare APIs in a Dart file outside `lib/` (declarations only): classes, enums, `@HostApi()` (native-implemented), `@FlutterApi()` (Dart-implemented), `@EventChannelApi` for streams; `dart run pigeon` regenerates for Kotlin/Java, Swift/Obj-C, C++ (Windows), GObject (Linux).
- Types ride `StandardMessageCodec`. `@async` generates suspend/async signatures; `FlutterError`/`PigeonError` map to `PlatformException` on Dart.
- Generated channel code is an internal protocol, not a stable API. **Do not export generated types.** **Do not split generated Dart and host code across packages** — a platform interface and a platform implementation generated with different Pigeon versions is undefined behavior, including crashes. Regenerate both sides with the same Pigeon version, in the same package.
- Experimental FFI/JNI mode offers low-latency sync calls but no `TaskQueue`.

Source: https://pub.dev/packages/pigeon

## Federated plugin anatomy

Canonical first-party example (`flutter/packages` tree): `url_launcher` (app-facing) + `url_launcher_platform_interface` + `url_launcher_android`, `_ios`, `_linux`, `_macos`, `_web`, `_windows`.

Three roles:

1. **App-facing package** — the dependency users write; re-exports the public API; contains no platform code.
2. **Platform-interface package** — the contract: an abstract platform class plus method-channel-facing default implementation.
3. **Platform implementation packages** — declare `implements: <app-facing>` and per-platform `pluginClass`.

Endorsement (how apps get implementations without listing them): the app-facing package **depends on** each endorsed implementation and lists it under its own `platforms:` map:

```yaml
# url_launcher/pubspec.yaml
flutter:
  plugin:
    platforms:
      android:
        package: io.flutter.plugins.urllauncher
        pluginClass: UrlLauncher
      windows:
        default_package: url_launcher_windows
dependencies:
  url_launcher_windows: ^3.1.0
```

Non-endorsed implementations require an explicit app dependency (which also allows overriding an endorsement). An app-facing package may implement some platforms itself and federate others.

Platform-interface correctness (RECOMMENDED):

- Enforce **extends, not implements**, so adding a method to the interface is not a breaking change for implementers. Two options, with a real tradeoff: `plugin_platform_interface` (`PlatformInterface` + private token + `PlatformInterface.verify`, and `MockPlatformInterfaceMixin` so tests can fake the interface) or a Dart 3 `base` class (compile-time enforcement). The package README says authors may consider `base` for new plugins; the Flutter team has discussed deprecating the package and has **not** decided, because `base` removes that mock/fake path. Pick `base` only when you do not need external test fakes of the interface.
- Interface packages: no UI code, minimal dependencies; default implementation provided via a subclass; methods typically throw `UnimplementedError`.
- Semantic-version the interface package on the same major line as implementations that track it.

Sources: https://docs.flutter.dev/packages-and-plugins/developing-packages , https://pub.dev/packages/plugin_platform_interface

## Plugin runtime rules

- Assume multiple Flutter engines per app: each engine instantiates the plugin — keep per-engine state on the instance (never statics), reference-count shared native resources.
- iOS/macOS native dependencies, as of Flutter 3.44: Swift Package Manager is the primary strategy and on by default. Declare Swift dependencies in `ios/<plugin>/Package.swift` or `macos/<plugin>/Package.swift` (or the shared `darwin/` package). CocoaPods remains supported in maintenance mode; its registry becomes permanently read-only on **2026-12-02**.
- Support **both** SwiftPM and a podspec until Flutter withdraws that guidance. SwiftPM-only plugins are unusable by apps that have not migrated. CocoaPods-only plugins break migrated apps and do not get full iOS/macOS platform pub points.
- Privacy data goes in `PrivacyInfo.xcprivacy`. Document triggered OS permissions in the README — permission failures surface in consumers' apps, not yours.
- SCORING: iOS/macOS plugins need SwiftPM for a full platform score; web packages score higher when Wasm-ready.
- Example apps and add-to-app hosts on Flutter ≥3.41 use the UIScene lifecycle by default. A customized `AppDelegate` must adopt `FlutterImplicitEngineDelegate` and create channels, platform views, and `GeneratedPluginRegistrant` registration in `didInitializeImplicitFlutterEngine`. `window` can be nil in `didFinishLaunchingWithOptions`. Xcode 27 (iOS 27 SDK) refuses to launch UIKit apps that skip UIScene. The plugin class still uses the normal `FlutterPlugin` register path; the host's migrated delegate is what calls the registrant. https://docs.flutter.dev/release/breaking-changes/uiscenedelegate

## Platform validation workflow

- `example/` app is the harness: build once per platform before opening native IDEs (`cd example && flutter build apk --config-only`; `flutter build ios --no-codesign --config-only`; linux/macos/windows equivalents). Windows: re-run Build Solution after plugin changes or a stale binary runs.
- If the example `AppDelegate` registers channels, follow the UIScene rule in Plugin runtime rules above.

Testing strategies and native test commands: [Testing and CI](testing-and-ci.md).
