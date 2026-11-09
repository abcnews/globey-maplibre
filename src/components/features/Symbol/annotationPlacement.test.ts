import { describe, it } from 'vitest';
import assert from 'node:assert';
import { annotationShift } from './annotationPlacement.ts';

// A pin: the tip is on the coordinate, so it reaches far up, a little down, and half its width sideways.
const pin = { up: 17, down: 3, left: 10, right: 10 };

describe('annotationShift', () => {
  it('moves a bottom-left label up by the reach above and right by the reach to the right', () => {
    assert.deepStrictEqual(annotationShift('bottom-left', pin), [10, -17]);
  });

  it('moves a top-right label down by the reach below and left by the reach to the left', () => {
    assert.deepStrictEqual(annotationShift('top-right', pin), [-10, 3]);
  });

  it('does not move an axis the anchor centres on', () => {
    assert.deepStrictEqual(annotationShift('bottom', pin), [0, -17]);
    assert.deepStrictEqual(annotationShift('right', pin), [-10, 0]);
    assert.deepStrictEqual(annotationShift('center', pin), [0, 0]);
  });
});
