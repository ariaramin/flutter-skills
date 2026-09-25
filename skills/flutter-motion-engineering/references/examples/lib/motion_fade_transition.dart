import 'package:flutter/widgets.dart';

Widget motionFadeTransition(
  BuildContext context,
  Animation<double> animation,
  Animation<double> secondaryAnimation,
  Widget child,
) {
  if (MediaQuery.disableAnimationsOf(context)) {
    return child;
  }
  return FadeTransition(opacity: animation, child: child);
}
