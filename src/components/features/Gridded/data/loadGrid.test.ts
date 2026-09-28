import { describe, expect, it } from 'vitest';
import { isGeoTiff } from './loadGrid.ts';

const bytes = (text: string) => Uint8Array.from(text, char => char.charCodeAt(0)).buffer;

describe('isGeoTiff', () => {
  it('accepts TIFF and BigTIFF headers of either byte order', () => {
    ['II*\0....', 'MM\0*....', 'II+\0....', 'MM\0+....'].forEach(header => expect(isGeoTiff(bytes(header))).toBe(true));
  });

  it('rejects other files', () => {
    ['CDF\x01....', '\x89HDF\r\n\x1a\n', '{"type"'].forEach(header => expect(isGeoTiff(bytes(header))).toBe(false));
  });
});
