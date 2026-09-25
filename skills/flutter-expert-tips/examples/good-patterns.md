# Good Patterns

## 1. Async context safety

```dart
Future<void> saveAndClose(BuildContext context) async {
  await repository.save();
  if (!context.mounted) return;
  Navigator.of(context).pop();
}
```

Why: the element can unmount during `await`.

## 2. Stable FutureBuilder future

```dart
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key, required this.repository});
  final UserRepository repository;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late Future<User> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.repository.load();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: _future,
      builder: (context, snapshot) => switch (snapshot) {
        AsyncSnapshot(hasError: true, error: final error) => ErrorView(error: error),
        AsyncSnapshot(hasData: true, data: final user?) => ProfileView(user: user),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}
```

## 3. Resource ownership

```dart
class SearchField extends StatefulWidget {
  const SearchField({super.key, required this.onChanged});
  final ValueChanged<String> onChanged;

  @override
  State<SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<SearchField> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      focusNode: _focusNode,
      onChanged: widget.onChanged,
    );
  }
}
```

## 4. Lazy list

```dart
ListView.separated(
  itemCount: users.length,
  itemBuilder: (context, index) => UserTile(
    key: ValueKey(users[index].id),
    user: users[index],
  ),
  separatorBuilder: (_, __) => const Divider(height: 1),
)
```

## 5. Specific MediaQuery dependency

```dart
final width = MediaQuery.sizeOf(context).width;
```

Why: does not subscribe to every MediaQuery field.

## 6. Direct color alpha

```dart
DecoratedBox(
  decoration: BoxDecoration(
    color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
  ),
  child: child,
)
```

## 7. Typed repository boundary

```dart
abstract interface class ProfileRepository {
  Future<Result<Profile, ProfileFailure>> load(ProfileId id);
}

final class ApiProfileRepository implements ProfileRepository {
  ApiProfileRepository(this._api);
  final ProfileApi _api;

  @override
  Future<Result<Profile, ProfileFailure>> load(ProfileId id) async {
    try {
      final dto = await _api.getProfile(id.value);
      return Success(dto.toDomain());
    } on NotFoundException {
      return const Failure(ProfileFailure.notFound());
    } on NetworkException {
      return const Failure(ProfileFailure.network());
    }
  }
}
```

Use the project's existing Result type rather than introducing a new one just for this pattern.

## 8. Bounded debounce

```dart
class QueryDebouncer {
  QueryDebouncer(this.delay);
  final Duration delay;
  Timer? _timer;

  void run(void Function() action) {
    _timer?.cancel();
    _timer = Timer(delay, action);
  }

  void dispose() => _timer?.cancel();
}
```

## 9. CPU-heavy parsing with compute

```dart
Future<List<Item>> parseItems(String jsonText) {
  return compute(_parseItems, jsonText, debugLabel: 'parse-items');
}

List<Item> _parseItems(String jsonText) {
  final data = jsonDecode(jsonText) as List<dynamic>;
  return [
    for (final value in data)
      Item.fromJson(value as Map<String, dynamic>),
  ];
}
```

Use only after measuring enough parsing cost to justify it; web does not get a separate isolate from `compute`.

## 10. Explicit cleanup

```dart
Future<T> withClient<T>(Future<T> Function(HttpClient client) body) async {
  final client = HttpClient();
  try {
    return await body(client);
  } finally {
    client.close();
  }
}
```

Do not use this helper if the project intentionally shares a long-lived injected client.
