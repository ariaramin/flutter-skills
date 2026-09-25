import 'package:flutter/animation.dart';
import 'package:flutter/physics.dart';

void settleMotion({
  required AnimationController controller,
  required double target,
  required SpringDescription spring,
  required bool reduceMotion,
  double? velocity,
}) {
  final handoffVelocity = velocity ?? controller.velocity;
  if (!target.isFinite ||
      target < controller.lowerBound ||
      target > controller.upperBound ||
      !handoffVelocity.isFinite ||
      !spring.mass.isFinite ||
      spring.mass <= 0 ||
      !spring.stiffness.isFinite ||
      spring.stiffness <= 0 ||
      !spring.damping.isFinite ||
      spring.damping <= 0) {
    throw ArgumentError('Motion requires a valid target and settling spring.');
  }
  if (reduceMotion) {
    controller.value = target;
    return;
  }
  controller.animateWith(
    SpringSimulation(
      spring,
      controller.value,
      target,
      handoffVelocity,
      snapToEnd: true,
    ),
  );
}

double progressVelocity(double pixelsPerSecond, double signedTravel) {
  if (!pixelsPerSecond.isFinite ||
      !signedTravel.isFinite ||
      signedTravel == 0) {
    throw ArgumentError('Velocity and nonzero travel must be finite.');
  }
  final result = pixelsPerSecond / signedTravel;
  if (!result.isFinite) {
    throw ArgumentError('Normalized velocity must be finite.');
  }
  return result;
}
