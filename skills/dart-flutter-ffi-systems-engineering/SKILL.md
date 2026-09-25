---
name: dart-flutter-ffi-systems-engineering
description: Design, implement, review, debug, optimize, test, package, and migrate production Dart/Flutter native integrations using dart:ffi, package:ffi, ffigen, @Native, DynamicLibrary, build hooks/code assets, native callbacks, and C/C++ libraries. Use whenever a task involves raw pointers, structs/unions, native memory, allocator ownership, callbacks, isolates/threading, ABI mismatches, native crashes, Android/iOS/macOS/Windows/Linux packaging, native performance, or deciding whether FFI is justified—even when the user only asks to “call this C library” or “make native code faster.”
compatibility: The supplied research baseline is 2026-08-10 and discusses package:ffi 2.2.0, ffigen 21.0.0, Dart 3.12-era stable behavior, Flutter 3.38+ package_ffi/build-hook workflows, and future Dart 3.13 link-hook features. Always inspect the repository's actual Dart/Flutter SDKs, ffi/ffigen versions, native headers, build system, and target ABIs before using version-sensitive APIs.
---
# Dart & Flutter FFI Systems Engineering
Treat FFI as a **systems boundary**, not ordinary Dart API usage.
Compilation, symbol resolution, or one successful call does not prove correctness. Every native boundary must make these contracts explicit:
```text
ABI
ownership
lifetime
threading
error model
packaging
performance
```
Prefer this architecture:
```text
application/domain
      ↓
safe Dart wrapper
      ↓
generated/raw FFI bindings
      ↓
small stable C ABI
      ↓
native implementation
```
Keep raw pointers, allocators, native structs, function pointers, and `DynamicLibrary` out of UI/domain code.
## Reference routing
Read only what the task needs:
| Need | Reference |
|---|---|
| FFI vs Dart/plugins, toolchain gates, exact type mapping, ffigen, `@Native`, dynamic loading, build hooks | `references/01-decisions-toolchain-bindings.md` |
| Memory ownership, allocators, finalizers, pointers, structs/unions, strings, callbacks | `references/02-memory-layout-strings-callbacks.md` |
| Isolates/threading, errors, `errno`, native crashes, varargs, globals, function pointers, ABI versioning | `references/03-concurrency-errors-api-versioning.md` |
| Android/iOS/macOS/Windows/Linux/Web packaging, architecture support, performance, profiling, sanitizers, symbols, supply chain/security | `references/04-platform-build-performance-security.md` |
| Ownership matrices, checklists, audit, testing, fuzzing, migration, anti-patterns, workflow, evidence/source rules | `references/05-ownership-matrices-audit-testing-migration.md` |
## 1. Decide whether FFI is justified
Before adding native code, answer:
1. What capability or measured performance need requires native code?
2. Could pure Dart solve it adequately?
3. Could an existing Flutter plugin/platform channel solve it more safely?
4. Is the native API C-compatible, or can you expose a stable C shim?
5. Is Web required?
6. Can every required OS/architecture build and package the library?
7. Will marshaling/copy/allocation dominate the native computation?
8. Who will maintain native toolchains, symbols, security updates, and ABI compatibility?
Use FFI for C-compatible native libraries, compute-heavy kernels, codecs, cryptography, databases, scientific/numerical code, compression, parsers, or reusable native algorithms when the value justifies the systems cost.
Avoid FFI for trivial Dart logic, rich platform-UI lifecycle APIs, or workloads where conversion/copy costs erase the benefit.
Do not say “FFI is faster.” State the mechanism: it removes platform-message serialization and makes a direct ABI call; end-to-end speed still depends on conversions, allocations, copies, synchronization, and native work.
## 2. Inspect the repository before touching bindings
Inspect:
```text
pubspec.yaml / pubspec.lock
Flutter + Dart versions
ffi + ffigen versions
generated bindings + generator metadata
C/C++ headers and source
hook/build.dart
CMake / Gradle / Xcode / podspec / MSBuild
native assets / code assets
CI native build matrix
native tests / Dart tests / integration tests / benchmarks
```
Search for:
```text
dart:ffi
package:ffi
DynamicLibrary
lookupFunction
@Native
Pointer
malloc / calloc / Arena
Struct / Union / Packed / Opaque
NativeCallable / Pointer.fromFunction
NativeFinalizer
asTypedList
toNativeUtf8 / toNativeUtf16 / toDartString
ffigen
```
Do not introduce a second binding/build strategy until you understand why the current one exists.
## 3. Version-gate every modern FFI pattern
The source baseline discusses:
```text
package:ffi 2.2.0
ffigen 21.0.0
Dart 3.12-era stable APIs
build hooks from Dart 3.10+
Flutter package_ffi workflow from Flutter 3.38+
Dart 3.13 link hooks / recorded-use native tree shaking as future relative to that baseline
```
Repository versions win.
Do not introduce Dart 3.10+ hooks into a Dart 3.7–3.9 package without intentionally raising the floor. Do not use Dart 3.13-only features in a Dart 3.12 repository.
## 4. Start from the actual C-facing header
Never guess ABI types from conceptual meaning.
Verify for every function/struct:
```text
integer width and signedness
pointer width
alignment and padding
field order
packing
calling convention
return convention
enum representation
variadic promotions
platform typedefs
```
Examples:
```text
int32_t        → Int32
uint32_t       → Uint32
size_t         → Size
intptr_t       → IntPtr
uintptr_t      → UintPtr
long           → Long
unsigned long  → UnsignedLong
wchar_t        → WChar
C bool/_Bool   → Bool
void*          → Pointer<Void>
opaque foo_t*  → Pointer<Foo> where Foo extends Opaque
```
Never map C `long` to `Int64` by intuition; Windows and common POSIX 64-bit ABIs differ. Never map Win32 `BOOL` to Dart FFI `Bool`; Win32 `BOOL` is integer-sized.
Validate Dart `int` values before narrowing into bounded native types.
## 5. Prefer generated bindings for non-trivial APIs
Use `ffigen` when headers are more than a tiny stable surface.
Generated code should remain mechanical. Put idiomatic naming, validation, ownership, errors, and lifecycle in the safe wrapper.
Rules:
- pin generator versions;
- regenerate when headers change;
- review generated diffs;
- do not hand-edit generated bindings;
- verify macros/static-inline APIs that may not exist as runtime symbols;
- verify packing and unusual compiler attributes;
- test critical enum/layout assumptions.
Keep handwritten `DynamicLibrary.lookupFunction` only when intentional: tiny APIs, system libraries, runtime-selected binaries, closed-source/legacy integrations, or compatibility constraints.
Resolve repeated symbols once when constructing bindings, not inside hot loops.
## 6. Prefer a small stable C ABI
When wrapping C++ expose `extern "C"` functions and opaque handles.
Prefer:
```text
create(handle**)
process(handle*, input*, input_len, output*, capacity, written*)
destroy(handle*)
```
Avoid crossing the boundary with:
```text
C++ classes
std::string
std::vector
templates
overloads
compiler-dependent C++ objects
exceptions
```
Catch C++ exceptions inside the native shim and translate them into status/error data. Never allow C++ unwinding through FFI frames.
When you control the ABI, document an ABI version and consider version/size fields for evolvable option structs.
## 7. Write an ownership contract before allocating
For every pointer/resource answer:
```text
Who allocated it?
Who owns it now?
Borrowed or transferred?
Can the callee retain it?
Can either side mutate it?
What length/capacity is valid?
When does it become invalid?
Which exact function frees it?
Can it be used concurrently?
Can async native work or callbacks retain it?
```
If any answer is unknown, investigate before coding.
## 8. Match allocator and deallocator exactly
Examples:
```text
package:ffi malloc     → malloc.free
package:ffi calloc     → calloc.free
library_create_buffer  → library_free_buffer
library_create_handle  → library_destroy_handle
borrowed/static memory → never free from Dart
```
Do not assume `package:ffi` `malloc` matches a library allocator. On Windows its allocator contract is not “whatever CRT the library uses.”
Use `try/finally` for clear short lifetimes. Use `Arena` when multiple temporary allocations genuinely share one scope. Do not put native-retained memory in an arena that ends before native ownership ends.
## 9. Make handle wrappers deterministic
Opaque native resources should expose a Dart API like:
```text
open/create
use
close/dispose
closed-state validation
```
Use explicit close for databases, sessions, codecs, model contexts, native buffers, and other important resources.
Use `NativeFinalizer` only as a safety net when appropriate. Prevent finalizer/manual-close double destruction by detaching before manual destroy and making close idempotent where useful.
Do not rely on finalization for timely resource release.
## 10. Prevent use-after-free and double-free structurally
Never return a native-backed view after freeing its allocation:
```text
pointer.asTypedList(length)
free(pointer)
return view   ← invalid
```
Copy before release unless the returned object itself owns native memory and controls its lifetime.
A live `Pointer<T>` object proves only that Dart still holds an address value. It does not prove the pointed-to memory is valid.
Check `nullptr` before dereference. Validate native-reported lengths/capacities before creating views or reading memory.
## 11. Treat `asTypedList()` as a view, not “zero copy” proof
`asTypedList()` creates a Dart view over native memory. The allocation must remain alive, correctly sized, and aligned for the full use of that view.
Do not call an entire pipeline “zero-copy” unless you have traced every allocation and copy from original source through final consumer.
Prefer precise wording:
> This typed-list view does not copy the native buffer at view creation.
## 12. Match structs, unions, arrays, and packing exactly
For structs:
- preserve field order;
- preserve native field types;
- use `sizeOf<T>()` carefully;
- verify critical `sizeof` and `offsetof` against native helper functions.
Use `@Packed(n)` only when the native declaration/compiler packing proves that alignment. Never pack merely to save bytes.
For unions, inspect the discriminator/tag before reading the active field.
Distinguish inline arrays from pointers:
```text
uint8_t bytes[32]   ≠   uint8_t* bytes
```
Prefer opaque handles over public mutable structs for new durable ABIs when it simplifies versioning.
## 13. Treat encoding as part of the ABI
Determine whether native expects:
```text
UTF-8
UTF-16
UTF-32
wchar_t
code-page bytes
binary bytes
NUL-terminated string
pointer + explicit length
```
`toNativeUtf8()` allocates native memory; free it with the matching allocator when the call does not retain it.
Do not equate UTF-16 with `wchar_t*` across operating systems.
For native-returned strings, distinguish owned vs borrowed memory. Decoding to Dart does not automatically transfer/release native ownership.
Hot-path string conversions can dominate tiny native work; batch or redesign around IDs/handles only when measurement justifies it.
## 14. Choose callback mechanism from the native calling thread
Document the callback thread before selecting the API.
Use roughly:
```text
same Dart isolate thread + static/top-level legacy callback → Pointer.fromFunction
same creator thread + closure/synchronous return          → NativeCallable.isolateLocal
arbitrary native thread + async void notification         → NativeCallable.listener
experimental isolate-group semantics                      → only if SDK/API status is intentionally accepted
```
Do not use same-thread trampolines for callbacks that native worker threads may invoke.
Keep callback objects alive while native retains the function pointer.
Teardown order:
```text
stop native producer
→ unregister callback
→ confirm no in-flight callbacks if contract requires
→ close NativeCallable
→ release callback/userdata state
```
Calling a closed trampoline is undefined behavior.
For asynchronous listener callbacks, pointer arguments must remain valid until Dart actually processes the callback, not merely until the native function-pointer call returns.
## 15. Separate thread safety from Dart isolate safety
A synchronous FFI call blocks the isolate that calls it. Long native compute on Flutter's UI isolate can block frames and input.
Move work off the UI isolate only after verifying:
```text
library thread safety
handle thread affinity
main-thread requirements
native internal worker pools
callback thread assumptions
```
Do not send raw `Pointer`, `DynamicLibrary`, finalizable native handles, or other unsendable FFI resources between isolates. Create/use/destroy thread-affine native contexts inside the isolate that owns them.
A Dart mutex does not automatically protect shared state used directly by native worker threads.
Watch for oversubscription when Dart isolates invoke a native library that already owns a thread pool.
## 16. Translate native errors at the wrapper boundary
Native errors may use:
```text
status codes
null pointers
output error objects
errno
GetLastError
library-owned messages
```
Map them into typed Dart exceptions/results in the safe wrapper. Do not make widgets interpret raw `-37` status codes.
For `errno` or Win32 last-error semantics, capture the value immediately according to the native API contract, often inside one C shim call.
Do not expect Dart `try/catch` to recover from segmentation faults, stack corruption, heap corruption, double frees, or calling-convention UB.
## 17. Keep variadic, macro, and inline boundaries explicit
Use variadic FFI only when you fully model the native promotion/signature rules. For complex recurring varargs APIs, write fixed-signature C shims.
Macros and `static inline` functions may not exist as exported runtime symbols. Generate constants where supported or expose a real wrapper function.
Treat mutable native globals as shared native state with explicit synchronization/initialization rules.
## 18. Prefer modern build hooks/code assets when the repository supports them
For new source-owned FFI packages on compatible Flutter/Dart, prefer the current `package_ffi`/build-hook/code-asset workflow when it replaces duplicated per-platform build wiring cleanly.
Do not force migration when:
- the repository supports pre-Dart-3.10 SDKs;
- current platform build files contain essential custom behavior;
- integration needs Flutter Plugin APIs or host runtime configuration;
- migration cost exceeds the benefit.
Do not add Dart 3.13 link-hook/tree-shaking assumptions to a Dart 3.12 project.
## 19. Validate every target platform and architecture
### Android
Build every claimed Flutter ABI. Verify packaged `.so` files, exported symbols, C++ runtime compatibility, release stripping, and current Android native-library/page-size requirements. Test real ARM64 devices.
### iOS
Package correct device and simulator variants. Treat XCFramework/framework/static/code-asset packaging as Apple-native concerns, not Android-style `.so` loading. Verify symbols and signing.
### macOS
Build x64/ARM64 as promised, sign native code, and test Hardened Runtime/sandbox conditions used in release.
### Windows
Verify x64/ARM64 artifacts, declared calling conventions/types, CRT allocator boundaries, transitive DLLs, and secure DLL search/loading paths.
### Linux
Verify architecture, SONAME/dependencies, RPATH/RUNPATH, and the oldest glibc/runtime baseline you promise.
### Web
`dart:ffi` is unsupported. Use conditional imports/exports with a pure Dart, JS interop, or Web/Wasm-specific implementation. Do not compile `dart:ffi` into web code and hide it behind runtime `Platform.is...` checks.
## 20. Optimize boundary crossings, not folklore
Break cost into:
```text
wrapper validation
allocation
encoding
copy
FFI transition
native compute
native synchronization
callback/message delivery
result conversion
cleanup
```
Batch tiny operations when the C API remains maintainable.
Avoid per-element/pixel/sample calls when one buffer/batch call can do the same work.
Resolve symbols once. Avoid repeated UTF allocations in hot loops. Reuse expensive native contexts only with explicit ownership/threading and deterministic cleanup.
Do not use `isLeaf` as a generic speed flag; use it only when the function is genuinely short, non-blocking, cannot call into Dart, and the API contract supports it.
## 21. Profile both Dart and native memory
Debug mode is not a production benchmark.
Measure profile/release builds with optimized native code.
Track:
```text
p50/p95 latency
throughput
CPU
Dart allocations
native heap
copies
startup
peak memory
thread count/contention
```
A stable Dart heap does not prove the native heap is leak-free.
Use platform-native memory tooling where appropriate.
## 22. Use native sanitizers and crash symbols
For native code you control, consider:
```text
ASan  → use-after-free, overflow, invalid/double free
UBSan → undefined behavior, misalignment, invalid shifts/bounds
TSan  → data races where supported
```
If full Flutter integration is difficult, run the native library's standalone tests under sanitizers.
Preserve production symbol files (dSYM/PDB/unstripped ELF or appropriate native symbols). Native crashes often require a native symbolicated stack; a Dart stack ending at the wrapper boundary is rarely enough.
## 23. Treat native dependencies as supply-chain dependencies
Record for third-party native code:
```text
upstream/version/revision
license
source/download origin
checksum/signature
compiler/build flags
target ABIs
local patches
known CVEs
upgrade process
```
Never download and execute an unpinned “latest” native artifact from a build script.
Do not load executable libraries from user-controlled paths or insecure DLL search locations.
## 24. Keep secrets and untrusted data defensive
FFI leaves Dart's managed memory-safety environment.
Validate native-facing:
```text
lengths
capacities
offsets
counts
integer arithmetic/ranges
dimensions
null pointers
status codes
```
Treat native parsers of attacker-controlled binary formats as security-sensitive. Fuzzing is appropriate when parser risk justifies it.
Do not claim ordinary `malloc` memory is secure memory. Minimize secret copies/lifetime and use dedicated secure-memory/zeroization primitives only when the native security design warrants them.
## 25. Testing strategy
Use layered tests.
### Dart wrapper tests
Test validation, closed-state behavior, error mapping, application-model conversion, and lifecycle policy.
### Native unit tests
Test C/C++ logic independently from Flutter.
### ABI tests
For critical declarations compare Dart/native:
```text
sizeof
alignment
offsetof
enum/constants
ABI version
calling-convention assumptions
```
### Integration tests
Run against the real compiled library. Mocks cannot detect missing symbols, wrong architecture, struct offset errors, or allocator mismatch.
### Failure tests
Cover null returns, native error statuses, impossible lengths, malformed input, closed handles, callback shutdown races, unsupported ABI versions, and library-load failures.
### Performance tests
Use optimized native builds and production-like payloads. Measure end-to-end, not only the native kernel.
## 26. Migration workflow
Before changing FFI strategy:
1. inspect installed SDK/package versions;
2. read relevant changelogs/docs for the exact migration range;
3. inspect headers and generated bindings;
4. snapshot ABI/layout behavior;
5. identify ownership/callback/threading contracts;
6. migrate build/binding strategy only when toolchain floors allow it;
7. regenerate bindings reproducibly;
8. run native + ABI + integration tests;
9. run sanitizer coverage where relevant;
10. validate every target release artifact;
11. profile performance/memory again.
Do not migrate `plugin_ffi → package_ffi`, dynamic lookup → `@Native`, YAML → Dart ffigen config, or `Pointer.fromFunction → NativeCallable` merely because a newer mechanism exists. Migrate when its semantics/toolchain match the repository and provide value.
## 27. Existing-code audit gates
Flag immediately:
- handwritten declarations that disagree with headers;
- fixed-width Dart types substituted for ABI-dependent C types;
- `Bool` used for Win32 `BOOL`;
- allocator/deallocator mismatches;
- free of borrowed memory;
- missing free or double-close paths;
- typed views escaping after native memory is freed;
- unchecked `nullptr`;
- unchecked native-reported lengths;
- wrong `@Packed`/field order;
- repeated symbol lookup/UTF allocation in hot loops;
- one FFI call per tiny item/pixel/sample;
- long native compute on UI isolate;
- raw pointers/handles crossing isolates;
- callback mechanism inconsistent with native calling thread;
- callback closed before native unregister completes;
- C++ exceptions crossing the C ABI;
- Dart `try/catch` presented as native-crash protection;
- hardcoded/untrusted library paths;
- missing target architectures;
- debug native binaries used for performance conclusions;
- native heap omitted from leak analysis;
- `dart:ffi` imported into web implementation;
- raw pointer APIs spread through business/UI layers.
## 28. Production definition of done
Approve only when:
- FFI is justified;
- repository-compatible APIs/toolchain are used;
- the exact C ABI is known;
- bindings match headers and are reproducible;
- every allocation has one explicit owner and correct deallocator;
- borrowed memory is never freed;
- null/length/capacity/range checks exist;
- no obvious use-after-free/double-free path remains;
- strings use the correct encoding and ownership;
- structs/unions/packing are validated;
- callbacks match native thread semantics and teardown safely;
- native handles close deterministically;
- finalizers cannot race manual cleanup;
- long native calls do not block latency-sensitive UI work;
- isolate use matches native threading/affinity;
- boundary granularity is reasonable;
- all supported OS/ABIs build and package correctly;
- web has a separate implementation when needed;
- release/AOT artifacts have been tested;
- Dart and native memory are measured;
- sanitizers/fuzzing were considered according to risk;
- production native symbols are retained;
- native dependency provenance/update paths are known;
- analyzer, Dart tests, native tests, ABI tests, and relevant integration tests pass.
## Final operating rule
Before approving any unsafe-looking line, ask the systems question behind it:
```text
malloc(...)             → who frees on every success/error/cancel path?
nativeGetData()         → owned or borrowed, length, lifetime, release function?
asTypedList(length)     → who proves accessible bytes and lifetime?
callback.nativeFunction → which native thread can call, and until when?
Isolate.run(...)        → does the native contract permit another thread?
@Packed(1)              → which exact compiler declaration proves pack=1?
lookupFunction(...)     → is the symbol exported on every target, and why not generated/resolved once?
```
Cross the Dart/native boundary as little as practical, match the ABI exactly, model ownership and threading explicitly, keep unsafe details behind one small safe wrapper, and prove the integration on the real production architectures and build modes.
