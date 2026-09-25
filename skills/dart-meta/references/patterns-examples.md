# Production examples and before/after migrations

Use this reference when implementation examples are helpful: immutable models/state, protected extension points, package-internal APIs, lifecycle contracts, result usage, experimental APIs, deprecations, and legacy-to-modern Dart migrations.

## Table of contents

- [Production Example 1 — Immutable Value Model](#production-example-1-immutable-value-model)
- [Production Example 2 — Immutable Flutter State](#production-example-2-immutable-flutter-state)
- [Production Example 3 — Protected Extension Point](#production-example-3-protected-extension-point)
- [Production Example 4 — Internal Package API](#production-example-4-internal-package-api)
- [Production Example 5 — Testing-Only Access](#production-example-5-testing-only-access)
- [Production Example 6 — Lifecycle API Requiring Super](#production-example-6-lifecycle-api-requiring-super)
- [Production Example 7 — Non-Overridable Orchestration](#production-example-7-non-overridable-orchestration)
- [Production Example 8 — Result Must Not Be Ignored](#production-example-8-result-must-not-be-ignored)
- [Production Example 9 — Experimental API](#production-example-9-experimental-api)
- [Production Example 10 — High-Quality Deprecation](#production-example-10-high-quality-deprecation)
- [Production Example 11 — Modern Replacement for Legacy `@sealed`](#production-example-11-modern-replacement-for-legacy-sealed)
- [Before / After — Mutable "Immutable" Class](#before-after-mutable-immutable-class)
  - [Before](#before)
  - [After](#after)
- [Before / After — Weak Testing Boundary](#before-after-weak-testing-boundary)
  - [Before](#before)
  - [After](#after)
- [Before / After — Legacy Required Parameter](#before-after-legacy-required-parameter)
  - [Before](#before)
  - [After](#after)
- [Before / After — Always Throws](#before-after-always-throws)
  - [Before](#before)
  - [After](#after)
- [Before / After — Deprecated API](#before-after-deprecated-api)
  - [Before](#before)
  - [After](#after)

---

# Production Example 1 — Immutable Value Model

```
import 'package:meta/meta.dart';

@immutable
final class UserPreferences {
  UserPreferences({
    required this.themeMode,
    required Iterable<String> favoriteTags,
  }) : favoriteTags = List<String>.unmodifiable(favoriteTags);

  final String themeMode;
  final List<String> favoriteTags;

  @UseResult('Assign the returned preferences value.')
  UserPreferences copyWith({
    String? themeMode,
    Iterable<String>? favoriteTags,
  }) {
    return UserPreferences(
      themeMode: themeMode ?? this.themeMode,
      favoriteTags: favoriteTags ?? this.favoriteTags,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is UserPreferences &&
        other.themeMode == themeMode &&
        _listEquals(other.favoriteTags, favoriteTags);
  }

  @override
  int get hashCode => Object.hash(
        themeMode,
        Object.hashAll(favoriteTags),
      );

  static bool _listEquals(
    List<String> a,
    List<String> b,
  ) {
    if (identical(a, b)) return true;
    if (a.length != b.length) return false;

    for (var index = 0; index < a.length; index++) {
      if (a[index] != b[index]) return false;
    }

    return true;
  }
}

```

---

# Production Example 2 — Immutable Flutter State

```
import 'package:meta/meta.dart';

@immutable
final class LoginState {
  const LoginState({
    required this.email,
    required this.status,
    this.errorMessage,
  });

  final String email;
  final LoginStatus status;
  final String? errorMessage;

  @UseResult('Emit or assign the returned LoginState.')
  LoginState copyWith({
    String? email,
    LoginStatus? status,
    String? errorMessage,
    bool clearError = false,
  }) {
    return LoginState(
      email: email ?? this.email,
      status: status ?? this.status,
      errorMessage: clearError
          ? null
          : errorMessage ?? this.errorMessage,
    );
  }
}

enum LoginStatus {
  idle,
  submitting,
  success,
  failure,
}

```

---

# Production Example 3 — Protected Extension Point

```
import 'package:meta/meta.dart';

abstract base class DataSource<T> {
  Future<T> fetch() async {
    final raw = await loadRaw();
    return decode(raw);
  }

  @protected
  Future<String> loadRaw();

  @protected
  T decode(String raw);
}

```

Use only if subclassing is an intentional supported customization model.

---

# Production Example 4 — Internal Package API

```
// lib/src/http/internal_request_signer.dart

import 'package:meta/meta.dart';

@internal
final class InternalRequestSigner {
  InternalRequestSigner(this.secret);

  final String secret;

  String sign(String body) {
    return '$secret:$body';
  }
}

```

Do not export it from the public package facade.

---

# Production Example 5 — Testing-Only Access

```
import 'package:meta/meta.dart';

final class RetryBackoff {
  RetryBackoff();

  int _attempt = 0;

  Duration nextDelay() {
    return Duration(
      milliseconds: 100 * ++_attempt,
    );
  }

  @visibleForTesting
  void resetForTesting() {
    _attempt = 0;
  }
}

```

Before using this design, still ask whether tests can simply create a new `RetryBackoff` instance instead.

---

# Production Example 6 — Lifecycle API Requiring Super

```
import 'package:meta/meta.dart';

abstract base class ManagedResource {
  bool _attached = false;

  bool get isAttached => _attached;

  @protected
  @mustCallSuper
  void attach() {
    if (_attached) {
      throw StateError('Resource is already attached.');
    }

    _attached = true;
  }

  @protected
  @mustCallSuper
  void detach() {
    if (!_attached) {
      throw StateError('Resource is not attached.');
    }

    _attached = false;
  }
}

final class SocketResource extends ManagedResource {
  @override
  void attach() {
    super.attach();
    // Attach socket-specific resources.
  }

  @override
  void detach() {
    // Release socket-specific resources.
    super.detach();
  }
}

```

---

# Production Example 7 — Non-Overridable Orchestration

```
import 'package:meta/meta.dart';

abstract base class ImportJob {
  @nonVirtual
  Future<void> execute() async {
    final bytes = await download();
    final records = await parse(bytes);
    await persist(records);
  }

  @protected
  Future<List<int>> download();

  @protected
  Future<List<String>> parse(List<int> bytes);

  @protected
  Future<void> persist(List<String> records);
}

```

---

# Production Example 8 — Result Must Not Be Ignored

```
import 'package:meta/meta.dart';

@immutable
final class ValidationResult {
  const ValidationResult._({
    required this.isValid,
    this.message,
  });

  const ValidationResult.valid()
      : this._(
          isValid: true,
        );

  const ValidationResult.invalid(String message)
      : this._(
          isValid: false,
          message: message,
        );

  final bool isValid;
  final String? message;
}

@UseResult('Check the validation result before continuing.')
ValidationResult validateUsername(String username) {
  if (username.trim().length < 3) {
    return const ValidationResult.invalid(
      'Username must contain at least three characters.',
    );
  }

  return const ValidationResult.valid();
}

```

---

# Production Example 9 — Experimental API

```
import 'package:meta/meta.dart';

@experimental
final class IncrementalSearchEngine {
  Future<List<String>> search(String query) async {
    return <String>[query];
  }
}

```

Accompany this with package documentation explaining which compatibility promises do not yet apply.

---

# Production Example 10 — High-Quality Deprecation

```
final class ApiClient {
  @Deprecated(
    'Use fetchUser instead. '
    'Deprecated in 3.2.0; planned for removal in 4.0.0.',
  )
  Future<String> loadUser(String id) {
    return fetchUser(id);
  }

  Future<String> fetchUser(String id) async {
    return id;
  }
}

```

Do not promise removal in `4.0.0` unless that is actual package policy.

---

# Production Example 11 — Modern Replacement for Legacy `@sealed`

Legacy:

```
import 'package:meta/meta.dart';

@sealed
class AuthResult {}

```

Modern closed family:

```
sealed class AuthResult {
  const AuthResult();
}

final class AuthSuccess extends AuthResult {
  const AuthSuccess(this.userId);

  final String userId;
}

final class AuthFailure extends AuthResult {
  const AuthFailure(this.message);

  final String message;
}

```

Caller:

```
String describe(AuthResult result) {
  return switch (result) {
    AuthSuccess(:final userId) => 'Signed in: $userId',
    AuthFailure(:final message) => 'Failed: $message',
  };
}

```

Use this migration only when the same-library closed-family semantics are correct.

---

# Before / After — Mutable "Immutable" Class

## Before

```
@immutable
final class DashboardState {
  const DashboardState(this.cards);

  final List<CardModel> cards;
}

```

Problem:

```
state.cards.add(card);

```

can mutate observable state if `cards` is a normal mutable list.

## After

```
@immutable
final class DashboardState {
  DashboardState(Iterable<CardModel> cards)
      : cards = List<CardModel>.unmodifiable(cards);

  final List<CardModel> cards;
}

```

The annotation catches field reassignment issues; ownership design handles collection mutation.

---

# Before / After — Weak Testing Boundary

## Before

```
class TokenRepository {
  @visibleForTesting
  String decodePayload(String token) {
    // Large implementation.
    return token;
  }
}

```

If decoding is independently meaningful, extract it.

## After

```
abstract interface class TokenDecoder {
  String decodePayload(String token);
}

final class JwtTokenDecoder implements TokenDecoder {
  @override
  String decodePayload(String token) {
    return token;
  }
}

final class TokenRepository {
  TokenRepository(this.decoder);

  final TokenDecoder decoder;
}

```

The collaborator is directly testable without test-only API exposure.

---

# Before / After — Legacy Required Parameter

## Before

```
void showMessage({
  @required String? message,
}) {}

```

## After

```
void showMessage({
  required String message,
}) {}

```

The modern form is language-enforced.

---

# Before / After — Always Throws

## Before

```
@alwaysThrows
void fail(String message) {
  throw StateError(message);
}

```

## After

```
Never fail(String message) {
  throw StateError(message);
}

```

---

# Before / After — Deprecated API

## Before

```
@deprecated
void oldMethod() {}

```

## After

```
@Deprecated(
  'Use newMethod instead. Deprecated in 2.4.0.',
)
void oldMethod() {}

```

---
