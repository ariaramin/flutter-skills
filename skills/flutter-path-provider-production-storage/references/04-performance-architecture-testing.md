# Small-file scaling, startup/performance, architecture, state management, testing, failure testing, desktop/mobile UX

## Contents

- [61. Thousands of Small Files](#61-thousands-of-small-files)
- [62. Startup Performance](#62-startup-performance)
- [63. Directory Lookup Performance](#63-directory-lookup-performance)
- [64. Memory and I/O Efficiency](#64-memory-and-io-efficiency)
- [65. Battery Efficiency](#65-battery-efficiency)
- [66. State Management](#66-state-management)
- [67. Architecture Guidance](#67-architecture-guidance)
- [68. Testing](#68-testing)
    - [Unit tests should test](#unit-tests-should-test)
    - [Integration tests should test](#integration-tests-should-test)
- [69. Failure Testing](#69-failure-testing)
- [70. Cross-Platform Feature Gating](#70-cross-platform-feature-gating)
- [71. Desktop UX](#71-desktop-ux)
- [72. Mobile UX](#72-mobile-ux)

<!-- BEGIN SOURCE -->
# 61. Thousands of Small Files

A filesystem is not automatically a database.

Thousands or millions of tiny JSON files can cause:

- metadata I/O;
- slow listings;
- migration complexity;
- cache cleanup cost;
- inode/directory overhead;
- startup scanning;
- difficult transaction semantics.

Consider:

- SQLite;
- an existing object store;
- grouped files;
- indexed cache metadata;
- archive/container formats when appropriate.

Do not replace structured storage with thousands of files simply because `File.writeAsString()` is convenient.

---

# 62. Startup Performance

Avoid doing these before first frame without demonstrated necessity:

- recursively scanning all app storage;
- calculating full cache size;
- decoding large JSON files;
- cleaning huge caches synchronously;
- migrating gigabytes of media;
- resolving every possible directory eagerly;
- opening files the current flow does not need.

Preferred design:

- initialize lazily;
- resolve a stable base directory once per scoped storage service when frequently reused;
- complete migrations required before opening critical databases;
- defer nonessential cleanup;
- measure actual startup impact.

Directory lookup usually is not the dominant cost relative to file I/O, decoding, compression, encryption, database work, and recursive traversal. Do not optimize path lookup without measurement.

---

# 63. Directory Lookup Performance

Do not call path-provider APIs from:

- `build()`;
- animation callbacks;
- tight loops;
- every individual file operation when the same stable category is repeatedly used.

A scoped service may resolve a stable directory once:

```
import 'dart:io';

import 'package:path_provider/path_provider.dart';

final class StorageRoots {
  StorageRoots();

  late final Future<Directory> support =
      getApplicationSupportDirectory();

  late final Future<Directory> cache =
      getApplicationCacheDirectory();

  late final Future<Directory> temporary =
      getTemporaryDirectory();
}

```

This is enough for many applications.

Do not build:

```
PathRepository
  -> PathUseCase
    -> PathService
      -> DirectoryManager

```

to avoid three Future calls.

---

# 64. Memory and I/O Efficiency

Avoid:

- eager whole-file reads for large data;
- source → Dart bytes → destination for a plain copy;
- duplicate byte arrays through unnecessary transforms;
- converting huge directory streams to lists;
- rewriting an unchanged file;
- frequent flushes without a durability requirement;
- repeated metadata scans.

Profile the complete pipeline:

```
directory resolution
→ open
→ read
→ deserialize
→ decompress/decrypt
→ transform
→ serialize
→ write

```

The slowest part is not necessarily `path_provider`.

---

# 65. Battery Efficiency

Filesystem and CPU work consume energy.

Avoid:

- polling the filesystem;
- frequent full-cache scans;
- rewriting metadata on every minor state change;
- unnecessary copies;
- excessive flushes;
- constant cleanup.

Batch operations when product semantics allow.

If cleanup is expensive, perform it outside latency-sensitive interactions. Do not add a background execution framework solely to delete a few small files.

---

# 66. State Management

Do not put `Directory` objects in Bloc/Riverpod/UI state unless the UI genuinely presents filesystem concepts.

Prefer product state:

```
DownloadState.availableOffline
DownloadState.downloading
DownloadState.failed
ExportState.saved
ExportState.locationUnavailable

```

Filesystem paths and directory policy belong near infrastructure boundaries.

Pass a path string only when an external API requires it; otherwise use `File` and `Directory` around filesystem operations.

---

# 67. Architecture Guidance

A small semantic abstraction is justified when it centralizes meaningful policy.

```
import 'dart:io';

import 'package:path_provider/path_provider.dart';

abstract interface class AppDirectories {
  Future<Directory> persistentData();

  Future<Directory> cache();

  Future<Directory> temporary();

  Future<Directory?> downloads();
}

final class PathProviderAppDirectories implements AppDirectories {
  late final Future<Directory> _persistentData =
      getApplicationSupportDirectory();

  late final Future<Directory> _cache =
      getApplicationCacheDirectory();

  late final Future<Directory> _temporary =
      getTemporaryDirectory();

  @override
  Future<Directory> persistentData() => _persistentData;

  @override
  Future<Directory> cache() => _cache;

  @override
  Future<Directory> temporary() => _temporary;

  @override
  Future<Directory?> downloads() async {
    try {
      return await getDownloadsDirectory();
    } on UnsupportedError {
      return null;
    }
  }
}

```

This abstraction is useful when it improves:

- testing;
- storage policy;
- account segmentation;
- migration;
- cross-platform feature gating.

Do not add it merely to rename four functions.

Keep directory policy, serialization, database access, and file I/O separate only when repository complexity benefits from that separation.

---

# 68. Testing

Do not write ordinary unit tests into real app storage.

For application-level tests, inject test-controlled directories.

Example test helper:

```
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

abstract interface class TestDirectories {
  Directory get persistent;
  Directory get cache;
  Directory get temporary;
}

final class LocalTestDirectories implements TestDirectories {
  LocalTestDirectories(this.root);

  final Directory root;

  @override
  Directory get persistent => Directory(
        '${root.path}${Platform.pathSeparator}persistent',
      );

  @override
  Directory get cache => Directory(
        '${root.path}${Platform.pathSeparator}cache',
      );

  @override
  Directory get temporary => Directory(
        '${root.path}${Platform.pathSeparator}temporary',
      );

  Future<void> create() async {
    await persistent.create(recursive: true);
    await cache.create(recursive: true);
    await temporary.create(recursive: true);
  }
}

void main() {
  late Directory root;
  late LocalTestDirectories directories;

  setUp(() async {
    root = await Directory.systemTemp.createTemp(
      'path-provider-skill-test-',
    );
    directories = LocalTestDirectories(root);
    await directories.create();
  });

  tearDown(() async {
    if (await root.exists()) {
      await root.delete(recursive: true);
    }
  });

  test('persistent test data stays separate from cache', () async {
    final persistentFile = File(
      '${directories.persistent.path}'
      '${Platform.pathSeparator}'
      'record.txt',
    );
    final cacheFile = File(
      '${directories.cache.path}'
      '${Platform.pathSeparator}'
      'record.txt',
    );

    await persistentFile.writeAsString('persistent');
    await cacheFile.writeAsString('cache');

    expect(await persistentFile.readAsString(), 'persistent');
    expect(await cacheFile.readAsString(), 'cache');
    expect(persistentFile.path, isNot(cacheFile.path));
  });
}

```

In production-quality repository code, use `package:path` in the test helper too; the explicit separator here demonstrates that tests remain isolated from path-provider-managed production roots.

At the plugin-wrapper level, official `path_provider` tests replace `PathProviderPlatform.instance` with a fake platform implementation. Use that technique when testing your adapter's response to null/unsupported platform behavior rather than testing Dart file logic.

### Unit tests should test

- directory-selection policy;
- controlled child-path construction;
- cleanup;
- migration;
- missing files;
- cache corruption;
- null/unavailable optional locations;
- account segregation;
- error translation.

### Integration tests should test

- actual database persistence;
- platform-specific Downloads behavior;
- Android external storage;
- export/share flows;
- sandbox/entitlement behavior;
- migrations from real previous versions.

Do not write tests merely proving that the plugin itself can return a temporary directory.

---

# 69. Failure Testing

Where practical, exercise:

- missing source file;
- deleted cache entry;
- unavailable external storage;
- read-only destination;
- failed export;
- interrupted migration;
- corrupted cache metadata;
- duplicate filename/collision;
- low-storage behavior on representative devices/emulators.

Disk-full simulation is platform/tooling-specific; at minimum ensure production code correctly propagates/recovers from a write `FileSystemException`.

---

# 70. Cross-Platform Feature Gating

If a location is unavailable:

- disable the feature;
- offer an alternate **semantically correct** location;
- or invoke the platform's native save/document workflow.

Do not silently redirect:

```
"Save to Downloads"

```

to:

```
private Application Support directory

```

and tell the user that the export succeeded in Downloads.

Feature semantics outrank implementation convenience.

---

# 71. Desktop UX

Desktop users commonly expect control over document/export destinations.

For:

- Save;
- Save As;
- Export;
- Open;

prefer standard desktop file-selection UX when the product represents a user-owned file.

Application Support remains appropriate for hidden implementation state.

Do not transplant a mobile-private-storage workflow onto Windows/macOS/Linux without UX review.

---

# 72. Mobile UX

For internal mobile state, app-private directories are normally preferable.

Do not expose:

- internal database files;
- cache artifacts;
- indexes;
- implementation metadata

to user-visible locations.

For user exports, use platform-native sharing/save experiences.

---

<!-- END SOURCE -->
