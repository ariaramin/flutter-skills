# Platform, adaptive UI, and accessibility

## Shared UI and interaction

Use available constraints rather than a device-name classification for layout. Choose content-driven breakpoints, bounded reading widths, flexible text heights, and appropriate multi-pane layouts. Prefer `LayoutBuilder` for parent constraints and supported aspect-specific `MediaQuery` accessors for window/environment data. Test resize, split-screen, keyboard insets, safe areas and display features.

Reuse the app's Theme/ColorScheme/text styles and custom tokens; extend the theme for cohesive missing token groups rather than adding arbitrary hard-coded values. Use existing localization generation, locale-aware dates/numbers/plurals and directional padding/alignment. Test RTL mixed-direction content and long translations, not only string presence.

Prefer built-in interactive controls or existing accessible house components. Custom controls need role, label, semantic action, keyboard activation, visible focus, enabled state and appropriate hit targets. A padded icon alone is not an accessible button. Test applicable Android/iOS target guidelines, text contrast and labels; check actual screen-reader behavior separately. Do not convey essential state only by color. Respect text scaling and reduced motion while preserving essential progress/state information.

## Required target differences

| Target | Inspect and implement | Verify |
| --- | --- | --- |
| Android | Activity/process death, persisted data versus UI restoration, plugin lifecycle, permissions, back/predictive back, edge-to-edge/insets for target SDK. | Kill/recreate and reopen; back through dialogs/nested stacks; denied permissions; actual low-memory target and renderer. |
| iOS / iPadOS | Scene/AppDelegate/plugin integration for pinned Flutter, swipe back, safe areas, suspension and OS background limits, permissions and entitlements. | Reopen/suspend; gesture navigation; VoiceOver; iPad resize/keyboard; signing and device integration when affected. |
| Web | Browser URL/history/reload, CORS, browser storage/quota/eviction, origin policy, browser APIs, compilation/renderer/dependency support. | Served release-like output, back/forward/direct URLs, supported browsers, accessible focus/selection, transfer/startup and long tasks. |
| Windows | Resizable/high-DPI windows, keyboard/mouse/focus, Windows paths and file locks, native DLL packaging and permissions. | Required architectures, install/run, resize and DPI changes, keyboard operation and packaged native loads. |
| macOS | Window/menu/keyboard conventions, sandbox entitlements and file access, native frameworks, lifecycle. | Packaged app, entitlement-dependent operations, VoiceOver, resize and Cmd shortcuts. |
| Linux | Window manager/display environment, keyboard/focus, filesystem permissions, shared-library dependencies and packaging. | Supported distribution/display/runtime combinations and installed app behavior. |

These are conditional checks for the user's supported targets, not a demand to add six-platform support to every project. Verify minimum OS/toolchain requirements and each plugin's platform matrix; Flutter framework support alone does not prove plugin support.

## Web constraints

Dart isolates are unsupported in Flutter web; `compute` uses the current browser event loop. Renderer worker threads in Wasm do not give application Dart code native isolate parallelism. Use conditional imports/exports for platform-specific libraries; `dart:io`/native FFI are not browser implementations.

Verify WasmGC/browser compatibility, JS interop dependencies, fallback/loading behavior and hosting configuration before choosing Wasm. Multithreaded rendering needs cross-origin isolation headers (`COOP: same-origin` and an appropriate `COEP`, such as `require-corp` or `credentialless`); those policies can affect assets and popup integrations. Verify actual responses, not only config files.

Use current web build/initialization docs for offline caching and renderer choices. Do not assume old generated service-worker behavior or an HTML renderer still applies. Browser persistence can be evicted and is not equivalent to an unrestricted durable native filesystem.

## Native integration and background work

Reuse an existing plugin if it meets the contract. Channels suit platform APIs; FFI suits native ABI calls on supported native targets. Validate channel payloads/errors, platform thread requirements and plugin registration. For FFI, establish allocation/free ownership, callback lifetime, ABI widths, error propagation and per-architecture library availability before writing bindings. Blocking native calls can block the calling isolate.

A Dart isolate is not an OS background-execution entitlement or scheduler. Follow platform restrictions for suspension/process termination, use supported native scheduling where required, and test interrupted/restarted work. Preserve existing file paths, key access, backup exclusions, and migration policy; avoid hard-coded path separators or sandbox assumptions across targets.

Sources: supported platforms, adaptive design, internationalization/accessibility, platform channels/FFI, Wasm, and build-mode documentation in [sources](sources.md). Native release/background/storage details require the project's platform and plugin contracts.
