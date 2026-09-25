# Production templates and before/after conversion examples

This reference preserves detailed guidance from the supplied HTML/CSS/JavaScript → Flutter research. Read the relevant section when the main skill directs you here.

## Contents

- Production Templates
  - 1. App shell
  - 2. Responsive shell
  - 3. Breakpoint-aware component composition
  - 4. Reusable semantic component
  - 5. Theme tokens
  - 6. Button with current state APIs
  - 7. Complete form pattern
  - 8. Simple navigation
  - 9. Asynchronous UI without recreating the request in `build()`
  - 10. Large list
  - 11. Responsive grid
  - 12. Image handling
  - 13. Hover and focus behavior
  - 14. Explicit animation
  - 15. Accessibility semantics
  - 16. Modern JS interop boundary
  - 17. Platform-specific boundary
- Before / After Conversion Examples
  - Example 1: Flexbox card row
  - Example 2: Responsive navigation
  - Example 3: Form with validation
  - Example 4: DOM-mutated component
  - Example 5: Responsive data grid
  - Example 6: Animated interactive card

## Production Templates

These patterns use current Flutter/Dart concepts and are intentionally dependency-light. Adapt names and thresholds to the actual source application rather than copying them blindly.

### 1. App shell

```
import 'package:flutter/material.dart';

void main() {
  runApp(const ConversionApp());
}

class ConversionApp extends StatelessWidget {
  const ConversionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const HomePage(),
    );
  }
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: const Color(0xFF4F46E5),
    brightness: Brightness.light,
  );

  return ThemeData.from(
    colorScheme: scheme,
    useMaterial3: true,
  );
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(
        child: Center(
          child: Text('Flutter application'),
        ),
      ),
    );
  }
}

```

### 2. Responsive shell

```
import 'package:flutter/material.dart';

class ResponsiveShell extends StatelessWidget {
  const ResponsiveShell({
    required this.body,
    required this.selectedIndex,
    required this.onDestinationSelected,
    super.key,
  });

  final Widget body;
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final useRail = constraints.maxWidth >= 720;

        if (!useRail) {
          return Scaffold(
            body: SafeArea(child: body),
            bottomNavigationBar: NavigationBar(
              selectedIndex: selectedIndex,
              onDestinationSelected: onDestinationSelected,
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.dashboard_outlined),
                  selectedIcon: Icon(Icons.dashboard),
                  label: 'Dashboard',
                ),
                NavigationDestination(
                  icon: Icon(Icons.settings_outlined),
                  selectedIcon: Icon(Icons.settings),
                  label: 'Settings',
                ),
              ],
            ),
          );
        }

        return Scaffold(
          body: SafeArea(
            child: Row(
              children: [
                NavigationRail(
                  selectedIndex: selectedIndex,
                  onDestinationSelected: onDestinationSelected,
                  destinations: const [
                    NavigationRailDestination(
                      icon: Icon(Icons.dashboard_outlined),
                      selectedIcon: Icon(Icons.dashboard),
                      label: Text('Dashboard'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.settings_outlined),
                      selectedIcon: Icon(Icons.settings),
                      label: Text('Settings'),
                    ),
                  ],
                ),
                const VerticalDivider(width: 1),
                Expanded(child: body),
              ],
            ),
          ),
        );
      },
    );
  }
}

```

The 720 threshold is an example local design decision, not a universal tablet breakpoint.

### 3. Breakpoint-aware component composition

```
import 'package:flutter/material.dart';

class ProfileSummary extends StatelessWidget {
  const ProfileSummary({
    required this.name,
    required this.email,
    super.key,
  });

  final String name;
  final String email;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 520;

        final avatar = const CircleAvatar(
          radius: 28,
          child: Icon(Icons.person),
        );

        final details = Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(email),
          ],
        );

        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              avatar,
              details,
            ],
          );
        }

        return Row(
          spacing: 16,
          children: [
            avatar,
            Expanded(child: details),
          ],
        );
      },
    );
  }
}

```

### 4. Reusable semantic component

```
import 'package:flutter/material.dart';

class MetricCard extends StatelessWidget {
  const MetricCard({
    required this.label,
    required this.value,
    this.onPressed,
    super.key,
  });

  final String label;
  final String value;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final content = Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 8,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ],
      ),
    );

    if (onPressed == null) {
      return Card(child: content);
    }

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onPressed,
        child: content,
      ),
    );
  }
}

```

### 5. Theme tokens

```
import 'package:flutter/material.dart';

@immutable
class AppSpacing extends ThemeExtension<AppSpacing> {
  const AppSpacing({
    required this.xs,
    required this.sm,
    required this.md,
    required this.lg,
    required this.xl,
  });

  final double xs;
  final double sm;
  final double md;
  final double lg;
  final double xl;

  static const standard = AppSpacing(
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  );

  @override
  AppSpacing copyWith({
    double? xs,
    double? sm,
    double? md,
    double? lg,
    double? xl,
  }) {
    return AppSpacing(
      xs: xs ?? this.xs,
      sm: sm ?? this.sm,
      md: md ?? this.md,
      lg: lg ?? this.lg,
      xl: xl ?? this.xl,
    );
  }

  @override
  AppSpacing lerp(covariant AppSpacing? other, double t) {
    if (other == null) return this;

    double lerpDouble(double a, double b) => a + (b - a) * t;

    return AppSpacing(
      xs: lerpDouble(xs, other.xs),
      sm: lerpDouble(sm, other.sm),
      md: lerpDouble(md, other.md),
      lg: lerpDouble(lg, other.lg),
      xl: lerpDouble(xl, other.xl),
    );
  }
}

```

### 6. Button with current state APIs

```
import 'package:flutter/material.dart';

class PrimaryActionButton extends StatelessWidget {
  const PrimaryActionButton({
    required this.label,
    required this.onPressed,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith<Color?>((states) {
          if (states.contains(WidgetState.disabled)) {
            return Theme.of(context).colorScheme.onSurface.withValues(
                  alpha: 0.12,
                );
          }

          if (states.contains(WidgetState.hovered)) {
            return Theme.of(context).colorScheme.primaryContainer;
          }

          return null;
        }),
      ),
      onPressed: onPressed,
      child: Text(label),
    );
  }
}

```

### 7. Complete form pattern

```
import 'package:flutter/material.dart';

class SignInForm extends StatefulWidget {
  const SignInForm({
    required this.onSubmit,
    super.key,
  });

  final Future<void> Function(String email, String password) onSubmit;

  @override
  State<SignInForm> createState() => _SignInFormState();
}

class _SignInFormState extends State<SignInForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();

  bool _submitting = false;
  bool _obscurePassword = true;
  String? _submitError;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;

    final form = _formKey.currentState;
    if (form == null || !form.validate()) return;

    setState(() {
      _submitting = true;
      _submitError = null;
    });

    try {
      await widget.onSubmit(
        _emailController.text.trim(),
        _passwordController.text,
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitError = 'Sign in failed. Please try again.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AutofillGroup(
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 16,
          children: [
            TextFormField(
              controller: _emailController,
              focusNode: _emailFocusNode,
              autofillHints: const [AutofillHints.email],
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email',
              ),
              validator: (value) {
                final email = value?.trim() ?? '';
                if (email.isEmpty) {
                  return 'Enter your email address.';
                }
                if (!email.contains('@')) {
                  return 'Enter a valid email address.';
                }
                return null;
              },
              onFieldSubmitted: (_) {
                _passwordFocusNode.requestFocus();
              },
            ),
            TextFormField(
              controller: _passwordController,
              focusNode: _passwordFocusNode,
              autofillHints: const [AutofillHints.password],
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                labelText: 'Password',
                suffixIcon: IconButton(
                  tooltip: _obscurePassword
                      ? 'Show password'
                      : 'Hide password',
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ),
              validator: (value) {
                if ((value ?? '').isEmpty) {
                  return 'Enter your password.';
                }
                return null;
              },
              onFieldSubmitted: (_) => _submit(),
            ),
            if (_submitError != null)
              Semantics(
                liveRegion: true,
                child: Text(
                  _submitError!,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? 'Signing in…' : 'Sign in'),
            ),
          ],
        ),
      ),
    );
  }
}

```

### 8. Simple navigation

```
import 'package:flutter/material.dart';

class Product {
  const Product(this.name);

  final String name;
}

class ProductListPage extends StatelessWidget {
  const ProductListPage({super.key});

  @override
  Widget build(BuildContext context) {
    const products = [
      Product('Keyboard'),
      Product('Display'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Products')),
      body: ListView.builder(
        itemCount: products.length,
        itemBuilder: (context, index) {
          final product = products[index];

          return ListTile(
            title: Text(product.name),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (context) {
                    return ProductDetailPage(product: product);
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class ProductDetailPage extends StatelessWidget {
  const ProductDetailPage({
    required this.product,
    super.key,
  });

  final Product product;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(product.name)),
      body: Center(
        child: Text('Details for ${product.name}'),
      ),
    );
  }
}

```

For URL-addressable/deep-link-heavy applications, replace the simple route mechanism with a Router-based architecture instead of expanding this pattern into manual URL logic.

### 9. Asynchronous UI without recreating the request in `build()`

```
import 'package:flutter/material.dart';

class User {
  const User({
    required this.name,
  });

  final String name;
}

abstract interface class UserRepository {
  Future<User> loadCurrentUser();
}

class UserPanel extends StatefulWidget {
  const UserPanel({
    required this.repository,
    super.key,
  });

  final UserRepository repository;

  @override
  State<UserPanel> createState() => _UserPanelState();
}

class _UserPanelState extends State<UserPanel> {
  late Future<User> _userFuture;

  @override
  void initState() {
    super.initState();
    _userFuture = widget.repository.loadCurrentUser();
  }

  @override
  void didUpdateWidget(covariant UserPanel oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (!identical(oldWidget.repository, widget.repository)) {
      _userFuture = widget.repository.loadCurrentUser();
    }
  }

  void _retry() {
    setState(() {
      _userFuture = widget.repository.loadCurrentUser();
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: _userFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              spacing: 12,
              children: [
                const Text('Unable to load the account.'),
                FilledButton(
                  onPressed: _retry,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        return Text('Welcome, ${snapshot.requireData.name}');
      },
    );
  }
}

```

### 10. Large list

```
import 'package:flutter/material.dart';

class Activity {
  const Activity({
    required this.title,
    required this.detail,
  });

  final String title;
  final String detail;
}

class ActivityList extends StatelessWidget {
  const ActivityList({
    required this.items,
    super.key,
  });

  final List<Activity> items;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];

        return ListTile(
          title: Text(item.title),
          subtitle: Text(item.detail),
        );
      },
    );
  }
}

```

### 11. Responsive grid

```
import 'package:flutter/material.dart';

class DashboardGrid extends StatelessWidget {
  const DashboardGrid({
    required this.children,
    super.key,
  });

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 360,
        mainAxisExtent: 180,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: children.length,
      itemBuilder: (context, index) => children[index],
    );
  }
}

```

### 12. Image handling

```
import 'package:flutter/material.dart';

class NetworkThumbnail extends StatelessWidget {
  const NetworkThumbnail({
    required this.url,
    required this.semanticLabel,
    super.key,
  });

  final String url;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Image.network(
        url,
        fit: BoxFit.cover,
        semanticLabel: semanticLabel,
        cacheWidth: 1280,
        frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
          if (wasSynchronouslyLoaded || frame != null) {
            return child;
          }

          return const ColoredBox(
            color: Color(0xFFE2E8F0),
            child: Center(
              child: CircularProgressIndicator(),
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return const ColoredBox(
            color: Color(0xFFF1F5F9),
            child: Center(
              child: Icon(
                Icons.broken_image_outlined,
                semanticLabel: 'Image unavailable',
              ),
            ),
          );
        },
      ),
    );
  }
}

```

`cacheWidth` is a deliberate decode-size hint and should be selected according to actual display density/size rather than copied universally.

### 13. Hover and focus behavior

```
import 'package:flutter/material.dart';

class InteractiveCardButton extends StatefulWidget {
  const InteractiveCardButton({
    required this.label,
    required this.onPressed,
    super.key,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  State<InteractiveCardButton> createState() =>
      _InteractiveCardButtonState();
}

class _InteractiveCardButtonState
    extends State<InteractiveCardButton> {
  bool _hovered = false;
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) {
        setState(() {
          _hovered = true;
        });
      },
      onExit: (_) {
        setState(() {
          _hovered = false;
        });
      },
      child: FocusableActionDetector(
        onShowFocusHighlight: (focused) {
          setState(() {
            _focused = focused;
          });
        },
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) {
              widget.onPressed();
              return null;
            },
          ),
        },
        child: Semantics(
          button: true,
          label: widget.label,
          onTap: widget.onPressed,
          child: GestureDetector(
            onTap: widget.onPressed,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _hovered
                    ? scheme.primaryContainer
                    : scheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _focused
                      ? scheme.primary
                      : scheme.outlineVariant,
                  width: _focused ? 2 : 1,
                ),
              ),
              child: Text(widget.label),
            ),
          ),
        ),
      ),
    );
  }
}

```

Prefer an actual button when the visual component can be implemented as one; this custom pattern exists for genuinely custom interaction surfaces.

### 14. Explicit animation

```
import 'package:flutter/material.dart';

class PulsingStatusDot extends StatefulWidget {
  const PulsingStatusDot({
    required this.color,
    super.key,
  });

  final Color color;

  @override
  State<PulsingStatusDot> createState() =>
      _PulsingStatusDotState();
}

class _PulsingStatusDotState extends State<PulsingStatusDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );

    _scale = Tween<double>(
      begin: 1,
      end: 1.8,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOut,
      ),
    );

    _opacity = Tween<double>(
      begin: 0.5,
      end: 0,
    ).animate(_controller);

    _controller.repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 24,
      child: Stack(
        alignment: Alignment.center,
        children: [
          FadeTransition(
            opacity: _opacity,
            child: ScaleTransition(
              scale: _scale,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: widget.color,
                  shape: BoxShape.circle,
                ),
                child: const SizedBox.square(dimension: 8),
              ),
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: widget.color,
              shape: BoxShape.circle,
            ),
            child: const SizedBox.square(dimension: 8),
          ),
        ],
      ),
    );
  }
}

```

### 15. Accessibility semantics

```
import 'package:flutter/material.dart';

class AccessibleArticleHeader extends StatelessWidget {
  const AccessibleArticleHeader({
    required this.title,
    required this.subtitle,
    super.key,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 8,
      children: [
        Semantics(
          headingLevel: 1,
          child: Text(
            title,
            style: Theme.of(context).textTheme.headlineLarge,
          ),
        ),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ],
    );
  }
}

```

### 16. Modern JS interop boundary

Web-only implementation:

```
@JS()
library analytics_interop;

import 'dart:js_interop';

@JS('analyticsSdk.track')
external void _track(JSString eventName, JSAny? payload);

void trackWebEvent(String eventName) {
  _track(eventName.toJS, null);
}

```

Do not import this file into non-web builds directly. Put it behind a platform-neutral interface and select it with conditional imports.

### 17. Platform-specific boundary

Shared interface:

```
abstract interface class PlatformShareService {
  Future<void> shareText(String text);
}

```

Feature code should depend on that interface rather than importing browser/native APIs directly.

Selection pattern:

```
import 'share_service_stub.dart'
    if (dart.library.js_interop) 'share_service_web.dart'
    if (dart.library.io) 'share_service_io.dart';

PlatformShareService createPlatformShareService() {
  return createShareService();
}

```

Each implementation must satisfy the same contract. Keep platform details at the boundary.

---

## Before / After Conversion Examples

### Example 1: Flexbox card row

#### Source

```
<div class="cards">
  <article class="card">A</article>
  <article class="card">B</article>
  <article class="card">C</article>
</div>

```

```
.cards {
  display: flex;
  gap: 16px;
}

.card {
  flex: 1 1 280px;
}

@media (max-width: 720px) {
  .cards {
    flex-direction: column;
  }
}

```

#### Flutter

```
import 'package:flutter/material.dart';

class CardRow extends StatelessWidget {
  const CardRow({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 720) {
          return const Column(
            spacing: 16,
            children: [
              _Card(label: 'A'),
              _Card(label: 'B'),
              _Card(label: 'C'),
            ],
          );
        }

        return const Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 16,
          children: [
            Expanded(child: _Card(label: 'A')),
            Expanded(child: _Card(label: 'B')),
            Expanded(child: _Card(label: 'C')),
          ],
        );
      },
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(label),
      ),
    );
  }
}

```

#### Why this differs

- The CSS `flex` shorthand is not translated mechanically.
- `LayoutBuilder` responds to the actual available component width.
- `Expanded` is used only in the bounded horizontal `Row`.
- Card semantics become a reusable component rather than retaining HTML wrapper structure.

---

### Example 2: Responsive navigation

#### Source intent

```
<nav class="desktop-nav">...</nav>
<button class="mobile-menu-button">...</button>

```

JavaScript toggles a mobile menu class.

#### Flutter

```
import 'package:flutter/material.dart';

class AdaptiveNavigationPage extends StatefulWidget {
  const AdaptiveNavigationPage({super.key});

  @override
  State<AdaptiveNavigationPage> createState() =>
      _AdaptiveNavigationPageState();
}

class _AdaptiveNavigationPageState
    extends State<AdaptiveNavigationPage> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 760;

        if (wide) {
          return Scaffold(
            body: Row(
              children: [
                NavigationRail(
                  selectedIndex: _index,
                  onDestinationSelected: (value) {
                    setState(() {
                      _index = value;
                    });
                  },
                  destinations: const [
                    NavigationRailDestination(
                      icon: Icon(Icons.home_outlined),
                      label: Text('Home'),
                    ),
                    NavigationRailDestination(
                      icon: Icon(Icons.analytics_outlined),
                      label: Text('Analytics'),
                    ),
                  ],
                ),
                const VerticalDivider(width: 1),
                Expanded(
                  child: _Destination(index: _index),
                ),
              ],
            ),
          );
        }

        return Scaffold(
          body: _Destination(index: _index),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _index,
            onDestinationSelected: (value) {
              setState(() {
                _index = value;
              });
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                label: 'Home',
              ),
              NavigationDestination(
                icon: Icon(Icons.analytics_outlined),
                label: 'Analytics',
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Destination extends StatelessWidget {
  const _Destination({
    required this.index,
  });

  final int index;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(index == 0 ? 'Home' : 'Analytics'),
    );
  }
}

```

#### Why this differs

The web implementation used DOM classes to show/hide controls. Flutter stores destination state and composes a different navigation shell according to available space.

If destinations are URL-addressable, routing state should replace this local index model.

---

### Example 3: Form with validation

#### Source

```
form.addEventListener('submit', event => {
  event.preventDefault();

  if (!email.value.includes('@')) {
    emailError.textContent = 'Invalid email';
    return;
  }

  submit();
});

```

#### Flutter

Use `Form`/`TextFormField` validation rather than mutating an error DOM node.

```
import 'package:flutter/material.dart';

class ContactForm extends StatefulWidget {
  const ContactForm({
    required this.onSubmit,
    super.key,
  });

  final ValueChanged<String> onSubmit;

  @override
  State<ContactForm> createState() => _ContactFormState();
}

class _ContactFormState extends State<ContactForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    widget.onSubmit(_emailController.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        spacing: 16,
        children: [
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(
              labelText: 'Email',
            ),
            validator: (value) {
              final email = value?.trim() ?? '';

              if (!email.contains('@')) {
                return 'Enter a valid email.';
              }

              return null;
            },
          ),
          FilledButton(
            onPressed: _submit,
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}

```

#### Why this differs

Validation state is part of the form/widget model. Flutter displays errors declaratively from validation results.

---

### Example 4: DOM-mutated component

#### Source

```
let liked = false;

likeButton.onclick = () => {
  liked = !liked;
  likeButton.classList.toggle('active', liked);
  likeCount.textContent =
    String(Number(likeCount.textContent) + (liked ? 1 : -1));
};

```

#### Flutter

```
import 'package:flutter/material.dart';

class LikeButton extends StatefulWidget {
  const LikeButton({
    required this.initialCount,
    super.key,
  });

  final int initialCount;

  @override
  State<LikeButton> createState() => _LikeButtonState();
}

class _LikeButtonState extends State<LikeButton> {
  bool _liked = false;

  int get _count =>
      widget.initialCount + (_liked ? 1 : 0);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: _liked ? 'Unlike' : 'Like',
          onPressed: () {
            setState(() {
              _liked = !_liked;
            });
          },
          icon: Icon(
            _liked ? Icons.favorite : Icons.favorite_border,
            color: _liked
                ? Theme.of(context).colorScheme.error
                : null,
          ),
        ),
        Text('$_count'),
      ],
    );
  }
}

```

#### Why this differs

The count is derived from source count plus local selection state; no rendered text is used as the source of truth.

---

### Example 5: Responsive data grid

#### Source

```
.dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 900px) {
  .dashboard {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
}

```

#### Flutter

```
import 'package:flutter/material.dart';

class MetricsGrid extends StatelessWidget {
  const MetricsGrid({
    required this.metrics,
    super.key,
  });

  final List<String> metrics;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate:
          const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 300,
        mainAxisExtent: 140,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: metrics.length,
      itemBuilder: (context, index) {
        return Card(
          child: Center(
            child: Text(metrics[index]),
          ),
        );
      },
    );
  }
}

```

#### Why this differs

The source breakpoints exist to keep cards around a usable width. `SliverGridDelegateWithMaxCrossAxisExtent` can express that design intent directly.

The `shrinkWrap` example is appropriate only when this small grid is embedded in another established scroll owner. For a large dataset, use a single sliver/grid scroll owner instead.

---

### Example 6: Animated interactive card

#### Source

```
.card {
  transform: translateY(0);
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,.14);
}

```

#### Flutter

```
import 'package:flutter/material.dart';

class HoverCard extends StatefulWidget {
  const HoverCard({
    required this.child,
    required this.onPressed,
    super.key,
  });

  final Widget child;
  final VoidCallback onPressed;

  @override
  State<HoverCard> createState() => _HoverCardState();
}

class _HoverCardState extends State<HoverCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) {
        setState(() {
          _hovered = true;
        });
      },
      onExit: (_) {
        setState(() {
          _hovered = false;
        });
      },
      child: Semantics(
        button: true,
        onTap: widget.onPressed,
        child: GestureDetector(
          onTap: widget.onPressed,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            curve: Curves.ease,
            transform: Matrix4.translationValues(
              0,
              _hovered ? -4 : 0,
              0,
            ),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                if (_hovered)
                  const BoxShadow(
                    color: Color(0x24000000),
                    blurRadius: 32,
                    offset: Offset(0, 12),
                  ),
              ],
            ),
            child: widget.child,
          ),
        ),
      ),
    );
  }
}

```

#### Why this differs

The source CSS pseudo-state becomes explicit Flutter interaction state, and the simple transition becomes an implicit animation.

For a normal button-like card, an `InkWell` or framework button may provide a stronger built-in semantic/focus model than a fully custom surface.

---
