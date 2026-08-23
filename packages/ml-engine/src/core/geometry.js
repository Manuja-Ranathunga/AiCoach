// Pure 2D vector math. No React, no MediaPipe — takes plain {x, y}
// objects so it can be unit tested on its own. z is intentionally never
// used: MediaPipe's depth estimate is too unreliable for angle math.

// Clamp before Math.acos — floating point error can push dot/(mag1*mag2)
// slightly outside [-1, 1], which would make acos return NaN.
function clampCos(value) {
  return Math.max(-1, Math.min(1, value));
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

// MediaPipe landmarks are normalized to 0..1 as a fraction of the frame's
// width (x) and height (y) separately. A real camera frame is not square
// (e.g. 1280x720), so a 0.1 step in x and a 0.1 step in y cover different
// physical distances. Feeding raw normalized coordinates into angle math
// would distort every angle toward the frame's aspect ratio.
//
// Fix: rescale x by (width / height) so both axes are expressed in the
// same unit ("fractions of frame height"). Use this before any
// angleBetween / angleFromVertical / distance call.
export function toAspectSpace(landmark, aspectRatio) {
  return { x: landmark.x * aspectRatio, y: landmark.y };
}

// Angle at point b, formed by rays b->a and b->c, in degrees (0..180).
export function angleBetween(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };

  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;

  const dot = v1.x * v2.x + v1.y * v2.y;
  const cos = clampCos(dot / (mag1 * mag2));
  return toDegrees(Math.acos(cos));
}

// Angle of the line a->b away from the vertical axis, in degrees (0..180).
// 0 means a->b points straight down the screen (perfectly vertical);
// 90 means it's perfectly horizontal.
export function angleFromVertical(a, b) {
  const v = { x: b.x - a.x, y: b.y - a.y };
  const mag = Math.hypot(v.x, v.y);
  if (mag === 0) return 0;

  // Reference "down" direction in screen space is (0, 1).
  const cos = clampCos(v.y / mag);
  return toDegrees(Math.acos(cos));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// How far point p has drifted horizontally from the straight line a->b,
// measured at p's own y-height (i.e. find where the line crosses that y
// level, then compare x). Positive means p is to the right of the line,
// negative means left. Used for e.g. checking whether a knee has drifted
// sideways off the hip-ankle line.
export function horizontalDeviationFromLine(a, b, p) {
  if (a.y === b.y) return p.x - a.x; // degenerate: line has no vertical extent
  const t = (p.y - a.y) / (b.y - a.y);
  const lineXAtP = a.x + t * (b.x - a.x);
  return p.x - lineXAtP;
}
