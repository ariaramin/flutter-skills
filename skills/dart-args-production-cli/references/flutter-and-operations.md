# Flutter Integration and CLI Operations

Use this reference for error handling, exit codes, help/version, configuration precedence, Flutter mobile/web/desktop integration, package executables, output/logging, security, performance, async cleanup, CI, and CLI evolution.

## Contents
- Error handling and exit codes
- Help and version
- Configuration precedence and `--dart-define`
- Flutter Web/mobile non-use cases
- Flutter desktop entrypoint arguments
- Package executables and `dart install`
- Architecture, output, shell model
- Security and performance
- Async commands, CI, compatibility


### Plain `ArgParser`

Malformed CLI syntax throws `ArgParserException`, which extends `FormatException`.

```dart
import 'dart:io';
import 'package:args/args.dart';

void main(List<String> arguments) {
  final parser = buildParser();

  try {
    final results = parser.parse(arguments);
    final config = BuildOptions.fromArgs(results);
    // Execute.
  } on ArgParserException catch (error) {
    stderr.writeln('Error: ${error.message}');
    stderr.writeln();
    stderr.writeln(parser.usage);
    exitCode = 64;
  } on ArgumentError catch (error) {
    stderr.writeln('Error: ${error.message}');
    exitCode = 64;
  }
}
```

### Mandatory option nuance

A missing `mandatory: true` single option can raise `ArgumentError` when `option()` / retrieval occurs. Do not catch only `ArgParserException` and assume every input validation failure happened during `parse()`.

### `CommandRunner`

Treat `UsageException` as expected user-correctable invocation failure:

```dart
try {
  final status = await runner.run(arguments);
  exitCode = status ?? 0;
} on UsageException catch (error) {
  stderr.writeln(error);
  exitCode = 64;
}
```

Allow unexpected exceptions to propagate to the program’s general error/reporting policy, or catch them separately only when you can preserve diagnostic value.

## Exit Codes

`package:args` does **not** define your application’s exit-code taxonomy.

Use these rules:

- `0` for success by convention.
- Use a stable non-zero code for expected usage/configuration failures if scripts depend on it.
- Document any nontrivial exit-code contract.
- Prefer assigning top-level `dart:io` `exitCode` after awaited cleanup over calling `exit()` deep inside services.
- `exit(code)` terminates the Dart process immediately; it does not wait for asynchronous work and does not execute `finally` blocks. Avoid it when cleanup or buffered output matters.
- For cross-platform custom statuses, keep values conservative; Dart documentation recommends `0..127` to avoid platform-specific exit-code issues.

Do not blindly copy `64` just because the package README uses it in an example. If you adopt a sysexits-style code such as 64, make that an explicit application convention.

## Help and Usage

Make generated help part of the product contract.

### Always provide useful help strings

```dart
parser.addOption(
  'output',
  valueHelp: 'directory',
  help: 'Write generated files to this directory.',
);
```

### Prefer discoverability

- Explain what the command does, not implementation details.
- Use `valueHelp` such as `path`, `mode`, `uri`, or `seconds`.
- Use `allowedHelp` where enum-like values need explanation.
- Make defaults intentional; do not hide surprising behavior behind defaults.
- Keep global and command-local wording consistent.
- Use `usageLineLength` only when a known terminal/help format requires it.
- Avoid hidden options unless they are internal, transitional, or unsafe to advertise but still intentionally supported.

### Plain parser help

```dart
stdout.writeln(parser.usage);
```

### `CommandRunner` help

Do not manually reimplement help unless you need a project-specific presentation. `CommandRunner` already adds a help command and `--help` support.

## `--help` and `--version`

`CommandRunner` handles help, but **does not automatically implement your version policy**.

A current `--version` pattern is to parse through the runner, intercept the global version flag, and otherwise dispatch:

```dart
Future<void> runCli(List<String> arguments) async {
  final runner = CommandRunner<int>('acme', 'Acme tools.')
    ..argParser.addFlag(
      'version',
      negatable: false,
      help: 'Print the version and exit.',
    )
    ..addCommand(BuildCommand(BuildService()));

  try {
    final results = runner.parse(arguments);

    if (results.flag('version')) {
      stdout.writeln('acme 1.4.0');
      return;
    }

    exitCode = await runner.runCommand(results) ?? 0;
  } on UsageException catch (error) {
    stderr.writeln(error);
    exitCode = 64;
  }
}
```

Keep the version source centralized; do not duplicate a package version string in many commands.

## Configuration Precedence

When CLI arguments coexist with environment/configuration sources, resolve precedence outside `ArgParser` and produce one typed configuration.

A common explicit policy is:

```text
explicit CLI option
      ↓
environment variable
      ↓
config file
      ↓
application default
```

Do not assume this precedence is universally correct; define it for the product.

### Use `wasParsed()` to distinguish explicit input

```dart
final cliSpecifiedPort = results.wasParsed('port');
final port = cliSpecifiedPort
    ? int.parse(results.option('port')!)
    : environmentPort ?? filePort ?? 8080;
```

Use the canonical option name. `wasParsed()` is useful when a parser default would otherwise hide whether the user explicitly supplied the option.

## Environment Variables vs CLI Arguments vs Config Files

### Prefer CLI arguments when

- the invoker intentionally chooses a value per invocation;
- a script/CI job needs an explicit override;
- the value is visible, non-secret invocation syntax;
- discoverability through `--help` is valuable.

### Prefer environment variables when

- the surrounding process/container environment owns configuration;
- a deployment system naturally injects values;
- the value should not become part of the public command grammar.

### Prefer config files when

- configuration is structured, persistent, or large;
- many related values belong together;
- users need reusable profiles.

The parser is not your entire configuration system. Parse CLI overrides, load other sources separately, resolve precedence, then build a typed config.

## `--dart-define` vs Runtime CLI Arguments

Flutter’s `--dart-define` supplies **compilation environment declarations**, accessed with constant `fromEnvironment` constructors. These are not the same as process environment variables and not the same as runtime argv.

Use build-time environment declarations when the value belongs to compilation/build configuration, such as feature compilation switches or flavors.

Use `package:args` only when the executable itself receives runtime invocation arguments.

Do not replace:

```dart
const apiBase = String.fromEnvironment('API_BASE');
```

with `ArgParser` merely because the build command used a shell flag.

## Flutter Web and Mobile Non-Use Cases

### Flutter Web

Do not use `package:args` for:

- browser address-bar query parameters;
- route paths;
- deep-link URLs;
- fragment identifiers;
- browser configuration.

Use `Uri`, `Uri.base`, Flutter routing, or appropriate browser APIs.

### Android and iOS

Do not treat mobile deep links as CLI arguments. Flutter exposes deep-link/navigation flows designed for Android, iOS, and web. Use route/deep-link APIs or platform integration for those events.

Use build-time configuration, app state, platform channels, preferences, secure storage, or other mechanisms according to ownership of the data.

### Companion CLI preferred pattern

When a Flutter repository needs a release tool, generator, migration utility, or asset pipeline, create a separate Dart CLI rather than making the UI runtime understand development flags.

```text
my_flutter_app/
├── lib/
│   └── ... app runtime ...
├── bin/
│   └── project_tool.dart       # public/reusable CLI if appropriate
├── tool/
│   └── release.dart            # private repo tooling if appropriate
└── lib/src/tooling/
    ├── cli/
    └── application/
```

The app runtime should not import the CLI adapter unless desktop launch arguments are a deliberate runtime feature.

## Flutter Desktop Argument Boundary

A desktop Flutter entrypoint can declare:

```dart
Future<void> main(List<String> arguments) async {
  WidgetsFlutterBinding.ensureInitialized();

  final launch = DesktopLaunchOptions.parse(arguments);

  runApp(MyApp(launchOptions: launch));
}
```

Only do this when the native embedder/launcher actually forwards meaningful arguments.

For a pure validation failure that can be detected before UI startup, consider validating before constructing heavy app dependencies. Do not eagerly initialize databases, networks, or the full application graph just to discover `--help` or an invalid launch option.

When the desktop runner is customized, verify its forwarding behavior on each supported OS. Flutter’s Windows, macOS, and Linux embedder APIs all expose Dart entrypoint argument mechanisms, but native launch conventions differ.

## Package Executables

### Package layout

Public command-line tools belong in `bin/`:

```text
my_tool/
├── bin/
│   └── my_tool.dart
├── lib/
│   └── src/
│       ├── cli/
│       └── application/
├── test/
└── pubspec.yaml
```

Private development-only tools can live in top-level `tool/`.

### Invocation during development

```text
dart run

dart run my_tool --help

dart run :other_executable --help
```

Arguments after the program target are supplied to `main(List<String>)`.

### Publish an executable

```yaml
name: my_tool

environment:
  sdk: ^3.3.0

dependencies:
  args: ^2.7.0

executables:
  my_tool:
```

An empty executable mapping value means the executable name maps to the corresponding `bin/my_tool.dart` script.

### Global installation — current Dart guidance

On Dart 3.10+, prefer:

```text
dart install my_tool
```

`dart install` is the modern globally installed CLI workflow and creates native executables. `dart pub global activate` remains relevant for legacy/older SDK compatibility but is now documented as legacy.

Do not require a Dart 3.10-only installation flow if the package explicitly supports users on older SDKs; document both when compatibility requires it.

## CLI Architecture by Complexity

### Tiny tool

Use one entrypoint and one parser if the whole tool remains understandable:

```text
bin/tool.dart
```

Do not add DI containers, command classes, and layered abstractions to a 30-line utility without a real need.

### Medium tool

```text
bin/tool.dart
lib/src/cli/
lib/src/application/
test/
```

Centralize parsing and typed requests; keep reusable work in application services.

### Large multi-command tool

```text
bin/tool.dart
lib/src/cli/
  runner.dart
  commands/
lib/src/application/
lib/src/domain/
lib/src/infrastructure/
test/
```

Use this only when the problem actually has those boundaries. Architecture should reduce coupling, not create ceremony.

## Output, Logging, and Verbosity

`package:args` parses `--verbose`, `--quiet`, `--json`, or `--no-color`; it does not provide a logging/output framework.

For a small tool, direct `stdout.writeln` / `stderr.writeln` may be enough.

For a tool with tests, structured output, quiet mode, or machine output, inject an output abstraction:

```dart
abstract interface class CliOutput {
  void info(String message);
  void error(String message);
}
```

Then let parsed flags configure that layer. Do not put logging policy into parser callbacks.

### Human vs machine output

If automation consumes the tool, consider explicit syntax such as:

```text
--json
--quiet
--no-color
```

Treat the machine-readable schema as a compatibility contract. `args` only parses the flags; your application owns serialization.

## Standard Input / Output / Error

- `stdout`, `stderr`, `stdin`, terminal behavior, and process interaction belong to `dart:io`, not `package:args`.
- Write expected data to stdout and diagnostics/errors to stderr when scripting compatibility benefits from that separation.
- Keep prompts out of non-interactive/CI paths unless explicitly requested.
- Do not assume terminal capabilities when output is redirected.

## Shell Quoting Mental Model

`ArgParser` does not receive the raw shell command string. The shell (or launcher) tokenizes first.

```text
shell text
   ↓
shell quoting/tokenization
   ↓
List<String> arguments
   ↓
ArgParser
```

For example, a shell may turn:

```text
--name "John Smith"
```

into two Dart arguments (`--name`, `John Smith`). Do not implement shell quoting rules inside `ArgParser` configuration.

## Security

CLI arguments are not secret storage.

### MUST review

- Could the shell save the command in history?
- Could process inspection reveal arguments on the target OS?
- Could CI logs echo the command?
- Could verbose/debug output print parsed values?
- Could an error include a sensitive raw token?

### Prefer safer secret channels where appropriate

- platform/CI secret stores;
- protected environment variables when suitable;
- stdin for interactive secret entry;
- permission-restricted files;
- OS keychain/credential stores.

Never claim `package:args` encrypts, redacts, or hides argument values. It does not.

## Performance

Argument parsing is synchronous and normally a small boundary operation. Do not invent benchmark claims.

### Worth optimizing when measured

- expensive synchronous I/O before parsing;
- Flutter engine/UI startup for work that should be a separate CLI;
- constructing every command’s heavy service graph before command selection;
- network/database initialization before rejecting obvious usage errors;
- parsing the same invocation repeatedly;
- repeatedly generating large help output in hot tooling loops.

### Usually not worth micro-optimizing

- a normal-sized `ArgParser` declaration;
- a single `parse()` call;
- a small static command tree.

### Lazy dependency pattern

Prefer:

```text
parse
  ↓
validate
  ↓
select command
  ↓
construct only required heavy dependencies
  ↓
execute
```

For truly heavy dependencies, inject a lightweight factory rather than the already-created service:

```dart
final class DeployCommand extends Command<int> {
  DeployCommand(this._createService);

  final DeployService Function() _createService;

  @override
  String get name => 'deploy';

  @override
  String get description => 'Deploy the application.';

  @override
  Future<int> run() async {
    final request = _parseRequest();
    final service = _createService();
    await service.deploy(request);
    return 0;
  }
}
```

Do not add factories everywhere unless construction cost or test isolation justifies them.

## Async Commands, Cleanup, and Signals

`Command.run()` may return asynchronous work; `CommandRunner.run()` awaits command results.

```dart
@override
Future<int> run() async {
  final client = ApiClient();
  try {
    await client.execute();
    return 0;
  } finally {
    await client.close();
  }
}
```

Do not call `exit()` from inside the command before `finally`/async cleanup. Return status to the outer boundary or set `exitCode` after awaiting.

Signals, Ctrl-C handling, cancellation tokens, and graceful shutdown are application/`dart:io` concerns, not `args` features.

## CI/CD Design

For automation-facing commands:

- keep option names stable;
- produce deterministic behavior;
- avoid surprise prompts;
- return meaningful non-zero status on failure;
- keep stdout/stderr roles intentional;
- offer machine-readable output only if consumers need it;
- make color configurable or terminal-aware in the output layer;
- document breaking CLI changes;
- avoid defaults that silently change deployments.

## CLI Evolution and Backwards Compatibility

Once scripts rely on a command, treat syntax as a public API.

### Renaming an option

Prefer a compatibility period:

```dart
parser.addOption(
  'output',
  aliases: const ['out'],
  help: 'Output directory.',
);
```

Then:

1. parse both spellings;
2. read only the canonical `output` key;
3. optionally warn when the old spelling is explicitly used if your layer can identify it reliably;
4. document removal timing;
5. remove the alias only in an intentional breaking release.

### Default changes

Changing a default can break automation even when syntax remains valid. Treat behavior changes with the same care as renaming options.

### Command migrations

Use command aliases when a valid old command name should continue working. Use `suggestionAliases` for migration/typo guidance when the old word should not actually execute.

