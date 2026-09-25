# Android and R8 details

Use this reference after inspecting the pinned Android Gradle Plugin, Gradle, Kotlin, and dependency versions.

## Enablement by AGP generation

Current Android documentation describes a new optimization DSL for AGP 9.3 and later, with keep files under variant-aware `keepRules` directories. Earlier AGP releases use `isMinifyEnabled = true`, `isShrinkResources = true`, optimized Android defaults, and app `proguardFiles`. Do not mix examples across generations. Confirm the project's current DSL from its pinned AGP documentation and generated tasks.

Optimized resource shrinking is coupled to code optimization in current AGP. For older supported versions, both flags may still be explicit. Inspect the merged configuration rather than assuming a source file is the complete rule set.

## Reachability ownership

R8 sees direct managed-code references and Android build inputs. Dynamic edges require ownership:

- Application-owned reflection or name lookup: app rule or replace with explicit/generated reference.
- Library-owned reflection: library-provided consumer rule; report missing or broad rules upstream.
- JNI upcall: preserve the exact managed member and descriptor classes called from native code.
- JNI downcall: current optimized defaults cover common native method naming, but verify custom registration and packaged ABIs.
- Manifest/XML: Android tooling emits rules for supported references; custom strings and external configuration remain the application's responsibility.
- Serialization/ORM/DI/navigation: prefer code generation; inspect current maintainer rules and generated output.

`Parcelable` generated or direct references normally remain reachable. Java `Serializable`, reflection-based construction, persistent field names, and custom registries can create runtime contracts that need stable members or names. Preserve the contract, not every model.

`ServiceLoader` and `META-INF/services` behavior depends on packaging and toolchain support. Test the exact provider path; do not add a universal provider keep rule preemptively.

## Rule design

Start from the most permissive optimization modifiers the runtime contract allows:

```pro
# Runtime discovers annotated models, but their names are irrelevant.
-keep,allowoptimization,allowobfuscation @com.example.RuntimeModel class *

# Runtime reads annotated fields by reflection; class reachability comes elsewhere.
-keepclassmembers,allowoptimization,allowobfuscation class * {
  @com.example.RuntimeField <fields>;
}

# Preserve a stable externally stored name but still allow code removal.
-keepnames,allowoptimization class com.example.protocol.StableType
```

Do not cargo-cult these examples. Match the exact annotation/interface/signature used by the inspected runtime.

Full mode treats reachability and metadata endpoints more strictly than legacy compatibility behavior. `-keepattributes Signature` alone does not make the declaring type or member live. Keep the relevant endpoint and only the metadata actually consumed.

`-assumenosideeffects` and `-assumevalues` are semantic assertions. Use them only for code you own with a test proving the invariant in the release variant. A false assertion can remove observable behavior without a helpful crash.

## Resource rules

Use a uniquely named file in `res/raw/` containing `<resources tools:keep="..." tools:discard="..."/>` when a dynamic resource reference cannot be made static. Scope globs narrowly. Review the resource shrinker output, including the mapping output's resource report where supported. `tools:discard` is an assertion: test all configurations that could load the resource.

Prefer Gradle resource configuration filters for unsupported locales or alternatives only after product approval. App Bundles already deliver density, language, and ABI splits for Play; do not confuse delivery splits with source deletion.

## Library rules

Android libraries publish consumer rules through `consumerProguardFiles` in AARs; JAR libraries can package recognized rules under `META-INF/proguard`. A library's own `proguardFiles` optimize its local build and are not a substitute for consumer rules applied during the app's whole-program optimization.

Consumer rules must be additive, minimal, and limited to the library's dynamic implementation contract. Do not disable shrinking, optimization, or obfuscation globally. Test a released AAR/JAR from a small minified consumer rather than only the library module.

## Diagnostics

- Mapping: exact original-to-obfuscated names for retracing.
- Usage/removal output: investigate what was removed.
- Seeds/merged configuration: investigate roots and rule provenance.
- `-whyareyoukeeping`: shortest retention path for a target; use temporarily because it can slow optimization.
- `-checkdiscard`: fail if a deliberately removable target remains; appropriate for narrow assertions.
- R8 Configuration Analyzer: visualize which rules block optimization when supported by the pinned AGP/R8.
- APK Analyzer and bundle tooling: compare raw, download, ABI, DEX, resources, and native contributions.

When a release-only failure occurs, do not immediately keep the exception's whole package. Retrace, identify the dynamic caller and required signature/name/metadata, then test one narrow rule. If disabling optimization does not fix it, investigate dependency mismatch, packaging, ABI, signing, environment, or data compatibility.

## Version-sensitive library examples

- Recent Gson releases bundle baseline rules, but reflection over application models can still require stable field annotations, constructors, or adapters. Gson's maintainers recommend avoiding open-ended reflection in aggressively optimized Android apps.
- `kotlinx.serialization` bundles rules for standard generated serializers; named companion-object patterns have version/mode-specific guidance. Read the pinned version's README.
- Generated DI generally makes dependencies statically visible. Custom reflection or dynamic feature registration remains separate.

Never infer a rule merely from “uses Gson”, “uses Hilt”, “uses Room”, or “uses Compose”. Inspect the versions, generated code, packaged consumer rules, and failing runtime edge.
