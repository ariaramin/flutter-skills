# Authoritative Sources and Final Validation

Use this reference whenever behavior is version-sensitive, an API is uncertain, or a current package/Dart/Flutter release may have changed the guidance.

## Sources

These sources materially informed this skill. Re-check them when upgrading `args`, Dart, or Flutter.

### `package:args`

- https://pub.dev/packages/args
- https://pub.dev/packages/args/changelog
- https://pub.dev/packages/args/versions
- https://pub.dev/documentation/args/latest/args/ArgParser-class.html
- https://pub.dev/documentation/args/latest/args/ArgResults-class.html
- https://pub.dev/documentation/args/latest/args/ArgParserException-class.html
- https://pub.dev/documentation/args/latest/args/Option-class.html
- https://pub.dev/documentation/args/latest/args/OptionType.html
- https://pub.dev/documentation/args/latest/command_runner/Command-class.html
- https://pub.dev/documentation/args/latest/command_runner/CommandRunner-class.html
- https://pub.dev/documentation/args/latest/command_runner/UsageException-class.html

### Official repository / changelog / source

- https://github.com/dart-lang/core/tree/main/pkgs/args
- https://github.com/dart-lang/core/blob/args-v2.7.0/pkgs/args/lib/src/arg_parser.dart
- https://github.com/dart-lang/core/blob/args-v2.7.0/pkgs/args/lib/src/arg_results.dart
- https://github.com/dart-lang/core/blob/args-v2.7.0/pkgs/args/lib/src/parser.dart
- https://github.com/dart-lang/core/blob/args-v2.7.0/pkgs/args/lib/command_runner.dart
- https://github.com/dart-lang/core/blob/args-v2.7.0/pkgs/args/CHANGELOG.md

### Dart documentation

- https://dart.dev/language/functions
- https://dart.dev/tools/dart-run
- https://dart.dev/tools/dart-create
- https://dart.dev/tools/pub/package-layout
- https://dart.dev/tools/pub/create-packages
- https://dart.dev/tools/pub/pubspec
- https://dart.dev/libraries/core/environment-declarations

### Dart CLI / executable documentation

- https://dart.dev/tools/dart-install
- https://dart.dev/tools/pub/cmd/pub-global
- https://dart.dev/tools/dart-tool

### Dart API documentation

- https://api.dart.dev/dart-io/Platform/executableArguments.html
- https://api.dart.dev/dart-io/exit.html
- https://api.dart.dev/dart-io/exitCode.html
- https://api.dart.dev/dart-core/String/String.fromEnvironment.html

### Flutter documentation

- https://docs.flutter.dev/ui/navigation
- https://docs.flutter.dev/ui/navigation/deep-linking
- https://docs.flutter.dev/platform-integration/web
- https://docs.flutter.dev/platform-integration/desktop

### Flutter desktop embedder documentation

- https://api.flutter.dev/windows-embedder/classflutter_1_1_dart_project.html
- https://api.flutter.dev/macos-embedder/class_flutter_dart_project.html
- https://api.flutter.dev/linux-embedder/fl__dart__project_8h.html

## Final Validation Before Producing or Reviewing Code

Before finishing any `package:args` task, verify:

1. The package is being used for actual invocation arguments.
2. The current project version/API was checked when version-sensitive.
3. No unreleased repository API was mistaken for released behavior.
4. `ArgParser` vs `CommandRunner` matches tool complexity.
5. Options, flags, multi-options, positionals, aliases, defaults, and negation follow current semantics.
6. Ordering and `--` behavior have been considered where relevant.
7. Syntax validation is separated from semantic validation.
8. `ArgResults` remains an adapter-layer object.
9. Required values are converted into typed data promptly.
10. Missing mandatory single options are handled at retrieval.
11. `ArgParserException`, `UsageException`, and unexpected failures are distinguished correctly.
12. Help and usage are discoverable and current.
13. Async commands are awaited and cleanup is preserved.
14. Exit-code policy belongs to the application, not `args`.
15. Public package executable layout/invocation is current.
16. Current Dart guidance (`dart install` on Dart 3.10+) is not confused with legacy global activation.
17. Flutter desktop entrypoint arguments are verified per target when used.
18. Android/iOS/Web are not treated as generic desktop CLIs.
19. `--dart-define`, environment variables, config files, routes, URLs, and deep links are kept conceptually separate.
20. Secrets are not casually exposed through CLI syntax or logs.
21. Performance claims are measured or clearly labeled as engineering inference.
22. Tests cover invalid and edge-case grammar, not only happy paths.
23. CLI compatibility is treated as a public contract where users/automation depend on it.

If any answer is uncertain, consult the authoritative sources above before generating code.
