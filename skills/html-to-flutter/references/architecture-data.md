# State management, production architecture, networking, and storage

This reference preserves detailed guidance from the supplied HTML/CSS/JavaScript → Flutter research. Read the relevant section when the main skill directs you here.

## Contents

- State Management
  - Classify state before selecting a mechanism
  - Use the least powerful mechanism that fits
  - State locality
  - Listenables
- Production Architecture
  - Small applications
  - Medium applications
  - Large applications
- Network and API Conversion
  - JavaScript source
  - Flutter architecture
  - Rules
- Browser Storage Conversion
  - Decision model

## State Management

### Classify state before selecting a mechanism

#### Ephemeral UI state

Examples:

- hover;
- expanded accordion;
- local selected tab;
- password visibility;
- current animation state.

Often owned locally.

#### Application state

Examples:

- authenticated user;
- shopping cart;
- app-wide settings;
- workspace selection.

Needs a shared owner/source of truth.

#### Derived state

Examples:

```
filteredProducts = products + filter
total = cartItems
isValid = form fields

```

Prefer deriving it from source state unless caching is necessary.

#### Persisted state

State that must survive process/session restarts belongs behind persistence boundaries.

#### Server state

Remote data needs:

- loading;
- current value;
- stale/refresh state where applicable;
- errors;
- mutation state.

Do not treat a remote object as merely a global mutable Dart variable.

### Use the least powerful mechanism that fits

Potential tools include:

- `StatefulWidget`/`setState`;
- `ValueNotifier`/`ValueListenableBuilder`;
- `ChangeNotifier`/`ListenableBuilder`;
- architecture already used by the project;
- a third-party state library when project complexity and standards justify it.

Flutter's own state-management documentation distinguishes contained ephemeral state from state that needs broader application ownership rather than prescribing one universal state library.

### State locality

If only one leaf changes, avoid storing its state at the application root unless there is a real ownership reason.

Flutter performance guidance recommends localizing state changes and avoiding rebuilding large ancestors unnecessarily.

### Listenables

For a small independently changing value:

```
final ValueNotifier<int> count = ValueNotifier<int>(0);

```

and:

```
ValueListenableBuilder<int>(
  valueListenable: count,
  child: const ExpensiveStaticChild(),
  builder: (context, value, child) {
    return Row(
      children: [
        Text('$value'),
        if (child != null) child,
      ],
    );
  },
)

```

The `child` optimization can keep stable subtrees out of the builder's repeated work.

---

## Production Architecture

Flutter's architecture guidance recommends clear responsibility boundaries, especially between UI and data layers, with repositories as data sources of truth and services wrapping external systems.

### Small applications

Use enough structure to keep business/data work out of views:

```
lib/
  main.dart
  app.dart
  theme/
    app_theme.dart
  models/
  services/
  repositories/
  features/
    home/
      home_page.dart
      home_state.dart

```

Do not create eight abstraction layers for a three-screen prototype.

### Medium applications

Prefer feature-first organization with explicit data/UI boundaries:

```
lib/
  app/
    app.dart
    routing.dart
    theme/
  core/
    network/
    persistence/
    platform/
  features/
    orders/
      data/
        order_service.dart
        order_repository.dart
        order_dto.dart
      domain/
        order.dart
      presentation/
        order_page.dart
        order_view_model.dart
        widgets/

```

Introduce a domain/use-case layer only when business complexity earns it.

### Large applications

Use explicit contracts and dependency boundaries:

```
lib/
  app/
  core/
    analytics/
    error/
    network/
    persistence/
    platform/
  design_system/
    theme/
    tokens/
    components/
  features/
    feature_name/
      data/
        sources/
        repositories/
        models/
      domain/
        entities/
        repositories/
        use_cases/
      presentation/
        pages/
        state/
        widgets/

```

Priorities:

- single source of truth;
- unidirectional data flow;
- testable repositories/services;
- platform abstractions;
- feature ownership;
- typed domain models;
- dependency direction that keeps UI from owning infrastructure.

Do not reproduce the JavaScript folder structure simply because it already exists.

---

## Network and API Conversion

### JavaScript source

```
const response = await fetch('/api/users');
const users = await response.json();

```

### Flutter architecture

```
Widget
  ↓
View model / controller
  ↓
Repository
  ↓
HTTP service/client
  ↓
API

```

Flutter's networking documentation uses the cross-platform `http` package as a straightforward HTTP solution across supported targets, with platform configuration required in some environments.

### Rules

- NEVER make network requests directly from `build()`.
- Parse JSON into typed Dart models.
- Model loading/error/empty/success explicitly.
- Keep auth headers and transport concerns in service/client boundaries.
- Put caching/retry policy in the data layer.
- Retry only when product semantics and operation idempotency make it safe.
- Treat cancellation as transport/library-specific rather than promising a generic `Future.cancel()`.
- Use manual JSON decoding for very small models only; code generation can be more appropriate as model scale grows. Flutter's serialization guidance explicitly discusses this tradeoff.

---

## Browser Storage Conversion

There is no universal:

```
localStorage = Flutter API X
IndexedDB = Flutter API Y

```

because Flutter targets browser, mobile, and desktop platforms with different persistence systems.

### Decision model

#### `localStorage`

If it stores simple non-sensitive preferences:

```
source localStorage
→ application preference repository
→ platform-appropriate key/value implementation

```

The Flutter-team `shared_preferences` package supports multiple platforms, but current package guidance encourages newer `SharedPreferencesAsync` or `SharedPreferencesWithCache` APIs for new code rather than relying on the legacy `SharedPreferences` API.

Do not use preferences for secrets or transactional database data.

#### `sessionStorage`

Often maps better to:

- in-memory session/application state;
- route state;
- authentication/session owner;

rather than persistent universal storage.

Use web-specific session storage only if browser tab-session semantics are a product requirement.

#### IndexedDB

Usually represents structured client data.

Choose:

- a repository;
- platform-appropriate database/cache;
- SQL or another supported structured persistence layer;
- web-specific implementation where browser persistence semantics matter.

Flutter's architecture guidance includes SQL persistence for sufficiently complex local relational data.

#### Cookies

Treat cookies as HTTP/browser-session behavior, not generic application preferences.

Ask:

- is the server authenticating through browser cookies?
- does a WebView own the cookie jar?
- does the cross-platform HTTP client use another auth model?
- must browser-origin semantics be preserved?

Isolate the answer behind an authentication/network abstraction.

---
