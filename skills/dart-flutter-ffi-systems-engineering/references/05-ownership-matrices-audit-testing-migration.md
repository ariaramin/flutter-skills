# Source reference — Ownership examples/matrices, checklists, repository audit, testing, fuzzing, migration, anti-patterns, workflow, completion criteria, evidence rules, and sources

## Table of contents

- [88. Bad vs Improved Ownership](#88-bad-vs-improved-ownership)
  - [Anti-pattern](#anti-pattern)
  - [Improved](#improved)
- [89. Memory Ownership Matrix](#89-memory-ownership-matrix)
- [90. Allocation Strategy Table](#90-allocation-strategy-table)
- [91. String Strategy Table](#91-string-strategy-table)
- [92. Callback Strategy Table](#92-callback-strategy-table)
- [93. Performance Checklist](#93-performance-checklist)
- [94. Memory-Safety Checklist](#94-memory-safety-checklist)
- [95. Concurrency Checklist](#95-concurrency-checklist)
- [96. Build Checklist](#96-build-checklist)
- [97. Security Checklist](#97-security-checklist)
- [98. Repository Reconnaissance](#98-repository-reconnaissance)
- [99. Existing-Code Audit](#99-existing-code-audit)
- [100. Testing Strategy](#100-testing-strategy)
  - [Dart wrapper unit tests](#dart-wrapper-unit-tests)
  - [Native unit tests](#native-unit-tests)
  - [ABI tests](#abi-tests)
  - [Integration tests](#integration-tests)
  - [Failure tests](#failure-tests)
  - [Sanitizer tests](#sanitizer-tests)
  - [Performance tests](#performance-tests)
- [101. ABI Test Example](#101-abi-test-example)
- [102. Fuzz Testing](#102-fuzz-testing)
- [103. Migration Guidance](#103-migration-guidance)
  - [Legacy `plugin_ffi` → `package_ffi`](#legacy-pluginffi-packageffi)
  - [Dynamic lookup → generated `@Native`](#dynamic-lookup-generated-native)
  - [`ffigen.yaml` → Dart API](#ffigenyaml-dart-api)
  - [Old callback tutorials](#old-callback-tutorials)
  - [Old Apple guidance](#old-apple-guidance)
  - [Future Dart 3.13 features](#future-dart-313-features)
- [104. Anti-Patterns](#104-anti-patterns)
    - [FFI without justification](#ffi-without-justification)
    - [Large handwritten bindings](#large-handwritten-bindings)
    - [Guessing integer types](#guessing-integer-types)
    - [Assuming all booleans are `Bool`](#assuming-all-booleans-are-bool)
    - [Assuming struct layout](#assuming-struct-layout)
    - [Allocator mismatch](#allocator-mismatch)
    - [Freeing borrowed data](#freeing-borrowed-data)
    - [Missing free](#missing-free)
    - [Native view after free](#native-view-after-free)
    - [Unchecked null pointer](#unchecked-null-pointer)
    - [Trusting native length](#trusting-native-length)
    - [Repeated symbol lookup](#repeated-symbol-lookup)
    - [Repeated UTF allocation](#repeated-utf-allocation)
    - [Tiny FFI operations](#tiny-ffi-operations)
    - [UI-isolate blocking](#ui-isolate-blocking)
    - [Blind isolate migration](#blind-isolate-migration)
    - [Wrong callback mechanism](#wrong-callback-mechanism)
    - [Callback closed too early](#callback-closed-too-early)
    - [C++ exceptions escaping](#c-exceptions-escaping)
    - [Dart `try/catch` as crash protection](#dart-trycatch-as-crash-protection)
    - [Hardcoded library paths](#hardcoded-library-paths)
    - [Missing architecture artifacts](#missing-architecture-artifacts)
    - [Debug benchmarking](#debug-benchmarking)
    - [Dart-only memory profiling](#dart-only-memory-profiling)
    - [Finalizer-only cleanup](#finalizer-only-cleanup)
    - [Raw pointers in UI/domain layers](#raw-pointers-in-uidomain-layers)
    - [Web runtime checks around `dart:ffi`](#web-runtime-checks-around-dartffi)
- [105. Required Decision Framework](#105-required-decision-framework)
- [106. Implementation Workflow](#106-implementation-workflow)
  - [Step 1 — Inspect](#step-1-inspect)
  - [Step 2 — Justify FFI](#step-2-justify-ffi)
  - [Step 3 — Define the ABI](#step-3-define-the-abi)
  - [Step 4 — Define ownership](#step-4-define-ownership)
  - [Step 5 — Define threading](#step-5-define-threading)
  - [Step 6 — Generate bindings](#step-6-generate-bindings)
  - [Step 7 — Verify bindings](#step-7-verify-bindings)
  - [Step 8 — Build the safe wrapper](#step-8-build-the-safe-wrapper)
  - [Step 9 — Implement deterministic cleanup](#step-9-implement-deterministic-cleanup)
  - [Step 10 — Minimize boundary crossings](#step-10-minimize-boundary-crossings)
  - [Step 11 — Configure native builds](#step-11-configure-native-builds)
  - [Step 12 — Validate errors](#step-12-validate-errors)
  - [Step 13 — Test ABI](#step-13-test-abi)
  - [Step 14 — Test memory safety](#step-14-test-memory-safety)
  - [Step 15 — Test callbacks/concurrency](#step-15-test-callbacksconcurrency)
  - [Step 16 — Profile](#step-16-profile)
  - [Step 17 — Validate release packaging](#step-17-validate-release-packaging)
- [107. Completion Criteria](#107-completion-criteria)
- [108. Source-of-Truth Priority](#108-source-of-truth-priority)
- [109. Evidence Classification](#109-evidence-classification)
- [110. Review Heuristic](#110-review-heuristic)
- [111. Final Operating Principle](#111-final-operating-principle)
- [Source References](#source-references)
- [Compact Agent Commandment](#compact-agent-commandment)

---
# 88. Bad vs Improved Ownership

## Anti-pattern

```
Pointer<Uint8> getBuffer() {
  return nativeAllocateBuffer();
}

```

Problems:

- caller does not know owner;
- no length;
- no release function;
- raw pointer leaks out of integration layer.

## Improved

```
import 'dart:ffi';
import 'dart:typed_data';

final class NativeOwnedBuffer {
  NativeOwnedBuffer._(
    this._pointer,
    this.length,
  );

  Pointer<Uint8> _pointer;
  final int length;
  bool _closed = false;

  factory NativeOwnedBuffer.allocate() {
    final lengthOut = nativeBufferLengthOut();
    try {
      final pointer = nativeAllocateBuffer(lengthOut);
      if (pointer == nullptr) {
        throw StateError('nativeAllocateBuffer returned NULL');
      }

      final length = lengthOut.value;
      return NativeOwnedBuffer._(pointer, length);
    } finally {
      nativeReleaseLengthOut(lengthOut);
    }
  }

  Uint8List copyToDart() {
    _ensureOpen();
    return Uint8List.fromList(_pointer.asTypedList(length));
  }

  void _ensureOpen() {
    if (_closed) {
      throw StateError('NativeOwnedBuffer is closed');
    }
  }

  void close() {
    if (_closed) {
      return;
    }

    _closed = true;
    nativeFreeBuffer(_pointer);
    _pointer = nullptr.cast<Uint8>();
  }
}

```

The exact `nativeBufferLengthOut`/release API should ordinarily be replaced by generated bindings matching the actual native library; the important design property is that ownership, length, and release live in one abstraction.

---

# 89. Memory Ownership Matrix

| ScenarioMemory sourceOwnerValid lifetimeRelease |                            |                                   |                                            |                                        |
| ----------------------------------------------- | -------------------------- | --------------------------------- | ------------------------------------------ | -------------------------------------- |
| Dart temporary input                            | `malloc`/`calloc`          | Dart wrapper                      | call only unless native explicitly retains | matching package allocator             |
| Native-owned result                             | native library             | Dart after transfer, if specified | until wrapper releases                     | library-provided free                  |
| Borrowed native result                          | native library             | native                            | documented window                          | never free from Dart                   |
| Opaque handle                                   | native factory             | wrapper logically owns handle     | create→close                               | library destroy function               |
| Native-memory typed view                        | existing native allocation | allocation owner                  | no longer than allocation                  | view has no independent release        |
| Callback trampoline                             | Dart `NativeCallable`      | Dart registration object          | while native can invoke                    | unregister/stop, then `close()`        |
| Callback userdata                               | contract-dependent         | explicitly documented owner       | through last possible callback             | matching owner/deallocator             |
| Native stack pointer                            | native caller              | native stack frame                | callback/call only                         | never free; never retain               |
| Static C string                                 | native library/process     | native                            | typically library/process lifetime         | never free unless documented otherwise |

This table should be extended for every project-specific pointer type.

---

# 90. Allocation Strategy Table

| StrategyInitializationOwnerCleanupTypical use |                                        |                   |                            |                                                             |
| --------------------------------------------- | -------------------------------------- | ----------------- | -------------------------- | ----------------------------------------------------------- |
| Native stack/caller-owned memory              | Native-defined                         | native caller     | automatic on native return | temporary native implementation only; never escape lifetime |
| `malloc`                                      | uninitialized                          | Dart wrapper      | `malloc.free`              | fully initialized temporary buffers                         |
| `calloc`                                      | zeroed                                 | Dart wrapper      | `calloc.free`              | APIs requiring zero-init                                    |
| `Arena`                                       | allocator-dependent; defaults `calloc` | arena             | `releaseAll`               | several same-scope resources                                |
| Native library allocation                     | library-specific                       | contract-specific | library release function   | output buffers/opaque objects                               |

Dart FFI does not expose a general-purpose Dart-side C stack allocator. Do not invent one.

---

# 91. String Strategy Table

| StrategyAllocation/copyOwnerTypical use |                                   |                          |                              |
| --------------------------------------- | --------------------------------- | ------------------------ | ---------------------------- |
| Dart → UTF-8 temporary                  | encodes + allocates native memory | Dart                     | portable UTF-8 C API         |
| Dart → UTF-16 temporary                 | encodes + allocates               | Dart                     | APIs explicitly using UTF-16 |
| Native-owned UTF-8 result               | decode copies to Dart string      | native/Dart per contract | native generated message     |
| Borrowed native string                  | decode while pointer valid        | native                   | status/static metadata       |
| Cached native immutable string          | one allocation, long lifetime     | explicit wrapper         | measured hot path only       |

Never infer ownership from encoding.

---

# 92. Callback Strategy Table

| NeedMechanism                                                                     |                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------- |
| Static/top-level callback, same isolate thread, legacy/simple                     | `Pointer.fromFunction`                      |
| Closure/function, synchronous same-thread callback                                | `NativeCallable.isolateLocal`               |
| Callback from arbitrary native worker thread, no synchronous return               | `NativeCallable.listener`                   |
| Experimental isolate-group callback behavior specifically required and SDK-pinned | evaluate `NativeCallable.isolateGroupBound` |

Never select a callback API without documenting native callback thread behavior first.

---

# 93. Performance Checklist

Before approving FFI performance work:

-  Is FFI justified by measured need or native capability?
-  Are non-trivial bindings generated?
-  Are symbols resolved once?
-  Are tiny calls batched where appropriate?
-  Are strings being repeatedly encoded?
-  Are temporary native allocations excessive?
-  Are buffers copied unnecessarily?
-  Could one native operation consume a complete batch?
-  Does data bounce Dart→native→Dart→native between pipeline stages?
-  Is long-running native work blocking the UI isolate?
-  Is the native library already multithreaded?
-  Are isolates oversubscribing CPU?
-  Are expensive contexts reused safely?
-  Are large native allocations deterministically freed?
-  Are both Dart and native memory measured?
-  Is an `isLeaf` optimization actually valid and benchmarked?
-  Are benchmarks running optimized native code?
-  Are measurements from profile/release rather than debug?
-  Is end-to-end latency measured, including conversion/copy?

---

# 94. Memory-Safety Checklist

-  Every allocation has exactly one owner.
-  Every owned allocation has a documented deallocator.
-  Allocator/deallocator pairs match.
-  Borrowed memory is never freed by Dart.
-  Nullable returns are checked.
-  Buffer lengths and capacities are validated.
-  Native-reported lengths are sanity checked.
-  No pointer is used after release.
-  No resource can be double-freed.
-  Native-backed typed lists cannot outlive memory.
-  Native handles reject use after `close()`.
-  Struct field order/layout matches C.
-  Packing matches the native compiler declaration.
-  Integer narrowing validates ranges.
-  String encoding matches native API.
-  Temporary native strings are freed.
-  Native string decoding does not accidentally leak the original allocation.
-  Callback remains alive while registered.
-  Callback userdata lives through the final callback.
-  Finalizer and manual close cannot both destroy one resource.
-  No C++ exception crosses FFI.
-  Fuzzable native parsers are reviewed for malformed inputs.

---

# 95. Concurrency Checklist

-  Native thread-safety contract is documented.
-  Thread-affine handles remain on their required thread.
-  Main-thread-only APIs remain on the main thread.
-  Worker isolates are used only when legal.
-  Raw `Pointer`/`DynamicLibrary` objects are not sent between isolates.
-  Callback API matches native calling thread.
-  `NativeCallable.listener` is used when arbitrary native threads must notify Dart asynchronously.
-  Synchronous return callbacks are never modeled as listeners.
-  Callback unregister/close ordering is race-safe.
-  In-flight callbacks are accounted for.
-  Native state shared across threads uses native-appropriate synchronization.
-  Dart locks are not assumed to protect native-only threads.
-  Native internal thread pools are considered before adding isolates.
-  CPU oversubscription is measured rather than guessed.

---

# 96. Build Checklist

-  Dart/Flutter SDK constraints are known.
-  `ffi` version is known.
-  `ffigen` version is known.
-  Build-hook support matches minimum Dart version.
-  Generated bindings match current headers.
-  Generator output is reproducible.
-  All supported architectures are built.
-  Release native binaries are packaged.
-  Android `.so` files satisfy current ABI/page-size requirements.
-  Apple device/simulator variants are correct.
-  Apple binaries/frameworks are signed correctly.
-  Windows DLL architecture/runtime dependencies are correct.
-  Windows DLL search behavior is controlled.
-  Linux runtime/glibc baseline is tested.
-  Required symbols are exported after stripping/LTO.
-  Debug symbol files are retained separately.
-  Native dependency versions/checksums are pinned where appropriate.
-  CI builds every supported target or representative architecture matrix.
-  ABI/layout tests run for critical declarations.
-  Release package is tested, not only local development binaries.

---

# 97. Security Checklist

-  Native inputs are validated.
-  Lengths and capacities are checked.
-  Integer arithmetic overflow is reviewed.
-  User-controlled paths never determine executable library loading.
-  Windows DLL search paths are secure.
-  Native dependency provenance is recorded.
-  Native dependency versions are monitored for CVEs.
-  Downloaded binaries are verified.
-  Licenses are reviewed.
-  Secrets are not logged.
-  Raw buffers are not logged indiscriminately.
-  Raw memory addresses are not unnecessarily exposed.
-  Sanitizer testing has been considered.
-  Native parsers of untrusted data are fuzzed when justified.
-  Native crash symbolication is available.
-  Security-sensitive native dependencies have an update path.

---

# 98. Repository Reconnaissance

Before changing FFI code, inspect:

```
pubspec.yaml
pubspec.lock
analysis_options.yaml

lib/
src/
native/
hook/
android/
ios/
macos/
windows/
linux/

ffigen config
generated bindings
C/C++ headers
C/C++ source
CMake files
Gradle configuration
Xcode project/build settings
podspecs
MSBuild files
native assets/build hooks

CI workflows
native tests
Dart tests
integration tests
benchmarks

```

Search for:

```
dart:ffi
package:ffi
DynamicLibrary
lookupFunction
asFunction
@Native
Pointer
malloc
calloc
Arena
free
Struct
Union
Packed
Opaque
NativeFunction
Pointer.fromFunction
NativeCallable
NativeFinalizer
Finalizable
toNativeUtf8
toNativeUtf16
toDartString
asTypedList
ffigen

```

Do not introduce a second binding strategy until you understand why the current one exists.

---

# 99. Existing-Code Audit

Actively search for:

- handwritten bindings disagreeing with headers;
- fixed-width Dart bindings for ABI-dependent C types;
- `Bool` used for Win32 `BOOL`;
- incorrect `WChar` assumptions;
- struct fields reordered;
- incorrect `@Packed`;
- library allocations freed with `malloc.free`;
- package allocations freed by native library;
- leaked strings;
- leaked output buffers;
- free of borrowed pointers;
- double close;
- typed views returned after free;
- unchecked `nullptr`;
- native length trusted blindly;
- repeated `lookupFunction`;
- repeated UTF allocation in loops;
- one FFI call per list element/pixel/sample;
- blocking native compute on UI isolate;
- pointer/handle transferred between isolates;
- callback thread mismatch;
- callback closed while native retains it;
- C++ exceptions crossing C exports;
- hardcoded native paths;
- missing ABIs;
- debug DLLs/shared objects accidentally packaged;
- absent ABI version checks where binary skew is possible;
- native memory omitted from leak analysis;
- unsupported `dart:ffi` import in web implementation;
- unsafe code spread throughout business/UI layers.

---

# 100. Testing Strategy

Use layered tests.

## Dart wrapper unit tests

Test:

- argument validation;
- closed-state checks;
- error mapping;
- application model conversion.

Prefer dependency seams around the safe wrapper rather than mocking raw pointers everywhere.

## Native unit tests

Test the C/C++ library independently.

## ABI tests

Validate:

- `sizeof`;
- alignment;
- `offsetof`;
- enum/constants;
- ABI version;
- critical calling-convention assumptions.

## Integration tests

Use the real compiled native binary.

Mocks cannot detect:

- wrong struct offsets;
- missing exported symbol;
- wrong architecture;
- allocator mismatch;
- calling-convention corruption.

## Failure tests

Cover:

- native null return;
- native error status;
- invalid lengths;
- malformed data;
- closed handle;
- callback shutdown;
- unsupported ABI version;
- native-library load failure.

## Sanitizer tests

Run native test suites with ASan/UBSan/TSan where applicable.

## Performance tests

Benchmark production-like input sizes using optimized native code and profile/release Dart/Flutter execution.

---

# 101. ABI Test Example

C:

```
#include <stddef.h>
#include <stdint.h>

typedef struct {
  uint32_t tag;
  double value;
} result_t;

size_t abi_result_size(void) {
  return sizeof(result_t);
}

size_t abi_result_tag_offset(void) {
  return offsetof(result_t, tag);
}

size_t abi_result_value_offset(void) {
  return offsetof(result_t, value);
}

```

Dart:

```
import 'dart:ffi';

final class ResultNative extends Struct {
  @Uint32()
  external int tag;

  @Double()
  external double value;
}

@Native<Size Function()>(
  symbol: 'abi_result_size',
)
external int abiResultSize();

void verifyResultLayout() {
  final dartSize = sizeOf<ResultNative>();
  final nativeSize = abiResultSize();

  if (dartSize != nativeSize) {
    throw StateError(
      'ABI mismatch: ResultNative Dart size=$dartSize '
      'native size=$nativeSize',
    );
  }
}

```

For critical layouts, test offsets too.

---

# 102. Fuzz Testing

Consider native fuzzing for code consuming:

- images;
- audio/video;
- archives;
- network payloads;
- binary documents;
- untrusted database/input files.

The best fuzz target is often the native parser itself, with no Flutter runtime involved.

Do not mandate fuzzing for a trivial arithmetic API.

---

# 103. Migration Guidance

## Legacy `plugin_ffi` → `package_ffi`

Consider migration when:

- Flutter 3.38+ is the minimum;
- native compilation can be represented by build hooks;
- the package does not require Flutter Plugin API behavior;
- migration reduces duplicated platform build logic.

Do not migrate automatically if the plugin needs platform-specific runtime configuration.

Flutter documents `plugin_ffi` as the previous workflow and `package_ffi` as the current recommendation.

## Dynamic lookup → generated `@Native`

Consider when:

- native code is built as a code asset;
- generated binding simplicity is valuable;
- the repository can require the modern SDK.

Keep manual loading when it is intentional for:

- system libraries;
- runtime-selected libraries;
- closed-source packages;
- legacy compatibility.

## `ffigen.yaml` → Dart API

Current `ffigen` recommends its Dart configuration API and says YAML will eventually be phased out.

Do not churn a stable generated repository solely to change configuration syntax. Migrate alongside a generator/toolchain upgrade when it creates practical value.

## Old callback tutorials

Do not replace every `Pointer.fromFunction` merely because it is older.

Instead evaluate its actual thread/lifetime needs.

Use `NativeCallable` when closure support or its lifecycle/thread model is required.

## Old Apple guidance

Remove obsolete requirements such as mandatory bitcode.

## Future Dart 3.13 features

Do not copy Dart 3.13 link-hook/tree-shaking code into a project pinned to 3.12.

---

# 104. Anti-Patterns

Reject these patterns during review:

### FFI without justification

"Native must be faster."

Not sufficient.

### Large handwritten bindings

Use `ffigen`.

### Guessing integer types

```
// C long
Int64

```

without ABI verification.

### Assuming all booleans are `Bool`

Win32 `BOOL` disproves this assumption.

### Assuming struct layout

No header/compiler verification.

### Allocator mismatch

```
final pointer = libraryAllocate();
malloc.free(pointer);

```

without documented compatibility.

### Freeing borrowed data

Ownership bug.

### Missing free

Native leak.

### Native view after free

```
final view = pointer.asTypedList(length);
malloc.free(pointer);
return view;

```

Use-after-free.

### Unchecked null pointer

Dereference before validation.

### Trusting native length

Potential out-of-bounds memory access.

### Repeated symbol lookup

Avoid lookup in hot loops.

### Repeated UTF allocation

Avoid per-element encoding when batching is possible.

### Tiny FFI operations

Millions of boundary transitions for trivial work.

### UI-isolate blocking

Long synchronous native compute from frame-sensitive code.

### Blind isolate migration

Thread-affine handle moved to arbitrary worker execution.

### Wrong callback mechanism

Arbitrary native thread invoking a same-thread trampoline.

### Callback closed too early

Native retains dead function pointer.

### C++ exceptions escaping

Undefined boundary behavior.

### Dart `try/catch` as crash protection

Does not repair native corruption.

### Hardcoded library paths

Fragile and potentially insecure.

### Missing architecture artifacts

Works on one developer machine, fails elsewhere.

### Debug benchmarking

Not representative.

### Dart-only memory profiling

Misses native leaks.

### Finalizer-only cleanup

Unpredictable release timing.

### Raw pointers in UI/domain layers

Spreads unsafe contracts throughout the application.

### Web runtime checks around `dart:ffi`

Use conditional implementations instead.

---

# 105. Required Decision Framework

Before implementing or substantially changing an FFI boundary, write down answers to:

1. Why is native code required?
2. Could pure Dart solve this adequately?
3. Could a plugin/platform channel solve it more safely?
4. Is there a stable C ABI?
5. Who owns every pointer?
6. Which allocator/deallocator applies to every owned allocation?
7. What thread may call each native function?
8. Can callbacks arrive from native worker threads?
9. Can any call block?
10. Which platforms and architectures are required?
11. How is each native binary built and packaged?
12. Is web support required?
13. Can `ffigen` generate the bindings?
14. Does the native API need a C shim?
15. What is the error model?
16. What is the resource lifecycle?
17. Which values are copied across the boundary?
18. Can calls be batched?
19. How are native crashes symbolicated?
20. How is ABI compatibility tested?

If critical answers remain unknown, investigate before coding.

---

# 106. Implementation Workflow

## Step 1 — Inspect

Read dependencies, SDK versions, headers, source, generated bindings, build files, target architectures, CI, tests, wrappers, allocation code, callbacks, and finalizers.

## Step 2 — Justify FFI

Establish the native capability/performance reason.

## Step 3 — Define the ABI

Identify the exact C-facing contract.

If the implementation is C++, design or verify the C shim.

## Step 4 — Define ownership

Create an ownership table for every pointer/resource.

## Step 5 — Define threading

Document legal call threads, handle affinity, callback threads, and blocking behavior.

## Step 6 — Generate bindings

Prefer current `ffigen` for non-trivial headers.

## Step 7 — Verify bindings

Compare generated declarations with headers and platform typedefs.

## Step 8 — Build the safe wrapper

Concentrate raw pointer access, conversion, allocation, lifecycle, and errors.

## Step 9 — Implement deterministic cleanup

Use `try/finally`, `close()`, or `dispose()`.

Add a `NativeFinalizer` only as an appropriate safety net.

## Step 10 — Minimize boundary crossings

Batch and reduce conversion/copy only where justified.

## Step 11 — Configure native builds

Build every supported OS/architecture.

Prefer current code assets/build hooks where suitable.

## Step 12 — Validate errors

Map statuses, null pointers, `errno`, last-error values, and native messages predictably.

## Step 13 — Test ABI

Verify critical `sizeof`/offsets and real symbol calls.

## Step 14 — Test memory safety

Use native tests and sanitizers where supported.

## Step 15 — Test callbacks/concurrency

Exercise registration, cancellation, shutdown races, thread restrictions, and in-flight callbacks.

## Step 16 — Profile

Separate:

- boundary;
- allocation;
- copies;
- encoding;
- native compute;
- synchronization;
- native heap.

## Step 17 — Validate release packaging

Run the real release/AOT artifact with its real packaged native libraries.

---

# 107. Completion Criteria

An integration is complete only when all relevant conditions hold:

-  FFI is justified.
-  Current repository-compatible Dart/Flutter/FFI APIs are used.
-  Exact C ABI is known.
-  Bindings match headers.
-  Generated bindings are current.
-  Every allocation has an owner.
-  Every owned allocation has the correct release mechanism.
-  Borrowed pointers are never freed.
-  No obvious use-after-free path exists.
-  No double-free path exists.
-  String encoding is correct.
-  String allocations are released.
-  Native-to-Dart decoding does not imply an incorrect free.
-  Structs/unions match native layout.
-  Packing is validated.
-  Integer widths/signedness are correct.
-  Narrowing ranges are validated.
-  Null pointers are handled.
-  Lengths/capacities are validated.
-  Callback mechanism matches native thread behavior.
-  Callback lifetime is correct.
-  Callback teardown is race-safe.
-  Native handles are deterministically disposed.
-  Native finalizer cannot race manual close.
-  Long native calls do not block critical UI work.
-  Isolate use matches the native threading contract.
-  Calls are not excessively granular.
-  Symbol lookup is not repeated unnecessarily.
-  All supported ABIs are built.
-  Release native binaries are packaged.
-  Web has a separate implementation when required.
-  Native memory usage is measured.
-  Sanitizer coverage has been considered.
-  Native crash symbols are retained.
-  Analyzer passes.
-  Dart tests pass.
-  Native tests pass.
-  ABI tests pass where required.
-  Representative platform integration tests pass.
-  Release/AOT behavior has been tested.

---

# 108. Source-of-Truth Priority

When documentation conflicts, prefer evidence approximately in this order:

1. current official `package:ffi` API/documentation;
2. current Dart FFI documentation/API;
3. current Dart native interoperability documentation;
4. current Dart runtime API docs;
5. current official `ffi` source;
6. current `ffigen` documentation/source;
7. current Dart hooks/code-assets documentation;
8. current Flutter native integration documentation;
9. Dart SDK/runtime source when behavior is otherwise unclear;
10. official OS/compiler ABI documentation;
11. Android NDK documentation;
12. Apple developer documentation;
13. Microsoft documentation;
14. Linux/glibc/LLVM/GCC documentation;
15. first-party issue trackers when normative documentation has a gap.

Do not use an old tutorial as authority for a version-sensitive callback, allocator, binding, or packaging behavior.

If first-party documentation does not define behavior, label it:

```
implementation-specific
version-dependent
or unknown

```

rather than guessing.

---

# 109. Evidence Classification

When writing reviews or design notes, distinguish:

- **Dart language/runtime requirement**
- **Package requirement**
- **Native ABI requirement**
- **Platform requirement**
- **Verified implementation behavior**
- **Performance recommendation**
- **Security recommendation**
- **Context-dependent design choice**

Examples:

**Correct performance reasoning**

> Converting a Dart `String` with `toNativeUtf8()` creates a native NUL-terminated allocation, so repeatedly doing that inside a hot FFI loop introduces allocation and encoding work.

Not:

> Strings are slow in FFI.

**Correct callback reasoning**

> `NativeCallable.listener` is appropriate for arbitrary native calling threads when an asynchronous `void` callback is acceptable.

Not:

> `NativeCallable.listener` is the best callback API.

---

# 110. Review Heuristic

For every unsafe-looking line, ask a systems question.

For:

```
final p = malloc<Uint8>(size);

```

ask:

> Who frees it on success, native error, Dart exception, cancellation, and callback failure?

For:

```
final p = nativeGetData();

```

ask:

> Owned or borrowed? Length? Lifetime? Release function?

For:

```
p.asTypedList(length);

```

ask:

> Who proves `length` bytes are accessible and aligned, and how long does the allocation stay alive?

For:

```
callback.nativeFunction

```

ask:

> Which native thread can call this, and when is the final possible invocation?

For:

```
Isolate.run(...)

```

ask:

> Does the native contract permit a different thread, and have any unsendable native objects been captured?

For:

```
@Packed(1)

```

ask:

> Which exact C compiler declaration proves pack=1?

For:

```
library.lookupFunction(...)

```

ask:

> Is the symbol exported for every build/architecture, and why isn't this generated/resolved once?

---

# 111. Final Operating Principle

> **FFI is justified only when the native capability or performance benefit outweighs its safety and maintenance cost.**

Once FFI is justified:

> **Cross the Dart/native boundary as little as practical, use the exact native ABI, generate low-level bindings, explicitly model ownership, preserve thread contracts, keep unsafe details behind one small wrapper, and verify the result under real production architectures and build modes.**

Never approve an FFI integration because:

- it compiles;
- the symbol resolves;
- one test call returns the expected value;
- it works on the developer's ARM64 phone;
- it works only in debug mode.

Approve it when the ABI, ownership, threading, packaging, failure behavior, and performance have all been demonstrated.

---

# Source References

Primary first-party references used for this skill:

- [`package:ffi`](https://pub.dev/packages/ffi) — current package version and utilities.
- [`package:ffi`](https://pub.dev/documentation/ffi/latest/ffi/)[ API](https://pub.dev/documentation/ffi/latest/ffi/) — `malloc`, `calloc`, arenas, strings.
- [`dart:ffi`](https://api.dart.dev/dart-ffi/)[ API](https://api.dart.dev/dart-ffi/) — native types, pointers, callbacks, finalizers, `@Native`, `DynamicLibrary`.
- [Dart C interop using ](https://dart.dev/interop/c-interop)[`dart:ffi`](https://dart.dev/interop/c-interop) — official C interoperability guidance and type mapping.
- [Flutter: Bind to native code using FFI](https://docs.flutter.dev/platform-integration/bind-native-code) — current `package_ffi`, build-hook, `ffigen`, and code-asset workflow.
- [`package:ffigen`](https://pub.dev/packages/ffigen/versions/21.0.0)[ 21.0.0](https://pub.dev/packages/ffigen/versions/21.0.0) — current binding generator and configuration API.
- [Dart Hooks](https://dart.dev/tools/hooks) — build hooks/code assets and version gates for link hooks.
- [Flutter supported deployment platforms](https://docs.flutter.dev/reference/supported-platforms) — current platform/architecture support.
- [Android NDK ABIs](https://developer.android.com/ndk/guides/abis) — Android ABI/build matrix.
- [Android NDK C++ runtime support](https://developer.android.com/ndk/guides/cpp-support) — libc++ and runtime compatibility.
- [Android 16 KB page-size guidance](https://developer.android.com/guide/practices/page-sizes) — current native-library alignment requirements.
- [Apple XCFramework guidance](https://developer.apple.com/documentation/Xcode/creating-a-multi-platform-binary-framework-bundle) — Apple platform/architecture binary packaging.
- [Microsoft ](https://learn.microsoft.com/en-us/windows/win32/api/libloaderapi/nf-libloaderapi-setdefaultdlldirectories)[`SetDefaultDllDirectories`](https://learn.microsoft.com/en-us/windows/win32/api/libloaderapi/nf-libloaderapi-setdefaultdlldirectories) — secure DLL search configuration.
- [Linux ](https://man7.org/linux/man-pages/man3/dlmopen.3.html)[`dlopen(3)`](https://man7.org/linux/man-pages/man3/dlmopen.3.html) — ELF dynamic-library search/loading semantics.
- [Clang AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html) — native memory-error detection.
- Dart `NativeCallable.listener`, `NativeCallable.isolateLocal`, and related callback API references — thread and lifecycle contracts.
- Dart `NativeFinalizer` API — finalization guarantees, explicit-close guidance, and lifecycle.

---

# Compact Agent Commandment

When working on Dart/Flutter FFI:

**Research first.**
**Verify ABI second.**
**Define ownership third.**
**Verify threading fourth.**
**Analyze memory safety fifth.**
**Measure performance sixth.**
**Write or modify the boundary last.**