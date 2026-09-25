# Commands, Typed Boundaries, and Validation

Use this reference for `CommandRunner`, `Command`, nested commands, global vs local options, typed configuration mapping, custom type conversion, paths, and two-stage validation.

## Contents
- Commands and CommandRunner
- Command design and nesting
- Global vs command-local syntax
- Typed configuration boundary
- Strings to domain types
- File/path arguments
- Syntax vs semantic validation

## Commands

Plain `ArgParser.addCommand()` is sufficient when you only need lightweight nested parsing and will handle dispatch/help yourself.

Prefer `CommandRunner` when you need several of these:

- command discovery and dispatch;
- nested subcommands;
- built-in help command and `--help` handling;
- command descriptions/categories;
- command aliases/suggestions;
- standardized `UsageException` behavior;
- independently testable command classes.

### Parser-level command example

```dart
final parser = ArgParser();
final build = parser.addCommand('build')
  ..addFlag('watch', negatable: false);

final results = parser.parse(['build', '--watch']);
final command = results.command;

if (command?.name == 'build') {
  final watch = command!.flag('watch');
  // Convert and dispatch.
}
```

For nontrivial command CLIs, do not hand-build an ever-growing `switch`; move to `CommandRunner`.

## `CommandRunner`

### Canonical architecture

```dart
import 'dart:io';

import 'package:args/command_runner.dart';

Future<void> main(List<String> arguments) async {
  final runner = CommandRunner<int>(
    'acme',
    'Acme project automation.',
  )..addCommand(BuildCommand(BuildService()));

  try {
    final status = await runner.run(arguments);
    exitCode = status ?? 0;
  } on UsageException catch (error) {
    stderr.writeln(error);
    exitCode = 64;
  }
}

final class BuildCommand extends Command<int> {
  BuildCommand(this._service) {
    argParser
      ..addOption(
        'mode',
        defaultsTo: 'debug',
        allowed: const ['debug', 'release'],
      )
      ..addFlag('verbose', negatable: false);
  }

  final BuildService _service;

  @override
  String get name => 'build';

  @override
  String get description => 'Build project artifacts.';

  @override
  Future<int> run() async {
    final request = BuildRequest(
      mode: argResults.option('mode')!,
      verbose: argResults.flag('verbose'),
    );

    await _service.build(request);
    return 0;
  }
}

final class BuildRequest {
  const BuildRequest({required this.mode, required this.verbose});

  final String mode;
  final bool verbose;
}

final class BuildService {
  Future<void> build(BuildRequest request) async {
    // Application work. No package:args dependency here.
  }
}
```

### What `CommandRunner` gives you

- A global `--help` / `-h` flag.
- A built-in `help` command.
- Command dispatch.
- Command-local help support.
- Usage formatting.
- Unknown-command handling and suggestions.
- Conversion of parsing/dispatch usage failures into `UsageException`.
- Async command execution through `FutureOr<T>` / awaited command results.

### What it does not give you

- Business/domain validation.
- Logging architecture.
- Dependency injection.
- Secret management.
- Configuration-file loading.
- Signal/cancellation management.
- A project-specific exit-code taxonomy.
- Automatic `--version` behavior.
- JSON serialization or machine-output policy.

## `Command<T>` Design

A command SHOULD:

1. Declare command-local syntax in its constructor.
2. Read `argResults` only at the command boundary.
3. Validate command semantics.
4. Convert input into a typed request/configuration.
5. Invoke an application service.
6. Return a small result/status if the runner architecture uses one.

A command SHOULD NOT:

- contain hundreds of lines of business logic;
- initialize every heavy dependency in its constructor;
- pass `ArgResults` to repositories/services;
- catch arbitrary bugs and turn them into usage failures;
- print from every layer if output needs to be tested or structured.

### Command aliases

Override `aliases` for stable command synonyms when necessary. Use aliases for compatibility, not to create many hidden spellings. `suggestionAliases` may improve typo/migration suggestions without making a name a valid invocation alias.

### Hidden commands

Use `hidden` only for genuinely internal/deprecated compatibility paths. Hiding a command does not make it secure or inaccessible.

### Leaf commands vs parent commands

A command with subcommands is a branch; let the subcommands do the work. Keep executable logic on meaningful leaf commands unless a deliberate top-level behavior is required by the current API and design.

## Nested Commands

```dart
final class DatabaseCommand extends Command<int> {
  DatabaseCommand(DatabaseService service) {
    addSubcommand(MigrateCommand(service));
    addSubcommand(StatusCommand(service));
  }

  @override
  String get name => 'database';

  @override
  String get description => 'Manage the application database.';
}

final class MigrateCommand extends Command<int> {
  MigrateCommand(this._service) {
    argParser.addFlag('dry-run', negatable: false);
  }

  final DatabaseService _service;

  @override
  String get name => 'migrate';

  @override
  String get description => 'Apply pending database migrations.';

  @override
  Future<int> run() async {
    final dryRun = argResults.flag('dry-run');
    await _service.migrate(dryRun: dryRun);
    return 0;
  }
}

final class StatusCommand extends Command<int> {
  StatusCommand(this._service);

  final DatabaseService _service;

  @override
  String get name => 'status';

  @override
  String get description => 'Show migration status.';

  @override
  Future<int> run() async {
    await _service.status();
    return 0;
  }
}
```

Use nested commands when the hierarchy is part of the user’s mental model, such as `database migrate`. Do not create deep command trees merely to mirror internal class structure.

## Global vs Command-Local Options

Make an option global only if its meaning is consistent across most commands, for example:

- `--verbose`
- `--quiet`
- `--no-color`
- a shared workspace/project selector

Keep operation-specific options on their commands.

Avoid declaring the same name/abbreviation globally and locally. The parser resolves options toward the right-most applicable command, which can make shadowed syntax surprising. Prefer one owner for one option name.

## Typed Configuration Boundary

### Required pattern

```text
raw argv
  ↓
ArgParser / CommandRunner
  ↓
ArgResults
  ↓
parse required strings + semantic validation
  ↓
typed immutable object
  ↓
application/domain service
```

### Production template

```dart
enum BuildMode { debug, release }

final class BuildOptions {
  const BuildOptions({
    required this.mode,
    required this.outputDirectory,
    required this.verbose,
    required this.includes,
  });

  final BuildMode mode;
  final String outputDirectory;
  final bool verbose;
  final List<String> includes;

  factory BuildOptions.fromArgs(ArgResults results) {
    final mode = switch (results.option('mode')) {
      'debug' => BuildMode.debug,
      'release' => BuildMode.release,
      final value => throw ArgumentError.value(value, 'mode'),
    };

    final output = results.option('output');
    if (output == null || output.trim().isEmpty) {
      throw ArgumentError('Missing a non-empty --output value.');
    }

    return BuildOptions(
      mode: mode,
      outputDirectory: output,
      verbose: results.flag('verbose'),
      includes: List.unmodifiable(results.multiOption('include')),
    );
  }
}
```

For larger systems, keep this factory in the CLI adapter layer rather than importing `package:args` into a domain model. An even cleaner boundary is a separate mapper function that returns a domain-owned request object.

## Strings to Custom Types

`args` fundamentally parses option values as strings (or lists of strings) and flags as booleans. Convert domain types explicitly.

### Integer

```dart
int parsePort(String? raw) {
  final value = int.tryParse(raw ?? '');
  if (value == null || value < 1 || value > 65535) {
    throw ArgumentError('Expected --port to be an integer from 1 to 65535.');
  }
  return value;
}
```

### Duration

```dart
Duration parseTimeout(String? raw) {
  final seconds = int.tryParse(raw ?? '');
  if (seconds == null || seconds < 0) {
    throw ArgumentError('Expected --timeout to be a non-negative number of seconds.');
  }
  return Duration(seconds: seconds);
}
```

### URI

```dart
Uri parseEndpoint(String? raw) {
  final value = raw == null ? null : Uri.tryParse(raw);
  if (value == null || !value.hasScheme || value.host.isEmpty) {
    throw ArgumentError('Expected --endpoint to be an absolute URI.');
  }
  return value;
}
```

### Enum

Use `allowed` to reject invalid CLI spellings early, then map the canonical user-facing strings to an enum. Do not couple public CLI names to `enum.name` if you might rename internal enum values later.

## File and Path Arguments

`package:args` only gives you strings. Filesystem semantics belong to `dart:io` and path handling utilities.

After parsing:

- decide whether a path is interpreted relative to `Directory.current`;
- normalize/resolve it with appropriate path tooling if needed;
- validate file/directory existence only when the operation requires it;
- avoid assuming `/` or `\\` semantics manually;
- separate parsing from filesystem I/O.

Do not perform existence checks inside parser construction.

## Validation

Use a two-stage model.

### Stage 1 — parser/syntax validation

Let `args` handle concerns it actually knows:

- recognized option/flag names;
- whether a value is required after an option;
- whether a value is in `allowed`;
- option syntax and negation rules;
- command recognition;
- option definition conflicts.

### Stage 2 — semantic/domain validation

Validate after parsing:

- required positional count;
- cross-option requirements;
- mutually exclusive options;
- conditional requirements;
- numeric ranges;
- URI semantics;
- paths/filesystem state;
- account/project existence;
- permissions;
- business constraints.

### Cross-option template

```dart
void validateDeploy(DeployOptions options) {
  if (options.dryRun && options.force) {
    throw ArgumentError('--dry-run and --force cannot be used together.');
  }
  if (options.environment == 'production' && !options.confirmed) {
    throw ArgumentError('Production deployment requires --confirm.');
  }
}
```

In a `Command`, convert an expected user correction into a concise usage failure:

```dart
@override
Future<int> run() async {
  final target = argResults.option('target');
  if (target == null || target.isEmpty) {
    throw usageException('Provide a non-empty --target value.');
  }
  // ...
  return 0;
}
```

Do not convert programmer bugs, network defects, null-safety mistakes, or invariant failures into `UsageException` merely to hide stack traces.

## Error Handling
