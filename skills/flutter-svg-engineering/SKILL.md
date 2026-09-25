---
name: flutter-svg-engineering
description: Design, implement, review, debug, test, migrate, secure, and optimize SVG rendering in production Flutter applications using flutter_svg and vector_graphics. Use whenever a Flutter task involves SvgPicture, SVG assets, remote/dynamic SVG, SVG theming or ColorMapper, BoxFit/layout/clipping, semantics or RTL, SVG caching, precompiled .vec assets, RenderingStrategy, SVG-heavy list performance, malformed/unsupported SVGs, network SVG security, or migration from older flutter_svg APIs—even when the user only asks why an SVG is blank, slow, wrongly colored, clipped, or failing on one platform.
compatibility: Source baseline targets flutter_svg 2.3.0 and its contemporary vector_graphics stack. Inspect the repository's locked flutter_svg/vector_graphics/compiler versions and Flutter SDK before applying version-sensitive APIs, cache behavior, renderer behavior, or migration advice.
---
# Flutter SVG Engineering
Use this skill to make SVG decisions from source ownership, visual semantics, layout constraints, cache identity, runtime cost, and trust boundaries—not from the `.svg` extension alone.

## Operating rules
1. Inspect the repository before changing SVG code: Flutter SDK, `flutter_svg`, `vector_graphics`, compiler/runtime versions, platform targets, asset declarations, wrappers, tests, and existing network/cache layers.
2. Decide whether SVG is the correct rendering format before adding `SvgPicture`.
3. Prefer `Icon` for equivalent standard Flutter iconography.
4. Prefer bundled assets for stable application artwork tied to the app release.
5. Keep SVG rendering in the presentation layer; state/domain code should expose semantic state, asset identity, URL, or validated bytes—not Flutter widgets.
6. Use current `SvgPicture`/loader APIs and remove deprecated picture-cache/color-era APIs during migrations.
7. Give icons explicit dimensions and constrain asynchronous/dynamic vectors so loading cannot destabilize layout.
8. Choose `BoxFit`, alignment, clipping, and RTL mirroring from visual semantics, not defaults copied from another asset.
9. Use `ColorFilter` for intentional whole-picture tinting, `ColorMapper` for selective source-aware recoloring, and `SvgTheme` for SVG-authored theme-relative values such as `currentColor`.
10. Preserve multicolor artwork unless the design explicitly calls for a monochrome treatment.
11. Provide one accessible meaning for meaningful artwork; exclude decorative artwork from semantics.
12. Treat source-byte/HTTP caching, compiled-vector caching, and live rendered-picture reuse as separate layers.
13. Keep source, theme, loader, and mapper identity stable when cache reuse matters.
14. Never claim `SvgPicture.network` provides a complete persistent HTTP/offline cache policy.
15. Use an application network layer before `SvgPicture.memory` when remote SVG needs authentication, retries, cancellation, status/content validation, persistent caching, telemetry, or input limits.
16. Treat remote/user SVG as untrusted input. `flutter_svg` is a renderer/compiler pipeline, not a sanitizer.
17. Do not enable `allowDrawingOutsideViewBox` globally to compensate for malformed assets.
18. Profile complex or repeated SVGs in profile/release-like conditions before selecting precompilation, raster rendering, or raster-image replacement.
19. Precompile `.vec` only when runtime SVG parse/compile cost is measurable or strategically important.
20. Keep `.vec` compiler/runtime versions compatible and retain SVG as the maintainable source of truth.
21. Use `RenderingStrategy.raster` only after profiling shows vector painting is expensive and display scale is sufficiently stable; validate memory and pixel quality.
22. Do not precache every vector. Warm only likely, latency-sensitive artwork with measured first-use cost.
23. Use golden tests for visually sensitive upgrades, exporter changes, color-mapping changes, fit changes, RTL changes, and rendering-strategy changes.
24. Preserve correctness, semantics, visual fidelity, and platform behavior before performance micro-optimizations.

## Reference routing
Read only the reference required for the current task:
- `references/01-api-layout-theming-accessibility.md` — read for format/source selection, `SvgPicture` APIs, loaders, dimensions, `BoxFit`, clipping, theming, `ColorMapper`, semantics, RTL, errors, unsupported SVG features, and export guidance.
- `references/02-caching-rendering-performance-security-platforms.md` — read for cache layers, precaching, `RenderingStrategy`, lists, precompiled `.vec`, memory/startup/scrolling, network cache boundaries, untrusted SVG, Web, mobile, or desktop behavior.
- `references/03-architecture-testing-debugging-profiling.md` — read for design-system wrappers, presentation/state/DI boundaries, testing, goldens, debugging, and performance profiling.
- `references/04-anti-patterns.md` — read during review/refactoring when diagnosing common implementation mistakes.
- `references/05-workflows-checklists-quick-reference.md` — read when implementing from scratch, reviewing a repository, refactoring, preparing release, or running final checklists.
For a package upgrade or broad audit, read references 01, 02, 03, then 05. Read 04 if the repository shows problematic patterns.

## 1. Inspect before editing
Record:
```text
Flutter SDK:
flutter_svg:
vector_graphics runtime:
vector_graphics compiler/codec if used:
Targets:
Source types: asset / network / string / bytes / file / .vec
Existing wrappers/design system:
Network/cache layer:
Dynamic or untrusted SVG sources:
SVG-heavy screens/lists:
Golden/semantics/widget tests:
```

Search for legacy or risky patterns:
```text
SvgPicture
color:
colorBlendMode:
PictureProvider
PictureCache
precachePicture
allowDrawingOutsideViewBox
RenderingStrategy
ColorMapper
SvgPicture.network
SvgPicture.string
SvgPicture.memory
```

Do not refactor until the current visual and caching behavior is understood.

## 2. Decide whether SVG is the right format
Use this default decision table:
| Requirement | Default choice |
|---|---|
| Standard Material symbol | `Icon` |
| Custom scalable static icon/logo | SVG |
| Scalable static illustration | SVG, then profile if complex |
| Fixed-size complex static illustration | Profile SVG vs raster |
| Photograph | Raster image |
| Animated/interactive vector scene | Purpose-built animation solution |
| Procedural drawing | `CustomPainter` |
| SVG shell containing a huge bitmap | Render the raster content directly |
| Thousands of repeated tiny symbols | Compare `Icon`, simple/precompiled SVG, or raster based on evidence |
Do not use source file size as a proxy for render cost. Geometry, gradients, clips, masks, embedded images, and render area matter.

## 3. Choose the source API by ownership
Use:
```text
bundled app/package artwork → SvgPicture.asset
simple public HTTP SVG       → SvgPicture.network
owned raw markup             → SvgPicture.string
already-fetched bytes        → SvgPicture.memory
native local file            → SvgPicture.file
precompiled vector           → SvgPicture(AssetBytesLoader(...))
custom source/cache identity  → custom BytesLoader only when justified
```

Prefer fetching through an application networking layer and rendering bytes when remote policy requires more than the convenience network constructor can express.
Do not use `dart:io File` as a Flutter Web source model.

## 4. Stabilize layout before styling
For icons, normally set both dimensions:
```dart
SvgPicture.asset(
  'assets/icons/search.svg',
  width: 24,
  height: 24,
  fit: BoxFit.contain,
)
```

For illustrations, use tight constraints such as `SizedBox`, `AspectRatio`, or a bounded parent. Keep placeholders/fallbacks at the same intended size when layout stability matters.
Distinguish:
```text
SVG viewBox = internal vector coordinate system
Flutter constraints = rendered widget size
BoxFit = mapping between those spaces
```

Never assume `viewBox="0 0 100 100"` means a 100×100 logical-pixel widget.
### Fit decision
- `contain`: show all artwork and preserve aspect ratio; default for icons/logos/illustrations.
- `cover`: fill bounds and accept crop; validate responsive crops.
- `fill`: distort aspect ratio; use only intentionally.
- `fitWidth`/`fitHeight`: use when one axis is authoritative and overflow/crop is acceptable.
- `none`/`scaleDown`: specialized natural-size behavior.
Use directional alignment only when the alignment itself should follow text direction.
Keep clipping minimal. Fix incorrect source view boxes instead of globally enabling out-of-view-box drawing.

## 5. Choose theming from artwork semantics
Use this order:
```text
Preserve source colors if artwork is already correct
↓
Monochrome whole-picture tint → ColorFilter + BlendMode.srcIn
↓
SVG authored with currentColor/em/ex → SvgTheme
↓
Selective source palette replacement → ColorMapper
↓
Geometry/composition changes by theme → separate light/dark assets
```

Do not globally tint a multicolor logo or illustration unless the intended design is monochrome.
### Stable ColorMapper
Because mapper identity participates in cache identity, use `const` mappers where possible or implement value equality for parameterized mappers. Do not recreate semantically identical identity-only mappers on every build if cache reuse is important.
Prefer source-aware rules using element ID/name/attribute when the same raw color has multiple meanings.

## 6. Preserve accessibility and directionality
For meaningful artwork, provide an accessible label or equivalent surrounding semantics.
For decorative artwork:
```dart
excludeFromSemantics: true
```

For an SVG inside an already labeled button, normally exclude the SVG's own semantics to avoid duplicate announcements.
Use `matchTextDirection: true` only for direction-sensitive artwork such as chevrons/back-forward arrows. Do not mirror logos, checks, clocks, maps, charts, or brand marks merely because the UI is RTL.
Test semantics and RTL when either affects product behavior.

## 7. Design failure behavior by source
### Bundled assets
Treat a missing/invalid critical asset primarily as a development/build defect. Fix the asset declaration/path and keep tests that expose it.
### Network/dynamic sources
Assume failure and malformed content are possible. Provide stable-size placeholder/fallback behavior when user experience requires it.
When using authenticated or controlled remote SVG, validate transport/content in the network layer before presentation. Do not treat an HTML error page as valid SVG input.
Never log sensitive request headers, signed URLs, or arbitrary raw user SVG unless explicitly sanitized and required.

## 8. Handle unsupported SVG at the asset pipeline
Do not assume `flutter_svg` is a browser SVG runtime. Verify current compiler support before declaring a feature supported or unsupported.
When an asset fails:
```text
inspect/export source
→ prefer presentation attributes over fragile CSS where required
→ simplify unsupported filters/text features
→ remove redundant editor output
→ embed/source-control referenced images
→ convert decorative text to paths only when fidelity requires it
→ compare raster fallback or alternate renderer if necessary
```

Do not convert actual UI text to image paths when Flutter text should remain accessible/selectable/localizable.

## 9. Model caching correctly
Keep these layers distinct:
```text
HTTP/CDN/browser/application byte cache
↓
SVG source bytes/string
↓
flutter_svg compiled-vector cache
↓
vector_graphics live rendered picture reuse
↓
optional rasterized representation
```

A compiled-vector cache hit does not imply persistent network caching or offline behavior.
Cache reuse can change when any relevant source/configuration changes, including URL, headers, asset/package, bytes/string, theme, mapper, loader, or bundle identity.
Do not change global SVG cache size before measuring unique vector count, churn, and memory.

## 10. Optimize parsing and first use only when measured
Current source baseline uses a compile/decode pipeline rather than reparsing XML on every ordinary widget rebuild when cache identity is stable.
When first-use parse/compile cost is visible:
1. Confirm it in profile/release-like measurement.
2. Stabilize source/loader identity.
3. Simplify source geometry/export.
4. Test targeted warm-up only for highly likely next-use artwork.
5. Test precompiled `.vec` for bundled critical vectors.
6. Re-measure startup/transition latency and memory.
Do not preload the entire asset catalog.

## 11. Use precompiled `.vec` deliberately
Consider precompilation when complex bundled SVG parsing/compilation appears in the critical path or many critical vectors appear immediately.
Keep these invariants:
- SVG remains source of truth.
- Compiler and runtime/codec remain compatible.
- Regenerate `.vec` outputs after relevant vector-graphics upgrades.
- Treat `.vec` as generated runtime artifact, not stable archival interchange format.
- Verify output visually, preferably with goldens for important artwork.
Do not add build-pipeline complexity for tiny vectors whose runtime parse cost is negligible.

## 12. Choose rendering strategy from raster evidence
Default to picture/vector rendering unless measurement shows a reason to change.
Consider raster strategy when all are true:
```text
vector is complex
+ raster thread is measurably expensive
+ artwork is mostly static
+ rendered scale is stable enough
```

Then compare:
- raster duration;
- memory/image allocation;
- pixel quality under device pixel ratio and parent transforms;
- behavior during resize/scale/animation.
Raster strategy can trade per-frame vector work for retained raster memory and can pixelate if later transformed beyond the rasterized scale.
Do not set it globally.

## 13. Optimize SVG-heavy lists by workload
For repeated simple icons:
- reuse stable asset/source identity;
- keep dimensions bounded;
- prefer `Icon` when an equivalent glyph exists;
- avoid unnecessary semantics/clipping;
- prevent unrelated state changes from rebuilding an entire heavy list when profiling shows meaningful cost.
For many unique complex illustrations:
- expect more compiled/live representations;
- avoid giant vectors per row;
- use simplified/raster thumbnails where appropriate;
- move full-detail vector rendering to detail views;
- profile fast scroll on representative hardware.
Do not assume SVG is cheap because each file is small.

## 14. Bound memory and dynamic SVG churn
Account for:
```text
source strings/bytes
+ application HTTP/disk/memory cache
+ compiled vector data
+ live pictures
+ rasterized images when raster strategy is used
```

Avoid feeding unbounded unique dynamic strings/bytes into a long-running view without an application-level retention policy.
When memory is high, inspect unique vector count, source-byte cache, rendered dimensions, raster strategy, retained screens, and the SVG compiled cache separately.

## 15. Treat remote/user SVG as untrusted
For arbitrary or semi-trusted input, control the boundary before rendering:
- restrict trusted origins where possible;
- use HTTPS and normal Web security policy;
- enforce network timeouts/cancellation in the network layer;
- cap response/content size;
- validate expected response/content semantics where appropriate;
- keep parser/compiler dependencies current;
- reject pathological or unsupported input;
- bound application-level cache/history;
- provide fallback behavior.
Do not describe `flutter_svg` as an XSS sanitizer or arbitrary-document security sandbox. On Flutter Web, browser CORS/mixed-content policy still applies.

## 16. Keep architecture boundaries clean
Prefer:
```text
Domain/application state
↓
asset ID / URL / validated bytes / visual state
↓
Presentation widget
↓
SvgPicture
```

For authenticated remote artwork:
```text
repository/network layer
↓
validated/cached Uint8List
↓
presentation
↓
SvgPicture.memory
```

Inject a source repository when source retrieval is genuinely a dependency. Do not inject `SvgPicture`, and do not build SVG widgets in Cubits/Blocs/domain classes.
Create a design-system wrapper only when it enforces useful policy such as dimensions, semantics, tinting, or directionality. Avoid wrappers that merely mirror every `SvgPicture` argument.

## 17. Test behavior at the right layer
Use widget tests for:
- asset existence/render completion;
- fallback behavior;
- semantics;
- RTL behavior;
- theme variants;
- deterministic network-loader behavior with fake clients/source abstractions.
Use golden tests for:
- brand-critical SVGs;
- fit/alignment/crop;
- light/dark variants;
- `ColorFilter`/`ColorMapper` changes;
- package/compiler upgrades;
- precompiled vs runtime rendering;
- rendering-strategy changes.
Use profiling, not golden tests, to prove performance.
Do not hit production URLs from widget tests or use arbitrary sleeps for vector decode completion when deterministic test utilities are available.

## 18. Debug systematically
### Blank or missing SVG
Check in order:
1. asset/source path and declaration;
2. error callback/parser diagnostics;
3. finite nonzero constraints;
4. `viewBox` and source bounds;
5. source fill/stroke/opacity;
6. accidental tint/filter;
7. unsupported construct/export style;
8. clipping/fit.
### Wrong color
Remove theming first, then inspect source colors, `ColorFilter`, mapper rules, `SvgTheme.currentColor`, and light/dark asset selection.
### Clipped/stretched
Inspect parent bounds, `BoxFit`, view box, alignment, and clips. Do not enable drawing outside the view box before validating source bounds.
### Remote failure
Inspect URL, HTTP status/body, authentication, CORS on Web, content type/actual bytes, offline state, and whether a backend error page is being parsed as SVG.
### Slow scrolling/rendering
Profile before editing. Determine UI vs raster cost, unique SVG count, source complexity, rendered size, cache-key stability, rebuild frequency, clipping, and current rendering strategy.
### High memory
Separate application source-byte cache, compiled-vector cache, live pictures, rasterized images, and screen retention.

## 19. Profile performance with one hypothesis at a time
Use this loop:
```text
reproduce in profile/release-like mode
↓
classify UI/loading/compile/raster/memory cost
↓
check source complexity and cache identity
↓
change one contributor
↓
compare runtime SVG / simplified SVG / .vec / raster strategy / raster image
↓
measure memory and visual quality
↓
keep only demonstrated improvements
```

Do not retain performance complexity that did not improve the target metric.

## 20. Migrate older flutter_svg code safely
Before upgrading:
1. Record locked `flutter_svg`, `vector_graphics`, and compiler/codec versions.
2. Capture goldens for visually sensitive assets.
3. Search legacy APIs such as direct `color`/`colorBlendMode`, old picture providers/caches, and old precache APIs.
4. Read the supplied migration guidance in reference 01/03 and package changelog if current verification is requested.
5. Replace deprecated color behavior with an equivalent `ColorFilter` without changing blend semantics unintentionally.
6. Preserve dimensions, fit, alignment, semantics, RTL, and source ownership during loader refactors.
7. Regenerate `.vec` assets when required by compiler/runtime changes.
8. Run widgets, semantics, goldens, and performance checks appropriate to the changed behavior.
Do not combine an API migration with unrelated visual/layout changes unless explicitly intended.

## Anti-pattern gate
Reject or refactor code that does any of the following without a documented reason:
- generates a huge SVG string every build;
- hosts stable release artwork remotely;
- leaves async/dynamic vectors unconstrained and causes layout shift;
- globally tints multicolor artwork;
- introduces deprecated color APIs;
- string-replaces SVG markup every build to theme it;
- precaches the full SVG catalog;
- assumes network SVG equals offline HTTP cache;
- omits fallbacks for important remote/dynamic SVG;
- uses SVG for standard built-in icons without a reason;
- renders giant unique illustrations in every list row;
- adds redundant clipping;
- mirrors all vectors in RTL;
- adds semantics to decorative vectors or omits semantics for meaningful ones;
- ships huge raster payloads inside an SVG shell;
- relies on unsupported filters instead of fixing/exporting the asset;
- creates `SvgPicture` in business/state logic;
- adds a wrapper that only mirrors the entire package API;
- judges runtime efficiency from file byte size alone;
- accepts arbitrary remote/user SVG with no resource/security policy;
- copies bytes every rebuild;
- recreates identity-only `ColorMapper` objects and defeats cache reuse;
- globally enables `allowDrawingOutsideViewBox`.
Read `references/04-anti-patterns.md` for the full supplied examples and reasoning.

## Production readiness gate
Before approving SVG-heavy production code, verify:
### Correctness and visual fidelity
- Every bundled asset exists and is declared correctly.
- Current source features are supported or intentionally transformed/fallback-rendered.
- Bounds, fit, crop, alignment, and clipping are verified on relevant screen sizes.
- Multicolor/brand artwork is not accidentally tinted.
- Light/dark variants are visually correct.
- `.vec`/raster-strategy output is visually compared where used.
### Accessibility and RTL
- Meaningful images have an accessible equivalent.
- Decorative images are excluded from semantics.
- Controls expose one clear semantic label.
- Directional artwork mirrors intentionally; nondirectional/brand artwork does not.
### Reliability and security
- Dynamic/network sources have appropriate failure fallback.
- Advanced HTTP/auth/cache/validation policy lives outside the convenience renderer where needed.
- Flutter Web CORS/HTTPS behavior is accounted for.
- Arbitrary SVG is not blindly trusted.
- Response/resource limits are considered for user-controlled sources.
- Parser/compiler stack is kept compatible/current under the repository's upgrade policy.
- Secrets are not placed in SVG URLs/logs/markup diagnostics.
### Performance and memory
- Complex/repeated vectors are profiled on representative workloads.
- Cache keys remain stable where reuse matters.
- Dynamic SVG churn is bounded.
- Large list/grid workloads remain smooth.
- Preloading is targeted.
- Precompiled vectors are justified by measured parse/startup cost.
- Raster strategy is justified by measured raster benefit and acceptable image memory/quality.
- SVG cache/source byte cache sizes are intentional.
### Testing and migration
- Important assets have widget or visual coverage.
- Semantics, theme, RTL, and error paths are tested where relevant.
- Visually sensitive package/export/rendering changes have goldens.
- Deprecated APIs are removed rather than hidden behind compatibility wrappers.
- `.vec` artifacts are regenerated with compatible tooling when dependencies change.

## Final rule
Before adding or optimizing SVG, answer:
```text
Is SVG the right format?
What owns the source?
Is the source trusted?
Does the current compiler support it?
What Flutter bounds and BoxFit are required?
How should color/theme semantics work?
What semantics and RTL behavior are required?
What can fail and what is the fallback?
Which cache layer is responsible for what?
Will cache identity remain stable?
Is the vector actually expensive under measurement?
Would simplification, .vec, raster strategy, or a raster asset be better?
How will correctness, visual fidelity, memory, and performance be verified?
```

If those answers are unknown, inspect and measure before adding rendering complexity.
