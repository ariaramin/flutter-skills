---
name: mobile-app-shrinking-and-release-optimization
description: Safely reduce mobile release download and installed size, diagnose R8 or linker failures, write minimal keep rules, preserve crash symbols, and balance size with startup, runtime, build stability, and maintainability. Use for Android R8/ProGuard/resource shrinking, iOS dead stripping and app thinning, Flutter tree shaking and obfuscation, React Native/Hermes bundles, Kotlin Multiplatform binaries, native libraries, assets, dependency bloat, mapping files, Baseline Profiles, or release-only crashes. Do not use for routine store submission or signing work that has no optimization question.
---

# Mobile App Shrinking and Release Optimization

## Purpose

Optimize the artifact users receive without trading away correctness or diagnosability. Prefer measured removal of unreachable code, resources, dependencies, symbols, and assets over folklore or maximal shrinking.

## Core principles

1. Measure the correct release artifact before changing it.
2. Separate download size, installed size, runtime memory, startup, runtime performance, and build time.
3. Treat static reachability as the default; dynamic lookup is the exception that needs evidence.
4. Prefer code generation and explicit references over reflection and string-based lookup.
5. Trust current dependency consumer rules before adding app rules, then verify them.
6. Add the narrowest rule that protects the missing runtime edge.
7. Preserve mapping and symbol artifacts outside the shipped binary.
8. Test the optimized release path on representative physical devices.
9. Pin tool versions and verify current documentation before changing version-sensitive syntax.
10. Never present obfuscation as protection for secrets or authorization logic.

## Terminology

| Term | Meaning |
|---|---|
| Shrinking / dead-code elimination | Remove unreachable code from the program graph. |
| Optimization | Rewrite reachable code for size or speed; it can alter class, method, or control-flow shape. |
| Obfuscation / minification | Rename program elements and, in some ecosystems, also imply shrinking and optimization. |
| Tree shaking | Reachability-based elimination, commonly used for Dart and JavaScript module graphs. |
| Resource shrinking | Remove packaged resources not proven reachable; separate from code shrinking. |
| Symbol stripping | Remove debug or symbol-table data from the shipped native binary while retaining external symbol files. |
| Dependency pruning | Remove, replace, or scope dependencies so their code and assets never enter the release graph. |
| Code splitting / dynamic delivery | Divide code or assets into separately delivered units; this changes delivery rather than merely deleting bytes. |

Do not use these as synonyms. Identify the relevant compiler, linker, packager, or delivery system first.

## Optimization decision model

Before editing, answer:

- Platform, framework, pinned versions, build system, app or reusable library?
- Exact release variant and distribution channel?
- Baseline download and installed sizes for representative device variants?
- Largest code, resource, asset, native-library, and dependency contributors?
- Release shrinking and resource shrinking currently enabled?
- Reflection, JNI, generated registries, class-name loading, service discovery, dynamic resources, or WebView bridges present?
- Which dependencies ship consumer rules, and which rules dominate retention?
- Are mapping files, dSYMs, native symbols, Dart symbols, JavaScript source maps, and build metadata retained?
- Is the target size, startup, runtime, build time, or all four—with which acceptance thresholds?

If the artifact or metric is ambiguous, stop and establish it. Upload bundle size is not necessarily user download size; archive size is not necessarily installed size.

## Platform optimization matrix

| Stack | Primary eliminator | Resource / asset path | Diagnostic artifacts | Typical dynamic edges |
|---|---|---|---|---|
| Android JVM/Kotlin | R8 whole-program shrink, optimize, obfuscate | Android resource shrinker; AAB splits/delivery | `mapping.txt`, usage/seeds/configuration outputs, native symbols | reflection, JNI upcalls, serializers, class names, service loading |
| iOS/Swift/ObjC | compiler plus linker dead stripping | asset catalogs, app thinning, on-demand delivery | dSYM, archive/build metadata | Objective-C runtime lookup, selectors, reflection, plug-in registration |
| Flutter | Dart AOT tree shaking plus platform toolchain | Flutter assets plus Android/iOS delivery | Dart split-debug-info symbols plus platform symbols | entry points, native plugins, deferred components, platform reflection |
| React Native | Metro/Hermes or configured JS engine plus platform toolchain | JS/assets plus Android/iOS packaging | source maps/Hermes artifacts plus platform symbols | native module registration, dynamic imports, asset resolution |
| Kotlin Multiplatform | target backend: R8 on Android, native compiler/linker on Apple | target-specific packager | Android mappings or Apple dSYMs | expect/actual, native interop, ObjC export, reflection on JVM |

## Android optimization stack

### R8

Treat R8 as a whole-program optimizer, not a text compressor. It traces reachability, removes unreachable classes/members, optimizes bytecode, and can rename reachable program elements. Desugaring changes language/library constructs before or alongside this pipeline but is not a reason to keep everything.

Use the current Android Gradle Plugin documentation for enablement. Modern AGP syntax and defaults change; inspect the pinned AGP version and generated release task configuration rather than copying a timeless snippet. Restrict optimization to tested release-like variants unless the team deliberately maintains an optimized diagnostic variant.

R8 normally understands direct bytecode references, manifest and common Android resource references, and rules bundled by current libraries. It cannot infer arbitrary strings, native-to-managed callbacks, remote configuration names, or custom reflection.

### R8 / ProGuard-compatible rules

| Rule | Use | Risk |
|---|---|---|
| `-keep` | Preserve matched classes/members and their names/optimization unless modifiers relax it | Broad matches disable the most optimization |
| `-keepclassmembers` | Preserve selected members if their class remains | Does not keep the class alive by itself |
| `-keepclasseswithmembers` | Keep classes that contain specified members | Easy to overmatch; require a concrete contract |
| `-keepnames` / name variants | Preserve names while allowing removal | Use only where name identity is the dynamic contract |
| `-if` | Conditionally retain a related target | Powerful for library patterns; keep predicates narrow |
| `-keepattributes` | Retain metadata such as signatures or annotations | In full mode, the related items must also remain reachable |
| `-dontwarn` | Suppress a known irrelevant missing-reference warning | Never use to hide an unexplained dependency problem |
| `-dontobfuscate`, `-dontoptimize`, `-dontshrink` | Diagnostic isolation only | Global production escape hatches erase benefits |
| `-assumenosideeffects`, `-assumevalues` | Encode a proven invariant for optimization | A false assumption silently changes behavior |

ProGuard syntax compatibility does not make legacy ProGuard recipes current R8 guidance. Avoid package-wide `-keep class ** { *; }`, global attribute retention, copied rules for old library versions, and blanket warning suppression.

### Minimal keep-rule methodology

1. Reproduce in the exact optimized release variant.
2. Confirm the failure disappears when optimization is disabled; otherwise investigate another cause.
3. Capture the exception, retraced stack, failing runtime contract, dependency version, and existing merged rules.
4. Check the current library artifact for consumer rules and its maintainer guidance.
5. Identify the invisible edge: reflection, name lookup, JNI upcall, deserialization, XML, JavaScript bridge, or generated registry.
6. Preserve only the required class, member, constructor, annotation, signature, or name. Prefer `allowshrinking`, `allowoptimization`, or `allowobfuscation` where the contract permits.
7. Rebuild cleanly, rerun the failing flow, then exercise adjacent flows.
8. Inspect why the item is retained and the size delta. Remove any temporary broad rule.
9. Leave a comment naming the owning runtime contract and library version, not a vague crash reference.

Example pattern—adapt signatures to evidence:

```pro
# Native code invokes this callback by exact name and signature.
-keepclassmembers,includedescriptorclasses class com.example.bridge.NativeCallbacks {
  public void onResult(com.example.model.NativeResult);
}
```

Do not invent framework rules. Generated serializers and DI generally need fewer dynamic rules; reflection-based frameworks require their documented annotations, members, or constructors. Current Gson and kotlinx.serialization versions may bundle rules, but application model contracts still need release testing. See [Android and R8 details](references/android-r8.md).

## Reflection and dynamic behavior

Audit:

- `Class.forName`, `getDeclared*`, Kotlin reflection, annotations, generic signatures
- JNI upcalls/downcalls and native registration
- `ServiceLoader`, custom registries, plug-in discovery, class names in files or remote config
- XML/manifest/navigation classes and WebView JavaScript interfaces
- ORM entities, serializers, parceling, generated adapters, DI, and navigation code generation
- resource names through `getIdentifier`, filesystem paths, URLs, or native code

For each edge, decide whether the toolchain sees it, a dependency consumer rule owns it, or the application must declare it. Replace strings with direct references or generated registries when feasible. `@Keep` is convenient but coarse and source-coupled; prefer configuration when library consumers or precise members are the real boundary.

Kotlin metadata, runtime annotations, inner/enclosing relationships, and generic signatures are not universally required. Keep each only when a runtime consumer proves it needs them. Kotlin synthetic structure and compiler output change across versions, so target stable source-level annotations or interfaces instead of generated names.

Compose itself is not a reason for blanket rules. Treat navigation, serialization, preview/debug code, reflection-based tooling, fonts, and resources according to their actual runtime contracts. Benchmark Baseline Profiles independently from byte removal.

## Resource and asset optimization

Enable Android resource shrinking only with code shrinking as supported by the pinned AGP. Then:

1. Inspect the shrinker resource report and packaged artifact.
2. Remove unused source assets and duplicate formats first.
3. Restrict locales and densities only when product requirements permit.
4. Prefer modern vector/raster compression and correctly sized variants.
5. Add uniquely named resource keep/discard files only for real dynamic references.
6. Test locale, density, dark theme, orientation, animation, font, raw-resource, WebView, native, and remotely selected paths.

Dynamic name lookup is fragile and blocks proof. Replace it with generated IDs or explicit maps where possible. Never discard a resource solely because a static report misses a runtime string edge.

## Dependencies, modules, and libraries

- Attribute size to dependencies before removing them; transitive artifacts, resources, native ABIs, and duplicate implementations often dominate.
- Use Gradle dependency insight and artifact analysis; exclude a transitive dependency only after verifying runtime and published metadata contracts.
- Prefer an existing smaller dependency or platform API only when migration cost and behavior are acceptable.
- App modules own app reflection rules. Android libraries publish minimal `consumerProguardFiles`; do not put app-wide policy in consumer rules.
- Validate consumer rules against a minified sample consumer. Keep public API names only when binary/reflection contracts require them.
- Dynamic feature or on-demand delivery is justified by a substantial optional feature, not as a substitute for removing dead code.
- In multi-module builds, trace where rules originate and which module introduces retained code or resources.

## Native libraries

Inspect packaged ABIs, duplicate `.so`/frameworks, static versus dynamic linkage, symbol tables, bitcode-era settings that may now be obsolete, and third-party SDK slices. Do not remove an ABI required by distribution targets. Strip release binaries through supported toolchain settings while retaining uploadable native debug symbols separately. JNI upcalls need precise rules because R8 cannot see calls originating in native code.

## App bundles and delivery

Prefer Android App Bundles for Play distribution so stores can generate device-specific language, density, and ABI splits. Measure generated device APKs or store-reported delivery size, not only the `.aab`. Use feature delivery when the feature is optional and lifecycle/test complexity is justified. Validate install-time, fast-follow, on-demand, offline, upgrade, and uninstall behavior.

On Apple platforms, use asset catalogs and app thinning reports; consider on-demand resources only when access, network, and retention behavior are acceptable. See [Platform playbooks](references/platforms.md).

## Flutter

- Measure a release AOT build with Flutter's size-analysis workflow; debug builds and upload archives are misleading.
- Use `--split-debug-info` with `--obfuscate` only when required, and retain the matching Dart symbol files permanently.
- Treat obfuscation as renaming, not security. Avoid persisting runtime contracts based on Dart symbol names.
- Analyze Dart, native Android/iOS, plugin, asset, and font contributions separately.
- Use deferred components/imports only for genuinely optional code and test delivery; shared assets can be duplicated across components.
- Verify shrink-related flags against `flutter build <target> -h` for the pinned SDK because support and defaults change.

## React Native

- Benchmark release builds; development mode and bundler diagnostics distort size and performance.
- Separate JavaScript bundle/bytecode, assets, Hermes or alternate engine binaries, Android R8 output, and iOS native output.
- Keep React Native and the selected JavaScript engine/version aligned; retain source maps and engine-specific symbol artifacts.
- Do not assume arbitrary JavaScript is tree-shakeable. Inspect Metro configuration, module side effects, dynamic imports/requires, and the produced bundle.
- Native modules and generated registration should follow the pinned React Native architecture and library guidance. Apply current Android/iOS rules at the native layer rather than copying an old template's “ProGuard” switch.

## iOS / Swift

- Measure App Store Connect or an Xcode app-thinning size report; `.app`, `.xcarchive`, upload IPA, and TestFlight sizes are not direct production install measurements.
- Use release compiler optimization and `DEAD_CODE_STRIPPING` through supported Xcode defaults. Inspect linker maps and binary segments before changing flags.
- Strip appropriate symbols from the shipped product while generating and retaining dSYMs for symbolication.
- Audit Objective-C runtime lookup, selectors, `NSClassFromString`, storyboard/nib classes, dynamic frameworks, exported Swift/ObjC APIs, and registration tables before assuming code is unreachable.
- Optimize asset catalogs, duplicate media, localizations, embedded frameworks, and architecture slices before fragile compiler flag tuning.
- Treat whole-module/cross-module optimization settings as version- and build-mode-sensitive; benchmark compile time, binary size, startup, and runtime.

## Kotlin Multiplatform

Analyze each produced target independently. Android artifacts follow R8 and Android resource rules; Apple artifacts follow Kotlin/Native plus Xcode/linker packaging. Shared source does not imply shared elimination behavior. Audit ObjC/Swift exports, native interop, generated bindings, reflection on JVM, resources, and target-specific dependencies. Preserve the symbol artifacts required by each crash pipeline.

## Baseline Profiles and runtime trade-offs

Baseline Profiles and Startup Profiles guide compilation/layout of important Android paths; they do not replace shrinking. Generate and validate profiles with the final release pipeline because R8 rewrites profile rules. Benchmark startup, frame timing, memory, and binary/install size on physical devices. Reject a size win that materially regresses critical startup or runtime targets unless the product accepts the trade-off.

## Build performance

Optimize release output and build throughput as separate tracks. First profile configuration, dependency resolution, code generation, R8, resource processing, native compilation, and packaging. Then use supported incremental work, Gradle build/configuration caches, parallelism, remote caching, and CI artifact reuse where inputs are correct. Never disable shrinking or symbol generation merely to hide a slow release pipeline.

## Security and crash symbolication

Obfuscation raises reverse-engineering cost slightly; it does not protect secrets, API credentials, business authorization, or sensitive algorithms. Put secrets and policy on trusted systems and apply platform security controls independently.

For every production release, archive an immutable tuple of version/build ID, mapping file, native symbols, dSYM, Dart symbols, JavaScript source maps/engine symbols, dependency lock state, and toolchain versions. Upload required artifacts to crash services and verify one symbolication path before rollout. Never publish private symbol artifacts in a public application repository.

## Diagnostics and failure patterns

| Symptom | Likely class | First action |
|---|---|---|
| Release-only missing class/method/field | dynamic edge or incompatible dependency | Retrace, inspect consumer rules, isolate optimization |
| JSON/DB corruption after update | obfuscated persisted names or reflection metadata | Check stable annotations/schema and old data |
| JNI `UnsatisfiedLinkError` / callback failure | renamed/removed native boundary or missing ABI | Inspect packaged ABI and precise JNI signature |
| Missing image/font/layout | dynamic resource lookup or packaging | Inspect resource report and device variant |
| Unreadable crash | lost/wrong mapping, dSYM, symbols, or source map | Match artifact to exact build ID |
| Size barely changes | broad keep rules, dominant native/assets, wrong metric | Analyze retained graph and artifact composition |
| Slow release build | optimizer/native/codegen/cache bottleneck | Profile before changing correctness settings |

Use `-whyareyoukeeping` or R8 Configuration Analyzer to explain retention, `-checkdiscard` to assert a deliberate removal, APK Analyzer/bundle tooling for composition, dependency insight for graph ownership, and platform symbolication tools for crashes. Keep expensive diagnostics out of routine builds.

## Anti-patterns

- **Disable shrinking after a crash:** ships the symptom. Isolate the invisible edge and add one proven rule.
- **Keep the entire app or dependency:** prevents optimization and hides ownership. Narrow by annotation, interface, constructor, member, or exact boundary.
- **Copy an internet ruleset:** versions and consumer rules drift. Inspect the pinned artifact and official maintainer guidance.
- **Add `-dontwarn` until green:** converts evidence into runtime risk. Resolve why the reference is absent first.
- **Keep every attribute:** retains metadata without a consumer. Preserve only required attributes and reachable endpoints.
- **Delete symbols to save archive storage:** destroys production debugging. Strip shipped artifacts, retain private symbols.
- **Compare debug with release:** measures different programs. Compare equivalent release variants and device deliveries.
- **Call obfuscation security:** misplaces trust. Use server-side controls and real platform hardening.
- **Chase byte savings without thresholds:** creates fragile complexity. Set a budget and stop when value is marginal.

## Release validation workflow

1. Record toolchain versions, variant, flags, signing mode, dependency lock state, and baseline metrics.
2. Build the exact optimized release artifact from a reproducible environment.
3. Inspect code/resources/assets/native libraries and store/device-specific sizes.
4. Verify mapping and symbol artifacts exist and are associated with the build ID.
5. Install store-equivalent output on low-, median-, and high-end representative devices.
6. Exercise cold/warm startup, authentication, deep links, push, background work, databases, serialization, DI, navigation, WebView bridges, native plugins, locales, themes, dynamic resources, optional delivery, upgrades, and offline paths applicable to the app.
7. Run startup/runtime benchmarks and compare against explicit budgets.
8. Retrace or symbolicate a controlled diagnostic event.
9. Stage rollout with crash, ANR, startup, install, and size monitoring plus a rollback path.

## AI agent workflow

When implementing or reviewing:

1. Inspect project files, pinned versions, variant configuration, dependencies, existing rules, dynamic mechanisms, and CI artifact handling before proposing edits.
2. State the measured problem and distinguish download, installed, runtime, and build-time metrics.
3. Cite current primary documentation for version-sensitive behavior.
4. Prefer no change when current defaults and dependency rules already satisfy the requirement.
5. Make the smallest complete change; never invent keep rules from a framework name alone.
6. Show exact affected variants and ownership: app, library, dependency, platform, or store.
7. Validate the optimized release, not merely compilation.
8. Report size/performance deltas, checks run, symbol retention, remaining dynamic risks, and rollback.

## Review checklist

- [ ] Correct release artifact and size metric measured
- [ ] Pinned tool versions and current syntax verified
- [ ] Shrinking/resource settings scoped to intended variants
- [ ] Reflection, JNI, serialization, DI, navigation, WebView, and dynamic resources audited
- [ ] Existing consumer rules inspected before app rules added
- [ ] Every keep/suppress/assume rule narrow, justified, and tested
- [ ] Dependencies, assets, localizations, ABIs, and optional delivery measured
- [ ] Mapping, dSYM, native, Dart, and JavaScript symbols retained as applicable
- [ ] Startup/runtime/build-time trade-offs benchmarked separately
- [ ] Store-equivalent release installed and critical flows exercised
- [ ] Security claims do not rely on obfuscation

## References

- [Android and R8 details](references/android-r8.md)
- [Platform playbooks](references/platforms.md)
- [Authoritative sources](references/authoritative-sources.md)
