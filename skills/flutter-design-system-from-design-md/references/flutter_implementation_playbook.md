# Flutter design-system implementation playbook

Read this after repository discovery and the user has selected the integration
boundary. It turns a design specification into a reviewable implementation
plan without prescribing a fixed folder tree or inventing visual rules.

## 1. Produce an audit that enables a decision

Before code, summarize the source into four compact sections:

| Section | Include | Escalate when |
| --- | --- | --- |
| Evidence | DESIGN.md sections, assets, fonts, existing components, callers, dependencies, tests | A source is missing or cannot be read. |
| Mapping | primitive scales, semantic roles, component variants/states, responsive and directional rules | A public API or visible behavior has two reasonable meanings. |
| Reuse/migration | Existing foundations to preserve, extend, migrate, or retire | Two systems would otherwise coexist. |
| Risks | contrast, unknown text styles, missing state, raw assets, invalid token relationships | The design cannot be implemented safely from evidence. |

Do not turn every repeated literal into a token. A token needs a stable name,
semantic role, or reuse boundary. A component-local value belongs in the
component until the source establishes that it is shared.

## Existing implementation as the baseline

Treat an existing design system as evidence of the application's preferred
structure and code style. Inspect its public barrel, folder boundaries, token
domains, theme registration, context accessors, component APIs, state
resolvers, test helpers, imports, and lint conventions before choosing names
or creating files.

- Reuse sound naming, file placement, and composition patterns so the new code
  feels native to the repository.
- Extend a coherent token domain instead of introducing a parallel palette or
  duplicate theme extension.
- Preserve public APIs and caller behavior where that is practical; make a
  migration explicit when a design-source conflict requires a break.
- Correct proven defects such as incomplete theme registration, non-interpolated
  theme values, raw shared design literals, or duplicated primitives at their
  shared root—not with one-off caller workarounds.
- Do not copy existing code mechanically. The design source and correctness
  requirements win when an existing convention is inconsistent, inaccessible,
  or materially inefficient.

## 2. Choose a boundary and dependency direction

### Project-local (`lib/design_system`)

Keep public APIs beneath one public barrel such as
`lib/design_system/design_system.dart`. Organize only the folders that carry
real code: for example `theme`, `foundations`, `primitives`, `components`, and
`internal`. Application feature code may consume the barrel; design-system
code must not import feature/UI modules.

### Isolated local package

Create a normal Flutter package with `lib/<package_name>.dart` as its small
public surface. Use package-relative imports internally. Do not import the
host application's package, `lib/` files, dependency-injection container, or
feature state from the package. Put host theme installation, font declarations,
and app-specific assets at the integration seam when necessary.

For either option, preserve a one-way direction:

```text
foundations -> semantic theme -> primitives -> components -> patterns
```

Patterns may compose components; components may not depend on patterns or
feature screens. Do not create folders merely to draw this diagram.

## 3. Model the theme in layers

### Primitive values

Use primitive values only for direct source values: palettes, spacing scales,
font metadata, radii, durations, curves, elevation/shadow recipes, and
breakpoints. Keep their names factual, for example `teal500` or `space16`.

### Semantic values

Map primitives to intent per theme: `surfaceCanvas`, `surfaceRaised`,
`contentPrimary`, `contentSecondary`, `borderSubtle`, `borderFocused`,
`actionPrimary`, and status roles. This is what components consume. Do not
force a semantic role when the document only identifies a chart palette or an
illustration color; expose that primitive deliberately instead.

### Component values

Introduce a component token only if a value is shared by several variants or
states and is meaningful outside one build method. For example, a button
state resolver can own foreground, background, border, and elevation for each
button state. Avoid a global `ButtonTheme` object with unrelated input/menu
values.

### `ThemeExtension` checklist

For each domain extension:

- Make it immutable, typed, and complete for each supported theme.
- Implement `copyWith` for every field.
- Interpolate `Color`, `double`, `TextStyle`, `Radius`, and shadow lists with
  their Flutter interpolation helpers. Treat enums, booleans, icon data, and
  structural values as discrete: select a side consistently, usually at
  `t < 0.5` versus `t >= 0.5`.
- Register it in the host `ThemeData.extensions` for every theme the app
  exposes. A context accessor should throw a helpful state error when a
  required extension is absent rather than silently manufacturing a default.
- Keep accessors cheap. `context.dsColors` and `context.dsTypography` are
  clear; an aggregate `context.ds` must not construct a large intermediate
  object on every read.

## 4. Build custom controls without Material/Cupertino visuals

Use the lowest-level Flutter facility that supplies the behavior needed, then
own the visuals.

| Need | Suitable building blocks | Avoid |
| --- | --- | --- |
| Pressable control | `FocusableActionDetector`, `Semantics`, `GestureDetector` or `Listener`, `DecoratedBox` | Styling a Material button or relying on ink visuals. |
| Toggle/selection | Explicit state resolver, `Semantics(toggled/selected:)`, focus and keyboard actions | `Switch`, `Checkbox`, `Radio`, or boolean-flag APIs that allow invalid combinations. |
| Text input | `EditableText`, `FocusNode`, `TextEditingController`, custom label/error/container | `TextField`/`InputDecorator` as the design-system visual base. |
| Menu, dialog, sheet, toast | `Navigator`, `Overlay`, custom routes/entries, focus restoration, barriers | `ScaffoldMessenger`, Material snackbars, or Material modal helpers. |
| Progress/indicator | A sized custom painter or simple decorated widgets | A controller when an implicit animation is sufficient. |

Every interactive component should decide its state from one centralized
resolver. The resolver receives at least enabled, focus, hover, pressed, and
selection/loading state when relevant, and returns the visual configuration.
This prevents different subtrees from disagreeing about a state.

For controls with keyboard behavior, add semantic actions and shortcuts that
match their role. Maintain at least a 48 logical-pixel target unless the
design and platform accessibility guidance establish another requirement.
Use `EdgeInsetsDirectional`, `AlignmentDirectional`, and directional icon
handling for RTL rather than hard-coded left/right layout.

## 5. Responsive, typography, assets, and motion

- Use `LayoutBuilder` only when a component depends on its parent constraint.
  Use `MediaQuery` for viewport size, text scaler, platform accessibility, or
  display features. Do not scatter device-name checks.
- Treat text scaling as normal input. Verify controls at the system text scale
  the project supports; prefer wrapping, truncation only where the design
  permits it, and meaningful minimum/maximum constraints.
- Verify font family names and weights against `pubspec.yaml` before creating
  typography. Create named semantic styles; do not multiply near-identical
  `TextStyle.copyWith` expressions across components.
- Reuse declared image/SVG/icon assets. Give icons semantic labels where they
  convey meaning, and avoid rebundling the same source in multiple components.
- Centralize design-defined durations and curves. Use implicit animations for
  simple property transitions. Use a controller only for continuous or
  interruptible animation, and dispose every owned controller/listener.
- Honor reduced-motion settings when the platform exposes them. When a design
  does not specify this behavior, prefer shortening or removing ornamental
  motion rather than disabling functional feedback.

## 6. Performance review with concrete questions

Do not add performance widgets by default. Answer these questions per changed
component:

1. What state can change, and what is the smallest subtree that must rebuild?
2. Does `build` allocate, parse, sort, fetch, or measure more than needed?
3. Does the visual need a clip, opacity layer, blur, large shadow, or custom
   paint? If yes, is its paint area bounded?
4. If a `RepaintBoundary` is present, what independent repaint does it isolate?
   Remove it when there is no answer.
5. If a `CustomPainter` is used, are its inputs immutable and is
   `shouldRepaint` exact?
6. In a scrolling context, does the component use lazy construction and avoid
   animation/controller creation for offscreen items?

Use `const` for static subtrees, avoid `IntrinsicHeight`/`IntrinsicWidth` in
hot layouts, do not run synchronous expensive work on the UI isolate, and
profile before describing an optimization as a win. No code path can promise
zero jank across assets, devices, and application workloads.

## 7. Validate the implementation that changed

Run the narrowest relevant project commands first, normally formatter, static
analysis, and focused unit/widget tests. Expand only when the project provides
a relevant established workflow.

| Change | Minimum meaningful coverage |
| --- | --- |
| Token extension | Defaults, `copyWith`, `lerp`, all themes registered. |
| Interactive control | Enabled/disabled, pointer, focus/keyboard, semantics, state transition. |
| Text or layout component | Text scaling, RTL, tight constraints/overflow, responsive branch. |
| Overlay component | Barrier/dismiss policy, focus handling/restoration, semantics. |
| Painter/animation | Correct repaint decision and controller disposal; profile if performance is claimed. |

Use golden tests only when the repository already has a deterministic golden
workflow and the visual comparison adds more value than semantic/widget tests.
Do not suppress lint failures simply to produce a green run. Report every
command actually run and any limitation, such as unavailable emulators or
missing test infrastructure.

## 8. Completion report

Report only evidence-backed facts:

1. chosen integration boundary and public API;
2. mapping from source to primitives, semantic tokens, components, and themes;
3. components created/refactored and compatibility/migration impact;
4. concrete accessibility and performance decisions;
5. validation commands and results;
6. material assumptions or unresolved choices.

Do not call an implementation pixel-perfect, fully accessible, or jank-free
unless those claims were separately measured against an agreed target.
