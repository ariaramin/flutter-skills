# Adapting to Common Flutter Ecosystem Patterns

This file is supplemental [S]. Package APIs evolve; inspect the project's actual versions and primary documentation before generating code.

## Riverpod-style project

Preserve:
- provider scopes;
- override-based tests;
- notifier lifecycle;
- async cancellation semantics supported by current version.

Architecture rule:
Provider graph is wiring/state mechanism. Repository/data boundaries still matter.

Avoid:
- provider for every private pure function;
- UI watching huge app state when a narrow selector/provider is enough;
- repository behavior duplicated inside many notifiers.

## BLoC/Cubit-style project

Preserve:
- explicit events/commands and immutable states;
- feature BLoC scope;
- repository injection.

Avoid:
- BLoC doing raw HTTP/DB/platform work directly;
- event explosion for purely local view concerns;
- navigation logic hidden in repository.

## Provider + ChangeNotifier project

Preserve when coherent.

Watch:
- mutable state exposure;
- broad `notifyListeners`;
- lifetime/disposal;
- async races.

Use smaller notifiers or selectors when rebuild/ownership problems are real.

## GetIt/service-locator project

Do not immediately rewrite.

Improve by:
- keeping lookup near composition/feature construction;
- passing dependencies explicitly to core business objects;
- resetting scoped/session services correctly;
- making tests isolate global registration.

## go_router project

Use existing route configuration and typed conventions if present.
Keep repository data out of route state except stable route intent/IDs.
Test redirects/deep links.

## Dio project

Use configured/shared clients with:
- base URL/environment;
- authentication;
- timeouts;
- tracing/log redaction;
- cancellation if needed.

Keep Dio response/exception types inside service/data boundaries where practical.

## Drift/Isar/Hive/SQLite/etc.

Treat database choice as storage implementation.
Repository owns app behavior:
- mapping;
- cache freshness;
- transactions;
- sync;
- migration implications.

Do not let DB entity APIs become presentation state by default.

## Freezed/json_serializable/codegen

Follow existing generated-model conventions.
Do not introduce a second modeling/codegen stack without migration value.

## Monorepo/Melos-like workspace

Inspect package graph before changes.
Respect public package APIs.
Prefer changing the owning package rather than cross-importing internals.
