import { describe, it } from 'vitest';
import assert from 'node:assert';
import { resolveSchemeColour, schemeForColour, COLOUR_SCHEME_COLOURS } from './colourScheme.ts';

describe('resolveSchemeColour', () => {
  it('resolves normal and highlighted to their preset colours', () => {
    assert.strictEqual(resolveSchemeColour('normal'), COLOUR_SCHEME_COLOURS.normal);
    assert.strictEqual(resolveSchemeColour('highlighted'), COLOUR_SCHEME_COLOURS.highlighted);
  });

  it('resolves custom to the given colour', () => {
    assert.strictEqual(resolveSchemeColour('custom', '#123456'), '#123456');
  });

  it('treats an undefined scheme the same as custom — uses the colour if given', () => {
    // A marker colour override (`applyMarkerOverrides`) only ever stores a hex with no
    // scheme name — this must not silently fall back to "normal".
    assert.strictEqual(resolveSchemeColour(undefined, '#00f900'), '#00f900');
  });

  it('falls back to normal for custom or undefined with no colour', () => {
    assert.strictEqual(resolveSchemeColour('custom'), COLOUR_SCHEME_COLOURS.normal);
    assert.strictEqual(resolveSchemeColour(undefined), COLOUR_SCHEME_COLOURS.normal);
  });
});

describe('schemeForColour', () => {
  it('matches a known preset colour case-insensitively', () => {
    assert.strictEqual(schemeForColour('00267e'), 'normal');
    assert.strictEqual(schemeForColour('#FF3C27'), 'highlighted');
  });

  it('treats an unrecognised colour as custom', () => {
    assert.strictEqual(schemeForColour('123456'), 'custom');
  });

  it('returns undefined for no colour, distinct from custom', () => {
    assert.strictEqual(schemeForColour(undefined), undefined);
  });
});
