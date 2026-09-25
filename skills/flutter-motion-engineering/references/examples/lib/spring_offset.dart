import 'package:flutter/widgets.dart';

import 'motion_translation.dart';
import 'spring_handoff.dart';

class SpringOffset extends StatefulWidget {
  const SpringOffset({
    required this.offset,
    required this.spring,
    required this.child,
    super.key,
  });

  final double offset;
  final SpringDescription spring;
  final Widget child;

  @override
  State<SpringOffset> createState() => _SpringOffsetState();
}

class _SpringOffsetState extends State<SpringOffset>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _reduceMotion = false;

  @override
  void initState() {
    super.initState();
    if (!widget.offset.isFinite) {
      throw ArgumentError.value(widget.offset, 'offset', 'Must be finite.');
    }
    _controller = AnimationController.unbounded(
      vsync: this,
      value: widget.offset,
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    if (reduceMotion != _reduceMotion) {
      _reduceMotion = reduceMotion;
      if (reduceMotion) {
        _settle();
      }
    }
  }

  @override
  void didUpdateWidget(covariant SpringOffset oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.offset != oldWidget.offset ||
        widget.spring != oldWidget.spring) {
      _settle();
    }
  }

  void _settle() {
    settleMotion(
      controller: _controller,
      target: widget.offset,
      spring: widget.spring,
      reduceMotion: _reduceMotion,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MotionTranslation(offset: _controller, child: widget.child);
  }
}
