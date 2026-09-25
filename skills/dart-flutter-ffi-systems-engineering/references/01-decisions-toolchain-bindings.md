# Source reference — FFI justification, toolchain/version gates, C ABI design, type mapping, ffigen, @Native, dynamic libraries, and build hooks

## Table of contents

- [Dart & Flutter FFI Systems Engineering](#dart-flutter-ffi-systems-engineering)
  - [Purpose](#purpose)
- [1. Current Toolchain Snapshot](#1-current-toolchain-snapshot)
    - [Version operating rule](#version-operating-rule)
- [2. Core Systems-Engineering Rules](#2-core-systems-engineering-rules)
- [3. When FFI Is Appropriate](#3-when-ffi-is-appropriate)
    - [Do not introduce FFI merely because native code exists](#do-not-introduce-ffi-merely-because-native-code-exists)
- [4. When FFI Should Be Avoided](#4-when-ffi-should-be-avoided)
- [5. FFI vs Pure Dart vs Platform Channels](#5-ffi-vs-pure-dart-vs-platform-channels)
    - [Rule](#rule)
- [6. FFI vs Pure Dart Performance](#6-ffi-vs-pure-dart-performance)
- [7. Responsibility Boundaries](#7-responsibility-boundaries)
  - [`dart:ffi`](#dartffi)
  - [`package:ffi`](#packageffi)
  - [`package:ffigen`](#packageffigen)
  - [Native build tooling](#native-build-tooling)
  - [Safe wrapper](#safe-wrapper)
- [8. Recommended Architecture](#8-recommended-architecture)
- [9. The C ABI Boundary](#9-the-c-abi-boundary)
    - [C++ wrapper rule](#c-wrapper-rule)
- [10. ABI Fundamentals](#10-abi-fundamentals)
    - [Never assume C `long` is 64-bit](#never-assume-c-long-is-64-bit)
    - [Never assume all booleans are C `bool`](#never-assume-all-booleans-are-c-bool)
- [11. Native Type Selection](#11-native-type-selection)
    - [Integer narrowing](#integer-narrowing)
- [12. Exact Function Signatures](#12-exact-function-signatures)
- [13. `ffigen`](#13-ffigen)
  - [Modern minimal generator](#modern-minimal-generator)
    - [Generator rules](#generator-rules)
- [14. Generated Binding vs Safe Wrapper](#14-generated-binding-vs-safe-wrapper)
- [15. Modern `@Native` Binding](#15-modern-native-binding)
    - [Important version note](#important-version-note)
- [16. Handwritten Symbol Lookup](#16-handwritten-symbol-lookup)
- [17. Dynamic Libraries](#17-dynamic-libraries)
    - [Legacy/manual loader example](#legacymanual-loader-example)
- [18. Native Assets / Build Hooks](#18-native-assets-build-hooks)
    - [Build-hook example](#build-hook-example)
    - [Native-asset decision](#native-asset-decision)
    - [Dart 3.13 warning](#dart-313-warning)

---
# Dart & Flutter FFI Systems Engineering

## Purpose

This skill teaches an AI coding agent how to design, implement, review, optimize, debug, test, package, and maintain production Dart/Flutter native integrations using `dart:ffi`, `package:ffi`, `package:ffigen`, Dart build hooks/code assets, and native C/C++ libraries.

It implements the supplied Dart FFI research brief.

> **FFI is a systems-programming boundary. Treat every pointer, allocation, callback, ABI assumption, and ownership decision as potentially unsafe until its lifetime and contract are proven.**

The central engineering principle is:

> **Design FFI as a narrow, explicit systems boundary. Match the native ABI exactly, make ownership and threading contracts visible, generate bindings where possible, keep raw pointers behind a safe Dart wrapper, minimize allocations/copies/boundary crossings, and validate performance and memory safety on every supported architecture.**

Do not treat FFI like ordinary Dart API usage. Compilation, successful symbol resolution, or one successful native call does not establish correctness.

---

# 1. Current Toolchain Snapshot

Research snapshot: **2026-08-10**.

Current relevant versions and constraints:

| ComponentCurrent statusImportant constraint        |                                              |                                      |
| -------------------------------------------------- | -------------------------------------------- | ------------------------------------ |
| `package:ffi`                                      | **2.2.0**                                    | Minimum Dart SDK **3.7**             |
| `package:ffigen`                                   | **21.0.0**                                   | Minimum Dart SDK **3.10**            |
| Dart docs/runtime reference                        | **Dart 3.12.2**                              | Current official docs reflect 3.12.2 |
| Dart build hooks                                   | Available                                    | Introduced in Dart 3.10              |
| Dart link hooks / recorded-use native tree shaking | **Not part of current stable Dart 3.12**     | Documented for Dart 3.13             |
| Flutter FFI package workflow                       | `package_ffi` recommended since Flutter 3.38 | Uses build hooks/code assets         |
| Web                                                | `dart:ffi` unsupported                       | Use a web-specific implementation    |

`package:ffi` 2.2.0 is the current stable package release and declares Dart 3.7 as its minimum SDK. Current `ffigen` is 21.0.0; its modern configuration API requires Dart 3.10+. Dart's official documentation currently reflects Dart 3.12.2.

Flutter recommends the `package_ffi` template since Flutter 3.38. The generated package uses build hooks to build and bundle native code and generated `@Native()` declarations to resolve its code asset.

Dart build hooks were introduced in Dart 3.10. Link hooks and recorded-use native tree shaking are documented as Dart 3.13 functionality; do not assume they exist when targeting current stable Dart 3.12.

### Version operating rule

Before modifying any FFI repository:

1. Read `pubspec.yaml`.
2. Read `pubspec.lock`.
3. Determine the actual Flutter and Dart SDK used by CI.
4. Determine the installed `ffi` and `ffigen` versions.
5. Inspect generated binding headers/comments for generator version.
6. Inspect native build hooks or platform build files.
7. Do not silently introduce APIs requiring a newer SDK.
8. Do not migrate a stable binding/build strategy solely because a newer one exists.

A repository on Dart 3.7–3.9 can use current `ffi` but cannot automatically adopt the Dart 3.10+ build-hook/`ffigen` 21 workflow without raising its toolchain floor.

---

# 2. Core Systems-Engineering Rules

An AI agent working on FFI must obey these rules:

- Inspect the C-facing header before modifying Dart bindings.
- Never guess an ABI type.
- Match every native function signature exactly.
- Prefer generated bindings for non-trivial native APIs.
- Keep generated bindings separate from the safe application API.
- Keep raw pointers out of UI and domain layers.
- Define ownership before allocating, retaining, viewing, or freeing memory.
- Match every allocation with its documented deallocator.
- Never free borrowed memory.
- Never access memory after its owner has released it.
- Never let a native-memory-backed Dart view outlive native memory.
- Check nullable pointer returns before dereferencing them.
- Validate lengths, capacities, offsets, counts, and integer ranges.
- Resolve frequently used symbols once.
- Do not repeatedly allocate native strings in hot loops without measurement.
- Batch tiny calls where API design permits.
- Avoid unnecessary copies, but never trade clear lifetime guarantees for speculative zero-copy gains.
- Do not block Flutter's UI isolate with long-running synchronous native work.
- Verify the native library's thread contract before moving work to another isolate.
- Choose callback APIs based on the exact native calling thread.
- Keep callbacks alive while native code may call them.
- Stop/unregister callbacks before closing their Dart callback trampoline.
- Never allow C++ exceptions to cross a C FFI boundary.
- Do not expect Dart `try/catch` to recover from a segfault or corrupted native stack.
- Build and test every supported ABI.
- Benchmark optimized native code in profile/release conditions.
- Profile native allocations separately from the Dart heap.
- Retain native symbol files needed to diagnose production crashes.
- Use FFI only when its benefits justify the safety, portability, build, and maintenance cost.

---

# 3. When FFI Is Appropriate

FFI is appropriate when there is a compelling C-compatible native capability or workload, such as:

- an existing C library;
- a C-compatible interface around a C++ library;
- codecs;
- cryptographic libraries;
- database engines;
- scientific computing;
- numerical kernels;
- image/audio/video processing;
- compression;
- native parsers;
- reusable cross-platform native algorithms;
- a performance-sensitive operation that benchmarks materially better in native code.

Dart's official C interoperability mechanism is `dart:ffi`. It can invoke native C APIs and access native memory on Dart Native platforms.

### Do not introduce FFI merely because native code exists

Before adding FFI, answer:

1. Why is native code required?
2. Could pure Dart solve the workload adequately?
3. Is there an established Flutter plugin?
4. Is the target API actually C-compatible?
5. Has any claimed performance benefit been measured?
6. Does the maintenance burden justify the gain?
7. Is web required?
8. Can the native implementation be built for every required target?

If those questions have weak answers, do not introduce FFI.

---

# 4. When FFI Should Be Avoided

Prefer something else when:

- a stable Flutter/Dart API already solves the problem;
- a maintained platform plugin exposes the required feature;
- the API is primarily Java/Kotlin, Swift, Objective-C, or platform UI state;
- the task requires rich asynchronous platform lifecycle integration rather than a C ABI;
- native code would only replace trivial Dart control logic;
- marshaling or copying costs dominate the computation;
- native build/toolchain maintenance outweighs expected value;
- the application must run on Flutter web and no alternate implementation is planned.

FFI does not make arbitrary platform APIs directly callable. It is fundamentally a C ABI interoperation mechanism.

---

# 5. FFI vs Pure Dart vs Platform Channels

Flutter platform channels serialize messages between Dart and host-language code, whereas FFI calls a native ABI directly. Flutter documentation notes that avoiding message serialization can make FFI substantially faster for appropriate workloads, but this is not a universal performance guarantee.

| DimensionPure DartDart FFIPlatform channel / plugin |                           |                                     |                                                |
| --------------------------------------------------- | ------------------------- | ----------------------------------- | ---------------------------------------------- |
| Native language requirement                         | None                      | C-compatible ABI                    | Kotlin/Java, Swift/ObjC, host APIs             |
| Boundary overhead                                   | None                      | Direct native call plus conversions | Message encoding, dispatch, decoding           |
| Memory safety                                       | Highest                   | Native memory unsafe                | Host/native side still unsafe where applicable |
| Build complexity                                    | Lowest                    | Native toolchain required           | Plugin/platform build required                 |
| Portability                                         | Dart-supported targets    | Native FFI targets only             | Per-platform implementation                    |
| Web                                                 | Native                    | No `dart:ffi`                       | Web plugin/JS implementation possible          |
| Best for                                            | General application logic | C libraries, compute-heavy kernels  | Platform SDKs, OS services, host APIs          |
| Thread model                                        | Dart isolates             | Native API contract                 | Platform-channel/runtime contract              |
| Debugging                                           | Dart tools                | Dart + native debugger/symbols      | Dart + host debugger                           |
| ABI risk                                            | None                      | High                                | Usually hidden behind platform API             |
| Ideal API granularity                               | Normal Dart functions     | Coarse enough to justify crossing   | Coarse asynchronous platform operations        |

### Rule

Do not say "FFI is faster."

Say:

> FFI removes platform-message serialization and provides a direct native ABI call. Whether the application is faster depends on call frequency, data conversion, copying, allocation, native computation, and threading.

---

# 6. FFI vs Pure Dart Performance

Benchmark before replacing Dart code.

Native code may fail to improve performance when:

- individual calls do almost no work;
- calls occur millions of times;
- each call allocates temporary native memory;
- UTF conversion dominates;
- data must be copied into and out of native buffers;
- native implementation is unoptimized;
- Dart implementation is already efficient;
- work is I/O-bound rather than CPU-bound.

Measure end-to-end:

```
Dart caller
  -> argument validation
  -> Dart/native conversion
  -> allocation
  -> copy
  -> FFI transition
  -> native computation
  -> FFI transition
  -> copy/decoding
  -> cleanup
  -> Dart result

```

Never benchmark only the middle native function and call that the application speedup.

---

# 7. Responsibility Boundaries

## `dart:ffi`

`dart:ffi` is the Dart language/runtime foreign-function interface. It defines native types, pointers, functions, structs, unions, callbacks, dynamic libraries, finalizers, `@Native`, and related ABI primitives.

## `package:ffi`

`package:ffi` supplies utilities layered on `dart:ffi`, including:

- `malloc`;
- `calloc`;
- `Arena`;
- zoned arenas;
- UTF-8 helpers;
- UTF-16 helpers;
- common convenience extensions.

It does **not** replace `dart:ffi`.

## `package:ffigen`

`ffigen` parses supported headers and generates low-level Dart bindings. Current `ffigen` uses libclang and supports C-family interop generation, with current documentation explicitly describing C-header parsing rather than direct C++ header binding.

## Native build tooling

The native build produces machine code for each target ABI. In current Flutter FFI packages, build hooks plus `native_toolchain_c` can build and bundle source-based native assets automatically.

## Safe wrapper

The safe Dart wrapper owns:

- validation;
- allocation;
- ownership;
- conversion;
- cleanup;
- error translation;
- handle lifecycle;
- callback lifecycle;
- application-facing models.

---

# 8. Recommended Architecture

Use:

```
application / domain
        |
        v
safe Dart API
        |
        v
generated raw FFI bindings
        |
        v
small stable C ABI
        |
        v
native implementation

```

Application code should rarely touch:

- `Pointer<T>`;
- `malloc`;
- `calloc`;
- native struct instances;
- raw error codes;
- function pointers;
- `DynamicLibrary`.

Do not create needless layers such as:

```
NativeRepository
 -> NativeUseCase
 -> NativeManager
 -> FfiService
 -> BindingsFacade
 -> GeneratedBindings

```

Usually two boundary layers are sufficient:

1. generated/raw binding;
2. safe Dart wrapper.

---

# 9. The C ABI Boundary

Design around a stable C ABI where possible.

For a C++ implementation, expose a small `extern "C"` interface.

Prefer:

```
typedef struct engine engine_t;

int engine_create(engine_t** out_engine);
int engine_process(
    engine_t* engine,
    const uint8_t* input,
    size_t input_len,
    uint8_t* output,
    size_t output_capacity,
    size_t* output_len);
void engine_destroy(engine_t* engine);

```

Avoid crossing the boundary with:

- C++ classes;
- `std::string`;
- `std::vector`;
- templates;
- overloaded symbols;
- exceptions;
- compiler-dependent C++ objects.

`ffigen`'s current documentation is centered on header generation for C-family interfaces, and direct C++ ABI binding should not be treated as a portable contract.

### C++ wrapper rule

```
extern "C" int engine_run(engine_t* engine) noexcept {
  try {
    return engine->impl.run();
  } catch (const std::exception& e) {
    engine_set_last_error(engine, e.what());
    return ENGINE_ERROR_EXCEPTION;
  } catch (...) {
    engine_set_last_error(engine, "unknown native exception");
    return ENGINE_ERROR_EXCEPTION;
  }
}

```

Never permit a C++ exception to unwind through Dart-generated FFI frames.

---

# 10. ABI Fundamentals

ABI correctness is non-negotiable.

For every declaration verify:

- integer width;
- signedness;
- pointer width;
- alignment;
- padding;
- calling convention;
- struct field order;
- union size;
- enum representation;
- return convention;
- variadic arguments;
- platform-specific typedefs.

Dart exposes fixed-width and ABI-specific native integer marker types. The official C interop documentation includes `IntPtr`, `UintPtr`, `Size`, `Long`, `UnsignedLong`, `WChar`, and related ABI-specific types.

### Never assume C `long` is 64-bit

For example, `long` differs between common 64-bit POSIX ABIs and 64-bit Windows. Use the Dart FFI native type corresponding to the actual header type rather than replacing `long` with `Int64` by intuition.

### Never assume all booleans are C `bool`

- C `_Bool`/`bool` maps to `Bool`.
- Win32 `BOOL` is an `int`-sized type.
- Other APIs use bytes or bit flags.

Microsoft defines Win32 `BOOL` as an integer type, so mapping it to Dart FFI `Bool` would be wrong.

---

# 11. Native Type Selection

Use the declaration from the header.

| Native declarationTypical Dart FFI native type |                                           |
| ---------------------------------------------- | ----------------------------------------- |
| `int8_t`                                       | `Int8`                                    |
| `uint8_t`                                      | `Uint8`                                   |
| `int16_t`                                      | `Int16`                                   |
| `uint16_t`                                     | `Uint16`                                  |
| `int32_t`                                      | `Int32`                                   |
| `uint32_t`                                     | `Uint32`                                  |
| `int64_t`                                      | `Int64`                                   |
| `uint64_t`                                     | `Uint64`                                  |
| `float`                                        | `Float`                                   |
| `double`                                       | `Double`                                  |
| `intptr_t`                                     | `IntPtr`                                  |
| `uintptr_t`                                    | `UintPtr`                                 |
| `size_t`                                       | `Size`                                    |
| `long`                                         | `Long`                                    |
| `unsigned long`                                | `UnsignedLong`                            |
| `wchar_t`                                      | `WChar`                                   |
| C `bool`                                       | `Bool`                                    |
| `void*`                                        | `Pointer<Void>`                           |
| opaque `foo_t*`                                | `Pointer<Foo>` where `Foo extends Opaque` |

`Size` follows `size_t` pointer-width semantics, while `WChar` is ABI-specific and must not be assumed to mean UTF-16 on every OS.

### Integer narrowing

If application input can exceed the native type range, validate it before calling native code.

```
int requireUint32(int value, String name) {
  if (value < 0 || value > 0xFFFFFFFF) {
    throw RangeError.range(value, 0, 0xFFFFFFFF, name);
  }
  return value;
}

```

Never rely on accidental truncation for user-controlled values.

---

# 12. Exact Function Signatures

For:

```
uint32_t checksum(const uint8_t* bytes, size_t length);

```

the handwritten signature is:

```
typedef _ChecksumNative = Uint32 Function(
  Pointer<Uint8>,
  Size,
);

typedef _ChecksumDart = int Function(
  Pointer<Uint8>,
  int,
);

```

Do not substitute `Int64` for `Size`, `Int32` for `Uint32`, or an untyped pointer merely because the code compiles.

A mismatched function signature can cause:

- wrong register interpretation;
- truncated arguments;
- invalid return values;
- stack corruption;
- register corruption;
- undefined behavior;
- native crashes.

---

# 13. `ffigen`

For a non-trivial API, generate bindings.

Do not manually maintain hundreds of signatures.

Current `ffigen` 21 provides a Dart configuration API and documents YAML as still supported but expected to be phased out eventually. Existing generated Flutter FFI templates can still contain `ffigen.yaml`; do not gratuitously migrate a working repository.

## Modern minimal generator

`tool/ffigen.dart`:

```
import 'dart:io';

import 'package:ffigen/ffigen.dart';

void main() {
  final packageRoot = Platform.script.resolve('../');

  FfiGenerator(
    output: Output(
      dartFile: packageRoot.resolve('lib/src/native_api.g.dart'),
    ),
    headers: Headers(
      entryPoints: <Uri>[
        packageRoot.resolve('src/native_api.h'),
      ],
    ),
    functions: Functions.includeSet(<String>{
      'engine_create',
      'engine_process',
      'engine_destroy',
    }),
  ).generate();
}

```

Run:

```
dart run tool/ffigen.dart

```

Current `ffigen` documentation recommends this Dart API style.

### Generator rules

- Commit or reproducibly regenerate generated output according to repository policy.
- Pin generator versions.
- Regenerate whenever headers change.
- Review generated diffs.
- Do not edit generated files manually.
- Verify macros/inline APIs that do not become runtime symbols.
- Treat native enum representation carefully; C enum storage can be implementation-dependent. `ffigen` documents this explicitly.
- For packing pragmas or unusual compiler attributes, verify the generated layout with native ABI tests.
- Keep generated names mechanical; expose idiomatic names from the safe wrapper.

---

# 14. Generated Binding vs Safe Wrapper

Generated code is not the application API.

Bad architecture:

```
final Pointer<EngineNative> handle = engine_create();
final Pointer<Uint8> data = malloc(1024);

```

in a widget, repository, or view model.

Preferred:

```
final engine = Engine.open();
try {
  final result = engine.process(input);
} finally {
  engine.close();
}

```

The wrapper is responsible for proving:

- pointer ownership;
- handle state;
- deallocator identity;
- buffer size;
- nullability;
- errors;
- threading.

---

# 15. Modern `@Native` Binding

Flutter's current `package_ffi` workflow builds a code asset and generates `@Native()` external declarations resolved against that asset.

Native header:

```
#include <stdint.h>

int32_t native_add(int32_t a, int32_t b);

```

Representative generated binding:

```
import 'dart:ffi';

@Native<Int32 Function(Int32, Int32)>(
  symbol: 'native_add',
)
external int nativeAdd(int a, int b);

```

Do not normally hand-author generated declarations when `ffigen` can derive them.

`Native.addressOf` can retrieve the address of an implementation bound with `@Native`, including when a function pointer is required for an API such as `NativeFinalizer`.

### Important version note

The current Dart API reference still marks `Native` as an experimental API surface even though current Flutter tooling uses generated `@Native()` declarations in the recommended FFI package workflow. Treat the exact annotation API as version-sensitive and keep generated code reproducible.

---

# 16. Handwritten Symbol Lookup

Handwritten lookup is still valid for small APIs, system libraries, closed-source binaries, or repositories that intentionally use `DynamicLibrary`.

```
import 'dart:ffi';

typedef _MultiplyNative = Int32 Function(Int32, Int32);
typedef _MultiplyDart = int Function(int, int);

final class LegacyMathBindings {
  LegacyMathBindings(DynamicLibrary library)
      : multiply = library.lookupFunction<_MultiplyNative, _MultiplyDart>(
          'native_multiply',
        );

  final _MultiplyDart multiply;
}

```

Resolve the symbol once when constructing bindings.

Do not do this:

```
for (final item in items) {
  library.lookupFunction<_MultiplyNative, _MultiplyDart>(
    'native_multiply',
  )(item, 2);
}

```

`DynamicLibrary.lookupFunction` and `Pointer<NativeFunction<T>>.asFunction` remain current APIs.

---

# 17. Dynamic Libraries

Current `DynamicLibrary` provides mechanisms including:

- `DynamicLibrary.open`;
- `DynamicLibrary.process`;
- `DynamicLibrary.executable`;
- `lookup`;
- `lookupFunction`;
- `providesSymbol`;
- `close`.

`process()` exposes symbols globally available to the process, while `executable()` targets symbols in the executable.

Do not assume one loading mechanism fits every platform.

### Legacy/manual loader example

```
import 'dart:ffi';
import 'dart:io';

DynamicLibrary loadNativeLibrary({
  String? desktopAbsolutePath,
}) {
  if (Platform.isIOS) {
    // Appropriate when required symbols are linked into the app/framework
    // and exported into the process.
    return DynamicLibrary.process();
  }

  if (Platform.isAndroid) {
    // Only appropriate when packaging guarantees this SONAME is present.
    return DynamicLibrary.open('libnative_engine.so');
  }

  if (Platform.isLinux || Platform.isMacOS || Platform.isWindows) {
    final path = desktopAbsolutePath;
    if (path == null || !File(path).isAbsolute) {
      throw ArgumentError.value(
        path,
        'desktopAbsolutePath',
        'A trusted absolute packaged-library path is required.',
      );
    }
    return DynamicLibrary.open(path);
  }

  throw UnsupportedError(
    'Native FFI is not available on ${Platform.operatingSystem}.',
  );
}

```

For new source-built Flutter FFI packages, prefer code assets/build hooks instead of inventing OS-specific loader code.

---

# 18. Native Assets / Build Hooks

The current terminology in Dart documentation is **build hooks** and **code assets**. Build hooks can compile or download native assets and make them available to Dart code.

The current Flutter FFI package template uses:

```
src/
  native_api.c
  native_api.h

hook/
  build.dart

lib/
  native_api.dart
  native_api_bindings_generated.dart

```

Flutter's template uses `native_toolchain_c` so standard native source packages do not need separate Android CMake, iOS podspec, Linux CMake, and Windows CMake files solely for the native compilation step.

### Build-hook example

```
import 'package:hooks/hooks.dart';
import 'package:native_toolchain_c/native_toolchain_c.dart';

Future<void> main(List<String> args) async {
  await build(args, (input, output) async {
    await CBuilder.library(
      name: 'native_engine',
      assetName: 'native_engine_bindings_generated.dart',
      sources: <String>[
        'src/native_engine.c',
      ],
    ).run(
      input: input,
      output: output,
    );
  });
}

```

Follow the versions and APIs already pinned by the repository; hook package APIs are version-sensitive.

### Native-asset decision

Use build hooks when:

- the toolchain supports them;
- the package owns native source;
- a dependency can be reproducibly downloaded/built;
- you want code asset resolution rather than manual platform loading.

Do not force them when:

- the repository must support pre-Dart-3.10 toolchains;
- existing platform build configuration has essential custom behavior;
- integration requires Flutter Plugin APIs;
- Android requires a plugin-specific runtime such as Google Play services;
- migration cost outweighs benefit.

Flutter specifically advises using the standard plugin template when Flutter Plugin API or Google Play services runtime configuration is required.

### Dart 3.13 warning

Do not depend on link hooks or recorded-use native tree shaking while the project remains on Dart 3.12. Those features are documented for Dart 3.13.

---

