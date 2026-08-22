// Pure drawing helpers: given a 2D context and MediaPipe landmarks, draw
// the skeleton. No React, no state — just canvas calls.

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

const MIN_VISIBILITY = 0.5;

function isVisible(landmark) {
  // `visibility` is undefined for some models, so treat missing as visible.
  return landmark.visibility === undefined || landmark.visibility >= MIN_VISIBILITY;
}

/**
 * Draws lines between connected landmarks.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x:number,y:number,visibility?:number}>} landmarks - normalized 0..1 coords
 * @param {number} width - canvas pixel width
 * @param {number} height - canvas pixel height
 * @param {{color?: string, lineWidth?: number, connections?: Array<[number,number]>}} [options]
 */
export function drawSkeleton(ctx, landmarks, width, height, options = {}) {
  const { color = 'white', lineWidth = 3, connections = POSE_CONNECTIONS } = options;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  for (const [startIdx, endIdx] of connections) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (!start || !end) continue;
    if (!isVisible(start) || !isVisible(end)) continue;

    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }
}

/**
 * Draws a dot at each landmark.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x:number,y:number,visibility?:number}>} landmarks - normalized 0..1 coords
 * @param {number} width - canvas pixel width
 * @param {number} height - canvas pixel height
 * @param {{color?: string, radius?: number}} [options]
 */
export function drawLandmarks(ctx, landmarks, width, height, options = {}) {
  const { color = 'cyan', radius = 4 } = options;

  ctx.fillStyle = color;

  for (const landmark of landmarks) {
    if (!landmark || !isVisible(landmark)) continue;

    ctx.beginPath();
    ctx.arc(landmark.x * width, landmark.y * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
