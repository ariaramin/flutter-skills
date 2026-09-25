# Source reference — Isolates, thread safety, oversubscription, error models, errno/Win32 errors, crashes, varargs, globals, function pointers, C API design, and ABI versioning

## Table of contents

- [48. Isolates and Long-Running Native Calls](#48-isolates-and-long-running-native-calls)
- [49. Long-Running Native Call Example](#49-long-running-native-call-example)
- [50. Thread Safety](#50-thread-safety)
- [51. CPU Oversubscription](#51-cpu-oversubscription)
- [52. Error Handling](#52-error-handling)
- [53. `errno`](#53-errno)
- [54. Windows Last Error](#54-windows-last-error)
- [55. Native Crashes](#55-native-crashes)
- [56. Variadic Functions](#56-variadic-functions)
- [57. Macros and Inline Functions](#57-macros-and-inline-functions)
- [58. Global Native Variables](#58-global-native-variables)
- [59. Function Pointers](#59-function-pointers)
- [60. C API Design for FFI](#60-c-api-design-for-ffi)
- [61. ABI Versioning](#61-abi-versioning)
- [62. Struct Evolution](#62-struct-evolution)

---
# 48. Isolates and Long-Running Native Calls

A synchronous FFI call blocks the Dart isolate that made the call.

Calling a long-running native function from Flutter's UI isolate can block input, animations, and frame production.

Dart's isolate guidance recommends worker isolates for expensive work that would otherwise block responsiveness.

However:

> **Do not blindly move a native call into an isolate.**

First determine:

- Is the library thread-safe?
- Is the handle thread-affine?
- Must creation/use/destruction occur on one thread?
- Must the function run on the platform main thread?
- Does native code already own a worker pool?
- Are callbacks tied to the creating isolate/thread?

Current Dart concurrency documentation also treats objects such as FFI `Pointer`, `DynamicLibrary`, `NativeFinalizer`, and `Finalizable`resources as unsendable across isolates.

Create and own native handles inside the isolate that uses them rather than trying to send raw pointers between isolates.

---

# 49. Long-Running Native Call Example

This example moves a stateless batch operation off the caller isolate. It does **not** capture or send a native handle.

```
import 'dart:ffi';
import 'dart:isolate';
import 'dart:typed_data';

import 'package:ffi/ffi.dart';

@Native<Int32 Function(Pointer<Uint8>, Size)>(
  symbol: 'native_heavy_transform',
)
external int nativeHeavyTransform(
  Pointer<Uint8> data,
  int length,
);

Future<Uint8List> heavyTransformOffIsolate(Uint8List input) async {
  final transferable = TransferableTypedData.fromList(<TypedData>[input]);

  final transformed = await Isolate.run<TransferableTypedData>(() {
    final bytes = transferable.materialize().asUint8List();

    if (bytes.isEmpty) {
      return TransferableTypedData.fromList(<TypedData>[
        Uint8List(0),
      ]);
    }

    final pointer = malloc<Uint8>(bytes.length);

    try {
      final nativeView = pointer.asTypedList(bytes.length);
      nativeView.setAll(0, bytes);

      final status = nativeHeavyTransform(pointer, bytes.length);
      if (status != 0) {
        throw StateError('native_heavy_transform failed: $status');
      }

      final output = Uint8List.fromList(nativeView);
      return TransferableTypedData.fromList(<TypedData>[output]);
    } finally {
      malloc.free(pointer);
    }
  });

  return transformed.materialize().asUint8List();
}

```

Use this pattern only when the native function is legal on the worker thread.

For a stateful thread-affine native library, create an owned worker isolate and create/use/destroy the native context entirely inside it.

---

# 50. Thread Safety

Document a thread contract beside the wrapper.

Example:

```
EngineHandle:
- create: worker isolate A
- process: worker isolate A only
- destroy: worker isolate A only
- progress callback: arbitrary native worker thread -> NativeCallable.listener
- global library initialization: once, thread-safe per native docs

```

Do not assume:

- all native functions are thread-safe;
- all handles can be shared;
- a Dart lock protects arbitrary native threads;
- isolates make a native library thread-safe.

Synchronization must live where the shared state lives.

If state is shared by native threads, a Dart mutex does not automatically serialize native-only accesses.

---

# 51. CPU Oversubscription

Before adding multiple worker isolates, inspect the native implementation.

If native code already runs:

```
8 native worker threads

```

and Dart launches:

```
8 isolates

```

each invoking that pool, the application may create far more runnable workers than CPU cores.

Measure:

- native thread count;
- Dart isolate count;
- CPU utilization;
- context switching;
- memory;
- contention;
- latency.

Parallelism is not free.

---

# 52. Error Handling

Native errors commonly use:

- integer status codes;
- null pointers;
- output parameters;
- library-owned error objects;
- POSIX `errno`;
- Windows `GetLastError`.

Translate native errors at the wrapper boundary.

Example:

```
enum EngineError {
  invalidArgument,
  outOfMemory,
  corruptInput,
  internal,
}

final class EngineException implements Exception {
  const EngineException(
    this.error,
    this.message,
  );

  final EngineError error;
  final String message;

  @override
  String toString() => 'EngineException($error): $message';
}

```

Application code should not interpret raw `-37` error values in widgets.

---

# 53. `errno`

Do not invent a universal `package:ffi` `errno` API.

Current `package:ffi` 2.2.0's public utilities focus on allocators, arenas, and string helpers and do not expose a universal `errno`abstraction.

POSIX `errno` is thread-local and must be interpreted according to the called API.

For robust cross-language error handling, a C shim can capture `errno` immediately:

```
int file_open_wrapped(
    const char* path,
    int* out_fd,
    int* out_errno) {
  int fd = open(path, O_RDONLY);

  if (fd < 0) {
    *out_fd = -1;
    *out_errno = errno;
    return -1;
  }

  *out_fd = fd;
  *out_errno = 0;
  return 0;
}

```

This avoids another FFI call accidentally changing the thread's error state before Dart reads it.

---

# 54. Windows Last Error

`GetLastError()` is thread-specific and should be read immediately after a Windows API reports failure according to that API's contract.

Do not apply POSIX `errno` conventions to Win32 APIs.

A native wrapper that performs the operation and captures the error in one call is often easiest to reason about.

---

# 55. Native Crashes

Dart exception handling does not turn native memory corruption into a safe recoverable failure.

Do not write:

```
try {
  nativeDangerousCall();
} catch (_) {
  // This is not a segmentation-fault safety mechanism.
}

```

`try/catch` can handle Dart exceptions and FFI wrapper failures that become Dart exceptions.

It does not make these safe:

- segmentation fault;
- invalid pointer dereference;
- stack corruption;
- heap corruption;
- double free;
- undefined native calling convention.

Prevent them through ABI correctness, ownership correctness, native tests, sanitizers, and native debugging.

---

# 56. Variadic Functions

Modern Dart FFI includes `VarArgs`, allowing precise variadic signatures to be expressed.

However, variadic C APIs remain ABI-sensitive because default promotions and concrete argument combinations matter.

For a complex or frequently used variadic API, prefer a C shim with a fixed signature.

Bad boundary:

```
int log_values(const char* format, ...);

```

Better FFI-specific wrapper:

```
int log_int64_value(
    const char* name,
    int64_t value);

```

Do not improvise variadic argument types.

---

# 57. Macros and Inline Functions

A C preprocessor macro is not necessarily a runtime symbol.

Likewise, a `static inline` function may not be emitted as an exported symbol.

Options:

- let `ffigen` materialize supported constants/declarations;
- reproduce a simple compile-time constant safely;
- expose a real C wrapper function.

Do not call:

```
library.lookupFunction(..., 'SOME_MACRO');

```

unless there is actually a symbol with that name.

---

# 58. Global Native Variables

Dart FFI can bind suitable native globals, including through `@Native`.

Treat mutable globals as shared native state.

Review:

- initialization order;
- atomicity;
- synchronization;
- library lifetime;
- thread safety.

Prefer explicit getter/setter functions if they provide a safer contract.

---

# 59. Function Pointers

Native function pointers are represented using:

```
Pointer<NativeFunction<Signature>>

```

For every function pointer verify:

- nullable or non-null;
- exact signature;
- calling thread;
- object/context lifetime;
- function lifetime;
- whether native retains it.

A valid numeric address does not prove the function pointer is still callable.

---

# 60. C API Design for FFI

When you control the native library, prefer:

- `extern "C"`;
- opaque handles;
- `create`/`destroy`;
- fixed-width integers where semantics require fixed width;
- `size_t` for native-size buffer lengths where appropriate;
- explicit pointer + length;
- explicit capacity + written length;
- status returns;
- explicit ownership;
- library-owned deallocation functions;
- batch operations;
- no exceptions crossing;
- no STL values crossing;
- documented threading;
- documented callback thread;
- ABI version query.

Example:

```
#define ENGINE_ABI_VERSION 3

typedef struct engine engine_t;

typedef enum {
  ENGINE_OK = 0,
  ENGINE_INVALID_ARGUMENT = 1,
  ENGINE_OUT_OF_MEMORY = 2,
  ENGINE_CORRUPT_INPUT = 3
} engine_status_t;

uint32_t engine_abi_version(void);

engine_status_t engine_create(engine_t** out_engine);

engine_status_t engine_process(
    engine_t* engine,
    const uint8_t* input,
    size_t input_len,
    uint8_t* output,
    size_t output_capacity,
    size_t* out_written);

void engine_destroy(engine_t* engine);

```

This is dramatically easier to bind safely than exposing C++ internals.

---

# 61. ABI Versioning

A native library can change without the Dart package changing.

Protect against:

- incompatible struct changes;
- removed symbols;
- changed semantics;
- altered enum values;
- calling convention changes.

Useful API:

```
uint32_t engine_abi_version(void);

```

Dart wrapper:

```
@Native<Uint32 Function()>(
  symbol: 'engine_abi_version',
)
external int engineAbiVersion();

void verifyEngineAbi() {
  const required = 3;
  final actual = engineAbiVersion();

  if (actual != required) {
    throw StateError(
      'Unsupported native ABI: expected $required, got $actual',
    );
  }
}

```

For durable ABIs, prefer opaque handles over public mutable structs.

---

# 62. Struct Evolution

Appending fields is not automatically ABI-safe.

It can break callers when:

- caller allocates the old `sizeof`;
- struct is passed by value;
- callee assumes new fields exist;
- code copies the full struct;
- alignment changes.

More robust versioned structures use a size/version field:

```
typedef struct {
  uint32_t struct_size;
  uint32_t abi_version;
  uint32_t flags;
} engine_options_t;

```

The callee can limit reads to fields covered by `struct_size`.

---

