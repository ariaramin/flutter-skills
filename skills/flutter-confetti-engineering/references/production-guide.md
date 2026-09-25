# Confetti for Flutter

Validated against:

```text
confetti 0.8.0
```

Validation date:

```text
2026-08-11
```

Current pub.dev platforms:

```text
Android
iOS
Linux
macOS
Web
Windows
```

`confetti` is implemented using Flutter/Dart rendering and `vector_math`.

It does not require:

```text
Android native setup
iOS native setup
platform permissions
platform channels
native particle libraries
```

Always inspect the project's actual `pubspec.lock` and current package source before relying on version-sensitive implementation details.

---

# Purpose

This skill governs production implementation, review, profiling, debugging, testing, accessibility, and performance optimization for the Flutter `confetti` package.

Use it when building or reviewing:

- achievement celebrations
- purchase-success effects
- level-completion effects
- award/unlock effects
- app-wide celebration overlays
- localized particle bursts
- custom particle shapes
- high-refresh animations
- particle performance tuning
- reduced-motion behavior
- controller lifecycle
- repeated celebration triggers
- animation tests

This skill treats confetti as a real-time particle simulation and custom-paint workload.

It does not treat it as a free decorative widget.

---

# When to Use This Skill

Trigger this skill when asked to:

- install `confetti`
- create a celebration animation
- use `ConfettiController`
- configure `ConfettiWidget`
- optimize particle count
- optimize `emissionFrequency`
- use `createParticlePath`
- fix confetti jank
- fix confetti memory growth
- fix controller leaks
- fix repeated animation triggers
- implement looping confetti
- add reduced-motion handling
- debug high CPU
- debug raster spikes
- create app-wide confetti
- test a confetti implementation
- make confetti work well at 90/120 Hz
- review a custom particle effect

---

# Rule Language

- **MUST** — lifecycle/correctness requirement.
- **SHOULD** — strong production recommendation.
- **MAY** — optional architecture or visual choice.
- **Package behavior** — verified against current 0.8.0 source.
- **Flutter behavior** — provided by Flutter animation/rendering APIs.
- **Engineering recommendation** — derived from the verified implementation and Flutter rendering model.

---

# Core Principles

1. **MUST own and dispose each `ConfettiController` explicitly.**

2. **MUST NOT create a `ConfettiController` from `build()`.**

3. **MUST NOT call `play()` as a side effect of `build()`.**

4. **SHOULD keep confetti short-lived and event-driven.**

5. **SHOULD explicitly choose controller duration instead of accidentally using the 30-second default.**

6. **SHOULD keep `pauseEmissionOnLowFrameRate` enabled unless the product has a measured reason not to.**

7. **SHOULD treat particle count and emission behavior as the first performance knobs.**

8. **SHOULD avoid indefinite `shouldLoop: true`.**

9. **SHOULD use one purposeful emitter rather than several overlapping full-screen emitters.**

10. **SHOULD prefer simple particle paths.**

11. **MUST respect reduced-motion preferences for decorative full-screen effects.**

12. **MUST NOT interpret debug-mode jank as representative production performance.**

13. **SHOULD profile UI and raster frame time separately.**

14. **SHOULD validate high-intensity effects on lower-end hardware.**

15. **SHOULD test on high-refresh target devices when 90/120 Hz smoothness matters.**

16. **MUST treat controller identity and core particle configuration as stable for a mounted `ConfettiWidget`.**

17. **SHOULD not share one controller across several independent emitters.**

18. **SHOULD not add another `RepaintBoundary` immediately around `ConfettiWidget`; the package already contains one.**

19. **SHOULD avoid putting expensive content inside `ConfettiWidget.child` when a separate overlay sibling is simpler.**

20. **MUST NOT use particle animation as a business-state mechanism.**

---

# Package Architecture

The current rendering pipeline is approximately:

```text
ConfettiController
      |
      | ChangeNotifier state
      v
ConfettiWidget State
      |
      +--> internal AnimationController
      |
      +--> ParticleSystem
              |
              +--> List<Particle>
              |
              +--> physics updates
      |
      v
ParticlePainter
      |
      v
CustomPaint
      |
      v
Canvas.drawPath(...)
```

Particles are not represented by Flutter widgets.

A burst containing 100 active particles does **not** create 100 widget subtrees.

Instead, all particles are simulated as Dart objects and painted into one custom-paint layer.

---

# Frame Pipeline

For each active animation frame:

```text
AnimationController tick
        |
        v
ParticleSystem.update(deltaTime)
        |
        +--> update velocity
        +--> drag
        +--> gravity
        +--> position
        +--> rotation
        +--> deactivate outside particles
        +--> probabilistically emit more
        |
        v
CustomPainter repaint
        |
        +--> iterate active particles
        +--> calculate rotation transform
        +--> transform particle Path
        +--> Canvas.drawPath
        |
        v
Flutter raster thread / GPU
```

---

# Cost Categories

## Widget rebuild cost

Usually relatively small.

The package supplies the internal animation as the `repaint` `Listenable` to its `CustomPainter`, so animation ticks repaint without rebuilding or relaying out the widget tree each frame.

Parent rebuilds still reconstruct `ConfettiWidget`/`ParticlePainter`, so avoid unnecessary high-frequency parent rebuilding, but this is rarely the dominant cost.

---

## UI-thread simulation cost

Scales with:

```text
active particle count
+
retained particle pool iteration
+
physics calculations
+
path transforms
+
trigonometry
+
temporary Dart allocations
```

---

## Raster/GPU cost

Scales with:

```text
number of paths drawn
path complexity
particle screen area
stroke drawing
alpha blending
overdraw
content underneath
clipping/layer effects
```

---

## Memory cost

Comes primarily from:

```text
Particle objects
stored Paths
vector state
high-watermark retained particle pool
temporary per-frame transform objects
multiple simultaneous particle systems
```

---

## Battery cost

Sustained cost comes from:

```text
continuous ticker activity
continuous Dart simulation
continuous repaint
continuous rasterization
high particle density
indefinite looping
multiple simultaneous emitters
```

Short, event-driven bursts are therefore materially better than ambient continuous confetti.

---

# Current API

## `ConfettiController`

Current constructor:

```dart
ConfettiController({
  Duration duration = const Duration(seconds: 30),
  ParticleStatsCallback? particleStatsCallback,
})
```

Current public members include:

```text
duration
particleStatsCallback
state
play()
stop({bool clearAllParticles = false})
dispose()
```

Current states:

```text
ConfettiControllerState.playing
ConfettiControllerState.stopped
ConfettiControllerState.stoppedAndCleared
ConfettiControllerState.disposed
```

---

# `ConfettiWidget`

Current constructor surface:

```dart
ConfettiWidget({
  Key? key,
  required ConfettiController confettiController,
  double emissionFrequency = 0.02,
  int numberOfParticles = 10,
  double maxBlastForce = 20,
  double minBlastForce = 5,
  BlastDirectionality blastDirectionality =
      BlastDirectionality.directional,
  double blastDirection = pi,
  double gravity = 0.2,
  bool shouldLoop = false,
  bool displayTarget = false,
  List<Color>? colors,
  Color strokeColor = Colors.black,
  double strokeWidth = 0,
  Size minimumSize = const Size(20, 10),
  Size maximumSize = const Size(30, 15),
  double particleDrag = 0.05,
  Size? canvas,
  bool pauseEmissionOnLowFrameRate = true,
  Path Function(Size size)? createParticlePath,
  Widget? child,
})
```

The current constructor default for `gravity` is **0.2**.

Older README prose still mentions 0.1.

Use the constructor/source as the current truth.

---

# Controller Lifecycle

The normal ownership pattern is:

```text
State.initState
    ↓
create controller
    ↓
State/build tree uses controller
    ↓
events call play/stop
    ↓
State.dispose
    ↓
dispose controller
```

---

# Basic Production Pattern

The following is a production-oriented local celebration pattern.

The numeric intensity values are examples, not universal tuning recommendations.

```dart
import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';

void main() {
  runApp(const CelebrationApp());
}

class CelebrationApp extends StatelessWidget {
  const CelebrationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: CelebrationPage(),
    );
  }
}

class CelebrationPage extends StatefulWidget {
  const CelebrationPage({super.key});

  @override
  State<CelebrationPage> createState() =>
      _CelebrationPageState();
}

class _CelebrationPageState
    extends State<CelebrationPage> {
  late final ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();

    _confettiController = ConfettiController(
      duration: const Duration(
        milliseconds: 900,
      ),
    );
  }

  void _celebrate() {
    if (MediaQuery.disableAnimationsOf(context)) {
      return;
    }

    if (_confettiController.state ==
        ConfettiControllerState.playing) {
      return;
    }

    _confettiController.play();
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool reduceMotion =
        MediaQuery.disableAnimationsOf(context);

    return Scaffold(
      body: Stack(
        children: <Widget>[
          Center(
            child: FilledButton(
              onPressed: _celebrate,
              child: const Text(
                'Celebrate',
              ),
            ),
          ),
          if (!reduceMotion)
            IgnorePointer(
              child: Align(
                alignment: Alignment.topCenter,
                child: ConfettiWidget(
                  confettiController:
                      _confettiController,
                  blastDirectionality:
                      BlastDirectionality.explosive,
                  emissionFrequency: 0.03,
                  numberOfParticles: 8,
                  shouldLoop: false,
                  colors: const <Color>[
                    Colors.blue,
                    Colors.purple,
                    Colors.amber,
                    Colors.pink,
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
```

Why this pattern is strong:

```text
controller identity is stable
controller is disposed
effect is event-driven
duplicate trigger is guarded
looping is disabled
reduced motion is respected
content is separate from particle painter
confetti does not intentionally handle pointer input
```

Tune the intensity with profile/release measurements.

---

# Never Create the Controller in `build()`

## Bad

```dart
Widget build(BuildContext context) {
  final ConfettiController controller =
      ConfettiController(
    duration: const Duration(
      seconds: 1,
    ),
  );

  return ConfettiWidget(
    confettiController: controller,
  );
}
```

## Why

Every rebuild can create another controller.

That causes:

```text
unstable identity
lost state
unowned ChangeNotifier resources
unpredictable listeners
replay/reset behavior
```

## Preferred

Create it in:

```text
State.initState
```

or another clearly owned lifecycle object.

---

# Controller Outside a Widget

A controller MAY live in:

- a UI controller
- a view model
- a provider
- an application overlay coordinator

only if:

```text
its lifetime is explicit
its disposal is explicit
the ConfettiWidget receives a stable instance
```

Do not store it globally merely because it is a controller.

A `ConfettiController` is UI effect state.

---

# Stable Controller Identity

Current 0.8.0 `ConfettiWidget` subscribes to its supplied controller in `initState`.

It does not currently implement `didUpdateWidget` to transfer that listener if the controller instance changes.

Therefore this is unsafe to rely on:

```text
mounted ConfettiWidget
        ↓
parent rebuilds
        ↓
different ConfettiController instance
```

Keep the same controller for the mounted widget lifetime.

If controller replacement is necessary:

```text
dispose/remount the confetti widget deliberately
```

for example by constructing a new lifecycle owner/key.

---

# Stable Particle Configuration

Current `ParticleSystem` receives these values in `initState`:

```text
emissionFrequency
numberOfParticles
maxBlastForce
minBlastForce
gravity
blastDirection
blastDirectionality
colors
minimumSize
maximumSize
particleDrag
createParticlePath
```

Do not assume rebuilding the same mounted `ConfettiWidget` with different values dynamically reconfigures the existing `ParticleSystem`.

For configuration changes:

```text
remount the particle system deliberately
```

or decide the configuration before playback.

---

# Controller Duration Mutation

`ConfettiController.duration` is mutable, but the widget's internal `AnimationController` receives the duration when `ConfettiWidget` initializes.

Do not rely on:

```dart
controller.duration =
    const Duration(seconds: 5);
```

changing an already-mounted confetti widget's cycle duration.

Choose duration before mounting, or remount deliberately.

---

# `play()`

Calling:

```dart
controller.play();
```

sets:

```text
ConfettiControllerState.playing
```

and notifies the widget.

The widget:

```text
restarts its internal duration timer from zero
starts particle emission
```

Existing particles are not automatically cleared.

---

# Repeated `play()`

Repeated calls while active can:

```text
restart the emission-duration window
retain existing particles
continue creating additional particles
```

Do not use repeated `play()` as a harmless no-op.

Guard duplicate celebration events.

---

# `stop()`

Normal:

```dart
controller.stop();
```

means:

```text
stop creating new particles
allow existing particles to continue moving
remove them as they leave the configured bounds
stop the ticker when the system becomes empty
```

This creates a natural tail.

---

# Immediate Stop

Use:

```dart
controller.stop(
  clearAllParticles: true,
);
```

when the effect must disappear immediately.

Examples:

```text
route is being forcefully torn down
reduced-motion preference just became active
another visual state invalidates the celebration
test teardown
```

Do not use immediate clearing by default if the natural tail is desired.

---

# Duration vs Visible Duration

These are different.

```text
controller duration
        =
how long the emission cycle is allowed to run

visible duration
        =
emission interval
+
time existing particles need to leave
```

With:

```dart
shouldLoop: false
```

emission stops when controller duration completes, but particles may remain visible afterwards.

---

# Explicitly Choose Duration

Current controller default:

```text
30 seconds
```

This is long for most transactional success celebrations.

Do not accidentally write:

```dart
final controller =
    ConfettiController();
```

for a small success checkmark and accept thirty seconds of emission.

Choose a product-appropriate finite duration.

There is no universal best duration.

---

# `shouldLoop`

Default:

```text
false
```

When:

```dart
shouldLoop: true
```

the internal duration cycle restarts after completion without stopping particle emission.

It continues until something calls:

```dart
controller.stop()
```

or destroys the widget/controller.

---

# Loop Ownership

Every looping effect MUST have an explicit stop condition.

Examples:

```text
dialog closes
success screen exits
temporary state ends
user navigates away
maximum product-defined celebration window reached
```

Avoid:

```text
app root
+
shouldLoop: true
+
no stop owner
```

---

# Particle Pool

Current particle system keeps:

```text
active particles
+
inactive reusable particles
```

in one list while emission continues.

When an inactive particle is needed:

```text
reactivate existing object
```

before constructing another one.

This reduces allocation churn after the pool reaches the required high-watermark.

---

# Particle Reuse Details

On reactivation, current source resets:

```text
position
velocity
acceleration
rotation
startup force
time alive
active state
```

It retains the particle's:

```text
Path
color
size-dependent geometry
mass
drag coefficient
gravity configuration
```

Do not assume every emission produces entirely new random geometry/color.

---

# ParticleStats

Current controller can receive:

```dart
ParticleStatsCallback
```

which supplies:

```text
numberOfParticles
activeNumberOfParticles
```

Use it for:

- diagnostics
- performance experiments
- adaptive design investigation

Do not enable expensive per-frame logging in production.

The active-particle statistic requires scanning the particle pool and a stats object is generated for callback delivery.

---

# Parameter Guide

| Parameter | Current default | What it controls | Increasing it generally does | Performance consequence |
|---|---:|---|---|---|
| `duration` | 30 s | Emission-cycle duration | Keeps emission active longer | More total work/battery |
| `emissionFrequency` | 0.02 | Probability of an emission on a frame | Raises probability of more batches | Strong increase in particle load |
| `numberOfParticles` | 10 | Particles per emission batch | Creates/reactivates more particles at once | Strong increase in simulation/draw work |
| `minBlastForce` | 5 | Lower initial force | Raises minimum launch velocity | Alters residence time/trajectory |
| `maxBlastForce` | 20 | Upper initial force | Raises possible launch velocity | Alters residence time/trajectory |
| `gravity` | 0.2 | Downward acceleration scale | Pulls particles downward faster | Can shorten many trajectories |
| `particleDrag` | 0.05 | Current drag coefficient | Current source calculates stronger drag | Alters velocity/residence time |
| `minimumSize` | `Size(20, 10)` | Minimum particle dimensions | Raises smallest particle coverage | More potential raster fill |
| `maximumSize` | `Size(30, 15)` | Maximum dimensions | Allows larger particles | More potential raster fill |
| `shouldLoop` | false | Repeats emission cycles | Can make effect indefinite | High sustained CPU/GPU/battery risk |
| `strokeWidth` | 0 | Particle outline | Adds visible outline | Adds second path draw when >0 |
| `canvas` | screen | Simulation boundary | Larger boundary can keep particles alive longer | Can increase active residence |
| `pauseEmissionOnLowFrameRate` | true | Adaptive emission suppression | When enabled, protects struggling frames | Usually beneficial |
| `displayTarget` | false | Debug emitter marker | Draws crosshair | Tiny extra paint cost |
| `createParticlePath` | rectangle | Shape geometry | Depends on custom path | Complexity can strongly affect paint |
| `colors` | random | Particle colors | Changes appearance | Usually negligible vs particle count |

---

# Parameter Validation

Current source uses debug assertions for several constraints.

Configure valid values even though release builds may not run assertions.

Current requirements include:

```text
0 <= emissionFrequency <= 1
numberOfParticles > 0

maxBlastForce > 0
minBlastForce > 0
maxBlastForce > minBlastForce

0 <= gravity <= 1

0 <= particleDrag <= 1

minimumSize width/height > 0
maximumSize width/height > 0

minimumSize.width <= maximumSize.width
minimumSize.height <= maximumSize.height

strokeWidth >= 0
controller duration > 0
```

Also avoid:

```dart
colors: const <Color>[],
```

because current random color selection expects a non-empty list when `colors` is provided.

Use:

```text
null
```

for package-selected random colors or at least one explicit color.

---

# Particle Count and Emission — HIGH PRIORITY

`numberOfParticles` is **per successful emission**.

It is not:

```text
maximum particles on screen
```

The package can emit many batches during one duration.

---

# Emission Frequency Semantics

Current source essentially performs:

```text
once per animation update:

random value in [0, 1)
    <
emissionFrequency
    ?
emit numberOfParticles
```

Therefore:

```text
emissionFrequency = probability per frame
```

not:

```text
emissions per second
```

---

# High-Refresh Consequence

As an engineering expectation:

```text
expected emission batches per second
≈
display ticks per second
×
emissionFrequency
```

while frames remain healthy.

Thus approximately:

```text
120 Hz
```

offers twice as many probability trials as:

```text
60 Hz
```

for an unchanged frequency.

This is one reason production validation must include the refresh rates that matter to the product.

Do not hardcode a particle count based solely on a 60 Hz emulator.

---

# Active Particle Mental Model

A useful conceptual model:

```text
active particle pressure
≈
emission opportunities
×
particles per emission
×
average time before particles leave
```

It is not an exact formula.

Particle residence time changes with:

```text
screen size
blast direction
blast force
gravity
drag
emitter position
```

---

# First Performance Tuning Order

When confetti causes jank, adjust in this order:

```text
1. disable looping
2. shorten emission duration
3. reduce numberOfParticles
4. reduce emissionFrequency
5. simplify custom Path
6. disable strokes
7. reduce multiple simultaneous emitters
8. reconsider full-screen extent/overdraw
```

This generally produces better results than adding rendering hacks first.

---

# `pauseEmissionOnLowFrameRate`

Keep:

```dart
pauseEmissionOnLowFrameRate: true,
```

by default.

Current behavior detects a frame delta exceeding roughly:

```text
1 / 60 second
```

and:

```text
continues existing particle updates
clamps the simulation step
skips generating additional particles
```

This prevents a struggling frame budget from accumulating even more particle work.

---

# Sparse Confetti Under Load

If confetti becomes sparse while an expensive operation runs, do not immediately set:

```dart
pauseEmissionOnLowFrameRate: false
```

That can force particle creation during an already overloaded frame sequence.

Instead investigate:

```text
what else is blocking UI/raster work?
is particle load already excessive?
can the expensive operation move?
```

Disable the safety feature only when particle consistency is more important than frame pacing and representative profiling supports it.

---

# Directionality

Current values:

```dart
BlastDirectionality.directional
BlastDirectionality.explosive
```

---

# Directional

Uses:

```dart
blastDirection
```

as the launch angle.

Angles are radians.

Flutter Canvas coordinates mean:

```text
0        -> right
pi / 2   -> down
pi       -> left
-pi / 2  -> up
```

Example:

```dart
import 'dart:math' as math;

const double shootUp =
    -math.pi / 2;
```

Positive angles visually rotate clockwise because Flutter's y-axis grows downward.

---

# Explosive

```dart
blastDirectionality:
    BlastDirectionality.explosive
```

causes particle launch direction to be randomized.

`blastDirection` is not needed for the explosion direction in that mode.

---

# Blast Force

Current package documentation defines `minBlastForce` and `maxBlastForce` as force applied during a particle's first five update frames.

Higher force is not purely a performance increase or decrease.

It can:

```text
move particles out of side/bottom bounds sooner
```

or:

```text
launch upward particles farther outside the screen
and keep them active longer before gravity returns them
```

Therefore tune force for motion design first and then observe active particle counts.

---

# Gravity

Current constructor default:

```text
0.2
```

Valid range:

```text
0..1
```

Higher gravity increases the current downward force.

For many particles it causes them to reach the lower boundary sooner.

Very low gravity combined with strong upward force can keep particles alive for much longer.

---

# Particle Drag — Current Source Caveat

Current README prose says:

```text
1.0 gives no drag
```

but current 0.8.0 physics code calculates:

```text
dragMagnitude =
particleDrag * speed²
```

and applies it opposite velocity.

Therefore the current implementation behaves as a drag coefficient:

```text
higher particleDrag
→ stronger calculated drag
```

Do not generate new guidance based on the stale README sentence.

Revalidate if the package version changes.

---

# Particle Lifetime

There is no public:

```text
particleLifetime
TTL
maxAge
```

parameter.

Current particles are retired when they cross configured simulation boundaries.

This means trajectories matter to CPU/memory cost.

---

# Current Offscreen Boundaries

Current source deactivates particles outside:

```text
bottom boundary
left boundary
right boundary
```

using approximately 110% of the configured screen/canvas extent.

There is currently no corresponding upper boundary test.

Consequently:

```text
very strong upward force
+
very low gravity
```

can leave an invisible particle active above the screen until its trajectory returns.

Avoid extreme physics without profiling.

---

# Particle Size

`Size` values are Flutter logical coordinates.

Do not multiply them manually by device pixel ratio.

Flutter handles device-pixel conversion.

Increasing particle dimensions does not necessarily increase simulation CPU substantially, but it increases:

```text
path geometry extent
pixel coverage
overdraw
alpha blending area
```

on the raster side.

---

# Large Screens

Do not automatically use:

```text
particle count ∝ viewport area
```

for tablets/desktops.

A larger screen can already increase particle residence time because particles must travel farther before leaving the system boundaries.

A visually sparse desktop effect is often better solved with:

```text
better emitter placement
a bounded increase in intensity
multiple localized moments
```

rather than multiplying particle count by screen area.

---

# `canvas`

Current:

```dart
Size? canvas
```

defaults to the `MediaQuery` screen size.

It controls particle-system boundary calculations.

It is not a visual clipping API.

---

# Clipping

Current `ConfettiWidget` exposes no:

```text
clipBehavior
clipRect
```

option.

If strict clipping is required, use a Flutter clipping widget around an intentionally constrained effect.

Example conceptual hierarchy:

```text
ClipRect
  SizedBox
    ConfettiWidget
```

Do not add clipping automatically.

Flutter documents clipping as additional rendering work.

Profile it when many paths are animated.

---

# Responsive Layout Caveat

Current widget updates particle-system screen size on viewport/layout-size changes.

The current source does not robustly recompute every emitter-position-only layout change when screen size remains the same.

For emitters that move substantially because of:

```text
animated layout
resizable panes
dynamic alignment changes
```

test current 0.8.0 behavior explicitly.

If necessary, deliberately remount the confetti emitter when its coordinate context changes materially.

---

# Custom Particle Shapes

Current signature:

```dart
Path Function(Size size)?
```

Example of a lightweight diamond:

```dart
import 'package:flutter/widgets.dart';

Path createDiamondPath(
  Size size,
) {
  return Path()
    ..moveTo(
      size.width / 2,
      0,
    )
    ..lineTo(
      size.width,
      size.height / 2,
    )
    ..lineTo(
      size.width / 2,
      size.height,
    )
    ..lineTo(
      0,
      size.height / 2,
    )
    ..close();
}
```

Use:

```dart
ConfettiWidget(
  confettiController: controller,
  createParticlePath:
      createDiamondPath,
)
```

---

# When Custom Paths Are Built

Current source calls:

```text
createParticlePath(size)
```

once when allocating a new `Particle`.

It stores that resulting path on the particle.

Reactivating a pooled particle does not regenerate it.

---

# Do Not Over-Cache Custom Paths

Because:

```text
the package already retains the resulting Path per Particle
```

an application-level cache is usually unnecessary.

A cache keyed by randomly generated floating-point `Size` values could itself grow substantially.

Prefer:

```text
small path-building function
+
package particle reuse
```

unless profiling demonstrates a real allocation-time bottleneck.

---

# Path Complexity

Even though custom path construction is not per-frame, each active frame transforms the stored path and draws it.

Relative cost generally grows from:

```text
simple rectangle / diamond
        ↓
small polygon / star
        ↓
many-segment path
        ↓
complex Bézier/logo geometry
```

Keep branded particles visually simple.

At particle sizes of only a few logical pixels, detailed vector-logo geometry often has little visual value but retains its transformation/raster cost.

---

# Complex Logo Particles

Avoid copying an entire SVG logo path containing hundreds of segments into every particle.

Instead create:

```text
simplified silhouette
simple recognizable mark
few-point polygon
```

and test that it remains recognizable at the actual particle size.

---

# Paint Operations

Current painter does approximately:

```text
for every active particle:
    calculate rotation trig
    build Matrix4
    transform stored Path
    drawPath(fill)

    if strokeWidth > 0:
        drawPath(stroke)
```

Therefore:

```text
strokeWidth > 0
```

adds another path draw for every active particle.

Avoid strokes on high-density effects unless they materially improve the design.

---

# Colors

When:

```dart
colors: null
```

the package chooses random Flutter Material primary colors for newly created particles.

An explicit color list can enforce branding.

Example:

```dart
colors: const <Color>[
  Color(0xFF6750A4),
  Color(0xFFFFB300),
  Color(0xFF00A6A6),
],
```

Color-list length is not an important performance knob compared with active particle count.

---

# Transparency

Semitransparent particle colors require blending over the scene.

This can raise raster work when:

```text
many particles overlap
particles are large
background itself is expensive
```

Do not remove alpha merely for theoretical optimization.

Profile the real visual scene.

---

# Widget Placement

Typical layout:

```text
Stack
 ├── normal application content
 └── confetti emitter
```

Prefer this over making the entire expensive application subtree the `child` of `ConfettiWidget`.

---

# `child`

`ConfettiWidget` can receive:

```dart
child:
```

and paints confetti as a foreground painter above that child.

This is convenient.

However, for a large/expensive screen, a sibling overlay is usually a cleaner repaint/lifecycle boundary.

---

# Internal RepaintBoundary

Current package already returns:

```text
RepaintBoundary
  CustomPaint
```

Do not wrap:

```text
RepaintBoundary
  RepaintBoundary
    ConfettiWidget
```

as a default performance ritual.

Extra repaint boundaries introduce layers and can consume additional raster-cache/GPU memory.

Measure before adding another one.

---

# Expensive Background Content

If a celebration sits above:

```text
video
BackdropFilter
large blur
animated gradient
complex map
large scrolling scene
```

raster cost can come from the entire composed scene, not only confetti.

Profile:

```text
confetti off
vs
confetti on
```

before blaming particle simulation.

---

# Pointer Interaction

The package paints confetti with a foreground `CustomPainter`.

Flutter's default foreground-painter hit-test behavior is to report no hit.

Therefore a bare confetti painter does not inherently need `IgnorePointer`.

For a full-screen decorative overlay, `IgnorePointer` MAY still be useful to:

- document intent
- protect against future child additions
- ensure overlay composition cannot capture interactions

Do not add it because particle drawing itself requires it.

---

# Full-Screen vs Localized Effects

## Localized

Prefer when:

```text
celebration belongs to one button/card
screen already contains expensive visual effects
effect should be subtle
low-end hardware is important
```

Benefits can include:

```text
less visual overdraw
lower required particle density
clearer interaction meaning
```

---

## Full-screen

Use when:

```text
event is genuinely important
product design calls for large celebration
effect is short
representative hardware remains smooth
```

Full-screen particles increase the probability of:

```text
more overlapping pixels
larger visual density requirement
complex composition with background
```

---

# Continuous Confetti

Avoid by default.

Use only when continuous motion is deliberately part of the product and the team explicitly accepts:

```text
sustained CPU
sustained raster work
battery impact
motion accessibility implications
```

A confetti package designed for celebration is rarely the right choice for permanent background ambience.

---

# Multiple Confetti Widgets

Each mounted `ConfettiWidget` has its own:

```text
internal AnimationController
ParticleSystem
particle pool
CustomPainter
RepaintBoundary
```

Two simultaneous emitters mean roughly two independent simulation/paint workloads.

Several full-screen emitters can multiply work quickly.

---

# Controller Sharing

A `ConfettiController` is a `ChangeNotifier`, so technically several widgets can listen.

Do not assume that means it is a good shared-emitter architecture.

Current widgets can call:

```text
controller.stop()
```

when their own particle system finishes or is disposed.

One emitter can therefore stop another listener sharing the same controller.

Prefer:

```text
one controller
per independent ConfettiWidget
```

---

# Global Celebration Overlay

A global overlay MAY make sense when:

- many routes trigger the same celebration design
- the app has one visual celebration layer
- one coordinator can own a controller cleanly

Suitable architecture:

```text
root Stack / Overlay
      |
      v
single celebration host
      |
      v
one stable ConfettiController
```

Do not build this architecture for one local success button.

---

# Trigger Architecture

Preferred:

```text
domain/application event
        ↓
one-time UI effect
        ↓
controller.play()
```

Avoid:

```text
build()
   ↓
if success:
    play()
```

---

# State vs Event

Persistent state:

```text
orderStatus == completed
```

can remain true through:

- rebuild
- navigation restoration
- provider relisten
- hydration

It should not automatically replay confetti every time it is observed.

Instead trigger on a transition:

```text
pending -> completed
```

or a one-time effect/event.

---

# Duplicate Trigger Guards

Potential duplicate sources:

```text
double taps
listener registered twice
retry emits same success
state hydration
route restoration
multiple async completions
```

Use one of:

```text
event ID deduplication
previous-state transition detection
in-flight controller-state guard
consumed UI-effect token
```

Do not use arbitrary timer debounce unless it matches the semantic event.

---

# Repeated Legitimate Celebrations

If a second independent achievement can happen before the first effect completes, decide explicitly whether to:

```text
ignore until previous completes
restart current effect
clear and restart
queue celebrations
use separate localized emitter
```

Do not let repeated `play()` calls accidentally define product behavior.

---

# Replay

A controller can be replayed after the previous particle system finishes.

Prefer reusing the same lifecycle-owned controller.

Do not allocate a new controller for every button tap.

---

# Clean Restart

If the product intentionally wants the second event to replace the first immediately:

```dart
controller.stop(
  clearAllParticles: true,
);
controller.play();
```

Test the desired visual behavior.

Do not use this for accidental duplicate events.

---

# Accessibility and Reduced Motion

Flutter exposes:

```dart
MediaQuery.disableAnimationsOf(context)
```

This represents a platform request that animations be disabled or reduced as much as possible.

Decorative full-screen confetti SHOULD honor it.

---

# Recommended Reduced-Motion Behavior

Preferred:

```text
disable confetti entirely
+
retain semantic/static success feedback
```

For example:

```text
success icon
text confirmation
color change
haptic where appropriate and separately reviewed
```

Another acceptable design:

```text
significantly reduced particle count
shorter subtle local effect
```

if product accessibility requirements permit it.

---

# Do Not Rely Only on AnimationController Accessibility Behavior

The package's internal `AnimationController` currently uses Flutter's default:

```text
AnimationBehavior.normal
```

which reduces animation duration when disabled-animation accessibility is active.

That does not necessarily make a high-density particle blast a good reduced-motion experience.

Explicit application suppression is preferable.

---

# Motion Preference Changes During Playback

If reduced motion becomes active while confetti is running, an application MAY stop it immediately:

```dart
controller.stop(
  clearAllParticles: true,
);
```

A simpler architecture is to conditionally remove the confetti widget based on:

```dart
MediaQuery.disableAnimationsOf(context)
```

which also disposes the internal ticker.

---

# App and Route Lifecycle

`ConfettiWidget` creates its internal animation using:

```text
SingleTickerProviderStateMixin
```

Flutter's normal `TickerMode` rules therefore apply.

When the subtree's ticker mode is disabled:

```text
frame callbacks are muted
```

while elapsed time can continue.

Do not add a custom app lifecycle observer solely for every one-second confetti burst.

---

# Route Disposal

When the `ConfettiWidget` leaves the tree, current widget source:

```text
stops the external controller
disposes its internal AnimationController
removes listeners
```

The owner MUST still call:

```dart
controller.dispose()
```

when its own lifetime ends.

---

# Long-Lived Global Loops

A global/root overlay might remain mounted even when no route uses it.

In that architecture, explicit stop ownership matters more because normal route disposal will not clean it up.

Never leave:

```text
shouldLoop == true
```

running merely because the host lives at application scope.

---

# TickerMode

Do not manually simulate Flutter's ticker muting.

If confetti lives in a subtree that Flutter disables through `TickerMode`, its internal ticker is already widget-aware.

Use manual stop only for semantic/lifecycle policy beyond normal ticker muting.

---

# Rebuild Behavior

A normal parent rebuild with the same:

```text
widget type
key
controller identity
particle configuration
```

does not reconstruct the `ParticleSystem`.

Particles continue from their current state.

This means a parent rebuild does not inherently restart confetti.

---

# But Parent Rebuilds Still Cost Something

A rebuild creates another widget/painter configuration and current `ParticlePainter.shouldRepaint` returns true.

Avoid causing large parent-tree rebuilds for unrelated state every frame.

However, particle simulation and painting are generally the larger cost during a dense celebration.

---

# No Side Effects in `build()`

Bad:

```dart
Widget build(BuildContext context) {
  if (isSuccessful) {
    controller.play();
  }

  return const SizedBox();
}
```

Why:

`build()` can execute many times for reasons unrelated to a new success event.

Preferred:

```text
listener / command / event transition
        ↓
controller.play()
```

---

# Performance Rules — HIGH PRIORITY

## 1. Start with finite effects

Use:

```dart
shouldLoop: false
```

unless looping is an explicit requirement.

### Mechanism

Finite effects eventually stop:

```text
ticker
simulation
repainting
rasterization
```

---

## 2. Explicitly choose duration

Avoid accidentally accepting 30 seconds.

### Mechanism

Longer duration gives the emitter more frames in which to create particles.

---

## 3. Reduce `numberOfParticles` first

### Mechanism

Every emitted particle adds:

```text
simulation
matrix/trig work
path transformation
drawPath
potential memory
```

---

## 4. Reduce `emissionFrequency`

### Mechanism

Fewer successful per-frame probability tests create particle batches.

Remember the probability is per frame.

---

## 5. Keep low-frame suppression enabled

### Mechanism

When frame intervals exceed about 16.7 ms, the package can stop adding more particles instead of compounding overload.

---

## 6. Avoid several full-screen emitters

### Mechanism

Each emitter owns an independent:

```text
ticker
particle system
particle pool
painter
```

---

## 7. Prefer simple Paths

### Mechanism

Every active frame transforms and rasterizes every particle path.

---

## 8. Avoid stroke for dense effects

### Mechanism

`strokeWidth > 0` adds a second `drawPath` per active particle.

---

## 9. Avoid extreme upward/low-gravity trajectories

### Mechanism

Current source has no top-bound retirement check, so invisible particles can remain active above the viewport.

---

## 10. Avoid huge particles without reason

### Mechanism

Larger path coverage increases fill/blending/overdraw work.

---

## 11. Avoid heavy visual effects underneath when possible

Examples:

```text
BackdropFilter
large blur
multiple opacity layers
video
complex shader
```

### Mechanism

Confetti adds continuously changing transparent/path content that the rasterizer must composite with the existing scene.

---

## 12. Do not add clipping unless required

### Mechanism

Clipping is additional raster work.

Use it only for a real localized-effect requirement.

---

## 13. Do not add `RepaintBoundary` blindly

The package already uses one.

### Mechanism

Additional boundaries add layers and can consume memory/raster-cache resources.

---

## 14. Do not micro-optimize color lists

Changing:

```text
5 colors -> 3 colors
```

is generally irrelevant compared with halving active particle count.

---

## 15. Profile in profile mode

Debug instrumentation/assertions are not representative of release frame timing.

---

# CPU Cost

Current CPU-side work includes:

```text
per-frame ParticleSystem iteration
drag calculation
force calculation
velocity/position integration
rotation integration
random emission decisions
particle reactivation
trigonometry for particle rotation
Matrix4 construction
Path.transform
```

CPU cost is primarily proportional to:

```text
active/retained particle work
```

not the cost of calling:

```dart
controller.play();
```

---

# Allocation Churn

Current source reduces long-term allocation by reusing particles.

However, per-frame physics/paint code still creates temporary values such as:

```text
Vector2 clones
Vector2.all
Matrix4
transformed Path
```

for active particles.

Reducing active particle count reduces both computation and temporary allocation pressure.

---

# Raster / GPU Cost

The raster side sees:

```text
path fill
optional path stroke
particle overlap
alpha blending
scene compositing
```

A scene can have:

```text
low UI-thread time
high raster-thread time
```

when path drawing/compositing is the bottleneck.

Do not assume every confetti performance issue is Dart simulation.

---

# Overdraw

Typical high-overdraw scenario:

```text
full-screen animated background
+
blur
+
large translucent confetti
+
multiple particle layers
```

Simpler scenario:

```text
static background
+
short localized opaque particles
```

usually requires less raster work.

Use DevTools instead of guessing.

---

# Memory

Particle memory grows to the amount required by the effect's high-watermark load.

While the particle system remains active:

```text
inactive particles can stay allocated
for reuse
```

A looping/high-density effect can therefore retain a much larger pool than a small burst.

When emission stops and particles leave, current system removes/clears them as it finishes.

---

# Battery Efficiency

High battery cost correlates with sustained frame production.

Worst pattern:

```text
application-wide
shouldLoop: true
many particles
high emissionFrequency
full-screen
hours of foreground use
```

Preferred:

```text
meaningful event
short burst
finite duration
ticker becomes idle
```

---

# High Refresh Rate

Version 0.8.0 added delta-time physics to improve behavior above 60 Hz and explicitly targets 120 Hz support.

Still test both:

```text
60 Hz
90 Hz
120 Hz
```

when those devices matter.

Frame budgets are approximately:

```text
60 Hz  -> 16.7 ms
90 Hz  -> 11.1 ms
120 Hz -> 8.3 ms
```

A scene that meets 60 Hz can still miss 120 Hz.

---

# High-Refresh Density Caveat

Physics uses delta time, but emissions are still probabilistic per animation frame.

This means high-refresh displays can receive more emission opportunities per second.

Do not expect visually identical density purely because physics is delta-time-aware.

---

# Low-End Device Strategy

Use a conservative baseline:

```text
finite effect
simple default rectangle or polygon
no stroke
modest particles per emission
modest frequency
low-frame suppression enabled
one emitter
```

Then increase intensity only after representative profiling.

Avoid runtime hardware-score heuristics unless the product has a demonstrated need.

A good broadly performing default is preferable to fragile device classification.

---

# Conceptual Performance Presets

## Lightweight

```text
short duration
few particles per emission
low emission probability
simple path
no stroke
no loop
localized or modest full-screen effect
```

Use for:

- frequent success feedback
- lower-end hardware
- already animated screens

---

## Standard

```text
moderate finite burst
moderate emission
simple path
one emitter
```

Use for:

- meaningful achievements
- purchase completion
- level completion

Profile.

---

## High Intensity

```text
larger particle pool
full-screen
possibly custom shapes
```

Use only for:

- rare high-value celebration
- short period
- validated frame pacing

High intensity is not a permanent configuration tier.

---

# Responsive Design

Test at:

```text
compact phone
large phone
tablet
large desktop/window
Web responsive window
```

Do not assume the same values produce equal perceived density.

On a larger canvas:

```text
particles can stay active longer
```

so visual sparsity and CPU load do not necessarily change in the same direction.

---

# Web

The package is Flutter-rendered on Web.

Do not add:

```text
DOM confetti library
JavaScript bridge
CanvasKit-specific workaround
```

solely because the target is Web.

Use current Flutter Web profiling tools.

Browser scheduling can throttle inactive/background tabs independently of the package.

---

# Desktop

The package is exposed for:

```text
Windows
macOS
Linux
```

through the same Flutter rendering code.

Important desktop considerations are:

```text
large resizable windows
high-refresh monitors
GPU capability
window resize
particle residence time
```

Do not multiply particle count directly by desktop viewport area.

---

# `displayTarget`

This draws the emitter crosshair.

Use for:

```text
development
position debugging
```

Keep:

```dart
displayTarget: false,
```

in normal production visuals.

Its cost is small, but it is not end-user confetti content.

---

# State Management Integration

Framework does not matter.

Correct concept:

```text
Bloc / Riverpod / Provider / Redux / MVVM
                |
                v
detect one-time success transition
                |
                v
UI effect command
                |
                v
ConfettiController.play()
```

Do not expose `ConfettiController` deep into domain/business logic unless the architecture intentionally treats it as presentation infrastructure.

---

# One-Time Effects

Good:

```text
payment processing
    ↓
payment completed event #123
    ↓
celebrate #123 once
```

Bad:

```text
state.paymentCompleted == true
    ↓
every listener/rebuild
    ↓
play again
```

If state can be hydrated/restored, store or derive whether the event has already produced its presentation effect.

---

# Testing

Test application intent rather than particle trajectories.

Recommended tests:

```text
success event triggers controller once
duplicate event does not retrigger
reduced motion suppresses animation
controller is disposed with owner
loop has explicit stop path
route removal stops effect
configuration is valid
```

---

# Randomness and Golden Tests

Current particle generation is random and exposes no public seed.

Random properties include:

```text
direction
velocity
mass
rotation
color when not supplied
size
```

Do not write a golden test expecting exact confetti coordinates.

Prefer golden tests for:

```text
surrounding success UI
static non-confetti design
reduced-motion version
```

---

# `pumpAndSettle()`

Do not use:

```dart
await tester.pumpAndSettle();
```

while:

```dart
shouldLoop: true
```

is active.

Flutter's `pumpAndSettle` waits until frames stop being scheduled; an infinite animation causes timeout.

---

# Widget Test Strategy

Prefer:

```text
pump widget
trigger event
pump a known duration/frame
assert controller/application state
stop/clear effect
pump teardown
```

For looping tests:

```text
start
pump finite interval
assert still active
explicitly stop(clearAllParticles: true)
pump
```

Do not wait for an infinite animation to "settle."

---

# Test Reduced Motion

Build the feature under a `MediaQuery` whose:

```text
disableAnimations == true
```

and verify:

```text
business success still renders
confetti is not played
static confirmation remains
```

Accessibility behavior should be deterministic.

---

# Performance Profiling Workflow

## Step 1 — Build the representative scenario

Use the real:

```text
screen
background
particle settings
custom path
device size
```

Do not benchmark confetti in an empty Scaffold if production runs it over video and blur.

---

## Step 2 — Run profile mode

Use:

```shell
flutter run --profile
```

for mobile/desktop performance analysis.

For Web, use Flutter/Chrome Web performance tooling appropriate to the current renderer/toolchain.

---

## Step 3 — Record baseline without confetti

Measure:

```text
UI frame time
raster frame time
```

during the same underlying interaction.

---

## Step 4 — Enable representative confetti

Record the same sequence.

---

## Step 5 — Determine bottleneck

### UI thread spikes

Investigate:

```text
particle count
simulation
custom path transform complexity
allocation
other Dart work happening simultaneously
parent rebuilds
```

### Raster thread spikes

Investigate:

```text
path count
stroke
particle size
transparency
overdraw
blur/opacity/clipping underneath
multiple emitters
```

---

## Step 6 — Reduce particle load

First test:

```text
lower numberOfParticles
lower emissionFrequency
shorter duration
```

If the issue disappears, optimize visual intensity before adding architectural complexity.

---

## Step 7 — Simplify paths

Replace custom path temporarily with default rectangles.

If frame time improves, custom path complexity matters.

---

## Step 8 — Remove stroke

Set:

```dart
strokeWidth: 0,
```

and compare.

---

## Step 9 — Compare localized/full-screen

Reduce visual area or use one emitter.

Retest.

---

## Step 10 — Validate hardware matrix

At minimum for performance-sensitive production UI:

```text
low-end Android
representative modern Android
iPhone
large-screen/tablet where supported
high-refresh device where relevant
Web/desktop target where shipped
```

---

# Do Not Trust Debug Performance

Flutter debug builds include:

```text
assertions
debug instrumentation
JIT overhead
extra framework checks
```

Animation jank seen only in debug does not prove release will jank.

Likewise, a powerful development machine does not prove a low-end phone will stay within budget.

Use profile/release-like validation.

---

# Debugging Guide

| Symptom | Likely cause | How to verify | Fix |
|---|---|---|---|
| Confetti never appears | Controller never played / widget missing / low-frame suppression under severe load | Inspect controller state and widget tree | Trigger once from event; profile surrounding workload |
| Confetti is sparse under load | `pauseEmissionOnLowFrameRate` is suppressing emission | Compare frame times, temporarily test option | Reduce system workload/particle intensity first |
| Animation runs much longer than expected | Controller default/long duration plus particle tail | Inspect controller duration and state | Set deliberate shorter duration |
| Particles remain after `stop()` | Expected normal stop behavior | Inspect current stop call | Use `clearAllParticles: true` if immediate disappearance required |
| Confetti keeps running forever | `shouldLoop: true` without stop owner | Search loop config and stop calls | Add explicit stop lifecycle |
| Effect replays on rebuild | `play()` called from build/persistent state listener | Instrument trigger calls | Trigger from one-time event/transition |
| Effect becomes denser after double tap | repeated `play()` restarts duration while old particles remain | Log controller event calls | Deduplicate trigger |
| Parent provides new controller but it does nothing | current widget listener remains attached to original instance | Compare identities | Keep controller stable or remount |
| Changed `numberOfParticles` has no effect | ParticleSystem config captured in `initState` | Inspect mounted widget lifecycle | Remount deliberately |
| Changed controller duration has no effect | internal AnimationController captured old duration | Inspect creation time | Recreate/remount |
| Jank grows with particle count | UI simulation + paint/raster scales with particles | DevTools UI/raster chart | Reduce count/frequency |
| UI thread spikes | physics/path transform/allocation or concurrent Dart work | DevTools frame analysis | Reduce active particles, simplify path, remove competing CPU |
| Raster thread spikes | many/complex paths, stroke, overdraw | Raster timing comparison | Simplify shapes, remove stroke, reduce overlap |
| Custom logo particles are slow | too many path segments | Swap to default rectangle | Simplify silhouette |
| Memory remains high during loop | reusable particle pool retains high-watermark particles | Use `ParticleStats` during profiling | Reduce peak density / stop loop |
| CPU persists after celebration | loop still running or duration too long | Check controller state/timeline | Stop effect / shorten duration |
| Huge upward burst uses CPU offscreen | no current upper deactivation boundary | Test lower force/higher gravity | Use reasonable physics |
| Tablet effect too expensive | longer particle residence / too much scaling | Compare ParticleStats on devices | Do not scale count linearly with area |
| Tablet effect looks sparse | fixed visual density | Visual/device test | Small bounded tuning, not area multiplication |
| Widget test hangs | `pumpAndSettle` with looping ticker | Inspect `shouldLoop` | Explicit stop or fixed pumping |
| Golden differs every run | random particles | Repeat test | Do not golden-test random coordinates |
| Controller used after lifecycle end | controller ownership leak | Trace owner/dispose | Dispose with state/provider owner |
| Several screens stop each other's effects | one controller shared across emitters | Inspect controller references | One controller per emitter |
| Reduced-motion user still sees burst | app relies only on AnimationController defaults | Test `disableAnimations` | Explicitly suppress/reduce confetti |
| Performance bad only in debug | debug overhead | run profile | Validate profile/release before changing design |

---

# Anti-Patterns

## Anti-pattern: Controller created in `build()`

### Bad

```text
build
 -> new controller
```

### Why

Unstable identity and lifecycle leaks.

### Preferred

`initState` or an explicit external owner.

---

## Anti-pattern: `play()` from `build()`

### Why

Rebuilds are not one-time events.

### Preferred

Trigger from a one-time application/UI transition.

---

## Anti-pattern: Forget controller disposal

### Why

The external controller is application-owned.

### Preferred

Dispose it with its lifecycle owner.

---

## Anti-pattern: Use default 30-second duration unintentionally

### Why

A small success effect can continue emitting for far longer than intended.

### Preferred

Specify finite event-appropriate duration.

---

## Anti-pattern: Indefinite loop

### Bad

```dart
shouldLoop: true
```

with no stop condition.

### Why

Sustained ticker, simulation, painting, raster, battery use.

### Preferred

Finite celebration or explicit stop ownership.

---

## Anti-pattern: Extreme particle count

### Why

Every particle adds simulation and drawing work.

### Preferred

Use only enough particles for the visual result.

---

## Anti-pattern: High frequency + high particles

### Why

Load multiplies:

```text
more emission events
×
more particles per event
```

### Preferred

Tune them together.

---

## Anti-pattern: Ignore refresh rate

### Why

Emission probability is per frame.

### Preferred

Validate high-refresh density/performance.

---

## Anti-pattern: Disable low-frame emission protection immediately

### Why

It can worsen an already overloaded animation.

### Preferred

Fix workload/intensity first.

---

## Anti-pattern: Many full-screen emitters

### Why

Each creates another complete particle/ticker/painter workload.

### Preferred

One purposeful emitter or localized independent effects.

---

## Anti-pattern: One controller shared everywhere

### Why

Current widget completion/disposal can stop the shared controller.

### Preferred

One controller per independent emitter.

---

## Anti-pattern: Complex SVG-like particle Path

### Why

Path must still be transformed and rasterized every active frame.

### Preferred

Simplified silhouette.

---

## Anti-pattern: Giant particle geometry

### Why

Higher pixel coverage and overdraw without necessarily improving recognition.

### Preferred

Size for actual visual requirement.

---

## Anti-pattern: Add stroke to thousands of particles

### Why

Adds an extra `drawPath` per active particle.

### Preferred

No stroke or low-density deliberate stroke.

---

## Anti-pattern: Confetti above large blur/video without profiling

### Why

Raster composition can become the bottleneck.

### Preferred

Profile entire production scene.

---

## Anti-pattern: Add RepaintBoundary everywhere

### Why

`ConfettiWidget` already contains one; extra layers consume resources.

### Preferred

Only add boundaries where repaint diagnostics justify them.

---

## Anti-pattern: Clip every confetti overlay

### Why

Package doesn't require it, and clipping adds rendering work.

### Preferred

Clip only for deliberate localized effects.

---

## Anti-pattern: Persistent background confetti

### Why

Sustained CPU/GPU/battery plus accessibility concerns.

### Preferred

Event-driven finite animation.

---

## Anti-pattern: Ignore reduced motion

### Why

Full-screen particle movement is purely decorative and can be motion-sensitive.

### Preferred

Suppress or materially reduce.

---

## Anti-pattern: Global celebration architecture for one button

### Why

Adds unnecessary lifecycle and overlay complexity.

### Preferred

Local StatefulWidget/controller.

---

## Anti-pattern: New controller for every celebration

### Why

Unnecessary allocation/lifecycle complexity.

### Preferred

Replay stable lifecycle-owned controller.

---

## Anti-pattern: Change controller instance on ordinary rebuild

### Why

Current 0.8.0 state does not resubscribe with `didUpdateWidget`.

### Preferred

Stable controller identity.

---

## Anti-pattern: Dynamically mutate physics config and expect live update

### Why

ParticleSystem captured values at initialization.

### Preferred

Treat config as immutable/remount deliberately.

---

## Anti-pattern: `pumpAndSettle()` with looping confetti

### Why

Ticker never settles.

### Preferred

Pump fixed frames and explicitly stop.

---

## Anti-pattern: Pixel-perfect golden of random confetti

### Why

No public deterministic random seed.

### Preferred

Test state/intent or static surrounding UI.

---

## Anti-pattern: Optimize color-list length

### Why

Color selection is tiny compared with particle simulation/path drawing.

### Preferred

Tune active particles and path/raster load.

---

## Anti-pattern: Assume `play()` call is expensive

### Why

The sustained work happens on later animation frames.

### Preferred

Profile the particle simulation and paint interval.

---

# Implementation Checklist

1. [ ] Inspect installed `confetti` version.
2. [ ] Decide if confetti is appropriate for the event.
3. [ ] Determine whether effect is local or full-screen.
4. [ ] Create one stable controller per emitter.
5. [ ] Set an explicit duration.
6. [ ] Create controller outside `build()`.
7. [ ] Dispose controller.
8. [ ] Keep `shouldLoop` false unless explicitly required.
9. [ ] If looping, define stop ownership.
10. [ ] Keep low-frame emission protection enabled initially.
11. [ ] Choose conservative particle count.
12. [ ] Choose conservative emission frequency.
13. [ ] Keep custom Paths simple.
14. [ ] Avoid stroke unless needed.
15. [ ] Keep colors non-empty when specified.
16. [ ] Trigger from a one-time event.
17. [ ] Guard duplicate triggers.
18. [ ] Respect reduced motion.
19. [ ] Avoid unnecessarily expensive underlying effects.
20. [ ] Profile representative production screen.
21. [ ] Test lower-end hardware.
22. [ ] Test 90/120 Hz hardware if relevant.
23. [ ] Test tablet/large window.
24. [ ] Test repeated navigation.
25. [ ] Test loop termination.
26. [ ] Confirm CPU returns to idle after animation.

---

# Performance Audit Checklist

## Controllers

- [ ] How many `ConfettiController`s exist?
- [ ] How many emitters are mounted?
- [ ] Are controller identities stable?
- [ ] Are all disposed?
- [ ] Are controllers shared unintentionally?

## Emission

- [ ] What is controller duration?
- [ ] `shouldLoop`?
- [ ] `emissionFrequency`?
- [ ] `numberOfParticles`?
- [ ] `pauseEmissionOnLowFrameRate` still enabled?

## Particle lifetime

- [ ] Blast direction?
- [ ] Blast force?
- [ ] Gravity?
- [ ] Drag?
- [ ] Large upward offscreen trajectories?
- [ ] Canvas size?
- [ ] Large desktop/tablet residence time?

## Painting

- [ ] Default/simple path?
- [ ] Path segment complexity?
- [ ] Stroke enabled?
- [ ] Large particle sizes?
- [ ] Transparent colors?
- [ ] Multiple overlapping emitters?

## Scene

- [ ] Blur underneath?
- [ ] Video?
- [ ] Animated shader/gradient?
- [ ] Opacity layer?
- [ ] Clips?
- [ ] Large parent subtree as `child`?

## Measurements

- [ ] Profile mode?
- [ ] UI frame time?
- [ ] Raster frame time?
- [ ] Baseline without confetti?
- [ ] Representative low-end device?
- [ ] High-refresh device?
- [ ] Large-screen target?
- [ ] Web target?

## Accessibility

- [ ] Reduced-motion behavior?
- [ ] Static success feedback remains?

---

# Code Review Checklist

- [ ] Current 0.8.0 API or installed-version equivalent?
- [ ] Controller created outside `build()`?
- [ ] Controller disposed?
- [ ] Controller identity stable?
- [ ] No `play()` side effect in `build()`?
- [ ] Trigger represents one-time event?
- [ ] Duplicate trigger prevented?
- [ ] Explicit finite duration?
- [ ] Loop actually necessary?
- [ ] Loop has explicit stop?
- [ ] Particle count justified?
- [ ] Emission frequency justified?
- [ ] High-refresh semantics understood?
- [ ] Low-frame protection retained?
- [ ] Custom path simple?
- [ ] No unnecessary stroke?
- [ ] No empty `colors` list?
- [ ] Valid min/max sizes?
- [ ] Physics values valid?
- [ ] No unnecessary extra `RepaintBoundary`?
- [ ] No unnecessary clipping?
- [ ] Expensive background reviewed?
- [ ] One controller per independent emitter?
- [ ] Reduced motion respected?
- [ ] Widget tests avoid infinite `pumpAndSettle`?
- [ ] Performance measured outside debug?

---

# Production Readiness Checklist

- [ ] Controller disposal verified.
- [ ] Repeated route push/pop tested.
- [ ] Repeated success events tested.
- [ ] Double-tap/duplicate event tested.
- [ ] Normal `stop()` tested.
- [ ] Immediate clear tested if used.
- [ ] Loop termination tested.
- [ ] Reduced-motion behavior tested.
- [ ] Low-end Android tested.
- [ ] Representative iOS device tested.
- [ ] Tablet/large-window tested if supported.
- [ ] Web tested if shipped.
- [ ] Desktop tested if shipped.
- [ ] High-refresh target tested where important.
- [ ] Profile/release-like animation reviewed.
- [ ] UI frame time reviewed.
- [ ] Raster frame time reviewed.
- [ ] Custom shape profiled if used.
- [ ] No sustained CPU after animation ends.
- [ ] No unexpected high-watermark particle pool.
- [ ] No persistent decorative loop unless explicitly approved.

---

# Version-Sensitive Areas

Always revalidate after package upgrades.

## Current package baseline

```text
confetti 0.8.0
```

---

## `gravity` default

Current constructor:

```text
0.2
```

Older prose says:

```text
0.1
```

Use current API/source.

---

## `particleDrag`

Current README prose conflicts with current implementation.

Current source calculates drag using:

```text
particleDrag × speed²
```

Revalidate before repeating semantic descriptions in future versions.

---

## Emission semantics

Current:

```text
probability per animation frame
```

If a future release normalizes emission by elapsed time, high-refresh guidance must change.

---

## Delta time

0.8.0 introduced delta-time physics and 120 Hz support.

Revalidate future physics changes.

---

## Low-frame suppression

Current default:

```text
pauseEmissionOnLowFrameRate = true
```

Current threshold behavior is based around:

```text
1 / 60 second
```

Revalidate future adaptive logic.

---

## Controller update behavior

Current widget does not implement a `didUpdateWidget` migration for controller/ParticleSystem configuration.

Revalidate if a future package adds live configuration support.

---

## Particle pooling

Current source reuses inactive particles.

Revalidate memory guidance after implementation changes.

---

## Path callback

Current:

```text
called when a Particle object is newly allocated
not on every frame
```

Revalidate before recommending path caches.

---

## Clipping

Current API has no built-in clipping parameter.

Revalidate if a future version adds one.

---

## RepaintBoundary

Current widget inserts one internally.

Revalidate before saying external boundaries are redundant.

---

## Offscreen retirement

Current source has:

```text
left
right
bottom
```

boundary checks but no top retirement check.

This is an implementation detail and may change.

---

## Randomness

Current public API exposes no seed.

Revalidate before writing deterministic animation tests.

---

## Flutter accessibility

Current recommendation uses:

```dart
MediaQuery.disableAnimationsOf(context)
```

Revalidate against the project's Flutter SDK when upgrading.

---

## Flutter rendering

Rendering backends and performance characteristics evolve.

Do not hardcode obsolete statements about:

```text
old Web HTML renderer
old Skia-only assumptions
```

Use current Flutter profiling tools.

---

# Decision Framework

## Lightweight success feedback

Use:

```text
one emitter
short finite duration
simple particles
modest emission
no stroke
no loop
```

Best for:

```text
frequent interaction
lower-end hardware
screens already doing other animation
```

---

## Standard celebration

Use when:

```text
achievement is meaningful
brief animation has product value
```

Tune:

```text
duration
numberOfParticles
emissionFrequency
```

and profile.

---

## Full-screen celebration

Use when:

```text
event significance justifies it
effect is short-lived
representative hardware holds frame budget
reduced-motion alternative exists
```

---

## Continuous ambient particles

Avoid by default.

Use only if:

```text
continuous motion is an explicit product requirement
battery/performance have been profiled
accessibility implications are accepted and handled
```

---

## Custom branded shapes

Use when:

```text
simple silhouette is visually recognizable
particle count remains moderate
profiling remains healthy
```

Avoid detailed vector artwork.

---

## Global celebration host

Use when many independent routes genuinely need one consistent app-level effect.

Otherwise prefer local ownership.

---

# Profiling Interpretation

If:

```text
UI thread slow
raster thread healthy
```

focus on:

```text
particle simulation
particle count
custom path transforms
Dart allocations
other application CPU work
```

If:

```text
UI healthy
raster slow
```

focus on:

```text
path count
path complexity
stroke
particle size
transparency
overdraw
underlying blur/opacity
```

If both are slow:

```text
reduce particle intensity first
then isolate the remaining bottleneck
```

---

# Official References

## Package

https://pub.dev/packages/confetti

https://pub.dev/packages/confetti/changelog

https://pub.dev/packages/confetti/example

https://pub.dev/documentation/confetti/latest/

https://pub.dev/documentation/confetti/latest/confetti/ConfettiWidget-class.html

https://pub.dev/documentation/confetti/latest/confetti/ConfettiController-class.html

https://pub.dev/documentation/confetti/latest/confetti/ConfettiControllerState.html

---

## Official package source

https://github.com/funwithflutter/flutter_confetti

https://github.com/funwithflutter/flutter_confetti/blob/master/lib/src/confetti.dart

https://github.com/funwithflutter/flutter_confetti/blob/master/lib/src/particle.dart

https://github.com/funwithflutter/flutter_confetti/blob/master/lib/src/particle_stats.dart

https://github.com/funwithflutter/flutter_confetti/blob/master/lib/src/constants.dart

---

## Flutter rendering / animation

https://api.flutter.dev/flutter/rendering/CustomPainter-class.html

https://api.flutter.dev/flutter/widgets/CustomPaint-class.html

https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html

https://api.flutter.dev/flutter/animation/AnimationController-class.html

https://api.flutter.dev/flutter/widgets/TickerMode-class.html

https://api.flutter.dev/flutter/widgets/MediaQuery/disableAnimationsOf.html

https://api.flutter.dev/flutter/widgets/MediaQueryData/disableAnimations.html

https://api.flutter.dev/flutter/animation/AnimationBehavior.html

---

## Flutter performance

https://docs.flutter.dev/tools/devtools/performance

https://docs.flutter.dev/perf/rendering-performance

https://docs.flutter.dev/perf/best-practices

https://docs.flutter.dev/perf/metrics

---

## Flutter testing

https://api.flutter.dev/flutter/flutter_test/WidgetTester/pumpAndSettle.html

https://api.flutter.dev/flutter/flutter_test/WidgetTester/pump.html

---

# Final Rules for AI Coding Agents

Before implementing or changing confetti:

```text
1. Inspect installed confetti version.
2. Identify the exact celebration event.
3. Decide local vs full-screen.
4. Find the controller owner.
5. Ensure controller identity is stable.
6. Ensure disposal exists.
7. Search every play() call.
8. Remove build-time side effects.
9. Check duplicate event semantics.
10. Inspect duration.
11. Inspect shouldLoop.
12. Inspect particle count.
13. Inspect emission frequency.
14. Inspect trajectory/residence time.
15. Inspect custom Path complexity.
16. Inspect stroke.
17. Count simultaneous emitters.
18. Check reduced-motion behavior.
19. Profile representative production UI.
20. Compare UI and raster frame time.
21. Test low-end and high-refresh hardware.
```

The preferred production architecture is:

```text
meaningful application event
        ↓
one-time presentation effect
        ↓
stable lifecycle-owned ConfettiController
        ↓
short finite ConfettiWidget animation
        ↓
particle system drains
        ↓
ticker becomes idle
```

not:

```text
persistent state == success
        ↓
build()
        ↓
play()
        ↓
loop forever
        ↓
more particles
        ↓
more repainting
```

When performance is poor, optimize in this order:

```text
active particle load
        ↓
emission duration/frequency
        ↓
simultaneous emitters
        ↓
custom path complexity
        ↓
stroke / particle coverage
        ↓
scene overdraw
        ↓
advanced rendering changes
```

Do not optimize the `play()` call.

Optimize the frames that follow it.

The best production confetti effect is generally:

```text
brief
purposeful
accessible
finite
simple
measured
```

rather than the largest particle count a flagship development device can render.