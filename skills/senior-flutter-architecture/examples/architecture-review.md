# Example — Flutter Architecture Review

## Scenario

```dart
class FeedScreenState extends State<FeedScreen> {
  List<Post> posts = [];
  bool loading = false;

  Future<void> load() async {
    setState(() => loading = true);
    final response = await Dio().get('/feed?page=1');
    posts = (response.data as List).map(Post.fromJson).toList();
    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: posts.map((p) => PostTile(post: p)).toList(),
    );
  }
}
```

## Finding 1 — View owns data access

**Symptom:** screen creates HTTP client and decodes transport data.

**Risk:** no reusable source of truth, difficult tests, lifecycle/error/cache logic tied to screen.

**Minimal fix:** `FeedRepository` + presentation owner.

## Finding 2 — Pagination contract is fake

The endpoint/page is hardcoded and the UI builds all children eagerly.

**Fix:**
- define repository pagination cursor/page state;
- use lazy `ListView.builder`;
- trigger next page near threshold;
- represent next-page error separately.

## Finding 3 — Error state is missing

If request throws, `loading` may remain true and exception escapes.

**Fix:** explicit state transition and mapped failure.

## Finding 4 — HTTP client lifetime/config is hidden

Creating `Dio()` inside screen bypasses auth, tracing, timeout, interceptors, test injection.

**Fix:** create configured client/service at composition root.

## Target flow

```text
FeedScreen
→ FeedViewModel
→ FeedRepository
→ FeedApiService
```

Repository owns pagination/caching policy.
ViewModel owns renderable feature state.
Screen renders + sends commands.

## Optional stronger refactor

If the app already has Riverpod/BLoC/etc., implement the ViewModel role with that convention. Do not add a new state package just for this screen.
