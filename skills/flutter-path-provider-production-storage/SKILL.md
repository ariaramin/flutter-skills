---
name: flutter-path-provider-production-storage
description: Design, implement, review, debug, test, secure, migrate, and optimize production Flutter filesystem storage using path_provider. Use whenever a Flutter task involves temporary/cache/support/documents/downloads directories, Android external storage, file persistence, local databases, exports, offline files, cache cleanup, path traversal, filesystem migrations, disk-full handling, large-file I/O, or uncertainty about where app data should live—even if the request only asks “where should I save this file?”.
compatibility: Source baseline targets path_provider 2.1.6 with Flutter 3.38+, Dart 3.10+, Android 24+, iOS 13+, macOS 10.15+, Windows 10+, and Linux. Flutter Web is unsupported. Inspect pubspec.lock and resolved federated implementations before relying on version-sensitive mappings or APIs.
---
# Flutter `path_provider` Production Storage Engineering
Treat `path_provider` as a **directory-location resolver**, not as a storage policy, filesystem, database, encryption layer, cache manager, sharing API, or durability guarantee.
Choose storage from data semantics first:
```text
lifecycle
+ recoverability
+ ownership
+ user visibility
+ backup policy
+ sensitivity
+ size
+ platform support
→ directory category
→ I/O strategy
→ cleanup/migration/security policy
```

## Reference routing
Read only what the task needs:
| Need | Reference |
|---|---|
| Directory semantics, support matrix, Android/iOS/macOS/Windows/Linux mappings | `references/01-storage-semantics-platforms.md` |
| Portable paths, directory creation, async/stream I/O, reliable writes, cache, DBs, downloads, media | `references/02-portable-paths-io-cache.md` |
| Path traversal, symlinks, secrets, privacy, cleanup, multi-account, updates, migrations, sharing, errors, concurrency | `references/03-security-privacy-lifecycle-migrations.md` |
| Startup/performance, architecture, state management, tests, failure tests, desktop/mobile UX | `references/04-performance-architecture-testing.md` |
| Anti-patterns, review checklists, implementation workflow, completion and source-reconciliation notes | `references/05-antipatterns-checklists-workflow.md` |

## 1. Inspect before changing storage
Before editing, inspect:
- `pubspec.yaml` and `pubspec.lock`;
- Flutter/Dart SDK constraints;
- resolved `path_provider` and federated implementation versions;
- target platforms/minimum OS versions;
- Android storage permissions and Gradle/manifest setup;
- Apple entitlements and document/file-sharing settings;
- desktop sandbox/packaging;
- existing database, cache, secure-storage, download/export, migration, logout, and account-cleanup code;
- tests and CI.
Search for:
```text
getTemporaryDirectory
getApplicationSupportDirectory
getApplicationDocumentsDirectory
getApplicationCacheDirectory
getLibraryDirectory
getDownloadsDirectory
getExternalStorageDirectory
getExternalCacheDirectories
getExternalStorageDirectories
Directory.systemTemp
readAsBytes / readAsString / writeAsBytes / writeAsString
*Sync
listSync
recursive:
/storage/ /sdcard/ /Users/ C:\Users\ /home/
```

Flag hardcoded roots, separator concatenation, databases in temp/cache, persistent files in cache, caches in Documents, absolute sandbox paths persisted in DBs, broad Android storage permissions, unsafe filenames, unbounded logs/caches, recursive startup scans, and duplicate storage abstractions.

## 2. Classify the data before choosing a directory
For every file category answer:
1. Is it reconstructible?
2. Can the OS safely delete it?
3. Is it user-generated or user-owned?
4. Must users manage/see it directly?
5. Must it survive restart/cache cleanup?
6. Should it be backed up?
7. Is it sensitive or secret?
8. Must another app access it?
9. Is it an explicit export?
10. Is it temporary processing output?
11. How large can it become?
12. Must the same feature work across which platforms?
Then classify:
```text
lifecycle: ephemeral | cache | persistent | user-owned
recoverability: reproducible | partial | irreplaceable
visibility: app-private | user-visible | shareable
backup: desired | undesired | platform-dependent
sensitivity: public | private | sensitive | secret
size: tiny | moderate | large
```

Do not start with `getApplicationDocumentsDirectory()` and justify it afterward.

## 3. Use semantic directory selection
Default decision model:
| Data semantics | Prefer |
|---|---|
| Disposable staging/intermediate work | Temporary |
| Reconstructible/redownloadable derived data | Application Cache |
| Persistent app-owned internal implementation data | Application Support |
| User-generated/non-recreatable document data | Documents or user-selected save location |
| Explicit user export/download | Platform-appropriate user-selected/shared flow; review Downloads semantics |
| Large Android app-owned data where external capacity is useful | Android app-specific external storage, if disappearance is tolerated |
| Secrets/credentials/keys | Secure-storage/key-management solution, not ordinary `path_provider` files |
### Temporary
Treat as disposable at any time. Never store a primary DB, durable offline state, or irreplaceable user content there.
### Cache
Treat as evictable. If deletion breaks correctness or violates an offline promise, it is not cache data.
### Application Support
Strong default for persistent app-owned internal data such as DBs, config, metadata, and durable internal state when existing libraries do not already define a correct location.
### Documents
Use when document/user-ownership semantics fit. Do not use it as a universal persistent root.
### Downloads
Do not assume “global public Downloads.” Semantics differ materially by platform. Handle null/unavailable resolution and use native Save As/document flows when users are choosing an owned destination.

## 4. Respect platform differences
### Android
Current source baseline maps:
```text
Temporary / Cache → internal cacheDir
Support → filesDir
Documents → private getDir("flutter", MODE_PRIVATE)
Downloads → app-specific external Downloads
External Storage → getExternalFilesDir(null)
External Cache → externalCacheDirs
Typed External Storage → getExternalFilesDirs(type)
```

Depend on categories, not literal mappings.
Rules:
- “external” does not mean SD card;
- app-specific external storage is not arbitrary shared storage;
- broad storage permission is generally unnecessary for app-private/app-specific directories;
- removable/external storage may disappear;
- scoped storage still governs shared files;
- use SAF for user-selected documents/save locations;
- use MediaStore for appropriate shared media;
- do not use `MANAGE_EXTERNAL_STORAGE` as a convenience shortcut.
### iOS/macOS
Treat Documents, Application Support/Library, Caches, and disposable storage according to Apple lifecycle/backup semantics.
Do not persist absolute container paths when a relative logical identifier can be resolved against the current container root.
For macOS user-owned Save/Open flows, respect sandbox and user-selected access semantics.
### Windows/Linux
Use resolved known-folder/XDG semantics; never manufacture user paths.
Desktop cache/uninstall/backup behavior is not identical to mobile. Define application cleanup explicitly where correctness depends on it.
### Web
`path_provider` and ordinary `dart:io` filesystem workflows are not supported. Isolate filesystem implementation behind platform boundaries for apps that also target Web.

## 5. Handle nullable and unsupported directories explicitly
Do not confuse nullable with unsupported.
Potential results include:
```text
Directory
null
UnsupportedError
MissingPlatformDirectoryException
FileSystemException later during use
```

Never add `!` because a directory happened to exist on one machine.
Feature behavior must remain semantically honest:
```text
Downloads unavailable
→ disable direct-download action or offer Save As
```

Do not silently save into private Support and tell the user the file was saved to Downloads.

## 6. Build paths portably
Use `package:path`:
```dart
final file = File(
  p.join(root.path, 'accounts', accountId, 'media', '$id.jpg'),
);
```

Never hardcode `/`, `\\`, `/sdcard`, `/storage/emulated/0`, `/Users/...`, `C:\\Users\\...`, or `/home/...`.
Do not pass untrusted path segments directly to `p.join`. An absolute later segment can replace earlier components.
Prefer app-issued IDs, UUIDs, or hashes for internal file names. Keep display names separate.

## 7. Prefer relative logical persistence over absolute sandbox paths
Persist:
```text
accountId = acc_72
relativeAsset = media/originals/a8f2.jpg
```

Then resolve against the current Support/Documents root.
This improves Apple update resilience, migrations, tests, and portability.
Do not store absolute application-container paths without a specific stable-path requirement.

## 8. Create only owned child directories
`path_provider` may create some category roots, but application child directories are your responsibility.
Use `Directory.create(recursive: true)` for owned descendants.
Do not repeatedly create the same hierarchy before every tiny operation if a scoped storage component can initialize its owned root once.

## 9. Choose I/O from data size and semantics
Default to asynchronous filesystem APIs on UI-sensitive paths.
| Need | Prefer |
|---|---|
| Entire modest file needed | `readAsBytes()` / `readAsString()` async |
| Large upload/hash/parser | `File.openRead()` |
| Streaming generated output | `File.openWrite()` |
| File-to-file copy | `File.copy()` |
| Database consistency | DB engine transaction/WAL/backup mechanisms |
| Huge tree traversal | async `Directory.list()`; ideally metadata/index instead of rescans |
Do not categorically ban sync I/O; ban **unjustified sync I/O on latency-sensitive isolates**.

## 10. Never materialize huge files without need
Reject:
```text
500 MB video → readAsBytes() → second byte copy → write/upload
```

Prefer file-backed/streaming APIs.
For a plain copy, use `File.copy()` instead of `readAsBytes()` followed by `writeAsBytes()`.
Separate I/O from CPU-heavy compression/encryption/parsing. Async I/O itself does not require an isolate; move CPU work only when profiling shows UI-isolate contention.

## 11. Treat persistent writes as a reliability design
For important single-file state, a staging sibling + replace pattern can reduce corruption risk:
```text
create parent
→ write sibling temp on same filesystem
→ optional justified flush
→ rename/replace target
→ clean temp on failure
```

Do not market this as universally crash-atomic; filesystem semantics vary.
For databases, use the database engine's durability model rather than hand-rolling file replacement.
`flush: true` is not a universal hardware-power-loss durability guarantee. Use it only when the latency/I/O cost is justified.

## 12. Avoid TOCTOU-style existence checks by default
Do not always write:
```dart
if (await file.exists()) {
  return file.readAsBytes();
}
```

when the operation itself can report the real failure and the file can disappear between check and use.
Use `exists()` only when existence itself is part of the decision. Otherwise handle `PathNotFoundException`/`FileSystemException` at the operation boundary.

## 13. Design cache as a subsystem
Every managed cache needs:
- owner;
- invalidation rule;
- TTL or freshness rule;
- size/count bound when growth matters;
- corruption recovery;
- logout/account-removal policy.
Do not rely solely on OS cleanup when product limits or privacy require deterministic removal.
Avoid full recursive cache scans on every startup. For large caches, maintain metadata/indexes or use an existing proven cache manager.
Do not replace a mature repository cache package merely to standardize on `path_provider`.

## 14. Keep databases out of temp/cache
Primary DBs are durable data.
Prefer existing database-package conventions; otherwise Application Support is usually the clearest internal persistent category.
Do not relocate an existing DB without an idempotent migration and rollback/recovery plan.
Do not copy an open DB as arbitrary bytes unless the engine explicitly supports that backup procedure.

## 15. Separate downloaded-content semantics
“Downloaded” describes origin, not lifecycle.
Classify as:
```text
redownloadable/reconstructible asset → Cache
promised offline app-owned content → persistent app-owned storage
user-owned export/download → user-selected/shared destination
```

Do not put all three under one `downloads/` policy.

## 16. Treat media by ownership and derivative status
Typical mapping:
```text
thumbnail / rebuildable resize → Cache
transcode intermediate → Temporary
required app-owned offline original → persistent storage
user export → user-selected/shared destination
```

Avoid copying originals merely because another local path feels simpler.

## 17. Defend path boundaries
Treat external identifiers/filenames as untrusted.
Best design: never accept arbitrary filesystem paths for internal storage. Convert external identifiers into controlled names.
For user-controlled relative paths when genuinely required:
- reject absolute paths;
- normalize;
- verify containment;
- account for symlinks if the threat model includes attacker-controlled filesystem contents;
- never use a simple string-prefix test as a security boundary.
Deletion requires stricter validation than reading.
Never recursively delete a root derived from raw UI/network input.

## 18. `path_provider` is not secure storage
App-private filesystem access is not encryption.
Do not store refresh tokens, encryption keys, recovery secrets, or equivalent credentials in ordinary files solely because they live under Support/Documents.
Use keystore/keychain-backed secure storage or an encrypted design with independently protected keys according to the threat model.
Review backup exposure for sensitive persistent data.

## 19. Treat cache/temp privacy seriously
Disposable locations can still contain sensitive plaintext.
For sensitive ephemeral files:
- create only when needed;
- minimize retention;
- delete after processing when policy requires it;
- purge account-scoped sensitive cache on logout/account removal where required;
- avoid private filenames;
- do not depend on eventual OS cleanup for a privacy requirement.

## 20. Define cleanup ownership before writing files
For each category record:
```text
owner
expiration
max bytes/count
replacement policy
delete trigger
logout policy
account-removal policy
user-export exemption
```

Do not delete user-owned exports during cache cleanup.
Do not implement logout as deletion of the whole Support root unless every file genuinely belongs to that account.
Separate global and account-scoped storage with stable internal account IDs.

## 21. Treat upgrades as migrations
App updates generally preserve persistent data.
Expect old schemas, old directory layouts, orphaned files, stale absolute paths, and partial migrations.
A robust migration is:
```text
detect old
→ detect already-completed new state
→ create target
→ stage copy/move
→ verify
→ make new state authoritative
→ persist migration marker/version
→ delete old only after success
→ resume safely after interruption
```

Remember that `rename()` can fail across filesystems; copy + verify + delete may be required.
Never delete critical old data first.

## 22. Never assume reinstall survival
App-private storage is not a portable reinstall contract.
If the product needs reinstall-independent identity/data, design it using server/account state, platform backup semantics, or user-owned storage as appropriate.

## 23. Sharing is not a path problem
A filesystem path does not grant another app access.
Use platform-native mechanisms:
- Android content URI/FileProvider-style sharing, SAF, MediaStore;
- Apple share/document/save flows and macOS sandbox-aware user selection;
- desktop Save As/Open UX for user-owned files.
`path_provider` discovers roots; it is not a sharing or Save As API.

## 24. Handle filesystem failure as normal production reality
Expect:
```text
missing path
access denied/read-only
no space
external storage disappearance
collision
corruption
rename/copy/delete failure
unsupported directory
nullable location unavailable
```

Do not swallow persistent-storage failures with `catch (_) {}`.
Translate errors at the appropriate application boundary while retaining privacy-safe diagnostics.
On disk-full/write failure, preserve the previous valid durable artifact where possible. Do not unconditionally delete all caches or retry forever.

## 25. Coordinate concurrent access
`path_provider` provides no locking.
Prevent races between:
- multiple writers;
- migrations and normal opens;
- cleanup and producers;
- replacement and readers.
Use clear ownership/serialization. For complex mutable state, prefer a transactional database instead of ad hoc shared files.
Do not assume file-lock behavior is identical across POSIX and Windows.

## 26. Do not turn the filesystem into a database accidentally
Thousands/millions of tiny mutable JSON files can create metadata I/O, listings, migration, cleanup, and transaction problems.
Consider SQLite/object stores, indexed cache metadata, grouped files, or another structured storage system when access patterns require it.

## 27. Protect startup and frame latency
Avoid before first frame unless necessary:
- recursive storage scans;
- full cache-size calculation;
- huge JSON decoding;
- giant migrations;
- resolving every directory eagerly;
- cleanup of large trees;
- opening unused files.
Resolve stable roots lazily or once per scoped storage service.
Do not call path-provider APIs from widget `build()`, animation callbacks, or tight loops.
Directory lookup is rarely the dominant cost compared with file I/O, decoding, compression, encryption, DB work, and traversal. Measure the complete pipeline.

## 28. Keep architecture proportional
A small semantic `AppDirectories` abstraction is useful when it centralizes real policy, testing, account segregation, migration, or platform gating.
Do not build:
```text
PathRepository → PathUseCase → PathService → DirectoryManager
```

just to wrap three Future-returning directory calls.
Keep filesystem paths out of UI/business state unless users are explicitly managing files.
Model product state such as:
```text
offline available
download failed
export saved
location unavailable
```

rather than raw `Directory` objects.

## 29. Test application storage policy with controlled roots
Unit-test using temporary test-owned directories, not real app Support/Documents directories.
Test:
- directory-selection policy;
- path construction;
- path traversal rejection;
- cleanup/eviction;
- migration interruption/resume;
- missing/corrupt files;
- unavailable optional locations;
- account segregation;
- error translation.
At adapter level, fake `PathProviderPlatform.instance` when testing plugin-wrapper behavior.
Use integration tests for actual DB persistence, Downloads semantics, Android external storage, sandbox/entitlement behavior, exports/sharing, and real-version migrations.

## 30. Review gates
Reject or escalate code that:
- stores a primary DB in Temporary/Cache;
- treats Cache as durable;
- uses Documents for every persistent file;
- hardcodes OS roots;
- concatenates path separators manually;
- assumes Android external storage is SD/public shared storage;
- requests broad Android storage permission for app-private/app-specific files;
- assumes Downloads always exists or means the same thing everywhere;
- performs huge `readAsBytes()` or recursive `listSync()` on UI/startup paths;
- uses user input directly as a path/deletion root;
- stores secrets as ordinary files without threat-model review;
- persists absolute sandbox paths without necessity;
- leaves caches/logs unbounded;
- assumes upgrades/reinstalls clean or preserve data automatically;
- creates a parallel storage architecture without need.

## Production definition of done
Approve the storage change only when:
- data lifecycle/category is explicit;
- installed package/platform versions are verified;
- every shipped platform's capability/semantics are considered;
- temp/cache loss cannot break correctness;
- persistent/irreplaceable data is in durable semantics;
- user-owned exports have user-owned/save semantics;
- backup/privacy policy is known;
- secrets use appropriate protection;
- Android permissions are minimal and scoped-storage rules respected;
- paths are portable and traversal-safe;
- nullable/unsupported locations are handled;
- large files avoid unnecessary memory copies;
- UI-critical sync I/O and huge scans are absent;
- cache/log growth is bounded where needed;
- cleanup ownership is explicit;
- disk-full and I/O errors are recoverable/actionable;
- account/logout behavior is intentional;
- migrations are resumable and non-destructive;
- reinstall survival is not assumed;
- concurrent writers are coordinated;
- automated tests pass;
- platform integration tests cover semantics that depend on the OS.

## Final engineering rule
Never ask only:
> “Which `path_provider` function gives me a path?”
Ask:
> “What lifecycle, recoverability, ownership, visibility, backup, sensitivity, size, sharing, and migration semantics does this data require?”
Then use `path_provider` to resolve the platform-appropriate root and design I/O, cleanup, security, migration, and failure handling around those semantics.
