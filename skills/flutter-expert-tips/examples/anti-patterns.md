# Anti-Patterns

## 1. Request in build

```dart
// Avoid
Widget build(BuildContext context) {
  repository.refresh();
  return const Body();
}
```

Why: rebuilds can duplicate the request.

## 2. New future on every build

```dart
// Avoid
FutureBuilder<User>(
  future: repository.loadUser(),
  builder: ...,
)
```

Why: parent rebuilds can restart work.

## 3. Stale context

```dart
// Avoid
onPressed: () async {
  await repository.save();
  Navigator.of(context).pop();
}
```

Prefer a mounted check or context-independent effect design.

## 4. Undisposed controllers

```dart
// Avoid
final controller = AnimationController(vsync: this);
// no dispose()
```

## 5. Eager long list

```dart
// Avoid for thousands of rows
ListView(
  children: users.map(UserTile.new).toList(),
)
```

Use a lazy builder when the collection is large.

## 6. Intrinsic sizing in every row

```dart
// Avoid as a default in a long scrolling list
ListView.builder(
  itemBuilder: (_, index) => IntrinsicWidth(
    child: ComplexRow(item: items[index]),
  ),
)
```

First solve the constraints directly; intrinsic layout adds extra work.

## 7. Opacity around a single color/image

```dart
// Avoid when direct alpha is equivalent
Opacity(
  opacity: 0.5,
  child: ColoredBox(color: Colors.blue),
)
```

Prefer a color with alpha.

## 8. Shipping a server secret

```dart
// Avoid
const openAiSecret = String.fromEnvironment('OPENAI_API_KEY');
```

Compile-time configuration is extractable from a client build. Proxy privileged calls through a trusted server.

## 9. Connectivity as truth

```dart
// Avoid
if (await connectivity.isConnected) {
  await api.call(); // assumes backend is reachable
}
```

Always handle the real request result/timeout.

## 10. Swallowing every error

```dart
// Avoid
try {
  return await api.load();
} catch (_) {
  return const [];
}
```

This can turn outages/corruption into believable empty data.

## 11. Clever operator hiding work

```dart
// Avoid unless a project-standard, obvious extension exists
final filtered = users - blockedUsers;
```

Prefer explicit set/filter semantics when readers otherwise need to inspect operator code.

## 12. Global mutable singleton state

```dart
// Avoid
class Session {
  static User? currentUser;
}
```

Hidden global writes complicate tests/lifecycle. Use explicit scoped state/dependencies.

## 13. Infinite retry

```dart
// Avoid
while (true) {
  try {
    return await api.chargeCard();
  } catch (_) {}
}
```

Non-idempotent writes require explicit idempotency/retry policy.

## 14. Old web API in new code

```dart
// Deprecated direction
import 'dart:html';
```

Use modern `package:web` / JS interop guidance.

## 15. Deprecated opacity API

```dart
// Deprecated
final color = Colors.black.withOpacity(0.5);
```

```dart
// Prefer
final color = Colors.black.withValues(alpha: 0.5);
```
