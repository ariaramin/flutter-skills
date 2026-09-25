# Flutter/Dart Package Selection Checklist

**Use before adding any dependency.**

## Requirement

- [ ] Exact capability defined
- [ ] Required platforms defined
- [ ] Flutter version known
- [ ] Dart version known
- [ ] Minimum OS/browser versions known
- [ ] Performance requirements known
- [ ] Offline/background requirements known
- [ ] Security sensitivity known
- [ ] Privacy requirements known
- [ ] Licensing constraints known
- [ ] FFI/native code policy known

## Existing Repository

- [ ] `pubspec.yaml` inspected
- [ ] `pubspec.lock` inspected
- [ ] Existing overlapping dependencies checked
- [ ] Platform build configuration inspected
- [ ] Architecture/DI conventions understood
- [ ] Current dependency graph inspected
- [ ] `dependency_overrides` inspected

## Need for a Dependency

- [ ] Existing project capability checked
- [ ] Flutter native API checked
- [ ] Dart native API checked
- [ ] Small local implementation considered
- [ ] Direct native integration considered where appropriate
- [ ] Third-party dependency is actually justified

## Discovery

- [ ] Multiple pub.dev queries used
- [ ] Synonyms/technical terms searched
- [ ] Platform-specific terms searched
- [ ] Similar solution classes separated
- [ ] Search ranking not treated as quality
- [ ] 2–5 serious candidates shortlisted

## Current Package Metadata

For each serious candidate:

- [ ] Current stable version confirmed
- [ ] Publication date recorded
- [ ] Publisher recorded
- [ ] Verified status recorded
- [ ] Package type classified
- [ ] Dart constraint checked
- [ ] Flutter requirement checked
- [ ] Deprecation/discontinuation checked
- [ ] Repository checked
- [ ] License checked

## Platform Support

- [ ] Android implementation verified
- [ ] iOS implementation verified
- [ ] macOS implementation verified
- [ ] Windows implementation verified
- [ ] Linux implementation verified
- [ ] Web implementation verified
- [ ] Unsupported targets explicitly marked
- [ ] Experimental/partial support marked
- [ ] Functional parity checked
- [ ] Federated implementation packages inspected
- [ ] Web/Wasm compatibility checked when required

## Maintenance

- [ ] CHANGELOG inspected
- [ ] Last meaningful release identified
- [ ] Release cadence evaluated
- [ ] Recent meaningful commits checked
- [ ] Critical issues searched
- [ ] Critical PRs searched
- [ ] Maintainer responsiveness evaluated
- [ ] Archive status checked
- [ ] Ownership transfer checked
- [ ] Replacement/successor checked

## API

- [ ] API is idiomatic and typed
- [ ] Null-safety/current Dart support verified
- [ ] Error behavior understood
- [ ] Cancellation behavior understood
- [ ] Async/stream semantics understood
- [ ] Lifecycle ownership understood
- [ ] Cleanup API identified
- [ ] Global state risks checked
- [ ] Testability checked
- [ ] Migration/API churn evaluated

## Dependencies

- [ ] Direct dependencies inspected
- [ ] Transitives inspected
- [ ] Native dependencies inspected
- [ ] Overlapping packages checked
- [ ] Version conflicts checked
- [ ] Lockfile diff reviewed
- [ ] Native SDK versions checked
- [ ] System packages checked
- [ ] Dependency footprint acceptable

## Native / FFI Risk

- [ ] Native source reviewed when material
- [ ] Platform-channel frequency considered
- [ ] Thread assumptions checked
- [ ] Resource ownership checked
- [ ] ABI support checked
- [ ] Native libraries identified
- [ ] Memory-safety risk reviewed
- [ ] Build-hook/download provenance reviewed
- [ ] Required architectures supported

## Performance

- [ ] README claims classified as evidence/marketing
- [ ] CPU implications understood
- [ ] Memory implications understood
- [ ] Startup behavior inspected
- [ ] Disk/network behavior inspected
- [ ] Cache behavior inspected
- [ ] High-frequency bridge/callback behavior inspected
- [ ] Benchmark run if performance-sensitive
- [ ] Profile/release mode used
- [ ] Binary-size delta measured if material

## Security

- [ ] Primary security advisories checked
- [ ] Credential/token behavior inspected
- [ ] Cryptography behavior inspected when applicable
- [ ] Sensitive logs checked
- [ ] TLS/network behavior checked
- [ ] File/storage behavior checked
- [ ] WebView/JS bridges checked
- [ ] Dynamic/native code risk checked

## Privacy

- [ ] Telemetry identified
- [ ] Analytics identified
- [ ] External endpoints identified
- [ ] Device identifiers identified
- [ ] Background network activity identified
- [ ] Platform privacy disclosures considered
- [ ] Sensitive-data handling acceptable

## Permissions

- [ ] Android manifest impact checked
- [ ] Apple entitlements/Info.plist checked
- [ ] Required permissions listed
- [ ] Optional permissions separated
- [ ] Least privilege used
- [ ] Unnecessary permissions rejected

## Build Impact

### Android

- [ ] `minSdk`
- [ ] `compileSdk`
- [ ] AGP
- [ ] Gradle
- [ ] Kotlin
- [ ] Java
- [ ] Maven/native dependencies
- [ ] R8/ProGuard

### iOS/macOS

- [ ] deployment targets
- [ ] Swift
- [ ] SwiftPM
- [ ] CocoaPods fallback if relevant
- [ ] frameworks
- [ ] entitlements
- [ ] privacy manifest

### Windows

- [ ] Visual Studio
- [ ] CMake
- [ ] DLL/runtime requirements
- [ ] architecture support

### Linux

- [ ] CMake
- [ ] GTK/system libraries
- [ ] `pkg-config`
- [ ] runtime services

### Web

- [ ] browser support
- [ ] Wasm
- [ ] CSP
- [ ] CORS
- [ ] secure context
- [ ] JS dependencies

## Licensing

- [ ] Declared license recorded
- [ ] Repository license checked
- [ ] Native/vendor licenses checked
- [ ] Attribution obligations recorded
- [ ] Unusual restrictions flagged
- [ ] Legal review requested for ambiguity

## Scoring and Decision

- [ ] Task-specific weights chosen
- [ ] Hard blockers evaluated first
- [ ] Unknown evidence explicitly marked
- [ ] Weighted scorecard completed
- [ ] Candidate comparison table completed
- [ ] Best candidate explained
- [ ] Runner-up explained
- [ ] Rejected candidates documented
- [ ] No-package outcome considered
- [ ] Remaining risks documented
- [ ] Confidence recorded

## Proof of Concept

For high-impact dependencies:

- [ ] Dependency resolves
- [ ] Core API works
- [ ] Target platforms build
- [ ] Error path works
- [ ] Lifecycle works
- [ ] Cleanup works
- [ ] Permission denial works
- [ ] Offline behavior tested if relevant
- [ ] Existing dependencies coexist
- [ ] Performance measured if required
- [ ] Binary-size impact measured if required

## Integration

- [ ] Compatible stable version selected
- [ ] Dependency added without unrelated upgrades
- [ ] Lockfile reviewed
- [ ] Official/current setup followed
- [ ] Native configuration added
- [ ] Adapter added only if justified
- [ ] Initialization placed correctly
- [ ] Cleanup implemented
- [ ] Errors handled/translated
- [ ] Secrets kept out of source
- [ ] Permissions minimized
- [ ] Tests added

## Production Validation

- [ ] `flutter analyze` passes
- [ ] tests pass
- [ ] integration tests pass where relevant
- [ ] Android release build succeeds
- [ ] iOS release build succeeds if targeted
- [ ] macOS build succeeds if targeted
- [ ] Windows build succeeds if targeted
- [ ] Linux build succeeds if targeted
- [ ] Web production build succeeds if targeted
- [ ] Wasm build succeeds if required
- [ ] startup/performance budget passes
- [ ] binary-size budget passes if applicable
- [ ] no unresolved hard blocker remains

## Ongoing Ownership

- [ ] Upgrade strategy recorded
- [ ] Changelog reviewed before future upgrades
- [ ] Security/deprecation monitoring assigned
- [ ] Data migration implications documented
- [ ] Replacement boundary documented
- [ ] Temporary overrides have removal criteria
- [ ] Fork ownership documented if applicable

## Final Gate

Only approve the dependency when the answer to all three questions is yes:

```text
Does it satisfy the real requirement?

Do its current evidence-backed risks fit this repository?

Is its total long-term ownership cost better than the alternatives?
```

If not:

```text
Do not add the dependency.
```
