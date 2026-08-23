import { describe, it, expect } from 'vitest';
import { angleBetween, angleFromVertical, toAspectSpace } from '../src/core/geometry.js';

describe('angleBetween', () => {
  it('returns 180 for three points forming a straight line', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 };
    const c = { x: 2, y: 0 };
    expect(angleBetween(a, b, c)).toBeCloseTo(180, 5);
  });

  it('returns 90 for a right angle', () => {
    const a = { x: 1, y: 0 };
    const b = { x: 0, y: 0 };
    const c = { x: 0, y: 1 };
    expect(angleBetween(a, b, c)).toBeCloseTo(90, 5);
  });

  it('does not return NaN for degenerate input (identical points)', () => {
    const a = { x: 0.3, y: 0.3 };
    expect(angleBetween(a, a, { x: 1, y: 1 })).not.toBeNaN();
    expect(angleBetween({ x: 1, y: 1 }, a, a)).not.toBeNaN();
  });
});

describe('angleFromVertical', () => {
  it('returns 0 for a perfectly vertical line', () => {
    expect(angleFromVertical({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(0, 5);
  });

  it('returns 90 for a perfectly horizontal line', () => {
    expect(angleFromVertical({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90, 5);
  });

  it('returns 45 for a diagonal line', () => {
    expect(angleFromVertical({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(45, 5);
  });

  it('does not return NaN for degenerate input (identical points)', () => {
    const a = { x: 0.5, y: 0.5 };
    expect(angleFromVertical(a, a)).not.toBeNaN();
  });
});

describe('aspect-ratio correction', () => {
  it('actually changes the angle result for a non-square frame', () => {
    // a-b-c forms a 45 degree angle at b in raw (square) space.
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 };
    const c = { x: 0, y: 1 };

    const rawAngle = angleBetween(a, b, c);
    expect(rawAngle).toBeCloseTo(45, 5);

    const aspectRatio = 16 / 9;
    const a2 = toAspectSpace(a, aspectRatio);
    const b2 = toAspectSpace(b, aspectRatio);
    const c2 = toAspectSpace(c, aspectRatio);
    const correctedAngle = angleBetween(a2, b2, c2);

    expect(correctedAngle).not.toBeCloseTo(rawAngle, 1);
  });

  it('leaves the result unchanged for a square frame (aspectRatio = 1)', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 };
    const c = { x: 0, y: 1 };

    const rawAngle = angleBetween(a, b, c);
    const a2 = toAspectSpace(a, 1);
    const b2 = toAspectSpace(b, 1);
    const c2 = toAspectSpace(c, 1);

    expect(angleBetween(a2, b2, c2)).toBeCloseTo(rawAngle, 5);
  });
});
