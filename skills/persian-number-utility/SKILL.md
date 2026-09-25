---
name: persian-number-utility
description: "Use when formatting, normalizing, or validating Persian/Farsi digits, number words, dates, currency, and Iranian identifiers (National Code, Mobile, Bank Card, Sheba, Postal Code) in Flutter and Dart applications using persian_number_utility. Covers canonical data flow, input formatters, form validation, and performance traps."
metadata:
  category: flutter-packages
  version: 1.1.6
  tags: [flutter, dart, persian, farsi, localization, formatting, validation, jalali, iranian-utilities]
---

# Persian Number Utility — Flutter Skill

## Purpose
This skill provides authoritative, production-grade engineering instructions for integrating, formatting, normalizing, validating, and testing Persian numbers, words, dates, currency, and Iranian identifiers in Flutter applications using the `persian_number_utility` package (v1.1.6).

---

## When to Use This Skill
- Formatting numbers, dates, currency amounts, or card numbers into Persian digits (`۱۲۳`) and separated groups (`۱۰۰,۰۰۰`).
- Converting numbers to Persian words (e.g., `1000` -> `یک هزار`) or words back to integers (`toNumber()`).
- Validating Iranian syntactic formats: National Code (کد ملی), Bank Card (شماره کارت), Mobile Number (شماره موبایل), Postal Code (کد پستی), and Sheba (شبا).
- Normalizing user input containing mixed Persian (`۰-۹`), Arabic (`٠-٩`), and Latin (`0-9`) digits into canonical ASCII for backend storage or parsing.
- Converting Gregorian `DateTime` to Jalali/Shamsi (هجری شمسی) representation and relative time strings.

---

## When NOT to Use This Package
- **Authoritative Identity or Bank Account Verification**: Client-side checksums cannot verify if a national code belongs to a living person or if a bank card is active. Use authenticated backend APIs.
- **Complex Financial / Ledger Calculations**: `beToman()` converts via `double` division (`/ 10`), introducing IEEE-754 precision issues. Use integer math in lowest denomination or `package:decimal`.
- **Complete App Internationalization (i18n)**: This package does not check `Localizations.localeOf(context)`. It unconditionally produces Persian strings. For locale-aware formatting, use `intl` (`NumberFormat`).
- **Full-featured Solar Hijri Calendars**: For calendar math, leap-year calculations, date arithmetic, or date picking, prefer `shamsi_date` or dedicated calendar engines.

---

## Sources of Truth
- **Package**: `persian_number_utility` (Current baseline: `^1.1.6`) on [pub.dev](https://pub.dev/packages/persian_number_utility).
- **Official Repository**: [mehdi-nemati/persian_number_utility](https://github.com/mehdi-nemati/persian_number_utility).
- **Source Modules**: `lib/src/methods.dart`, `lib/src/extensions.dart`, `lib/src/word_class.dart`, `lib/src/validators/*`.

---

## Core Mental Model

```text
   [User Input: Mixed Script]  ---> (Persian / Arabic / Latin: "۱۲۳abc٤٥")
               │
               ▼
   [Normalization Layer]       ---> .toEnglishDigit().extractNumber()
               │
               ▼
   [Canonical Domain State]    ---> int / num / ASCII String ("12345")
         │           │
         │           ▼
         │     [Storage / API] ---> Persist clean ASCII / int
         ▼
   [Presentation Layer]        ---> .seRagham().toPersianDigit()
                                     "۱۲,۳۴۵" (Display Only)
```

1. **Strings In, Strings Out**: Extensions apply strictly to `String` and `DateTime`. There are **no extensions on `num`, `int`, or `double`**.
2. **Text Transformations, Not Numeric Parsing**: `toPersianDigit()` and `toEnglishDigit()` are character replacement utilities. They do not parse numbers, do not re-order RTL/LTR layout, and do not validate numeric grammar.
3. **Canonical Data Separation**: Persist and transmit data in canonical ASCII or numeric types. Never store Persian-digit strings in databases or API payloads unless explicitly required by an external contract.

---

## Package Setup

In `pubspec.yaml`:
```yaml
dependencies:
  persian_number_utility: ^1.1.6
```

Single canonical import:
```dart
import 'package:persian_number_utility/persian_number_utility.dart';
```

Exposes:
- `StringExtensions on String`
- `PersianDateTimeExtensions on DateTime`
- `NumberUtility` (static class)
- `NumStrLanguage` (`NumStrLanguage.Farsi`, `NumStrLanguage.English`)

---

## Public API Mental Map

| Extension / Method | Receiver | Return Type | Description & Caveats |
| :--- | :--- | :--- | :--- |
| `.toPersianDigit()` | `String` | `String` | Replaces `0-9` with `۰-۹`. **Leaves Arabic digits unchanged**. |
| `.toEnglishDigit()` | `String` | `String` | Replaces both Persian (`۰-۹`) and Arabic (`٠-٩`) with `0-9`. |
| `.extractNumber({toDigit})` | `String` | `String` | Strips all non-digit characters (`[^0-9]`). Drops `-` and `.`. |
| `.seRagham({separator = ","})` | `String` | `String` | Groups digits by 3 from the right. Preserves `.decimal`. |
| `.charRagham({separator = "-"})`| `String` | `String` | Groups digits by 4 from the right (card formatting). |
| `.toWord({lang})` | `String` | `String` | Converts number string to words. Positive integers up to 15 digits only. |
| `.toNumber()` | `String` | `int` | Converts Persian number words to `int`. **Throws `Exception` on bad input**. |
| `.isNumeric()` | `String` | `bool` | Returns `true` if `double.tryParse` succeeds on ASCII digits. |
| `.isContainDigits()` | `String` | `bool` | Returns `true` if input contains any Persian, Arabic, or English digit. |
| `.toPersianDate(...)` | `DateTime` | `String` | Converts Gregorian date to Shamsi date string (`۱۳۹۹/۰۷/۰۶`). |
| `.toPersianDate(...)` | `String` | `String` | Parses date string and returns Shamsi. Returns `"0000/00/00"` on error. |
| `.toPersianDateStr(...)` | `DateTime` | `String` | Textual Shamsi date (e.g., `شانزده مهر ۱۳۹۹`). |
| `.getDifferenceDateString(...)`| `DateTime` | `String` | Relative time difference (e.g., `لحظاتی پیش`, `دیروز`). |
| `.beToman()` | `String` | `String` | Divides Rial amount by 10. **Throws `FormatException` if empty**. |
| `.beRial()` | `String` | `String` | Multiplies Toman amount by 10. **Throws `FormatException` if empty**. |
| `.getBankNameFromCardNumber()` | `String` | `String` | Returns Persian bank name from 6-digit BIN, or `'-'`. |
| `.fixPersianChars()` | `String` | `String` | Replaces Arabic `ي`, `ك`, `ھ`, `ئ` with Persian `ی`, `ک`, `ه`, `ی`. |
| `.isValidIranianNationalCode()` | `String` | `bool` | Modulo-11 checksum. **Throws `FormatException` if non-normalized**. |
| `.isValidBankCardNumber()` | `String` | `bool` | Luhn 16-digit card checksum. Requires ASCII digits. |
| `.isValidBankShebaNumber()` | `String` | `bool` | IBAN checksum check. Non-standard implementation; use with caution. |
| `.isValidIranianMobileNumber()` | `String` | `bool` | Regex check for Iranian mobile numbers. Requires ASCII digits. |
| `.isValidIranianPostalCode()` | `String` | `bool` | Regex check for 10-digit Iranian postal codes. Requires ASCII digits. |

---

## Persian, Arabic, and Latin Digit Systems

### The Unicode Reality
- **Latin / ASCII Digits** (`0-9`): `\u0030` to `\u0039`
- **Persian Digits** (`۰-۹`): `\u06F0` to `\u06F9` (Extended Arabic-Indic)
- **Arabic-Indic Digits** (`٠-٩`): `\u0660` to `\u0669` (Standard Arabic)

### The Asymmetry Trap
`toPersianDigit()` does **not** convert Arabic digits `٠-٩` to Persian digits `۰-۹`. It only converts English digits `0-9`.
```dart
// WRONG: Arabic digits remain Arabic!
final bad = "١٢٣٤٥".toPersianDigit(); // Output: "١٢٣٤٥" (Unchanged!)

// CORRECT: Chain toEnglishDigit() first to normalize Arabic digits
final safePersian = "١٢٣٤٥".toEnglishDigit().toPersianDigit(); // Output: "۱۲۳۴۵"
```

---

## Canonical Data vs Display Formatting

### Architectural Rules
1. **Never persist formatted Persian strings** (e.g., `"۱۲,۰۰۰"`) in SQLite, Hive, SecureStorage, or API JSON bodies.
2. **Never parse numbers with Persian digits directly**: `int.parse('۱۲۳')` throws `FormatException`. Always normalize via `.toEnglishDigit()`.
3. **Identifiers must remain `String`**: National codes, phone numbers, and bank cards have significant leading zeros (e.g., `"0012345678"`). Parsing them as `int` permanently destroys data.

```dart
// Domain Model (Clean canonical data)
class TransactionItem {
  const TransactionItem({
    required this.amountRials,
    required this.destinationCard,
  });

  final int amountRials;          // Canonical numeric value
  final String destinationCard;   // Canonical 16-digit ASCII string

  // Presentation Getters
  String get displayAmount =>
      '${amountRials.toString().seRagham().toPersianDigit()} ریال';

  String get displayCard =>
      destinationCard.charRagham().toPersianDigit();
}
```

---

## Basic Usage

### 1. Digit Conversion
```dart
final rawInput = "Order 12345 costs 50000";
final persianText = rawInput.toPersianDigit(); // "Order ۱۲۳۴۵ costs ۵۰۰۰۰"

final userEntered = "۰۹۱۲۳۴۵۶۷۸۹";
final normalizedAscii = userEntered.toEnglishDigit(); // "09123456789"
```

### 2. Grouping Separators
```dart
// Three-digit separation (Currency / Quantities)
final price = "1500000".seRagham(); // "1,500,000"
final customSep = "1500000".seRagham(separator: "/"); // "1/500/000"

// Handles decimal points properly
final decimalPrice = "1500000.75".seRagham(); // "1,500,000.75"

// Four-digit separation (Bank cards)
final card = "6037991123456789".charRagham(); // "6037-9911-2345-6789"
```

### 3. Persian Dates
```dart
final now = DateTime.now();

// Standard Jalali string
final jalali = now.toPersianDate(); // "۱۴۰۳/۰۶/۱۴"
final jalaliEnglishDigits = now.toPersianDate(digitType: NumStrLanguage.English); // "1403/06/14"

// Textual Shamsi representation
final textDate = now.toPersianDateStr(showDayStr: true, strMonth: true);
// "چهارشنبه ۱۴ شهریور ۱۴۰۳"

// Relative time (Difference)
final pastTime = now.subtract(const Duration(minutes: 5));
final relative = pastTime.getDifferenceDateString(); // "دقایقی پیش"
```

---

## Persian Number Words

### Number to Words (`toWord`)
Converts integers up to 15 digits (trillions):
```dart
"100092".toWord(); // "صد هزار و نود و دو"
"100092".toWord(lang: NumStrLanguage.English); // "one hundred thousand ninety two"
```
**Strict Constraints**:
- Strips negative signs: `"-500".toWord()` returns `"پانصد"` (positive).
- Strips decimals: `"10.5".toWord()` returns `"صد و پنج"` (treats as 105).
- Input exceeding 15 digits corrupts group parsing. Do not pass >15 digit numbers.

### Words to Number (`toNumber`)
Converts Persian number words back to `int`:
```dart
final val = "صد و بیست و پنج".toNumber(); // 125
```
**Crash Prevention**:
`toNumber()` throws `Exception("Not correct format / Wrong language!")` on invalid input. **Always wrap in a try-catch block**:
```dart
int? safeParsePersianWord(String word) {
  try {
    return word.trim().toNumber();
  } catch (_) {
    return null;
  }
}
```

---

## Iranian-Specific Utilities

### 1. National Code Validator (کد ملی)
Validates Iranian 10-digit national IDs using Modulo 11.
**Vulnerability Warning**: If the string has length 10 but contains non-digits or Persian digits, the package's internal `int.parse` throws `FormatException`.
```dart
bool isValidNationalCodeSafe(String input) {
  final normalized = input.trim().toEnglishDigit();
  if (normalized.length > 10 || !RegExp(r'^\d{8,10}$').hasMatch(normalized)) {
    return false;
  }
  // Check for all-identical digits (e.g., '1111111111') which pass mod 11 but are invalid
  if (RegExp(r'^(\d)\1{9}$').hasMatch(normalized.padLeft(10, '0'))) {
    return false;
  }
  return normalized.isValidIranianNationalCode();
}
```

### 2. Bank Card Validator & Identification
```dart
final rawCard = "6037-9917-1234-5678";
final cleanCard = rawCard.replaceAll(RegExp(r'\D'), '').toEnglishDigit();

if (cleanCard.isValidBankCardNumber()) {
  final bankName = cleanCard.getBankNameFromCardNumber(); // "بانک ملی ایران"
}
```

### 3. Mobile Number Validator
Validates prefixes: `09...`, `+989...`, `00989...`, `989...`
```dart
final mobile = "۰۹۱۲۳۴۵۶۷۸۹".toEnglishDigit();
final isValid = mobile.isValidIranianMobileNumber(); // true
```

### 4. Postal Code Validator
Validates 10-digit Iranian postal codes (excluding 0 and 2 in first 4 digits):
```dart
final postal = "1599812345".toEnglishDigit();
final isValid = postal.isValidIranianPostalCode();
```

---

## Forms and Text Input

### The `onChanged` Anti-Pattern
**Never do this**:
```dart
// ANTI-PATTERN: Breaks cursor, triggers loops, kills IME
TextField(
  controller: _controller,
  onChanged: (text) {
    _controller.text = text.toPersianDigit(); // Jumps cursor to index 0 or end!
  },
)
```

### Safe Real-Time Formatting via `TextInputFormatter`
Because Persian and Latin digits have identical character lengths (1:1 substitution), cursor offset is preserved without calculation drift:

```dart
import 'package:flutter/services.dart';
import 'package:persian_number_utility/persian_number_utility.dart';

/// Converts typed Latin/Arabic digits to Persian digits in real-time.
class PersianDigitInputFormatter extends TextInputFormatter {
  const PersianDigitInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) return newValue;

    // Normalize Arabic first, then convert English to Persian
    final converted = newValue.text.toEnglishDigit().toPersianDigit();

    return newValue.copyWith(
      text: converted,
      selection: newValue.selection,
      composing: TextRange.empty,
    );
  }
}

/// Normalizes user-typed Persian/Arabic digits to English digits for domain fields.
class PersianToEnglishDigitFormatter extends TextInputFormatter {
  const PersianToEnglishDigitFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) return newValue;

    final converted = newValue.text.toEnglishDigit();

    return newValue.copyWith(
      text: converted,
      selection: newValue.selection,
      composing: TextRange.empty,
    );
  }
}
```

### Safe Three-Digit Currency Separator Formatter
Adding separators dynamically changes text length. The formatter **must** track and offset cursor position:

```dart
class PersianCurrencyInputFormatter extends TextInputFormatter {
  const PersianCurrencyInputFormatter({this.enablePersianDigits = true});

  final bool enablePersianDigits;

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) {
      return newValue.copyWith(text: '');
    }

    // Strip everything except digits
    final rawDigits = newValue.text.toEnglishDigit().replaceAll(RegExp(r'\D'), '');
    if (rawDigits.isEmpty) {
      return newValue.copyWith(text: '', selection: const TextSelection.collapsed(offset: 0));
    }

    var formatted = rawDigits.seRagham();
    if (enablePersianDigits) {
      formatted = formatted.toPersianDigit();
    }

    // Calculate cursor position relative to the end of the text
    final oldLength = newValue.text.length;
    final newLength = formatted.length;
    final cursorOffset = newValue.selection.baseOffset;
    final trailingChars = oldLength - cursorOffset;
    final newOffset = (newLength - trailingChars).clamp(0, newLength);

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: newOffset),
    );
  }
}
```

---

## RTL and Localization

- `persian_number_utility` modifies characters, **not text directionality**.
- When rendering Persian digits alongside Latin characters (e.g., currency symbols, phone prefixes, or dates), wrap in a `Directionality(textDirection: TextDirection.rtl, ...)` widget to avoid LTR glyph flipping.
- When using phone numbers or card numbers, keep their text direction **LTR** even in an RTL layout to maintain standard readability (`0912-345-6789`).

```dart
Widget buildPhoneNumber(String phone) {
  return Directionality(
    textDirection: TextDirection.ltr,
    child: Text(
      phone.toEnglishDigit().charRagham(),
      style: const TextStyle(fontFamily: 'IRANSans'),
    ),
  );
}
```

---

## Currency and Numeric Precision

### `beToman()` and `beRial()` Gotchas
1. `beToman()` assumes the input string is in **Rials** and returns Tomans (`int.parse(val) / 10`).
2. `beRial()` assumes the input string is in **Tomans** and returns Rials (`int.parse(val) * 10`).
3. Calling `.beToman()` on `""` or non-numeric strings throws a `FormatException`.
4. `beToman()` uses floating-point division and calls `.replaceAll('.0', '')`. For exact financial accounting, perform integer arithmetic manually:

```dart
// PREFERRED: Safe Integer Financial Conversion
class CurrencyUtility {
  const CurrencyUtility._();

  static int rialToToman(int rials) => rials ~/ 10;
  static int tomanToRial(int tomans) => tomans * 10;

  static String formatToman(int tomans, {bool toPersian = true}) {
    final formatted = tomans.toString().seRagham();
    return toPersian ? formatted.toPersianDigit() : formatted;
  }
}
```

---

## Nullability and Error Handling

| Method Call | Input | Result / Failure Behavior | Safe Handling Pattern |
| :--- | :--- | :--- | :--- |
| `str.toWord()` | `""` or `"abc"` | Returns `""` (Empty string) | Safe by default. |
| `str.toWord()` | `"-100"` | Returns `"صد"` (Minus stripped!) | Check `str.startsWith('-')` manually. |
| `str.toNumber()`| Invalid format | **Throws `Exception`** | Wrap in `try-catch`. |
| `str.beToman()` | `""` or `"abc"` | **Throws `FormatException`** | Validate `str.isNumeric()` first. |
| `str.toPersianDate()` | Bad date string | Returns `"0000/00/00"` | Verify output `!= "0000/00/00"`. |
| `str.isValidIranianNationalCode()` | Non-digit 10-char | **Throws `FormatException`** | Normalize with `toEnglishDigit()` & regex check. |

---

## Performance Guidelines

1. **`changeDigit()` RegExp Allocation**:
   `NumberUtility.changeDigit` compiles 20 regular expressions on each invocation.
   - **Do not** call `.toPersianDigit()` on every frame in hot rebuild paths (e.g., custom animations, tick callbacks).
   - In `ListView.builder`, format strings inside the domain model or view model constructor, not repeatedly inside `build()`.
2. **String Interpolation Chaining**:
   Avoid chaining 5 allocations: `num.toString().toEnglishDigit().beToman().seRagham().toPersianDigit()`. Combine domain logic with single-pass presentation formatting.

---

## State Management Integration

Keep all transformations pure and located at system boundaries:

```text
[UI / Form Inputs]  ----(Formatter: toEnglishDigit)----> [Cubit / State: int / ASCII]
                                                                │
[UI / Widgets]     <---(Presenter: seRagham.toPersian)--- [State View Model]
```

- **Bloc/Cubit**: Store raw numeric values (`int amount`) and clean identifiers (`String nationalCode`). Never store `۱۲,۰۰۰`.
- **ViewModel / State**: Expose getters for display text:
  ```dart
  String get formattedPrice => amount.toString().seRagham().toPersianDigit();
  ```

---

## Security and Privacy

1. **Never Log Sensitive Identifiers in Plaintext**:
   Mask bank cards and national codes before logging or sending to analytics:
   ```dart
   String maskBankCard(String card) {
     final clean = card.replaceAll(RegExp(r'\D'), '').toEnglishDigit();
     if (clean.length != 16) return '****';
     return '${clean.substring(0, 6)}******${clean.substring(12)}'.charRagham();
   }
   ```
2. **Client-Side Validation is Not Authorization**:
   `isValidIranianNationalCode()` and `isValidBankCardNumber()` verify syntactic checksums only. Always validate and authenticate on backend servers.

---

## Common Anti-Patterns

```dart
// 1. INCORRECT: Expecting toPersianDigit() to convert Arabic numbers
"٠١٢٣٤٥".toPersianDigit(); // Stays Arabic!
// FIX:
"٠١٢٣٤٥".toEnglishDigit().toPersianDigit();

// 2. INCORRECT: Parsing national code as an integer
final id = int.parse(nationalCodeController.text.toEnglishDigit()); // Loses leading zeros!
// FIX:
final id = nationalCodeController.text.toEnglishDigit().padLeft(10, '0');

// 3. INCORRECT: Using beToman on user input directly without try-catch
final toman = userInput.beToman(); // Crashes with FormatException if user cleared field!
// FIX:
final cleanDigits = userInput.toEnglishDigit().replaceAll(RegExp(r'\D'), '');
final toman = cleanDigits.isEmpty ? "0" : cleanDigits.beToman();

// 4. INCORRECT: Unhandled toNumber()
final val = wordController.text.toNumber(); // Crashes app on typo!
// FIX:
int? val;
try { val = wordController.text.toNumber(); } catch (_) { val = null; }

// 5. INCORRECT: Changing controller.text in onChanged
TextField(
  onChanged: (v) => controller.text = v.toPersianDigit(),
);
// FIX:
// Use inputFormatters: [const PersianDigitInputFormatter()]
```

---

## Complete Production Examples

### Example 1: Robust Iranian National Code Form Field
```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:persian_number_utility/persian_number_utility.dart';

class NationalCodeFormField extends StatelessWidget {
  const NationalCodeFormField({
    super.key,
    required this.controller,
    this.onSaved,
  });

  final TextEditingController controller;
  final ValueChanged<String?>? onSaved;

  static bool _isValid(String? value) {
    if (value == null) return false;
    final normalized = value.trim().toEnglishDigit();
    if (normalized.length != 10 || !RegExp(r'^\d{10}$').hasMatch(normalized)) {
      return false;
    }
    // Disallow 10 identical digits
    if (RegExp(r'^(\d)\1{9}$').hasMatch(normalized)) {
      return false;
    }
    try {
      return normalized.isValidIranianNationalCode();
    } catch (_) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.number,
      maxLength: 10,
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        // Normalizes user-typed Persian digits to English internally
        TextInputFormatter.withFunction((oldVal, newVal) {
          final en = newVal.text.toEnglishDigit();
          return newVal.copyWith(
            text: en,
            selection: newVal.selection,
          );
        }),
      ],
      decoration: const InputDecoration(
        labelText: 'کد ملی',
        hintText: '۰۱۲۳۴۵۶۷۸۹',
        counterText: '',
      ),
      validator: (val) {
        if (val == null || val.isEmpty) return 'لطفاً کد ملی را وارد کنید';
        if (!_isValid(val)) return 'کد ملی وارد شده نامعتبر است';
        return null;
      },
      onSaved: (val) {
        if (val != null) {
          onSaved?.call(val.toEnglishDigit().padLeft(10, '0'));
        }
      },
    );
  }
}
```

### Example 2: Bank Card Form Field with Real-Time Bank Name Detection
```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:persian_number_utility/persian_number_utility.dart';

class BankCardInputField extends StatefulWidget {
  const BankCardInputField({
    super.key,
    required this.onCardValidated,
  });

  final void Function(String cleanCard, String bankName) onCardValidated;

  @override
  State<BankCardInputField> createState() => _BankCardInputFieldState();
}

class _BankCardInputFieldState extends State<BankCardInputField> {
  final _controller = TextEditingController();
  String _bankName = '';
  bool _isValidCard = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    final clean = value.replaceAll('-', '').toEnglishDigit();
    
    // Detect Bank
    if (clean.length >= 6) {
      final detected = clean.getBankNameFromCardNumber();
      setState(() => _bankName = detected == '-' ? '' : detected);
    } else {
      if (_bankName.isNotEmpty) setState(() => _bankName = '');
    }

    // Validate Card Checksum
    if (clean.length == 16) {
      final valid = clean.isValidBankCardNumber();
      setState(() => _isValidCard = valid);
      if (valid) {
        widget.onCardValidated(clean, _bankName);
      }
    } else {
      if (_isValidCard) setState(() => _isValidCard = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Directionality(
          textDirection: TextDirection.ltr,
          child: TextFormField(
            controller: _controller,
            keyboardType: TextInputType.number,
            maxLength: 19, // 16 digits + 3 hyphens
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              _CardNumberDashFormatter(),
            ],
            onChanged: _onChanged,
            decoration: InputDecoration(
              labelText: 'شماره کارت بانکی',
              counterText: '',
              prefixIcon: const Icon(Icons.credit_card),
              suffixText: _bankName,
              suffixStyle: const TextStyle(color: Colors.blueGrey, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        if (_controller.text.length >= 19 && !_isValidCard)
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text('شماره کارت نامعتبر است', style: TextStyle(color: Colors.red, fontSize: 12)),
          ),
      ],
    );
  }
}

class _CardNumberDashFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text.replaceAll(RegExp(r'\D'), '').toEnglishDigit();
    if (text.isEmpty) return newValue.copyWith(text: '');

    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write('-');
      buffer.write(text[i]);
    }

    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
```

---

## Testing Strategy

### Unit Tests
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:persian_number_utility/persian_number_utility.dart';

void main() {
  group('persian_number_utility Unit Verification', () {
    test('Converts English digits to Persian digits', () {
      expect("1234567890".toPersianDigit(), "۱۲۳۴۵۶۷۸۹۰");
    });

    test('Converts both Persian and Arabic digits to English', () {
      const mixed = "۱۲۳٤٥٦"; // Persian 123 + Arabic 456
      expect(mixed.toEnglishDigit(), "123456");
    });

    test('Converts Arabic digits to Persian digits via chain', () {
      const arabic = "١٢٣٤٥";
      // Direct call does not convert Arabic:
      expect(arabic.toPersianDigit(), "١٢٣٤٥");
      // Chained call works:
      expect(arabic.toEnglishDigit().toPersianDigit(), "۱۲۳۴۵");
    });

    test('Formats three-digit comma grouping with decimals', () {
      expect("1234567.89".seRagham(), "1,234,567.89");
      expect("1234567".seRagham().toPersianDigit(), "۱,۲۳۴,۵۶۷".toPersianDigit());
    });

    test('Safe conversion of number words to integer', () {
      expect("صد و بیست و سه".toNumber(), 123);
      expect(() => "invalid text".toNumber(), throwsA(isA<Exception>()));
    });

    test('Iranian National Code Modulo 11 check', () {
      expect("7731689951".isValidIranianNationalCode(), isTrue);
      expect("1234567890".isValidIranianNationalCode(), isFalse);
    });

    test('Iranian Bank Card Luhn check', () {
      expect("1234567812345678".isValidBankCardNumber(), isFalse);
    });
  });
}
```

### Widget / Form Test
```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:persian_number_utility/persian_number_utility.dart';

void main() {
  testWidgets('NationalCodeFormField validates properly on submit', (tester) async {
    final controller = TextEditingController();
    final formKey = GlobalKey<FormState>();

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Form(
            key: formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: controller,
                  validator: (val) {
                    final normalized = val?.toEnglishDigit() ?? '';
                    if (!normalized.isValidIranianNationalCode()) {
                      return 'نامعتبر';
                    }
                    return null;
                  },
                ),
                ElevatedButton(
                  onPressed: () => formKey.currentState!.validate(),
                  child: const Text('ثبت'),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    // Enter invalid code with Persian digits
    await tester.enterText(find.byType(TextFormField), '۱۲۳۴۵۶۷۸۹۰');
    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();

    expect(find.text('نامعتبر'), findsOneWidget);
  });
}
```

---

## Decision Rules for AI Agents

1. **MUST NOT** store strings formatted with Persian digits or grouping separators (`"۱۲,۰۰۰"`) in databases, shared preferences, or API request payloads.
2. **MUST NOT** parse identifier-like strings (mobile numbers, national codes, card numbers) into `int` or `num` because numeric parsing deletes required leading zeros.
3. **MUST** normalize user input with `.toEnglishDigit()` before passing strings to `.isValidIranianNationalCode()`, `.isValidBankCardNumber()`, `.isValidIranianMobileNumber()`, or `.isValidIranianPostalCode()`.
4. **MUST** chain `.toEnglishDigit().toPersianDigit()` when converting arbitrary user strings that may contain Arabic-Indic digits (`٠-٩`) to Persian digits (`۰-۹`).
5. **MUST NOT** assign `controller.text = value.toPersianDigit()` inside a `TextField.onChanged` callback; you **MUST** use a `TextInputFormatter` to prevent cursor jumping and IME corruption.
6. **MUST** wrap calls to `.toNumber()` in a `try-catch` block to guard against unhandled `Exception("Not correct format / Wrong language!")`.
7. **MUST NOT** rely on `beToman()` or `beRial()` for mission-critical financial calculations; you **SHOULD** use integer arithmetic (`~/ 10` and `* 10`) on canonical integers.
8. **SHOULD NOT** call `.toPersianDigit()` or `.changeDigit()` on high-frequency animation loops or unindexed `ListView` builds; presentation transformations should occur in ViewModels or memoized selectors.
9. **MUST NOT** present client-side checksum validation (Luhn, Modulo 11) as proof of personal identity, card activation, or bank account existence.
10. **MUST** verify the installed package version is `^1.1.6` when using `isValidBankShebaNumber()` or `isContainDigits()`.

---

## Debugging Checklist

- [ ] **`FormatException: Invalid number` during National Code validation?** You passed Persian digits or a string with non-digits. Run `.toEnglishDigit()` and verify `RegExp(r'^\d{10}$')` before validating.
- [ ] **Cursor leaps to the end of the `TextField` while typing?** You modified `controller.text` inside `onChanged`. Replace with a `TextInputFormatter`.
- [ ] **Arabic digits (`١٢٣`) not transforming to Persian?** You called `.toPersianDigit()` directly. Use `.toEnglishDigit().toPersianDigit()`.
- [ ] **Unhandled Exception on `toNumber()`?** The input string contains extra spaces, unexpected words, or invalid grammar. Wrap in `try-catch`.
- [ ] **Negative numbers turning positive in `toWord()`?** `toWord()` strips `-`. Pre-check `input.startsWith('-')` and prepend `"منفی "` manually.
- [ ] **Decimal values lost in `toWord()`?** `toWord()` strips `.`. Convert integer and fractional parts separately.

---

## Code Review Checklist

- [ ] Are all domain models, entities, and database tables storing numbers as `int`/`num` or clean ASCII strings?
- [ ] Are all UI presentation strings formatted strictly in presentation layers (widgets, view models, getters)?
- [ ] Are text fields using `TextInputFormatter` instead of `onChanged` controller reassignments?
- [ ] Are national codes and mobile numbers kept as strings with preserved leading zeros?
- [ ] Are banking card numbers masked before logging or displaying in confirmation screens?
- [ ] Is `.toNumber()` protected by error handling?
- [ ] Is `Directionality` handled appropriately when displaying numbers next to Latin or LTR content?

---

## Sources
- Pub.dev Package: [https://pub.dev/packages/persian_number_utility](https://pub.dev/packages/persian_number_utility)
- Package Repository: [https://github.com/mehdi-nemati/persian_number_utility](https://github.com/mehdi-nemati/persian_number_utility)
- Package Changelog: [https://github.com/mehdi-nemati/persian_number_utility/blob/master/CHANGELOG.md](https://github.com/mehdi-nemati/persian_number_utility/blob/master/CHANGELOG.md)
- Unicode Standard: Section 9.2 (Arabic Script & Digits U+0660..U+0669 and U+06F0..U+06F9)
- Official Dart & Flutter API Documentation (`TextInputFormatter`, `TextEditingValue`, `DateTime`)
