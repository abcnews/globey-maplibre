import { describe, it } from 'vitest';
import assert from 'node:assert';
import { labelShift, oppositeAnchor } from './labelPlacement.ts';

describe('oppositeAnchor', () => {
  it('flips corners, edges and keeps the centre', () => {
    assert.strictEqual(oppositeAnchor('top-right'), 'bottom-left');
    assert.strictEqual(oppositeAnchor('bottom-left'), 'top-right');
    assert.strictEqual(oppositeAnchor('top-left'), 'bottom-right');
    assert.strictEqual(oppositeAnchor('top'), 'bottom');
    assert.strictEqual(oppositeAnchor('left'), 'right');
    assert.strictEqual(oppositeAnchor('center'), 'center');
  });
});

// A pin: the tip is on the coordinate, so it reaches far up, a little down, and half its width sideways.
const pin = { up: 17, down: 3, left: 10, right: 10 };

describe('labelShift', () => {
  it('moves a bottom-left label up by the reach above and right by the reach to the right', () => {
    assert.deepStrictEqual(labelShift('bottom-left', pin), [10, -17]);
  });

  it('moves a top-right label down by the reach below and left by the reach to the left', () => {
    assert.deepStrictEqual(labelShift('top-right', pin), [-10, 3]);
  });

  it('does not move an axis the anchor centres on', () => {
    assert.deepStrictEqual(labelShift('bottom', pin), [0, -17]);
    assert.deepStrictEqual(labelShift('right', pin), [-10, 0]);
    assert.deepStrictEqual(labelShift('center', pin), [0, 0]);
  });
});
