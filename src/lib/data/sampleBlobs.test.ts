import { describe, it, expect } from 'vitest';
import { createKitchenSinkBlob } from './sampleBlobs.ts';
import { safeParseGlobeJsonBlob } from './jsonBlob.ts';
import { generateSampleScrollyteller } from './generateSampleScrollyteller.ts';
import { MARKER_NAME } from '../constants.ts';

describe('createKitchenSinkBlob', () => {
  it('is a valid blob with 9 uniquely-named layers', () => {
    const blob = createKitchenSinkBlob();
    expect(safeParseGlobeJsonBlob(blob).success).toBe(true);
    expect(blob.layers).toHaveLength(9);
    expect(new Set(blob.layers.map(({ id }) => id)).size).toBe(9);
  });
});

describe('generateSampleScrollyteller', () => {
  const story = generateSampleScrollyteller({
    blob: createKitchenSinkBlob(),
    extraPointsById: { qld: [[145, -20]] }
  });
  const marks = story.split('\n').filter(line => line.startsWith('#mark'));

  it('wraps panels in scrollyteller opener/closer', () => {
    expect(story.startsWith(`#scrollytellerNAME${MARKER_NAME}1`)).toBe(true);
    expect(story.trim().endsWith('#endscrollyteller')).toBe(true);
  });

  it('opens with day then night panels, then one panel per remaining layer', () => {
    expect(marks[0]).toContain('LAYERbluemarbleon');
    expect(marks[1]).toContain('LAYERblackmarbleon');
    expect(marks[1]).not.toContain('bluemarble');
    expect(marks).toHaveLength(9);
    expect(marks.at(-1)).toContain('LAYERstateson');
  });
});
