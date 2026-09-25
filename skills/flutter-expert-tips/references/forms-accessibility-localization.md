# Forms, Input, Accessibility, Localization, Adaptivity

## Forms

Use `Form` + validation when multiple inputs have coordinated submit/validation behavior. For one simple field, a controller/value validation flow may be enough.

## Numeric input

A numeric keyboard is only a keyboard hint; it does not guarantee valid numeric text. Combine:

- suitable `keyboardType`;
- `inputFormatters` when restriction is appropriate;
- validation/parsing at submit/domain boundary.

Do not block locale-valid input accidentally (decimal separators, minus sign) without product requirements.

## Controllers and focus

`TextEditingController` and `FocusNode` are resources. Own/dispose them at a predictable widget/controller scope.

Avoid mirroring every keystroke into multiple independent sources of truth. Decide whether controller text or application state is authoritative and synchronize deliberately.

## Password/sensitive fields

`obscureText`/masking protects casual shoulder-surfing, not device compromise. Never log sensitive values. Configure autofill/content types according to platform security/user experience requirements.

## Debounced search

Debounce text-change-driven requests and cancel/ignore obsolete results. Verify out-of-order responses cannot overwrite a newer query.

## Selection

Use `SelectionArea` for multi-widget selectable regions and `SelectableText` for standalone selectable text. Ensure gestures do not conflict with custom recognizers/scrolling.

## Accessibility

Review:

- semantic labels/roles/actions;
- focus order and keyboard navigation on desktop/web;
- text scaling;
- contrast and color-independent status communication;
- minimum usable touch targets;
- screen-reader behavior for custom painters/gestures;
- reduced-motion considerations where applicable.

Do not rely on custom icon appearance alone to convey status.

## Semantics identifiers vs labels

Automation identifiers and accessible labels serve different consumers. Keep human-readable semantics meaningful even if a stable test identifier exists.

## Localization

- use Flutter's localization generation/delegates rather than scattered hard-coded strings;
- avoid concatenating translated sentence fragments where grammar/order varies;
- pass parameters into localized messages;
- test RTL and long text;
- account for text scaling and locale-specific numbers/dates.

BuildContext localization extensions can improve ergonomics, but they should wrap generated localization access rather than hiding missing-locale failures.

## Hard-coded strings

Not every string must be localized (debug labels, technical identifiers), but user-visible product copy should normally come from localization resources when the app is localized.

## Adaptive UI

Material/Cupertino adaptive dialogs/components can make platform experiences feel native. Use product design requirements as authority; platform adaptivity is not mandatory when the app intentionally uses one cross-platform design language.

## Keyboard shortcuts

`CallbackShortcuts`/shortcut APIs are useful on desktop/web for productivity. Ensure shortcuts do not conflict with text input/platform conventions and keep every critical action accessible through visible UI.
