---
name: flutter-pinput
description: Authoritative guide for implementing, styling, validating, and testing PIN, passcode, and SMS OTP verification fields using the Flutter pinput package. Use when integrating OTP input, PIN pads, SMS auto-fill, SmartAuth, custom cursor animations, or debugging Pinput focus and controller lifecycles.
metadata:
  category: flutter-packages
  version: 6.0.2
  tags: [flutter, dart, pinput, otp, pin-code, sms-autofill, authentication]
---

# Pinput Flutter Skill

## Purpose
This skill provides authoritative, production-grade engineering instructions for integrating, styling, validating, securing, and testing PIN codes and OTP inputs in Flutter applications using the `pinput` package (v6.0.2+).

---

## When to Use This Skill
- Building SMS verification, two-factor authentication (2FA), phone authentication, or registration screens.
- Implementing security passcodes, transaction authorization PINs, or parental control inputs.
- Hooking native SMS autofill on iOS (QuickType) and Android (SMS Retriever API or SMS User Consent API).
- Constructing in-app numeric keypads or custom PIN entry sheets without native soft keyboards.
- Auditing existing Flutter OTP implementations for controller leaks, rebuild bottlenecks, layout overflows, or accessibility gaps.

### When NOT to Use
- Standard single-line or multi-line text input fields (use framework `TextField` or `TextFormField`).
- Continuous credit card numbers with formatted separators (use standard `TextField` with custom `TextInputFormatter`s).
- Non-Flutter applications or backend OTP verification logic.

---

## Source of Truth
- **Package**: `pinput` (Current baseline: `^6.0.2`) on [pub.dev](https://pub.dev/packages/pinput).
- **Official Repository**: [Tkko/Flutter_PinPut](https://github.com/Tkko/Flutter_PinPut).
- **Flutter Framework APIs**: `EditableText`, `TextEditingController`, `FocusNode`, `AutofillClient`, `TextInputConfiguration`.

---

## Core Mental Model

```
 ┌─────────────────────────────────────────────────────────────────┐
 │ TextFieldTapRegion (Routes gestures & taps outside)             │
 │  └─ Semantics (maxValueLength, currentValueLength, onFocus)     │
 │      └─ Stack(alignment: Alignment.topCenter)                   │
 │          ├─ Positioned.fill                                     │
 │          │   └─ RepaintBoundary                                 │
 │          │       └─ EditableText (Invisible, transparent text,  │
 │          │                       captures IME, soft keyboard,   │
 │          │                       hardware keyboard, autofill)   │
 │          └─ Center                                              │
 │              └─ AnimatedBuilder (Listens to controller + focus) │
 │                  └─ Column (if validator/error exists)          │
 │                      ├─ _SeparatedRaw (Row of Pin Cells)        │
 │                      │   ├─ Flexible(AnimatedContainer) [Cell 0]│
 │                      │   ├─ Separator (e.g. SizedBox(width: 8)) │
 │                      │   ├─ Flexible(AnimatedContainer) [Cell 1]│
 │                      │   └─ ...                                 │
 │                      └─ AnimatedSize -> Error Widget            │
 └─────────────────────────────────────────────────────────────────┘
```

1. **Dual-Layer Architecture**:
   - `Pinput` places a transparent, full-extent `EditableText` behind the UI. It uses `fontSize: 1`, transparent color, and `rendererIgnoresPointer: true`.
   - The user visually interacts with styled `_PinItem` cells (or a custom `Pinput.builder`) arranged in a `Row`.
2. **State Pipeline**:
   Each cell index computes one of 6 mutually exclusive states:
   - `disabled`: `enabled == false`.
   - `error`: validation failed or `forceErrorState == true`, and field is either unfocused OR `showErrorWhenFocused == true`.
   - `focused`: `focusNode.hasFocus` and `index == selectedIndex.clamp(0, length - 1)`.
   - `submitted`: `index < selectedIndex` (character is entered).
   - `following`: `index > selectedIndex` (unfilled upcoming cell).
   - `initial`: fallback when no specific theme matches.
3. **Implicit Animations**:
   When a cell transitions between states, `AnimatedContainer` smoothly interpolates its `BoxDecoration`, `width`, and `height` over `animationDuration` (default: 180ms). The text character or cursor inside transitions via `AnimatedSwitcher`.

---

## Package Setup

In `pubspec.yaml`:
```yaml
dependencies:
  flutter:
    sdk: flutter
  pinput: ^6.0.2

  # Required ONLY if supporting Android SMS Autofill (Retriever / User Consent)
  smart_auth: ^2.0.0
```

Import statement:
```dart
import 'package:pinput/pinput.dart';
```

---

## Recommended Implementation Workflow

1. **Determine Interaction Model**: Controlled (external `TextEditingController` & `FocusNode` managed in a stateful container) vs Uncontrolled (simple one-off dialogs).
2. **Design Theme Hierarchy**: Establish a single `defaultPinTheme` containing dimensions, text style, and border radius. Derive `focusedPinTheme`, `submittedPinTheme`, and `errorPinTheme` using `copyWith()` or `copyDecorationWith()`.
3. **Calculate Viewport Budget**: Verify `(cellWidth * length) + (separatorWidth * (length - 1)) <= viewportWidth - horizontalPadding`. Adjust cell size or use dynamic constraints on narrow screens.
4. **Enforce Directionality**: Wrap in `Directionality(textDirection: TextDirection.ltr)` to guarantee consistent left-to-right digit flow across all device locales.
5. **Configure Validation & Keyboard**: Set `keyboardType: TextInputType.number`, `textInputAction: TextInputAction.done`, `pinputAutovalidateMode: PinputAutovalidateMode.onSubmit`, and tap-outside dismissal.
6. **Implement Android/iOS Autofill**: Configure `autofillHints: const [AutofillHints.oneTimeCode]` for iOS and bridge `SmsRetriever` for Android.

---

## Minimal Production-Grade Example

```dart
import 'package:flutter/material.dart';
import 'package:pinput/pinput.dart';

class MinimalOtpInput extends StatefulWidget {
  const MinimalOtpInput({
    required this.onCompleted,
    super.key,
  });

  final ValueChanged<String> onCompleted;

  @override
  State<MinimalOtpInput> createState() => _MinimalOtpInputState();
}

class _MinimalOtpInputState extends State<MinimalOtpInput> {
  late final TextEditingController _controller;
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _focusNode = FocusNode();
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final defaultPinTheme = PinTheme(
      width: 48,
      height: 52,
      textStyle: theme.textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w600,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: theme.colorScheme.outlineVariant,
        ),
      ),
    );

    return Directionality(
      textDirection: TextDirection.ltr,
      child: Pinput(
        controller: _controller,
        focusNode: _focusNode,
        length: 6,
        autofocus: true,
        defaultPinTheme: defaultPinTheme,
        focusedPinTheme: defaultPinTheme.copyWith(
          decoration: defaultPinTheme.decoration?.copyWith(
            border: Border.all(
              color: theme.colorScheme.primary,
              width: 2,
            ),
          ),
        ),
        submittedPinTheme: defaultPinTheme.copyWith(
          decoration: defaultPinTheme.decoration?.copyWith(
            color: theme.colorScheme.surfaceContainerHighest,
            border: Border.all(
              color: theme.colorScheme.primary.withValues(alpha: 0.5),
            ),
          ),
        ),
        onCompleted: widget.onCompleted,
        onTapOutside: (_) => _focusNode.unfocus(),
      ),
    );
  }
}
```

---

## Controllers and Focus Ownership

### Invariant Ownership Rules
- **Caller Provided**: If you pass `controller: myController` or `focusNode: myFocusNode`, the application widget owns the lifecycle. The agent **MUST** instantiate them in `initState()` and dispose them in `dispose()`. `Pinput` will never dispose caller-provided controllers.
- **Internally Managed**: If `controller` or `focusNode` is `null`, `Pinput` creates internal instances (`RestorableTextEditingController` and a private `FocusNode`) and disposes them cleanly when unmounted.
- The agent **MUST NOT** allocate `TextEditingController()` or `FocusNode()` inside the `build()` method.

### Programmatic Control via Extensions
`pinput` exposes `PinputControllerExt` on `TextEditingController`:
```dart
// Set entire code (e.g. from SMS autofill or paste button)
controller.setText('123456');

// Append character from a custom in-app numeric pad
controller.append('5', 6); // Character, maxLength

// Delete trailing character
controller.delete();

// Force cursor to end of current text
controller.moveCursorToEnd();

// Read current length
final int len = controller.length;
```

### Custom In-App Keypad (ATM / Banking Mode)
To use a custom on-screen keypad and suppress the platform software keyboard:
```dart
Pinput(
  controller: _pinController,
  focusNode: _focusNode,
  useNativeKeyboard: false, // Disables system IME and prevents soft keyboard pop-up
  showCursor: true,
  length: 4,
  // Pass theme configurations...
)
```
Characters are then appended via `_pinController.append(digit, 4)` and removed via `_pinController.delete()`.

---

## Validation and Submission

### Client-Side Validation
Use `validator` and `pinputAutovalidateMode`:
- `PinputAutovalidateMode.onSubmit` (default): Validates only when the code length is completed or the keyboard action (`done`) is tapped.
- `PinputAutovalidateMode.disabled`: Manual validation via `FormState.validate()`.

```dart
final _formKey = GlobalKey<FormState>();

// Inside build:
Form(
  key: _formKey,
  child: Pinput(
    validator: (pin) {
      if (pin == null || pin.length < 6) return 'Incomplete code';
      if (!RegExp(r'^\d+$').hasMatch(pin)) return 'Digits only';
      return null;
    },
    pinputAutovalidateMode: PinputAutovalidateMode.onSubmit,
    // ...
  ),
);
```

### Server-Side / Asynchronous Errors
When the backend returns an invalid OTP error:
1. Pass `forceErrorState: true` to trigger the `errorPinTheme`.
2. Pass `errorText: 'Incorrect code. 2 attempts remaining.'` or provide a custom `errorBuilder`.
3. Configure `showErrorWhenFocused`:
   - `showErrorWhenFocused: false` (default): The error border and message dismiss as soon as the user taps back into the input to re-type.
   - `showErrorWhenFocused: true`: Keeps the error border visible while the user is editing.

```dart
Pinput(
  controller: _pinController,
  forceErrorState: _hasServerError,
  errorText: _serverErrorMessage,
  showErrorWhenFocused: false,
  errorBuilder: (errorText, pin) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 16, color: Colors.red),
          const SizedBox(width: 4),
          Text(errorText ?? '', style: const TextStyle(color: Colors.red, fontSize: 13)),
        ],
      ),
    );
  },
  onChanged: (_) {
    if (_hasServerError) {
      setState(() => _hasServerError = false);
    }
  },
);
```

---

## Pinput States and Styling

### State Precedence & Inheritance
Each pin cell checks theme parameters in this order:
1. `disabledPinTheme` (if `enabled == false`)
2. `errorPinTheme` (if `showErrorState == true`)
3. `focusedPinTheme` (if active cell has focus)
4. `submittedPinTheme` (if cell index < entered text length)
5. `followingPinTheme` (if cell index > entered text length)
6. `defaultPinTheme` (fallback for all unassigned states)

### Production Theming Pattern
Derive specialized themes from `defaultPinTheme` using `copyDecorationWith()` or `copyWith()`:
```dart
final defaultPinTheme = PinTheme(
  width: 52,
  height: 56,
  textStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.black),
  decoration: BoxDecoration(
    color: const Color(0xFFF0F4F8),
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: const Color(0xFFD0D7DE)),
  ),
);

final focusedPinTheme = defaultPinTheme.copyDecorationWith(
  border: Border.all(color: const Color(0xFF0969DA), width: 2),
  borderRadius: BorderRadius.circular(12),
);

final submittedPinTheme = defaultPinTheme.copyDecorationWith(
  color: Colors.white,
  border: Border.all(color: const Color(0xFF0969DA)),
);

final errorPinTheme = defaultPinTheme.copyDecorationWith(
  color: const Color(0xFFFFF0F0),
  border: Border.all(color: const Color(0xFFCF222E), width: 1.5),
);
```

### Custom Cursors
Replace the default vertical line (`|`) with a bottom underline or custom shape:
```dart
Pinput(
  showCursor: true,
  isCursorAnimationEnabled: true,
  cursor: Align(
    alignment: Alignment.bottomCenter,
    child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      width: 20,
      height: 2,
      color: Theme.of(context).colorScheme.primary,
    ),
  ),
)
```

### Fully Custom Pin Rendering (`Pinput.builder`)
For advanced UX (e.g. underline-only fields, custom icons, or custom cell badges), use `Pinput.builder`:
```dart
Pinput.builder(
  length: 6,
  controller: _controller,
  builder: (context, pinItemState) {
    // pinItemState provides: .value, .index, .type (PinItemStateType)
    final isFocused = pinItemState.type == PinItemStateType.focused;
    final isError = pinItemState.type == PinItemStateType.error;

    return Container(
      width: 48,
      height: 52,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: isError ? Colors.red : (isFocused ? Colors.blue : Colors.grey),
            width: isFocused ? 2 : 1,
          ),
        ),
      ),
      child: Text(
        pinItemState.value,
        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
      ),
    );
  },
)
```

---

## OTP and Autofill

### Platform Matrix
| Platform | Capability | Setup Requirement |
| :--- | :--- | :--- |
| **iOS** | Native QuickType SMS Autofill | Real device required. Add `autofillHints: const [AutofillHints.oneTimeCode]`. Zero native code needed. |
| **Android** | SMS Retriever API (Zero-click) | Implement `SmsRetriever` using `smart_auth`. Requires 11-char app signature hash in SMS. |
| **Android** | SMS User Consent API (1-tap prompt) | Implement `SmsRetriever` using `smart_auth`. No hash needed; triggers OS consent sheet. |
| **Android** | Firebase Phone Auth | Call `pinController.setText(credential.smsCode)` inside `verificationCompleted`. |
| **Web** | WebOTP API | Handled by browser if served over HTTPS with valid domain-bound SMS. |
| **Desktop** | Clipboard paste | Automatic when `enableInteractiveSelection: true` or via `onClipboardFound`. |

### Implementing `SmsRetriever` with `smart_auth`
In `pinput` 5.0.0+, Android SMS autofill is decoupled. Implement the interface explicitly:

```dart
import 'package:pinput/pinput.dart';
import 'package:smart_auth/smart_auth.dart';

class SmartAuthSmsRetriever implements SmsRetriever {
  const SmartAuthSmsRetriever(this.smartAuth);

  final SmartAuth smartAuth;

  @override
  bool get listenForMultipleSms => false;

  @override
  Future<String?> getSmsCode() async {
    // Option A: SMS User Consent API (dialog prompt to user, no app hash required)
    final res = await smartAuth.getSmsWithUserConsentApi();
    return res.data?.code;

    // Option B: SMS Retriever API (silent auto-read, requires SMS app hash)
    // final res = await smartAuth.getSmsWithRetrieverApi();
    // return res.data?.code;
  }

  @override
  Future<void> dispose() async {
    await smartAuth.removeUserConsentApiListener();
  }
}
```

In your State object:
```dart
late final SmsRetriever _smsRetriever;

@override
void initState() {
  super.initState();
  _smsRetriever = SmartAuthSmsRetriever(SmartAuth.instance);
}

@override
Widget build(BuildContext context) {
  return Pinput(
    smsRetriever: _smsRetriever,
    autofillHints: const [AutofillHints.oneTimeCode],
    // ...
  );
}
```

---

## Responsive and Cross-Platform Behavior

### Horizontal Constraint Management
`Pinput` uses `MainAxisAlignment.center` by default, which wraps cells in an `IntrinsicWidth`.
- **Narrow Screens (<360px)**: A 6-digit PIN with 56px cells + 8px separators = `(6 * 56) + (5 * 8) = 376px`. This causes a `RenderFlex` overflow on devices like iPhone SE.
- **Formula**:
  `maxCellWidth = (availableWidth - (padding + ((length - 1) * separatorSpacing))) / length`
- Use `LayoutBuilder` to compute responsive cell dimensions:

```dart
LayoutBuilder(
  builder: (context, constraints) {
    const int pinLength = 6;
    const double separatorWidth = 8.0;
    final double totalSpacing = separatorWidth * (pinLength - 1);
    final double cellWidth = ((constraints.maxWidth - totalSpacing) / pinLength)
        .clamp(38.0, 52.0);

    final responsiveTheme = defaultPinTheme.copyWith(
      width: cellWidth,
      height: cellWidth * 1.15,
    );

    return Pinput(
      length: pinLength,
      separatorBuilder: (_) => const SizedBox(width: separatorWidth),
      defaultPinTheme: responsiveTheme,
      // ...
    );
  },
)
```

### Right-to-Left (RTL) Languages
Even in RTL locales (Arabic, Hebrew, Persian, Urdu), OTP and verification codes are universally keyed and read Left-to-Right.
The agent **MUST** wrap `Pinput` in `Directionality(textDirection: TextDirection.ltr)`:
```dart
Directionality(
  textDirection: TextDirection.ltr,
  child: Pinput(
    // configuration
  ),
)
```

### Desktop and Web Optimizations
1. **Interactive Selection & Paste**:
   Set `enableInteractiveSelection: true` to enable standard desktop selection and keyboard shortcuts (`Cmd+V` / `Ctrl+V`).
2. **Web Context Menu Collision**:
   On Flutter Web, disable the browser's default context menu in `initState()` to prevent duplicate overlays:
   ```dart
   if (kIsWeb) {
     BrowserContextMenu.disableContextMenu();
   }
   ```
   Re-enable it in `dispose()` via `BrowserContextMenu.enableContextMenu()`.

---

## Accessibility

- **Semantics Integration**: `Pinput` automatically embeds `Semantics` providing `maxValueLength` (total PIN length) and `currentValueLength` (digits entered). TalkBack and VoiceOver announce progress (e.g. "PIN code field, 3 of 6 digits entered").
- **Focus Announcement**: In v6.0.0+, the `Semantics` node includes an `onFocus` handler that triggers keyboard request and accessibility focus sync.
- **Accessible Contrast**:
  - Unfocused border to background contrast ratio **MUST** be at least `3:1`.
  - Text to cell background contrast ratio **MUST** be at least `4.5:1`.
  - Do not rely solely on color to communicate errors; pair `errorPinTheme` with a visible text label via `errorText` or `errorBuilder`.

---

## Security and Sensitive Data

1. **Shoulder-Surfing Defense**:
   For banking PINs, card CVVs, or wallet passcodes, enable masking:
   ```dart
   Pinput(
     obscureText: true,
     obscuringCharacter: '•', // or '●'
     // Optional: custom widget such as an SVG icon
     // obscuringWidget: Icon(Icons.lock, size: 16),
   )
   ```
   *Note: Visual obscuring only prevents optical observation; it is not data encryption.*
2. **OS Keyboard Cache & Suggestions**:
   Ensure `enableIMEPersonalizedLearning: false` (default in Pinput). This prevents the Android OS IME from saving sensitive PINs into the user's dictionary or predictive text models.
3. **Memory Hygiene**:
   Clear the controller immediately when authentication completes or when the user navigates away:
   ```dart
   @override
   void dispose() {
     _pinController.clear();
     _pinController.dispose();
     super.dispose();
   }
   ```
4. **Never Log Sensitive Codes**:
   The agent **MUST NOT** include `print('OTP: $pin')` or send raw PIN strings to third-party analytics or crash reporting tools (Firebase Crashlytics, Sentry, Datadog).

---

## Performance Guidelines

1. **Avoid In-Build Theme Instantiation**:
   `PinTheme` and `BoxDecoration` objects allocated inside `build()` generate unnecessary GC pressure during 60/120fps frame transitions.
   - Declare static constants for fixed styles: `static final _defaultPinTheme = ...`
   - If themes depend on `ThemeData`, cache them or use `copyWith()` sparingly.
2. **Shadow and Blur Costs**:
   Animated shadows (`boxShadow`) and backdrop filters inside `PinTheme.decoration` trigger expensive offscreen rasterization during cell focus switches. Prefer solid borders and color fills.
3. **Validation Throttling**:
   Avoid running expensive regex or cryptographic checks on every keystroke. Keep `pinputAutovalidateMode: PinputAutovalidateMode.onSubmit`.

---

## State Management Integration

### Principle of State Segregation
- **Ephemeral UI State**: `TextEditingController`, `FocusNode`, and cursor animation belong strictly inside the local `StatefulWidget`.
- **Domain State**: Loading indicators, resend countdown timers, verification API calls, and server error messages belong to your domain state manager (Riverpod, Bloc, Provider).

### Flutter Riverpod Integration
```dart
class OtpVerificationScreen extends ConsumerStatefulWidget {
  const OtpVerificationScreen({super.key});

  @override
  ConsumerState<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends ConsumerState<OtpVerificationScreen> {
  late final TextEditingController _pinController;
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _pinController = TextEditingController();
    _focusNode = FocusNode();
  }

  @override
  void dispose() {
    _pinController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    ref.listen<AuthState>(authNotifierProvider, (previous, next) {
      if (next.hasError) {
        _pinController.clear();
        _focusNode.requestFocus();
      }
    });

    return Directionality(
      textDirection: TextDirection.ltr,
      child: Pinput(
        controller: _pinController,
        focusNode: _focusNode,
        length: 6,
        enabled: !authState.isLoading,
        forceErrorState: authState.hasError,
        errorText: authState.errorMessage,
        onCompleted: (pin) {
          ref.read(authNotifierProvider.notifier).verifyOtp(pin);
        },
      ),
    );
  }
}
```

### Bloc / Cubit Integration
```dart
class OtpVerificationView extends StatefulWidget {
  const OtpVerificationView({super.key});

  @override
  State<OtpVerificationView> createState() => _OtpVerificationViewState();
}

class _OtpVerificationViewState extends State<OtpVerificationView> {
  late final TextEditingController _controller;
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _focusNode = FocusNode();
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthVerificationFailure) {
          _controller.clear();
          _focusNode.requestFocus();
        }
      },
      builder: (context, state) {
        final isLoading = state is AuthLoading;
        final errorMessage = state is AuthVerificationFailure ? state.message : null;

        return Directionality(
          textDirection: TextDirection.ltr,
          child: Pinput(
            controller: _controller,
            focusNode: _focusNode,
            length: 6,
            enabled: !isLoading,
            forceErrorState: errorMessage != null,
            errorText: errorMessage,
            onCompleted: (code) {
              context.read<AuthBloc>().add(AuthVerifyCodeSubmitted(code));
            },
          ),
        );
      },
    );
  }
}
```

---

## Testing Strategy

### Testing Invariants
1. `Pinput` renders an invisible `EditableText` under the hood. To enter text in widget tests, target `find.byType(EditableText)`.
2. Keyboard actions (e.g. `onSubmitted`) are triggered via `tester.testTextInput.receiveAction(TextInputAction.done)`.
3. Cell styling can be validated by inspecting `AnimatedContainer` widgets and checking their `decoration`.

### Complete Widget Test Suite
```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pinput/pinput.dart';

void main() {
  group('Pinput Widget Tests', () {
    testWidgets('Entering PIN invokes onChanged and onCompleted callbacks', (tester) async {
      String? changedValue;
      String? completedValue;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Directionality(
              textDirection: TextDirection.ltr,
              child: Pinput(
                length: 4,
                onChanged: (val) => changedValue = val,
                onCompleted: (val) => completedValue = val,
              ),
            ),
          ),
        ),
      );

      // Verify initial state
      expect(find.byType(EditableText), findsOneWidget);
      expect(completedValue, isNull);

      // Enter 3 digits -> onChanged called, onCompleted not called
      await tester.enterText(find.byType(EditableText), '123');
      await tester.pump();
      expect(changedValue, '123');
      expect(completedValue, isNull);

      // Enter 4th digit -> onCompleted called
      await tester.enterText(find.byType(EditableText), '1234');
      await tester.pump();
      expect(changedValue, '1234');
      expect(completedValue, '1234');
    });

    testWidgets('Displays error text when validator fails on submit', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Directionality(
              textDirection: TextDirection.ltr,
              child: Pinput(
                length: 4,
                pinputAutovalidateMode: PinputAutovalidateMode.onSubmit,
                validator: (pin) {
                  if (pin != '9999') return 'Invalid code';
                  return null;
                },
              ),
            ),
          ),
        ),
      );

      // Enter invalid pin
      await tester.enterText(find.byType(EditableText), '1111');
      await tester.pumpAndSettle();

      // Error message should be rendered
      expect(find.text('Invalid code'), findsOneWidget);
    });

    testWidgets('Programmatic controller manipulation updates cells', (tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Directionality(
              textDirection: TextDirection.ltr,
              child: Pinput(
                controller: controller,
                length: 4,
              ),
            ),
          ),
        ),
      );

      // Use extension method to set text
      controller.setText('4242');
      await tester.pumpAndSettle();

      expect(find.text('4'), findsNWidgets(2));
      expect(find.text('2'), findsNWidgets(2));

      // Use extension method to delete last character
      controller.delete();
      await tester.pumpAndSettle();

      expect(controller.text, '424');
    });
  });
}
```

---

## Error Handling and Edge Cases

1. **Pasting Strings with Non-Digits**:
   Add `FilteringTextInputFormatter.digitsOnly` to `inputFormatters` to prevent users or SMS autofill from injecting alpha characters into numeric fields:
   ```dart
   inputFormatters: [FilteringTextInputFormatter.digitsOnly]
   ```
2. **Clipboard String Matching**:
   Use `onClipboardFound` to detect matching code lengths in the system clipboard when the app resumes:
   ```dart
   onClipboardFound: (clipboardCode) {
     if (clipboardCode.length == 6 && RegExp(r'^\d+$').hasMatch(clipboardCode)) {
       _controller.setText(clipboardCode);
     }
   }
   ```
3. **Keyboard Overlaying Input**:
   When embedded in a scrollable view (`SingleChildScrollView`), configure `scrollPadding` to ensure the focused pin field is pushed above the soft keyboard:
   ```dart
   scrollPadding: const EdgeInsets.only(bottom: 80),
   ```

---

## Common Anti-Patterns

### 1. The Build Method Instantiation Leak
```dart
// BAD: Allocating controller and focusNode on every build pass
@override
Widget build(BuildContext context) {
  final controller = TextEditingController(); // LEAK & LOSS OF STATE
  return Pinput(controller: controller);
}

// GOOD: Instantiate in initState, dispose in dispose
late final TextEditingController _controller;
@override
void initState() {
  super.initState();
  _controller = TextEditingController();
}
@override
void dispose() {
  _controller.dispose();
  super.dispose();
}
```

### 2. Missing RTL Directionality Guard
```dart
// BAD: In RTL locales, OTP cells render and fill right-to-left
Pinput(length: 6);

// GOOD: Strictly enforce LTR entry for all numeric codes
Directionality(
  textDirection: TextDirection.ltr,
  child: Pinput(length: 6),
);
```

### 3. Hardcoded Width Causing Layout Overflow
```dart
// BAD: 6 * 64px = 384px width. Fails on small viewports (e.g. 320px screen)
PinTheme(width: 64, height: 64);

// GOOD: Constrain cell size relative to parent layout
LayoutBuilder(
  builder: (context, constraints) {
    final cellWidth = ((constraints.maxWidth - 40) / 6).clamp(36.0, 52.0);
    return Pinput(defaultPinTheme: PinTheme(width: cellWidth, height: cellWidth * 1.15));
  },
);
```

### 4. Direct smart_auth Coupling in v5/v6
```dart
// BAD: Expecting pinput to handle Android SMS automatically without an SmsRetriever
Pinput(autofillHints: [AutofillHints.oneTimeCode]); // Works on iOS only!

// GOOD: Pass a concrete SmsRetriever implementation for Android support
Pinput(
  smsRetriever: _mySmsRetriever,
  autofillHints: const [AutofillHints.oneTimeCode],
);
```

---

## Review Checklist

- [ ] Is `Pinput` wrapped in `Directionality(textDirection: TextDirection.ltr)`?
- [ ] If `controller` and `focusNode` are provided, are they disposed in the parent `StatefulWidget`?
- [ ] Are `PinTheme` declarations cached or derived via `copyWith` rather than constructed from scratch in `build()`?
- [ ] Does total PIN width `(length * cellWidth) + (length - 1) * separator` fit within 320px mobile screens?
- [ ] Is `keyboardType: TextInputType.number` specified with `FilteringTextInputFormatter.digitsOnly` (for numeric codes)?
- [ ] For Android SMS autofill, is an `SmsRetriever` instance hooked and disposed?
- [ ] Does `onTapOutside` dismiss focus or keyboard when desired?
- [ ] Are sensitive codes cleared from `TextEditingController` memory after verification?
- [ ] Is `enableIMEPersonalizedLearning` kept `false` to prevent keyboard dictionary caching?
- [ ] Are errors presented with accessible text (`errorText` or `errorBuilder`) and not color alone?

---

## Debugging Checklist

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **Soft keyboard does not appear on tap** | `useNativeKeyboard` set to `false`, or `enabled: false`, or focus node blocked. | Verify `useNativeKeyboard: true`, check `enabled`, and inspect if an outer `IgnorePointer` or `AbsorbPointer` exists. |
| **SMS autofill works on iOS but fails on Android** | Missing `SmsRetriever` (decoupled in v5.0.0+). | Add `smart_auth` to `pubspec.yaml`, implement `SmsRetriever`, and pass it to `Pinput(smsRetriever: ...)`. |
| **SMS autofill does not trigger on iOS** | Tested on Simulator or non-matching SMS text format. | Test on a physical iOS device. Verify SMS body contains "code" or standard one-time code format. |
| **Cells layout horizontally overflows (`RenderFlex` error)** | `defaultPinTheme.width` is too large for the screen width. | Compute responsive cell width via `LayoutBuilder` or lower cell width + separator spacing. |
| **Error styling does not clear when user retypes** | `forceErrorState: true` is permanently set in parent state. | Reset `forceErrorState = false` in `onChanged: (pin) { ... }`. |
| **Pinput enters digits backwards** | Application is running under an RTL `Locale` (Arabic, Hebrew, etc.). | Wrap `Pinput` in `Directionality(textDirection: TextDirection.ltr)`. |
| **Widget tests fail to enter text** | Tester searching for custom pin cells rather than input mechanism. | Target `find.byType(EditableText)` using `tester.enterText()`. |

---

## Version and Migration Considerations

### Migrating from 4.x to 5.x / 6.x
1. **Android SMS Autofill**:
   - **Removed**: `androidSmsAutofillMethod` parameter and internal `smart_auth` dependency.
   - **New**: `smsRetriever` parameter accepting any class implementing `SmsRetriever`. Add `smart_auth` directly to your app's dependencies if using Google Play SMS APIs.
2. **Separators**:
   - **Removed**: `separator` and `separatorPositions`.
   - **New**: `separatorBuilder: (index) => const SizedBox(width: 8)`.
3. **Custom Builder**:
   - Use `Pinput.builder` when you need full control over cell rendering instead of overriding container properties.
4. **Focus Error Visibility (6.0.0+)**:
   - `showErrorWhenFocused` defaults to `false`. If you want errors to remain visible while the user is actively correcting their PIN in a focused field, set `showErrorWhenFocused: true`.

---

## Production Example

Here is a complete, resilient, copy-paste-ready OTP verification component implementing custom theming, responsive layout calculation, countdown timer, resend hooks, LTR isolation, tap-outside dismissal, and error state handling:

```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pinput/pinput.dart';

class ProductionOtpVerificationCard extends StatefulWidget {
  const ProductionOtpVerificationCard({
    required this.phoneNumber,
    required this.onVerifyCode,
    required this.onResendCode,
    this.codeLength = 6,
    this.smsRetriever,
    super.key,
  });

  final String phoneNumber;
  final int codeLength;
  final Future<bool> Function(String pin) onVerifyCode;
  final Future<void> Function() onResendCode;
  final SmsRetriever? smsRetriever;

  @override
  State<ProductionOtpVerificationCard> createState() =>
      _ProductionOtpVerificationCardState();
}

class _ProductionOtpVerificationCardState
    extends State<ProductionOtpVerificationCard> {
  late final TextEditingController _pinController;
  late final FocusNode _focusNode;

  Timer? _countdownTimer;
  int _secondsRemaining = 60;
  bool _canResend = false;
  bool _isVerifying = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _pinController = TextEditingController();
    _focusNode = FocusNode();
    _startCountdown();
  }

  void _startCountdown() {
    setState(() {
      _secondsRemaining = 60;
      _canResend = false;
    });
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 1) {
        setState(() => _secondsRemaining--);
      } else {
        timer.cancel();
        setState(() {
          _secondsRemaining = 0;
          _canResend = true;
        });
      }
    });
  }

  Future<void> _handleCompleted(String pin) async {
    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    try {
      final success = await widget.onVerifyCode(pin);
      if (!mounted) return;

      if (!success) {
        setState(() {
          _errorMessage = 'Invalid verification code. Please try again.';
          _isVerifying = false;
        });
        _pinController.clear();
        _focusNode.requestFocus();
      } else {
        setState(() => _isVerifying = false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Verification failed. Please check your connection.';
        _isVerifying = false;
      });
      _pinController.clear();
      _focusNode.requestFocus();
    }
  }

  Future<void> _handleResend() async {
    if (!_canResend || _isVerifying) return;
    setState(() => _errorMessage = null);
    await widget.onResendCode();
    _startCountdown();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _pinController.clear();
    _pinController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const separatorSpacing = 8.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            'Verify Phone Number',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Enter the ${widget.codeLength}-digit code sent to ${widget.phoneNumber}',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 32),

          // Responsive Pinput
          LayoutBuilder(
            builder: (context, constraints) {
              final totalSpacing = separatorSpacing * (widget.codeLength - 1);
              final calculatedCellWidth =
                  ((constraints.maxWidth - totalSpacing) / widget.codeLength)
                      .clamp(36.0, 52.0);

              final defaultPinTheme = PinTheme(
                width: calculatedCellWidth,
                height: calculatedCellWidth * 1.18,
                textStyle: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.onSurface,
                ),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: theme.colorScheme.outlineVariant,
                    width: 1.5,
                  ),
                ),
              );

              final focusedPinTheme = defaultPinTheme.copyWith(
                decoration: defaultPinTheme.decoration?.copyWith(
                  border: Border.all(
                    color: theme.colorScheme.primary,
                    width: 2,
                  ),
                ),
              );

              final submittedPinTheme = defaultPinTheme.copyWith(
                decoration: defaultPinTheme.decoration?.copyWith(
                  color: theme.colorScheme.surfaceContainerHighest,
                  border: Border.all(
                    color: theme.colorScheme.primary.withValues(alpha: 0.6),
                    width: 1.5,
                  ),
                ),
              );

              final errorPinTheme = defaultPinTheme.copyWith(
                decoration: defaultPinTheme.decoration?.copyWith(
                  color: theme.colorScheme.errorContainer.withValues(alpha: 0.2),
                  border: Border.all(
                    color: theme.colorScheme.error,
                    width: 2,
                  ),
                ),
              );

              return Directionality(
                textDirection: TextDirection.ltr,
                child: Pinput(
                  controller: _pinController,
                  focusNode: _focusNode,
                  length: widget.codeLength,
                  smsRetriever: widget.smsRetriever,
                  enabled: !_isVerifying,
                  autofocus: true,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  autofillHints: const [AutofillHints.oneTimeCode],
                  separatorBuilder: (_) => const SizedBox(width: separatorSpacing),
                  defaultPinTheme: defaultPinTheme,
                  focusedPinTheme: focusedPinTheme,
                  submittedPinTheme: submittedPinTheme,
                  errorPinTheme: errorPinTheme,
                  forceErrorState: _errorMessage != null,
                  errorText: _errorMessage,
                  showErrorWhenFocused: false,
                  onTapOutside: (_) => _focusNode.unfocus(),
                  onCompleted: _handleCompleted,
                  onChanged: (_) {
                    if (_errorMessage != null) {
                      setState(() => _errorMessage = null);
                    }
                  },
                ),
              );
            },
          ),
          const SizedBox(height: 24),

          if (_isVerifying)
            const CircularProgressIndicator.adaptive()
          else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  "Didn't receive the code? ",
                  style: theme.textTheme.bodyMedium,
                ),
                TextButton(
                  onPressed: _canResend ? _handleResend : null,
                  child: Text(
                    _canResend ? 'Resend' : 'Resend in ${_secondsRemaining}s',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _canResend
                          ? theme.colorScheme.primary
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
```

---

## Decision Rules for AI Agents

1. **Controller Lifecycle**:
   - The agent **MUST NOT** instantiate a `TextEditingController` or `FocusNode` inside the `build()` method.
   - If the agent passes a `controller` or `focusNode` to `Pinput`, it **MUST** dispose it in `State.dispose()`.
   - If the agent does not need external programmatic access to the text or focus, it **SHOULD** omit both parameters and allow `Pinput` to manage its internal lifecycle.
2. **Directionality Protection**:
   - The agent **MUST** wrap `Pinput` with `Directionality(textDirection: TextDirection.ltr)`.
3. **SMS Autofill Implementation**:
   - The agent **MUST NOT** expect `pinput` v5.0.0+ to automatically read Android SMS messages without a configured `SmsRetriever`.
   - For iOS SMS autofill, the agent **MUST** set `autofillHints: const [AutofillHints.oneTimeCode]`.
4. **Responsiveness & Constraints**:
   - The agent **MUST NOT** assign static cell widths exceeding 52px for 6-digit codes without wrapping the widget in a `LayoutBuilder` or providing flexible sizing, to prevent overflows on 320px screens.
5. **Security & Privacy**:
   - The agent **MUST NOT** log or print OTP codes to the console or analytics payloads.
   - The agent **MUST NOT** set `enableIMEPersonalizedLearning: true` for OTP/PIN inputs.
   - The agent **SHOULD** set `obscureText: true` for financial passcodes or security PINs.
6. **Testing Invariants**:
   - In widget tests, the agent **MUST** target `find.byType(EditableText)` when using `tester.enterText()`.
   - The agent **MUST NOT** attempt to enter text directly into individual `_PinItem` or `Container` widgets.

---

## Sources
- **Package Documentation & API**: [pub.dev/packages/pinput](https://pub.dev/packages/pinput)
- **Source Code Repository**: [github.com/Tkko/Flutter_PinPut](https://github.com/Tkko/Flutter_PinPut)
- **Changelog**: [pub.dev/packages/pinput/changelog](https://pub.dev/packages/pinput/changelog)
- **Migration Guide**: [github.com/Tkko/Flutter_PinPut/blob/master/MIGRATION.md](https://github.com/Tkko/Flutter_PinPut/blob/master/MIGRATION.md)
- **Flutter Framework Text Input**: [api.flutter.dev/flutter/widgets/EditableText-class.html](https://api.flutter.dev/flutter/widgets/EditableText-class.html)
- **Google Play SMS Retriever API**: [developers.google.com/identity/sms-retriever/overview](https://developers.google.com/identity/sms-retriever/overview)
- **Google Play SMS User Consent API**: [developers.google.com/identity/sms-retriever/user-consent/overview](https://developers.google.com/identity/sms-retriever/user-consent/overview)
