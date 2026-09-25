# Testing, Production Templates, Review, and Debugging

Use this reference when writing tests, producing complete implementation templates, reviewing an existing CLI, debugging argument behavior, or auditing security/performance/cross-platform correctness.

## Contents
- Test strategy and templates
- Production implementation templates
- Decision trees and edge cases
- Anti-patterns
- Debugging guide
- Code/performance/security/cross-platform checklists
- AI operating rules and senior reasoning examples

## Testing Strategy

Test parser behavior directly with `List<String>` for most cases. Spawn real processes only when testing process boundaries such as exit code, shell invocation, actual executable packaging, or stdout/stderr integration.

| Concern | Unit test | Integration/process test |
|---|---:|---:|
| flag true/false/default | Yes | Optional |
| negated flag | Yes | Optional |
| option values/defaults | Yes | Optional |
| allowed-value rejection | Yes | Optional |
| multi-option semantics | Yes | Optional |
| positional arguments | Yes | Optional |
| command selection | Yes | Useful |
| semantic validation | Yes | Optional |
| generated usage/help | Yes for contract-critical output | Useful |
| async command/service delegation | Yes | Optional |
| stdout/stderr wiring | Possible with abstraction | Useful |
| actual executable exit status | Limited | Yes |
| package install/launcher behavior | No | Yes |

## Parser Unit Test Template

```dart
import 'package:args/args.dart';
import 'package:test/test.dart';

void main() {
  late ArgParser parser;

  setUp(() {
    parser = ArgParser()
      ..addFlag('color', defaultsTo: true)
      ..addOption(
        'mode',
        defaultsTo: 'debug',
        allowed: const ['debug', 'release'],
      )
      ..addMultiOption('include', splitCommas: false);
  });

  test('uses defaults when arguments are omitted', () {
    final results = parser.parse(const []);

    expect(results.flag('color'), isTrue);
    expect(results.option('mode'), 'debug');
    expect(results.wasParsed('mode'), isFalse);
  });

  test('reads explicit values', () {
    final results = parser.parse(const [
      '--mode',
      'release',
      '--include',
      'lib',
      '--include',
      'test',
    ]);

    expect(results.option('mode'), 'release');
    expect(results.wasParsed('mode'), isTrue);
    expect(results.multiOption('include'), ['lib', 'test']);
  });

  test('supports flag negation', () {
    final results = parser.parse(const ['--no-color']);
    expect(results.flag('color'), isFalse);
  });

  test('rejects invalid allowed value', () {
    expect(
      () => parser.parse(const ['--mode', 'broken']),
      throwsA(isA<ArgParserException>()),
    );
  });

  test('keeps positionals in rest', () {
    final results = parser.parse(const ['source.txt', 'dest.txt']);
    expect(results.rest, ['source.txt', 'dest.txt']);
  });
}
```

### Mandatory retrieval test

```dart
test('mandatory single option fails on retrieval', () {
  final parser = ArgParser()..addOption('project', mandatory: true);
  final results = parser.parse(const []);

  expect(() => results.option('project'), throwsArgumentError);
});
```

## Command Test Template

Prefer injecting fake services instead of spawning a process.

```dart
import 'package:args/command_runner.dart';
import 'package:test/test.dart';

void main() {
  test('build command delegates typed request', () async {
    final service = FakeBuildService();
    final runner = CommandRunner<int>('acme', 'Test runner')
      ..addCommand(BuildCommand(service));

    final result = await runner.run(const [
      'build',
      '--mode',
      'release',
      '--verbose',
    ]);

    expect(result, 0);
    expect(service.lastRequest?.mode, 'release');
    expect(service.lastRequest?.verbose, isTrue);
  });
}
```

Test `UsageException` for user-correctable command validation, and test unexpected failures separately so the CLI does not accidentally relabel defects as usage mistakes.

## End-to-End Process Test

Use a subprocess only for behavior that truly belongs to the process boundary:

```dart
import 'dart:io';
import 'package:test/test.dart';

void main() {
  test('invalid CLI exits non-zero and writes diagnostics', () async {
    final result = await Process.run(
      Platform.resolvedExecutable,
      const ['run', 'bin/acme.dart', 'build', '--mode', 'invalid'],
    );

    expect(result.exitCode, isNot(0));
    expect(result.stderr.toString(), contains('mode'));
  });
}
```

Keep process tests few and high-value; they are slower and more environment-sensitive than parser unit tests.

## Production Templates

### 1. Minimal `ArgParser`

```dart
import 'dart:io';
import 'package:args/args.dart';

void main(List<String> arguments) {
  final parser = ArgParser()
    ..addFlag('help', abbr: 'h', negatable: false)
    ..addOption('name', abbr: 'n', mandatory: true);

  try {
    final results = parser.parse(arguments);

    if (results.flag('help')) {
      stdout.writeln(parser.usage);
      return;
    }

    final name = results.option('name')!;
    stdout.writeln('Hello, $name');
  } on ArgParserException catch (error) {
    stderr.writeln('Error: ${error.message}');
    exitCode = 64;
  } on ArgumentError catch (error) {
    stderr.writeln('Error: ${error.message}');
    exitCode = 64;
  }
}
```

### 2. Typed config conversion

Use `BuildOptions.fromArgs` from the typed-boundary section. Keep all string keys in the adapter.

### 3. Validation

```dart
final class ServerOptions {
  const ServerOptions({required this.host, required this.port});
  final String host;
  final int port;
}

ServerOptions parseServerOptions(ArgResults results) {
  final host = results.option('host') ?? '127.0.0.1';
  final portRaw = results.option('port') ?? '8080';
  final port = int.tryParse(portRaw);

  if (port == null || port < 1 || port > 65535) {
    throw ArgumentError.value(portRaw, 'port', 'Expected 1..65535');
  }

  return ServerOptions(host: host, port: port);
}
```

### 4. Command-based CLI

Use `CommandRunner<int>` with one command class per meaningful operation and application services injected into the commands.

### 5. Nested command

Use `DatabaseCommand` + `MigrateCommand` pattern above when the hierarchy improves UX.

### 6. Async command

```dart
@override
Future<int> run() async {
  final request = parseRequest(argResults);
  await service.execute(request);
  return 0;
}
```

### 7. Help/version handling

Use built-in `CommandRunner` help and explicitly implement `--version`; do not assume automatic version behavior.

### 8. Exit-code handling

Return a small command status and assign `dart:io` `exitCode` in `main` after awaiting. Avoid `exit()` in domain/application layers.

### 9. Flutter desktop boundary

```dart
Future<void> main(List<String> arguments) async {
  final options = DesktopLaunchOptions.fromArguments(arguments);
  WidgetsFlutterBinding.ensureInitialized();
  runApp(MyApp(launchOptions: options));
}
```

Only use this if desktop native launch arguments are actually part of the product contract.

### 10. Separate Flutter-project companion CLI

```text
flutter_project/
├── lib/                    # Flutter app
├── tool/release.dart       # private CLI entrypoint
└── lib/src/release_tool/   # reusable release application logic
```

`tool/release.dart` may depend on `args`; Flutter widgets/domain code should not.

### 11. Parser unit test

Use direct `parser.parse(const [...])` tests for syntax, defaults, negation, aliases, multi-options, rest, and failures.

### 12. Command integration test

Instantiate a `CommandRunner` and fake service in-process. Reserve `Process.run` for actual process contract tests.

## Decision Trees

### `ArgParser` or `CommandRunner`?

```text
One operation with a few options?
  → ArgParser

Several named operations with distinct options?
  → CommandRunner

Nested operation hierarchy with help/dispatch needs?
  → CommandRunner + subcommands
```

### Flag or option?

```text
Is the value intrinsically boolean?
  → flag
Otherwise
  → option / multi-option
```

### Named or positional?

```text
Would reordering change meaning or make the call ambiguous?
  → named option
Is the value a small, obvious primary operand (e.g. source/dest)?
  → positional may be appropriate
```

### CLI argument or environment variable?

```text
Per-invocation explicit user/script override?
  → CLI
Deployment/process-owned configuration?
  → environment may be better
```

### CLI argument or config file?

```text
Small override chosen per run?
  → CLI
Large/reusable/structured persistent configuration?
  → config file
```

### CLI argument or `--dart-define`?

```text
Needed at runtime for each process invocation?
  → CLI
Compilation/build-time environment declaration?
  → --dart-define / fromEnvironment
```

### CLI argument or URL/deep link?

```text
Browser/mobile navigation input?
  → URL/deep link/router
Process invocation token?
  → CLI
```

### Global or command-local?

```text
Does the option have the same meaning across most/all commands?
  → global
Otherwise
  → command-local
```

### Initialize service before or after parsing?

```text
Does construction perform meaningful I/O/cost or require validated input?
  → after parsing/command selection
Tiny immutable/lightweight dependency?
  → either; prefer simpler design
```

## Edge-Case Rules

- Unknown long/short options are parse errors; do not silently accept them unless pass-through behavior is deliberate.
- A single option repeated multiple times resolves to its last value.
- A multi-option accumulates repeated values and, by default, splits comma-separated values.
- `--` terminates option parsing and moves following tokens to positionals.
- `allowTrailingOptions: false` stops option parsing at the first positional token.
- Bundled short flags such as `-vfi` are supported when those abbreviations are flags.
- A short option that consumes a value can take attached text as its value.
- Negation syntax applies to negatable flags, not arbitrary options.
- Avoid global/local name shadowing even where the parser can resolve the right-most applicable option.
- Use canonical names for typed `ArgResults` access and `wasParsed()`.
- Do not assume a missing mandatory option fails during `parse()`; retrieve it at the boundary.
- Do not assume aliases are separately listed as normal `options` keys.
- Do not depend on help-value sorting that changed in 2.7.0.

## Anti-Patterns

| Anti-pattern | Why it fails | Correct approach |
|---|---|---|
| Add `ArgParser` to ordinary Flutter widget code | Wrong ownership; UI runtime is not necessarily a CLI | Keep CLI parsing at an executable/tooling boundary |
| Use args for app settings | Process invocation is not persistent state | Use state/config/persistence mechanisms |
| Use args for web query parameters | Browser URLs are not process argv | Use `Uri`/router APIs |
| Use args for mobile deep links | Deep links are platform/navigation inputs | Use Flutter deep-link/routing APIs |
| Treat `--dart-define` as runtime argv | Compilation environment differs from runtime arguments | Use constant environment declarations |
| Pass `ArgResults` through services | Spreads parser/string-key coupling | Convert to typed request/config immediately |
| Scatter `results['mode']` everywhere | Dynamic casts and fragile string keys | Use typed accessors in one mapper |
| Put business logic in parser callbacks | Order/side-effect coupling and poor testability | Parse, map, validate, execute |
| Put every rule in `ArgParser` | Parser cannot express domain semantics cleanly | Two-stage validation |
| Catch every exception as `UsageException` | Hides programmer/runtime defects | Catch only expected usage errors |
| Use CLI args for secrets | May leak via history/logs/process inspection | Use safer secret channels |
| Rely on undocumented option ordering | Creates brittle automation | Test documented semantics explicitly |
| Reuse the same abbreviation everywhere | Confusing/shadowed syntax | Reserve abbreviations intentionally |
| Rename options without migration | Breaks scripts | Alias/deprecate/version deliberately |
| Change defaults casually | Silent behavior break | Treat defaults as public contract |
| Parse arguments repeatedly | Duplicated work and inconsistent boundaries | Parse once |
| Perform I/O during parser construction | Slow/help paths trigger work unnecessarily | Construct parser declaratively |
| Construct all heavy command services up front | Wastes startup time | Lazy-create selected command dependencies when justified |
| Call `exit()` deep inside async work | Skips `finally` and async cleanup | Return status/set `exitCode` at boundary |
| Assume Android/iOS/Web behave like desktop CLI | Platform launch models differ | Use platform-appropriate input mechanisms |
| Optimize parser without measurement | Solves likely non-bottleneck | Profile startup first |

## Debugging Guide

### Unknown option

1. Verify the option exists on the parser that should own it.
2. Check spelling, alias, and abbreviation conflicts.
3. For commands, verify global vs command-local ownership and argument position.
4. Verify you are not accidentally parsing with a different parser instance/version.

### Option missing a value

1. Confirm it is an option, not a flag.
2. Use `--name=value` to remove shell/ordering ambiguity during diagnosis.
3. Check whether the next token was intended as the value.

### Wrong default

1. Inspect `defaultsTo`.
2. Use `wasParsed()` to tell explicit input from a default.
3. Check config precedence outside the parser.

### Negated flag behaves unexpectedly

1. Confirm the flag is `negatable`.
2. Check its default.
3. Remove double-negative naming.
4. Ensure a command-local flag is not shadowing a global one.

### Option is unavailable inside a command

1. Decide whether it should be global or command-local.
2. Define it on the correct parser.
3. Do not duplicate the same name on both levels.
4. Test before/after-command placement with the actual parser.

### Positional arguments interpreted incorrectly

1. Inspect `results.rest`.
2. Check `allowTrailingOptions`.
3. Use `--` before dash-prefixed positionals.
4. With commands, ensure no positionals appear before command selection.

### Command not found

1. Check canonical name and aliases.
2. Confirm it was added to the runner/parent command.
3. Check nesting level.
4. Let `CommandRunner` suggestions remain user-facing; do not reproduce them manually.

### Help output is incomplete

1. Add `help` and `valueHelp`.
2. Add `allowedHelp` for enum-like values.
3. Check `hide` / `hidden`.
4. Use `CommandRunner` for command listings rather than expecting parser-level commands to provide a full command UX.

### Negative number interpreted as option

- Prefer a named form such as `--count=-1`, or use `--` before a positional negative number.
- Test the exact grammar rather than assuming numeric parsing exists in `args`.

### Async command failure / unexpected exit status

1. Ensure `main` awaits `runner.run()`.
2. Keep status mapping in the outer boundary.
3. Check whether a caught exception was incorrectly converted to a usage failure.
4. Avoid immediate `exit()` before cleanup/output completes.

### Flutter desktop args missing

1. Confirm the Dart `main` signature accepts `List<String>`.
2. Confirm the native/generated runner forwards entrypoint arguments.
3. Test terminal launch separately from double-click/IDE launch.
4. Check each OS runner independently.
5. Do not substitute `Platform.executableArguments` for app argv.

### `args` appears to solve the wrong problem

Ask whether the input is actually:

- a route;
- a deep link;
- a browser URL;
- a build-time declaration;
- an environment variable;
- a config file;
- persistent app state.

If yes, remove `package:args` from that path.

## Code Review Checklist

- [ ] Is `package:args` actually appropriate for this executable?
- [ ] Does the program genuinely receive process/Dart-entrypoint arguments?
- [ ] Are arguments parsed only at the outer boundary?
- [ ] Is each invocation parsed once?
- [ ] Is `ArgResults` converted to typed data quickly?
- [ ] Are string option keys centralized?
- [ ] Are typed `ArgResults` accessors used in new code?
- [ ] Are syntax errors distinguished from semantic/domain failures?
- [ ] Is missing mandatory-option retrieval handled correctly?
- [ ] Are secrets kept out of CLI arguments where appropriate?
- [ ] Are option/command names stable and unambiguous?
- [ ] Are abbreviations scarce and conflict-free?
- [ ] Are aliases used deliberately for compatibility?
- [ ] Are defaults intentional and tested?
- [ ] Are global vs command-local options correctly scoped?
- [ ] Are positionals few, obvious, and validated?
- [ ] Is `--` behavior considered for dash-prefixed positionals/pass-through?
- [ ] Are enum/numeric/URI/path conversions explicit?
- [ ] Does business logic avoid `package:args` dependencies?
- [ ] Are parser callbacks avoided for business control flow?
- [ ] Are heavyweight services constructed lazily when that materially helps?
- [ ] Are expected usage failures concise and actionable?
- [ ] Are programmer bugs allowed to remain distinguishable?
- [ ] Are exit codes owned/documented by the application?
- [ ] Is `exit()` avoided where async cleanup matters?
- [ ] Are help text and value descriptions useful?
- [ ] Are parser unit tests covering invalid and edge-case arguments?
- [ ] Are end-to-end process tests limited to real process contracts?
- [ ] Are Flutter platform assumptions valid?
- [ ] Is any performance claim evidence-based?

## Performance Review Checklist

- [ ] Parser construction is declarative and free of expensive I/O.
- [ ] Arguments are parsed once per invocation.
- [ ] The program does not initialize unrelated command dependencies before selection.
- [ ] Heavy services are delayed until after validation when beneficial.
- [ ] Pure tooling does not start the Flutter UI/engine unnecessarily.
- [ ] Startup is profiled before optimization work.
- [ ] Help/usage is not regenerated in unnecessary hot loops.
- [ ] No benchmark numbers are invented or copied without context.

## Security Review Checklist

- [ ] No passwords, tokens, or private keys appear in usage examples.
- [ ] Sensitive values are not echoed or logged.
- [ ] Shell history exposure has been considered.
- [ ] Process-argument visibility has been considered for target OSes.
- [ ] CI command echo/logging has been considered.
- [ ] Error messages do not include confidential raw values.
- [ ] A safer secret channel is used where appropriate.

## Cross-Platform Review Checklist

- [ ] Windows desktop forwarding is verified if launch args are a feature.
- [ ] macOS desktop forwarding/launcher semantics are verified.
- [ ] Linux desktop forwarding/GTK launcher semantics are verified.
- [ ] Android input uses mobile/platform mechanisms rather than assumed CLI argv.
- [ ] iOS input uses mobile/platform mechanisms rather than assumed CLI argv.
- [ ] Web input uses browser URL/router mechanisms rather than assumed process argv.
- [ ] Path handling does not hard-code one OS separator.
- [ ] Exit statuses remain within a deliberate cross-platform range.
- [ ] Shell examples do not assume one shell’s quoting rules are universal.

## AI Operating Rules

### Before adding `args`

The AI MUST answer:

1. Does this executable actually receive process or Dart-entrypoint arguments?
2. Which platforms execute this code?
3. Is argument parsing needed in the Flutter runtime, or only in companion tooling?
4. Would routing/deep links, URL parsing, environment declarations, environment variables, configuration files, or persistent state own this input better?
5. Is the tool single-purpose or meaningfully command-based?
6. Which current `args` version is resolved by the project?

If the first answer is no, the AI MUST NOT add `package:args` merely for convenience.

### During implementation

The AI MUST:

- centralize parser construction;
- centralize canonical option names;
- parse once;
- use current, non-deprecated APIs;
- convert `ArgResults` to typed application data promptly;
- perform semantic validation after syntax parsing;
- keep business logic outside parser setup;
- preserve meaningful user-facing help;
- keep output/execution testable;
- preserve stable CLI syntax where compatibility matters;
- make heavy dependency creation lazy only when useful;
- avoid claiming platform behavior without checking target runners/embedders.

### During review

The AI MUST inspect both:

- parser correctness and documented semantics;
- architecture, platform fit, UX, compatibility, testing, security, and process behavior.

Do not approve code merely because `parser.parse()` returns expected values in one happy-path example.

### During optimization

The AI MUST:

1. measure startup or the relevant workflow;
2. identify the real bottleneck;
3. eliminate unnecessary I/O/heavy initialization before command selection;
4. avoid speculative parser micro-optimization;
5. re-measure after changes.

## Senior-Level Reasoning Examples

### Wrong: treating args as Flutter settings

> Use `package:args` in Flutter to manage app settings.

Correct reasoning:

> `package:args` parses invocation arguments. Use it only if this executable genuinely receives process/Dart-entrypoint input. Normal Flutter settings belong to runtime state, persistence, platform configuration, or build-time declarations depending on ownership.

### Wrong: stringly typed results everywhere

> Access `results['output']` wherever output is needed.

Correct reasoning:

> Treat `ArgResults` as an adapter-layer object. Read it once with typed accessors, validate, and build a typed request/configuration before entering application logic.

### Wrong: every validation rule in `ArgParser`

> Put all validation in the parser.

Correct reasoning:

> Let `ArgParser` enforce grammar and allowed-value constraints. Validate cross-option, filesystem, numeric range, permission, and business rules after parsing.

### Wrong: `CommandRunner` for every script

> Always use `CommandRunner` for structure.

Correct reasoning:

> Use a plain `ArgParser` for a small one-purpose executable. Introduce `CommandRunner` when commands/subcommands improve the user model, help, dispatch, or maintainability.

### Wrong: optimize parsing first

> Rewrite parser construction for maximum CLI performance.

Correct reasoning:

> Measure startup. Expensive I/O, Flutter startup, network/database setup, or eager dependency construction are usually more actionable candidates than one normal parser pass. Optimize parsing only if profiling identifies it.

