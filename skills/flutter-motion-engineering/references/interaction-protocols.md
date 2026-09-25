# Interaction protocols

Read when a component can be dragged, interrupted, reversed, resized, or dismissed. The protocols below are engineering recommendations derived from the cited framework contracts, not native-platform guarantees.

## Establish ownership before implementation

Record four separate values:

| Value | Owner | Meaning |
|---|---|---|
| Semantic state | Existing feature/router state | Which destination or component state is valid. |
| Visual target | Presentation coordinator | Where current motion should settle. |
| Current visual position | Local controller | What is currently drawn; may temporarily overshoot. |
| Active interaction identity | Local interaction lifecycle | Which drag or settling operation may produce a later visual side effect. |

Do not persist visual progress on every tick. Do not infer dismissal from `AnimationStatus.forward`, a numeric bound, or a generic completed callback. State commitment timing is a product decision: acceptance of a command may occur before presentation finishes, while a reversible gesture may remain provisional until accepted. Keep that decision explicit and independent from incidental animation status. Cancellation must not leave a transaction half-complete.

## Transition protocol

| Event | Required behavior | Failure to prevent |
|---|---|---|
| Pointer down | Preserve platform press feedback; respect recognizer ownership | Stealing a nested scroll before the gesture arena resolves. |
| Drag wins | Capture visible origin, stop existing settling without reset | Jumping to the prior target or zero. |
| Drag update | Convert signed delta to the chosen coordinate system | Repeated easing that trails the finger. |
| Release | Select a valid target from signed velocity and displacement; start settling | Treating horizontal speed as vertical intent or dismissing every release. |
| Gesture cancellation | Return to an accepted valid state without committing a new dismissal | Treating cancellation as a fling. |
| Retarget during settling | Capture position and velocity, then replace simulation | Reading velocity after `stop()` has zeroed it. |
| Re-grab | Invalidate obsolete completion work and transfer control to input | A previous animation callback changing the new interaction. |
| Reduced motion enabled | Preserve direct manipulation; settle or simplify automatic motion | Snapping an object away from an actively controlling finger. |
| Widget disposed | Dispose owned resources; prevent stale visual side effects | Leaked ticker or access to a dead context. |

`AnimationController.animateWith` cancels the previous ticker future and clamps simulation values on bounded controllers. Its forward status does not identify whether the value is increasing. Read current velocity before stopping. Sources: [animateWith](https://api.flutter.dev/flutter/animation/AnimationController/animateWith.html), [velocity](https://api.flutter.dev/flutter/animation/AnimationController/velocity.html), [gesture recognition](https://docs.flutter.dev/ui/interactivity/gestures).

## Units, geometry, and target selection

Choose pixels or progress deliberately. For `x = origin + p * signedTravel`, convert velocity as `v_p = v_x / signedTravel`. The travel magnitude must be positive and finite; the signed travel encodes axis direction. A negative signed travel is valid, zero is not. Guard division overflow as well as invalid inputs.

Use the actual distance between endpoints, not automatically screen height. Keyboard insets, safe areas, split view, and sheet detents can change that distance. Do not normalize vertical velocity with horizontal size or use vector magnitude for one-dimensional motion.

When geometry changes during motion:

1. Capture current physical position and velocity in the old geometry.
2. Recompute endpoints from new constraints.
3. Map physical position and velocity into the new coordinate system, or apply an explicitly chosen semantic preservation policy.
4. Replace the simulation from the mapped state; avoid silently reusing progress if it would visibly teleport.
5. Test rotation, keyboard appearance, resizing, and content insertion while moving.

For a fling policy, first determine whether signed velocity is strong enough to override position. Otherwise use the component's displacement threshold. Derive thresholds from existing interaction tokens and test at realistic travel lengths. Do not publish a universal Apple velocity threshold. For several detents, select a valid adjacent or projected destination according to the product's explicit policy; do not invent a new detent algorithm for a two-state component.

## Continuity and constrained properties

An unbounded controller is suitable for physical displacement that may overshoot. Derived opacity remains bounded: if progress 0 is visible and 1 dismissed, use inverse clamped progress for opacity, not raw progress. Scale, clipping, and hit-test domains need their own constraints.

Do not force all properties to overshoot because the position uses a spring. Opacity overshoot has no useful physical interpretation. Nor should you clamp the physical trajectory merely to satisfy opacity assertions. Test the position and derived property independently.

For numerical tests, use tolerances appropriate to units and simulation precision. A subpixel floating-point difference is not a visual discontinuity; exact equality of spring intermediate values is unnecessarily brittle. Exact final-state checks are appropriate when the implementation explicitly snaps to an endpoint.

## Nested scrolling and sheets

Start with existing sheet and scroll coordination. If the design permits a dedicated drag handle, it creates a clear input boundary. If dragging content must also move the sheet, explicitly coordinate the sheet's progress with scroll position and boundary conditions; two independent recognizers do not become coordinated by changing hit-test behavior.

Exercise dragging in both directions with content at the start, middle, and end. Verify cancellation and a second pointer. Preserve wheel, trackpad, keyboard, and accessibility dismissal. Do not impose touch-only behavior on desktop or web.

## Navigation and shared-element acceptance

Keep route identity in the existing router, including nested stacks, browser URLs, restoration and results. A custom visual transition does not authorize a second route model. Use the existing route's primary and secondary animations when the relationship requires them; do not create another clock that drifts from interactive navigation.

For a Hero, inspect source/destination tags, first-frame presence, aspect ratio, image readiness, inherited theme differences, overlay coordinates, and user-gesture flight configuration. Test push, pop, canceled back, redirected flight, and reduced motion. Large rotated heroes conflict with axis-aligned flight assumptions. Sources: [Hero](https://api.flutter.dev/flutter/widgets/Hero-class.html), [CupertinoPageRoute](https://api.flutter.dev/flutter/cupertino/CupertinoPageRoute-class.html).

## Motion token contract

Reuse the host design system. Each repeated token should define purpose, units, normal behavior, reduced-motion alternative, and platform scope. Useful categories are press feedback, content replacement, navigation, and surface settling. Do not create a universal duration table without interaction requirements.

Use duration/curve for deterministic presentation timing, and springs for momentum-sensitive settling. Accept distinct component springs when geometry or interaction differs. Prefer shared descriptions over shared controllers: components may share tuning without sharing lifecycle or user intent.

Apple's spring guidance motivates continuity and perceptual tuning; it does not certify Flutter output or justify forcing bounce everywhere. Sources: [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Apple springs](https://developer.apple.com/videos/play/wwdc2023/10158/), [SpringDescription](https://api.flutter.dev/flutter/physics/SpringDescription-class.html).
