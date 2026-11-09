import { describe, it } from 'vitest';
import assert from 'node:assert';
import { resolveLabelColours } from './labelColours.ts';

const WHITE = '#FFFFFF';
const BLACK = '#000000';

describe('resolveLabelColours', () => {
  it('uses the scheme defaults and ignores the colour in default mode', () => {
    assert.deepStrictEqual(resolveLabelColours({ colourMode: 'default' }, '#ff0000', 'light'), {
      text: BLACK,
      background: WHITE
    });
    assert.deepStrictEqual(resolveLabelColours(undefined, '#ff0000', 'dark'), {
      text: WHITE,
      background: BLACK
    });
  });

  it('colours the text in text mode and keeps the scheme background', () => {
    assert.deepStrictEqual(resolveLabelColours({ colourMode: 'text' }, '#ff0000', 'light'), {
      text: '#ff0000',
      background: WHITE
    });
  });

  it('puts the colour on the background and the scheme background on the text in background mode', () => {
    assert.deepStrictEqual(resolveLabelColours({ colourMode: 'background' }, '#ff0000', 'dark'), {
      text: BLACK,
      background: '#ff0000'
    });
  });

  it('puts the colour on the border and leaves the text alone in border mode (an inset)', () => {
    assert.deepStrictEqual(resolveLabelColours({ colourMode: 'border' }, '#ff0000', 'light'), {
      text: BLACK,
      background: '#ff0000'
    });
  });

  it('colours the text instead when there is no background to colour', () => {
    assert.deepStrictEqual(
      resolveLabelColours({ colourMode: 'background', showBackground: false }, '#ff0000', 'light'),
      { text: '#ff0000', background: WHITE }
    );
  });
});
