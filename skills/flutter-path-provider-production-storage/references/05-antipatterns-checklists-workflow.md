# Anti-patterns, code examples, security/performance/reliability audits, implementation workflow, completion/source notes

## Contents

- [73. Anti-Patterns](#73-anti-patterns)
    - [Storage-selection anti-patterns](#storage-selection-anti-patterns)
    - [Path anti-patterns](#path-anti-patterns)
    - [Android anti-patterns](#android-anti-patterns)
    - [I/O anti-patterns](#io-anti-patterns)
    - [Security/privacy anti-patterns](#securityprivacy-anti-patterns)
    - [Architecture anti-patterns](#architecture-anti-patterns)
- [74. Bad vs Improved Code](#74-bad-vs-improved-code)
    - [Bad](#bad)
    - [Improved](#improved)
- [75. Security Checklist](#75-security-checklist)
- [76. Performance Checklist](#76-performance-checklist)
- [77. Reliability Checklist](#77-reliability-checklist)
- [78. Repository Audit Checklist](#78-repository-audit-checklist)
- [79. AI Coding-Agent Implementation Workflow](#79-ai-coding-agent-implementation-workflow)
  - [Step 1 — Inspect](#step-1-inspect)
  - [Step 2 — Classify data](#step-2-classify-data)
  - [Step 3 — Choose semantics](#step-3-choose-semantics)
  - [Step 4 — Verify platform support](#step-4-verify-platform-support)
  - [Step 5 — Build portable paths](#step-5-build-portable-paths)
  - [Step 6 — Design I/O](#step-6-design-io)
  - [Step 7 — Define cleanup](#step-7-define-cleanup)
  - [Step 8 — Define failure recovery](#step-8-define-failure-recovery)
  - [Step 9 — Implement](#step-9-implement)
  - [Step 10 — Validate security/privacy](#step-10-validate-securityprivacy)
  - [Step 11 — Optimize](#step-11-optimize)
  - [Step 12 — Test](#step-12-test)
  - [Step 13 — Validate real platforms](#step-13-validate-real-platforms)
- [80. Senior-Level Operating Rules](#80-senior-level-operating-rules)
- [81. Completion Criteria](#81-completion-criteria)
- [82. Source Reconciliation Notes](#82-source-reconciliation-notes)
- [83. Primary Source References](#83-primary-source-references)
    - [`path_provider`](#pathprovider)
    - [Current official platform implementations](#current-official-platform-implementations)
    - [Android platform guidance](#android-platform-guidance)
    - [Apple platform guidance](#apple-platform-guidance)
    - [Windows and Linux platform conventions](#windows-and-linux-platform-conventions)
    - [Dart and Flutter runtime guidance](#dart-and-flutter-runtime-guidance)
- [84. Final Principle](#84-final-principle)

<!-- BEGIN SOURCE -->
# 73. Anti-Patterns

Reject these during review.

### Storage-selection anti-patterns

- Documents for every file.
- Primary DB in Temporary.
- Primary DB in Cache.
- Reproducible thumbnails in backup-oriented persistent storage without reason.
- Internal implementation files in user-facing Downloads.
- User-owned exports in disposable cache.
- Offline-required files labeled “cache” despite loss breaking product guarantees.
- Treating Temporary as next-launch persistence.
- Treating Cache as permanent.

### Path anti-patterns

- `/storage/emulated/0/...`
- `/sdcard/...`
- `/Users/...`
- `C:\Users\...`
- `/home/...`
- `'${directory.path}/file.db'`
- untrusted path components passed directly to `p.join`;
- raw emails/usernames used as directory names;
- simple string-prefix containment used as a security boundary.

### Android anti-patterns

- saying external storage means SD card;
- treating app-specific external storage as public shared storage;
- requesting broad storage permission for private/app-specific files;
- using legacy storage permissions by default;
- assuming Android `getDownloadsDirectory()` is public global Downloads;
- ignoring scoped storage;
- using `MANAGE_EXTERNAL_STORAGE` as a convenience shortcut.

### I/O anti-patterns

- `readAsBytes()` for a huge video when streaming suffices;
- `source.readAsBytes()` followed by `destination.writeAsBytes()` for a copy;
- `listSync(recursive: true)` over large trees on startup;
- sync file I/O in UI-critical execution;
- rewriting unchanged large files;
- flushing every cache mutation;
- unbounded log/cache growth.

### Security/privacy anti-patterns

- secrets in ordinary files with no threat-model review;
- tokens in cache;
- sensitive export data in shared locations unintentionally;
- logging raw private paths/content;
- recursive deletion using user-provided input;
- account cache retained after logout despite a requirement to purge it;
- trusting file extensions/names from external sources.

### Architecture anti-patterns

- path-provider calls from every widget `build()`;
- raw `Directory` state propagated through UI architecture;
- four abstraction layers around three directory calls;
- a new storage subsystem parallel to an existing repository policy.

---

# 74. Bad vs Improved Code

### Bad

```
import 'dart:io';

import 'package:path_provider/path_provider.dart';

List<int> loadCacheSynchronously() {
  final file = File(
    '/storage/emulated/0/Android/data/com.example.app/cache/data.bin',
  );

  return file.readAsBytesSync();
}

Future<void> saveDatabase() async {
  final temp = await getTemporaryDirectory();
  final db = File('${temp.path}/primary.db');
  await db.writeAsBytes(<int>[1, 2, 3]);
}

```

Problems:

- hardcoded Android path;
- assumes external layout;
- synchronous I/O;
- primary DB in disposable storage;
- manual separator.

### Improved

```
import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

Future<List<int>> loadSmallCacheFile() async {
  final cache = await getApplicationCacheDirectory();
  final file = File(
    p.join(
      cache.path,
      'data.bin',
    ),
  );

  return file.readAsBytes();
}

Future<File> savePersistentDatabaseBytes(
  List<int> bytes,
) async {
  final support = await getApplicationSupportDirectory();
  final databaseDirectory = Directory(
    p.join(
      support.path,
      'database',
    ),
  );

  await databaseDirectory.create(recursive: true);

  final database = File(
    p.join(
      databaseDirectory.path,
      'primary.db',
    ),
  );

  await database.writeAsBytes(bytes);
  return database;
}

```

For a real database, use the database engine's own open/write/transaction APIs rather than treating its database file as arbitrary bytes.

---

# 75. Security Checklist

Before approval:

-  No secret is stored in an ordinary file without a threat-model decision.
-  No untrusted value is used as a raw path component.
-  Path traversal is prevented.
-  Absolute external path components cannot escape the intended root.
-  Recursive deletion roots are controlled and validated.
-  Symlink behavior is reviewed where untrusted filesystem contents matter.
-  Export/shared locations are treated as less private than app-internal storage.
-  Cache/temp content has been reviewed for sensitive data.
-  Account files are segregated with stable internal IDs.
-  Logout/account-removal cleanup is defined.
-  Sensitive filenames/full paths are not exposed in logs.
-  Backup implications are reviewed.
-  Android storage permissions are no broader than necessary.
-  Filesystem privacy is not confused with encryption.

---

# 76. Performance Checklist

-  Directory lookup is not performed in widget build loops or tight loops.
-  Frequently reused stable roots may be cached within a scoped service.
-  Large directory scans are not performed unnecessarily.
-  Sync I/O is absent from latency-sensitive UI paths.
-  Large files are streamed or handed to file-backed APIs.
-  Plain file copies use `File.copy()` rather than byte round-trips.
-  Duplicate in-memory buffers are minimized.
-  Cache is bounded when growth matters.
-  Cleanup does not block startup without need.
-  Large migrations are intentionally scheduled.
-  Unchanged files are not rewritten repeatedly.
-  Frequent flushes have a demonstrated durability requirement.
-  Storage performance is measured across the full read/decode/transform/write pipeline before optimization.

---

# 77. Reliability Checklist

-  Directory category matches data lifecycle.
-  Temporary/cache loss is tolerated.
-  Irreplaceable data is persistent.
-  Primary DB is not in temp/cache.
-  Disk-full/write failures are handled.
-  Nullable directory APIs are handled.
-  Unsupported APIs are feature-gated.
-  External/removable storage disappearance is handled.
-  Cache corruption is recoverable.
-  Migrations are idempotent/resumable.
-  Old data is deleted only after successful migration.
-  User exports cannot be accidentally deleted by cache cleanup.
-  Logout/account data policy is explicit.
-  Reinstall survival is never assumed.
-  Persisted absolute application-container paths have been eliminated or justified.
-  Concurrent writers are coordinated.
-  Backup behavior is appropriate.

---

# 78. Repository Audit Checklist

When reviewing existing code, actively search for:

- database in Temporary/Cache;
- cache in Documents;
- internal data in user-visible directories;
- user-owned files in Cache;
- hardcoded absolute roots;
- string-concatenated separators;
- legacy Android broad-storage permissions;
- assumption that external storage means SD card;
- assumption that Downloads always exists;
- secrets in plain files;
- huge `readAsBytes()` calls;
- sync reads/writes in UI paths;
- recursive startup scans;
- unbounded caches;
- logs without rotation;
- unsafe user filenames;
- `../` traversal paths;
- stale migration files;
- `!` on optional directories;
- repeated path-provider calls from widgets;
- direct `dart:io` in web code;
- raw absolute sandbox paths persisted in a database.

---

# 79. AI Coding-Agent Implementation Workflow

## Step 1 — Inspect

Read the repository's SDK/dependency/platform/storage architecture before editing.

## Step 2 — Classify data

Determine:

- lifecycle;
- recoverability;
- ownership;
- sensitivity;
- visibility;
- backup requirement;
- size.

## Step 3 — Choose semantics

Select the smallest correct storage category.

Do not choose based on whichever directory API is familiar.

## Step 4 — Verify platform support

Check every actual target platform and the repository's resolved plugin version.

## Step 5 — Build portable paths

Use `Directory`, `File`, and `package:path`.

Never hardcode separators or roots.

## Step 6 — Design I/O

Choose:

- whole-file async read/write;
- stream;
- direct file copy;
- database;
- native media/document API

according to size and ownership.

## Step 7 — Define cleanup

Specify:

- owner;
- expiration;
- size bound;
- deletion trigger;
- logout/account behavior.

## Step 8 — Define failure recovery

Plan for:

- missing file;
- cache eviction;
- disk full;
- permission failure;
- unavailable external storage;
- corruption;
- partial migration.

## Step 9 — Implement

Use APIs compatible with the repository's pinned `path_provider` version.

## Step 10 — Validate security/privacy

Review:

- path traversal;
- secrets;
- backup;
- sharing;
- log redaction;
- account isolation.

## Step 11 — Optimize

Profile actual costs.

Do not optimize directory lookup while ignoring gigabyte copies or expensive serialization.

## Step 12 — Test

Run, as applicable:

```
dart format .
flutter analyze
flutter test

```

Then run relevant integration tests.

## Step 13 — Validate real platforms

Verify actual filesystem behavior on representative Android/iOS/macOS/Windows/Linux targets when feature semantics depend on the OS.

---

# 80. Senior-Level Operating Rules

An AI coding agent applying this skill must follow these rules:

1. Inspect repository storage behavior before changing it.
2. Classify data before selecting a directory.
3. Treat temporary and cache data as disposable.
4. Never place irreplaceable data in Temporary or Cache.
5. Do not put every persistent file in Documents.
6. Prefer Application Support for internal persistent app data where its semantics fit.
7. Use user-visible/export locations only when product behavior requires them.
8. Never hardcode filesystem roots.
9. Use `path.join` rather than manual path separators.
10. Verify platform support and nullability before calling optional directory APIs.
11. Do not request Android storage permissions for app-private/app-specific storage unless current requirements genuinely require them.
12. Treat Android external storage as app-specific platform storage, not unrestricted shared storage.
13. Respect Android scoped storage.
14. Use SAF/MediaStore/system document flows when user/shared storage semantics demand them.
15. Avoid sync filesystem I/O on latency-sensitive UI paths.
16. Stream large files.
17. Avoid `file → bytes → file` copies.
18. Define cache eviction.
19. Define cleanup ownership.
20. Treat user-controlled filenames as untrusted.
21. Prevent path traversal.
22. Do not use an app-private filesystem directory as a substitute for secure storage.
23. Review backup implications.
24. Never assume files survive uninstall/reinstall.
25. Do not assume application updates clear old files.
26. Do not scan large directory trees at startup without a demonstrated need.
27. Do not persist unstable absolute sandbox paths without necessity.
28. Profile the actual storage pipeline before optimizing directory lookup.
29. Keep filesystem architecture proportional to repository complexity.
30. Make user ownership explicit: app-owned storage and user-owned exports have different cleanup rules.

---

# 81. Completion Criteria

A storage change is not complete merely because this succeeds:

```
final directory = await getApplicationDocumentsDirectory();

```

Confirm all of the following:

-  The directory matches the data's lifecycle.
-  The installed package version supports the API.
-  Every target platform has been checked.
-  Cache/temp loss does not break correctness.
-  Persistent data is not stored in disposable locations.
-  User-owned files are treated as user-owned.
-  Export/save UX matches platform expectations.
-  Backup behavior is understood.
-  Sensitive data has appropriate protection.
-  Android permissions are minimal.
-  Scoped-storage requirements are respected.
-  Paths are constructed portably.
-  Nullable locations are handled.
-  Large files avoid unnecessary memory copies.
-  Synchronous I/O does not block critical UI interactions.
-  Cache eviction exists where needed.
-  Cleanup ownership is explicit.
-  Disk-full and I/O failures are handled.
-  Account/logout behavior is intentional.
-  Migrations are resumable and non-destructive.
-  Reinstall survival is not assumed.
-  Hardcoded filesystem roots are absent.
-  Analyzer passes.
-  Relevant unit tests pass.
-  Platform-specific behavior is integration-tested where it matters.

---

# 82. Source Reconciliation Notes

Several current details are sufficiently non-obvious that agents should reverify them during future upgrades.

**Android Documents:** the current Android federated implementation maps it to a private `context.getDir("flutter", MODE_PRIVATE)` location. Do not infer shared public Documents from the API name.

**Android Downloads:** the current implementation derives this from app-specific external storage with the Downloads type. It is not unrestricted public Downloads.

**Foundation Temporary:** current Foundation implementation maps `getTemporaryDirectory()` to `NSCachesDirectory`. Depend on disposable semantics, not an assumed literal `/tmp` mapping.

**Foundation Library:** current implementation maps `getLibraryDirectory()` to `NSLibraryDirectory`, despite a top-level documentation example that references Application Support. Treat the resolved implementation as authoritative for exact native mapping and recheck on upgrades.

**Linux:** XDG/environment configuration influences paths and user Documents/Downloads resolution may be unavailable.

**Windows:** current implementation uses Known Folder APIs. Never replace those with remembered absolute `C:\Users\...`paths.

---

# 83. Primary Source References

Research for this skill prioritizes first-party sources.

### `path_provider`

Current pub package metadata, platform matrix, requirements, testing note, and federated dependencies.

Current package changelog covering SDK requirements, Downloads/cache additions, federated transitions, null/error behavior, and historical storage changes.

Current API documentation for Temporary, Support, Documents, Cache, Downloads, Library, and Android external APIs.

### Current official platform implementations

Android implementation and actual native directory calls.

Foundation iOS/macOS implementation and macOS application subdirectory behavior.

Linux XDG/TMPDIR implementation.

Windows Known Folder/temp implementation.

### Android platform guidance

App-specific internal/external storage, permissions, cache, uninstall semantics, scoped storage, shared storage, SAF, MediaStore, and all-files access.

Android backup rules and cache exclusions.

### Apple platform guidance

Apple filesystem placement, Documents/Application Support/Caches/tmp semantics, backup behavior, and update/container behavior.

Apple file-sharing/document visibility and macOS App Sandbox/user-selected access.

### Windows and Linux platform conventions

Microsoft Known Folder definitions for Documents, Downloads, LocalAppData, and RoamingAppData.

Freedesktop XDG base-directory conventions.

### Dart and Flutter runtime guidance

Dart asynchronous filesystem I/O, large-file streaming, listing, copying, renaming, directory creation/deletion, filesystem exceptions, flushing, locks, and symbolic-link resolution.

Flutter isolate guidance for separating CPU-heavy work from ordinary asynchronous I/O and for registered background-isolate platform communication.

---

# 84. Final Principle

> **Choose storage by data semantics first: lifecycle, recoverability, ownership, visibility, backup requirements, sensitivity, and size. Use ****`path_provider`**** only to obtain the platform-correct location, then design file I/O, cleanup, security, migration, and persistence deliberately around that data.**

A senior storage implementation is correct not when it “has a path,” but when loss, upgrade, uninstall, cache eviction, backup, sharing, disk pressure, concurrency, migration, and platform differences all behave intentionally.<!-- END SOURCE -->
