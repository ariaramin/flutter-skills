import 'dart:async';

// Framework-neutral state logic; publish through the app's existing state owner.
class SearchModel {
  SearchModel(this.query);

  final Future<List<String>> Function(String) query;
  List<String> results = const [];
  Object? error;
  StackTrace? errorStack;
  bool loading = false;
  bool _disposed = false;
  int _generation = 0;

  Future<void> search(String text) async {
    if (_disposed) return;
    final generation = ++_generation;
    loading = true;
    error = null;
    errorStack = null;
    try {
      final next = await query(text);
      if (_disposed || generation != _generation) return;
      results = List.unmodifiable(next);
    } catch (failure, stack) {
      if (_disposed || generation != _generation) return;
      error = failure;
      errorStack = stack;
    } finally {
      // Obsolete completions must not clear the newer request's loading state.
      if (!_disposed && generation == _generation) loading = false;
    }
  }

  void dispose() {
    _disposed = true;
    ++_generation;
  }
}

// Run with: dart --enable-asserts run references/examples/latest_search.dart
Future<void> main() async {
  final pending = <String, Completer<List<String>>>{};
  final model = SearchModel((text) {
    final request = Completer<List<String>>();
    pending[text] = request;
    return request.future;
  });

  final old = model.search('old');
  final latest = model.search('latest');
  pending['latest']!.complete(['latest']);
  await latest;
  pending['old']!.complete(['old']);
  await old;
  assert(model.results.single == 'latest');

  final staleFailure = model.search('stale failure');
  final active = model.search('active');
  pending['stale failure']!.completeError(StateError('obsolete'));
  await staleFailure;
  assert(model.error == null && model.loading);
  pending['active']!.completeError(StateError('active failure'));
  await active;
  assert(model.error is StateError && model.errorStack != null);
  assert(!model.loading);

  final afterDispose = model.search('disposed');
  model.dispose();
  pending['disposed']!.complete(['must not publish']);
  await afterDispose;
  assert(model.results.single == 'latest');
  assert(model.loading); // No state was published after disposal.
  await model.search('ignored');
  assert(!pending.containsKey('ignored'));
}
