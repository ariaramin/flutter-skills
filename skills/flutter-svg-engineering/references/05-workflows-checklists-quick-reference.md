# Reference: New implementation, existing-code review, refactoring, code review, performance, accessibility, production readiness, and quick reference.

> Preserved from `flutter_svg Engineering Skill for Flutter.md`, source lines 3250-3774.

## Contents

- [New SVG Implementation Workflow](#new-svg-implementation-workflow)
  - [1. Decide whether SVG is the right format](#1-decide-whether-svg-is-the-right-format)
  - [2. Identify source ownership](#2-identify-source-ownership)
  - [3. Inspect the source SVG](#3-inspect-the-source-svg)
  - [4. Simplify export when needed](#4-simplify-export-when-needed)
  - [5. Choose current API](#5-choose-current-api)
  - [6. Define bounds](#6-define-bounds)
  - [7. Select `BoxFit`](#7-select-boxfit)
  - [8. Define color policy](#8-define-color-policy)
  - [9. Define accessibility](#9-define-accessibility)
  - [10. Evaluate RTL](#10-evaluate-rtl)
  - [11. Define failure behavior](#11-define-failure-behavior)
  - [12. Evaluate cache reuse](#12-evaluate-cache-reuse)
  - [13. Evaluate first-use latency](#13-evaluate-first-use-latency)
  - [14. Test themes](#14-test-themes)
  - [15. Test screen sizes](#15-test-screen-sizes)
  - [16. Test RTL if directional](#16-test-rtl-if-directional)
  - [17. Add visual tests for important artwork](#17-add-visual-tests-for-important-artwork)
  - [18. Profile if repeated or complex](#18-profile-if-repeated-or-complex)
  - [19. Compare alternatives if expensive](#19-compare-alternatives-if-expensive)
  - [20. Document non-obvious constraints](#20-document-non-obvious-constraints)
- [Existing-Code Review Workflow](#existing-code-review-workflow)
  - [Package](#package)
  - [Deprecated APIs](#deprecated-apis)
  - [Source](#source)
  - [Layout](#layout)
  - [Theming](#theming)
  - [Semantics](#semantics)
  - [RTL](#rtl)
  - [Network](#network)
  - [Dynamic SVG](#dynamic-svg)
  - [Performance](#performance)
  - [Tests](#tests)
- [Refactoring Rules](#refactoring-rules)
- [Code Review Checklist](#code-review-checklist)
  - [API](#api)
  - [Layout](#layout)
  - [Theming](#theming)
  - [Accessibility](#accessibility)
  - [RTL](#rtl)
  - [Network](#network)
  - [Performance](#performance)
  - [Tests](#tests)
- [Performance Checklist](#performance-checklist)
- [Accessibility Checklist](#accessibility-checklist)
- [Production Readiness Checklist](#production-readiness-checklist)
  - [Correct rendering](#correct-rendering)
  - [Visual fidelity](#visual-fidelity)
  - [Accessibility](#accessibility)
  - [Reliability](#reliability)
  - [Security](#security)
  - [Performance](#performance)
  - [Testing](#testing)
- [Quick Reference](#quick-reference)

---

# New SVG Implementation Workflow

## 1. Decide whether SVG is the right format

Ask:

- scalable?
- static?
- icon or illustration?
- animation?
- complexity?
- frequent rendering?
- fixed display size?

## 2. Identify source ownership

Choose:

```text
bundled
network
runtime string
memory bytes
native file
precompiled vector
```

## 3. Inspect the source SVG

Check:

- `viewBox`;
- width/height;
- unsupported filters;
- CSS;
- fonts;
- path count;
- clipping;
- masks;
- gradients;
- embedded images.

## 4. Simplify export when needed

Fix designer/export pipeline before writing runtime hacks.

## 5. Choose current API

Use the API selection table.

## 6. Define bounds

For icons:

```text
explicit width + height
```

For illustrations:

```text
SizedBox / AspectRatio / parent constraints
```

## 7. Select `BoxFit`

Choose from desired crop/scaling semantics.

## 8. Define color policy

Choose:

- preserve;
- `ColorFilter`;
- `ColorMapper`;
- `SvgTheme`;
- separate asset.

## 9. Define accessibility

Choose:

```text
meaningful → semantic label
decorative → exclude semantics
functional child → avoid duplicate parent semantics
```

## 10. Evaluate RTL

Enable mirroring only if semantic direction changes.

## 11. Define failure behavior

Especially for:

- network;
- dynamic string;
- user-provided content.

## 12. Evaluate cache reuse

Keep:

- source identity;
- mapper equality;
- theme;
- loader configuration;

stable where possible.

## 13. Evaluate first-use latency

Only consider preloading/precompilation if latency is visible or profiling shows a problem.

## 14. Test themes

Light/dark/disabled/brand variants.

## 15. Test screen sizes

Small phone, large phone/tablet, constrained card, relevant desktop/web dimensions.

## 16. Test RTL if directional

## 17. Add visual tests for important artwork

Especially branding and complex layout.

## 18. Profile if repeated or complex

Lists, grids, dashboards, full-screen backgrounds.

## 19. Compare alternatives if expensive

Precompiled, raster strategy, simplified SVG, raster image.

## 20. Document non-obvious constraints

Examples:

```text
Do not globally tint.
Do not mirror.
Must render with cover.
Requires dark-specific asset.
```

---

# Existing-Code Review Workflow

Before modifying SVG usage, inspect:

## Package

- installed `flutter_svg` version;
- `vector_graphics` version;
- lockfile/compiler version.

## Deprecated APIs

Search:

```text
color:
colorBlendMode:
PictureProvider
PictureCache
precachePicture
```

## Source

For every significant SVG:

```text
asset/network/string/memory/file
```

## Layout

Inspect:

- width;
- height;
- constraints;
- fit;
- alignment;
- clip;
- view box.

## Theming

Inspect:

- whole-picture filter;
- selective mapper;
- currentColor theme;
- separate light/dark assets.

## Semantics

Check:

- meaningful image;
- decoration;
- duplicate parent semantics.

## RTL

Check directional intent.

## Network

Determine:

- auth;
- CORS;
- HTTP status handling;
- cache;
- fallback;
- timeout/cancellation needs.

## Dynamic SVG

Check source trust and size.

## Performance

Inspect:

- unique SVG count;
- list/grid frequency;
- source complexity;
- rendering strategy;
- precompilation;
- cache-key stability.

## Tests

Look for:

- widget;
- semantics;
- golden;
- error;
- theme;
- RTL.

Do not refactor before understanding whether visual behavior is relied upon.

---

# Refactoring Rules

1. Capture goldens for visually sensitive assets before upgrading.
2. Replace deprecated color API with equivalent `ColorFilter` without changing blend behavior unintentionally.
3. Do not change `BoxFit` during an unrelated API migration.
4. Preserve dimensions during loader refactors.
5. Preserve semantics.
6. Preserve RTL behavior.
7. Keep source/cache identity stable where possible.
8. Do not change asset → network simply to centralize URLs.
9. Do not change network → memory unless the new owner also handles HTTP errors/cache/lifecycle.
10. Verify package upgrades against complex SVG fixtures.
11. Regenerate `.vec` assets when vector-graphics compiler/runtime changes require it.
12. Use golden tests when changing parser/rendering strategy.
13. Remove old APIs rather than wrapping them in compatibility helpers.
14. Keep performance changes separately measurable.

---

# Code Review Checklist

## API

- [ ] Current constructor/loader used.
- [ ] Deprecated `color`/`colorBlendMode` absent.
- [ ] Source API matches source ownership.
- [ ] `file` not used as a web filesystem abstraction.

## Layout

- [ ] Icons have explicit dimensions.
- [ ] Async source cannot cause harmful layout shift.
- [ ] Parent constraints are finite.
- [ ] `BoxFit` matches intended crop behavior.
- [ ] Alignment intentional.
- [ ] Clipping necessary and appropriate.
- [ ] `allowDrawingOutsideViewBox` remains off unless justified.

## Theming

- [ ] Whole-image tint only used for appropriate artwork.
- [ ] Multicolor artwork preserved.
- [ ] `ColorMapper` selective mapping is understandable.
- [ ] Mapper identity/equality supports cache reuse.
- [ ] Dark mode visually verified.

## Accessibility

- [ ] Meaningful SVG has accessible equivalent.
- [ ] Decorative SVG excluded.
- [ ] Functional button has one clear semantic label.
- [ ] Filename is not used as user-facing semantics.

## RTL

- [ ] Only directional artwork mirrors.
- [ ] Brand/non-directional content remains unchanged.

## Network

- [ ] Remote source truly needs network.
- [ ] Error fallback exists.
- [ ] CORS considered for web.
- [ ] HTTP cache not confused with SVG compiled cache.
- [ ] Advanced auth/retry/validation handled outside convenience loader if necessary.
- [ ] Sensitive headers/URLs not logged.

## Performance

- [ ] Source complexity reasonable.
- [ ] Repeated source identity stable.
- [ ] Dynamic strings not regenerated needlessly.
- [ ] Large list usage reviewed.
- [ ] Complex art profiled.
- [ ] Precompilation/rasterization justified by measurement.
- [ ] Cache memory considered.

## Tests

- [ ] Important SVG covered by widget/golden test.
- [ ] Semantics tested where relevant.
- [ ] Theme variants tested.
- [ ] RTL tested if directional.
- [ ] Network/error state tested if dynamic.

---

# Performance Checklist

- [ ] Profile build in profile mode.
- [ ] Source file complexity inspected, not only byte size.
- [ ] Stable assets reuse identical source/cache keys.
- [ ] No giant SVG strings generated every frame.
- [ ] No unnecessary byte copies.
- [ ] `ColorMapper` stable/value-equal.
- [ ] Large vectors not rendered far beyond visible size.
- [ ] List/grid rows use bounded vector dimensions.
- [ ] Standard `Icon` used when appropriate.
- [ ] Expensive clipping avoided.
- [ ] `allowDrawingOutsideViewBox` not globally enabled.
- [ ] Compiled cache count/memory considered.
- [ ] Unbounded unique dynamic SVG sources avoided.
- [ ] First-route preloading targeted only.
- [ ] Precompiled `.vec` considered for measured parse cost.
- [ ] Raster strategy tested for complex stable-scale vectors.
- [ ] Raster visual quality checked after transforms.
- [ ] Full-screen vector compared with raster alternative where warranted.
- [ ] Network byte cache separated from render cache.
- [ ] UI vs raster-thread frame cost measured.
- [ ] Optimization reprofiled after change.

---

# Accessibility Checklist

- [ ] Does the SVG communicate information?
- [ ] If yes, is that information available to assistive technology?
- [ ] If decorative, is it excluded from semantics?
- [ ] If inside a button, does the button already provide the accessible name?
- [ ] Are duplicate SVG/button labels avoided?
- [ ] Does the semantic label describe purpose rather than filename?
- [ ] Is important text rendered as actual Flutter text when accessibility requires it?
- [ ] Does RTL change the semantic direction of the artwork?
- [ ] Has screen-reader navigation been tested for important screens?
- [ ] Do loading/error fallbacks preserve the same accessible meaning?

---

# Production Readiness Checklist

## Correct rendering

- [ ] Every asset exists.
- [ ] Unsupported source features eliminated or intentionally handled.
- [ ] Important SVGs render on target platforms.
- [ ] Responsive bounds tested.
- [ ] Fit/crop verified.
- [ ] No accidental clipping.

## Visual fidelity

- [ ] Multicolor artwork not unintentionally tinted.
- [ ] Light/dark variants correct.
- [ ] Brand colors correct.
- [ ] Precompiled/raster output visually compared where used.

## Accessibility

- [ ] Meaningful images labeled.
- [ ] Decorative images excluded.
- [ ] Functional SVGs have correct interaction semantics.
- [ ] RTL behavior reviewed.

## Reliability

- [ ] Remote errors have fallbacks.
- [ ] Dynamic malformed SVG cannot break the entire screen.
- [ ] Web CORS architecture works.
- [ ] Static UI artwork not unnecessarily network-dependent.

## Security

- [ ] Arbitrary untrusted SVG not accepted blindly.
- [ ] Network source policy controlled.
- [ ] Source-size/resource limits considered for user content.
- [ ] Compiler/parser dependencies current.
- [ ] Secrets absent from URLs/logs.

## Performance

- [ ] Complex/repeated vectors profiled.
- [ ] Cache keys remain reusable.
- [ ] Dynamic SVG churn bounded.
- [ ] Large scrolling workloads acceptable.
- [ ] Preloading is targeted.
- [ ] Raster strategy memory assessed where used.
- [ ] Startup remains acceptable.

## Testing

- [ ] Critical assets have visual coverage.
- [ ] Themes covered.
- [ ] RTL covered where relevant.
- [ ] Error state covered.
- [ ] Semantic behavior covered.

---

# Quick Reference

| Situation | Preferred approach |
|---|---|
| Static application SVG | `SvgPicture.asset` |
| Standard Material symbol | Flutter `Icon` |
| Remote SVG with simple public HTTP access | `SvgPicture.network` |
| Authenticated/validated/cached remote SVG | Fetch through network layer → `SvgPicture.memory` |
| Raw SVG XML | `SvgPicture.string` |
| Existing bytes | `SvgPicture.memory` |
| Native local file | `SvgPicture.file` |
| Browser file-picker result | `SvgPicture.memory` |
| Custom persistence/source | `BytesLoader` only if needed |
| Monochrome themed icon | `ColorFilter.mode(..., BlendMode.srcIn)` |
| SVG authored with `currentColor` | `SvgTheme` |
| Replace selected source colors | `ColorMapper` |
| Multicolor brand artwork | Preserve source colors/selective mapper |
| Light/dark geometry differs | Separate assets |
| Icon | Explicit width + height |
| Responsive illustration | Tight parent/`AspectRatio` + `contain` |
| Full-bleed background | Tight bounds + `cover` |
| Preserve full SVG | `BoxFit.contain` |
| Fill bounds and allow crop | `BoxFit.cover` |
| Intentionally distort | `BoxFit.fill` only when design requires |
| Decorative SVG | `excludeFromSemantics: true` |
| Meaningful image | `semanticsLabel` or equivalent surrounding semantics |
| SVG inside labeled `IconButton` | Usually exclude SVG semantics |
| Directional chevron | `matchTextDirection: true` |
| Logo | Do not mirror |
| Remote loading latency | Stable-size `placeholderBuilder` |
| Dynamic/load failure | `errorBuilder` |
| Stable repeated asset | Let compiled cache reuse source |
| Many unique dynamic SVGs | Bound/cache application source set |
| First-screen parse bottleneck | Targeted warm-up or precompiled `.vec` |
| Small/simple icon | `RenderingStrategy.picture` |
| Large complicated fixed-scale backdrop | Profile `RenderingStrategy.raster` |
| Complex bundled SVG | Profile precompiled `.vec` |
| `.vec` asset | Keep compiler/runtime compatible; regenerate on upgrades |
| Complex unsupported filter | Simplify/export differently or rasterize |
| SVG with incomplete CSS compatibility | Export presentation attributes |
| Linked external image in SVG | Prefer embedded/source-controlled asset |
| Repeated icon in long list | Stable source + bounded size; consider `Icon` |
| Huge unique illustration per row | Simplify/raster thumbnail/detail-screen vector |
| Slow scroll | Profile raster thread/source complexity/cache identity |
| High memory | Inspect compiled cache, live pictures, raster images, source-byte caches |
| Static artwork hosted remotely | Bundle if app-versioned |
| Need offline HTTP cache | Implement network/application cache separately |
| User-provided SVG | Treat as untrusted; validate/limit/update parser dependencies |
| Business state wants an icon | State exposes semantic state/asset ID; widget constructs SVG |
| Important visual migration | Golden test |
| Package upgrade | Review changelog + goldens + complex fixture assets |

Before approving SVG usage, verify:

```text
Is SVG actually the right format?
↓
Is the source trusted and appropriate?
↓
Does the current compiler support its features?
↓
Is the correct loading API used?
↓
Are dimensions and BoxFit intentional?
↓
Is theming source-aware?
↓
Are semantics correct?
↓
Is RTL behavior correct?
↓
Are network/error boundaries explicit?
↓
Will cache keys remain stable?
↓
Is SVG complexity acceptable?
↓
Has a heavy/repeated workload been profiled?
↓
Are important visuals covered by tests?
```

If any answer is unknown, treat the implementation as incomplete rather than assuming vector rendering is automatically correct or inexpensive.
