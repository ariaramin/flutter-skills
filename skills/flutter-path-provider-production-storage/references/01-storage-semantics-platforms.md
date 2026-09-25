# Storage semantics, directory selection, platform mappings, lifecycle matrices

## Contents

  - [name: path-provider-production-storage description: Production-grade Flutter filesystem location selection, lifecycle design, I/O, security, performance, migration, and testing using path\_provider.](#name-path-provider-production-storage-description-production-grade-flutter-filesystem-location-selection-lifecycle-desig)
- [`path_provider` Production Storage Engineering Skill](#pathprovider-production-storage-engineering-skill)
  - [1. Purpose](#1-purpose)
- [2. Evidence Discipline](#2-evidence-discipline)
- [3. What `path_provider` Does](#3-what-pathprovider-does)
  - [3.1 What it does not do](#31-what-it-does-not-do)
- [4. Repository Reconnaissance](#4-repository-reconnaissance)
- [5. Version Compatibility and Migration Awareness](#5-version-compatibility-and-migration-awareness)
- [6. Current Public API](#6-current-public-api)
    - [Error and nullability rule](#error-and-nullability-rule)
- [7. Classify Data Before Selecting a Directory](#7-classify-data-before-selecting-a-directory)
- [8. Core Directory Selection Table](#8-core-directory-selection-table)
- [9. Temporary Directory](#9-temporary-directory)
    - [Current native mappings](#current-native-mappings)
- [10. Application Cache Directory](#10-application-cache-directory)
    - [Eviction policy](#eviction-policy)
- [11. Application Support Directory](#11-application-support-directory)
- [12. Application Documents Directory](#12-application-documents-directory)
- [13. Library Directory](#13-library-directory)
- [14. Downloads Directory](#14-downloads-directory)
    - [Android](#android)
    - [iOS](#ios)
    - [macOS](#macos)
    - [Windows](#windows)
    - [Linux](#linux)
    - [UX rule](#ux-rule)
- [15. Android Storage Model](#15-android-storage-model)
  - [15.1 Current Android mappings](#151-current-android-mappings)
  - [15.2 Android internal storage](#152-android-internal-storage)
  - [15.3 Android app-specific external storage](#153-android-app-specific-external-storage)
  - [15.4 Scoped storage](#154-scoped-storage)
  - [15.5 Permissions](#155-permissions)
  - [15.6 Android uninstall and backup](#156-android-uninstall-and-backup)
- [16. iOS Storage Semantics](#16-ios-storage-semantics)
  - [16.1 Backup](#161-backup)
  - [16.2 Documents and user visibility](#162-documents-and-user-visibility)
  - [16.3 Updates](#163-updates)
- [17. macOS](#17-macos)
- [18. Windows](#18-windows)
- [19. Linux](#19-linux)
- [20. Web Support](#20-web-support)
- [21. Verified Platform Capability Matrix](#21-verified-platform-capability-matrix)
- [22. Native Mapping Matrix](#22-native-mapping-matrix)
- [23. Persistence and Lifecycle Matrix](#23-persistence-and-lifecycle-matrix)
- [24. Data-Type Selection Table](#24-data-type-selection-table)

<!-- BEGIN SOURCE -->
---

## name: path-provider-production-storage description: Production-grade Flutter filesystem location selection, lifecycle design, I/O, security, performance, migration, and testing using path\_provider.

# `path_provider` Production Storage Engineering Skill

**Research baseline:** 2026-08-10
**Current stable ****`path_provider`****:** `2.1.6`
**Minimum package requirements:** Flutter `3.38`, Dart `3.10`
**Current package platforms:** Android 24+, iOS 13+, macOS 10.15+, Windows 10+, Linux. Flutter Web is not supported.

## 1. Purpose

Use this skill when implementing, reviewing, debugging, migrating, or optimizing filesystem-backed storage in a Flutter application that uses `path_provider`.

The goal is not merely to obtain a path. The goal is to choose a storage location whose lifecycle and platform semantics match the data, then perform filesystem I/O with appropriate reliability, privacy, security, cleanup, memory, performance, and migration behavior.

The governing principle is:

> **`path_provider`**** does not decide where your data should live. It only exposes platform-appropriate directory locations. The application must choose the directory based on the data's lifecycle, ownership, recoverability, sensitivity, visibility, backup requirements, and persistence requirements.**

Never assume:

- Application Documents is the correct location for every persistent file.
- Temporary files will survive until the next app launch.
- Cache files are durable.
- “Downloads” means the same thing on Android, Apple platforms, Windows, and Linux.
- “External storage” means an SD card.
- An app-private path is encrypted storage for secrets.
- Resolving a directory guarantees that a later write will succeed.
- Files survive uninstall/reinstall.
- An app update clears old files.
- A filesystem path is automatically shareable with another app.

---

# 2. Evidence Discipline

When storage behavior matters, classify the basis for each conclusion:

| ClassificationMeaning                |                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| **Package guarantee**                | Explicitly documented by current `path_provider` API/package documentation.        |
| **Platform guarantee**               | Explicit behavior from Android, Apple, Windows, or another platform owner.         |
| **Documented convention**            | Platform-recommended location or lifecycle semantics without a survival guarantee. |
| **Verified implementation behavior** | Behavior observed in the current official federated implementation source.         |
| **Dart filesystem behavior**         | Behavior defined by `dart:io` or the `path` package.                               |
| **Engineering recommendation**       | Production design advice derived from those guarantees.                            |
| **Context-dependent choice**         | Requires repository/product requirements before deciding.                          |

Do not silently promote implementation details or conventions into guarantees.

When package documentation and current implementation differ, inspect the repository version actually resolved by `pubspec.lock` before changing code.

---

# 3. What `path_provider` Does

`path_provider` resolves operating-system-appropriate filesystem directories. Its public API returns `Directory` objects representing categories such as:

- temporary storage;
- application support data;
- application documents;
- application cache;
- Apple Library;
- Downloads;
- Android app-specific external storage;
- Android app-specific external caches;
- Android typed app-specific external storage.

The package is federated. The public package delegates directory resolution through `path_provider_platform_interface` to platform packages including `path_provider_android`, `path_provider_foundation`, `path_provider_linux`, and `path_provider_windows`. The package documentation explicitly recommends mocking `PathProviderPlatform` in package-level tests rather than assuming a single MethodChannel implementation.

## 3.1 What it does not do

`path_provider` does **not**:

- create your database schema;
- serialize data;
- manage application records;
- encrypt files;
- provide secure key storage;
- make files durable;
- provide transactions;
- guarantee atomic replacement;
- automatically clean application-created persistent files;
- provide cache eviction;
- guarantee cache or temporary survival;
- grant Android access to arbitrary shared storage;
- turn filesystem paths into Android content URIs;
- provide a Save As dialog;
- manage Apple security-scoped bookmarks;
- make files shareable;
- sanitize filenames;
- prevent path traversal;
- coordinate concurrent writers.

Use:

- `path_provider` to **locate storage roots**;
- `dart:io` `Directory`, `File`, streams, and `RandomAccessFile` to **perform filesystem operations**;
- `package:path` to **construct and manipulate filesystem paths portably**.

Dart's filesystem APIs are supplied by `dart:io`; `path_provider` is not the filesystem itself.

---

# 4. Repository Reconnaissance

Before changing storage behavior, inspect the repository.

Read:

- `pubspec.yaml`;
- `pubspec.lock`;
- current Flutter and Dart SDK constraints;
- the resolved `path_provider` version;
- resolved federated implementation versions;
- target platforms and minimum OS versions;
- Android manifest and Gradle target/min SDK settings;
- Apple entitlements and relevant `Info.plist` document/file-sharing settings;
- desktop packaging/sandbox configuration;
- existing database initialization;
- secure-storage implementation;
- cache implementation;
- download/export flows;
- logout/account-removal logic;
- storage migrations;
- unit and integration tests.

Search for at least:

```
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
/storage/
/sdcard/
/Users/
C:\Users\
/home/
File(
Directory(
.readAsBytes
.readAsString
.writeAsBytes
.writeAsString
readAsBytesSync
readAsStringSync
writeAsBytesSync
writeAsStringSync
listSync
recursive:

```

Also find:

- raw `'/'` or `'\\'` path concatenation;
- storage permission declarations;
- filesystem paths stored in databases/preferences;
- caches without bounds;
- recursive startup scans;
- account-derived filenames;
- deletion of entire roots;
- user exports mixed with app cache;
- persistent databases under cache/temp;
- direct `dart:io` imports in web-targeted source.

**Do not create a second storage policy accidentally.** If the repository already has a coherent storage abstraction or cache manager, extend it instead of introducing a competing layer.

---

# 5. Version Compatibility and Migration Awareness

As of the research baseline, `path_provider 2.1.6` requires Flutter 3.38 and Dart 3.10. Its published platform floor is Android 24, iOS 13, macOS 10.15, Windows 10, and Linux. Older Flutter projects may resolve older compatible platform implementations, so current online source must not be copied blindly into a repository pinned to an older dependency graph.

Important recent package-history points include:

- application cache support was added in the 2.1 series;
- Android Downloads support was added through the Android implementation;
- iOS/macOS migrated to the Foundation federated implementation;
- older releases changed Android external storage to app-specific `getExternalFilesDir`;
- federated platform implementations replaced assumptions about a single plugin channel;
- non-null APIs can surface `MissingPlatformDirectoryException`;
- unsupported directory concepts surface `UnsupportedError`.

Before migration:

1. inspect the lockfile;
2. read changelogs between the project's pinned version and the proposed version;
3. inspect actual platform implementation mappings;
4. identify persisted absolute paths;
5. identify data whose old location must be migrated;
6. test upgrades on real target platforms.

Never change a persistent location merely because another directory now looks “cleaner.”

---

# 6. Current Public API

The current top-level package exposes these primary directory APIs.

| APIReturnMain semantic intent                             |                            |                                                                    |
| --------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------ |
| `getTemporaryDirectory()`                                 | `Future<Directory>`        | Disposable temporary/intermediate data                             |
| `getApplicationSupportDirectory()`                        | `Future<Directory>`        | Persistent app-owned internal support data                         |
| `getApplicationDocumentsDirectory()`                      | `Future<Directory>`        | User-generated or otherwise non-recreatable document data          |
| `getApplicationCacheDirectory()`                          | `Future<Directory>`        | Reconstructible application cache                                  |
| `getLibraryDirectory()`                                   | `Future<Directory>`        | Apple Library location                                             |
| `getDownloadsDirectory()`                                 | `Future<Directory?>`       | Platform Downloads concept, with major platform-specific semantics |
| `getExternalStorageDirectory()`                           | `Future<Directory?>`       | Android app-specific external files root                           |
| `getExternalCacheDirectories()`                           | `Future<List<Directory>?>` | Android app-specific external caches                               |
| `getExternalStorageDirectories({StorageDirectory? type})` | `Future<List<Directory>?>` | Android app-specific external directories, optionally typed        |

`StorageDirectory` currently represents Android media/document categories such as music, podcasts, ringtones, alarms, notifications, pictures, movies, downloads, DCIM, and documents.

### Error and nullability rule

Do not equate nullable with unsupported.

- `getDownloadsDirectory()` can return `null` when the platform has a Downloads concept but it cannot currently be resolved.
- Android external-storage APIs can return `null` when external app-specific storage is unavailable.
- An unsupported category can produce `UnsupportedError`.
- A non-null-returning API can throw `MissingPlatformDirectoryException` if the implementation cannot resolve the promised category.

Never add `!` just because the directory existed on one test device.

---

# 7. Classify Data Before Selecting a Directory

For every new file category, answer these questions first.

1. Is the data reconstructible?
2. Can the OS safely delete it?
3. Is it user-generated?
4. Is it user-owned?
5. Should users see or manage it directly?
6. Must it survive app restarts?
7. Must it survive cache cleanup?
8. Should it be backed up?
9. Is it sensitive or secret?
10. Must another app access it?
11. Is it an explicit export?
12. Is the file temporary processing output?
13. Is it small, moderate, or large?
14. Should it survive application uninstall?
15. Which target platforms must support this feature?

Then classify:

| DimensionValues |                                                          |
| --------------- | -------------------------------------------------------- |
| Lifecycle       | ephemeral / cache / persistent / user-owned              |
| Recoverability  | reproducible / partially reproducible / irreplaceable    |
| Visibility      | app-private / user-visible / shareable                   |
| Backup          | should back up / should not back up / platform-dependent |
| Sensitivity     | public / private / sensitive / secret                    |
| Size            | tiny / moderate / large                                  |

Only after classification should code select a path-provider API.

---

# 8. Core Directory Selection Table

| CategoryExpected lifecycleOS deletionTypical visibilityBackup postureBest use |                                 |                                                |                                                     |                                   |                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------- | --------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| Temporary                                                                     | Short-lived                     | Must tolerate deletion                         | App-internal                                        | Should not rely on backup         | Staging, intermediate processing                                      |
| Cache                                                                         | Reconstructible                 | Must tolerate eviction                         | App-internal                                        | Generally should not be backed up | Thumbnails, HTTP/media derivatives                                    |
| Application Support                                                           | Persistent app-owned            | Not disposable                                 | Usually internal                                    | Review platform backup behavior   | Databases, config, indexes, durable internal state                    |
| Documents                                                                     | Persistent, often user-oriented | Not cache                                      | Platform-dependent visibility                       | Often backup-eligible             | User-generated/non-recreatable document data                          |
| Downloads                                                                     | Platform-dependent              | Not a universal durability contract            | Often user-oriented on desktop; different on mobile | Platform-dependent                | Explicit downloaded/exported content only after platform review       |
| Android external app storage                                                  | Persistent while available      | Storage can disappear; not cache by definition | App-specific, not arbitrary shared storage          | Review Android backup rules       | Large/app-specific Android files where external volume tradeoffs help |

This is a **selection framework**, not a universal mapping. Android, Apple, Windows, and Linux use meaningfully different implementations.

---

# 9. Temporary Directory

`getTemporaryDirectory()` is for disposable data. The package documentation explicitly says files in this directory may be cleared at any time and that the directory is not a newly unique directory for each call. The caller owns any child-directory lifecycle it creates.

Good uses:

- upload staging;
- temporary downloads;
- decompression/intermediate archives;
- transcoding or image-processing output;
- export staging before a share/save operation;
- scratch data that can be recreated.

Bad uses:

- primary database;
- user-authored documents;
- durable offline records;
- authentication secrets;
- data whose disappearance makes the app incorrect.

> **Temporary storage is disposable by design.**

### Current native mappings

Current official implementations map temporary storage as follows:

- Android: internal application `cacheDir`;
- iOS/macOS Foundation implementation: `NSCachesDirectory`;
- Windows: Windows temporary path obtained through the platform API;
- Linux: non-empty `TMPDIR`, otherwise `/tmp`.

A subtle but important consequence is that the current Foundation implementation maps `getTemporaryDirectory()` to the cache search path rather than promising a fresh POSIX `/tmp` child. Code must depend on **disposable semantics**, not a remembered native folder name.

---

# 10. Application Cache Directory

`getApplicationCacheDirectory()` returns an app-specific cache directory. Current top-level documentation states that the directory is automatically created. Cache data must be safe to regenerate or redownload.

> **If losing a cache file breaks correctness, it is not truly cache data.**

Examples:

- thumbnails;
- resized images;
- parsed/generated indexes that can be rebuilt;
- transient network responses where offline durability is not promised;
- render artifacts;
- derived media.

Do not use cache merely because the data is “downloaded.” A user-requested offline download with a product promise of continued availability after cache cleanup is persistent application data, not a cache.

### Eviction policy

Even when the OS can clean cache locations, a production app should define its own policy when size matters:

- TTL;
- maximum total bytes;
- maximum entry count;
- feature-specific quotas;
- delete-on-replacement;
- delete-on-account removal where applicable.

Do not recursively calculate a massive cache's total size on every launch merely to keep a dashboard number current.

Android and Apple explicitly treat cache storage as discardable. Android may delete cache data under storage pressure; Apple also directs apps to keep recreatable data in caches rather than backup-eligible persistent locations.

Desktop platforms do not provide one universal mobile-style cache-eviction guarantee. Treat cache as application-discardable regardless, and implement application bounds when required.

---

# 11. Application Support Directory

`getApplicationSupportDirectory()` is normally the strongest default candidate for **persistent, application-owned implementation data that users do not directly manage**.

The package describes it as a location for application support files and states that the directory is automatically created.

Typical uses:

- SQLite database files;
- persistent object-store files;
- configuration that is not user-authored as a document;
- offline metadata;
- indexes that must survive cache cleanup;
- application state;
- account-specific persistent data.

Application Support is generally preferable to Documents for internal databases/configuration because it communicates internal ownership rather than user-document ownership.

That is still a policy decision. Database libraries may already define their own platform-aware default location; do not relocate an existing database without a migration plan.

---

# 12. Application Documents Directory

`getApplicationDocumentsDirectory()` is intended for user-generated or otherwise non-recreatable application data. Its own documentation directs applications to consider Support, Cache, or external locations for other categories rather than treating Documents as a universal storage root.

Use it when document semantics genuinely match:

- user-created projects/documents;
- irreplaceable files users conceptually own;
- data that product UX treats as a user's document.

Do not automatically put:

- caches;
- generated thumbnails;
- internal indexes;
- scratch files;
- every SQLite database;
- internal diagnostic logs

under Documents.

The same API name has different visibility implications across platforms. Current Android implementation uses a private application directory, while Windows/Linux Documents correspond to user-profile document locations, and Apple Documents remains within the application container but can participate in document/file-sharing UX.

Therefore, never infer “the user can browse this” merely from `getApplicationDocumentsDirectory()`.

---

# 13. Library Directory

`getLibraryDirectory()` is supported on iOS and macOS, not Android, Linux, or Windows.

The current Foundation implementation maps this API to `NSLibraryDirectory`.

There is a documentation inconsistency worth preserving in engineering awareness: the top-level API documentation gives `NSApplicationSupportDirectory` as an example, while the current Foundation implementation resolves `NSLibraryDirectory`. For exact native mapping, the resolved implementation source should take precedence, and the mapping should be reverified when upgrading.

Do not introduce Library into shared application architecture unless Apple-specific semantics genuinely require it. Application Support is usually a clearer cross-platform semantic abstraction for internal persistent data.

---

# 14. Downloads Directory

`getDownloadsDirectory()` returns `Future<Directory?>`. The package explicitly says the returned directory is **not guaranteed to exist**. A `null` result can mean the platform supports a Downloads concept but it is currently unavailable; lack of the concept is represented separately as unsupported behavior.

Never write:

```
final downloads = (await getDownloadsDirectory())!;

```

without a platform/product-specific reason proving availability.

Most importantly:

> **“Downloads” is not a universal shared-user Downloads path.**

Current implementations differ significantly.

### Android

The current Android implementation obtains Downloads through its app-specific external-storage path using `getExternalFilesDirs(DIRECTORY_DOWNLOADS)` and selects the first path. This is an **application-specific external Downloads directory**, not unrestricted access to the public `/Download` hierarchy.

If the product requirement is “the user chooses where this file is saved” or “this export should exist as a normal user-owned document outside the app,” use an appropriate system save/document flow such as the Storage Access Framework. For shared media, use the Android media APIs where appropriate. `path_provider` alone is not a scoped-storage bypass.

### iOS

The Foundation implementation resolves `NSDownloadsDirectory`, but iOS filesystem access remains governed by the application sandbox. Do not equate the returned path with desktop-style unrestricted global Downloads access. Use document/share/save workflows when the user is meant to choose or own the destination.

### macOS

The implementation uses `NSDownloadsDirectory`. App Sandbox configuration can restrict direct access outside the sandbox; user-selected file access should use standard open/save panels and the appropriate entitlements/security-scoped mechanisms where required.

### Windows

Current implementation maps to the Windows Downloads known folder. Windows documents Downloads as a per-user known folder rather than requiring code to construct `C:\Users\...` manually.

### Linux

Current implementation asks the XDG user-directory system for `DOWNLOAD`. Resolution can be unavailable/null, for example when the user-directory helper/configuration cannot supply it.

### UX rule

For an explicit **Save As** interaction, prefer a system file/document picker rather than silently selecting an application-private directory. This is especially important on desktop.

---

# 15. Android Storage Model

Android must be treated separately from desktop filesystem assumptions.

Android distinguishes:

- internal app-specific storage;
- internal cache;
- app-specific external storage;
- shared media collections;
- user-selected documents;
- broad all-files access, which is exceptional and restricted.

Modern Android scoped storage limits arbitrary access to shared external storage. A path to an app-owned external directory does not grant unrestricted access to shared user files.

## 15.1 Current Android mappings

The current official Android implementation maps APIs as follows.

| `path_provider` APICurrent Android mapping |                                                       |
| ------------------------------------------ | ----------------------------------------------------- |
| Temporary                                  | `context.cacheDir`                                    |
| Application Support                        | `context.filesDir`                                    |
| Application Documents                      | `context.getDir("flutter", MODE_PRIVATE)`             |
| Application Cache                          | `context.cacheDir`                                    |
| Library                                    | Unsupported                                           |
| Downloads                                  | first app-specific external Files Downloads directory |
| External Storage                           | `context.getExternalFilesDir(null)`                   |
| External Cache Directories                 | `context.externalCacheDirs`                           |
| Typed External Storage                     | `context.getExternalFilesDirs(type)`                  |

This is a verified implementation mapping, not a promise that native internals can never change. Code should depend on semantic categories.

## 15.2 Android internal storage

Internal application directories are app-private and do not require broad storage permissions. Android documents these app-specific locations as inaccessible to other apps under normal sandbox rules.

Do not request legacy/broad storage permissions for:

- `filesDir`;
- internal app cache;
- private application directories.

For secrets, app-private storage is still not a substitute for a keystore-backed secret-storage design.

## 15.3 Android app-specific external storage

`getExternalStorageDirectory()` maps to Android's app-specific external `getExternalFilesDir(null)`. Typed variants use `getExternalFilesDirs(type)`, potentially returning more than one volume. External cache similarly represents app-specific external cache locations.

Key rules:

- “external” does **not** mean “SD card”;
- external storage may be emulated;
- multiple volumes may exist;
- removable storage may disappear;
- app-specific external storage normally requires no storage permission on modern Android;
- app-specific external files are removed when the app is uninstalled;
- do not assume a previously returned removable path remains available forever.

Use external app storage when its characteristics genuinely help—for example, larger app-owned media where external capacity is preferable—and only if the application tolerates storage availability changes.

## 15.4 Scoped storage

If the application needs to access files outside its app-owned storage, identify the product intent.

| RequirementPreferred Android mechanism |                                                                  |
| -------------------------------------- | ---------------------------------------------------------------- |
| App-private files                      | Internal/app-specific storage                                    |
| App-specific external large file       | App-specific external directory                                  |
| User selects document to open          | Storage Access Framework                                         |
| User chooses document save location    | Storage Access Framework / create-document flow                  |
| Shared media                           | MediaStore                                                       |
| Share app-private file temporarily     | Content URI/FileProvider-based sharing                           |
| Arbitrary all-files access             | Only when a genuine policy-approved special use case requires it |

The Storage Access Framework provides system UI and user-granted access without requiring broad storage permission for ordinary document-selection flows.

## 15.5 Permissions

Never request Android storage permissions “just in case.”

Modern app-specific internal and external directories generally do not need broad storage permission. Access to shared media or special shared-storage use cases follows separate Android permission/API rules. `MANAGE_EXTERNAL_STORAGE`is special broad all-files access and subject to policy restrictions; it is not a normal solution for application storage.

Legacy advice involving `requestLegacyExternalStorage` or blanket `READ/WRITE_EXTERNAL_STORAGE` should not be copied into a modern project without target-SDK-specific verification. Android 11+ enforces scoped-storage rules independently of old broad-storage assumptions.

## 15.6 Android uninstall and backup

Android app-specific files—including app-specific external files—are removed on uninstall. User-owned shared files created through shared-storage mechanisms have different ownership and uninstall semantics.

Android Auto Backup can include internal files and app-specific external files by default while excluding cache locations, subject to backup configuration and platform/version rules. Therefore:

- don't put reproducible cache into a backup-eligible persistent directory without reason;
- review backup rules for sensitive data;
- don't design identity/authentication around files “surviving uninstall,” because uninstall cleanup and later backup restoration are distinct mechanisms.

---

# 16. iOS Storage Semantics

iOS applications operate in a sandbox. Apple distinguishes Documents, Application Support/Library, Caches, and temporary/disposable data by purpose and backup behavior.

Current Foundation mappings are:

| APIiOS mapping        |                                            |
| --------------------- | ------------------------------------------ |
| Temporary             | `NSCachesDirectory`                        |
| Support               | `NSApplicationSupportDirectory`            |
| Documents             | `NSDocumentDirectory`                      |
| Cache                 | `NSCachesDirectory`                        |
| Library               | `NSLibraryDirectory`                       |
| Downloads             | `NSDownloadsDirectory`, subject to sandbox |
| Android external APIs | Unsupported                                |

## 16.1 Backup

Apple's filesystem guidance makes the distinction critical:

- Documents and persistent Application Support data are backup-oriented locations;
- Caches should contain recreatable content and are not intended for backup;
- temporary data is disposable;
- files that can be downloaded or regenerated should not consume backup unnecessarily.

If persistent data must not participate in backup, use Apple's supported backup-exclusion mechanism only when platform/product requirements call for it. Do not invent backup behavior from directory names alone.

## 16.2 Documents and user visibility

Documents lives inside the app container, but product configuration such as file sharing/document-browser integration can expose document files to user-facing Files workflows. Therefore, internal databases, indexes, secret implementation metadata, and unrelated support files should not be placed in Documents simply because it persists.

## 16.3 Updates

Apple explicitly warns against persisting absolute sandbox-container paths because the container's absolute location can change across updates. Persist logical/relative identifiers and resolve the base directory again. Persistent Documents/Library content has update semantics distinct from Caches/temp.

---

# 17. macOS

Do not model macOS as “iOS with a keyboard.”

The current Foundation implementation uses Apple search-path APIs and, for Application Support and Caches, adds an application bundle-identifier child on macOS. This matters because non-sandboxed macOS applications otherwise resolve shared user-level directories.

A macOS application can be:

- sandboxed;
- non-sandboxed;
- entitled for selected filesystem access;
- granted access through user-selected open/save flows.

In App Sandbox, access outside the app's container is restricted. User-selected locations should normally be obtained through platform-native open/save mechanisms; persistent access can require security-scoped techniques and appropriate entitlements.

For desktop exports, prefer UX that lets users choose where their document goes when that is what they expect.

---

# 18. Windows

Current `path_provider_windows` implementation uses Windows platform-known locations rather than hardcoded profile strings.

Current mappings include:

- Temporary → Windows temporary path;
- Application Support → app-specific child under `RoamingAppData`;
- Application Cache → app-specific child under `LocalAppData`;
- Documents → Windows Documents known folder;
- Downloads → Windows Downloads known folder.

Microsoft documents these as per-user Known Folder concepts and explicitly allows paths to be redirected from their common defaults, which is why code must not manufacture `C:\Users\<name>\...`.

Do not infer mobile-style automatic cache deletion, backup, or uninstall cleanup from these mappings. Desktop installation, profile backup, enterprise redirection, and uninstall behavior can vary. Define application cleanup explicitly where correctness requires it.

---

# 19. Linux

Current Linux implementation follows XDG concepts:

- Temporary → `$TMPDIR` when non-empty, otherwise `/tmp`;
- Application Support → XDG data home plus app identity;
- Application Cache → XDG cache home plus app identity;
- Documents → XDG `DOCUMENTS` user directory;
- Downloads → XDG `DOWNLOAD` user directory.

The XDG Base Directory Specification defines data and cache roots through environment variables, with conventional defaults such as user data beneath the user's local share area and nonessential cache beneath the user's cache area. Applications should not hardcode `/home/<user>/...`.

Current Linux implementation also contains compatibility logic for older application-directory naming. This is another reason not to “clean up” existing locations without inspecting current data and migration history.

XDG Documents/Downloads lookup can fail or be unavailable. Handle it.

Linux desktop storage is not automatically a mobile sandbox. Filesystem permissions, host configuration, backup, and uninstall behavior remain environment-dependent.

---

# 20. Web Support

`path_provider` currently does **not** support Flutter Web. Its official support matrix lists Android, iOS, Linux, macOS, and Windows only. `dart:io` filesystem APIs used throughout normal `path_provider` workflows are also not browser filesystem APIs.

For a repository that also targets web:

- isolate filesystem-dependent implementation behind platform boundaries;
- do not import `dart:io` from code compiled for web;
- use browser-appropriate persistence/file-selection APIs for the web implementation;
- do not invent `/tmp`, `/Downloads`, or other OS paths inside a browser.

---

# 21. Verified Platform Capability Matrix

The current package README/API matrix establishes the following support.

| Directory APIAndroidiOSmacOSWindowsLinuxWeb |     |     |     |     |     |   |
| ------------------------------------------- | --- | --- | --- | --- | --- | - |
| Temporary                                   | ✅   | ✅   | ✅   | ✅   | ✅   | ❌ |
| Application Support                         | ✅   | ✅   | ✅   | ✅   | ✅   | ❌ |
| Application Documents                       | ✅   | ✅   | ✅   | ✅   | ✅   | ❌ |
| Application Cache                           | ✅   | ✅   | ✅   | ✅   | ✅   | ❌ |
| Library                                     | ❌   | ✅   | ✅   | ❌   | ❌   | ❌ |
| Downloads                                   | ✅\* | ✅\* | ✅\* | ✅\* | ✅\* | ❌ |
| External Storage                            | ✅†  | ❌   | ❌   | ❌   | ❌   | ❌ |
| External Cache Directories                  | ✅†  | ❌   | ❌   | ❌   | ❌   | ❌ |
| Typed External Storage                      | ✅†  | ❌   | ❌   | ❌   | ❌   | ❌ |

`*` `getDownloadsDirectory()` is nullable/conditionally resolvable and its ownership/visibility differs by platform.
`†` Android external APIs are app-specific external storage and can be unavailable/null.

---

# 22. Native Mapping Matrix

The current official implementation sources map categories approximately as follows. Code should depend on semantics, not these literal paths.

| CategoryAndroidiOS/macOSWindowsLinux |                                 |                                 |                             |                     |
| ------------------------------------ | ------------------------------- | ------------------------------- | --------------------------- | ------------------- |
| Temp                                 | internal cache                  | `NSCachesDirectory`             | system temp API             | `$TMPDIR` or `/tmp` |
| Support                              | `filesDir`                      | `NSApplicationSupportDirectory` | app child of RoamingAppData | XDG data home/app   |
| Documents                            | private `getDir("flutter")`     | `NSDocumentDirectory`           | Documents known folder      | XDG Documents       |
| Cache                                | internal `cacheDir`             | `NSCachesDirectory`             | app child of LocalAppData   | XDG cache home/app  |
| Library                              | —                               | `NSLibraryDirectory`            | —                           | —                   |
| Downloads                            | app-specific external Downloads | `NSDownloadsDirectory`          | Downloads known folder      | XDG Downloads       |
| External app files                   | `getExternalFilesDir(s)`        | —                               | —                           | —                   |
| External cache                       | `externalCacheDirs`             | —                               | —                           | —                   |

Do not reproduce any of these mappings manually in application code.

---

# 23. Persistence and Lifecycle Matrix

This table describes safe application assumptions, not universal promises about every host/backup system.

| CategoryNormal restart persistenceOS may clear?Uninstall behaviorUser-visible?Backup postureInternal DB? |                                |                                                         |                                                                                                     |                                   |                                                |                                                                                  |
| -------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| Temporary                                                                                                | Never depend on it             | Yes / disposable                                        | Never depend on survival                                                                            | Usually no                        | No durability expectation                      | ❌                                                                                |
| Cache                                                                                                    | Never treat as required        | Yes on mobile; app should treat as evictable everywhere | Never depend on survival                                                                            | Usually no                        | Generally exclude/not intended                 | ❌                                                                                |
| Support                                                                                                  | Persistent                     | Not intended as cache                                   | Android app data removed; other platforms/installers vary; reinstall survival must never be assumed | Usually no                        | Often backup-eligible on mobile; review policy | ✅ Usually                                                                        |
| Documents                                                                                                | Persistent                     | Not cache                                               | Platform/user ownership varies                                                                      | Potentially/usually user-oriented | Often backup/user-managed                      | Only when document semantics actually fit                                        |
| Downloads                                                                                                | Platform-dependent             | Not cache, but availability varies                      | Android path-provider location is app-specific and removed; desktop user files differ               | Platform-dependent                | Platform-dependent                             | ❌                                                                                |
| Android external app files                                                                               | Persistent while volume exists | Volume can disappear                                    | Removed with app                                                                                    | App-specific                      | Review Android backup config                   | Possible, but removable storage tradeoffs usually make critical DBs unattractive |
| Apple Library                                                                                            | Persistent category            | Cache subareas differ                                   | Reinstall survival must not be assumed                                                              | App-internal                      | Persistent portions generally backup-oriented  | ✅ depending design                                                               |

Android's official docs distinguish cache, app-specific storage, and shared files, including uninstall removal and backup behavior. Apple similarly separates backed-up persistent locations from Caches/temp.

---

# 24. Data-Type Selection Table

| DataRecommended semantic categoryNotes     |                                                                                       |                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Primary SQLite/object database             | Application Support                                                                   | Persistent internal data; use DB library's established convention if already present |
| Reconstructible API cache                  | Application Cache                                                                     | Define eviction                                                                      |
| Avatar thumbnail                           | Application Cache                                                                     | Rebuild/redownload                                                                   |
| Original user avatar owned by app          | Persistent Support/Documents depending ownership UX                                   | Not cache if loss is unacceptable                                                    |
| Offline media promised to remain available | Persistent app-owned storage                                                          | Do not put in cache merely because downloaded                                        |
| Streaming-media buffer                     | Cache/temp                                                                            | Reconstructible                                                                      |
| Temporary upload staging                   | Temporary                                                                             | Delete after success/failure timeout                                                 |
| Generated export before share/save         | Temporary                                                                             | Remove after handoff where practical                                                 |
| User-exported PDF                          | User-selected/shared destination                                                      | Ownership leaves app; do not delete during cache cleanup                             |
| App configuration                          | Application Support                                                                   | Unless secure/special platform storage is needed                                     |
| Generated search index                     | Cache if rebuildable; Support if rebuild cost/product correctness requires durability | Explicitly choose                                                                    |
| Diagnostic logs                            | Bounded Support or Cache                                                              | Depends retention/support promise                                                    |
| Crash attachment staging                   | Temporary                                                                             | Export/upload then delete                                                            |
| User-authored document                     | Documents or user-selected save location                                              | Respect product ownership                                                            |
| Authentication secret                      | Secure-storage/key-management solution                                                | `path_provider` is not sufficient                                                    |

---

<!-- END SOURCE -->
