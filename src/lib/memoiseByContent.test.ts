import { describe, it, expect } from 'vitest';
import { memoiseByContent } from './memoiseByContent.ts';

describe('memoiseByContent', () => {
  it('returns the first value it is given', () => {
    const memoise = memoiseByContent<{ id: string }>();
    const first = { id: 'a' };

    expect(memoise(first)).toBe(first);
  });

  it('keeps the original identity for a content-identical clone', () => {
    const memoise = memoiseByContent<{ id: string }[]>();
    const first = [{ id: 'a' }];

    memoise(first);

    expect(memoise(structuredClone(first))).toBe(first);
  });

  it('adopts the new value when the content changes', () => {
    const memoise = memoiseByContent<{ id: string }[]>();
    const changed = [{ id: 'b' }];

    memoise([{ id: 'a' }]);

    expect(memoise(changed)).toBe(changed);
  });

  it('keeps the new identity for subsequent clones of the changed value', () => {
    const memoise = memoiseByContent<{ id: string }[]>();
    const changed = [{ id: 'b' }];

    memoise([{ id: 'a' }]);
    memoise(changed);

    expect(memoise(structuredClone(changed))).toBe(changed);
  });

  it('treats a reordered array as a change', () => {
    const memoise = memoiseByContent<string[]>();
    const reordered = ['b', 'a'];

    memoise(['a', 'b']);

    expect(memoise(reordered)).toBe(reordered);
  });
});
