# Platform Integration, Packages & Plugins

## Boundary rule [F/B-D2]

Native/platform behavior is infrastructure. Expose a typed Dart-facing capability to the rest of the app.

Examples:
```dart
abstract interface class BiometricAuthenticator {
  Future<AuthResult> authenticate();
}
```

The UI/presentation layer should not know `MethodChannel` names or Android/iOS result codes.

## Existing plugin first

Before custom native code:
1. check whether Flutter SDK or a maintained plugin already supports the capability;
2. verify supported platforms and lifecycle behavior;
3. inspect permission/setup requirements;
4. inspect error/cancellation behavior.

## Platform channels [F]

Flutter supports message passing between Dart and platform host code.

Use when:
- capability requires native APIs;
- no suitable package exists;
- app-specific integration is small.

Keep channel constants/codec details in the platform adapter.

## Pigeon [F]

Pigeon can generate typed messaging interfaces. Consider it when:
- channel API has multiple methods/types;
- type safety across Dart/native is valuable;
- plugin/platform contract is long-lived.

Code generation has maintenance/build cost; small one-off integrations may not need it.

## Plugin package [F]

Create a plugin when:
- native capability is reusable;
- app should not own native implementation directly;
- multiple platforms have implementations;
- public API/lifecycle needs isolation.

A plugin includes a Dart API plus one or more platform implementations.

## Federated plugin architecture [S]

Consider separate platform implementation packages when:
- platforms evolve independently;
- implementation ownership differs;
- third-party platform implementations are expected.

Keep a stable app-facing package/platform interface.

## FFI [F/D]

Use Dart FFI for direct native library bindings where appropriate.
Current Flutter documentation describes FFI packages as a specialized package type and recommends the modern FFI-package approach for bundled native code. Verify current toolchain/version requirements before generating scaffolding.

## Error mapping

Native error:
```text
platform code/status
→ platform adapter typed failure
→ repository/use-case decision
→ presentation state
```

Do not expose `PlatformException` throughout the app.

## Permissions

Treat permission as product state:
- not determined;
- granted;
- denied;
- permanently denied/restricted;
- unavailable.

Do not repeatedly request permission without user context.
Platform differences belong in the capability layer.

## Threading

Some platform channel handlers/native APIs require specific threads/queues.
Follow platform and Flutter channel documentation.
Do not infer thread safety.

## Plugin testing [F]

Test:
- Dart API contract;
- platform implementation;
- error mapping;
- lifecycle;
- example app/integration.

Avoid tests tightly coupled to private channel internals when a public abstraction can be tested.

## Package API design [B-D2]

For reusable packages:
- minimal exports;
- stable typed API;
- clear ownership/lifecycle;
- backwards compatibility;
- no app-specific globals;
- configurable dependencies where appropriate;
- deterministic errors/cancellation;
- example and tests.

## Platform folders

Do not edit Android/iOS build files blindly.
Inspect current Gradle/AGP/Kotlin, Xcode/SPM/CocoaPods setup before modifications.
Version-sensitive build configuration must be verified against current docs.
