# Windows, Linux & Flutter Web Release

Source-preserving excerpt from the uploaded production release skill. Use when the core SKILL.md routes to this topic.

# Windows

## Flutter build output

Build:

```powershell
flutter build windows --release
```

A Flutter Windows build produces the Windows release layout containing:

- executable
- Flutter runtime DLL
- plugin/native DLLs
- `data` directory
- other runtime dependencies

Distribute the complete required release layout unless packaging transforms it into another validated package.

---

## Architectures

Flutter 3.44.7 officially supports Windows x64 and Arm64.

Verify every native plugin/DLL supports the chosen target architecture.

Do not infer Arm64 support from Dart-only code if native dependencies are x64-only.

---

## Microsoft Store

MSIX is Microsoft's modern packaged application format and is the recommended path for many modern Windows application distributions. Microsoft Store MSIX packages are re-signed by Microsoft after certification.

Flutter's Windows deployment documentation covers Store packaging and package validation, while Microsoft's current `winapp` CLI has explicit Flutter/MSIX instructions.

Do not claim:

```bash
flutter build msix
```

is a first-party Flutter build command.

It is not the normal Flutter CLI output.

---

## Direct distribution

Options include:

- complete release directory
- signed MSIX
- organization-specific installer
- enterprise packaging

Distinguish official Windows requirements from ecosystem installer conventions.

For direct MSIX distribution, Windows requires a trusted signing model. Microsoft documents production code signing separately from development self-signed certificates.

---

## Validation

For MSIX:

- validate package identity
- validate architecture
- validate capabilities
- validate version
- run Windows App Certification Kit
- test fresh installation
- test upgrade
- test uninstall
- test missing-runtime behavior
- test native plugins

Flutter specifically instructs Store releases to validate with Windows App Certification Kit.

---

## Symbols

Preserve matching PDBs for native runner/plugin binaries when generated.

Private PDBs normally belong in:

- artifact storage
- symbol server
- crash-analysis service

not in public user downloads unless the diagnostic strategy explicitly requires them.

---

# Linux

## Build

```bash
flutter build linux --release
```

The resulting architecture-specific `bundle` directory must be treated as a unit.

Flutter explicitly says to include everything in the bundle directory when distributing the application.

---

## Runtime dependencies

Inspect system-library requirements:

```bash
ldd build/linux/x64/release/bundle/<executable>
```

Adjust the architecture path for the actual build.

Flutter notes that target machines need the OS libraries against which the application was linked.

Do not test only on the build machine.

---

## Packaging

Flutter directly documents Snap Store deployment.

It also references downstream packaging resources for `.deb` and `.rpm`.

Therefore classify:

### Flutter CLI guarantee

```text
Linux release bundle
```

### Flutter-officially documented store path

```text
Snap
```

### Downstream/ecosystem packaging

Examples:

```text
deb
rpm
Flatpak
AppImage
other distro packages
```

Do not present third-party tooling as Flutter CLI functionality.

---

## Linux release validation

Test:

- supported architecture
- oldest intended distro baseline
- newer distro baseline
- GTK/runtime dependencies
- native plugin `.so` dependencies
- desktop integration
- filesystem paths
- executable permissions
- package upgrade/uninstall

---

# Flutter Web

## Standard production build

```bash
flutter build web --release
```

Output:

```text
build/web/
```

Deploy the entire output required by the build.

---

## WebAssembly

Build:

```bash
flutter build web --release --wasm
```

Current Flutter Web supports a WebAssembly compilation target.

The Wasm build also retains a JavaScript fallback where WasmGC support is unavailable.

Before choosing Wasm:

- inspect browser support requirements
- inspect plugin/package compatibility
- inspect JS interop
- test actual users' browsers
- configure required hosting headers for threaded rendering

Flutter's current supported-platform matrix lists Wasm support for current Chrome and Edge, while Firefox and Safari remain JavaScript-only in Flutter's official support matrix.

Do not force Wasm merely because it exists.

---

## Renderer guidance

Do not copy obsolete Flutter Web advice involving the retired HTML-renderer selection workflow.

For modern Flutter, follow the current Web renderer/Wasm documentation associated with the exact SDK.

Do not add legacy:

```text
--web-renderer html
```

to a current production recipe without verifying that the project's pinned SDK supports and requires it.

---

## Service workers

Flutter no longer generates or manages a service worker by default.

If offline/PWA caching is required, implement and own an explicit service-worker strategy using standard Web tooling.

Do not copy old recipes relying on Flutter's deprecated generated service worker or deprecated `--pwa-strategy` behavior.

---

## Routing

When using path-based URLs:

- configure the host to return the Flutter entry document for application routes
- configure the correct base path when hosting below `/`
- test direct navigation and page refresh

Do not validate routing only through `flutter run`; validate the deployed server/CDN.

---

## Cache strategy

Do not set:

```text
Cache-Control: immutable
```

on every Flutter Web file.

Classify output:

- application/bootstrap entry files → require update-aware caching/revalidation
- versioned/content-addressed assets → can use longer immutable caching when actually content-addressed
- API responses → separate policy
- custom service-worker data → explicit lifecycle

Flutter's Web FAQ specifically warns about stale application scripts and documents short browser caching/revalidation strategies.

---

## Compression

Enable host/CDN compression for compressible production files such as:

- JavaScript
- Wasm
- CSS
- JSON
- SVG
- text

Use Brotli/gzip according to server/client support.

Do not waste CPU recompressing already-compressed media formats without evidence of benefit.

---

## Wasm cross-origin headers

Current Flutter documentation says multithreaded WebAssembly rendering requires COEP/COOP response headers, including:

```text
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
```

for the documented configuration.

Before enabling them, test:

- auth integrations
- third-party frames
- analytics
- image/font/CDN origins
- APIs
- browser compatibility

---

## Web source maps

Current Flutter tooling provides source-map-related build support.

When source maps are required for production crash diagnosis:

- generate them for the exact release
- store them by build identity
- upload privately to the crash service when appropriate
- decide deliberately whether to expose them publicly

Source maps improve debugging; they are not a substitute for keeping real secrets off the client.

---

## CSP

Treat Content Security Policy as a deployment concern.

Use a tested policy that permits only required:

- scripts
- connections
- workers
- fonts
- images
- frames

Do not deploy a copied CSP without testing the actual Flutter bootstrap, Wasm mode, third-party scripts, and authentication integrations.

---

