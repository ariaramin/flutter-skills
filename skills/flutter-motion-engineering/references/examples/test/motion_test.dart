import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../lib/motion_fade_transition.dart';
import '../lib/motion_translation.dart';
import '../lib/spring_handoff.dart';
import '../lib/spring_offset.dart';

void main() {
  final spring = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 200,
    ratio: 1,
  );

  test(
    'velocity conversion preserves direction and rejects invalid travel',
    () {
      expect(progressVelocity(-600, 300), -2);
      expect(progressVelocity(600, -300), -2);
      expect(progressVelocity(0, 300), 0);
      expect(() => progressVelocity(1, 0), throwsArgumentError);
      expect(() => progressVelocity(double.nan, 1), throwsArgumentError);
      expect(() => progressVelocity(1, double.infinity), throwsArgumentError);
      expect(
        () => progressVelocity(1, double.minPositive),
        throwsArgumentError,
      );
    },
  );

  testWidgets('handoff preserves position and velocity; reduced motion stops', (
    tester,
  ) async {
    final controller = AnimationController.unbounded(vsync: tester, value: .4);
    addTearDown(controller.dispose);
    settleMotion(
      controller: controller,
      target: 1,
      spring: spring,
      reduceMotion: false,
      velocity: -2,
    );
    expect(controller.value, closeTo(.4, 1e-6));
    expect(controller.velocity, closeTo(-2, 1e-6));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 80));
    final position = controller.value;
    final velocity = controller.velocity;
    settleMotion(
      controller: controller,
      target: 0,
      spring: spring,
      reduceMotion: false,
    );
    expect(controller.value, closeTo(position, 1e-6));
    expect(controller.velocity, closeTo(velocity, 1e-6));
    settleMotion(
      controller: controller,
      target: .2,
      spring: spring,
      reduceMotion: true,
    );
    expect(controller.value, .2);
    expect(controller.isAnimating, isFalse);
    expect(
      () => settleMotion(
        controller: controller,
        target: double.nan,
        spring: spring,
        reduceMotion: false,
      ),
      throwsArgumentError,
    );
    settleMotion(
      controller: controller,
      target: 1,
      spring: spring,
      reduceMotion: false,
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 3));
    expect(controller.value, 1);
    expect(controller.isAnimating, isFalse);
  });

  testWidgets('translation keeps invariant child out of per-tick builds', (
    tester,
  ) async {
    final controller = AnimationController.unbounded(vsync: tester);
    addTearDown(controller.dispose);
    var builds = 0;
    await tester.pumpWidget(
      MotionTranslation(
        offset: controller,
        child: Builder(
          builder: (context) {
            builds += 1;
            return const SizedBox(width: 20, height: 20);
          },
        ),
      ),
    );
    controller.value = 25;
    await tester.pump();
    expect(builds, 1);
    final transform = tester.widget<Transform>(find.byType(Transform));
    expect(transform.transform.getTranslation().y, 25);
  });

  testWidgets('fade reacts to live reduced-motion preference', (tester) async {
    Widget host(bool reduced) => MediaQuery(
      data: MediaQueryData(disableAnimations: reduced),
      child: Builder(
        builder: (context) => motionFadeTransition(
          context,
          const AlwaysStoppedAnimation(.4),
          const AlwaysStoppedAnimation(0),
          const SizedBox(key: ValueKey('content')),
        ),
      ),
    );
    await tester.pumpWidget(host(false));
    expect(find.byType(FadeTransition), findsOneWidget);
    await tester.pumpWidget(host(true));
    expect(find.byType(FadeTransition), findsNothing);
    expect(find.byKey(const ValueKey('content')), findsOneWidget);
  });

  testWidgets('invalid spring or bounded target leaves state unchanged', (
    tester,
  ) async {
    final controller = AnimationController(vsync: tester, value: .5);
    addTearDown(controller.dispose);
    for (final invalidSpring in [
      const SpringDescription(mass: 0, stiffness: 100, damping: 20),
      const SpringDescription(mass: 1, stiffness: -1, damping: 20),
      const SpringDescription(mass: 1, stiffness: 100, damping: 0),
    ]) {
      expect(
        () => settleMotion(
          controller: controller,
          target: 1,
          spring: invalidSpring,
          reduceMotion: false,
        ),
        throwsArgumentError,
      );
    }
    expect(
      () => settleMotion(
        controller: controller,
        target: 2,
        spring: spring,
        reduceMotion: false,
      ),
      throwsArgumentError,
    );
    expect(controller.value, .5);
    expect(controller.isAnimating, isFalse);
  });

  testWidgets('host retargets, honors live reduced motion, and disposes', (
    tester,
  ) async {
    Widget host(double target, {bool reduced = false}) => MediaQuery(
      data: MediaQueryData(disableAnimations: reduced),
      child: SpringOffset(
        offset: target,
        spring: spring,
        child: const SizedBox(width: 20, height: 20),
      ),
    );
    double offset() => tester
        .widget<Transform>(find.byType(Transform))
        .transform
        .getTranslation()
        .y;

    await tester.pumpWidget(host(0));
    await tester.pumpWidget(host(100));
    await tester.pump(const Duration(milliseconds: 80));
    final beforeRetarget = offset();
    expect(beforeRetarget, inExclusiveRange(0, 100));
    await tester.pumpWidget(host(-30));
    expect(offset(), closeTo(beforeRetarget, 1e-5));
    await tester.pump(const Duration(milliseconds: 80));
    await tester.pumpWidget(host(-30, reduced: true));
    expect(offset(), -30);
    await tester.pumpWidget(host(-30));
    await tester.pump(const Duration(milliseconds: 50));
    expect(offset(), -30);
    await tester.pumpWidget(host(100));
    await tester.pump(const Duration(milliseconds: 40));
    expect(tester.hasRunningAnimations, isTrue);
    await tester.pumpWidget(const SizedBox());
    expect(tester.takeException(), isNull);
    expect(tester.hasRunningAnimations, isFalse);
  });
}
