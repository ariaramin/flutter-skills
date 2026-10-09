# Responsive Layouts & Cross-Platform Adaptation

This reference provides engineering patterns for deploying Figma designs across all six Flutter targets: Android, iOS, Web, macOS, Windows, and Linux.

---

## 1. Content-Driven Breakpoint System

Do not design around arbitrary device labels (e.g. "iPad" or "Pixel 7"). Design around available logical layout widths where content ergonomics change:

| Breakpoint Tier | Available Width | Ergonomic Layout Strategy | Flutter Architecture |
|---|---|---|---|
| **Compact** | $< 600\text{ dp}$ | Single column, bottom navigation, full-width cards, modal bottom sheets. | `Column`, `ListView`, `NavigationBar` |
| **Medium** | $600\text{ dp} - 840\text{ dp}$ | Two-column split, navigation rail, dialogs, expanded cards. | `Row(children: [NavigationRail, Expanded(...)])` |
| **Expanded** | $> 840\text{ dp}$ | Multi-column grid, persistent sidebar, centered max-width content container. | Multi-column grid, `NavigationDrawer`, constrained max-width |

---

## 2. Component-Level vs. Screen-Level Responsiveness

* **Screen-Level (`MediaQuery.sizeOf(context)`)**: Use exclusively for top-level structural decisions (e.g. displaying a `NavigationBar` vs. `NavigationRail`).
* **Component-Level (`LayoutBuilder`)**: **Always** use `LayoutBuilder` for reusable widgets, cards, and sub-components. A card must adapt based on whether its immediate parent gives it 300dp or 700dp of space, regardless of whether the app runs on desktop or mobile.

### Reusable Adaptive Component Pattern

```dart
class AdaptiveCardGrid extends StatelessWidget {
  const AdaptiveCardGrid({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Compute column count dynamically from available parent width
        final crossAxisCount = constraints.maxWidth < 600 ? 1 : (constraints.maxWidth < 900 ? 2 : 3);

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 16.0,
            mainAxisSpacing: 16.0,
            childAspectRatio: 1.2,
          ),
          itemCount: children.length,
          itemBuilder: (context, index) => children[index],
        );
      },
    );
  }
}
```

---

## 3. Platform Ergonomics & Input Adaptation

### Touch vs. Mouse & Pointer
* **Mobile (iOS & Android)**:
  * Minimum touch target size: 48×48dp (Material / iOS HIG standard). Wrap small icons in `IconButton` or `Padding` to satisfy hit target requirements.
  * System insets: Wrap screens in `SafeArea` to avoid notch, status bar, and home indicator collision.
* **Desktop & Web (macOS, Windows, Linux, Browser)**:
  * **Cursor changes**: Provide `SystemMouseCursors.click` on clickable cards and custom interactive areas.
  * **Hover effects**: Use `InkWell(onHover: ...)` or `MouseRegion` to show state transitions when hovered.
  * **Scrollbars**: Desktop users expect visible scrollbars. Always attach an explicit `ScrollController` to `Scrollbar`:
    ```dart
    final ScrollController _scrollController = ScrollController();

    @override
    Widget build(BuildContext context) {
      return Scrollbar(
        controller: _scrollController,
        thumbVisibility: true,
        child: ListView.builder(
          controller: _scrollController,
          itemCount: 100,
          itemBuilder: (context, index) => ListItem(index: index),
        ),
      );
    }
    ```
  * **Keyboard Focus & Traversal**: Ensure all interactive controls participate in focus traversal via `Focus` or standard buttons.

---

## 4. Max-Width Content Anchoring for Large Screens

On desktop and web viewports, unconstrained layouts stretch across 2560px or 4K monitors, breaking typographic legibility and visual balance.

Always clamp primary reading and form widths:

```dart
class ContentContainer extends StatelessWidget {
  const ContentContainer({
    super.key,
    required this.child,
    this.maxWidth = 1200.0,
  });

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    );
  }
}
```

---

## 5. Right-to-Left (RTL) Internationalization

To ensure Figma designs render correctly in RTL locales (e.g. Arabic, Persian, Hebrew) without redesigning:
* **Never** use hardcoded directional properties (`left`, `right`) when intent is start/end.
* Use `EdgeInsetsDirectional.fromSTEB(start, top, end, bottom)`.
* Use `AlignmentDirectional.centerStart` and `AlignmentDirectional.centerEnd`.
* Use `PositionedDirectional` instead of `Positioned` inside `Stack`.
* Use `CrossAxisAlignment.start` within `Column` (automatically aligns to right in RTL).
