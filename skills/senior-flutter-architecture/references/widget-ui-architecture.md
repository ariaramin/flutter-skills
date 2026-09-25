# Widget & UI Architecture

## View responsibility [F]

Views are compositions of widgets that:
- render state;
- accept/forward user input;
- contain view-specific layout/animation decisions;
- perform simple routing wiring.

Avoid business/data logic in widgets.

## `BuildContext`

Treat `BuildContext` as UI-tree capability.

Appropriate:
- theme/media/localization;
- navigator/router access;
- inherited dependencies at UI composition boundaries;
- showing UI surfaces.

Avoid passing it into:
- repositories;
- services;
- domain/use-case logic;
- long-lived async objects.

If non-UI code needs something obtained from context, resolve the dependency/value in the UI/composition layer and pass the typed value.

## Widget extraction

Extract when it improves:
- reuse;
- semantic ownership;
- rebuild isolation;
- readability;
- testing;
- lifecycle ownership.

Do not extract only because a build method crossed an arbitrary line count.

## Stateless vs stateful

`StatelessWidget` does not mean “no changing UI”; it means the widget itself does not own mutable `State`.

Use `StatefulWidget` when the view owns lifecycle-bound mutable resources or local state such as:
- controllers;
- animations;
- focus nodes;
- local interaction state.

External state management does not eliminate legitimate `StatefulWidget` usage.

## Controllers and lifecycle

Create/dispose at the correct owner:
- `TextEditingController`
- `AnimationController`
- `ScrollController`
- `FocusNode`
- stream subscriptions
- timers

Do not instantiate disposable controllers inside `build()`.

## Rebuild design [F]

- keep `build()` cheap;
- localize state changes;
- split large subtrees around change frequency/semantic boundaries;
- use `const` when valid;
- observe/select the narrow state slice needed by a subtree where the state package supports it.

Do not optimize rebuilds blindly; measure when complexity rises.

## Lists

For large/dynamic collections:
- use lazy builders/slivers;
- use stable identity;
- paginate data separately from rendering;
- avoid decoding/transforming large datasets repeatedly in item builders;
- prefetch when access patterns justify it.

## Images

Consider:
- requested decode dimensions;
- cache behavior;
- placeholders;
- memory pressure;
- network data;
- prefetch only when useful.

A 4K source rendered as a tiny thumbnail can still impose decode/memory cost.

## Forms

Define where form state lives:
- view-local for temporary fields;
- feature owner for multi-step flows, validation against repositories, or persistence;
- durable draft persistence when product requires recovery.

Separate:
- presentation validation (format/required);
- business validation;
- server validation.

## Accessibility

Treat semantics, focus order, touch targets, contrast, text scaling, and screen-reader labels as acceptance criteria, not polish.

Reusable components should encode accessibility defaults where possible.

## Localization/RTL

Do not concatenate user-facing strings from fragments that break translation.
Use localization resources.
Test layout with long strings and RTL where supported.
Avoid direction-specific padding/alignment when logical `start/end` variants are appropriate.

## Animations

Keep view animations in UI unless they encode business process state.
Do not let animations trigger data mutations through incidental lifecycle callbacks.
Profile complex effects on representative devices.

## Keys

Use keys when identity matters:
- reordering;
- preserving state across moves;
- testing;
- route/page identity.

Do not sprinkle `GlobalKey`s as a general state-access mechanism.

## UI review smells

- giant screen class;
- business logic in callbacks;
- `FutureBuilder`/`StreamBuilder` chains that accidentally own app data policy;
- nested builders observing broad global state;
- context passed down to business objects;
- mutable model objects changed directly by widgets;
- platform channel calls from view code;
- expensive JSON/image/computation in `build()`.
