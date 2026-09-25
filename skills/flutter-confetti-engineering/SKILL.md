---
name: flutter-confetti-engineering
description: Design, implement, review, debug, test, profile, and optimize production celebration effects in Flutter with the confetti package. Use when a task involves ConfettiController, ConfettiWidget, celebration bursts, local or app-wide confetti overlays, particle count/emissionFrequency/blast force/gravity/drag/lifetime tuning, shouldLoop, pauseEmissionOnLowFrameRate, custom createParticlePath shapes, controller leaks, repeated or duplicate triggers, reduced-motion behavior, high CPU/raster cost, memory growth, low-end or 90/120 Hz performance, or confetti widget tests. Do not use for general Flutter animations, transitions, Lottie/Rive effects, native particle systems, or non-confetti CustomPainter work.
---

# Flutter Confetti Engineering

Treat confetti as a real-time Dart particle simulation and custom-paint workload.
Keep celebrations brief, purposeful, accessible, finite, simple, and measured.

## Start with evidence

Before changing code:

1. Inspect `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints, target
   platforms, and the locked `confetti` version.
2. Find every `ConfettiController`, `ConfettiWidget`, `play()`, `stop()`,
   disposal path, event trigger, overlay host, and reduced-motion branch.
3. Identify the exact business event and whether presentation is local,
   full-screen, or app-wide.
4. Record controller duration, `shouldLoop`, particle count, emission frequency,
   trajectory, gravity/drag, size, path complexity, stroke, clipping, and number
   of simultaneous emitters.
5. Inspect parent rebuild frequency, scene overdraw, blur/video/background cost,
   route/app lifecycle, and controller/config identity stability.
6. Distinguish duplicate state rebuilds from legitimate repeated celebration
   events.
7. Profile representative effects in profile mode on realistic hardware before
   making advanced rendering changes.

The bundled guide was validated against `confetti 0.8.0` on 2026-08-11. Use the
installed package source/API as the truth when versions differ, especially for
defaults, emission semantics, delta time, particle pooling, path callbacks,
offscreen retirement, and low-frame suppression.

## Preserve these invariants

- Own every `ConfettiController` at a stable lifecycle boundary and dispose it.
- Never create a controller or call `play()` from `build()`.
- Trigger confetti from a meaningful one-time application event, not persistent
  success state or rendering side effects.
- Explicitly choose a short controller duration; do not inherit a long default
  accidentally.
- Prefer finite event-driven effects; avoid indefinite `shouldLoop: true`.
- Keep one purposeful emitter rather than overlapping full-screen systems.
- Do not share one controller across independent emitters.
- Keep controller identity and core particle configuration stable while a
  `ConfettiWidget` is mounted; replace deliberately when configuration changes.
- Start performance tuning with active particle load, emission duration and
  frequency, simultaneous emitters, and residence time.
- Keep `pauseEmissionOnLowFrameRate` enabled unless measurement proves a product
  reason to disable it.
- Prefer simple particle paths, no stroke for dense effects, modest particle
  size, and limited alpha-heavy coverage.
- Do not add a `RepaintBoundary` immediately around `ConfettiWidget`; the package
  already contains one.
- Avoid placing expensive content in `ConfettiWidget.child` when an overlay
  sibling is simpler.
- Keep decorative confetti non-interactive and avoid blocking pointer input.
- Respect reduced-motion preferences by suppressing decorative full-screen
  effects or substituting low/no-motion feedback.
- Stop or dispose route-owned effects when their route leaves; bound global
  loops and respect `TickerMode`/app lifecycle.
- Never make business success, navigation, rewards, or persistence depend on the
  animation completing.
- Measure UI and raster frame time separately; debug-mode jank is not production
  evidence.
- Validate lower-end and high-refresh devices when those targets matter.

## Choose the smallest effect

Use this decision order:

1. Use no confetti when reduced motion is requested or the event does not merit
   a celebration.
2. Use a short localized burst for lightweight success feedback near its source.
3. Use one short standard emitter for a normal celebration.
4. Use one bounded full-screen overlay for rare, high-value events.
5. Add custom shapes only when branding value justifies path/raster cost.
6. Add a global host only when celebrations genuinely cross multiple routes or
   features.

Do not add global architecture for one button or maximize particles before the
smallest useful preset is measured.

## Route to the production guide

Read only the relevant sections of `references/production-guide.md`. Locate
sections before reading them with:

```sh
rg -n '^#{1,3} (SECTION|RELATED SECTION)$' references/production-guide.md
```

Use these search headings:

| Task | Search headings |
|---|---|
| Understand rendering cost or current APIs | `Package Architecture|Frame Pipeline|Cost Categories|Widget rebuild cost|UI-thread simulation cost|Raster/GPU cost|Memory cost|Battery cost|Current API|ConfettiController|ConfettiWidget` |
| Implement or fix controller lifecycle | `Controller Lifecycle|Basic Production Pattern|Never Create the Controller in build|Controller Outside a Widget|Stable Controller Identity|Stable Particle Configuration|Controller Duration Mutation|play|Repeated play|stop|Immediate Stop|Duration vs Visible Duration|Explicitly Choose Duration|shouldLoop|Loop Ownership` |
| Understand particle pooling and validate parameters | `Particle Pool|Particle Reuse Details|ParticleStats|Parameter Guide|Parameter Validation` |
| Tune particle count, emission, or high-refresh behavior | `Particle Count and Emission|Emission Frequency Semantics|High-Refresh Consequence|Active Particle Mental Model|First Performance Tuning Order|pauseEmissionOnLowFrameRate|Sparse Confetti Under Load` |
| Tune physics, layout, clipping, or responsive behavior | `Directionality|Directional|Explosive|Blast Force|Gravity|Particle Drag|Particle Lifetime|Current Offscreen Boundaries|Particle Size|Large Screens|canvas|Clipping|Responsive Layout Caveat` |
| Build custom shapes or tune paint cost | `Custom Particle Shapes|When Custom Paths Are Built|Do Not Over-Cache Custom Paths|Path Complexity|Complex Logo Particles|Paint Operations|Colors|Transparency` |
| Place local/full-screen effects or design overlays | `Widget Placement|child|Internal RepaintBoundary|Expensive Background Content|Pointer Interaction|Full-Screen vs Localized Effects|Continuous Confetti|Multiple Confetti Widgets|Controller Sharing|Global Celebration Overlay` |
| Fix event semantics, duplicate triggers, or replays | `Trigger Architecture|State vs Event|Duplicate Trigger Guards|Repeated Legitimate Celebrations|Replay|Clean Restart|State Management Integration|One-Time Effects` |
| Implement accessibility and lifecycle behavior | `Accessibility and Reduced Motion|Recommended Reduced-Motion Behavior|Motion Preference Changes During Playback|App and Route Lifecycle|Route Disposal|Long-Lived Global Loops|TickerMode|Rebuild Behavior|No Side Effects in build` |
| Diagnose CPU, raster, memory, battery, refresh-rate, or device performance | `Performance Rules|CPU Cost|Allocation Churn|Raster / GPU Cost|Overdraw|Memory|Battery Efficiency|High Refresh Rate|High-Refresh Density Caveat|Low-End Device Strategy|Conceptual Performance Presets|Responsive Design|Web|Desktop|displayTarget` |
| Test, profile, debug, review, or prepare production | `Testing|Randomness and Golden Tests|pumpAndSettle|Widget Test Strategy|Test Reduced Motion|Performance Profiling Workflow|Do Not Trust Debug Performance|Debugging Guide|Anti-Patterns|Implementation Checklist|Performance Audit Checklist|Code Review Checklist|Production Readiness Checklist|Version-Sensitive Areas|Decision Framework|Profiling Interpretation` |

For a full performance or production-readiness audit, read the entire guide after
completing the repository inventory.

## Implement at the event and lifecycle boundaries

- Fix controller leaks and repeated play calls in the shared lifecycle/event
  owner rather than adding guards to every rebuild.
- Reuse a controller for legitimate repeated events during one mounted lifetime;
  do not allocate a controller per celebration.
- Convert persistent state into a consumable presentation event where the
  existing state-management architecture supports it.
- Keep overlay scope local unless multiple routes/features truly need a global
  host.
- Fix measured frame cost by reducing emitted work before adding rendering
  abstractions or isolates.

## Validate the result

Run the narrowest relevant Flutter analysis/widget checks, then profile a
representative production scene. Cover changed paths from this matrix:

- controller creation, stable identity, play/stop/replay, and disposal;
- duplicate rebuild/event handling and legitimate repeated celebrations;
- finite duration and loop shutdown;
- reduced motion at startup and when preference changes during playback;
- route/app lifecycle and global overlay behavior;
- UI and raster frame times with and without confetti;
- particle high-watermark/memory after repeated bursts;
- low-end and 60/90/120 Hz devices when relevant;
- localized/full-screen layout, pointer behavior, and responsive geometry;
- custom paths and random behavior with deterministic structural tests.

Avoid pixel-perfect golden tests for random particles and avoid
`pumpAndSettle()` on looping effects. Report untested device and performance
paths explicitly.
