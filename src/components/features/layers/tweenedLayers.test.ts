import { describe, it, expect } from 'vitest';
import { buildTweenedLayerEntries, pickStop } from './tweenedLayers.ts';

type Item = { id: string; opacity?: number; coords?: [number, number] };

describe('buildTweenedLayerEntries', () => {
  it('makes one entry per distinct item, in first-seen order', () => {
    const perPanel: Item[][] = [[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]];

    const entries = buildTweenedLayerEntries(perPanel, { keyOf: i => i.id });

    expect(entries.map(e => e.key)).toEqual(['a', 'b', 'c']);
    expect(entries.map(e => e.index)).toEqual([0, 1, 2]);
  });

  it('gives an opacity per panel — the configured value where present, 0 where absent', () => {
    const perPanel: Item[][] = [[{ id: 'a', opacity: 0.4 }], [], [{ id: 'a', opacity: 0.9 }]];

    const [entry] = buildTweenedLayerEntries(perPanel, {
      keyOf: i => i.id,
      opacityOf: i => i.opacity ?? 1
    });

    expect(entry.opacityStops).toEqual([0.4, 0, 0.9]);
  });

  it('defaults opacity to 1 where present when no opacityOf is given', () => {
    const perPanel: Item[][] = [[{ id: 'a' }], []];
    const [entry] = buildTweenedLayerEntries(perPanel, { keyOf: i => i.id });
    expect(entry.opacityStops).toEqual([1, 0]);
  });

  it('collects coords per panel when coordsOf is given, null where absent', () => {
    const perPanel: Item[][] = [[{ id: 'a', coords: [1, 2] }], [], [{ id: 'a', coords: [3, 4] }]];

    const [entry] = buildTweenedLayerEntries(perPanel, {
      keyOf: i => i.id,
      coordsOf: i => i.coords!
    });

    expect(entry.coordStops).toEqual([[1, 2], null, [3, 4]]);
  });

  it('leaves coordStops empty when coordsOf is omitted', () => {
    const [entry] = buildTweenedLayerEntries([[{ id: 'a' }]], { keyOf: i => i.id });
    expect(entry.coordStops).toEqual([]);
  });

  it('picks the first panel that has the item as the representative', () => {
    const perPanel: Item[][] = [[], [{ id: 'a', opacity: 0.5 }], [{ id: 'a', opacity: 0.6 }]];
    const [entry] = buildTweenedLayerEntries(perPanel, { keyOf: i => i.id });
    expect(entry.representative.opacity).toBe(0.5);
  });

  it('drops items with an empty key', () => {
    const perPanel: Item[][] = [[{ id: '' }, { id: 'a' }]];
    const entries = buildTweenedLayerEntries(perPanel, { keyOf: i => i.id });
    expect(entries.map(e => e.key)).toEqual(['a']);
  });

  it('changes sig only when an item config changes', () => {
    const a1 = buildTweenedLayerEntries([[{ id: 'a', opacity: 0.5 }], []], { keyOf: i => i.id })[0].sig;
    const a2 = buildTweenedLayerEntries([[{ id: 'a', opacity: 0.5 }], []], { keyOf: i => i.id })[0].sig;
    const a3 = buildTweenedLayerEntries([[{ id: 'a', opacity: 0.9 }], []], { keyOf: i => i.id })[0].sig;
    expect(a1).toBe(a2);
    expect(a1).not.toBe(a3);
  });
});

describe('pickStop', () => {
  it('returns the stop at the given index', () => {
    expect(pickStop([10, 20, 30], 1, 0)).toBe(20);
  });

  it('falls back to the first defined stop when the index is null', () => {
    expect(pickStop([null, 20, 30], 0, 0)).toBe(20);
  });

  it('falls back to the default when every stop is null', () => {
    expect(pickStop([null, null], 0, 99)).toBe(99);
  });
});
