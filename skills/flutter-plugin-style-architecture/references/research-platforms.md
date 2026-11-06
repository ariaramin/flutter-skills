# Cross-platform research for Flutter Plugin-Style Architecture

Research date: **2026-11-05**. Scope: reusable **application feature composition**, with Flutter/native/browser integration kept at a separate boundary. This is a research reference, not a `SKILL.md` or an implemented plugin framework.

## Evidence and reading guide

- **Fact** means a statement found in a cited first-party document or source implementation. It describes that document's snapshot, not every released SDK or plugin version.
- **Recommendation** means architecture guidance inferred from those facts. Proposed application contracts, capability states, composition roots, and feature lifecycles are **application-owned concepts**, not official Flutter plugin APIs.
- All evidence below comes from Flutter/Dart, Android, Apple, Microsoft, GTK, Flatpak/xdg-desktop-portal, or W3C sources. The source inventory gives titles, URLs, and the relevant insight for every citation.
- Read sections 1–3 for discovery, registration, and support claims; 4–6 for contracts, errors, and concurrency; 7–8 for platform constraints; 9 for verification criteria.

### Version and provenance cautions

**Fact:** The retrieved Flutter support matrix identifies itself as applying to Flutter **3.47**. Its website source was also checked at commit `5d0760a1c2b1bd731c0c89662b850e5aa841400d` (2026-09-22). Flutter tool registration code was retrieved under the `3.47.8` tag. These are identifiable documentation/source snapshots, not proof of which SDK is installed in a consuming project. [F02] [F15]

**Fact:** The SDK archive gives a release schedule with a November 2026 target for Flutter **3.50**. A scheduled target is not a completed release record. The fetched archive did not expose its dynamically populated release rows, and attempts to retrieve the Google Storage release manifests failed. Consequently, this report does **not** independently establish the latest stable Flutter/Dart release. [F16]

**Fact:** Live documentation contains references to Flutter **3.50** web behavior and Dart **3.14** interop flags. These are not used here as verified, generally available capabilities. API-site banners mentioning Flutter `3.47.8` or Dart `3.13.7` are documentation context, not independently verified release availability. [F26] [D03] [D05]

**Recommendation:** Resolve version-sensitive decisions against the project's selected SDK, dependency lockfile, release notes, generated runners, and actual build targets. Recheck deployment minimums, SPM/CocoaPods integration, Pigeon generators, web JS/Wasm compatibility, and native SDK requirements before turning this research into implementation instructions.

## 1. Distinguish feature plugins from Flutter platform plugins

| Concept | Source fact or application recommendation | Architectural consequence |
| --- | --- | --- |
| Flutter platform plugin | **Fact:** A specialized Dart package exposes an API with one or more platform-specific implementations; implementations can be native, Dart-only, or hybrid. [F01] | It is a platform integration/distribution mechanism, not automatically an application feature boundary. |
| Federated Flutter plugin | **Fact:** Federation separates the app-facing API, platform interface, and independent platform implementations. Package-separated federation places them in separate packages. [F01] | Platform implementation ownership can vary independently of feature ownership. |
| Application feature plugin | **Recommendation:** An app-owned module contributes cohesive product behavior through explicit contracts, dependencies, and lifecycle ownership. | It can be pure Dart/Flutter, and can consume several platform capabilities without itself being a native Flutter plugin. |
| Application composition root | **Recommendation:** A known entry point constructs capabilities and feature modules, resolves dependencies, and exposes enabled contributions. | It owns application composition; Flutter's generated registrant owns a different integration concern. |
| FFI package/native library | **Fact:** FFI packages call native code using `dart:ffi`; current Flutter docs recommend `package_ffi` with build hooks for bundling native code since Flutter 3.38. [F01] | Native linking/loading is distinct from feature discovery and feature activation. |

**Fact:** Endorsing a federated implementation requires an app-facing package dependency plus the platform's `default_package`; implementations identify their app-facing package with `implements`. A non-endorsed implementation must be added as a dependency by the app. Web implementations use Dart `pluginClass`/`fileName`; non-web Dart implementations use `dartPluginClass` and a startup `registerWith()` method. Hybrid implementations use both registration systems. [F01]

**Recommendation:** Use federation when independently maintained platform implementations justify it. For application modules, choose contracts and package boundaries from product responsibility and ownership rather than reproducing federation's package structure. Flutter's architecture recommendations explicitly allow adaptation to an application's requirements. [F28]

## 2. Discovery, registration, activation, and loading

### 2.1 What Flutter actually discovers and registers

**Fact:** In the checked Flutter tool source, `findPlugins` loads resolved package configuration, walks the project's transitive dependencies, and reads package `pubspec.yaml` entries under `flutter.plugin`. Platform resolution selects implementations, and generation writes platform registrants and build metadata. Web injection is explicitly build-time. This is **dependency-based tool discovery**, not runtime scanning of arbitrary downloaded application modules. [F02]

**Fact:** The generated templates explicitly import/include known plugin classes and call their registration functions. Android adds instances to `flutterEngine.getPlugins()`; Darwin, Windows, Linux, and web use their respective registrars. The CMake template links known plugin targets and collects bundled libraries. FFI-only plugins are filtered out of native method-channel registrants because their binaries need bundling rather than that registration path. [F02]

**Fact:** Android's embedding also permits adding/removing an existing `FlutterPlugin` instance through the engine registry. Adding invokes `onAttachedToEngine`; removal or engine destruction invokes `onDetachedFromEngine`. The engine binding becomes invalid after detach. This API does not itself discover or download code. [F03]

**Recommendation:** Keep two explicit paths:

1. **Platform integration:** package resolution → platform build/linking → generated/native registration → engine-bound adapter.
2. **Application composition:** explicit feature factories or an app-owned generated list → dependency resolution → feature activation → contribution registration → app-owned cleanup.

A generated application feature list is acceptable if its generator operates on known build inputs and produces inspectable code. Describe that as an **application convention**, not as an extension point supplied by Flutter's native registrant. Define stable feature identifiers, dependency ordering, duplicate/cycle checks, and startup-failure behavior at this boundary.

### 2.2 What deferred loading and native loading mean

**Fact:** Dart deferred imports name libraries statically and expose `loadLibrary()`. Shared API types needed before loading belong in a non-deferred library. Dart CLI deferred loading is documented for web; Flutter has platform-specific support. [D04]

**Fact:** Flutter's Android deferred components are built with the whole application bundle. The documentation explicitly rules out independently shipping a changed partial app component without rebuilding the application. Debug behavior differs from profile/release behavior. Web deferred loading produces separate JavaScript output. [F05]

**Fact:** `DynamicLibrary.open(path)` opens a **native library file** and exposes its symbols. Opening the same path repeatedly, including across isolates, loads that library into the Dart VM process once. It does not load a Dart feature-module contract. [D05]

**Recommendation:** Use precise labels:

| Mechanism | What to promise |
| --- | --- |
| Static feature composition | Known factories and contracts compiled with the application. |
| Runtime enablement | Policy/capability selection among already available feature implementations. |
| Deferred loading | Delayed loading of statically declared, prebuilt code, only on verified targets/toolchains. |
| Native library loading | Platform-specific binary/ABI integration with its own deployment and lifecycle constraints. |
| Arbitrary downloaded feature extensions | A separate distribution/security/compatibility design requiring platform-specific evidence; not established by the mechanisms above. |

Runtime disablement is not evidence that code or native resources are absent from the shipped artifact. Disposing a feature is not evidence that its native library has been unloaded. If artifact exclusion is a requirement, verify a build-time variant and its output instead of relying on a feature flag. [F02] [F05] [D05]

### 2.3 Lifetimes are not interchangeable

**Fact:** Flutter's plugin-development guide says all Flutter platforms allow multiple engines; each engine creates instances of registered plugins with independent lifetimes. Engine-specific state belongs on instances, and shared native singleton resources require coordination across instances. [F01]

**Fact:** An Android engine may never have an `Activity`. `ActivityAware` handles attachment, configuration-change detach/reattach, and final detach. Activity bindings/references must be cleared and listeners deregistered when detached. [F03] [F04]

**Recommendation:** Separately document the owners of feature state, adapter subscriptions, native plugin instances, engine resources, and activity/window/scene handles. A feature deactivation should stop its owned work and contributions; a shared adapter should remain alive while other consumers need it. Engine attachment does not establish a valid foreground UI owner or authorized hardware access.

## 3. Verify platform support at multiple levels

### 3.1 Framework support matrix: documentary snapshot, not device validation

**Fact:** Flutter distinguishes **supported**, **CI-tested**, and **unsupported** combinations. CI coverage is not identical to the supported range. The following table transcribes the retrieved matrix; no SDK/device execution was performed to validate these combinations. In particular, upper OS-version entries are the matrix's claims, not independently confirmed OS-release or compatibility claims. [F15]

| Target | Architectures/output listed | Supported versions listed in the retrieved matrix | Qualification |
| --- | --- | --- | --- |
| Android | x64, Arm32, Arm64 | API 24–37 | CI-tested range is 24–36; individual plugins can raise requirements. |
| iOS | Arm64 | 15–27 | **Conflict:** the retrieved iOS deployment guide still says 13+. [F22] |
| Windows | x64, Arm64 | Windows 10, 11 | Matrix lists Windows 10 as CI-tested; verify each dependency's architecture binaries. |
| macOS | x64, Arm64 | macOS 12–27 | Matrix warns of Intel/x64 deprecation; verify the selected release's policy. |
| Debian Linux | x64, Arm64 | Debian 10–13 | Framework support does not verify a plugin's system-library or packaging dependencies. |
| Ubuntu Linux | x64, Arm64 | Ubuntu 20.04–24.04 LTS | Do not convert this LTS range into a promise for all Linux distributions. |
| Chrome, Edge | JavaScript, WebAssembly | Latest two releases | A moving browser window, not a fixed browser-version promise. |
| Firefox | JavaScript | Latest two releases | This matrix does not list Firefox as a Wasm target. |
| Safari | JavaScript | 15.6+ | This matrix does not list Safari as a Wasm target. |

**Unresolved fact:** The support matrix says iOS 14 and earlier are unsupported while the deployment guide says Flutter supports iOS 13 and later. This report preserves the inconsistency rather than silently selecting a universal minimum. [F15] [F22]

**Recommendation:** Check the chosen Flutter release's support history, runner deployment target, plugin minimums, and native API availability. Resolve the iOS discrepancy before changing an app's deployment target. Treat the effective minimum as a verified combination of framework/toolchain support and application/dependency requirements.

### 3.2 A platform badge is not a per-operation guarantee

**Fact:** The first-party `file_selector` README provides an explicit counterexample. Its platform support row lists all six Flutter targets, but its feature table differs by operation. At the checked source commit `f2c6798b45a7ae936feb6798fe45cb51f832dc18` (2026-10-19): [F27]

| `file_selector` operation | Documented supported targets |
| --- | --- |
| Choose one or multiple files | Android, iOS, Linux, macOS, Windows, web |
| Choose a save location | Linux, macOS, Windows |
| Choose a directory | Android, Linux, macOS, Windows |

**Fact:** The same README documents platform-specific file-type filters, potential `ArgumentError`s for incompatible filters, cancellation through nullable results, and macOS user-selected-file entitlements. Its Linux/web “Any” support labels do not independently validate every browser, distribution, sandbox, or operation. This is a source-snapshot example, not verification of a particular published package installed in an app. [F27]

**Recommendation:** For each capability operation, collect four distinct kinds of evidence:

1. **Declared support:** resolved app-facing and implementation packages, `flutter.plugin.platforms`, endorsement/override selection, and SDK/native minimums. [F01]
2. **Built support:** the intended implementation appears in the generated registration/build output; all required native libraries/resources ship for the target architecture. [F02] [F18] [F20]
3. **Runtime availability:** hardware/service/API exists, current authorization allows the operation, and required activity/window/scene context is present. [F04] [A01] [AP03] [W04]
4. **Product policy:** the feature is enabled for this build/user/session, and the product's approved behavior is meaningful on that target. Flutter distinguishes capability (“can”) from policy (“should”). [F10]

Record unknown or untested combinations explicitly. Framework support, plugin registration, permission grant, hardware presence, and product enablement are different propositions.

## 4. Platform selection versus capability detection

**Fact:** Dart conditional imports/exports select implementations using compile-time library availability, for example `dart.library.io` and `dart.library.js_interop`. The alternatives must implement the same API. A documented stub can throw `UnsupportedError`. These conditions do not report hardware, permission, or current OS service state. [D01]

**Fact:** `kIsWeb` is a compile-time indicator based on `dart.library.js_interop`. `defaultTargetPlatform` is intended for platform adaptation/styling, can be overridden, defaults to Android in tests, and on web describes the browser's host platform. A web app styled for macOS is still a browser app. [F11] [F12]

**Fact:** Flutter's web FAQ says `Platform.isXYZ` throws `UnsupportedError` on web and browser apps cannot use `dart:io` filesystem/socket APIs. It distinguishes technically importing a library from having usable browser implementations; do not translate this into a blanket claim that every `dart:io` import necessarily fails compilation. [F25]

**Recommendation:** Select the compilation-compatible adapter through conditional imports or separate entry points, then perform OS/API-version selection inside the native adapter when necessary. Expose meaningful capability operations to features rather than scattering `Platform.isX`, `kIsWeb`, or presentation-platform branches across business logic.

**Recommendation:** Model implementation support separately from current availability and authorization. Suggested application vocabulary might include “unsupported operation,” “available,” “authorization required/denied,” “temporarily unavailable,” and “missing foreground owner”; these names are not Flutter APIs. Retain platform-specific distinctions such as restricted or permanently denied only where evidence supports them. A passive capability probe should not trigger permission dialogs; authorization requests should be explicit user-facing actions. Recheck changeable state at operation time. [F10] [A01] [AP03] [B01]

## 5. Unsupported behavior and native exception mapping

### 5.1 What crosses the transport boundary

**Fact:** `MethodChannel.invokeMethod` can return a decoded result, throw `PlatformException` for an error reply, or throw `MissingPluginException` for an unimplemented method. An incompatible generic return type can cause `TypeError`. `PlatformException` carries `code`, optional `message`, `details`, and `stacktrace`. Payloads must be supported by the selected codec. [F06] [F13] [F14]

**Fact:** Native channel examples explicitly return success/error/not-implemented replies; an arbitrary native crash is not thereby a portable Dart error. Pigeon documents error translation according to generator and method style. Callback-style native methods must return errors through their provided callback/error result rather than assuming a later thrown exception will complete the Dart call. [F06] [F08]

**Fact:** Flutter unit/widget tests do not include native host code. `MissingPluginException` in those tests can reflect absence of a native test host, not unsupported production OS behavior. [F23] [F24]

### 5.2 Recommended application behavior

The following is **recommendation**, not a standardized Flutter failure taxonomy:

| Observation | Boundary behavior |
| --- | --- |
| Capability/operation is known to be unimplemented | Return an explicit unsupported outcome or documented typed failure; select a supported product alternative. |
| Permission denied/restricted/revoked | Preserve the meaningful authorization state; show an appropriate explanation or recovery route without repeated automatic prompts. |
| User cancels a picker/consent operation | Represent cancellation independently of denial or a transport fault; do not treat it as an empty successful selection. |
| Device/service/UI owner temporarily unavailable | Expose availability/retry semantics appropriate to that capability. |
| `MissingPluginException` where support was expected | Investigate package selection, build/registration, method version, engine/isolate setup, and test environment. Do not silently relabel every case as OS unsupported. |
| Invalid codec payload, `TypeError`, incompatible generated API | Treat as contract/configuration failure, not user denial. |
| Native operation error | Map stable native codes into app-owned outcomes; retain sanitized diagnostics without exposing transport types throughout feature/UI code. |

**Recommendation:** Keep channel names, Pigeon-generated types, native status codes, and platform exception decoding inside adapters. Define app-owned, typed contracts only where they stabilize a real capability boundary. Map by documented codes/structured data rather than localized messages. Avoid catch-all fallbacks that hide broken supported implementations. For optional capabilities, define a product fallback; for mandatory capabilities, provide an explicit initialization or operation failure. [F08] [F24] [F27]

## 6. Channels, Pigeon, threads, and isolates

### 6.1 Asynchronous messaging does not choose the correct thread

**Fact:** Flutter's platform-channel guide distinguishes three cases: [F06]

- Channel invocation from the native/platform side must occur on the platform's main thread.
- Native handlers run on the platform main thread by default; supported Task Queue APIs can dispatch handlers to a background queue. The guide includes Android and iOS examples.
- Dart can invoke channels from the root isolate or a registered background isolate.

**Recommendation:** Document handler execution, outbound invocation, result completion, and UI API affinity separately. Do not infer that a `Future`, a channel call, or an async native signature automatically moves expensive work off-main. Verify Task Queue availability on the exact target/generator; marshal UI work to the required owner thread and heavy work to an appropriate worker. Native-to-Dart invocation rules are not a reason to move every native result callback blindly to the same queue.

**Fact:** Android's UI toolkit is not thread-safe and its main thread must not be blocked. UIKit generally requires main-thread/main-queue use unless the API documents otherwise. The archived Apple threading guide says `NSView` operations and application event handling belong on the main thread. GTK3 documentation says GTK calls belong on the main thread and deprecates the old GDK threading-lock API. Windows window message queues and COM apartments have thread-specific rules. [A02] [AP01] [AP06] [L01] [W01] [W02]

**Recommendation:** Make thread affinity part of each native adapter's operation contract. Sharing “desktop” or “Darwin” source does not erase AppKit/UIKit/COM/GTK differences. Do not use archived Cocoa guidance to claim every `NSWindow` operation is universally main-thread-only.

### 6.2 Background isolates have messaging limits

**Fact:** Flutter's isolate guide initializes background channel access using the root isolate token and `BackgroundIsolateBinaryMessenger.ensureInitialized`. Registered background isolates can send platform messages and receive their corresponding responses, but cannot receive unsolicited host messages. Spawned isolates cannot perform widget/`dart:ui` work or use `rootBundle` in the documented way. [F09]

**Fact:** Flutter web does not support Dart isolates as described by the web FAQ; `compute` runs on the main event loop on web. Browser workers are a separate technology and are not built-in Flutter isolate support. [F09] [F25]

**Recommendation:** Keep event-channel/native-push subscriptions on a suitable supported isolate, usually the root isolate, and forward owned data to CPU workers. Do not assume initializing a background messenger enables unsolicited streams, native UI access, or every third-party plugin. Validate plugins that need an activity/window separately. Distinguish CPU concurrency from OS-authorized background execution. [F03] [F09] [A03] [AP02]

### 6.3 Pigeon stabilizes internal transport, not a public plugin ABI

**Fact:** Pigeon's documented channel generators cover Android Kotlin/Java, iOS/macOS Swift/Objective-C, Windows C++, and Linux GObject. This list is not a web generator guarantee. Generated Dart and host code must use the **same Pigeon version**; wire changes are internal and are not necessarily semver-breaking changes. The README discourages public exposure of generated APIs and splitting generated Dart/native halves across platform-interface/implementation packages. [F07] [F08]

**Fact:** The checked README describes direct FFI/JNI Native Interop as **experimental**, with target coverage limited to Android/iOS/macOS and caller-thread execution rather than Task Queue dispatch. Its dedicated guide demonstrates **Kotlin JNI and Swift FFI**. The README's broader Java/Objective-C wording is not sufficient evidence of direct-mode generator parity; verify the selected generator and version rather than transferring the channel language list to direct mode. [F08] [F29]

**Fact:** The direct-mode guide warns that callbacks after the owning isolate terminates can crash, that synchronous calls block the caller, and that native UI access from a background isolate requires explicit main-thread dispatch. These are mode-specific lifecycle/threading constraints, not the channel messenger model. [F29]

**Version caveat:** The Pigeon README and Native Interop guide were checked at source commit `cda604a5cca516229ebb4e194ceab13897741eb0` (2026-09-10). Source presence does not verify availability in a particular published Pigeon package. The README's `@async`/`@asyncCallback` distinctions also vary by language and generator version. [F08] [F29]

**Recommendation:** Keep an app-owned capability interface outside generated transport code; pin generation and regenerate both sides together. Prefer established channel mode when it satisfies the need. Adopt experimental direct mode only with verified package/toolchain support, measured motivation, explicit callback ownership, and per-target tests. Never apply Task Queue or background messenger rules indiscriminately across channels and FFI/JNI.

## 7. Web is a browser capability boundary

**Fact:** Browser builds lack usable `dart:io` filesystem/socket APIs; browser HTTP headers are controlled by browser APIs. Flutter's web FAQ describes restrictions that are not removed by running the browser on a supported native OS. [F25]

**Fact:** Dart's modern browser integration uses `dart:js_interop` and `package:web`. Legacy `dart:html` is deprecated and is not compatible with Wasm compilation. `dart.library.js_interop` works for conditional selection across JS and Wasm web compilation, unlike older selection patterns tied only to legacy browser libraries. [D01] [D02] [D03]

**Fact:** JavaScript interop extension types cannot be mocked with ordinary Dart `implements` as if they were normal classes. Interop callback conversion and identity matter when removing listeners, and callbacks do not automatically acquire all desired Zone behavior. The migration guide describes explicit Zone binding where needed. [D02] [D03]

**Fact:** Flutter documents Wasm support from Flutter 3.24 and JavaScript fallback where the browser cannot run the Wasm build. Dependencies must use compatible interop. Multithreaded rendering requires appropriate cross-origin isolation headers: COEP `credentialless` or `require-corp`, and COOP `same-origin`. Renderer multithreading is not evidence that arbitrary Dart isolate APIs are available on web. [F26] [F09]

**Fact:** The W3C Permissions Working Draft models `granted`, `denied`, and `prompt`; permission can expire or be revoked, policy can prevent access, and unsupported permission queries can reject with `TypeError`. A `prompt` state does not guarantee the browser will display a prompt. The Secure Contexts draft describes secure-context checks and ancestor effects; HTTPS alone on an embedded frame does not establish a secure context when its ancestor is insecure. These are specification snapshots, not an implementation-support matrix for every browser API. [B01] [B02]

**Recommendation:** Give browser adapters their own implementations and tests. Probe API availability and secure/policy context where relevant, then request authorization through the actual capability API. Handle unsupported permission queries independently of user denial. Exercise the deployed origin, iframe policy if embedded, denial/revocation, JS and Wasm builds where claimed, callback cleanup, and required headers. Test through a normal Dart capability seam instead of directly mocking browser extension types. [F24] [D03] [B01] [B02]

**Recommendation:** Represent file selection and data access without assuming a browser-selected object is a stable native filesystem path. `file_selector` already distinguishes opening files from choosing directories/save locations by platform. A browser fallback should describe its own product semantics rather than pretend to be a desktop picker. [F27]

## 8. Platform-specific native and desktop constraints

### Android

**Facts:**

- Runtime permission workflows must account for denial and later revocation and should request access in context. Android documents runtime permissions from API 23 and one-time permissions from API 30 for relevant capabilities. Static manifest declarations and current grants are different requirements. [A01]
- `<uses-feature>` can affect device filtering; optional hardware should be declared with `required="false"` when appropriate rather than unintentionally excluding devices. [A04]
- An engine/worker is not necessarily activity-attached; permission or picker operations may need a current activity and safe detach/reattach handling. [F03] [F04]
- Android distinguishes ordinary async work from scheduled/persistent/background work; OS-managed mechanisms and foreground-service restrictions must be chosen for the actual task. Processes can be killed. [A02] [A03]
- `compileSdk`, `minSdk`, and `targetSdk` have different purposes, plugin requirements can raise the application's minimum, and release network access requires the app's appropriate `INTERNET` declaration. [F21]

**Recommendation:** Treat foreground ownership, permission, hardware, SDK level, and execution policy as separate checks. Preserve important work through an appropriate OS-managed mechanism when required; a feature-owned isolate is not a persistent Android background service. Validate release manifests and configuration-change behavior, not just emulator debug success.

### iOS

**Facts:**

- Camera/microphone access requires appropriate usage descriptions and authorization. Apple documents termination when required descriptions are missing; these setup faults are not recoverable merely by mapping a Dart exception. [AP03]
- UIKit APIs generally require the main thread/main queue. Temporary background-execution assertions expire and must be ended, with an expiration handler; they do not authorize unlimited execution. [AP01] [AP02]
- Current Flutter channel examples register plugins through `FlutterImplicitEngineDelegate.didInitializeImplicitFlutterEngine`. The guide warns that the `UISceneDelegate` default in Flutter 3.41+ changes assumptions: `window` can be nil during `didFinishLaunchingWithOptions`. [F06]
- Privacy manifests record data collection and required-reason API use. Apple specifies the `PrivacyInfo.xcprivacy` filename and target-resource inclusion; current Flutter docs discuss bundling manifests for SPM and CocoaPods. Manifest declarations are separate from runtime camera/microphone authorization. [AP07] [F01]

**Recommendation:** Use the selected SDK's runner/engine/scene lifecycle as the integration point, not an older copied `AppDelegate` snippet. Review usage strings, privacy resources, background mode/task requirements, and physical-device behavior separately. Resolve the documented minimum-iOS conflict in section 3 before setting deployment targets.

### macOS

**Facts:**

- Flutter's macOS guide describes sandbox entitlements and differences between debug/profile and release entitlement files. Network/file operations can therefore succeed in debug and fail in release when the release target lacks required entitlements. [F19]
- Apple requires App Sandbox for Mac App Store distribution. Camera/microphone integration has macOS entitlement requirements in addition to authorization. [AP04] [AP03]
- Hardened Runtime is required for notarization. Its entitlements apply to the host executable; in-process plugins inherit the host's entitlements. Feature modules cannot be assumed to create separate entitlement domains inside one process. [AP05]
- Flutter's `sharedDarwinSource` is supported from Flutter 3.7, but sharing code still requires platform-specific dependencies/deployment targets. It does not erase sandbox, authorization, or UI-framework differences. [F01]

**Recommendation:** Verify the distributed, signed release app, its host entitlements, and user-selected-file behavior. Keep window ownership and AppKit-specific UI handling within the macOS adapter. Reassess Intel/Arm64 artifacts against the selected Flutter release rather than assuming the matrix's x64 listing is indefinite. [F15] [F27]

### Windows

**Facts:**

- Flutter's Windows runner owns the Win32 window, message loop, Flutter engine integration, and plugin registration. Distribution requires the app bundle's executable, required DLLs/data, and applicable runtime dependencies. [F18]
- Each COM-using thread must initialize COM appropriately, respect apartment/marshaling rules, and balance successful initialization with cleanup. Window-owning threads have message queues. [W01] [W02]
- Windows camera privacy behavior varies between packaged and unpackaged apps; camera access can fail with `E_ACCESSDENIED` due to privacy settings. [W03]
- Desktop WinRT UI operations such as pickers can require association with an owner `HWND`. A Dart background task does not manufacture a valid native UI owner. [W04]

**Recommendation:** Expose owner-window and COM-thread requirements inside the Windows adapter. Test the chosen packaged/unpackaged distribution and architectures, privacy denial, native UI parenting, and installed-runtime dependencies. Do not model Windows permission handling as a copy of Android permission dialogs.

### Linux

**Facts:**

- Flutter's Linux bundle includes the executable, shared libraries, and assets; compatibility depends on the actual system-library requirements. A plugin may add native dependencies beyond Flutter's baseline. [F20]
- GTK3 documentation directs GTK calls to the main thread; `gdk_threads_init` is deprecated since GTK 3.6. [L01]
- Flatpak's sandbox limits host filesystem, device, network, and D-Bus access unless permitted. Portals provide mediated access, including user-selected files. These are Flatpak/portal distribution rules, not universal behavior for every Linux installation. [L02] [L03]
- The FileChooser portal document identifies interface version 4, with directory selection introduced in version 3. Portal window identifiers differ: X11 uses `x11:<XID>`, Wayland uses `wayland:<HANDLE>`. [L03] [L04]
- The Background portal provides permission-mediated background/autostart behavior; this is separate from an in-process Dart isolate. [L05]

**Recommendation:** Verify the intended distro baseline, architecture, shared-library dependencies, packaging/sandbox, portal backend/interface availability, and X11/Wayland context. Parent native/portal UI correctly. Treat sandbox or missing-portal failures as specific environment limitations, not proof that “Linux is unsupported.”

### Desktop-wide conclusion

**Fact:** Flutter supports native desktop compilation, but a capability still needs a desktop implementation or suitable package. The Windows, macOS, and Linux guides describe different runners, distribution bundles, and native constraints. [F17] [F18] [F19] [F20]

**Recommendation:** Share application contracts and product logic where semantics align; keep platform deployment, security, threading, UI ownership, and file-access semantics in target-specific adapters. “Desktop supported” is not a substitute for a per-operation capability matrix.

## 9. Verification criteria for a future architecture skill

The following checklist is **recommended validation**, not work performed during this research:

1. **Inventory:** record Flutter/Dart and generator versions, resolved plugin implementations, supported target/architecture claims, native minimums, and the operation-level capability matrix. Mark documentation conflicts and unknowns. [F01] [F08] [F15] [F27]
2. **Composition:** prove deterministic feature composition, supported/unsupported selection, duplicate/dependency failures, explicit startup failure policy, and owned cleanup. Distinguish app feature composition from engine registration. [F02] [F03]
3. **Artifact:** build each claimed target in release mode and inspect registration, libraries/assets, entitlements/manifests/privacy resources, and distribution packaging. Test deferred behavior in profile/release where used. [F05] [F18] [F19] [F20] [F21] [AP07]
4. **Contract:** unit-test capability fakes and error/outcome mapping, including unsupported, denial, cancellation, unavailable service, and expected-registration failure. Use app-owned wrappers as the preferred app-test seam; raw channel mocks are a last resort. [F24]
5. **Native/browser integration:** integration-test actual Dart/host communication and browser-dependent APIs. Unit/widget tests alone do not execute native code. Add native tests where the native implementation itself needs validation. [F23]
6. **Lifecycle/concurrency:** exercise multiple consumers/engines where relevant, activity/window/scene detachment, permission revocation, root versus background isolate behavior, unsolicited events, native thread affinity, and callback/subscription cleanup. [F01] [F04] [F09] [F29]
7. **Environment:** exercise deployed browser origin/policy/headers, macOS release entitlements, Windows packaging/COM/UI owner, and Linux distro/sandbox/portal/X11/Wayland combinations that are actually claimed. [F19] [F26] [W01] [W04] [L02] [L04] [B01] [B02]
8. **Human/native-UI validation:** Flutter documents that `integration_test` cannot interact with native dialogs or platform-view contents. Use appropriate native automation or a manual checklist for permission/picker/system-UI journeys; do not claim coverage from a Dart integration test that never exercises them. [F23]

**Recommendation:** A reusable skill should finish platform-sensitive work with an evidence table: **target + operation → declared implementation → build/config prerequisites → runtime conditions → fallback/failure behavior → tests actually run**. Cite package-specific evidence rather than assuming that this general research verifies a future dependency.

## 10. Verified source inventory

“Verified” here means the relevant primary-source content was retrieved and inspected. It does **not** mean the documented functionality was executed, every linked page was followed, or a corresponding published release was independently verified. Canonical document links are used below; Flutter documents were generally retrieved through their `.md` representations. D04 was read through the first-party Dart website repository source. Apple AP01–AP05 and AP07 were read through first-party documentation JSON because their ordinary web pages did not expose usable content.

### Flutter documents, APIs, and first-party package/tool sources

- **F01 — [Developing packages & plugins][F01].** Package/plugin/federation definitions; endorsement metadata; Dart/web/hybrid registration; multi-engine lifetime; FFI packaging; Darwin source and privacy-resource integration.
- **F02 — [Flutter tool: `flutter_plugins.dart`, tag `3.47.8`][F02].** Dependency-based discovery, generated native/Dart/web registrants, build-time injection, method-channel versus FFI filtering, and CMake linking/bundling.
- **F03 — [Android embedding: `FlutterPlugin`][F03].** Engine attachment/detachment, invalidation of bindings, resources, and possible absence of an activity.
- **F04 — [Android embedding: `ActivityAware`][F04].** Activity ownership, configuration detach/reattach, invalid binding cleanup, and listener deregistration.
- **F05 — [Deferred components for Android and web][F05].** Statically declared deferred code; whole-AAB construction; no independent partial app updates; debug/release differences.
- **F06 — [Write platform-specific code with platform channels][F06].** Codec/reply behavior; channel threading and Task Queues; background-isolate initialization; current iOS engine/scene integration.
- **F07 — [Pigeon][F07].** Typed code generation for host communication; generator/platform overview.
- **F08 — [Pigeon README, source snapshot][F08].** Channel language coverage, error handling, matching generator versions, public-API warnings, experimental direct mode, and Task Queue distinctions.
- **F09 — [Concurrency and isolates][F09].** Background messenger limits, unsolicited-message restriction, spawned-isolate limitations, and web `compute` behavior.
- **F10 — [Capabilities and policies][F10].** Capability versus policy; limits of OS-based assumptions; mockable meaningful operations.
- **F11 — [`kIsWeb`][F11].** Compile-time `dart.library.js_interop` web indicator.
- **F12 — [`defaultTargetPlatform`][F12].** Adaptation/styling purpose, web host OS, test default, and overrides.
- **F13 — [`MethodChannel.invokeMethod`][F13].** Return typing, `PlatformException`, and unimplemented-method `MissingPluginException`.
- **F14 — [`PlatformException`][F14].** Structured platform-error envelope fields.
- **F15 — [Supported deployment platforms][F15].** Framework support/CI distinction, platform/architecture matrix, macOS Intel warning; [pinned website source](https://raw.githubusercontent.com/flutter/website/5d0760a1c2b1bd731c0c89662b850e5aa841400d/sites/docs/src/content/reference/supported-platforms.md).
- **F16 — [Flutter SDK archive][F16].** Release schedule and archive context; dynamically rendered release rows were not verified.
- **F17 — [Desktop support for Flutter][F17].** Native desktop support and implementation requirements.
- **F18 — [Building Windows apps with Flutter][F18].** Runner/Win32 ownership and distribution dependencies.
- **F19 — [Building macOS apps with Flutter][F19].** App Sandbox and debug/profile versus release entitlements.
- **F20 — [Building Linux apps with Flutter][F20].** Distribution bundle and native/system-library dependencies.
- **F21 — [Build and release an Android app][F21].** SDK configuration distinctions, plugin minimums, release manifest/network setup.
- **F22 — [Build and release an iOS app][F22].** Deployment-target guidance; its 13+ claim conflicts with F15's 15+ minimum.
- **F23 — [Testing plugins][F23].** Dart/native/browser/native-language test roles and native-dialog/platform-view automation limitations.
- **F24 — [Plugins in Flutter tests][F24].** Native registration absence in Dart tests; preferred app-wrapper seam and fallback mocking hierarchy.
- **F25 — [Web FAQ][F25].** Browser `dart:io`/platform API restrictions, HTTP limitations, and absence of built-in Dart isolate/worker support.
- **F26 — [Support for WebAssembly (Wasm)][F26].** Wasm prerequisites, JS fallback, interop compatibility, and cross-origin isolation headers; unverified 3.50 additions excluded from implementation advice.
- **F27 — [`file_selector` README, source snapshot][F27].** Six-target support versus per-operation support; filter compatibility, cancellation, and macOS file-access entitlements.
- **F28 — [Architecture recommendations and resources][F28].** Flutter's recommendations are adaptable, not steadfast application rules.
- **F29 — [Pigeon Native Interop (FFI & JNI) Guide, source snapshot][F29].** Kotlin/Swift direct mode, caller-thread/isolate/callback ownership, and version-sensitive build/generator prerequisites.

### Dart documents and API

- **D01 — [Creating packages: conditionally importing and exporting library files][D01].** Compile-time library selection, identical alternative APIs, unsupported stub example.
- **D02 — [JavaScript interoperability][D02].** Modern interop model and extension-type/callback constraints.
- **D03 — [Migrate to `package:web`][D03].** JS/Wasm-compatible browser APIs, deprecated `dart:html`, testing and callback/Zone caveats; unverified Dart 3.14 flags excluded.
- **D04 — [Libraries & imports][D04].** Statically named deferred libraries and shared types; [retrieved first-party source](https://raw.githubusercontent.com/dart-lang/site-www/main/src/content/language/libraries.md).
- **D05 — [`DynamicLibrary.open`][D05].** Native library loading/symbol access, including repeated loads across isolates.

### Android

- **A01 — [Request runtime permissions][A01].** In-context requests, denial/revocation, and API-level permission behavior.
- **A02 — [Processes and threads overview][A02].** Main-thread/UI requirements and process lifecycle constraints.
- **A03 — [Background tasks overview][A03].** Background execution choices versus ordinary in-process async work.
- **A04 — [`<uses-feature>`][A04].** Device/store filtering and optional hardware declaration.

### Apple

- **AP01 — [UIKit][AP01].** Main-thread/main-queue default with API-documented exceptions; [retrieved JSON](https://developer.apple.com/tutorials/data/documentation/uikit.json).
- **AP02 — [Extending your app's background execution time][AP02].** Temporary assertions, expiration handlers, and ending tasks; [retrieved JSON](https://developer.apple.com/tutorials/data/documentation/uikit/extending-your-app-s-background-execution-time.json).
- **AP03 — [Requesting authorization to capture and save media][AP03].** Usage descriptions, authorization, termination on missing declarations, and macOS entitlements; [retrieved JSON](https://developer.apple.com/tutorials/data/documentation/avfoundation/requesting-authorization-to-capture-and-save-media.json).
- **AP04 — [App Sandbox][AP04].** Sandbox security model and Mac App Store requirement; [retrieved JSON](https://developer.apple.com/tutorials/data/documentation/security/app-sandbox.json).
- **AP05 — [Hardened Runtime][AP05].** Notarization, host-executable entitlements, and inheritance by in-process plugins; [retrieved JSON](https://developer.apple.com/tutorials/data/documentation/security/hardened-runtime.json).
- **AP06 — [Thread Safety Summary][AP06].** AppKit/Cocoa threading detail; **archived**, last updated 2014-07-15, so current per-API guidance takes precedence.
- **AP07 — [Privacy manifest files][AP07].** Data/required-reason declarations and bundled target resources; [retrieved JSON](https://developer.apple.com/tutorials/data/documentation/bundleresources/privacy-manifest-files.json).

### Microsoft Windows

- **W01 — [Initializing the COM Library][W01].** Per-thread COM initialization, apartment affinity/marshaling, and balanced cleanup.
- **W02 — [Window Messages][W02].** Window-owning threads, message queues, and message-loop ownership.
- **W03 — [Handle the Windows camera privacy setting][W03].** Privacy access failure and packaged/unpackaged application differences.
- **W04 — [Display WinRT UI objects that depend on CoreWindow][W04].** Owner-`HWND` requirements for desktop UI integration.

### Linux ecosystem authorities

- **L01 — [`Gdk.threads_init`][L01].** GTK main-thread requirements and deprecated GTK3/GDK locking approach; not a GTK4-specific assertion.
- **L02 — [Flatpak Sandbox Permissions][L02].** Distribution-specific host-resource restrictions and portal-mediated alternatives.
- **L03 — [XDG desktop portal: File Chooser][L03].** Mediated file/directory selection and portal interface version distinctions.
- **L04 — [XDG desktop portal: Window Identifiers][L04].** X11 versus Wayland UI-parent tokens.
- **L05 — [XDG desktop portal: Background][L05].** Background/autostart authorization through the portal.

### Browser standards

- **B01 — [Permissions][B01].** W3C **Working Draft, 2026-10-26**: permission states, expiry/revocation, policy, and unsupported queries. Its embedded third-party browser-support data was not used as primary evidence.
- **B02 — [Secure Contexts][B02].** W3C **Candidate Recommendation Draft, 2023-11-10**: secure-context/ancestor checks and runtime detection; not a universal browser API implementation guarantee.

## 11. Limits and open questions

- This is documentary/source research. No Flutter SDK builds, analyzer runs, device/native runtimes, browser integrations, or native-dialog tests were performed.
- Latest stable Flutter/Dart availability remains independently unverified. A release schedule, website banner, source tag, or repository feature does not prove package/release availability in a consuming project.
- The iOS 13-versus-15 documentation conflict remains unresolved. Upper platform-version rows and browser “latest two” ranges are source claims requiring project-specific revalidation, not independently tested compatibility.
- Pigeon direct mode is experimental. Its source documentation has broader language wording than its dedicated Kotlin/Swift guide; generator/language parity and published-version availability require further verification before adoption.
- Apple JSON documents were inspected, but privacy-manifest SDK lists and every capability-specific entitlement/background policy were not exhaustively audited. AP06 is archived guidance.
- Linux portal/Flatpak and Windows packaged/unpackaged conditions depend on distribution. This report does not claim every Linux environment or Windows security model behaves identically.
- The `file_selector` example verifies first-party **documentation of operation differences**, not a specific installed package or all six native/browser implementations.
- Arbitrary downloaded application feature extensions, store-policy approval, independent partial updates outside documented deferred components, and cross-platform native-library unloading were not established. Such requirements need separate platform-specific research rather than assumptions based on feature composition.

[F01]: https://docs.flutter.dev/packages-and-plugins/developing-packages "Developing packages & plugins"
[F02]: https://raw.githubusercontent.com/flutter/flutter/3.47.8/packages/flutter_tools/lib/src/flutter_plugins.dart "Flutter tool plugin discovery and registration source"
[F03]: https://api.flutter.dev/javadoc/io/flutter/embedding/engine/plugins/FlutterPlugin.html "FlutterPlugin"
[F04]: https://api.flutter.dev/javadoc/io/flutter/embedding/engine/plugins/activity/ActivityAware.html "ActivityAware"
[F05]: https://docs.flutter.dev/perf/deferred-components "Deferred components for Android and web"
[F06]: https://docs.flutter.dev/platform-integration/platform-channels "Write platform-specific code with platform channels"
[F07]: https://docs.flutter.dev/interop/pigeon "Pigeon"
[F08]: https://raw.githubusercontent.com/flutter/packages/cda604a5cca516229ebb4e194ceab13897741eb0/packages/pigeon/README.md "Pigeon README"
[F09]: https://docs.flutter.dev/perf/isolates "Concurrency and isolates"
[F10]: https://docs.flutter.dev/ui/adaptive-responsive/capabilities "Capabilities and policies"
[F11]: https://api.flutter.dev/flutter/foundation/kIsWeb-constant.html "kIsWeb"
[F12]: https://api.flutter.dev/flutter/foundation/defaultTargetPlatform.html "defaultTargetPlatform"
[F13]: https://api.flutter.dev/flutter/services/MethodChannel/invokeMethod.html "MethodChannel.invokeMethod"
[F14]: https://api.flutter.dev/flutter/services/PlatformException-class.html "PlatformException"
[F15]: https://docs.flutter.dev/reference/supported-platforms "Supported deployment platforms"
[F16]: https://docs.flutter.dev/install/archive "Flutter SDK archive"
[F17]: https://docs.flutter.dev/platform-integration/desktop "Desktop support for Flutter"
[F18]: https://docs.flutter.dev/platform-integration/windows/building "Building Windows apps with Flutter"
[F19]: https://docs.flutter.dev/platform-integration/macos/building "Building macOS apps with Flutter"
[F20]: https://docs.flutter.dev/platform-integration/linux/building "Building Linux apps with Flutter"
[F21]: https://docs.flutter.dev/deployment/android "Build and release an Android app"
[F22]: https://docs.flutter.dev/deployment/ios "Build and release an iOS app"
[F23]: https://docs.flutter.dev/testing/testing-plugins "Testing plugins"
[F24]: https://docs.flutter.dev/testing/plugins-in-tests "Plugins in Flutter tests"
[F25]: https://docs.flutter.dev/platform-integration/web/faq "Web FAQ"
[F26]: https://docs.flutter.dev/platform-integration/web/wasm "Support for WebAssembly (Wasm)"
[F27]: https://raw.githubusercontent.com/flutter/packages/f2c6798b45a7ae936feb6798fe45cb51f832dc18/packages/file_selector/file_selector/README.md "file_selector README"
[F28]: https://docs.flutter.dev/app-architecture/recommendations "Architecture recommendations and resources"
[F29]: https://raw.githubusercontent.com/flutter/packages/cda604a5cca516229ebb4e194ceab13897741eb0/packages/pigeon/native_interop_guide.md "Pigeon Native Interop (FFI & JNI) Guide"
[D01]: https://dart.dev/tools/pub/create-packages#conditionally-importing-and-exporting-library-files "Creating packages: conditional imports and exports"
[D02]: https://dart.dev/interop/js-interop "JavaScript interoperability"
[D03]: https://dart.dev/interop/js-interop/package-web "Migrate to package:web"
[D04]: https://dart.dev/language/libraries "Libraries & imports"
[D05]: https://api.dart.dev/dart-ffi/DynamicLibrary/DynamicLibrary.open.html "DynamicLibrary.open"
[A01]: https://developer.android.com/training/permissions/requesting "Request runtime permissions"
[A02]: https://developer.android.com/guide/components/processes-and-threads "Processes and threads overview"
[A03]: https://developer.android.com/develop/background-work/background-tasks "Background tasks overview"
[A04]: https://developer.android.com/guide/topics/manifest/uses-feature-element "uses-feature"
[AP01]: https://developer.apple.com/documentation/uikit "UIKit"
[AP02]: https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time "Extending your app's background execution time"
[AP03]: https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media "Requesting authorization to capture and save media"
[AP04]: https://developer.apple.com/documentation/security/app-sandbox "App Sandbox"
[AP05]: https://developer.apple.com/documentation/security/hardened-runtime "Hardened Runtime"
[AP06]: https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/Multithreading/ThreadSafetySummary/ThreadSafetySummary.html "Thread Safety Summary"
[AP07]: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files "Privacy manifest files"
[W01]: https://learn.microsoft.com/en-us/windows/win32/learnwin32/initializing-the-com-library "Initializing the COM Library"
[W02]: https://learn.microsoft.com/en-us/windows/win32/learnwin32/window-messages "Window Messages"
[W03]: https://learn.microsoft.com/en-us/windows/apps/develop/camera/camera-privacy-setting "Handle the Windows camera privacy setting"
[W04]: https://learn.microsoft.com/en-us/windows/apps/develop/ui/display-ui-objects "Display WinRT UI objects that depend on CoreWindow"
[L01]: https://docs.gtk.org/gdk3/func.threads_init.html "Gdk.threads_init"
[L02]: https://docs.flatpak.org/en/latest/sandbox-permissions.html "Sandbox Permissions"
[L03]: https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.FileChooser.html "File Chooser"
[L04]: https://flatpak.github.io/xdg-desktop-portal/docs/window-identifiers.html "Window Identifiers"
[L05]: https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.Background.html "Background"
[B01]: https://www.w3.org/TR/2026/WD-permissions-20261026/ "Permissions: Working Draft, 26 October 2026"
[B02]: https://www.w3.org/TR/2023/CRD-secure-contexts-20231110/ "Secure Contexts: Candidate Recommendation Draft, 10 November 2023"
