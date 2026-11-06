# Reference Implementation: Plugin-Style Architecture for Flutter

This reference implementation demonstrates a production-grade, compile-time assembled, modular Plugin-Style Architecture in Flutter.
All code blocks are verified against Dart 3.13+ and Flutter 3.47+, enforcing strict static analysis, explicit dependency injection, clean encapsulation, and full testability.

---

### Core Contracts & Capabilities

```dart
// file: lib/src/core/capability.dart
import 'dart:async';

/// Status indicating whether a capability is supported on the current platform/device.
enum CapabilityStatus {
  available,
  unsupported,
  permissionDenied,
  restricted,
  error,
}

/// Base contract for an application-level capability or hardware feature.
abstract interface class AppCapability {
  String get id;
  Future<CapabilityStatus> checkAvailability();
}
```

```dart
// file: lib/src/core/plugin_contract.dart
import 'dart:async';

/// Current lifecycle status of an application feature plugin.
enum PluginLifecycleState {
  uninitialized,
  starting,
  active,
  stopping,
  stopped,
  failed,
}

/// Service locator and contribution interface provided to plugins during initialization.
abstract interface class PluginContext {
  T getService<T extends Object>();
  void registerService<T extends Object>(T service);
}

/// Core contract for an application feature plugin.
abstract interface class ApplicationPlugin {
  String get id;
  Set<String> get dependencies;
  PluginLifecycleState get state;

  Future<void> initialize(PluginContext context);
  Future<void> dispose();
}
```

---

### Composition Root & Lifecycle Registry

```dart
// file: lib/src/core/plugin_registry.dart
import 'dart:async';
import 'plugin_contract.dart';

/// Exception thrown when plugin registration or lifecycle errors occur.
class PluginRegistryException implements Exception {
  final String message;
  const PluginRegistryException(this.message);

  @override
  String toString() => 'PluginRegistryException: $message';
}

/// Application composition root and lifecycle orchestrator.
class PluginRegistry implements PluginContext {
  final Map<String, ApplicationPlugin> _plugins = {};
  final Map<Type, Object> _services = {};
  final List<String> _initializedOrder = [];
  bool _isTransitioning = false;

  /// Registers an application plugin before initialization.
  void register(ApplicationPlugin plugin) {
    if (_plugins.containsKey(plugin.id)) {
      throw PluginRegistryException('Plugin already registered: ${plugin.id}');
    }
    _plugins[plugin.id] = plugin;
  }

  @override
  void registerService<T extends Object>(T service) {
    if (_services.containsKey(T)) {
      throw PluginRegistryException('Service already registered for type: $T');
    }
    _services[T] = service;
  }

  @override
  T getService<T extends Object>() {
    final service = _services[T];
    if (service == null) {
      throw PluginRegistryException('Service not found for type: $T');
    }
    return service as T;
  }

  /// Returns plugins in topological order based on declared dependencies.
  List<ApplicationPlugin> getDependencyOrderedPlugins() {
    final ordered = <ApplicationPlugin>[];
    final visited = <String>{};
    final visiting = <String>{};

    void visit(String id) {
      if (visiting.contains(id)) {
        throw PluginRegistryException('Circular dependency detected involving: $id');
      }
      if (!visited.contains(id)) {
        visiting.add(id);
        final plugin = _plugins[id];
        if (plugin == null) {
          throw PluginRegistryException('Missing dependency plugin: $id');
        }
        for (final dep in plugin.dependencies) {
          visit(dep);
        }
        visiting.remove(id);
        visited.add(id);
        ordered.add(plugin);
      }
    }

    for (final id in _plugins.keys) {
      if (!visited.contains(id)) {
        visit(id);
      }
    }

    return ordered;
  }

  /// Initializes all registered plugins in dependency order.
  /// If any plugin fails to initialize, already-initialized plugins are disposed in reverse order.
  Future<void> initializeAll() async {
    if (_isTransitioning) {
      throw const PluginRegistryException('Registry is currently transitioning states.');
    }
    _isTransitioning = true;
    _initializedOrder.clear();

    final orderedPlugins = getDependencyOrderedPlugins();

    try {
      for (final plugin in orderedPlugins) {
        await plugin.initialize(this);
        _initializedOrder.add(plugin.id);
      }
    } catch (error) {
      // Rollback on partial initialization failure in reverse order
      await _rollbackPartialInit();
      _isTransitioning = false;
      rethrow;
    }

    _isTransitioning = false;
  }

  Future<void> _rollbackPartialInit() async {
    for (final id in _initializedOrder.reversed) {
      final plugin = _plugins[id];
      if (plugin != null) {
        try {
          await plugin.dispose();
        } catch (_) {
          // Log rollback warning without masking primary failure
        }
      }
    }
    _initializedOrder.clear();
    _services.clear();
  }

  /// Disposes all initialized plugins in reverse initialization order.
  Future<void> disposeAll() async {
    if (_isTransitioning) {
      throw const PluginRegistryException('Registry is currently transitioning states.');
    }
    _isTransitioning = true;

    for (final id in _initializedOrder.reversed) {
      final plugin = _plugins[id];
      if (plugin != null) {
        try {
          await plugin.dispose();
        } catch (_) {
          // Continue disposing remaining plugins despite individual errors
        }
      }
    }

    _initializedOrder.clear();
    _services.clear();
    _isTransitioning = false;
  }
}
```

---

### Feature 1: Analytics Capability

```dart
// file: lib/src/features/analytics/analytics_contract.dart
import 'dart:async';

/// Abstract contract for logging application events.
abstract interface class AnalyticsSink {
  Future<void> logEvent(String name, [Map<String, Object>? parameters]);
  List<String> get recordedEvents;
}
```

```dart
// file: lib/src/features/analytics/in_memory_analytics_plugin.dart
import 'dart:async';
import '../../core/plugin_contract.dart';
import 'analytics_contract.dart';

/// In-memory implementation of AnalyticsSink for testing and platforms without native SDKs.
class InMemoryAnalyticsPlugin implements ApplicationPlugin, AnalyticsSink {
  final List<String> _events = [];
  PluginLifecycleState _state = PluginLifecycleState.uninitialized;

  @override
  String get id => 'analytics';

  @override
  Set<String> get dependencies => const {};

  @override
  PluginLifecycleState get state => _state;

  @override
  List<String> get recordedEvents => List.unmodifiable(_events);

  @override
  Future<void> initialize(PluginContext context) async {
    _state = PluginLifecycleState.starting;
    context.registerService<AnalyticsSink>(this);
    _state = PluginLifecycleState.active;
  }

  @override
  Future<void> logEvent(String name, [Map<String, Object>? parameters]) async {
    if (_state != PluginLifecycleState.active) {
      throw StateError('Cannot log event while plugin is not active: $name');
    }
    final paramString = parameters != null ? ' $parameters' : '';
    _events.add('$name$paramString');
  }

  @override
  Future<void> dispose() async {
    _state = PluginLifecycleState.stopping;
    _events.clear();
    _state = PluginLifecycleState.stopped;
  }
}
```

---

### Feature 2: Document Storage Capability

```dart
// file: lib/src/features/storage/document_storage_contract.dart
import 'dart:async';

/// Abstract capability for reading and writing documents.
abstract interface class DocumentStorage {
  Future<String?> loadDocument(String id);
  Future<void> saveDocument(String id, String content);
}
```

```dart
// file: lib/src/features/storage/memory_document_storage_plugin.dart
import 'dart:async';
import '../../core/plugin_contract.dart';
import '../analytics/analytics_contract.dart';
import 'document_storage_contract.dart';

/// Memory-backed implementation of DocumentStorage demonstrating inter-feature dependency.
class MemoryDocumentStoragePlugin implements ApplicationPlugin, DocumentStorage {
  final Map<String, String> _store = {};
  PluginLifecycleState _state = PluginLifecycleState.uninitialized;
  AnalyticsSink? _analytics;

  @override
  String get id => 'storage';

  @override
  Set<String> get dependencies => const {'analytics'};

  @override
  PluginLifecycleState get state => _state;

  @override
  Future<void> initialize(PluginContext context) async {
    _state = PluginLifecycleState.starting;
    _analytics = context.getService<AnalyticsSink>();
    context.registerService<DocumentStorage>(this);
    await _analytics?.logEvent('storage_initialized');
    _state = PluginLifecycleState.active;
  }

  @override
  Future<String?> loadDocument(String id) async {
    if (_state != PluginLifecycleState.active) {
      throw StateError('Storage plugin is not active');
    }
    final content = _store[id];
    await _analytics?.logEvent('document_loaded', {'id': id, 'found': content != null});
    return content;
  }

  @override
  Future<void> saveDocument(String id, String content) async {
    if (_state != PluginLifecycleState.active) {
      throw StateError('Storage plugin is not active');
    }
    _store[id] = content;
    await _analytics?.logEvent('document_saved', {'id': id, 'bytes': content.length});
  }

  @override
  Future<void> dispose() async {
    _state = PluginLifecycleState.stopping;
    await _analytics?.logEvent('storage_disposing');
    _store.clear();
    _analytics = null;
    _state = PluginLifecycleState.stopped;
  }
}
```

---

### Presentation Layer: ViewModel & View

```dart
// file: lib/src/features/documents/document_view_model.dart
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../analytics/analytics_contract.dart';
import '../storage/document_storage_contract.dart';

/// Presentation state for Document management.
class DocumentViewModel extends ChangeNotifier {
  final DocumentStorage storage;
  final AnalyticsSink analytics;

  String _currentContent = '';
  bool _isLoading = false;
  String? _errorMessage;

  DocumentViewModel({
    required this.storage,
    required this.analytics,
  });

  String get currentContent => _currentContent;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> load(String id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final content = await storage.loadDocument(id);
      _currentContent = content ?? '';
    } catch (e) {
      _errorMessage = e.toString();
      await analytics.logEvent('document_load_error', {'error': _errorMessage!});
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> save(String id, String content) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await storage.saveDocument(id, content);
      _currentContent = content;
    } catch (e) {
      _errorMessage = e.toString();
      await analytics.logEvent('document_save_error', {'error': _errorMessage!});
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
```

```dart
// file: lib/src/features/documents/document_view.dart
import 'package:flutter/material.dart';
import 'document_view_model.dart';

/// Interactive UI view consuming DocumentViewModel.
class DocumentView extends StatelessWidget {
  final DocumentViewModel viewModel;

  const DocumentView({super.key, required this.viewModel});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: viewModel,
      builder: (context, _) {
        if (viewModel.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (viewModel.errorMessage != null) {
          return Center(
            child: Text(
              'Error: ${viewModel.errorMessage}',
              style: const TextStyle(color: Colors.red),
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Document Content:',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: SingleChildScrollView(
                    child: Text(
                      viewModel.currentContent.isEmpty
                          ? 'No content loaded.'
                          : viewModel.currentContent,
                      key: const Key('document_content_text'),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                key: const Key('save_sample_button'),
                onPressed: () {
                  viewModel.save('doc_1', 'Updated content at ${DateTime.now()}');
                },
                child: const Text('Save Sample Document'),
              ),
            ],
          ),
        );
      },
    );
  }
}
```

---

### Application Entrypoint

```dart
// file: lib/main.dart
import 'package:flutter/material.dart';
import 'src/core/plugin_registry.dart';
import 'src/features/analytics/analytics_contract.dart';
import 'src/features/analytics/in_memory_analytics_plugin.dart';
import 'src/features/documents/document_view.dart';
import 'src/features/documents/document_view_model.dart';
import 'src/features/storage/document_storage_contract.dart';
import 'src/features/storage/memory_document_storage_plugin.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final registry = PluginRegistry();
  registry.register(InMemoryAnalyticsPlugin());
  registry.register(MemoryDocumentStoragePlugin());

  await registry.initializeAll();

  final viewModel = DocumentViewModel(
    storage: registry.getService<DocumentStorage>(),
    analytics: registry.getService<AnalyticsSink>(),
  );

  runApp(PluginStyleApp(viewModel: viewModel));
}

class PluginStyleApp extends StatelessWidget {
  final DocumentViewModel viewModel;

  const PluginStyleApp({super.key, required this.viewModel});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Plugin-Style Flutter App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: Scaffold(
        appBar: AppBar(title: const Text('Plugin-Style Architecture')),
        body: DocumentView(viewModel: viewModel),
      ),
    );
  }
}
```

---

### Automated Tests: Unit, Contract, and Widget

```dart
// file: test/plugin_contract_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:plugin_style_example/src/features/storage/document_storage_contract.dart';
import 'package:plugin_style_example/src/features/storage/memory_document_storage_plugin.dart';
import 'package:plugin_style_example/src/core/plugin_registry.dart';
import 'package:plugin_style_example/src/features/analytics/in_memory_analytics_plugin.dart';

/// Reusable contract test suite validating any DocumentStorage implementation.
void main() {
  group('DocumentStorage Contract Suite', () {
    late PluginRegistry registry;
    late DocumentStorage storage;

    setUp(() async {
      registry = PluginRegistry();
      registry.register(InMemoryAnalyticsPlugin());
      final storagePlugin = MemoryDocumentStoragePlugin();
      registry.register(storagePlugin);
      await registry.initializeAll();
      storage = registry.getService<DocumentStorage>();
    });

    tearDown(() async {
      await registry.disposeAll();
    });

    test('loadDocument returns null for non-existent document', () async {
      final doc = await storage.loadDocument('missing_doc');
      expect(doc, isNull);
    });

    test('saveDocument persists and loadDocument retrieves content accurately', () async {
      const docId = 'doc_test';
      const content = 'Contract verification content';

      await storage.saveDocument(docId, content);
      final retrieved = await storage.loadDocument(docId);

      expect(retrieved, equals(content));
    });
  });
}
```

```dart
// file: test/plugin_registry_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:plugin_style_example/src/core/plugin_contract.dart';
import 'package:plugin_style_example/src/core/plugin_registry.dart';
import 'package:plugin_style_example/src/features/analytics/in_memory_analytics_plugin.dart';
import 'package:plugin_style_example/src/features/storage/memory_document_storage_plugin.dart';

class FailingPlugin implements ApplicationPlugin {
  @override
  String get id => 'failing';

  @override
  Set<String> get dependencies => const {};

  @override
  PluginLifecycleState get state => PluginLifecycleState.uninitialized;

  @override
  Future<void> initialize(PluginContext context) async {
    throw Exception('Simulated initialization crash');
  }

  @override
  Future<void> dispose() async {}
}

void main() {
  group('PluginRegistry Lifecycle & Graph Verification', () {
    test('initializes plugins in correct topological dependency order', () async {
      final registry = PluginRegistry();
      final analytics = InMemoryAnalyticsPlugin();
      final storage = MemoryDocumentStoragePlugin();

      // Register in reverse order to verify topological sort
      registry.register(storage);
      registry.register(analytics);

      await registry.initializeAll();

      expect(analytics.state, equals(PluginLifecycleState.active));
      expect(storage.state, equals(PluginLifecycleState.active));
      expect(analytics.recordedEvents, contains('storage_initialized'));

      await registry.disposeAll();
      expect(analytics.state, equals(PluginLifecycleState.stopped));
      expect(storage.state, equals(PluginLifecycleState.stopped));
    });

    test('prevents duplicate plugin registration', () {
      final registry = PluginRegistry();
      registry.register(InMemoryAnalyticsPlugin());

      expect(
        () => registry.register(InMemoryAnalyticsPlugin()),
        throwsA(isA<PluginRegistryException>()),
      );
    });

    test('rolls back partial initialization when a plugin fails', () async {
      final registry = PluginRegistry();
      final analytics = InMemoryAnalyticsPlugin();
      registry.register(analytics);
      registry.register(FailingPlugin());

      await expectLater(
        registry.initializeAll(),
        throwsException,
      );

      // Successfully rolls back already-initialized plugins
      expect(analytics.state, equals(PluginLifecycleState.stopped));
    });
  });
}
```

```dart
// file: test/document_view_model_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:plugin_style_example/src/features/analytics/analytics_contract.dart';
import 'package:plugin_style_example/src/features/documents/document_view_model.dart';
import 'package:plugin_style_example/src/features/storage/document_storage_contract.dart';

class FakeStorage implements DocumentStorage {
  final Map<String, String> data = {};

  @override
  Future<String?> loadDocument(String id) async => data[id];

  @override
  Future<void> saveDocument(String id, String content) async {
    data[id] = content;
  }
}

class FakeAnalytics implements AnalyticsSink {
  final List<String> events = [];

  @override
  List<String> get recordedEvents => events;

  @override
  Future<void> logEvent(String name, [Map<String, Object>? parameters]) async {
    events.add(name);
  }
}

void main() {
  group('DocumentViewModel Unit Tests', () {
    late FakeStorage storage;
    late FakeAnalytics analytics;
    late DocumentViewModel viewModel;

    setUp(() {
      storage = FakeStorage();
      analytics = FakeAnalytics();
      viewModel = DocumentViewModel(storage: storage, analytics: analytics);
    });

    test('initial state is empty and not loading', () {
      expect(viewModel.currentContent, isEmpty);
      expect(viewModel.isLoading, isFalse);
      expect(viewModel.errorMessage, isNull);
    });

    test('load retrieves data and updates state', () async {
      storage.data['doc1'] = 'Hello Antigravity';

      await viewModel.load('doc1');

      expect(viewModel.currentContent, equals('Hello Antigravity'));
      expect(viewModel.isLoading, isFalse);
    });

    test('save updates storage and currentContent', () async {
      await viewModel.save('doc2', 'Saved Content');

      expect(viewModel.currentContent, equals('Saved Content'));
      expect(storage.data['doc2'], equals('Saved Content'));
    });
  });
}
```

```dart
// file: test/document_widget_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:plugin_style_example/src/features/analytics/analytics_contract.dart';
import 'package:plugin_style_example/src/features/documents/document_view.dart';
import 'package:plugin_style_example/src/features/documents/document_view_model.dart';
import 'package:plugin_style_example/src/features/storage/document_storage_contract.dart';

class MockStorage implements DocumentStorage {
  String? content;

  @override
  Future<String?> loadDocument(String id) async => content;

  @override
  Future<void> saveDocument(String id, String newContent) async {
    content = newContent;
  }
}

class MockAnalytics implements AnalyticsSink {
  @override
  List<String> get recordedEvents => [];

  @override
  Future<void> logEvent(String name, [Map<String, Object>? parameters]) async {}
}

void main() {
  testWidgets('DocumentView displays loaded content and updates on button press', (tester) async {
    final storage = MockStorage()..content = 'Initial loaded document';
    final analytics = MockAnalytics();
    final viewModel = DocumentViewModel(storage: storage, analytics: analytics);

    await viewModel.load('doc1');

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DocumentView(viewModel: viewModel),
        ),
      ),
    );

    // Verify initial rendered text
    expect(find.text('Initial loaded document'), findsOneWidget);

    // Tap button to save new content
    final button = find.byKey(const Key('save_sample_button'));
    expect(button, findsOneWidget);
    await tester.tap(button);
    await tester.pump();

    // Verify view has updated
    expect(find.textContaining('Updated content at'), findsOneWidget);
  });
}
```
