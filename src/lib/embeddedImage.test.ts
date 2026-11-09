import { describe, it } from 'vitest';
import assert from 'node:assert';
import { DEFAULT_MAX_IMAGE_BYTES, validateImageFile } from './embeddedImage.ts';

describe('validateImageFile', () => {
  it('accepts a small supported image', () => {
    assert.strictEqual(validateImageFile({ type: 'image/png', size: 1000 }), undefined);
  });

  it('accepts SVG by default', () => {
    assert.strictEqual(validateImageFile({ type: 'image/svg+xml', size: 1000 }), undefined);
  });

  it('rejects a type outside the accepted list', () => {
    const problem = validateImageFile({ type: 'application/pdf', size: 1000 });
    assert.match(problem ?? '', /Unsupported file type/);
  });

  it('rejects a file over the size limit', () => {
    const problem = validateImageFile({ type: 'image/png', size: DEFAULT_MAX_IMAGE_BYTES + 1 });
    assert.match(problem ?? '', /too large/);
  });

  it('honours a caller-supplied type list and size limit', () => {
    assert.ok(validateImageFile({ type: 'image/gif', size: 10 }, { accept: ['image/png'] }));
    assert.ok(validateImageFile({ type: 'image/png', size: 2000 }, { maxBytes: 1000 }));
    assert.strictEqual(validateImageFile({ type: 'image/png', size: 500 }, { maxBytes: 1000 }), undefined);
  });
});
