import { describe, it } from 'vitest';
import assert from 'node:assert';
import { hasAnnotation, hasInset, hasLabel, insetSize } from './label.ts';

const image = { dataUri: 'data:image/png;base64,AAAA' };

describe('label helpers', () => {
  it('treats blank annotation text as no annotation', () => {
    assert.strictEqual(hasAnnotation({ annotation: '  \n ' }), false);
    assert.strictEqual(hasAnnotation({ annotation: 'Fire front' }), true);
  });

  it('counts an inset only when it has an image', () => {
    assert.strictEqual(hasInset({}), false);
    assert.strictEqual(hasInset({ inset: { image, shape: 'circle' } }), true);
  });

  it('shows a label for either kind', () => {
    assert.strictEqual(hasLabel({}), false);
    assert.strictEqual(hasLabel({ annotation: 'Hi' }), true);
    assert.strictEqual(hasLabel({ inset: { image, shape: 'rounded' } }), true);
  });
});

describe('insetSize', () => {
  it('shows an @2x image at half its pixel size, using the shorter side', () => {
    assert.strictEqual(insetSize({ width: 200, height: 200 }), 100);
    assert.strictEqual(insetSize({ width: 300, height: 120 }), 60);
  });

  it('uses the full width for a source-shaped inset, so the height follows the image', () => {
    assert.strictEqual(insetSize({ width: 300, height: 120 }, 'source'), 150);
    assert.strictEqual(insetSize({ width: 300, height: 120 }, 'rounded'), 60);
  });

  it('falls back when the image size is unknown', () => {
    assert.strictEqual(insetSize({}), 48);
  });
});
