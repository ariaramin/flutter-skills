# Flutter Architecture Principles

## F1 — Separate UI and data responsibilities [F]

Current Flutter architecture guidance strongly recommends clear UI and data layers. The UI layer is responsible for presenting data and user interaction. The data layer contains repositories and services around application data and external sources.

Operational rule:
- never let widget convenience erase responsibility boundaries;
- a small app can implement the boundary with few classes;
- a large app can reinforce it with packages/modules.

## F2 — Keep logic out of widgets when it is not view logic [F]

Appropriate widget logic:
- simple show/hide conditions;
- layout decisions;
- animation coordination;
- simple routing wiring;
- local interaction state.

Move elsewhere:
- data loading;
- business rules;
- repository orchestration;
- retry policy;
- persistence;
- authorization policy;
- multi-step mutations.

## F3 — Treat ViewModel as a role, not a class-name requirement [F/S]

Flutter's guide uses MVVM terminology and recommends Views + ViewModels.

In real code, the ViewModel role may be implemented as:
- `ChangeNotifier`;
- Riverpod notifier;
- BLoC/Cubit;
- controller;
- reducer/store;
- custom immutable state holder.

Judge responsibilities, inputs/outputs, scope, and testability—not the suffix.

## F4 — Repository is a source of truth [F/B-D1]

Repositories:
- expose app/domain models;
- coordinate service/data sources;
- own caching, refresh, retry, synchronization, mapping, and source selection;
- may hold shared session-level model state.

Repositories should not depend on widgets or navigation.

## F5 — Service isolates an external source [F]

Examples:
- REST API client;
- WebSocket adapter;
- SQL database adapter;
- secure storage;
- filesystem;
- platform plugin/native API.

A service should expose a typed Dart-facing contract and avoid absorbing feature orchestration.

## F6 — Domain/use-case layer is conditional [F/B-C]

Introduce a use-case/interactor when logic:
- merges multiple repositories;
- is complex enough to crowd presentation owners;
- is reused by multiple presentation owners;
- needs an independent policy boundary.

Do not create one pass-through use-case for every repository method.

## F7 — Prefer dependency clarity over framework magic [S]

A developer should be able to answer:
- who creates this object;
- how long it lives;
- what it depends on;
- who disposes it;
- what scope resets it.

If a DI/state package obscures those answers, the architecture is too implicit.

## F8 — Feature boundaries are user-capability boundaries [F/S]

A feature is usually a user-centric capability, not a file type.

Healthy examples:
- `auth`
- `checkout`
- `profile`
- `search`

Weak “feature” boundaries:
- `buttons`
- `models`
- `utils`

Shared UI belongs in a design-system/core UI boundary when it is actually shared and stable.

## F9 — Adapt architecture to app size [F/S]

Small app:
- UI + repositories/services may be enough.

Medium app:
- feature presentation owners, shared repositories, explicit navigation and test seams.

Large app:
- optional domain layer;
- stronger package boundaries;
- architecture rules enforced by imports/lints/tests;
- dedicated platform/data/design-system packages where ownership warrants them.

## F10 — Preserve declarative UI [F]

Flutter widgets describe current UI from state. Avoid imperative chains that manually synchronize many widgets. Prefer changing authoritative state and letting the widget tree render it.

## F11 — Do not confuse widget tree with architecture graph [S]

The widget tree is a rendering/composition structure.
The architecture graph is an ownership/dependency structure.

A deeply nested widget tree can have simple architecture, and a visually simple screen can require complex data architecture.

## F12 — Composition root is explicit [S]

Centralize creation/wiring of long-lived repositories/services/clients near application bootstrap or feature scopes. Avoid hidden global lookups inside business objects.

## Review questions

- Can the view be tested with a fake presentation owner/repository?
- Can data code run without Flutter widgets?
- Is native code behind a Dart-facing boundary?
- Is there exactly one clear source of truth per state?
- Does each abstraction own behavior, or merely rename another method?
- Can a new engineer trace a read/write path without framework archaeology?
