# File naming, traversal, symlinks, secrets, privacy, cleanup, accounts, updates, migrations, sharing, errors, concurrency

## Contents

- [44. File Naming](#44-file-naming)
- [45. Path Traversal](#45-path-traversal)
- [46. Symlinks and Canonicalization](#46-symlinks-and-canonicalization)
- [47. Sensitive Data](#47-sensitive-data)
- [48. Cache and Temporary Privacy](#48-cache-and-temporary-privacy)
- [49. Backup and Privacy](#49-backup-and-privacy)
- [50. Cleanup Ownership](#50-cleanup-ownership)
- [51. Deletion Safety](#51-deletion-safety)
- [52. Logout and Multi-Account Apps](#52-logout-and-multi-account-apps)
- [53. Application Updates](#53-application-updates)
- [54. Filesystem Schema Versioning](#54-filesystem-schema-versioning)
- [55. Safe File Migration](#55-safe-file-migration)
- [56. Reinstall](#56-reinstall)
- [57. Sharing and User-Selected Save Locations](#57-sharing-and-user-selected-save-locations)
    - [Android](#android)
    - [Apple platforms](#apple-platforms)
    - [Desktop](#desktop)
- [58. Error Handling](#58-error-handling)
- [59. Disk Full](#59-disk-full)
- [60. Concurrent Access](#60-concurrent-access)

<!-- BEGIN SOURCE -->
# 44. File Naming

Never use raw user-controlled filenames as internal path components.

Prefer:

- app-issued stable IDs;
- UUIDs;
- deterministic hashes;
- sanitized display names stored separately from internal filenames.

A filename displayed to a user and a filename used as an internal storage key do not need to be the same.

Consider:

- collisions;
- filesystem-invalid characters;
- separator characters;
- `.` and `..`;
- hidden-file behavior;
- case sensitivity differences;
- maximum path/name constraints;
- Unicode normalization differences.

Do not build correctness around platform-specific filename quirks unless verified.

---

# 45. Path Traversal

This is unsafe:

```
final file = File(
  p.join(root.path, userProvidedName),
);

```

An attacker may supply values such as:

```
../../private.db
..\..\private.db
/substitute/absolute/path

```

Also remember that an absolute later segment passed to `p.join` can replace preceding path components.

For internal storage, the strongest design is to **not accept paths from untrusted callers**. Convert external identifiers to controlled IDs/filenames.

A minimal controlled filename helper:

```
import 'dart:io';

import 'package:path/path.dart' as p;

File controlledChildFile({
  required Directory root,
  required String internalId,
  required String extension,
}) {
  final idPattern = RegExp(r'^[A-Za-z0-9_-]{1,128}$');
  final extPattern = RegExp(r'^[A-Za-z0-9]{1,16}$');

  if (!idPattern.hasMatch(internalId)) {
    throw ArgumentError.value(
      internalId,
      'internalId',
      'Expected a controlled application identifier.',
    );
  }

  if (!extPattern.hasMatch(extension)) {
    throw ArgumentError.value(
      extension,
      'extension',
      'Expected an alphanumeric extension.',
    );
  }

  return File(
    p.join(
      root.path,
      '$internalId.$extension',
    ),
  );
}

```

If arbitrary relative paths are genuinely required:

- reject absolute paths;
- normalize;
- verify containment;
- account for symlinks where they are part of the threat model;
- never use a simple string-prefix test as a security boundary.

The `path` package supplies normalization/containment helpers, while `dart:io` can resolve symbolic links for existing filesystem entities.

---

# 46. Symlinks and Canonicalization

Ordinary app-internal storage usually does not require elaborate canonicalization.

However, when an untrusted party can influence paths or directory contents:

- a normalized textual path and the actual resolved filesystem target are not always equivalent;
- symlinks can redirect traversal;
- containment checks performed before creation may have race conditions.

Prefer eliminating attacker-controlled relative paths altogether.

When validating existing entities under a security boundary, resolve symbolic links where appropriate and compare canonicalized locations according to the platform-specific threat model. Dart exposes `resolveSymbolicLinks()`, which can fail when the target does not exist.

---

# 47. Sensitive Data

`path_provider` gives filesystem locations. It provides **no encryption**.

Do not store:

- refresh tokens;
- encryption keys;
- long-lived authentication secrets;
- recovery secrets

in an ordinary file merely because Application Support is app-private.

Depending on the threat model, use:

- platform keystore/keychain-backed secure storage;
- encrypted database/files;
- encryption keys protected independently from encrypted content.

Sandbox storage protects against ordinary cross-app access, not every device compromise, backup extraction, debugging, malware, or physical attack.

Android's backup documentation specifically cautions against treating ordinary backed-up files/preferences as appropriate for credentials.

---

# 48. Cache and Temporary Privacy

Disposable does not mean harmless.

Cache/temp can contain:

- private images;
- medical/business data;
- decrypted documents;
- generated previews;
- authentication responses;
- personally identifiable metadata.

For sensitive ephemeral files:

- create only when necessary;
- keep retention short;
- delete after successful processing;
- clear account-scoped sensitive cache on logout when policy requires it;
- avoid sensitive filenames;
- never depend solely on eventual OS cleanup for privacy requirements.

Do not store auth tokens in cache.

---

# 49. Backup and Privacy

Backup is a storage-design dimension.

Ask:

- Does this data need disaster recovery?
- Is it reproducible?
- Is it large?
- Is it sensitive?
- Should it migrate to another device?
- Does policy allow cloud/device backup?

On Apple platforms, Documents and persistent Library/Application Support locations are generally backup-oriented, while Caches/temp are not. On Android, Auto Backup defaults include several persistent app locations while cache is excluded, subject to backup configuration and platform rules.

Do not waste backup quota on:

- thumbnails;
- rebuildable indexes;
- redownloadable media;
- transient logs.

Do not accidentally back up sensitive files merely because persistent storage was convenient.

---

# 50. Cleanup Ownership

Every file category should define:

| QuestionExample answer |                                                             |
| ---------------------- | ----------------------------------------------------------- |
| Owner                  | account `a91f`, image cache subsystem                       |
| Expiration             | 7 days                                                      |
| Deletion trigger       | upload succeeded                                            |
| Max size               | 250 MB                                                      |
| Logout policy          | delete account-scoped originals, retain global public cache |
| App removal            | platform-owned semantics                                    |
| User export            | never delete as cache                                       |

Potential cleanup triggers include:

- successful upload;
- replaced version;
- cache TTL;
- cache quota;
- logout;
- account deletion;
- feature deletion;
- completed export staging;
- migration completion.

Never rely on OS cleanup when product correctness or privacy requires application-driven deletion.

---

# 51. Deletion Safety

`Directory.delete(recursive: true)` can remove an entire directory tree. Dart's API intentionally makes recursive deletion powerful.

Deletion code deserves stricter validation than read code.

Before deleting recursively:

- ensure the root is an app-owned child, not the base Support/Documents/Downloads root;
- derive deletion targets from controlled IDs;
- validate containment;
- do not accept raw paths from UI/network data;
- never recursively delete a user-selected export directory just because one exported file belonged to the app.

Prefer:

```
support/accounts/<stable-id>/

```

and delete precisely that controlled subtree.

---

# 52. Logout and Multi-Account Apps

Do not implement logout as:

```
await supportDirectory.delete(recursive: true);

```

unless product policy explicitly says every bit of local application data belongs to that account.

Separate:

```
support/
  global/
  accounts/
    account_7e82/
    account_9ad1/

cache/
  global/
  accounts/
    account_7e82/

```

Use stable internal account IDs, not raw emails/usernames.

On logout determine deliberately:

- sensitive account files to delete;
- account cache to delete;
- globally reusable public cache to retain;
- offline content ownership;
- user exports that must remain untouched.

On account removal, privacy requirements may be stricter than ordinary sign-out.

---

# 53. Application Updates

Do not assume an upgrade clears storage.

Persistent app data usually remains specifically so applications can update without losing user state. That means an upgrade can encounter:

- old database schemas;
- obsolete cache formats;
- previous directory layouts;
- orphaned files;
- persisted absolute paths;
- partial migrations.

On Apple platforms, persistent Documents/Library content is preserved through normal updates while the absolute application-container location can change.

Always treat upgrade compatibility as a migration problem, not an accidental cleanup mechanism.

---

# 54. Filesystem Schema Versioning

For a complex storage layout, explicit versions can be useful:

```
support/v2/

```

or metadata:

```
{"storageSchema": 2}

```

Use them only when migration complexity justifies them.

Do not introduce `v1/v2/v3` directory hierarchies into a trivial application that stores three files.

---

# 55. Safe File Migration

A robust migration should be idempotent and resumable.

Recommended sequence:

1. detect old layout;
2. detect whether the new layout is already complete;
3. create new parent safely;
4. stage copy/move;
5. verify copied data sufficiently for its risk level;
6. make the new location authoritative;
7. persist a migration marker/schema version;
8. delete old data only after success;
9. safely resume if interrupted.

For critical data, verification may include:

- expected files;
- byte lengths;
- parse/database integrity check;
- checksum where appropriate.

Do not destructively delete the old database first and then attempt a copy.

A rename can fail across filesystems; Dart documents copy/delete as the necessary alternative when a direct move cannot occur.

---

# 56. Reinstall

Never design critical behavior around app-private files surviving uninstall/reinstall.

Android app-specific files are removed on uninstall. A later restore from backup is a separate mechanism. Other platforms and desktop installers have different cleanup behavior, which is precisely why “the file should survive reinstall” is not a portable contract.

If the product needs reinstall-independent identity or durable user ownership, design that requirement explicitly using server state, platform backup/account mechanisms, or user-owned storage as appropriate.

---

# 57. Sharing and User-Selected Save Locations

A filesystem path is not a sharing permission.

### Android

An app-private path cannot simply be handed to another app and assumed accessible. Use Android-compatible sharing/content-URI mechanisms. Use SAF for user-selected documents and MediaStore for relevant shared media.

### Apple platforms

Use platform share/document/save mechanisms. macOS App Sandbox may require user-selected access and entitlements/security-scoped handling outside the sandbox.

### Desktop

When users explicitly click **Save As**, let them choose a destination rather than silently writing an implementation file to Support.

`path_provider` is for directory discovery, not a replacement for file-picker/save APIs.

---

# 58. Error Handling

Filesystem code must expect:

- missing files;
- missing directories;
- permission/access denial;
- read-only storage;
- disk full;
- external/removable storage disappearance;
- path collision;
- malformed/corrupt data;
- failed rename/copy/delete;
- unsupported directory categories;
- unavailable nullable locations.

Dart exposes `FileSystemException` and more specific subclasses for common path/access/existence failures.

Do not:

```
try {
  await write();
} catch (_) {}

```

for persistent storage.

Translate errors at the right boundary.

Example:

```
import 'dart:io';

sealed class SaveResult {
  const SaveResult();
}

final class SaveSucceeded extends SaveResult {
  const SaveSucceeded();
}

final class SaveFailed extends SaveResult {
  const SaveFailed(this.reason);

  final String reason;
}

Future<SaveResult> saveUserExport({
  required File destination,
  required List<int> bytes,
}) async {
  try {
    await destination.parent.create(recursive: true);
    await destination.writeAsBytes(bytes);
    return const SaveSucceeded();
  } on PathAccessException {
    return const SaveFailed(
      'The selected location is not writable.',
    );
  } on FileSystemException {
    return const SaveFailed(
      'The file could not be saved. Check available storage and the destination.',
    );
  }
}

```

Do not hardcode platform errno values into cross-platform business logic unless the repository has a tested platform adapter requiring that distinction.

---

# 59. Disk Full

Directory lookup success says nothing about free capacity at write time.

When storage is exhausted:

- a file operation can fail with a filesystem/OSError;
- preserve the previous valid durable file when possible;
- remove disposable cache only if doing so is safe and meaningful;
- provide actionable user feedback for explicit saves/exports;
- record a privacy-safe error;
- do not retry in an unbounded loop.

The staged-write pattern is especially useful because a failed new write need not destroy the previous valid target before success.

Do not implement “delete all caches on every write failure.” Determine whether the error actually warrants recovery and whether deletion is product-safe.

---

# 60. Concurrent Access

`path_provider` supplies no locking.

Potential conflicts include:

- two services rewriting the same JSON file;
- multiple isolates updating one index;
- migration racing normal database open;
- cleanup deleting a file being produced;
- file replacement while a consumer reads.

Use application-level ownership and coordination.

Dart exposes `RandomAccessFile` locks, but locking semantics differ by operating system and process model; for example, documented behavior differs between POSIX-style and Windows locking. Do not assume a file lock provides identical cross-isolate/process semantics everywhere.

For complex concurrent state, a database/transactional store is often better than many ad hoc mutable files.

---

<!-- END SOURCE -->
