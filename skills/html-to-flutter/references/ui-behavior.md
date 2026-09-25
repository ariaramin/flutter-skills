# JavaScript behavior, components, forms, navigation, assets, animation, scrolling, and tables

This reference preserves detailed guidance from the supplied HTML/CSS/JavaScript → Flutter research. Read the relevant section when the main skill directs you here.

## Contents

- JavaScript → Dart Conversion
  - Variables and types
  - Promises
  - Async operations
  - Streams
  - Timers
  - Modules
  - Classes and models
  - Derived state
- DOM Manipulation → Declarative State
  - Anti-pattern
  - Flutter model
  - Conceptual mappings
  - Do not store mutable widgets as data
  - Avoid GlobalKey as state architecture
- JavaScript Events → Flutter Input System
  - Prefer semantic controls
  - `GestureDetector` vs `Listener`
  - Hover
  - Focus lifecycle
- Component Conversion
  - Choose widget boundaries by responsibility
  - Stateless vs stateful
  - Composition
- Forms
  - Conversion rules
  - Form ownership
  - Autofill
  - Validation
  - Focus and keyboard
- Navigation Conversion
  - Simple applications
  - Complex routing
  - Flutter Web
  - URL strategy
  - Tabs
- Asset Conversion
  - Raster images
  - Image memory
  - Network images
  - SVG/vector assets
  - CSS sprites
  - Fonts
  - CSS background images
- Animation Conversion
  - Use implicit animations when
  - Use explicit animations when
  - Hero animation
  - Scroll animation
  - CustomPainter
  - Animation performance
- Scrolling and Large Collections
  - Page scrolling
  - Large lists
  - Large grids
  - Nested scrolling
  - Sticky headers
  - Infinite loading
  - Scroll restoration
- Tables and Data-Dense Interfaces
  - Small tables
  - Large tables
  - Responsive data
  - Sorting/filtering

## JavaScript → Dart Conversion

Translate behavior at the architectural level.

### Variables and types

JavaScript:

```
let user = null;
const items = [];

```

Dart:

```
User? user;
final List<Item> items = <Item>[];

```

Use sound null safety and explicit models. Dart types are non-nullable by default unless marked nullable.

### Promises

JavaScript:

```
const user = await fetchUser();

```

Dart:

```
final user = await repository.fetchUser();

```

A Dart `Future<T>` represents a later value or error; `Stream<T>` represents a sequence of asynchronous events.

### Async operations

Use:

```
Future<User> loadUser() async {
  try {
    return await repository.fetchUser();
  } on AuthenticationException {
    rethrow;
  } catch (error, stackTrace) {
    Error.throwWithStackTrace(
      UserLoadingException(error),
      stackTrace,
    );
  }
}

```

Do not translate Promise chains mechanically if `async`/`await` produces clearer Dart.

### Streams

Use `Stream` when the source represents ongoing values:

- WebSocket events;
- database observations;
- continuous platform events;
- event subscriptions that have meaningful lifetime.

Do not use `Stream` for every single request.

### Timers

Use `Timer` for delayed or periodic Dart behavior and dispose/cancel timers owned by widget state when appropriate.

For animations, use Flutter animation APIs instead of timers that manually repaint coordinates.

### Modules

JavaScript modules should usually become Dart libraries/files organized by responsibility:

```
features/
  account/
    account_page.dart
    account_view_model.dart
    account_repository.dart
    account_service.dart
    account_models.dart

```

Do not recreate source module boundaries when those boundaries existed only because of the web framework.

### Classes and models

Prefer typed immutable models where practical.

```
class Account {
  const Account({
    required this.id,
    required this.name,
    required this.plan,
  });

  final String id;
  final String name;
  final Plan plan;
}

```

### Derived state

JavaScript:

```
const visible = items.filter(matchesSearch);

```

If `visible` is derived entirely from `items` and `query`, do not necessarily store a second mutable Flutter field. Compute or memoize it at the appropriate architecture layer.

---

## DOM Manipulation → Declarative State

### Anti-pattern

Source JavaScript:

```
const panel = document.querySelector('#panel');

button.addEventListener('click', () => {
  panel.classList.toggle('open');
  panel.innerHTML = expandedHtml;
});

```

Do **not** convert to an imperative "find widget then mutate widget" model.

### Flutter model

```
import 'package:flutter/material.dart';

class ExpandablePanel extends StatefulWidget {
  const ExpandablePanel({super.key});

  @override
  State<ExpandablePanel> createState() => _ExpandablePanelState();
}

class _ExpandablePanelState extends State<ExpandablePanel> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextButton(
          onPressed: () {
            setState(() {
              _expanded = !_expanded;
            });
          },
          child: Text(_expanded ? 'Collapse' : 'Expand'),
        ),
        if (_expanded)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text('Expanded content'),
          ),
      ],
    );
  }
}

```

The state changes; the UI description follows.

### Conceptual mappings

```
querySelector()             → usually disappears
innerHTML = ...             → state selects/composes widgets
element.style.foo = ...     → widget/style derived from state
classList.add/remove        → state/enum/WidgetState changes
appendChild()               → add data item to state collection
removeChild()               → remove data item from state collection
hidden = true               → conditional composition
disabled = true             → pass null callback/control state
dataset attributes          → typed model fields
DOM as source of truth      → explicit Dart state/model

```

### Do not store mutable widgets as data

Bad:

```
List<Widget> visibleRows = [];

```

when the actual state is a list of records.

Prefer:

```
List<RowModel> visibleRows = [];

```

and map models to widgets during composition.

### Avoid GlobalKey as state architecture

`GlobalKey` is useful for specific identity/context/state access requirements, but global-key reparenting has non-trivial framework cost, and keys should not be recreated every build. It is not a replacement for explicit data flow.

---

## JavaScript Events → Flutter Input System

| Browser eventFlutter choice |                                                                        |
| --------------------------- | ---------------------------------------------------------------------- |
| `click`                     | semantic control callback, `GestureDetector.onTap`, `InkWell.onTap`    |
| `dblclick`                  | `onDoubleTap`                                                          |
| `mousedown`/`mouseup`       | `Listener`, gestures, button state                                     |
| pointer movement            | `Listener` / pointer APIs                                              |
| `mouseover`/`mouseenter`    | `MouseRegion`, `FocusableActionDetector`                               |
| touch gestures              | gesture recognizers / `GestureDetector`                                |
| wheel/scroll                | scrollables, `ScrollController`, pointer signal only for special cases |
| keyboard                    | Focus/keyboard APIs, `Shortcuts`/`Actions`                             |
| focus/blur                  | `Focus`, `FocusNode`                                                   |
| form `input`/`change`       | field callbacks/controllers/form state                                 |
| drag/drop                   | `Draggable`, `DragTarget`, lower-level gestures when required          |

### Prefer semantic controls

Instead of:

```
GestureDetector(
  onTap: submit,
  child: Container(
    color: Colors.blue,
    child: const Text('Submit'),
  ),
)

```

prefer:

```
FilledButton(
  onPressed: submit,
  child: const Text('Submit'),
)

```

The framework control already has established interaction, focus, keyboard, disabled-state, and semantics behavior.

### `GestureDetector` vs `Listener`

Use:

- `GestureDetector` for recognized gestures such as taps, pans, long press;
- `Listener` when raw pointer events are actually required;
- `InkWell` when Material ink response is part of a Material surface;
- framework controls whenever the source represents a standard control.

### Hover

Hover is an enhancement, not the only route to functionality.

Any hover-only CSS behavior must have a touch and keyboard-accessible equivalent.

### Focus lifecycle

A `FocusNode` is long-lived state. Create it outside `build()` and dispose it when its owning state is disposed.

---

## Component Conversion

### Choose widget boundaries by responsibility

A good widget boundary commonly represents:

- a reusable product component;
- a local state owner;
- a visual unit with a stable API;
- an independently testable interaction;
- an optimization boundary where immutable input can isolate rebuilding.

Do not mirror every source React/Vue/Web Component automatically either. Inspect whether its original boundary remains meaningful in Flutter.

### Stateless vs stateful

Use `StatelessWidget` when output depends only on:

- constructor inputs;
- inherited dependencies;
- immutable ambient configuration.

Use `StatefulWidget` when the widget owns lifecycle-bound mutable resources/state, for example:

- animation controller;
- text controller;
- focus node;
- local expanded/collapsed state;
- subscription.

Application state can still be provided from outside to a stateless view.

### Composition

Prefer:

```
class ProfileCard extends StatelessWidget {
  const ProfileCard({
    required this.profile,
    required this.onOpen,
    super.key,
  });

  final Profile profile;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 12,
          children: [
            Text(
              profile.name,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(profile.role),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: onOpen,
                child: const Text('Open profile'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

```

over a generic `buildContainer()` helper for a substantial reusable UI section. Flutter's performance guidance specifically recommends reusable widget classes rather than helper functions when appropriate because widget boundaries allow the framework to reason about subtree updates.

---

## Forms

### Conversion rules

Map semantic input types to semantic Flutter controls.

| HTMLFlutter                      |                                                                            |
| -------------------------------- | -------------------------------------------------------------------------- |
| text/email/password/number input | `TextFormField` with appropriate keyboard/autofill/formatter configuration |
| textarea                         | multiline `TextFormField`                                                  |
| checkbox                         | `Checkbox` / `CheckboxListTile`                                            |
| radio                            | `Radio` family                                                             |
| select                           | `DropdownMenu` or application-specific selector                            |
| range                            | `Slider`                                                                   |
| boolean toggle                   | `Switch`                                                                   |
| date                             | date picker/input flow appropriate to platform/design                      |
| time                             | time picker/input flow                                                     |
| form validation                  | `Form` + field validators or architecture-level validation                 |

`TextFormField` integrates text input with `Form` validation.

### Form ownership

Use a form key when the form needs coordinated validation:

```
final _formKey = GlobalKey<FormState>();

```

Controllers and focus nodes owned by a state object must be disposed. `TextEditingController` has lifecycle responsibilities and should not be created repeatedly inside `build()`.

### Autofill

Group related fields with `AutofillGroup` and provide appropriate hints where supported.

### Validation

Separate:

- field-format validation;
- cross-field validation;
- asynchronous/server validation;
- business-rule validation.

Do not cram every business rule into individual `validator` callbacks.

### Focus and keyboard

Verify:

- Tab/Shift+Tab;
- Enter/submit behavior;
- appropriate virtual keyboard type;
- next/done actions;
- error announcement;
- focus after validation failures;
- desktop keyboard behavior.

---

## Navigation Conversion

Do not translate every `<a href>` to the same Flutter routing call.

First classify navigation:

```
Internal one-screen push
Internal URL-addressable route
Deep link
Nested application navigation
Tab state
External URL
Modal
Replacement/auth flow

```

### Simple applications

For apps with straightforward navigation and no advanced deep-link/browser synchronization requirements, `Navigator` with routes/pages remains suitable. Flutter's navigation documentation explicitly distinguishes this simple case from more advanced routing.

### Complex routing

For applications requiring:

- browser URL synchronization;
- deep links;
- nested routes;
- route/path/query parameters;
- multiple navigators;
- redirect logic;

use a Router-based routing architecture or a maintained routing package built on Router.

Flutter's current documentation states that named routes are not recommended for most applications, particularly where deep links and browser forward behavior matter.

### Flutter Web

Route behavior must include:

- browser Back;
- browser Forward where architecture supports it;
- deep-link restoration;
- direct navigation to nested URLs;
- query/path parameters;
- URL synchronization.

Router-based navigation integrates with browser history.

### URL strategy

Flutter Web defaults and server configuration are separate concerns.

If using path-style URLs rather than hash URLs, configure the application's URL strategy and the web server to rewrite appropriate paths to the Flutter entry page. Flutter documents `usePathUrlStrategy()` for this purpose.

### Tabs

If a tab is merely local UI state:

```
selected tab → local state

```

If each tab represents a stable, deep-linkable application destination:

```
selected destination → routing state

```

Do not bury route-worthy application navigation inside transient widget state.

---

## Asset Conversion

### Raster images

Declare bundled image assets in `pubspec.yaml` and preserve suitable density variants. Flutter supports resolution-aware asset images.

Use:

```
Image.asset(
  'assets/images/hero.png',
  fit: BoxFit.cover,
)

```

or network images with explicit loading/error behavior.

### Image memory

A compressed 4K JPEG may decode to a much larger in-memory raster.

Where an image is rendered much smaller than its source resolution, consider decode-size hints such as `cacheWidth`/`cacheHeight` where appropriate. Flutter documents these mechanisms for reducing decoded image memory.

Do not downsample blindly when zooming or high-density display requires full resolution.

### Network images

Handle:

- loading state;
- error state;
- sizing to avoid layout jumps;
- cache behavior;
- authentication headers where relevant;
- offline behavior when product requirements demand it.

### SVG/vector assets

Do not assume SVG is a native `Image.asset` raster format.

Options:

1. convert simple assets to Flutter-native icons or vector paths;
2. use an appropriate vector asset pipeline;
3. use a maintained vector package if the project permits it;
4. use Flutter's documented asset-transformer/vector-graphics workflow where appropriate.

Flutter's asset documentation includes vector-graphics compilation through asset transformation.

### CSS sprites

Prefer splitting a sprite into meaningful assets or converting icons into a maintainable vector/icon system.

Retain sprite-sheet coordinates only when the original technique still has a compelling performance/maintenance reason in Flutter.

### Fonts

Declare font assets and all required weights/styles in `pubspec.yaml`.

Flutter's font asset documentation supports TTF/OTF-style application fonts. Web-native WOFF/WOFF2 assets should not be assumed to be universal cross-platform Flutter font assets.

### CSS background images

Decide whether the image is:

- content → `Image`;
- decoration → `DecorationImage`;
- full-page artwork → background layer;
- responsive crop → explicit `BoxFit`/alignment;
- purely decorative → exclude from accessibility semantics.

---

## Animation Conversion

Do not translate CSS keyframes statement-by-statement.

First classify the animation.

### Use implicit animations when

- there is a single target state;
- Flutter can interpolate the property;
- the animation starts whenever a value changes;
- no complex sequencing or manual lifecycle is required.

Examples:

- hover elevation;
- padding;
- color;
- size;
- alignment;
- opacity.

```
AnimatedContainer(
  duration: const Duration(milliseconds: 180),
  curve: Curves.easeOut,
  transform: Matrix4.diagonal3Values(
    hovered ? 1.02 : 1,
    hovered ? 1.02 : 1,
    1,
  ),
  decoration: BoxDecoration(
    borderRadius: BorderRadius.circular(16),
    boxShadow: hovered
        ? const [
            BoxShadow(
              blurRadius: 24,
              color: Color(0x22000000),
            ),
          ]
        : const [],
  ),
  child: child,
)

```

### Use explicit animations when

You need:

- sequencing;
- repeat/reverse;
- manual progress;
- multiple coordinated tweens;
- interruption;
- gesture-driven animation;
- physics;
- lifecycle control.

Use:

- `AnimationController`;
- `Tween`;
- transition widgets;
- `AnimatedBuilder`.

Dispose controllers owned by state.

### Hero animation

Use `Hero` when source interaction represents a shared visual element transitioning between routes and the semantics fit.

### Scroll animation

Do not run JavaScript-style polling loops.

Use:

- `ScrollController`;
- scroll notifications;
- sliver behavior;
- explicit animation tied to scroll position only when justified.

### CustomPainter

Use `CustomPainter` when animation represents actual custom drawing rather than ordinary widget movement.

`CustomPainter` can repaint directly from a `Listenable`, allowing paint changes without rebuilding or relaying out the widget subtree.

### Animation performance

Prefer changing properties that avoid unnecessary expensive layout when the same effect can be produced in paint, but do not distort the architecture to chase theoretical optimization.

Profile:

- UI/build/layout time;
- raster time;
- saveLayer usage;
- clipping;
- large shadows;
- excessive raster image work.

---

## Scrolling and Large Collections

### Page scrolling

Use a single clear scroll owner.

For heterogeneous pages:

```
CustomScrollView(
  slivers: [
    const SliverAppBar(...),
    SliverToBoxAdapter(child: HeroSection()),
    SliverList(...),
    SliverGrid(...),
  ],
)

```

Slivers allow scrollable regions to lazily build/layout/paint visible content.

### Large lists

Do not:

```
SingleChildScrollView(
  child: Column(
    children: items.map(buildItem).toList(),
  ),
)

```

for thousands of rows.

Use:

```
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ItemTile(item: items[index]);
  },
)

```

`ListView.builder` lazily constructs children as needed.

### Large grids

Use `GridView.builder` or sliver grids.

### Nested scrolling

Do not fix nested-scroll errors by randomly adding:

```
shrinkWrap: true
physics: NeverScrollableScrollPhysics()

```

everywhere.

First define which widget owns scrolling.

Common valid structures:

```
Scaffold
  → CustomScrollView
      → SliverList
      → SliverGrid

```

or:

```
Scaffold
  → Column
      → fixed toolbar
      → Expanded
          → ListView

```

### Sticky headers

Use `SliverAppBar` or `SliverPersistentHeader`, not enormous stack/offset calculations.

### Infinite loading

Keep pagination state outside item widgets.

Trigger loading based on:

- item position;
- scroll threshold;
- paging controller/state owner.

Avoid duplicate network requests from rebuilds.

### Scroll restoration

If browser/application expectations require restoring scroll positions, model page identity and restoration explicitly rather than relying accidentally on preserved widget instances.

---

## Tables and Data-Dense Interfaces

### Small tables

`DataTable` is appropriate for modest datasets where Material tabular presentation fits the application.

### Large tables

Flutter's documentation notes that `DataTable` performs column measurement and can be expensive for large amounts of data; placing it in a `SingleChildScrollView` also mounts/paints the whole child. Official alternatives include pagination, custom scrolling, and two-dimensional virtualization solutions.

Consider:

- `PaginatedDataTable`;
- a virtualized two-dimensional table solution;
- custom slivers;
- server-side pagination.

`DataTableSource` used with pagination should be long-lived rather than recreated on every build.

### Responsive data

For wide tabular relationships:

```
wide desktop:
Data table

narrow phone:
Entity card/list:
  Name: ...
  Status: ...
  Amount: ...

```

Do not transform tables into cards if doing so destroys comparison behavior users need. For financial or analytical matrices, horizontal scrolling or an alternate dedicated compact table may be more appropriate.

### Sorting/filtering

Keep:

- sort key;
- sort direction;
- filters;
- selection;
- pagination;

in explicit state rather than deriving them from visible rendered rows.

---
