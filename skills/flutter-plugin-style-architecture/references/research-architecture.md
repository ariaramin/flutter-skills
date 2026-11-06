# Research: application-level plugin-style architecture in Flutter and Dart

Research date: **2026-11-05**.

## Scope and evidence discipline

This report researches an **application architecture**: an application host composes replaceable capabilities through explicit contracts. It does **not** propose a native Flutter plugin, a federated platform plugin, or a general runtime code-installation system. It is research for a possible future skill, not that skill's implementation or `SKILL.md`.

The investigation read substantive content from **28 official Flutter/Dart documentation or API pages**, three first-party source files, and seven pattern-author sources. Links from the architecture guide were followed into the case study, Compass source, and Fowler's Repository description. Rendered canonical pages were checked as well as clean article sources; a URL or search-result title alone was not treated as verification. Parnas's six-page published paper was ultimately retrieved from a university-hosted copy and read through extracted PDF text.

Evidence labels used below:

- **FACT** — documented language, tooling, or runtime behavior; not a general architectural mandate.
- **OFFICIAL RECOMMENDATION** — advice from Flutter/Dart documentation, retaining its stated qualifications.
- **SOURCE OBSERVATION** — behavior or structure visible in the inspected first-party sample; not a guarantee for every app.
- **PATTERN AUTHOR** — a statement in a pattern author's primary text; not automatically a Flutter recommendation.
- **ENGINEERING RECOMMENDATION** — this report's application-specific synthesis. Supporting sources explain the rationale, but do not prescribe the complete design.

The observed Flutter documentation footer says **Flutter 3.47**; its security banner mentions **Flutter 3.47.8**. Dart documentation and the inspected Dart API footer say **Dart 3.13.7**. These are **page observations**, not independently verified latest releases or results from `flutter --version` / `dart --version`. No Flutter/Dart build, analysis, test, or compatibility matrix was executed for this report. Documentation update dates, publication dates, and access date are separate concepts. `main`-branch sources are mutable and were not pinned to release commits.

## 1. Principal findings

1. **OFFICIAL RECOMMENDATION:** Start with separation of UI and data concerns, explicit dependencies, repository abstractions, clear inputs/outputs, and tests with fakes. Flutter presents its guidance as adaptable recommendations, not steadfast rules. These are a useful baseline for plugin-style composition, but the official guide does not define an application-plugin host protocol. [F01] [F02] [F03]
2. **ENGINEERING RECOMMENDATION:** Define plugin-style as **compiled-in, explicitly assembled implementations behind application contracts**. Replacement can happen in test, environment configuration, or application assembly. Do not promise that a new implementation can be installed into an already shipped Flutter app without rebuilding it. Flutter's compilation/reflection constraints and deferred-delivery exception must be explained separately. [F09] [F11] [F12] [D13] [D14]
3. **OFFICIAL RECOMMENDATION / SOURCE OBSERVATION:** Constructor injection and an assembly container are complementary. Compass passes dependencies through constructors, while `provider` creates and exposes shared instances and routing code assembles view models. Consumer objects need not know the provider API. Flutter recommends DI and recommends `provider`; Dart does not mandate that package or any container. [F01] [F05]
4. **OFFICIAL RECOMMENDATION:** A domain/use-case layer is **conditional**, and repositories can be shared across features. Plugin-style packaging must not turn every UI feature into a mandatory use-case stack or duplicate its own copy of shared repository state. [F02] [F04]
5. **FACT / ENGINEERING RECOMMENDATION:** Dart libraries, curated exports, package manifests, and class modifiers support boundaries. They do not automatically enforce the complete application dependency graph: underscore privacy is library-level, and `lib/src` is a convention supported by a lint, not compiler-enforced package-private storage. [D01] [D02] [D03] [D04] [D06]
6. **PATTERN AUTHOR / ENGINEERING RECOMMENDATION:** Cockburn supports technology-independent ports/adapters; Parnas supports hiding difficult or changing decisions; Fowler supports separating configuration from use. These justify selective seams. They do not establish one interface per class, six ports, or zero edits to application registration when adding an implementation. [P01] [P02] [P07]
7. **FACT / ENGINEERING RECOMMENDATION:** A typed extension contract has both caller and implementer compatibility obligations. Adding interface members, restricting subtyping, exporting dependency APIs, and changing behavioral guarantees require compatibility review. Pub resolution or a version string does not prove behavioral substitutability. [D06] [D07] [D09] [D11] [D12]

## 2. Terminology and boundaries

| Term | Meaning for this research | Important limitation |
| --- | --- | --- |
| Application host | **ENGINEERING RECOMMENDATION:** the part of the app that selects implementations and, where needed, combines feature contributions and owns their lifetime. | No official Flutter application-host interface was found. |
| Application capability / port | **PATTERN AUTHOR → ENGINEERING RECOMMENDATION:** a purposeful interaction expressed through a stable application-owned API, such as booking access or document export. | A port need not be a class; a typed function can suffice for a small interaction. [P01] [D08] |
| Adapter / implementation | **ENGINEERING RECOMMENDATION:** code translating that interaction into HTTP, persistence, native-plugin calls, or another detail. | It may itself use a native Flutter plugin; that does not make the application contract a native plugin API. [F02] [F10] |
| Feature module | **ENGINEERING RECOMMENDATION:** a cohesive responsibility boundary, possibly providing UI and application capabilities. | A module is not necessarily a package, widget, use-case, or independently deployed binary. [F04] [P07] |
| Dart/Flutter package | **FACT:** a pub-managed unit for reusable code; Flutter packages can include Flutter-specific content. | A package manifest is not runtime discovery or a sandbox. [F10] [D01] [D11] |
| Flutter plugin package | **FACT:** a specialized package providing platform implementations, including federated arrangements. | Platform-interface registration must not be presented as an application-feature registry. [F10] |
| Composition root | **ENGINEERING RECOMMENDATION:** the application's assembly boundary that knows concrete implementations and connects consumers to them. | This terminology/mapping is synthesis from configuration/use separation, not a named requirement in the inspected Flutter guide. [F05] [P02] |
| Registry | **ENGINEERING RECOMMENDATION:** an explicit collection of known factories or contributions, if the product needs extensible sets. | Not reflection-based scanning; a list of factories is often enough. No registry is needed merely to inject one repository implementation. |

Fowler's catalog **Plugin** is a related but stronger deployment pattern: it links classes during configuration rather than compilation and discusses changing runtime configuration without rebuilding. Its entry credits **David Rice and Matt Foemmel**. A statically compiled Flutter design borrows dependency/configuration separation, **not that literal deployment guarantee**. [P03]

## 3. Official Flutter application architecture: what to preserve

### 3.1 Recommendation strengths

The recommendations page explicitly distinguishes priorities. Do not flatten the following into equally mandatory rules. [F01]

| Priority on the inspected page | Relevant guidance |
| --- | --- |
| Strongly recommend | Clearly defined UI/data layers; repository/service separation; views and view models (MVVM); keeping data/business logic out of widgets; unidirectional data flow; immutable data models; DI; abstract repositories; separate and combined component tests; fakes. |
| Recommend | Commands for user events; `provider` for DI in the DI discussion; `go_router` for routing with stated exceptions; consistent component names; optional generation tools such as `freezed` / `built_value` for model functionality. |
| Conditional | A domain/use-case layer; separate API and domain models; `ChangeNotifier` / `Listenable` as a state-update mechanism. |

**OFFICIAL RECOMMENDATION:** Views handle presentation and user events, including simple visibility, layout, animation, and routing logic. View models transform data into UI state and expose command callbacks. Repositories own application data and associated caching, retry, error, refresh, and synchronization behavior. Services isolate external data sources and asynchronous I/O. These are responsibilities, not requirements for a fixed number of packages or classes. [F01] [F02] [F06] [F07]

### 3.2 Dependency and state relationships

**OFFICIAL RECOMMENDATION:** Views/view models are paired at the level of a feature or composed view, **not one view model per widget**. View models and repositories are many-to-many; repositories and services are also many-to-many. Repositories should not be aware of one another in this guide's design. Combine multi-repository data in a view model or a suitable optional use-case. [F02] [F05]

**OFFICIAL RECOMMENDATION:** Shared repositories are an appropriate source of app-session state, such as an active user session or in-memory cache. Multiple view models can depend on the same instance. The detailed guide explicitly mentions a service locator or DI container as a typical instance-management mechanism; it does not substantiate a claim that all service locators are forbidden or inherently untestable. [F02]

**SOURCE OBSERVATION:** Compass organizes UI by feature but organizes repositories/services by architectural type because data objects are not tied to a single UI feature. Its `domain/` directory holds shared data models. The existence of domain **models** is not evidence that every operation must pass through a domain **use-case layer**. [F04]

**ENGINEERING RECOMMENDATION:** Preserve a single authoritative owner for shared session/data state when extracting packages. A feature may consume a shared contract without owning another repository instance. Package extraction should follow responsibility and change boundaries rather than mechanically mirroring every screen. [F02] [F04] [P07]

### 3.3 Optional domain layer and policy boundaries

**OFFICIAL RECOMMENDATION:** Add use-cases for logic that combines repositories, is exceedingly complex, or is reused across view models. The guide explicitly allows view models to depend on **both** repositories and selected use-cases. Creating a forwarding use-case for every data call intensifies boilerplate and cognitive overhead. [F02]

**ENGINEERING RECOMMENDATION:** A plugin-style app can put stable business policies and contracts in a pure-Dart package when that creates a real portability/testability boundary. This is an additional design choice, not an official requirement that all Flutter applications have a framework-free domain package. UI-specific contracts can legitimately remain Flutter-dependent; separate them from reusable non-UI contracts when useful. [F02] [F04] [P01]

### 3.4 Testing evidence

**OFFICIAL RECOMMENDATION / SOURCE OBSERVATION:** Compass uses repository fakes for view-model tests, a real view model with fakes for widget tests, and fake services to test repositories. Routing and DI assembly deserve tests as well as individual methods. Other state-management tools and streams can implement similar boundaries. [F01] [F04] [F08]

**ENGINEERING RECOMMENDATION:** Test replacement at the contract boundary and test the complete assembled feature. Do not promise that every view-model test runs with plain `dart test`: an implementation extending Flutter's `ChangeNotifier` remains Flutter-dependent even if it is tested without rendering widgets. [F07] [F08]

## 4. Pattern-author foundations and their Flutter-specific interpretation

### 4.1 Ports and adapters: Cockburn

**PATTERN AUTHOR:** Cockburn's original hexagonal article describes an application usable and testable independently of its UI and database. Ports represent purposeful conversations; adapters translate those interactions for different technologies. Multiple adapters can serve a port, including test adapters. The hexagon does not prescribe six ports. [P01]

**ENGINEERING RECOMMENDATION:** Define ports in the terms of the capability/policy using them, not in the vocabulary of a vendor SDK. A repository abstraction can be a port when it serves that boundary. An HTTP client, generated DTO, or DI-container lookup should not unnecessarily become the stable application API. Not every internal method requires a port. [F02] [F05] [P01]

The source-dependency shape below is an **interpretation**, not a required Flutter package layout or runtime message sequence:

```text
application assembly -> concrete adapter
application assembly -> policy consumer
policy consumer      -> capability contract <- concrete adapter
```

The assembly code can depend on both sides. The useful invariant is that stable consumers do not import the selected adapter merely to perform their work. Calling an adapter at runtime is compatible with depending only on its contract at source level. [P01] [P02] [P06]

### 4.2 Configuration versus use: Fowler

**PATTERN AUTHOR:** Fowler's DI article separates configuration from use and has an assembler inject an implementation into a consumer. He prefers constructor injection, while discussing situations where setters or other approaches are appropriate. He also explains service locator and notes that both locator and DI can support testing; the distinction is not simply “testable versus untestable.” [P02]

**ENGINEERING RECOMMENDATION:** Prefer explicit constructor dependencies for ordinary consumers and contain container/locator calls at assembly boundaries. This makes dependencies visible without forcing a particular DI package. A scoped factory callback is often a better seam than a universal global locator or a new single-method interface. [F05] [D08] [P02]

### 4.3 Open/closed principle: Martin, with attribution limits

**PATTERN AUTHOR:** Robert C. Martin's 2014 article attributes the open/closed principle to **Bertrand Meyer (1988)** and argues for dependency inversion between policies and details, illustrated with plugins. Martin's article is a primary source for **his interpretation**, not the original publication of Meyer's principle. Its independently deployed jar/dll/gem examples do not establish Flutter deployment behavior. [P06]

**ENGINEERING RECOMMENDATION:** Aim to add an implementation or contribution without modifying the stable policy consumer. It is acceptable and expected to modify application assembly, dependency declarations, tests, or an explicit registration list. Avoid the absolute promise “adding any feature changes no existing code”; capability expansion or changed policy can require a contract change. OCP is about a chosen axis of change, not anticipating every future variation. [P02] [P06] [D07]

### 4.4 Information hiding: Parnas

**PATTERN AUTHOR:** The published 1972 paper treats a module as a **responsibility assignment**, not necessarily a subprogram (p. 1054). In the KWIC comparison, hiding storage representation localizes storage changes, unlike exposing shared table layouts (pp. 1055–1056). Parnas proposes beginning with difficult or likely-to-change design decisions and hiding them behind module interfaces (p. 1058). [P07] [P07-text]

**PATTERN AUTHOR:** Parnas also points out that prescribing an unnecessary circular-shift ordering overconstrains implementations (p. 1056). He distinguishes clean decomposition from a hierarchical “uses/depends upon” partial order: these are desirable but independent properties (pp. 1057–1058). He discusses possible procedure-call overhead and alternative compilation/assembly strategies rather than claiming abstraction is free. [P07-text]

**ENGINEERING RECOMMENDATION:** Hide vendor APIs, data representation, and storage decisions where they are genuinely volatile. Specify ordering only when callers require it. Evaluate both information leakage and dependency structure; an acyclic graph alone does not prove good modules. Measure performance in the real Flutter target rather than transferring 1972 implementation costs or claiming zero-cost interfaces. [P07-text] [F13]

### 4.5 Modular monolith: Fowler, not a Flutter mandate

**PATTERN AUTHOR:** Fowler's *Monolith First* argues that initially uncertain boundaries are easier to change inside a monolith and discusses modular API/data boundaries. He explicitly describes the evidence as tentative and anecdotal; successful later extraction is not guaranteed. [P05]

**ENGINEERING RECOMMENDATION:** For a Flutter app, “modular monolith” can mean one shipped application with intentionally separated capabilities/packages. It need not imply microservices, independent runtime deployment, or one server/database per feature. Start with useful library boundaries and extract packages when ownership, reuse, independent validation, or substitution justify the extra manifests and dependency coordination. [D01] [D05] [P05] [P07-text]

**PATTERN AUTHOR / OFFICIAL RECOMMENDATION:** Fowler's Repository catalog describes collection-like mediation between domain and data mapping and credits **Edward Hieatt and Rob Mee**. Flutter's repository guidance assigns broader source-of-truth/cache/service responsibilities. Cite each in its own context rather than claiming their definitions are identical. [P04] [F02] [F06]

## 5. Dart modularity and contract syntax

### 5.1 Libraries, exports, and packages

**FACT:** A Dart file together with its parts forms a library. Names beginning with `_` are private to that library, not to the whole package. Separate files in the same package do not automatically share private access. Imports/exports, prefixes, and `show`/`hide` control how APIs are referenced and exposed. [D02]

**OFFICIAL RECOMMENDATION / FACT:** Dart recommends small libraries and a curated main export library; `lib/src` holds implementation details by convention. Other packages can technically import those details, but should not. The stable/recommended `implementation_imports` lint detects such cross-package implementation imports. It does not validate every allowed application-layer dependency. Ordinary libraries are preferred to using `part` as a general modularity mechanism; parts remain useful for generated code. [D01] [D03] [D04]

**ENGINEERING RECOMMENDATION:** Export the intended contracts, input/output types, and assembly entry points, using `show` where useful. Avoid exporting the entire implementation tree or a vendor SDK simply for convenience. Combine curated exports, declared dependencies, the lint, and project-specific import checks in CI when stronger boundaries are needed. These are complementary controls, not a claim of compiler-enforced package privacy. [D01] [D03] [D04] [D11]

**FACT:** Conditional imports/exports are a mechanism for selecting platform-specific implementations; the alternatives should expose the same API. Deferred imports use a statically declared URI and an explicit `loadLibrary()` call. Dart advises keeping types used across deferred boundaries in a shared nondeferred library. Neither mechanism constitutes arbitrary module discovery. [D01] [D02]

### 5.2 Class modifiers: choose the intended extension mechanism

The following behaviors are **FACTS** about boundaries between **libraries**, including libraries in the same package. New class modifiers other than `abstract` require language version **3.0 or later**. [D06] [D07]

| Declaration | Documented external-library behavior | Engineering use / caveat |
| --- | --- | --- |
| `abstract class` | Cannot be constructed directly; can be extended or implemented. | Matches the inspected Compass repository style; does not express implementation-only intent. [S01] |
| `abstract interface class` | Cannot be directly constructed or externally extended; can be externally implemented. | Useful for a capability contract with independent adapters, when the supported language version permits it. Not mandatory for every abstraction. |
| `base class` / `abstract base class` | Requires inherited implementation outside the defining library; prevents external `implements`; subtype restrictions propagate. | Useful for deliberately inherited behavior, not an open independently implemented port. Added implemented members are inherited, with caveats such as name/signature collisions. |
| `final class` | Prevents external extension and implementation; same-library subtyping remains possible under the modifier rules. | Useful when consumers should use rather than subtype a concrete type. It does **not** make fields or nested objects immutable. |
| `sealed class` | Implicitly abstract; direct subtypes must be in the same library; enables exhaustiveness checking. | Useful for a closed result/state family, not an externally extensible plugin port. Indirect subtyping depends on the modifiers of the direct subtypes. |

**FACT / OFFICIAL RECOMMENDATION:** Restrictive modifiers can be breaking API changes. A new sealed subtype can break exhaustive switches. `interface` controls implementation versus inheritance, not behavioral correctness; `final` is not a blanket guarantee that all future changes are compatible. [D06] [D07]

**FACT:** A package's default language version derives from the **lower bound** of its SDK constraint. Merely installing a newer SDK does not enable newer syntax in a package that still targets an older language version. Account separately for the SDK that executes tooling and the package language version. [D10]

### 5.3 Effective Dart and a proportionate public surface

**OFFICIAL RECOMMENDATION:** Effective Dart favors narrow public/private surfaces, explicit types in public signatures, deliberate class-modifier choices, and final fields where reassignment is unnecessary. It cautions against implementing a class not intended as an interface and against creating a one-member abstract class where a function is a sufficient abstraction. [D08]

**ENGINEERING RECOMMENDATION:** Prefer small capability APIs in domain terms over a universal `invoke(String, dynamic)` bus. Introduce interfaces for meaningful replacement contracts, not to decorate every class. Keep model invariants and mutability explicit; a `final List` reference or a read-only view over a mutable backing list is not an immutable snapshot. [D08] [F01] [F07]

## 6. Dependency injection and explicit assembly

**SOURCE OBSERVATION:** The DI case study exposes services/repositories near the top of the widget tree using `MultiProvider`. Provider creation callbacks obtain dependencies with `context.read()`. Route builders obtain repositories and pass them into view-model constructors; views receive view models. Injected repository/service references remain private to consumers. [F05]

**SOURCE OBSERVATION:** Compass's `BookingRepository` is an `abstract class` with four typed asynchronous methods returning `Result`: listing, lookup, creation, and deletion. The sample does not itself establish a requirement to use `abstract interface class`. [S01]

**SOURCE OBSERVATION:** `ApiClient` accepts `HttpClient Function()? clientFactory`, stores configuration fields, and has a mutable authentication-header-provider callback. Its delete implementation performs `client.delete`, and its I/O methods close clients in `finally`. This is a concrete function-based injection seam, and it shows why “stateless service” should not be interpreted as “no fields and no I/O effects.” [S02]

The following assembly guidance is **ENGINEERING RECOMMENDATION**, supported by explicit constructor seams and configuration/use separation, not an official host specification: [F05] [D08] [P02]

1. Select environment/platform implementations at a deliberate application assembly boundary. Keep ordinary consumers unaware of container APIs or concrete environment classes.
2. Reuse shared repository instances where they own common session state. Scope view-model instances according to their view/feature lifetime rather than making every object a global singleton.
3. Start with direct constructors and typed factories. Add a module registry only if there is an actual set of contributions to manage, such as routes, export strategies, or tools.
4. If a registry is needed, use explicit imports and registrations. Define identity, duplicate handling, deterministic ordering where required, and missing-capability behavior; validate before exposing a partially assembled feature.
5. Make dependency requirements and ownership visible. Validate cycles if the host relies on a dependency DAG. Pub resolving dependencies is not validation of the host's initialization/ownership graph.
6. Add lifecycle coordination only for modules that actually own resources or need asynchronous startup. Do not force pure functions/data contributions to implement ceremonial `start`/`stop` methods.
7. For lifecycle-bearing modules, specify partial-start failure, overlap/reentrancy policy, cleanup failures, cancellation, and reverse dependency-aware teardown. Do not claim that a timeout cancels work or that disposing a view inherently awaits application-wide cleanup. These need their own API/runtime evidence and implementation tests.

No inspected official page specifies application module IDs, capability negotiation, initialization order, hot unload, or a universal registry/lifecycle API. A future skill must label those as **project protocol design**, not Flutter-provided behavior.

## 7. Contracts, evolution, and compatibility

### 7.1 Contract contents beyond signatures

**OFFICIAL RECOMMENDATION:** Effective Dart asks for useful public API documentation, type invariants, and prose explaining parameters, returned values, and exceptions. A signature cannot communicate every behavioral expectation. [D09]

For replaceable implementations, document the following as **ENGINEERING RECOMMENDATIONS**, not properties automatically checked by Dart: [D09] [P01] [P07-text]

- Valid inputs, output invariants, identity/equality expectations, and whether values are snapshots or views of mutable state.
- Failure representation and which failures are recoverable; whether an operation throws or returns an explicit result.
- Ordering, consistency/freshness, mutation ownership, and observable side effects.
- Stream subscription behavior, completion, error delivery, and ownership of subscriptions/controllers where relevant.
- Whether operations are repeatable/idempotent; overlap, cancellation, and resource-disposal obligations if relevant.
- Required and optional capabilities, unsupported-platform behavior, and backward-compatibility expectations.

Do not specify ordering or lifecycle promises that consumers do not need: unnecessary guarantees constrain future adapters, as Parnas's ordering example demonstrates. Conversely, do not leave required behavior implicit in one adapter. [P07-text]

### 7.2 Caller compatibility versus implementer compatibility

**FACT / ENGINEERING IMPLICATION:** An external implementer must satisfy the interface it implements. Adding a member can therefore break adapters and fakes, even when existing callers do not call it. Adding a concrete method to an interface class does not supply inherited behavior to a class using `implements`. An inheritance contract has different evolution tradeoffs. [D06] [D07]

**FACT:** Applying `interface`, `base`, `final`, or `sealed` can invalidate previously legal subtyping. Adding a sealed direct subtype can invalidate exhaustive switches. Treat changes in permitted extension mechanisms as API changes, not internal formatting. [D07]

**ENGINEERING RECOMMENDATION:** Review a change against existing consumers **and** implementations. When a capability is optional, a separate small contract or explicitly documented capability query may be preferable to growing a mandatory universal interface. Do not add negotiation/version machinery if ordinary source compatibility and pub constraints solve the problem. [D07] [D08] [D11]

**ENGINEERING RECOMMENDATION:** Run a reusable behavioral contract suite against each intended substitute, including fakes where their behavior is relied upon. Add assembly tests for selected implementations, duplicate/missing registrations, and resource ownership. Component tests are officially recommended; a standardized cross-adapter contract-test harness is this report's extension of that advice. [F01] [F08] [P01]

### 7.3 Pub version resolution and semantic versioning

**FACT:** Pub resolves a single version of each package for a dependency graph, satisfying the intersection of dependent constraints. Different features cannot assume simultaneous incompatible versions of a contract package just because they reside in separate packages. App lockfiles record the chosen resolution and should be committed. [D03] [D11]

**OFFICIAL RECOMMENDATION / FACT:** Declare direct dependencies rather than relying on accidental transitive availability. Code imported by `lib`/`bin` belongs in regular dependencies; test-only tooling can be a dev dependency. Dependency overrides can select versions outside declared support and are not proof of compatibility. [D12]

**FACT / OFFICIAL RECOMMENDATION:** Re-exporting a dependency makes that API part of the exporting package's effective API. The advanced versioning guide highlights the difficulty of representing that evolving API in the wrapper's version and recommends tighter upper/lower constraints for exported dependencies. The general dependencies guide recommends broad compatible ranges/caret syntax. Apply the exported-API caveat deliberately rather than universally pinning all dependencies or indiscriminately re-exporting them. [D11] [D12]

**FACT:** The inspected dependencies page explicitly says pub follows **Semantic Versioning 2.0.0-rc.1**, because build identifiers distinguish versions. The Dart community's pre-1.0 convention shifts breaking increments to the minor position; for example `^0.1.2` excludes `0.2.0`, while `^1.3.0` excludes `2.0.0`. Do not silently substitute final SemVer 2.0.0 build-metadata semantics. [D11] [D12]

**ENGINEERING RECOMMENDATION:** Version public contract changes according to their compatibility impact, including behavioral changes, exposed dependency types, and implementer obligations. A successful version solve only establishes satisfiable declared constraints; passing analysis establishes type checks, not full behavioral substitutability. [D07] [D09] [D11] [D12]

### 7.4 Workspaces and minimum-version validation

**FACT:** Pub workspaces provide one root lockfile and shared `.dart_tool/package_config.json` for all workspace packages. Workspaces were introduced in **Dart 3.6.0**; members must declare an SDK constraint of `^3.6.0` or higher. Workspace glob support requires **Dart 3.11 or later**; explicit member paths avoid that extra requirement. Workspace support and class-modifier support have different minimums. [D05] [D06]

**FACT:** Dependencies on another workspace member resolve to the local member regardless of declared source, but that member's version must still satisfy the declared constraint. Only one override per package is allowed across the workspace. The shared resolution exposes incompatible constraints early, but couples resolution across members and includes their development dependencies. [D05]

**OFFICIAL RECOMMENDATION:** Test upgraded and downgraded dependencies. The dependencies guide recommends `dart pub downgrade`, `dart analyze`, and `dart test` to detect inaccurate lower bounds, while warning that this does not cover all possible version combinations. The workspace guide documents temporarily clearing `resolution` through `pubspec_overrides.yaml` to validate a member independently. [D05] [D12]

**ENGINEERING RECOMMENDATION:** Validate published/reusable packages both in the workspace and in isolated consumer/minimum-dependency configurations. Otherwise, the shared workspace can select a newer dependency for another member and conceal an inaccurate lower bound. Use Flutter tooling for Flutter-dependent tests/builds; the documented Dart commands are not a claim that Flutter code runs as plain Dart. Do not permanently ship test overrides as compatibility fixes. [D05] [D12]

### 7.5 SDK compatibility policy is not a permanent guarantee

**OFFICIAL RECOMMENDATION / FACT:** Flutter's compatibility policy balances stability and evolution, describes breaking-change communication/migration, and values contributed regression tests. Dart's breaking-change process assumes public API use, no static analysis errors, explicit language versioning, and no experimental/restricted API misuse. Security fixes, bugs, unspecified behavior, and evolution are stated reasons for justified changes. [F14] [S03]

**ENGINEERING RECOMMENDATION:** Keep SDK and dependency upgrades observable and tested. Neither policy guarantees that every external package, application behavior, undocumented internal import, or old binary remains compatible forever. [F14] [S03]

## 8. Compilation, reflection, and runtime-loading limits

### 8.1 Verified constraints

**FACT:** Flutter's JSON documentation explains that runtime reflection is disabled in Flutter because it interferes with tree shaking, and presents code generation as an alternative. The Dart `dart:mirrors` API is unstable and supported only by the Dart VM on some platforms. Do not generalize Flutter's restriction into “all Dart runtimes have no reflection.” [F11] [D13]

**FACT:** The framework overview describes native release compilation to machine code and web compilation to JavaScript or WebAssembly. `dart compile` also documents native executable/AOT, kernel/JIT, JS, and Wasm outputs; native AOT/executable outputs are architecture-specific and exclude mirrors. Standalone Dart compiler outputs are not a documented Flutter plugin installer or portable hot-load format. [F09] [D14]

**ENGINEERING RECOMMENDATION:** Use explicit imported factories or build-time-generated registration, retaining visible references to required implementations. Do not design Flutter discovery around `dart:mirrors`, scanning class names, or creating arbitrary types from strings. Code generation should generate ordinary inspectable code with analyzable dependencies; it does not itself create a runtime code-loading platform. [F11] [D02] [D14]

### 8.2 Runtime selection is not runtime code installation

| Mechanism | Evidence-backed description | What not to promise |
| --- | --- | --- |
| Select one injected implementation | **ENGINEERING RECOMMENDATION:** choose among implementations already imported/compiled into the app. | Runtime configuration cannot select arbitrary code absent from the shipped build. |
| Build-time/platform selection | **FACT:** conditional imports/exports select known platform implementations with a consistent API. [D01] | Not a general runtime installation API. |
| Deferred web library | **FACT:** a statically declared deferred import is loaded through `loadLibrary()`; Flutter docs describe separate JavaScript components. [D02] [F12] | Do not infer arbitrary module URLs, hot replacement, or identical behavior for every web compiler/backend. |
| Android deferred component | **FACT:** code/assets can be downloaded while the app runs, but the entire app is built/uploaded as one AAB; Flutter explicitly does not support independent partial updates without re-uploading the whole bundle. [F12] | Delivery of prebuilt loading units is not independently compiled application-plugin deployment. |
| Debug hot reload | **FACT:** development tooling in debug mode; release behavior includes optimization/tree shaking. [F13] | Not production hot-install/hot-unload infrastructure. |
| Dart AOT/kernel/JIT output | **FACT:** standalone compilation formats with distinct runtime/platform constraints. [D14] | Not evidence that a shipped Flutter app can load arbitrary snapshots as extensions. |

**FACT:** Android deferred components are split in release/profile; debug treats deferred imports normally. All relevant imports must be deferred for intended splitting, and successful execution alone does not prove the library was separated into its intended loading unit. [F12]

**ENGINEERING RECOMMENDATION:** If deferred delivery is a product requirement, test real release/profile artifacts, loading-unit composition, loading failures, and the applicable platform delivery path. Do not extrapolate Android/web support to all Flutter platforms or assume that every web backend shares the documented JavaScript mechanism. [F09] [F12] [F13]

This report found **no general official specification** for arbitrary application Dart code installation, reflective application-plugin discovery, or hot unloading in shipped Flutter applications. This is a bounded evidence finding, not a claim that every conceivable custom native/interpreted/remote extension mechanism is impossible. Such mechanisms would need separate platform, security, deployment, and compatibility research.

## 9. Proportionate architectural strategy

The following is **ENGINEERING RECOMMENDATION**, not an official named Flutter architecture. [F01] [F02] [D01] [D08] [P01] [P02] [P05] [P07-text]

### Use plugin-style boundaries when there is a real axis of replacement

- Multiple environment/platform adapters, a test substitute, or a vendor likely to change.
- A host combines independently owned feature contributions through a small shared contract.
- Business policies must be exercised without external I/O or reused outside a Flutter UI.
- Package ownership/reuse/independent compatibility checks justify a stronger publication boundary.

### Prefer simpler composition when there is no useful protocol to manage

- One implementation with no volatile detail can remain a concrete class with an injected constructor seam.
- One small operation may be a typed callback rather than an interface/service/factory stack.
- Shared data should not be duplicated solely to make every screen package “self-contained.”
- A simple repository call should not acquire a forwarding use-case solely for layering symmetry.
- A static set of features can be assembled directly; a global generic registry is not a prerequisite for modularity.

### Suggested incremental path

1. Identify the hard/volatile decision and the consumer that should not know it. Write down what is hidden and what remains observable.
2. Define the smallest useful typed API, its data invariants, and necessary behavioral guarantees. Keep implementation-only/vendor types out unless their exposure is deliberate.
3. Inject the implementation explicitly. Keep selection/assembly separate from use, and prove substitution with a fake or alternate adapter.
4. Preserve Flutter's UI/data responsibilities and shared state owners. Introduce use-cases and framework-free contracts only where their benefits justify them.
5. Extract a library/package boundary when ownership, reuse, compatibility testing, or dependency control warrants it. Curate exports and check cross-boundary imports.
6. Introduce contribution registration/lifecycle rules only when the product needs them. Validate the protocol and assembled app, not just individual classes.
7. Review callers, implementers, pub constraints, and target build modes on evolution. Measure startup, memory, size, and dispatch costs rather than asserting benefits without data.

The expected payoff is localized change, visible dependencies, and testable substitutions—not guaranteed faster execution, smaller binaries, independent deployment, or effortless later extraction into services.

## 10. Source tensions and corrections to retain

| Observed tension | How a future skill should handle it |
| --- | --- |
| The concepts page's simplified layering wording says UI/data should not know each other; the detailed guide and DI case study show view models depending on repositories. [F03] [F02] [F05] | Explain responsibilities and intended dependency direction; do not derive a universal ban on view-model repository access from introductory wording. |
| Some guide/recommendation prose places “most” logic in different layers. [F01] [F02] | Use the concrete responsibility descriptions: presentation logic in view models, data/state logic in repositories, selected cross-repository policy in use-cases. Avoid percentage-based or absolute ownership claims. |
| Domain terminology can mean shared data models or an optional use-case layer. [F02] [F04] | Name which meaning is intended; do not infer a mandatory extra layer from a `domain/` directory. |
| DI recommendations discourage globally accessible dependencies, while the detailed guide mentions a service locator/DI container for shared session repositories. [F01] [F02] | Prefer explicit consumer dependencies; distinguish object assembly/instance management from pervasive global lookup. Do not claim every locator is prohibited. |
| The data case study says services have no side effects while showing external CRUD; actual `ApiClient` also has fields and an authentication callback. [F06] [S02] | Treat separation of application state/policy from I/O as the useful lesson. Do not define services as literally fieldless, effect-free functions. |
| The data case-study prose says a remote repository “extends” an abstraction while the shown implementation uses `implements`, and describes deleting through POST while actual source uses DELETE. [F06] [S02] | Follow the displayed/actual code for these claims. Do not copy incidental prose mistakes into language or HTTP guidance. |
| The UI sample exposes `UnmodifiableListView` over a mutable backing list. [F07] | Do not describe a read-only view as an immutable snapshot; define ownership and snapshot semantics explicitly. |
| The framework overview's introduction simplifies web output to JavaScript, while its web discussion includes WebAssembly. [F09] | Preserve backend qualifications; do not claim web is universally JavaScript-only. |
| “Flutter cannot load code at runtime” would conflict with documented Android/web deferred delivery. [F12] | Distinguish selection, delivery of precompiled components, and arbitrary installation/independent updates. |
| Broad dependency ranges are generally encouraged, but re-exported dependency APIs receive tighter-constraint advice. [D11] [D12] | Explain the exported-public-API exception and test lower bounds; avoid a one-size-fits-all pinning rule. |
| Fowler's Plugin and Martin's deployment examples are stronger than statically assembled Flutter modules. [P03] [P06] | Borrow dependency separation while explicitly declining unverified independent-deployment guarantees. |
| Compass snippets are expressly abbreviated/modified demonstrations, and `main` source can change. [F04] [F05] | Treat snippets as architecture evidence, not complete compilable templates or version-pinned APIs. |

## 11. Evidence gaps and validation still needed

- **No official application-plugin protocol found:** IDs, registration validation, capability negotiation, dependency DAGs, startup rollback, reverse disposal, and unload semantics remain project-specific engineering recommendations.
- **No target application examined or SDK run:** this report does not establish suitable boundaries, dependency versions, package counts, or measurable benefits for a particular application.
- **No general hot-install/hot-unload compatibility proof:** only documented compilation constraints and the qualified deferred-delivery mechanisms were examined. Platform-store policy, native FFI loading, sandboxing, interpreted extensions, and remote execution were not investigated.
- **No complete DI/state-manager comparison:** `provider` is evidenced in official guidance/Compass; this report does not rank or verify versions/APIs of `get_it`, `injectable`, Riverpod, Bloc, or other third-party options.
- **No lifecycle API validation:** asynchronous ownership/cancellation details require focused runtime API evidence and tests before a lifecycle example can be called production-ready. This report does not assert that a simple timeout or reverse list traversal provides safe teardown.
- **No complete compatibility matrix:** upgrade/downgrade tests, minimum SDK/language checks, isolated consumers, and release/profile target builds are recommendations, not executed results.
- **No original Meyer text read:** Martin is cited for his own OCP interpretation and his attribution to Meyer, not as verification of the original 1988 text.
- **Parnas full-text gap resolved:** the ACM endpoint was blocked, but the published six-page paper was verified through the Duke-hosted copy. A separate CMU archive file proved to be the August 1971 technical-report precursor, not the 1972 journal layout; their dates must not be conflated.

## 12. Bibliography and retrieval record

All sources were accessed on **2026-11-05**. Dates below are displayed page-update dates unless identified as publication dates. Linked titles use the exact URLs defined after the tables. `F` = official Flutter documentation; `D` = official Dart documentation/API; `S` = first-party source; `P` = pattern-author primary text. Findings in the tables are abbreviated; limitations in the body still apply.

### 12.1 Official Flutter documentation: 14 substantive pages

| ID | Exact title and canonical URL | Observed update | Verified contribution / caveat |
| --- | --- | --- | --- |
| F01 | [Architecture recommendations and resources][F01] | 2026-05-05 | **Official recommendation:** priority-ranked architecture, DI, abstract repositories, immutable models, fakes; guidelines explicitly adaptable. Rendered tables were read because the `.md` source alone contains component placeholders. |
| F02 | [Guide to app architecture][F02] | 2026-05-05 | **Official recommendation:** views/view models/repositories/services, many-to-many sharing, repositories not aware of each other, optional use-cases, shared session repository state. |
| F03 | [Common architecture concepts][F03] | 2026-05-11 | **Official recommendation:** defined inputs/outputs, separation, SSOT, UDF, extensibility/testability; introductory layer wording needs the detailed guide's qualification. |
| F04 | [Architecture case study][F04] | 2026-05-05 | **Sample:** Compass feature-organized UI, type-organized shared data, domain models; alternate state tools valid; snippets incomplete demonstrations. |
| F05 | [Communicating between layers][F05] | 2026-07-23 | **Sample/recommendation:** constructor injection and private dependencies; provider creates shared instances; routes assemble view models. |
| F06 | [Data layer][F06] | 2026-05-05 | **Sample/recommendation:** repository state/cache/retry/synchronization, service adapters, local/remote repository alternatives; Result recommended rather than compulsory; prose/code errors noted above. |
| F07 | [UI layer case study][F07] | 2026-09-29 | **Sample:** view-model dependencies, view rendering, command running/completed/error state; chosen command/state implementation not universal; read-only-list caveat. |
| F08 | [Testing each layer][F08] | 2026-05-05 | **Sample/recommendation:** fake repositories/services and real view models in widget tests; no promise that every view model is pure Dart. |
| F09 | [Flutter architectural overview][F09] | 2026-10-24 | **Framework/runtime facts:** framework/engine/embedder, composition, side-effect-free widget build, native machine code and web JS/Wasm; not the app-architecture guide. |
| F10 | [Developing packages & plugins][F10] | 2026-11-03 | **Tooling facts:** Dart/Flutter packages versus platform plugin packages and federation; not an application extension-host protocol. |
| F11 | [JSON and serialization][F11] | 2026-07-31 | **Runtime fact:** Flutter disables runtime reflection for tree shaking; generation is an alternative. Scope is Flutter, not all Dart runtimes. |
| F12 | [Deferred components for Android and web][F12] | 2026-09-29 | **Tooling/runtime facts:** deferred precompiled delivery, whole Android AAB, no independent partial update, debug versus release/profile distinction. Platform/backend qualifications retained. |
| F13 | [Flutter's build modes][F13] | 2026-05-05 | **Tooling facts:** debug development features versus release optimization/tree shaking; profile/release validation matters. |
| F14 | [Flutter compatibility policy][F14] | 2026-10-08 | **Policy:** evolution/stability tradeoffs, regression tests, breaking changes/migrations; not eternal compatibility for every dependency. |

The inspected Flutter pages reported documentation reflecting **Flutter 3.47**. Clean text was usually fetched through the corresponding `https://docs.flutter.dev/<path>.md`; canonical rendered pages supplied page titles, recommendation tables, update dates, and version observations.

### 12.2 Official Dart documentation/API: 14 substantive pages

| ID | Exact title and canonical URL | Observed update | Verified contribution / caveat |
| --- | --- | --- | --- |
| D01 | [Creating packages][D01] | 2025-08-19 | **Recommendation/fact:** small libraries, curated exports, `lib/src`, parts versus libraries, conditional exports with a consistent API. |
| D02 | [Libraries & imports][D02] | 2025-09-15 | **Language facts:** library-level privacy, imports/exports, explicit deferred imports and shared nondeferred types. |
| D03 | [Package layout conventions][D03] | 2026-10-01 | **Convention/fact:** `lib/src` technically importable, own-package tests may import it, applications commit lockfiles. |
| D04 | [implementation_imports][D04] | Not displayed | **Lint fact:** stable/recommended rule against importing another package's implementation libraries; not full architecture enforcement. |
| D05 | [Pub workspaces (monorepo support)][D05] | 2026-05-15 | **Tooling facts:** shared resolution, Dart 3.6.0 minimum, Dart 3.11+ globs, local member version checks, overrides, isolated member resolution. |
| D06 | [Class modifiers][D06] | 2026-09-30 | **Language facts:** language 3.0+ for new modifiers; library-scoped extension/implementation restrictions and exhaustiveness. |
| D07 | [Class modifiers for API maintainers][D07] | 2026-05-15 | **API guidance/facts:** intentional subtyping, base transitivity, breaking restrictive modifiers, breaking sealed-subtype additions. |
| D08 | [Effective Dart: Design][D08] | 2026-09-02 | **Official recommendation:** narrow surface, typed API, deliberate interfaces/modifiers, final fields, functions instead of ceremonial one-member classes. |
| D09 | [Effective Dart: Documentation][D09] | 2026-07-31 | **Official recommendation:** useful public docs, invariants, parameters/returns/exceptions. Lifecycle/ordering contract checklists are synthesis. |
| D10 | [Language versioning][D10] | 2026-07-31 | **Language/tooling fact:** default language version derives from SDK lower bound, not simply the installed SDK. |
| D11 | [Package versioning][D11] | 2026-05-15 | **Tooling/guidance:** one version per package, intersected constraints, lockfiles, pre-1.0 conventions, exported-dependency compatibility. |
| D12 | [Package dependencies][D12] | 2026-08-12 | **Tooling/guidance:** direct dependencies, regular/dev distinction, caret ranges, override risk, upgrade/downgrade tests; explicitly cites SemVer 2.0.0-rc.1. |
| D13 | [dart:mirrors library][D13] | Not displayed | **API fact:** unstable; VM only on some platforms. API footer observed **Dart 3.13.7**; old `dart-mirrors-library.html` URL redirects here. |
| D14 | [dart compile][D14] | 2026-10-16 | **Tooling facts:** output/runtime distinctions, architecture-specific AOT/executables without mirrors; standalone formats are not Flutter extension installers. Current hook guidance refers to `dart build`. |

Rendered Dart pages reported documentation reflecting **Dart 3.13.7**. Full article source was also read from `https://raw.githubusercontent.com/dart-lang/site-www/main/src/content/<canonical-path>.md`; rendered pages were checked for canonical titles/dates. Raw sources contain templates/include markers and are not a substitute for checking rendered content when it is generated separately.

### 12.3 First-party source followed from documentation

| ID | Source title/path and exact URL | Version/date observation | Verified contribution |
| --- | --- | --- | --- |
| S01 | [Compass: booking_repository.dart][S01] | Mutable `flutter/samples` `main`; copyright header 2024 is not a release date. | `abstract class BookingRepository`, four typed asynchronous Result methods; no `abstract interface` claim inferred. |
| S02 | [Compass: api_client.dart][S02] | Mutable `flutter/samples` `main`; no sample release version established. | Function-injected `HttpClient` factory, auth-header callback, actual DELETE, `finally` closes clients. |
| S03 | [Dart SDK breaking change process][S03] | Mutable `dart-lang/sdk` `main`; no displayed document update/release date. | Public API/language-version/analysis assumptions and security/bug/unspecified-behavior/evolution exceptions. |

Compass root followed from the recommendations/case study: https://github.com/flutter/samples/tree/main/compass_app. The full source files above, rather than only abbreviated website snippets, were inspected. S03 was followed from Flutter's compatibility discussion and read via its raw source at https://raw.githubusercontent.com/dart-lang/sdk/main/docs/process/breaking-changes.md.

### 12.4 Pattern-author primary sources

| ID | Title, author attribution, exact URL | Publication/date observation | Verified contribution / limitation |
| --- | --- | --- | --- |
| P01 | [Hexagonal architecture the original 2005 article][P01] — Alistair Cockburn | HaT report 2005.02; article 2005-09-04; v0.9. | Purposeful ports, technology adapters, independent testing, multiple adapters; not six required ports or a Dart package specification. |
| P02 | [Inversion of Control Containers and the Dependency Injection pattern][P02] — Martin Fowler | 2004-01-23 | Configuration/use separation, assembler, constructor/setter injection, locator tradeoffs; no claim that every locator is untestable. |
| P03 | [Plugin][P03] — Fowler's catalog; credited David Rice and Matt Foemmel | 2003-03-05 | Configuration rather than compilation linking and runtime configuration without rebuilding; deployment guarantee not transferred to Flutter static composition. |
| P04 | [Repository][P04] — Fowler's catalog; credited Edward Hieatt and Rob Mee | 2003-03-05 | Collection-like domain/data-mapping mediation; narrower context than Flutter's broader repository responsibilities. |
| P05 | [Monolith First][P05] — Martin Fowler | 2015-06-03 | Evolving boundaries, monolith-first and modular separation; explicitly tentative/anecdotal evidence. Flutter modular-monolith use is interpretation. |
| P06 | [The Open Closed Principle][P06] — Robert C. Martin | 2014-05-12 | Policy/detail dependency inversion and plugins; credits Meyer 1988; independently deployed examples not Flutter deployment evidence. |
| P07 | [On the criteria to be used in decomposing systems into modules][P07] — D. L. Parnas; [verified full text][P07-text] | *Communications of the ACM* 15(12), December 1972, pp. 1053–1058; received August 1971, revised November 1971. | Information hiding, responsibility assignments, unnecessary ordering guarantees, hierarchy versus decomposition, implementation-cost caveats. Published text read, not merely metadata. |

### 12.5 Retrieval limitations and resolved access failures

- Parnas DOI identity/publication metadata was verified through https://api.crossref.org/works/10.1145/361598.361623. The publisher landing page and PDF (`https://dl.acm.org/doi/10.1145/361598.361623` and `https://dl.acm.org/doi/pdf/10.1145/361598.361623`) returned **403** in this environment.
- OpenAlex discovery at https://api.openalex.org/works/https://doi.org/10.1145/361598.361623 supplied alternate institutional locations. This was used for discovery, **not as a substitute for reading the primary paper**.
- The successful published-paper request, https://www.cs.duke.edu/courses/spring06/cps108/readings/p1053-parnas.pdf, redirected to **https://courses.cs.duke.edu/spring06/cps108/readings/p1053-parnas.pdf**, returned **200**, and contained six journal pages numbered 1053–1058. PDF text was extracted locally with macOS PDFKit after direct model PDF rendering was unavailable.
- A separately retrieved archive at https://kilthub.cmu.edu/articles/journal_contribution/On_the_criteria_to_be_used_in_decomposing_systems_into_modules/6607958, discovered via https://api.figshare.com/v2/articles/6607958 and downloaded from https://ndownloader.figshare.com/files/12098510, contained **CMU-CS-71-101, August 1971**, the technical-report precursor. Repository metadata includes later deposit/date fields; those were not treated as the original publication date. Substantive claims above cite the published journal copy.
- Other attempted Parnas locations returned 403 (`https://www.cs.umd.edu/class/spring2003/cmsc838p/Design/criteria.pdf`, `https://www.cs.ubc.ca/~kdvolder/CPSC511/downloads/parnas.12.72.pdf`) or 404 (`https://www.cs.virginia.edu/~evans/cs655/readings/parnas.pdf`, `https://www.cs.cmu.edu/~Compose/shaw-arch-reading/parnas.pdf`). These failed URLs are not substantive evidence.
- The guessed Fowler OCP URL `https://martinfowler.com/bliki/OpenClosedPrinciple.html` returned **404** and was excluded; Martin's primary article was read instead. A later Cockburn re-fetch timed out, but the earlier complete successful article retrieval supplied the findings and date/version observations above.

### Exact citation URLs

[F01]: https://docs.flutter.dev/app-architecture/recommendations
[F02]: https://docs.flutter.dev/app-architecture/guide
[F03]: https://docs.flutter.dev/app-architecture/concepts
[F04]: https://docs.flutter.dev/app-architecture/case-study
[F05]: https://docs.flutter.dev/app-architecture/case-study/dependency-injection
[F06]: https://docs.flutter.dev/app-architecture/case-study/data-layer
[F07]: https://docs.flutter.dev/app-architecture/case-study/ui-layer
[F08]: https://docs.flutter.dev/app-architecture/case-study/testing
[F09]: https://docs.flutter.dev/resources/architectural-overview
[F10]: https://docs.flutter.dev/packages-and-plugins/developing-packages
[F11]: https://docs.flutter.dev/data-and-backend/serialization/json
[F12]: https://docs.flutter.dev/perf/deferred-components
[F13]: https://docs.flutter.dev/testing/build-modes
[F14]: https://docs.flutter.dev/release/compatibility-policy
[D01]: https://dart.dev/tools/pub/create-packages
[D02]: https://dart.dev/language/libraries
[D03]: https://dart.dev/tools/pub/package-layout
[D04]: https://dart.dev/tools/linter-rules/implementation_imports
[D05]: https://dart.dev/tools/pub/workspaces
[D06]: https://dart.dev/language/class-modifiers
[D07]: https://dart.dev/language/class-modifiers-for-apis
[D08]: https://dart.dev/effective-dart/design
[D09]: https://dart.dev/effective-dart/documentation
[D10]: https://dart.dev/language/versioning
[D11]: https://dart.dev/tools/pub/versioning
[D12]: https://dart.dev/tools/pub/dependencies
[D13]: https://api.dart.dev/dart-mirrors/
[D14]: https://dart.dev/tools/dart-compile
[S01]: https://raw.githubusercontent.com/flutter/samples/main/compass_app/app/lib/data/repositories/booking/booking_repository.dart
[S02]: https://raw.githubusercontent.com/flutter/samples/main/compass_app/app/lib/data/services/api/api_client.dart
[S03]: https://github.com/dart-lang/sdk/blob/main/docs/process/breaking-changes.md
[P01]: https://alistair.cockburn.us/hexagonal-architecture/
[P02]: https://martinfowler.com/articles/injection.html
[P03]: https://martinfowler.com/eaaCatalog/plugin.html
[P04]: https://martinfowler.com/eaaCatalog/repository.html
[P05]: https://martinfowler.com/bliki/MonolithFirst.html
[P06]: https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html
[P07]: https://doi.org/10.1145/361598.361623
[P07-text]: https://courses.cs.duke.edu/spring06/cps108/readings/p1053-parnas.pdf
