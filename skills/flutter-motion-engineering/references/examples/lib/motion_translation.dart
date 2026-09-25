import 'package:flutter/widgets.dart';

class MotionTranslation extends StatelessWidget {
  const MotionTranslation({
    required this.offset,
    required this.child,
    super.key,
  });

  final Animation<double> offset;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: offset,
      child: child,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, offset.value),
          child: child,
        );
      },
    );
  }
}
