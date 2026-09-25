---
name: flutter-native-splash-engineering
description: Design, implement, review, debug, migrate, visually verify, and optimize production Android, iOS, and Web launch screens generated with flutter_native_splash. Use when a task involves flutter_native_splash YAML, splash colors/images/branding, Android 12+ SplashScreen icons or masking, iOS launch storyboards, Web pre-engine splash HTML/CSS, light/dark resources, image sizing, preserve/remove lifecycle, stuck or long splash screens, white/black startup flashes, first-frame matching, flavors or white-label splash generation, stale generated resources, CI regeneration, release-only differences, or startup-performance diagnosis tied to the native splash. Do not use for general in-app loading screens, desktop splash support, runtime dynamic splash content, or startup optimization with no flutter_native_splash/native launch-screen concern.
---

# Flutter Native Splash Engineering

Treat `flutter_native_splash` as a native/Web resource generator, not an
application loading-screen framework. Optimize the startup path separately from
the appearance of the OS-to-Flutter transition.

## Start with evidence

Before changing code or generated resources:

1. Inspect `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints, target
   platforms, flavors, and build pipelines.
2. Identify the locked `flutter_native_splash` version and whether runtime
   `preserve()`/`remove()` APIs are imported.
3. Find every splash configuration file, generation command, generated-resource
   ownership rule, preserve/remove call, and startup owner.
4. Inspect source asset formats, pixel dimensions, transparency, file sizes,
   dark variants, branding, and platform overrides.
5. Audit all synchronous work and awaited initialization before `runApp` and the
   first stable Flutter frame.
6. Inspect the first Flutter frame, theme/system bars, and layout for visual
   continuity with each native/Web splash.
7. Separate Android pre-12, Android 12+, iOS/iPad, and Web behavior.

The bundled guide was validated against `flutter_native_splash 2.4.8` on
2026-08-11. Use the installed package README, API, and changelog as the source
of truth when versions differ, especially for configuration keys, Android 12+
behavior, preserve/remove, flavors, Web output, and toolchain requirements.

## Preserve these invariants

- Support only the package's declared Android, iOS, and Web targets; do not
  fabricate macOS, Windows, or Linux support.
- Treat Android 12+ as a separate system splash with icon masking and restricted
  layout; do not reuse a pre-12 full-screen design blindly.
- Keep native splash content static and compile-time generated.
- Do not use app-internal theme preferences to choose native dark mode; native
  appearance follows platform/system resources available before Flutter runs.
- Do not use GIF, Lottie, or unsupported native animation hacks. Continue rich
  animation in Flutter after the first frame.
- Minimize work before `runApp` and the first frame.
- Never add `Future.delayed` merely to keep branding visible.
- Use `preserve()` only for a small, essential prerequisite and assign exactly
  one owner to `remove()`.
- Move long, dynamic, network-dependent, retryable, progressive, or interactive
  startup work into a Flutter startup/loading screen.
- Match the first Flutter frame's background, logo placement, system bars, and
  theme closely enough to avoid flashes and jumps where practical.
- Regenerate resources after configuration or source-asset changes; hot reload
  and hot restart do not regenerate launch resources.
- Do not run `flutter clean` after every edit. Use it only when targeted
  regeneration and full rebuild still leave stale artifacts.
- Treat generated native/Web files as generated state unless the repository has
  an explicit manual-merge ownership strategy.
- Keep one CI strategy: either commit deterministic generated files or generate
  them deterministically in CI; do not mix uncontrolled approaches.
- Use flavor/brand-specific compile-time resources; do not runtime-switch native
  splash branding.
- Prefer flat colors and lightweight correctly sized raster assets over huge
  full-screen images where the design permits.
- Measure actual startup in profile/release-like cold and warm launches; splash
  duration in debug is not a performance metric.

## Classify the requested change

Identify which outcome is actually requested:

1. **Actual startup optimization**: remove blocking awaits, reduce synchronous
   CPU/disk work, defer optional SDKs/network calls, and render a lightweight
   first frame sooner.
2. **Perceived-performance optimization**: remove flashes, align colors and
   system bars, and match the first frame.
3. **Visual/branding change**: update colors, logos, branding, or positioning.

Do not claim categories 2 or 3 make startup faster.

## Route to the production guide

Read only the relevant sections of `references/production-guide.md`. Locate
sections before reading them with:

```sh
rg -n '^#{1,3} (SECTION|RELATED SECTION)$' references/production-guide.md
```

Use these search headings:

| Task | Search headings |
|---|---|
| Understand architecture, dependency placement, generated files, or configuration | `Startup Model|Actual vs Perceived Performance|Package Architecture|Runtime Dependency Decision|Files Modified / Generated|Current Configuration|Current Top-Level Configuration Surface|Required Background Configuration|Platform Overrides` |
| Configure colors, dark mode, backgrounds, sizing, branding, or assets | `Dark Mode|Dark Mode Source|Background Images|Image Position / Scaling|Branding|Branding Guidance|Input Asset Formats|Asset Resolution|Asset File Size|Flat Color vs Full Background Image|Orientation / Tablets / Foldables|Accessibility` |
| Implement or debug Android pre-12 and Android 12+ | `Android 12\+|Android 12 Splash Model|Android 12 Asset Sizes|Android 12 Masking|Android 12 Background|Android 12 Icon Background|Android 12 Branding|Android 12 Animation|Android 12 Testing Caveats|Android Pre-12|android_min_sdk|Android Orientation|Fullscreen and Android Edge-to-Edge` |
| Implement or debug iOS/iPad | `iOS|iOS Asset Scaling|iPhone / iPad|iOS Dark Mode|iOS Status Bar / Fullscreen|iOS Launch Screen Restrictions` |
| Implement or debug Web splash behavior | `Web|Web Generated Assets|Web Dark Mode|Web Performance|Web GIF` |
| Generate, regenerate, restore, or troubleshoot stale resources | `Generation Workflow|Default configuration|Custom Configuration Path|Restore Default Splash|When to Regenerate|Hot Reload / Hot Restart|Do Not Ritualistically flutter clean` |
| Use preserve/remove or fix startup ownership and failures | `Preserve and Remove|preserve|remove|Deprecated Runtime API|When to Preserve|When NOT to Preserve|Stuck Splash Prevention|Startup Ownership|Startup Failure Architecture|Startup I/O Timeouts` |
| Choose native splash versus Flutter loading UI | `Native Splash vs Flutter Loading Screen|Authentication Startup|Remote Config|Third-Party SDK Initialization|Example Startup Anti-Pattern|Dynamic Splash Content|Animation Decision|Splash Duration` |
| Remove flashes or logo jumps and match the first frame | `Smooth Native-to-Flutter Transition|First-Frame Matching|Logo Jump|System Bars` |
| Configure flavors, white-label brands, CI, upgrades, or removal | `Flavor Support|Flavor Safety|Android Flavor Setup|iOS Flavor Setup|White-Label Applications|CI/CD|CI Strategy A|CI Strategy B|Do Not Mix Uncontrolled Strategies|Upgrades|Remove Command Semantics` |
| Diagnose or optimize startup | `Startup Performance|Startup Work Classification|Parallel Initialization|Startup CPU|Startup Network|Startup Disk I/O|Measuring Startup|Profile Mode|Cold vs Warm Start|Performance Budget Review|Asset Performance Rules|Build Size` |
| Debug, review, or prepare production | `Reliability Rules|Debugging Guide|Anti-Patterns|Implementation Checklist|Startup Audit Checklist|Code Review Checklist|Production Readiness Checklist|Version-Sensitive Areas|Decision Framework` |

For a full startup or production-readiness audit, read the entire guide after
completing the repository inventory.

## Implement at the real ownership boundary

- Fix slow startup in the startup dependency graph, not by extending splash
  preservation.
- Fix visual discontinuity by aligning generated resources and the first Flutter
  frame, not by adding delay.
- Keep the smallest correct configuration and reuse the repository's existing
  asset/flavor naming conventions.
- Run the generator once per relevant configuration, then review the generated
  native/Web diff before accepting it.
- Do not hand-edit generated output unless the repository deliberately owns and
  documents that merge strategy.

## Validate the result

Run configuration/generator checks and relevant Flutter analysis, then perform a
full rebuild and test release-like cold launches. Cover changed paths from this
matrix:

- Android pre-12 and Android 12+ across representative versions;
- Android light/dark mode, orientation, edge-to-edge, tablets, and foldables;
- iPhone and iPad light/dark launches with correct scaling and system bars;
- Web hard refresh before Flutter initializes, including dark mode;
- every affected flavor/brand and generated-resource strategy;
- preserve/remove success, timeout/failure, and exactly-one-removal ownership;
- first-frame background/logo/system-bar continuity;
- source and generated asset size/build-size impact;
- profile/release cold and warm startup measurements when performance changed.

Never claim startup became faster from visual timing alone. Report any platform,
OS-version, device-shape, flavor, or release-build path that was not executed.
