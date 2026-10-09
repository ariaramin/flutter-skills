# Production Optimized Widget Implementations

This guide provides concrete, copy-pasteable before-and-after conversions and an expert-level production widget implementation translating complex Figma Auto Layout components.

---

## 1. Before & After: Naive Conversion vs. Expert Architecture

### The Naive / Anti-Pattern Approach
* Overuses `Container` for every single frame and spacing.
* Hardcodes arbitrary pixel coordinates and magic numbers.
* Implements helper methods (`_buildContent()`) instead of isolated widgets.
* Uses deprecated `withOpacity()`.
* Omits `leadingDistribution: TextLeadingDistribution.even`, resulting in vertical text shift.

```dart
// ❌ NAIVE IMPLEMENTATION (Anti-patterns highlighted)
Widget buildBadCard(BuildContext context) {
  return Container( // Overused Container
    width: 320,
    height: 180,
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.1), // Deprecated withOpacity
          blurRadius: 10,
        ),
      ],
    ),
    child: Column(
      children: [
        Container(height: 12), // Dummy spacing container
        Text(
          'Product Title',
          style: TextStyle(
            fontSize: 18,
            height: 24, // BUG: 18 * 24 = 432px line height!
          ),
        ),
        Container(height: 8),
        _buildBadButton(), // Helper method anti-pattern
      ],
    ),
  );
}

Widget _buildBadButton() {
  return Container(
    padding: const EdgeInsets.all(8),
    color: Colors.blue,
    child: const Text('Action'),
  );
}
```

---

### The Expert Production Implementation
* Uses `DecoratedBox` and `ShapeDecoration` with `ContinuousRectangleBorder` (iOS squircle).
* Utilizes native `spacing: 12.0` on `Column` (Flutter 3.27+).
* Correct line height ratio: `height: 24.0 / 18.0`.
* Correct vertical leading alignment: `leadingDistribution: TextLeadingDistribution.even`.
* Modern alpha: `color.withValues(alpha: 0.08)`.
* Dedicated, rebuild-isolated `StatelessWidget` with `const` constructors.
* Design tokens via theme.

```dart
// ✅ PRODUCTION EXPERT IMPLEMENTATION
import 'package:flutter/material.dart';

class ProductFeatureCard extends StatelessWidget {
  const ProductFeatureCard({
    super.key,
    required this.title,
    required this.description,
    required this.actionLabel,
    required this.onActionPressed,
    this.badgeLabel,
  });

  final String title;
  final String description;
  final String actionLabel;
  final VoidCallback onActionPressed;
  final String? badgeLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      width: 340.0,
      child: DecoratedBox(
        decoration: ShapeDecoration(
          color: theme.colorScheme.surface,
          shape: ContinuousRectangleBorder(
            borderRadius: BorderRadius.circular(24.0),
            side: BorderSide(
              color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
              width: 1.0,
            ),
          ),
          shadows: [
            BoxShadow(
              offset: const Offset(0.0, 6.0),
              blurRadius: 16.0,
              spreadRadius: -4.0,
              color: Colors.black.withValues(alpha: 0.08),
            ),
          ],
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            // Auto Layout Main Content Frame
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 12.0, // Native flex spacing (Flutter 3.27+)
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 18.0,
                      height: 24.0 / 18.0, // Exact line height multiplier
                      leadingDistribution: TextLeadingDistribution.even, // Figma line centering
                    ),
                  ),
                  Text(
                    description,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontSize: 14.0,
                      height: 20.0 / 14.0,
                      leadingDistribution: TextLeadingDistribution.even,
                    ),
                  ),
                  const SizedBox(height: 4.0),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton.tonal(
                      onPressed: onActionPressed,
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10.0),
                        ),
                      ),
                      child: Text(actionLabel),
                    ),
                  ),
                ],
              ),
            ),

            // Absolute Positioned Badge (if present)
            if (badgeLabel != null)
              PositionedDirectional(
                top: 16.0,
                end: 16.0,
                child: CardBadge(label: badgeLabel!),
              ),
          ],
        ),
      ),
    );
  }
}

class CardBadge extends StatelessWidget {
  const CardBadge({super.key, required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(6.0),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
        child: Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: theme.colorScheme.onPrimaryContainer,
            fontWeight: FontWeight.w600,
            fontSize: 11.0,
            height: 14.0 / 11.0,
            leadingDistribution: TextLeadingDistribution.even,
          ),
        ),
      ),
    );
  }
}
```
