# Dependency Injection & Object Lifetimes

## Goal

DI is a technique for making dependencies and lifetimes explicit. A package/container is optional.

## Constructor injection default

Prefer:
```dart
class ProfileViewModel {
  ProfileViewModel(this._repository);
  final ProfileRepository _repository;
}
```

over hidden lookup:
```dart
final repo = locator<ProfileRepository>();
```
inside every method/class.

Hidden lookup can be acceptable at a composition boundary but spreads coupling when used as a general access pattern.

## Composition roots

Create/wire dependencies near:
- application bootstrap;
- router/shell scope;
- feature entry;
- test setup.

Example lifetime hierarchy:
```text
process/app
  → API client
  → DB
  → repositories/session
    → feature presentation owner
      → widgets/controllers
```

## Scope questions

For every dependency:
- singleton for process?
- session-scoped?
- feature-scoped?
- route-scoped?
- widget-local?
- disposable?
- reset on logout?

A global singleton is not a substitute for deciding scope.

## Flutter context-based injection

Provider-style inherited injection is useful at UI composition boundaries.
Avoid retrieving dependencies from `BuildContext` deep inside data/domain code.

## State container as DI

Riverpod/provider/BLoC composition can supply dependencies, but keep roles clear:
- state propagation;
- object construction;
- business behavior.

Do not create providers merely to hide every constructor.

## Test seams

Inject boundaries you need to control:
- repositories;
- clocks;
- IDs;
- platform capabilities;
- network/storage services;
- analytics/crash reporters where relevant.

Do not introduce interfaces for every concrete class only “for mocking.” Fakes can sometimes subclass/implement an existing abstraction or use a concrete in-memory implementation.

## Service locator tradeoff

Benefits:
- easy access;
- simple bootstrapping.

Costs:
- hidden dependency graph;
- runtime lookup errors;
- weaker local reasoning;
- more difficult tests if global mutable container leaks across cases.

Use deliberately, preferably at edges.

## Disposal

If DI creates a disposable object, define who closes it:
- streams;
- clients;
- DB;
- controllers;
- notifiers;
- native listeners.

Ownership without disposal is incomplete.
