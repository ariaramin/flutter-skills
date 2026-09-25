# Project Structure & Modularization

## Start from the existing repository [P]

Before proposing structure, inspect:
- `pubspec.yaml`;
- `lib/`;
- workspace/monorepo configuration;
- internal packages;
- generated-code locations;
- test structure;
- platform folders;
- build flavors/entry points.

Do not rewrite layout to match this document by default.

## Practical default for a medium Flutter app [F/S]

A hybrid structure is often easier to navigate than pure type-first or pure feature-first:

```text
lib/
  app/
    app.dart
    bootstrap.dart
    routing/
  ui/
    core/
      theme/
      widgets/
    feature_a/
      feature_a_screen.dart
      feature_a_view_model.dart
      widgets/
    feature_b/
  domain/
    models/
    use_cases/          # only if earned
  data/
    repositories/
    services/
    models/
  config/
```

This resembles the current Flutter architecture case study: UI organized around features, data objects organized around reusable data responsibilities. [F]

It is not mandatory. If the existing project uses feature-first vertical slices successfully, preserve them.

## Feature-first alternative

```text
lib/
  core/
    networking/
    storage/
    routing/
    design_system/
  features/
    profile/
      presentation/
      domain/           # optional
      data/
    search/
```

Use when teams/features have strong ownership and cross-feature leakage is controlled.

## When to create an internal Dart/Flutter package

Consider a package if one or more are true:
- reusable across multiple apps;
- owned/released independently;
- needs a strict dependency boundary;
- native/plugin capability is isolated;
- build/test isolation materially helps;
- a large team needs enforceable module ownership.

Do not create packages only to produce a visually impressive dependency graph.

## Package dependency rules

Healthy:
```text
app → feature packages → shared capability packages
feature → domain/data contracts it owns
platform plugin implementation → platform interface
```

Avoid:
- cyclic package dependencies;
- feature A importing feature B internals;
- “core” depending on every feature;
- shared package becoming a dumping ground.

## Core/shared rule

Move code to shared/core only when:
- at least two real consumers need it, or;
- it represents an app-wide capability by nature (routing, theme, analytics boundary, networking client, environment config).

Do not preemptively move every model/helper into `core`.

## Design system boundary

A design system may contain:
- tokens/theme;
- typography;
- reusable primitives/components;
- accessibility defaults;
- common motion primitives.

Feature-specific composite UI belongs with the feature until reuse is real.

## Generated code

Keep generated files near the source convention expected by the generator/project.
Never hand-edit generated files.
Do not let generated DTO/state classes determine architecture boundaries.

## Flavors / environments

Prefer explicit environment/configuration injection at bootstrap.
Do not scatter `if (prod)` checks throughout feature code.
Environment-specific entry points can be valid when they keep configuration composition clear.

## Architecture enforcement

For large repositories consider:
- package boundaries;
- import/lint rules;
- dependency tests;
- CI checks;
- code owners.

A folder naming convention alone does not enforce architecture.
