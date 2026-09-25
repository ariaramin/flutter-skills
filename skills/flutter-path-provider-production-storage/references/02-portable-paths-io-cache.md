# Portable paths, directory creation, I/O, reliable writes, large files, cache, databases, downloads, media

## Contents

- [25. Portable Path Construction](#25-portable-path-construction)
- [26. Do Not Persist Absolute Container Paths Unnecessarily](#26-do-not-persist-absolute-container-paths-unnecessarily)
- [27. Directory Creation](#27-directory-creation)
- [28. File Existence and TOCTOU](#28-file-existence-and-toctou)
- [29. File I/O Strategy](#29-file-io-strategy)
- [30. Resolve the Correct Directory](#30-resolve-the-correct-directory)
    - [30.1 Persistent internal data](#301-persistent-internal-data)
    - [30.2 Reconstructible cache](#302-reconstructible-cache)
    - [30.3 Disposable processing](#303-disposable-processing)
- [31. Reliable Persistent Writes](#31-reliable-persistent-writes)
- [32. Flush Is Not a Magic Durability Switch](#32-flush-is-not-a-magic-durability-switch)
- [33. Large Files](#33-large-files)
- [34. Copy Files Without a Byte Round-Trip](#34-copy-files-without-a-byte-round-trip)
- [35. Downloads Resolution](#35-downloads-resolution)
- [36. Android App-Specific External Storage](#36-android-app-specific-external-storage)
- [37. Cache Cleanup](#37-cache-cleanup)
- [38. Cache Architecture](#38-cache-architecture)
- [39. Directory Size and Listing](#39-directory-size-and-listing)
- [40. Databases](#40-databases)
- [41. Logs](#41-logs)
- [42. Downloaded Assets and Offline Content](#42-downloaded-assets-and-offline-content)
    - [Cacheable asset](#cacheable-asset)
    - [Offline-required application content](#offline-required-application-content)
    - [User-owned download](#user-owned-download)
- [43. Media](#43-media)

<!-- BEGIN SOURCE -->
# 25. Portable Path Construction

Use `package:path`.

Good:

```
import 'dart:io';

import 'package:path/path.dart' as p;

File databaseFile(Directory supportDirectory) {
  return File(
    p.join(
      supportDirectory.path,
      'database',
      'app.sqlite3',
    ),
  );
}

```

Bad:

```
final path = '${directory.path}/database/app.sqlite3';

```

The `path` package applies the target platform's path style. `p.join` also has an important behavior: an absolute later component can discard prior components, so untrusted values must never be passed as supposedly safe relative path segments without validation.

Never hardcode:

```
/storage/emulated/0/...
/sdcard/...
/Users/alice/...
C:\Users\alice\...
/home/alice/...

```

Use platform APIs.

---

# 26. Do Not Persist Absolute Container Paths Unnecessarily

Prefer persisting:

```
accountId = "acc_72..."
relativeAsset = "media/originals/a8f2.jpg"

```

and reconstruct:

```
final file = File(
  p.join(
    currentSupportDirectory.path,
    'accounts',
    accountId,
    relativeAsset,
  ),
);

```

instead of storing the full absolute sandbox path.

This is particularly important on Apple platforms because the application container's absolute location can change across updates.

It also improves migrations and testability on every platform.

---

# 27. Directory Creation

Do not assume every application-created child already exists.

Current `path_provider` documentation explicitly says Support and Cache are auto-created, while Downloads is not guaranteed to exist. Application-created nested directories remain your responsibility.

Use:

```
import 'dart:io';

import 'package:path/path.dart' as p;

Future<Directory> ensureAccountMediaDirectory({
  required Directory supportRoot,
  required String accountId,
}) async {
  final directory = Directory(
    p.join(
      supportRoot.path,
      'accounts',
      accountId,
      'media',
    ),
  );

  return directory.create(recursive: true);
}

```

`Directory.create(recursive: true)` creates missing parents and is safe to call when the directory already exists.

Do not, however, perform redundant directory creation before every tiny operation when a scoped storage service can initialize an owned child once.

---

# 28. File Existence and TOCTOU

Use `File.exists()` or `Directory.exists()` when the existence result is itself part of your decision.

Do not blindly use:

```
if (await file.exists()) {
  return file.readAsBytes();
}

```

for every operation. The file can disappear between the check and read, and the read operation already exposes the real failure.

Prefer:

```
import 'dart:io';

Future<List<int>?> tryRead(File file) async {
  try {
    return await file.readAsBytes();
  } on PathNotFoundException {
    return null;
  }
}

```

Dart exposes filesystem exceptions including path-not-found and access failures.

For external/removable or cache files, assume availability can change and handle the actual operation failure.

---

# 29. File I/O Strategy

Dart's filesystem documentation recommends asynchronous APIs for normal application use because synchronous filesystem operations can block the isolate. Whole-file reads also require memory proportional to the file being loaded; streams are preferable when large data can be processed incrementally.

| OperationMemoryUI responsivenessLarge filesUse when |                                        |                                   |                                  |                                                                            |
| --------------------------------------------------- | -------------------------------------- | --------------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| `readAsBytes()`                                     | O(file size)                           | Async, but allocates whole result | Poor for very large files        | Entire modest file genuinely needed                                        |
| `File.openRead()`                                   | Chunked                                | Async                             | Excellent                        | Streaming upload/hash/parser                                               |
| `writeAsBytes()`                                    | Requires input bytes already in memory | Async                             | Fine when payload already exists | Small/moderate complete payload                                            |
| `File.openWrite()`                                  | Chunked                                | Async                             | Excellent                        | Streaming generated output                                                 |
| `File.copy()`                                       | No application byte round-trip         | Async                             | Excellent                        | Filesystem-to-filesystem copy                                              |
| Sync APIs                                           | Depends                                | Can block isolate                 | Usually poor on UI paths         | Controlled startup/tooling/background contexts with measured justification |

Do not categorically ban synchronous I/O. Ban **unjustified synchronous I/O on latency-sensitive execution paths**.

---

# 30. Resolve the Correct Directory

### 30.1 Persistent internal data

```
import 'dart:io';

import 'package:path_provider/path_provider.dart';

Future<Directory> resolvePersistentDataDirectory() async {
  return getApplicationSupportDirectory();
}

```

### 30.2 Reconstructible cache

```
import 'dart:io';

import 'package:path_provider/path_provider.dart';

Future<Directory> resolveCacheDirectory() async {
  return getApplicationCacheDirectory();
}

```

### 30.3 Disposable processing

```
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

Future<Directory> createExportStagingDirectory() async {
  final root = await getTemporaryDirectory();
  final staging = Directory(
    p.join(root.path, 'export-staging'),
  );
  return staging.create(recursive: true);
}

```

These examples choose a directory according to lifecycle rather than convenience.

---

# 31. Reliable Persistent Writes

A useful resilience pattern for important single-file state is:

1. create/write a temporary sibling;
2. optionally request a filesystem flush when the durability tradeoff warrants it;
3. replace/rename the target;
4. clean the staging file on failure.

This is **not a ****`path_provider`**** feature** and must not be marketed as universally crash-atomic. Dart documents `File.rename`, including cross-filesystem limitations for moves; exact filesystem atomicity remains platform/filesystem-dependent. Keep the staging file on the same target filesystem when using this pattern.

```
import 'dart:io';
import 'dart:math';

import 'package:path/path.dart' as p;

final class PersistentWriteException implements Exception {
  PersistentWriteException(
    this.targetPath,
    this.cause,
  );

  final String targetPath;
  final Object cause;

  @override
  String toString() =>
      'PersistentWriteException(targetPath: $targetPath, cause: $cause)';
}

Future<void> writePersistentBytes({
  required File target,
  required List<int> bytes,
  bool flush = false,
}) async {
  final parent = target.parent;
  await parent.create(recursive: true);

  final nonce = Random.secure().nextInt(0x7fffffff).toRadixString(16);
  final staging = File(
    p.join(
      parent.path,
      '.${p.basename(target.path)}.$nonce.tmp',
    ),
  );

  try {
    await staging.writeAsBytes(
      bytes,
      flush: flush,
    );

    await staging.rename(target.path);
  } on FileSystemException catch (error) {
    try {
      if (await staging.exists()) {
        await staging.delete();
      }
    } on FileSystemException {
      // Preserve the primary failure; stale .tmp cleanup can be retried later.
    }

    throw PersistentWriteException(
      target.path,
      error,
    );
  }
}

```

For databases, prefer the database engine's transaction/WAL/recovery model rather than rebuilding database durability around manual file replacement.

---

# 32. Flush Is Not a Magic Durability Switch

Dart's write APIs document that `flush: true` flushes written data to the filesystem before the returned Future completes. This should not be generalized into a universal promise that every storage controller has committed bits to nonvolatile hardware through every cache layer under every power-loss scenario.

Use flushing when durability requirements justify its latency and I/O cost.

Do not:

- flush every small cache update;
- equate Future completion with transactional durability;
- build critical database semantics on ad hoc file flushing.

---

# 33. Large Files

Never read a multi-hundred-megabyte video or archive into memory merely because you have a `File`.

Use streams:

```
import 'dart:async';
import 'dart:io';

Future<void> processLargeFile({
  required File file,
  required FutureOr<void> Function(List<int> chunk) onChunk,
}) async {
  await for (final chunk in file.openRead()) {
    await onChunk(chunk);
  }
}

```

`File.openRead()` returns a stream of file content, allowing incremental processing rather than allocating the whole file.

Typical streaming uses:

- uploads;
- hashing;
- compression pipelines;
- parsers;
- encryption pipelines designed for streaming;
- media processing APIs that accept file paths or streams.

Distinguish I/O from CPU work. Async filesystem I/O does not automatically need an isolate. Move expensive compression, encryption, parsing, or serialization off the UI isolate when profiling shows CPU-induced jank. Flutter supports platform calls from properly initialized background isolates, but do not move `path_provider` lookups to isolates merely for ceremony.

---

# 34. Copy Files Without a Byte Round-Trip

Bad:

```
final bytes = await source.readAsBytes();
await destination.writeAsBytes(bytes);

```

Preferred:

```
import 'dart:io';

Future<File> copyFile({
  required File source,
  required File destination,
}) async {
  await destination.parent.create(recursive: true);
  return source.copy(destination.path);
}

```

`File.copy()` performs file copying without requiring the application to materialize the entire source into a Dart byte buffer.

For cross-volume moves, do not assume `rename()` always works. Dart explicitly documents that moving between filesystems may require copy-and-delete logic.

---

# 35. Downloads Resolution

Do not silently fall back to a private directory for a user export. Let the feature distinguish “Downloads unavailable” from “I saved somewhere else.”

```
import 'dart:io';

import 'package:path_provider/path_provider.dart';

Future<Directory?> tryResolveDownloadsDirectory() async {
  try {
    return await getDownloadsDirectory();
  } on UnsupportedError {
    return null;
  }
}

```

The caller should then:

- disable the direct Downloads action;
- offer a native Save As/document-picker flow;
- or clearly communicate another semantically valid destination.

`getDownloadsDirectory()` itself is nullable and not guaranteed to produce an existing folder.

---

# 36. Android App-Specific External Storage

A correct current example:

```
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

Future<Directory?> resolveAndroidOfflineMediaDirectory() async {
  if (!Platform.isAndroid) {
    throw UnsupportedError(
      'Android app-specific external storage was requested on a non-Android platform.',
    );
  }

  final externalRoot = await getExternalStorageDirectory();
  if (externalRoot == null) {
    return null;
  }

  final offlineMedia = Directory(
    p.join(
      externalRoot.path,
      'offline-media',
    ),
  );

  return offlineMedia.create(recursive: true);
}

```

This is **app-specific external storage**. Do not add a broad storage permission to make this function work. Do not describe the result as public shared storage or an SD card.

Before each important operation on removable/external storage, be prepared for disappearance or an I/O failure.

---

# 37. Cache Cleanup

Define an application-owned cache subdirectory and delete only within that root.

The following example provides age and total-size bounds without synchronous traversal:

```
import 'dart:io';

final class _CacheEntry {
  const _CacheEntry({
    required this.file,
    required this.size,
    required this.modified,
  });

  final File file;
  final int size;
  final DateTime modified;
}

Future<void> pruneFlatCache({
  required Directory cacheRoot,
  required Duration maxAge,
  required int maxBytes,
  DateTime? now,
}) async {
  if (maxBytes < 0) {
    throw ArgumentError.value(
      maxBytes,
      'maxBytes',
      'Must be non-negative.',
    );
  }

  final clock = now ?? DateTime.now();
  final entries = <_CacheEntry>[];
  var retainedBytes = 0;

  try {
    await for (final entity in cacheRoot.list(
      recursive: false,
      followLinks: false,
    )) {
      if (entity is! File) {
        continue;
      }

      try {
        final stat = await entity.stat();
        final age = clock.difference(stat.modified);

        if (age > maxAge) {
          await entity.delete();
          continue;
        }

        retainedBytes += stat.size;
        entries.add(
          _CacheEntry(
            file: entity,
            size: stat.size,
            modified: stat.modified,
          ),
        );
      } on PathNotFoundException {
        // Another cleanup/OS process already removed it.
      }
    }

    if (retainedBytes <= maxBytes) {
      return;
    }

    entries.sort(
      (left, right) => left.modified.compareTo(right.modified),
    );

    for (final entry in entries) {
      if (retainedBytes <= maxBytes) {
        break;
      }

      try {
        await entry.file.delete();
        retainedBytes -= entry.size;
      } on PathNotFoundException {
        // Already gone; treat it as evicted.
        retainedBytes -= entry.size;
      }
    }
  } on PathNotFoundException {
    // An absent cache root is equivalent to an empty cache.
  }
}

```

`Directory.list()` is asynchronous and streaming; `listSync()` materializes the result synchronously.

This example intentionally handles a **flat, application-owned cache**. If a cache contains millions of entries or complex nested structures, maintain metadata/indexes or use a proven cache subsystem rather than recursively walking the full tree repeatedly.

---

# 38. Cache Architecture

Every managed cache should have:

- an owner;
- an invalidation rule;
- an expiration rule;
- a total-size or count policy when growth can matter;
- corruption recovery;
- logout/account-removal behavior.

Good cache key approaches include:

- stable entity IDs;
- content hashes;
- request hashes;
- generated UUIDs.

Avoid raw URL/user-string filenames when the values can contain separators or private data.

If the repository already uses an established image/network cache package with suitable eviction semantics, do not replace it with a custom filesystem cache merely to standardize on `path_provider`.

---

# 39. Directory Size and Listing

Recursive traversal can be expensive in CPU, metadata I/O, battery, and latency.

Do not run this at every startup:

```
final entities = cache.listSync(recursive: true);

```

For potentially large trees:

```
await for (final entity in root.list(
  recursive: true,
  followLinks: false,
)) {
  // Incremental processing.
}

```

`Directory.list()` produces a stream; synchronous listing returns an eagerly created list.

For very large caches, consider maintaining size metadata incrementally instead of rescanning.

---

# 40. Databases

Primary databases are durable application data.

Default policy:

- prefer Application Support for internal databases when the database package does not already establish another correct platform-specific location;
- never put a primary database in Temporary;
- never put a primary database in Cache;
- do not automatically put every database in Documents;
- do not relocate an existing database without migration and rollback handling.

For SQLite/object-store systems:

- respect the database engine's locking model;
- use transactions for multi-record consistency;
- let the engine manage journals/WAL;
- coordinate migrations before normal access;
- avoid raw file copy while the database is open unless the database explicitly supports the backup procedure.

---

# 41. Logs

Diagnostic logs need deliberate retention.

Choose:

- Cache when logs are disposable diagnostics;
- Support when a bounded diagnostic history is intentionally retained across cache cleanup.

Always define:

- max total size;
- max file count or age;
- rotation;
- privacy redaction;
- deletion on account removal where required;
- export/upload staging.

Do not:

- let logs grow indefinitely;
- log tokens;
- log document contents;
- log raw private filenames unnecessarily;
- expose full sensitive filesystem paths in telemetry.

---

# 42. Downloaded Assets and Offline Content

“Downloaded” describes how bytes arrived, not their lifecycle.

Classify each download.

### Cacheable asset

If it can be fetched again and disappearance does not break correctness:

> Cache.

### Offline-required application content

If the product promises offline availability after cache cleanup:

> Persistent app-owned storage, commonly Support or an intentionally selected Android app-specific external directory.

### User-owned download

If the user expects a file they manage outside the app:

> Shared/user-selected destination, using platform-native save/export mechanisms where appropriate.

Do not use a single `downloads/` directory for all three categories.

---

# 43. Media

Distinguish:

- picked/captured original;
- persistent app-owned copy;
- thumbnail;
- transformed derivative;
- processing intermediate;
- exported media.

Recommended model:

| Media formStorage                   |                                                                |
| ----------------------------------- | -------------------------------------------------------------- |
| Thumbnail                           | Cache                                                          |
| Rebuildable resized image           | Cache                                                          |
| Transcode intermediate              | Temporary                                                      |
| User-owned original                 | Preserve original reference or persistent/user-managed storage |
| App-owned required offline original | Persistent storage                                             |
| Explicit user export                | User-selected/shared destination                               |

Avoid copying original media merely because a local path is convenient if the platform/API can safely reference the existing asset and product semantics allow it.

---

<!-- END SOURCE -->
