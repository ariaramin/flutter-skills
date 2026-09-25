# Parser API and Parsing Semantics

Use this reference when implementing or debugging `ArgParser`, `ArgResults`, options, flags, multi-options, aliases, abbreviations, positionals, ordering, or `--` behavior.

## Contents
- Current API inventory
- ArgParser fundamentals
- Option/flag/positional decisions
- Single and multi-value option semantics
- Aliases and abbreviations
- Positional and ordering rules

## Current API Inventory

| API | Purpose | Typical use | Important behavior / errors | Status in 2.7.0 |
|---|---|---|---|---|
| `ArgParser` | Define and parse options, flags, multi-options, and parser-level commands | Small/simple CLIs | `parse()` is synchronous; malformed syntax throws `ArgParserException` (`FormatException`) | Current |
| `ArgResults` | Read parsed values, positionals, selected command, original arguments | Boundary conversion | Prefer typed accessors; mandatory single option fails on retrieval if absent | Current |
| `ArgParserException` | Specific parse failure | Catch plain-parser syntax errors | Extends `FormatException`; may carry argument/command/source context | Current |
| `Option` | Metadata for a declared option | Introspection/help/framework code | Exposes type, aliases, defaults, allowed values, visibility, etc. | Current |
| `OptionType` | Flag/single/multiple classification | Introspection | Values: `flag`, `single`, `multiple` | Current |
| `Command<T>` | Encapsulate one command/subcommand | Multi-command CLI | Provides `argParser`, `argResults`, subcommands; `run()` may be async | Current |
| `CommandRunner<T>` | Parse, dispatch, help, command hierarchy | Medium/large CLIs | Built-in `help` command/`--help`; usage problems surface as `UsageException` | Current |
| `UsageException` | User-facing command usage failure | CommandRunner error boundary | Formats message with usage; do not use for programmer bugs | Current |

### Avoid obsolete APIs

- Use `ArgParser.usage`, not old `getUsage()` APIs.
- Use `Option.abbr`, not old `abbreviation` APIs.
- Use `Option.defaultsTo`, not old `defaultValue` APIs.
- Use `addMultiOption()` rather than old multi-value forms on `addOption()`.
- Prefer `ArgParser.defaultFor()` over deprecated `getDefault()`.
- Prefer typed `ArgResults` accessors introduced in modern releases.

## `ArgParser` Fundamentals

### Canonical parser

```dart
import 'package:args/args.dart';

ArgParser buildParser() => ArgParser()
  ..addFlag(
    'verbose',
    abbr: 'v',
    negatable: false,
    help: 'Show additional diagnostic output.',
  )
  ..addOption(
    'mode',
    abbr: 'm',
    defaultsTo: 'debug',
    allowed: const ['debug', 'release'],
    allowedHelp: const {
      'debug': 'Build with developer diagnostics.',
      'release': 'Build optimized output.',
    },
    valueHelp: 'mode',
    help: 'Select the build mode.',
  )
  ..addMultiOption(
    'include',
    abbr: 'I',
    valueHelp: 'path',
    splitCommas: false,
    help: 'Add an include path. Repeat to add more than one.',
  );
```

### Parse once

```dart
void main(List<String> arguments) {
  final parser = buildParser();
  final results = parser.parse(arguments);

  final verbose = results.flag('verbose');
  final mode = results.option('mode')!;
  final includes = results.multiOption('include');
  final positional = results.rest;

  // Convert to typed application input here.
}
```

### Definition-time rules

- Option names must satisfy `args` naming rules; do not begin them with `-` yourself.
- `abbr` is a single-character abbreviation.
- Names, aliases, and abbreviations must not conflict within the applicable parser hierarchy.
- Duplicate declarations are programmer/configuration errors, not user input errors.
- `mandatory: true` cannot be combined with a default value for a single option.
- `hide: true` hides an option from generated usage; it does not make the option inaccessible.
- `hideNegatedUsage: true` is for a negatable flag whose `--no-...` form should not be shown in usage.
- `addSeparator()` affects usage presentation only.

### Reuse

An `ArgParser` definition may be reused to parse independent argument lists. The package creates per-parse state internally. Still, **do not repeatedly parse the same invocation** as a substitute for a typed configuration boundary.

### `ArgParser.allowAnything()`

Use `ArgParser.allowAnything()` only when a command intentionally passes arbitrary tokens through to another program or subsystem and you do not want this parser to interpret them as options. Do not use it to silently ignore malformed user input in a normal CLI.

## Option vs Flag vs Positional Argument

| Requirement | Choose | Example | Rule |
|---|---|---|---|
| Boolean on/off behavior | Flag | `--verbose` | Prefer positive names; use negation only when useful. |
| One named string/value | Option | `--output build/` | Best when order should not carry meaning. |
| Repeated named values | Multi-option | `--include lib --include test` | State whether comma splitting is part of the contract. |
| Required identity/object naturally read in order | Positional | `copy source dest` | Validate count and meaning explicitly. |
| Major operation with its own options | Command | `tool build` | Prefer over giant action enums. |
| Hierarchical operation | Subcommand | `tool database migrate` | Use only when hierarchy improves comprehension. |

### Flag naming

Prefer:

```text
--verbose
--color / --no-color
--cache / --no-cache
```

Avoid double negatives such as `--no-disable-cache`.

For a flag that should never accept `--no-...`:

```dart
parser.addFlag('verbose', negatable: false);
```

### Negatable flags

Flags are negatable by default. A negatable flag accepts both `--flag` and `--no-flag`. Pick a default that makes both forms understandable. If showing `--[no-]flag` in help would confuse users but you still need the negated form for compatibility, evaluate `hideNegatedUsage`.

## Options and Multi-Options

### Single option forms

Given:

```dart
parser.addOption('output', abbr: 'o');
```

`args` supports common forms such as:

```text
--output=build/
--output build/
-obuild/
-o build/
```

If the same single-value option appears more than once, **the later value wins**.

### Allowed values

Use `allowed` for syntax-level membership constraints:

```dart
parser.addOption(
  'mode',
  allowed: const ['debug', 'profile', 'release'],
);
```

An unsupported value is a parse failure (`ArgParserException`). Use `allowedHelp` to explain values in generated usage. In 2.7.0, `allowedHelp` display ordering follows the insertion order of the supplied map; do not rely on automatic sorting.

### Mandatory single options

```dart
parser.addOption('project', mandatory: true);
```

Current behavior is subtle: a missing mandatory single option is validated when its value is **retrieved from `ArgResults`**, not merely by calling `parse()`. Therefore, retrieve/convert all required values immediately at the boundary and handle the resulting `ArgumentError` as user input where appropriate.

Do not assume `mandatory` exists for every option kind. For required flags, multi-options, positionals, or cross-option requirements, perform explicit semantic validation.

### Multi-options

```dart
parser.addMultiOption('include');
```

Repeated values accumulate:

```text
--include lib --include test
```

By default, comma-separated values are also split:

```text
--include lib,test
```

If a literal comma must remain inside a value or you want one unambiguous syntax, set:

```dart
parser.addMultiOption('include', splitCommas: false);
```

`ArgResults.multiOption()` returns a `List<String>`.

### Empty values

`--name=` is a supplied empty string, not the same as an omitted option. Decide explicitly whether empty strings are valid during semantic validation.

## Aliases and Abbreviations

### Aliases

Use aliases primarily for compatibility and migrations:

```dart
parser.addOption(
  'output',
  aliases: const ['out'],
  help: 'Output directory.',
);
```

Treat `output` as the canonical name in application code:

```dart
final output = results.option('output');
```

Do not scatter alias names through `ArgResults` lookups. Aliases are parser syntax, not separate configuration keys.

### Abbreviations

Use a one-character `abbr` only for common interactive options:

```dart
parser
  ..addFlag('verbose', abbr: 'v')
  ..addFlag('force', abbr: 'f');
```

Multiple flag abbreviations may be collapsed, for example `-vf`. If a short option consumes a value, the remainder of the token may be its value. Avoid clever short-option designs that are hard to read or conflict with command-local options.

## Positional Arguments and Ordering

Read positionals from `ArgResults.rest`.

```dart
final rest = results.rest;
if (rest.length != 2) {
  throw ArgumentError('Expected SOURCE and DESTINATION.');
}
final source = rest[0];
final destination = rest[1];
```

### Trailing options

`ArgParser()` defaults to `allowTrailingOptions: true`, so options may still be parsed after positional values. Set `allowTrailingOptions: false` if the first positional should end option parsing.

### `--`

Use `--` to end option parsing explicitly. Tokens after it are positional, even if they begin with `-`.

```text
tool inspect -- -literal-name
```

This is especially useful for positional negative numbers or filenames that begin with a dash.

### Values beginning with `-`

A named option that consumes the following token can accept a value beginning with `-`, and `--name=-1` is unambiguous. A positional token beginning with `-` can otherwise look like an option; prefer `--` before such positionals.

### Commands and positionals

With parser-level commands, do not put ordinary positional arguments before the command name. `args` rejects arguments before a command. Design the syntax so command selection is obvious.

