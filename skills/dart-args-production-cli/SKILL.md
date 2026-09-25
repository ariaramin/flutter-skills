---
name: dart-args-production-cli
description: Design, implement, review, debug, test, and evolve Dart and Flutter command-line interfaces with package:args. Use whenever work mentions ArgParser, ArgResults, Command, CommandRunner, flags, options, subcommands, package executables, Dart CLI tooling, Flutter companion scripts, CI/release utilities, or Flutter desktop entrypoint arguments. Also use this skill to decide whether package:args belongs at all; reject it for ordinary Flutter mobile/web settings, routes, deep links, URL query parameters, or build-time configuration unless the executable genuinely receives process command-line arguments.
compatibility: Targets package:args 2.7.0 APIs (minimum Dart 3.3) and modern Dart/Flutter. Re-verify the current package changelog and API before using version-sensitive behavior if a newer release is installed.
---

# Dart `package:args` — Production CLI Engineering Skill

## Purpose

Use this skill as the decision and implementation layer for production Dart/Flutter CLI work.

Treat `package:args` as an adapter for **process or Dart-entrypoint arguments**. Do not treat it as a general Flutter settings, navigation, persistence, environment, or configuration library.

## Trigger Rules

Use this skill for:

- Dart command-line applications and package executables.
- `ArgParser`, `ArgResults`, flags, options, multi-options, aliases, positionals, and parsing errors.
- `Command<T>`, `CommandRunner<T>`, commands, subcommands, help, and usage failures.
- Flutter companion tooling such as release, build, localization, migration, asset, bootstrap, and code-quality utilities.
- CI/CD utilities implemented in Dart.
- Flutter Windows/macOS/Linux apps that intentionally receive Dart entrypoint arguments.
- Reviewing, debugging, testing, migrating, or optimizing existing `package:args` code.
- Deciding whether `package:args` is appropriate at all.

Do not activate `args` merely because:

- a Flutter app has settings;
- a web app has query parameters;
- an app receives a deep link;
- the project uses `--dart-define`;
- configuration must persist between launches.

## Research Baseline

This skill targets current stable `package:args` **2.7.0**, minimum **Dart 3.3**. Current relevant features include typed `ArgResults.flag()`, `option()`, and `multiOption()`, aliases, mandatory single options, `hideNegatedUsage`, and generic `Command<T>` / `CommandRunner<T>`.

If the project resolves another version, inspect `pubspec.lock`, the current official API, and the changelog before relying on version-sensitive behavior. Never copy an unreleased API from the repository default branch into code targeting 2.7.0.

## Core Principles

1. **MUST determine whether the executable genuinely receives process/Dart-entrypoint arguments before adding `package:args`.**
2. **MUST parse at the outer boundary**: normally `main(List<String> arguments)`, a CLI adapter, or `Command.run()`.
3. **MUST convert `ArgResults` into typed application data promptly.** Domain/application services should not depend on `package:args`.
4. **MUST separate parser/syntax validation from semantic/domain validation.**
5. **MUST parse one invocation once.**
6. **SHOULD centralize parser construction and canonical option names.**
7. **SHOULD use typed `ArgResults` accessors** rather than dynamic `operator []` in new code.
8. **SHOULD treat CLI syntax and defaults as public API** once scripts or users depend on them.
9. **SHOULD scope options to the narrowest meaningful command.**
10. **SHOULD keep parser construction declarative and side-effect-free.**
11. **SHOULD create heavy dependencies after parsing/command selection when startup cost justifies it.**
12. **SHOULD NOT use parser callbacks as the main application-control mechanism.** Parse first, map, validate, then execute.
13. **SHOULD NOT put secrets in command arguments by default.**
14. **NEVER use `package:args` for browser URL/query parsing or mobile deep-link parsing.**
15. **NEVER confuse `Platform.executableArguments` with the program argument list.** Program args normally come from `main(List<String>)`.
16. **PREFER correctness, discoverability, stable behavior, and testability over parser micro-optimization.**

## First Decision: Should `package:args` Be Used?

```text
Does the executable receive process/Dart-entrypoint arguments?
|
+-- No
|   `-- Do not use package:args.
|
`-- Yes
    |
    +-- Is this ordinary Android/iOS/Web app configuration?
    |   `-- Usually do not use package:args.
    |       Use routes/deep links, runtime state/config,
    |       environment declarations, platform APIs, or persistence.
    |
    +-- Tiny single-purpose executable?
    |   `-- Use ArgParser directly.
    |
    +-- Meaningful commands/subcommands?
    |   `-- Prefer CommandRunner + Command.
    |
    `-- Flutter desktop app deliberately launched with arguments?
        `-- Parse only arguments intentionally forwarded to Dart main().
```

## Flutter Platform Matrix

| Target/use case | Typical relevance | Preferred pattern |
|---|---:|---|
| Flutter Android runtime | Low | Deep links/intents/runtime config/persistence/build-time declarations |
| Flutter iOS runtime | Low | Deep links/universal links/runtime config/persistence/build-time declarations |
| Flutter Web runtime | Very low for process args | Router, `Uri`, browser URL/query handling, compilation environment |
| Flutter Windows desktop | Medium when deliberately wired | Dart entrypoint args at `main(List<String>)` |
| Flutter macOS desktop | Medium/high when launch args matter | Dart entrypoint args at `main(List<String>)` |
| Flutter Linux desktop | Medium/high when launch args matter | Dart entrypoint args at `main(List<String>)` |
| Flutter project companion CLI | High | Separate `bin/` or `tool/` Dart CLI |
| CI/CD Dart utility | High | Stable deterministic CLI |

Desktop capability does not imply every GUI app should expose CLI syntax. Verify the native/generated runner when exact Windows/macOS/Linux forwarding behavior matters.

## Mental Model

```text
shell / launcher / native embedder
            ↓
        List<String>
            ↓
 ArgParser / CommandRunner
            ↓
        ArgResults
            ↓
 validate + map at boundary
            ↓
 typed immutable config/request
            ↓
 application/domain logic
```

`ArgResults` is an adapter-layer object, not application state.

## Choose the Right Abstraction

### Use plain `ArgParser` when

- the executable has one main operation;
- it has a modest set of flags/options/positionals;
- manual dispatch remains trivial.

### Use `CommandRunner` when

- there are several meaningful commands;
- commands have distinct option sets;
- subcommands improve the user model;
- built-in help/dispatch/usage behavior is valuable;
- commands should be independently testable.

Do not use `CommandRunner` merely to make a tiny script look architectural.

## Core API Rules

### `ArgParser`

Use current APIs:

```dart
final parser = ArgParser()
  ..addFlag(
    'verbose',
    abbr: 'v',
    negatable: false,
    help: 'Show additional diagnostics.',
  )
  ..addOption(
    'mode',
    defaultsTo: 'debug',
    allowed: const ['debug', 'release'],
    valueHelp: 'mode',
  )
  ..addMultiOption(
    'include',
    splitCommas: false,
    valueHelp: 'path',
  );
```

### `ArgResults`

Prefer:

```dart
final verbose = results.flag('verbose');
final mode = results.option('mode');
final includes = results.multiOption('include');
final positional = results.rest;
```

Use canonical option names. Aliases are invocation syntax, not separate application keys.

### Mandatory option nuance

A missing `mandatory: true` single option is validated when the value is **retrieved from `ArgResults`**, not simply when `parse()` is called. Read/convert required values immediately at the CLI boundary and handle the resulting `ArgumentError` as expected user input where appropriate.

### Multi-options

Repeated values accumulate. By default comma-separated values split as well. Set `splitCommas: false` when commas are literal or when one repeated-option grammar is preferred.

### Flags

Flags are negatable by default. Use `negatable: false` when `--no-...` is not a sensible public contract. Avoid double-negative names.

### `--`

`--` ends option parsing. Use it before dash-prefixed positional values such as filenames or negative numbers when ambiguity is possible.

### Trailing options

`ArgParser()` defaults to `allowTrailingOptions: true`. Set it to false only when the CLI intentionally stops parsing options after the first positional.

## Required Typed Boundary

Convert parser output before entering application logic:

```dart
enum BuildMode { debug, release }

final class BuildRequest {
  const BuildRequest({
    required this.mode,
    required this.outputDirectory,
    required this.verbose,
  });

  final BuildMode mode;
  final String outputDirectory;
  final bool verbose;
}

BuildRequest parseBuildRequest(ArgResults results) {
  final mode = switch (results.option('mode')) {
    'debug' => BuildMode.debug,
    'release' => BuildMode.release,
    final value => throw ArgumentError.value(value, 'mode'),
  };

  final output = results.option('output');
  if (output == null || output.trim().isEmpty) {
    throw ArgumentError('Provide a non-empty --output value.');
  }

  return BuildRequest(
    mode: mode,
    outputDirectory: output,
    verbose: results.flag('verbose'),
  );
}
```

For a larger codebase, keep this mapper in the CLI adapter layer so domain-owned request objects do not import `package:args`.

## Validation Model

### Parser/syntax validation

Let `args` handle:

- known option/flag names;
- required option values;
- `allowed` membership;
- negation syntax;
- command recognition;
- parser definition conflicts.

### Semantic/domain validation

Handle after parsing:

- required positional count;
- mutually exclusive options;
- cross-field rules;
- numeric ranges;
- URIs;
- paths/filesystem state;
- permissions;
- business constraints.

Do not overload `ArgParser` with application semantics.

## Error Policy

### Plain parser

- Malformed CLI grammar: catch `ArgParserException` (`FormatException`).
- Missing mandatory single option on retrieval: handle `ArgumentError` where it represents user input.
- Unexpected programmer/runtime failures: do not disguise them as parser failures.

### `CommandRunner`

Catch `UsageException` for user-correctable invocation errors. Let unexpected defects follow the program’s normal diagnostic policy.

### Exit status

`package:args` does not define your exit-code taxonomy.

- Use `0` for success by convention.
- Use documented non-zero codes for expected failures when automation depends on them.
- Prefer setting top-level `dart:io` `exitCode` after awaited cleanup.
- Avoid deep `exit()` calls; `exit()` is immediate and does not wait for async operations or run `finally` blocks.

## Command Architecture

A production `Command<T>` should:

1. declare command-local syntax;
2. read `argResults` at the boundary;
3. validate semantics;
4. build a typed request;
5. call an application service;
6. return a small status/result if the runner uses one.

Keep business logic out of the command class.

```dart
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
    final request = parseRequest(argResults);
    await _service.build(request);
    return 0;
  }
}
```

## Help and Version

- Give every public option/command useful `help` text.
- Use `valueHelp` for values such as `path`, `mode`, `uri`, or `seconds`.
- Use `allowedHelp` when enum-like values need explanation.
- Use `ArgParser.usage` for plain parsers.
- Let `CommandRunner` provide its built-in help command and `--help` handling.
- Implement `--version` explicitly; do not assume `CommandRunner` does it automatically.

## Configuration Source Rules

Use CLI arguments for explicit per-invocation user/script input.

Use other mechanisms when they own the data:

- environment variables for process/deployment-owned configuration;
- config files for structured reusable settings;
- Flutter `--dart-define` / constant environment declarations for compile-time/build configuration;
- routes/deep links/`Uri` for navigation and browser/mobile URLs;
- persistence/state for application settings.

When sources combine, define precedence explicitly and use `wasParsed()` when you must distinguish an explicit CLI value from a parser default.

## Flutter Rules

### Android/iOS

Do not model deep links, platform intents, or normal app settings as command-line arguments. Prefer Flutter navigation/deep-link APIs and platform/runtime configuration.

### Web

Do not use `package:args` to parse browser paths, fragments, or query parameters. Use `Uri`, `Uri.base`, router APIs, and browser mechanisms.

### Desktop

`main(List<String> arguments)` can be an intentional launch boundary when the Windows/macOS/Linux embedder or launcher forwards entrypoint arguments. Verify the target runner if behavior is contract-critical.

### Companion tooling

Prefer a separate Dart CLI for Flutter build/release/migration/generation tasks rather than coupling the Flutter UI runtime to CLI types.

## Package Executables

- Public tools: `bin/`.
- Private development-only tools: top-level `tool/`.
- Expose public commands through `pubspec.yaml` `executables` when needed.
- During development, use `dart run ...` and pass program arguments after the target.
- On Dart 3.10+, prefer `dart install` for global CLI installation.
- `dart pub global activate` remains relevant for legacy/older SDK compatibility but is now legacy guidance.

## Security Rules

Review whether argument values can appear in:

- shell history;
- process inspection;
- CI command logs;
- verbose/error output.

Prefer secret stores, protected environment injection, stdin, restricted files, or OS credential stores where appropriate. `package:args` does not encrypt or redact values.

## Performance Rules

Do not invent benchmark claims.

Optimize only after measurement. Prioritize:

- expensive I/O before parsing;
- unnecessary Flutter engine/UI startup for pure tooling;
- eager network/database initialization;
- constructing every command’s heavy services before selection;
- repeated parsing.

A normal parser and one `parse()` call are rarely the first place to speculate about performance.

## Testing Rules

Prefer direct parser/runner tests with `List<String>`.

Unit-test:

- defaults and explicit values;
- flag negation;
- allowed-value failures;
- multi-options;
- positionals and `--`;
- aliases and `wasParsed()` where relevant;
- command selection;
- semantic validation;
- usage failures.

Use subprocess tests only for actual process contracts such as exit codes, stdout/stderr, executable packaging, or launcher behavior.

## Compatibility Rules

Treat option names, aliases, commands, defaults, output schema, and exit status as public contracts when automation depends on them.

For renames, prefer a migration period using aliases. Changing a default can be breaking even when syntax still parses.

## Common Anti-Patterns

Never approve these without a specific justified exception:

- `ArgParser` inside ordinary Flutter widget/business code.
- `ArgResults` passed into services/repositories/domain objects.
- scattered `results['key']` access.
- business logic in parser callbacks.
- every validation rule forced into parser declaration.
- every exception converted to `UsageException`.
- CLI args used as secret storage.
- duplicated/shadowed global and command-local option names.
- unstable aliases/abbreviations/defaults.
- repeated parsing of the same invocation.
- expensive I/O during parser construction.
- deep `exit()` inside async work.
- Android/iOS/Web treated as generic desktop CLI processes.
- parser optimization without profiling.

## Reference Loading Guide

Read only the reference relevant to the task:

- **`references/parser-api.md`** — `ArgParser`, `ArgResults`, options, flags, multi-options, aliases, abbreviations, positionals, ordering, `--`, and current API inventory.
- **`references/commands-and-validation.md`** — `CommandRunner`, `Command`, nested commands, typed configuration, custom types, paths, and two-stage validation.
- **`references/flutter-and-operations.md`** — errors, exits, help/version, config precedence, Flutter integration, desktop arguments, package executables, output, security, performance, async cleanup, CI, and evolution.
- **`references/testing-and-review.md`** — full tests, production templates, decision trees, edge cases, anti-patterns, debugging, and review checklists.
- **`references/sources.md`** — authoritative source URLs plus final validation checklist; read this whenever an API/version/platform behavior is uncertain.

## AI Operating Procedure

### Before implementation

1. Identify the executable and platforms.
2. Confirm the input is actual process/Dart-entrypoint argv.
3. Decide whether another configuration mechanism owns the input better.
4. Inspect the resolved `args` version if version-sensitive.
5. Choose plain `ArgParser` or `CommandRunner` based on user-facing structure.
6. Load the relevant reference file above.

### During implementation

1. Centralize parser construction and canonical keys.
2. Parse once.
3. Use current typed APIs.
4. Convert to typed application data.
5. Validate semantics explicitly.
6. Keep domain/application logic independent of `package:args`.
7. Keep output and services testable.
8. Preserve stable syntax and helpful usage.

### During review

Inspect both parser semantics and architecture/platform fit. Test invalid and edge-case inputs, not only one happy path.

### During optimization

Measure first. Move expensive I/O/dependency construction after parsing and command selection before considering parser micro-optimization.

## Final Review Checklist

- [ ] `package:args` is actually appropriate for this executable.
- [ ] Process/Dart-entrypoint arguments are real on the target platform.
- [ ] Arguments are parsed once at the outer boundary.
- [ ] `ArgResults` is converted to typed data promptly.
- [ ] Canonical option keys are centralized.
- [ ] Typed accessors are used in new code.
- [ ] Syntax and semantic validation are separated.
- [ ] Mandatory single-option retrieval semantics are handled.
- [ ] Global vs command-local ownership is unambiguous.
- [ ] Positionals, `--`, aliases, defaults, negation, and multi-options are tested where used.
- [ ] CLI syntax/defaults are treated as compatibility contracts.
- [ ] Secrets are not casually exposed in argv/logs.
- [ ] Help and errors are actionable.
- [ ] Unexpected defects are not mislabeled as usage errors.
- [ ] Exit/cleanup behavior is safe for async work.
- [ ] Flutter Android/iOS/Web use platform-appropriate mechanisms.
- [ ] Desktop forwarding is verified when launch args are a feature.
- [ ] `--dart-define`, environment variables, config files, URLs, and deep links are not conflated with argv.
- [ ] Tests cover invalid/edge cases.
- [ ] Performance claims are measured or explicitly framed as engineering inference.
