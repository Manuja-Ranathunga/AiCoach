// Pure drawing helpers: given a 2D context and MediaPipe landmarks, draw
// the skeleton. No React, no form-check knowledge — these functions only
// know about "severity levels" (good/warning/critical) and how to render
// them; they never see a check id or message. See core/feedbackState.js
// for the module that turns confirmed errors into the color maps these
// functions accept.

// The 33-point MediaPipe pose model connections, grouped by body part.
// Each pair is [startLandmarkIndex, endLandmarkIndex].
export const POSE_CONNECTIONS = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

// Every color used anywhere in the visual feedback layer (skeleton,
// HUD text, depth bar, rep flash) is defined once here — change a value
// in this one object to retheme the whole app.
export const SEVERITY_COLORS = {
  good: '#22c55e', // green
  warning: '#f59e0b', // amber
  critical: '#ef4444', // red
};

// Affected segments/joints are drawn thicker (not just recolored) so the
// signal reads at a distance and doesn't depend on being able to see color.
const SEVERITY_LINE_WIDTH = { good: 3, warning: 5, critical: 7 };
const SEVERITY_JOINT_RADIUS = { good: 4, warning: 5, critical: 6 };
// Soft glow on critical segments only — shadowBlur is the one moderately
// expensive canvas op here, so it's zero (a no-op) everywhere else.
const SEVERITY_GLOW = { good: 0, warning: 0, critical: 14 };

const MIN_VISIBILITY = 0.5;

function isVisible(landmark) {
  // `visibility` is undefined for some models, so treat missing as visible.
  return landmark.visibility === undefined || landmark.visibility >= MIN_VISIBILITY;
}

// Consistent lookup key for an unordered pair of landmark indices, so a
// segment can be looked up regardless of which order its two ends are
// listed in (POSE_CONNECTIONS order vs. a check's affectedSegments order).
export function segmentKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Draws lines between connected landmarks, colored/thickened per segment.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x:number,y:number,visibility?:number}>} landmarks - normalized 0..1 coords
 * @param {number} width - canvas pixel width
 * @param {number} height - canvas pixel height
 * @param {{connections?: Array<[number,number]>, segmentColors?: Map<string,{color:string,severity:string}>}} [options]
 */
export function drawSkeleton(ctx, landmarks, width, height, options = {}) {
  const { connections = POSE_CONNECTIONS, segmentColors } = options;

  for (const [startIdx, endIdx] of connections) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (!start || !end) continue;
    if (!isVisible(start) || !isVisible(end)) continue;

    const style = segmentColors?.get(segmentKey(startIdx, endIdx));
    const severity = style?.severity ?? 'good';

    ctx.strokeStyle = style?.color ?? SEVERITY_COLORS.good;
    ctx.lineWidth = SEVERITY_LINE_WIDTH[severity];
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = SEVERITY_GLOW[severity];

    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }

  ctx.shadowBlur = 0; // don't let a glow leak into whatever draws next
}

/**
 * Draws a dot at each landmark, colored/sized per joint.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x:number,y:number,visibility?:number}>} landmarks - normalized 0..1 coords
 * @param {number} width - canvas pixel width
 * @param {number} height - canvas pixel height
 * @param {{jointColors?: Map<number,{color:string,severity:string}>}} [options]
 */
export function drawLandmarks(ctx, landmarks, width, height, options = {}) {
  const { jointColors } = options;

  landmarks.forEach((landmark, index) => {
    if (!landmark || !isVisible(landmark)) return;

    const style = jointColors?.get(index);
    const severity = style?.severity ?? 'good';

    ctx.fillStyle = style?.color ?? SEVERITY_COLORS.good;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = SEVERITY_GLOW[severity];

    ctx.beginPath();
    ctx.arc(landmark.x * width, landmark.y * height, SEVERITY_JOINT_RADIUS[severity], 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowBlur = 0;
}
