---
name: flutter-design-system-from-design-md
description: >
  Convert one or more DESIGN.md specifications into a production-ready custom
  Flutter design system. Use whenever a user asks to implement, generate,
  refactor, migrate, or audit Flutter UI foundations, design tokens, themes,
  or reusable components from DESIGN.md, Figma-exported design notes, or an
  existing design-system folder. Inspect the repository first and ask whether
  to implement under lib/design_system or as a local package before writing
  design-system code. Do not use for a one-off feature screen that does not
  create or change a reusable design system.
---

# Flutter design system from DESIGN.md

Build the smallest complete design-system implementation that faithfully maps
the design source and fits the host Flutter application. A design document is
the source of visual intent, not a request to turn every number into a public
constant or every described screen into a component.

## Required decision point

Do not write or move design-system code until repository discovery is complete
and this choice is known. If the user has not already answered it, ask exactly:

> How should the Flutter design system be integrated?
>
> A. Implement it directly in `lib/design_system/`.
>
> B. Create an isolated local Flutter package and import it from the app.

Do not silently select an option. For A, keep implementation inside
`lib/design_system/` except for the smallest necessary app-theme or package
configuration changes. For B, create a local package with a narrow public
barrel export and private implementation details; do not use app-specific
imports inside that package.

## Discovery before implementation

1. Locate the repository root, every relevant `DESIGN.md`, asset, font,
   `pubspec.yaml`, lint configuration, existing design-system directory, and
   tests. Read the source documents rather than relying on a file name.
2. Trace the existing theme setup, token access API, public exports, component
   callers, input/overlay/navigation helpers, and dependencies. Reuse a
   coherent existing foundation. When it is contradictory or duplicated,
   refactor or migrate it deliberately; never add a competing token/theme
   layer.
3. Extract a compact mapping before coding: primitive values, semantic roles,
   repeated component patterns and states, responsive rules, text direction,
   accessibility requirements, and open ambiguities. Report material
   contradictions before implementation. Resolve minor visual gaps
   conservatively and state the assumption.
4. Read the [implementation playbook](references/flutter_implementation_playbook.md)
   after the integration choice when designing foundations, custom controls,
   overlays, or the validation plan.

## Architecture

Represent design intent as a one-way hierarchy when the source supports it:

```text
primitive values -> semantic tokens -> optional component tokens -> components
```

- Keep primitive palettes/scales private or clearly labelled when consumers
  genuinely need them. Components should normally consume semantic roles such
  as `contentPrimary`, `surfaceRaised`, `borderSubtle`, or `actionPrimary`, not
  `blue500` or arbitrary pixel values.
- Group theme values by stable semantic ownership: for example colors,
  typography, spacing/sizing, shape/borders, effects/motion, and breakpoints.
  Use `ThemeExtension<T>` for custom theme values that participate in a
  `ThemeData`; give each extension complete, immutable `copyWith` and `lerp`
  implementations. Do not make a single catch-all extension or split every
  scalar into its own extension.
- Register every extension used by components in every supported theme.
  Do not hide a missing registration with a production fallback factory: that
  makes a broken theme look valid. Tests may provide explicit test themes.
- Expose a small, typed context access API after the extensions exist. A
  facade is acceptable only when it remains a read-only view of the registered
  extensions and does not become a second source of truth or allocate a large
  object for every lookup.
- Create component-specific tokens only for values shared by several variants
  or states. Keep a value local when it belongs to exactly one component.
- Derive breakpoints and layout rules from the specification. Put repeated
  rules in one responsive utility; use `LayoutBuilder` for parent constraints,
  and use `MediaQuery` only for viewport, text scaling, or device properties.

## Custom component rules

Build design-system controls from Flutter framework primitives, not pre-styled
Material or Cupertino visual widgets. Do not use `ElevatedButton`,
`FilledButton`, `OutlinedButton`, `TextButton`, `IconButton`, `Card`,
`ListTile`, `AppBar`, `Scaffold`, `Switch`, `Checkbox`, `Radio`, `Slider`,
`SnackBar`, `DropdownButton`, `TextField`, form-field helpers, or Cupertino
counterparts as their implementation base.

`ThemeData` and `ThemeExtension` may be used solely as the Flutter theme host;
that is not permission to inherit Material visuals. Prefer narrow Flutter
imports (`widgets.dart`, `rendering.dart`, `painting.dart`, `services.dart`)
where they suffice. Use framework services such as `Navigator`, `Overlay`, or
`EditableText` when a custom implementation needs their behavior, and keep the
visual layer custom.

- Model real variants and states with enums or immutable typed data. Do not
  create boolean-flag combinations that permit invalid state.
- Use composition and small focused widgets. Public components expose intent,
  not containers, colors, or internal implementation plumbing.
- Interactive controls preserve keyboard, pointer, focus, hover, disabled,
  selected, loading, error, and read-only behavior where applicable. Use
  `Semantics`, visible focus indication, `Focus`/`FocusableActionDetector`,
  and directional APIs; `GestureDetector` alone is not a complete custom
  control.
- Respect text scaling, RTL/LTR direction, minimum touch targets, contrast,
  overflow behavior, and reduced-motion/platform accessibility settings when
  the platform or specification exposes them.
- Build application shells, dialogs, sheets, menus, and notifications from
  custom layers or low-level routes/overlays. Do not route their visuals
  through Material `ScaffoldMessenger`, `SnackBar`, or modal helpers.

## Performance discipline

Aim for smooth interaction; do not claim "zero jank" or equivalent without
profiling the real app on representative devices.

- Use `const` widgets and immutable token values where possible. Keep changing
  state below static subtrees and localize animations with an
  `AnimatedBuilder`/`ListenableBuilder` or an appropriate implicit animation.
- Do not perform I/O, parsing, sorting, intrinsic measurement, or expensive
  object construction in `build`. Use lazy builders for large collections.
- Avoid clipping, opacity layers, blur, shadows, repaint boundaries, and
  custom painting unless their visual need justifies their render cost.
  `BackdropFilter` and `saveLayer`-prone effects need a concrete reason and a
  bounded paint area. Add `RepaintBoundary` only around a measured or clearly
  isolated repaint hotspot.
- Custom painters must own immutable inputs and return an accurate
  `shouldRepaint`. Dispose controllers, focus nodes, and listeners. Reuse a
  shared primitive rather than duplicating equivalent spinners or animations.

## Implementation order

After the user selects the integration boundary:

1. Establish or refactor foundations and theme registration first.
2. Add the smallest reusable primitives needed by multiple components.
3. Implement components in dependency order, including only states specified
   or required for accessible interaction.
4. Update the public barrel so it exports intentional public APIs only. Keep
   internal files and token plumbing private where package boundaries permit.
5. Migrate existing callers only when requested or necessary to prevent two
   competing systems. Preserve behavior outside the agreed scope.

## Verification and completion

Run the narrowest relevant checks: formatter, analyzer, and focused token or
widget tests. Add tests for non-trivial token interpolation, interactive
states, semantics/keyboard behavior, and responsive or RTL/text-scaling rules
when those behaviors were added. Use goldens only if the repository already
has a stable golden workflow.

Before finishing, inspect the diff for hard-coded design values that should be
tokens, missing extension registration, duplicated components, Material or
Cupertino visual-widget leakage, leaked resources, and unintentional rebuild
or paint work.

Report the integration choice, the mapping from design source to foundations
and components, checks run and their outcomes, and only material assumptions
or unresolved design questions.
