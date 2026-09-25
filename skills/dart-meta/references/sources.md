# Research sources and baseline

Use this reference to trace the supplied recommendations to official `meta`, Dart language/analyzer/linter, Flutter, and Dart SDK sources. Re-verify current APIs against the project SDK when implementing production code.

---

# Sources

## `package:meta`

Official package page:

[https://pub.dev/packages/meta](https://pub.dev/packages/meta)

Current API:

[https://pub.dev/documentation/meta/latest/](https://pub.dev/documentation/meta/latest/)

`meta.dart`:

[https://pub.dev/documentation/meta/latest/meta/](https://pub.dev/documentation/meta/latest/meta/)

`meta_meta.dart`:

[https://pub.dev/documentation/meta/latest/meta\_meta/](https://pub.dev/documentation/meta/latest/meta_meta/)

`dart2js.dart`:

[https://pub.dev/documentation/meta/latest/meta\_dart2js/](https://pub.dev/documentation/meta/latest/meta_dart2js/)

Changelog:

[https://pub.dev/packages/meta/changelog](https://pub.dev/packages/meta/changelog)

Versions / SDK requirements:

[https://pub.dev/packages/meta/versions](https://pub.dev/packages/meta/versions)

Key APIs:

[https://pub.dev/documentation/meta/latest/meta/Immutable-class.html](https://pub.dev/documentation/meta/latest/meta/Immutable-class.html)

[https://pub.dev/documentation/meta/latest/meta/RecordUse-class.html](https://pub.dev/documentation/meta/latest/meta/RecordUse-class.html)

[https://pub.dev/documentation/meta/latest/meta/UseResult-class.html](https://pub.dev/documentation/meta/latest/meta/UseResult-class.html)

[https://pub.dev/documentation/meta/latest/meta/immutable-constant.html](https://pub.dev/documentation/meta/latest/meta/immutable-constant.html)

[https://pub.dev/documentation/meta/latest/meta/useResult-constant.html](https://pub.dev/documentation/meta/latest/meta/useResult-constant.html)

[https://pub.dev/documentation/meta/latest/meta/awaitNotRequired-constant.html](https://pub.dev/documentation/meta/latest/meta/awaitNotRequired-constant.html)

[https://pub.dev/documentation/meta/latest/meta/doNotStore-constant.html](https://pub.dev/documentation/meta/latest/meta/doNotStore-constant.html)

[https://pub.dev/documentation/meta/latest/meta/doNotSubmit-constant.html](https://pub.dev/documentation/meta/latest/meta/doNotSubmit-constant.html)

[https://pub.dev/documentation/meta/latest/meta/experimental-constant.html](https://pub.dev/documentation/meta/latest/meta/experimental-constant.html)

[https://pub.dev/documentation/meta/latest/meta/factory-constant.html](https://pub.dev/documentation/meta/latest/meta/factory-constant.html)

[https://pub.dev/documentation/meta/latest/meta/mustBeConst-constant.html](https://pub.dev/documentation/meta/latest/meta/mustBeConst-constant.html)

[https://pub.dev/documentation/meta/latest/meta/nonVirtual-constant.html](https://pub.dev/documentation/meta/latest/meta/nonVirtual-constant.html)

[https://pub.dev/documentation/meta/latest/meta/optionalTypeArgs-constant.html](https://pub.dev/documentation/meta/latest/meta/optionalTypeArgs-constant.html)

[https://pub.dev/documentation/meta/latest/meta/sealed-constant.html](https://pub.dev/documentation/meta/latest/meta/sealed-constant.html)

[https://pub.dev/documentation/meta/latest/meta/Required-class.html](https://pub.dev/documentation/meta/latest/meta/Required-class.html)

[https://pub.dev/documentation/meta/latest/meta/virtual-constant.html](https://pub.dev/documentation/meta/latest/meta/virtual-constant.html)

Custom annotation targets:

[https://pub.dev/documentation/meta/latest/meta\_meta/Target-class.html](https://pub.dev/documentation/meta/latest/meta_meta/Target-class.html)

[https://pub.dev/documentation/meta/latest/meta\_meta/TargetKind-class.html](https://pub.dev/documentation/meta/latest/meta_meta/TargetKind-class.html)

---

## Dart Language Documentation

Metadata:

[https://dart.dev/language/metadata](https://dart.dev/language/metadata)

Variables, `final`, and `const`:

[https://dart.dev/language/variables](https://dart.dev/language/variables)

Collections:

[https://dart.dev/language/collections](https://dart.dev/language/collections)

Records:

[https://dart.dev/language/records](https://dart.dev/language/records)

Class modifiers:

[https://dart.dev/language/class-modifiers](https://dart.dev/language/class-modifiers)

Class modifiers for API maintainers:

[https://dart.dev/language/class-modifiers-for-apis](https://dart.dev/language/class-modifiers-for-apis)

Extension types and `@redeclare`:

[https://dart.dev/language/extension-types](https://dart.dev/language/extension-types)

Dart core `Deprecated` API:

[https://api.dart.dev/dart-core/Deprecated-class.html](https://api.dart.dev/dart-core/Deprecated-class.html)

---

## Dart Analyzer Documentation

Static-analysis configuration:

[https://dart.dev/tools/analysis](https://dart.dev/tools/analysis)

Diagnostic index:

[https://dart.dev/tools/diagnostics](https://dart.dev/tools/diagnostics)

`must_be_immutable`:

[https://dart.dev/tools/diagnostics/must\_be\_immutable](https://dart.dev/tools/diagnostics/must_be_immutable)

`must_call_super`:

[https://dart.dev/tools/diagnostics/must\_call\_super](https://dart.dev/tools/diagnostics/must_call_super)

`unused_result`:

[https://dart.dev/tools/diagnostics/unused\_result](https://dart.dev/tools/diagnostics/unused_result)

`deprecated_member_use`:

[https://dart.dev/tools/diagnostics/deprecated\_member\_use](https://dart.dev/tools/diagnostics/deprecated_member_use)

`annotate_redeclares`:

[https://dart.dev/tools/diagnostics/annotate\_redeclares](https://dart.dev/tools/diagnostics/annotate_redeclares)

Other current diagnostics should be verified through the diagnostic index for the project's Dart SDK because analyzer diagnostics evolve with SDK releases.

---

## Dart Linter Documentation

Linter rule index:

[https://dart.dev/tools/linter-rules](https://dart.dev/tools/linter-rules)

Direct dependency enforcement:

[https://dart.dev/tools/linter-rules/depend\_on\_referenced\_packages](https://dart.dev/tools/linter-rules/depend_on_referenced_packages)

Implementation imports:

[https://dart.dev/tools/linter-rules/implementation\_imports](https://dart.dev/tools/linter-rules/implementation_imports)

Immutable constructors:

[https://dart.dev/tools/linter-rules/prefer\_const\_constructors\_in\_immutables](https://dart.dev/tools/linter-rules/prefer_const_constructors_in_immutables)

Immutable collection literals:

[https://dart.dev/tools/linter-rules/prefer\_const\_literals\_to\_create\_immutables](https://dart.dev/tools/linter-rules/prefer_const_literals_to_create_immutables)

Equality on mutable classes:

[https://dart.dev/tools/linter-rules/avoid\_equals\_and\_hash\_code\_on\_mutable\_classes](https://dart.dev/tools/linter-rules/avoid_equals_and_hash_code_on_mutable_classes)

Deprecation consistency:

[https://dart.dev/tools/linter-rules/deprecated\_consistency](https://dart.dev/tools/linter-rules/deprecated_consistency)

Removing deprecations in breaking releases:

[https://dart.dev/tools/linter-rules/remove\_deprecations\_in\_breaking\_versions](https://dart.dev/tools/linter-rules/remove_deprecations_in_breaking_versions)

Explicit types / `optionalTypeArgs` interaction:

[https://dart.dev/tools/linter-rules/always\_specify\_types](https://dart.dev/tools/linter-rules/always_specify_types)

---

## Flutter Documentation

Flutter `State.build`:

[https://api.flutter.dev/flutter/widgets/State/build.html](https://api.flutter.dev/flutter/widgets/State/build.html)

Flutter `State.didUpdateWidget`:

[https://api.flutter.dev/flutter/widgets/State/didUpdateWidget.html](https://api.flutter.dev/flutter/widgets/State/didUpdateWidget.html)

Flutter `State.didChangeDependencies`:

[https://api.flutter.dev/flutter/widgets/State/didChangeDependencies.html](https://api.flutter.dev/flutter/widgets/State/didChangeDependencies.html)

Flutter `State.dispose`:

[https://api.flutter.dev/flutter/widgets/State/dispose.html](https://api.flutter.dev/flutter/widgets/State/dispose.html)

Flutter `State.activate`:

[https://api.flutter.dev/flutter/widgets/State/activate.html](https://api.flutter.dev/flutter/widgets/State/activate.html)

Flutter `State.deactivate`:

[https://api.flutter.dev/flutter/widgets/State/deactivate.html](https://api.flutter.dev/flutter/widgets/State/deactivate.html)

These APIs demonstrate that some lifecycle methods are both `@protected` and `@mustCallSuper`, while `State.build` is protected and abstract rather than a must-call-super method.

---

## Official Repositories / Source / Changelog

Dart SDK repository:

[https://github.com/dart-lang/sdk](https://github.com/dart-lang/sdk)

`meta` package source:

[https://github.com/dart-lang/sdk/tree/main/pkg/meta](https://github.com/dart-lang/sdk/tree/main/pkg/meta)

Official Dart SDK source mirror:

[https://dart.googlesource.com/sdk/](https://dart.googlesource.com/sdk/)

The package source describes `meta.dart` as static-analysis metadata and `dart2js.dart` as specialized compiler hints.

---

# Final Rule

When deciding whether to use `package:meta`, prefer this order:

```
Can Dart express the invariant directly?
    → use Dart.

Can architecture/privacy express it more strongly?
    → use architecture/privacy.

Can analyzer metadata catch a realistic misuse?
    → use the appropriate meta annotation.

Is it only decorative?
    → omit it.

Is someone expecting runtime speed from it?
    → reject that assumption unless an official compiler-specific contract proves otherwise.

```
