# Example — Flutter Feature Design: Offline-Capable Saved Articles

## Requirement

Users can:
- view saved articles;
- save/unsave instantly;
- continue to see saved items offline;
- queue save changes offline and sync later.

## 1. State ownership

Repository owns authoritative saved-article model and pending mutations.

Feature presentation owner owns:
- initial loading;
- visible list/filter;
- refresh state;
- command progress only where needed for UI.

Widget owns:
- local scroll/animation state.

## 2. Data boundary

```dart
abstract interface class SavedArticlesRepository {
  Stream<List<SavedArticle>> watchSaved();
  Future<void> setSaved(String articleId, bool saved);
  Future<void> refresh();
}
```

Repository implementation coordinates:
- remote service;
- local database;
- mutation queue.

## 3. Read path

```text
screen starts
→ ViewModel subscribes repository
→ repository emits local DB snapshot
→ UI renders immediately
→ repository refreshes remote
→ DB transaction updates
→ repository emits new list
```

## 4. Write path

```text
tap save
→ repository writes desired state locally
→ records mutation id/status
→ UI updates from repository
→ remote sync attempts
→ success removes pending marker
→ retryable failure stays pending
→ terminal conflict surfaces state
```

## 5. Flutter presentation owner

Package-neutral conceptual API:

```dart
class SavedArticlesViewModel {
  SavedArticlesViewModel(this._repository);

  final SavedArticlesRepository _repository;

  Stream<List<SavedArticle>> get items => _repository.watchSaved();

  Future<void> refresh() => _repository.refresh();

  Future<void> toggle(SavedArticle item) {
    return _repository.setSaved(item.id, !item.isSaved);
  }
}
```

A real project may expose immutable combined state instead of a raw stream.

## 6. Widget

The widget:
- observes state;
- renders loading/content/offline/pending indicators;
- calls `toggle`;
- does not choose DB vs API;
- does not implement retries.

## 7. Tests

Repository:
- local snapshot renders without network;
- offline mutation persists;
- reconnect syncs;
- duplicate retry is deduplicated;
- conflict policy works.

ViewModel:
- command/state mapping.

Widget:
- pending indicator;
- error/retry affordance;
- empty/list rendering.

## 8. Tradeoff

A simpler online-only product could avoid DB + mutation queue entirely. Offline architecture is justified only because the requirement explicitly demands durable offline behavior.
