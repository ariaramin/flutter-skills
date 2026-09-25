# Source reference — Ownership, allocators, finalizers, pointers, arrays, structs/unions, strings, callback mechanisms, and callback lifetime

## Table of contents

- [19. Memory Ownership](#19-memory-ownership)
- [20. Allocation and Deallocation](#20-allocation-and-deallocation)
  - [`malloc`](#malloc)
  - [`calloc`](#calloc)
- [21. Scoped Allocation](#21-scoped-allocation)
- [22. Matching Allocators](#22-matching-allocators)
- [23. Native-Owned Return Buffer](#23-native-owned-return-buffer)
- [24. Finalizers](#24-finalizers)
    - [Finalizer lifecycle pattern](#finalizer-lifecycle-pattern)
- [25. Preventing Use-After-Free](#25-preventing-use-after-free)
- [26. Preventing Double Free](#26-preventing-double-free)
- [27. Null Pointers](#27-null-pointers)
- [28. Pointer Arithmetic](#28-pointer-arithmetic)
- [29. Bounds Safety](#29-bounds-safety)
- [30. Arrays and Buffers](#30-arrays-and-buffers)
- [31. Native Memory Views](#31-native-memory-views)
    - [Safe internal view](#safe-internal-view)
    - [Critical rule](#critical-rule)
- [32. Zero-Copy Terminology](#32-zero-copy-terminology)
- [33. Structs](#33-structs)
    - [Verify](#verify)
- [34. Packed Structs](#34-packed-structs)
- [35. Unions](#35-unions)
- [36. Nested Structs and Arrays](#36-nested-structs-and-arrays)
- [37. Structs by Value](#37-structs-by-value)
- [38. Opaque Handles](#38-opaque-handles)
- [39. Strings](#39-strings)
- [40. Dart String to Native UTF-8](#40-dart-string-to-native-utf-8)
- [41. UTF-16 and `wchar_t`](#41-utf-16-and-wchart)
- [42. Native String to Dart](#42-native-string-to-dart)
    - [Native-owned UTF-8 result](#native-owned-utf-8-result)
    - [Borrowed result](#borrowed-result)
- [43. String Performance](#43-string-performance)
- [44. Callback Mechanisms](#44-callback-mechanisms)
- [45. Native Callback Example](#45-native-callback-example)
    - [Ordering requirement](#ordering-requirement)
- [46. Callback Data Lifetime](#46-callback-data-lifetime)
- [47. Callback Reentrancy](#47-callback-reentrancy)

---
# 19. Memory Ownership

Every pointer must have an ownership statement.

For each pointer answer:

1. Who allocated it?
2. Who currently owns it?
3. Is it borrowed or owned?
4. May the receiver retain it?
5. May either side mutate it?
6. What is its valid length/capacity?
7. When does it become invalid?
8. Which exact function frees it?
9. Can it be used concurrently?
10. Does any callback or asynchronous operation retain it?

If any answer is unknown, the wrapper is not ready for production.

---

# 20. Allocation and Deallocation

`package:ffi` provides `malloc` and `calloc`.

Current `malloc` behavior:

- native heap allocation;
- uninitialized memory;
- POSIX: `malloc`/`free`;
- Windows: `CoTaskMemAlloc`/`CoTaskMemFree`.

Therefore:

> **Do not assume ****`package:ffi`****'s ****`malloc`**** is interchangeable with a native library's allocator.**

This is particularly important on Windows, where a library may use a CRT heap, COM allocator, `LocalAlloc`, a custom pool, or another contract.

## `malloc`

Use when every required field/byte will be explicitly initialized.

```
import 'dart:ffi';

import 'package:ffi/ffi.dart';

int sumUint32(List<int> values) {
  final pointer = malloc<Uint32>(values.length);

  try {
    final view = pointer.asTypedList(values.length);
    for (var i = 0; i < values.length; i++) {
      final value = values[i];
      if (value < 0 || value > 0xFFFFFFFF) {
        throw RangeError.range(
          value,
          0,
          0xFFFFFFFF,
          'values[$i]',
        );
      }
      view[i] = value;
    }

    var sum = 0;
    for (final value in view) {
      sum += value;
    }
    return sum;
  } finally {
    malloc.free(pointer);
  }
}

```

## `calloc`

Use when zero-initialization is part of the native contract or simplifies safe initialization enough to justify it.

Do not use `calloc` everywhere merely because zero feels safer.

---

# 21. Scoped Allocation

`Arena` manages groups of allocations and releases them together. Individual `free()` calls on an `Arena` are intentionally ignored; `releaseAll()` performs the cleanup. Its wrapped allocator defaults to `calloc`.

For a small explicit critical section, `try/finally` is often easiest to audit.

For multiple temporary allocations, an arena can make lifetime boundaries clearer.

`withZoneArena` supports synchronous and asynchronous computations, but official documentation warns that resources are not cleaned if the isolate is killed.

Do not use scoped allocation for memory retained by native code beyond the scope.

---

# 22. Matching Allocators

Examples:

| Allocation sourceCorrect release              |                                  |
| --------------------------------------------- | -------------------------------- |
| `malloc<T>()` from `package:ffi`              | `malloc.free(pointer)`           |
| `calloc<T>()` from `package:ffi`              | `calloc.free(pointer)`           |
| Native `library_create_buffer()`              | `library_free_buffer()`          |
| C++ `new` hidden behind shim                  | library `destroy_*()`            |
| Windows API returning `CoTaskMemAlloc` memory | documented COM allocator free    |
| Borrowed static string                        | no free                          |
| Borrowed object field                         | no free; owner controls lifetime |

Never infer allocator compatibility from similar function names.

---

# 23. Native-Owned Return Buffer

Suppose the C API is:

```
uint8_t* native_make_data(size_t* out_length);
void native_free_data(void* data);

```

Safe Dart wrapper:

```
import 'dart:ffi';
import 'dart:typed_data';

import 'package:ffi/ffi.dart';

@Native<Pointer<Uint8> Function(Pointer<Size>)>(
  symbol: 'native_make_data',
)
external Pointer<Uint8> nativeMakeData(Pointer<Size> outLength);

@Native<Void Function(Pointer<Void>)>(
  symbol: 'native_free_data',
)
external void nativeFreeData(Pointer<Void> data);

Uint8List makeData() {
  final outLength = malloc<Size>();

  try {
    final data = nativeMakeData(outLength);
    if (data == nullptr) {
      throw StateError('native_make_data returned NULL');
    }

    final length = outLength.value;

    try {
      // Copy before releasing native-owned storage.
      return Uint8List.fromList(data.asTypedList(length));
    } finally {
      nativeFreeData(data.cast<Void>());
    }
  } finally {
    malloc.free(outLength);
  }
}

```

The library-provided free function, not `malloc.free`, owns the returned buffer.

---

# 24. Finalizers

Use deterministic disposal for important native resources.

`NativeFinalizer` is a safety net, not the primary lifecycle mechanism.

Current Dart documentation guarantees stronger shutdown behavior for `NativeFinalizer` than ordinary Dart `Finalizer`, but still warns that process crashes or abrupt termination can prevent cleanup. It explicitly recommends manual close for timely resource release.

Use explicit `close()` for:

- databases;
- files;
- codecs;
- sessions;
- graphics resources;
- model contexts;
- large native buffers;
- native handles.

### Finalizer lifecycle pattern

Native header:

```
typedef struct engine engine_t;

engine_t* engine_create(void);
void engine_destroy(engine_t* engine);

/* Exact NativeFinalizer-compatible shim. */
void engine_finalizer(void* token);

```

Dart:

```
import 'dart:ffi';

final class EngineHandle extends Opaque {}

@Native<Pointer<EngineHandle> Function()>(
  symbol: 'engine_create',
)
external Pointer<EngineHandle> engineCreate();

@Native<Void Function(Pointer<EngineHandle>)>(
  symbol: 'engine_destroy',
)
external void engineDestroy(Pointer<EngineHandle> handle);

@Native<Void Function(Pointer<Void>)>(
  symbol: 'engine_finalizer',
)
external void engineFinalizer(Pointer<Void> token);

final class Engine implements Finalizable {
  Engine._(this._handle) {
    _finalizer.attach(
      this,
      _handle.cast<Void>(),
      detach: this,
    );
  }

  static final NativeFinalizer _finalizer = NativeFinalizer(
    Native.addressOf<NativeFinalizerFunction>(engineFinalizer),
  );

  Pointer<EngineHandle> _handle;
  bool _closed = false;

  factory Engine.open() {
    final handle = engineCreate();
    if (handle == nullptr) {
      throw StateError('engine_create failed');
    }
    return Engine._(handle);
  }

  Pointer<EngineHandle> get _openHandle {
    if (_closed) {
      throw StateError('Engine is closed');
    }
    return _handle;
  }

  int get nativeAddress => _openHandle.address;

  void close() {
    if (_closed) {
      return;
    }

    _closed = true;
    _finalizer.detach(this);
    engineDestroy(_handle);
    _handle = nullptr.cast<EngineHandle>();
  }
}

```

The finalizer must call a native function compatible with `NativeFinalizerFunction`. A `Pointer.fromFunction` Dart trampoline is not a substitute for a native finalizer callback.

---

# 25. Preventing Use-After-Free

Common causes:

- retaining a pointer after `free`;
- returning a typed-list view backed by a temporary allocation;
- a native async operation retaining a temporary Dart-allocated buffer;
- disposing a handle while an operation is still in flight;
- native code calling a callback with userdata whose owner has closed;
- freeing a parent struct while Dart retains a pointer to an embedded field.

Use-after-free is not made safe by having a live Dart `Pointer` object.

A `Pointer<T>` is fundamentally an address representation.

---

# 26. Preventing Double Free

Potential double-free paths:

- explicit `close()` twice;
- manual release plus attached finalizer;
- two Dart wrappers both believe they own one pointer;
- an error path frees memory and outer `finally` frees it again.

Safe wrappers should have one clear owner and an idempotent close where appropriate.

If repeated close indicates a serious contract bug, tests/logging can report it while still avoiding memory corruption.

---

# 27. Null Pointers

Use `nullptr`.

It is the current `dart:ffi` representation of native `NULL`, with address zero.

```
final handle = nativeCreate();

if (handle == nullptr) {
  throw StateError('nativeCreate returned NULL');
}

```

Do not dereference first and check later.

Map native nullability into the safe Dart API:

```
String? readOptionalName() {
  final pointer = nativeGetOptionalName();
  if (pointer == nullptr) {
    return null;
  }
  return pointer.toDartString();
}

```

---

# 28. Pointer Arithmetic

Prefer typed arithmetic:

```
final third = pointer.elementAt(2);

```

Typed pointer access scales by the native element size.

Use `Pointer<Uint8>` when offsets are truly byte offsets.

Do not hand-compute struct field offsets in Dart unless ABI verification proves them.

---

# 29. Bounds Safety

Native pointer access does not provide managed Dart bounds checking for the underlying allocation.

Track:

```
pointer
element count
byte length
capacity
ownership
lifetime

```

Validate native-reported lengths before creating a typed view.

If a native library claims an impossible length, reject it rather than trusting the value.

---

# 30. Arrays and Buffers

Distinguish:

- `Array<T>`: inline fixed-size native array;
- `Pointer<T>`: address of elements elsewhere;
- sentinel-terminated sequence;
- length-delimited sequence.

Prefer explicit pointer + length for new binary APIs.

Avoid sentinel scanning for arbitrary binary data.

Variable-length inline arrays and flexible-array patterns require especially careful allocation/layout handling; current Dart FFI has specific variable array support, but native `sizeof` and Dart allocation semantics must be verified.

---

# 31. Native Memory Views

`Pointer<T>.asTypedList()` creates a Dart typed-list view over native memory rather than copying the bytes into a separate Dart allocation.

The native memory must remain readable/writable and correctly aligned for as long as the view is used.

### Safe internal view

```
import 'dart:ffi';
import 'dart:typed_data';

import 'package:ffi/ffi.dart';

@Native<Int32 Function(Pointer<Uint8>, Size)>(
  symbol: 'native_transform_in_place',
)
external int nativeTransformInPlace(
  Pointer<Uint8> bytes,
  int length,
);

Uint8List transform(Uint8List input) {
  if (input.isEmpty) {
    return Uint8List(0);
  }

  final native = malloc<Uint8>(input.length);

  try {
    final view = native.asTypedList(input.length);
    view.setAll(0, input);

    final status = nativeTransformInPlace(native, input.length);
    if (status != 0) {
      throw StateError('native_transform_in_place failed: $status');
    }

    return Uint8List.fromList(view);
  } finally {
    malloc.free(native);
  }
}

```

The native-backed `view` never escapes the allocation's lifetime.

### Critical rule

> **A Dart typed-list view backed by native memory becomes invalid as soon as that memory is released.**

Do not return such a view from a wrapper unless the returned object also owns and controls the native memory lifecycle.

---

# 32. Zero-Copy Terminology

Do not call an integration "zero-copy" simply because `asTypedList()` appears in it.

Determine:

1. Where was the original data allocated?
2. Was it copied from Dart heap into native memory?
3. Does the result copy back?
4. Is the typed list only a view?
5. Does native code internally copy it?
6. Can both sides access it concurrently?
7. Who releases it?

Precise statement:

> `asTypedList()` exposes a view over existing native memory without copying that memory into a separate backing store at view creation.

That does not establish an end-to-end zero-copy pipeline.

---

# 33. Structs

Match the native declaration exactly.

C:

```
typedef struct {
  double x;
  double y;
  uint32_t flags;
} point_t;

```

Dart:

```
import 'dart:ffi';

final class PointNative extends Struct {
  @Double()
  external double x;

  @Double()
  external double y;

  @Uint32()
  external int flags;
}

```

Do not reorder fields for aesthetics.

`sizeOf<T>()` reports native storage size according to the current ABI/layout.

### Verify

For ABI-sensitive structs, add a C test helper:

```
#include <stddef.h>

size_t point_sizeof(void) {
  return sizeof(point_t);
}

size_t point_offset_x(void) {
  return offsetof(point_t, x);
}

size_t point_offset_y(void) {
  return offsetof(point_t, y);
}

size_t point_offset_flags(void) {
  return offsetof(point_t, flags);
}

```

Compare those values with the generated Dart binding assumptions in an integration test.

---

# 34. Packed Structs

Dart supports `@Packed(...)`, with defined member alignment values.

Only use it when the C ABI is actually packed.

```
@Packed(1)
final class WireHeader extends Struct {
  @Uint8()
  external int version;

  @Uint32()
  external int payloadLength;
}

```

This is correct **only** if the native declaration uses equivalent packing.

Do not pack structures to save memory.

Incorrect packing changes field offsets and can corrupt every read/write.

Compiler pragmas such as `#pragma pack` deserve explicit generator/layout verification.

---

# 35. Unions

A union's fields share storage.

Dart `Union` models the native shared layout.

```
final class NumberValue extends Union {
  @Int64()
  external int integer;

  @Double()
  external double floating;
}

```

Dart cannot infer which field is active.

If the C API uses:

```
enum value_kind kind;
union number_value value;

```

the safe wrapper must inspect `kind` before reading the corresponding member.

---

# 36. Nested Structs and Arrays

Distinguish:

```
struct outer {
  struct inner embedded;
  struct inner* referenced;
};

```

`embedded` occupies inline struct storage.

`referenced` stores only a pointer.

Do not turn one into the other.

Likewise:

```
uint8_t bytes[32];

```

is not equivalent to:

```
uint8_t* bytes;

```

Generated bindings help preserve these distinctions.

---

# 37. Structs by Value

Dart FFI can model supported compound values in native signatures, but passing structs/unions by value makes exact ABI layout and calling convention especially important.

For an existing ABI:

> Preserve the native signature exactly.

When designing a new stable C ABI:

> Prefer opaque handles and pointer-based data structures when they simplify versioning and avoid fragile public layout commitments.

Do not rewrite a third-party ABI merely because pointer passing feels safer.

---

# 38. Opaque Handles

Use `Opaque` for native implementation types that Dart must not inspect.

```
final class DecoderHandle extends Opaque {}

```

A safe wrapper should expose:

```
create
use
close
closed-state validation

```

not raw addresses.

Opaque handles provide a more stable C ABI than exposing private struct layout.

---

# 39. Strings

Encoding is part of the ABI.

Never treat "C string" as sufficient specification.

Determine whether the API expects:

- UTF-8;
- UTF-16;
- UTF-32;
- `wchar_t`;
- ANSI/code-page data;
- byte strings;
- explicit length;
- NUL termination.

`package:ffi` currently provides `Utf8` and `Utf16` helpers.

---

# 40. Dart String to Native UTF-8

`toNativeUtf8()` creates a NUL-terminated native UTF-8 allocation. The default allocator is `malloc`.

```
import 'dart:ffi';

import 'package:ffi/ffi.dart';

@Native<Int32 Function(Pointer<Utf8>)>(
  symbol: 'native_open_path',
)
external int nativeOpenPath(Pointer<Utf8> path);

void openPath(String path) {
  final nativePath = path.toNativeUtf8();

  try {
    final status = nativeOpenPath(nativePath);
    if (status != 0) {
      throw StateError('native_open_path failed: $status');
    }
  } finally {
    malloc.free(nativePath);
  }
}

```

This is valid only if `native_open_path` does **not** retain the pointer after returning.

If the callee retains it:

- let native code copy the string; or
- create an explicit owner whose lifetime lasts until native release.

Do not free retained input immediately.

---

# 41. UTF-16 and `wchar_t`

`toNativeUtf16()` represents UTF-16 code units.

Do not equate it with `wchar_t*` everywhere.

`WChar` is ABI-specific; Windows commonly uses 16-bit `wchar_t`, while Unix-like systems commonly use a different representation/width.

Use UTF-16 helpers only when the target API explicitly expects UTF-16-compatible storage.

Win32 wide APIs are a common example.

---

# 42. Native String to Dart

`Pointer<Utf8>.toDartString()` decodes native UTF-8. Without an explicit length it reads to the NUL terminator.

Conversion does not imply ownership transfer and does not automatically release the native allocation.

### Native-owned UTF-8 result

```
import 'dart:ffi';

import 'package:ffi/ffi.dart';

@Native<Pointer<Utf8> Function()>(
  symbol: 'native_take_message',
)
external Pointer<Utf8> nativeTakeMessage();

@Native<Void Function(Pointer<Void>)>(
  symbol: 'native_free_message',
)
external void nativeFreeMessage(Pointer<Void> message);

String takeMessage() {
  final pointer = nativeTakeMessage();

  if (pointer == nullptr) {
    throw StateError('native_take_message returned NULL');
  }

  try {
    return pointer.toDartString();
  } finally {
    nativeFreeMessage(pointer.cast<Void>());
  }
}

```

### Borrowed result

If documentation states:

```
returned pointer remains library-owned until the next call

```

then decode/copy while valid and **do not free it**.

---

# 43. String Performance

String conversion can dominate a tiny native operation because encoding/decoding and allocation must occur.

For hot paths:

- avoid converting invariant strings on every call;
- batch work;
- redesign APIs around numeric IDs or native handles when appropriate;
- cache native strings only when ownership/lifetime is explicit;
- never create global native allocations without a cleanup strategy.

Measure before caching.

---

# 44. Callback Mechanisms

Current callback choices have materially different threading semantics.

| MechanismNative calling threadDart callbackReturn behaviorLifetime |                                  |                                    |                                          |                              |
| ------------------------------------------------------------------ | -------------------------------- | ---------------------------------- | ---------------------------------------- | ---------------------------- |
| `Pointer.fromFunction`                                             | Same isolate mutator thread only | top-level/static                   | Synchronous; exceptional return rules    | effectively isolate lifetime |
| `NativeCallable.isolateLocal`                                      | Same thread that created it      | closure/function                   | Synchronous; supports exceptional return | must `close()`               |
| `NativeCallable.listener`                                          | Any native thread                | async delivery to creating isolate | `void` only; native caller does not wait | must `close()`               |
| `NativeCallable.isolateGroupBound`                                 | Broader thread support           | isolate-group execution model      | version/API specific                     | **experimental**             |

`Pointer.fromFunction` can abort the process if native code invokes the trampoline from the wrong thread. `NativeCallable.isolateLocal` has the same same-thread restriction.

`NativeCallable.listener` may be called from any native thread. Arguments are sent asynchronously to the creating isolate; only `void` callbacks are supported because native code does not wait for a Dart return value.

`NativeCallable.isolateGroupBound` exists but is explicitly experimental; do not make it the default production recommendation without checking the project's Dart version and API status.

---

# 45. Native Callback Example

Native declaration:

```
typedef void (*progress_callback_t)(int32_t percent);

int engine_register_progress(progress_callback_t callback);
int engine_unregister_progress(void);

```

If native code may invoke the callback from arbitrary worker threads, use `NativeCallable.listener`.

```
import 'dart:ffi';

typedef ProgressCallbackNative = Void Function(Int32);

@Native<Int32 Function(
  Pointer<NativeFunction<ProgressCallbackNative>>,
)>(
  symbol: 'engine_register_progress',
)
external int engineRegisterProgress(
  Pointer<NativeFunction<ProgressCallbackNative>> callback,
);

@Native<Int32 Function()>(
  symbol: 'engine_unregister_progress',
)
external int engineUnregisterProgress();

final class ProgressRegistration {
  ProgressRegistration._(
    this._callback,
  );

  final NativeCallable<ProgressCallbackNative> _callback;
  bool _closed = false;

  factory ProgressRegistration.start(
    void Function(int percent) onProgress,
  ) {
    final callback =
        NativeCallable<ProgressCallbackNative>.listener((int percent) {
      onProgress(percent);
    });

    final status = engineRegisterProgress(callback.nativeFunction);

    if (status != 0) {
      callback.close();
      throw StateError('engine_register_progress failed: $status');
    }

    return ProgressRegistration._(callback);
  }

  void close() {
    if (_closed) {
      return;
    }

    final status = engineUnregisterProgress();
    if (status != 0) {
      // Native may still retain the callback. Do not close the Dart
      // trampoline until native registration has definitely ended.
      throw StateError('engine_unregister_progress failed: $status');
    }

    _closed = true;
    _callback.close();
  }
}

```

### Ordering requirement

Correct:

```
stop native producer
-> unregister callback
-> wait/confirm no in-flight invocations if required by library contract
-> close NativeCallable
-> free callback state

```

Incorrect:

```
close NativeCallable
-> native worker calls stale function pointer
-> undefined behavior

```

Current API documentation explicitly states that invoking a `NativeCallable` after `close()` is undefined behavior.

---

# 46. Callback Data Lifetime

`NativeCallable.listener` is asynchronous.

If native code sends:

```
callback(buffer_pointer, buffer_length);

```

the buffer must remain valid until the Dart callback actually executes, not merely until the native function-pointer call returns.

The current API documentation explicitly warns that pointer resources passed through listener callbacks must remain valid until the asynchronous callback completes.

Safer native designs often:

- transfer ownership;
- use ref-counted buffers;
- queue durable native objects;
- copy small ephemeral data before native stack storage disappears.

Never pass a pointer to a native stack-local buffer into an asynchronous listener callback.

---

# 47. Callback Reentrancy

For synchronous callbacks, native code may re-enter Dart before the original Dart→native call returns.

Review:

- recursive wrapper calls;
- disposed state;
- locks held by native code;
- locks held by Dart wrapper logic;
- mutable global state;
- callback unregister/close;
- nested native calls.

Do not assume callbacks are serialized unless the native API promises it.

---

