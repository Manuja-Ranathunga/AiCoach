import {
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
} from '../landmarkIndices';
import {
  angleBetween,
  angleFromVertical,
  distance,
  horizontalDeviationFromLine,
  midpoint,
  toAspectSpace,
} from '../geometry';

// This file only measures — it has no opinion on what a "good" angle is.
// Judging (thresholds, rep phases, form errors) belongs in later phases.

const MIN_VISIBILITY = 0.5;

// Every landmark these metrics depend on. Used both to check we have
// enough of the body in frame and to compute overall confidence.
const REQUIRED_INDICES = [
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
];

function aspectPoint(landmarks, index, aspectRatio) {
  return toAspectSpace(landmarks[index], aspectRatio);
}

/**
 * @param {Array<{x:number,y:number,visibility?:number}>} smoothedLandmarks
 * @param {number} aspectRatio - video width / height
 * @returns metrics object, or null if required landmarks are missing/low confidence
 */
export function getSquatMetrics(smoothedLandmarks, aspectRatio) {
  if (!smoothedLandmarks || smoothedLandmarks.length === 0) return null;

  let confidence = 1;
  for (const index of REQUIRED_INDICES) {
    const landmark = smoothedLandmarks[index];
    if (!landmark) return null;
    // visibility is undefined for some models — treat missing as fully visible.
    confidence = Math.min(confidence, landmark.visibility ?? 1);
  }
  if (confidence < MIN_VISIBILITY) return null;

  // Aspect-corrected points, used for every angle/distance calculation
  // (see geometry.js: toAspectSpace for why this matters).
  const leftShoulder = aspectPoint(smoothedLandmarks, LEFT_SHOULDER, aspectRatio);
  const rightShoulder = aspectPoint(smoothedLandmarks, RIGHT_SHOULDER, aspectRatio);
  const leftHip = aspectPoint(smoothedLandmarks, LEFT_HIP, aspectRatio);
  const rightHip = aspectPoint(smoothedLandmarks, RIGHT_HIP, aspectRatio);
  const leftKnee = aspectPoint(smoothedLandmarks, LEFT_KNEE, aspectRatio);
  const rightKnee = aspectPoint(smoothedLandmarks, RIGHT_KNEE, aspectRatio);
  const leftAnkle = aspectPoint(smoothedLandmarks, LEFT_ANKLE, aspectRatio);
  const rightAnkle = aspectPoint(smoothedLandmarks, RIGHT_ANKLE, aspectRatio);

  const kneeAngleL = angleBetween(leftHip, leftKnee, leftAnkle);
  const kneeAngleR = angleBetween(rightHip, rightKnee, rightAnkle);
  const kneeAngleAvg = (kneeAngleL + kneeAngleR) / 2;

  const hipAngleL = angleBetween(leftShoulder, leftHip, leftKnee);
  const hipAngleR = angleBetween(rightShoulder, rightHip, rightKnee);
  const hipAngleAvg = (hipAngleL + hipAngleR) / 2;

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);
  const torsoAngle = angleFromVertical(shoulderMid, hipMid);

  // hipY/kneeY are only ever compared to each other (both normalized to
  // the same axis), so they don't need aspect correction — read them
  // straight from the original landmarks.
  const hipY = (smoothedLandmarks[LEFT_HIP].y + smoothedLandmarks[RIGHT_HIP].y) / 2;
  const kneeY = (smoothedLandmarks[LEFT_KNEE].y + smoothedLandmarks[RIGHT_KNEE].y) / 2;
  const depthRatio = hipY / kneeY;

  const kneeSymmetryDiff = Math.abs(kneeAngleL - kneeAngleR);

  // Knee valgus measurement: how far each knee has drifted sideways from
  // the straight hip->ankle line for that same leg, as a fraction of hip
  // width (so the same tolerance works regardless of body size or camera
  // distance). Sign is flipped per leg so that positive always means
  // "toward the body's midline" (caving in), negative means "away from
  // it" (fine) — determined live from which side each hip is on, rather
  // than assuming a fixed camera-facing direction.
  const hipWidth = distance(leftHip, rightHip);
  const midlineDirection = Math.sign(rightHip.x - leftHip.x) || 1;

  const rawDeviationL = horizontalDeviationFromLine(leftHip, leftAnkle, leftKnee);
  const rawDeviationR = horizontalDeviationFromLine(rightHip, rightAnkle, rightKnee);

  const kneeDeviationL = hipWidth > 0 ? (rawDeviationL * midlineDirection) / hipWidth : 0;
  const kneeDeviationR = hipWidth > 0 ? (rawDeviationR * -midlineDirection) / hipWidth : 0;

  return {
    kneeAngleL,
    kneeAngleR,
    kneeAngleAvg,
    hipAngleL,
    hipAngleR,
    hipAngleAvg,
    torsoAngle,
    hipY,
    kneeY,
    depthRatio,
    kneeSymmetryDiff,
    kneeDeviationL,
    kneeDeviationR,
    confidence,
  };
}
