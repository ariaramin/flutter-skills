# Source reference — Android/iOS/macOS/Windows/Linux/Web packaging, architecture matrices, SIMD, boundary performance, profiling, sanitizers, symbols, native linking, supply chain, and security

## Table of contents

- [63. Android Integration](#63-android-integration)
    - [Android rules](#android-rules)
    - [C++ runtime](#c-runtime)
    - [16 KB page-size requirement](#16-kb-page-size-requirement)
- [64. iOS Integration](#64-ios-integration)
    - [iOS rules](#ios-rules)
- [65. macOS Integration](#65-macos-integration)
- [66. Windows Integration](#66-windows-integration)
    - [Calling conventions](#calling-conventions)
    - [CRT ownership](#crt-ownership)
    - [DLL search security](#dll-search-security)
- [67. Linux Integration](#67-linux-integration)
    - [Compatibility rule](#compatibility-rule)
- [68. Web](#68-web)
- [69. Verified Platform Matrix](#69-verified-platform-matrix)
- [70. Architecture Matrix](#70-architecture-matrix)
- [71. CPU Features and SIMD](#71-cpu-features-and-simd)
- [72. Boundary-Crossing Performance](#72-boundary-crossing-performance)
- [73. Batch APIs](#73-batch-apis)
- [74. Allocation Performance](#74-allocation-performance)
- [75. Native Handle Reuse](#75-native-handle-reuse)
- [76. `isLeaf`](#76-isleaf)
- [77. Native Library Initialization](#77-native-library-initialization)
- [78. Release-Mode Benchmarking](#78-release-mode-benchmarking)
- [79. Memory Profiling](#79-memory-profiling)
- [80. Sanitizers](#80-sanitizers)
  - [AddressSanitizer](#addresssanitizer)
  - [UndefinedBehaviorSanitizer](#undefinedbehaviorsanitizer)
  - [ThreadSanitizer](#threadsanitizer)
    - [Rule](#rule)
- [81. Native Crash Diagnostics](#81-native-crash-diagnostics)
- [82. Debug Symbols and Stripping](#82-debug-symbols-and-stripping)
- [83. Native Link Optimization](#83-native-link-optimization)
- [84. Security](#84-security)
- [85. Native Dependency Supply Chain](#85-native-dependency-supply-chain)
- [86. Secrets](#86-secrets)
- [87. DLL / Library Search Security](#87-dll-library-search-security)

---
# 63. Android Integration

For modern source-based Flutter FFI packages, prefer build hooks/code assets.

When integrating manually, understand Android's NDK ABI model.

The Android NDK currently recognizes:

- `armeabi-v7a`;
- `arm64-v8a`;
- `x86`;
- `x86_64`.

Current Flutter's supported Android deployment matrix includes Arm32, Arm64, and x64; do not assume 32-bit x86 is a current Flutter deployment target merely because the NDK can build it.

### Android rules

- Build every Flutter ABI you claim to support.
- CMake builds one Android ABI at a time.
- Use Gradle ABI filters only intentionally.
- Prefer App Bundles/splits rather than shipping unnecessary machine code.
- Package `.so` files under the appropriate ABI.
- Verify exported symbols after stripping.
- Test on real ARM64 devices.
- Do not benchmark debug native builds.

### C++ runtime

As of current NDK guidance, libc++ is the NDK's supported full C++ standard library. Multiple incompatible C++ runtimes in one app can cause object-layout, exception, and allocator failures. The NDK also warns that separately statically linking the C++ runtime into multiple shared libraries can cause serious runtime problems.

Do not pass STL objects across your Dart ABI.

### 16 KB page-size requirement

Android's current guidance states NDK r28+ produces 16-KB-aligned shared libraries by default. Apps targeting modern Android devices must ensure **all** native dependencies, including prebuilts, satisfy current page-size packaging/alignment requirements.

This is a production packaging requirement, not an FFI syntax concern.

---

# 64. iOS Integration

Do not apply Android `.so` loading assumptions to iOS.

Common approaches include:

- statically linked native symbols;
- frameworks;
- XCFrameworks;
- modern Flutter code assets/build hooks.

Apple's binary packaging guidance uses XCFrameworks to carry variants for different Apple platforms and architectures. Device and simulator variants are distinct even when both contain ARM64 code.

Third-party standalone dynamic libraries are not packaged on iOS like arbitrary macOS `.dylib` files; dynamic native code is distributed through appropriate framework/app bundle mechanisms.

### iOS rules

- Ensure an ARM64 device build.
- Include correct simulator variants.
- Keep simulator and device slices/platform identifiers distinct.
- Export required symbols.
- Validate symbols after final Xcode link.
- Sign embedded frameworks correctly.
- Use `DynamicLibrary.process()` only where the relevant symbols are actually linked/exported into the process.
- Do not resurrect obsolete bitcode requirements; Apple deprecated bitcode with Xcode 14.

---

# 65. macOS Integration

macOS commonly uses:

- `.dylib`;
- frameworks;
- static libraries linked into the executable;
- universal binaries;
- code assets.

Current Flutter supports macOS x64 and ARM64 deployment targets.

macOS code signing and Hardened Runtime/library validation affect dynamically loaded code. Prefer properly signed packaged libraries rather than weakening runtime validation.

Rules:

- build x64 and ARM64 where promised;
- use a universal binary or correct architecture-specific asset;
- sign native binaries;
- preserve dSYMs for symbolication;
- test under the same sandbox/hardened-runtime conditions used for release.

---

# 66. Windows Integration

Current Flutter deployment support includes Windows x64 and ARM64.

Review:

- DLL architecture;
- exported names;
- dependency DLLs;
- C runtime choice;
- calling convention;
- secure load location.

### Calling conventions

On x86 Windows, declarations such as `__cdecl`, `__stdcall`, and `WINAPI` can affect ABI compatibility.

On x64/ARM64 Windows, the platform ABI largely standardizes the calling convention and older calling-convention keywords no longer represent the same x86 distinction. Still map the declared function and parameter types exactly.

### CRT ownership

Microsoft's runtime-link options matter when memory crosses module boundaries. Avoid allocating with one CRT/library allocator and freeing with another unless explicitly supported.

Remember that `package:ffi` `malloc` uses `CoTaskMemAlloc` on Windows, not the native library's arbitrary CRT heap.

### DLL search security

Do not load native libraries from an attacker-controlled working directory or search path.

Microsoft provides secure DLL search configuration such as `SetDefaultDllDirectories`. Package application-owned DLLs in controlled locations and resolve them deterministically.

---

# 67. Linux Integration

Linux typically uses `.so` shared objects and ELF dynamic linking.

Review:

- CPU architecture;
- SONAME;
- required symbol versions;
- transitive dependencies;
- RPATH/RUNPATH;
- glibc baseline;
- linker search behavior.

Linux `dlopen` follows a defined search process involving RPATH/RUNPATH, environment search paths, the loader cache, and system directories depending on the binary. Do not treat "the `.so` is beside my executable" as a universal loading rule.

Current Flutter deployment support includes Linux x64 and ARM64 on supported distributions.

### Compatibility rule

Build/test against the oldest Linux runtime baseline you promise to support or use an appropriately controlled build environment.

A library compiled against newer glibc symbol versions can fail on older systems even if CPU architecture matches.

---

# 68. Web

`dart:ffi` is not a Flutter web interoperability mechanism.

Flutter's architecture guidance explicitly distinguishes FFI on native targets from web interop.

If web matters, define a capability boundary:

```
abstract interface class ImageProcessor {
  Future<Uint8List> process(Uint8List input);
}

```

with:

```
native -> FFI implementation
web    -> pure Dart / JS / Wasm-compatible implementation

```

Use conditional imports/exports so `dart:ffi` code is not compiled into the web implementation.

Do not create fake browser FFI support with runtime `Platform.is...` branches.

---

# 69. Verified Platform Matrix

| PlatformDart FFITypical native formLoading/bundlingArchitecture concernsKey limitation |        |                                             |                              |                                             |                                                       |
| -------------------------------------------------------------------------------------- | ------ | ------------------------------------------- | ---------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Android                                                                                | Yes    | `.so` / code asset                          | Hooks or APK/AAB native libs | ARM64, Arm32, x64 in current Flutter matrix | Build/package each ABI; current page-size rules       |
| iOS                                                                                    | Yes    | static lib/framework/XCFramework/code asset | linked/bundled Apple binary  | ARM64 device + simulator variant(s)         | no Android-style arbitrary standalone dylib packaging |
| macOS                                                                                  | Yes    | `.dylib`, framework, static/code asset      | signed app bundle/code asset | x64 + ARM64                                 | signing/hardened runtime                              |
| Windows                                                                                | Yes    | `.dll` / code asset                         | controlled packaged DLL      | x64 + ARM64                                 | DLL search/CRT/calling-convention correctness         |
| Linux                                                                                  | Yes    | `.so` / code asset                          | ELF loader/code asset        | x64 + ARM64                                 | glibc/dependency/runtime baseline                     |
| Web                                                                                    | **No** | N/A                                         | N/A                          | JS/Wasm web target                          | use JS/web/pure-Dart alternative                      |

Flutter's current supported architecture matrix is documented by Flutter's deployment-support page.

---

# 70. Architecture Matrix

For a Flutter project that claims broad native support, evaluate at least:

| TargetNative artifact expectation |                                                     |
| --------------------------------- | --------------------------------------------------- |
| Android ARM64                     | `arm64-v8a` build                                   |
| Android ARM32                     | `armeabi-v7a` build if supported by product         |
| Android x64                       | `x86_64` build                                      |
| iOS device                        | ARM64                                               |
| iOS simulator                     | simulator-specific ARM64 and/or x86\_64 as required |
| macOS Apple Silicon               | ARM64                                               |
| macOS Intel                       | x64                                                 |
| Windows                           | x64 and/or ARM64 according to support               |
| Linux                             | x64 and/or ARM64 according to support               |

One `.so`, `.dll`, or Mach-O slice does not generally serve unrelated OS/CPU ABIs.

Never compile native code with host-only CPU features and assume it will run everywhere.

---

# 71. CPU Features and SIMD

If native code uses NEON, SSE, AVX, or other SIMD:

- compile only baseline features guaranteed by the target;
- runtime-detect optional extensions when necessary;
- provide a fallback;
- test on older hardware;
- avoid `-march=native` for distributable binaries unless build environment equals deployment target intentionally.

SIMD is an implementation optimization, not an FFI requirement.

Only introduce specialized dispatch when profiling proves value.

---

# 72. Boundary-Crossing Performance

Optimize the dominant component.

Break cost down into:

```
symbol resolution
Dart wrapper work
allocation
string encoding
buffer copying
FFI transition
native computation
native synchronization
callback/message delivery
result conversion
cleanup

```

A single FFI call can be cheap relative to a substantial native operation.

Thousands or millions of calls that each do trivial work can make the boundary significant.

Do not publish universal nanosecond thresholds.

---

# 73. Batch APIs

Bad conceptual API:

```
for (var y = 0; y < height; y++) {
  for (var x = 0; x < width; x++) {
    nativeSetPixel(x, y, pixels[y * width + x]);
  }
}

```

Improved C boundary:

```
int image_process_rgba(
    uint8_t* rgba,
    size_t byte_length,
    uint32_t width,
    uint32_t height);

```

Improved Dart:

```
@Native<Int32 Function(
  Pointer<Uint8>,
  Size,
  Uint32,
  Uint32,
)>(
  symbol: 'image_process_rgba',
)
external int imageProcessRgba(
  Pointer<Uint8> rgba,
  int byteLength,
  int width,
  int height,
);

```

One operation can amortize:

- FFI transitions;
- native allocation;
- argument validation;
- synchronization.

Batch only when the resulting native API remains maintainable.

---

# 74. Allocation Performance

Common hot-path mistake:

```
encode string
malloc struct
malloc input
call tiny function
free input
free struct
repeat

```

Optimization candidates:

- reuse context handles;
- use one contiguous input buffer;
- batch records;
- reuse a native scratch buffer if ownership and concurrency are explicit;
- move tight native loops behind one call.

Do not create a shared native buffer cache unless you can answer:

- who owns it;
- whether concurrent calls can use it;
- when it grows;
- when it shrinks;
- when it is freed;
- what happens across isolate shutdown.

---

# 75. Native Handle Reuse

Long-lived handles are useful when native initialization is expensive:

- codec contexts;
- ML inference sessions;
- database connections;
- cryptographic contexts;
- parser states.

But reuse requires:

- deterministic close;
- thread-affinity rules;
- synchronization;
- memory monitoring;
- recovery after native errors.

Do not turn every native handle into a process singleton.

---

# 76. `isLeaf`

Some FFI APIs allow a call to be marked `isLeaf`.

Use it only for functions that are genuinely short-running, non-blocking, and cannot call back into Dart or otherwise require VM interaction.

Current Dart documentation warns that inappropriate leaf calls can delay VM operations such as garbage collection/synchronization.

Do not add `isLeaf: true` as a generic "performance optimization."

Benchmark first.

---

# 77. Native Library Initialization

If the library has expensive global initialization:

- verify whether it is process-global or context-local;
- verify thread safety;
- initialize once only if its contract supports that;
- avoid blocking Flutter startup unnecessarily;
- separate initialization latency from steady-state benchmarks.

If initialization belongs to a worker isolate, initialize there.

Do not initialize on one native thread and use on another if the API is thread-affine.

---

# 78. Release-Mode Benchmarking

Flutter debug mode is deliberately unoptimized and differs significantly from production execution.

Use:

- profile mode for profiling;
- release/AOT builds for final latency/throughput measurements;
- optimized native compilation.

Flutter's performance documentation recommends profiling on a physical device using profile-mode tooling rather than interpreting debug timings as production performance.

Measure:

- p50/p95 latency;
- throughput;
- CPU utilization;
- native allocations;
- Dart allocations;
- copies;
- startup;
- peak memory.

---

# 79. Memory Profiling

Dart heap analysis does not fully account for arbitrary native allocations.

Track both:

```
Dart heap
native heap
mapped files
graphics/native accelerator memory where relevant

```

On Android/Linux, Perfetto's native heap tooling can profile `malloc`/`free` behavior in supported configurations.

Also use platform-native tooling appropriate to the target.

Do not conclude "no leak" from a stable Dart heap graph while RSS/native heap grows indefinitely.

---

# 80. Sanitizers

Use native sanitizers for risky native code when the platform/toolchain permits.

## AddressSanitizer

Useful for:

- buffer overrun;
- use-after-free;
- double free;
- invalid free.

Clang's AddressSanitizer is specifically designed for memory-error detection.

## UndefinedBehaviorSanitizer

Useful for native UB including:

- invalid shifts;
- misalignment;
- signed overflow;
- invalid bounds;
- null misuse in relevant configurations.

## ThreadSanitizer

Useful for native data races on supported targets.

### Rule

Sanitizer support differs by:

- OS;
- architecture;
- compiler;
- Flutter embedding/runtime;
- build mode.

When full Flutter integration is impractical, run the native library's standalone tests under sanitizers.

---

# 81. Native Crash Diagnostics

For every production native crash collect:

- native backtrace;
- architecture;
- OS;
- app version;
- native library version;
- native ABI version;
- operation being executed;
- relevant input size/type;
- dSYM/PDB/ELF symbol information;
- Dart stack if available.

A Dart stack ending at:

```
NativeEngine.process

```

may tell you only which boundary was crossed.

The native symbolicated stack is usually necessary to identify the fault.

---

# 82. Debug Symbols and Stripping

Production binaries can be stripped while retaining separate symbol files.

Preserve:

- Apple dSYMs;
- Windows PDBs;
- Android/Linux unstripped/debug-symbol artifacts as appropriate.

Android tooling supports packaging/uploading native debugging symbols for symbolication.

Do not delete the only symbols capable of resolving a production crash merely to reduce the shipped application size.

---

# 83. Native Link Optimization

Options such as:

- dead-code stripping;
- section garbage collection;
- symbol visibility;
- LTO;

can reduce binary size or improve optimization.

Use them only after:

- exports are explicitly preserved;
- runtime symbol lookup still works;
- all target toolchains support the configuration;
- release builds are tested.

LTO is not universally beneficial and introduces build/link complexity.

Do not assume Dart tree shaking automatically removes arbitrary native code.

On current Dart 3.12, do not depend on the future Dart 3.13 recorded-use native link-hook mechanism.

---

# 84. Security

FFI deliberately crosses out of Dart's managed memory-safety environment.

Threats include:

- memory corruption;
- use-after-free;
- double free;
- buffer overflow;
- integer overflow;
- ABI mismatch;
- unsafe parsing;
- malicious input;
- native dependency CVEs;
- insecure DLL/library loading;
- supply-chain compromise.

A security-sensitive wrapper must validate:

- buffer lengths;
- dimensions;
- offsets;
- counts;
- integer ranges;
- native status;
- null pointers.

Native code handling attacker-controlled binary formats should validate inputs too.

---

# 85. Native Dependency Supply Chain

For third-party native dependencies record:

```
upstream
version
source revision
license
download origin
checksum/signature
compiler
build flags
target ABIs
patches
known CVEs
upgrade procedure

```

Flutter's current native-code guidance explicitly recommends verifying downloaded prebuilt artifacts when using build hooks for closed-source/precompiled binaries.

Do not let a build script silently download and execute "latest" native binaries.

Prefer reproducible pinned inputs plus an explicit security update process.

---

# 86. Secrets

FFI does not make secret data automatically secure.

For keys/passwords:

- minimize copies;
- minimize lifetime;
- avoid logging;
- use a native secure-memory API if its guarantees are needed;
- use dedicated zeroization primitives when required;
- understand compiler optimization can invalidate naive manual clearing.

Do not advertise ordinary `malloc` memory as secure memory.

---

# 87. DLL / Library Search Security

Never use an untrusted user-supplied path for a library containing executable code unless executing arbitrary native code is explicitly the feature.

Windows is particularly sensitive to DLL preloading/search-order attacks. Microsoft provides APIs to constrain the default search directories.

On all platforms prefer:

- packaged application-controlled binaries;
- code assets;
- signed framework/bundle contents;
- trusted absolute paths where manual loading is necessary.

---

